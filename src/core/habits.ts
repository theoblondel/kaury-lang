// Habits: what people — and AIs — write from HTML, CSS, JavaScript, React or Python, and the Kaury way to say it.
// Read only where the compiler has already found a mistake: the fix then names the Kaury form instead of a guess.
// Every Kaury form written here is compiled by the tests.

import { msg } from './errors.js'

export interface Habit {
  k?: string // the Kaury form
  en?: string // a note, or the whole answer when there is no single form
  fr?: string
  on?: string // options only: the element the form is tried on by the tests (default: box)
}

const h = (k: string, en?: string, fr?: string, on?: string): Habit => ({ k, en, fr, on })
const say = (en: string, fr: string): Habit => ({ en, fr })

const SIDES = ['top, right, bottom, left', 'haut, droite, bas, gauche'] as const
const AXES = ['top and bottom, then left and right', 'haut et bas, puis gauche et droite'] as const
const SIZE = h('size 48', 'a size is a number', 'une taille est un nombre')
const HIDDEN = h('hidden (count == 0)', 'or put the element under an “if” line', 'ou place l\'élément sous une ligne « si »')
const PLACE = h('center', 'center centers the content; align left, center or right places the text', 'center centre le contenu ; align left, center ou right place le texte')
const ACTION = say(
  'an action is written after “->”: button "Go" -> count += 1   (or on a line below: on click -> …)',
  'une action s\'écrit après « -> » : bouton "Go" -> compteur += 1   (ou sur une ligne en dessous : au clic -> …)')
const NAMED_STYLE = say(
  'a named style: write “style card” once with its options indented below, then its name on the element: box card',
  'un style nommé : écris « style carte » une fois avec ses options indentées dessous, puis son nom sur l\'élément : box carte')
const ENTRANCE = h('animate fade', 'fade, lift, zoom, left, right — or on a line below: enters from bottom', 'fade, lift, zoom, left, right — ou sur une ligne en dessous : entre depuis bas')

