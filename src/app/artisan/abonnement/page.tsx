// >>> EMPLACEMENT : src/app/artisan/abonnement/page.tsx
"use client";

// =========================================================================
// Abonnement & facturation de l'artisan.
//   - Formule actuelle (gratuit avec commission, ou mensuel)
//   - Option de mise en avant (featured_listing)
//   - Historique des paiements (commissions et reversements)
//   - Fleche retour vers le tableau de bord + barre de navigation
// =========================================================================

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { FiletTricolore } from "@/components/ui";
import { NavArtisan } from "@/components/nav-artisan";
import { BoutonRetour } from "@/components/icones";

// ===== Types =====
type LignePaiement = {
  id: string;
  libelle: string;
  montant: number;
  positif: boolean;
  date: string;
};

export default function AbonnementArtisan() {
  const router = useRouter();
  const supabase = createClient();
  const [chargement, setChargement] = useState(true);
  const [formuleMensuelle, setFormuleMensuelle] = useState(false);
  const [estEnAvant, setEstEnAvant] = useState(false);
  const [historique, setHistorique] = useState<LignePaiement[]>([]);

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) {
        router.push("/connexion");
        return;
      }

      // Abonnements actifs.
      const { data: abos } = await supabase
        .from("artisan_subscriptions")
        .select("type, status")
        .eq("artisan_id", uid)
        .eq("status", "active");
      setFormuleMensuelle((abos ?? []).some((a) => a.type === "monthly_subscription"));
      setEstEnAvant((abos ?? []).some((a) => a.type === "featured_listing"));

      // Historique : paiements lies aux jobs de cet artisan.
      const { data: jobs } = await supabase.from("jobs").select("id").eq("artisan_id", uid);
      const ids = (jobs ?? []).map((j) => j.id);
      if (ids.length > 0) {
        const { data: paies } = await supabase
          .from("payments")
          .select("id, artisan_payout_fcfa, commission_fcfa, payout_at, created_at, status")
          .in("job_id", ids)
          .order("created_at", { ascending: false });

        const lignes: LignePaiement[] = [];
        (paies ?? []).forEach((p) => {
          // Reversement a l'artisan (positif).
          if (p.artisan_payout_fcfa && p.status === "released") {
            lignes.push({
              id: `${p.id}-payout`,
              libelle: "Reversement intervention",
              montant: p.artisan_payout_fcfa,
              positif: true,
              date: p.payout_at ?? p.created_at,
            });
          }
          // Commission FixCI (negatif).
          if (p.commission_fcfa) {
            lignes.push({
              id: `${p.id}-commission`,
              libelle: "Commission FixCI",
              montant: p.commission_fcfa,
              positif: false,
              date: p.created_at,
            });
          }
        });
        setHistorique(lignes);
      }
      setChargement(false);
    })();
  }, [supabase, router]);

  if (chargement) {
    return (
      <div className="min-h-screen bg-fond">
        <FiletTricolore />
        <div className="px-5 py-10 text-center text-texte2">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-fond pb-24">
      <FiletTricolore />
      <div className="mx-auto max-w-md px-5 py-6">
        {/* Fleche retour */}
        <header className="mb-5 flex items-center gap-3">
          <BoutonRetour />
          <h1 className="text-lg">Abonnement</h1>
        </header>

        {/* Formule actuelle */}
        <div className="mb-4 rounded-2xl border border-bordure bg-carte p-5">
          <p className="text-sm text-texte2">Ma formule actuelle</p>
          <p className="mt-1 text-xl" style={{ fontFamily: "var(--font-titre)" }}>
            {formuleMensuelle ? "Mensuelle" : "Gratuit"}
          </p>
          <p className="mt-1 text-sm text-texte2">
            {formuleMensuelle
              ? "Abonnement mensuel actif."
              : "Commission au resultat (preleve a chaque intervention)."}
          </p>
        </div>

        {/* Mise en avant */}
        <div className="mb-6 rounded-2xl border border-bordure p-5" style={{ backgroundColor: "var(--color-secondaire)" }}>
          <p className="font-medium">Booster votre visibilite</p>
          <p className="mt-1 text-sm text-texte2">
            Mise en avant — etre en tete de liste.
          </p>
          {estEnAvant ? (
            <p className="mt-3 text-sm" style={{ color: "var(--color-vert)" }}>
              ✓ Mise en avant active
            </p>
          ) : (
            <button
              type="button"
              className="mt-3 rounded-xl px-4 py-2 text-sm text-white"
              style={{ backgroundColor: "var(--color-orange)" }}
              onClick={() => alert("Le paiement de la mise en avant sera disponible bientot.")}
            >
              Activer (+ 3 000 FCFA / mois)
            </button>
          )}
        </div>

        {/* Historique */}
        <h2 className="mb-3 text-lg">Historique des paiements</h2>
        {historique.length > 0 ? (
          <div className="space-y-2">
            {historique.map((l) => (
              <div key={l.id} className="flex items-center justify-between rounded-xl border border-bordure bg-carte px-4 py-3">
                <div>
                  <p className="text-sm font-medium">{l.libelle}</p>
                  <p className="text-xs text-texte2">{new Date(l.date).toLocaleDateString("fr-FR")}</p>
                </div>
                <p className="text-sm font-medium" style={{ color: l.positif ? "var(--color-vert)" : "#C0392B" }}>
                  {l.positif ? "+" : "−"} {l.montant.toLocaleString("fr-FR")} FCFA
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-bordure bg-carte p-6 text-center">
            <p className="text-sm text-texte2">Aucun paiement pour le moment.</p>
          </div>
        )}
      </div>

      <NavArtisan />
    </div>
  );
}