// >>> EMPLACEMENT : src/app/page.tsx

// =========================================================================
// Page d'accueil publique de FixCI (ce que voit un visiteur non connecte).
// Met la CONFIANCE au centre, puis oriente vers Inscription / Connexion /
// Devenir artisan. Composant serveur (rapide, bon pour le referencement).
// =========================================================================

import Link from "next/link";
import { Logo, FiletTricolore } from "@/components/ui";
import {
  IconeCheck,
  IconeArtisans,
  IconeCle,
  IconeCrayon,
  IconeMessage,
  IconeEclair,
  IconeFlocon,
  IconeOutils,
  IconePinceau,
  IconeMenage,
  IconeFeuille,
  IconeCamion,
  IconeMeuble,
} from "@/components/icones";

const confiance = [
  {
    Icone: IconeCheck,
    titre: "Artisans vérifiés",
    texte: "Pièce d'identité contrôlée et profil validé par FixCI. Vous savez à qui vous avez affaire.",
  },
  {
    Icone: IconeArtisans,
    titre: "Garantie de confiance",
    texte: "Un problème ? On vous réassigne gratuitement un autre artisan vérifié.",
  },
  {
    Icone: IconeCle,
    titre: "Paiement sécurisé",
    texte: "Acompte sécurisé, artisan payé une fois le travail validé. Pas d'avance dans le vide.",
  },
];

const etapes = [
  { n: "1", titre: "Décrivez votre besoin", texte: "Le métier, le quartier, l'urgence. En une minute." },
  { n: "2", titre: "Comparez les artisans", texte: "Notes, avis, badge vérifié. C'est vous qui choisissez." },
  { n: "3", titre: "Discutez et payez en sécurité", texte: "Fixez le prix dans la discussion, payez l'acompte, c'est parti." },
];

const metiers = [
  { Icone: IconeOutils, nom: "Plomberie", urgent: true },
  { Icone: IconeEclair, nom: "Électricité", urgent: true },
  { Icone: IconeFlocon, nom: "Climatisation", urgent: true },
  { Icone: IconePinceau, nom: "Peinture", urgent: false },
  { Icone: IconeCle, nom: "Serrurerie", urgent: false },
  { Icone: IconeMenage, nom: "Ménage", urgent: false },
  { Icone: IconeFeuille, nom: "Jardinage", urgent: false },
  { Icone: IconeCamion, nom: "Déménagement", urgent: false },
  { Icone: IconeMeuble, nom: "Montage de meubles", urgent: false },
];

