// >>> EMPLACEMENT : src/app/inscription/page.tsx
"use client";

// =========================================================================
// Ecran de choix avant inscription : "Vous etes artisan ou client ?"
//   - Artisan -> /artisan/inscription (parcours en 3 etapes + CNI)
//   - Client  -> /client/inscription  (parcours client, a venir)
// =========================================================================

import { useRouter } from "next/navigation";
import { FiletTricolore, Logo } from "@/components/ui";

export default function ChoixInscription() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-fond">
      <FiletTricolore />
      <div className="mx-auto flex min-h-[80vh] max-w-sm flex-col justify-center px-5">
        <div className="mb-8 text-center">
          <Logo />
          <p className="mt-2 text-sm text-texte2">
            Trouvez un artisan de confiance, pres de chez vous.
          </p>
        </div>

        <h1 className="mb-6 text-center text-xl">Vous souhaitez vous inscrire en tant que :</h1>

        <div className="space-y-4">
          {/* ===== Carte CLIENT ===== */}
          <button
            type="button"
            onClick={() => router.push("/client/inscription")}
            className="w-full rounded-2xl border border-bordure bg-carte p-5 text-left transition hover:brightness-95 active:scale-[0.99]"
          >
            <p className="text-lg font-medium">Je suis un client</p>
            <p className="mt-1 text-sm text-texte2">
              Je cherche un artisan verifie pour des travaux a domicile.
            </p>
          </button>

          {/* ===== Carte ARTISAN ===== */}
          <button
            type="button"
            onClick={() => router.push("/artisan/inscription")}
            className="w-full rounded-2xl border border-bordure bg-carte p-5 text-left transition hover:brightness-95 active:scale-[0.99]"
          >
            <p className="text-lg font-medium">Je suis un artisan</p>
            <p className="mt-1 text-sm text-texte2">
              Je propose mes services (plomberie, electricite, climatisation...).
            </p>
          </button>
        </div>

        {/* Lien vers la connexion */}
        <p className="mt-6 text-center text-sm text-texte2">
          Vous avez deja un compte ?{" "}
          <a href="/connexion" className="font-medium" style={{ color: "var(--color-orange)" }}>
            Se connecter
          </a>
        </p>
      </div>
    </div>
  );
}