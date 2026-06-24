// >>> EMPLACEMENT : src/lib/supabase/middleware.ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Rafraichit la session a chaque requete et protege les routes privees.
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: object }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  // ===== Routes qui exigent une connexion =====
  const isProtected =
    path.startsWith("/artisan") || path.startsWith("/admin");

  // ===== Pages publiques, accessibles meme sans etre connecte =====
  // IMPORTANT : on liste ici toutes les pages de connexion / inscription,
  // sinon le middleware redirigerait l'utilisateur AVANT qu'il puisse se
  // connecter (boucle ou page inaccessible).
  const pagesPubliques = [
    "/connexion",            // connexion partagee (artisan, client, admin)
    "/inscription",          // choix du type de compte
    "/artisan/inscription",  // parcours d'inscription artisan
    "/admin/connexion",      // connexion admin dediee
  ];
  const isAuthPage = pagesPubliques.includes(path);

  // ===== Si page protegee, pas une page de connexion, et pas connecte -> rediriger =====
  if (isProtected && !isAuthPage && !user) {
    const url = request.nextUrl.clone();
    // CORRECTION : on envoie vers la page de connexion partagee /connexion
    // (l'ancienne adresse /artisan/connexion n'existe pas).
    url.pathname = "/connexion";
    return NextResponse.redirect(url);
  }

  return response;
}