export default function Accueil() {
  return (
    <main className="min-h-screen" style={{ background: "var(--color-fond)" }}>
      <FiletTricolore />

      {/* ===== Barre du haut ===== */}
      <header className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4">
        <Logo />
        <Link
          href="/connexion"
          className="text-sm font-medium"
          style={{ color: "var(--color-texte2)" }}
        >
          Se connecter
        </Link>
      </header>

      {/* ===== Hero : la confiance comme promesse ===== */}
      <section className="mx-auto max-w-3xl px-5 pb-10 pt-6 text-center">
        <span
          className="text-xs font-semibold uppercase tracking-wide"
          style={{ color: "var(--color-or)" }}
        >
          Abidjan · Services à domicile
        </span>
        <h1
          className="mx-auto mt-3 max-w-xl text-3xl leading-tight sm:text-4xl"
          style={{ color: "var(--color-texte)" }}
        >
          Trouvez un artisan de confiance, près de chez vous.
        </h1>
        <p
          className="mx-auto mt-4 max-w-lg text-base"
          style={{ color: "var(--color-texte2)" }}
        >
          Plomberie, électricité, climatisation et plus encore. Des artisans vérifiés, notés et
          garantis — sans mauvaise surprise.
        </p>

        <div className="mx-auto mt-7 flex max-w-xs flex-col gap-3">
          <Link
            href="/inscription"
            className="w-full rounded-xl px-5 py-3 text-center font-semibold text-white transition hover:brightness-95"
            style={{ background: "var(--color-orange)" }}
          >
            Trouver un artisan
          </Link>
          <Link
            href="/connexion"
            className="w-full rounded-xl px-5 py-3 text-center font-medium transition hover:brightness-95"
            style={{ background: "var(--color-secondaire)", color: "var(--color-texte)" }}
          >
            J'ai déjà un compte
          </Link>
        </div>
      </section>

      {/* ===== Bandeau confiance ===== */}
      <section style={{ background: "var(--color-carte)", borderTop: "1px solid var(--color-bordure)", borderBottom: "1px solid var(--color-bordure)" }}>
        <div className="mx-auto grid max-w-3xl gap-4 px-5 py-10 md:grid-cols-3">
          {confiance.map(({ Icone, titre, texte }) => (
            <div key={titre} className="flex flex-col items-center text-center md:items-start md:text-left">
              <span
                className="flex h-11 w-11 items-center justify-center rounded-full"
                style={{ background: "var(--color-secondaire)", color: "var(--color-vert)" }}
              >
                <Icone taille={22} />
              </span>
              <h3 className="mt-3 text-base" style={{ color: "var(--color-texte)" }}>
                {titre}
              </h3>
              <p className="mt-1 text-sm" style={{ color: "var(--color-texte2)" }}>
                {texte}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== Comment ça marche ===== */}
      <section className="mx-auto max-w-3xl px-5 py-12">
        <h2 className="text-center text-2xl" style={{ color: "var(--color-texte)" }}>
          Comment ça marche
        </h2>
        <div className="mt-7 flex flex-col gap-4 md:flex-row">
          {etapes.map(({ n, titre, texte }) => (
            <div
              key={n}
              className="flex-1 rounded-2xl border p-5"
              style={{ background: "var(--color-carte)", borderColor: "var(--color-bordure)" }}
            >
              <span
                className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white"
                style={{ background: "var(--color-orange)" }}
              >
                {n}
              </span>
              <h3 className="mt-3 text-base" style={{ color: "var(--color-texte)" }}>
                {titre}
              </h3>
              <p className="mt-1 text-sm" style={{ color: "var(--color-texte2)" }}>
                {texte}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== Nos métiers ===== */}
      <section style={{ background: "var(--color-secondaire)" }}>
        <div className="mx-auto max-w-3xl px-5 py-12">
          <h2 className="text-center text-2xl" style={{ color: "var(--color-texte)" }}>
            Nos métiers
          </h2>
          <p className="mt-2 text-center text-sm" style={{ color: "var(--color-texte2)" }}>
            On démarre par les urgences du quotidien, et on s'élargit.
          </p>
          <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {metiers.map(({ Icone, nom, urgent }) => (
              <div
                key={nom}
                className="flex items-center gap-3 rounded-xl border p-3"
                style={{
                  background: "var(--color-carte)",
                  borderColor: urgent ? "var(--color-orange)" : "var(--color-bordure)",
                }}
              >
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                  style={{ background: "var(--color-secondaire)", color: "var(--color-orange)" }}
                >
                  <Icone taille={18} />
                </span>
                <span className="text-sm font-medium" style={{ color: "var(--color-texte)" }}>
                  {nom}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Pour les artisans ===== */}
      <section className="mx-auto max-w-3xl px-5 py-12">
        <div
          className="rounded-2xl border p-6 text-center"
          style={{ background: "var(--color-carte)", borderColor: "var(--color-bordure)" }}
        >
          <h2 className="text-2xl" style={{ color: "var(--color-texte)" }}>
            Vous êtes artisan ?
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm" style={{ color: "var(--color-texte2)" }}>
            Recevez des demandes près de chez vous, bâtissez votre réputation, et ne payez une
            commission que lorsque vous décrochez un client.
          </p>
          <Link
            href="/artisan/inscription"
            className="mt-5 inline-block rounded-xl px-6 py-3 font-semibold text-white transition hover:brightness-95"
            style={{ background: "var(--color-vert)" }}
          >
            Devenir artisan
          </Link>
        </div>
      </section>

      {/* ===== Pied de page ===== */}
      <footer style={{ background: "var(--color-carte)", borderTop: "1px solid var(--color-bordure)" }}>
        <div className="mx-auto max-w-3xl px-5 py-8 text-center">
          <Logo />
          <p className="mx-auto mt-2 max-w-xs text-sm" style={{ color: "var(--color-texte2)" }}>
            Trouvez un artisan de confiance, près de chez vous.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm">
            <Link href="/connexion" style={{ color: "var(--color-texte2)" }}>
              Se connecter
            </Link>
            <Link href="/inscription" style={{ color: "var(--color-texte2)" }}>
              Créer un compte
            </Link>
            <Link href="/artisan/inscription" style={{ color: "var(--color-texte2)" }}>
              Devenir artisan
            </Link>
          </div>
          <p className="mt-5 text-xs" style={{ color: "var(--color-texte2)" }}>
            © 2026 FixCI · Abidjan, Côte d'Ivoire
          </p>
        </div>
      </footer>

      <FiletTricolore />
    </main>
  );
}