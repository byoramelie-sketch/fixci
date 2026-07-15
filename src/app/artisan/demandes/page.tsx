// >>> EMPLACEMENT : src/app/artisan/demandes/page.tsx
"use client";

// =========================================================================
// Onglet "Demandes" de l'artisan — DEUX listes :
//
//   1. POUR MOI     : les demandes qui lui sont adressees directement
//                     (un client l'a choisi depuis son profil), plus les
//                     chantiers qu'il a decroches et qui sont en cours.
//   2. DISPONIBLES  : le fil des demandes publiees par les clients, ouvertes
//                     a tous. Filtre sur SES metiers et SES communes, pour ne
//                     montrer que ce qui le concerne vraiment.
//
//   Chaque carte indique : metier, description, quartier, urgence, budget et
//   depuis quand. Un point orange signale ce qui n'a pas encore de reponse.
//   Le badge de l'onglet compte ce qui attend une action.
// Onglet principal -> barre de navigation du bas (NavArtisan).
// =========================================================================

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { FiletTricolore } from "@/components/ui";
import { NavArtisan } from "@/components/nav-artisan";
import { IconeLieu } from "@/components/icones";

type Demande = {
  id: string;
  description: string;
  quartier: string | null;
  urgence: string;
  statut: string;
  budget: number | null;
  creneau: string | null;
  creeLe: string;
  metier: string;
  pourMoi: boolean;
  dejaRepondu: boolean;
};

// ===== Apparence de l'urgence =====
const URGENCES: Record<string, { libelle: string; couleur: string }> = {
  urgent: { libelle: "Urgent", couleur: "#b91c1c" },
  today: { libelle: "Aujourd'hui", couleur: "var(--color-orange)" },
  this_week: { libelle: "Cette semaine", couleur: "var(--color-texte2)" },
};

// ===== Libelle des statuts =====
const STATUTS: Record<string, string> = {
  new: "Nouvelle",
  quote_in_progress: "Devis en cours",
  quote_accepted: "Devis accepte",
  en_route: "En route",
  completed: "Terminee",
  validated: "Validee",
  cancelled: "Annulee",
  disputed: "Litige",
};

function prix(n: number) {
  return n.toLocaleString("fr-FR") + " FCFA";
}

