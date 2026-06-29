// >>> EMPLACEMENT : src/app/client/messages/conversation/page.tsx
"use client";

// =========================================================================
// Une conversation cote CLIENT (?id=... dans l'adresse).
// En-tete : nom de l'artisan + fleche retour. Corps : le composant <Chat>.
// =========================================================================

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { BoutonRetour } from "@/components/icones";
import { Chat } from "@/components/chat";

export default function PageConversationClient() {
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
  const [nomArtisan, setNomArtisan] = useState("Artisan");
  const [pret, setPret] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      setMonId(auth.user.id);

      const { data: conv } = await supabase
        .from("conversations")
        .select("artisan_id")
        .eq("id", conversationId)
        .maybeSingle();
      if (conv?.artisan_id) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("name")
          .eq("id", conv.artisan_id)
          .maybeSingle();
        if (prof?.name) setNomArtisan(prof.name);
      }
      setPret(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <BoutonRetour />
        <h1 className="text-xl" style={{ color: "var(--color-texte)" }}>
          {nomArtisan}
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
  );
}