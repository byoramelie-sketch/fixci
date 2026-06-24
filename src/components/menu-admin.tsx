// >>> EMPLACEMENT : src/components/menu-admin.tsx
"use client";

// =========================================================================
// Menu lateral de l'espace admin.
//   - Desktop : barre laterale fixe a gauche.
//   - Mobile  : bouton "menu" qui ouvre un panneau lateral, ferme par une croix.
//   - Icones SVG sobres, liens complets, deconnexion.
// =========================================================================

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/ui";
import {
  IconeTableau,
  IconeCheck,
  IconeArtisans,
  IconeDemandes,
  IconeAlerte,
  IconeParametres,
  IconeDeconnexion,
  IconeMenu,
  IconeFermer,
} from "@/components/icones";

// ===== Liens du menu (libelle, chemin, icone) =====
const LIENS = [
  { href: "/admin", label: "Tableau de bord", Icone: IconeTableau },
  { href: "/admin/verifications", label: "Verifications", Icone: IconeCheck },
  { href: "/admin/artisans", label: "Artisans", Icone: IconeArtisans },
  { href: "/admin/demandes", label: "Demandes", Icone: IconeDemandes },
  { href: "/admin/litiges", label: "Avis & litiges", Icone: IconeAlerte },
  { href: "/admin/parametres", label: "Parametres", Icone: IconeParametres },
];

export function MenuAdmin() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  // Etat d'ouverture du menu sur mobile.
  const [ouvert, setOuvert] = useState(false);

  // ===== Deconnexion =====
  async function seDeconnecter() {
    await supabase.auth.signOut();
    router.push("/admin/connexion");
  }

  // ===== Contenu du menu (partage entre desktop et mobile) =====
  const contenu = (
    <>
      <div className="mb-8 px-2 pt-2">
        <Logo />
        <p className="mt-1 text-xs text-texte2">Administration</p>
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {LIENS.map(({ href, label, Icone }) => {
          const actif = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setOuvert(false)}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition"
              style={{
                backgroundColor: actif ? "var(--color-orange)" : "transparent",
                color: actif ? "#fff" : "var(--color-texte)",
              }}
            >
              <Icone taille={20} />
              {label}
            </Link>
          );
        })}
      </nav>

      <button
        onClick={seDeconnecter}
        className="mt-4 flex items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-texte2 transition hover:bg-secondaire"
      >
        <IconeDeconnexion taille={20} />
        Se deconnecter
      </button>
    </>
  );

  return (
    <>
      {/* ===== Barre du haut sur mobile (avec bouton menu) ===== */}
      <div className="flex items-center justify-between border-b border-bordure bg-carte px-4 py-3 md:hidden">
        <Logo />
        <button type="button" onClick={() => setOuvert(true)} aria-label="Ouvrir le menu">
          <IconeMenu taille={24} />
        </button>
      </div>

      {/* ===== Menu lateral fixe (desktop) ===== */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-bordure bg-carte p-4 md:flex">
        {contenu}
      </aside>

      {/* ===== Panneau lateral (mobile, quand ouvert) ===== */}
      {ouvert && (
        <div className="fixed inset-0 z-30 md:hidden">
          {/* Fond sombre cliquable pour fermer */}
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setOuvert(false)}
          />
          {/* Le panneau lui-meme */}
          <aside className="absolute left-0 top-0 flex h-full w-64 flex-col bg-carte p-4 shadow-xl">
            <button
              type="button"
              onClick={() => setOuvert(false)}
              aria-label="Fermer le menu"
              className="mb-2 self-end"
            >
              <IconeFermer taille={24} />
            </button>
            {contenu}
          </aside>
        </div>
      )}
    </>
  );
}