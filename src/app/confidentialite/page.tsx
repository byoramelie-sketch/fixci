// >>> EMPLACEMENT : src/app/confidentialite/page.tsx
// =========================================================================
// Politique de confidentialite (page publique, liee aux cases d'acceptation).
//
// >>> IMPORTANT : ce texte est un PREMIER JET, redige pour refleter ce que
//     l'application fait REELLEMENT. Il doit etre relu par un juriste avant
//     le lancement commercial (la Cote d'Ivoire a sa propre loi sur les
//     donnees personnelles, et l'ARTCI est l'autorite competente).
//
// >>> A COMPLETER par le porteur : les mentions entre crochets.
// =========================================================================

import { FiletTricolore, Logo } from "@/components/ui";

// >>> A REMPLACER par les vraies coordonnees.
const CONTACT_EMAIL = "support@fixci.ci";
const DATE_MAJ = "Juillet 2026";

export default function Confidentialite() {
  return (
    <div className="min-h-screen bg-fond">
      <FiletTricolore />
      <div className="mx-auto max-w-2xl px-5 py-8">
        <header className="mb-8">
          <Logo />
        </header>

        <h1 className="mb-1 text-2xl">Politique de confidentialite</h1>
        <p className="mb-8 text-sm text-texte2">Derniere mise a jour : {DATE_MAJ}</p>

        <Bloc titre="En resume">
          <p>
            FixCI met en relation des particuliers et des artisans a Abidjan. Pour que ca marche,
            nous avons besoin de quelques informations. Nous n&apos;en collectons pas plus que
            necessaire, nous ne les vendons pas, et vous gardez la main dessus.
          </p>
        </Bloc>

        <Bloc titre="Qui est responsable">
          <p>
            FixCI, edite par BOIDOU Hilaire Yoram Elie. Pour toute question sur vos donnees :{" "}
            <strong>{CONTACT_EMAIL}</strong>.
          </p>
        </Bloc>

        <Bloc titre="Ce que nous collectons, et pourquoi">
          <Ligne
            quoi="Votre nom et votre numero de telephone"
            pourquoi="Creer votre compte, vous identifier, et permettre la mise en relation."
          />
          <Ligne
            quoi="Votre demande (description, metier, commune, budget, creneau)"
            pourquoi="La proposer aux artisans concernes pour qu'ils vous fassent une offre."
          />
          <Ligne
            quoi="Votre adresse precise et votre position GPS (si vous les partagez)"
            pourquoi="Permettre a l'artisan que vous avez choisi de vous rejoindre. C'est optionnel."
          />
          <Ligne
            quoi="Vos echanges dans la messagerie"
            pourquoi="Vous permettre de negocier, et pouvoir trancher en cas de litige."
          />
          <Ligne
            quoi="Vos paiements et vos avis"
            pourquoi="Securiser les transactions et faire vivre la reputation des artisans."
          />
          <Ligne
            quoi="Pour les artisans : la piece d'identite et la photo"
            pourquoi="Verifier que l'artisan est bien la personne qu'il pretend etre. C'est le coeur de la confiance sur FixCI."
          />
        </Bloc>

        <Bloc titre="Qui voit quoi">
          <p className="mb-2">
            Nous avons construit l&apos;application pour que chacun ne voie que ce qui le concerne :
          </p>
          <Puce>
            <strong>Votre piece d&apos;identite n&apos;est JAMAIS montree aux clients.</strong> Elle
            est rangee dans un espace prive, consultable uniquement par l&apos;equipe de
            verification de FixCI.
          </Puce>
          <Puce>
            <strong>Votre adresse precise et votre position</strong> ne sont visibles que par
            l&apos;artisan que vous avez choisi, et seulement une fois l&apos;accord conclu. Les
            autres artisans ne les voient jamais.
          </Puce>
          <Puce>
            <strong>Votre numero</strong> n&apos;est partage qu&apos;avec l&apos;artisan concerne par
            votre demande.
          </Puce>
          <Puce>
            Les artisans voient les demandes ouvertes de leurs metiers dans leurs communes, sans
            adresse precise, afin de vous proposer un prix.
          </Puce>
          <Puce>
            L&apos;equipe FixCI accede aux donnees necessaires au support, a la verification et au
            reglement des litiges. Chaque action d&apos;un administrateur est tracee.
          </Puce>
        </Bloc>

        <Bloc titre="Ce que nous ne faisons pas">
          <Puce>Nous ne vendons pas vos donnees.</Puce>
          <Puce>Nous ne les partageons pas a des fins publicitaires.</Puce>
          <Puce>Nous ne collectons rien qui ne serve pas au service.</Puce>
        </Bloc>

        <Bloc titre="Combien de temps nous les gardons">
          <Puce>
            <strong>Compte actif</strong> : tant que vous l&apos;utilisez.
          </Puce>
          <Puce>
            <strong>Piece d&apos;identite</strong> : le temps de la verification, puis conservee
            pour prouver que le controle a bien eu lieu. Vous pouvez en demander la suppression.
          </Puce>
          <Puce>
            <strong>Historique des interventions et paiements</strong> : conserve pour des raisons
            comptables et en cas de litige.
          </Puce>
          <Puce>
            <strong>Compte supprime</strong> : vos donnees personnelles sont effacees, sauf ce que
            la loi nous oblige a garder.
          </Puce>
        </Bloc>

        <Bloc titre="Vos droits">
          <p className="mb-2">A tout moment, vous pouvez nous demander :</p>
          <Puce>de voir les donnees que nous avons sur vous,</Puce>
          <Puce>de les corriger si elles sont fausses,</Puce>
          <Puce>de les supprimer,</Puce>
          <Puce>de retirer votre accord (par exemple pour la verification d&apos;identite),</Puce>
          <Puce>de vous opposer a un usage precis.</Puce>
          <p className="mt-2">
            Ecrivez a <strong>{CONTACT_EMAIL}</strong> : nous repondons dans les meilleurs delais.
            Retirer votre accord pour la verification d&apos;identite entraine la perte du badge
            &laquo;&nbsp;Verifie&nbsp;&raquo;, car nous ne pouvons plus garantir votre identite aux
            clients.
          </p>
        </Bloc>

        <Bloc titre="Comment nous les protegeons">
          <Puce>Connexion chiffree (HTTPS) sur tout le site.</Puce>
          <Puce>Mots de passe chiffres : personne chez FixCI ne peut les lire.</Puce>
          <Puce>
            Cloisonnement des acces : la base elle-meme empeche de lire les donnees d&apos;autrui,
            pas seulement l&apos;affichage.
          </Puce>
          <Puce>Pieces d&apos;identite rangees dans un espace prive, jamais public.</Puce>
        </Bloc>

        <Bloc titre="Modifications">
          <p>
            Si ce texte evolue de facon importante, nous vous demanderons de nouveau votre accord.
            Chaque acceptation est enregistree avec sa date et sa version.
          </p>
        </Bloc>

        <p className="mt-8 rounded-xl border border-bordure bg-secondaire p-4 text-xs text-texte2">
          Ce document decrit le fonctionnement reel de FixCI. Il sera complete et valide avant le
          lancement commercial, conformement a la reglementation ivoirienne sur la protection des
          donnees a caractere personnel.
        </p>

        <a
          href="/"
          className="mt-6 inline-block text-sm font-medium"
          style={{ color: "var(--color-orange)" }}
        >
          ← Retour a l&apos;accueil
        </a>
      </div>
    </div>
  );
}

// ===== Bloc de section =====
function Bloc({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h2 className="mb-2 text-lg" style={{ color: "var(--color-vert)" }}>
        {titre}
      </h2>
      <div className="text-sm leading-relaxed" style={{ color: "var(--color-texte)" }}>
        {children}
      </div>
    </section>
  );
}

// ===== Puce =====
function Puce({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-1.5 pl-4" style={{ textIndent: "-1rem" }}>
      <span style={{ color: "var(--color-orange)" }}>•</span> {children}
    </p>
  );
}

// ===== Ligne "quoi / pourquoi" =====
function Ligne({ quoi, pourquoi }: { quoi: string; pourquoi: string }) {
  return (
    <div className="mb-3 border-l-2 pl-3" style={{ borderColor: "var(--color-bordure)" }}>
      <p className="font-medium">{quoi}</p>
      <p className="text-texte2">{pourquoi}</p>
    </div>
  );
}