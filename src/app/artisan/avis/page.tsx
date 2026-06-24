// >>> EMPLACEMENT : src/app/artisan/avis/page.tsx
"use client";

// =========================================================================
// Avis recus par l'artisan (direction = client_to_artisan).
//   - Note moyenne + total
//   - Repartition par nombre d'etoiles (barres)
//   - Liste des avis (auteur, note, commentaire, date)
//   - Barre de navigation en bas
// =========================================================================

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { FiletTricolore } from "@/components/ui";
import { NavArtisan } from "@/components/nav-artisan";
import { BoutonRetour } from "@/components/icones";

// ===== Type d'un avis affiche =====
type Avis = {
  id: string;
  auteur: string;
  note: number;
  commentaire: string | null;
  date: string;
};

export default function AvisArtisan() {
  const router = useRouter();
  const supabase = createClient();
  const [chargement, setChargement] = useState(true);
  const [avis, setAvis] = useState<Avis[]>([]);
  const [moyenne, setMoyenne] = useState(0);

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) {
        router.push("/connexion");
        return;
      }

      // Avis recus : target_id = l'artisan, direction = client_to_artisan.
      const { data } = await supabase
        .from("reviews")
        .select("id, author_id, rating, comment, created_at")
        .eq("target_id", uid)
        .eq("direction", "client_to_artisan")
        .order("created_at", { ascending: false });

      const lignes = data ?? [];

      // Recuperer les noms des auteurs en une fois.
      const idsAuteurs = [...new Set(lignes.map((l) => l.author_id))];
      const noms: Record<string, string> = {};
      if (idsAuteurs.length > 0) {
        const { data: profils } = await supabase
          .from("profiles").select("id, name").in("id", idsAuteurs);
        (profils ?? []).forEach((p) => { noms[p.id] = p.name; });
      }

      const mis = lignes.map((l) => ({
        id: l.id,
        auteur: noms[l.author_id] ?? "Client",
        note: l.rating,
        commentaire: l.comment,
        date: l.created_at,
      }));
      setAvis(mis);

      // Moyenne.
      if (mis.length > 0) {
        setMoyenne(mis.reduce((s, a) => s + a.note, 0) / mis.length);
      }
      setChargement(false);
    })();
  }, [supabase, router]);

  // ===== Repartition par etoiles (5 -> 1) =====
  function repartition(): { etoiles: number; pourcent: number }[] {
    const total = avis.length;
    return [5, 4, 3, 2, 1].map((e) => {
      const nb = avis.filter((a) => a.note === e).length;
      return { etoiles: e, pourcent: total > 0 ? Math.round((nb / total) * 100) : 0 };
    });
  }

  if (chargement) {
    return (
      <div className="min-h-screen bg-fond">
        <FiletTricolore />
        <div className="px-5 py-10 text-center text-texte2">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-fond pb-24">
      <FiletTricolore />
      <div className="mx-auto max-w-md px-5 py-6">
        <header className="mb-4 flex items-center gap-3">
          <BoutonRetour />
          <h1 className="text-2xl">Avis recus</h1>
        </header>

        {avis.length > 0 ? (
          <>
            {/* Note globale */}
            <div className="mb-5 rounded-2xl border border-bordure bg-carte p-5 text-center">
              <p className="text-4xl" style={{ fontFamily: "var(--font-titre)" }}>
                {moyenne.toFixed(1)}
              </p>
              <p className="mt-1" style={{ color: "var(--color-or)" }}>
                {"★".repeat(Math.round(moyenne))}{"☆".repeat(5 - Math.round(moyenne))}
              </p>
              <p className="mt-1 text-sm text-texte2">{avis.length} avis</p>
            </div>

            {/* Repartition */}
            <div className="mb-6 space-y-2 rounded-2xl border border-bordure bg-carte p-5">
              {repartition().map((r) => (
                <div key={r.etoiles} className="flex items-center gap-3">
                  <span className="w-8 text-sm text-texte2">{r.etoiles}★</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full" style={{ backgroundColor: "var(--color-secondaire)" }}>
                    <div className="h-full rounded-full" style={{ width: `${r.pourcent}%`, backgroundColor: "var(--color-or)" }} />
                  </div>
                  <span className="w-10 text-right text-sm text-texte2">{r.pourcent}%</span>
                </div>
              ))}
            </div>

            {/* Liste des avis */}
            <div className="space-y-3">
              {avis.map((a) => (
                <div key={a.id} className="rounded-2xl border border-bordure bg-carte p-4">
                  <div className="mb-1 flex items-center justify-between">
                    <p className="font-medium">{a.auteur}</p>
                    <span style={{ color: "var(--color-or)" }}>
                      {"★".repeat(a.note)}{"☆".repeat(5 - a.note)}
                    </span>
                  </div>
                  {a.commentaire && <p className="text-sm text-texte">{a.commentaire}</p>}
                  <p className="mt-1 text-xs text-texte2">
                    {new Date(a.date).toLocaleDateString("fr-FR")}
                  </p>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="rounded-2xl border border-dashed border-bordure bg-carte p-6 text-center">
            <p className="text-sm text-texte2">
              Vous n&apos;avez pas encore recu d&apos;avis. Ils apparaitront ici apres vos premieres interventions.
            </p>
          </div>
        )}
      </div>

      <NavArtisan />
    </div>
  );
}