// The UI vocabulary: elements, style options, colors, motions.
// One source of truth, read by the checker, the code generator, the docs and the VS Code extension.
// Canonical names are English; French aliases are listed next to them.

import { stripAccents } from './keywords.js'

// ---------------- Colors ----------------
export const COLORS: Record<string, string> = {
  red: '#e5484d', orange: '#f76b15', yellow: '#ffc53d', green: '#30a46c', blue: '#0090ff',
  purple: '#8e4ec6', pink: '#e93d82', black: '#111111', white: '#ffffff', gray: '#8b8d98',
  cream: '#fff4e8', beige: '#efe3cf', brown: '#8a5a3b', teal: '#12a594', gold: '#d4a72c',
  silver: '#c0c4cc', navy: '#14213d', coral: '#ff7f61', mint: '#7fe0c0', lavender: '#b9a6ef',
  sky: '#7cc4fa', sand: '#e9d8b4', slate: '#3c4454', night: '#0b1020', transparent: 'transparent',
  // colors of the theme: they follow the site (accent = first site color, on-accent = text on it, ink = text, muted = soft text, line = borders)
  accent: 'var(--k-accent)', 'on-accent': 'var(--k-on-accent)', ink: 'var(--k-ink)', muted: 'var(--k-muted)', line: 'var(--k-line)',
}
const COLOR_ALIASES: Record<string, string> = {
  rouge: 'red', jaune: 'yellow', vert: 'green', bleu: 'blue', violet: 'purple', rose: 'pink', noir: 'black',
  blanc: 'white', gris: 'gray', grey: 'gray', creme: 'cream', marron: 'brown', turquoise: 'teal', dore: 'gold',
  argent: 'silver', marine: 'navy', corail: 'coral', menthe: 'mint', lavande: 'lavender', ciel: 'sky',
  sable: 'sand', ardoise: 'slate', nuit: 'night',
}
export function knownColor(word: string): string | undefined {
  const w = stripAccents(word).toLowerCase()
  if (w in COLORS) return w
  if (w in COLOR_ALIASES) return COLOR_ALIASES[w]
  return undefined
}

// ---------------- Options ----------------
// Expected values: n = number (px by default), c = color, t = text, m = word from a list, e = any expression
export interface OptionSpec {
  args: string // e.g. “n”, “c”, “nn?”, “” (flag), “m”, “*” (anything)
  words?: string[] // allowed values for “m” (canonical)
  aliases?: string[]
  help: string
  helpFr: string
  example: string
}

const o = (args: string, aliases: string[], help: string, helpFr: string, example: string, words?: string[]): OptionSpec =>
  ({ args, aliases, help, helpFr, example, words })

