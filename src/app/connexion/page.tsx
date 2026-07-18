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
import { ancienEmail, normaliserTelephone, telephoneVersEmail } from "@/lib/telephone";
import { PAYS, PAYS_DEFAUT } from "@/lib/telephone";

export default function Connexion() {
  const router = useRouter();
  const supabase = createClient();

  const [identifiant, setIdentifiant] = useState(""); // numero OU e-mail
  const [codePays, setCodePays] = useState(PAYS_DEFAUT.code);

  // Si la personne tape une adresse, l'indicatif ne sert a rien.
  const estEmail = identifiant.includes("@");
  const [motDePasse, setMotDePasse] = useState("");
  const [chargement, setChargement] = useState(false);

  // Erreurs : une par champ + une generale (identifiants, reseau...).
  const [errIdentifiant, setErrIdentifiant] = useState<string | null>(null);
  const [errMotDePasse, setErrMotDePasse] = useState<string | null>(null);
  const [errGenerale, setErrGenerale] = useState<string | null>(null);

  // ===== Les identifiants a essayer, dans l'ordre =====
  // Un e-mail : on le prend tel quel.
  // Un numero : on essaie d'abord le format international (les comptes creés
  // depuis la normalisation), puis l'ANCIEN format (les comptes d'avant).
  // Ce second essai est une passerelle : a retirer quand plus personne ne
  // se connectera avec un compte cree avant la normalisation.
  function identifiantsPossibles(saisie: string): string[] {
    const valeur = saisie.trim();
    // Une adresse : on la ramene en minuscules, comme a l'inscription, pour
    // que "Awa@Gmail.COM" et "awa@gmail.com" menent au meme compte.
    if (valeur.includes("@")) return [valeur.toLowerCase()];

    const essais: string[] = [];
    const numero = normaliserTelephone(codePays, valeur);
    if (numero) essais.push(telephoneVersEmail(numero));

    const ancien = ancienEmail(valeur);
    if (!essais.includes(ancien)) essais.push(ancien);

    return essais;
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
      // 3. Essayer chaque identifiant possible jusqu'a ce que ca marche.
      const essais = identifiantsPossibles(identifiant);
      let data: { user: { id: string } } | null = null;
      let derniereErreur = "";

      for (const email of essais) {
        const r = await supabase.auth.signInWithPassword({ email, password: motDePasse });
        if (!r.error && r.data.user) {
          data = { user: { id: r.data.user.id } };
          break;
        }
        derniereErreur = r.error?.message ?? "";
      }

      if (!data) {
        setErrGenerale(messageErreurAuth(derniereErreur));
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

          {/* --- Champ identifiant : numero (avec indicatif) ou e-mail --- */}
          <label className="mb-4 block">
            <span className="mb-1.5 block text-sm font-medium">
              Numero de telephone ou e-mail
            </span>
            <div className="flex gap-2">
              {/* L'indicatif ne sert que pour un numero : on le cache des que
                  la personne tape une adresse e-mail. */}
              {!estEmail && (
                <select
                  value={codePays}
                  onChange={(e) => setCodePays(e.target.value)}
                  className="shrink-0 rounded-xl border px-2 py-3 text-sm outline-none"
                  style={{
                    borderColor: "var(--color-bordure)",
                    background: "var(--color-fond)",
                    color: "var(--color-texte)",
                  }}
                >
                  {PAYS.map((p) => (
                    <option key={p.code} value={p.code}>
                      +{p.indicatif} {p.code}
                    </option>
                  ))}
                </select>
              )}
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
            </div>
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