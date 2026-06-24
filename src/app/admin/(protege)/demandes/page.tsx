// >>> EMPLACEMENT : src/app/admin/(protege)/demandes/page.tsx
// =========================================================================
// Liste de toutes les demandes de service (admin).
// =========================================================================

import { createClient } from "@/lib/supabase/server";

// ===== Libelles lisibles des statuts de demande =====
const LIBELLE_STATUT: Record<string, string> = {
  new: "Nouvelle",
  quote_in_progress: "Devis en cours",
  quote_accepted: "Devis accepte",
  en_route: "En route",
  completed: "Terminee",
  validated: "Validee",
  cancelled: "Annulee",
  disputed: "Litige",
};

const COULEUR_STATUT: Record<string, string> = {
  new: "var(--color-orange)",
  completed: "var(--color-vert)",
  validated: "var(--color-vert)",
  cancelled: "#6B6860",
  disputed: "#C0392B",
};

export default async function AdminDemandes() {
  const supabase = await createClient();

  // ===== Recuperer les demandes recentes (200 dernieres) =====
  const { data: demandes } = await supabase
    .from("service_requests")
    .select("id, description, neighborhood, urgency, status, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div>
      <h1 className="mb-1 text-2xl">Demandes</h1>
      <p className="mb-6 text-sm text-texte2">Toutes les demandes de service des clients.</p>

      {(demandes ?? []).length === 0 ? (
        <div className="rounded-2xl border border-bordure bg-carte p-10 text-center">
          <p className="text-texte2">Aucune demande pour le moment.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {(demandes ?? []).map((d) => (
            <div key={d.id} className="rounded-2xl border border-bordure bg-carte p-4">
              <div className="mb-1 flex items-start justify-between gap-3">
                <p className="font-medium">{d.description}</p>
                <span
                  className="shrink-0 rounded-full px-2.5 py-0.5 text-xs text-white"
                  style={{ backgroundColor: COULEUR_STATUT[d.status] ?? "#6B6860" }}
                >
                  {LIBELLE_STATUT[d.status] ?? d.status}
                </span>
              </div>
              <p className="text-sm text-texte2">
                {d.neighborhood ?? "Zone non precisee"} ·{" "}
                {new Date(d.created_at).toLocaleDateString("fr-FR")}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}