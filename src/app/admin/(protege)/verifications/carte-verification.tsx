// >>> EMPLACEMENT : src/app/admin/(protege)/verifications/carte-verification.tsx
"use client";

// =========================================================================
// Carte d'un artisan a verifier — VRAI POSTE DE CONTROLE.
//   - CNI affichee en grand (cliquable pour agrandir en plein ecran)
//   - Toutes les infos declarees a cote, pour comparer avec la piece
//   - Checklist de controle pour guider l'admin
//   - Approuver / Rejeter (avec motif obligatoire)
// =========================================================================

import { useEffect, useState } from "react";
import { approuverArtisan, rejeterArtisan } from "./actions";
import { createClient } from "@/lib/supabase/client";

// ===== Type des donnees d'un artisan en attente =====
// Supabase renvoie les relations sous forme de tableaux (meme pour un
// element unique), d'ou les unions ci-dessous.
type ArtisanEnAttente = {
  id: string;
  experience_years: number | null;
  bio: string | null;
  member_since: string;
  profiles: { name: string; phone: string }[] | { name: string; phone: string } | null;
  artisan_trades: { trades: { name: string }[] | { name: string } | null }[];
  artisan_communes: { communes: { name: string }[] | { name: string } | null }[];
};

// ===== Helper : extraire un objet d'une relation (tableau ou objet) =====
function premier<T>(rel: T[] | T | null | undefined): T | null {
  if (!rel) return null;
  return Array.isArray(rel) ? rel[0] ?? null : rel;
}

