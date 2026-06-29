// >>> EMPLACEMENT : src/components/nav-artisan.tsx
"use client";

// =========================================================================
// Barre de navigation du bas, commune a tous les ecrans de l'espace artisan.
//   - 4 onglets : Tableau / Demandes / Avis / Profil
//   - Icones SVG sobres (pas d'emoji). L'onglet actif est en orange.
// =========================================================================

import { useRouter, usePathname } from "next/navigation";
import {
  IconeTableau,
  IconeDemandes,
  IconeAvis,
  IconeMessage,
  IconeProfil,
} from "@/components/icones";

// ===== Definition des onglets (libelle, icone, chemin) =====
const ONGLETS = [
  { cle: "tableau", libelle: "Tableau", Icone: IconeTableau, chemin: "/artisan" },
  { cle: "demandes", libelle: "Demandes", Icone: IconeDemandes, chemin: "/artisan/demandes" },
  { cle: "messages", libelle: "Messages", Icone: IconeMessage, chemin: "/artisan/messages" },
  { cle: "avis", libelle: "Avis", Icone: IconeAvis, chemin: "/artisan/avis" },
  { cle: "profil", libelle: "Profil", Icone: IconeProfil, chemin: "/artisan/profil" },
];

export function NavArtisan() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-10 mx-auto flex max-w-md justify-around border-t border-bordure bg-carte px-2 py-2"
      style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
    >
      {ONGLETS.map(({ cle, libelle, Icone, chemin }) => {
        // Onglet actif si le chemin courant correspond exactement.
        const actif = pathname === chemin;
        return (
          <button
            key={cle}
            type="button"
            onClick={() => router.push(chemin)}
            className="flex flex-1 flex-col items-center gap-1 py-1 text-xs"
            style={{ color: actif ? "var(--color-orange)" : "var(--color-texte2)" }}
          >
            <Icone taille={22} />
            <span style={{ fontWeight: actif ? 600 : 400 }}>{libelle}</span>
          </button>
        );
      })}
    </nav>
  );
}