export const STYLES: Record<string, OptionSpec> = {
  background: o('e', ['fond', 'bg'], 'background color, gradient or image', 'couleur, dégradé ou image de fond', 'background cream'),
  color: o('c', ['couleur'], 'text color', 'couleur du texte', 'color #333'),
  font: o('t', ['police'], 'typeface', 'police de caractères', 'font "Clash Display"'),
  size: o('n', ['taille'], 'text size (or object size)', 'taille du texte (ou de l\'objet)', 'size 24'),
  bold: o('', ['gras'], 'bold text', 'texte en gras', 'bold'),
  light: o('', ['leger', 'fin'], 'thin text', 'texte fin', 'light'),
  weight: o('n', ['poids'], 'font weight (100 to 900)', 'épaisseur du texte (100 à 900)', 'weight 600'),
  italic: o('', ['italique'], 'italic text', 'texte en italique', 'italic'),
  underline: o('', ['souligne'], 'underlined text', 'texte souligné', 'underline'),
  plain: o('', ['simple', 'no-underline'], 'no underline (links)', 'sans soulignement (liens)', 'link "Docs" "/docs/", plain'),
  uppercase: o('', ['majuscules', 'caps'], 'uppercase text', 'texte en majuscules', 'uppercase'),
  'line-height': o('n', ['interligne'], 'line height (1.5 = one and a half)', 'hauteur de ligne (1.5 = une fois et demie)', 'line-height 1.6'),
  tracking: o('n', ['lettres', 'letter-spacing'], 'space between letters', 'espace entre les lettres', 'tracking 2'),
  align: o('m', ['aligne'], 'text alignment', 'alignement du texte', 'align center', ['left', 'center', 'right', 'justify']),
  center: o('', ['centre', 'centered'], 'centers the content', 'centre le contenu', 'center'),
  radius: o('n', ['coins', 'rounded'], 'corner radius', 'arrondi des coins', 'radius 12'),
  round: o('', ['rond', 'pill'], 'fully round corners', 'coins complètement ronds', 'round'),
  shadow: o('m?', ['ombre'], 'drop shadow', 'ombre portée', 'shadow soft', ['soft', 'medium', 'strong', 'hard', 'none', 'inner']),
  border: o('n?c?', ['bordure'], 'border (width, color)', 'bordure (épaisseur, couleur)', 'border 1 gray'),
  'border-top': o('n?c?', ['bordure-haut'], 'line above (width, color)', 'trait au-dessus (épaisseur, couleur)', 'border-top 2 black'),
  'border-bottom': o('n?c?', ['bordure-bas'], 'line below (width, color)', 'trait en dessous (épaisseur, couleur)', 'border-bottom 1 gray'),
  pin: o('*', ['epingle'], 'placed over its parent: pin bottom right, pin top 20 left 10%', 'posé par-dessus son parent : epingle bas droite', 'pin bottom right'),
  clip: o('', ['coupe'], 'hides what overflows', 'cache ce qui dépasse', 'clip'),
  'no-wrap': o('', ['sans-retour'], 'keeps everything on one line (for a ticker)', 'garde tout sur une ligne (pour un bandeau)', 'row no-wrap'),
  grain: o('', [], 'paper grain texture (on the site style: the whole page)', 'texture de grain papier (sur le style du site : toute la page)', 'style background cream, grain'),
  margin: o('nn?n?n?', ['marge'], 'space around (1 to 4 values)', 'espace autour (1 à 4 valeurs)', 'margin 24'),
  padding: o('nn?n?n?', ['remplissage', 'interieur'], 'inner space (1 to 4 values)', 'espace intérieur (1 à 4 valeurs)', 'padding 32'),
  gap: o('nn?', ['espace', 'spacing'], 'space between children (one value, or rows then columns)', 'espace entre les enfants', 'gap 24'),
  width: o('n', ['largeur'], 'width', 'largeur', 'width 320'),
  height: o('n', ['hauteur'], 'height', 'hauteur', 'height 400'),
  'max-width': o('n', ['max-largeur'], 'maximum width', 'largeur maximale', 'max-width 720'),
  'min-height': o('n', ['min-hauteur'], 'minimum height', 'hauteur minimale', 'min-height 300'),
  fullscreen: o('', ['plein-ecran', 'full'], 'fills the whole screen height', 'occupe toute la hauteur de l\'écran', 'fullscreen'),
  'full-width': o('', ['pleine-largeur', 'bleed'], 'fills the whole width, no margins', 'occupe toute la largeur, sans marges', 'full-width'),
  opacity: o('n', ['opacite'], 'opacity from 0 to 1', 'opacité de 0 à 1', 'opacity 0.8'),
  blur: o('n', ['flou'], 'blur', 'flou', 'blur 8'),
  glass: o('', ['verre'], 'frosted glass effect', 'effet verre dépoli', 'glass'),
  gradient: o('cc?c?n?', ['degrade'], 'gradient background (2 or 3 colors, angle)', 'fond en dégradé (2 ou 3 couleurs, angle)', 'gradient pink orange'),
  'text-gradient': o('cc?c?', ['texte-degrade'], 'gradient text', 'texte en dégradé', 'text-gradient pink purple'),
  columns: o('nn?n?n?', ['colonnes', 'colonne', 'cols', 'column'], 'number of columns, or their widths', 'nombre de colonnes, ou leurs largeurs', 'grid 3 columns   /   grid columns 2 1'),
  direction: o('m', [], 'direction of the children', 'sens des enfants', 'direction row', ['row', 'column']),
  hidden: o('e?', ['cache', 'hide'], 'hides the element (always, or while a condition is true)', 'cache l\'élément (toujours, ou tant qu\'une condition est vraie)', 'mobile hidden   /   hidden (tab != 1)'),
  sticky: o('n?', ['colle'], 'stays at the top while scrolling (distance from the top)', 'reste collé en haut au défilement (distance du haut)', 'sticky 96'),
  front: o('', ['devant'], 'goes in front of other elements', 'passe devant les autres éléments', 'front'),
  cursor: o('m', ['curseur'], 'cursor shape', 'forme du curseur', 'cursor pointer', ['pointer', 'arrow', 'text', 'none']),
  hover: o('*', ['survol'], 'style when the mouse is over it', 'style quand la souris passe dessus', 'hover lift 4'),
  lift: o('n', ['monte'], 'moves up', 'décale vers le haut', 'hover lift 4'),
  grow: o('n?', ['grossit', 'scale'], 'enlarges (1.1 = +10 %)', 'agrandit (1.1 = +10 %)', 'hover grow 1.05'),
  tilt: o('n', ['penche', 'rotate'], 'tilts (degrees)', 'incline (degrés)', 'tilt -3'),
  move: o('nn?', ['deplace', 'translate'], 'moves the element (x, y), for hover and animations', 'déplace l\'élément (x, y), pour le survol et les animations', 'move -50% 0'),
  reveal: o('n', ['devoile'], 'shows only the top part (0% to 100%), for animations', 'ne montre que le haut (0 % à 100 %), pour les animations', 'reveal 100%'),
  animate: o('m', ['anime'], 'simple entrance', 'apparition simple', 'animate fade', ['fade', 'lift', 'zoom', 'left', 'right']),
}

