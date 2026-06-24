// =========================================================================
// >>> EMPLACEMENT DE CE FICHIER :
//     src/lib/require-admin.ts
// >>> GARDE D'ACCES (verifie que l'utilisateur est admin)
// =========================================================================
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

// ===== Garde d'acces admin =====
// Verifie cote serveur que l'utilisateur connecte a bien le role 'admin'.
// Renvoie le profil admin, ou redirige vers la connexion si l'acces est refuse.
export async function requireAdmin() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/connexion");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, name, role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    redirect("/admin/connexion");
  }

  return profile;
}