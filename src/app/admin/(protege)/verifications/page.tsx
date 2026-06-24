// >>> EMPLACEMENT : src/app/admin/(protege)/verifications/page.tsx
// =========================================================================
// File de verification des artisans (ECRAN CENTRAL).
// Liste les artisans "en attente" avec toutes leurs infos + leur CNI
// (lien signe temporaire, prive). Chaque carte permet d'approuver ou rejeter.
// =========================================================================
import { createClient } from "@/lib/supabase/server";
import { CarteVerification } from "./carte-verification";

export default async function FileVerification() {
  const supabase = await createClient();

  // ===== Recuperer les artisans en attente + infos liees =====
  // NOUVEAU : on recupere aussi "bio" pour l'afficher dans le poste de controle.
  const { data: artisans } = await supabase
    .from("artisans")
    .select(
      `
      id,
      experience_years,
      bio,
      member_since,
      profiles ( name, phone ),
      artisan_trades ( trades ( name ) ),
      artisan_communes ( communes ( name ) ),
      verification_documents ( id, type, file_path, status )
    `
    )
    .eq("status", "pending")
    .order("member_since", { ascending: true });

  // ===== Generer une URL signee pour chaque CNI =====
  // Le bucket est prive : on cree un lien temporaire (valable 1h) que seul
  // l'admin recevra. La CNI n'est jamais exposee publiquement.
  const artisansAvecCni = await Promise.all(
    (artisans ?? []).map(async (a) => {
      const docs = a.verification_documents as { type: string; file_path: string }[] | null;
      const cni = docs?.find((d) => d.type === "national_id");
      let urlCni: string | null = null;
      if (cni?.file_path) {
        const { data } = await supabase.storage
          .from("national-id-documents")
          .createSignedUrl(cni.file_path, 3600);
        urlCni = data?.signedUrl ?? null;
      }
      return { artisan: a, urlCni };
    })
  );

  return (
    <div>
      <h1 className="mb-1 text-2xl">File de verification</h1>
      <p className="mb-6 text-sm text-texte2">
        Controlez chaque dossier : comparez la piece d&apos;identite aux informations
        declarees, puis approuvez ou rejetez. Approuver attribue le badge
        &laquo;&nbsp;Verifie&nbsp;&raquo; et active le profil.
      </p>

      {artisansAvecCni.length === 0 ? (
        <div className="rounded-2xl border border-bordure bg-carte p-10 text-center">
          <p className="text-texte2">
            Aucun dossier en attente. Les nouvelles inscriptions apparaitront ici.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {artisansAvecCni.map(({ artisan, urlCni }) => (
            <CarteVerification
              key={artisan.id}
              // La forme exacte des relations Supabase est large ; la carte
              // gere les deux formes (objet ou tableau) en interne.
              artisan={artisan as Parameters<typeof CarteVerification>[0]["artisan"]}
              urlCni={urlCni}
            />
          ))}
        </div>
      )}
    </div>
  );
}