/** Options that only some elements accept (on top of styles). */
export const ELEMENT_OPTIONS: Record<string, Record<string, OptionSpec>> = {
  title: { level: o('n', ['niveau'], 'heading level (1 to 6)', 'niveau du titre (1 à 6)', 'level 2') },
  image: {
    alt: o('t', ['texte', 'description'], 'description for accessibility', 'description pour l\'accessibilité', 'alt "A can"'),
    cover: o('', ['couvre'], 'fills the area by cropping', 'remplit la zone en recadrant', 'cover'),
  },
  video: {
    loop: o('', ['boucle'], 'plays in a loop', 'rejoue en boucle', 'loop'),
    muted: o('', ['muet'], 'without sound', 'sans le son', 'muted'),
    autoplay: o('', ['auto'], 'starts by itself (muted)', 'démarre seule (muette)', 'autoplay'),
    controls: o('', ['controles'], 'shows the buttons', 'affiche les boutons', 'controls'),
    cover: o('', ['couvre'], 'fills the area', 'remplit la zone', 'cover'),
  },
  button: {
    to: o('t', ['vers', 'href'], 'goes to a page', 'emmène vers une page', 'to "/shop"'),
    outline: o('', ['contour'], 'outlined button', 'bouton avec contour seul', 'outline'),
    ghost: o('', ['discret', 'subtle'], 'discreet button', 'bouton discret', 'ghost'),
    large: o('', ['grand'], 'large button', 'grand bouton', 'large'),
    small: o('', ['petit'], 'small button', 'petit bouton', 'small'),
    disabled: o('e?', ['desactive'], 'disabled (when the condition is true)', 'désactivé (si la condition est vraie)', 'disabled cart.length == 0'),
  },
  form: {
    mail: o('e', ['courriel', 'email'], 'sends what is typed by e-mail to this address, then runs -> (needs KAURY_MAIL_KEY where the site is hosted)', 'envoie ce qui est saisi par e-mail à cette adresse, puis lance -> (demande KAURY_MAIL_KEY chez l\'hébergeur)', 'form mail "hello@bloom.ch" -> sent = true'),
    subject: o('t', ['sujet', 'objet'], 'subject of the e-mail sent by mail', 'sujet de l\'e-mail envoyé par mail', 'subject "New order"'),
  },
  link: { 'new-tab': o('', ['nouvel', 'blank'], 'opens in a new tab', 'ouvre dans un nouvel onglet', 'new-tab') },
  field: {
    type: o('m', [], 'kind of field', 'genre de champ', 'type email', ['text', 'email', 'number', 'password', 'date', 'tel', 'url', 'search']),
    required: o('', ['requis'], 'mandatory', 'obligatoire', 'required'),
    label: o('t', ['etiquette'], 'text above the field', 'texte au-dessus du champ', 'label "Your email"'),
  },
  textarea: {
    required: o('', ['requis'], 'mandatory', 'obligatoire', 'required'),
    label: o('t', ['etiquette'], 'text above', 'texte au-dessus', 'label "Message"'),
    rows: o('n', ['lignes'], 'height in lines', 'hauteur en lignes', 'rows 5'),
  },
  select: { label: o('t', ['etiquette'], 'text above', 'texte au-dessus', 'label "Size"') },
  section: {},
  seo: { image: o('t', [], 'share image (1200×630)', 'image de partage (1200×630)', 'image "share.jpg"') },
  // ---- immersion ----
  object: {
    position: o('nnn?', [], 'position x y (z)', 'position x y (z)', 'position 0 1 0'),
    rotation: o('nnn?', [], 'rotation in degrees x y z', 'rotation en degrés x y z', 'rotation 0 45 0'),
    size: o('n', ['taille', 'scale'], 'object size (1 = normal)', 'taille de l\'objet (1 = normale)', 'size 1.5'),
    height: o('n', ['hauteur'], 'area height (single object)', 'hauteur de la zone (objet seul)', 'height 500'),
    fallback: o('t', ['secours'], 'image when the device cannot show 3D', 'image si l\'appareil ne peut pas afficher la 3D', 'fallback "can.png"'),
    shadows: o('', ['ombres'], 'the object casts a shadow', 'l\'objet projette une ombre au sol', 'shadows'),
    alt: o('t', ['texte', 'description'], 'description for accessibility and Google', 'description pour l\'accessibilité et Google', 'alt "Strawberry can"'),
    immediate: o('', ['immediat'], 'starts the 3D without waiting for a first gesture', 'démarre la 3D sans attendre un premier geste', 'immediate'),
    color: o('c', ['couleur'], 'color of a shape (sphere, knot…)', 'couleur d\'une forme', 'object "knot", color orange'),
    metal: o('', ['metal'], 'shiny metal material for a shape', 'matière métal brillant pour une forme', 'object "sphere", metal'),
    matte: o('', ['mat'], 'matte material for a shape', 'matière mate pour une forme', 'object "cube", matte'),
    glass: o('', ['verre'], 'glass material for a shape', 'matière verre pour une forme', 'object "gem", glass'),
    glow: o('', ['brille'], 'the shape glows', 'la forme brille', 'object "torus", glow'),
  },
  scene: {
    height: o('n', ['hauteur'], 'scene height', 'hauteur de la scène', 'height 600'),
    background: o('e', ['fond'], 'scene background', 'fond de la scène', 'background night'),
    fog: o('c?', ['brouillard'], 'depth fog', 'brouillard de profondeur', 'fog'),
    ground: o('c?', ['sol', 'floor'], 'adds a ground that receives shadows', 'ajoute un sol qui reçoit les ombres', 'ground'),
    immediate: o('', ['immediat'], 'starts the 3D without waiting for a first gesture', 'démarre la 3D sans attendre un premier geste', 'immediate'),
    particles: o('m?n?', ['particules'], 'ambient particles', 'particules d\'ambiance', 'particles stars', ['stars', 'snow', 'bubbles', 'dust', 'confetti']),
  },
  light: {},
  camera: { distance: o('n', [], 'camera distance', 'recul de la caméra', 'distance 6') },
  sound: {
    loop: o('', ['boucle'], 'plays in a loop', 'joue en boucle', 'loop'),
    volume: o('n', [], 'volume from 0 to 1', 'volume de 0 à 1', 'volume 0.4'),
  },
}
ELEMENT_OPTIONS.character = { ...ELEMENT_OPTIONS.object, animation: o('t', ['anime'], 'animation played at start', 'animation jouée au départ', 'animation "idle"') }
ELEMENT_OPTIONS.subtitle = ELEMENT_OPTIONS.title

