// >>> EMPLACEMENT : src/app/artisan/profil/page.tsx
"use client";

// =========================================================================
// Edition du profil public de l'artisan.
//   - Bio (description), prix minimal, specialites, annees d'experience
//   - Galerie de photos de realisations (upload dans le bucket artisan-galleries)
//   - Fleche retour vers le tableau de bord (/artisan)
// Ces infos serviront plus tard au client pour chercher et trier les artisans.
// =========================================================================

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { FiletTricolore, Logo, Bouton } from "@/components/ui";
import { NavArtisan } from "@/components/nav-artisan";
import { BoutonRetour } from "@/components/icones";

export default function ProfilArtisan() {
  const router = useRouter();
  const supabase = createClient();

  const [userId, setUserId] = useState<string | null>(null);
  const [chargement, setChargement] = useState(true);
  const [enregistrement, setEnregistrement] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  // Champs editables
  const [bio, setBio] = useState("");
  const [prixMin, setPrixMin] = useState("");
  const [specialites, setSpecialites] = useState("");
  const [experience, setExperience] = useState("");

  // Galerie : liste des chemins de photos deja enregistrees
  const [galerie, setGalerie] = useState<string[]>([]);
  // Photo en cours de selection (pas encore envoyee)
  const [nouvellePhoto, setNouvellePhoto] = useState<File | null>(null);

  // ===== Charger le profil existant au montage =====
  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const id = auth.user?.id;
      if (!id) {
        router.push("/connexion");
        return;
      }
      setUserId(id);

      const { data: artisan } = await supabase
        .from("artisans")
        .select("bio, min_price, specialties, experience_years, gallery")
        .eq("id", id)
        .single();

      if (artisan) {
        setBio(artisan.bio ?? "");
        setPrixMin(artisan.min_price != null ? String(artisan.min_price) : "");
        setSpecialites(artisan.specialties ?? "");
        setExperience(
          artisan.experience_years != null ? String(artisan.experience_years) : ""
        );
        setGalerie(Array.isArray(artisan.gallery) ? artisan.gallery : []);
      }
      setChargement(false);
    })();
  }, [supabase, router]);

  // ===== Enregistrer les champs texte (bio, prix, specialites, experience) =====
  async function enregistrer() {
    if (!userId) return;
    setEnregistrement(true);
    setErreur(null);
    setMessage(null);
    try {
      // On convertit prix et experience en nombre (ou null si vide).
      const prixNombre = prixMin.trim() === "" ? null : Number(prixMin.replace(/\D/g, ""));
      const expNombre = experience.trim() === "" ? null : Number(experience.replace(/\D/g, ""));

      const { error } = await supabase
        .from("artisans")
        .update({
          bio: bio.trim() || null,
          min_price: prixNombre,
          specialties: specialites.trim() || null,
          experience_years: expNombre,
        })
        .eq("id", userId);
      if (error) throw error;

      setMessage("Profil enregistre.");
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Enregistrement impossible.");
    } finally {
      setEnregistrement(false);
    }
  }

  // ===== Envoyer une nouvelle photo de realisation =====
  async function ajouterPhoto() {
    if (!userId || !nouvellePhoto) return;
    setEnregistrement(true);
    setErreur(null);
    setMessage(null);
    try {
      // Chemin unique : {userId}/realisation-{horodatage}.ext
      const ext = nouvellePhoto.name.split(".").pop() ?? "jpg";
      const chemin = `${userId}/realisation-${Date.now()}.${ext}`;

      // 1. Televerser dans le bucket public des galeries.
      const { error: errUpload } = await supabase.storage
        .from("artisan-galleries")
        .upload(chemin, nouvellePhoto, { upsert: true });
      if (errUpload) throw errUpload;

      // 2. Ajouter le chemin a la galerie et enregistrer la nouvelle liste.
      const nouvelleGalerie = [...galerie, chemin];
      const { error: errMaj } = await supabase
        .from("artisans")
        .update({ gallery: nouvelleGalerie })
        .eq("id", userId);
      if (errMaj) throw errMaj;

      setGalerie(nouvelleGalerie);
      setNouvellePhoto(null);
      setMessage("Photo ajoutee.");
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Envoi de la photo impossible.");
    } finally {
      setEnregistrement(false);
    }
  }

  // ===== Retirer une photo de la galerie =====
  async function retirerPhoto(chemin: string) {
    if (!userId) return;
    setEnregistrement(true);
    setErreur(null);
    setMessage(null);
    try {
      // 1. Supprimer le fichier du stockage.
      await supabase.storage.from("artisan-galleries").remove([chemin]);

      // 2. Retirer le chemin de la liste et enregistrer.
      const nouvelleGalerie = galerie.filter((c) => c !== chemin);
      const { error } = await supabase
        .from("artisans")
        .update({ gallery: nouvelleGalerie })
        .eq("id", userId);
      if (error) throw error;

      setGalerie(nouvelleGalerie);
      setMessage("Photo retiree.");
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Suppression impossible.");
    } finally {
      setEnregistrement(false);
    }
  }

  // ===== Construire l'URL publique d'affichage d'une photo =====
  function urlPublique(chemin: string): string {
    const { data } = supabase.storage.from("artisan-galleries").getPublicUrl(chemin);
    return data.publicUrl;
  }

  if (chargement) {
    return (
      <div className="min-h-screen bg-fond">
        <FiletTricolore />
        <div className="mx-auto max-w-md px-5 py-10 text-center text-texte2">
          Chargement...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-fond pb-24">
      <FiletTricolore />
      <div className="mx-auto max-w-md px-5 py-6">
        {/* En-tete avec FLECHE RETOUR vers le tableau de bord */}
        <header className="mb-6 flex items-center gap-3">
          <BoutonRetour />
          <Logo />
        </header>

        <h1 className="mb-1 text-2xl">Mon profil</h1>
        <p className="mb-6 text-sm text-texte2">
          Ces informations aident les clients a vous choisir.
        </p>

        {/* ===== Champs texte ===== */}
        <div className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Description</span>
            <textarea
              className="champ"
              rows={4}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Presentez votre savoir-faire, votre experience..."
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">
              Prix minimal (FCFA)
            </span>
            <input
              className="champ"
              inputMode="numeric"
              value={prixMin}
              onChange={(e) => setPrixMin(e.target.value)}
              placeholder="10000"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">
              Specialites (mots-cles)
            </span>
            <input
              className="champ"
              value={specialites}
              onChange={(e) => setSpecialites(e.target.value)}
              placeholder="cuisine marocaine, depannage urgent..."
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">
              Annees d&apos;experience
            </span>
            <input
              className="champ"
              inputMode="numeric"
              value={experience}
              onChange={(e) => setExperience(e.target.value)}
              placeholder="5"
            />
          </label>

          <Bouton onClick={enregistrer} disabled={enregistrement}>
            {enregistrement ? "Enregistrement..." : "Enregistrer mes informations"}
          </Bouton>
        </div>

        {/* ===== Galerie de photos ===== */}
        <div className="mt-8">
          <h2 className="mb-3 text-lg">Mes realisations</h2>

          {galerie.length > 0 ? (
            <div className="mb-4 grid grid-cols-2 gap-3">
              {galerie.map((chemin) => (
                <div key={chemin} className="relative overflow-hidden rounded-xl border border-bordure">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={urlPublique(chemin)}
                    alt="Realisation"
                    className="h-32 w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => retirerPhoto(chemin)}
                    className="absolute right-2 top-2 rounded-full bg-white/90 px-2 py-1 text-xs text-red-700"
                  >
                    Retirer
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="mb-4 text-sm text-texte2">
              Ajoutez des photos de vos travaux pour rassurer les clients.
            </p>
          )}

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Ajouter une photo</span>
            <input
              className="champ"
              type="file"
              accept="image/*"
              onChange={(e) => setNouvellePhoto(e.target.files?.[0] ?? null)}
            />
          </label>
          <div className="mt-3">
            <Bouton
              variante="secondaire"
              onClick={ajouterPhoto}
              disabled={enregistrement || !nouvellePhoto}
            >
              {enregistrement ? "Envoi..." : "Envoyer cette photo"}
            </Bouton>
          </div>
        </div>

        {/* Messages */}
        {message && (
          <p className="mt-4 rounded-lg px-3 py-2 text-sm" style={{ backgroundColor: "rgba(76,140,90,0.12)", color: "var(--color-vert)" }}>
            {message}
          </p>
        )}
        {erreur && (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {erreur}
          </p>
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

      <NavArtisan />
    </div>
  );
}