// >>> EMPLACEMENT : src/lib/erreurs.ts

// =========================================================================
// Traduit les messages d'erreur techniques de Supabase (en anglais) en
// messages simples et clairs en francais, a afficher a l'utilisateur.
// Reutilisable partout : connexion, inscription client, inscription artisan.
// =========================================================================

export function messageErreurAuth(message: string | undefined | null): string {
  const m = (message ?? "").toLowerCase();

  // --- Connexion ---
  if (m.includes("invalid login credentials"))
    return "Numéro/e-mail ou mot de passe incorrect.";
  if (m.includes("email not confirmed"))
    return "Votre compte n'est pas encore confirmé.";

  // --- Inscription ---
  if (m.includes("already registered") || m.includes("already been registered") || m.includes("user already exists"))
    return "Ce numéro est déjà utilisé. Connectez-vous.";
  if (m.includes("password should be at least") || m.includes("password is too short"))
    return "Le mot de passe doit contenir au moins 6 caractères.";
  if (m.includes("unable to validate email address") || m.includes("invalid email") || m.includes("email address") && m.includes("invalid"))
    return "Numéro de téléphone invalide.";
  if (m.includes("signup is disabled"))
    return "Les inscriptions sont momentanément fermées.";

  // --- Limites / reseau ---
  if (m.includes("for security purposes") || m.includes("rate limit") || m.includes("too many requests"))
    return "Trop de tentatives. Patientez un instant avant de réessayer.";
  if (m.includes("failed to fetch") || m.includes("network") || m.includes("networkerror"))
    return "Connexion impossible. Vérifiez votre connexion internet.";

  // --- Defaut ---
  return "Une erreur est survenue. Veuillez réessayer.";
}