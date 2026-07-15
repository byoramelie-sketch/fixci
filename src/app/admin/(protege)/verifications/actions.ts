// =========================================================================
// >>> EMPLACEMENT DE CE FICHIER :
//     src/app/admin/(protege)/verifications/actions.ts
// >>> ACTIONS SERVEUR (approuver / rejeter / RECOURS cote serveur)
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
  revalidatePath("/admin/artisans");
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
  revalidatePath("/admin/artisans");
  return { ok: true };
}

// =========================================================================
// RECOURS — revenir sur une decision
// =========================================================================

// ===== Annuler une verification faite a tort =====
// Cas : un artisan a ete valide par erreur. On lui retire le badge et on le
// remet dans la file d'attente pour un nouvel examen. Il n'est plus visible
// des clients tant qu'il n'est pas revalide.
export async function annulerVerification(artisanId: string, motif: string) {
  const admin = await requireAdmin();
  if (!motif.trim()) return { ok: false, message: "Le motif est obligatoire." };

  const supabase = await createClient();

  const { error } = await supabase
    .from("artisans")
    .update({ status: "pending", is_verified_badge: false })
    .eq("id", artisanId);
  if (error) return { ok: false, message: error.message };

  // Les documents repassent en attente d'examen.
  await supabase
    .from("verification_documents")
    .update({ status: "pending", reviewed_by: null, reviewed_at: null, rejection_reason: null })
    .eq("artisan_id", artisanId);

  await supabase.from("admin_audit_log").insert({
    admin_id: admin.id,
    action: "artisan_verification_reverted",
    target_table: "artisans",
    target_id: artisanId,
    details: { motif },
  });

  revalidatePath("/admin/verifications");
  revalidatePath("/admin/artisans");
  return { ok: true };
}

// ===== Suspendre un artisan =====
// Cas : probleme avere (fraude, plaintes...). Le profil est bloque et le badge
// retire. L'artisan peut faire appel depuis son espace.
export async function suspendreArtisan(artisanId: string, motif: string) {
  const admin = await requireAdmin();
  if (!motif.trim()) return { ok: false, message: "Le motif est obligatoire." };

  const supabase = await createClient();

  const { error } = await supabase
    .from("artisans")
    .update({ status: "suspended", is_verified_badge: false })
    .eq("id", artisanId);
  if (error) return { ok: false, message: error.message };

  await supabase.from("admin_audit_log").insert({
    admin_id: admin.id,
    action: "artisan_suspended",
    target_table: "artisans",
    target_id: artisanId,
    details: { motif },
  });

  revalidatePath("/admin/verifications");
  revalidatePath("/admin/artisans");
  return { ok: true };
}

// ===== Reexaminer un dossier (l'artisan a fait appel) =====
// Cas : un artisan refuse ou suspendu conteste la decision (erreur de document,
// piece illisible...). On remet son dossier dans la file de verification.
export async function reexaminerArtisan(artisanId: string, motif: string) {
  const admin = await requireAdmin();
  if (!motif.trim()) return { ok: false, message: "Le motif est obligatoire." };

  const supabase = await createClient();

  const { error } = await supabase
    .from("artisans")
    .update({ status: "pending", is_verified_badge: false })
    .eq("id", artisanId);
  if (error) return { ok: false, message: error.message };

  // Les documents repassent en attente, sans le motif de refus precedent.
  await supabase
    .from("verification_documents")
    .update({ status: "pending", reviewed_by: null, reviewed_at: null, rejection_reason: null })
    .eq("artisan_id", artisanId);

  await supabase.from("admin_audit_log").insert({
    admin_id: admin.id,
    action: "artisan_reexamined",
    target_table: "artisans",
    target_id: artisanId,
    details: { motif },
  });

  revalidatePath("/admin/verifications");
  revalidatePath("/admin/artisans");
  return { ok: true };
}