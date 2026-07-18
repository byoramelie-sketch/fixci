// >>> EMPLACEMENT : src/lib/telephone.ts

// =========================================================================
// FixCI - NUMEROS DE TELEPHONE : un numero = un compte.
//
// LE PROBLEME QUE CE FICHIER REGLE
//   Avant, on gardait les chiffres tels que saisis. Du coup :
//     "0700000001"          -> 0700000001
//     "+225 07 00 00 00 01" -> 2250700000001
//   ... c'etait DEUX comptes differents pour la meme personne. Et si elle se
//   reconnectait en tapant son numero autrement, elle n'y arrivait plus.
//
// LA SOLUTION
//   On ramene TOUJOURS le numero a une seule ecriture, la norme
//   internationale (E.164) : +225 suivi du numero, sans espace ni tiret.
//   Peu importe comment la personne l'ecrit, on retombe sur le meme numero.
//   C'est aussi le format exige pour envoyer un SMS (verification par code).
//
// A SAVOIR SUR LE ZERO
//   En Cote d'Ivoire, le 0 fait partie du numero : +225 07 00 00 00 01.
//   En France, il saute : 06 12 34 56 78 -> +33 6 12 34 56 78.
//   D'ou le reglage "retirerZero" pays par pays.
// =========================================================================

export type Pays = {
  code: string;        // Code du pays (CI, FR...)
  nom: string;         // Nom affiche
  indicatif: string;   // Indicatif sans le "+"
  min: number;         // Longueur minimale du numero (apres l'indicatif)
  max: number;         // Longueur maximale
  retirerZero: boolean; // Le 0 de debut saute-t-il ?
  exemple: string;     // Exemple affiche dans le champ
};

// La Cote d'Ivoire en premier : c'est notre marche.
// Ensuite les pays voisins, puis les pays de la diaspora.
export const PAYS: Pays[] = [
  { code: "CI", nom: "Cote d'Ivoire", indicatif: "225", min: 10, max: 10, retirerZero: false, exemple: "07 07 12 34 56" },
  { code: "BF", nom: "Burkina Faso",  indicatif: "226", min: 8,  max: 8,  retirerZero: false, exemple: "70 12 34 56" },
  { code: "ML", nom: "Mali",          indicatif: "223", min: 8,  max: 8,  retirerZero: false, exemple: "70 12 34 56" },
  { code: "SN", nom: "Senegal",       indicatif: "221", min: 9,  max: 9,  retirerZero: false, exemple: "77 123 45 67" },
  { code: "GN", nom: "Guinee",        indicatif: "224", min: 9,  max: 9,  retirerZero: false, exemple: "62 12 34 56 7" },
  { code: "TG", nom: "Togo",          indicatif: "228", min: 8,  max: 8,  retirerZero: false, exemple: "90 12 34 56" },
  { code: "BJ", nom: "Benin",         indicatif: "229", min: 8,  max: 10, retirerZero: false, exemple: "90 12 34 56" },
  { code: "GH", nom: "Ghana",         indicatif: "233", min: 9,  max: 9,  retirerZero: true,  exemple: "24 123 4567" },
  { code: "NG", nom: "Nigeria",       indicatif: "234", min: 10, max: 10, retirerZero: true,  exemple: "802 123 4567" },
  { code: "CM", nom: "Cameroun",      indicatif: "237", min: 9,  max: 9,  retirerZero: false, exemple: "6 71 23 45 67" },
  { code: "FR", nom: "France",        indicatif: "33",  min: 9,  max: 9,  retirerZero: true,  exemple: "6 12 34 56 78" },
  { code: "BE", nom: "Belgique",      indicatif: "32",  min: 8,  max: 9,  retirerZero: true,  exemple: "470 12 34 56" },
  { code: "CH", nom: "Suisse",        indicatif: "41",  min: 9,  max: 9,  retirerZero: true,  exemple: "78 123 45 67" },
  { code: "GB", nom: "Royaume-Uni",   indicatif: "44",  min: 10, max: 10, retirerZero: true,  exemple: "7400 123456" },
  { code: "US", nom: "Etats-Unis",    indicatif: "1",   min: 10, max: 10, retirerZero: false, exemple: "202 555 0123" },
  { code: "CA", nom: "Canada",        indicatif: "1",   min: 10, max: 10, retirerZero: false, exemple: "416 555 0123" },
];

// Le pays par defaut : la Cote d'Ivoire.
export const PAYS_DEFAUT = PAYS[0];

export function trouverPays(code: string): Pays {
  return PAYS.find((p) => p.code === code) ?? PAYS_DEFAUT;
}

// ===== Normaliser un numero =====
// Rend "+2250707123456" quel que soit ce que la personne a tape, ou null si
// le numero n'est pas valide pour ce pays.
export function normaliserTelephone(codePays: string, saisie: string): string | null {
  const pays = trouverPays(codePays);
  let chiffres = (saisie ?? "").replace(/\D/g, "");
  if (!chiffres) return null;

  // La personne a peut-etre retape l'indicatif ("+225 07..." ou "00225 07...").
  if (chiffres.startsWith("00" + pays.indicatif)) {
    chiffres = chiffres.slice(2 + pays.indicatif.length);
  } else if (chiffres.startsWith(pays.indicatif) && chiffres.length > pays.max) {
    chiffres = chiffres.slice(pays.indicatif.length);
  }

  // Le 0 de debut : il saute dans certains pays, pas en Cote d'Ivoire.
  if (pays.retirerZero && chiffres.startsWith("0")) {
    chiffres = chiffres.slice(1);
  }

  // La longueur doit correspondre au pays.
  if (chiffres.length < pays.min || chiffres.length > pays.max) return null;

  return "+" + pays.indicatif + chiffres;
}

// ===== Numero lisible a l'ecran =====
// "+2250707123456" -> "+225 07 07 12 34 56"
export function afficherTelephone(e164: string): string {
  const pays = PAYS.find((p) => e164.startsWith("+" + p.indicatif));
  if (!pays) return e164;
  const reste = e164.slice(1 + pays.indicatif.length);
  const groupes = reste.match(/.{1,2}/g) ?? [reste];
  return "+" + pays.indicatif + " " + groupes.join(" ");
}

// ===== L'identifiant de connexion =====
// Supabase attend une adresse : on en fabrique une, toujours la meme pour un
// numero donne, puisque le numero est desormais normalise.
export function telephoneVersEmail(e164: string): string {
  return e164.replace(/\D/g, "") + "@example.com";
}

// ===== Ancien format (comptes crees avant la normalisation) =====
// Avant, on gardait les chiffres tels quels : "0700000001@example.com".
// On garde cette fonction pour que les comptes deja crees puissent encore se
// connecter. A SUPPRIMER une fois que plus personne n'utilise l'ancien format.
export function ancienEmail(saisie: string): string {
  return (saisie ?? "").replace(/\D/g, "") + "@example.com";
}