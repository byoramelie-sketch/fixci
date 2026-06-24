// >>> EMPLACEMENT : src/app/artisan/demandes/page.tsx
"use client";

// =========================================================================
// Demandes recues par l'artisan, classees en 3 onglets :
//   - Nouvelles  (status = new)
//   - Acceptees  (quote_in_progress, quote_accepted, en_route)
//   - Terminees  (completed, validated)
// Chaque demande mene a son detail. Barre de navigation en bas.
// =========================================================================

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { FiletTricolore } from "@/components/ui";
import { NavArtisan } from "@/components/nav-artisan";
import { BoutonRetour, IconeLieu } from "@/components/icones";

// ===== Type d'une demande affichee =====
type Demande = {
  id: string;
  description: string;
  neighborhood: string | null;
  urgency: string;
  status: string;
  createdAt: string;
};

// ===== Regroupement des statuts par onglet =====
const ONGLET_STATUTS: Record<string, string[]> = {
  nouvelles: ["new"],
  acceptees: ["quote_in_progress", "quote_accepted", "en_route"],
  terminees: ["completed", "validated"],
};

export default function DemandesArtisan() {
  const router = useRouter();
  const supabase = createClient();

  const [ongletActif, setOngletActif] = useState<"nouvelles" | "acceptees" | "terminees">("nouvelles");
  const [chargement, setChargement] = useState(true);
  const [demandes, setDemandes] = useState<Demande[]>([]);

  // ===== Charger les demandes de l'onglet courant =====
  const charger = useCallback(async (onglet: "nouvelles" | "acceptees" | "terminees") => {
    setChargement(true);
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    if (!uid) {
      router.push("/connexion");
      return;
    }
    const { data } = await supabase
      .from("service_requests")
      .select("id, description, neighborhood, urgency, status, created_at")
      .eq("assigned_artisan_id", uid)
      .in("status", ONGLET_STATUTS[onglet])
      .order("created_at", { ascending: false });

    setDemandes(
      (data ?? []).map((x) => ({
        id: x.id,
        description: x.description,
        neighborhood: x.neighborhood,
        urgency: x.urgency,
        status: x.status,
        createdAt: x.created_at,
      }))
    );
    setChargement(false);
  }, [supabase, router]);

  useEffect(() => {
    charger(ongletActif);
  }, [ongletActif, charger]);

  return (
    <div className="min-h-screen bg-fond pb-24">
      <FiletTricolore />
      <div className="mx-auto max-w-md px-5 py-6">
        <header className="mb-4 flex items-center gap-3">
          <BoutonRetour />
          <h1 className="text-2xl">Demandes recues</h1>
        </header>

        {/* ===== Onglets ===== */}
        <div className="mb-5 flex gap-2">
          <Onglet actif={ongletActif === "nouvelles"} onClick={() => setOngletActif("nouvelles")}>
            Nouvelles
          </Onglet>
          <Onglet actif={ongletActif === "acceptees"} onClick={() => setOngletActif("acceptees")}>
            Acceptees
          </Onglet>
          <Onglet actif={ongletActif === "terminees"} onClick={() => setOngletActif("terminees")}>
            Terminees
          </Onglet>
        </div>

        {/* ===== Liste ===== */}
        {chargement ? (
          <p className="py-10 text-center text-texte2">Chargement...</p>
        ) : demandes.length > 0 ? (
          <div className="space-y-3">
            {demandes.map((dem) => (
              <button
                key={dem.id}
                type="button"
                onClick={() => router.push(`/artisan/demandes/${dem.id}`)}
                className="block w-full rounded-2xl border border-bordure bg-carte p-4 text-left"
              >
                <div className="mb-1 flex items-start justify-between gap-2">
                  <p className="font-medium">{dem.description}</p>
                  {dem.urgency === "urgent" && (
                    <span className="shrink-0 rounded-full px-2 py-0.5 text-xs text-white" style={{ backgroundColor: "var(--color-orange)" }}>
                      Urgent
                    </span>
                  )}
                </div>
                <p className="flex items-center gap-1 text-sm text-texte2"><IconeLieu taille={15} /> {dem.neighborhood ?? "Zone non precisee"}</p>
              </button>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-bordure bg-carte p-6 text-center">
            <p className="text-sm text-texte2">Aucune demande dans cette categorie.</p>
          </div>
        )}
      </div>

      <NavArtisan />
    </div>
  );
}

// ===== Bouton d'onglet =====
function Onglet({ actif, onClick, children }: { actif: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full border px-4 py-1.5 text-sm"
      style={{
        borderColor: actif ? "var(--color-orange)" : "var(--color-bordure)",
        backgroundColor: actif ? "var(--color-orange)" : "var(--color-carte)",
        color: actif ? "#fff" : "var(--color-texte)",
      }}
    >
      {children}
    </button>
  );
}