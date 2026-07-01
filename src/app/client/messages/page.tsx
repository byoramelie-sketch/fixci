// >>> EMPLACEMENT : src/app/client/messages/page.tsx
"use client";

// =========================================================================
// Onglet "Messages" cote client : liste des conversations (recentes d'abord),
// avec le nom de l'artisan et un apercu du dernier message.
// Onglet principal -> pas de fleche retour (la barre du bas suffit).
// =========================================================================

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { IconeMessage } from "@/components/icones";

type Conv = { id: string; nom: string; apercu: string };

export default function MessagesClient() {
  const supabase = createClient();
  const [convs, setConvs] = useState<Conv[]>([]);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        setChargement(false);
        return;
      }

      // Mes conversations (en tant que client), les plus recentes d'abord.
      const { data: cs } = await supabase
        .from("conversations")
        .select("id, artisan_id, last_message_at")
        .eq("client_id", auth.user.id)
        .order("last_message_at", { ascending: false });
      const liste = (cs ?? []) as {
        id: string;
        artisan_id: string;
        last_message_at: string | null;
      }[];

      // Noms des artisans + apercus (dernier message) : en PARALLELE.
      const ids = [...new Set(liste.map((c) => c.artisan_id))];
      const convIds = liste.map((c) => c.id);
      const [profsRes, msgsRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, name")
          .in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]),
        supabase
          .from("messages")
          .select("conversation_id, content, created_at")
          .in("conversation_id", convIds.length ? convIds : ["00000000-0000-0000-0000-000000000000"])
          .order("created_at", { ascending: false }),
      ]);
      const noms: Record<string, string> = {};
      (profsRes.data ?? []).forEach((p: { id: string; name: string }) => {
        noms[p.id] = p.name ?? "Artisan";
      });
      const apercus: Record<string, string> = {};
      (msgsRes.data ?? []).forEach((m: { conversation_id: string; content: string }) => {
        if (!apercus[m.conversation_id]) apercus[m.conversation_id] = m.content;
      });

      setConvs(
        liste.map((c) => ({
          id: c.id,
          nom: noms[c.artisan_id] ?? "Artisan",
          apercu: apercus[c.id] ?? "Demarrez la conversation",
        }))
      );
      setChargement(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl" style={{ color: "var(--color-texte)" }}>
        Messages
      </h1>

      {chargement ? (
        <p className="pt-8 text-center text-sm" style={{ color: "var(--color-texte2)" }}>
          Chargement...
        </p>
      ) : convs.length === 0 ? (
        <p className="pt-8 text-center text-sm" style={{ color: "var(--color-texte2)" }}>
          Aucune conversation pour le moment. Depuis une offre recue, touchez « Discuter » pour
          echanger avec l'artisan.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {convs.map((c) => (
            <Link
              key={c.id}
              href={`/client/messages/conversation?id=${c.id}`}
              className="flex items-center gap-3 rounded-xl border p-3 transition hover:brightness-95"
              style={{ background: "var(--color-carte)", borderColor: "var(--color-bordure)" }}
            >
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                style={{ background: "var(--color-secondaire)", color: "var(--color-orange)" }}
              >
                <IconeMessage taille={18} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold" style={{ color: "var(--color-texte)" }}>
                  {c.nom}
                </span>
                <span className="block truncate text-xs" style={{ color: "var(--color-texte2)" }}>
                  {c.apercu}
                </span>
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}