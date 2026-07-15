// >>> EMPLACEMENT : src/app/artisan/verification/page.tsx
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { FiletTricolore, Logo } from "@/components/ui";
import type { ArtisanStatus } from "@/lib/types";
import { RenvoyerDossier } from "./renvoyer";

// =========================================================================
// Ecran "Statut de verification" (cahier des charges A2).
//   En attente -> orange. Verifie -> vert + badge. Refuse/suspendu -> motif.
//
//   RECOURS pour l'artisan dont le dossier n'est pas passe :
//     - il voit le MOTIF exact du refus,
//     - il peut RENVOYER ses documents corriges (dossier refuse),
//     - il peut FAIRE APPEL par WhatsApp ou e-mail (refuse ou suspendu).
// =========================================================================

// >>> A REMPLACER par les vraies coordonnees du support FixCI :
//   - numero WhatsApp au format international SANS "+" (Cote d'Ivoire : 225XXXXXXXXXX)
const SUPPORT_WHATSAPP = "2250700000000";
const SUPPORT_EMAIL = "support@fixci.ci";

export default async function VerificationArtisan() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  // Statut, nom, et motif du refus (s'il y en a un) — en parallele.
  const [artisanRes, profilRes, docRes] = await Promise.all([
    supabase.from("artisans").select("status").eq("id", user.id).single(),
    supabase.from("profiles").select("name").eq("id", user.id).single(),
    supabase
      .from("verification_documents")
      .select("rejection_reason, status")
      .eq("artisan_id", user.id)
      .order("reviewed_at", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const nom: string = profilRes.data?.name ?? "";
  const statut: ArtisanStatus = artisanRes.data?.status ?? "pending";
  const motifRefus: string | null = docRes.data?.rejection_reason ?? null;

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
      titre: "Dossier refuse",
      texte:
        "Votre dossier n'a pas pu etre valide. Corrigez ce qui est indique ci-dessous puis renvoyez-le : notre equipe le reexaminera.",
    },
    suspended: {
      couleur: "#b91c1c",
      titre: "Profil suspendu",
      texte:
        "Votre profil est temporairement suspendu. Si vous pensez qu'il s'agit d'une erreur, faites appel ci-dessous.",
    },
  }[statut];

  // Le renvoi du dossier n'est possible qu'apres un REFUS.
  const peutRenvoyer = statut === "rejected";
  // Faire appel : possible en cas de refus ou de suspension.
  const peutFaireAppel = statut === "rejected" || statut === "suspended";

  // Message d'appel pre-rempli (WhatsApp + e-mail).
  const messageAppel =
    `Bonjour, je suis ${nom || "un artisan"} sur FixCI. ` +
    `Mon dossier a ete ${statut === "suspended" ? "suspendu" : "refuse"} et je souhaite faire appel de cette decision. ` +
    `Pouvez-vous m'indiquer ce qui doit etre corrige ? Merci.`;
  const lienWhatsApp = `https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(messageAppel)}`;
  const lienEmail =
    `mailto:${SUPPORT_EMAIL}` +
    `?subject=${encodeURIComponent("Appel - dossier artisan")}` +
    `&body=${encodeURIComponent(messageAppel)}`;

  return (
    <div className="min-h-screen bg-fond">
      <FiletTricolore />
      <div className="mx-auto max-w-md px-5 py-6">
        <header className="mb-10">
          <Logo />
        </header>

        <div className="rounded-2xl border border-bordure bg-carte p-6 text-center">
          {/* Pastille de statut */}
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

          {/* ===== Motif exact du refus ===== */}
          {statut === "rejected" && motifRefus && (
            <div
              className="mt-4 rounded-xl border p-3 text-left"
              style={{ borderColor: "#b91c1c", background: "rgba(185,28,28,0.06)" }}
            >
              <p className="text-xs font-semibold" style={{ color: "#b91c1c" }}>
                Ce qui doit etre corrige
              </p>
              <p className="mt-1 text-sm" style={{ color: "var(--color-texte)" }}>
                {motifRefus}
              </p>
            </div>
          )}

          {/* ===== Renvoyer son dossier corrige ===== */}
          {peutRenvoyer && (
            <div className="mt-5 border-t border-bordure pt-5">
              <p className="mb-3 text-left text-sm font-medium">Completer mon dossier</p>
              <RenvoyerDossier artisanId={user.id} />
            </div>
          )}

          {/* ===== Faire appel aupres du support ===== */}
          {peutFaireAppel && (
            <div className="mt-5 border-t border-bordure pt-5 text-left">
              <p className="mb-1 text-sm font-medium">
                {peutRenvoyer ? "Un doute, ou c'est une erreur ?" : "Vous pensez que c'est une erreur ?"}
              </p>
              <p className="mb-3 text-sm text-texte2">
                Contactez notre equipe : elle reexaminera votre dossier.
              </p>
              <div className="flex flex-col gap-2">
                <a
                  href={lienWhatsApp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl py-3 text-center text-sm font-semibold text-white transition hover:brightness-95"
                  style={{ backgroundColor: "var(--color-vert)" }}
                >
                  Faire appel sur WhatsApp
                </a>
                <a
                  href={lienEmail}
                  className="rounded-xl border py-3 text-center text-sm font-medium transition hover:brightness-95"
                  style={{ borderColor: "var(--color-bordure)", color: "var(--color-texte)" }}
                >
                  Faire appel par e-mail
                </a>
              </div>
            </div>
          )}

          {/* Aller a son espace (une fois verifie) */}
          {statut === "verified" && (
            <a
              href="/artisan"
              className="mt-6 inline-block rounded-xl px-5 py-2.5 text-sm font-semibold text-white"
              style={{ backgroundColor: "var(--color-orange)" }}
            >
              Aller a mon espace
            </a>
          )}

          {/* Lien de connexion si l'utilisateur veut changer de compte */}
          <a
            href="/connexion"
            className="mt-6 block text-sm font-medium"
            style={{ color: "var(--color-orange)" }}
          >
            Aller a la connexion
          </a>
        </div>
      </div>
    </div>
  );
}