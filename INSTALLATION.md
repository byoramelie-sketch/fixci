# FixCI — Espace Artisan : où mettre chaque fichier

Tu as déjà créé le projet `fixci` avec `create-next-app` et installé Supabase.
Voici où ranger les fichiers fournis (tout part de la racine du projet `fixci/`).

## Les fichiers et leur emplacement

```
fixci/
├─ .env.local                          ← (déjà fait : URL + clé anon)
└─ src/
   ├─ middleware.ts                     ← protège les routes /artisan et /admin
   ├─ lib/
   │  ├─ types.ts                       ← types TypeScript
   │  └─ supabase/
   │     ├─ client.ts                   ← connexion côté navigateur
   │     ├─ server.ts                   ← connexion côté serveur
   │     └─ middleware.ts               ← rafraîchit la session
   ├─ components/
   │  └─ ui.tsx                         ← filet tricolore, logo, bouton
   └─ app/
      ├─ globals.css                    ← REMPLACE celui généré (thème FixCI)
      └─ artisan/
         ├─ inscription/page.tsx        ← inscription 3 étapes + CNI
         └─ verification/page.tsx       ← écran "dossier en cours"
```

## Points d'attention

1. **globals.css** : remplace le fichier `src/app/globals.css` créé automatiquement
   par celui-ci (il définit tes couleurs et polices).

2. **Les polices Fraunces et Inter** : ajoute-les dans `src/app/layout.tsx`.
   Exemple minimal à mettre dans ce fichier :

   ```tsx
   import { Inter, Fraunces } from "next/font/google";
   import "./globals.css";

   const inter = Inter({ subsets: ["latin"], variable: "--font-corps" });
   const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-titre" });

   export default function RootLayout({ children }: { children: React.ReactNode }) {
     return (
       <html lang="fr" className={`${inter.variable} ${fraunces.variable}`}>
         <body>{children}</body>
       </html>
     );
   }
   ```

3. **Authentification par téléphone** : pour démarrer simplement, l'inscription
   crée un compte e-mail interne dérivé du numéro (`{numéro}@fixci.local`) avec
   mot de passe. C'est volontaire pour le MVP. L'OTP par SMS (prévu au cahier des
   charges) viendra en V1 — il demande de configurer un fournisseur SMS dans
   Supabase. On le branchera plus tard.

## Lancer l'app

```bash
npm run dev
```

Puis ouvre **http://localhost:3000/artisan/inscription** dans ton navigateur.

## Tester le parcours complet

1. Remplis les 3 étapes et envoie le dossier.
2. Tu arrives sur l'écran "Dossier en cours de vérification" (orange).
3. Va dans Supabase → Table Editor → `artisans` : tu vois ta ligne avec
   `status = pending`.
4. Passe ce `status` à `verified` à la main (pour simuler l'admin), recharge
   la page `/artisan/verification` : elle passe au vert.

C'est exactement le rôle qu'aura l'espace Admin qu'on construira ensuite.