/** CSS properties and HTML or React attributes written as options. */
export const OPTION_HABITS: Record<string, Habit> = {
  // text
  'font-size': h('size 20'), fontsize: h('size 20'), 'text-size': h('size 20'),
  'font-weight': h('weight 600', 'or: bold', 'ou : bold'), fontweight: h('weight 600', 'or: bold', 'ou : bold'),
  'font-family': h('font "Satoshi"'), fontfamily: h('font "Satoshi"'),
  'font-style': h('italic'), italics: h('italic'),
  'text-align': h('align center'), textalign: h('align center'), 'text-center': h('align center'),
  'text-color': h('color pink'), foreground: h('color pink'), fg: h('color pink'),
  'text-decoration': h('underline', 'plain removes it', 'plain le retire'),
  'text-transform': h('uppercase'),
  strong: h('bold'), 'font-bold': h('bold'), thin: h('light'), semibold: h('weight 600'),
  // background, borders, shadows
  'background-color': h('background pink'), backgroundcolor: h('background pink'), 'bg-color': h('background pink'), bgcolor: h('background pink'),
  'background-image': h('background "photo.jpg"'),
  'border-radius': h('radius 12'), borderradius: h('radius 12'), 'corner-radius': h('radius 12'), 'rounded-lg': h('radius 12'),
  'rounded-full': h('round'), circle: h('round'),
  'border-color': h('border 1 gray'), 'border-width': h('border 2 gray'), 'border-style': h('border 1 gray'),
  'box-shadow': h('shadow soft'), boxshadow: h('shadow soft'), 'drop-shadow': h('shadow soft'), elevation: h('shadow soft'),
  'shadow-sm': h('shadow soft'), 'shadow-md': h('shadow medium'), 'shadow-lg': h('shadow strong'),
  // space
  'margin-top': h('margin 20 0 0 0', ...SIDES), 'margin-right': h('margin 0 20 0 0', ...SIDES),
  'margin-bottom': h('margin 0 0 20 0', ...SIDES), 'margin-left': h('margin 0 0 0 20', ...SIDES),
  'padding-top': h('padding 20 0 0 0', ...SIDES), 'padding-right': h('padding 0 20 0 0', ...SIDES),
  'padding-bottom': h('padding 0 0 20 0', ...SIDES), 'padding-left': h('padding 0 0 0 20', ...SIDES),
  'margin-x': h('margin 0 20', ...AXES), mx: h('margin 0 20', ...AXES), 'margin-inline': h('margin 0 20', ...AXES),
  'margin-y': h('margin 20 0', ...AXES), my: h('margin 20 0', ...AXES), 'margin-block': h('margin 20 0', ...AXES),
  'padding-x': h('padding 0 20', ...AXES), 'padding-inline': h('padding 0 20', ...AXES),
  'padding-y': h('padding 20 0', ...AXES), py: h('padding 20 0', ...AXES), 'padding-block': h('padding 20 0', ...AXES),
  'mx-auto': h('center'),
  'column-gap': h('gap 24'), 'row-gap': h('gap 24'), 'grid-gap': h('gap 24'),
  // layout
  display: say(
    'elements place their children: row (side by side), column (stacked), grid 3 columns; the option “hidden” hides',
    'les éléments placent leurs enfants : row (côte à côte), column (empilés), grid 3 columns ; l\'option « hidden » cache'),
  flex: h('direction row', 'or the elements row and column', 'ou les éléments row et column'),
  'flex-direction': h('direction row', 'or the elements row and column', 'ou les éléments row et column'),
  'flex-row': h('direction row'), 'flex-col': h('direction column'),
  justify: PLACE, 'justify-content': PLACE, 'align-items': PLACE, items: PLACE, 'place-items': PLACE, 'justify-items': PLACE, 'align-content': PLACE,
  'grid-template-columns': h('columns 3', 'columns 2 1 for unequal widths', 'columns 2 1 pour des largeurs inégales'),
  'grid-cols': h('columns 3'), 'grid-columns': h('columns 3'),
  'z-index': h('front'), zindex: h('front'),
  position: h('sticky', 'sticky stays at the top; pin bottom right places over the parent; front goes in front', 'sticky reste en haut ; pin bottom right pose par-dessus le parent ; front passe devant'),
  overflow: h('clip'),
  'w-full': h('full-width'), 'width-full': h('full-width'), fullwidth: h('full-width'),
  'h-screen': h('fullscreen'), 'min-h-screen': h('fullscreen'), 'full-height': h('fullscreen'), 'h-full': h('fullscreen'),
  'object-fit': h('cover', undefined, undefined, 'image "photo.jpg", "A photo"'), fit: h('cover', undefined, undefined, 'image "photo.jpg", "A photo"'),
  // visibility
  visibility: HIDDEN, visible: HIDDEN, show: HIDDEN, 'display-none': HIDDEN, 'v-if': HIDDEN, 'v-show': HIDDEN, when: HIDDEN,
  // effects
  transform: h('move 0 -10', 'also: grow 1.1, tilt 3', 'aussi : grow 1.1, tilt 3'),
  transition: say('nothing to write: changes are animated by themselves (hover lift 4)', 'rien à écrire : les changements s\'animent tout seuls (hover lift 4)'),
  'backdrop-filter': h('glass', 'or: blur 8', 'ou : blur 8'), backdropfilter: h('glass', 'or: blur 8', 'ou : blur 8'),
  filter: h('blur 8', 'or: grayscale', 'ou : grayscale'),
  'fade-in': ENTRANCE, fadein: ENTRANCE, fade: ENTRANCE, 'slide-in': ENTRANCE, 'slide-up': ENTRANCE, slideup: ENTRANCE, 'zoom-in': ENTRANCE,
  // sizes said with a word
  big: SIZE, huge: SIZE, large: SIZE, medium: SIZE, small: SIZE, tiny: SIZE, xl: SIZE, xxl: SIZE, lg: SIZE, md: SIZE, sm: SIZE, xs: SIZE,
  // attributes
  classname: NAMED_STYLE,
  style: say('options are written on the line itself: title "Hi", size 40, color pink', 'les options s\'écrivent sur la ligne elle-même : title "Salut", size 40, color pink'),
  onclick: ACTION, 'on-click': ACTION, onpress: ACTION, onsubmit: ACTION, onchange: ACTION,
  src: say('the file is the first value: image "photo.jpg", "What it shows"', 'le fichier est la première valeur : image "photo.jpg", "Ce qu\'elle montre"'),
  placeholder: say('the hint is the text after the state: field email "Your email"', 'l\'indication est le texte après l\'état : champ email "Ton e-mail"'),
  value: say('a field fills the state named first: field email "Your email"', 'un champ remplit l\'état nommé en premier : champ email "Ton e-mail"'),
  'v-model': say('a field fills the state named first: field email "Your email"', 'un champ remplit l\'état nommé en premier : champ email "Ton e-mail"'),
  target: h('new-tab', undefined, undefined, 'link "Docs" "/docs"'),
  href: say('the address comes right after the text: link "Contact" "/contact"   —   for a button: button "Shop", to "/shop"', 'l\'adresse vient juste après le texte : lien "Contact" "/contact"   —   pour un bouton : bouton "Boutique", vers "/boutique"'),
  key: say('nothing to write: Kaury follows the items of a list by itself', 'rien à écrire : Kaury suit tout seul les éléments d\'une liste'),
  link: say('a button goes to a page with: button "Shop", to "/shop"   —   a text link is the element: link "Shop" "/shop"', 'un bouton mène à une page avec : bouton "Boutique", vers "/boutique"   —   un lien de texte est l\'élément : lien "Boutique" "/boutique"'),
  url: say('a button goes to a page with: button "Shop", to "/shop"   —   a text link is the element: link "Shop" "/shop"', 'un bouton mène à une page avec : bouton "Boutique", vers "/boutique"   —   un lien de texte est l\'élément : lien "Boutique" "/boutique"'),
}

