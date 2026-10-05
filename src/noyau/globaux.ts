// Fonctions et valeurs disponibles partout, sans importer.

/** Fonctions Kaury (fournies par le runtime). nom kaury → nom dans $k */
export const FONCTIONS_KAURY: Record<string, { js: string; aide: string; alias?: string[] }> = {
  affiche: { js: 'affiche', aide: 'affiche une valeur dans la console', alias: ['print', 'log'] },
  charge: { js: 'charge', aide: 'récupère des données (JSON ou texte) : attends charge "/api/produits"', alias: ['fetch', 'load'] },
  envoie: { js: 'envoie', aide: 'envoie des données : attends envoie "/api", { email }', alias: ['send', 'post'] },
  somme: { js: 'somme', aide: 'somme d\'une liste : somme panier, a -> a.prix', alias: ['sum'] },
  moyenne: { js: 'moyenne', aide: 'moyenne d\'une liste', alias: ['average', 'avg'] },
  minimum: { js: 'minimum', aide: 'plus petite valeur', alias: ['min'] },
  maximum: { js: 'maximum', aide: 'plus grande valeur', alias: ['max'] },
  arrondi: { js: 'arrondi', aide: 'arrondit : arrondi 3.14159, 2', alias: ['round'] },
  plancher: { js: 'plancher', aide: 'arrondi vers le bas', alias: ['floor'] },
  plafond: { js: 'plafond', aide: 'arrondi vers le haut', alias: ['ceil'] },
  absolu: { js: 'absolu', aide: 'valeur absolue', alias: ['abs'] },
  racine: { js: 'racineCarree', aide: 'racine carrée', alias: ['sqrt'] },
  aleatoire: { js: 'aleatoire', aide: 'nombre au hasard : aleatoire 1, 6', alias: ['random'] },
  hasard: { js: 'hasard', aide: 'élément au hasard d\'une liste', alias: ['pick'] },
  longueur: { js: 'longueur', aide: 'nombre d\'éléments ou de lettres', alias: ['length', 'len'] },
  maintenant: { js: 'maintenant', aide: 'date et heure actuelles', alias: ['now'] },
  'en-texte': { js: 'enTexte', aide: 'convertit en texte', alias: ['to-text', 'str'] },
  'en-nombre': { js: 'enNombre', aide: 'convertit en nombre', alias: ['to-number', 'num'] },
  prix: { js: 'prix', aide: 'formate un prix : prix 12.5 → « 12.50 CHF »', alias: ['price', 'money'] },
  'format-date': { js: 'formatDate', aide: 'formate une date : format-date maintenant()', alias: ['format-date-fr'] },
  melange: { js: 'melange', aide: 'mélange une liste', alias: ['shuffle'] },
  intervalle: { js: 'intervalle', aide: 'liste de nombres : intervalle 1, 5', alias: ['range'] },
  repete: { js: 'repete', aide: 'répète une action : repete 2s, -> compteur += 1', alias: ['every', 'repeat'] },
  'plus-tard': { js: 'plusTard', aide: 'action différée : plus-tard 1s, -> ferme menu', alias: ['later'] },
  memorise: { js: 'memorise', aide: 'garde un état dans le navigateur : memorise "panier", panier', alias: ['persist'] },
  copie: { js: 'copie', aide: 'copie un texte dans le presse-papiers', alias: ['copy'] },
  confettis: { js: 'confettis', aide: 'lance des confettis à l\'écran', alias: ['confetti'] },
  vibre: { js: 'vibre', aide: 'fait vibrer le téléphone', alias: ['vibrate'] },
  defile: { js: 'defile', aide: 'fait défiler vers une section : defile "gouts"', alias: ['scroll-to'] },
  partage: { js: 'partage', aide: 'ouvre le partage du téléphone', alias: ['share'] },
}

