// >>> EMPLACEMENT : src/app/artisan/verification/renvoyer.tsx
"use client";

// =========================================================================
// Renvoyer son dossier apres un refus.
//   - L'artisan choisit une nouvelle photo de sa piece d'identite.
//   - Le fichier remplace l'ancien dans le coffre (bucket prive).
//   - La fonction fixci_renvoyer_dossier remet le dossier en file d'attente
//     (elle verifie que le dossier est bien au statut "refuse").
// =========================================================================

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function RenvoyerDossier({ artisanId }: { artisanId: string }) {
  const router = useRouter();
  const supabase = createClient();

  const [fichier, setFichier] = useState<File | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState(false);

  async function renvoyer() {
    if (!fichier) {
      setErreur("Choisissez une photo de votre piece d'identite.");
      return;
    }
    setEnvoi(true);
    setErreur(null);
    try {
      // 1. Remplacer la piece d'identite dans le coffre.
      const ext = fichier.name.split(".").pop() ?? "jpg";
      const chemin = `${artisanId}/cni.${ext}`;
      const { error: errUpload } = await supabase.storage
        .from("national-id-documents")
        .upload(chemin, fichier, { upsert: true });
      if (errUpload) throw new Error(errUpload.message);

      // 2. Enregistrer le document (on remplace l'ancienne ligne).
      await supabase
        .from("verification_documents")
        .delete()
        .eq("artisan_id", artisanId)
        .eq("type", "national_id");
      const { error: errDoc } = await supabase.from("verification_documents").insert({
        artisan_id: artisanId,
        type: "national_id",
        file_path: chemin,
        status: "pending",
      });
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
    <div className="text-left">
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium" style={{ color: "var(--color-texte)" }}>
          Nouvelle photo de votre piece d&apos;identite
        </span>
        <input
          className="w-full rounded-xl border px-3 py-2.5 text-sm"
          style={{ borderColor: "var(--color-bordure)", background: "var(--color-fond)" }}
          type="file"
          accept="image/*,.pdf"
          onChange={(e) => {
            setFichier(e.target.files?.[0] ?? null);
            if (erreur) setErreur(null);
          }}
        />
      </label>
      <p className="mt-1.5 text-xs" style={{ color: "var(--color-texte2)" }}>
        Photo nette, bien eclairee, les 4 coins visibles.
      </p>

      {erreur && (
        <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{erreur}</p>
      )}

      <button
        type="button"
        onClick={renvoyer}
        disabled={envoi}
        className="mt-3 w-full rounded-xl py-3 text-sm font-semibold text-white disabled:opacity-50"
        style={{ backgroundColor: "var(--color-orange)" }}
      >
        {envoi ? "Envoi en cours..." : "Renvoyer mon dossier"}
      </button>
    </div>
  );
}