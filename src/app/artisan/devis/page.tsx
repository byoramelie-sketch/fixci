// >>> EMPLACEMENT : src/app/artisan/devis/page.tsx
"use client";

// =========================================================================
// Ecran "Nouveau devis" (artisan) — ETAPE B, mode MANUEL (sans IA).
//   - Titre + tableau de postes (description / quantite / unite / prix U.),
//     chaque poste etant "Fournitures" ou "Main d'oeuvre".
//   - Sous-totaux (fournitures, main d'oeuvre) et TOTAL calcules en direct.
//   - A l'envoi : cree un devis detaille dans "quotes" (statut proposed) qui
//     alimente le flux de paiement existant, et previent le client dans le chat.
//   - Les prix sont saisis par l'artisan (l'IA ne remplira que la structure
//     plus tard). Ecran enfant -> fleche retour.
//
//   Route : /artisan/devis?request={idDemande}
// =========================================================================

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { FiletTricolore } from "@/components/ui";
import { BoutonRetour } from "@/components/icones";
import { ouvrirConversation } from "@/lib/messagerie";

type Ligne = {
  description: string;
  quantite: string;
  unite: string;
  prixUnitaire: string;
  type: "fournitures" | "main_oeuvre";
};

function prix(n: number) {
  return n.toLocaleString("fr-FR") + " FCFA";
}
function nombre(s: string): number {
  const n = parseFloat(s.replace(",", ".").replace(/\s/g, ""));
  return isNaN(n) ? 0 : n;
}
function totalLigne(l: Ligne): number {
  return Math.round(nombre(l.quantite) * nombre(l.prixUnitaire));
}

const LIGNE_VIDE: Ligne = {
  description: "",
  quantite: "1",
  unite: "u",
  prixUnitaire: "",
  type: "fournitures",
};