/** Valeurs réactives globales */
export const VALEURS_KAURY: Record<string, { js: string; aide: string; alias?: string[] }> = {
  souris: { js: 'souris', aide: 'position de la souris : souris.x, souris.y (de -1 à 1)', alias: ['mouse'] },
  defilement: { js: 'defilement', aide: 'progression du défilement de la page, de 0 à 1', alias: ['scroll'] },
  ecran: { js: 'ecran', aide: 'taille de l\'écran : ecran.largeur, ecran.mobile', alias: ['screen'] },
  route: { js: 'route', aide: 'page actuelle : route.chemin, route.params.id', alias: [] },
  objets: { js: 'objets', aide: 'objets 3D nommés de la page', alias: [] },
}

export const GLOBAUX_JS = new Set([
  'Math', 'JSON', 'console', 'window', 'document', 'fetch', 'setTimeout', 'setInterval', 'clearTimeout',
  'clearInterval', 'Date', 'Promise', 'localStorage', 'sessionStorage', 'navigator', 'location', 'history',
  'Object', 'Array', 'String', 'Number', 'Boolean', 'Symbol', 'Map', 'Set', 'WeakMap', 'WeakSet', 'Error', 'Intl',
  'URL', 'URLSearchParams', 'requestAnimationFrame', 'cancelAnimationFrame', 'alert', 'confirm', 'prompt',
  'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'globalThis', 'structuredClone', 'crypto', 'performance', 'Audio',
  'Image', 'HTMLElement', 'CustomEvent', 'Event', 'FormData', 'Blob', 'File', 'Response', 'Request', 'Headers',
  'AbortController', 'encodeURIComponent', 'decodeURIComponent', 'queueMicrotask', 'matchMedia',
  'getComputedStyle', 'IntersectionObserver', 'ResizeObserver', 'MutationObserver', 'process', 'Infinity', 'NaN',
  'undefined', 'BigInt', 'RegExp', 'Reflect', 'Proxy', 'TextEncoder', 'TextDecoder', 'WebSocket', 'Worker',
  'EventSource', 'atob', 'btoa', 'Notification', 'speechSynthesis', 'SpeechSynthesisUtterance',
])

const INDEX = new Map<string, string>()
for (const [nom, f] of Object.entries({ ...FONCTIONS_KAURY, ...VALEURS_KAURY })) {
  INDEX.set(nom, nom)
  for (const a of (f as any).alias ?? []) if (!INDEX.has(a)) INDEX.set(a, nom)
}

export function globalKaury(nom: string): string | undefined {
  return INDEX.get(nom)
}

export function nomsGlobaux(): string[] {
  return [...INDEX.keys(), ...GLOBAUX_JS]
}

/** Méthodes de listes/textes/objets reconnues (compilées vers $k.m). canonique ← alias */
export const METHODES: Record<string, string[]> = {
  ajoute: ['add', 'push'],
  retire: ['remove'],
  vide: ['clear'],
  filtre: ['filter'],
  transforme: ['map'],
  trie: ['sort', 'sort-by'],
  inverse: ['reverse'],
  trouve: ['find'],
  contient: ['includes', 'contains'],
  joint: ['join'],
  chaque: ['each', 'forEach'],
  compte: ['count'],
  unique: ['uniq'],
  prends: ['take'],
  somme: ['sum'],
  majuscules: ['upper', 'toUpperCase'],
  minuscules: ['lower', 'toLowerCase'],
  remplace: ['replace'],
  coupe: ['split'],
  'commence-par': ['starts-with', 'startsWith'],
  'finit-par': ['ends-with', 'endsWith'],
  nettoie: ['trim'],
  cles: ['keys'],
  valeurs: ['values'],
  premier: ['first'],
  dernier: ['last'],
  longueur: ['length', 'len'],
  insere: ['insert'],
  'mets-a-jour': ['update'],
}
export const PROPRIETES = new Set(['longueur', 'premier', 'dernier', 'cles', 'valeurs', 'vide-t-il'])
const INDEX_METHODES = new Map<string, string>()
for (const [nom, alias] of Object.entries(METHODES)) {
  INDEX_METHODES.set(nom, nom)
  for (const a of alias) if (!INDEX_METHODES.has(a)) INDEX_METHODES.set(a, nom)
}
export function methodeKaury(nom: string): string | undefined {
  return INDEX_METHODES.get(nom)
}
