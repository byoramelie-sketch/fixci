// >>> EMPLACEMENT : src/app/cgu/page.tsx
// =========================================================================
// Conditions generales d'utilisation (page publique).
//
// >>> IMPORTANT : ce texte est un PREMIER JET, redige pour refleter le
//     fonctionnement reel de l'application. Il doit etre relu par un juriste
//     avant le lancement commercial.
//
// >>> A COMPLETER par le porteur : les mentions entre crochets.
// =========================================================================

import { FiletTricolore, Logo } from "@/components/ui";

// >>> A REMPLACER par les vraies coordonnees.
const CONTACT_EMAIL = "support@fixci.ci";
const DATE_MAJ = "Juillet 2026";
const COMMISSION = "10 %";

export default function Cgu() {
  return (
    <div className="min-h-screen bg-fond">
      <FiletTricolore />
      <div className="mx-auto max-w-2xl px-5 py-8">
        <header className="mb-8">
          <Logo />
        </header>

        <h1 className="mb-1 text-2xl">Conditions d&apos;utilisation</h1>
        <p className="mb-8 text-sm text-texte2">Derniere mise a jour : {DATE_MAJ}</p>

        <Bloc titre="1. Ce qu'est FixCI">
          <p>
            FixCI est une place de marche qui met en relation des particuliers a Abidjan avec des
            artisans (plomberie, electricite, climatisation, peinture, menage...). FixCI{" "}
            <strong>n&apos;est pas l&apos;employeur des artisans</strong> et ne realise pas les
            travaux : chaque artisan est un professionnel independant. FixCI fournit la mise en
            relation, la verification, la messagerie, le paiement securise et le systeme d&apos;avis.
          </p>
        </Bloc>

        <Bloc titre="2. Qui peut s'inscrire">
          <Puce>Vous devez avoir au moins 18 ans.</Puce>
          <Puce>Vous vous engagez a donner des informations exactes.</Puce>
          <Puce>Un numero de telephone = un seul compte.</Puce>
          <Puce>Vous etes responsable de votre mot de passe.</Puce>
        </Bloc>

        <Bloc titre="3. Les engagements des artisans">
          <Puce>Fournir une piece d&apos;identite authentique pour la verification.</Puce>
          <Puce>N&apos;accepter que des travaux dans ses competences reelles.</Puce>
          <Puce>Annoncer un prix clair avant de commencer, et le respecter.</Puce>
          <Puce>Realiser le travail avec soin et dans les delais convenus.</Puce>
          <Puce>Prevenir sans attendre en cas d&apos;empechement.</Puce>
          <Puce>Reverser a FixCI la commission due, y compris pour un reglement en especes.</Puce>
        </Bloc>

        <Bloc titre="4. Les engagements des clients">
          <Puce>Decrire son besoin honnetement.</Puce>
          <Puce>Regler le prix convenu une fois le travail fait.</Puce>
          <Puce>Accueillir l&apos;artisan dans des conditions correctes et sures.</Puce>
          <Puce>Laisser un avis sincere.</Puce>
        </Bloc>

        <Bloc titre="5. Le prix et le paiement">
          <p className="mb-2">
            Le prix est fixe librement entre le client et l&apos;artisan, dans la messagerie ou via
            un devis. Deux facons de regler :
          </p>
          <Puce>
            <strong>Dans l&apos;application</strong> : le client paie un acompte, puis le solde. La
            somme est securisee et l&apos;artisan n&apos;est paye qu&apos;une fois le travail
            valide. La commission FixCI est prelevee automatiquement.
          </Puce>
          <Puce>
            <strong>En especes</strong> : le client paie directement l&apos;artisan. L&apos;artisan
            encaisse la totalite et doit ensuite reverser la commission a FixCI depuis son espace.
          </Puce>
          <p className="mt-2">
            La commission FixCI est de <strong>{COMMISSION}</strong> du montant de
            l&apos;intervention. Des abonnements optionnels sont proposes aux artisans.
          </p>
        </Bloc>

        <Bloc titre="6. La verification et le badge">
          <p>
            Le badge &laquo;&nbsp;Verifie&nbsp;&raquo; signifie que FixCI a controle
            l&apos;identite de l&apos;artisan. Il ne garantit pas la qualite d&apos;un travail
            donne : c&apos;est le role des avis. FixCI peut refuser, suspendre ou retirer un badge,
            avec un motif. L&apos;artisan concerne peut faire appel ou renvoyer son dossier.
          </p>
        </Bloc>

        <Bloc titre="7. Les avis">
          <p>
            Client et artisan se notent apres chaque intervention. Les avis doivent etre honnetes et
            respectueux. FixCI peut retirer un avis injurieux, mensonger ou hors sujet.
          </p>
        </Bloc>

        <Bloc titre="8. En cas de probleme">
          <p>
            Signalez-le a <strong>{CONTACT_EMAIL}</strong>. FixCI examine la situation et peut
            reassigner un autre artisan verifie, geler un paiement le temps de comprendre, ou
            suspendre un compte. FixCI cherche d&apos;abord une solution amiable.
          </p>
        </Bloc>

        <Bloc titre="9. Ce qui est interdit">
          <Puce>Se faire passer pour quelqu&apos;un d&apos;autre.</Puce>
          <Puce>Contourner FixCI pour eviter la commission apres une mise en relation.</Puce>
          <Puce>Publier de faux avis ou de fausses demandes.</Puce>
          <Puce>Harceler ou menacer un autre utilisateur.</Puce>
          <Puce>Tenter de nuire au fonctionnement du service.</Puce>
          <p className="mt-2">Ces comportements entrainent la suspension du compte.</p>
        </Bloc>

        <Bloc titre="10. Responsabilite">
          <p>
            FixCI est un intermediaire. La bonne execution des travaux releve de l&apos;artisan, qui
            en repond directement aupres du client. FixCI s&apos;engage a verifier les identites, a
            securiser les paiements et a traiter les signalements serieusement.
          </p>
        </Bloc>

        <Bloc titre="11. Fermer son compte">
          <p>
            Vous pouvez fermer votre compte a tout moment en ecrivant a{" "}
            <strong>{CONTACT_EMAIL}</strong>. Les interventions en cours doivent d&apos;abord etre
            terminees, et les sommes dues reglees.
          </p>
        </Bloc>

        <Bloc titre="12. Evolution des conditions">
          <p>
            Ces conditions peuvent changer. En cas de modification importante, votre accord sera de
            nouveau demande. Chaque acceptation est enregistree avec sa date et sa version.
          </p>
        </Bloc>

        <p className="mt-8 rounded-xl border border-bordure bg-secondaire p-4 text-xs text-texte2">
          Ce document decrit le fonctionnement reel de FixCI. Il sera complete et valide par un
          professionnel du droit avant le lancement commercial.
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