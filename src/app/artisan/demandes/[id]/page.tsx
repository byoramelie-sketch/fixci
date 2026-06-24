// >>> EMPLACEMENT : src/app/artisan/demandes/[id]/page.tsx
"use client";

// =========================================================================
// Detail d'une intervention pour l'artisan.
//   - Coordonnees du client, description, localisation, creneau
//   - Actions selon l'avancement : "Je suis en route", "Intervention terminee"
//   - Fleche retour vers la liste des demandes
// =========================================================================

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { FiletTricolore } from "@/components/ui";
import { NavArtisan } from "@/components/nav-artisan";
import { BoutonRetour, IconeLieu, IconeMessage } from "@/components/icones";

// ===== Type du detail affiche =====
type Detail = {
  id: string;
  description: string;
  neighborhood: string | null;
  preferredSlot: string | null;
  contactPhone: string | null;
  urgency: string;
  status: string;
  clientNom: string;
};

export default function DetailIntervention() {
  const router = useRouter();
  const params = useParams();
  const supabase = createClient();
  const idDemande = typeof params.id === "string" ? params.id : Array.isArray(params.id) ? params.id[0] : "";

  const [chargement, setChargement] = useState(true);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [action, setAction] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        router.push("/connexion");
        return;
      }

      // Charger la demande + le nom du client (jointure profiles).
      const { data } = await supabase
        .from("service_requests")
        .select("id, description, neighborhood, preferred_slot, contact_phone, urgency, status, client_id")
        .eq("id", idDemande)
        .single();

      if (!data) {
        setChargement(false);
        return;
      }

      const { data: client } = await supabase
        .from("profiles").select("name").eq("id", data.client_id).single();

      setDetail({
        id: data.id,
        description: data.description,
        neighborhood: data.neighborhood,
        preferredSlot: data.preferred_slot,
        contactPhone: data.contact_phone,
        urgency: data.urgency,
        status: data.status,
        clientNom: client?.name ?? "Client",
      });
      setChargement(false);
    })();
  }, [supabase, router, idDemande]);

  // ===== Changer le statut de la demande (en route / terminee) =====
  async function changerStatut(nouveau: string) {
    setAction(true);
    await supabase.from("service_requests").update({ status: nouveau }).eq("id", idDemande);
    setDetail((p) => (p ? { ...p, status: nouveau } : p));
    setAction(false);
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
  const initiales = detail.clientNom.split(" ").map((m) => m[0]).slice(0, 2).join("").toUpperCase();

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
          <div className="flex h-12 w-12 items-center justify-center rounded-full text-sm font-medium text-white" style={{ backgroundColor: "var(--color-or)" }}>
            {initiales}
          </div>
          <div className="flex-1">
            <p className="font-medium">{detail.clientNom}</p>
            <p className="text-sm text-texte2">{detail.contactPhone ?? "Numero non communique"}</p>
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
        <Section titre="Localisation"><span className="inline-flex items-center gap-1"><IconeLieu taille={15} /> {detail.neighborhood ?? "Non precisee"}</span></Section>
        <Section titre="Creneau souhaite">{detail.preferredSlot ?? "Non precise"}</Section>

        {/* Actions selon l'etat */}
        <div className="mt-6 space-y-3">
          {detail.status !== "en_route" && detail.status !== "completed" && detail.status !== "validated" && (
            <button
              type="button"
              disabled={action}
              onClick={() => changerStatut("en_route")}
              className="w-full rounded-xl py-3 font-medium text-white disabled:opacity-50"
              style={{ backgroundColor: "var(--color-orange)" }}
            >
              Je suis en route
            </button>
          )}
          {detail.status === "en_route" && (
            <button
              type="button"
              disabled={action}
              onClick={() => changerStatut("completed")}
              className="w-full rounded-xl py-3 font-medium text-white disabled:opacity-50"
              style={{ backgroundColor: "var(--color-vert)" }}
            >
              Intervention terminee
            </button>
          )}
          {(detail.status === "completed" || detail.status === "validated") && (
            <p className="rounded-xl border border-bordure bg-carte py-3 text-center text-sm text-texte2">
              Intervention terminee ✓
            </p>
          )}
        </div>
      </div>

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