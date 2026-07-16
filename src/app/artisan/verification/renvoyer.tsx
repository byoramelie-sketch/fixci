// >>> EMPLACEMENT : src/app/artisan/verification/renvoyer.tsx
"use client";

// =========================================================================
// Renvoyer son dossier apres un refus (verification renforcee).
//   - L'artisan reprend les DEUX photos sur le champ : sa piece d'identite
//     et son visage. Ce sont ces deux images que l'equipe compare.
//   - Les fichiers remplacent les anciens dans le coffre (bucket prive).
//   - La fonction fixci_renvoyer_dossier remet le dossier en file d'attente
//     (elle verifie que le dossier est bien au statut "refuse").
// =========================================================================

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PrisePhoto } from "@/components/prise-photo";

export function RenvoyerDossier({ artisanId }: { artisanId: string }) {
  const router = useRouter();
  const supabase = createClient();

  const [fichierCni, setFichierCni] = useState<File | null>(null);
  const [fichierCniVerso, setFichierCniVerso] = useState<File | null>(null);
  const [fichierSelfie, setFichierSelfie] = useState<File | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState(false);

  async function renvoyer() {
    if (!fichierCni) {
      setErreur("Prenez une photo du recto de votre piece d'identite.");
      return;
    }
    if (!fichierCniVerso) {
      setErreur("Prenez aussi une photo du verso de votre piece d'identite.");
      return;
    }
    if (!fichierSelfie) {
      setErreur("Prenez une photo de votre visage : elle sera comparee a votre piece d'identite.");
      return;
    }
    setEnvoi(true);
    setErreur(null);
    try {
      // 1. Remplacer les trois photos dans le coffre.
      const cheminRecto = `${artisanId}/cni-recto.jpg`;
      const cheminVerso = `${artisanId}/cni-verso.jpg`;
      const cheminSelfie = `${artisanId}/visage.jpg`;

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
      if (upRecto.error) throw new Error(upRecto.error.message);
      if (upVerso.error) throw new Error(upVerso.error.message);
      if (upSelfie.error) throw new Error(upSelfie.error.message);

      // 2. Remplacer les documents enregistres.
      await supabase
        .from("verification_documents")
        .delete()
        .eq("artisan_id", artisanId)
        .in("type", ["national_id", "national_id_back", "selfie"]);
      const { error: errDoc } = await supabase.from("verification_documents").insert([
        { artisan_id: artisanId, type: "national_id", file_path: cheminRecto, status: "pending" },
        { artisan_id: artisanId, type: "national_id_back", file_path: cheminVerso, status: "pending" },
        { artisan_id: artisanId, type: "selfie", file_path: cheminSelfie, status: "pending" },
      ]);
      if (errDoc) throw new Error(errDoc.message);

      // 3. Remettre le dossier en file d'attente (fonction securisee).
      const { error: errRpc } = await supabase.rpc("fixci_renvoyer_dossier");
      if (errRpc) throw new Error(errRpc.message);

      setFait(true);
      router.refresh();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Envoi impossible. Reessayez.");
    } finally {
      setEnvoi(false);
    }
  }

  if (fait) {
    return (
      <p
        className="rounded-xl px-3 py-3 text-sm"
        style={{ background: "rgba(76,140,90,0.12)", color: "var(--color-vert)" }}
      >
        Dossier renvoye. Notre equipe va le reexaminer.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4 text-left">
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

      {erreur && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{erreur}</p>
      )}

      <button
        type="button"
        onClick={renvoyer}
        disabled={envoi}
        className="w-full rounded-xl py-3 text-sm font-semibold text-white disabled:opacity-50"
        style={{ backgroundColor: "var(--color-orange)" }}
      >
        {envoi ? "Envoi en cours..." : "Renvoyer mon dossier"}
      </button>
    </div>
  );
}