/** Options every web element accepts: to reuse an existing stylesheet or reach exact HTML. */
export const UNIVERSAL_OPTIONS: Record<string, OptionSpec> = {
  class: o('e', ['classe'], 'CSS classes of your own (replaces the default look)', 'classes CSS à toi (remplace l\'apparence par défaut)', 'box class "hero"'),
  look: o('e', ['allure'], 'a class of your own added to the default look, styled in a css block', 'une classe à toi ajoutée à l\'apparence par défaut, stylée dans un bloc css', 'grid 3 columns, look "pricing"'),
  tag: o('e', ['balise'], 'exact HTML tag', 'balise HTML exacte', 'box tag "figure"'),
  attr: o('ee?', ['attribut'], 'HTML attribute (name, value)', 'attribut HTML (nom, valeur)', 'box attr "aria-hidden" "true"'),
  id: o('e', [], 'id of the element (anchor)', 'identifiant de l\'élément (ancre)', 'box id "prices"'),
  selected: o('e?', ['selectionne'], 'selected tab or item (a style can say how it looks: selected …)', 'onglet ou élément sélectionné', 'button "Code", selected (tab == 0)'),
  current: o('e?', ['courant'], 'the current page or step (current …)', 'la page ou l\'étape en cours', 'link "Docs" "/docs/", current (route.path == "/docs/")'),
  open: o('e?', ['ouvert'], 'a details element shown open', 'un details affiché ouvert', 'details "Price?", open'),
  html: o('e?', [], 'content written in HTML (trusted text only)', 'contenu écrit en HTML (texte de confiance uniquement)', 'text "Hello<br>world", html'),
}
const UNIVERSAL_HEADS = new Set(['details', 'embed', 'section', 'header', 'footer', 'nav', 'grid', 'column', 'row', 'box', 'card', 'title', 'subtitle', 'text', 'image', 'video', 'link', 'links', 'logo', 'button', 'form', 'field', 'textarea', 'select', 'checkbox', 'list', 'item', 'icon', 'divider', 'spacer', 'markdown'])

