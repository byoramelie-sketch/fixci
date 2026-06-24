// >>> EMPLACEMENT : src/app/client/profil/page.tsx
// =========================================================================
// Page provisoire "Profil" du client.
// A construire plus tard (nom, telephone, communes favorites, deconnexion).
// Affiche juste un message en attendant pour que l'onglet fonctionne.
// =========================================================================

export default function ProfilClient() {
  return (
    <div className="flex flex-col items-center gap-2 pt-16 text-center">
      <h1 className="text-lg font-semibold" style={{ color: "var(--color-texte)" }}>
        Mon profil
      </h1>
      <p className="text-sm" style={{ color: "var(--color-texte2)" }}>
        Vos informations et la deconnexion arriveront ici. Bientot disponible.
      </p>
    </div>
  );
}