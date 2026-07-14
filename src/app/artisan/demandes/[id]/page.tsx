// >>> EMPLACEMENT : src/app/artisan/demandes/[id]/page.tsx
"use client";

// =========================================================================
// Detail d'une demande pour l'artisan + SYSTEME DE DEVIS.
//   - Affiche : client (+ WhatsApp), description, lieu, creneau, et le BUDGET
//     propose par le client s'il y en a un.
//   - Selon l'avancement :
//       . nouvelle / devis en cours -> FAIRE UNE OFFRE (prix + details),
//         CREER UN DEVIS DETAILLE, ou REFUSER
//       . devis accepte par le client -> demarrer (Je suis en route)
//       . en route -> Intervention terminee
//   - L'offre est enregistree dans `quotes` (montant en FCFA, statut "proposed").
// Ecran enfant -> fleche retour en haut.
// =========================================================================

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { FiletTricolore } from "@/components/ui";
import { NavArtisan } from "@/components/nav-artisan";
import { BoutonRetour, IconeLieu, IconeMessage } from "@/components/icones";
import { Noter } from "@/components/noter";

// ===== Type du detail affiche =====
type Detail = {
  id: string;
  description: string;
  neighborhood: string | null;
  preferredSlot: string | null;
  contactPhone: string | null;
  urgency: string;
  status: string;
  budgetFcfa: number | null;
  clientNom: string;
};

// ===== Offre (devis) deja envoyee par cet artisan pour cette demande =====
type MonOffre = { id: string; montant: number; statut: string };

// ===== Prix lisible (20000 -> "20 000 FCFA") =====
function prixLisible(p: number) {
  return p.toLocaleString("fr-FR") + " FCFA";
}

