// >>> EMPLACEMENT : src/app/client/mes-demandes/page.tsx
// =========================================================================
// Page provisoire "Mes demandes" (suivi des demandes du client).
// A construire plus tard. Affiche juste un message en attendant pour que
// l'onglet de navigation fonctionne.
// =========================================================================

export default function MesDemandesClient() {
  return (
    <div className="flex flex-col items-center gap-2 pt-16 text-center">
      <h1 className="text-lg font-semibold" style={{ color: "var(--color-texte)" }}>
        Mes demandes
      </h1>
      <p className="text-sm" style={{ color: "var(--color-texte2)" }}>
        Vous retrouverez ici le suivi de vos demandes. Bientot disponible.
      </p>
    </div>
  );
}