const BOX = h('box', 'a simple container; also: section, row, column, grid 3 columns', 'un conteneur simple ; aussi : section, row, column, grid 3 columns')
const TEXT = h('text "…"')
const TITLE = h('title "…"')
const LINK = h('link "Contact" "/contact"')
const IMAGE = h('image "photo.jpg", "What it shows"')
const LIST = h('list', 'with lines “item "…"” indented below', 'avec des lignes « item "…" » indentées dessous')
const GRID = h('grid 3 columns', 'one line below per cell', 'une ligne en dessous par case')
const HEADER = h('header', 'with “logo "Name"” and “links Home, Shop” indented below', 'avec « logo "Nom" » et « links Accueil, Boutique » indentés dessous')
const ROW = h('row', 'its children side by side', 'ses enfants côte à côte')
const COLUMN = h('column', 'its children stacked', 'ses enfants empilés')
const FIELD = h('field name "Your name"')

/** HTML tags and usual component names written at the start of a line. */
export const ELEMENT_HABITS: Record<string, Habit> = {
  div: BOX, container: BOX, wrapper: BOX, block: BOX, panel: BOX, group: BOX, view: BOX, aside: BOX, figure: BOX, article: BOX,
  main: h('section', 'a part of the page', 'une partie de la page'),
  span: TEXT, p: TEXT, paragraph: TEXT, para: TEXT, label: h('field email "you@example.com", label "Email"'),
  h1: TITLE, heading: TITLE, headline: TITLE,
  h2: h('subtitle "…"'), subheading: h('subtitle "…"'), subhead: h('subtitle "…"'),
  h3: h('subtitle "…", level 3'), h4: h('subtitle "…", level 4'), h5: h('subtitle "…", level 5'), h6: h('subtitle "…", level 6'),
  strong: h('text "…", bold', 'inside a text: "an *important* word"', 'dans un texte : "un mot *important*"'),
  b: h('text "…", bold', 'inside a text: "an *important* word"', 'dans un texte : "un mot *important*"'),
  em: h('text "…", italic'), i: h('text "…", italic'), small: h('text "…", size 13'),
  blockquote: h('text "…", italic'), quote: h('text "…", italic'),
  a: LINK, anchor: LINK, hyperlink: LINK,
  img: IMAGE, picture: IMAGE, photo: IMAGE, pic: IMAGE,
  ul: LIST, ol: LIST, li: h('item "…"'),
  hr: h('divider'), separator: h('divider'),
  br: h('spacer 24', 'inside a text, a new line is written \\n', 'dans un texte, un retour à la ligne s\'écrit \\n'),
  iframe: h('embed "https://example.com", "What it is"'),
  table: GRID, tr: GRID, td: GRID, th: GRID, cols: GRID,
  body: h('page "/"'), html: h('site "Name"'), meta: h('seo "Title", "Description"'),
  script: say('raw JavaScript goes under a line “js”, indented — only when really needed', 'le JavaScript brut va sous une ligne « js », indenté — seulement si vraiment nécessaire'),
  hero: h('Hero "Title", "Intro", "Action", "#contact"', 'a ready-made block, written with a capital letter; or: section fullscreen, center', 'un bloc tout fait, avec une majuscule ; ou : section fullscreen, center'),
  navbar: HEADER, navigation: HEADER, menu: HEADER, topbar: HEADER,
  flex: ROW, hstack: ROW, horizontal: ROW, inline: ROW,
  stack: COLUMN, vstack: COLUMN, vertical: COLUMN, col: COLUMN,
  btn: h('button "Send"'), cta: h('button "Send"'),
  submit: h('button "Send"', 'inside a form, the button sends it', 'dans un formulaire, le bouton l\'envoie'),
  textbox: FIELD, textfield: FIELD, 'text-field': FIELD, 'input-field': FIELD,
  dropdown: h('select size "S", "M", "L"'),
  accordion: h('details "Is it free?"', 'what is indented below shows on click', 'ce qui est indenté dessous s\'affiche au clic'),
  canvas: h('object "knot"', 'a 3D shape, or a .glb file', 'une forme 3D, ou un fichier .glb'),
  audio: h('sound "ambient.mp3", loop'), music: h('sound "ambient.mp3", loop'),
}

