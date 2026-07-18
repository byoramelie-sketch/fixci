// >>> EMPLACEMENT : src/app/artisan/inscription/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { FiletTricolore, Logo, Bouton } from "@/components/ui";
import { messageErreurAuth } from "@/lib/erreurs";
import {
  CaseAcceptation,
  LienTexte,
  enregistrerConsentements,
} from "@/components/consentement";
import { PrisePhoto } from "@/components/prise-photo";
import { ChampTelephone } from "@/components/champ-telephone";
import { PAYS_DEFAUT, normaliserTelephone, telephoneVersEmail } from "@/lib/telephone";
import type { Trade, Commune } from "@/lib/types";

// =========================================================================
// Inscription artisan — 3 etapes (cahier des charges A1) :
//   1. Infos perso (nom, telephone, mot de passe)
//   2. Metiers + zones d'intervention
//   3. Verification : televersement de la CNI
//
// Messages d'erreur clairs, champ par champ. Si le numero est deja utilise,
// on renvoie a l'etape 1 avec un message explicite sur le champ numero.
// Reprise automatique conservee (numero + bon mot de passe = on reconnecte).
// =========================================================================

export default function InscriptionArtisan() {
  const router = useRouter();
  const supabase = createClient();

  const [etape, setEtape] = useState(1);
  const [chargement, setChargement] = useState(false);

  // Referentiels charges depuis la base
  const [metiers, setMetiers] = useState<Trade[]>([]);
  const [communes, setCommunes] = useState<Commune[]>([]);

  // Etape 1
  const [nom, setNom] = useState("");
  // Le pays choisi + le numero tel que la personne le tape.
  const [codePays, setCodePays] = useState(PAYS_DEFAUT.code);
  const [telephone, setTelephone] = useState("");
  const [motDePasse, setMotDePasse] = useState("");

  // Etape 2
  const [metiersChoisis, setMetiersChoisis] = useState<string[]>([]);
  const [communesChoisies, setCommunesChoisies] = useState<string[]>([]);

  // Etape 3
  const [fichierCni, setFichierCni] = useState<File | null>(null);
  // Le VERSO de la piece (numero, date d'expiration).
  const [fichierCniVerso, setFichierCniVerso] = useState<File | null>(null);
  // Photo du visage, prise sur le champ : c'est elle qui permet de reperer
  // une usurpation (quelqu'un qui enverrait la piece d'identite d'un autre).
  const [fichierSelfie, setFichierSelfie] = useState<File | null>(null);
  // Consentements : rien n'est coche par defaut.
  const [accepteCgu, setAccepteCgu] = useState(false);
  const [accepteIdentite, setAccepteIdentite] = useState(false);
  const [errCgu, setErrCgu] = useState(false);
  const [errIdentite, setErrIdentite] = useState(false);

  // Erreurs par champ + generales
  const [errNom, setErrNom] = useState<string | null>(null);
  const [errTel, setErrTel] = useState<string | null>(null);
  const [errMdp, setErrMdp] = useState<string | null>(null);
  const [errEtape2, setErrEtape2] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  // Charger metiers + communes au montage
  useEffect(() => {
    (async () => {
      const { data: t } = await supabase
        .from("trades")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      const { data: c } = await supabase
        .from("communes")
        .select("*")
        .eq("is_active", true)
        .order("name");
      if (t) setMetiers(t);
      if (c) setCommunes(c);
    })();
  }, [supabase]);

  function basculer(liste: string[], id: string): string[] {
    return liste.includes(id) ? liste.filter((x) => x !== id) : [...liste, id];
  }

  // ===== Etape 1 : valider les champs avec messages clairs =====
  function validerEtape1() {
    setErrNom(null);
    setErrTel(null);
    setErrMdp(null);
    let ok = true;
    if (nom.trim().length < 2) {
      setErrNom("Veuillez entrer votre nom complet.");
      ok = false;
    }
    // Le numero doit etre valide pour le pays choisi.
    if (!normaliserTelephone(codePays, telephone)) {
      setErrTel("Numéro invalide pour le pays choisi.");
      ok = false;
    }
    if (motDePasse.length < 6) {
      setErrMdp("Le mot de passe doit contenir au moins 6 caractères.");
      ok = false;
    }
    if (ok) setEtape(2);
  }

  // ===== Etape 2 : au moins un metier et une zone =====
  function validerEtape2() {
    if (metiersChoisis.length === 0 || communesChoisies.length === 0) {
      setErrEtape2("Choisissez au moins un métier et une zone d'intervention.");
      return;
    }
    setErrEtape2(null);
    setEtape(3);
  }

  // ===== Soumission finale (etape 3) =====
  async function soumettre() {
    // Les trois photos sont obligatoires.
    if (!fichierCni) {
      setErreur("Prenez une photo du recto de votre pièce d'identité.");
      return;
    }
    if (!fichierCniVerso) {
      setErreur("Prenez aussi une photo du verso de votre pièce d'identité.");
      return;
    }
    if (!fichierSelfie) {
      setErreur("Prenez une photo de votre visage : elle sera comparée à votre pièce d'identité.");
      return;
    }
    // Les deux consentements sont obligatoires : les conditions generales,
    // et l'accord explicite pour l'usage de la piece d'identite.
    setErrCgu(false);
    setErrIdentite(false);
    if (!accepteCgu || !accepteIdentite) {
      setErrCgu(!accepteCgu);
      setErrIdentite(!accepteIdentite);
      setErreur("Vous devez accepter les conditions pour envoyer votre dossier.");
      return;
    }
    setChargement(true);
    setErreur(null);

    try {
      // ===== Numero au format international : "un numero = un compte" =====
      const numero = normaliserTelephone(codePays, telephone);
      if (!numero) {
        setErrTel("Numéro invalide pour le pays choisi.");
        setChargement(false);
        return;
      }
      const email = telephoneVersEmail(numero);

      // ===== Creer le compte. Si le numero existe deja, on BLOQUE (aucune
      // fusion) et on renvoie a l'etape 1 avec le message. =====
      const { data: signUp, error: errSignUp } = await supabase.auth.signUp({
        email,
        password: motDePasse,
        options: { data: { name: nom, phone: numero, role: "artisan" } },
      });

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
        setEtape(1);
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

      // ===== Enregistrer la preuve des consentements =====
      // On le fait AVANT de televerser la piece d'identite : on ne collecte
      // pas de document sans avoir trace l'accord de la personne.
      await enregistrerConsentements(userId, [
        "cgu",
        "confidentialite",
        "verification_identite",
      ]);

      // ===== Profil (upsert) =====
      const { error: errProfil } = await supabase
        .from("profiles")
        .upsert({ id: userId, name: nom, phone: numero, role: "artisan" }, { onConflict: "id" });
      if (errProfil) throw errProfil;

      // ===== Fiche artisan (upsert) =====
      const { error: errArtisan } = await supabase
        .from("artisans")
        .upsert({ id: userId, status: "pending" }, { onConflict: "id" });
      if (errArtisan) throw errArtisan;

      // ===== Metiers et zones (on efface d'abord pour eviter les doublons) =====
      await supabase.from("artisan_trades").delete().eq("artisan_id", userId);
      await supabase.from("artisan_trades").insert(
        metiersChoisis.map((trade_id) => ({ artisan_id: userId, trade_id }))
      );
      await supabase.from("artisan_communes").delete().eq("artisan_id", userId);
      await supabase.from("artisan_communes").insert(
        communesChoisies.map((commune_id) => ({ artisan_id: userId, commune_id }))
      );

      // ===== Televerser les 3 photos (bucket prive) =====
      const cheminRecto = `${userId}/cni-recto.jpg`;
      const cheminVerso = `${userId}/cni-verso.jpg`;
      const cheminSelfie = `${userId}/visage.jpg`;

      const [upRecto, upVerso, upSelfie] = await Promise.all([
        supabase.storage
          .from("national-id-documents")
          .upload(cheminRecto, fichierCni, { upsert: true, contentType: "image/jpeg" }),
        supabase.storage
          .from("national-id-documents")
          .upload(cheminVerso, fichierCniVerso, { upsert: true, contentType: "image/jpeg" }),
        supabase.storage
          .from("national-id-documents")
          .upload(cheminSelfie, fichierSelfie, { upsert: true, contentType: "image/jpeg" }),
      ]);
      if (upRecto.error) throw upRecto.error;
      if (upVerso.error) throw upVerso.error;
      if (upSelfie.error) throw upSelfie.error;

      // ===== Enregistrer les 3 documents de verification =====
      await supabase
        .from("verification_documents")
        .delete()
        .eq("artisan_id", userId)
        .in("type", ["national_id", "national_id_back", "selfie"]);
      const { error: errDoc } = await supabase.from("verification_documents").insert([
        { artisan_id: userId, type: "national_id", file_path: cheminRecto, status: "pending" },
        { artisan_id: userId, type: "national_id_back", file_path: cheminVerso, status: "pending" },
        { artisan_id: userId, type: "selfie", file_path: cheminSelfie, status: "pending" },
      ]);
      if (errDoc) throw errDoc;

      router.push("/artisan/verification");
    } catch {
      setErreur("Une erreur est survenue lors de l'envoi. Veuillez réessayer.");
    } finally {
      setChargement(false);
    }
  }

  return (
    <div className="min-h-screen bg-fond">
      <FiletTricolore />
      <div className="mx-auto max-w-md px-5 py-6">
        <header className="mb-6 flex items-center justify-between">
          <Logo />
          <span className="text-sm text-texte2">Etape {etape} / 3</span>
        </header>

        <h1 className="mb-1 text-2xl">Devenir artisan FixCI</h1>
        <p className="mb-6 text-sm text-texte2">
          Votre profil sera verifie avant d&apos;etre active.
        </p>

        {/* Barre de progression */}
        <div className="mb-8 flex gap-2">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-1.5 flex-1 rounded-full"
              style={{ backgroundColor: n <= etape ? "var(--color-orange)" : "var(--color-bordure)" }}
            />
          ))}
        </div>

        {/* ----- ETAPE 1 : infos perso ----- */}
        {etape === 1 && (
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
                placeholder="Konan Kouassi"
              />
            </Champ>
            <ChampTelephone
              codePays={codePays}
              onCodePays={setCodePays}
              saisie={telephone}
              onSaisie={(v) => {
                setTelephone(v);
                if (errTel) setErrTel(null);
              }}
              erreur={errTel}
              aide="Ce numero sera votre identifiant, et celui que verront vos clients."
            />
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
            <Bouton onClick={validerEtape1}>Continuer</Bouton>
          </div>
        )}

        {/* ----- ETAPE 2 : metiers + zones ----- */}
        {etape === 2 && (
          <div className="space-y-6">
            <div>
              <p className="mb-2 text-sm font-medium">Vos metiers</p>
              <div className="flex flex-wrap gap-2">
                {metiers.map((m) => (
                  <Puce
                    key={m.id}
                    active={metiersChoisis.includes(m.id)}
                    onClick={() => {
                      setMetiersChoisis(basculer(metiersChoisis, m.id));
                      if (errEtape2) setErrEtape2(null);
                    }}
                  >
                    {m.name}
                  </Puce>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium">Vos zones d&apos;intervention</p>
              <div className="flex flex-wrap gap-2">
                {communes.map((c) => (
                  <Puce
                    key={c.id}
                    active={communesChoisies.includes(c.id)}
                    onClick={() => {
                      setCommunesChoisies(basculer(communesChoisies, c.id));
                      if (errEtape2) setErrEtape2(null);
                    }}
                  >
                    {c.name}
                  </Puce>
                ))}
              </div>
            </div>
            {errEtape2 && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{errEtape2}</p>
            )}
            <div className="flex gap-3">
              <Bouton variante="secondaire" onClick={() => setEtape(1)}>
                Retour
              </Bouton>
              <Bouton onClick={validerEtape2}>Continuer</Bouton>
            </div>
          </div>
        )}

        {/* ----- ETAPE 3 : verification CNI ----- */}
        {etape === 3 && (
          <div className="space-y-4">
            <div className="rounded-xl border border-bordure bg-secondaire p-4 text-sm text-texte2">
              Prenez les trois photos <strong>maintenant</strong>, avec votre telephone. Elles
              restent <strong>privees</strong> : seule l&apos;equipe FixCI les consulte, jamais les
              clients. C&apos;est ce controle qui protege votre nom des usurpations.
            </div>

            <PrisePhoto
              label="1. Piece d'identite — RECTO"
              aide="Le cote avec votre photo et votre nom."
              cadre="carte"
              camera="arriere"
              fichier={fichierCni}
              onChange={(f) => {
                setFichierCni(f);
                if (erreur) setErreur(null);
              }}
            />

            <PrisePhoto
              label="2. Piece d'identite — VERSO"
              aide="L'autre cote : numero et date d'expiration."
              cadre="carte"
              camera="arriere"
              fichier={fichierCniVerso}
              onChange={(f) => {
                setFichierCniVerso(f);
                if (erreur) setErreur(null);
              }}
            />

            <PrisePhoto
              label="3. Votre visage"
              aide="Nous le comparons a la photo de votre piece."
              cadre="visage"
              camera="avant"
              fichier={fichierSelfie}
              onChange={(f) => {
                setFichierSelfie(f);
                if (erreur) setErreur(null);
              }}
            />
            {/* ===== Consentements (obligatoires) ===== */}
            <div className="flex flex-col gap-2">
              <CaseAcceptation
                coche={accepteCgu}
                erreur={errCgu}
                onChange={(v) => {
                  setAccepteCgu(v);
                  if (v) {
                    setErrCgu(false);
                    setErreur(null);
                  }
                }}
              >
                J&apos;accepte les <LienTexte href="/cgu">conditions d&apos;utilisation</LienTexte>{" "}
                et la <LienTexte href="/confidentialite">politique de confidentialite</LienTexte> de
                FixCI.
              </CaseAcceptation>

              <CaseAcceptation
                coche={accepteIdentite}
                erreur={errIdentite}
                onChange={(v) => {
                  setAccepteIdentite(v);
                  if (v) {
                    setErrIdentite(false);
                    setErreur(null);
                  }
                }}
              >
                <strong>J&apos;autorise FixCI a utiliser ma piece d&apos;identite</strong> dans le
                seul but de verifier qui je suis. Elle reste privee (jamais montree aux clients),
                elle n&apos;est consultee que par l&apos;equipe de verification, et je peux demander
                sa suppression a tout moment.
              </CaseAcceptation>
            </div>

            {erreur && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{erreur}</p>
            )}
            <div className="flex gap-3">
              <Bouton variante="secondaire" onClick={() => setEtape(2)}>
                Retour
              </Bouton>
              <Bouton onClick={soumettre} disabled={chargement}>
                {chargement ? "Envoi en cours..." : "Envoyer mon dossier"}
              </Bouton>
            </div>
          </div>
        )}
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

function Puce({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full border px-4 py-2 text-sm transition"
      style={{
        borderColor: active ? "var(--color-orange)" : "var(--color-bordure)",
        backgroundColor: active ? "var(--color-orange)" : "var(--color-carte)",
        color: active ? "#fff" : "var(--color-texte)",
      }}
    >
      {children}
    </button>
  );
}