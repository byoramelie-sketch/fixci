// >>> EMPLACEMENT : src/app/artisan/page.tsx
"use client";

// =========================================================================
// Tableau de bord artisan (refonte fidele a la maquette).
//   - 4 cartes de stats : nouvelles demandes, interventions, note, revenus
//   - Carte statut du badge (verifie / en attente / refuse)
//   - Carte abonnement
//   - Liste des nouvelles demandes (avec Accepter / Refuser)
//   - Barre de navigation du bas
// Les chiffres viennent de la vraie base ; 0 si pas encore de donnee.
// =========================================================================

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { FiletTricolore, Logo } from "@/components/ui";
import { NavArtisan } from "@/components/nav-artisan";
import { IconeLieu } from "@/components/icones";

// ===== Type des donnees du tableau de bord =====
type Donnees = {
  prenom: string;
  status: string;
  isVerifie: boolean;
  note: number;
  nbAvis: number;
  nbNouvellesDemandes: number;
  nbInterventions: number;
  revenusMois: number;
  abonnementType: string | null;
  nouvellesDemandes: DemandeCourte[];
};

type DemandeCourte = {
  id: string;
  description: string;
  neighborhood: string | null;
  urgency: string;
};

export default function TableauBordArtisan() {
  const router = useRouter();
  const supabase = createClient();
  const [chargement, setChargement] = useState(true);
  const [d, setD] = useState<Donnees | null>(null);

  useEffect(() => {
    (async () => {
      // 1. Utilisateur connecte.
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) {
        router.push("/connexion");
        return;
      }

      // 2. Profil (prenom) + fiche artisan (statut, note).
      const { data: profil } = await supabase
        .from("profiles").select("name").eq("id", uid).single();
      const { data: artisan } = await supabase
        .from("artisans")
        .select("status, is_verified_badge, average_rating, review_count")
        .eq("id", uid).single();

      // 3. Nouvelles demandes assignees a cet artisan (status = new).
      const { data: demandes } = await supabase
        .from("service_requests")
        .select("id, description, neighborhood, urgency, status")
        .eq("assigned_artisan_id", uid)
        .eq("status", "new")
        .order("created_at", { ascending: false });

      // 4. Interventions terminees (jobs completed/validated).
      const { count: nbInterventions } = await supabase
        .from("jobs")
        .select("id", { count: "exact", head: true })
        .eq("artisan_id", uid)
        .in("status", ["completed", "validated"]);

      // 5. Abonnement actif (s'il existe).
      const { data: abo } = await supabase
        .from("artisan_subscriptions")
        .select("type, status")
        .eq("artisan_id", uid)
        .eq("status", "active")
        .maybeSingle();

      // 6. Revenus du mois : somme des reversements payes ce mois-ci.
      //    (paiements lies aux jobs de l'artisan ; 0 si rien pour l'instant.)
      const debutMois = new Date();
      debutMois.setDate(1);
      debutMois.setHours(0, 0, 0, 0);
      const { data: jobsArtisan } = await supabase
        .from("jobs").select("id").eq("artisan_id", uid);
      const idsJobs = (jobsArtisan ?? []).map((j) => j.id);
      let revenus = 0;
      if (idsJobs.length > 0) {
        const { data: paies } = await supabase
          .from("payments")
          .select("artisan_payout_fcfa, payout_at, job_id, status")
          .in("job_id", idsJobs)
          .eq("status", "released");
        revenus = (paies ?? [])
          .filter((p) => p.payout_at && new Date(p.payout_at) >= debutMois)
          .reduce((somme, p) => somme + (p.artisan_payout_fcfa ?? 0), 0);
      }

      // 7. Mise en forme.
      const prenom = (profil?.name ?? "").split(" ")[0] || "Artisan";
      setD({
        prenom,
        status: artisan?.status ?? "pending",
        isVerifie: artisan?.is_verified_badge ?? false,
        note: Number(artisan?.average_rating ?? 0),
        nbAvis: artisan?.review_count ?? 0,
        nbNouvellesDemandes: demandes?.length ?? 0,
        nbInterventions: nbInterventions ?? 0,
        revenusMois: revenus,
        abonnementType: abo?.type ?? null,
        nouvellesDemandes: (demandes ?? []).map((x) => ({
          id: x.id,
          description: x.description,
          neighborhood: x.neighborhood,
          urgency: x.urgency,
        })),
      });
      setChargement(false);
    })();
  }, [supabase, router]);

  // ===== Accepter / refuser une demande depuis le tableau =====
  async function repondreDemande(id: string, accepter: boolean) {
    const nouveauStatut = accepter ? "quote_in_progress" : "cancelled";
    await supabase
      .from("service_requests")
      .update({ status: nouveauStatut })
      .eq("id", id);
    // Retirer la demande de la liste affichee.
    setD((prec) =>
      prec
        ? {
            ...prec,
            nouvellesDemandes: prec.nouvellesDemandes.filter((x) => x.id !== id),
            nbNouvellesDemandes: prec.nbNouvellesDemandes - 1,
          }
        : prec
    );
  }

  if (chargement) {
    return (
      <div className="min-h-screen bg-fond">
        <FiletTricolore />
        <div className="px-5 py-10 text-center text-texte2">Chargement...</div>
      </div>
    );
  }
  if (!d) return null;

  return (
    <div className="min-h-screen bg-fond pb-24">
      <FiletTricolore />
      <div className="mx-auto max-w-md px-5 py-6">
        <header className="mb-6 flex items-center justify-between">
          <Logo />
        </header>

        <h1 className="text-2xl">Bonjour {d.prenom}</h1>
        <p className="mb-5 text-sm text-texte2">Voici votre activite</p>

        {/* ===== 4 cartes de stats ===== */}
        <div className="mb-5 grid grid-cols-2 gap-3">
          <CarteStat valeur={String(d.nbNouvellesDemandes)} libelle="Nouvelles demandes" />
          <CarteStat valeur={String(d.nbInterventions)} libelle="Interventions" />
          <CarteStat
            valeur={d.nbAvis > 0 ? `${d.note.toFixed(1)} ★` : "—"}
            libelle="Note moyenne"
          />
          <CarteStat
            valeur={d.revenusMois.toLocaleString("fr-FR")}
            libelle="Revenus ce mois (FCFA)"
          />
        </div>

        {/* ===== Statut du badge ===== */}
        <CarteStatut status={d.status} isVerifie={d.isVerifie} />

        {/* ===== Abonnement ===== */}
        <button
          type="button"
          onClick={() => router.push("/artisan/abonnement")}
          className="mt-4 flex w-full items-center justify-between rounded-2xl border border-bordure bg-carte p-5 text-left"
        >
          <div>
            <p className="text-sm font-medium">Abonnement</p>
            <p className="mt-0.5 text-sm text-texte2">
              {d.abonnementType === "monthly_subscription"
                ? "Formule mensuelle active"
                : "Gratuit · Commission au resultat"}
            </p>
          </div>
          <span className="text-texte2">›</span>
        </button>

        {/* ===== Nouvelles demandes ===== */}
        <h2 className="mb-3 mt-6 text-lg">Nouvelles demandes</h2>
        {d.nouvellesDemandes.length > 0 ? (
          <div className="space-y-3">
            {d.nouvellesDemandes.map((dem) => (
              <div key={dem.id} className="rounded-2xl border border-bordure bg-carte p-4">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <p className="font-medium">{dem.description}</p>
                  {dem.urgency === "urgent" && (
                    <span className="shrink-0 rounded-full px-2 py-0.5 text-xs text-white" style={{ backgroundColor: "var(--color-orange)" }}>
                      Urgent
                    </span>
                  )}
                </div>
                <p className="mb-3 flex items-center gap-1 text-sm text-texte2"><IconeLieu taille={15} /> {dem.neighborhood ?? "Zone non precisee"}</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => repondreDemande(dem.id, false)}
                    className="flex-1 rounded-xl border border-bordure py-2 text-sm"
                  >
                    Refuser
                  </button>
                  <button
                    type="button"
                    onClick={() => repondreDemande(dem.id, true)}
                    className="flex-1 rounded-xl py-2 text-sm text-white"
                    style={{ backgroundColor: "var(--color-orange)" }}
                  >
                    Accepter
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-bordure bg-carte p-5 text-center">
            <p className="text-sm text-texte2">
              Aucune nouvelle demande pour le moment.
            </p>
          </div>
        )}
      </div>

      <NavArtisan />
    </div>
  );
}

// ===== Petite carte de statistique =====
function CarteStat({ valeur, libelle }: { valeur: string; libelle: string }) {
  return (
    <div className="rounded-2xl border border-bordure bg-carte p-4">
      <p className="text-2xl" style={{ fontFamily: "var(--font-titre)" }}>{valeur}</p>
      <p className="mt-1 text-xs text-texte2">{libelle}</p>
    </div>
  );
}

// ===== Carte de statut du badge =====
function CarteStatut({ status, isVerifie }: { status: string; isVerifie: boolean }) {
  let couleur = "var(--color-orange)";
  let titre = "En cours de verification";
  let sousTitre = "Notre equipe verifie votre dossier.";
  let fond = "rgba(224,123,57,0.12)";

  if (isVerifie || status === "verified") {
    couleur = "var(--color-vert)";
    titre = "✓ Verifie";
    sousTitre = "Profil controle par FixCI. Les clients peuvent vous trouver.";
    fond = "rgba(76,140,90,0.12)";
  } else if (status === "rejected" || status === "suspended") {
    couleur = "#C0392B";
    titre = status === "suspended" ? "Compte suspendu" : "Dossier refuse";
    sousTitre = "Contactez le support FixCI.";
    fond = "rgba(192,57,43,0.10)";
  }

  return (
    <div className="rounded-2xl border border-bordure p-5" style={{ backgroundColor: fond }}>
      <p className="text-xs text-texte2">Statut du badge · Profil controle par FixCI</p>
      <p className="mt-1 text-base font-medium" style={{ color: couleur }}>{titre}</p>
      <p className="mt-0.5 text-sm text-texte2">{sousTitre}</p>
    </div>
  );
}