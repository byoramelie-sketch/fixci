// >>> EMPLACEMENT : src/app/artisan/inscription/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { FiletTricolore, Logo, Bouton } from "@/components/ui";
import { messageErreurAuth } from "@/lib/erreurs";
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
  const [telephone, setTelephone] = useState("");
  const [motDePasse, setMotDePasse] = useState("");

  // Etape 2
  const [metiersChoisis, setMetiersChoisis] = useState<string[]>([]);
  const [communesChoisies, setCommunesChoisies] = useState<string[]>([]);

  // Etape 3
  const [fichierCni, setFichierCni] = useState<File | null>(null);

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
    if (telephone.replace(/\D/g, "").length < 8) {
      setErrTel("Numéro de téléphone invalide.");
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
    // La CNI est obligatoire.
    if (!fichierCni) {
      setErreur("Ajoutez une photo de votre pièce d'identité.");
      return;
    }
    setChargement(true);
    setErreur(null);

    try {
      const email = `${telephone.replace(/\D/g, "")}@example.com`;

      // ===== Creer le compte, OU le recuperer s'il existe deja =====
      let userId: string | undefined;
      const { data: signUp, error: errSignUp } = await supabase.auth.signUp({
        email,
        password: motDePasse,
        options: { data: { name: nom, phone: telephone, role: "artisan" } },
      });

      if (errSignUp) {
        const dejaInscrit =
          errSignUp.message.toLowerCase().includes("already") ||
          errSignUp.message.toLowerCase().includes("registered") ||
          errSignUp.status === 422;

        if (dejaInscrit) {
          // On tente de reconnecter. Si le mot de passe ne correspond pas,
          // le numero est deja pris : on renvoie a l'etape 1 avec le message.
          const { data: signIn, error: errSignIn } =
            await supabase.auth.signInWithPassword({ email, password: motDePasse });
          if (errSignIn) {
            setErrTel("Ce numéro est déjà utilisé. Connectez-vous, ou utilisez un autre numéro.");
            setEtape(1);
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

      // ===== Profil (upsert) =====
      const { error: errProfil } = await supabase
        .from("profiles")
        .upsert({ id: userId, name: nom, phone: telephone, role: "artisan" }, { onConflict: "id" });
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

      // ===== Televerser la CNI (bucket prive) =====
      const ext = fichierCni.name.split(".").pop() ?? "jpg";
      const chemin = `${userId}/cni.${ext}`;
      const { error: errUpload } = await supabase.storage
        .from("national-id-documents")
        .upload(chemin, fichierCni, { upsert: true });
      if (errUpload) throw errUpload;

      // ===== Enregistrer le document de verification =====
      await supabase
        .from("verification_documents")
        .delete()
        .eq("artisan_id", userId)
        .eq("type", "national_id");
      const { error: errDoc } = await supabase
        .from("verification_documents")
        .insert({ artisan_id: userId, type: "national_id", file_path: chemin, status: "pending" });
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
              Votre piece d&apos;identite reste <strong>privee</strong> : seule
              l&apos;equipe FixCI peut la consulter, jamais les clients.
            </div>
            <Champ label="Photo de la piece d'identite (CNI)">
              <input
                className="champ"
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => {
                  setFichierCni(e.target.files?.[0] ?? null);
                  if (erreur) setErreur(null);
                }}
              />
            </Champ>
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