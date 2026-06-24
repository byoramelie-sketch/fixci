// >>> EMPLACEMENT : src/app/client/demander/page.tsx
// =========================================================================
// Etape 1 du parcours "Demander" : choix du service (metier).
//   - Lit les metiers actifs depuis la table `trades` (tries par sort_order).
//   - Les separe en "Services urgents" (is_urgent) et "Tous les services".
//   - Chaque metier est une carte (icone SVG + nom) menant a l'etape 2.
// C'est un onglet principal -> pas de fleche retour, la barre de navigation
// du bas suffit. Server Component : les donnees sont lues cote serveur.
// =========================================================================

import type { ComponentType } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  IconeOutils,
  IconeEclair,
  IconeFlocon,
  IconePinceau,
  IconeCle,
  IconeMenage,
  IconeFeuille,
  IconeCamion,
  IconeMeuble,
} from "@/components/icones";

// ===== Type d'un metier (les colonnes qu'on lit) =====
type Metier = {
  id: string;
  name: string;
  slug: string;
  is_urgent: boolean;
};

// ===== Association slug du metier -> icone SVG =====
// (la colonne `icon` de la table est vide ; on choisit l'icone ici)
const ICONES_METIER: Record<string, ComponentType<{ taille?: number; className?: string }>> = {
  plomberie: IconeOutils,
  electricite: IconeEclair,
  climatisation: IconeFlocon,
  peinture: IconePinceau,
  serrurerie: IconeCle,
  menage: IconeMenage,
  jardinage: IconeFeuille,
  demenagement: IconeCamion,
  "montage-meubles": IconeMeuble,
};

// ===== Carte d'un metier (icone + nom), cliquable vers l'etape 2 =====
function CarteMetier({ metier }: { metier: Metier }) {
  // Icone associee au slug, avec une icone par defaut au cas ou.
  const Icone = ICONES_METIER[metier.slug] ?? IconeOutils;
  return (
    <Link
      href={`/client/demander/${metier.slug}`}
      className="flex flex-col items-center justify-center gap-2 rounded-xl border p-4 text-center"
      style={{ background: "var(--color-carte)", borderColor: "var(--color-bordure)" }}
    >
      <span style={{ color: "var(--color-orange)" }}>
        <Icone taille={28} />
      </span>
      <span className="text-sm font-medium" style={{ color: "var(--color-texte)" }}>
        {metier.name}
      </span>
    </Link>
  );
}

export default async function ChoixDuService() {
  // ===== Lecture des metiers actifs, tries par ordre d'affichage =====
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("trades")
    .select("id, name, slug, is_urgent")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  // ===== Cas d'erreur de lecture =====
  if (error) {
    return (
      <p className="pt-10 text-center text-sm" style={{ color: "var(--color-texte2)" }}>
        Impossible de charger les services pour le moment.
      </p>
    );
  }

  // ===== Separation urgents / autres =====
  const metiers = (data ?? []) as Metier[];
  const urgents = metiers.filter((m) => m.is_urgent);
  const autres = metiers.filter((m) => !m.is_urgent);

  return (
    <div className="flex flex-col gap-5">
      {/* ===== Titre de l'ecran ===== */}
      <h1 className="text-xl" style={{ color: "var(--color-texte)" }}>
        Choisissez un service
      </h1>

      {/* ===== Services urgents ===== */}
      {urgents.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-or)" }}>
            Services urgents
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {urgents.map((m) => (
              <CarteMetier key={m.id} metier={m} />
            ))}
          </div>
        </section>
      )}

      {/* ===== Tous les services ===== */}
      {autres.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-or)" }}>
            Tous les services
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {autres.map((m) => (
              <CarteMetier key={m.id} metier={m} />
            ))}
          </div>
        </section>
      )}

      {/* ===== Cas base vide ===== */}
      {metiers.length === 0 && (
        <p className="pt-6 text-center text-sm" style={{ color: "var(--color-texte2)" }}>
          Aucun service disponible pour le moment.
        </p>
      )}
    </div>
  );
}