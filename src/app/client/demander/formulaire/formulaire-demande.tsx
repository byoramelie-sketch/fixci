// >>> EMPLACEMENT : src/app/client/demander/formulaire/formulaire-demande.tsx
"use client";

// =========================================================================
// Formulaire interactif de demande de service (etape 2).
//   - Champs : description (obligatoire), commune (obligatoire) + quartier,
//     ADRESSE PRECISE (optionnelle) + position GPS, niveau d'urgence,
//     telephone/WhatsApp (obligatoire), creneau souhaite, budget.
//   - A l'envoi : insere une ligne dans `service_requests`, puis l'adresse
//     precise dans `request_addresses` (table protegee : seul l'artisan
//     RETENU pourra la lire, une fois le devis accepte).
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
  artisanId,
  artisanNom,
}: {
  tradeId: string;
  clientId: string;
  communes: Commune[];
  telephoneDefaut: string;
  artisanId?: string | null;
  artisanNom?: string | null;
}) {
  const router = useRouter();
  const supabase = createClient();

  // ===== Etat des champs =====
  const [description, setDescription] = useState("");
  const [communeId, setCommuneId] = useState("");
  const [quartier, setQuartier] = useState("");
  const [adresse, setAdresse] = useState(""); // adresse precise / point de repere
  const [urgence, setUrgence] = useState("this_week");
  const [telephone, setTelephone] = useState(telephoneDefaut);
  const [creneau, setCreneau] = useState("");
  const [budget, setBudget] = useState(""); // prix propose par le client (optionnel)
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  // ===== Position GPS (optionnelle, pour l'itineraire de l'artisan) =====
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsEnCours, setGpsEnCours] = useState(false);
  const [gpsErreur, setGpsErreur] = useState<string | null>(null);

  // ===== Recuperer la position actuelle du telephone =====
  function utiliserMaPosition() {
    setGpsErreur(null);
    if (!("geolocation" in navigator)) {
      setGpsErreur("Votre appareil ne permet pas la localisation.");
      return;
    }
    setGpsEnCours(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsEnCours(false);
      },
      (err) => {
        setGpsErreur(
          err.code === err.PERMISSION_DENIED
            ? "Localisation refusee. Autorisez-la, ou saisissez l'adresse a la main."
            : "Position introuvable. Saisissez l'adresse a la main."
        );
        setGpsEnCours(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  // ===== Envoi de la demande =====
  async function envoyer() {
    setErreur(null);

    // Verification des champs obligatoires.
    if (!description.trim() || !communeId || !telephone.trim()) {
      setErreur("Merci de remplir la description, la commune et le telephone.");
      return;
    }

    // Budget : optionnel, mais s'il est rempli il doit etre un nombre valide.
    let budgetFcfa: number | null = null;
    if (budget.trim()) {
      const n = Number(budget.replace(/\s/g, ""));
      if (!Number.isInteger(n) || n <= 0) {
        setErreur("Le budget doit etre un montant en FCFA (chiffres uniquement).");
        return;
      }
      budgetFcfa = n;
    }

    setChargement(true);
    try {
      // 1. Inserer la demande. Les champs a valeur par defaut (status, photos)
      //    sont laisses a la base. assigned_artisan_id n'est rempli que si la
      //    demande vise un artisan precis.
      const { data: creee, error } = await supabase
        .from("service_requests")
        .insert({
          client_id: clientId,
          trade_id: tradeId,
          description: description.trim(),
          commune_id: communeId,
          neighborhood: quartier.trim() || null,
          urgency: urgence,
          contact_phone: telephone.trim(),
          preferred_slot: creneau.trim() || null,
          budget_fcfa: budgetFcfa,
          assigned_artisan_id: artisanId ?? null,
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);

      // 2. Enregistrer l'adresse precise a part (table protegee). Elle ne sera
      //    lisible que par l'artisan retenu, une fois le devis accepte.
      if (creee?.id && (adresse.trim() || position)) {
        await supabase.from("request_addresses").insert({
          request_id: creee.id,
          address: adresse.trim() || null,
          latitude: position?.lat ?? null,
          longitude: position?.lng ?? null,
        });
      }

      // Succes : on va voir la demande dans "Mes demandes".
      router.push("/client/mes-demandes");
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Envoi impossible.");
      setChargement(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* ===== Bandeau : demande adressee a un artisan precis ===== */}
      {artisanId && (
        <div
          className="rounded-xl border px-4 py-3"
          style={{ background: "var(--color-secondaire)", borderColor: "var(--color-bordure)" }}
        >
          <span className="text-sm" style={{ color: "var(--color-texte2)" }}>
            Vous contactez{" "}
          </span>
          <span className="text-sm font-semibold" style={{ color: "var(--color-texte)" }}>
            {artisanNom ?? "cet artisan"}
          </span>
          <span className="block text-xs" style={{ color: "var(--color-texte2)" }}>
            Votre demande lui sera adressee en priorite.
          </span>
        </div>
      )}

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

      {/* ===== Adresse precise + position (optionnel) ===== */}
      <div className="block">
        <span className="mb-1.5 block text-sm font-medium" style={{ color: "var(--color-texte)" }}>
          Adresse precise <span style={{ color: "var(--color-texte2)" }}>(optionnel)</span>
        </span>
        <input
          className="champ"
          type="text"
          value={adresse}
          onChange={(e) => setAdresse(e.target.value)}
          placeholder="Ex : Rue des Jardins, immeuble bleu, en face de la pharmacie"
        />

        {/* Bouton position GPS */}
        <button
          type="button"
          onClick={utiliserMaPosition}
          disabled={gpsEnCours}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-medium disabled:opacity-60"
          style={{
            borderColor: position ? "var(--color-vert)" : "var(--color-bordure)",
            color: position ? "var(--color-vert)" : "var(--color-texte2)",
            background: "var(--color-carte)",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 21s-7-5.5-7-11a7 7 0 1 1 14 0c0 5.5-7 11-7 11z" />
            <circle cx="12" cy="10" r="2.5" />
          </svg>
          {gpsEnCours
            ? "Recherche de votre position..."
            : position
              ? "Position enregistree — appuyez pour actualiser"
              : "Utiliser ma position actuelle"}
        </button>

        {gpsErreur && (
          <span className="mt-1 block text-xs" style={{ color: "#b91c1c" }}>
            {gpsErreur}
          </span>
        )}
        <span className="mt-1 block text-xs" style={{ color: "var(--color-texte2)" }}>
          Votre adresse reste <strong>privee</strong> : elle n&apos;est communiquee qu&apos;a
          l&apos;artisan que vous aurez choisi, une fois le devis accepte.
        </span>
      </div>

      {/* ===== Urgence ===== */}
      <div className="block">
        <span className="mb-1.5 block text-sm font-medium" style={{ color: "var(--color-texte)" }}>
          Niveau d&apos;urgence
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

      {/* ===== Budget propose (optionnel) ===== */}
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium" style={{ color: "var(--color-texte)" }}>
          Votre budget en FCFA <span style={{ color: "var(--color-texte2)" }}>(optionnel)</span>
        </span>
        <input
          className="champ"
          type="text"
          inputMode="numeric"
          value={budget}
          onChange={(e) => setBudget(e.target.value)}
          placeholder="Ex : 15000"
        />
        <span className="mt-1 block text-xs" style={{ color: "var(--color-texte2)" }}>
          Indiquez ce que vous pensez payer. L&apos;artisan pourra accepter, proposer un
          autre prix ou refuser.
        </span>
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