// >>> EMPLACEMENT : src/app/admin/(protege)/page.tsx
// =========================================================================
// Tableau de bord admin (vue d'ensemble).
//   - Cartes KPI (vrais chiffres depuis la base)
//   - Graphique : demandes par jour (7 derniers jours), en barres
//   - Graphique : repartition des demandes par service, en anneau
//   - Raccourci vers la file de verification
// Composant serveur (pas de "use client") : les donnees sont lues cote serveur.
// =========================================================================

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

// ===== Couleurs pour le graphique en anneau =====
const COULEURS = ["#E07B39", "#4C8C5A", "#B8924A", "#6B6860", "#C0392B", "#8A6FB0"];

export default async function TableauDeBordAdmin() {
  const supabase = await createClient();

  // ===== Bornes de dates utiles =====
  const debutJour = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
  const il7jours = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();

  // ===== Compter les indicateurs cles (en parallele) =====
  const [
    enAttente,
    actifs,
    demandesJour,
    interventionsTerminees,
    litigesOuverts,
  ] = await Promise.all([
    supabase.from("artisans").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("artisans").select("*", { count: "exact", head: true }).eq("status", "verified"),
    supabase.from("service_requests").select("*", { count: "exact", head: true }).gte("created_at", debutJour),
    supabase.from("jobs").select("*", { count: "exact", head: true }).eq("status", "validated"),
    supabase.from("disputes").select("*", { count: "exact", head: true }).eq("status", "open"),
  ]);

  // ===== Donnees pour le graphique "demandes par jour" =====
  // On recupere les demandes des 7 derniers jours, puis on compte par jour cote code.
  const { data: demandes7j } = await supabase
    .from("service_requests")
    .select("created_at, trade_id")
    .gte("created_at", il7jours);

  const parJour = compterParJour(demandes7j ?? []);

  // ===== Donnees pour le graphique "repartition par service" =====
  // On compte les demandes par metier, puis on resout les noms des metiers.
  const repartition = await calculerRepartition(supabase, demandes7j ?? []);

  // ===== Liste des KPI a afficher =====
  const kpis = [
    { label: "Artisans en attente", valeur: enAttente.count ?? 0, accent: true, href: "/admin/verifications" },
    { label: "Artisans actifs", valeur: actifs.count ?? 0 },
    { label: "Demandes aujourd'hui", valeur: demandesJour.count ?? 0 },
    { label: "Interventions terminees", valeur: interventionsTerminees.count ?? 0 },
    { label: "Litiges ouverts", valeur: litigesOuverts.count ?? 0 },
  ];

  return (
    <div>
      <h1 className="mb-1 text-2xl">Tableau de bord</h1>
      <p className="mb-6 text-sm text-texte2">Vue d&apos;ensemble de l&apos;activite FixCI.</p>

      {/* ===== Cartes KPI ===== */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {kpis.map((kpi) => {
          const carte = (
            <div
              className="h-full rounded-2xl border bg-carte p-5"
              style={{ borderColor: kpi.accent ? "var(--color-orange)" : "var(--color-bordure)" }}
            >
              <p className="text-sm text-texte2">{kpi.label}</p>
              <p
                className="mt-2 text-3xl font-bold"
                style={{ color: kpi.accent ? "var(--color-orange)" : "var(--color-texte)" }}
              >
                {kpi.valeur}
              </p>
              {kpi.accent && kpi.valeur > 0 && (
                <p className="mt-1 text-xs font-medium" style={{ color: "var(--color-orange)" }}>
                  A traiter →
                </p>
              )}
            </div>
          );
          return kpi.href ? (
            <Link key={kpi.label} href={kpi.href} className="transition hover:brightness-95">
              {carte}
            </Link>
          ) : (
            <div key={kpi.label}>{carte}</div>
          );
        })}
      </div>

      {/* ===== Graphiques ===== */}
      <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Demandes par jour */}
        <div className="rounded-2xl border border-bordure bg-carte p-6">
          <h2 className="mb-4 text-lg">Demandes par jour (7 jours)</h2>
          <GraphiqueBarres donnees={parJour} />
        </div>

        {/* Repartition par service */}
        <div className="rounded-2xl border border-bordure bg-carte p-6">
          <h2 className="mb-4 text-lg">Repartition par service</h2>
          <GraphiqueAnneau donnees={repartition} />
        </div>
      </div>

      {/* ===== Acces rapide ===== */}
      <div className="mt-8 rounded-2xl border border-bordure bg-secondaire p-6">
        <h2 className="text-lg">Verification des artisans</h2>
        <p className="mt-1 text-sm text-texte2">
          C&apos;est le coeur de FixCI : controlez les pieces d&apos;identite et activez les profils dignes de confiance.
        </p>
        <Link
          href="/admin/verifications"
          className="mt-4 inline-block rounded-xl px-5 py-2.5 text-sm font-medium text-white transition hover:brightness-95"
          style={{ backgroundColor: "var(--color-orange)" }}
        >
          Ouvrir la file de verification
        </Link>
      </div>
    </div>
  );
}

