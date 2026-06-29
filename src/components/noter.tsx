// >>> EMPLACEMENT : src/components/noter.tsx
"use client";

// =========================================================================
// Widget de notation reutilisable (client -> artisan ET artisan -> client).
// Etoiles 1 a 5 + tags rapides (facultatifs) + commentaire (facultatif).
// Appelle la fonction securisee fixci_noter (qui verifie tout cote base).
// =========================================================================

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

function Etoile({ pleine, onClick }: { pleine: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label="Donner une note" className="p-0.5">
      <svg
        width="30"
        height="30"
        viewBox="0 0 24 24"
        fill={pleine ? "var(--color-or)" : "none"}
        stroke={pleine ? "var(--color-or)" : "var(--color-bordure)"}
        strokeWidth="1.5"
        strokeLinejoin="round"
      >
        <path d="M12 2.5l2.9 5.9 6.5.95-4.7 4.6 1.1 6.45L12 17.9l-5.8 3.05 1.1-6.45-4.7-4.6 6.5-.95z" />
      </svg>
    </button>
  );
}

export function Noter({
  jobId,
  cible,
  tagsProposes,
  onDone,
}: {
  jobId: string;
  cible: string; // ex. "l'artisan" / "le client"
  tagsProposes: string[];
  onDone?: () => void;
}) {
  const supabase = createClient();
  const [note, setNote] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  const [commentaire, setCommentaire] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState(false);

  function basculerTag(t: string) {
    setTags((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]));
  }

  async function envoyer() {
    if (note < 1 || envoi) return;
    setEnvoi(true);
    setErreur(null);
    try {
      const { error } = await supabase.rpc("fixci_noter", {
        p_job_id: jobId,
        p_rating: note,
        p_comment: commentaire,
        p_tags: tags,
      });
      if (error) throw new Error(error.message);
      setFait(true);
      onDone?.();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Impossible d'envoyer l'avis.");
    } finally {
      setEnvoi(false);
    }
  }

  if (fait) {
    return (
      <p
        className="rounded-xl border p-3 text-center text-sm font-medium"
        style={{ borderColor: "var(--color-vert)", color: "var(--color-vert)", background: "rgba(76,140,90,0.08)" }}
      >
        Merci pour votre avis !
      </p>
    );
  }

  return (
    <div
      className="flex flex-col gap-3 rounded-xl border p-4"
      style={{ background: "var(--color-carte)", borderColor: "var(--color-bordure)" }}
    >
      <span className="text-sm font-semibold" style={{ color: "var(--color-texte)" }}>
        Noter {cible}
      </span>

      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <Etoile key={n} pleine={n <= note} onClick={() => setNote(n)} />
        ))}
      </div>

      {tagsProposes.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tagsProposes.map((t) => {
            const actif = tags.includes(t);
            return (
              <button
                key={t}
                type="button"
                onClick={() => basculerTag(t)}
                className="rounded-full border px-3 py-1 text-xs"
                style={{
                  borderColor: actif ? "var(--color-orange)" : "var(--color-bordure)",
                  background: actif ? "var(--color-secondaire)" : "var(--color-carte)",
                  color: actif ? "var(--color-orange)" : "var(--color-texte2)",
                }}
              >
                {t}
              </button>
            );
          })}
        </div>
      )}

      <textarea
        value={commentaire}
        onChange={(e) => setCommentaire(e.target.value)}
        rows={2}
        placeholder="Un commentaire (facultatif)"
        className="resize-none rounded-xl border px-3 py-2 text-sm outline-none"
        style={{ borderColor: "var(--color-bordure)", background: "var(--color-carte)", color: "var(--color-texte)" }}
      />

      {erreur && <p className="text-xs text-red-700">{erreur}</p>}

      <button
        type="button"
        onClick={envoyer}
        disabled={note < 1 || envoi}
        className="rounded-xl py-2.5 text-sm font-semibold text-white disabled:opacity-40"
        style={{ background: "var(--color-orange)" }}
      >
        Publier mon avis
      </button>
    </div>
  );
}
