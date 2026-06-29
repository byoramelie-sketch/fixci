// >>> EMPLACEMENT : src/lib/paiement.ts

// ===========================================================================
// FixCI - Paiement : le SEUL fichier a remplacer pour brancher le vrai
// agregateur (CinetPay / PayDunya) plus tard.
//
// Aujourd'hui (MODE_SIMULATION = true) : on appelle les fonctions securisees en
// base, qui enregistrent le paiement et calculent le partage (acompte 40 %,
// solde 60 %, commission 10 %, net artisan) — exactement comme le fera
// l'agregateur.
//
// Le jour du branchement : passe MODE_SIMULATION a false et remplis les blocs
// "TODO BRANCHER ICI" (creation d'une transaction + redirection vers la page de
// paiement de l'agregateur ; c'est son WEBHOOK qui appellera ensuite les memes
// fonctions cote serveur). Les ecrans n'ont PAS besoin de changer.
// ===========================================================================

import { createClient } from "@/lib/supabase/client";

// ===== Interrupteur unique =====
export const MODE_SIMULATION = true;

export type MethodePaiement = "wave" | "orange_money";

// La ligne de paiement renvoyee par la base (table "payments").
export type Paiement = {
  id: string;
  job_id: string;
  total_amount_fcfa: number;
  deposit_fcfa: number;
  deposit_paid_at: string | null;
  balance_fcfa: number;
  balance_paid_at: string | null;
  material_advance_fcfa: number;
  commission_rate_applied: number;
  commission_fcfa: number;
  artisan_payout_fcfa: number;
  status: string; // 'pending' | 'escrowed' | 'release_pending' | 'released' | 'failed' | 'refunded'
  payout_at: string | null;
  payment_method: MethodePaiement | null;
  aggregator_reference: string | null;
};

function ligneUnique(data: unknown): Paiement {
  // Selon les versions, la fonction renvoie un objet ou un tableau a un element.
  const l = Array.isArray(data) ? data[0] : data;
  return l as Paiement;
}

// ===== Payer l'acompte (40 %) =====
export async function payerAcompte(
  jobId: string,
  methode: MethodePaiement
): Promise<Paiement> {
  const supabase = createClient();

  if (!MODE_SIMULATION) {
    // ===================== TODO BRANCHER ICI (mode reel) =====================
    // 1. Appeler ton backend / route API qui cree une transaction chez
    //    l'agregateur (paiement marchand split + escrow) pour 40 % du montant,
    //    avec Wave / Orange Money.
    // 2. Rediriger l'utilisateur vers l'URL de paiement renvoyee.
    // 3. A la confirmation, le WEBHOOK appelle "fixci_payer_acompte" cote
    //    serveur avec l'aggregator_reference reelle.
    // ========================================================================
    throw new Error("Le paiement reel n'est pas encore branche (voir src/lib/paiement.ts).");
  }

  const { data, error } = await supabase.rpc("fixci_payer_acompte", {
    p_job_id: jobId,
    p_methode: methode,
  });
  if (error) throw new Error(error.message);
  return ligneUnique(data);
}

// ===== Valider le travail + payer le solde (60 %) + liberer =====
export async function finaliserPaiement(
  jobId: string,
  methode: MethodePaiement
): Promise<Paiement> {
  const supabase = createClient();

  if (!MODE_SIMULATION) {
    // ===================== TODO BRANCHER ICI (mode reel) =====================
    // Meme principe que l'acompte, mais pour le solde 60 %. La validation du
    // travail (chantier + demande) et la liberation se font cote base, dans
    // "fixci_finaliser_paiement", appelee par le webhook apres confirmation.
    // ========================================================================
    throw new Error("Le paiement reel n'est pas encore branche (voir src/lib/paiement.ts).");
  }

  const { data, error } = await supabase.rpc("fixci_finaliser_paiement", {
    p_job_id: jobId,
    p_methode: methode,
  });
  if (error) throw new Error(error.message);
  return ligneUnique(data);
}

// ===== Lire l'etat du paiement d'un chantier (affichage client + artisan) =====
export async function lirePaiement(jobId: string): Promise<Paiement | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("payments")
    .select("*")
    .eq("job_id", jobId)
    .maybeSingle();
  return (data as Paiement | null) ?? null;
}