export function CarteVerification({
  artisan,
  urlCni,
}: {
  artisan: ArtisanEnAttente;
  urlCni: string | null;
}) {
  const [chargement, setChargement] = useState(false);
  const [modeRejet, setModeRejet] = useState(false);
  const [motif, setMotif] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [traite, setTraite] = useState<null | "approuve" | "rejete">(null);
  // Affichage d'une photo en plein ecran ("cni" ou "selfie").
  const [cniPleinEcran, setCniPleinEcran] = useState(false);
  const [selfiePleinEcran, setSelfiePleinEcran] = useState(false);

  // ===== Photo du visage (verification renforcee) =====
  // Elle n'existe que pour les dossiers deposes depuis la mise en place du
  // controle renforce. Les anciens dossiers n'en ont pas : c'est normal.
  const [urlSelfie, setUrlSelfie] = useState<string | null>(null);
  const [selfieCherche, setSelfieCherche] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const supabase = createClient();
        const { data: doc } = await supabase
          .from("verification_documents")
          .select("file_path")
          .eq("artisan_id", artisan.id)
          .eq("type", "selfie")
          .maybeSingle();
        const chemin = (doc as { file_path: string } | null)?.file_path;
        if (chemin) {
          const { data } = await supabase.storage
            .from("national-id-documents")
            .createSignedUrl(chemin, 3600);
          setUrlSelfie(data?.signedUrl ?? null);
        }
      } catch {
        setUrlSelfie(null);
      } finally {
        setSelfieCherche(true);
      }
    })();
  }, [artisan.id]);

  const profil = premier(artisan.profiles);
  const nom = profil?.name ?? "Artisan";
  const tel = profil?.phone ?? "";
  const metiers = artisan.artisan_trades
    .map((t) => premier(t.trades)?.name)
    .filter(Boolean)
    .join(", ");
  const zones = artisan.artisan_communes
    .map((c) => premier(c.communes)?.name)
    .filter(Boolean)
    .join(", ");

  // La CNI est-elle un PDF ? (sinon on suppose une image)
  const cniEstPdf = urlCni?.toLowerCase().includes(".pdf") ?? false;

  // ===== Approuver =====
  async function onApprouver() {
    setChargement(true);
    setErreur(null);
    const res = await approuverArtisan(artisan.id);
    setChargement(false);
    if (res.ok) setTraite("approuve");
    else setErreur(res.message ?? "Action impossible.");
  }

  // ===== Rejeter (avec motif) =====
  async function onRejeter() {
    setChargement(true);
    setErreur(null);
    const res = await rejeterArtisan(artisan.id, motif);
    setChargement(false);
    if (res.ok) setTraite("rejete");
    else setErreur(res.message ?? "Action impossible.");
  }

  // ===== Apres traitement : message de confirmation =====
  if (traite) {
    return (
      <div className="rounded-2xl border border-bordure bg-carte p-5">
        <p className="text-sm">
          <strong>{nom}</strong>{" "}
          {traite === "approuve" ? (
            <span style={{ color: "var(--color-vert)" }}>a ete approuve et active.</span>
          ) : (
            <span style={{ color: "#b91c1c" }}>a ete rejete.</span>
          )}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-bordure bg-carte p-5">
      {/* En-tete : identite */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg">{nom}</h3>
          <p className="text-sm text-texte2">
            Inscrit le {new Date(artisan.member_since).toLocaleDateString("fr-FR")}
          </p>
        </div>
        <span
          className="rounded-full px-3 py-1 text-xs font-medium"
          style={{ backgroundColor: "var(--color-secondaire)", color: "var(--color-or)" }}
        >
          En attente
        </span>
      </div>

      {/* ===== Comparaison VISAGE / PIECE D IDENTITE ===== */}
      {/* C'est le controle qui bloque les usurpations : la personne sur la
          photo est-elle bien celle de la piece ? */}
      <div className="mt-4">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-texte2">
          Le visage correspond-il a la piece ?
        </p>
        <div className="grid grid-cols-2 gap-3">
          {/* --- Visage --- */}
          <div>
            {urlSelfie ? (
              <button
                type="button"
                onClick={() => setSelfiePleinEcran(true)}
                className="block w-full overflow-hidden rounded-xl border"
                style={{ borderColor: "var(--color-vert)" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={urlSelfie} alt="Visage de l'artisan" className="h-44 w-full object-cover" />
                <span className="block bg-secondaire py-1.5 text-center text-xs text-texte2">
                  Visage · agrandir
                </span>
              </button>
            ) : (
              <div className="flex h-44 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-bordure px-3 text-center text-xs text-texte2">
                {selfieCherche ? (
                  <>
                    <span className="font-medium">Pas de photo du visage</span>
                    <span>Dossier depose avant le controle renforce.</span>
                  </>
                ) : (
                  "Chargement..."
                )}
              </div>
            )}
          </div>

          {/* --- Piece d'identite (miniature de comparaison) --- */}
          <div>
            {urlCni && !cniEstPdf ? (
              <button
                type="button"
                onClick={() => setCniPleinEcran(true)}
                className="block w-full overflow-hidden rounded-xl border border-bordure"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={urlCni} alt="Piece d'identite" className="h-44 w-full object-cover" />
                <span className="block bg-secondaire py-1.5 text-center text-xs text-texte2">
                  Piece · agrandir
                </span>
              </button>
            ) : (
              <div className="flex h-44 items-center justify-center rounded-xl border border-dashed border-bordure text-xs text-texte2">
                {urlCni ? "Piece au format PDF" : "Aucune piece"}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ===== Zone de controle : CNI a gauche, infos a droite ===== */}
      <div className="mt-4 grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* --- CNI --- */}
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-texte2">
            Piece d&apos;identite (CNI)
          </p>
          {urlCni ? (
            cniEstPdf ? (
              // PDF : on ne peut pas l'afficher en image, on propose de l'ouvrir.
              <a
                href={urlCni}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-48 items-center justify-center rounded-xl border border-bordure bg-secondaire text-sm font-medium"
              >
                Ouvrir la CNI (PDF)
              </a>
            ) : (
              // Image : affichee directement, cliquable pour agrandir.
              <button
                type="button"
                onClick={() => setCniPleinEcran(true)}
                className="block w-full overflow-hidden rounded-xl border border-bordure"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={urlCni} alt="Piece d'identite" className="h-48 w-full object-cover" />
                <span className="block bg-secondaire py-1.5 text-center text-xs text-texte2">
                  Cliquer pour agrandir
                </span>
              </button>
            )
          ) : (
            <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-bordure text-sm text-texte2">
              Aucune piece fournie
            </div>
          )}
        </div>

        {/* --- Infos declarees --- */}
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-texte2">
            Informations declarees
          </p>
          <dl className="space-y-2 text-sm">
            <LigneInfo libelle="Nom" valeur={nom} />
            <LigneInfo libelle="Telephone" valeur={tel || "-"} />
            <LigneInfo libelle="Metiers" valeur={metiers || "-"} />
            <LigneInfo libelle="Zones" valeur={zones || "-"} />
            {artisan.experience_years != null && (
              <LigneInfo libelle="Experience" valeur={`${artisan.experience_years} ans`} />
            )}
          </dl>
          {artisan.bio && (
            <div className="mt-3">
              <p className="text-xs text-texte2">Description :</p>
              <p className="mt-1 rounded-lg bg-secondaire p-3 text-sm">{artisan.bio}</p>
            </div>
          )}
        </div>
      </div>

      {/* ===== Checklist de controle (aide l'admin) ===== */}
      <div className="mt-5 rounded-xl border border-bordure bg-fond p-4">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-texte2">
          A verifier avant d&apos;approuver
        </p>
        <ul className="space-y-1.5 text-sm text-texte2">
          <li>
            <strong style={{ color: "var(--color-texte)" }}>
              · Le visage correspond bien a la photo de la piece
            </strong>
          </li>
          <li>· La photo de la CNI est nette et lisible</li>
          <li>· Le nom sur la piece correspond au nom declare</li>
          <li>· La piece n&apos;est pas expiree</li>
          <li>· Les metiers et zones semblent coherents</li>
        </ul>
      </div>

      {erreur && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{erreur}</p>
      )}

      {/* ===== Actions ===== */}
      {!modeRejet ? (
        <div className="mt-5 flex gap-3">
          <button
            onClick={onApprouver}
            disabled={chargement}
            className="rounded-xl px-5 py-2.5 text-sm font-medium text-white transition hover:brightness-95 disabled:opacity-50"
            style={{ backgroundColor: "var(--color-vert)" }}
          >
            {chargement ? "..." : "Approuver"}
          </button>
          <button
            onClick={() => setModeRejet(true)}
            disabled={chargement}
            className="rounded-xl border border-bordure px-5 py-2.5 text-sm font-medium transition hover:bg-secondaire disabled:opacity-50"
          >
            Rejeter
          </button>
        </div>
      ) : (
        // ===== Sous-formulaire de rejet (motif obligatoire) =====
        <div className="mt-5">
          <textarea
            value={motif}
            onChange={(e) => setMotif(e.target.value)}
            placeholder="Motif du rejet (ex. piece d'identite illisible, nom non concordant)"
            rows={2}
            className="w-full rounded-lg border border-bordure bg-fond px-3 py-2 text-sm outline-none focus:border-orange"
          />
          <div className="mt-3 flex gap-3">
            <button
              onClick={onRejeter}
              disabled={chargement || !motif.trim()}
              className="rounded-xl px-5 py-2.5 text-sm font-medium text-white transition hover:brightness-95 disabled:opacity-50"
              style={{ backgroundColor: "#b91c1c" }}
            >
              {chargement ? "..." : "Confirmer le rejet"}
            </button>
            <button
              onClick={() => {
                setModeRejet(false);
                setMotif("");
              }}
              disabled={chargement}
              className="rounded-xl border border-bordure px-5 py-2.5 text-sm font-medium transition hover:bg-secondaire"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* ===== CNI en plein ecran (quand on clique sur l'image) ===== */}
      {cniPleinEcran && urlCni && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setCniPleinEcran(false)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={urlCni} alt="Piece d'identite agrandie" className="max-h-full max-w-full rounded-lg" />
          <button
            type="button"
            onClick={() => setCniPleinEcran(false)}
            className="absolute right-4 top-4 rounded-full bg-white/90 px-3 py-1.5 text-sm font-medium"
          >
            Fermer
          </button>
        </div>
      )}
      {/* ===== Visage en plein ecran (quand on clique sur la photo) ===== */}
      {selfiePleinEcran && urlSelfie && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setSelfiePleinEcran(false)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={urlSelfie} alt="Visage agrandi" className="max-h-full max-w-full rounded-lg" />
          <button
            type="button"
            onClick={() => setSelfiePleinEcran(false)}
            className="absolute right-4 top-4 rounded-full bg-white/90 px-3 py-1.5 text-sm font-medium"
          >
            Fermer
          </button>
        </div>
      )}
    </div>
  );
}

// ===== Ligne d'information (libelle + valeur) =====
function LigneInfo({ libelle, valeur }: { libelle: string; valeur: string }) {
  return (
    <div className="flex gap-2">
      <dt className="shrink-0 text-texte2">{libelle} :</dt>
      <dd className="font-medium">{valeur}</dd>
    </div>
  );
}