import { createBrowserClient } from "@supabase/ssr";

// Client Supabase pour le NAVIGATEUR (composants "use client").
// Utilise la cle anon publique — les donnees restent protegees par le RLS.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
