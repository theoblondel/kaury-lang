// Vocabulaire de Kaury : chaque mot existe en français (forme canonique, sans accent)
// et en anglais. Les accents sont toujours acceptés : « état » = « etat ».

export function sansAccents(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '')
}

/** canonique → alias anglais (et variantes) */
const TABLE: Record<string, string[]> = {
  // ---- noyau ----
  soit: ['let', 'const'],
  etat: ['state'],
  fonction: ['function', 'fn'],
  puis: ['then'],
  si: ['if'],
  sinon: ['else'],
  alors: [],
  pour: ['for'],
  dans: ['in'],
  tant: ['while'],
  que: [],
  attends: ['await', 'wait'],
  essaie: ['try'],
  erreur: ['catch'],
  importe: ['import'],
  de: ['from'],
  exporte: ['export'],
  retourne: ['return'],
  arrete: ['break'],
  continue: [],
  vrai: ['true'],
  faux: ['false'],
  rien: ['nothing', 'null', 'none'],
  et: ['and'],
  ou: ['or'],
  non: ['not'],
  ouvre: ['open'],
  ferme: ['close'],
  bascule: ['toggle'],
  aller: ['go', 'goto', 'navigate'],
  js: ['javascript'],
  // ---- web ----
  site: [],
  page: [],
  composant: ['component'],
  section: [],
  entete: ['header'],
  pied: ['footer'],
  nav: [],
  grille: ['grid'],
  colonne: ['column'],
  ligne: ['row'],
  boite: ['box'],
  carte: ['card'],
  titre: ['title', 'heading'],
  'sous-titre': ['subtitle'],
  texte: ['text', 'paragraph'],
  image: [],
  video: [],
  lien: ['link'],
  liens: ['links', 'menu'],
  logo: [],
  bouton: ['button'],
  formulaire: ['form'],
  champ: ['field', 'input'],
  zone: ['textarea'],
  choix: ['select', 'choice'],
  case: ['checkbox'],
  liste: ['list'],
  element: ['item'],
  icone: ['icon'],
  separateur: ['divider'],
  espaceur: ['spacer'],
  contenu: ['children', 'slot'],
  style: [],
  mobile: [],
  tablette: ['tablet'],
  ordinateur: ['desktop'],
  charge: ['fetch', 'load'],
  envoie: ['send', 'post'],
  seo: [],
  couleurs: ['colors'],
  police: ['font'],
  polices: ['fonts'],
  langue: ['lang', 'language'],
  favicon: [],
  adresse: ['url', 'domain'],
  // ---- immersion ----
  scene: [],
  objet: ['object', 'model'],
  personnage: ['character'],
  lumiere: ['light', 'lighting'],
  camera: [],
  au: ['on'],
  defilement: ['scroll'],
  suit: ['follows', 'follow'],
  souris: ['mouse'],
  entre: ['enters', 'enter'],
  depuis: ['from-side'],
  tourne: ['spin', 'rotate', 'turn'],
  flotte: ['float'],
  saute: ['jump'],
  pulse: [],
  balance: ['sway'],
  clic: ['click'],
  survol: ['hover'],
  chargement: ['load-event', 'mount'],
  dit: ['says', 'say'],
  joue: ['play'],
  son: ['sound', 'audio'],
  transition: [],
  parallaxe: ['parallax'],
}

const VERS_CANON = new Map<string, string>()
for (const [canon, alias] of Object.entries(TABLE)) {
  VERS_CANON.set(canon, canon)
  for (const a of alias) if (!VERS_CANON.has(a)) VERS_CANON.set(a, canon)
}

/** Forme canonique d'un mot-clé (ou undefined si ce n'est pas un mot-clé). */
export function canon(mot: string): string | undefined {
  return VERS_CANON.get(sansAccents(mot))
}

export function estMot(mot: string, attendu: string): boolean {
  return canon(mot) === attendu
}

export function tousLesMots(): string[] {
  return Object.keys(TABLE)
}

export function aliasDe(canonique: string): string[] {
  return TABLE[canonique] ?? []
}

/** Mots qui commencent une instruction du noyau (jamais un nom de variable en tête de ligne). */
export const MOTS_INSTRUCTION = new Set([
  'soit', 'etat', 'fonction', 'si', 'sinon', 'pour', 'tant', 'essaie', 'erreur', 'importe', 'exporte',
  'retourne', 'arrete', 'continue', 'composant', 'page', 'site', 'ouvre', 'ferme', 'bascule', 'aller', 'js',
])

/** Mots réservés qui ne peuvent pas servir de nom. */
export const MOTS_RESERVES = new Set([
  'soit', 'etat', 'fonction', 'puis', 'si', 'sinon', 'alors', 'pour', 'dans', 'tant', 'attends', 'essaie',
  'importe', 'exporte', 'retourne', 'arrete', 'vrai', 'faux', 'rien', 'et', 'ou', 'non', 'composant', 'page',
])
