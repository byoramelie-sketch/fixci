// >>> EMPLACEMENT : src/app/client/inscription/page.tsx
"use client";

// =========================================================================
// Inscription client (rapide) : nom, telephone, mot de passe.
//   - Cree le compte, le profil (role client) et la ligne "clients".
//   - Reprise automatique : si le numero a deja un compte, on se reconnecte
//     et on continue (meme logique que l'inscription artisan).
//   - A la fin : direction l'accueil client (/client).
// =========================================================================

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { FiletTricolore, Logo, Bouton } from "@/components/ui";
import { BoutonRetour } from "@/components/icones";

export default function InscriptionClient() {
  const router = useRouter();
  const supabase = createClient();

  const [nom, setNom] = useState("");
  const [telephone, setTelephone] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  // ===== Validation simple du formulaire =====
  function formulaireValide() {
    return nom.trim().length > 1 && telephone.trim().length >= 8 && motDePasse.length >= 6;
  }

  // ===== Soumission =====
  async function soumettre() {
    if (!formulaireValide()) {
      setErreur("Verifiez vos informations (nom, numero, mot de passe d'au moins 6 caracteres).");
      return;
    }
    setChargement(true);
    setErreur(null);

    try {
      // ===== Identifiant interne derive du numero =====
      const email = `${telephone.replace(/\D/g, "")}@example.com`;

      // ===== Creer le compte, OU le recuperer s'il existe deja =====
      let userId: string | undefined;
      const { data: signUp, error: errSignUp } = await supabase.auth.signUp({
        email,
        password: motDePasse,
        options: { data: { name: nom, phone: telephone, role: "client" } },
      });

      if (errSignUp) {
        // Compte deja existant : on tente de se reconnecter pour reprendre.
        const dejaInscrit =
          errSignUp.message.toLowerCase().includes("already") ||
          errSignUp.message.toLowerCase().includes("registered") ||
          errSignUp.status === 422;

        if (dejaInscrit) {
          const { data: signIn, error: errSignIn } =
            await supabase.auth.signInWithPassword({ email, password: motDePasse });
          if (errSignIn) {
            throw new Error(
              "Ce numero a deja un compte. Si c'est le votre, verifiez votre mot de passe. Sinon, utilisez un autre numero."
            );
          }
          userId = signIn.user?.id;
        } else {
          throw errSignUp;
        }
      } else {
        userId = signUp.user?.id;
      }

      if (!userId) throw new Error("Compte introuvable. Reessayez.");

      // ===== Creer / mettre a jour le profil (role client) =====
      const { error: errProfil } = await supabase
        .from("profiles")
        .upsert(
          { id: userId, name: nom, phone: telephone, role: "client" },
          { onConflict: "id" }
        );
      if (errProfil) throw errProfil;

      // ===== Creer la ligne "clients" (les autres colonnes ont un defaut) =====
      const { error: errClient } = await supabase
        .from("clients")
        .upsert({ id: userId }, { onConflict: "id" });
      if (errClient) throw errClient;

      // ===== Termine : direction l'accueil client =====
      router.push("/client");
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Une erreur est survenue.");
    } finally {
      setChargement(false);
    }
  }

  return (
    <div className="min-h-screen bg-fond">
      <FiletTricolore />
      <div className="mx-auto max-w-md px-5 py-6">
        {/* En-tete avec fleche retour */}
        <header className="mb-6 flex items-center gap-3">
          <BoutonRetour />
          <Logo />
        </header>

        <h1 className="mb-1 text-2xl">Creer un compte client</h1>
        <p className="mb-6 text-sm text-texte2">
          Trouvez un artisan de confiance, pres de chez vous.
        </p>

        <div className="space-y-4">
          <Champ label="Nom complet">
            <input
              className="champ"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder="Awa Diallo"
            />
          </Champ>
          <Champ label="Numero de telephone / WhatsApp">
            <input
              className="champ"
              value={telephone}
              onChange={(e) => setTelephone(e.target.value)}
              placeholder="07 07 12 34 56"
              inputMode="tel"
            />
          </Champ>
          <Champ label="Mot de passe (6 caracteres minimum)">
            <input
              className="champ"
              type="password"
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
            />
          </Champ>

          {erreur && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{erreur}</p>
          )}

          <Bouton onClick={soumettre} disabled={chargement}>
            {chargement ? "Creation..." : "Creer mon compte"}
          </Bouton>

          {/* Lien vers la connexion */}
          <p className="text-center text-sm text-texte2">
            Vous avez deja un compte ?{" "}
            <a href="/connexion" className="font-medium" style={{ color: "var(--color-orange)" }}>
              Se connecter
            </a>
          </p>
        </div>
      </div>

      <style>{`
        .champ {
          width: 100%;
          border: 1px solid var(--color-bordure);
          border-radius: 12px;
          background: var(--color-carte);
          padding: 0.75rem 1rem;
          font-size: 1rem;
          outline: none;
        }
        .champ:focus { border-color: var(--color-orange); }
      `}</style>
    </div>
  );
}

// ===== Champ de formulaire (label + contenu) =====
function Champ({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}