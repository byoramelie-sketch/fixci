// >>> EMPLACEMENT : src/app/client/demander/formulaire/page.tsx
// =========================================================================
// Etape 2 du parcours "Demander" : page de description du besoin.
//   - Le metier choisi est passe dans l'adresse : .../formulaire?service=plomberie
//   - Retrouve le metier a partir de ce parametre "service".
//   - Charge la liste des communes (menu deroulant) et le telephone du client.
//   - Passe le tout au formulaire interactif (FormulaireDemande).
// Ecran enfant -> fleche retour en haut. Server Component.
// =========================================================================

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BoutonRetour } from "@/components/icones";
import { FormulaireDemande } from "./formulaire-demande";

// ===== Type d'une commune =====
type Commune = { id: string; name: string };

export default async function PageFormulaire({
  searchParams,
}: {
  searchParams: Promise<{ service?: string; artisan?: string }>;
}) {
  // ===== Service + artisan choisis (lus dans l'adresse) =====
  const { service, artisan } = await searchParams;
  const slug = service ?? "";
  const artisanId = artisan ?? null;

  const supabase = await createClient();

  // ===== Utilisateur connecte (necessaire pour rattacher la demande) =====
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/connexion");
  }

  // ===== Metier choisi (a partir du slug) =====
  const { data: tradeData } = await supabase
    .from("trades")
    .select("id, name")
    .eq("slug", slug)
    .single();
  const trade = (tradeData ?? null) as { id: string; name: string } | null;

  // ===== En-tete commun (avec fleche retour) =====
  const enTete = (titre: string) => (
    <div className="flex items-center gap-2">
      <BoutonRetour />
      <h1 className="text-xl" style={{ color: "var(--color-texte)" }}>
        {titre}
      </h1>
    </div>
  );

  // ===== Si le service n'existe pas =====
  if (!trade) {
    return (
      <div className="flex flex-col gap-4">
        {enTete("Demande")}
        <p className="pt-10 text-center text-sm" style={{ color: "var(--color-texte2)" }}>
          Service introuvable.
        </p>
      </div>
    );
  }

  // ===== Communes actives (pour le menu deroulant) =====
  const { data: communesData } = await supabase
    .from("communes")
    .select("id, name")
    .eq("is_active", true)
    .order("name", { ascending: true });
  const communes = (communesData ?? []) as Commune[];

  // ===== Telephone du client (pre-rempli, modifiable) =====
  const { data: prof } = await supabase
    .from("profiles")
    .select("phone")
    .eq("id", user.id)
    .single();
  const telephoneDefaut = ((prof?.phone as string | null) ?? "") || "";

  // ===== Artisan choisi (optionnel) : on recupere son nom pour l'afficher =====
  // Si la demande est adressee a un artisan precis, on montre "Vous contactez X"
  // et on rattachera la demande a cet artisan (assigned_artisan_id).
  let artisanNom: string | null = null;
  if (artisanId) {
    const { data: artProf } = await supabase
      .from("profiles")
      .select("name")
      .eq("id", artisanId)
      .single();
    artisanNom = (artProf?.name as string | null) ?? null;
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
      {enTete(trade.name)}
      <FormulaireDemande
        tradeId={trade.id}
        clientId={user.id}
        communes={communes}
        telephoneDefaut={telephoneDefaut}
        artisanId={artisanId}
        artisanNom={artisanNom}
      />
    </div>
  );
}