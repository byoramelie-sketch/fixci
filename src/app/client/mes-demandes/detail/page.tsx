// >>> EMPLACEMENT : src/app/client/mes-demandes/detail/page.tsx
"use client";

// =========================================================================
// Detail d'une demande cote CLIENT + reponse aux offres (devis).
//   - La demande est identifiee par ?id=... dans l'adresse.
//   - Affiche : service, statut, budget propose, description.
//   - Liste les OFFRES recues des artisans (table quotes) :
//       . pour chaque offre "en attente" -> ACCEPTER ou REFUSER
//       . accepter cree le chantier (via la fonction securisee).
//   - DEUX FACONS DE REGLER :
//       . dans l'application : acompte 40 % puis solde 60 % (commission
//         prelevee automatiquement, artisan paye apres validation) ;
//       . en especes : le client paie l'artisan de la main a la main, puis
//         valide simplement le travail. L'artisan reversera la commission.
// Ecran enfant -> fleche retour en haut.
// =========================================================================

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { BoutonRetour, IconeCheck } from "@/components/icones";
import {
  payerAcompte,
  finaliserPaiement,
  lirePaiement,
  type Paiement,
  type MethodePaiement,
} from "@/lib/paiement";
import { ouvrirConversation } from "@/lib/messagerie";
import { Noter } from "@/components/noter";

// ===== Types =====
type Demande = {
  id: string;
  description: string;
  status: string;
  budgetFcfa: number | null;
  serviceNom: string;
};
type Offre = {
  id: string;
  artisanId: string;
  artisanNom: string;
  montant: number;
  description: string | null;
  statut: string;
};

// ===== Libelles des statuts de demande =====
const STATUT_LIBELLE: Record<string, string> = {
  new: "Nouvelle",
  quote_in_progress: "Devis en cours",
  quote_accepted: "Devis accepte",
  en_route: "En route",
  completed: "Terminee",
  validated: "Validee",
  cancelled: "Annulee",
  disputed: "Litige",
};

// ===== Prix lisible =====
function prixLisible(p: number) {
  return p.toLocaleString("fr-FR") + " FCFA";
}

// ===== Page (enveloppe Suspense pour lire l'adresse) =====
export default function PageDetailDemandeClient() {
  return (
    <Suspense fallback={<p className="pt-10 text-center text-sm text-texte2">Chargement...</p>}>
      <Contenu />
    </Suspense>
  );
}

