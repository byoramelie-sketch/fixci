// >>> EMPLACEMENT : src/app/admin/(protege)/artisans/carte-artisan.tsx
"use client";

// =========================================================================
// Carte d'un artisan cote admin, avec les actions de RECOURS :
//   - Artisan VERIFIE   -> "Annuler la verification" (valide a tort) ou
//                          "Suspendre" (probleme avere)
//   - Artisan REFUSE / SUSPENDU -> "Reexaminer le dossier" (il a fait appel)
//   - Artisan EN ATTENTE -> renvoi vers la file de verification
// Chaque action demande un motif obligatoire, et est tracee dans le journal.
// =========================================================================

import { useState } from "react";
import Link from "next/link";
import {
  annulerVerification,
  suspendreArtisan,
  reexaminerArtisan,
} from "../verifications/actions";

export type ArtisanAdmin = {
  id: string;
  nom: string;
  telephone: string | null;
  statut: string;
  badge: boolean;
  note: number;
  nbAvis: number;
  nbChantiers: number;
};

// ===== Apparence de chaque statut =====
const STATUTS: Record<string, { libelle: string; couleur: string; fond: string }> = {
  verified: { libelle: "Verifie", couleur: "var(--color-vert)", fond: "rgba(76,140,90,0.12)" },
  pending: { libelle: "En attente", couleur: "var(--color-or)", fond: "var(--color-secondaire)" },
  rejected: { libelle: "Refuse", couleur: "#b91c1c", fond: "rgba(185,28,28,0.08)" },
  suspended: { libelle: "Suspendu", couleur: "#b91c1c", fond: "rgba(185,28,28,0.08)" },
};

// ===== Initiales (ex : "Konan Kouassi" -> "KK") =====
function initiales(nom: string) {
  return (
    nom
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((m) => m[0] ?? "")
      .join("")
      .toUpperCase() || "?"
  );
}

type Recours = "annuler" | "suspendre" | "reexaminer";