export const MOTIONS: Record<string, OptionSpec> = {
  spin: o('*', [], 'spins: spin, spin 90/s, spin on scroll, spin x', 'tourne sur lui-même : tourne, tourne 90/s, tourne au defilement', 'spin on scroll'),
  float: o('*', [], 'floats gently: float, float 0.3', 'flotte doucement', 'float'),
  jump: o('*', [], 'jumps (once as an action, otherwise regularly)', 'saute (une fois en action, sinon régulièrement)', 'on click -> jump'),
  pulse: o('*', [], 'grows and shrinks rhythmically', 'grossit et rétrécit en rythme', 'pulse'),
  sway: o('*', [], 'sways left and right', 'se balance de gauche à droite', 'sway'),
  'follows-mouse': o('*', [], 'reacts to the mouse: follows mouse, smooth', 'réagit à la souris : suit souris, doux', 'follows mouse, smooth'),
  'enters-from': o('*', [], 'entrance: left, right, top, bottom, fade, zoom', 'apparition : gauche, droite, haut, bas, fondu, zoom', 'enters from left'),
  parallax: o('*', [], 'moves faster or slower than the scroll', 'bouge plus ou moins vite que le défilement', 'parallax 0.3'),
  says: o('*', [], 'speech bubble', 'bulle de dialogue', 'says "Hi!"'),
  play: o('*', [], 'plays a named animation', 'joue une animation nommée', 'play "dance"'),
}

