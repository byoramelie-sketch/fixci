// >>> EMPLACEMENT : src/app/admin/(protege)/revenus/page.tsx
"use client";

// =========================================================================
// ADMIN — Suivi des revenus de FixCI.
//   - Ce qui est encaisse (ce mois / depuis le debut) + comparaison au mois
//     precedent, et ce qui reste a recevoir des artisans.
//   - Blocs CLIQUABLES qui se deplient pour voir le detail operation par
//     operation (qui, quand, combien) :
//       1. Commissions prelevees dans l'application (automatiques)
//       2. Versements des artisans (chantiers regles en especes)
//       3. Abonnements & mises en avant
//       4. A recevoir (commissions especes pas encore reversees)
// Dans le groupe (protege) : l'habillage vient du layout admin.
// =========================================================================

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Ligne = {
  id: string;
  montant: number;
  date: string | null;
  qui: string;
  detail: string;
};

function prix(n: number) {
  return n.toLocaleString("fr-FR") + " FCFA";
}
function dateLisible(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}
function debutDuMois(decalage = 0) {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + decalage, 1);
}
function dansPeriode(iso: string | null, debut: Date, fin: Date | null) {
  if (!iso) return false;
  const d = new Date(iso);
  return d >= debut && (fin === null || d < fin);
}

