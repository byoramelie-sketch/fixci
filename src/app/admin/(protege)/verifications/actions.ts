// =========================================================================
// >>> EMPLACEMENT DE CE FICHIER :
//     src/app/admin/(protege)/verifications/actions.ts
// >>> ACTIONS SERVEUR (approuver / rejeter cote serveur)
// =========================================================================
"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/require-admin";
import { revalidatePath } from "next/cache";

// ===== Actions admin sur les artisans (cote serveur) =====
// Chaque action verifie d'abord que l'appelant est bien admin.

// ===== Approuver un artisan =====
// Passe le statut a "verified", attribue le badge, et trace l'action.
export async function approuverArtisan(artisanId: string) {
  const admin = await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from("artisans")
    .update({ status: "verified", is_verified_badge: true })
    .eq("id", artisanId);
  if (error) return { ok: false, message: error.message };

  // Marquer les documents de cet artisan comme approuves.
  await supabase
    .from("verification_documents")
    .update({ status: "approved", reviewed_by: admin.id, reviewed_at: new Date().toISOString() })
    .eq("artisan_id", artisanId);

  // Tracer dans le journal d'administration.
  await supabase.from("admin_audit_log").insert({
    admin_id: admin.id,
    action: "artisan_approved",
    target_table: "artisans",
    target_id: artisanId,
  });

  revalidatePath("/admin/verifications");
  return { ok: true };
}

// ===== Rejeter un artisan =====
// Passe le statut a "rejected" avec un motif obligatoire, et trace l'action.
export async function rejeterArtisan(artisanId: string, motif: string) {
  const admin = await requireAdmin();
  if (!motif.trim()) return { ok: false, message: "Le motif est obligatoire." };

  const supabase = await createClient();

  const { error } = await supabase
    .from("artisans")
    .update({ status: "rejected" })
    .eq("id", artisanId);
  if (error) return { ok: false, message: error.message };

  await supabase
    .from("verification_documents")
    .update({
      status: "rejected",
      rejection_reason: motif,
      reviewed_by: admin.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("artisan_id", artisanId);

  await supabase.from("admin_audit_log").insert({
    admin_id: admin.id,
    action: "artisan_rejected",
    target_table: "artisans",
    target_id: artisanId,
    details: { motif },
  });

  revalidatePath("/admin/verifications");
  return { ok: true };
}