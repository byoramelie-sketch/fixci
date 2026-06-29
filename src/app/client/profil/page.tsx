// >>> EMPLACEMENT : src/app/client/profil/page.tsx
// =========================================================================
// Onglet "Profil" du client : informations du compte + deconnexion.
//   - Lit le nom et le telephone dans `profiles`.
//   - Bouton "Se deconnecter" via une Server Action (signOut cote serveur,
//     pas besoin du client navigateur).
// Onglet principal -> pas de fleche retour, la barre du bas suffit.
// L'edition du profil viendra plus tard. Server Component.
// =========================================================================

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { IconeDeconnexion } from "@/components/icones";

// ===== Server Action : deconnexion =====
// S'execute cote serveur : ferme la session puis renvoie vers /connexion.
async function seDeconnecter() {
  "use server";
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/connexion");
}

// ===== Initiales a partir du nom (ex : "Konan Kouassi" -> "KK") =====
function initiales(nom: string) {
  const mots = nom.trim().split(/\s+/).filter(Boolean);
  const lettres = mots.slice(0, 2).map((m) => m[0] ?? "");
  return lettres.join("").toUpperCase() || "?";
}

// ===== Type du profil (colonnes lues) =====
type Profil = { name: string | null; phone: string | null };

export default async function ProfilClient() {
  const supabase = await createClient();

  // ===== Utilisateur connecte =====
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/connexion");
  }

  // ===== Profil (nom, telephone) =====
  const { data } = await supabase
    .from("profiles")
    .select("name, phone")
    .eq("id", user.id)
    .single();
  const profil = (data ?? null) as Profil | null;
  const nom = profil?.name ?? "Mon compte";

  return (
    <div className="flex flex-col gap-5">
      {/* ===== Titre ===== */}
      <h1 className="text-xl" style={{ color: "var(--color-texte)" }}>
        Mon profil
      </h1>

      {/* ===== Carte d'identite du compte ===== */}
      <div
        className="flex items-center gap-4 rounded-xl border p-4"
        style={{ background: "var(--color-carte)", borderColor: "var(--color-bordure)" }}
      >
        {/* Pastille d'initiales */}
        <div
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-lg font-semibold text-white"
          style={{ background: "var(--color-orange)" }}
        >
          {initiales(nom)}
        </div>
        <div className="flex flex-col">
          <span className="text-base font-semibold" style={{ color: "var(--color-texte)" }}>
            {nom}
          </span>
          <span className="text-sm" style={{ color: "var(--color-texte2)" }}>
            {profil?.phone ?? "Telephone non renseigne"}
          </span>
          <span className="text-xs" style={{ color: "var(--color-texte2)" }}>
            Compte client
          </span>
        </div>
      </div>

      {/* ===== Deconnexion ===== */}
      <form action={seDeconnecter}>
        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-xl border py-3 text-sm font-semibold"
          style={{
            borderColor: "var(--color-bordure)",
            color: "var(--color-texte)",
            background: "var(--color-carte)",
          }}
        >
          <IconeDeconnexion taille={20} />
          Se deconnecter
        </button>
      </form>
    </div>
  );
}