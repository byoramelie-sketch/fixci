// >>> EMPLACEMENT : src/app/client/inscription/page.tsx
"use client";

// =========================================================================
// Inscription client (rapide) : nom, telephone, mot de passe.
//   - Messages d'erreur clairs, champ par champ (nom, numero, mot de passe).
//   - "Ce numero est deja utilise" explicite si le numero existe deja.
//   - Reprise automatique : si le numero + mot de passe correspondent a un
//     compte existant, on se reconnecte et on continue.
//   - A la fin : direction l'accueil client (/client).
// =========================================================================

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { FiletTricolore, Logo, Bouton } from "@/components/ui";
import { BoutonRetour } from "@/components/icones";
import { messageErreurAuth } from "@/lib/erreurs";

export default function InscriptionClient() {
  const router = useRouter();
  const supabase = createClient();

  const [nom, setNom] = useState("");
  const [telephone, setTelephone] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [chargement, setChargement] = useState(false);

  // Erreurs : une par champ + une generale (numero deja utilise, reseau...).
  const [errNom, setErrNom] = useState<string | null>(null);
  const [errTel, setErrTel] = useState<string | null>(null);
  const [errMdp, setErrMdp] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  // ===== Verifier les champs et afficher un message clair sous chacun =====
  function champsValides(): boolean {
    let ok = true;
    setErrNom(null);
    setErrTel(null);
    setErrMdp(null);
    setErreur(null);

    if (nom.trim().length < 2) {
      setErrNom("Veuillez entrer votre nom complet.");
      ok = false;
    }
    if (telephone.replace(/\D/g, "").length < 8) {
      setErrTel("Numéro de téléphone invalide.");
      ok = false;
    }
    if (motDePasse.length < 6) {
      setErrMdp("Le mot de passe doit contenir au moins 6 caractères.");
      ok = false;
    }
    return ok;
  }

  // ===== Soumission =====
  async function soumettre() {
    if (!champsValides()) return;

    setChargement(true);
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
        const dejaInscrit =
          errSignUp.message.toLowerCase().includes("already") ||
          errSignUp.message.toLowerCase().includes("registered") ||
          errSignUp.status === 422;

        if (dejaInscrit) {
          // On tente de reconnecter (reprise). Si le mot de passe ne correspond
          // pas, c'est que le numero est deja pris : message clair.
          const { data: signIn, error: errSignIn } =
            await supabase.auth.signInWithPassword({ email, password: motDePasse });
          if (errSignIn) {
            setErrTel("Ce numéro est déjà utilisé. Connectez-vous, ou utilisez un autre numéro.");
            return;
          }
          userId = signIn.user?.id;
        } else {
          setErreur(messageErreurAuth(errSignUp.message));
          return;
        }
      } else {
        userId = signUp.user?.id;
      }

      if (!userId) {
        setErreur("Compte introuvable. Veuillez réessayer.");
        return;
      }

      // ===== Creer / mettre a jour le profil (role client) =====
      const { error: errProfil } = await supabase
        .from("profiles")
        .upsert({ id: userId, name: nom, phone: telephone, role: "client" }, { onConflict: "id" });
      if (errProfil) throw errProfil;

      // ===== Creer la ligne "clients" (les autres colonnes ont un defaut) =====
      const { error: errClient } = await supabase
        .from("clients")
        .upsert({ id: userId }, { onConflict: "id" });
      if (errClient) throw errClient;

      // ===== Termine : direction l'accueil client =====
      router.push("/client");
    } catch {
      setErreur("Une erreur est survenue. Veuillez réessayer.");
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

        {/* Erreur generale (reseau, etc.) */}
        {erreur && (
          <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{erreur}</p>
        )}

        <div className="space-y-4">
          <Champ label="Nom complet" erreur={errNom}>
            <input
              className="champ"
              style={errNom ? { borderColor: "#dc2626" } : undefined}
              value={nom}
              onChange={(e) => {
                setNom(e.target.value);
                if (errNom) setErrNom(null);
              }}
              placeholder="Awa Diallo"
            />
          </Champ>
          <Champ label="Numero de telephone / WhatsApp" erreur={errTel}>
            <input
              className="champ"
              style={errTel ? { borderColor: "#dc2626" } : undefined}
              value={telephone}
              onChange={(e) => {
                setTelephone(e.target.value);
                if (errTel) setErrTel(null);
              }}
              placeholder="07 07 12 34 56"
              inputMode="tel"
            />
          </Champ>
          <Champ label="Mot de passe (6 caracteres minimum)" erreur={errMdp}>
            <input
              className="champ"
              style={errMdp ? { borderColor: "#dc2626" } : undefined}
              type="password"
              value={motDePasse}
              onChange={(e) => {
                setMotDePasse(e.target.value);
                if (errMdp) setErrMdp(null);
              }}
            />
          </Champ>

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

// ===== Champ de formulaire (label + contenu + message d'erreur) =====
function Champ({
  label,
  erreur,
  children,
}: {
  label: string;
  erreur?: string | null;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      {children}
      {erreur && <span className="mt-1 block text-xs text-red-600">{erreur}</span>}
    </label>
  );
}