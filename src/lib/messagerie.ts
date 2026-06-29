// >>> EMPLACEMENT : src/lib/messagerie.ts
"use client";

// =========================================================================
// Petit utilitaire de messagerie : ouvrir (ou creer) la conversation entre un
// client et un artisan pour une demande donnee. Une seule conversation par
// couple (demande, artisan).
// =========================================================================

import { createClient } from "@/lib/supabase/client";

export async function ouvrirConversation(
  requestId: string,
  clientId: string,
  artisanId: string
): Promise<string | null> {
  const supabase = createClient();

  // Existe-t-elle deja ?
  const { data: existante } = await supabase
    .from("conversations")
    .select("id")
    .eq("request_id", requestId)
    .eq("artisan_id", artisanId)
    .maybeSingle();
  if (existante) return existante.id;

  // Sinon, on la cree.
  const { data: creee, error } = await supabase
    .from("conversations")
    .insert({ request_id: requestId, client_id: clientId, artisan_id: artisanId })
    .select("id")
    .single();
  if (error || !creee) return null;
  return creee.id;
}
