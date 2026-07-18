// >>> EMPLACEMENT : src/app/client/mes-demandes/page.tsx
// =========================================================================
// Onglet "Mes demandes" : liste des demandes du client connecte.
//   - Lit ses lignes dans `service_requests` (les plus recentes d'abord).
//   - Recupere le nom du metier de chaque demande via `trades`.
//   - Une carte par demande (service, statut, lieu, urgence, date, description).
//   - RAPPEL D'AVIS : un bandeau en tete tant qu'il reste des interventions
//     terminees non notees, et une pastille sur les cartes concernees.
//     Il disparait tout seul des que l'avis est laisse.
//   - Etat vide si aucune demande, avec un bouton pour en creer une.
// Onglet principal -> pas de fleche retour, la barre du bas suffit.
// Server Component.
// =========================================================================

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

// Donnees specifiques a l'utilisateur et changeantes (statuts, nouvelles
// demandes) : on force un rendu frais a chaque visite (pas de cache).
export const dynamic = "force-dynamic";

// ===== Type d'une demande (colonnes lues) =====
type Demande = {
  id: string;
  description: string | null;
  status: string;
  urgency: string | null;
  neighborhood: string | null;
  created_at: string;
  trade_id: string;
};

// ===== Libelle + couleur par statut (enum request_status) =====
const STATUTS: Record<string, { libelle: string; couleur: string }> = {
  new: { libelle: "Nouvelle", couleur: "var(--color-texte2)" },
  quote_in_progress: { libelle: "Devis en cours", couleur: "var(--color-or)" },
  quote_accepted: { libelle: "Devis accepte", couleur: "var(--color-orange)" },
  en_route: { libelle: "En route", couleur: "var(--color-orange)" },
  completed: { libelle: "Terminee", couleur: "var(--color-vert)" },
  validated: { libelle: "Validee", couleur: "var(--color-vert)" },
  cancelled: { libelle: "Annulee", couleur: "var(--color-texte2)" },
  disputed: { libelle: "Litige", couleur: "var(--color-orange)" },
};

// ===== Libelle par niveau d'urgence (enum urgency_level) =====
const URGENCES: Record<string, string> = {
  urgent: "Urgent",
  today: "Aujourd'hui",
  this_week: "Cette semaine",
};

