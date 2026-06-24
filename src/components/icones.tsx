// >>> EMPLACEMENT : src/components/icones.tsx
"use client";

// =========================================================================
// Jeu d'icones SVG sobres (trait fin), pour remplacer les emojis.
// Chaque icone accepte une taille et hérite de la couleur du texte (currentColor),
// ce qui permet de la colorer via le style du parent.
// =========================================================================

import { useRouter } from "next/navigation";

// ===== Type commun a toutes les icones =====
type IconeProps = { taille?: number; className?: string };

// Reglages communs du trait.
const traits = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

// ===== Icone : tableau de bord (grille) =====
export function IconeTableau({ taille = 22, className }: IconeProps) {
  return (
    <svg width={taille} height={taille} viewBox="0 0 24 24" {...traits} className={className}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

// ===== Icone : demandes (document avec lignes) =====
export function IconeDemandes({ taille = 22, className }: IconeProps) {
  return (
    <svg width={taille} height={taille} viewBox="0 0 24 24" {...traits} className={className}>
      <path d="M6 2.5h9l5 5v14a0 0 0 0 1 0 0H6a0 0 0 0 1 0 0V2.5Z" />
      <path d="M14.5 2.5V8H20" />
      <path d="M8.5 13h7M8.5 17h7" />
    </svg>
  );
}

// ===== Icone : avis (etoile) =====
export function IconeAvis({ taille = 22, className }: IconeProps) {
  return (
    <svg width={taille} height={taille} viewBox="0 0 24 24" {...traits} className={className}>
      <path d="M12 3.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8L12 17.9 6.7 19.6l1-5.8-4.2-4.1 5.9-.9L12 3.5Z" />
    </svg>
  );
}

// ===== Icone : profil (personne) =====
export function IconeProfil({ taille = 22, className }: IconeProps) {
  return (
    <svg width={taille} height={taille} viewBox="0 0 24 24" {...traits} className={className}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-3.6 3.6-6 8-6s8 2.4 8 6" />
    </svg>
  );
}

// ===== Icone : localisation (epingle) =====
export function IconeLieu({ taille = 16, className }: IconeProps) {
  return (
    <svg width={taille} height={taille} viewBox="0 0 24 24" {...traits} className={className}>
      <path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

// ===== Icone : messagerie (bulle) =====
export function IconeMessage({ taille = 18, className }: IconeProps) {
  return (
    <svg width={taille} height={taille} viewBox="0 0 24 24" {...traits} className={className}>
      <path d="M4 5h16v11H9l-4 3.5V16H4V5Z" />
    </svg>
  );
}

// ===== Icone : fleche retour =====
export function IconeFleche({ taille = 22, className }: IconeProps) {
  return (
    <svg width={taille} height={taille} viewBox="0 0 24 24" {...traits} className={className}>
      <path d="M15 5l-7 7 7 7" />
    </svg>
  );
}

// ===== Icone : artisans (groupe / casque) =====
export function IconeArtisans({ taille = 22, className }: IconeProps) {
  return (
    <svg width={taille} height={taille} viewBox="0 0 24 24" {...traits} className={className}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5" />
      <path d="M16 8.5a3 3 0 0 1 0 5" />
      <path d="M18 19c0-2.2-1-3.8-2.5-4.6" />
    </svg>
  );
}

// ===== Icone : litiges / alerte =====
export function IconeAlerte({ taille = 22, className }: IconeProps) {
  return (
    <svg width={taille} height={taille} viewBox="0 0 24 24" {...traits} className={className}>
      <path d="M12 3.5l9 16H3l9-16Z" />
      <path d="M12 10v4" />
      <circle cx="12" cy="17" r="0.6" fill="currentColor" />
    </svg>
  );
}

// ===== Icone : parametres / engrenage =====
export function IconeParametres({ taille = 22, className }: IconeProps) {
  return (
    <svg width={taille} height={taille} viewBox="0 0 24 24" {...traits} className={className}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" />
    </svg>
  );
}

// ===== Icone : verifications / coche dans cercle =====
export function IconeCheck({ taille = 22, className }: IconeProps) {
  return (
    <svg width={taille} height={taille} viewBox="0 0 24 24" {...traits} className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.5l2.5 2.5L16 9.5" />
    </svg>
  );
}

// ===== Icone : deconnexion =====
export function IconeDeconnexion({ taille = 22, className }: IconeProps) {
  return (
    <svg width={taille} height={taille} viewBox="0 0 24 24" {...traits} className={className}>
      <path d="M15 4.5H6.5A1.5 1.5 0 0 0 5 6v12a1.5 1.5 0 0 0 1.5 1.5H15" />
      <path d="M18 12H10M18 12l-3-3M18 12l-3 3" />
    </svg>
  );
}

// ===== Icone : menu (3 traits) =====
export function IconeMenu({ taille = 24, className }: IconeProps) {
  return (
    <svg width={taille} height={taille} viewBox="0 0 24 24" {...traits} className={className}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

// ===== Icone : fermer (croix) =====
export function IconeFermer({ taille = 24, className }: IconeProps) {
  return (
    <svg width={taille} height={taille} viewBox="0 0 24 24" {...traits} className={className}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

// ===== Icone : accueil (maison) — onglet Accueil du client =====
export function IconeAccueil({ taille = 22, className }: IconeProps) {
  return (
    <svg width={taille} height={taille} viewBox="0 0 24 24" {...traits} className={className}>
      <path d="M3 11l9-7 9 7" />
      <path d="M5 9.5V20h14V9.5" />
      <path d="M10 20v-6h4v6" />
    </svg>
  );
}

// ===== Icone : recherche (loupe) — barre de recherche =====
export function IconeRecherche({ taille = 18, className }: IconeProps) {
  return (
    <svg width={taille} height={taille} viewBox="0 0 24 24" {...traits} className={className}>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  );
}

// ===== Icone : cloche (notifications) — en-tete =====
export function IconeCloche({ taille = 22, className }: IconeProps) {
  return (
    <svg width={taille} height={taille} viewBox="0 0 24 24" {...traits} className={className}>
      <path d="M5 16c1.2-1 1.5-2.5 1.5-5a5.5 5.5 0 0 1 11 0c0 2.5.3 4 1.5 5" />
      <path d="M4.5 16h15" />
      <path d="M10 19.5a2 2 0 0 0 4 0" />
    </svg>
  );
}

// ===== Icone : outils (cle a molette) — onglet Demander / plomberie =====
export function IconeOutils({ taille = 22, className }: IconeProps) {
  return (
    <svg width={taille} height={taille} viewBox="0 0 24 24" {...traits} className={className}>
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76Z" />
    </svg>
  );
}

// ===== Icone : crayon (decrire) — etape 1 de "comment ca marche" =====
export function IconeCrayon({ taille = 22, className }: IconeProps) {
  return (
    <svg width={taille} height={taille} viewBox="0 0 24 24" {...traits} className={className}>
      <path d="M4 20l4-1L19 8l-3-3L5 16l-1 4Z" />
      <path d="M14 7l3 3" />
    </svg>
  );
}

// ===== Icone metier : electricite (eclair) =====
export function IconeEclair({ taille = 22, className }: IconeProps) {
  return (
    <svg width={taille} height={taille} viewBox="0 0 24 24" {...traits} className={className}>
      <path d="M13 2 5 13h5l-1 9 8-12h-5l1-8Z" />
    </svg>
  );
}

// ===== Icone metier : climatisation (flocon) =====
export function IconeFlocon({ taille = 22, className }: IconeProps) {
  return (
    <svg width={taille} height={taille} viewBox="0 0 24 24" {...traits} className={className}>
      <path d="M12 3v18M4 7.5l16 9M20 7.5l-16 9" />
      <path d="M10 5l2-1.5L14 5M10 19l2 1.5 2-1.5" />
      <path d="M4.2 9.6 4 7.4 6.2 7.6M19.8 14.4 20 16.6 17.8 16.4M17.8 7.6 20 7.4 19.8 9.6M6.2 16.4 4 16.6 4.2 14.4" />
    </svg>
  );
}

// ===== Icone metier : peinture (rouleau) =====
export function IconePinceau({ taille = 22, className }: IconeProps) {
  return (
    <svg width={taille} height={taille} viewBox="0 0 24 24" {...traits} className={className}>
      <rect x="3.5" y="4" width="11" height="6" rx="1.5" />
      <path d="M14.5 7H19a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-6" />
      <path d="M13 12v2.5a1.5 1.5 0 0 1-1.5 1.5H10a1 1 0 0 0-1 1v2" />
      <rect x="7.5" y="19" width="3" height="2.5" rx="0.6" />
    </svg>
  );
}

// ===== Icone metier : serrurerie (cle) =====
export function IconeCle({ taille = 22, className }: IconeProps) {
  return (
    <svg width={taille} height={taille} viewBox="0 0 24 24" {...traits} className={className}>
      <circle cx="8" cy="8" r="4.5" />
      <path d="M11.2 11.2 20 20" />
      <path d="M17 17l2.2-2.2M19.5 19.5l1.5-1.5" />
    </svg>
  );
}

// ===== Icone metier : menage (etincelles) =====
export function IconeMenage({ taille = 22, className }: IconeProps) {
  return (
    <svg width={taille} height={taille} viewBox="0 0 24 24" {...traits} className={className}>
      <path d="M11 3l1.6 4.4L17 9l-4.4 1.6L11 15l-1.6-4.4L5 9l4.4-1.6L11 3Z" />
      <path d="M18 13l.8 2.2 2.2.8-2.2.8L18 19l-.8-2.2L15 16l2.2-.8L18 13Z" />
    </svg>
  );
}

// ===== Icone metier : jardinage (feuille) =====
export function IconeFeuille({ taille = 22, className }: IconeProps) {
  return (
    <svg width={taille} height={taille} viewBox="0 0 24 24" {...traits} className={className}>
      <path d="M4 20C4 11.7 10.7 5 19 5c1 0 1 0 1 1 0 8.3-6.7 15-15 15-1 0-1 0-1-1Z" />
      <path d="M4.5 19.5C8 16 12 13 17 11.5" />
    </svg>
  );
}

// ===== Icone metier : demenagement (camion) =====
export function IconeCamion({ taille = 22, className }: IconeProps) {
  return (
    <svg width={taille} height={taille} viewBox="0 0 24 24" {...traits} className={className}>
      <path d="M2.5 6.5h10v8h-10Z" />
      <path d="M12.5 9.5h3.5l3 3v2h-6.5Z" />
      <circle cx="6" cy="17" r="1.6" />
      <circle cx="16" cy="17" r="1.6" />
    </svg>
  );
}

// ===== Icone metier : montage de meubles (fauteuil) =====
export function IconeMeuble({ taille = 22, className }: IconeProps) {
  return (
    <svg width={taille} height={taille} viewBox="0 0 24 24" {...traits} className={className}>
      <path d="M5 11.5V8.5A2.5 2.5 0 0 1 7.5 6h9A2.5 2.5 0 0 1 19 8.5v3" />
      <path d="M5 11.5A2 2 0 0 0 3.5 13.4V17h17v-3.6A2 2 0 0 0 19 11.5" />
      <path d="M6 17v2.5M18 17v2.5" />
      <path d="M6.5 11.5h11" />
    </svg>
  );
}

// ===== Bouton de retour (revient a l'ecran precedent) =====
// On l'utilise en haut a gauche des ecrans enfants. Il appelle router.back(),
// qui ramene a la page d'avant, quelle qu'elle soit.
export function BoutonRetour({ libelle }: { libelle?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.back()}
      aria-label="Retour"
      className="flex items-center gap-1 text-texte"
    >
      <IconeFleche taille={22} />
      {libelle && <span className="text-sm">{libelle}</span>}
    </button>
  );
}