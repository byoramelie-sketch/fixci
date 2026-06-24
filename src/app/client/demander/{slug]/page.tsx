// >>> EMPLACEMENT : src/app/client/demander/[slug]/page.tsx
// =========================================================================
// Etape 2 du parcours "Demander" : formulaire de description du besoin.
// VERSION PROVISOIRE : confirme juste le service choisi (slug present dans
// l'URL) et affiche un message. Le vrai formulaire (description, localisation,
// urgence, photos, WhatsApp, creneau) arrive a la prochaine etape.
// Ecran enfant -> fleche retour en haut (BoutonRetour).
// =========================================================================

import { BoutonRetour } from "@/components/icones";

// Dans Next 16, les parametres d'URL ([slug]) sont fournis sous forme de Promise.
export default async function FormulaireDemande({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <div className="flex flex-col gap-4">
      {/* ===== Barre du haut avec fleche retour ===== */}
      <div className="flex items-center gap-2">
        <BoutonRetour />
        <h1 className="text-xl" style={{ color: "var(--color-texte)" }}>
          Decrivez votre besoin
        </h1>
      </div>

      {/* ===== Message provisoire (confirme le service recu) ===== */}
      <div className="flex flex-col items-center gap-2 pt-10 text-center">
        <p className="text-sm" style={{ color: "var(--color-texte2)" }}>
          Service choisi : <b style={{ color: "var(--color-texte)" }}>{slug}</b>
        </p>
        <p className="text-sm" style={{ color: "var(--color-texte2)" }}>
          Le formulaire de demande arrive a la prochaine etape.
        </p>
      </div>
    </div>
  );
}