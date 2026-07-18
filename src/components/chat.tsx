// >>> EMPLACEMENT : src/components/chat.tsx
"use client";

// =========================================================================
// Fil de discussion reutilisable (client <-> artisan).
//   - Messages texte (les miens a droite, ceux de l'autre a gauche).
//   - PROPOSITIONS DE PRIX : chacun propose un montant, l'autre Accepte /
//     Refuse. Une nouvelle proposition remplace la precedente.
//   - DEVIS DETAILLES : quand l'artisan envoie un devis, il s'affiche DANS la
//     conversation avec tout son detail (postes, sous-totaux, total). Le
//     client l'accepte ou le refuse SANS quitter le chat.
//   - Accepter (prix ou devis) cree le devis + le chantier, et alimente le
//     flux de paiement existant.
//   - Rafraichissement automatique toutes les 4 s.
// =========================================================================

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Message = {
  id: string;
  // Un message de FixCI n'a pas d'expediteur humain : sender_id est vide et
  // is_system vaut true. On ne met jamais un message automatique dans la
  // bouche du client ou de l'artisan.
  sender_id: string | null;
  is_system: boolean;
  content: string;
  created_at: string;
  offer_amount_fcfa: number | null;
  offer_status: string | null;
  quote_id: string | null;
};

type LigneDevis = {
  description: string;
  quantite: number;
  unite: string;
  prix_unitaire: number;
  total: number;
  type: string;
};

