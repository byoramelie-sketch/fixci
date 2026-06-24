// >>> EMPLACEMENT : src/app/artisan/verification/page.tsx
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { FiletTricolore, Logo } from "@/components/ui";
import type { ArtisanStatus } from "@/lib/types";

// Ecran "Statut de verification" (cahier des charges A2).
// En attente -> orange. Verifie -> vert + badge. Rejete -> motif.
export default async function VerificationArtisan() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  // CORRECTION : la connexion se fait sur la page partagee /connexion.
  if (!user) redirect("/connexion");

  const { data: artisan } = await supabase
    .from("artisans")
    .select("status")
    .eq("id", user.id)
    .single();

  const statut: ArtisanStatus = artisan?.status ?? "pending";

  const contenu = {
    pending: {
      couleur: "var(--color-orange)",
      titre: "Dossier en cours de verification",
      texte:
        "Notre equipe controle vos informations. Vous recevrez une notification des que votre profil sera active.",
    },
    verified: {
      couleur: "var(--color-vert)",
      titre: "Profil verifie",
      texte:
        "Felicitations ! Votre badge Verifie est attribue. Vous etes desormais visible des clients.",
    },
    rejected: {
      couleur: "#b91c1c",
      titre: "Dossier a completer",
      texte:
        "Certaines informations doivent etre revues. Contactez le support ou completez votre dossier.",
    },
    suspended: {
      couleur: "#b91c1c",
      titre: "Profil suspendu",
      texte: "Votre profil est temporairement suspendu. Contactez le support.",
    },
  }[statut];

  return (
    <div className="min-h-screen bg-fond">
      <FiletTricolore />
      <div className="mx-auto max-w-md px-5 py-6">
        <header className="mb-10">
          <Logo />
        </header>
        <div className="rounded-2xl border border-bordure bg-carte p-6 text-center">
          <div
            className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full"
            style={{ backgroundColor: contenu.couleur }}
          >
            <span className="text-2xl text-white">
              {statut === "verified" ? "\u2713" : statut === "pending" ? "\u2026" : "!"}
            </span>
          </div>
          <h1 className="mb-2 text-xl">{contenu.titre}</h1>
          <p className="text-sm text-texte2">{contenu.texte}</p>

          {/* Lien de connexion si l'utilisateur veut changer de compte */}
          <a
            href="/connexion"
            className="mt-6 inline-block text-sm font-medium"
            style={{ color: "var(--color-orange)" }}
          >
            Aller a la connexion
          </a>
        </div>
      </div>
    </div>
  );
}