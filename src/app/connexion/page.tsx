// >>> EMPLACEMENT : src/app/connexion/page.tsx
"use client";

// =========================================================================
// Connexion partagee (artisan / client / admin).
//   - On peut taper SON NUMERO ou SON E-MAIL.
//   - Messages d'erreur clairs : champ vide, identifiants incorrects...
//   - Apres connexion, on lit le role dans "profiles" et on redirige.
// =========================================================================

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { FiletTricolore, Logo, Bouton } from "@/components/ui";
import { messageErreurAuth } from "@/lib/erreurs";

export default function Connexion() {
  const router = useRouter();
  const supabase = createClient();

  const [identifiant, setIdentifiant] = useState(""); // numero OU e-mail
  const [motDePasse, setMotDePasse] = useState("");
  const [chargement, setChargement] = useState(false);

  // Erreurs : une par champ + une generale (identifiants, reseau...).
  const [errIdentifiant, setErrIdentifiant] = useState<string | null>(null);
  const [errMotDePasse, setErrMotDePasse] = useState<string | null>(null);
  const [errGenerale, setErrGenerale] = useState<string | null>(null);

  // ===== Transformer l'identifiant saisi en e-mail de connexion =====
  function versEmail(saisie: string): string {
    const valeur = saisie.trim();
    if (valeur.includes("@")) return valeur;
    return `${valeur.replace(/\D/g, "")}@example.com`;
  }

  // ===== Tentative de connexion =====
  async function seConnecter() {
    // 1. Repartir sur des erreurs propres.
    setErrIdentifiant(null);
    setErrMotDePasse(null);
    setErrGenerale(null);

    // 2. Verifier les champs vides AVANT d'appeler le serveur.
    let valide = true;
    if (!identifiant.trim()) {
      setErrIdentifiant("Veuillez entrer votre numéro ou e-mail.");
      valide = false;
    }
    if (!motDePasse) {
      setErrMotDePasse("Veuillez entrer votre mot de passe.");
      valide = false;
    }
    if (!valide) return;

    setChargement(true);
    try {
      // 3. Se connecter avec l'e-mail derive + le mot de passe.
      const email = versEmail(identifiant);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: motDePasse,
      });
      if (error) {
        setErrGenerale(messageErreurAuth(error.message));
        return;
      }

      // 4. Lire le role pour savoir vers quel espace rediriger.
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();

      const role = profile?.role;
      if (role === "admin") {
        router.push("/admin");
      } else if (role === "artisan") {
        router.push("/artisan");
      } else if (role === "client") {
        router.push("/client");
      } else {
        await supabase.auth.signOut();
        setErrGenerale("Compte sans espace attribué. Contactez le support.");
      }
    } catch {
      // Erreur reseau ou inattendue.
      setErrGenerale("Connexion impossible. Vérifiez votre connexion internet.");
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

          {/* --- Erreur generale (identifiants, reseau...) --- */}
          {errGenerale && (
            <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {errGenerale}
            </p>
          )}

          {/* --- Champ identifiant --- */}
          <label className="mb-4 block">
            <span className="mb-1.5 block text-sm font-medium">
              Numero de telephone ou e-mail
            </span>
            <input
              className="champ"
              style={errIdentifiant ? { borderColor: "#dc2626" } : undefined}
              type="text"
              value={identifiant}
              onChange={(e) => {
                setIdentifiant(e.target.value);
                if (errIdentifiant) setErrIdentifiant(null);
              }}
              placeholder="07 07 12 34 56"
              autoComplete="username"
            />
            {errIdentifiant && (
              <span className="mt-1 block text-xs text-red-600">{errIdentifiant}</span>
            )}
          </label>

          {/* --- Champ mot de passe --- */}
          <label className="mb-5 block">
            <span className="mb-1.5 block text-sm font-medium">Mot de passe</span>
            <input
              className="champ"
              style={errMotDePasse ? { borderColor: "#dc2626" } : undefined}
              type="password"
              value={motDePasse}
              onChange={(e) => {
                setMotDePasse(e.target.value);
                if (errMotDePasse) setErrMotDePasse(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !chargement) seConnecter();
              }}
              autoComplete="current-password"
            />
            {errMotDePasse && (
              <span className="mt-1 block text-xs text-red-600">{errMotDePasse}</span>
            )}
          </label>

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