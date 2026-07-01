// >>> EMPLACEMENT : src/lib/abonnement.ts

// =========================================================================
// Monetisation cote artisan : abonnement mensuel + mise en avant.
//
// Deux interrupteurs :
//   - ABONNEMENTS_DISPONIBLES : false = "Bientot disponible" (au lancement).
//     Passer a true le jour ou l'on ouvre les paiements d'abonnement.
//   - MODE_SIMULATION : true = paiement simule (pour tester sans argent reel).
//     Passer a false une fois le vrai agregateur (CinetPay/PayDunya...) branche.
//
// Toute la structure ci-dessous est prete a encaisser : le jour venu, on
// branche le vrai paiement dans souscrire() et on bascule les interrupteurs.
// =========================================================================

import { createClient } from "@/lib/supabase/client";

// >>> A BASCULER AU LANCEMENT DES PAIEMENTS D'ABONNEMENT
export const ABONNEMENTS_DISPONIBLES = false;

// >>> A BASCULER QUAND LE VRAI AGREGATEUR EST BRANCHE
export const MODE_SIMULATION = true;

export type TypeAbonnement = "monthly_subscription" | "featured_listing";
export type MethodePaiement = "wave" | "orange_money";

export type Abonnement = {
  type: TypeAbonnement;
  amount_fcfa: number;
  status: string;
  period_end: string;
};

// Souscrire a un abonnement (ou a la mise en avant).
export async function souscrire(type: TypeAbonnement, methode: MethodePaiement): Promise<void> {
  const supabase = createClient();

  // ---------------------------------------------------------------------
  // >>> BRANCHER ICI le vrai paiement agregateur quand MODE_SIMULATION = false :
  //     1. declencher le paiement (Wave / Orange Money via l'agregateur),
  //     2. attendre la confirmation + recuperer la reference reelle,
  //     3. puis appeler fixci_souscrire (idealement cote serveur/webhook).
  //     En mode simulation, on appelle directement la fonction ci-dessous.
  // ---------------------------------------------------------------------

  const { error } = await supabase.rpc("fixci_souscrire", {
    p_type: type,
    p_methode: methode,
  });
  if (error) throw new Error(error.message);
}

// Lire les abonnements actifs de l'artisan connecte (pour l'affichage).
export async function lireAbonnementsActifs(): Promise<Abonnement[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("artisan_subscriptions")
    .select("type, amount_fcfa, status, period_end")
    .eq("status", "active")
    .order("period_end", { ascending: false });
  return (data ?? []) as Abonnement[];
}
