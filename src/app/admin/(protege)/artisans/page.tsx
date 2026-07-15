// >>> EMPLACEMENT : src/app/admin/(protege)/artisans/page.tsx
// =========================================================================
// ADMIN — Tous les artisans, avec les actions de RECOURS.
//   - Compteurs par statut, cliquables pour filtrer (?statut=verified...).
//   - Chaque carte permet de revenir sur une decision :
//       . verifie a tort   -> annuler la verification / suspendre
//       . refuse ou suspendu (il a fait appel) -> reexaminer le dossier
//   - Toute action est tracee dans le journal d'administration.
// Composant serveur : les donnees sont lues cote serveur.
// =========================================================================

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CarteArtisan, type ArtisanAdmin } from "./carte-artisan";

// ===== Filtres proposes en haut de page =====
const FILTRES = [
  { cle: "tous", libelle: "Tous" },
  { cle: "verified", libelle: "Verifies" },
  { cle: "pending", libelle: "En attente" },
  { cle: "rejected", libelle: "Refuses" },
  { cle: "suspended", libelle: "Suspendus" },
];

export default async function AdminArtisans({
  searchParams,
}: {
  searchParams: Promise<{ statut?: string }>;
}) {
  const params = await searchParams;
  const filtre = params.statut ?? "tous";
  const supabase = await createClient();

  // ===== Lire tous les artisans =====
  const { data: lignes } = await supabase
    .from("artisans")
    .select("id, status, is_verified_badge, average_rating, review_count, job_count")
    .order("status");

  const artisansBruts = (lignes ?? []) as {
    id: string;
    status: string;
    is_verified_badge: boolean;
    average_rating: number | null;
    review_count: number | null;
    job_count: number | null;
  }[];

  // ===== Resoudre les noms et numeros =====
  const ids = artisansBruts.map((a) => a.id);
  const infos: Record<string, { name: string | null; phone: string | null }> = {};
  if (ids.length) {
    const { data: profs } = await supabase.from("profiles").select("id, name, phone").in("id", ids);
    ((profs ?? []) as { id: string; name: string | null; phone: string | null }[]).forEach((p) => {
      infos[p.id] = { name: p.name, phone: p.phone };
    });
  }

  const artisans: ArtisanAdmin[] = artisansBruts.map((a) => ({
    id: a.id,
    nom: infos[a.id]?.name ?? "Artisan",
    telephone: infos[a.id]?.phone ?? null,
    statut: a.status,
    badge: a.is_verified_badge,
    note: a.average_rating ?? 0,
    nbAvis: a.review_count ?? 0,
    nbChantiers: a.job_count ?? 0,
  }));

  // ===== Compter par statut (pour les onglets) =====
  const compte = (cle: string) =>
    cle === "tous" ? artisans.length : artisans.filter((a) => a.statut === cle).length;

  // ===== Appliquer le filtre =====
  const liste = filtre === "tous" ? artisans : artisans.filter((a) => a.statut === filtre);

  return (
    <div>
      <h1 className="mb-1 text-2xl">Artisans</h1>
      <p className="mb-6 text-sm text-texte2">
        Tous les profils, et la possibilite de revenir sur une decision.
      </p>

      {/* ===== Onglets de filtre (cliquables) ===== */}
      <div className="mb-6 flex flex-wrap gap-2">
        {FILTRES.map((f) => {
          const actif = filtre === f.cle;
          return (
            <Link
              key={f.cle}
              href={f.cle === "tous" ? "/admin/artisans" : `/admin/artisans?statut=${f.cle}`}
              className="rounded-xl border px-4 py-2 text-sm font-medium transition hover:brightness-95"
              style={{
                borderColor: actif ? "var(--color-orange)" : "var(--color-bordure)",
                background: actif ? "var(--color-secondaire)" : "var(--color-carte)",
                color: actif ? "var(--color-orange)" : "var(--color-texte2)",
              }}
            >
              {f.libelle} ({compte(f.cle)})
            </Link>
          );
        })}
      </div>

      {/* ===== Rappel du fonctionnement des recours ===== */}
      <div className="mb-6 rounded-2xl border border-bordure bg-secondaire p-5">
        <h2 className="text-base">Revenir sur une decision</h2>
        <p className="mt-1 text-sm text-texte2">
          Un artisan valide par erreur peut etre remis en file d&apos;attente ; un artisan refuse
          qui a fait appel peut etre reexamine. Chaque action demande un motif et reste tracee dans
          le journal d&apos;administration.
        </p>
      </div>

      {/* ===== Liste ===== */}
      {liste.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-bordure p-8 text-center text-sm text-texte2">
          Aucun artisan dans cette categorie.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {liste.map((a) => (
            <CarteArtisan key={a.id} artisan={a} />
          ))}
        </div>
      )}
    </div>
  );
}