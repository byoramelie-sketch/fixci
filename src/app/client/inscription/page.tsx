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
import {
  CaseAcceptation,
  LienTexte,
  enregistrerConsentements,
} from "@/components/consentement";

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
  // Acceptation des conditions : rien n'est coche par defaut.
  const [accepte, setAccepte] = useState(false);
  const [errAccepte, setErrAccepte] = useState(false);

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
    // Sans acceptation des conditions, pas de compte.
    setErrAccepte(false);
    if (!accepte) {
      setErrAccepte(true);
      setErreur("Vous devez accepter les conditions pour créer un compte.");
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

      // ===== Creer le compte. Si le numero existe deja, on BLOQUE avec un
      // message clair (aucune fusion de comptes). =====
      const { data: signUp, error: errSignUp } = await supabase.auth.signUp({
        email,
        password: motDePasse,
        options: { data: { name: nom, phone: telephone, role: "client" } },
      });

      // Supabase signale un numero deja pris de 2 facons :
      //  - une erreur "already registered" / statut 422,
      //  - OU un utilisateur renvoye avec une liste "identities" vide.
      const dejaUtilise =
        (!!errSignUp &&
          (errSignUp.message.toLowerCase().includes("already") ||
            errSignUp.message.toLowerCase().includes("registered") ||
            errSignUp.status === 422)) ||
        (!!signUp?.user &&
          Array.isArray(signUp.user.identities) &&
          signUp.user.identities.length === 0);

      if (dejaUtilise) {
        setErrTel("Ce numéro est déjà utilisé. Connectez-vous, ou utilisez un autre numéro.");
        return;
      }
      if (errSignUp) {
        setErreur(messageErreurAuth(errSignUp.message));
        return;
      }

      const userId = signUp.user?.id;
      if (!userId) {
        setErreur("Compte introuvable. Veuillez réessayer.");
        return;
      }

      // ===== Enregistrer la preuve du consentement (personne connectee) =====
      await enregistrerConsentements(userId, ["cgu", "confidentialite"]);

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

          {/* ===== Acceptation des conditions (obligatoire) ===== */}
          <CaseAcceptation
            coche={accepte}
            erreur={errAccepte}
            onChange={(v) => {
              setAccepte(v);
              if (v) {
                setErrAccepte(false);
                setErreur(null);
              }
            }}
          >
            J&apos;accepte les <LienTexte href="/cgu">conditions d&apos;utilisation</LienTexte> et la{" "}
            <LienTexte href="/confidentialite">politique de confidentialite</LienTexte> de FixCI.
            Mes donnees servent a mettre en relation avec des artisans et a assurer le suivi des
            interventions.
          </CaseAcceptation>

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