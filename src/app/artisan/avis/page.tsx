// >>> EMPLACEMENT : src/app/artisan/avis/page.tsx
"use client";

// =========================================================================
// Onglet "Avis" cote artisan : sa note moyenne + la liste des avis recus
// (laisses par les clients apres une intervention validee).
// Onglet principal -> barre de navigation du bas (NavArtisan).
// =========================================================================

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { FiletTricolore } from "@/components/ui";
import { NavArtisan } from "@/components/nav-artisan";

type Avis = {
  id: string;
  rating: number;
  comment: string | null;
  tags: string[];
  created_at: string;
  auteur: string;
};

function Etoiles({ note, taille = 16 }: { note: number; taille?: number }) {
  return (
    <span className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => {
        const pleine = n <= Math.round(note);
        return (
          <svg
            key={n}
            width={taille}
            height={taille}
            viewBox="0 0 24 24"
            fill={pleine ? "var(--color-or)" : "none"}
            stroke={pleine ? "var(--color-or)" : "var(--color-bordure)"}
            strokeWidth="1.5"
            strokeLinejoin="round"
          >
            <path d="M12 2.5l2.9 5.9 6.5.95-4.7 4.6 1.1 6.45L12 17.9l-5.8 3.05 1.1-6.45-4.7-4.6 6.5-.95z" />
          </svg>
        );
      })}
    </span>
  );
}

function dateLisible(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

export default function MesAvis() {
  const supabase = createClient();
  const [chargement, setChargement] = useState(true);
  const [moyenne, setMoyenne] = useState(0);
  const [nombre, setNombre] = useState(0);
  const [avis, setAvis] = useState<Avis[]>([]);

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        setChargement(false);
        return;
      }

      // Note moyenne + nombre d'avis (depuis la fiche artisan).
      const { data: fiche } = await supabase
        .from("artisans")
        .select("average_rating, review_count")
        .eq("id", auth.user.id)
        .maybeSingle();
      if (fiche) {
        setMoyenne(Number(fiche.average_rating) || 0);
        setNombre(fiche.review_count || 0);
      }

      // Les avis recus (clients -> cet artisan), recents d'abord.
      const { data: rows } = await supabase
        .from("reviews")
        .select("id, rating, comment, tags, created_at, author_id")
        .eq("target_id", auth.user.id)
        .eq("direction", "client_to_artisan")
        .order("created_at", { ascending: false });
      const liste = (rows ?? []) as {
        id: string;
        rating: number;
        comment: string | null;
        tags: string[];
        created_at: string;
        author_id: string;
      }[];

      // Noms des auteurs.
      const ids = [...new Set(liste.map((r) => r.author_id))];
      const noms: Record<string, string> = {};
      if (ids.length) {
        const { data: profs } = await supabase.from("profiles").select("id, name").in("id", ids);
        (profs ?? []).forEach((p: { id: string; name: string }) => {
          noms[p.id] = p.name ?? "Client";
        });
      }

      setAvis(
        liste.map((r) => ({
          id: r.id,
          rating: r.rating,
          comment: r.comment,
          tags: r.tags ?? [],
          created_at: r.created_at,
          auteur: noms[r.author_id] ?? "Client",
        }))
      );
      setChargement(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-fond pb-24">
      <FiletTricolore />
      <div className="mx-auto max-w-md px-5 py-6">
        <h1 className="mb-5 text-xl" style={{ color: "var(--color-texte)" }}>
          Mes avis
        </h1>

        {chargement ? (
          <p className="pt-8 text-center text-sm" style={{ color: "var(--color-texte2)" }}>
            Chargement...
          </p>
        ) : (
          <>
            {/* Resume de la note */}
            <div
              className="mb-5 flex items-center gap-4 rounded-2xl border p-4"
              style={{ background: "var(--color-carte)", borderColor: "var(--color-bordure)" }}
            >
              <span className="text-3xl font-bold" style={{ fontFamily: "var(--font-titre)", color: "var(--color-texte)" }}>
                {nombre > 0 ? moyenne.toFixed(1) : "—"}
              </span>
              <span className="flex flex-col">
                <Etoiles note={moyenne} taille={18} />
                <span className="mt-1 text-xs" style={{ color: "var(--color-texte2)" }}>
                  {nombre > 0 ? `${nombre} avis` : "Aucun avis pour le moment"}
                </span>
              </span>
            </div>

            {/* Liste des avis */}
            {avis.length === 0 ? (
              <p
                className="rounded-xl border border-dashed p-5 text-center text-sm"
                style={{ borderColor: "var(--color-bordure)", color: "var(--color-texte2)" }}
              >
                Vos avis apparaîtront ici après vos premières interventions validees.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {avis.map((a) => (
                  <div
                    key={a.id}
                    className="rounded-xl border p-4"
                    style={{ background: "var(--color-carte)", borderColor: "var(--color-bordure)" }}
                  >
                    <div className="flex items-center justify-between">
                      <Etoiles note={a.rating} />
                      <span className="text-xs" style={{ color: "var(--color-texte2)" }}>
                        {dateLisible(a.created_at)}
                      </span>
                    </div>
                    {a.comment && (
                      <p className="mt-2 text-sm" style={{ color: "var(--color-texte)" }}>
                        {a.comment}
                      </p>
                    )}
                    {a.tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {a.tags.map((t) => (
                          <span
                            key={t}
                            className="rounded-full px-2.5 py-0.5 text-xs"
                            style={{ background: "var(--color-secondaire)", color: "var(--color-texte2)" }}
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                    <p className="mt-2 text-xs" style={{ color: "var(--color-texte2)" }}>
                      — {a.auteur}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      <NavArtisan />
    </div>
  );
}