// >>> EMPLACEMENT : src/components/chat.tsx
"use client";

// =========================================================================
// Fil de discussion reutilisable (client <-> artisan).
//   - Messages texte (les miens a droite, ceux de l'autre a gauche).
//   - PROPOSITIONS DE PRIX dans la discussion : chacun peut proposer un
//     montant ; l'autre peut Accepter / Refuser ; une nouvelle proposition
//     remplace la precedente. Accepter cree le devis + le chantier (via la
//     fonction securisee fixci_repondre_offre).
//   - Rafraichissement automatique toutes les 4 s.
// =========================================================================

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Message = {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  offer_amount_fcfa: number | null;
  offer_status: string | null;
};

function heure(iso: string) {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}
function prix(n: number) {
  return n.toLocaleString("fr-FR") + " FCFA";
}

export function Chat({ conversationId, monId }: { conversationId: string; monId: string }) {
  const supabase = createClient();
  const [messages, setMessages] = useState<Message[]>([]);
  const [texte, setTexte] = useState("");
  const [montant, setMontant] = useState("");
  const [modeOffre, setModeOffre] = useState(false);
  const [chargement, setChargement] = useState(true);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const finRef = useRef<HTMLDivElement>(null);

  async function charger() {
    const { data } = await supabase
      .from("messages")
      .select("id, sender_id, content, created_at, offer_amount_fcfa, offer_status")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
    setMessages((data ?? []) as Message[]);
    setChargement(false);
  }

  useEffect(() => {
    charger();
    const t = setInterval(charger, 4000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ===== Envoyer un message texte =====
  async function envoyer() {
    const contenu = texte.trim();
    if (!contenu || envoi) return;
    setEnvoi(true);
    try {
      const { error } = await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: monId,
        content: contenu,
      });
      if (!error) {
        setTexte("");
        await charger();
      }
    } finally {
      setEnvoi(false);
    }
  }

  // ===== Envoyer une proposition de prix =====
  async function proposer() {
    const m = Math.round(Number(montant));
    if (!m || m <= 0 || envoi) return;
    setEnvoi(true);
    setErreur(null);
    try {
      const { error } = await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: monId,
        content: "Proposition : " + prix(m),
        offer_amount_fcfa: m,
        offer_status: "pending",
      });
      if (error) throw new Error(error.message);
      setMontant("");
      setModeOffre(false);
      await charger();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Envoi impossible.");
    } finally {
      setEnvoi(false);
    }
  }

  // ===== Repondre a une proposition (accepter / refuser) =====
  async function repondre(messageId: string, accepter: boolean) {
    if (envoi) return;
    setEnvoi(true);
    setErreur(null);
    try {
      const { error } = await supabase.rpc("fixci_repondre_offre", {
        p_message_id: messageId,
        p_accepter: accepter,
      });
      if (error) throw new Error(error.message);
      await charger();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Action impossible.");
    } finally {
      setEnvoi(false);
    }
  }

  const dealConclu = messages.some((m) => m.offer_status === "accepted");

  return (
    <div className="flex h-[68vh] flex-col">
      {/* ===== Messages ===== */}
      <div className="flex-1 overflow-y-auto px-1 py-2">
        {chargement ? (
          <p className="pt-8 text-center text-sm" style={{ color: "var(--color-texte2)" }}>
            Chargement...
          </p>
        ) : messages.length === 0 ? (
          <p className="pt-8 text-center text-sm" style={{ color: "var(--color-texte2)" }}>
            Demarrez la conversation. Discutez du besoin et proposez un prix.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {messages.map((m) => {
              const aMoi = m.sender_id === monId;

              // ----- Proposition de prix -----
              if (m.offer_amount_fcfa != null) {
                return (
                  <div
                    key={m.id}
                    className="mx-auto w-full max-w-[85%] rounded-2xl border p-3"
                    style={{ borderColor: "var(--color-or)", background: "var(--color-secondaire)" }}
                  >
                    <span className="block text-center text-xs" style={{ color: "var(--color-texte2)" }}>
                      {aMoi ? "Votre proposition" : "Proposition recue"}
                    </span>
                    <span
                      className="block text-center text-lg font-semibold"
                      style={{ color: "var(--color-texte)" }}
                    >
                      {prix(m.offer_amount_fcfa)}
                    </span>

                    {m.offer_status === "pending" && !aMoi && (
                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          onClick={() => repondre(m.id, false)}
                          disabled={envoi}
                          className="flex-1 rounded-lg border py-1.5 text-xs font-medium disabled:opacity-50"
                          style={{ borderColor: "var(--color-bordure)", color: "var(--color-texte)" }}
                        >
                          Refuser
                        </button>
                        <button
                          type="button"
                          onClick={() => repondre(m.id, true)}
                          disabled={envoi}
                          className="flex-1 rounded-lg py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                          style={{ background: "var(--color-vert)" }}
                        >
                          Accepter
                        </button>
                      </div>
                    )}
                    {m.offer_status === "pending" && aMoi && (
                      <span className="mt-1 block text-center text-xs" style={{ color: "var(--color-texte2)" }}>
                        En attente de reponse...
                      </span>
                    )}
                    {m.offer_status === "accepted" && (
                      <span className="mt-1 block text-center text-xs font-semibold" style={{ color: "var(--color-vert)" }}>
                        Acceptee — chantier cree
                      </span>
                    )}
                    {m.offer_status === "declined" && (
                      <span className="mt-1 block text-center text-xs" style={{ color: "var(--color-texte2)" }}>
                        Non retenue
                      </span>
                    )}
                  </div>
                );
              }

              // ----- Message texte -----
              return (
                <div
                  key={m.id}
                  className="max-w-[80%] rounded-2xl px-3 py-2 text-sm"
                  style={{
                    alignSelf: aMoi ? "flex-end" : "flex-start",
                    background: aMoi ? "var(--color-orange)" : "var(--color-secondaire)",
                    color: aMoi ? "#fff" : "var(--color-texte)",
                  }}
                >
                  <span>{m.content}</span>
                  <span
                    className="mt-0.5 block text-[10px]"
                    style={{ color: aMoi ? "rgba(255,255,255,0.8)" : "var(--color-texte2)" }}
                  >
                    {heure(m.created_at)}
                  </span>
                </div>
              );
            })}
            <div ref={finRef} />
          </div>
        )}
      </div>

      {erreur && (
        <p className="mb-1 rounded-lg bg-red-50 px-3 py-1.5 text-xs text-red-700">{erreur}</p>
      )}

      {dealConclu ? (
        <p
          className="rounded-xl border py-2 text-center text-xs font-medium"
          style={{ borderColor: "var(--color-vert)", color: "var(--color-vert)", background: "rgba(76,140,90,0.08)" }}
        >
          Prix convenu. Rendez-vous sur la demande pour payer l'acompte.
        </p>
      ) : modeOffre ? (
        /* ===== Composer : proposition de prix ===== */
        <div className="flex items-center gap-2 border-t pt-2" style={{ borderColor: "var(--color-bordure)" }}>
          <input
            type="number"
            inputMode="numeric"
            value={montant}
            onChange={(e) => setMontant(e.target.value)}
            placeholder="Montant en FCFA"
            className="flex-1 rounded-xl border px-3 py-2 text-sm outline-none"
            style={{ borderColor: "var(--color-bordure)", background: "var(--color-carte)", color: "var(--color-texte)" }}
          />
          <button
            type="button"
            onClick={() => setModeOffre(false)}
            className="rounded-xl border px-3 py-2 text-sm"
            style={{ borderColor: "var(--color-bordure)", color: "var(--color-texte2)" }}
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={proposer}
            disabled={envoi || !montant}
            className="rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
            style={{ background: "var(--color-vert)" }}
          >
            Proposer
          </button>
        </div>
      ) : (
        /* ===== Composer : message texte (+ bouton proposer un prix) ===== */
        <div className="flex flex-col gap-2 border-t pt-2" style={{ borderColor: "var(--color-bordure)" }}>
          <button
            type="button"
            onClick={() => setModeOffre(true)}
            className="self-start rounded-lg border px-3 py-1 text-xs font-medium"
            style={{ borderColor: "var(--color-or)", color: "var(--color-or)" }}
          >
            Proposer un prix
          </button>
          <div className="flex items-end gap-2">
            <textarea
              value={texte}
              onChange={(e) => setTexte(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  envoyer();
                }
              }}
              rows={1}
              placeholder="Ecrire un message..."
              className="max-h-28 flex-1 resize-none rounded-xl border px-3 py-2 text-sm outline-none"
              style={{ borderColor: "var(--color-bordure)", background: "var(--color-carte)", color: "var(--color-texte)" }}
            />
            <button
              type="button"
              onClick={envoyer}
              disabled={envoi || !texte.trim()}
              className="rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
              style={{ background: "var(--color-orange)" }}
            >
              Envoyer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}