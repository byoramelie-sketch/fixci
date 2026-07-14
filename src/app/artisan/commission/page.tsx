// >>> EMPLACEMENT : src/app/artisan/commissions/page.tsx
"use client";

// =========================================================================
// Onglet "Commissions" de l'artisan.
//   - Recapitule ses interventions et la commission FixCI correspondante.
//   - Chantiers payes DANS L'APP : la commission est deja prelevee -> rien
//     a faire, c'est indique "Deja prelevee".
//   - Chantiers payes EN ESPECES : l'artisan a encaisse 100 %, il doit donc
//     reverser la commission a FixCI -> bouton "Regler".
//   - En haut : le total restant a regler.
// Onglet principal -> barre de navigation du bas (NavArtisan).
// =========================================================================

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { FiletTricolore } from "@/components/ui";
import { NavArtisan } from "@/components/nav-artisan";

type Commission = {
  id: string;
  job_id: string;
  job_amount_fcfa: number;
  rate_percent: number;
  amount_fcfa: number;
  status: string;
  paid_at: string | null;
  created_at: string;
  titre: string;
};

type ChantierApp = {
  id: string;
  montant: number;
  commission: number;
  date: string;
  titre: string;
};

type MethodePaiement = "wave" | "orange_money";

function prix(n: number) {
  return n.toLocaleString("fr-FR") + " FCFA";
}
function dateLisible(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

export default function Commissions() {
  const supabase = createClient();
  const [chargement, setChargement] = useState(true);
  const [aRegler, setARegler] = useState<Commission[]>([]);
  const [reglees, setReglees] = useState<Commission[]>([]);
  const [viaApp, setViaApp] = useState<ChantierApp[]>([]);
  const [methode, setMethode] = useState<MethodePaiement>("wave");
  const [action, setAction] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  async function charger() {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      setChargement(false);
      return;
    }
    const uid = auth.user.id;

    // Commissions (mode especes) + chantiers payes dans l'app, en parallele.
    const [comRes, payRes] = await Promise.all([
      supabase
        .from("commissions")
        .select("id, job_id, job_amount_fcfa, rate_percent, amount_fcfa, status, paid_at, created_at")
        .eq("artisan_id", uid)
        .order("created_at", { ascending: false }),
      supabase
        .from("payments")
        .select("job_id, total_amount_fcfa, commission_fcfa, status, payout_at")
        .eq("status", "released"),
    ]);

    const coms = (comRes.data ?? []) as Omit<Commission, "titre">[];
    const pays = (payRes.data ?? []) as {
      job_id: string;
      total_amount_fcfa: number;
      commission_fcfa: number;
      payout_at: string | null;
    }[];

    // Titres des chantiers (via le devis lie).
    const jobIds = [...new Set([...coms.map((c) => c.job_id), ...pays.map((p) => p.job_id)])];
    const titres: Record<string, string> = {};
    let mesJobs: string[] = [];
    if (jobIds.length) {
      const { data: jobs } = await supabase
        .from("jobs")
        .select("id, quote_id, artisan_id")
        .in("id", jobIds);
      const lignes = (jobs ?? []) as { id: string; quote_id: string | null; artisan_id: string }[];
      mesJobs = lignes.filter((j) => j.artisan_id === uid).map((j) => j.id);

      const quoteIds = lignes.map((j) => j.quote_id).filter(Boolean) as string[];
      if (quoteIds.length) {
        const { data: qs } = await supabase.from("quotes").select("id, title").in("id", quoteIds);
        const parQuote: Record<string, string> = {};
        ((qs ?? []) as { id: string; title: string | null }[]).forEach((q) => {
          parQuote[q.id] = q.title ?? "Intervention";
        });
        lignes.forEach((j) => {
          titres[j.id] = j.quote_id ? parQuote[j.quote_id] ?? "Intervention" : "Intervention";
        });
      }
    }

    const avecTitre = coms.map((c) => ({ ...c, titre: titres[c.job_id] ?? "Intervention" }));
    setARegler(avecTitre.filter((c) => c.status === "due"));
    setReglees(avecTitre.filter((c) => c.status === "paid"));

    setViaApp(
      pays
        .filter((p) => mesJobs.includes(p.job_id))
        .map((p) => ({
          id: p.job_id,
          montant: p.total_amount_fcfa,
          commission: p.commission_fcfa,
          date: p.payout_at ?? "",
          titre: titres[p.job_id] ?? "Intervention",
        }))
    );

    setChargement(false);
  }

  useEffect(() => {
    charger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function regler(id: string) {
    setAction(id);
    setErreur(null);
    try {
      const { error } = await supabase.rpc("fixci_payer_commission", {
        p_commission_id: id,
        p_methode: methode,
      });
      if (error) throw new Error(error.message);
      await charger();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Reglement impossible.");
    } finally {
      setAction(null);
    }
  }

  const totalDu = aRegler.reduce((s, c) => s + c.amount_fcfa, 0);

  return (
    <div className="min-h-screen bg-fond pb-24">
      <FiletTricolore />
      <div className="mx-auto max-w-md px-5 py-6">
        <h1 className="mb-1 text-xl" style={{ color: "var(--color-texte)" }}>
          Commissions
        </h1>
        <p className="mb-5 text-sm" style={{ color: "var(--color-texte2)" }}>
          FixCI preleve 10 % sur chaque intervention reglee.
        </p>

        {chargement ? (
          <p className="pt-8 text-center text-sm" style={{ color: "var(--color-texte2)" }}>
            Chargement...
          </p>
        ) : (
          <>
            {/* ===== Total a regler ===== */}
            <div
              className="mb-5 rounded-2xl border p-4"
              style={{
                background: totalDu > 0 ? "rgba(224,123,57,0.08)" : "var(--color-carte)",
                borderColor: totalDu > 0 ? "var(--color-orange)" : "var(--color-bordure)",
              }}
            >
              <span className="block text-xs uppercase tracking-wide" style={{ color: "var(--color-texte2)" }}>
                A regler
              </span>
              <span
                className="mt-1 block text-2xl font-bold"
                style={{
                  fontFamily: "var(--font-titre)",
                  color: totalDu > 0 ? "var(--color-orange)" : "var(--color-vert)",
                }}
              >
                {prix(totalDu)}
              </span>
              {totalDu === 0 && (
                <span className="mt-1 block text-xs" style={{ color: "var(--color-vert)" }}>
                  Vous etes a jour. Merci !
                </span>
              )}
            </div>

            {erreur && (
              <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{erreur}</p>
            )}

            {/* ===== Moyen de paiement (si quelque chose a regler) ===== */}
            {aRegler.length > 0 && (
              <div className="mb-4 flex gap-2">
                {(["wave", "orange_money"] as MethodePaiement[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMethode(m)}
                    className="flex-1 rounded-xl border py-2.5 text-sm font-medium"
                    style={{
                      borderColor: methode === m ? "var(--color-orange)" : "var(--color-bordure)",
                      background: methode === m ? "var(--color-secondaire)" : "var(--color-carte)",
                      color: methode === m ? "var(--color-orange)" : "var(--color-texte2)",
                    }}
                  >
                    {m === "wave" ? "Wave" : "Orange Money"}
                  </button>
                ))}
              </div>
            )}

            {/* ===== A regler (chantiers payes en especes) ===== */}
            {aRegler.length > 0 && (
              <>
                <p className="mb-2 text-sm font-semibold" style={{ color: "var(--color-texte)" }}>
                  A regler ({aRegler.length})
                </p>
                <div className="mb-5 flex flex-col gap-3">
                  {aRegler.map((c) => (
                    <div
                      key={c.id}
                      className="rounded-2xl border p-4"
                      style={{ background: "var(--color-carte)", borderColor: "var(--color-bordure)" }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-medium" style={{ color: "var(--color-texte)" }}>
                          {c.titre}
                        </span>
                        <span
                          className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium"
                          style={{ background: "var(--color-secondaire)", color: "var(--color-texte2)" }}
                        >
                          Especes
                        </span>
                      </div>
                      <p className="mt-1 text-xs" style={{ color: "var(--color-texte2)" }}>
                        {dateLisible(c.created_at)} · Intervention de {prix(c.job_amount_fcfa)}
                      </p>
                      <div className="mt-2 flex items-baseline justify-between">
                        <span className="text-xs" style={{ color: "var(--color-texte2)" }}>
                          Commission ({c.rate_percent} %)
                        </span>
                        <span className="text-base font-bold" style={{ color: "var(--color-orange)" }}>
                          {prix(c.amount_fcfa)}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => regler(c.id)}
                        disabled={action === c.id}
                        className="mt-3 w-full rounded-xl py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                        style={{ background: "var(--color-orange)" }}
                      >
                        {action === c.id ? "Reglement..." : `Regler ${prix(c.amount_fcfa)}`}
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* ===== Historique : deja prelevees (paiement dans l'app) ===== */}
            {viaApp.length > 0 && (
              <>
                <p className="mb-2 text-sm font-semibold" style={{ color: "var(--color-texte)" }}>
                  Deja prelevees ({viaApp.length})
                </p>
                <div className="mb-5 flex flex-col gap-2">
                  {viaApp.map((j) => (
                    <div
                      key={j.id}
                      className="flex items-center justify-between rounded-xl border p-3"
                      style={{ background: "var(--color-carte)", borderColor: "var(--color-bordure)" }}
                    >
                      <span className="text-sm">
                        <span className="block" style={{ color: "var(--color-texte)" }}>
                          {j.titre}
                        </span>
                        <span className="block text-xs" style={{ color: "var(--color-texte2)" }}>
                          {j.date ? dateLisible(j.date) : ""} · {prix(j.montant)} · Payee dans l&apos;app
                        </span>
                      </span>
                      <span className="shrink-0 text-sm font-medium" style={{ color: "var(--color-vert)" }}>
                        {prix(j.commission)}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* ===== Historique : commissions reglees ===== */}
            {reglees.length > 0 && (
              <>
                <p className="mb-2 text-sm font-semibold" style={{ color: "var(--color-texte)" }}>
                  Reglees ({reglees.length})
                </p>
                <div className="flex flex-col gap-2">
                  {reglees.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between rounded-xl border p-3"
                      style={{ background: "var(--color-carte)", borderColor: "var(--color-bordure)" }}
                    >
                      <span className="text-sm">
                        <span className="block" style={{ color: "var(--color-texte)" }}>
                          {c.titre}
                        </span>
                        <span className="block text-xs" style={{ color: "var(--color-texte2)" }}>
                          {c.paid_at ? dateLisible(c.paid_at) : ""} · Reglee
                        </span>
                      </span>
                      <span className="shrink-0 text-sm font-medium" style={{ color: "var(--color-vert)" }}>
                        {prix(c.amount_fcfa)}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* ===== Rien du tout ===== */}
            {aRegler.length === 0 && reglees.length === 0 && viaApp.length === 0 && (
              <p
                className="rounded-xl border border-dashed p-5 text-center text-sm"
                style={{ borderColor: "var(--color-bordure)", color: "var(--color-texte2)" }}
              >
                Vos commissions apparaitront ici apres vos premieres interventions validees.
              </p>
            )}
          </>
        )}
      </div>
      <NavArtisan />
    </div>
  );
}
