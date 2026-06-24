// >>> EMPLACEMENT : src/app/artisan/inscription/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { FiletTricolore, Logo, Bouton } from "@/components/ui";
import type { Trade, Commune } from "@/lib/types";

// =========================================================================
// Inscription artisan — 3 etapes (cahier des charges A1) :
//   1. Infos perso (nom, telephone, mot de passe, photo)
//   2. Metiers + zones d'intervention
//   3. Verification : televersement de la CNI
// A la fin : profil cree, statut "en attente de verification".
//
// NOUVEAU : reprise automatique. Si le numero a deja un compte (inscription
// precedente interrompue), on se reconnecte et on reprend le dossier au lieu
// de bloquer l'utilisateur avec l'erreur 422.
// =========================================================================

export default function InscriptionArtisan() {
  const router = useRouter();
  const supabase = createClient();

  const [etape, setEtape] = useState(1);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

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
    return liste.includes(id)
      ? liste.filter((x) => x !== id)
      : [...liste, id];
  }

  // Validation par etape avant de continuer
  function etape1Valide() {
    return nom.trim().length > 1 && telephone.trim().length >= 8 && motDePasse.length >= 6;
  }
  function etape2Valide() {
    return metiersChoisis.length > 0 && communesChoisies.length > 0;
  }

  // ===== Soumission finale (etape 3) =====
  async function soumettre() {
    // ===== Verification : la CNI est obligatoire =====
    if (!fichierCni) {
      setErreur("Ajoutez une photo de votre piece d'identite.");
      return;
    }
    setChargement(true);
    setErreur(null);

    try {
      // ===== Identifiant interne derive du numero de telephone =====
      // On fabrique un e-mail interne "{numero}@example.com" (domaine reserve
      // aux tests, accepte par la validation de Supabase).
      const email = `${telephone.replace(/\D/g, "")}@example.com`;

      // ===== Etape 1 : creer le compte, OU le recuperer s'il existe deja =====
      // On tente d'abord la creation. Si le numero est deja pris (inscription
      // precedente interrompue), on bascule en connexion pour reprendre le dossier.
      let userId: string | undefined;

      const { data: signUp, error: errSignUp } = await supabase.auth.signUp({
        email,
        password: motDePasse,
        options: { data: { name: nom, phone: telephone, role: "artisan" } },
      });

      if (errSignUp) {
        // ===== Le compte existe deja : on tente de se reconnecter =====
        // Supabase signale par message ou par le code 422 que l'utilisateur existe.
        const dejaInscrit =
          errSignUp.message.toLowerCase().includes("already") ||
          errSignUp.message.toLowerCase().includes("registered") ||
          errSignUp.status === 422;

        if (dejaInscrit) {
          // On se connecte avec le meme numero + mot de passe pour reprendre.
          const { data: signIn, error: errSignIn } =
            await supabase.auth.signInWithPassword({ email, password: motDePasse });

          if (errSignIn) {
            // Mauvais mot de passe : on guide l'utilisateur clairement.
            throw new Error(
              "Ce numero a deja un compte. Si c'est le votre, verifiez votre mot de passe. Sinon, utilisez un autre numero."
            );
          }
          userId = signIn.user?.id;
        } else {
          // Toute autre erreur de creation : on la remonte telle quelle.
          throw errSignUp;
        }
      } else {
        // ===== Creation reussie : on recupere l'identifiant du nouveau compte =====
        userId = signUp.user?.id;
      }

      if (!userId) throw new Error("Compte introuvable. Reessayez.");

      // ===== Creer / mettre a jour le profil (upsert, sans dependre d'un trigger) =====
      const { error: errProfil } = await supabase
        .from("profiles")
        .upsert(
          { id: userId, name: nom, phone: telephone, role: "artisan" },
          { onConflict: "id" }
        );
      if (errProfil) throw errProfil;

      // ===== Creer / garder la fiche artisan (upsert pour eviter un doublon a la reprise) =====
      const { error: errArtisan } = await supabase
        .from("artisans")
        .upsert({ id: userId, status: "pending" }, { onConflict: "id" });
      if (errArtisan) throw errArtisan;

      // ===== Lier metiers et communes (on efface d'abord pour eviter les doublons a la reprise) =====
      await supabase.from("artisan_trades").delete().eq("artisan_id", userId);
      await supabase.from("artisan_trades").insert(
        metiersChoisis.map((trade_id) => ({ artisan_id: userId, trade_id }))
      );
      await supabase.from("artisan_communes").delete().eq("artisan_id", userId);
      await supabase.from("artisan_communes").insert(
        communesChoisies.map((commune_id) => ({ artisan_id: userId, commune_id }))
      );

      // ===== Televerser la CNI dans le bucket prive, sous "{userId}/cni.ext" =====
      const ext = fichierCni.name.split(".").pop() ?? "jpg";
      const chemin = `${userId}/cni.${ext}`;
      const { error: errUpload } = await supabase.storage
        .from("national-id-documents")
        .upload(chemin, fichierCni, { upsert: true });
      if (errUpload) throw errUpload;

      // ===== Enregistrer le document de verification (efface l'ancien d'abord pour la reprise) =====
      // On supprime un eventuel document du meme type avant d'inserer, ce qui evite
      // les doublons si l'utilisateur reprend une inscription interrompue.
      await supabase
        .from("verification_documents")
        .delete()
        .eq("artisan_id", userId)
        .eq("type", "national_id");
      const { error: errDoc } = await supabase
        .from("verification_documents")
        .insert({
          artisan_id: userId,
          type: "national_id",
          file_path: chemin,
          status: "pending",
        });
      if (errDoc) throw errDoc;

      // ===== Termine : direction l'ecran "dossier en cours de verification" =====
      router.push("/artisan/verification");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Une erreur est survenue.";
      setErreur(message);
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
              style={{
                backgroundColor:
                  n <= etape ? "var(--color-orange)" : "var(--color-bordure)",
              }}
            />
          ))}
        </div>

        {/* ----- ETAPE 1 : infos perso ----- */}
        {etape === 1 && (
          <div className="space-y-4">
            <Champ label="Nom complet">
              <input
                className="champ"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                placeholder="Konan Kouassi"
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
            <Bouton onClick={() => setEtape(2)} disabled={!etape1Valide()}>
              Continuer
            </Bouton>
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
                    onClick={() => setMetiersChoisis(basculer(metiersChoisis, m.id))}
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
                    onClick={() => setCommunesChoisies(basculer(communesChoisies, c.id))}
                  >
                    {c.name}
                  </Puce>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <Bouton variante="secondaire" onClick={() => setEtape(1)}>
                Retour
              </Bouton>
              <Bouton onClick={() => setEtape(3)} disabled={!etape2Valide()}>
                Continuer
              </Bouton>
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
                onChange={(e) => setFichierCni(e.target.files?.[0] ?? null)}
              />
            </Champ>
            {erreur && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {erreur}
              </p>
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

function Champ({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      {children}
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