// >>> EMPLACEMENT : src/app/artisan/abonnement/page.tsx
"use client";

// =========================================================================
// Ecran "Abonnement & visibilite" de l'artisan (A8).
// - Rappelle la formule actuelle (Gratuit + commission 10 %).
// - Presente 2 offres payantes : abonnement mensuel + mise en avant.
// - Au lancement : boutons "Bientot disponible" (interrupteur dans
//   src/lib/abonnement.ts). Quand on ouvre les paiements, l'ecran devient
//   payable automatiquement (choix Wave / Orange Money + souscription).
// Ecran enfant -> fleche retour en haut (accessible depuis le profil).
// =========================================================================

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { FiletTricolore } from "@/components/ui";
import { BoutonRetour, IconeCheck } from "@/components/icones";
import {
  ABONNEMENTS_DISPONIBLES,
  souscrire,
  lireAbonnementsActifs,
  type TypeAbonnement,
  type MethodePaiement,
} from "@/lib/abonnement";

function prixLisible(n: number) {
  return n.toLocaleString("fr-FR").replace(/\u00A0/g, " ") + " FCFA";
}
function dateLisible(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

type Offre = {
  type: TypeAbonnement;
  titre: string;
  prix: number;
  avantages: string[];
};

const OFFRES: Offre[] = [
  {
    type: "monthly_subscription",
    titre: "Abonnement mensuel",
    prix: 5000,
    avantages: ["Badge « Membre » sur votre profil", "Meilleur classement dans les résultats", "Priorité sur les nouvelles demandes"],
  },
  {
    type: "featured_listing",
    titre: "Mise en avant",
    prix: 3000,
    avantages: ["En tête des résultats de recherche", "Mis en avant sur la page d'accueil"],
  },
];

export default function Abonnement() {
  const supabase = createClient();
  const [chargement, setChargement] = useState(true);
  const [aAbonnement, setAAbonnement] = useState(false);
  const [estEnAvant, setEstEnAvant] = useState(false);
  const [finAvant, setFinAvant] = useState<string | null>(null);
  const [finAbo, setFinAbo] = useState<string | null>(null);
  const [methode, setMethode] = useState<MethodePaiement>("wave");
  const [action, setAction] = useState<TypeAbonnement | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  async function charger() {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      setChargement(false);
      return;
    }
    const { data: fiche } = await supabase
      .from("artisans")
      .select("has_active_subscription, is_featured, featured_until")
      .eq("id", auth.user.id)
      .maybeSingle();
    if (fiche) {
      setAAbonnement(!!fiche.has_active_subscription);
      setEstEnAvant(!!fiche.is_featured);
      setFinAvant(fiche.featured_until ?? null);
    }
    // Date de fin de l'abonnement mensuel (si actif).
    const abos = await lireAbonnementsActifs();
    const abo = abos.find((a) => a.type === "monthly_subscription");
    setFinAbo(abo ? abo.period_end : null);
    setChargement(false);
  }

  useEffect(() => {
    charger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function lancerSouscription(type: TypeAbonnement) {
    setAction(type);
    setErreur(null);
    try {
      await souscrire(type, methode);
      await charger();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La souscription a échoué.");
    } finally {
      setAction(null);
    }
  }

  return (
    <div className="min-h-screen bg-fond">
      <FiletTricolore />
      <div className="mx-auto max-w-md px-5 py-6">
        <BoutonRetour />
        <h1 className="mb-1 mt-2 text-xl" style={{ color: "var(--color-texte)" }}>
          Abonnement & visibilité
        </h1>
        <p className="mb-5 text-sm" style={{ color: "var(--color-texte2)" }}>
          Gagnez en visibilité et décrochez plus de clients.
        </p>

        {chargement ? (
          <p className="pt-8 text-center text-sm" style={{ color: "var(--color-texte2)" }}>
            Chargement...
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {/* ===== Formule actuelle ===== */}
            <div
              className="rounded-2xl border p-4"
              style={{ background: "var(--color-carte)", borderColor: "var(--color-vert)" }}
            >
              <div className="flex items-center justify-between">
                <span className="text-base font-semibold" style={{ color: "var(--color-texte)" }}>
                  Formule actuelle : Gratuit
                </span>
                <span
                  className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                  style={{ background: "rgba(76,140,90,0.12)", color: "var(--color-vert)" }}
                >
                  Active
                </span>
              </div>
              <p className="mt-1.5 text-sm" style={{ color: "var(--color-texte2)" }}>
                Vous ne payez qu'une commission de 10 % sur chaque intervention réglée. Aucun frais fixe.
              </p>
            </div>

            {/* ===== Choix du moyen de paiement (uniquement si dispo) ===== */}
            {ABONNEMENTS_DISPONIBLES && (!aAbonnement || !estEnAvant) && (
              <div className="flex gap-2">
                {(["wave", "orange_money"] as MethodePaiement[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMethode(m)}
                    className="flex-1 rounded-xl border py-2.5 text-sm font-medium"
                    style={{
                      borderColor: methode === m ? "var(--color-orange)" : "var(--color-bordure)",
                      background: methode === m ? "var(--color-secondaire)" : "var(--color-carte)",
                      color: methode === m ? "var(--color-orange)" : "var(--color-texte2)",
                    }}
                  >
                    {m === "wave" ? "Wave" : "Orange Money"}
                  </button>
                ))}
              </div>
            )}

            {erreur && (
              <p className="rounded-xl border p-3 text-sm" style={{ borderColor: "#e0b4b4", color: "#a33", background: "rgba(200,60,60,0.06)" }}>
                {erreur}
              </p>
            )}

            {/* ===== Les deux offres ===== */}
            {OFFRES.map((o) => {
              const actif = o.type === "monthly_subscription" ? aAbonnement : estEnAvant;
              const dateFin = o.type === "monthly_subscription" ? finAbo : finAvant;
              const enCours = action === o.type;
              return (
                <div
                  key={o.type}
                  className="rounded-2xl border p-4"
                  style={{ background: "var(--color-carte)", borderColor: "var(--color-bordure)" }}
                >
                  <div className="flex items-baseline justify-between">
                    <span className="text-base font-semibold" style={{ color: "var(--color-texte)" }}>
                      {o.titre}
                    </span>
                    <span className="text-sm font-semibold" style={{ color: "var(--color-orange)" }}>
                      {prixLisible(o.prix)}
                      <span className="font-normal" style={{ color: "var(--color-texte2)" }}>
                        {" "}/ mois
                      </span>
                    </span>
                  </div>

                  <ul className="mt-3 flex flex-col gap-1.5">
                    {o.avantages.map((a) => (
                      <li key={a} className="flex items-start gap-2 text-sm" style={{ color: "var(--color-texte2)" }}>
                        <span className="mt-0.5 shrink-0" style={{ color: "var(--color-vert)" }}>
                          <IconeCheck taille={16} />
                        </span>
                        {a}
                      </li>
                    ))}
                  </ul>

                  {/* --- Etat / action --- */}
                  <div className="mt-4">
                    {actif ? (
                      <div
                        className="rounded-xl border py-2.5 text-center text-sm font-medium"
                        style={{ borderColor: "var(--color-vert)", color: "var(--color-vert)", background: "rgba(76,140,90,0.08)" }}
                      >
                        Actif{dateFin ? ` jusqu'au ${dateLisible(dateFin)}` : ""}
                      </div>
                    ) : ABONNEMENTS_DISPONIBLES ? (
                      <button
                        type="button"
                        onClick={() => lancerSouscription(o.type)}
                        disabled={enCours}
                        className="w-full rounded-xl py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                        style={{ background: "var(--color-orange)" }}
                      >
                        {enCours ? "Traitement..." : `Souscrire (${prixLisible(o.prix)} / mois)`}
                      </button>
                    ) : (
                      <div
                        className="rounded-xl border border-dashed py-2.5 text-center text-sm font-medium"
                        style={{ borderColor: "var(--color-bordure)", color: "var(--color-texte2)" }}
                      >
                        Bientôt disponible
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {!ABONNEMENTS_DISPONIBLES && (
              <p className="px-1 text-center text-xs" style={{ color: "var(--color-texte2)" }}>
                Les abonnements arrivent bientôt. En attendant, profitez de la formule gratuite —
                vous ne payez que lorsque vous êtes payé.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}