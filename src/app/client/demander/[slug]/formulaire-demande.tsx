// >>> EMPLACEMENT : src/app/client/demander/formulaire/formulaire-demande.tsx
"use client";

// =========================================================================
// Formulaire interactif de demande de service (etape 2).
//   - Champs : description (obligatoire), commune (obligatoire) + quartier,
//     niveau d'urgence, telephone/WhatsApp (obligatoire), creneau souhaite.
//   - A l'envoi : insere une ligne dans `service_requests` puis renvoie vers
//     "Mes demandes" pour que le client voie aussitot sa demande.
//   - Les photos seront ajoutees plus tard.
// =========================================================================

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// ===== Type d'une commune (pour la liste deroulante) =====
type Commune = { id: string; name: string };

// ===== Choix d'urgence (valeurs de l'enum urgency_level) =====
const URGENCES = [
  { valeur: "urgent", libelle: "Urgent" },
  { valeur: "today", libelle: "Aujourd'hui" },
  { valeur: "this_week", libelle: "Cette semaine" },
];

export function FormulaireDemande({
  tradeId,
  clientId,
  communes,
  telephoneDefaut,
}: {
  tradeId: string;
  clientId: string;
  communes: Commune[];
  telephoneDefaut: string;
}) {
  const router = useRouter();
  const supabase = createClient();

  // ===== Etat des champs =====
  const [description, setDescription] = useState("");
  const [communeId, setCommuneId] = useState("");
  const [quartier, setQuartier] = useState("");
  const [urgence, setUrgence] = useState("this_week");
  const [telephone, setTelephone] = useState(telephoneDefaut);
  const [creneau, setCreneau] = useState("");
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  // ===== Envoi de la demande =====
  async function envoyer() {
    setErreur(null);

    // Verification des champs obligatoires.
    if (!description.trim() || !communeId || !telephone.trim()) {
      setErreur("Merci de remplir la description, la commune et le telephone.");
      return;
    }

    setChargement(true);
    try {
      // Insertion de la demande. Les champs a valeur par defaut (status, photos)
      // sont laisses a la base.
      const { error } = await supabase.from("service_requests").insert({
        client_id: clientId,
        trade_id: tradeId,
        description: description.trim(),
        commune_id: communeId,
        neighborhood: quartier.trim() || null,
        urgency: urgence,
        contact_phone: telephone.trim(),
        preferred_slot: creneau.trim() || null,
      });
      if (error) throw new Error(error.message);

      // Succes : on va voir la demande dans "Mes demandes".
      router.push("/client/mes-demandes");
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Envoi impossible.");
      setChargement(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* ===== Description ===== */}
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium" style={{ color: "var(--color-texte)" }}>
          Decrivez votre besoin
        </span>
        <textarea
          className="champ"
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Ex : fuite sous l'evier de la cuisine, l'eau coule en continu."
        />
      </label>

      {/* ===== Commune ===== */}
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium" style={{ color: "var(--color-texte)" }}>
          Commune
        </span>
        <select
          className="champ"
          value={communeId}
          onChange={(e) => setCommuneId(e.target.value)}
        >
          <option value="">Choisir une commune</option>
          {communes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      {/* ===== Quartier (optionnel) ===== */}
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium" style={{ color: "var(--color-texte)" }}>
          Quartier <span style={{ color: "var(--color-texte2)" }}>(optionnel)</span>
        </span>
        <input
          className="champ"
          type="text"
          value={quartier}
          onChange={(e) => setQuartier(e.target.value)}
          placeholder="Ex : Angre, Riviera 2..."
        />
      </label>

      {/* ===== Urgence ===== */}
      <div className="block">
        <span className="mb-1.5 block text-sm font-medium" style={{ color: "var(--color-texte)" }}>
          Niveau d'urgence
        </span>
        <div className="flex gap-2">
          {URGENCES.map((u) => {
            const actif = urgence === u.valeur;
            return (
              <button
                key={u.valeur}
                type="button"
                onClick={() => setUrgence(u.valeur)}
                className="flex-1 rounded-xl border px-3 py-2 text-sm"
                style={{
                  borderColor: actif ? "var(--color-orange)" : "var(--color-bordure)",
                  background: actif ? "var(--color-orange)" : "var(--color-carte)",
                  color: actif ? "#fff" : "var(--color-texte)",
                  fontWeight: actif ? 600 : 400,
                }}
              >
                {u.libelle}
              </button>
            );
          })}
        </div>
      </div>

      {/* ===== Telephone / WhatsApp ===== */}
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium" style={{ color: "var(--color-texte)" }}>
          Telephone / WhatsApp
        </span>
        <input
          className="champ"
          type="tel"
          value={telephone}
          onChange={(e) => setTelephone(e.target.value)}
          placeholder="07 07 12 34 56"
        />
      </label>

      {/* ===== Creneau souhaite (optionnel) ===== */}
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium" style={{ color: "var(--color-texte)" }}>
          Creneau souhaite <span style={{ color: "var(--color-texte2)" }}>(optionnel)</span>
        </span>
        <input
          className="champ"
          type="text"
          value={creneau}
          onChange={(e) => setCreneau(e.target.value)}
          placeholder="Ex : demain matin, ce week-end..."
        />
      </label>

      {/* ===== Message d'erreur ===== */}
      {erreur && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{erreur}</p>
      )}

      {/* ===== Bouton d'envoi ===== */}
      <button
        type="button"
        onClick={envoyer}
        disabled={chargement}
        className="rounded-xl px-4 py-3 text-center text-sm font-semibold text-white disabled:opacity-60"
        style={{ background: "var(--color-orange)" }}
      >
        {chargement ? "Envoi..." : "Envoyer ma demande"}
      </button>

      {/* ===== Style local des champs ===== */}
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
    </div>
  );
}