// >>> EMPLACEMENT : src/app/client/artisans/profil/page.tsx
// =========================================================================
// Profil public detaille d'un artisan (vu par le client).
//   - L'artisan est identifie par ?id=... dans l'adresse.
//   - Affiche : nom + badge verifie, note/avis, metiers, communes couvertes,
//     experience, delai de reponse, prix minimum, presentation (bio),
//     specialites, et la GALERIE de realisations (artisans.gallery).
//   - En bas : pour chaque metier de l'artisan, un bouton "Demander" qui ouvre
//     le formulaire pre-rempli en rattachant la demande a CET artisan
//     (.../formulaire?service=<slug>&artisan=<id>).
// Ecran enfant -> fleche retour en haut. Server Component.
// =========================================================================

import Link from "next/link";
import {
  BoutonRetour,
  IconeCheck,
  IconeLieu,
  IconeAvis,
  IconeMessage,
  IconeOutils,
} from "@/components/icones";
import { createClient } from "@/lib/supabase/server";

// ===== Types =====
type Metier = { slug: string; name: string };

// ===== Initiales a partir du nom (ex : "Konan Kouassi" -> "KK") =====
function initiales(nom: string) {
  const mots = nom.trim().split(/\s+/).filter(Boolean);
  return mots.slice(0, 2).map((m) => m[0] ?? "").join("").toUpperCase() || "?";
}

// ===== Prix lisible (10000 -> "10 000 FCFA") =====
function prixLisible(p: number) {
  return p.toLocaleString("fr-FR") + " FCFA";
}