function Contenu() {
  const router = useRouter();
  const params = useSearchParams();
  const supabase = createClient();
  const idDemande = params.get("id") ?? "";

  const [chargement, setChargement] = useState(true);
  const [uid, setUid] = useState<string | null>(null);
  const [demande, setDemande] = useState<Demande | null>(null);
  const [offres, setOffres] = useState<Offre[]>([]);
  const [action, setAction] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [modePaiement, setModePaiement] = useState<"app" | "especes">("app");
  const [paiement, setPaiement] = useState<Paiement | null>(null);
  const [methode, setMethode] = useState<MethodePaiement>("wave");
  const [dejaNote, setDejaNote] = useState(false);

  // ===== Chargement (extrait pour pouvoir recharger apres une action) =====
  async function charger() {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      router.push("/connexion");
      return;
    }
    setUid(auth.user.id);

    // ===== Chargement en 2 vagues PARALLELES (au lieu d'un enchainement) =====
    const uid = auth.user.id;

    // Vague 1 : requetes qui ne dependent que de l'identifiant de la demande.
    const [srRes, quotesRes, jobsRes] = await Promise.all([
      supabase
        .from("service_requests")
        .select("id, description, status, budget_fcfa, trade_id, client_id")
        .eq("id", idDemande)
        .single(),
      supabase
        .from("quotes")
        .select("id, artisan_id, amount_fcfa, description, status")
        .eq("request_id", idDemande)
        .in("status", ["proposed", "accepted"])
        .order("created_at", { ascending: false }),
      supabase.from("jobs").select("id, payment_mode").eq("request_id", idDemande).limit(1),
    ]);

    const d = srRes.data;
    if (!d || d.client_id !== uid) {
      setDemande(null);
      setChargement(false);
      return;
    }

    const lignes = (quotesRes.data ?? []) as {
      id: string;
      artisan_id: string;
      amount_fcfa: number;
      description: string | null;
      status: string;
    }[];
    const job = (jobsRes.data ?? [])[0] as { id: string; payment_mode: string } | undefined;
    setJobId(job ? job.id : null);
    setModePaiement(job?.payment_mode === "especes" ? "especes" : "app");

    // Vague 2 : requetes qui dependent de la vague 1, lancees en parallele.
    const idsArtisans = [...new Set(lignes.map((l) => l.artisan_id))];
    const [tradeRes, profsRes, paiementRes, avisRes] = await Promise.all([
      supabase.from("trades").select("name").eq("id", d.trade_id).single(),
      supabase
        .from("profiles")
        .select("id, name")
        .in("id", idsArtisans.length ? idsArtisans : ["00000000-0000-0000-0000-000000000000"]),
      job ? lirePaiement(job.id) : Promise.resolve(null),
      job
        ? supabase
            .from("reviews")
            .select("id")
            .eq("job_id", job.id)
            .eq("author_id", uid)
            .eq("direction", "client_to_artisan")
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    const trade = tradeRes.data;
    const noms: Record<string, string> = {};
    ((profsRes.data ?? []) as { id: string; name: string | null }[]).forEach((p) => {
      noms[p.id] = p.name ?? "Artisan";
    });
    setPaiement(paiementRes);
    setDejaNote(job ? !!avisRes.data : false);

    setDemande({
      id: d.id,
      description: d.description,
      status: d.status,
      budgetFcfa: d.budget_fcfa ?? null,
      serviceNom: trade?.name ?? "Service",
    });
    setOffres(
      lignes.map((l) => ({
        id: l.id,
        artisanId: l.artisan_id,
        artisanNom: noms[l.artisan_id] ?? "Artisan",
        montant: l.amount_fcfa,
        description: l.description,
        statut: l.status,
      }))
    );
    setChargement(false);
  }

  useEffect(() => {
    charger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idDemande]);

  // ===== Accepter une offre : cree le chantier (fonction securisee) =====
  async function accepter(offre: Offre) {
    if (!uid || !demande) return;
    setAction(true);
    setErreur(null);
    try {
      const { error } = await supabase.rpc("fixci_repondre_devis", {
        p_quote_id: offre.id,
        p_accepter: true,
      });
      if (error) throw new Error(error.message);
      await charger();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Action impossible.");
    } finally {
      setAction(false);
    }
  }

  // ===== Refuser une offre =====
  async function refuser(offre: Offre) {
    setAction(true);
    setErreur(null);
    try {
      const { error } = await supabase.rpc("fixci_repondre_devis", {
        p_quote_id: offre.id,
        p_accepter: false,
      });
      if (error) throw new Error(error.message);
      await charger();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Action impossible.");
    } finally {
      setAction(false);
    }
  }

  // ===== Payer l'acompte (40 %) via le module paiement =====
  async function reglerAcompte() {
    if (!jobId) return;
    setAction(true);
    setErreur(null);
    try {
      await payerAcompte(jobId, methode);
      await charger();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Paiement impossible.");
    } finally {
      setAction(false);
    }
  }

  // ===== Valider le travail ET payer le solde (60 %) + liberation =====
  async function reglerSolde() {
    if (!jobId) return;
    setAction(true);
    setErreur(null);
    try {
      await finaliserPaiement(jobId, methode);
      await charger();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Action impossible.");
    } finally {
      setAction(false);
    }
  }

  // ===== Choisir de regler en ESPECES (main a la main) =====
  async function choisirEspeces() {
    if (!jobId) return;
    setAction(true);
    setErreur(null);
    try {
      const { error } = await supabase.rpc("fixci_choisir_especes", { p_job_id: jobId });
      if (error) throw new Error(error.message);
      await charger();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Action impossible.");
    } finally {
      setAction(false);
    }
  }

  // ===== Valider le travail regle en especes =====
  async function validerEspeces() {
    if (!jobId) return;
    setAction(true);
    setErreur(null);
    try {
      const { error } = await supabase.rpc("fixci_valider_especes", { p_job_id: jobId });
      if (error) throw new Error(error.message);
      await charger();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Action impossible.");
    } finally {
      setAction(false);
    }
  }

  // ===== Ouvrir (ou creer) la conversation avec un artisan =====
  async function discuter(artisanId: string) {
    if (!uid) return;
    setAction(true);
    setErreur(null);
    try {
      const convId = await ouvrirConversation(idDemande, uid, artisanId);
      if (convId) router.push(`/client/messages/conversation?id=${convId}`);
      else setErreur("Impossible d'ouvrir la conversation.");
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Impossible d'ouvrir la conversation.");
    } finally {
      setAction(false);
    }
  }

  // ===== En-tete commun =====
  const enTete = (
    <div className="flex items-center gap-2">
      <BoutonRetour />
      <h1 className="text-xl" style={{ color: "var(--color-texte)" }}>
        Ma demande
      </h1>
    </div>
  );

  // ===== Petit selecteur Wave / Orange Money (affiche au moment de payer) =====
  const selecteurMethode = (
    <div className="flex gap-2">
      {(["wave", "orange_money"] as MethodePaiement[]).map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => setMethode(m)}
          className="flex-1 rounded-lg border py-1.5 text-xs font-medium"
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
  );

  if (chargement) {
    return (
      <div className="flex flex-col gap-4">
        {enTete}
        <p className="pt-10 text-center text-sm text-texte2">Chargement...</p>
      </div>
    );
  }
  if (!demande) {
    return (
      <div className="flex flex-col gap-4">
        {enTete}
        <p className="pt-10 text-center text-sm text-texte2">Demande introuvable.</p>
      </div>
    );
  }

  const offresEnAttente = offres.filter((o) => o.statut === "proposed");
  const offreAcceptee = offres.find((o) => o.statut === "accepted");
  const enEspeces = modePaiement === "especes";

  return (
    <div className="flex flex-col gap-5">
      {enTete}

      {/* ===== Resume de la demande ===== */}
      <div
        className="flex flex-col gap-2 rounded-xl border p-4"
        style={{ background: "var(--color-carte)", borderColor: "var(--color-bordure)" }}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-base font-semibold" style={{ color: "var(--color-texte)" }}>
            {demande.serviceNom}
          </span>
          <span
            className="rounded-full px-2.5 py-0.5 text-xs font-medium"
            style={{ color: "var(--color-or)", background: "var(--color-secondaire)" }}
          >
            {STATUT_LIBELLE[demande.status] ?? demande.status}
          </span>
        </div>
        <p className="text-sm" style={{ color: "var(--color-texte2)" }}>
          {demande.description}
        </p>
        {demande.budgetFcfa != null && (
          <p className="text-sm" style={{ color: "var(--color-texte2)" }}>
            Budget propose : <span className="font-medium">{prixLisible(demande.budgetFcfa)}</span>
          </p>
        )}
      </div>

      {erreur && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{erreur}</p>
      )}

      {/* ===== Le chantier (apres acceptation de l'offre) ===== */}
      {offreAcceptee && (
        <div
          className="flex flex-col gap-2 rounded-xl border p-4"
          style={{ background: "var(--color-carte)", borderColor: "var(--color-bordure)" }}
        >
          <span className="flex items-center gap-1 text-sm font-semibold" style={{ color: "var(--color-vert)" }}>
            <IconeCheck taille={16} /> Offre acceptee
          </span>
          <span className="text-sm" style={{ color: "var(--color-texte)" }}>
            {offreAcceptee.artisanNom} — {prixLisible(offreAcceptee.montant)}
          </span>

          {/* --- Etape 1 : choisir comment regler (app ou especes) --- */}
          {demande.status === "quote_accepted" && !paiement && !enEspeces && (
            <>
              <span className="text-xs" style={{ color: "var(--color-texte2)" }}>
                Pour lancer l&apos;intervention, reglez l&apos;acompte de 40 %. L&apos;artisan est
                paye a la fin, une fois le travail valide.
              </span>
              {selecteurMethode}
              <button
                type="button"
                onClick={reglerAcompte}
                disabled={action}
                className="mt-1 w-full rounded-xl py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: "var(--color-orange)" }}
              >
                Payer l&apos;acompte ({prixLisible(Math.round(offreAcceptee.montant * 0.4))})
              </button>
              <span className="text-[10px]" style={{ color: "var(--color-texte2)" }}>
                Paiement simule (demo) — aucun vrai prelevement.
              </span>

              {/* Alternative : payer l'artisan en especes */}
              <button
                type="button"
                onClick={choisirEspeces}
                disabled={action}
                className="mt-1 w-full rounded-xl border py-2 text-xs font-medium disabled:opacity-50"
                style={{ borderColor: "var(--color-bordure)", color: "var(--color-texte2)" }}
              >
                Je prefere payer l&apos;artisan en especes
              </button>
            </>
          )}

          {/* --- Mode especes : rappel --- */}
          {enEspeces && demande.status === "quote_accepted" && (
            <span
              className="rounded-lg px-3 py-2 text-xs"
              style={{ background: "var(--color-secondaire)", color: "var(--color-texte2)" }}
            >
              Reglement en especes : vous paierez {prixLisible(offreAcceptee.montant)} directement a
              l&apos;artisan. Vous validerez le travail ici une fois termine.
            </span>
          )}

          {demande.status === "quote_accepted" && paiement && (
            <span className="text-xs font-medium" style={{ color: "var(--color-vert)" }}>
              Acompte paye ({prixLisible(paiement.deposit_fcfa)}). En attente du demarrage de l&apos;artisan.
            </span>
          )}

          {/* --- En route --- */}
          {demande.status === "en_route" && (
            <span className="text-xs font-medium" style={{ color: "var(--color-or)" }}>
              L&apos;artisan est en route.
            </span>
          )}

          {/* --- Etape 2 (mode app) : valider + payer le solde 60 % --- */}
          {demande.status === "completed" && !enEspeces && (
            <>
              <span className="text-xs" style={{ color: "var(--color-texte2)" }}>
                L&apos;artisan indique avoir termine. Validez le travail et reglez le solde de 60 %.
              </span>
              {selecteurMethode}
              <button
                type="button"
                onClick={reglerSolde}
                disabled={action}
                className="mt-1 w-full rounded-xl py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: "var(--color-vert)" }}
              >
                Valider et payer le solde{paiement ? ` (${prixLisible(paiement.balance_fcfa)})` : ""}
              </button>
            </>
          )}

          {/* --- Etape 2 (mode especes) : valider le travail --- */}
          {demande.status === "completed" && enEspeces && (
            <>
              <span className="text-xs" style={{ color: "var(--color-texte2)" }}>
                L&apos;artisan indique avoir termine. Si le travail est fait et que vous l&apos;avez
                regle en especes, validez ci-dessous.
              </span>
              <button
                type="button"
                onClick={validerEspeces}
                disabled={action}
                className="mt-1 w-full rounded-xl py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: "var(--color-vert)" }}
              >
                Valider le travail
              </button>
            </>
          )}

          {/* --- Termine --- */}
          {demande.status === "validated" && (
            <span className="text-xs font-medium" style={{ color: "var(--color-vert)" }}>
              {enEspeces
                ? "Travail valide. Merci d'avoir utilise FixCI !"
                : "Travail valide et paye. Merci d'avoir utilise FixCI !"}
            </span>
          )}

          {/* --- Recapitulatif du paiement (des qu'une ligne existe) --- */}
          {paiement && (
            <div
              className="mt-1 flex flex-col gap-0.5 border-t pt-2 text-[11px]"
              style={{ borderColor: "var(--color-bordure)", color: "var(--color-texte2)" }}
            >
              <span>
                Acompte 40 % : {prixLisible(paiement.deposit_fcfa)}
                {paiement.deposit_paid_at ? " · paye" : " · en attente"}
              </span>
              <span>
                Solde 60 % : {prixLisible(paiement.balance_fcfa)}
                {paiement.balance_paid_at ? " · paye" : " · en attente"}
              </span>
              {paiement.aggregator_reference && <span>Ref. : {paiement.aggregator_reference}</span>}
            </div>
          )}

          {/* --- Voir le recu (acompte puis recu final) --- */}
          {jobId && (paiement || enEspeces) && (paiement?.deposit_paid_at || demande.status === "validated") && (
            <button
              type="button"
              onClick={() => router.push(`/recu?job=${jobId}`)}
              className="mt-1 w-full rounded-xl border py-2 text-xs font-medium"
              style={{ borderColor: "var(--color-bordure)", color: "var(--color-orange)" }}
            >
              Voir le recu
            </button>
          )}

          {/* --- Noter l'artisan (apres validation) --- */}
          {demande.status === "validated" && jobId && !dejaNote && (
            <div className="mt-1 border-t pt-3" style={{ borderColor: "var(--color-bordure)" }}>
              <Noter
                jobId={jobId}
                cible="l'artisan"
                tagsProposes={["Ponctuel", "Travail soigné", "Bon contact", "Bon rapport qualité-prix"]}
                onDone={() => setDejaNote(true)}
              />
            </div>
          )}
          {demande.status === "validated" && dejaNote && (
            <span className="text-xs" style={{ color: "var(--color-texte2)" }}>
              Vous avez noté cette intervention. Merci !
            </span>
          )}
        </div>
      )}

      {/* ===== Offres en attente ===== */}
      {!offreAcceptee && (
        <div className="flex flex-col gap-3">
          <h2 className="text-base" style={{ color: "var(--color-texte)" }}>
            Offres recues
          </h2>

          {offresEnAttente.length === 0 ? (
            <p
              className="rounded-xl border border-dashed p-4 text-center text-sm"
              style={{ borderColor: "var(--color-bordure)", color: "var(--color-texte2)" }}
            >
              Aucune offre pour le moment. Vous serez prevenu des qu&apos;un artisan repond.
            </p>
          ) : (
            offresEnAttente.map((o) => (
              <div
                key={o.id}
                className="flex flex-col gap-2 rounded-xl border p-4"
                style={{ background: "var(--color-carte)", borderColor: "var(--color-bordure)" }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold" style={{ color: "var(--color-texte)" }}>
                    {o.artisanNom}
                  </span>
                  <span className="text-base font-semibold" style={{ color: "var(--color-orange)" }}>
                    {prixLisible(o.montant)}
                  </span>
                </div>
                {o.description && (
                  <p className="text-sm" style={{ color: "var(--color-texte2)" }}>
                    {o.description}
                  </p>
                )}
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => refuser(o)}
                    disabled={action}
                    className="flex-1 rounded-xl border py-2 text-sm disabled:opacity-50"
                    style={{ borderColor: "var(--color-bordure)", color: "var(--color-texte)" }}
                  >
                    Refuser
                  </button>
                  <button
                    type="button"
                    onClick={() => accepter(o)}
                    disabled={action}
                    className="flex-1 rounded-xl py-2 text-sm font-semibold text-white disabled:opacity-50"
                    style={{ background: "var(--color-orange)" }}
                  >
                    Accepter
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => discuter(o.artisanId)}
                  disabled={action}
                  className="rounded-xl border py-2 text-sm font-medium disabled:opacity-50"
                  style={{ borderColor: "var(--color-bordure)", color: "var(--color-orange)" }}
                >
                  Discuter pour fixer le prix
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}