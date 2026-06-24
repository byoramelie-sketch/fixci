// >>> EMPLACEMENT : src/app/admin/(protege)/litiges/page.tsx
// =========================================================================
// Avis & litiges (admin) : les litiges ouverts + les avis signales.
// =========================================================================

import { createClient } from "@/lib/supabase/server";

// ===== Libelles des statuts de litige =====
const LIBELLE_LITIGE: Record<string, string> = {
  open: "Ouvert",
  resolved_reassigned: "Resolu (reassigne)",
  resolved_refunded: "Resolu (rembourse)",
  resolved_other: "Resolu",
  dismissed: "Rejete",
};

export default async function AdminLitiges() {
  const supabase = await createClient();

  // ===== Litiges (les ouverts d'abord) =====
  const { data: litiges } = await supabase
    .from("disputes")
    .select("id, reason, status, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  // ===== Avis signales (is_flagged = true) =====
  const { data: avisSignales } = await supabase
    .from("reviews")
    .select("id, rating, comment, created_at")
    .eq("is_flagged", true)
    .order("created_at", { ascending: false })
    .limit(50);

  const litigesOuverts = (litiges ?? []).filter((l) => l.status === "open");

  return (
    <div>
      <h1 className="mb-1 text-2xl">Avis &amp; litiges</h1>
      <p className="mb-6 text-sm text-texte2">
        Litiges a traiter et avis signales par la communaute.
      </p>

      {/* ===== Litiges ===== */}
      <h2 className="mb-3 text-lg">
        Litiges {litigesOuverts.length > 0 && (
          <span className="ml-1 rounded-full px-2 py-0.5 text-sm text-white" style={{ backgroundColor: "#C0392B" }}>
            {litigesOuverts.length} ouvert{litigesOuverts.length > 1 ? "s" : ""}
          </span>
        )}
      </h2>

      {(litiges ?? []).length === 0 ? (
        <div className="mb-8 rounded-2xl border border-bordure bg-carte p-6 text-center">
          <p className="text-sm text-texte2">Aucun litige enregistre.</p>
        </div>
      ) : (
        <div className="mb-8 space-y-3">
          {(litiges ?? []).map((l) => (
            <div key={l.id} className="rounded-2xl border border-bordure bg-carte p-4">
              <div className="mb-1 flex items-start justify-between gap-3">
                <p className="font-medium">{l.reason || "Litige sans motif precise"}</p>
                <span
                  className="shrink-0 rounded-full px-2.5 py-0.5 text-xs"
                  style={{
                    backgroundColor: l.status === "open" ? "#C0392B" : "var(--color-secondaire)",
                    color: l.status === "open" ? "#fff" : "var(--color-texte2)",
                  }}
                >
                  {LIBELLE_LITIGE[l.status] ?? l.status}
                </span>
              </div>
              <p className="text-xs text-texte2">{new Date(l.created_at).toLocaleDateString("fr-FR")}</p>
            </div>
          ))}
        </div>
      )}

      {/* ===== Avis signales ===== */}
      <h2 className="mb-3 text-lg">Avis signales</h2>
      {(avisSignales ?? []).length === 0 ? (
        <div className="rounded-2xl border border-bordure bg-carte p-6 text-center">
          <p className="text-sm text-texte2">Aucun avis signale.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {(avisSignales ?? []).map((a) => (
            <div key={a.id} className="rounded-2xl border border-bordure bg-carte p-4">
              <p className="mb-1" style={{ color: "var(--color-or)" }}>
                {"★".repeat(a.rating)}{"☆".repeat(5 - a.rating)}
              </p>
              {a.comment && <p className="text-sm">{a.comment}</p>}
              <p className="mt-1 text-xs text-texte2">{new Date(a.created_at).toLocaleDateString("fr-FR")}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}