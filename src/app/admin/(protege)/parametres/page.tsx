// >>> EMPLACEMENT : src/app/admin/(protege)/parametres/page.tsx
// =========================================================================
// Parametres de la plateforme (admin).
// Lit la table platform_settings (cle/valeur) si elle contient des reglages.
// =========================================================================

import { createClient } from "@/lib/supabase/server";

export default async function AdminParametres() {
  const supabase = await createClient();

  // ===== Lire les reglages de la plateforme =====
  // La table platform_settings stocke des reglages. On l'affiche en lecture
  // pour cette version (la modification viendra plus tard).
  const { data: reglages } = await supabase
    .from("platform_settings")
    .select("*")
    .limit(100);

  // Compter les artisans pour une info utile.
  const { count: nbArtisans } = await supabase
    .from("artisans").select("*", { count: "exact", head: true });

  return (
    <div>
      <h1 className="mb-1 text-2xl">Parametres</h1>
      <p className="mb-6 text-sm text-texte2">
        Reglages de la plateforme FixCI.
      </p>

      {/* ===== Informations generales ===== */}
      <div className="mb-6 rounded-2xl border border-bordure bg-carte p-6">
        <h2 className="mb-3 text-lg">Informations</h2>
        <div className="space-y-2 text-sm">
          <Ligne libelle="Plateforme" valeur="FixCI — Abidjan" />
          <Ligne libelle="Artisans inscrits" valeur={String(nbArtisans ?? 0)} />
        </div>
      </div>

      {/* ===== Reglages techniques ===== */}
      <div className="rounded-2xl border border-bordure bg-carte p-6">
        <h2 className="mb-3 text-lg">Reglages</h2>
        {(reglages ?? []).length === 0 ? (
          <p className="text-sm text-texte2">
            Aucun reglage configure pour le moment. Les options de configuration
            (commission, zones actives...) seront editables ici prochainement.
          </p>
        ) : (
          <div className="space-y-2 text-sm">
            {(reglages ?? []).map((r: Record<string, unknown>, i: number) => (
              <pre key={i} className="overflow-x-auto rounded-lg bg-secondaire p-3 text-xs">
                {JSON.stringify(r, null, 2)}
              </pre>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ===== Ligne d'information (libelle a gauche, valeur a droite) =====
function Ligne({ libelle, valeur }: { libelle: string; valeur: string }) {
  return (
    <div className="flex items-center justify-between border-b border-bordure py-2 last:border-0">
      <span className="text-texte2">{libelle}</span>
      <span className="font-medium">{valeur}</span>
    </div>
  );
}