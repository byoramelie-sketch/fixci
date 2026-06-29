// >>> EMPLACEMENT : src/app/artisan/messages/page.tsx
"use client";

// =========================================================================
// Onglet "Messages" cote artisan : liste des conversations (recentes d'abord),
// avec le nom du client et un apercu du dernier message.
// Onglet principal -> barre de navigation du bas (NavArtisan), pas de fleche.
// =========================================================================

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { FiletTricolore } from "@/components/ui";
import { NavArtisan } from "@/components/nav-artisan";
import { IconeMessage } from "@/components/icones";

type Conv = { id: string; nom: string; apercu: string };

export default function MessagesArtisan() {
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

      const { data: cs } = await supabase
        .from("conversations")
        .select("id, client_id, last_message_at")
        .eq("artisan_id", auth.user.id)
        .order("last_message_at", { ascending: false });
      const liste = (cs ?? []) as {
        id: string;
        client_id: string;
        last_message_at: string | null;
      }[];

      const ids = [...new Set(liste.map((c) => c.client_id))];
      const noms: Record<string, string> = {};
      if (ids.length) {
        const { data: profs } = await supabase.from("profiles").select("id, name").in("id", ids);
        (profs ?? []).forEach((p: { id: string; name: string }) => {
          noms[p.id] = p.name ?? "Client";
        });
      }

      const convIds = liste.map((c) => c.id);
      const apercus: Record<string, string> = {};
      if (convIds.length) {
        const { data: msgs } = await supabase
          .from("messages")
          .select("conversation_id, content, created_at")
          .in("conversation_id", convIds)
          .order("created_at", { ascending: false });
        (msgs ?? []).forEach((m: { conversation_id: string; content: string }) => {
          if (!apercus[m.conversation_id]) apercus[m.conversation_id] = m.content;
        });
      }

      setConvs(
        liste.map((c) => ({
          id: c.id,
          nom: noms[c.client_id] ?? "Client",
          apercu: apercus[c.id] ?? "Demarrez la conversation",
        }))
      );
      setChargement(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-fond pb-24">
      <FiletTricolore />
      <div className="mx-auto max-w-md px-5 py-6">
        <h1 className="mb-5 text-xl" style={{ color: "var(--color-texte)" }}>
          Messages
        </h1>

        {chargement ? (
          <p className="pt-8 text-center text-sm" style={{ color: "var(--color-texte2)" }}>
            Chargement...
          </p>
        ) : convs.length === 0 ? (
          <p className="pt-8 text-center text-sm" style={{ color: "var(--color-texte2)" }}>
            Aucune conversation pour le moment.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {convs.map((c) => (
              <Link
                key={c.id}
                href={`/artisan/messages/conversation?id=${c.id}`}
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
      <NavArtisan />
    </div>
  );
}