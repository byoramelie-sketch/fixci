// >>> EMPLACEMENT : src/app/client/artisans/page.tsx
// =========================================================================
// Ecran "Artisans proposes" : liste des artisans VERIFIES.
//   - Lit les artisans verifies, puis assemble pour chacun : nom (profiles),
//     metiers (artisan_trades -> trades), communes (artisan_communes -> communes),
//     note, nombre d'avis, prix minimum.
//   - Passe le tout au composant interactif ListeArtisans (filtre + tri + cartes).
// Ecran enfant (accessible depuis l'accueil) -> fleche retour en haut.
// Server Component.
// =========================================================================

import { createClient } from "@/lib/supabase/server";
import { BoutonRetour } from "@/components/icones";
import { ListeArtisans } from "./liste-artisans";

// ===== Types =====
type Metier = { slug: string; name: string };
type Commune = { id: string; name: string };
export type ArtisanCarte = {
  id: string;
  nom: string;
  note: number;
  nbAvis: number;
  prixMin: number | null;
  metiers: string[]; // noms (affichage)
  metierSlugs: string[]; // pour filtrer
  communes: string[]; // noms (affichage)
  communeIds: string[]; // pour filtrer
};

export default async function PageArtisans() {
  const supabase = await createClient();

  // ===== 1) Artisans verifies (tries par note) =====
  const { data: artisansData } = await supabase
    .from("artisans")
    .select("id, average_rating, review_count, min_price")
    .eq("status", "verified")
    .order("average_rating", { ascending: false });
  const artisans = (artisansData ?? []) as {
    id: string;
    average_rating: number | string | null;
    review_count: number | string | null;
    min_price: number | string | null;
  }[];
  const ids = artisans.map((a) => a.id);

  // ===== En-tete commun =====
  const enTete = (
    <div className="flex items-center gap-2">
      <BoutonRetour />
      <h1 className="text-xl" style={{ color: "var(--color-texte)" }}>
        Artisans proposes
      </h1>
    </div>
  );

  // ===== Aucun artisan verifie =====
  if (ids.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        {enTete}
        <p className="pt-10 text-center text-sm" style={{ color: "var(--color-texte2)" }}>
          Aucun artisan verifie pour le moment.
        </p>
      </div>
    );
  }

  // ===== 2) Noms des artisans (table profiles) =====
  const { data: profsData } = await supabase
    .from("profiles")
    .select("id, name")
    .in("id", ids);
  const nomParId = new Map<string, string>(
    (profsData ?? []).map((p: { id: string; name: string | null }): [string, string] => [
      p.id,
      p.name ?? "Artisan",
    ])
  );

  // ===== 3) Metiers de chaque artisan =====
  const { data: atData } = await supabase
    .from("artisan_trades")
    .select("artisan_id, trade_id")
    .in("artisan_id", ids);
  const { data: tradesData } = await supabase.from("trades").select("id, name, slug");
  const metierParTradeId = new Map<string, Metier>(
    (tradesData ?? []).map((t: { id: string; name: string; slug: string }): [string, Metier] => [
      t.id,
      { slug: t.slug, name: t.name },
    ])
  );

  // ===== 4) Communes de chaque artisan =====
  const { data: acData } = await supabase
    .from("artisan_communes")
    .select("artisan_id, commune_id")
    .in("artisan_id", ids);
  const { data: communesData } = await supabase.from("communes").select("id, name");
  const communeParId = new Map<string, string>(
    (communesData ?? []).map((c: { id: string; name: string }): [string, string] => [c.id, c.name])
  );

  // ===== 5) Assemblage des cartes =====
  const cartes: ArtisanCarte[] = artisans.map((a) => {
    // metiers de cet artisan
    const sesTrades = (atData ?? [])
      .filter((x: { artisan_id: string; trade_id: string }) => x.artisan_id === a.id)
      .map((x: { artisan_id: string; trade_id: string }) => metierParTradeId.get(x.trade_id))
      .filter((m): m is Metier => Boolean(m));
    // communes de cet artisan
    const sesCommunes = (acData ?? [])
      .filter((x: { artisan_id: string; commune_id: string }) => x.artisan_id === a.id)
      .map((x: { artisan_id: string; commune_id: string }) => ({
        id: x.commune_id,
        name: communeParId.get(x.commune_id),
      }))
      .filter((c): c is { id: string; name: string } => Boolean(c.name));

    return {
      id: a.id,
      nom: nomParId.get(a.id) ?? "Artisan",
      note: Number(a.average_rating) || 0,
      nbAvis: Number(a.review_count) || 0,
      prixMin: a.min_price != null ? Number(a.min_price) : null,
      metiers: sesTrades.map((m) => m.name),
      metierSlugs: sesTrades.map((m) => m.slug),
      communes: sesCommunes.map((c) => c.name),
      communeIds: sesCommunes.map((c) => c.id),
    };
  });

  // ===== Listes pour les menus de filtre =====
  const tousMetiers = (tradesData ?? []).map(
    (t: { name: string; slug: string }): Metier => ({ slug: t.slug, name: t.name })
  );
  const toutesCommunes = (communesData ?? []).map(
    (c: { id: string; name: string }): Commune => ({ id: c.id, name: c.name })
  );

  return (
    <div className="flex flex-col gap-4">
      {enTete}
      <ListeArtisans artisans={cartes} metiers={tousMetiers} communes={toutesCommunes} />
    </div>
  );
}