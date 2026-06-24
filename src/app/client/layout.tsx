// >>> EMPLACEMENT : src/app/client/layout.tsx
// =========================================================================
// Mise en page commune a tout l'espace client (/client/...).
//   - Cadre centre facon "telephone" (max-w-md), fond beige de la marque.
//   - Filet tricolore en haut (via ta classe CSS existante .filet-tricolore).
//   - Barre de navigation client fixee en bas (NavClient).
//   - La marge basse (pb-24) evite que le contenu passe sous la barre.
// =========================================================================

import type { ReactNode } from "react";
import { NavClient } from "@/components/nav-client";

export default function LayoutClient({ children }: { children: ReactNode }) {
  return (
    <div
      className="mx-auto min-h-screen max-w-md"
      style={{ background: "var(--color-fond)" }}
    >
      {/* Filet tricolore de la marque (classe definie dans globals.css) */}
      <div className="filet-tricolore" />
      {/* Contenu de la page (marge basse pour ne pas passer sous la barre) */}
      <main className="px-4 pb-24 pt-3">{children}</main>
      {/* Barre de navigation du bas */}
      <NavClient />
    </div>
  );
}