export const MOTION_WORDS = new Set(['smooth', 'fast', 'slow', 'x', 'y', 'z', 'on', 'scroll', 'left', 'right', 'top', 'bottom', 'fade', 'zoom', 'reverse', 'loop', 'once'])

export const LIGHTS = ['studio', 'soft', 'sunset', 'night', 'neon', 'day', 'dramatic']
export const CAMERAS = ['fixed', 'follows-mouse', 'fly', 'free', 'orbit']
export const TRANSITIONS = ['fade', 'slide', 'zoom', 'curtain', 'none']

// ---------------- Elements ----------------
export interface ElementSpec {
  tag: string
  kind: 'container' | 'text' | 'media' | 'field' | 'special' | 'immersion'
  help: string
  helpFr: string
  example: string
}
const e = (tag: string, kind: ElementSpec['kind'], help: string, helpFr: string, example: string): ElementSpec => ({ tag, kind, help, helpFr, example })

export const ELEMENTS: Record<string, ElementSpec> = {
  section: e('section', 'container', 'a part of the page', 'une partie de la page', 'section flavors'),
  header: e('header', 'container', 'site header', 'en-tête du site', 'header'),
  footer: e('footer', 'container', 'page footer', 'pied de page', 'footer'),
  nav: e('nav', 'container', 'navigation', 'navigation', 'nav'),
  grid: e('div', 'container', 'grid of columns', 'grille de colonnes', 'grid 3 columns, gap 24'),
  column: e('div', 'container', 'stacks its children vertically', 'empile ses enfants verticalement', 'column gap 12'),
  row: e('div', 'container', 'puts its children side by side', 'aligne ses enfants côte à côte', 'row gap 12'),
  box: e('div', 'container', 'simple container', 'conteneur simple', 'box padding 24'),
  card: e('article', 'container', 'card (image + text)', 'carte (image + texte)', 'card "Strawberry" "strawberry.png"'),
  title: e('h1', 'text', 'main heading', 'titre principal', 'title "Hello", size 64'),
  subtitle: e('h2', 'text', 'secondary heading', 'titre secondaire', 'subtitle "Our flavors"'),
  text: e('p', 'text', 'paragraph', 'paragraphe', 'text "Welcome {name}"'),
  image: e('img', 'media', 'image', 'image', 'image "photo.jpg", radius 16'),
  video: e('video', 'media', 'video', 'vidéo', 'video "film.mp4", autoplay, loop'),
  link: e('a', 'text', 'link', 'lien', 'link "Contact" "/contact"'),
  links: e('nav', 'special', 'menu of links', 'menu de liens', 'links Home, Flavors, Shop'),
  logo: e('a', 'special', 'logo linking to the home page', 'logo cliquable vers l\'accueil', 'logo "crush.svg"'),
  button: e('button', 'text', 'button', 'bouton', 'button "Buy" -> cart.add can'),
  form: e('form', 'container', 'form (-> action on submit)', 'formulaire (-> action à l\'envoi)', 'form -> send "/api", { email }'),
  field: e('input', 'field', 'input bound to a state', 'champ de saisie lié à un état', 'field email "Your email", type email'),
  textarea: e('textarea', 'field', 'multi-line text area', 'zone de texte', 'textarea message "Your message"'),
  select: e('select', 'field', 'dropdown list', 'liste déroulante', 'select size "S", "M", "L"'),
  checkbox: e('input', 'field', 'checkbox', 'case à cocher', 'checkbox agree "I agree"'),
  list: e('ul', 'container', 'bulleted list', 'liste à puces', 'list'),
  item: e('li', 'text', 'list item', 'ligne d\'une liste', 'item "Free delivery"'),
  icon: e('span', 'text', 'icon (emoji or character)', 'icône (emoji ou caractère)', 'icon "★"'),
  divider: e('hr', 'special', 'separator line', 'ligne de séparation', 'divider'),
  spacer: e('div', 'special', 'empty space', 'espace vide', 'spacer 48'),
  markdown: e('div', 'text', 'Markdown text rendered as rich text (titles, lists, links)', 'texte Markdown affiché en texte riche (titres, listes, liens)', 'markdown post.body'),
  details: e('details', 'container', 'a question or title that opens on click to show what is below', 'une question ou un titre qui s\'ouvre au clic', 'details "Is it free?"'),
  embed: e('iframe', 'media', 'another page shown inside this one (map, video, app)', 'une autre page affichée dans celle-ci', 'embed "https://…", "Map of the shop"'),
  slot: e('div', 'special', 'inside a component: where the content given between its lines goes', 'dans un composant : là où va le contenu donné entre ses lignes', 'slot'),
  scene: e('div', 'immersion', '2D or 3D immersive area', 'zone immersive 2D ou 3D', 'scene'),
  object: e('div', 'immersion', 'object .glb, .gltf, .png, .svg, .json (Lottie)', 'objet .glb, .gltf, .png, .svg, .json (Lottie)', 'object can "crush.glb"'),
  character: e('div', 'immersion', 'animated object with named animations', 'objet animé avec animations nommées', 'character "mascot.glb"'),
  sound: e('audio', 'immersion', 'sound or music, with a mute button', 'son ou musique, avec bouton muet', 'sound "ambient.mp3", loop'),
}

