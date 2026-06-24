"use client";

// =========================================================================
// >>> EMPLACEMENT DE CE FICHIER :
//     src/app/admin/connexion/page.tsx
// >>> PAGE DE CONNEXION ADMIN (l'ecran ou on tape email + mot de passe)
// =========================================================================

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { FiletTricolore, Logo, Bouton } from "@/components/ui";

// ===== Connexion administrateur =====
// Acces reserve aux employes FixCI. Le compte admin n'est jamais cree ici :
// il est attribue a la main dans Supabase. Cette page sert seulement a se
// connecter avec un compte deja promu admin.
export default function ConnexionAdmin() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  // ===== Tentative de connexion =====
  async function seConnecter() {
    setChargement(true);
    setErreur(null);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: motDePasse,
      });
      if (error) throw error;

      // Verifier que ce compte est bien admin avant de laisser entrer.
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();

      if (profile?.role !== "admin") {
        await supabase.auth.signOut();
        throw new Error("Acces reserve aux administrateurs.");
      }

      router.push("/admin");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Connexion impossible.";
      setErreur(msg);
    } finally {
      setChargement(false);
    }
  }

  return (
    <div className="min-h-screen bg-fond">
      <FiletTricolore />
      <div className="mx-auto flex min-h-[80vh] max-w-sm flex-col justify-center px-5">
        <div className="mb-8 text-center">
          <Logo />
          <p className="mt-2 text-sm text-texte2">Espace administration</p>
        </div>

        <div className="rounded-2xl border border-bordure bg-carte p-6">
          <h1 className="mb-5 text-xl">Connexion</h1>

          <label className="mb-4 block">
            <span className="mb-1.5 block text-sm font-medium">Adresse e-mail</span>
            <input
              className="champ"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vous@fixci.ci"
              autoComplete="username"
            />
          </label>

          <label className="mb-5 block">
            <span className="mb-1.5 block text-sm font-medium">Mot de passe</span>
            <input
              className="champ"
              type="password"
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
              autoComplete="current-password"
            />
          </label>

          {erreur && (
            <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {erreur}
            </p>
          )}

          <Bouton onClick={seConnecter} disabled={chargement}>
            {chargement ? "Connexion..." : "Se connecter"}
          </Bouton>
        </div>
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
        }
        .champ:focus { border-color: var(--color-orange); }
      `}</style>
    </div>
  );
}