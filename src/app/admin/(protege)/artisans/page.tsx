// >>> EMPLACEMENT : src/app/admin/(protege)/artisans/page.tsx
// =========================================================================
// Liste de tous les artisans (admin), avec leur statut et leur note.
// Composant serveur : lecture des donnees cote serveur.
// =========================================================================

import { createClient } from "@/lib/supabase/server";

// ===== Libelle lisible pour chaque statut =====
const LIBELLE_STATUT: Record<string, string> = {
  pending: "En attente",
  verified: "Verifie",
  rejected: "Refuse",
  suspended: "Suspendu",
};

// ===== Couleur associee a chaque statut =====
const COULEUR_STATUT: Record<string, string> = {
  pending: "var(--color-orange)",
  verified: "var(--color-vert)",
  rejected: "#C0392B",
  suspended: "#6B6860",
};

export default async function AdminArtisans() {
  const supabase = await createClient();

  // ===== Recuperer tous les artisans + nom/telephone du profil =====
  const { data: artisans } = await supabase
    .from("artisans")
    .select("id, status, average_rating, review_count, member_since, profiles ( name, phone )")
    .order("member_since", { ascending: false });

  return (
    <div>
      <h1 className="mb-1 text-2xl">Artisans</h1>
      <p className="mb-6 text-sm text-texte2">
        Tous les artisans inscrits sur la plateforme.
      </p>

      {(artisans ?? []).length === 0 ? (
        <div className="rounded-2xl border border-bordure bg-carte p-10 text-center">
          <p className="text-texte2">Aucun artisan inscrit pour le moment.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-bordure bg-carte">
          {/* En-tete (visible sur grand ecran) */}
          <div className="hidden grid-cols-4 gap-4 border-b border-bordure px-5 py-3 text-xs font-medium uppercase tracking-wide text-texte2 sm:grid">
            <span>Nom</span>
            <span>Telephone</span>
            <span>Note</span>
            <span>Statut</span>
          </div>
          {/* Lignes */}
          {(artisans ?? []).map((a) => {
            // profiles peut etre un objet ou un tableau selon la jointure.
            const profil = Array.isArray(a.profiles) ? a.profiles[0] : a.profiles;
            const nom = profil?.name ?? "Sans nom";
            const tel = profil?.phone ?? "—";
            return (
              <div
                key={a.id}
                className="grid grid-cols-2 gap-2 border-b border-bordure px-5 py-4 text-sm last:border-0 sm:grid-cols-4 sm:gap-4"
              >
                <span className="font-medium">{nom}</span>
                <span className="text-texte2">{tel}</span>
                <span>
                  {a.review_count > 0 ? `${Number(a.average_rating).toFixed(1)} ★` : "—"}
                </span>
                <span>
                  <span
                    className="inline-block rounded-full px-2.5 py-0.5 text-xs text-white"
                    style={{ backgroundColor: COULEUR_STATUT[a.status] ?? "#6B6860" }}
                  >
                    {LIBELLE_STATUT[a.status] ?? a.status}
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}