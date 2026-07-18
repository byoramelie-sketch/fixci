// >>> EMPLACEMENT : src/components/choix-identifiant.tsx
"use client";

// =========================================================================
// Choisir comment on se connectera : par telephone, ou par e-mail.
//
// Le telephone reste demande dans les deux cas : c'est par WhatsApp que le
// client et l'artisan se joignent, et c'est le numero qui s'affiche sur la
// fiche d'intervention. L'e-mail, lui, remplace seulement l'identifiant de
// connexion.
// =========================================================================

import type { MethodeIdentifiant } from "@/lib/telephone";

export function ChoixIdentifiant({
  methode,
  onChange,
}: {
  methode: MethodeIdentifiant;
  onChange: (m: MethodeIdentifiant) => void;
}) {
  const choix: { cle: MethodeIdentifiant; libelle: string }[] = [
    { cle: "telephone", libelle: "Mon numero" },
    { cle: "email", libelle: "Mon e-mail" },
  ];

  return (
    <div>
      <p className="mb-1.5 text-sm font-medium" style={{ color: "var(--color-texte)" }}>
        Je me connecterai avec
      </p>
      <div
        className="flex gap-1 rounded-xl p-1"
        style={{ background: "var(--color-secondaire)" }}
      >
        {choix.map((c) => {
          const actif = methode === c.cle;
          return (
            <button
              key={c.cle}
              type="button"
              onClick={() => onChange(c.cle)}
              className="flex-1 rounded-lg py-2 text-sm transition"
              style={{
                background: actif ? "var(--color-carte)" : "transparent",
                color: actif ? "var(--color-orange)" : "var(--color-texte2)",
                fontWeight: actif ? 600 : 400,
                boxShadow: actif ? "0 1px 3px rgba(0,0,0,0.08)" : undefined,
              }}
            >
              {c.libelle}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ===== Champ e-mail =====
export function ChampEmail({
  valeur,
  onChange,
  erreur,
  aide,
}: {
  valeur: string;
  onChange: (v: string) => void;
  erreur?: string | null;
  aide?: string;
}) {
  return (
    <div>
      <p className="mb-1.5 text-sm font-medium" style={{ color: "var(--color-texte)" }}>
        Adresse e-mail
      </p>
      <input
        type="email"
        inputMode="email"
        autoComplete="email"
        autoCapitalize="none"
        spellCheck={false}
        value={valeur}
        onChange={(e) => onChange(e.target.value)}
        placeholder="awa.diallo@gmail.com"
        className="w-full rounded-xl border px-4 py-3 text-base outline-none"
        style={{
          borderColor: erreur ? "#dc2626" : "var(--color-bordure)",
          background: "var(--color-fond)",
          color: "var(--color-texte)",
        }}
      />
      <p
        className="mt-1.5 text-xs"
        style={{ color: erreur ? "#dc2626" : "var(--color-texte2)" }}
      >
        {erreur ?? aide ?? "Ce sera votre identifiant de connexion."}
      </p>
    </div>
  );
}