// ===== Compter les demandes par jour sur 7 jours =====
function compterParJour(lignes: { created_at: string }[]): { jour: string; valeur: number }[] {
  const jours: { jour: string; valeur: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const label = d.toLocaleDateString("fr-FR", { weekday: "short" });
    const debut = d.getTime();
    const fin = debut + 24 * 3600 * 1000;
    const valeur = lignes.filter((l) => {
      const t = new Date(l.created_at).getTime();
      return t >= debut && t < fin;
    }).length;
    jours.push({ jour: label, valeur });
  }
  return jours;
}

// ===== Calculer la repartition par metier (avec noms) =====
async function calculerRepartition(
  supabase: Awaited<ReturnType<typeof createClient>>,
  lignes: { trade_id: string | null }[]
): Promise<{ label: string; valeur: number }[]> {
  // Compter par trade_id.
  const compte: Record<string, number> = {};
  lignes.forEach((l) => {
    if (l.trade_id) compte[l.trade_id] = (compte[l.trade_id] ?? 0) + 1;
  });
  const ids = Object.keys(compte);
  if (ids.length === 0) return [];

  // Resoudre les noms des metiers.
  const { data: trades } = await supabase.from("trades").select("id, name").in("id", ids);
  const noms: Record<string, string> = {};
  (trades ?? []).forEach((t: { id: string; name: string }) => { noms[t.id] = t.name; });

  return ids
    .map((id) => ({ label: noms[id] ?? "Autre", valeur: compte[id] }))
    .sort((a, b) => b.valeur - a.valeur);
}

// ===== Graphique en barres (SVG maison) =====
function GraphiqueBarres({ donnees }: { donnees: { jour: string; valeur: number }[] }) {
  const max = Math.max(1, ...donnees.map((d) => d.valeur));
  const largeurBarre = 36;
  const ecart = 16;
  const hauteur = 160;
  const largeur = donnees.length * (largeurBarre + ecart);

  // Si aucune donnee, message.
  if (donnees.every((d) => d.valeur === 0)) {
    return <p className="py-8 text-center text-sm text-texte2">Pas encore de demandes sur la periode.</p>;
  }

  return (
    <svg width="100%" viewBox={`0 0 ${largeur} ${hauteur + 30}`} preserveAspectRatio="xMidYMid meet">
      {donnees.map((d, i) => {
        const h = (d.valeur / max) * hauteur;
        const x = i * (largeurBarre + ecart) + ecart / 2;
        const y = hauteur - h;
        return (
          <g key={i}>
            <rect x={x} y={y} width={largeurBarre} height={h} rx="4" fill="var(--color-orange)" />
            <text x={x + largeurBarre / 2} y={y - 5} textAnchor="middle" fontSize="11" fill="var(--color-texte2)">
              {d.valeur}
            </text>
            <text x={x + largeurBarre / 2} y={hauteur + 18} textAnchor="middle" fontSize="11" fill="var(--color-texte2)">
              {d.jour}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ===== Graphique en anneau (SVG maison) =====
function GraphiqueAnneau({ donnees }: { donnees: { label: string; valeur: number }[] }) {
  const total = donnees.reduce((s, d) => s + d.valeur, 0);
  if (total === 0) {
    return <p className="py-8 text-center text-sm text-texte2">Pas encore de demandes a repartir.</p>;
  }

  const rayon = 60;
  const epaisseur = 22;
  const circonference = 2 * Math.PI * rayon;
  let offset = 0;

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <svg width="160" height="160" viewBox="0 0 160 160">
        <g transform="translate(80,80) rotate(-90)">
          {donnees.map((d, i) => {
            const portion = d.valeur / total;
            const longueur = portion * circonference;
            const cercle = (
              <circle
                key={i}
                r={rayon}
                fill="none"
                stroke={COULEURS[i % COULEURS.length]}
                strokeWidth={epaisseur}
                strokeDasharray={`${longueur} ${circonference - longueur}`}
                strokeDashoffset={-offset}
              />
            );
            offset += longueur;
            return cercle;
          })}
        </g>
        <text x="80" y="76" textAnchor="middle" fontSize="22" fontWeight="bold" fill="var(--color-texte)">
          {total}
        </text>
        <text x="80" y="94" textAnchor="middle" fontSize="11" fill="var(--color-texte2)">
          Demandes
        </text>
      </svg>

      {/* Legende */}
      <div className="flex flex-col gap-2">
        {donnees.map((d, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: COULEURS[i % COULEURS.length] }} />
            <span className="text-texte">{d.label}</span>
            <span className="text-texte2">{Math.round((d.valeur / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}