// ===== "il y a 2 h", "il y a 3 j" =====
function depuis(iso: string) {
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 60) return `il y a ${Math.max(1, min)} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const j = Math.floor(h / 24);
  return `il y a ${j} j`;
}

export default function DemandesArtisan() {
  const router = useRouter();
  const supabase = createClient();

  const [chargement, setChargement] = useState(true);
  const [onglet, setOnglet] = useState<"pourMoi" | "dispo">("pourMoi");
  const [demandes, setDemandes] = useState<Demande[]>([]);
  const [verifie, setVerifie] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        router.push("/connexion");
        return;
      }
      const uid = auth.user.id;

      // Statut du compte + ses metiers + ses communes + ses offres deja faites.
      const [artisanRes, metiersRes, communesRes, mesOffresRes] = await Promise.all([
        supabase.from("artisans").select("status").eq("id", uid).maybeSingle(),
        supabase.from("artisan_trades").select("trade_id").eq("artisan_id", uid),
        supabase.from("artisan_communes").select("commune_id").eq("artisan_id", uid),
        supabase.from("quotes").select("request_id").eq("artisan_id", uid),
      ]);

      setVerifie(artisanRes.data?.status === "verified");

      const mesMetiers = ((metiersRes.data ?? []) as { trade_id: string }[]).map((t) => t.trade_id);
      const mesCommunes = ((communesRes.data ?? []) as { commune_id: string }[]).map(
        (c) => c.commune_id
      );
      const repondu = new Set(
        ((mesOffresRes.data ?? []) as { request_id: string }[]).map((q) => q.request_id)
      );

      // Les demandes encore ouvertes (ou en cours avec lui).
      const { data: brutes } = await supabase
        .from("service_requests")
        .select(
          "id, description, neighborhood, urgency, status, budget_fcfa, preferred_slot, created_at, trade_id, commune_id, assigned_artisan_id"
        )
        .order("created_at", { ascending: false })
        .limit(80);

      const lignes = (brutes ?? []) as {
        id: string;
        description: string;
        neighborhood: string | null;
        urgency: string;
        status: string;
        budget_fcfa: number | null;
        preferred_slot: string | null;
        created_at: string;
        trade_id: string;
        commune_id: string | null;
        assigned_artisan_id: string | null;
      }[];

      // Noms des metiers.
      const tradeIds = [...new Set(lignes.map((l) => l.trade_id))];
      const nomMetier: Record<string, string> = {};
      if (tradeIds.length) {
        const { data: trades } = await supabase.from("trades").select("id, name").in("id", tradeIds);
        ((trades ?? []) as { id: string; name: string }[]).forEach((t) => {
          nomMetier[t.id] = t.name;
        });
      }

      setDemandes(
        lignes.map((l) => ({
          id: l.id,
          description: l.description,
          quartier: l.neighborhood,
          urgence: l.urgency,
          statut: l.status,
          budget: l.budget_fcfa,
          creneau: l.preferred_slot,
          creeLe: l.created_at,
          metier: nomMetier[l.trade_id] ?? "Service",
          pourMoi: l.assigned_artisan_id === uid,
          dejaRepondu: repondu.has(l.id),
        }))
      );

      // Petit filtre memorise pour l'onglet "Disponibles".
      setFiltre({ metiers: mesMetiers, communes: mesCommunes });
      setLignesBrutes(lignes);
      setChargement(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [filtre, setFiltre] = useState<{ metiers: string[]; communes: string[] }>({
    metiers: [],
    communes: [],
  });
  const [lignesBrutes, setLignesBrutes] = useState<
    { id: string; trade_id: string; commune_id: string | null; assigned_artisan_id: string | null }[]
  >([]);

  // ===== Repartition dans les 2 onglets =====
  // "Pour moi" : la demande m'est adressee (ou je suis deja sur le coup).
  const pourMoi = demandes.filter(
    (d) => d.pourMoi || (d.dejaRepondu && d.statut !== "cancelled")
  );

  // "Disponibles" : ouverte a tous, pas encore attribuee, dans mes metiers et
  // mes communes, et je n'ai pas encore repondu.
  const dispo = demandes.filter((d) => {
    if (d.pourMoi || d.dejaRepondu) return false;
    if (d.statut !== "new" && d.statut !== "quote_in_progress") return false;
    const brut = lignesBrutes.find((l) => l.id === d.id);
    if (!brut) return false;
    if (brut.assigned_artisan_id) return false;
    const metierOk = filtre.metiers.length === 0 || filtre.metiers.includes(brut.trade_id);
    const communeOk =
      filtre.communes.length === 0 ||
      brut.commune_id === null ||
      filtre.communes.includes(brut.commune_id);
    return metierOk && communeOk;
  });

  const liste = onglet === "pourMoi" ? pourMoi : dispo;

  // Compteurs : ce qui attend une action de sa part.
  const aTraiter = pourMoi.filter((d) => !d.dejaRepondu).length;

  return (
    <div className="min-h-screen bg-fond pb-24">
      <FiletTricolore />
      <div className="mx-auto max-w-md px-5 py-6">
        <h1 className="mb-1 text-xl" style={{ color: "var(--color-texte)" }}>
          Demandes
        </h1>
        <p className="mb-4 text-sm" style={{ color: "var(--color-texte2)" }}>
          Repondez vite : le premier a proposer un prix a plus de chances.
        </p>

        {/* ===== Compte pas encore verifie ===== */}
        {!verifie && (
          <div
            className="mb-4 rounded-xl border p-4 text-sm"
            style={{ borderColor: "var(--color-orange)", background: "rgba(224,123,57,0.08)" }}
          >
            <p className="font-medium" style={{ color: "var(--color-orange)" }}>
              Votre compte n&apos;est pas encore verifie
            </p>
            <p className="mt-1" style={{ color: "var(--color-texte2)" }}>
              Vous pourrez repondre aux demandes des que votre dossier sera valide.
            </p>
            <a
              href="/artisan/verification"
              className="mt-2 inline-block text-xs font-semibold"
              style={{ color: "var(--color-orange)" }}
            >
              Voir mon dossier →
            </a>
          </div>
        )}

        {/* ===== Les 2 onglets ===== */}
        <div className="mb-4 flex gap-2">
          {[
            { cle: "pourMoi" as const, libelle: "Pour moi", compte: aTraiter },
            { cle: "dispo" as const, libelle: "Disponibles", compte: dispo.length },
          ].map((o) => {
            const actif = onglet === o.cle;
            return (
              <button
                key={o.cle}
                type="button"
                onClick={() => setOnglet(o.cle)}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border py-2.5 text-sm font-medium"
                style={{
                  borderColor: actif ? "var(--color-orange)" : "var(--color-bordure)",
                  background: actif ? "var(--color-secondaire)" : "var(--color-carte)",
                  color: actif ? "var(--color-orange)" : "var(--color-texte2)",
                }}
              >
                {o.libelle}
                {o.compte > 0 && (
                  <span
                    className="rounded-full px-1.5 text-[10px] font-bold text-white"
                    style={{ background: "var(--color-orange)" }}
                  >
                    {o.compte}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ===== Liste ===== */}
        {chargement ? (
          <p className="pt-8 text-center text-sm" style={{ color: "var(--color-texte2)" }}>
            Chargement...
          </p>
        ) : liste.length === 0 ? (
          <p
            className="rounded-xl border border-dashed p-6 text-center text-sm"
            style={{ borderColor: "var(--color-bordure)", color: "var(--color-texte2)" }}
          >
            {onglet === "pourMoi"
              ? "Aucune demande ne vous est adressee pour l'instant. Regardez l'onglet Disponibles."
              : "Aucune demande disponible dans vos metiers et vos communes pour le moment. Revenez plus tard."}
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {liste.map((d) => {
              const u = URGENCES[d.urgence] ?? URGENCES.this_week;
              const nouveau = onglet === "pourMoi" && !d.dejaRepondu;
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => router.push(`/artisan/demandes/${d.id}`)}
                  className="rounded-2xl border p-4 text-left transition active:scale-[0.99]"
                  style={{
                    background: "var(--color-carte)",
                    borderColor: nouveau ? "var(--color-orange)" : "var(--color-bordure)",
                  }}
                >
                  {/* Ligne du haut : metier + urgence */}
                  <div className="flex items-start justify-between gap-2">
                    <span className="flex items-center gap-1.5">
                      {nouveau && (
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ background: "var(--color-orange)" }}
                        />
                      )}
                      <span className="text-sm font-semibold" style={{ color: "var(--color-texte)" }}>
                        {d.metier}
                      </span>
                    </span>
                    <span className="shrink-0 text-[11px] font-medium" style={{ color: u.couleur }}>
                      {u.libelle}
                    </span>
                  </div>

                  {/* Description */}
                  <p
                    className="mt-1.5 line-clamp-2 text-sm"
                    style={{ color: "var(--color-texte2)" }}
                  >
                    {d.description}
                  </p>

                  {/* Lieu + creneau */}
                  <div
                    className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs"
                    style={{ color: "var(--color-texte2)" }}
                  >
                    <span className="inline-flex items-center gap-1">
                      <IconeLieu taille={13} /> {d.quartier ?? "Non precise"}
                    </span>
                    {d.creneau && <span>{d.creneau}</span>}
                    <span>{depuis(d.creeLe)}</span>
                  </div>

                  {/* Bas : budget + etat */}
                  <div
                    className="mt-2 flex items-center justify-between border-t pt-2"
                    style={{ borderColor: "var(--color-bordure)" }}
                  >
                    <span className="text-sm font-semibold" style={{ color: "var(--color-orange)" }}>
                      {d.budget != null ? prix(d.budget) : "Budget libre"}
                    </span>
                    <span className="text-[11px]" style={{ color: "var(--color-texte2)" }}>
                      {d.dejaRepondu ? `Offre envoyee · ${STATUTS[d.statut] ?? d.statut}` : "Proposer un prix →"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
      <NavArtisan />
    </div>
  );
}