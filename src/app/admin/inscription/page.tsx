// >>> EMPLACEMENT : src/app/admin/inscription/page.tsx
"use client";

// =========================================================================
// Creation de compte ADMIN (page discrete, non liee depuis le site).
//   - Champs : nom, e-mail, mot de passe, code d'invitation secret.
//   - Le role 'admin' n'est accorde QUE si le code correspond a celui stocke
//     dans la base (verifie cote serveur par le trigger). Sinon, le compte
//     serait cree en simple client : on le detecte et on refuse.
//   - Apres succes : redirection vers /admin.
// =========================================================================

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function InscriptionAdmin() {
  const router = useRouter();
  const supabase = createClient();

  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [code, setCode] = useState("");
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  // ===== Creation du compte admin =====
  async function creerCompte() {
    setChargement(true);
    setErreur(null);
    try {
      // 1. Inscription : on transmet le role demande + le code secret.
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: motDePasse,
        options: { data: { role: "admin", admin_code: code.trim(), name: nom.trim() } },
      });
      if (error) {
        if (error.message.toLowerCase().includes("already")) {
          throw new Error("Cet e-mail est deja utilise.");
        }
        throw new Error("Creation impossible. Verifiez les informations.");
      }
      if (!data.user) {
        throw new Error("Creation impossible. Reessayez.");
      }

      // 2. Verifier le role reellement accorde (admin seulement si le code etait bon).
      const { data: profil } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();

      // 3. Suite selon le resultat.
      if (profil?.role === "admin") {
        router.push("/admin");
      } else {
        // Code incorrect : le compte a ete cree en simple client -> on se deconnecte et on refuse.
        await supabase.auth.signOut();
        throw new Error("Code d'invitation incorrect.");
      }
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Creation impossible.");
    } finally {
      setChargement(false);
    }
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--color-fond)" }}>
      {/* Filet tricolore (classe definie dans globals.css) */}
      <div className="filet-tricolore" />

      <div className="mx-auto flex min-h-[80vh] max-w-sm flex-col justify-center px-5">
        {/* En-tete */}
        <div className="mb-8 text-center">
          <span className="text-2xl" style={{ fontFamily: "var(--font-titre)" }}>
            <span style={{ color: "var(--color-orange)", fontWeight: 700 }}>Fix</span>
            <span style={{ color: "var(--color-vert)", fontWeight: 700 }}>CI</span>
          </span>
          <p className="mt-2 text-sm" style={{ color: "var(--color-texte2)" }}>
            Espace d'administration
          </p>
        </div>

        {/* Carte du formulaire */}
        <div
          className="rounded-2xl border p-6"
          style={{ background: "var(--color-carte)", borderColor: "var(--color-bordure)" }}
        >
          <h1 className="mb-5 text-xl" style={{ color: "var(--color-texte)" }}>
            Creer un compte administrateur
          </h1>

          {/* Nom */}
          <label className="mb-4 block">
            <span className="mb-1.5 block text-sm font-medium" style={{ color: "var(--color-texte)" }}>
              Nom
            </span>
            <input
              className="champ-admin"
              type="text"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder="Votre nom"
            />
          </label>

          {/* E-mail */}
          <label className="mb-4 block">
            <span className="mb-1.5 block text-sm font-medium" style={{ color: "var(--color-texte)" }}>
              E-mail
            </span>
            <input
              className="champ-admin"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@fixci.com"
              autoComplete="username"
            />
          </label>

          {/* Mot de passe */}
          <label className="mb-4 block">
            <span className="mb-1.5 block text-sm font-medium" style={{ color: "var(--color-texte)" }}>
              Mot de passe
            </span>
            <input
              className="champ-admin"
              type="password"
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
              autoComplete="new-password"
            />
          </label>

          {/* Code d'invitation */}
          <label className="mb-5 block">
            <span className="mb-1.5 block text-sm font-medium" style={{ color: "var(--color-texte)" }}>
              Code d'invitation
            </span>
            <input
              className="champ-admin"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Code secret fourni"
              autoComplete="off"
            />
          </label>

          {/* Message d'erreur */}
          {erreur && (
            <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {erreur}
            </p>
          )}

          {/* Bouton */}
          <button
            type="button"
            onClick={creerCompte}
            disabled={chargement}
            className="w-full rounded-xl px-4 py-3 text-center text-sm font-semibold text-white disabled:opacity-60"
            style={{ background: "var(--color-orange)" }}
          >
            {chargement ? "Creation..." : "Creer le compte"}
          </button>
        </div>
      </div>

      {/* Style local des champs (comme la page de connexion) */}
      <style>{`
        .champ-admin {
          width: 100%;
          border: 1px solid var(--color-bordure);
          border-radius: 12px;
          background: var(--color-fond);
          padding: 0.75rem 1rem;
          font-size: 1rem;
          outline: none;
          color: var(--color-texte);
        }
        .champ-admin:focus { border-color: var(--color-orange); }
      `}</style>
    </div>
  );
}