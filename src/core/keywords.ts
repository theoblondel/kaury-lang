// Kaury keywords. English is the canonical form; every word also has a French alias.
// Accents are always accepted: « état » = « etat » = state.

export function stripAccents(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '')
}

/** canonical (English) → aliases (French and variants) */
const TABLE: Record<string, string[]> = {
  // ---- core ----
  let: ['soit', 'const'],
  state: ['etat'],
  function: ['fonction', 'fn'],
  then: ['puis', 'alors'],
  if: ['si'],
  else: ['sinon'],
  for: ['pour'],
  in: ['dans'],
  while: ['tant'], // « tant que »
  que: [],
  await: ['attends', 'wait'],
  try: ['essaie'],
  catch: ['erreur'],
  import: ['importe'],
  from: ['de', 'depuis'],
  as: ['comme'],
  export: ['exporte'],
  return: ['retourne'],
  break: ['arrete'],
  continue: [],
  true: ['vrai'],
  false: ['faux'],
  none: ['rien', 'null', 'nothing'],
  and: ['et'],
  or: ['ou'],
  not: ['non'],
  open: ['ouvre'],
  close: ['ferme'],
  toggle: ['bascule'],
  go: ['aller', 'goto'],
  js: ['javascript'],
  // ---- web ----
  site: [],
  page: [],
  component: ['composant'],
  section: [],
  header: ['entete'],
  footer: ['pied'],
  nav: [],
  grid: ['grille'],
  column: ['colonne'],
  row: ['ligne'],
  box: ['boite'],
  card: ['carte'],
  title: ['titre'],
  subtitle: ['sous-titre'],
  text: ['texte'],
  image: [],
  video: [],
  link: ['lien'],
  links: ['liens', 'menu'],
  logo: [],
  button: ['bouton'],
  form: ['formulaire'],
  field: ['champ', 'input'],
  textarea: ['zone'],
  select: ['choix'],
  checkbox: ['case'],
  list: ['liste'],
  item: ['element'],
  icon: ['icone'],
  divider: ['separateur'],
  spacer: ['espaceur'],
  slot: ['contenu', 'children'],
  style: [],
  mobile: [],
  tablet: ['tablette'],
  desktop: ['ordinateur'],
  seo: [],
  colors: ['couleurs'],
  font: ['police'],
  fonts: ['polices'],
  lang: ['langue', 'language'],
  favicon: [],
  url: ['adresse'],
  // ---- immersion ----
  scene: [],
  object: ['objet', 'model'],
  character: ['personnage'],
  light: ['lumiere', 'lighting'],
  camera: [],
  on: ['au'],
  click: ['clic'],
  hover: ['survol'],
  scroll: ['defilement'],
  load: ['chargement'],
  follows: ['suit', 'follow'],
  mouse: ['souris'],
  enters: ['entre', 'enter'],
  spin: ['tourne', 'rotate', 'turn'],
  float: ['flotte'],
  jump: ['saute'],
  pulse: [],
  sway: ['balance'],
  says: ['dit', 'say'],
  play: ['joue'],
  sound: ['son', 'audio'],
  transition: [],
  parallax: ['parallaxe'],
}

/** Value words (option values, motion modifiers, presets): canonical English ← French. */
const VALUES: Record<string, string[]> = {
  // motion modifiers
  smooth: ['doux', 'douce', 'soft-motion'],
  slow: ['lent', 'lente'],
  fast: ['rapide'],
  reverse: ['inverse'],
  left: ['gauche'],
  right: ['droite'],
  top: ['haut', 'up'],
  bottom: ['bas', 'down'],
  fade: ['fondu'],
  zoom: [],
  loop: ['boucle'],
  once: ['fois', 'une-fois'],
  // lights
  studio: [],
  soft: [],
  sunset: ['coucher-de-soleil'],
  night: ['nuit'],
  neon: [],
  day: ['jour'],
  dramatic: ['dramatique'],
  // cameras
  fixed: ['fixe'],
  fly: ['vol'],
  free: ['libre'],
  orbit: ['orbite'],
  // transitions
  slide: ['glisse'],
  curtain: ['rideau'],
  // particles
  stars: ['etoiles'],
  snow: ['neige'],
  bubbles: ['bulles'],
  dust: ['poussiere'],
  confetti: ['confettis'],
  // shadows, alignment, cursors, field types
  medium: ['moyenne', 'moyen'],
  strong: ['forte', 'fort'],
  inner: ['interieure'],
  center: ['centre'],
  justify: ['justifie'],
  pointer: ['main', 'hand'],
  arrow: ['fleche'],
  number: ['nombre'],
  password: ['motdepasse'],
  date: [],
  tel: ['telephone'],
  email: [],
  search: ['recherche'],
}

const TO_CANON = new Map<string, string>()
const VALUE_TO_CANON = new Map<string, string>()
for (const [c, aliases] of Object.entries(TABLE)) {
  TO_CANON.set(c, c)
  for (const a of aliases) if (!TO_CANON.has(a)) TO_CANON.set(a, c)
}
for (const [c, aliases] of Object.entries(VALUES)) {
  VALUE_TO_CANON.set(c, c)
  for (const a of aliases) if (!VALUE_TO_CANON.has(a)) VALUE_TO_CANON.set(a, c)
}

/** Canonical form of a keyword (or undefined). Case-sensitive: keywords are lowercase. */
export function canon(word: string): string | undefined {
  return TO_CANON.get(stripAccents(word))
}

/** Canonical form of a value word (smooth, sunset, left…), or the word itself without accents. */
export function canonValue(word: string): string {
  const w = stripAccents(word)
  return VALUE_TO_CANON.get(w) ?? TO_CANON.get(w) ?? w
}

export function isKeyword(word: string, expected: string): boolean {
  return canon(word) === expected
}

export function allKeywords(): string[] {
  return Object.keys(TABLE)
}

export function aliasesOf(c: string): string[] {
  return TABLE[c] ?? VALUES[c] ?? []
}

/** Reserved words that can never be names. */
export const RESERVED = new Set([
  'let', 'state', 'function', 'then', 'if', 'else', 'for', 'in', 'while', 'await', 'try', 'import', 'export',
  'return', 'break', 'true', 'false', 'none', 'and', 'or', 'not', 'component', 'page',
])
