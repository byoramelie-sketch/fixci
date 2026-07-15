// >>> EMPLACEMENT : src/app/recu/page.tsx
"use client";

// =========================================================================
// RECU d'une intervention — ecran partage CLIENT et ARTISAN.
//   Route : /recu?job={idChantier}
//
//   S'adapte tout seul :
//     - Acompte paye seulement       -> "Recu d'acompte"
//     - Intervention validee/payee   -> "Recu final" (recapitulatif complet)
//     - Mode especes                 -> reglement de la main a la main
//
//   Chacun voit ce qui le concerne :
//     - le CLIENT voit ce qu'il a paye,
//     - l'ARTISAN voit ce qu'il a recu, la commission FixCI et son net.
//
//   Bouton "Imprimer / PDF" : utilise l'impression du navigateur (permet
//   d'enregistrer en PDF ou d'envoyer par WhatsApp).
// Ecran enfant -> fleche retour en haut (masquee a l'impression).
// =========================================================================

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { BoutonRetour } from "@/components/icones";

type LigneDevis = {
  description: string;
  quantite: number;
  unite: string;
  prix_unitaire: number;
  total: number;
  type: string;
};

type Donnees = {
  role: "client" | "artisan";
  titre: string;
  clientNom: string;
  artisanNom: string;
  montant: number;
  statutJob: string;
  mode: "app" | "especes";
  lignes: LigneDevis[];
  // Mode app
  acompte: number;
  acomptePaye: string | null;
  solde: number;
  soldePaye: string | null;
  commission: number;
  net: number;
  reference: string | null;
  methode: string | null;
  // Mode especes
  commissionDue: number | null;
  commissionStatut: string | null;
  valideLe: string | null;
};

function prix(n: number) {
  return n.toLocaleString("fr-FR") + " FCFA";
}
function dateLisible(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}
function libelleMethode(m: string | null) {
  if (m === "wave") return "Wave";
  if (m === "orange_money") return "Orange Money";
  return null;
}