function DevisContenu() {
  const router = useRouter();
  const params = useSearchParams();
  const supabase = createClient();
  const requestId = params.get("request") ?? "";

  const [uid, setUid] = useState<string | null>(null);
  const [clientId, setClientId] = useState<string | null>(null);
  const [clientNom, setClientNom] = useState<string>("");
  const [statutDemande, setStatutDemande] = useState<string>("");
  const [chargement, setChargement] = useState(true);

  const [titre, setTitre] = useState("");
  const [lignes, setLignes] = useState<Ligne[]>([{ ...LIGNE_VIDE }]);
  const [conditions, setConditions] = useState("Devis valable 30 jours. Acompte a la commande.");
  const [validite, setValidite] = useState("30");

  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        router.push("/connexion");
        return;
      }
      setUid(auth.user.id);

      if (requestId) {
        const { data: sr } = await supabase
          .from("service_requests")
          .select("client_id, status")
          .eq("id", requestId)
          .single();
        if (sr) {
          setClientId(sr.client_id);
          setStatutDemande(sr.status);
          const { data: prof } = await supabase
            .from("profiles")
            .select("name")
            .eq("id", sr.client_id)
            .single();
          setClientNom(prof?.name ?? "Client");
        }
      }
      setChargement(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId]);

  // ===== Sous-totaux et total (calcules en direct) =====
  const fournitures = lignes
    .filter((l) => l.type === "fournitures")
    .reduce((s, l) => s + totalLigne(l), 0);
  const mainOeuvre = lignes
    .filter((l) => l.type === "main_oeuvre")
    .reduce((s, l) => s + totalLigne(l), 0);
  const total = fournitures + mainOeuvre;

  function majLigne(i: number, champ: keyof Ligne, valeur: string) {
    setLignes((ls) => ls.map((l, idx) => (idx === i ? { ...l, [champ]: valeur } : l)));
  }
  function ajouterLigne() {
    setLignes((ls) => [...ls, { ...LIGNE_VIDE }]);
  }
  function supprimerLigne(i: number) {
    setLignes((ls) => (ls.length > 1 ? ls.filter((_, idx) => idx !== i) : ls));
  }

  // ===== Envoyer le devis =====
  async function envoyer() {
    setErreur(null);
    if (!uid || !requestId) {
      setErreur("Demande introuvable.");
      return;
    }
    if (!titre.trim()) {
      setErreur("Donnez un titre au devis.");
      return;
    }
    const lignesValides = lignes.filter((l) => l.description.trim() && totalLigne(l) > 0);
    if (lignesValides.length === 0) {
      setErreur("Ajoutez au moins un poste avec une quantite et un prix.");
      return;
    }

    setEnvoi(true);
    try {
      const lignesJson = lignesValides.map((l) => ({
        description: l.description.trim(),
        quantite: nombre(l.quantite),
        unite: l.unite.trim() || "u",
        prix_unitaire: Math.round(nombre(l.prixUnitaire)),
        total: totalLigne(l),
        type: l.type,
      }));

      // 1. Creer le devis detaille (quote "proposed") -> alimente le paiement.
      const { error: errQuote } = await supabase.from("quotes").insert({
        request_id: requestId,
        artisan_id: uid,
        amount_fcfa: total,
        description: titre.trim(),
        title: titre.trim(),
        lines: lignesJson,
        materials_fcfa: fournitures,
        labor_fcfa: mainOeuvre,
        validity_days: Math.max(1, Math.round(nombre(validite)) || 30),
        terms: conditions.trim() || null,
        source: "manuel",
        status: "proposed",
      });
      if (errQuote) throw new Error(errQuote.message);

      // 2. Passer la demande en "devis en cours".
      if (statutDemande === "new" || statutDemande === "quote_in_progress") {
        await supabase
          .from("service_requests")
          .update({ status: "quote_in_progress" })
          .eq("id", requestId);
      }

      // 3. Prevenir le client dans le chat.
      if (clientId) {
        const convId = await ouvrirConversation(requestId, clientId, uid);
        if (convId) {
          await supabase.from("messages").insert({
            conversation_id: convId,
            sender_id: uid,
            content: `Devis envoye : ${titre.trim()} - ${prix(total)}`,
          });
        }
      }

      router.push(`/artisan/demandes/${requestId}`);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Envoi impossible.");
      setEnvoi(false);
    }
  }

  if (chargement) {
    return (
      <div className="min-h-screen bg-fond">
        <FiletTricolore />
        <div className="px-5 py-10 text-center text-texte2">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-fond pb-28">
      <FiletTricolore />
      <div className="mx-auto max-w-md px-5 py-6">
        <header className="mb-5 flex items-center gap-3">
          <BoutonRetour />
          <h1 className="text-lg">Nouveau devis</h1>
        </header>
        {clientNom && <p className="mb-4 text-sm text-texte2">Pour {clientNom}</p>}

        {/* Titre */}
        <label className="mb-4 block">
          <span className="mb-1.5 block text-sm font-medium">Titre du devis</span>
          <input
            className="champ"
            value={titre}
            onChange={(e) => setTitre(e.target.value)}
            placeholder="Ex : Carrelage salle de bain 8 m2"
          />
        </label>

        {/* Postes */}
        <p className="mb-2 text-sm font-medium">Postes</p>
        <div className="flex flex-col gap-3">
          {lignes.map((l, i) => (
            <div key={i} className="rounded-2xl border border-bordure bg-carte p-3">
              <div className="mb-2 flex items-start gap-2">
                <input
                  className="champ"
                  value={l.description}
                  onChange={(e) => majLigne(i, "description", e.target.value)}
                  placeholder="Description du poste"
                />
                <button
                  type="button"
                  onClick={() => supprimerLigne(i)}
                  className="shrink-0 rounded-lg border border-bordure px-2 py-2"
                  style={{ color: "var(--color-texte2)" }}
                  aria-label="Supprimer le poste"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6" />
                  </svg>
                </button>
              </div>
              <div className="mb-2 grid grid-cols-3 gap-2">
                <input
                  className="champ"
                  inputMode="decimal"
                  value={l.quantite}
                  onChange={(e) => majLigne(i, "quantite", e.target.value)}
                  placeholder="Qte"
                />
                <input
                  className="champ"
                  value={l.unite}
                  onChange={(e) => majLigne(i, "unite", e.target.value)}
                  placeholder="Unite"
                />
                <input
                  className="champ"
                  inputMode="numeric"
                  value={l.prixUnitaire}
                  onChange={(e) => majLigne(i, "prixUnitaire", e.target.value)}
                  placeholder="Prix U."
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex gap-1">
                  {(["fournitures", "main_oeuvre"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => majLigne(i, "type", t)}
                      className="rounded-full border px-2.5 py-1 text-xs"
                      style={{
                        borderColor: l.type === t ? "var(--color-orange)" : "var(--color-bordure)",
                        background: l.type === t ? "var(--color-secondaire)" : "transparent",
                        color: l.type === t ? "var(--color-orange)" : "var(--color-texte2)",
                      }}
                    >
                      {t === "fournitures" ? "Fournitures" : "Main d'oeuvre"}
                    </button>
                  ))}
                </div>
                <span className="text-sm font-semibold">{prix(totalLigne(l))}</span>
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={ajouterLigne}
          className="mt-3 w-full rounded-xl border border-dashed py-2.5 text-sm font-medium"
          style={{ borderColor: "var(--color-bordure)", color: "var(--color-texte2)" }}
        >
          + Ajouter un poste
        </button>

        {/* Sous-totaux + total */}
        <div className="mt-5 rounded-2xl border border-bordure bg-carte p-4 text-sm">
          <div className="flex justify-between py-1">
            <span className="text-texte2">Fournitures</span>
            <span>{prix(fournitures)}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-texte2">Main d&apos;oeuvre</span>
            <span>{prix(mainOeuvre)}</span>
          </div>
          <div className="mt-1 flex justify-between border-t border-bordure pt-2 text-base font-semibold">
            <span>Total</span>
            <span style={{ color: "var(--color-orange)" }}>{prix(total)}</span>
          </div>
        </div>

        {/* Conditions + validite */}
        <label className="mt-4 block">
          <span className="mb-1.5 block text-sm font-medium">Conditions (mentions)</span>
          <textarea
            className="champ"
            rows={2}
            value={conditions}
            onChange={(e) => setConditions(e.target.value)}
          />
        </label>
        <label className="mt-3 block">
          <span className="mb-1.5 block text-sm font-medium">Validite (jours)</span>
          <input
            className="champ"
            inputMode="numeric"
            value={validite}
            onChange={(e) => setValidite(e.target.value)}
          />
        </label>

        {erreur && (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{erreur}</p>
        )}

        <button
          type="button"
          onClick={envoyer}
          disabled={envoi || total <= 0}
          className="mt-5 w-full rounded-xl py-3 font-semibold text-white disabled:opacity-40"
          style={{ background: "var(--color-orange)" }}
        >
          {envoi ? "Envoi..." : `Envoyer le devis (${prix(total)})`}
        </button>
      </div>

      <style>{`
        .champ {
          width: 100%;
          border: 1px solid var(--color-bordure);
          border-radius: 12px;
          background: var(--color-fond);
          padding: 0.6rem 0.8rem;
          font-size: 0.95rem;
          outline: none;
          color: var(--color-texte);
        }
        .champ:focus { border-color: var(--color-orange); }
      `}</style>
    </div>
  );
}

export default function PageDevis() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-fond" />}>
      <DevisContenu />
    </Suspense>
  );
}