// ===== Delai de reponse lisible (90 -> "1 h 30", 45 -> "45 min") =====
function delaiLisible(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${m}`;
}

export default async function PageProfilArtisan({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  const supabase = await createClient();

  // ===== En-tete commun (avec fleche retour) =====
  const enTete = (
    <div className="flex items-center gap-2">
      <BoutonRetour />
      <h1 className="text-xl" style={{ color: "var(--color-texte)" }}>
        Profil de l'artisan
      </h1>
    </div>
  );

  // ===== Garde : pas d'identifiant =====
  if (!id) {
    return (
      <div className="flex flex-col gap-4">
        {enTete}
        <p className="pt-10 text-center text-sm" style={{ color: "var(--color-texte2)" }}>
          Artisan introuvable.
        </p>
      </div>
    );
  }

  // ===== 1) Donnees de l'artisan (uniquement si verifie) =====
  const { data: artisanData } = await supabase
    .from("artisans")
    .select(
      "id, bio, average_rating, review_count, job_count, experience_years, average_response_minutes, gallery, min_price, specialties, member_since, status"
    )
    .eq("id", id)
    .eq("status", "verified")
    .single();

  const artisan = (artisanData ?? null) as {
    id: string;
    bio: string | null;
    average_rating: number | string | null;
    review_count: number | string | null;
    job_count: number | string | null;
    experience_years: number | string | null;
    average_response_minutes: number | string | null;
    gallery: string[] | null;
    min_price: number | string | null;
    specialties: string | null;
    member_since: string | null;
  } | null;

  // ===== Artisan inexistant ou non verifie =====
  if (!artisan) {
    return (
      <div className="flex flex-col gap-4">
        {enTete}
        <p className="pt-10 text-center text-sm" style={{ color: "var(--color-texte2)" }}>
          Cet artisan n'est pas disponible.
        </p>
      </div>
    );
  }

  // ===== 2) Nom + photo (table profiles) =====
  const { data: prof } = await supabase
    .from("profiles")
    .select("name, photo_url")
    .eq("id", id)
    .single();
  const nom = ((prof?.name as string | null) ?? "Artisan") || "Artisan";
  const photoUrl = (prof?.photo_url as string | null) ?? null;

  // ===== 3) Metiers de l'artisan =====
  const { data: atData } = await supabase
    .from("artisan_trades")
    .select("trade_id")
    .eq("artisan_id", id);
  const tradeIds = (atData ?? []).map((x: { trade_id: string }) => x.trade_id);

  let metiers: Metier[] = [];
  if (tradeIds.length > 0) {
    const { data: tradesData } = await supabase
      .from("trades")
      .select("id, name, slug")
      .in("id", tradeIds);
    metiers = (tradesData ?? []).map(
      (t: { name: string; slug: string }): Metier => ({ slug: t.slug, name: t.name })
    );
  }

  // ===== 4) Communes couvertes =====
  const { data: acData } = await supabase
    .from("artisan_communes")
    .select("commune_id")
    .eq("artisan_id", id);
  const communeIds = (acData ?? []).map((x: { commune_id: string }) => x.commune_id);

  let communes: string[] = [];
  if (communeIds.length > 0) {
    const { data: communesData } = await supabase
      .from("communes")
      .select("id, name")
      .in("id", communeIds);
    communes = (communesData ?? []).map((c: { name: string }) => c.name);
  }

  // ===== Valeurs derivees =====
  const note = Number(artisan.average_rating) || 0;
  const nbAvis = Number(artisan.review_count) || 0;
  const nbJobs = Number(artisan.job_count) || 0;
  const annees = artisan.experience_years != null ? Number(artisan.experience_years) : null;
  const reponseMin =
    artisan.average_response_minutes != null ? Number(artisan.average_response_minutes) : null;
  const prixMin = artisan.min_price != null ? Number(artisan.min_price) : null;
  const galerie = (artisan.gallery ?? []).filter((u) => typeof u === "string" && u.length > 0);

  return (
    <div className="flex flex-col gap-5">
      {enTete}

      {/* ===== Bandeau identite ===== */}
      <div
        className="flex flex-col gap-3 rounded-xl border p-4"
        style={{ background: "var(--color-carte)", borderColor: "var(--color-bordure)" }}
      >
        <div className="flex items-start gap-3">
          {/* Photo ou pastille d'initiales */}
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoUrl}
              alt={nom}
              className="h-16 w-16 shrink-0 rounded-full object-cover"
            />
          ) : (
            <div
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-xl font-semibold text-white"
              style={{ background: "var(--color-orange)" }}
            >
              {initiales(nom)}
            </div>
          )}

          <div className="flex flex-1 flex-col gap-1">
            {/* Nom + badge verifie */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-lg font-semibold" style={{ color: "var(--color-texte)" }}>
                {nom}
              </span>
              <span
                className="flex items-center gap-0.5 text-xs"
                style={{ color: "var(--color-vert)" }}
              >
                <IconeCheck taille={14} />
                Verifie
              </span>
            </div>

            {/* Metiers */}
            {metiers.length > 0 && (
              <span className="text-sm" style={{ color: "var(--color-texte2)" }}>
                {metiers.map((m) => m.name).join(", ")}
              </span>
            )}

            {/* Note / avis */}
            <div className="flex items-center gap-1 text-sm">
              {nbAvis > 0 ? (
                <>
                  <span style={{ color: "var(--color-texte)" }}>{note.toFixed(1)}</span>
                  <span style={{ color: "var(--color-or)" }}>★</span>
                  <span style={{ color: "var(--color-texte2)" }}>({nbAvis} avis)</span>
                </>
              ) : (
                <span
                  className="rounded-full px-2 py-0.5 text-xs"
                  style={{ background: "var(--color-secondaire)", color: "var(--color-texte2)" }}
                >
                  Nouveau sur FixCI
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Communes couvertes */}
        {communes.length > 0 && (
          <span
            className="flex items-center gap-1 text-sm"
            style={{ color: "var(--color-texte2)" }}
          >
            <IconeLieu taille={16} />
            {communes.join(", ")}
          </span>
        )}
      </div>

      {/* ===== Chiffres cles ===== */}
      <div className="grid grid-cols-3 gap-2">
        {/* Experience */}
        <div
          className="flex flex-col items-center gap-1 rounded-xl border p-3 text-center"
          style={{ background: "var(--color-carte)", borderColor: "var(--color-bordure)" }}
        >
          <IconeOutils taille={18} />
          <span className="text-sm font-semibold" style={{ color: "var(--color-texte)" }}>
            {annees != null ? `${annees} an${annees > 1 ? "s" : ""}` : "—"}
          </span>
          <span className="text-xs" style={{ color: "var(--color-texte2)" }}>
            experience
          </span>
        </div>
        {/* Travaux realises */}
        <div
          className="flex flex-col items-center gap-1 rounded-xl border p-3 text-center"
          style={{ background: "var(--color-carte)", borderColor: "var(--color-bordure)" }}
        >
          <IconeAvis taille={18} />
          <span className="text-sm font-semibold" style={{ color: "var(--color-texte)" }}>
            {nbJobs}
          </span>
          <span className="text-xs" style={{ color: "var(--color-texte2)" }}>
            travaux
          </span>
        </div>
        {/* Delai de reponse */}
        <div
          className="flex flex-col items-center gap-1 rounded-xl border p-3 text-center"
          style={{ background: "var(--color-carte)", borderColor: "var(--color-bordure)" }}
        >
          <IconeMessage taille={18} />
          <span className="text-sm font-semibold" style={{ color: "var(--color-texte)" }}>
            {reponseMin != null ? delaiLisible(reponseMin) : "—"}
          </span>
          <span className="text-xs" style={{ color: "var(--color-texte2)" }}>
            reponse
          </span>
        </div>
      </div>

      {/* ===== Prix minimum ===== */}
      {prixMin != null && (
        <div
          className="rounded-xl border p-4"
          style={{ background: "var(--color-secondaire)", borderColor: "var(--color-bordure)" }}
        >
          <span className="text-sm" style={{ color: "var(--color-texte2)" }}>
            Tarif a partir de{" "}
          </span>
          <span className="text-base font-semibold" style={{ color: "var(--color-texte)" }}>
            {prixLisible(prixMin)}
          </span>
        </div>
      )}

      {/* ===== Presentation (bio) ===== */}
      {artisan.bio && (
        <div className="flex flex-col gap-1.5">
          <h2 className="text-base" style={{ color: "var(--color-texte)" }}>
            Presentation
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: "var(--color-texte2)" }}>
            {artisan.bio}
          </p>
        </div>
      )}

      {/* ===== Specialites ===== */}
      {artisan.specialties && (
        <div className="flex flex-col gap-1.5">
          <h2 className="text-base" style={{ color: "var(--color-texte)" }}>
            Specialites
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: "var(--color-texte2)" }}>
            {artisan.specialties}
          </p>
        </div>
      )}

      {/* ===== Galerie de realisations ===== */}
      {galerie.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-base" style={{ color: "var(--color-texte)" }}>
            Realisations
          </h2>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
            {galerie.map((url, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={url}
                alt={`Realisation ${i + 1}`}
                className="aspect-square w-full rounded-lg border object-cover"
                style={{ borderColor: "var(--color-bordure)" }}
              />
            ))}
          </div>
        </div>
      )}

      {/* ===== Appel a l'action : demander a cet artisan ===== */}
      <div
        className="flex flex-col gap-2 rounded-xl border p-4"
        style={{ background: "var(--color-carte)", borderColor: "var(--color-bordure)" }}
      >
        <span className="text-base" style={{ color: "var(--color-texte)" }}>
          Demander a cet artisan
        </span>

        {metiers.length > 0 ? (
          <>
            <span className="text-xs" style={{ color: "var(--color-texte2)" }}>
              Choisissez le service souhaite. Votre demande lui sera adressee en priorite.
            </span>
            <div className="flex flex-col gap-2 pt-1">
              {metiers.map((m) => (
                <Link
                  key={m.slug}
                  href={`/client/demander/formulaire?service=${m.slug}&artisan=${id}`}
                  className="rounded-xl px-4 py-3 text-center text-sm font-semibold text-white"
                  style={{ background: "var(--color-orange)" }}
                >
                  Demander : {m.name}
                </Link>
              ))}
            </div>
          </>
        ) : (
          <>
            <span className="text-xs" style={{ color: "var(--color-texte2)" }}>
              Cet artisan n'a pas encore renseigne ses services.
            </span>
            <Link
              href="/client/demander"
              className="rounded-xl px-4 py-3 text-center text-sm font-semibold"
              style={{
                background: "var(--color-secondaire)",
                color: "var(--color-texte)",
              }}
            >
              Voir tous les services
            </Link>
          </>
        )}
      </div>
    </div>
  );
}