export default function AdminRevenus() {
  const supabase = createClient();

  const [chargement, setChargement] = useState(true);
  const [ceMois, setCeMois] = useState(true);
  const [ouvert, setOuvert] = useState<string | null>(null);

  const [comApp, setComApp] = useState<Ligne[]>([]);
  const [comEspeces, setComEspeces] = useState<Ligne[]>([]);
  const [abos, setAbos] = useState<Ligne[]>([]);
  const [aRecevoir, setARecevoir] = useState<Ligne[]>([]);

  useEffect(() => {
    (async () => {
      // Tout charger en parallele.
      const [payRes, comRes, aboRes] = await Promise.all([
        supabase
          .from("payments")
          .select("id, job_id, commission_fcfa, payout_at, status")
          .eq("status", "released"),
        supabase
          .from("commissions")
          .select("id, artisan_id, job_amount_fcfa, amount_fcfa, status, paid_at, created_at"),
        supabase.from("artisan_subscriptions").select("id, artisan_id, type, amount_fcfa, created_at"),
      ]);

      const pays = (payRes.data ?? []) as {
        id: string;
        job_id: string;
        commission_fcfa: number;
        payout_at: string | null;
      }[];
      const coms = (comRes.data ?? []) as {
        id: string;
        artisan_id: string;
        job_amount_fcfa: number;
        amount_fcfa: number;
        status: string;
        paid_at: string | null;
        created_at: string;
      }[];
      const subs = (aboRes.data ?? []) as {
        id: string;
        artisan_id: string;
        type: string;
        amount_fcfa: number;
        created_at: string;
      }[];

      // Relier chaque paiement a son artisan (via le chantier).
      const jobIds = [...new Set(pays.map((p) => p.job_id))];
      const artisanParJob: Record<string, string> = {};
      if (jobIds.length) {
        const { data: jobs } = await supabase.from("jobs").select("id, artisan_id").in("id", jobIds);
        ((jobs ?? []) as { id: string; artisan_id: string }[]).forEach((j) => {
          artisanParJob[j.id] = j.artisan_id;
        });
      }

      // Noms des artisans concernes.
      const artisanIds = [
        ...new Set([
          ...Object.values(artisanParJob),
          ...coms.map((c) => c.artisan_id),
          ...subs.map((s) => s.artisan_id),
        ]),
      ];
      const noms: Record<string, string> = {};
      if (artisanIds.length) {
        const { data: profs } = await supabase.from("profiles").select("id, name").in("id", artisanIds);
        ((profs ?? []) as { id: string; name: string | null }[]).forEach((p) => {
          noms[p.id] = p.name ?? "Artisan";
        });
      }

      setComApp(
        pays.map((p) => ({
          id: p.id,
          montant: p.commission_fcfa,
          date: p.payout_at,
          qui: noms[artisanParJob[p.job_id]] ?? "Artisan",
          detail: "Prelevee automatiquement",
        }))
      );
      setComEspeces(
        coms
          .filter((c) => c.status === "paid")
          .map((c) => ({
            id: c.id,
            montant: c.amount_fcfa,
            date: c.paid_at,
            qui: noms[c.artisan_id] ?? "Artisan",
            detail: `Intervention de ${prix(c.job_amount_fcfa)}`,
          }))
      );
      setARecevoir(
        coms
          .filter((c) => c.status === "due")
          .map((c) => ({
            id: c.id,
            montant: c.amount_fcfa,
            date: c.created_at,
            qui: noms[c.artisan_id] ?? "Artisan",
            detail: `Intervention de ${prix(c.job_amount_fcfa)}`,
          }))
      );
      setAbos(
        subs.map((s) => ({
          id: s.id,
          montant: s.amount_fcfa,
          date: s.created_at,
          qui: noms[s.artisan_id] ?? "Artisan",
          detail: s.type === "monthly_subscription" ? "Abonnement mensuel" : "Mise en avant",
        }))
      );
      setChargement(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ===== Filtre de periode =====
  const debut = debutDuMois();
  const debutPrec = debutDuMois(-1);
  const filtrer = (l: Ligne[]) => (ceMois ? l.filter((x) => dansPeriode(x.date, debut, null)) : l);
  const somme = (l: Ligne[]) => l.reduce((s, x) => s + x.montant, 0);

  const fApp = filtrer(comApp);
  const fEsp = filtrer(comEspeces);
  const fAbo = filtrer(abos);
  const fRec = aRecevoir; // pas encore encaisse : on montre toujours tout

  const totalEncaisse = somme(fApp) + somme(fEsp) + somme(fAbo);
  const totalARecevoir = somme(fRec);

  const dansPrec = (l: Ligne[]) => l.filter((x) => dansPeriode(x.date, debutPrec, debut));
  const totalPrec = somme(dansPrec(comApp)) + somme(dansPrec(comEspeces)) + somme(dansPrec(abos));
  const evolution = totalPrec > 0 ? Math.round(((totalEncaisse - totalPrec) / totalPrec) * 100) : null;

  const blocs = [
    { cle: "app", titre: "Commissions (application)", sousTitre: "Prelevees automatiquement sur les paiements", lignes: fApp, couleur: "var(--color-vert)" },
    { cle: "esp", titre: "Versements des artisans", sousTitre: "Chantiers regles en especes", lignes: fEsp, couleur: "var(--color-orange)" },
    { cle: "abo", titre: "Abonnements & mises en avant", sousTitre: "Formules payantes des artisans", lignes: fAbo, couleur: "var(--color-or)" },
  ];

  if (chargement) {
    return (
      <div>
        <h1 className="mb-1 text-2xl">Revenus</h1>
        <p className="py-10 text-center text-sm text-texte2">Chargement...</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-1 text-2xl">Revenus</h1>
      <p className="mb-6 text-sm text-texte2">
        L&apos;argent encaisse par FixCI, et ce qui reste a recevoir.
      </p>

      {/* ===== Bascule de periode ===== */}
      <div className="mb-6 flex gap-2">
        {[
          { v: true, l: "Ce mois" },
          { v: false, l: "Depuis le debut" },
        ].map((o) => (
          <button
            key={o.l}
            type="button"
            onClick={() => setCeMois(o.v)}
            className="rounded-xl border px-5 py-2 text-sm font-medium transition"
            style={{
              borderColor: ceMois === o.v ? "var(--color-orange)" : "var(--color-bordure)",
              background: ceMois === o.v ? "var(--color-secondaire)" : "var(--color-carte)",
              color: ceMois === o.v ? "var(--color-orange)" : "var(--color-texte2)",
            }}
          >
            {o.l}
          </button>
        ))}
      </div>

      {/* ===== Les 2 grands totaux ===== */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div
          className="rounded-2xl border bg-carte p-6"
          style={{ borderColor: "var(--color-vert)" }}
        >
          <p className="text-sm text-texte2">
            {ceMois ? "Encaisse ce mois" : "Encaisse depuis le debut"}
          </p>
          <p className="mt-2 text-3xl font-bold" style={{ color: "var(--color-vert)" }}>
            {prix(totalEncaisse)}
          </p>
          {ceMois && evolution !== null && (
            <p
              className="mt-1 text-xs font-medium"
              style={{ color: evolution >= 0 ? "var(--color-vert)" : "var(--color-orange)" }}
            >
              {evolution >= 0 ? "+" : ""}
              {evolution} % vs mois dernier ({prix(totalPrec)})
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() => setOuvert(ouvert === "rec" ? null : "rec")}
          className="rounded-2xl border p-6 text-left transition hover:brightness-95"
          style={{
            background: totalARecevoir > 0 ? "rgba(224,123,57,0.08)" : "var(--color-carte)",
            borderColor: totalARecevoir > 0 ? "var(--color-orange)" : "var(--color-bordure)",
          }}
        >
          <p className="text-sm text-texte2">A recevoir des artisans</p>
          <p className="mt-2 text-3xl font-bold" style={{ color: "var(--color-orange)" }}>
            {prix(totalARecevoir)}
          </p>
          <p className="mt-1 text-xs font-medium" style={{ color: "var(--color-texte2)" }}>
            {fRec.length} commission{fRec.length > 1 ? "s" : ""} en attente · {ouvert === "rec" ? "masquer" : "voir le detail"} →
          </p>
        </button>
      </div>

      {ouvert === "rec" && (
        <ListeLignes lignes={fRec} vide="Aucune commission en attente. Tout est a jour." />
      )}

      {/* ===== Les 3 sources, cliquables ===== */}
      <h2 className="mb-3 mt-8 text-lg">Detail des revenus</h2>
      <div className="flex flex-col gap-3">
        {blocs.map((b) => (
          <div key={b.cle}>
            <button
              type="button"
              onClick={() => setOuvert(ouvert === b.cle ? null : b.cle)}
              className="w-full rounded-2xl border border-bordure bg-carte p-5 text-left transition hover:brightness-95"
            >
              <div className="flex items-center justify-between gap-4">
                <span>
                  <span className="block font-medium text-texte">{b.titre}</span>
                  <span className="text-xs text-texte2">
                    {b.sousTitre} · {b.lignes.length} operation{b.lignes.length > 1 ? "s" : ""}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-3">
                  <span className="text-xl font-bold" style={{ color: b.couleur }}>
                    {prix(somme(b.lignes))}
                  </span>
                  <span className="text-xs text-texte2">{ouvert === b.cle ? "▲" : "▼"}</span>
                </span>
              </div>
            </button>
            {ouvert === b.cle && (
              <ListeLignes lignes={b.lignes} vide="Aucune operation sur cette periode." />
            )}
          </div>
        ))}
      </div>

      {/* Retour */}
      <Link
        href="/admin"
        className="mt-8 inline-block text-sm font-medium"
        style={{ color: "var(--color-orange)" }}
      >
        ← Retour au tableau de bord
      </Link>
    </div>
  );
}

// ===== Liste depliable d'operations =====
function ListeLignes({ lignes, vide }: { lignes: Ligne[]; vide: string }) {
  if (lignes.length === 0) {
    return (
      <p className="mt-2 rounded-xl border border-dashed border-bordure p-5 text-center text-sm text-texte2">
        {vide}
      </p>
    );
  }
  return (
    <div className="mt-2 flex flex-col gap-2">
      {lignes
        .slice()
        .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))
        .map((l) => (
          <div
            key={l.id}
            className="flex items-center justify-between gap-4 rounded-xl border border-bordure bg-secondaire px-4 py-3"
          >
            <span className="text-sm">
              <span className="block font-medium text-texte">{l.qui}</span>
              <span className="block text-xs text-texte2">
                {dateLisible(l.date)} · {l.detail}
              </span>
            </span>
            <span className="shrink-0 font-semibold text-texte">{prix(l.montant)}</span>
          </div>
        ))}
    </div>
  );
}