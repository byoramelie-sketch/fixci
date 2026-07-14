// >>> EMPLACEMENT : src/components/nav-artisan.tsx
"use client";

// =========================================================================
// Barre de navigation du bas, commune a tous les ecrans de l'espace artisan.
//   - 6 onglets : Tableau / Demandes / Messages / Commissions / Avis / Profil
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

// ===== Icone "Commissions" (billet de banque), definie ici pour ne pas
// toucher au fichier des icones partagees. Meme signature que les autres. =====
function IconeCommission({ taille = 24 }: { taille?: number }) {
  return (
    <svg
      width={taille}
      height={taille}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M6 12h.01M18 12h.01" />
    </svg>
  );
}

// ===== Definition des onglets (libelle, icone, chemin) =====
const ONGLETS = [
  { cle: "tableau", libelle: "Tableau", Icone: IconeTableau, chemin: "/artisan" },
  { cle: "demandes", libelle: "Demandes", Icone: IconeDemandes, chemin: "/artisan/demandes" },
  { cle: "messages", libelle: "Messages", Icone: IconeMessage, chemin: "/artisan/messages" },
  { cle: "commissions", libelle: "Commissions", Icone: IconeCommission, chemin: "/artisan/commissions" },
  { cle: "avis", libelle: "Avis", Icone: IconeAvis, chemin: "/artisan/avis" },
  { cle: "profil", libelle: "Profil", Icone: IconeProfil, chemin: "/artisan/profil" },
];

export function NavArtisan() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-10 mx-auto flex max-w-md justify-around border-t border-bordure bg-carte px-1 py-2"
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
            className="flex flex-1 flex-col items-center gap-0.5 py-1"
            style={{ color: actif ? "var(--color-orange)" : "var(--color-texte2)" }}
          >
            <Icone taille={20} />
            <span className="text-[10px] leading-tight" style={{ fontWeight: actif ? 600 : 400 }}>
              {libelle}
            </span>
          </button>
        );
      })}
    </nav>
  );
}