// >>> EMPLACEMENT : src/app/client/artisans/liste-artisans.tsx
"use client";

// =========================================================================
// Liste interactive des artisans : filtre (metier, commune), tri, et cartes.
//   - Filtrage et tri faits en memoire (les donnees viennent deja du serveur).
//   - Chaque carte est cliquable et mene au profil de l'artisan.
// =========================================================================

import { useState } from "react";
import Link from "next/link";
import { IconeCheck, IconeLieu } from "@/components/icones";

// ===== Types (memes formes que cote serveur) =====
type Metier = { slug: string; name: string };
type Commune = { id: string; name: string };
type ArtisanCarte = {
  id: string;
  nom: string;
  note: number;
  nbAvis: number;
  prixMin: number | null;
  metiers: string[];
  metierSlugs: string[];
  communes: string[];
  communeIds: string[];
};

// ===== Initiales a partir du nom (ex : "Konan Kouassi" -> "KK") =====
function initiales(nom: string) {
  const mots = nom.trim().split(/\s+/).filter(Boolean);
  return mots.slice(0, 2).map((m) => m[0] ?? "").join("").toUpperCase() || "?";
}

// ===== Prix lisible (10000 -> "10 000 FCFA") =====
function prixLisible(p: number) {
  return p.toLocaleString("fr-FR") + " FCFA";
}

export function ListeArtisans({
  artisans,
  metiers,
  communes,
}: {
  artisans: ArtisanCarte[];
  metiers: Metier[];
  communes: Commune[];
}) {
  // ===== Etat des filtres / tri =====
  const [metier, setMetier] = useState("");
  const [commune, setCommune] = useState("");
  const [tri, setTri] = useState("note");

  // ===== Application du filtre =====
  let liste = artisans.filter(
    (a) =>
      (!metier || a.metierSlugs.includes(metier)) &&
      (!commune || a.communeIds.includes(commune))
  );

  // ===== Application du tri =====
  liste = [...liste].sort((a, b) => {
    if (tri === "prix") {
      const pa = a.prixMin ?? Number.POSITIVE_INFINITY;
      const pb = b.prixMin ?? Number.POSITIVE_INFINITY;
      return pa - pb;
    }
    return b.note - a.note; // "Mieux notes" par defaut
  });

  return (
    <div className="flex flex-col gap-4">
      {/* ===== Barre de filtres ===== */}
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          {/* Filtre metier */}
          <select className="champ" value={metier} onChange={(e) => setMetier(e.target.value)}>
            <option value="">Tous les metiers</option>
            {metiers.map((m) => (
              <option key={m.slug} value={m.slug}>
                {m.name}
              </option>
            ))}
          </select>
          {/* Filtre commune */}
          <select className="champ" value={commune} onChange={(e) => setCommune(e.target.value)}>
            <option value="">Toutes les communes</option>
            {communes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        {/* Tri */}
        <select className="champ" value={tri} onChange={(e) => setTri(e.target.value)}>
          <option value="note">Tri : mieux notes</option>
          <option value="prix">Tri : moins cher</option>
        </select>
      </div>

      {/* ===== Resultats ===== */}
      {liste.length === 0 ? (
        <p className="pt-6 text-center text-sm" style={{ color: "var(--color-texte2)" }}>
          Aucun artisan ne correspond a ces criteres.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {liste.map((a) => (
          <Link
            key={a.id}
            href={`/client/artisans/profil?id=${a.id}`}
            className="flex flex-col gap-2 rounded-xl border p-4"
            style={{ background: "var(--color-carte)", borderColor: "var(--color-bordure)" }}
          >
            {/* Ligne haut : initiales + nom/metiers + note */}
            <div className="flex items-start gap-3">
              {/* Pastille d'initiales */}
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-base font-semibold text-white"
                style={{ background: "var(--color-orange)" }}
              >
                {initiales(a.nom)}
              </div>

              <div className="flex flex-1 flex-col">
                {/* Nom + badge verifie */}
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold" style={{ color: "var(--color-texte)" }}>
                    {a.nom}
                  </span>
                  <span
                    className="flex items-center gap-0.5 text-xs"
                    style={{ color: "var(--color-vert)" }}
                  >
                    <IconeCheck taille={14} />
                    Verifie
                  </span>
                </div>
                {/* Metiers */}
                {a.metiers.length > 0 && (
                  <span className="text-xs" style={{ color: "var(--color-texte2)" }}>
                    {a.metiers.join(", ")}
                  </span>
                )}
              </div>

              {/* Note */}
              <div className="shrink-0 text-right">
                {a.nbAvis > 0 ? (
                  <span className="text-sm" style={{ color: "var(--color-texte)" }}>
                    {a.note.toFixed(1)}{" "}
                    <span style={{ color: "var(--color-or)" }}>★</span>
                    <span className="block text-xs" style={{ color: "var(--color-texte2)" }}>
                      {a.nbAvis} avis
                    </span>
                  </span>
                ) : (
                  <span
                    className="rounded-full px-2 py-0.5 text-xs"
                    style={{ background: "var(--color-secondaire)", color: "var(--color-texte2)" }}
                  >
                    Nouveau
                  </span>
                )}
              </div>
            </div>

            {/* Communes */}
            {a.communes.length > 0 && (
              <span
                className="flex items-center gap-1 text-xs"
                style={{ color: "var(--color-texte2)" }}
              >
                <IconeLieu taille={14} />
                {a.communes.join(", ")}
              </span>
            )}

            {/* Prix */}
            {a.prixMin != null && (
              <span className="text-xs" style={{ color: "var(--color-texte)" }}>
                A partir de {prixLisible(a.prixMin)}
              </span>
            )}

            {/* Invite a voir le profil */}
            <span className="text-sm font-semibold" style={{ color: "var(--color-orange)" }}>
              Voir le profil
            </span>
          </Link>
          ))}
        </div>
      )}

      {/* ===== Style local des menus ===== */}
      <style>{`
        .champ {
          width: 100%;
          border: 1px solid var(--color-bordure);
          border-radius: 12px;
          background: var(--color-fond);
          padding: 0.6rem 0.8rem;
          font-size: 0.9rem;
          outline: none;
          color: var(--color-texte);
        }
        .champ:focus { border-color: var(--color-orange); }
      `}</style>
    </div>
  );
}