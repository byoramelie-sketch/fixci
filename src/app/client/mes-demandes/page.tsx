// >>> EMPLACEMENT : src/app/client/mes-demandes/page.tsx
// =========================================================================
// Onglet "Mes demandes" : liste des demandes du client connecte.
//   - Lit ses lignes dans `service_requests` (les plus recentes d'abord).
//   - Recupere le nom du metier de chaque demande via `trades`.
//   - Une carte par demande (service, statut, lieu, urgence, date, description).
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

  // ===== Demandes du client (recentes d'abord) =====
  const { data: demandesData, error } = await supabase
    .from("service_requests")
    .select("id, description, status, urgency, neighborhood, created_at, trade_id")
    .eq("client_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <p className="pt-10 text-center text-sm" style={{ color: "var(--color-texte2)" }}>
        Impossible de charger vos demandes pour le moment.
      </p>
    );
  }

  const demandes = (demandesData ?? []) as Demande[];

  // ===== Noms des metiers (pour afficher le service de chaque demande) =====
  const { data: tradesData } = await supabase.from("trades").select("id, name");
  const nomParTrade = new Map<string, string>(
    (tradesData ?? []).map((t: { id: string; name: string }): [string, string] => [t.id, t.name])
  );

  return (
    <div className="flex flex-col gap-5">
      {/* ===== Titre ===== */}
      <h1 className="text-xl" style={{ color: "var(--color-texte)" }}>
        Mes demandes
      </h1>

      {/* ===== Etat vide ===== */}
      {demandes.length === 0 && (
        <div className="flex flex-col items-center gap-3 pt-8 text-center">
          <p className="text-sm" style={{ color: "var(--color-texte2)" }}>
            Vous n'avez pas encore fait de demande.
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
        return (
          <Link
            key={d.id}
            href={`/client/mes-demandes/detail?id=${d.id}`}
            className="flex flex-col gap-2 rounded-xl border p-4 transition hover:brightness-95"
            style={{ background: "var(--color-carte)", borderColor: "var(--color-bordure)" }}
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

            {/* Invite a ouvrir le detail (voir les offres) */}
            <span className="text-sm font-semibold" style={{ color: "var(--color-orange)" }}>
              Voir les offres
            </span>
          </Link>
        );
      })}
      </div>
    </div>
  );
}