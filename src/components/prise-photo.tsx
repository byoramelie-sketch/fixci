// >>> EMPLACEMENT : src/components/prise-photo.tsx
"use client";

// =========================================================================
// Prise de photo AVEC CADRE DE GUIDAGE.
//
// On ouvre la camera DANS l'application (pas l'appareil photo du telephone) :
// c'est le seul moyen de dessiner un cadre par-dessus l'image, pour que la
// personne place bien sa piece ou son visage. Le reste de l'ecran est
// assombri : il ne reste que le cadre, on ne peut pas se tromper.
//
//   cadre="carte"  -> rectangle aux proportions d'une carte d'identite
//   cadre="visage" -> ovale centre sur le visage
//
// Si la camera n'est pas disponible (ordinateur sans webcam, autorisation
// refusee), on retombe automatiquement sur l'appareil photo du telephone :
// l'artisan n'est jamais bloque.
//
// La photo capturee est en pleine resolution : c'est l'equipe FixCI qui doit
// pouvoir lire les petits caracteres.
// =========================================================================

import { useCallback, useEffect, useRef, useState } from "react";

export function PrisePhoto({
  label,
  aide,
  cadre,
  camera,
  fichier,
  onChange,
  erreur,
}: {
  label: string;
  aide: string;
  cadre: "carte" | "visage";
  camera: "avant" | "arriere";
  fichier: File | null;
  onChange: (f: File | null) => void;
  erreur?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fluxRef = useRef<MediaStream | null>(null);
  const champRef = useRef<HTMLInputElement>(null);

  const [ouvert, setOuvert] = useState(false);
  const [apercu, setApercu] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // ===== Apercu de la photo prise =====
  useEffect(() => {
    if (!fichier || !fichier.type.startsWith("image/")) {
      setApercu(null);
      return;
    }
    const url = URL.createObjectURL(fichier);
    setApercu(url);
    return () => URL.revokeObjectURL(url);
  }, [fichier]);

  // ===== Couper la camera (toujours, pour liberer le materiel) =====
  const fermer = useCallback(() => {
    fluxRef.current?.getTracks().forEach((p) => p.stop());
    fluxRef.current = null;
    setOuvert(false);
  }, []);

  useEffect(() => fermer, [fermer]);

  // ===== Allumer la camera =====
  async function ouvrir() {
    setMessage(null);
    try {
      const flux = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: camera === "avant" ? "user" : { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
      fluxRef.current = flux;
      setOuvert(true);
    } catch {
      // Pas de camera, ou autorisation refusee : on passe par l'appareil
      // photo du telephone (sans cadre, mais ca marche).
      setMessage("Camera indisponible : utilisation de l'appareil photo.");
      champRef.current?.click();
    }
  }

  // Brancher le flux sur l'image des que la camera est ouverte.
  useEffect(() => {
    if (ouvert && videoRef.current && fluxRef.current) {
      videoRef.current.srcObject = fluxRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [ouvert]);

  // ===== Declencher : on fige l'image telle qu'elle est =====
  function capturer() {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const toile = document.createElement("canvas");
    toile.width = v.videoWidth;
    toile.height = v.videoHeight;
    const ctx = toile.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(v, 0, 0);
    toile.toBlob(
      (blob) => {
        if (!blob) return;
        onChange(new File([blob], `${cadre}-${Date.now()}.jpg`, { type: "image/jpeg" }));
        fermer();
      },
      "image/jpeg",
      0.92
    );
  }

  const pris = fichier !== null;
  const estCarte = cadre === "carte";

  return (
    <div>
      <p className="mb-1.5 text-sm font-medium" style={{ color: "var(--color-texte)" }}>
        {label}
      </p>

      {/* Solution de secours : l'appareil photo du telephone. */}
      <input
        ref={champRef}
        type="file"
        accept="image/*"
        capture={camera === "avant" ? "user" : "environment"}
        className="hidden"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />

      {pris && apercu ? (
        // ===== Photo prise : on la montre pour verification =====
        <div className="overflow-hidden rounded-xl border" style={{ borderColor: "var(--color-vert)" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={apercu} alt={label} className="max-h-56 w-full bg-black object-contain" />
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
                ouvrir();
              }}
              className="text-xs font-semibold underline"
              style={{ color: "var(--color-texte2)" }}
            >
              Refaire la photo
            </button>
          </div>
        </div>
      ) : (
        // ===== Bouton d'ouverture de la camera =====
        <button
          type="button"
          onClick={ouvrir}
          className="flex w-full flex-col items-center gap-2 rounded-xl border border-dashed px-4 py-6"
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
            {estCarte ? "Prendre la photo" : "Prendre un selfie"}
          </span>
        </button>
      )}

      <p className="mt-1.5 text-xs" style={{ color: "var(--color-texte2)" }}>
        {message ?? aide}
      </p>

      {/* ===== La camera, plein ecran, avec le cadre de guidage ===== */}
      {ouvert && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black">
          {/* Consigne en haut */}
          <div className="shrink-0 px-5 pb-2 pt-6 text-center">
            <p className="text-sm font-semibold text-white">{label}</p>
            <p className="mt-0.5 text-xs text-white/70">
              {estCarte
                ? "Placez la carte dans le cadre, bien a plat et lisible."
                : "Placez votre visage dans l'ovale et regardez l'objectif."}
            </p>
          </div>

          {/* L'image de la camera + le cadre par-dessus */}
          <div className="relative flex-1 overflow-hidden">
            <video
              ref={videoRef}
              playsInline
              muted
              className="h-full w-full object-cover"
              style={{ transform: camera === "avant" ? "scaleX(-1)" : undefined }}
            />
            {/* Le cadre : tout ce qui est autour est assombri. */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div
                style={{
                  width: estCarte ? "88%" : "66%",
                  aspectRatio: estCarte ? "1.585" : "0.76",
                  borderRadius: estCarte ? "14px" : "50%",
                  border: "2px solid rgba(255,255,255,0.95)",
                  boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)",
                }}
              />
            </div>
          </div>

          {/* Declencheur en bas */}
          <div className="flex shrink-0 items-center justify-between px-6 pb-8 pt-4">
            <button
              type="button"
              onClick={fermer}
              className="text-sm font-medium text-white/80"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={capturer}
              aria-label="Prendre la photo"
              className="h-16 w-16 rounded-full border-4 border-white/40 bg-white active:scale-95"
            />
            <span className="w-14" />
          </div>
        </div>
      )}
    </div>
  );
}