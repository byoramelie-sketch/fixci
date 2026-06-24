// =========================================================================
// >>> EMPLACEMENT DE CE FICHIER :
//     src/app/admin/(protege)/layout.tsx
// >>> MISE EN PAGE ADMIN (verifie l'acces + menu lateral)
// =========================================================================
import { requireAdmin } from "@/lib/require-admin";
import { MenuAdmin } from "@/components/menu-admin";
import { FiletTricolore } from "@/components/ui";

// ===== Mise en page de l'espace admin =====
// Protege TOUTES les pages /admin/* (sauf la connexion, qui a son propre
// dossier hors de ce layout). Affiche le menu lateral a gauche.
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Verifie l'acces admin avant d'afficher quoi que ce soit.
  await requireAdmin();

  return (
    <div className="min-h-screen bg-fond">
      <FiletTricolore />
      <div className="flex">
        <MenuAdmin />
        <main className="flex-1 p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}