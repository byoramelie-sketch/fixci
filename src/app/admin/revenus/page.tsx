// >>> EMPLACEMENT : src/app/admin/revenus/page.tsx
"use client";

// =========================================================================
// ADMIN — Suivi des revenus de FixCI.
//   - En haut : ce qui est encaisse ce mois-ci (+ comparaison mois precedent)
//     et ce qui reste a recevoir.
//   - 4 blocs CLIQUABLES qui se deplient pour voir le detail :
//       1. Commissions prelevees dans l'application (automatiques)
//       2. Versements des artisans (chantiers regles en especes)
//       3. Abonnements & mises en avant
//       4. A recevoir (commissions especes pas encore reversees)
//   - Bascule "Ce mois" / "Depuis le debut".
// Ecran enfant -> fleche retour en haut.
// =========================================================================

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { FiletTricolore } from "@/components/ui";
import { BoutonRetour } from "@/components/icones";

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
  const router = useRouter();
  const supabase = createClient();

  const [chargement, setChargement] = useState(true);
  const [refus, setRefus] = useState(false);
  const [ceMois, setCeMois] = useState(true);
  const [ouvert, setOuvert] = useState<string | null>(null);

  const [comApp, setComApp] = useState<Ligne[]>([]);
  const [comEspeces, setComEspeces] = useState<Ligne[]>([]);
  const [abos, setAbos] = useState<Ligne[]>([]);
  const [aRecevoir, setARecevoir] = useState<Ligne[]>([]);

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        router.push("/connexion");
        return;
      }
      // Verifier que l'utilisateur est bien admin.
      const { data: prof } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", auth.user.id)
        .maybeSingle();
      if (prof?.role !== "admin") {
        setRefus(true);
        setChargement(false);
        return;
      }

      // Tout charger en parallele.
      const [payRes, comRes, aboRes] = await Promise.all([
        supabase
          .from("payments")
          .select("id, job_id, commission_fcfa, payout_at, status")
          .eq("status", "released"),
        supabase
          .from("commissions")
          .select("id, artisan_id, job_amount_fcfa, amount_fcfa, status, paid_at, created_at"),
        supabase
          .from("artisan_subscriptions")
          .select("id, artisan_id, type, amount_fcfa, created_at"),
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

      // Relier les paiements a leur artisan (via le chantier).
      const jobIds = [...new Set(pays.map((p) => p.job_id))];
      const artisanParJob: Record<string, string> = {};
      if (jobIds.length) {
        const { data: jobs } = await supabase.from("jobs").select("id, artisan_id").in("id", jobIds);
        ((jobs ?? []) as { id: string; artisan_id: string }[]).forEach((j) => {
          artisanParJob[j.id] = j.artisan_id;
        });
      }

      // Noms de tous les artisans concernes.
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

  // ===== Filtre periode =====
  const debut = debutDuMois();
  const debutPrec = debutDuMois(-1);
  const filtrer = (l: Ligne[]) => (ceMois ? l.filter((x) => dansPeriode(x.date, debut, null)) : l);
  const somme = (l: Ligne[]) => l.reduce((s, x) => s + x.montant, 0);

  const fApp = filtrer(comApp);
  const fEsp = filtrer(comEspeces);
  const fAbo = filtrer(abos);
  const fRec = aRecevoir; // "a recevoir" : toujours tout, ce n'est pas encaisse

  const totalEncaisse = somme(fApp) + somme(fEsp) + somme(fAbo);
  const totalARecevoir = somme(fRec);

  // Mois precedent (pour la comparaison).
  const dansPrec = (l: Ligne[]) => l.filter((x) => dansPeriode(x.date, debutPrec, debut));
  const totalPrec =
    somme(dansPrec(comApp)) + somme(dansPrec(comEspeces)) + somme(dansPrec(abos));
  const evolution =
    totalPrec > 0 ? Math.round(((totalEncaisse - totalPrec) / totalPrec) * 100) : null;

  const blocs = [
    { cle: "app", titre: "Commissions (application)", lignes: fApp, couleur: "var(--color-vert)" },
    { cle: "esp", titre: "Versements des artisans", lignes: fEsp, couleur: "var(--color-orange)" },
    { cle: "abo", titre: "Abonnements & mises en avant", lignes: fAbo, couleur: "var(--color-or)" },
  ];

  if (chargement) {
    return (
      <div className="min-h-screen bg-fond">
        <FiletTricolore />
        <p className="px-5 py-10 text-center text-sm text-texte2">Chargement...</p>
      </div>
    );
  }
  if (refus) {
    return (
      <div className="min-h-screen bg-fond">
        <FiletTricolore />
        <p className="px-5 py-10 text-center text-sm text-texte2">Acces reserve a l&apos;administration.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-fond pb-24">
      <FiletTricolore />
      <div className="mx-auto max-w-md px-5 py-6">
        <header className="mb-5 flex items-center gap-3">
          <BoutonRetour />
          <h1 className="text-lg">Revenus</h1>
        </header>

        {/* ===== Bascule de periode ===== */}
        <div className="mb-4 flex gap-2">
          {[
            { v: true, l: "Ce mois" },
            { v: false, l: "Depuis le debut" },
          ].map((o) => (
            <button
              key={o.l}
              type="button"
              onClick={() => setCeMois(o.v)}
              className="flex-1 rounded-xl border py-2 text-sm font-medium"
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

        {/* ===== Total encaisse ===== */}
        <div
          className="mb-3 rounded-2xl border p-4"
          style={{ background: "var(--color-carte)", borderColor: "var(--color-vert)" }}
        >
          <span className="block text-xs uppercase tracking-wide" style={{ color: "var(--color-texte2)" }}>
            {ceMois ? "Encaisse ce mois" : "Encaisse depuis le debut"}
          </span>
          <span
            className="mt-1 block text-3xl font-bold"
            style={{ fontFamily: "var(--font-titre)", color: "var(--color-vert)" }}
          >
            {prix(totalEncaisse)}
          </span>
          {ceMois && evolution !== null && (
            <span
              className="mt-1 block text-xs font-medium"
              style={{ color: evolution >= 0 ? "var(--color-vert)" : "var(--color-orange)" }}
            >
              {evolution >= 0 ? "+" : ""}
              {evolution} % vs mois dernier ({prix(totalPrec)})
            </span>
          )}
        </div>

        {/* ===== A recevoir ===== */}
        <button
          type="button"
          onClick={() => setOuvert(ouvert === "rec" ? null : "rec")}
          className="mb-5 w-full rounded-2xl border p-4 text-left"
          style={{
            background: totalARecevoir > 0 ? "rgba(224,123,57,0.08)" : "var(--color-carte)",
            borderColor: totalARecevoir > 0 ? "var(--color-orange)" : "var(--color-bordure)",
          }}
        >
          <div className="flex items-center justify-between">
            <span>
              <span className="block text-xs uppercase tracking-wide" style={{ color: "var(--color-texte2)" }}>
                A recevoir des artisans
              </span>
              <span
                className="mt-0.5 block text-xl font-bold"
                style={{ fontFamily: "var(--font-titre)", color: "var(--color-orange)" }}
              >
                {prix(totalARecevoir)}
              </span>
            </span>
            <span className="text-xs" style={{ color: "var(--color-texte2)" }}>
              {fRec.length} en attente {ouvert === "rec" ? "▲" : "▼"}
            </span>
          </div>
        </button>
        {ouvert === "rec" && (
          <ListeLignes lignes={fRec} vide="Aucune commission en attente. Tout est a jour." />
        )}

        {/* ===== Les 3 sources, cliquables ===== */}
        <p className="mb-2 text-sm font-semibold" style={{ color: "var(--color-texte)" }}>
          Detail des revenus
        </p>
        <div className="flex flex-col gap-3">
          {blocs.map((b) => (
            <div key={b.cle}>
              <button
                type="button"
                onClick={() => setOuvert(ouvert === b.cle ? null : b.cle)}
                className="w-full rounded-2xl border p-4 text-left"
                style={{ background: "var(--color-carte)", borderColor: "var(--color-bordure)" }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span>
                    <span className="block text-sm font-medium" style={{ color: "var(--color-texte)" }}>
                      {b.titre}
                    </span>
                    <span className="text-xs" style={{ color: "var(--color-texte2)" }}>
                      {b.lignes.length} operation{b.lignes.length > 1 ? "s" : ""}
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="text-base font-bold" style={{ color: b.couleur }}>
                      {prix(somme(b.lignes))}
                    </span>
                    <span className="text-xs" style={{ color: "var(--color-texte2)" }}>
                      {ouvert === b.cle ? "▲" : "▼"}
                    </span>
                  </span>
                </div>
              </button>
              {ouvert === b.cle && (
                <ListeLignes lignes={b.lignes} vide="Aucune operation sur cette periode." />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ===== Liste depliable d'operations =====
function ListeLignes({ lignes, vide }: { lignes: Ligne[]; vide: string }) {
  if (lignes.length === 0) {
    return (
      <p
        className="mb-3 mt-2 rounded-xl border border-dashed p-4 text-center text-xs"
        style={{ borderColor: "var(--color-bordure)", color: "var(--color-texte2)" }}
      >
        {vide}
      </p>
    );
  }
  return (
    <div className="mb-3 mt-2 flex flex-col gap-2">
      {lignes
        .slice()
        .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))
        .map((l) => (
          <div
            key={l.id}
            className="flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5"
            style={{ background: "var(--color-secondaire)", borderColor: "var(--color-bordure)" }}
          >
            <span className="text-xs">
              <span className="block font-medium" style={{ color: "var(--color-texte)" }}>
                {l.qui}
              </span>
              <span className="block" style={{ color: "var(--color-texte2)" }}>
                {dateLisible(l.date)} · {l.detail}
              </span>
            </span>
            <span className="shrink-0 text-sm font-semibold" style={{ color: "var(--color-texte)" }}>
              {prix(l.montant)}
            </span>
          </div>
        ))}
    </div>
  );
}