export function CarteArtisan({ artisan }: { artisan: ArtisanAdmin }) {
  const [mode, setMode] = useState<Recours | null>(null);
  const [motif, setMotif] = useState("");
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState<string | null>(null);

  const st = STATUTS[artisan.statut] ?? STATUTS.pending;

  // ===== Lancer l'action de recours choisie =====
  async function confirmer() {
    if (!mode) return;
    if (!motif.trim()) {
      setErreur("Le motif est obligatoire.");
      return;
    }
    setChargement(true);
    setErreur(null);
    try {
      const action =
        mode === "annuler"
          ? annulerVerification
          : mode === "suspendre"
            ? suspendreArtisan
            : reexaminerArtisan;
      const res = await action(artisan.id, motif.trim());
      if (!res.ok) {
        setErreur(res.message ?? "Action impossible.");
        return;
      }
      setFait(
        mode === "annuler"
          ? "Verification annulee. Le dossier repart en file d'attente."
          : mode === "suspendre"
            ? "Artisan suspendu."
            : "Dossier remis en file de verification."
      );
      setMode(null);
      setMotif("");
    } catch {
      setErreur("Action impossible. Reessayez.");
    } finally {
      setChargement(false);
    }
  }

  // ===== Texte d'explication selon l'action choisie =====
  const explication: Record<Recours, string> = {
    annuler:
      "L'artisan perd son badge et repart en file d'attente. Il ne sera plus visible des clients tant qu'il n'est pas revalide.",
    suspendre:
      "Le profil est bloque et le badge retire. A reserver aux problemes averes (fraude, plaintes graves).",
    reexaminer:
      "Le dossier est remis en file de verification, sans le motif de refus precedent. A utiliser quand l'artisan a fait appel.",
  };

  return (
    <div className="rounded-2xl border border-bordure bg-carte p-5">
      {/* ===== En-tete : identite + statut ===== */}
      <div className="flex items-start gap-3">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
          style={{ background: "var(--color-or)" }}
        >
          {initiales(artisan.nom)}
        </div>
        <div className="flex-1">
          <p className="font-medium text-texte">{artisan.nom}</p>
          <p className="text-xs text-texte2">{artisan.telephone ?? "Numero non renseigne"}</p>
        </div>
        <span
          className="shrink-0 rounded-full px-2.5 py-1 text-xs font-medium"
          style={{ color: st.couleur, background: st.fond }}
        >
          {st.libelle}
        </span>
      </div>

      {/* ===== Quelques chiffres ===== */}
      <div className="mt-3 flex gap-4 border-t border-bordure pt-3 text-xs text-texte2">
        <span>
          {artisan.nbAvis > 0 ? (
            <>
              <span className="font-medium text-texte">{artisan.note.toFixed(1)}</span> ★ ·{" "}
              {artisan.nbAvis} avis
            </>
          ) : (
            "Aucun avis"
          )}
        </span>
        <span>{artisan.nbChantiers} chantier{artisan.nbChantiers > 1 ? "s" : ""}</span>
      </div>

      {/* ===== Message de confirmation ===== */}
      {fait && (
        <p
          className="mt-3 rounded-lg px-3 py-2 text-xs"
          style={{ background: "rgba(76,140,90,0.12)", color: "var(--color-vert)" }}
        >
          {fait} Rafraichissez pour voir le nouveau statut.
        </p>
      )}
      {erreur && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{erreur}</p>
      )}

      {/* ===== Formulaire de motif (quand une action est choisie) ===== */}
      {mode && (
        <div className="mt-3 rounded-xl border border-bordure bg-fond p-3">
          <p className="mb-2 text-xs text-texte2">{explication[mode]}</p>
          <textarea
            className="w-full rounded-lg border border-bordure bg-carte px-3 py-2 text-sm outline-none"
            rows={2}
            value={motif}
            onChange={(e) => {
              setMotif(e.target.value);
              if (erreur) setErreur(null);
            }}
            placeholder="Motif (obligatoire) — il sera trace dans le journal"
          />
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => {
                setMode(null);
                setMotif("");
                setErreur(null);
              }}
              disabled={chargement}
              className="flex-1 rounded-lg border border-bordure py-2 text-xs font-medium disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={confirmer}
              disabled={chargement}
              className="flex-1 rounded-lg py-2 text-xs font-semibold text-white disabled:opacity-50"
              style={{ background: mode === "reexaminer" ? "var(--color-vert)" : "#b91c1c" }}
            >
              {chargement ? "En cours..." : "Confirmer"}
            </button>
          </div>
        </div>
      )}

      {/* ===== Boutons d'action (selon le statut) ===== */}
      {!mode && !fait && (
        <div className="mt-3 flex flex-wrap gap-2">
          {artisan.statut === "verified" && (
            <>
              <button
                type="button"
                onClick={() => setMode("annuler")}
                className="rounded-xl border px-4 py-2 text-xs font-medium"
                style={{ borderColor: "var(--color-orange)", color: "var(--color-orange)" }}
              >
                Annuler la verification
              </button>
              <button
                type="button"
                onClick={() => setMode("suspendre")}
                className="rounded-xl border px-4 py-2 text-xs font-medium"
                style={{ borderColor: "#b91c1c", color: "#b91c1c" }}
              >
                Suspendre
              </button>
            </>
          )}

          {(artisan.statut === "rejected" || artisan.statut === "suspended") && (
            <button
              type="button"
              onClick={() => setMode("reexaminer")}
              className="rounded-xl border px-4 py-2 text-xs font-medium"
              style={{ borderColor: "var(--color-vert)", color: "var(--color-vert)" }}
            >
              Reexaminer le dossier
            </button>
          )}

          {artisan.statut === "pending" && (
            <Link
              href="/admin/verifications"
              className="rounded-xl px-4 py-2 text-xs font-medium text-white"
              style={{ background: "var(--color-orange)" }}
            >
              Examiner le dossier
            </Link>
          )}
        </div>
      )}
    </div>
  );
}