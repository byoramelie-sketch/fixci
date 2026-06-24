// >>> EMPLACEMENT : src/app/client/page.tsx
// =========================================================================
// Accueil de l'espace client (page d'entree une fois connecte).
//   - En-tete : logo + cloche (notifications a venir).
//   - Accroche, barre de recherche, bouton "Demander un artisan".
//   - Reperes de confiance (sans chiffres inventes).
//   - "Comment ca marche ?" en 3 etapes.
//   - Encart d'appel a l'action en attendant la liste des artisans.
//
// Page statique pour l'instant (option a) : la vraie liste d'artisans
// vérifiés arrivera avec l'ecran de recherche.
// =========================================================================

import Link from "next/link";
import {
  IconeCloche,
  IconeRecherche,
  IconeCheck,
  IconeCrayon,
  IconeAvis,
  IconeArtisans,
} from "@/components/icones";

export default function AccueilClient() {
  return (
    <div className="flex flex-col gap-5">
      {/* ===== En-tete : logo + cloche ===== */}
      <header className="flex items-center justify-between">
        {/* Logo simple de la marque (Fix en orange, CI en vert) */}
        <span
          className="text-xl"
          style={{ fontFamily: "var(--font-titre)" }}
        >
          <span style={{ color: "var(--color-orange)", fontWeight: 700 }}>Fix</span>
          <span style={{ color: "var(--color-vert)", fontWeight: 700 }}>CI</span>
        </span>
        {/* Cloche de notifications (fonctionnalite a venir) */}
        <span aria-hidden style={{ color: "var(--color-texte2)" }}>
          <IconeCloche taille={22} />
        </span>
      </header>

      {/* ===== Accroche principale ===== */}
      <h1
        className="text-2xl leading-snug"
        style={{ color: "var(--color-texte)" }}
      >
        Trouvez un artisan de confiance, pres de chez vous.
      </h1>

      {/* ===== Barre de recherche (ouvre le parcours de demande) ===== */}
      <Link
        href="/client/demander"
        className="flex items-center gap-2 rounded-xl border px-4 py-3 text-sm"
        style={{
          background: "var(--color-carte)",
          borderColor: "var(--color-bordure)",
          color: "var(--color-texte2)",
        }}
      >
        <IconeRecherche taille={18} />
        Quel service recherchez-vous ?
      </Link>

      {/* ===== Bouton principal : demander un artisan ===== */}
      <Link
        href="/client/demander"
        className="rounded-xl px-4 py-3 text-center text-sm font-semibold text-white"
        style={{ background: "var(--color-orange)" }}
      >
        Demander un artisan
      </Link>

      {/* ===== Reperes de confiance (sans chiffres inventes) ===== */}
      <div
        className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs"
        style={{ color: "var(--color-texte2)" }}
      >
        <span className="flex items-center gap-1">
          <span style={{ color: "var(--color-vert)" }}>
            <IconeCheck taille={15} />
          </span>
          Artisans verifies
        </span>
        <span className="flex items-center gap-1">
          <span style={{ color: "var(--color-vert)" }}>
            <IconeCheck taille={15} />
          </span>
          Paiement securise
        </span>
        <span className="flex items-center gap-1">
          <span style={{ color: "var(--color-vert)" }}>
            <IconeCheck taille={15} />
          </span>
          Satisfait ou accompagne
        </span>
      </div>

      {/* ===== Section : comment ca marche ? ===== */}
      <section className="flex flex-col gap-3">
        <h2
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: "var(--color-or)" }}
        >
          Comment ca marche ?
        </h2>
        <div className="grid grid-cols-3 gap-2">
          {/* Etape 1 : decrire le besoin */}
          <div
            className="flex flex-col items-center gap-2 rounded-xl p-3 text-center"
            style={{ background: "var(--color-secondaire)" }}
          >
            <span style={{ color: "var(--color-orange)" }}>
              <IconeCrayon taille={22} />
            </span>
            <span className="text-xs" style={{ color: "var(--color-texte)" }}>
              <b>1.</b> Decrivez votre besoin
            </span>
          </div>
          {/* Etape 2 : proposition d'un artisan verifie */}
          <div
            className="flex flex-col items-center gap-2 rounded-xl p-3 text-center"
            style={{ background: "var(--color-secondaire)" }}
          >
            <span style={{ color: "var(--color-orange)" }}>
              <IconeCheck taille={22} />
            </span>
            <span className="text-xs" style={{ color: "var(--color-texte)" }}>
              <b>2.</b> On vous propose un artisan verifie
            </span>
          </div>
          {/* Etape 3 : intervention puis notation */}
          <div
            className="flex flex-col items-center gap-2 rounded-xl p-3 text-center"
            style={{ background: "var(--color-secondaire)" }}
          >
            <span style={{ color: "var(--color-orange)" }}>
              <IconeAvis taille={22} />
            </span>
            <span className="text-xs" style={{ color: "var(--color-texte)" }}>
              <b>3.</b> Il intervient, vous le notez
            </span>
          </div>
        </div>
      </section>

      {/* ===== Encart : premiere demande (en attendant la liste d'artisans) ===== */}
      <section
        className="flex flex-col gap-3 rounded-xl border p-4"
        style={{ background: "var(--color-carte)", borderColor: "var(--color-bordure)" }}
      >
        <div className="flex items-center gap-2">
          <span style={{ color: "var(--color-or)" }}>
            <IconeArtisans taille={22} />
          </span>
          <h2 className="text-sm font-semibold" style={{ color: "var(--color-texte)" }}>
            Nos artisans verifies
          </h2>
        </div>
        <p className="text-sm" style={{ color: "var(--color-texte2)" }}>
          Faites votre premiere demande : nous vous mettons en relation avec un
          artisan verifie, pres de chez vous.
        </p>
        <Link
          href="/client/demander"
          className="text-sm font-semibold"
          style={{ color: "var(--color-orange)" }}
        >
          Faire une demande
        </Link>
      </section>
    </div>
  );
}