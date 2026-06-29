// >>> EMPLACEMENT : src/app/client/mes-demandes/detail/page.tsx
"use client";

// =========================================================================
// Detail d'une demande cote CLIENT + reponse aux offres (devis).
//   - La demande est identifiee par ?id=... dans l'adresse.
//   - Affiche : service, statut, budget propose, description.
//   - Liste les OFFRES recues des artisans (table quotes) :
//       . pour chaque offre "en attente" -> ACCEPTER ou REFUSER
//       . accepter cree le chantier (table jobs) et passe la demande en
//         "devis accepte".
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
  const [paiement, setPaiement] = useState<Paiement | null>(null);
  const [methode, setMethode] = useState<MethodePaiement>("wave");

  // ===== Chargement (extrait pour pouvoir recharger apres une action) =====
  async function charger() {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      router.push("/connexion");
      return;
    }
    setUid(auth.user.id);

    // Demande (et verification qu'elle appartient bien au client).
    const { data: d } = await supabase
      .from("service_requests")
      .select("id, description, status, budget_fcfa, trade_id, client_id")
      .eq("id", idDemande)
      .single();

    if (!d || d.client_id !== auth.user.id) {
      setDemande(null);
      setChargement(false);
      return;
    }

    // Nom du service.
    const { data: trade } = await supabase
      .from("trades")
      .select("name")
      .eq("id", d.trade_id)
      .single();

    // Offres recues pour cette demande (en attente ou acceptee).
    const { data: q } = await supabase
      .from("quotes")
      .select("id, artisan_id, amount_fcfa, description, status")
      .eq("request_id", idDemande)
      .in("status", ["proposed", "accepted"])
      .order("created_at", { ascending: false });
    const lignes = q ?? [];

    // Noms des artisans qui ont propose.
    const idsArtisans = [...new Set(lignes.map((l) => l.artisan_id))];
    const noms: Record<string, string> = {};
    if (idsArtisans.length > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, name")
        .in("id", idsArtisans);
      (profs ?? []).forEach((p) => {
        noms[p.id] = p.name ?? "Artisan";
      });
    }

    // Chantier (job) eventuel lie a cette demande, pour le suivi et la validation.
    const { data: jobs } = await supabase
      .from("jobs")
      .select("id")
      .eq("request_id", idDemande)
      .limit(1);
    const job = (jobs ?? [])[0] as { id: string } | undefined;
    setJobId(job ? job.id : null);

    // Paiement eventuel lie au chantier (acompte, solde, statut, net...).
    setPaiement(job ? await lirePaiement(job.id) : null);

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

  // ===== Accepter une offre : cree le chantier =====
  async function accepter(offre: Offre) {
    if (!uid || !demande) return;
    setAction(true);
    setErreur(null);
    try {
      // 1. Marquer cette offre comme acceptee.
      const { error: e1 } = await supabase
        .from("quotes")
        .update({ status: "accepted" })
        .eq("id", offre.id);
      if (e1) throw new Error(e1.message);

      // 2. Creer le chantier (job) au prix convenu.
      const { error: e2 } = await supabase.from("jobs").insert({
        request_id: demande.id,
        quote_id: offre.id,
        client_id: uid,
        artisan_id: offre.artisanId,
        agreed_price_fcfa: offre.montant,
        status: "accepted",
      });
      if (e2) throw new Error(e2.message);

      // 3. Refuser les autres offres encore en attente sur cette demande.
      const autres = offres.filter((o) => o.id !== offre.id && o.statut === "proposed");
      for (const o of autres) {
        await supabase.from("quotes").update({ status: "declined" }).eq("id", o.id);
      }

      // 4. Passer la demande en "devis accepte".
      await supabase
        .from("service_requests")
        .update({ status: "quote_accepted" })
        .eq("id", demande.id);

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
      const { error } = await supabase
        .from("quotes")
        .update({ status: "declined" })
        .eq("id", offre.id);
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

          {/* --- Etape 1 : acompte 40 % (au demarrage) --- */}
          {demande.status === "quote_accepted" && !paiement && (
            <>
              <span className="text-xs" style={{ color: "var(--color-texte2)" }}>
                Pour lancer l'intervention, reglez l'acompte de 40 %. L'artisan est paye a la fin,
                une fois le travail valide.
              </span>
              {selecteurMethode}
              <button
                type="button"
                onClick={reglerAcompte}
                disabled={action}
                className="mt-1 w-full rounded-xl py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: "var(--color-orange)" }}
              >
                Payer l'acompte ({prixLisible(Math.round(offreAcceptee.montant * 0.4))})
              </button>
              <span className="text-[10px]" style={{ color: "var(--color-texte2)" }}>
                Paiement simule (demo) — aucun vrai prelevement.
              </span>
            </>
          )}
          {demande.status === "quote_accepted" && paiement && (
            <span className="text-xs font-medium" style={{ color: "var(--color-vert)" }}>
              Acompte paye ({prixLisible(paiement.deposit_fcfa)}). En attente du demarrage de l'artisan.
            </span>
          )}

          {/* --- En route --- */}
          {demande.status === "en_route" && (
            <span className="text-xs font-medium" style={{ color: "var(--color-or)" }}>
              L'artisan est en route.
            </span>
          )}

          {/* --- Etape 2 : valider le travail + payer le solde 60 % --- */}
          {demande.status === "completed" && (
            <>
              <span className="text-xs" style={{ color: "var(--color-texte2)" }}>
                L'artisan indique avoir termine. Validez le travail et reglez le solde de 60 %.
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

          {/* --- Termine + paye --- */}
          {demande.status === "validated" && (
            <span className="text-xs font-medium" style={{ color: "var(--color-vert)" }}>
              Travail valide et paye. Merci d'avoir utilise FixCI !
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
              Aucune offre pour le moment. Vous serez prevenu des qu'un artisan repond.
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