// >>> EMPLACEMENT : src/app/connexion/page.tsx
"use client";

// =========================================================================
// Connexion partagee (artisan / client / admin).
//   - On peut taper SON NUMERO ou SON E-MAIL.
//   - Apres connexion, on lit le role dans "profiles" et on redirige :
//       admin   -> /admin
//       artisan -> /artisan
//       client  -> /client
// =========================================================================

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { FiletTricolore, Logo, Bouton } from "@/components/ui";

export default function Connexion() {
  const router = useRouter();
  const supabase = createClient();

  const [identifiant, setIdentifiant] = useState(""); // numero OU e-mail
  const [motDePasse, setMotDePasse] = useState("");
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  // ===== Transformer l'identifiant saisi en e-mail de connexion =====
  // S'il contient "@", c'est deja un e-mail (ex: admin@fixci.com) -> on le garde.
  // Sinon c'est un numero -> on reconstruit l'e-mail interne {numero}@example.com.
  function versEmail(saisie: string): string {
    const valeur = saisie.trim();
    if (valeur.includes("@")) return valeur;
    return `${valeur.replace(/\D/g, "")}@example.com`;
  }

  // ===== Tentative de connexion =====
  async function seConnecter() {
    setChargement(true);
    setErreur(null);
    try {
      // 1. Se connecter avec l'e-mail derive + le mot de passe.
      const email = versEmail(identifiant);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: motDePasse,
      });
      if (error) throw new Error("Identifiant ou mot de passe incorrect.");

      // 2. Lire le role pour savoir vers quel espace rediriger.
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();

      // 3. Rediriger selon le role.
      const role = profile?.role;
      if (role === "admin") {
        router.push("/admin");
      } else if (role === "artisan") {
        router.push("/artisan");
      } else if (role === "client") {
        router.push("/client");
      } else {
        // Role inconnu ou profil manquant : on deconnecte par securite.
        await supabase.auth.signOut();
        throw new Error("Compte sans espace attribue. Contactez le support.");
      }
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
          <p className="mt-2 text-sm text-texte2">Connectez-vous a votre espace</p>
        </div>

        <div className="rounded-2xl border border-bordure bg-carte p-6">
          <h1 className="mb-5 text-xl">Connexion</h1>

          <label className="mb-4 block">
            <span className="mb-1.5 block text-sm font-medium">
              Numero de telephone ou e-mail
            </span>
            <input
              className="champ"
              type="text"
              value={identifiant}
              onChange={(e) => setIdentifiant(e.target.value)}
              placeholder="07 07 12 34 56"
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

          {/* Lien vers la creation de compte */}
          <p className="mt-5 text-center text-sm text-texte2">
            Pas encore de compte ?{" "}
            <a href="/inscription" className="font-medium" style={{ color: "var(--color-orange)" }}>
              Creer un compte
            </a>
          </p>
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