type Devis = {
  id: string;
  title: string | null;
  amount_fcfa: number;
  lines: LigneDevis[];
  materials_fcfa: number;
  labor_fcfa: number;
  validity_days: number;
  terms: string | null;
  status: string;
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
  const [devis, setDevis] = useState<Record<string, Devis>>({});
  const [ouverts, setOuverts] = useState<Record<string, boolean>>({});
  const [texte, setTexte] = useState("");
  const [montant, setMontant] = useState("");
  const [modeOffre, setModeOffre] = useState(false);
  const [chargement, setChargement] = useState(true);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  // Ou envoyer la personne pour noter, et a-t-elle deja note ?
  // Le bouton "Laisser un avis" disparait une fois l'avis donne : on ne
  // harcele personne.
  const [lienAvis, setLienAvis] = useState<string | null>(null);
  const [dejaNote, setDejaNote] = useState(false);
  const finRef = useRef<HTMLDivElement>(null);

  async function charger() {
    const { data } = await supabase
      .from("messages")
      .select("id, sender_id, is_system, content, created_at, offer_amount_fcfa, offer_status, quote_id")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
    const liste = (data ?? []) as Message[];
    setMessages(liste);

    // Charger le detail des devis references dans la conversation.
    const ids = [...new Set(liste.map((m) => m.quote_id).filter(Boolean))] as string[];
    if (ids.length) {
      const { data: qs } = await supabase
        .from("quotes")
        .select("id, title, amount_fcfa, lines, materials_fcfa, labor_fcfa, validity_days, terms, status")
        .in("id", ids);
      const parId: Record<string, Devis> = {};
      ((qs ?? []) as Devis[]).forEach((q) => {
        parId[q.id] = q;
      });
      setDevis(parId);
    }

    // ===== Ou mene le bouton "Laisser un avis" ? =====
    // On ne le calcule que si FixCI a envoye son invitation, pour ne pas
    // charger inutilement a chaque rafraichissement.
    if (liste.some((m) => m.is_system)) {
      const { data: conv } = await supabase
        .from("conversations")
        .select("request_id, client_id, artisan_id")
        .eq("id", conversationId)
        .maybeSingle();
      const c = conv as { request_id: string; client_id: string; artisan_id: string } | null;

      if (c) {
        // Je suis le client, ou l'artisan ? Chacun note depuis son espace.
        const suisClient = c.client_id === monId;
        setLienAvis(
          suisClient
            ? `/client/mes-demandes/detail?id=${c.request_id}`
            : `/artisan/demandes/${c.request_id}`
        );

        // Ai-je deja note ce chantier ?
        const { data: job } = await supabase
          .from("jobs")
          .select("id")
          .eq("request_id", c.request_id)
          .maybeSingle();
        const idJob = (job as { id: string } | null)?.id;
        if (idJob) {
          const { data: avis } = await supabase
            .from("reviews")
            .select("id")
            .eq("job_id", idJob)
            .eq("author_id", monId)
            .maybeSingle();
          setDejaNote(!!avis);
        }
      }
    }

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

  // ===== Repondre a une proposition de prix =====
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

  // ===== Repondre a un DEVIS depuis la conversation =====
  async function repondreDevis(quoteId: string, accepter: boolean) {
    if (envoi) return;
    setEnvoi(true);
    setErreur(null);
    try {
      const { error } = await supabase.rpc("fixci_repondre_devis", {
        p_quote_id: quoteId,
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

  const dealConclu =
    messages.some((m) => m.offer_status === "accepted") ||
    Object.values(devis).some((d) => d.status === "accepted");

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

              // ----- MESSAGE DE FIXCI (invitation a noter) -----
              // Centre, sans bulle, visuellement different d'un message humain :
              // on doit voir d'un coup d'oeil que ca ne vient pas de l'autre
              // personne. Le bouton disparait une fois l'avis laisse.
              if (m.is_system) {
                return (
                  <div
                    key={m.id}
                    className="mx-auto my-1 w-full max-w-[92%] rounded-2xl border border-dashed p-3 text-center"
                    style={{ borderColor: "var(--color-or)", background: "var(--color-secondaire)" }}
                  >
                    <span
                      className="block text-[11px] font-semibold uppercase tracking-wide"
                      style={{ color: "var(--color-or)" }}
                    >
                      FixCI
                    </span>
                    <span
                      className="mt-1 block text-sm"
                      style={{ color: "var(--color-texte)" }}
                    >
                      {m.content}
                    </span>
                    {lienAvis && !dejaNote && (
                      <a
                        href={lienAvis}
                        className="mt-2 inline-block rounded-xl px-4 py-2 text-xs font-semibold text-white"
                        style={{ background: "var(--color-or)" }}
                      >
                        Laisser un avis
                      </a>
                    )}
                    {dejaNote && (
                      <span
                        className="mt-2 block text-xs font-medium"
                        style={{ color: "var(--color-vert)" }}
                      >
                        Merci, votre avis est enregistre.
                      </span>
                    )}
                  </div>
                );
              }

              // ----- DEVIS DETAILLE -----
              if (m.quote_id && devis[m.quote_id]) {
                const d = devis[m.quote_id];
                const ouvert = ouverts[d.id] ?? false;
                return (
                  <div
                    key={m.id}
                    className="mx-auto w-full max-w-[92%] rounded-2xl border p-3"
                    style={{ borderColor: "var(--color-orange)", background: "var(--color-carte)" }}
                  >
                    <span className="block text-center text-xs" style={{ color: "var(--color-texte2)" }}>
                      {aMoi ? "Votre devis" : "Devis recu"}
                    </span>
                    {d.title && (
                      <span
                        className="mt-0.5 block text-center text-sm font-semibold"
                        style={{ color: "var(--color-texte)" }}
                      >
                        {d.title}
                      </span>
                    )}
                    <span
                      className="mt-1 block text-center text-xl font-bold"
                      style={{ color: "var(--color-orange)" }}
                    >
                      {prix(d.amount_fcfa)}
                    </span>

                    {/* Voir / masquer le detail */}
                    {d.lines?.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setOuverts((o) => ({ ...o, [d.id]: !ouvert }))}
                        className="mx-auto mt-1.5 block text-xs font-medium underline"
                        style={{ color: "var(--color-texte2)" }}
                      >
                        {ouvert ? "Masquer le detail" : `Voir le detail (${d.lines.length} postes)`}
                      </button>
                    )}

                    {ouvert && d.lines?.length > 0 && (
                      <div
                        className="mt-2 border-t pt-2"
                        style={{ borderColor: "var(--color-bordure)" }}
                      >
                        {d.lines.map((l, i) => (
                          <div key={i} className="flex items-start justify-between gap-2 py-1">
                            <span className="text-xs" style={{ color: "var(--color-texte)" }}>
                              {l.description}
                              <span className="block" style={{ color: "var(--color-texte2)" }}>
                                {l.quantite} {l.unite} x {prix(l.prix_unitaire)}
                              </span>
                            </span>
                            <span className="shrink-0 text-xs font-medium">{prix(l.total)}</span>
                          </div>
                        ))}
                        <div
                          className="mt-1 border-t pt-1.5 text-xs"
                          style={{ borderColor: "var(--color-bordure)", color: "var(--color-texte2)" }}
                        >
                          <div className="flex justify-between">
                            <span>Fournitures</span>
                            <span>{prix(d.materials_fcfa)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Main d&apos;oeuvre</span>
                            <span>{prix(d.labor_fcfa)}</span>
                          </div>
                        </div>
                        {d.terms && (
                          <p className="mt-2 text-[11px]" style={{ color: "var(--color-texte2)" }}>
                            {d.terms}
                          </p>
                        )}
                        <p className="mt-1 text-[11px]" style={{ color: "var(--color-texte2)" }}>
                          Valable {d.validity_days} jours.
                        </p>
                      </div>
                    )}

                    {/* Actions : seul le client (celui qui n'a pas envoye) repond */}
                    {d.status === "proposed" && !aMoi && (
                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          onClick={() => repondreDevis(d.id, false)}
                          disabled={envoi}
                          className="flex-1 rounded-lg border py-2 text-xs font-medium disabled:opacity-50"
                          style={{ borderColor: "var(--color-bordure)", color: "var(--color-texte)" }}
                        >
                          Refuser
                        </button>
                        <button
                          type="button"
                          onClick={() => repondreDevis(d.id, true)}
                          disabled={envoi}
                          className="flex-1 rounded-lg py-2 text-xs font-semibold text-white disabled:opacity-50"
                          style={{ background: "var(--color-vert)" }}
                        >
                          Accepter le devis
                        </button>
                      </div>
                    )}
                    {d.status === "proposed" && aMoi && (
                      <span className="mt-2 block text-center text-xs" style={{ color: "var(--color-texte2)" }}>
                        En attente de la reponse du client...
                      </span>
                    )}
                    {d.status === "accepted" && (
                      <span className="mt-2 block text-center text-xs font-semibold" style={{ color: "var(--color-vert)" }}>
                        Devis accepte — chantier cree
                      </span>
                    )}
                    {d.status === "declined" && (
                      <span className="mt-2 block text-center text-xs" style={{ color: "var(--color-texte2)" }}>
                        Devis non retenu
                      </span>
                    )}
                  </div>
                );
              }

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
          Prix convenu. Rendez-vous sur la demande pour payer l&apos;acompte.
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