const FOR = h('for item in items')
const FUNCTION = h('function double x then x * 2')
const LET = h('let x = 3', 'a fixed value; for a value that changes on screen: state x = 3', 'une valeur fixe ; pour une valeur qui change à l\'écran : state x = 3')
const IF = h('if … else if … else', 'each on its own line, its block indented below', 'chacun sur sa ligne, son bloc indenté dessous')
const NONE = h('none')
const END = say('a block ends when the indentation goes back: nothing to write', 'un bloc se termine quand l\'indentation revient : rien à écrire')

/** Values of other languages, wherever a value is expected (case matters: “true” and “none” are the Kaury ones). */
export const VALUE_HABITS: Record<string, Habit> = {
  True: h('true'), TRUE: h('true'), False: h('false'), FALSE: h('false'),
  None: NONE, nil: NONE, Nil: NONE, NULL: NONE, Null: NONE,
}

/** Words of other languages at the start of a line. */
export const WORD_HABITS: Record<string, Habit> = {
  each: FOR, foreach: FOR, forEach: FOR, loop: FOR,
  repeat: h('for i in 1..3'), times: h('for i in 1..3'),
  elif: h('else if'), elsif: h('else if'), elseif: h('else if'),
  def: FUNCTION, func: FUNCTION, fun: FUNCTION, proc: FUNCTION, sub: FUNCTION, method: FUNCTION, lambda: FUNCTION,
  async: say('“async” is not needed: write “function load-data”, and “await” works inside by itself', '« async » est inutile : écris « function charge-donnees », et « await » fonctionne dedans tout seul'),
  var: LET, variable: LET, set: LET, local: LET, global: LET, val: LET, mut: LET, define: LET,
  class: h('component Card name'),
  route: h('page "/about"'),
  switch: IF, case: IF, match: IF,
  end: END, endif: END, fi: END, done: END,
  echo: h('print "Hello"'), puts: h('print "Hello"'), printf: h('print "Hello"'), println: h('print "Hello"'),
  require: h('import confetti from "canvas-confetti"'),
}

const own = (table: Record<string, Habit>, word: string): Habit | undefined =>
  Object.prototype.hasOwnProperty.call(table, word) ? table[word] : undefined

function sentence(x: Habit | undefined): string | undefined {
  if (!x) return undefined
  if (!x.k) return msg(x.en!, x.fr!)
  return msg(`in Kaury: ${x.k}${x.en ? `   (${x.en})` : ''}`, `en Kaury : ${x.k}${x.fr ? `   (${x.fr})` : ''}`)
}

/** The Kaury way to say an option written by habit (font-size, onClick…), as the “Try” of an error. */
export const optionHabit = (word: string): string | undefined => sentence(own(OPTION_HABITS, word) ?? own(OPTION_HABITS, word.toLowerCase()))
/** The Kaury way to say an element written by habit (div, h1…). */
export const elementHabit = (word: string): string | undefined => sentence(own(ELEMENT_HABITS, word))
/** The Kaury way to say a word of another language (var, def, elif…). */
export const wordHabit = (word: string): string | undefined => sentence(own(WORD_HABITS, word))
/** The Kaury way to say a value of another language (True, None, nil…). */
export const valueHabit = (word: string): string | undefined => sentence(own(VALUE_HABITS, word))
/** At the start of a line: an element or a word. */
export const lineHabit = (word: string): string | undefined => elementHabit(word) ?? wordHabit(word)
