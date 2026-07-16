// >>> EMPLACEMENT : src/components/consentement.tsx
"use client";

// =========================================================================
// Cases d'acceptation avant la creation d'un compte + enregistrement de la
// preuve.
//
//   - CaseAcceptation : une case a cocher avec un texte et des liens.
//   - enregistrerConsentements : ecrit la trace en base (qui, quoi, quelle
//     version, quand). A appeler JUSTE APRES la creation du compte, car il
//     faut etre connecte pour signer.
//
// Regle : on ne coche RIEN par defaut. La personne doit agir.
// =========================================================================

import { createClient } from "@/lib/supabase/client";

// Version des textes acceptes. Si vous modifiez les conditions ou la
// politique de confidentialite, passez a "v2" : l'accord sera redemande.
export const VERSION_TEXTES = "v1";

export type TypeConsentement = "cgu" | "confidentialite" | "verification_identite";

// ===== Enregistrer la preuve du consentement =====
// A appeler apres la creation du compte (la personne est alors connectee).
// On n'interrompt jamais l'inscription si l'ecriture echoue : on renvoie
// simplement false, l'essentiel etant que la case ait ete cochee.
export async function enregistrerConsentements(
  userId: string,
  types: TypeConsentement[]
): Promise<boolean> {
  try {
    const supabase = createClient();
    const { error } = await supabase
      .from("user_consents")
      .upsert(
        types.map((type) => ({ user_id: userId, type, version: VERSION_TEXTES })),
        { onConflict: "user_id,type,version", ignoreDuplicates: true }
      );
    return !error;
  } catch {
    return false;
  }
}

// ===== Une case a cocher =====
export function CaseAcceptation({
  coche,
  onChange,
  erreur,
  children,
}: {
  coche: boolean;
  onChange: (v: boolean) => void;
  erreur?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label
      className="flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition"
      style={{
        borderColor: erreur ? "#dc2626" : coche ? "var(--color-vert)" : "var(--color-bordure)",
        background: coche ? "rgba(76,140,90,0.06)" : "var(--color-carte)",
      }}
    >
      <input
        type="checkbox"
        checked={coche}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer"
        style={{ accentColor: "var(--color-vert)" }}
      />
      <span className="text-xs leading-relaxed" style={{ color: "var(--color-texte)" }}>
        {children}
      </span>
    </label>
  );
}

// ===== Lien vers un texte legal (s'ouvre dans un nouvel onglet) =====
export function LienTexte({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-semibold underline"
      style={{ color: "var(--color-orange)" }}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </a>
  );
}