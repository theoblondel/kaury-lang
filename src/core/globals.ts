// Functions and values available everywhere, without importing anything.

export interface GlobalSpec {
  js: string // name in the runtime ($k.<js>)
  help: string
  aliases: string[] // French aliases
}

const g = (js: string, help: string, aliases: string[] = []): GlobalSpec => ({ js, help, aliases })

/** Kaury functions (provided by the runtime). */
export const KAURY_FUNCTIONS: Record<string, GlobalSpec> = {
  print: g('print', 'prints a value in the console', ['affiche', 'log']),
  load: g('load', 'loads data (JSON or text): await load "/api/products"', ['charge']),
  send: g('send', 'sends data: await send "/api", { email }', ['envoie', 'post']),
  sum: g('sum', 'sum of a list: sum cart, a -> a.price', ['somme']),
  average: g('average', 'average of a list', ['moyenne', 'avg']),
  min: g('min', 'smallest value', ['minimum']),
  max: g('max', 'largest value', ['maximum']),
  round: g('round', 'rounds: round 3.14159, 2', ['arrondi']),
  floor: g('floor', 'rounds down', ['plancher']),
  ceil: g('ceil', 'rounds up', ['plafond']),
  abs: g('abs', 'absolute value', ['absolu']),
  sqrt: g('sqrt', 'square root', ['racine']),
  random: g('random', 'random number: random 1, 6', ['aleatoire']),
  pick: g('pick', 'random item of a list', ['hasard']),
  length: g('length', 'number of items or letters', ['longueur', 'len']),
  now: g('now', 'current date and time', ['maintenant']),
  'to-text': g('toText', 'converts to text', ['en-texte', 'str']),
  'to-number': g('toNumber', 'converts to a number', ['en-nombre', 'num']),
  price: g('price', 'formats a price: price 12.5 → "CHF 12.50"', ['prix', 'money']),
  'format-number': g('formatNumber', 'a number as people read it: format-number 23490 → "23,490" (in the language of the site); format-number 3.14159, 2 → "3.14"', ['formate-nombre']),
  'to-date': g('toDate', 'a date from a text: to-date "2027-06-12 14:00" (one date minus another: the milliseconds between them)', ['en-date']),
  'format-date': g('formatDate', 'formats a date: format-date now()', []),
  shuffle: g('shuffle', 'shuffles a list', ['melange']),
  'image-size': g('imageSize', 'real size of an image of the site: image-size "photo.jpg" → { width, height }', ['taille-image']),
  range: g('range', 'list of numbers: range 1, 5', ['intervalle']),
  every: g('every', 'repeats an action: every 2s, -> count += 1', ['repete', 'repeat']),
  later: g('later', 'delayed action: later 1s, -> close menu', ['plus-tard']),
  persist: g('persist', 'keeps a state in the browser: persist "cart", cart', ['memorise']),
  copy: g('copy', 'copies a text to the clipboard', ['copie']),
  confetti: g('confetti', 'throws confetti on the screen', ['confettis']),
  vibrate: g('vibrate', 'makes the phone vibrate', ['vibre']),
  'scroll-to': g('scrollTo', 'scrolls to a section: scroll-to "flavors"', ['defile']),
  share: g('share', 'opens the phone share sheet', ['partage']),
  'json-ld': g('jsonLd', 'structured data for Google and AIs, given to head: head json-ld { "@type": "FAQPage" }', ['donnees-structurees']),
  slug: g('slug', 'text → address-friendly form: slug "Hello world" → "hello-world"', []),
  base64: g('base64', 'text → base64, for links that carry code or data: base64 "Hello"', []),
  'encode-url': g('encodeUrl', 'text made safe inside an address: encode-url "a b" → "a%20b"', ['encode-adresse']),
}

/** Global reactive values. */
export const KAURY_VALUES: Record<string, GlobalSpec> = {
  mouse: g('mouse', 'mouse position: mouse.x, mouse.y (from -1 to 1)', ['souris']),
  scroll: g('scroll', 'page scroll progress, from 0 to 1', ['defilement']),
  screen: g('screen', 'screen size: screen.width, screen.mobile', ['ecran']),
  route: g('route', 'current page: route.path, route.params.id', []),
  objects: g('objects', 'named 3D objects of the page', ['objets']),
}

export const JS_GLOBALS = new Set([
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
for (const [name, f] of Object.entries({ ...KAURY_FUNCTIONS, ...KAURY_VALUES })) {
  INDEX.set(name, name)
  for (const a of f.aliases) if (!INDEX.has(a)) INDEX.set(a, name)
}

/** Canonical Kaury global for a name (any language), or undefined. */
export function kauryGlobal(name: string): string | undefined {
  return INDEX.get(name)
}

export function globalSpec(canonical: string): GlobalSpec | undefined {
  return KAURY_FUNCTIONS[canonical] ?? KAURY_VALUES[canonical]
}

export function globalNames(): string[] {
  return [...INDEX.keys(), ...JS_GLOBALS]
}

/**
 * The names Kaury itself provides: what a “did you mean …?” may propose (never a JavaScript global such as btoa).
 * Their short aliases (num, str, len…) are left out: nobody means them. `aliases`: the French words too.
 */
export function kauryNames(aliases = false): string[] {
  return aliases ? [...INDEX.keys()] : [...Object.keys(KAURY_FUNCTIONS), ...Object.keys(KAURY_VALUES)]
}

/** List/text/object methods (compiled to $k.m). canonical ← aliases */
export const METHODS: Record<string, string[]> = {
  add: ['ajoute', 'push'],
  remove: ['retire'],
  clear: ['vide'],
  filter: ['filtre'],
  map: ['transforme'],
  sort: ['trie', 'sort-by'],
  reverse: ['inverse'],
  find: ['trouve'],
  contains: ['contient', 'includes'],
  join: ['joint'],
  each: ['chaque', 'forEach'],
  count: ['compte'],
  unique: ['uniq'],
  take: ['prends'],
  sum: ['somme'],
  upper: ['majuscules', 'toUpperCase'],
  lower: ['minuscules', 'toLowerCase'],
  replace: ['remplace'],
  split: ['coupe'],
  'starts-with': ['commence-par', 'startsWith'],
  'ends-with': ['finit-par', 'endsWith'],
  trim: ['nettoie'],
  keys: ['cles'],
  values: ['valeurs'],
  first: ['premier'],
  last: ['dernier'],
  length: ['longueur', 'len'],
  insert: ['insere'],
  update: ['mets-a-jour'],
}
export const PROPERTIES = new Set(['length', 'first', 'last', 'keys', 'values'])
const METHOD_INDEX = new Map<string, string>()
for (const [name, aliases] of Object.entries(METHODS)) {
  METHOD_INDEX.set(name, name)
  for (const a of aliases) if (!METHOD_INDEX.has(a)) METHOD_INDEX.set(a, name)
}
export function kauryMethod(name: string): string | undefined {
  return METHOD_INDEX.get(name)
}
