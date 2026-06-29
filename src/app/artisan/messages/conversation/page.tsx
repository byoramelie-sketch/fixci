// >>> EMPLACEMENT : src/app/artisan/messages/conversation/page.tsx
"use client";

// =========================================================================
// Une conversation cote ARTISAN (?id=... dans l'adresse).
// En-tete : fleche retour + nom du client. Corps : le composant <Chat>.
// Barre de navigation du bas (NavArtisan) conservee.
// =========================================================================

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { FiletTricolore } from "@/components/ui";
import { NavArtisan } from "@/components/nav-artisan";
import { BoutonRetour } from "@/components/icones";
import { Chat } from "@/components/chat";

export default function PageConversationArtisan() {
  return (
    <Suspense
      fallback={
        <p className="pt-10 text-center text-sm" style={{ color: "var(--color-texte2)" }}>
          Chargement...
        </p>
      }
    >
      <Contenu />
    </Suspense>
  );
}

function Contenu() {
  const params = useSearchParams();
  const supabase = createClient();
  const conversationId = params.get("id") ?? "";

  const [monId, setMonId] = useState<string | null>(null);
  const [nomClient, setNomClient] = useState("Client");
  const [pret, setPret] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      setMonId(auth.user.id);

      const { data: conv } = await supabase
        .from("conversations")
        .select("client_id")
        .eq("id", conversationId)
        .maybeSingle();
      if (conv?.client_id) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("name")
          .eq("id", conv.client_id)
          .maybeSingle();
        if (prof?.name) setNomClient(prof.name);
      }
      setPret(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  return (
    <div className="min-h-screen bg-fond pb-24">
      <FiletTricolore />
      <div className="mx-auto max-w-md px-5 py-6">
        <div className="mb-3 flex items-center gap-2">
          <BoutonRetour />
          <h1 className="text-xl" style={{ color: "var(--color-texte)" }}>
            {nomClient}
          </h1>
        </div>

        {pret && monId && conversationId ? (
          <Chat conversationId={conversationId} monId={monId} />
        ) : (
          <p className="pt-10 text-center text-sm" style={{ color: "var(--color-texte2)" }}>
            Chargement...
          </p>
        )}
      </div>
      <NavArtisan />
    </div>
  );
}