export default function DetailDemandeArtisan() {
  const router = useRouter();
  const params = useParams();
  const supabase = createClient();
  const idDemande =
    typeof params.id === "string" ? params.id : Array.isArray(params.id) ? params.id[0] : "";

  const [chargement, setChargement] = useState(true);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [monOffre, setMonOffre] = useState<MonOffre | null>(null);
  const [uid, setUid] = useState<string | null>(null);

  // Champs du formulaire d'offre.
  const [montant, setMontant] = useState("");
  const [detailsOffre, setDetailsOffre] = useState("");
  const [action, setAction] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [paiement, setPaiement] = useState<{ statut: string; net: number } | null>(null);
  const [dejaNote, setDejaNote] = useState(false);

  // ===== Chargement initial =====
  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        router.push("/connexion");
        return;
      }
      setUid(auth.user.id);

      // ===== Chargement en 2 vagues PARALLELES (au lieu d'un enchainement) =====
      const uid = auth.user.id;

      // Vague 1 : requetes qui ne dependent que de l'identifiant de la demande.
      const [srRes, offresRes, jobsRes] = await Promise.all([
        supabase
          .from("service_requests")
          .select(
            "id, description, neighborhood, preferred_slot, contact_phone, urgency, status, budget_fcfa, client_id"
          )
          .eq("id", idDemande)
          .single(),
        supabase
          .from("quotes")
          .select("id, amount_fcfa, status")
          .eq("request_id", idDemande)
          .eq("artisan_id", uid)
          .order("created_at", { ascending: false })
          .limit(1),
        supabase
          .from("jobs")
          .select("id")
          .eq("request_id", idDemande)
          .eq("artisan_id", uid)
          .limit(1),
      ]);

      const data = srRes.data;
      if (!data) {
        setChargement(false);
        return;
      }
      const offre = (offresRes.data ?? [])[0] as
        | { id: string; amount_fcfa: number; status: string }
        | undefined;
      const job = (jobsRes.data ?? [])[0] as { id: string } | undefined;
      if (job) setJobId(job.id);

      // Vague 2 : requetes qui dependent de la vague 1, lancees en parallele.
      const [clientRes, payRes, avisRes] = await Promise.all([
        supabase.from("profiles").select("name").eq("id", data.client_id).single(),
        job
          ? supabase.from("payments").select("status, artisan_payout_fcfa").eq("job_id", job.id).limit(1)
          : Promise.resolve({ data: null }),
        job
          ? supabase
              .from("reviews")
              .select("id")
              .eq("job_id", job.id)
              .eq("author_id", uid)
              .eq("direction", "artisan_to_client")
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      const client = clientRes.data;
      if (job) {
        const p = (payRes.data ?? [])[0] as
          | { status: string; artisan_payout_fcfa: number }
          | undefined;
        if (p) setPaiement({ statut: p.status, net: p.artisan_payout_fcfa });
        setDejaNote(!!avisRes.data);
      }

      setDetail({
        id: data.id,
        description: data.description,
        neighborhood: data.neighborhood,
        preferredSlot: data.preferred_slot,
        contactPhone: data.contact_phone,
        urgency: data.urgency,
        status: data.status,
        budgetFcfa: data.budget_fcfa ?? null,
        clientNom: client?.name ?? "Client",
      });

      if (offre) {
        setMonOffre({ id: offre.id, montant: offre.amount_fcfa, statut: offre.status });
        setMontant(String(offre.amount_fcfa));
      } else if (data.budget_fcfa != null) {
        // Pas encore d'offre : on pre-remplit avec le budget propose par le client.
        setMontant(String(data.budget_fcfa));
      }

      setChargement(false);
    })();
  }, [supabase, router, idDemande]);

  // ===== Envoyer (ou renvoyer) une offre =====
  async function envoyerOffre() {
    if (!uid || !detail) return;
    setErreur(null);
    setInfo(null);

    const n = Number(montant.replace(/\s/g, ""));
    if (!Number.isInteger(n) || n <= 0) {
      setErreur("Indiquez un montant en FCFA (chiffres uniquement).");
      return;
    }

    setAction(true);
    try {
      // 1. Creer l'offre (devis) au statut "proposed".
      const { data: nouvelle, error: errInsert } = await supabase
        .from("quotes")
        .insert({
          request_id: detail.id,
          artisan_id: uid,
          amount_fcfa: n,
          description: detailsOffre.trim() || null,
          status: "proposed",
        })
        .select("id, amount_fcfa, status")
        .single();
      if (errInsert) throw new Error(errInsert.message);

      // 2. Passer la demande en "devis en cours" (si elle ne l'est pas deja).
      if (detail.status === "new" || detail.status === "quote_in_progress") {
        await supabase
          .from("service_requests")
          .update({ status: "quote_in_progress" })
          .eq("id", detail.id);
      }

      setMonOffre({
        id: nouvelle!.id,
        montant: nouvelle!.amount_fcfa,
        statut: nouvelle!.status,
      });
      setDetail({ ...detail, status: "quote_in_progress" });
      setDetailsOffre("");
      setInfo("Offre envoyee. Le client va la recevoir.");
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Envoi impossible.");
    } finally {
      setAction(false);
    }
  }

  // ===== Refuser la demande =====
  async function refuser() {
    if (!detail) return;
    setAction(true);
    setErreur(null);
    try {
      const { error } = await supabase
        .from("service_requests")
        .update({ status: "cancelled" })
        .eq("id", detail.id);
      if (error) throw new Error(error.message);
      setDetail({ ...detail, status: "cancelled" });
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Action impossible.");
    } finally {
      setAction(false);
    }
  }

  // ===== Avancement du chantier (apres acceptation du client) =====
  async function changerStatut(nouveau: string) {
    if (!detail) return;
    setAction(true);
    setErreur(null);
    try {
      const { error } = await supabase
        .from("service_requests")
        .update({ status: nouveau })
        .eq("id", detail.id);
      if (error) throw new Error(error.message);

      // On fait avancer le chantier (job) en parallele, avec l'horodatage.
      if (jobId) {
        const champs: Record<string, unknown> = { status: nouveau };
        if (nouveau === "en_route") champs.en_route_at = new Date().toISOString();
        if (nouveau === "completed") champs.completed_at = new Date().toISOString();
        await supabase.from("jobs").update(champs).eq("id", jobId);
      }

      setDetail({ ...detail, status: nouveau });
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Action impossible.");
    } finally {
      setAction(false);
    }
  }

  if (chargement) {
    return (
      <div className="min-h-screen bg-fond">
        <FiletTricolore />
        <div className="px-5 py-10 text-center text-texte2">Chargement...</div>
      </div>
    );
  }
  if (!detail) {
    return (
      <div className="min-h-screen bg-fond">
        <FiletTricolore />
        <div className="px-5 py-10 text-center text-texte2">Demande introuvable.</div>
      </div>
    );
  }

  // Initiales du client pour l'avatar.
  const initiales = detail.clientNom
    .split(" ")
    .map((m) => m[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  // Etapes pour decider quoi afficher.
  const phaseOffre = detail.status === "new" || detail.status === "quote_in_progress";
  const offreAcceptee = monOffre?.statut === "accepted" || detail.status === "quote_accepted";

  return (
    <div className="min-h-screen bg-fond pb-24">
      <FiletTricolore />
      <div className="mx-auto max-w-md px-5 py-6">
        {/* Fleche retour */}
        <header className="mb-5 flex items-center gap-3">
          <BoutonRetour />
          <h1 className="text-lg">Demande</h1>
        </header>

        {/* Bloc client */}
        <div className="mb-5 flex items-center gap-3 rounded-2xl border border-bordure bg-carte p-4">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-full text-sm font-medium text-white"
            style={{ backgroundColor: "var(--color-or)" }}
          >
            {initiales}
          </div>
          <div className="flex-1">
            <p className="font-medium">{detail.clientNom}</p>
            <p className="text-sm text-texte2">
              {detail.contactPhone ?? "Numero non communique"}
            </p>
          </div>
          {detail.contactPhone && (
            <a
              href={`https://wa.me/${detail.contactPhone.replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 rounded-full px-3 py-2 text-sm text-white"
              style={{ backgroundColor: "var(--color-vert)" }}
            >
              <IconeMessage taille={16} /> WhatsApp
            </a>
          )}
        </div>

        {/* Details */}
        <Section titre="Description">{detail.description}</Section>
        <Section titre="Localisation">
          <span className="inline-flex items-center gap-1">
            <IconeLieu taille={15} /> {detail.neighborhood ?? "Non precisee"}
          </span>
        </Section>
        <Section titre="Creneau souhaite">{detail.preferredSlot ?? "Non precise"}</Section>

        {/* Budget propose par le client */}
        <div className="mb-4">
          <p className="mb-1 text-xs uppercase tracking-wide text-texte2">Budget propose</p>
          <p
            className="rounded-2xl border p-4 text-sm"
            style={{
              borderColor: "var(--color-bordure)",
              backgroundColor: "var(--color-secondaire)",
            }}
          >
            {detail.budgetFcfa != null ? (
              <span className="font-medium">{prixLisible(detail.budgetFcfa)}</span>
            ) : (
              <span className="text-texte2">Le client n'a pas indique de budget.</span>
            )}
          </p>
        </div>

        {erreur && (
          <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{erreur}</p>
        )}
        {info && (
          <p
            className="mb-3 rounded-lg px-3 py-2 text-sm"
            style={{ backgroundColor: "rgba(76,140,90,0.12)", color: "var(--color-vert)" }}
          >
            {info}
          </p>
        )}

        {/* ===== PHASE 1 : faire une offre / creer un devis / refuser ===== */}
        {phaseOffre && (
          <div className="rounded-2xl border border-bordure bg-carte p-4">
            <h2 className="mb-1 text-base">Votre offre</h2>

            {monOffre && monOffre.statut === "proposed" && (
              <p className="mb-3 text-sm" style={{ color: "var(--color-or)" }}>
                Offre en cours : {prixLisible(monOffre.montant)} — en attente de la reponse du
                client. Vous pouvez la modifier ci-dessous.
              </p>
            )}

            <label className="mb-3 block">
              <span className="mb-1.5 block text-sm font-medium">Montant propose (FCFA)</span>
              <input
                className="champ"
                inputMode="numeric"
                value={montant}
                onChange={(e) => setMontant(e.target.value)}
                placeholder="Ex : 20000"
              />
            </label>

            <label className="mb-4 block">
              <span className="mb-1.5 block text-sm font-medium">
                Details <span className="text-texte2">(optionnel)</span>
              </span>
              <textarea
                className="champ"
                rows={3}
                value={detailsOffre}
                onChange={(e) => setDetailsOffre(e.target.value)}
                placeholder="Ex : deplacement inclus, intervention sous 24h."
              />
            </label>

            <button
              type="button"
              onClick={envoyerOffre}
              disabled={action}
              className="mb-2 w-full rounded-xl py-3 font-medium text-white disabled:opacity-50"
              style={{ backgroundColor: "var(--color-orange)" }}
            >
              {action ? "Envoi..." : monOffre ? "Mettre a jour mon offre" : "Envoyer mon offre"}
            </button>

            {/* Alternative : monter un devis detaille (postes, sous-totaux, total) */}
            <button
              type="button"
              onClick={() => router.push(`/artisan/devis?request=${detail.id}`)}
              className="mb-2 w-full rounded-xl border py-3 text-sm font-medium"
              style={{ borderColor: "var(--color-orange)", color: "var(--color-orange)" }}
            >
              Creer un devis detaille
            </button>

            <button
              type="button"
              onClick={refuser}
              disabled={action}
              className="w-full rounded-xl border border-bordure py-3 text-sm disabled:opacity-50"
            >
              Refuser la demande
            </button>
          </div>
        )}

        {/* ===== PHASE 2 : offre acceptee -> avancement ===== */}
        {offreAcceptee && detail.status !== "en_route" && detail.status !== "completed" && detail.status !== "validated" && (
          <div className="rounded-2xl border border-bordure bg-carte p-4">
            <p className="mb-3 text-sm" style={{ color: "var(--color-vert)" }}>
              Le client a accepte votre offre{monOffre ? ` (${prixLisible(monOffre.montant)})` : ""}.
            </p>
            <button
              type="button"
              onClick={() => changerStatut("en_route")}
              disabled={action}
              className="w-full rounded-xl py-3 font-medium text-white disabled:opacity-50"
              style={{ backgroundColor: "var(--color-orange)" }}
            >
              Je suis en route
            </button>
          </div>
        )}

        {detail.status === "en_route" && (
          <button
            type="button"
            onClick={() => changerStatut("completed")}
            disabled={action}
            className="w-full rounded-xl py-3 font-medium text-white disabled:opacity-50"
            style={{ backgroundColor: "var(--color-vert)" }}
          >
            Intervention terminee
          </button>
        )}

        {detail.status === "completed" && (
          <p className="rounded-xl border border-bordure bg-carte py-3 text-center text-sm text-texte2">
            Intervention terminee. En attente de la validation du client.
          </p>
        )}

        {detail.status === "validated" && (
          <p
            className="rounded-xl border py-3 text-center text-sm"
            style={{
              borderColor: "var(--color-vert)",
              color: "var(--color-vert)",
              background: "rgba(76,140,90,0.10)",
            }}
          >
            Travail valide par le client ✓
          </p>
        )}

        {/* ===== Noter le client (apres validation) ===== */}
        {detail.status === "validated" && jobId && !dejaNote && (
          <Noter
            jobId={jobId}
            cible="le client"
            tagsProposes={["Aimable", "Paiement rapide", "Demande claire"]}
            onDone={() => setDejaNote(true)}
          />
        )}
        {detail.status === "validated" && dejaNote && (
          <p className="text-center text-xs" style={{ color: "var(--color-texte2)" }}>
            Vous avez note ce client. Merci !
          </p>
        )}

        {/* ===== Paiement (cote artisan : acompte/solde recus + net) ===== */}
        {paiement && (
          <div
            className="rounded-2xl border p-4 text-sm"
            style={{ borderColor: "var(--color-bordure)", background: "var(--color-carte)" }}
          >
            <p className="mb-1 font-medium" style={{ color: "var(--color-texte)" }}>
              Paiement
            </p>
            {paiement.statut === "escrowed" && (
              <p style={{ color: "var(--color-texte2)" }}>
                Acompte recu et securise. Le solde vous sera verse apres la validation du client.
              </p>
            )}
            {paiement.statut === "released" && (
              <p style={{ color: "var(--color-vert)" }}>Paiement complet recu et verse.</p>
            )}
            <p className="mt-1" style={{ color: "var(--color-texte)" }}>
              Votre net (apres commission) :{" "}
              <span className="font-semibold">{prixLisible(paiement.net)}</span>
            </p>
          </div>
        )}

        {detail.status === "cancelled" && (
          <p className="rounded-xl border border-bordure bg-carte py-3 text-center text-sm text-texte2">
            Demande refusee.
          </p>
        )}
      </div>

      <style>{`
        .champ {
          width: 100%;
          border: 1px solid var(--color-bordure);
          border-radius: 12px;
          background: var(--color-fond);
          padding: 0.75rem 1rem;
          font-size: 1rem;
          outline: none;
          color: var(--color-texte);
        }
        .champ:focus { border-color: var(--color-orange); }
      `}</style>

      <NavArtisan />
    </div>
  );
}

// ===== Bloc d'info titre + contenu =====
function Section({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <p className="mb-1 text-xs uppercase tracking-wide text-texte2">{titre}</p>
      <p className="rounded-2xl border border-bordure bg-carte p-4 text-sm">{children}</p>
    </div>
  );
}