function RecuContenu() {
  const router = useRouter();
  const params = useSearchParams();
  const supabase = createClient();
  const jobId = params.get("job") ?? "";

  const [chargement, setChargement] = useState(true);
  const [d, setD] = useState<Donnees | null>(null);

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        router.push("/connexion");
        return;
      }
      const uid = auth.user.id;

      // Le chantier (porte le prix convenu et le mode de reglement).
      const { data: job } = await supabase
        .from("jobs")
        .select(
          "id, client_id, artisan_id, quote_id, agreed_price_fcfa, status, payment_mode, validated_at"
        )
        .eq("id", jobId)
        .maybeSingle();

      if (!job) {
        setChargement(false);
        return;
      }
      const role: "client" | "artisan" | null =
        job.client_id === uid ? "client" : job.artisan_id === uid ? "artisan" : null;
      if (!role) {
        setChargement(false);
        return;
      }

      // Le reste en parallele.
      const [payRes, quoteRes, profsRes, comRes] = await Promise.all([
        supabase
          .from("payments")
          .select(
            "deposit_fcfa, deposit_paid_at, balance_fcfa, balance_paid_at, commission_fcfa, artisan_payout_fcfa, aggregator_reference, payment_method, total_amount_fcfa"
          )
          .eq("job_id", jobId)
          .maybeSingle(),
        job.quote_id
          ? supabase.from("quotes").select("title, lines").eq("id", job.quote_id).maybeSingle()
          : Promise.resolve({ data: null }),
        supabase.from("profiles").select("id, name").in("id", [job.client_id, job.artisan_id]),
        // Les commissions ne sont lisibles que par l'artisan concerne.
        role === "artisan"
          ? supabase
              .from("commissions")
              .select("amount_fcfa, status")
              .eq("job_id", jobId)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      const pay = payRes.data as {
        deposit_fcfa: number;
        deposit_paid_at: string | null;
        balance_fcfa: number;
        balance_paid_at: string | null;
        commission_fcfa: number;
        artisan_payout_fcfa: number;
        aggregator_reference: string | null;
        payment_method: string | null;
        total_amount_fcfa: number;
      } | null;

      const quote = quoteRes.data as { title: string | null; lines: LigneDevis[] } | null;
      const com = comRes.data as { amount_fcfa: number; status: string } | null;

      const noms: Record<string, string> = {};
      ((profsRes.data ?? []) as { id: string; name: string | null }[]).forEach((p) => {
        noms[p.id] = p.name ?? "—";
      });

      setD({
        role,
        titre: quote?.title ?? "Intervention",
        clientNom: noms[job.client_id] ?? "Client",
        artisanNom: noms[job.artisan_id] ?? "Artisan",
        montant: job.agreed_price_fcfa,
        statutJob: job.status,
        mode: job.payment_mode === "especes" ? "especes" : "app",
        lignes: Array.isArray(quote?.lines) ? quote!.lines : [],
        acompte: pay?.deposit_fcfa ?? 0,
        acomptePaye: pay?.deposit_paid_at ?? null,
        solde: pay?.balance_fcfa ?? 0,
        soldePaye: pay?.balance_paid_at ?? null,
        commission: pay?.commission_fcfa ?? 0,
        net: pay?.artisan_payout_fcfa ?? 0,
        reference: pay?.aggregator_reference ?? null,
        methode: pay?.payment_method ?? null,
        commissionDue: com?.amount_fcfa ?? null,
        commissionStatut: com?.status ?? null,
        valideLe: job.validated_at ?? null,
      });
      setChargement(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  if (chargement) {
    return <p className="px-5 py-10 text-center text-sm text-texte2">Chargement...</p>;
  }
  if (!d) {
    return <p className="px-5 py-10 text-center text-sm text-texte2">Recu introuvable.</p>;
  }

  // Reçu final si le travail est valide (ou si le solde est paye).
  const final = d.statutJob === "validated" || !!d.soldePaye;
  const titreRecu = final ? "Recu final" : "Recu d'acompte";

  return (
    <div className="min-h-screen bg-fond">
      {/* Barre du haut (masquee a l'impression) */}
      <div className="mx-auto flex max-w-md items-center justify-between px-5 pt-6 no-print">
        <BoutonRetour />
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-xl px-4 py-2 text-sm font-semibold text-white"
          style={{ background: "var(--color-orange)" }}
        >
          Imprimer / PDF
        </button>
      </div>

      <div className="mx-auto max-w-md px-5 py-5">
        {/* ===== Le reçu ===== */}
        <div
          id="recu"
          className="rounded-2xl border p-5"
          style={{ background: "var(--color-carte)", borderColor: "var(--color-bordure)" }}
        >
          {/* En-tete */}
          <div className="filet-tricolore mb-4 h-1 w-full rounded" />
          <div className="mb-4 flex items-start justify-between">
            <div>
              <span
                className="text-xl font-bold"
                style={{ fontFamily: "var(--font-titre)", color: "var(--color-texte)" }}
              >
                Fix<span style={{ color: "var(--color-orange)" }}>CI</span>
              </span>
              <span className="block text-[11px]" style={{ color: "var(--color-texte2)" }}>
                Services a domicile · Abidjan
              </span>
            </div>
            <div className="text-right">
              <span className="block text-sm font-semibold" style={{ color: "var(--color-texte)" }}>
                {titreRecu}
              </span>
              {d.reference && (
                <span className="block text-[11px]" style={{ color: "var(--color-texte2)" }}>
                  N° {d.reference}
                </span>
              )}
              <span className="block text-[11px]" style={{ color: "var(--color-texte2)" }}>
                {dateLisible(final ? d.valideLe ?? d.soldePaye : d.acomptePaye)}
              </span>
            </div>
          </div>

          {/* Parties */}
          <div
            className="mb-4 grid grid-cols-2 gap-3 border-y py-3 text-xs"
            style={{ borderColor: "var(--color-bordure)" }}
          >
            <div>
              <span className="block" style={{ color: "var(--color-texte2)" }}>
                Client
              </span>
              <span className="font-medium" style={{ color: "var(--color-texte)" }}>
                {d.clientNom}
              </span>
            </div>
            <div>
              <span className="block" style={{ color: "var(--color-texte2)" }}>
                Artisan
              </span>
              <span className="font-medium" style={{ color: "var(--color-texte)" }}>
                {d.artisanNom}
              </span>
            </div>
          </div>

          {/* Intervention */}
          <span className="mb-1 block text-[11px] uppercase tracking-wide" style={{ color: "var(--color-texte2)" }}>
            Intervention
          </span>
          <span className="mb-3 block text-sm font-medium" style={{ color: "var(--color-texte)" }}>
            {d.titre}
          </span>

          {/* Detail des postes (si devis detaille) */}
          {d.lignes.length > 0 && (
            <div className="mb-3 border-t pt-2" style={{ borderColor: "var(--color-bordure)" }}>
              {d.lignes.map((l, i) => (
                <div key={i} className="flex items-start justify-between gap-2 py-1 text-xs">
                  <span style={{ color: "var(--color-texte)" }}>
                    {l.description}
                    <span className="block" style={{ color: "var(--color-texte2)" }}>
                      {l.quantite} {l.unite} x {prix(l.prix_unitaire)}
                    </span>
                  </span>
                  <span className="shrink-0 font-medium">{prix(l.total)}</span>
                </div>
              ))}
            </div>
          )}

          {/* ===== MODE APPLICATION : versements ===== */}
          {d.mode === "app" && (
            <div className="border-t pt-3 text-sm" style={{ borderColor: "var(--color-bordure)" }}>
              <div className="flex justify-between py-0.5">
                <span style={{ color: "var(--color-texte2)" }}>
                  Acompte (40 %) · {d.acomptePaye ? dateLisible(d.acomptePaye) : "en attente"}
                </span>
                <span>{prix(d.acompte)}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span style={{ color: "var(--color-texte2)" }}>
                  Solde (60 %) · {d.soldePaye ? dateLisible(d.soldePaye) : "en attente"}
                </span>
                <span>{prix(d.solde)}</span>
              </div>
              <div
                className="mt-1 flex justify-between border-t pt-2 text-base font-bold"
                style={{ borderColor: "var(--color-bordure)" }}
              >
                <span>{d.role === "client" ? "Total paye" : "Total de l'intervention"}</span>
                <span style={{ color: "var(--color-orange)" }}>
                  {prix(final ? d.montant : d.acompte)}
                </span>
              </div>

              {/* L'artisan voit sa commission et son net */}
              {d.role === "artisan" && final && (
                <div
                  className="mt-2 border-t pt-2 text-xs"
                  style={{ borderColor: "var(--color-bordure)" }}
                >
                  <div className="flex justify-between py-0.5">
                    <span style={{ color: "var(--color-texte2)" }}>Commission FixCI</span>
                    <span>- {prix(d.commission)}</span>
                  </div>
                  <div className="flex justify-between py-0.5 text-sm font-bold">
                    <span>Net verse</span>
                    <span style={{ color: "var(--color-vert)" }}>{prix(d.net)}</span>
                  </div>
                </div>
              )}

              {libelleMethode(d.methode) && (
                <span className="mt-2 block text-[11px]" style={{ color: "var(--color-texte2)" }}>
                  Moyen de paiement : {libelleMethode(d.methode)}
                </span>
              )}
            </div>
          )}

          {/* ===== MODE ESPECES ===== */}
          {d.mode === "especes" && (
            <div className="border-t pt-3 text-sm" style={{ borderColor: "var(--color-bordure)" }}>
              <div className="flex justify-between py-0.5">
                <span style={{ color: "var(--color-texte2)" }}>Reglement en especes</span>
                <span>{d.valideLe ? dateLisible(d.valideLe) : "en attente"}</span>
              </div>
              <div
                className="mt-1 flex justify-between border-t pt-2 text-base font-bold"
                style={{ borderColor: "var(--color-bordure)" }}
              >
                <span>{d.role === "client" ? "Montant regle" : "Montant encaisse"}</span>
                <span style={{ color: "var(--color-orange)" }}>{prix(d.montant)}</span>
              </div>

              {/* L'artisan voit la commission a reverser */}
              {d.role === "artisan" && d.commissionDue != null && (
                <div
                  className="mt-2 border-t pt-2 text-xs"
                  style={{ borderColor: "var(--color-bordure)" }}
                >
                  <div className="flex justify-between py-0.5">
                    <span style={{ color: "var(--color-texte2)" }}>
                      Commission FixCI a reverser
                    </span>
                    <span
                      style={{
                        color:
                          d.commissionStatut === "paid"
                            ? "var(--color-vert)"
                            : "var(--color-orange)",
                        fontWeight: 600,
                      }}
                    >
                      {prix(d.commissionDue)} · {d.commissionStatut === "paid" ? "reglee" : "a regler"}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Statut */}
          <div
            className="mt-4 rounded-lg py-2 text-center text-xs font-semibold"
            style={{
              background: final ? "rgba(76,140,90,0.10)" : "var(--color-secondaire)",
              color: final ? "var(--color-vert)" : "var(--color-or)",
            }}
          >
            {final ? "Intervention validee et reglee" : "Acompte recu — intervention en cours"}
          </div>

          <span className="mt-3 block text-center text-[10px]" style={{ color: "var(--color-texte2)" }}>
            Document genere par FixCI · fixci-ten.vercel.app
          </span>
          <div className="filet-tricolore mt-3 h-1 w-full rounded" />
        </div>

        {/* Mention demo (masquee a l'impression) */}
        <p className="mt-3 text-center text-[11px] no-print" style={{ color: "var(--color-texte2)" }}>
          Paiement simule (demo) — ce recu est un justificatif de suivi.
        </p>
      </div>

      {/* Reglages d'impression : ne garder que le recu */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; }
          #recu { border: none !important; box-shadow: none !important; }
        }
      `}</style>
    </div>
  );
}

export default function PageRecu() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-fond" />}>
      <RecuContenu />
    </Suspense>
  );
}