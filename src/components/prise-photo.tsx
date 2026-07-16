// >>> EMPLACEMENT : src/components/prise-photo.tsx
"use client";

// =========================================================================
// Prise de photo avec l'appareil du telephone.
//
//   camera="arriere" -> ouvre la camera ARRIERE (pour la piece d'identite)
//   camera="avant"   -> ouvre la camera AVANT   (pour le visage / selfie)
//
// L'attribut "capture" demande au telephone d'ouvrir directement l'appareil
// photo au lieu de la galerie : on evite ainsi qu'une personne envoie une
// image trouvee ailleurs. Sur ordinateur, le navigateur ignore cette
// consigne et ouvre les fichiers : c'est normal, la protection vise le
// mobile, la ou sont les artisans.
//
// Une fois la photo prise, on l'affiche pour que la personne verifie qu'elle
// est nette avant d'envoyer, et qu'elle puisse la refaire.
// =========================================================================

import { useEffect, useRef, useState } from "react";

export function PrisePhoto({
  label,
  aide,
  camera,
  fichier,
  onChange,
  erreur,
}: {
  label: string;
  aide: string;
  camera: "avant" | "arriere";
  fichier: File | null;
  onChange: (f: File | null) => void;
  erreur?: boolean;
}) {
  const champRef = useRef<HTMLInputElement>(null);
  const [apercu, setApercu] = useState<string | null>(null);

  // Construire l'apercu de la photo prise (et le liberer ensuite).
  useEffect(() => {
    if (!fichier || !fichier.type.startsWith("image/")) {
      setApercu(null);
      return;
    }
    const url = URL.createObjectURL(fichier);
    setApercu(url);
    return () => URL.revokeObjectURL(url);
  }, [fichier]);

  const pris = fichier !== null;

  return (
    <div>
      <p className="mb-1.5 text-sm font-medium" style={{ color: "var(--color-texte)" }}>
        {label}
      </p>

      {/* Le champ reel, cache : on le declenche avec le bouton ci-dessous. */}
      <input
        ref={champRef}
        type="file"
        accept="image/*"
        capture={camera === "avant" ? "user" : "environment"}
        className="hidden"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />

      {pris && apercu ? (
        // ===== Photo prise : on la montre =====
        <div
          className="overflow-hidden rounded-xl border"
          style={{ borderColor: "var(--color-vert)" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={apercu}
            alt={label}
            className="max-h-56 w-full bg-black object-contain"
          />
          <div
            className="flex items-center justify-between gap-2 px-3 py-2"
            style={{ background: "rgba(76,140,90,0.10)" }}
          >
            <span className="text-xs font-medium" style={{ color: "var(--color-vert)" }}>
              Photo prise ✓
            </span>
            <button
              type="button"
              onClick={() => {
                onChange(null);
                if (champRef.current) champRef.current.value = "";
                champRef.current?.click();
              }}
              className="text-xs font-semibold underline"
              style={{ color: "var(--color-texte2)" }}
            >
              Refaire la photo
            </button>
          </div>
        </div>
      ) : (
        // ===== Pas encore de photo : le bouton d'appareil photo =====
        <button
          type="button"
          onClick={() => champRef.current?.click()}
          className="flex w-full flex-col items-center gap-2 rounded-xl border border-dashed px-4 py-6 transition"
          style={{
            borderColor: erreur ? "#dc2626" : "var(--color-bordure)",
            background: "var(--color-carte)",
          }}
        >
          <svg
            width="30"
            height="30"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ color: "var(--color-orange)" }}
          >
            <path d="M3 8a2 2 0 0 1 2-2h2l1.5-2h7L17 6h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <circle cx="12" cy="13" r="3.5" />
          </svg>
          <span className="text-sm font-semibold" style={{ color: "var(--color-orange)" }}>
            {camera === "avant" ? "Prendre un selfie" : "Prendre la photo"}
          </span>
        </button>
      )}

      <p className="mt-1.5 text-xs" style={{ color: "var(--color-texte2)" }}>
        {aide}
      </p>
    </div>
  );
}