import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Client Supabase pour le SERVEUR (Server Components, Server Actions, Route Handlers).
// Lit/ecrit la session via les cookies.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: object }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Appel depuis un Server Component : ignore (le middleware rafraichit la session).
          }
        },
      },
    }
  );
}