/** These heads configure their parent instead of creating an element. */
export const SETTINGS = new Set(['style', 'mobile', 'tablet', 'desktop', 'seo', 'colors', 'font', 'fonts', 'lang', 'favicon', 'url', 'alternate', 'head', 'wrapper', 'base', 'light', 'camera', 'transition'])
export const EVENTS = new Set(['on-click', 'on-hover', 'on-scroll', 'on-load'])

const STYLE_ALIASES = new Map<string, string>()
for (const [name, s] of Object.entries(STYLES)) {
  STYLE_ALIASES.set(name, name)
  for (const a of s.aliases ?? []) STYLE_ALIASES.set(a, name)
}

/** Canonical style option name (or undefined). */
export function styleOption(word: string): string | undefined {
  return STYLE_ALIASES.get(stripAccents(word))
}

export function elementOption(head: string, word: string): string | undefined {
  const w = stripAccents(word)
  for (const table of [ELEMENT_OPTIONS[head], UNIVERSAL_HEADS.has(head) ? UNIVERSAL_OPTIONS : undefined]) {
    if (!table) continue
    for (const [name, s] of Object.entries(table)) {
      if (name === w || (s.aliases ?? []).includes(w)) return name
    }
  }
  return undefined
}

export function optionSpec(head: string, name: string): OptionSpec | undefined {
  return ELEMENT_OPTIONS[head]?.[name] ?? (UNIVERSAL_HEADS.has(head) ? UNIVERSAL_OPTIONS[name] : undefined) ?? STYLES[name]
}

export function allOptions(head: string): string[] {
  return [...Object.keys(ELEMENT_OPTIONS[head] ?? {}), ...(UNIVERSAL_HEADS.has(head) ? Object.keys(UNIVERSAL_OPTIONS) : []), ...Object.keys(STYLES)]
}
