// >>> EMPLACEMENT : src/components/champ-telephone.tsx
"use client";

// =========================================================================
// Champ de saisie d'un numero de telephone, avec l'indicatif du pays.
//
//   - Une liste deroulante pour le pays (Cote d'Ivoire par defaut).
//   - Un champ pour le numero, avec un exemple adapte au pays choisi.
//   - Sous le champ, on montre le numero tel qu'il sera ENREGISTRE : la
//     personne voit tout de suite si elle s'est trompee, avant de valider.
//
// Le composant remonte le numero au format international (+2250707123456),
// ou null tant que la saisie n'est pas valide. C'est ce format unique qui
// garantit "un numero = un compte", et c'est celui qu'exige l'envoi de SMS.
// =========================================================================

import { PAYS, PAYS_DEFAUT, afficherTelephone, normaliserTelephone, trouverPays } from "@/lib/telephone";

export function ChampTelephone({
  codePays,
  onCodePays,
  saisie,
  onSaisie,
  erreur,
  label = "Numero de telephone / WhatsApp",
  aide,
}: {
  codePays: string;
  onCodePays: (code: string) => void;
  saisie: string;
  onSaisie: (v: string) => void;
  erreur?: string | null;
  label?: string;
  aide?: string;
}) {
  const pays = trouverPays(codePays);
  const normalise = normaliserTelephone(codePays, saisie);
  const aEcrit = saisie.replace(/\D/g, "").length > 0;

  return (
    <div>
      <p className="mb-1.5 text-sm font-medium" style={{ color: "var(--color-texte)" }}>
        {label}
      </p>

      <div className="flex gap-2">
        {/* ===== Le pays / indicatif ===== */}
        <select
          value={codePays}
          onChange={(e) => onCodePays(e.target.value)}
          className="shrink-0 rounded-xl border px-2 py-3 text-sm outline-none"
          style={{
            borderColor: "var(--color-bordure)",
            background: "var(--color-fond)",
            color: "var(--color-texte)",
            maxWidth: "9.5rem",
          }}
        >
          {PAYS.map((p) => (
            <option key={p.code} value={p.code}>
              +{p.indicatif} {p.nom}
            </option>
          ))}
        </select>

        {/* ===== Le numero ===== */}
        <input
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={saisie}
          onChange={(e) => onSaisie(e.target.value)}
          placeholder={pays.exemple}
          className="w-full rounded-xl border px-4 py-3 text-base outline-none"
          style={{
            borderColor: erreur
              ? "#dc2626"
              : normalise
                ? "var(--color-vert)"
                : "var(--color-bordure)",
            background: "var(--color-fond)",
            color: "var(--color-texte)",
          }}
        />
      </div>

      {/* ===== Retour immediat : ce qui sera enregistre ===== */}
      {erreur ? (
        <p className="mt-1.5 text-xs" style={{ color: "#dc2626" }}>
          {erreur}
        </p>
      ) : normalise ? (
        <p className="mt-1.5 text-xs font-medium" style={{ color: "var(--color-vert)" }}>
          Enregistre sous : {afficherTelephone(normalise)}
        </p>
      ) : aEcrit ? (
        <p className="mt-1.5 text-xs" style={{ color: "var(--color-texte2)" }}>
          Numero incomplet pour {pays.nom} (exemple : {pays.exemple}).
        </p>
      ) : (
        <p className="mt-1.5 text-xs" style={{ color: "var(--color-texte2)" }}>
          {aide ?? `Exemple : ${pays.exemple}`}
        </p>
      )}
    </div>
  );
}