// ===== Mise en forme courte de la date =====
function dateCourte(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default async function MesDemandes() {
  const supabase = await createClient();

  // ===== Utilisateur connecte =====
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return (
      <p className="pt-10 text-center text-sm" style={{ color: "var(--color-texte2)" }}>
        Veuillez vous connecter pour voir vos demandes.
      </p>
    );
  }

  // ===== Tout charger EN PARALLELE =====
  //   - ses demandes,
  //   - les noms des metiers,
  //   - ses chantiers termines (pour savoir ce qu'il reste a noter),
  //   - les avis qu'il a deja laisses.
  const [demandesRes, tradesRes, jobsRes, avisRes] = await Promise.all([
    supabase
      .from("service_requests")
      .select("id, description, status, urgency, neighborhood, created_at, trade_id")
      .eq("client_id", user.id)
      .order("created_at", { ascending: false }),
    supabase.from("trades").select("id, name"),
    supabase
      .from("jobs")
      .select("id, request_id")
      .eq("client_id", user.id)
      .eq("status", "validated"),
    supabase
      .from("reviews")
      .select("job_id")
      .eq("author_id", user.id)
      .eq("direction", "client_to_artisan"),
  ]);

  if (demandesRes.error) {
    return (
      <p className="pt-10 text-center text-sm" style={{ color: "var(--color-texte2)" }}>
        Impossible de charger vos demandes pour le moment.
      </p>
    );
  }

  const demandes = (demandesRes.data ?? []) as Demande[];
  const nomParTrade = new Map<string, string>(
    (tradesRes.data ?? []).map((t: { id: string; name: string }): [string, string] => [t.id, t.name])
  );

  // ===== Ce qu'il reste a noter =====
  // Un chantier valide dont je n'ai pas encore laisse d'avis.
  const dejaNotes = new Set(
    ((avisRes.data ?? []) as { job_id: string }[]).map((a) => a.job_id)
  );
  const aNoter = ((jobsRes.data ?? []) as { id: string; request_id: string }[]).filter(
    (j) => !dejaNotes.has(j.id)
  );
  const demandesANoter = new Set(aNoter.map((j) => j.request_id));

  return (
    <div className="flex flex-col gap-5">
      {/* ===== Titre ===== */}
      <h1 className="text-xl" style={{ color: "var(--color-texte)" }}>
        Mes demandes
      </h1>

      {/* ===== Rappel d'avis : reste tant qu'il y a quelque chose a noter ===== */}
      {aNoter.length > 0 && (
        <Link
          href={`/client/mes-demandes/detail?id=${aNoter[0].request_id}`}
          className="flex items-center gap-3 rounded-xl border p-4 transition hover:brightness-95"
          style={{ borderColor: "var(--color-or)", background: "var(--color-secondaire)" }}
        >
          {/* Etoile */}
          <svg
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="shrink-0"
            style={{ color: "var(--color-or)" }}
          >
            <path d="M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.2l5.9-.9z" />
          </svg>
          <span className="flex-1">
            <span className="block text-sm font-semibold" style={{ color: "var(--color-texte)" }}>
              {aNoter.length === 1
                ? "1 intervention a noter"
                : `${aNoter.length} interventions a noter`}
            </span>
            <span className="block text-xs" style={{ color: "var(--color-texte2)" }}>
              Votre avis aide les habitants d&apos;Abidjan a choisir en confiance.
            </span>
          </span>
          <span className="shrink-0 text-sm font-semibold" style={{ color: "var(--color-or)" }}>
            Noter →
          </span>
        </Link>
      )}

      {/* ===== Etat vide ===== */}
      {demandes.length === 0 && (
        <div className="flex flex-col items-center gap-3 pt-8 text-center">
          <p className="text-sm" style={{ color: "var(--color-texte2)" }}>
            Vous n&apos;avez pas encore fait de demande.
          </p>
          <Link
            href="/client/demander"
            className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white"
            style={{ background: "var(--color-orange)" }}
          >
            Faire une demande
          </Link>
        </div>
      )}

      {/* ===== Liste des demandes (grille : 1 col. telephone, 2-3 col. grand ecran) ===== */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {demandes.map((d) => {
          const statut = STATUTS[d.status] ?? { libelle: d.status, couleur: "var(--color-texte2)" };
          const service = nomParTrade.get(d.trade_id) ?? "Service";
          // Cette demande attend-elle un avis de ma part ?
          const attendAvis = demandesANoter.has(d.id);
          return (
            <Link
              key={d.id}
              href={`/client/mes-demandes/detail?id=${d.id}`}
              className="flex flex-col gap-2 rounded-xl border p-4 transition hover:brightness-95"
              style={{
                background: "var(--color-carte)",
                borderColor: attendAvis ? "var(--color-or)" : "var(--color-bordure)",
              }}
            >
              {/* En-tete : service + statut */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold" style={{ color: "var(--color-texte)" }}>
                  {service}
                </span>
                <span
                  className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                  style={{ color: statut.couleur, background: "var(--color-secondaire)" }}
                >
                  {statut.libelle}
                </span>
              </div>

              {/* Description (si presente) */}
              {d.description && (
                <p className="line-clamp-2 text-sm" style={{ color: "var(--color-texte2)" }}>
                  {d.description}
                </p>
              )}

              {/* Lieu, urgence, date */}
              <div
                className="flex flex-wrap gap-x-3 gap-y-1 text-xs"
                style={{ color: "var(--color-texte2)" }}
              >
                {d.neighborhood && <span>{d.neighborhood}</span>}
                {d.urgency && <span>{URGENCES[d.urgency] ?? d.urgency}</span>}
                <span>{dateCourte(d.created_at)}</span>
              </div>

              {/* Invite a ouvrir le detail : noter en priorite, sinon voir les offres */}
              {attendAvis ? (
                <span
                  className="inline-flex items-center gap-1 text-sm font-semibold"
                  style={{ color: "var(--color-or)" }}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="shrink-0"
                  >
                    <path d="M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.2l5.9-.9z" />
                  </svg>
                  Laisser un avis
                </span>
              ) : (
                <span className="text-sm font-semibold" style={{ color: "var(--color-orange)" }}>
                  Voir les offres
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}