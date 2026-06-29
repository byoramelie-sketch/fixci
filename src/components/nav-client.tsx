// >>> EMPLACEMENT : src/components/nav-client.tsx
"use client";

// =========================================================================
// Barre de navigation du bas, commune a tous les ecrans de l'espace client.
//   - 4 onglets : Accueil / Demander / Mes demandes / Profil
//   - Icones SVG sobres (pas d'emoji). L'onglet actif est en orange.
//   - Calquee sur NavArtisan pour rester coherent dans toute l'app.
// =========================================================================

import { useRouter, usePathname } from "next/navigation";
import {
  IconeAccueil,
  IconeOutils,
  IconeDemandes,
  IconeMessage,
  IconeProfil,
} from "@/components/icones";

// ===== Definition des onglets (libelle, icone, chemin) =====
const ONGLETS = [
  { cle: "accueil", libelle: "Accueil", Icone: IconeAccueil, chemin: "/client" },
  { cle: "demander", libelle: "Demander", Icone: IconeOutils, chemin: "/client/demander" },
  { cle: "demandes", libelle: "Demandes", Icone: IconeDemandes, chemin: "/client/mes-demandes" },
  { cle: "messages", libelle: "Messages", Icone: IconeMessage, chemin: "/client/messages" },
  { cle: "profil", libelle: "Profil", Icone: IconeProfil, chemin: "/client/profil" },
];

export function NavClient() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-10 mx-auto flex max-w-md justify-around border-t border-bordure bg-carte px-2 py-2"
      style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
    >
      {ONGLETS.map(({ cle, libelle, Icone, chemin }) => {
        // Onglet actif : correspondance exacte pour l'accueil, sinon le chemin
        // courant commence par celui de l'onglet (pour gerer les sous-pages).
        const actif =
          chemin === "/client" ? pathname === "/client" : pathname.startsWith(chemin);
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