// Step 3 — the checker: finds mistakes and explains them clearly.
// It also links every name to its declaration and gives a meaning to every UI line.

import { KauryError, closest, getLanguage, msg, q } from './errors.js'
import type { Command, Expr, BindingKind, Stmt, Binding, ResolvedOption, Pos } from './ast.js'
import { aliasesOf, canon, canonValue, RESERVED } from './keywords.js'
import {
  CAMERAS, COLORS, knownColor, ELEMENTS, EVENTS, LIGHTS, MOTION_WORDS, MOTIONS, elementOption, styleOption,
  optionSpec, allOptions, styleWords, TRANSITIONS,
} from './vocabulary.js'
import { JS_GLOBALS, KAURY_FUNCTIONS, kauryGlobal, kauryNames } from './globals.js'
import { literal, hexOf, contrast, DYNAMIC_PROP } from './css.js'
import { lineHabit, optionHabit, valueHabit } from './habits.js'
import { type Dictionary, holes, textKey } from './translate.js'

type ScopeKind = 'module' | 'page' | 'component' | 'function' | 'block' | 'lambda' | 'action'

class Scope {
  names = new Map<string, Binding>()
  constructor(public kind: ScopeKind, public parent?: Scope) {}
  find(name: string): Binding | undefined {
    return this.names.get(name) ?? this.parent?.find(name)
  }
  /** Scope that receives implicit declarations (“x = 3” without let/state). */
  host(): Scope {
    let s: Scope = this
    while (s.kind === 'block' && s.parent) s = s.parent
    if (s.kind === 'action') {
      // an action stores its new states in the page or component around it
      let t: Scope | undefined = s.parent
      while (t && t.kind !== 'page' && t.kind !== 'component' && t.kind !== 'module') t = t.parent
      return t ?? s
    }
    return s
  }
  isView(): boolean {
    return this.kind === 'module' || this.kind === 'page' || this.kind === 'component'
  }
  all(): string[] {
    return [...this.names.keys(), ...(this.parent?.all() ?? [])]
  }
}

export interface ModuleInfo {
  pages: { path: string; pos: Pos }[]
  components: string[]
  immersion: boolean
  threeD: boolean
  lottie: boolean
  colors: Record<string, string>
  exports: string[]
  /** files written as they are (image "photo.jpg", background "bg.jpg", object "can.glb"…): the build checks they exist */
  files: { path: string; pos: Pos }[]
  /** fields read on an entry of content files (post.title, about.name): the build checks that a file has them */
  reads: { source: string; field: string; pos: Pos }[]
  /** pages reached by an action (go "/shop"): the build checks they exist */
  gos: { path: string; pos: Pos }[]
  /** what each page names (section about, id "prices", the heading of a block): a menu word finds its section on another page */
  anchors: { page: string; id: string }[]
  /** a site in several languages (lang "fr", "en"): its languages, the first one being that of the file */
  languages: string[]
  /** the texts of the file and their translations (translate "en") */
  dictionary: Dictionary
}

/** "Our prices" → "our-prices": the name a heading gives to its section (same rule as the runtime). */
const slugOf = (s: string) => s.replace(/\*/g, '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

/** The text of an expression written as it is ("photo.jpg"), or undefined when it is computed. */
const staticText = (e?: Expr): string | undefined =>
  e?.k === 'text' && e.parts.every((p) => typeof p === 'string') ? (e.parts as string[]).join('') : undefined

/** A text that names a file of the site (not a shape such as "knot", not a text logo). */
const MEDIA_FILE = /\.(png|jpe?g|webp|avif|gif|svg|ico|mp4|webm|mov|mp3|wav|ogg|m4a|glb|gltf|json|lottie|pdf)([?#].*)?$/i

export function check(program: Stmt[], options: { file?: string } = {}): {
  errors: KauryError[]
  warnings: KauryError[]
  info: ModuleInfo
} {
  const c = new Checker()
  c.module(program)
  for (const e of [...c.errors, ...c.warnings]) e.file = options.file
  return { errors: c.errors, warnings: c.warnings, info: c.info }
}

const NAMED_CONTAINERS = ['section', 'box', 'grid', 'row', 'column', 'scene', 'card', 'form', 'list', 'header', 'footer', 'nav']
const ALWAYS_NAMED = ['section', 'scene', 'header', 'footer', 'nav']
const FIELD_HEADS = ['field', 'textarea', 'select', 'checkbox']
/** Elements whose first word is a state of the page: the value a field fills, the true/false a dialog follows. */
const STATE_HEADS = [...FIELD_HEADS, 'dialog']
/** Elements whose first item is their content (a text, an image…). */
const CONTENT_HEADS = new Set(['title', 'subtitle', 'text', 'item', 'icon', 'button', 'link', 'image', 'video', 'card', 'logo', 'markdown', 'details', 'embed'])
/** Units written after a number: glued to it (20px, 50%, 2rem). */
const UNIT_WORDS = new Set(['px', 'rem', 'em', 'vh', 'vw', 'svh', 'dvh', 'ms', 's', 'deg', 'fr', 'pt', 'percent'])
/** Words a size may take instead of a number (they mean the same in every browser). */
const CSS_SIZES = new Set(['auto', 'inherit', 'fit-content', 'min-content', 'max-content'])
/** Color words every browser understands (the named colors of CSS, and the ones that follow the context): accepted as they are. */
const CSS_COLORS = new Set(('inherit currentcolor transparent none ' +
  'aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet brown burlywood cadetblue chartreuse ' +
  'chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan darkgoldenrod darkgray darkgreen darkgrey darkkhaki darkmagenta ' +
  'darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen darkslateblue darkslategray darkslategrey darkturquoise darkviolet ' +
  'deeppink deepskyblue dimgray dimgrey dodgerblue firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite gold goldenrod gray green ' +
  'greenyellow grey honeydew hotpink indianred indigo ivory khaki lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral ' +
  'lightcyan lightgoldenrodyellow lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen lightskyblue lightslategray ' +
  'lightslategrey lightsteelblue lightyellow lime limegreen linen magenta maroon mediumaquamarine mediumblue mediumorchid mediumpurple ' +
  'mediumseagreen mediumslateblue mediumspringgreen mediumturquoise mediumvioletred midnightblue mintcream mistyrose moccasin navajowhite ' +
  'navy oldlace olive olivedrab orange orangered orchid palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru pink ' +
  'plum powderblue purple rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown seagreen seashell sienna silver skyblue ' +
  'slateblue slategray slategrey snow springgreen steelblue tan teal thistle tomato turquoise violet wheat white whitesmoke yellow yellowgreen').split(' '))
/** what shows a text of its own: its color is read on the background behind it */
const READ_HEADS = new Set(['title', 'subtitle', 'text', 'link', 'item'])
const SITE_SETTINGS = ['colors', 'font', 'fonts', 'lang', 'favicon', 'url', 'seo', 'style', 'transition', 'head', 'base', 'mobile', 'tablet', 'desktop', 'sound']

class Checker {
  errors: KauryError[] = []
  warnings: KauryError[] = []
  info: ModuleInfo = { pages: [], components: [], immersion: false, threeD: false, lottie: false, colors: {}, exports: [], files: [], reads: [], gos: [], anchors: [], languages: [], dictionary: new Map() }
  /** the page being read, when its address is fixed ("/shop", not "/product/:id") */
  private page?: string
  /** the first word of the line being read, when the line is a call or a name (tittle "Hi") */
  private lineHead?: Extract<Expr, { k: 'name' }>
  private components = new Set<string>()
  private componentParams = new Map<string, { names: string[]; required: number }>()
  /** named styles: style promise (indented options) → used as “column promise” */
  private namedStyles = new Set<string>()
  private styleDefs = new Map<string, Pos>()
  private usedStyles = new Set<string>()
  private namedAnimations = new Set<string>()
  /** the rules of each named style, once checked: a button reads the background and the text color they give it */
  private styleRules = new Map<string, Command[]>()
  /** where each color of the site is written */
  private colorPos = new Map<string, Pos>()
  /** the background of the site, when it is a color written as it is (the one of Kaury when the site gives none) */
  private siteGround: string | undefined = '#fcfbf8'
  /** inside a page: the background behind what is being read, box after box (undefined: a picture, a gradient, a color that depends) */
  private grounds: (string | undefined)[] = []
  /** a button of its own, or a ready-made block that has one: the color of the buttons matters */
  private usesButtons = false

  private err(pos: Pos, what: string, fix?: string) {
    this.errors.push(new KauryError(pos, what, fix))
  }
  private warn(pos: Pos, what: string, fix?: string) {
    this.warnings.push(new KauryError(pos, what, fix, 'warning'))
  }

  // ------------------------------------------------------------------
  module(prog: Stmt[]) {
    const s = new Scope('module')
    for (const i of prog) if (i.k === 'site') this.readSiteColors(i.body)
    this.readLanguages(prog)
    this.hoist(prog, s)
    // pages and components are displayed after the file is loaded:
    // they are checked last, so they see everything declared in the file
    const late = (i: Stmt) => i.k === 'page' || i.k === 'component' || i.k === 'site' || i.k === 'command'
    this.statements(prog.filter((i) => !late(i)), s)
    for (const i of prog.filter(late)) this.statement(i, s)
    const seen = new Map<string, Pos>()
    for (const pg of this.info.pages) {
      if (seen.has(pg.path)) this.err(pg.pos, msg(`the page ${q(pg.path)} already exists (line ${seen.get(pg.path)!.line}).`, `la page ${q(pg.path)} existe déjà (ligne ${seen.get(pg.path)!.line}).`),
        msg('give each page a different address.', 'donne une adresse différente à chaque page.'))
      seen.set(pg.path, pg.pos)
    }
    this.checkAccent()
    this.unusedTranslations()
    if (this.info.pages.length && !this.info.exports.length) {
      for (const [name, pos] of this.styleDefs) {
        if (!this.usedStyles.has(name)) {
          this.warn({ ...pos, length: 5 + 1 + name.length }, msg(`the style ${q(name)} is never used.`, `le style ${q(name)} n'est jamais utilisé.`),
            msg(`write its name on an element (text "…", ${name}), or remove it.`, `écris son nom sur un élément (texte "…", ${name}), ou supprime-le.`))
        }
      }
    }
    for (const [name, b] of s.names) {
      if (!b.used && b.kind === 'state' && !this.info.exports.includes(name) && b.pos) {
        this.warn(b.pos, msg(`the state ${q(name)} is never used.`, `l'état ${q(name)} n'est jamais utilisé.`), msg('remove it, or show it somewhere.', 'supprime-le, ou affiche-le quelque part.'))
      }
    }
  }

  /** lang "fr", "en" in site, and the translate blocks: read before the pages, which use them wherever they are written. */
  private readLanguages(prog: Stmt[]) {
    for (const i of prog) {
      if (i.k !== 'site') continue
      for (const c of i.body) {
        if (c.k !== 'command' || c.head !== 'lang') continue
        const codes = c.items.flatMap((it) => it.atoms).map((a) => (a.k === 'text' && a.parts.every((p) => typeof p === 'string') ? (a.parts as string[]).join('') : undefined))
        if (codes.length > 1 && codes.every((x): x is string => !!x)) this.info.languages = codes
      }
    }
    const langs = this.info.languages
    for (const i of prog) {
      if (i.k !== 'translate') continue
      if (!langs.length) {
        this.err(i.pos, msg(`the site has one language: to translate it into ${q(i.lang)}, give it its languages, the one of the file first.`, `le site a une seule langue : pour le traduire en ${q(i.lang)}, donne-lui ses langues, celle du fichier d'abord.`),
          `site "…"\n  lang "fr", "${i.lang}"`)
        continue
      }
      if (i.lang === langs[0]) {
        this.err(i.pos, msg(`${q(i.lang)} is the language the file is written in: its texts need no translation.`, `${q(i.lang)} est la langue dans laquelle le fichier est écrit : ses textes n'ont pas besoin de traduction.`),
          msg(`translate into the other languages of the site: ${langs.slice(1).map((l) => `translate "${l}"`).join(', ')}`, `traduis dans les autres langues du site : ${langs.slice(1).map((l) => `translate "${l}"`).join(', ')}`))
        continue
      }
      if (!langs.includes(i.lang)) {
        this.err(i.pos, msg(`${q(i.lang)} is not one of the languages of the site (${langs.join(', ')}).`, `${q(i.lang)} n'est pas une des langues du site (${langs.join(', ')}).`),
          `lang ${[...langs, i.lang].map((l) => `"${l}"`).join(', ')}`)
        continue
      }
      for (const pair of i.pairs) {
        const key = textKey(pair.from)
        const own = holes(pair.from)
        const missing = [...holes(pair.to).keys()].filter((k) => !own.has(k))
        if (missing.length) {
          this.err(pair.pos, msg(`the translation reads {${missing[0]}}, which the text it translates does not have.`, `la traduction lit {${missing[0]}}, que le texte qu'elle traduit n'a pas.`),
            msg(`between braces, a translation uses the values of its text: ${[...own.keys()].map((k) => `{${k}}`).join(' ') || 'here, none'}`, `entre accolades, une traduction reprend les valeurs de son texte : ${[...own.keys()].map((k) => `{${k}}`).join(' ') || 'ici, aucune'}`))
          continue
        }
        let byLang = this.info.dictionary.get(key)
        if (!byLang) this.info.dictionary.set(key, (byLang = new Map()))
        const before = byLang.get(i.lang)
        if (before) {
          this.warn(pair.pos, msg(`this text is already translated into ${q(i.lang)} on line ${before.pos.line}: this line wins.`, `ce texte est déjà traduit en ${q(i.lang)} ligne ${before.pos.line} : cette ligne l'emporte.`),
            msg('keep one translation per text.', 'garde une seule traduction par texte.'))
        }
        byLang.set(i.lang, { to: pair.to, pos: pair.pos, used: false })
      }
    }
  }

  /** A translation of a text the file does not have: a text changed since, or written differently. */
  private unusedTranslations() {
    const unused = new Set([...this.info.dictionary].filter(([, byLang]) => [...byLang.values()].every((t) => !t.used)).map(([k]) => k))
    // the texts the file does say, to point at the one meant
    const said = [...this.info.dictionary.keys()].filter((k) => !unused.has(k)).concat([...this.said])
    for (const key of unused) {
      for (const [lang, t] of this.info.dictionary.get(key)!) {
        const near = closest(key, said)
        this.warn(t.pos, msg(`no text of the file says ${q(key)}: this translation into ${q(lang)} is never used.`, `aucun texte du fichier ne dit ${q(key)} : cette traduction en ${q(lang)} ne sert jamais.`),
          near ? msg(`the file says ${q(near)}: write it the same way, letter for letter.`, `le fichier dit ${q(near)} : écris-le de la même façon, lettre pour lettre.`)
            : msg('a text is found by what it says, letter for letter: copy it from the line where it is written, or remove this one.', 'un texte est trouvé par ce qu\'il dit, lettre pour lettre : copie-le depuis la ligne où il est écrit, ou supprime celle-ci.'))
      }
    }
  }

  /** the texts written in the file (a site in several languages): a translation that matches none is compared to them */
  private said = new Set<string>()

  /**
   * In a site of several languages, a text shown in the page that has no translation into one of them:
   * its page in that language shows it as it is written.
   */
  private untranslated(e: Expr | undefined) {
    const langs = this.info.languages
    if (!langs.length || e?.k !== 'text') return
    const key = textKey(e)
    const plain = e.parts.filter((p): p is string => typeof p === 'string').join('')
    // a file, an address, a code, a number: nothing to translate
    if (!/\p{L}{2}/u.test(plain) || MEDIA_FILE.test(plain) || /^(\/|#|https?:|mailto:|tel:)/.test(plain.trim())) return
    const have = this.info.dictionary.get(key)
    const missing = langs.slice(1).filter((l) => !have?.has(l))
    if (!missing.length) return
    this.warn(e.pos, msg(`${q(key)} has no translation into ${missing.map(q).join(', ')}: that page shows it as it is written.`, `${q(key)} n'a pas de traduction en ${missing.map(q).join(', ')} : cette page l'affiche tel qu'il est écrit.`),
      msg(`add it to the block translate "${missing[0]}": "${key}" "…"`, `ajoute-le au bloc translate "${missing[0]}" : "${key}" "…"`))
  }

  private readSiteColors(body: Stmt[]) {
    for (const i of body) {
      if (i.k === 'command' && i.head === 'colors') {
        for (const it of i.items) {
          let [n, c] = it.atoms
          // « beige-2 » is read as beige - 2 by the lexer; in a colors line it is a name
          if (n?.k === 'binary' && n.op === '-' && n.l.k === 'name' && n.r.k === 'number') n = { k: 'name', name: `${n.l.name}-${n.r.v}`, pos: n.pos }
          if (n?.k === 'name' && c?.k === 'color') {
            this.info.colors[n.name] = c.v
            this.colorPos.set(n.name, it.pos)
          }
          else if (n?.k === 'name' && c?.k === 'name' && knownColor(c.name)) this.info.colors[n.name] = `var(--k-${knownColor(c.name)})`
          else this.err(it.pos, msg('each color is written “name #code”.', 'chaque couleur s\'écrit « nom #code ».'), 'colors pink #FF4F8B, cream #FFF4E8')
        }
      }
    }
  }

  /** Declares ahead what a block defines (functions, components, imports) so it can be used before its line. */
  private hoist(body: Stmt[], s: Scope) {
    for (const i of body) {
      switch (i.k) {
        case 'function':
          this.declare(s, i.name, 'function', i.pos).params = { names: i.params.map((p) => p.name), required: i.params.filter((p) => !p.default).length }
          if (i.exported) this.info.exports.push(i.name)
          break
        case 'style-def':
          // “style button” restyles every button; “style promise” is a new word
          if (!(i.name in ELEMENTS) && i.name !== 'emphasis') {
            this.namedStyles.add(i.name)
            if (!this.styleDefs.has(i.name)) this.styleDefs.set(i.name, i.pos)
          }
          break
        case 'animation-def':
          this.namedAnimations.add(i.name)
          break
        case 'component':
          this.declare(s, i.name, 'component', i.pos)
          this.components.add(i.name)
          this.componentParams.set(i.name, { names: i.params.map((p) => p.name), required: i.params.filter((p) => !p.default).length })
          this.info.components.push(i.name)
          if (i.exported) this.info.exports.push(i.name)
          break
        case 'import':
          for (const n of [i.default, i.all, ...(i.names ?? []).map((x) => x.alias ?? x.name)]) {
            if (n) {
              const b = this.declare(s, n, /^\p{Lu}/u.test(n) && i.source.endsWith('.kaury') ? 'component' : 'import', i.pos)
              // content collections are reactive: a value computed from them follows them (let articles = posts.sort(…))
              if (/(\*|\.(md|mdx|mdoc|markdown|ya?ml)$)/i.test(i.source)) {
                b.collection = true
                // several files: a list of entries; one file: the entry itself
                if (n === i.default) b.content = { source: i.source, entry: !i.source.includes('*') }
              }
              if (/^\p{Lu}/u.test(n)) this.components.add(n)
            }
          }
          break
      }
    }
  }

  private declare(s: Scope, name: string, kind: BindingKind, pos: Pos): Binding {
    if (RESERVED.has(canon(name) ?? '') && canon(name) === name) {
      this.err(pos, msg(`${q(name)} is a reserved Kaury word; it cannot be used as a name.`, `${q(name)} est un mot réservé de Kaury ; il ne peut pas servir de nom.`),
        msg(`choose another name, for example ${q('my-' + name)}.`, `choisis un autre nom, par exemple ${q('mon-' + name)}.`))
    }
    const prev = s.names.get(name)
    if (prev && prev.kind !== 'function' && kind !== 'variable' && prev.pos && prev.pos !== pos && s.kind !== 'module' && prev.kind === kind) {
      this.err(pos, msg(`${q(name)} is already declared on line ${prev.pos.line}.`, `${q(name)} est déjà déclaré ligne ${prev.pos.line}.`),
        msg(`to change its value, just write “${name} = …”.`, `pour changer sa valeur, écris simplement « ${name} = … ».`))
    }
    const b: Binding = { kind, name, pos }
    s.names.set(name, b)
    return b
  }

  // ------------------------------------------------------------------
  private statements(body: Stmt[], s: Scope) {
    this.hoistImplicit(body, s)
    for (const i of body) this.statement(i, s)
  }

  private hoistImplicit(body: Stmt[], s: Scope) {
    const host = s.host()
    // names declared explicitly (let / state) are never implicit declarations
    const explicit = new Set<string>()
    const collect = (list: Stmt[]) => {
      for (const i of list) {
        if (i.k === 'let') explicit.add(i.name)
        else if (i.k === 'if') {
          collect(i.then)
          i.elifs.forEach((x) => collect(x.body))
          if (i.else) collect(i.else)
        } else if (i.k === 'for' || i.k === 'while') collect(i.body)
        else if (i.k === 'try') {
          collect(i.body)
          if (i.handler) collect(i.handler)
        } else if (i.k === 'command' && host.isView()) collect(i.children)
      }
    }
    collect(body)
    const walk = (list: Stmt[]) => {
      for (const i of list) {
        if (i.k === 'assign' && i.target.k === 'name' && i.op === '=') {
          const name = i.target.name
          if (!s.find(name) && !explicit.has(name) && !kauryGlobal(name) && !JS_GLOBALS.has(name)) {
            const b = this.declare(host, name, host.isView() ? 'state' : 'variable', i.pos)
            b.mutated = true
            i.declares = b
          }
        }
        // toggle menu / open menu: creates the true/false state « menu » when it does not exist
        if (i.k === 'toggle' && i.target.k === 'name' && !s.find(i.target.name) && !explicit.has(i.target.name) && host.isView()) {
          const b = this.declare(host, i.target.name, 'state', i.pos)
          b.mutated = true
          i.declares = b
        }
        if (i.k === 'if') {
          walk(i.then)
          i.elifs.forEach((x) => walk(x.body))
          if (i.else) walk(i.else)
        } else if (i.k === 'for' || i.k === 'while') walk(i.body)
        else if (i.k === 'try') {
          walk(i.body)
          if (i.handler) walk(i.handler)
        } else if (i.k === 'command' && host.isView()) {
          // the first word of a field is the state it fills: known in the whole page, above the form too
          // (the thank-you message written before the form that asks for the name)
          const first = STATE_HEADS.includes(i.head) ? i.items[0]?.atoms[0] : undefined
          if (first?.k === 'name' && !s.find(first.name) && !explicit.has(first.name) && !kauryGlobal(first.name) && !JS_GLOBALS.has(first.name)
            && !elementOption(i.head, first.name) && (i.items[0].atoms.length > 1 || !styleOption(first.name))) {
            const b = this.declare(host, first.name, 'state', i.items[0].pos)
            b.mutated = true
            b.used = true
          }
          walk(i.children)
          if (i.action) walk(i.action)
        }
      }
    }
    walk(body)
  }

  private statement(i: Stmt, s: Scope) {
    switch (i.k) {
      case 'let': {
        this.expr(i.value, s)
        let kind: BindingKind = i.reactive ? 'state' : 'const'
        if (!i.reactive && s.host().isView() && this.readsReactive(i.value, s)) kind = 'derived'
        i.binding = this.declare(s, i.name, kind, i.pos)
        // let recent = posts.sort(…): still the entries of those files
        const from = this.entriesOf(i.value, s)
        if (from) i.binding.content = { source: from, entry: false }
        if (i.exported) this.info.exports.push(i.name)
        break
      }
      case 'assign': {
        this.expr(i.value, s)
        // 3.x = 1, "a".x = 1: a value written as it is holds nothing
        if ((i.target.k === 'member' || i.target.k === 'index') && ['number', 'text', 'bool', 'none', 'color'].includes(i.target.object.k)) {
          this.err(i.target.pos, msg('nothing can be stored inside a number, a text or an empty value.', 'on ne peut rien ranger dans un nombre, un texte ou une valeur vide.'),
            msg('store into a name: total = 3   ·   product.price = 3', 'range dans un nom : total = 3   ·   produit.prix = 3'))
          break
        }
        if (i.target.k === 'name') {
          const b = i.declares ?? s.find(i.target.name)
          if (!b) this.unknownName(i.target.name, i.target.pos, s)
          else {
            i.target.binding = b
            b.mutated = true
            if (!i.declares) b.used = true
            if (b.kind === 'const' || b.kind === 'derived') {
              this.err(i.pos, msg(`${q(i.target.name)} is declared with “let”: its value is fixed.`, `${q(i.target.name)} est déclaré avec « soit » : sa valeur est fixe.`),
                msg(`declare it with “state ${i.target.name} = …” to be able to change it.`, `déclare-le avec « etat ${i.target.name} = … » pour pouvoir le changer.`))
            } else if (b.kind === 'function' || b.kind === 'component') {
              this.err(i.pos, msg(`${q(i.target.name)} is a ${b.kind}; it cannot be given a value.`, `${q(i.target.name)} est une ${b.kind === 'function' ? 'fonction' : 'composant'} : on ne peut pas lui donner une valeur.`),
                msg('choose another variable name.', 'choisis un autre nom de variable.'))
            } else if (b.kind === 'prop') {
              this.err(i.pos, msg(`${q(i.target.name)} is a component parameter: it comes from outside and is not changed here.`, `${q(i.target.name)} est un paramètre du composant : il vient de l'extérieur et ne se modifie pas ici.`),
                msg(`copy it into a state: state local-${i.target.name} = ${i.target.name}`, `copie-le dans un état : etat ${i.target.name}-local = ${i.target.name}`))
            }
          }
        } else this.expr(i.target, s)
        break
      }
      case 'function': {
        const f = new Scope('function', s)
        for (const p of i.params) {
          if (p.default) this.expr(p.default, s)
          this.declare(f, p.name, 'param', p.pos)
        }
        this.hoist(i.body, f)
        this.statements(i.body, f)
        break
      }
      case 'if':
        this.expr(i.cond, s)
        for (const side of [i.then, ...i.elifs.map((x) => x.body), i.else ?? []]) this.looseStyle(side, s, 'if')
        this.block(i.then, s)
        for (const x of i.elifs) {
          this.expr(x.cond, s)
          this.block(x.body, s)
        }
        if (i.else) this.block(i.else, s)
        break
      case 'for': {
        this.looseStyle(i.body, s, 'for')
        this.expr(i.source, s)
        const b = new Scope('block', s)
        const each = this.declare(b, i.variable, 'loop', i.pos)
        const from = this.entriesOf(i.source, s)
        if (from) each.content = { source: from, entry: true }
        if (i.index) this.declare(b, i.index, 'loop', i.pos)
        this.hoist(i.body, b)
        this.statements(i.body, b)
        break
      }
      case 'while':
        this.expr(i.cond, s)
        this.block(i.body, s)
        break
      case 'try':
        this.block(i.body, s)
        if (i.handler) {
          const b = new Scope('block', s)
          if (i.variable) this.declare(b, i.variable, 'variable', i.pos)
          this.statements(i.handler, b)
        }
        break
      case 'import':
      case 'break':
      case 'continue':
      case 'js':
      case 'css':
        break
      case 'style-def':
        for (const r of i.rules) this.command(r, s, r.part && r.part in ELEMENTS ? r.part : i.name in ELEMENTS ? i.name : 'box')
        this.styleRules.set(i.name, i.rules)
        break
      case 'animation-def':
        for (const r of i.frames) this.command(r, s, 'box')
        break
      case 'return':
        if (i.value) this.expr(i.value, s)
        break
      case 'expr': {
        // a line started with a word of HTML or of another language (h1 "Title", submit "Send"): the Kaury form
        const head = i.e.k === 'call' && i.e.fn.k === 'name' ? i.e.fn : i.e.k === 'name' ? i.e : undefined
        const habit = head && !s.find(head.name) && !kauryGlobal(head.name) && !JS_GLOBALS.has(head.name) ? lineHabit(head.name) : undefined
        if (head && habit) {
          this.err({ ...head.pos, length: head.name.length }, msg(`${q(head.name)} is not a Kaury word.`, `${q(head.name)} n'est pas un mot de Kaury.`), habit)
          break
        }
        // a first word that is nothing known: one answer for the line (what follows it would only add noise)
        // (“a-b” made of known names is a subtraction: left to the usual reading)
        const subtraction = !!head && head.name.includes('-') && head.name.split('-').every((m) => m && (s.find(m) || kauryGlobal(m)))
        if (head && i.e.k === 'call' && !subtraction && !s.find(head.name) && !kauryGlobal(head.name) && !JS_GLOBALS.has(head.name)) {
          this.lineHead = head
          this.unknownName(head.name, head.pos, s)
          this.lineHead = undefined
          break
        }
        // a function alone on its line is kept nowhere and called by nobody (“onver -> …” for “on hover -> …”)
        if (i.e.k === 'lambda') {
          this.err(i.e.pos, msg('this function is written here and never used: nothing keeps it, nothing calls it.', 'cette fonction est écrite ici et jamais utilisée : rien ne la garde, rien ne l\'appelle.'),
            s.host().kind === 'page' || s.host().kind === 'component'
              ? msg('an action of the element above starts with “on”: on click -> …   /   on hover -> …', 'une action de l\'élément au-dessus commence par « on » : on click -> …   /   on hover -> …')
              : msg('keep it under a name: let double = x -> x * 2   (or: function double x)', 'garde-la sous un nom : let double = x -> x * 2   (ou : function double x)'))
          break
        }
        this.lineHead = head
        this.expr(i.e, s)
        this.lineHead = undefined
        break
      }
      case 'toggle':
        if (i.declares && i.target.k === 'name') {
          i.target.binding = i.declares
          break
        }
        this.expr(i.target, s)
        if (i.target.k === 'name' && i.target.binding) i.target.binding.mutated = true
        break
      case 'go': {
        this.expr(i.path, s)
        const to = staticText(i.path)
        if (to?.startsWith('/')) this.info.gos.push({ path: to, pos: i.path.pos })
        break
      }
      case 'component': {
        const c = new Scope('component', s)
        for (const p of i.params) {
          if (p.default) this.expr(p.default, s)
          this.declare(c, p.name, 'prop', p.pos)
        }
        this.hoist(i.body, c)
        this.statements(i.body, c)
        break
      }
      case 'page': {
        this.info.pages.push({ path: i.path, pos: i.pos })
        const pg = new Scope('page', s)
        // address parameters: page "/product/:id" → id
        for (const m of i.path.matchAll(/:([\p{L}_][\p{L}\p{N}_-]*)/gu)) this.declare(pg, m[1], 'const', i.pos)
        // page "/blog/{post.slug}" for post in posts
        if (i.each) {
          this.expr(i.each.source, s)
          const each = this.declare(pg, i.each.variable, 'loop', i.pos)
          each.used = true
          const from = this.entriesOf(i.each.source, s)
          if (from) each.content = { source: from, entry: true }
          if (i.address) this.expr(i.address, pg)
        }
        this.hoist(i.body, pg)
        this.page = /[:{]/.test(i.path) || i.each ? undefined : i.path
        this.grounds = [this.siteGround]
        this.statements(i.body, pg)
        this.grounds = []
        this.page = undefined
        break
      }
      case 'translate':
        // read with the languages of the site, before the pages (readLanguages)
        break
      case 'site': {
        if (i.name) this.expr(i.name, s)
        for (const c of i.body) {
          if (c.k !== 'command' || !SITE_SETTINGS.includes(c.head)) {
            this.err(c.pos, msg('“site” only holds settings: colors, font, lang, favicon, url, seo, style, transition, head, base.', 'dans « site », on ne met que des réglages : couleurs, police, langue, favicon, adresse, seo, style, transition, head, base.'),
              msg('move this element into a page "/".', 'déplace cet élément dans une page "/".'))
            continue
          }
          this.command(c, s, 'site')
          if (c.head === 'style') {
            const own = this.ground('box', c.meaning?.options ?? [], [])
            if (own !== 'same') this.siteGround = own
          }
        }
        break
      }
      case 'command':
        this.command(i, s, undefined)
        break
    }
  }

  private block(body: Stmt[], s: Scope) {
    const b = new Scope('block', s)
    this.hoist(body, b)
    this.statements(body, b)
  }

  /** Does the expression read a state (directly or through a derived value)? */
  private readsReactive(e: Expr, s: Scope): boolean {
    let yes = false
    const see = (x: Expr) => {
      if (yes) return
      switch (x.k) {
        case 'name': {
          const b = x.binding ?? s.find(x.name)
          if (b && (b.kind === 'state' || b.kind === 'derived' || b.kind === 'prop' || b.collection)) yes = true
          if (!b && ['mouse', 'scroll', 'screen', 'route'].includes(kauryGlobal(x.name) ?? '')) yes = true
          break
        }
        case 'text':
          for (const m of x.parts) if (typeof m !== 'string') see(m)
          break
        case 'list': x.items.forEach(see); break
        case 'object': x.props.forEach((p) => see(p.value)); break
        case 'member': see(x.object); break
        case 'index': see(x.object); see(x.index); break
        case 'call': see(x.fn); x.args.forEach(see); break
        case 'binary': see(x.l); see(x.r); break
        case 'unary': case 'spread': see(x.e); break
        case 'if': see(x.cond); see(x.then); see(x.else); break
        case 'range': see(x.from); see(x.to); break
        case 'lambda': if (!Array.isArray(x.body)) see(x.body); break
        case 'await': break // waiting is not a derived value
      }
    }
    see(e)
    return yes
  }

  // ------------------------------------------------------------------
  private unknownName(name: string, pos: Pos, s: Scope) {
    const sug = closest(name, [...s.all(), ...kauryNames(getLanguage() === 'fr')])
    if (name.includes('-')) {
      const parts = name.split('-')
      if (parts.every((m) => s.find(m) || /^\d/.test(m))) {
        this.err({ ...pos, length: name.length }, msg(`${q(name)} does not exist.`, `${q(name)} n'existe pas.`),
          msg(`to subtract, put spaces around it: ${parts.join(' - ')}`, `pour soustraire, mets des espaces : ${parts.join(' - ')}`))
        return
      }
    }
    const c = canon(name)
    if (c && ELEMENTS[c]) {
      this.err({ ...pos, length: name.length }, msg(`${q(name)} is a UI element; it must start a line.`, `${q(name)} est un élément d'interface ; il doit être en début de ligne.`),
        msg(`start a new line: ${name} "…"`, `passe à la ligne : ${name} "…"`))
      return
    }
    // a value of another language (True, None, nil): the Kaury form, unless a name of the file is close
    const habit = closest(name, s.all()) ? undefined : valueHabit(name)
    if (habit) {
      this.err({ ...pos, length: name.length }, msg(`${q(name)} is not a Kaury word.`, `${q(name)} n'est pas un mot de Kaury.`), habit)
      return
    }
    // an element is proposed for the first word of a line only (tittle "Hi"), never for a value inside one ({name})
    const elements = getLanguage() === 'fr' ? Object.keys(ELEMENTS).flatMap((e) => [e, ...aliasesOf(e)]) : Object.keys(ELEMENTS)
    const element = sug || this.lineHead?.pos !== pos ? undefined : closest(name, elements)
    this.err({ ...pos, length: name.length }, msg(`${q(name)} does not exist.`, `${q(name)} n'existe pas.`),
      sug ? msg(`did you mean ${q(sug)}?`, `tu voulais dire ${q(sug)} ?`)
        : element ? msg(`did you mean the element ${q(element)}?`, `tu voulais dire l'élément ${q(element)} ?`)
          : msg(`declare it first: let ${name} = …   (or state ${name} = … if it changes)`, `déclare-le avant : soit ${name} = …   (ou etat ${name} = … s'il change)`))
  }

  expr(e: Expr, s: Scope) {
    switch (e.k) {
      case 'number': case 'color': case 'bool': case 'none':
        return
      case 'text': {
        for (const m of e.parts) if (typeof m !== 'string') this.expr(m, s)
        if (this.info.languages.length) {
          // a text with a translation: chosen in each page by its language
          const key = textKey(e)
          this.said.add(key)
          const byLang = this.info.dictionary.get(key)
          if (byLang) {
            e.translated = true
            for (const t of byLang.values()) t.used = true
          }
        }
        return
      }
      case 'name': {
        const b = s.find(e.name)
        if (b) {
          e.binding = b
          b.used = true
          return
        }
        const g = kauryGlobal(e.name)
        if (g) {
          e.binding = { kind: 'kaury', name: g }
          return
        }
        if (JS_GLOBALS.has(e.name)) {
          e.binding = { kind: 'js', name: e.name }
          return
        }
        // “a-b” when “a” and “b” exist but “a-b” does not: it is a subtraction
        const parts = e.name.split('-')
        if (parts.length > 1 && parts.every((m) => m && (s.find(m) || kauryGlobal(m)))) {
          this.warn({ ...e.pos, length: e.name.length }, msg(`${q(e.name)} is read as a subtraction.`, `${q(e.name)} est lu comme une soustraction.`),
            msg(`write it with spaces to make it clear: ${parts.join(' - ')}`, `écris-la avec des espaces pour plus de clarté : ${parts.join(' - ')}`))
          const pos = e.pos
          let tree: Expr = { k: 'name', name: parts[0], pos }
          for (const p of parts.slice(1)) tree = { k: 'binary', op: '-', l: tree, r: { k: 'name', name: p, pos }, pos }
          for (const key of Object.keys(e)) delete (e as any)[key]
          Object.assign(e, tree)
          this.expr(e, s)
          return
        }
        this.unknownName(e.name, e.pos, s)
        return
      }
      case 'list': e.items.forEach((x) => this.expr(x, s)); return
      case 'object': e.props.forEach((x) => this.expr(x.value, s)); return
      case 'member': {
        this.expr(e.object, s)
        // post.title, about.name: a field of a content file, checked by the build against the files
        const of = e.object.k === 'name' ? s.find(e.object.name)?.content : undefined
        if (of?.entry) this.info.reads.push({ source: of.source, field: e.prop, pos: e.pos })
        return
      }
      case 'index': this.expr(e.object, s); this.expr(e.index, s); return
      case 'call':
        this.expr(e.fn, s)
        // posts.filter(p -> p.draft): what the function receives is an entry of those files
        this.entry = e.fn.k === 'member' ? this.entriesOf(e.fn.object, s) : undefined
        e.args.forEach((x) => this.expr(x, s))
        this.entry = undefined
        if (e.fn.k === 'name' && e.fn.binding?.kind === 'component') {
          this.err(e.pos, msg(`${q(e.fn.name)} is a component: it is used at the start of a line, not like a function.`, `${q(e.fn.name)} est un composant : il s'utilise en début de ligne, pas comme une fonction.`),
            `${e.fn.name} ${e.args.length ? '…' : ''}`.trim())
        }
        // a function of the file called with too few or too many values: said here, not as NaN in the page
        if (e.fn.k === 'name' && e.fn.binding?.kind === 'function' && e.fn.binding.params && !e.args.some((a) => a.k === 'spread')) {
          const { names, required } = e.fn.binding.params
          const n = e.args.length
          const fn = e.fn.name
          const many = (k: number) => `${k} value${k > 1 ? 's' : ''}`
          const plusieurs = (k: number) => `${k} valeur${k > 1 ? 's' : ''}`
          if (n < required) {
            this.err({ ...e.fn.pos, length: fn.length }, msg(`${q(fn)} needs ${many(required)} (${names.slice(0, required).join(', ')}), I see ${n}.`, `${q(fn)} demande ${plusieurs(required)} (${names.slice(0, required).join(', ')}), j'en vois ${n}.`),
              `${fn}(${names.join(', ')})`)
          } else if (n > names.length) {
            this.err({ ...e.fn.pos, length: fn.length }, msg(`${q(fn)} takes at most ${names.length ? many(names.length) : 'no value'}${names.length ? ` (${names.join(', ')})` : ''}, I see ${n}.`, `${q(fn)} prend au plus ${names.length ? plusieurs(names.length) : 'aucune valeur'}${names.length ? ` (${names.join(', ')})` : ''}, j'en vois ${n}.`),
              `${fn}(${names.join(', ')})`)
          }
        }
        return
      case 'binary': this.expr(e.l, s); this.expr(e.r, s); return
      case 'unary': case 'spread': case 'await': this.expr(e.e, s); return
      case 'lambda': {
        const l = new Scope('lambda', s)
        const entry = this.entry
        this.entry = undefined
        e.params.forEach((n, k) => {
          const p = this.declare(l, n, 'param', e.pos)
          if (entry && k === 0) p.content = { source: entry, entry: true }
        })
        if (Array.isArray(e.body)) {
          const a = new Scope('action', l)
          this.hoist(e.body, a)
          this.statements(e.body, a)
        } else this.expr(e.body, l)
        return
      }
      case 'if': this.expr(e.cond, s); this.expr(e.then, s); this.expr(e.else, s); return
      case 'range': this.expr(e.from, s); this.expr(e.to, s); return
    }
  }

  // ------------------------------------------------------------------
  // UI lines
  private command(c: Command, s: Scope, parent: string | undefined) {
    const head = c.head
    if (/^\p{Lu}/u.test(head)) {
      const b = s.find(head)
      if (!b) {
        const sug = closest(head, this.components)
        this.err({ ...c.pos, length: head.length }, msg(`the component ${q(head)} does not exist.`, `le composant ${q(head)} n'existe pas.`),
          sug ? msg(`did you mean ${q(sug)}?`, `tu voulais dire ${q(sug)} ?`)
            : msg(`create it with “component ${head} …” or import it: import ${head} from "./${head.toLowerCase()}.kaury"`, `crée-le avec « composant ${head} … » ou importe-le : importe ${head} de "./${head.toLowerCase()}.kaury"`))
      } else b.used = true
      const positional: Expr[] = []
      for (const it of c.items) for (const a of it.atoms) {
        this.expr(a, s)
        positional.push(a)
      }
      c.meaning = { kind: 'component', positional, options: [] }
      // what a block shows: its heading, its texts
      for (const x of positional) this.untranslated(x)
      if (['Hero', 'Cta', 'Contact', 'Pricing'].includes(head)) this.usesButtons = true
      // a ready-made block is the section named after its heading (Pricing plans, "Prices" → #prices); Contact is #contact
      if (this.page) {
        for (const x of positional) {
          const heading = staticText(x)
          if (heading && slugOf(heading)) this.info.anchors.push({ page: this.page, id: slugOf(heading) })
        }
        if (head === 'Contact') this.info.anchors.push({ page: this.page, id: 'contact' })
        if (head === 'Faq') this.info.anchors.push({ page: this.page, id: 'questions' })
      }
      const sig = this.componentParams.get(head)
      if (sig && (positional.length < sig.required || positional.length > sig.names.length)) {
        const usage = `${head} ${sig.names.join(', ')}`
        this.err({ ...c.pos, length: head.length },
          positional.length < sig.required
            ? msg(`${q(head)} needs ${sig.required} value${sig.required > 1 ? 's' : ''} (${sig.names.slice(0, sig.required).join(', ')}), I see ${positional.length}.`, `${q(head)} demande ${sig.required} valeur${sig.required > 1 ? 's' : ''} (${sig.names.slice(0, sig.required).join(', ')}), j'en vois ${positional.length}.`)
            : msg(`${q(head)} takes at most ${sig.names.length} value${sig.names.length > 1 ? 's' : ''} (${sig.names.join(', ')}), I see ${positional.length}.`, `${q(head)} prend au plus ${sig.names.length} valeur${sig.names.length > 1 ? 's' : ''} (${sig.names.join(', ')}), j'en vois ${positional.length}.`),
          usage)
      }
      this.children(c, s)
      return
    }

    if (head === 'colors') {
      // « colors pink #FF4F8B, …»: names, not values to look up (read by readSiteColors)
      c.meaning = { kind: 'setting', positional: [], options: [] }
      return
    }
    const isMotion = !!MOTIONS[head]
    const kind = ELEMENTS[head] ? 'element' : EVENTS.has(head) ? 'event' : isMotion ? 'motion'
      : head === 'style' ? 'style' : ['mobile', 'tablet', 'desktop'].includes(head) ? 'screen' : 'setting'
    if (ELEMENTS[head]?.kind === 'immersion' || ['scene', 'light', 'camera'].includes(head) || isMotion) this.info.immersion = true

    const positional: Expr[] = []
    const options: ResolvedOption[] = []
    let objectName: string | undefined
    let inHover = false
    const optionHead = kind === 'screen' || kind === 'style' ? (parent ?? 'box') : head

    for (const it of c.items) {
      const a = it.atoms
      const a0 = a[0]
      if (!a0) continue
      const word = a0.k === 'name' ? a0.name : undefined
      // motions: free words (smooth, x, on scroll…)
      if (isMotion && word && MOTION_WORDS.has(canonValue(word)) && !s.find(word)) {
        let name = canonValue(word)
        let values = a.slice(1)
        if (name === 'on' && a[1]?.k === 'name' && canonValue(a[1].name) === 'scroll') {
          name = 'on-scroll'
          values = a.slice(2)
        }
        values.forEach((x) => this.expr(x, s))
        options.push({ name, values, pos: it.pos })
        continue
      }
      // the first word of a field is the state it fills, even when an option has that name (select size "S", "M", "L")
      // (“type” and “label” stay the options of the field: field type email)
      if (word && STATE_HEADS.includes(head) && it === c.items[0] && a.length > 1 && styleOption(word) && !elementOption(optionHead, word)) {
        let b = s.find(word)
        if (!b) {
          const host = s.host()
          b = this.declare(host, word, host.isView() ? 'state' : 'variable', it.pos)
        }
        b.mutated = true
        b.used = true
        if (a0.k === 'name') a0.binding = b
        positional.push(a0)
        a.slice(1).forEach((x) => {
          this.expr(x, s)
          positional.push(x)
        })
        continue
      }
      let opt = word ? (elementOption(optionHead, word) ?? (kind !== 'motion' && kind !== 'event' && kind !== 'setting' ? styleOption(word) : undefined)) : undefined
      // a named style (style promise …): adds its class, keeps the default look
      const sectionName = ALWAYS_NAMED.includes(head) && it === c.items[0]
      // (on a box, which shows no value, the style wins over a variable of the same name: for step in … / row step)
      const boxed = ELEMENTS[head]?.kind === 'container'
      if (word && a.length === 1 && this.namedStyles.has(word) && (!s.find(word) || boxed) && kind !== 'setting') {
        this.usedStyles.add(word)
        options.push({ name: 'look', values: [{ k: 'text', parts: ['ks-' + word], pos: it.pos }], pos: it.pos })
        // a section, a nav, a header named like one of your styles: it takes the style and keeps the name
        if (!sectionName) continue
      }
      // a named style under a condition: card-wide (i == 0)
      if (word && a.length === 2 && this.namedStyles.has(word) && !s.find(word) && kind === 'element' && !sectionName && head !== 'object' && head !== 'character' && !['text', 'number', 'color'].includes(a[1].k)) {
        this.usedStyles.add(word)
        this.expr(a[1], s)
        options.push({ name: 'look-if', values: [{ k: 'text', parts: ['ks-' + word], pos: it.pos }, a[1]], pos: it.pos })
        continue
      }
      // a named animation (animation marquee …): plays on the element
      if (word && a.length === 1 && this.namedAnimations.has(word) && !s.find(word) && kind !== 'setting' && !sectionName) {
        options.push({ name: 'look', values: [{ k: 'text', parts: ['ka-' + word], pos: it.pos }], pos: it.pos })
        continue
      }
      // a declared variable wins over an option of the same name:
      // - as the first item of an element that shows content (text size → shows “size”)
      // - or alone where the option would need a value
      const firstContent = it === c.items[0] && CONTENT_HEADS.has(head)
      if (opt && word && a.length === 1 && s.find(word) && (firstContent || (optionSpec(optionHead, opt)?.args ?? '').replace(/\?/g, '').length > 0)) opt = undefined
      if (opt) {
        const values = a.slice(1)
        values.forEach((x) => this.checkValue(x, s))
        if (!['hover', 'hidden', 'selected', 'current', 'open'].includes(opt) && word && !elementOption(optionHead, word) && values.some((v) => this.computed(v))) {
          if (kind === 'screen' || inHover) {
            this.warn(it.pos, msg(`${q(opt)} is given a computed value here: on ${kind === 'screen' ? 'a screen size' : 'hover'} only fixed values apply, so it is ignored.`, `${q(opt)} reçoit ici une valeur calculée : ${kind === 'screen' ? 'pour une taille d\'écran' : 'au survol'} seules les valeurs fixes s'appliquent, elle est donc ignorée.`),
              msg('write a fixed value, or put the computed one on the element line.', 'écris une valeur fixe, ou mets la valeur calculée sur la ligne de l\'élément.'))
          } else if (!DYNAMIC_PROP[opt]) {
            this.warn(it.pos, msg(`${q(opt)} cannot follow a computed value: it is ignored.`, `${q(opt)} ne peut pas suivre une valeur calculée : elle est ignorée.`),
              msg(`write a fixed value. Options that follow a value: ${Object.keys(DYNAMIC_PROP).filter((k) => k !== 'tint').join(', ')}.`, `écris une valeur fixe. Options qui suivent une valeur : ${Object.keys(DYNAMIC_PROP).filter((k) => k !== 'tint').join(', ')}.`))
          }
        }
        if (opt === 'hover') inHover = true
        options.push({ name: inHover && opt !== 'hover' ? `hover:${opt}` : opt, values, pos: it.pos })
        if (opt === 'hover' && values.length) {
          // “hover lift 4” → hover:lift 4
          const v0 = values[0]
          const sub = v0.k === 'name' ? styleOption(v0.name) : undefined
          if (!sub) this.err(it.pos, msg('“hover” must be followed by a style.', '« survol » doit être suivi d\'un style.'), 'hover lift 4   /   hover background pink')
          else {
            options.pop()
            options.push({ name: `hover:${sub}`, values: values.slice(1), pos: it.pos })
          }
        }
        this.checkOption(head, opt, values, it.pos)
        continue
      }
      // “3 columns”
      if (a0.k === 'number' && a[1]?.k === 'name') {
        const o2 = elementOption(optionHead, a[1].name) ?? styleOption(a[1].name)
        if (o2) {
          options.push({ name: inHover ? `hover:${o2}` : o2, values: [a0, ...a.slice(2)], pos: it.pos })
          continue
        }
        // “3 colums”: a number then a word that is nothing known → a misspelled option
        const w2 = a[1].name
        if (a.length === 2 && (kind === 'element' || kind === 'style' || kind === 'screen') && !s.find(w2) && !kauryGlobal(w2) && !JS_GLOBALS.has(w2)) {
          this.unknownOption(w2, a[1].pos, c, optionHead, s, false)
          continue
        }
      }
      // a color alone: “pink”, “#FF4F8B”
      if (kind !== 'setting' && kind !== 'motion' && a.length === 1 && (a0.k === 'color' || (word && !s.find(word) && (this.info.colors[word] || knownColor(word))))) {
        options.push({ name: inHover ? 'hover:tint' : 'tint', values: [a0], pos: it.pos })
        continue
      }
      // a section or a scene never shows content: its first word is always its name,
      // even when a variable or a global has the same name (section examples, section performance)
      if (word && ALWAYS_NAMED.includes(head) && it === c.items[0] && a.length === 1 && !objectName) {
        objectName = word
        continue
      }
      // section / object name (not a variable)
      if (word && !s.find(word) && !kauryGlobal(word) && !JS_GLOBALS.has(word)) {
        if (NAMED_CONTAINERS.includes(head) && !positional.length && a.length === 1 && !objectName) {
          // A word alone on a box is its name (its id). Two cases where a style was meant, and nothing would show:
          const at = { ...it.pos, length: word.length }
          const element = canon(word)
          const near = closest(word, this.namedStyles)
          if (element && ELEMENTS[element] && element !== head && this.styleRules.has(element)) {
            // “style card” is the look of every card: written on a column, the word styles nothing
            this.warn(at, msg(`the style ${q(word)} styles every ${q(word)}: written on ${q(c.rawHead)}, it changes nothing.`, `le style ${q(word)} habille chaque ${q(word)} : écrit sur ${q(c.rawHead)}, il ne change rien.`),
              msg(`give the style a name of its own (style panel, then ${c.rawHead} panel), or write the element itself: ${word}`, `donne au style un nom à lui (style panel, puis ${c.rawHead} panel), ou écris l'élément lui-même : ${word}`))
          } else if (near && near !== word) {
            // a named style, misspelled
            this.warn(at, msg(`${q(word)} becomes the name of this ${c.rawHead} (its id): no style has that name.`, `${q(word)} devient le nom de ce ${c.rawHead} (son id) : aucun style ne porte ce nom.`),
              msg(`did you mean the style ${q(near)}?`, `tu voulais dire le style ${q(near)} ?`))
          }
          objectName = word
          continue
        }
        if ((head === 'object' || head === 'character') && a.length >= 2 && !objectName) {
          objectName = word
          a.slice(1).forEach((x) => {
            this.expr(x, s)
            positional.push(x)
          })
          continue
        }
        if (head === 'links') {
          positional.push(...a)
          continue
        }
        if (STATE_HEADS.includes(head) && !positional.length && it === c.items[0]) {
          // the first name of a field is the state it fills: created if it does not exist
          // (further on the line, an unknown word is a mistake: input type "email", placeholder "…")
          const host = s.host()
          const b = this.declare(host, word, host.isView() ? 'state' : 'variable', it.pos)
          b.mutated = true
          b.used = true
          if (a0.k === 'name') a0.binding = b
          positional.push(a0)
          a.slice(1).forEach((x) => {
            this.expr(x, s)
            positional.push(x)
          })
          continue
        }
        if (kind === 'motion' || kind === 'event' || kind === 'setting') {
          // free words: light studio, camera fly, transition fade, jump can
          positional.push(...a)
          for (const x of a.slice(1)) this.expr(x, s)
          continue
        }
        if (kind === 'style' || kind === 'screen' || ELEMENTS[head]) {
          if (kind === 'element' && a.length === 2 && !optionHabit(word) && !['text', 'number', 'color'].includes(a[1].k)) {
            // “checked (answered)”: a state given with its condition, and that state does not exist
            this.expr(a[1], s)
            this.err({ ...it.pos, length: word.length }, msg(`${q(word)} is not a state of ${q(c.rawHead)}.`, `${q(word)} n'est pas un état de ${q(c.rawHead)}.`),
              msg('the states given by a condition are selected, current and open: selected (…). For another look, name a style of your own and write it the same way: style right, then right (…)', 'les états donnés par une condition sont selected, current et open : selected (…). Pour un autre aspect, nomme un style à toi et écris-le de la même façon : style juste, puis juste (…)'))
            continue
          }
          this.unknownOption(word, it.pos, c, optionHead, s, true)
          continue
        }
      }
      for (const [j, x] of a.entries()) {
        // a word glued to the content, that is no name of the program
        if (j > 0 && x.k === 'name' && kind === 'element' && !s.find(x.name) && !kauryGlobal(x.name) && !JS_GLOBALS.has(x.name)) {
          const opt = elementOption(optionHead, x.name) ?? styleOption(x.name)
          if (opt) {
            // title "Hello" size 80: an option, its comma forgotten
            this.err({ ...x.pos, length: x.name.length }, msg(`a comma is missing before ${q(x.name)}.`, `il manque une virgule avant ${q(x.name)}.`),
              msg(`options are separated by commas: ${c.rawHead} ${CONTENT_HEADS.has(head) ? '"…"' : '…'}, ${optionSpec(optionHead, opt)?.example ?? x.name}`, `les options se séparent par des virgules : ${c.rawHead} ${CONTENT_HEADS.has(head) ? '"…"' : '…'}, ${optionSpec(optionHead, opt)?.example ?? x.name}`))
            break
          }
          if (a[0].k === 'text') {
            // button "Add" onClick -> …, title "Hello" sparkly: neither an option nor a name
            this.unknownOption(x.name, x.pos, c, optionHead, s, true)
            break
          }
        }
        this.expr(x, s)
        positional.push(x)
      }
    }
    c.meaning = { kind, positional, options, objectName }
    if (this.info.languages.length) {
      // what the page shows: its texts, the description of an image, the hint of a field, a heading of a block
      // (a logo is a name: it stays as it is in every language)
      if ((kind === 'element' && head !== 'logo' && (CONTENT_HEADS.has(head) || ['dialog', 'field', 'textarea', 'checkbox'].includes(head))) || head === 'seo') {
        for (const x of positional) this.untranslated(x)
      }
      if (head === 'links') {
        // the words of a menu are shown: “links Accueil, Carte” is translated like texts (“Accueil” “Home”)
        for (const x of positional) {
          if (x.k === 'text') this.untranslated(x)
          else if (x.k === 'name' && (!x.binding || x.binding.kind === 'component')) {
            const label = x.name.replace(/-/g, ' ')
            this.said.add(label)
            const byLang = this.info.dictionary.get(label)
            for (const t of byLang?.values() ?? []) t.used = true
            this.untranslated({ k: 'text', parts: [label], pos: x.pos })
          }
        }
      }
      for (const o of options) if (['label', 'alt'].includes(o.name)) this.untranslated(o.values[0])
    }
    if (head === 'button') this.checkButtonText(c, options)
    if (this.page && kind === 'element') {
      if (objectName && head !== 'object' && head !== 'character') this.info.anchors.push({ page: this.page, id: objectName })
      const id = staticText(options.find((o) => o.name === 'id')?.values[0])
      if (id) this.info.anchors.push({ page: this.page, id })
    }
    this.noteFiles(c)
    this.checkShownFunction(c, positional)
    this.checkContrast(options, c.pos)
    this.checkCommand(c, parent)
    if (objectName && (head === 'object' || head === 'character')) {
      const b = this.declare(s.host(), objectName, 'object', c.pos)
      b.used = true
    }
    // inside a page, each box hands the background it is sure of to what it contains
    const inPage = this.grounds.length > 0
    let carried = false
    if (inPage && kind === 'element') {
      const styled = this.styled(head, options)
      // a background written on a style line under the box (wherever that line is): what it holds is not on the page any more
      const below = c.children.some((x) => x.k === 'command' && x.head === 'style' && x.items.some((it) => it.atoms[0]?.k === 'name' && styleOption(it.atoms[0].name) === 'background'))
      const own = below ? undefined : this.ground(head, styled, options)
      this.checkReadable(c, head, styled, options, own)
      this.grounds.push(own === 'same' ? this.grounds[this.grounds.length - 1] : own)
      carried = true
    } else if (inPage && this.grounds.length === 1 && kind === 'setting' && head === 'style') {
      // the style of the page itself: its background replaces the one of the site
      const own = this.ground('box', options, [])
      if (own !== 'same') this.grounds[0] = own
    }
    this.children(c, s)
    if (carried) this.grounds.pop()
  }

  /** The lines of a named style that always apply (not its states, its parts or its screens), as options. */
  private always(name: string): ResolvedOption[] {
    return (this.styleRules.get(name) ?? []).filter((r) => r.head === 'style' && !r.state && !r.part).flatMap((r) => r.meaning?.options ?? [])
  }

  /** The options that style an element for sure: those of the styles named after its kind and on its line, then its own. */
  private styled(head: string, options: ResolvedOption[]): ResolvedOption[] {
    const named = options.filter((o) => o.name === 'look').map((o) => String(literal(o.values[0], {}) ?? '')).filter((n) => n.startsWith('ks-'))
    return [...this.always(head), ...named.flatMap((n) => this.always(n.slice(3))), ...options]
  }

  /** A color written as it is, as a code of six (or three) digits; else nothing. */
  private code(e: Expr | undefined): string | undefined {
    const v = e ? literal(e, this.info.colors) : undefined
    const h = typeof v === 'string' ? hexOf(v, this.info.colors) : undefined
    return h && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(h) ? h : undefined
  }

  /**
   * The background an element gives to what it contains: a color code when it is sure, “same” when it has none of
   * its own (the one behind it shows through), nothing when it cannot be known (a picture, a gradient, a condition).
   */
  private ground(head: string, styled: ResolvedOption[], options: ResolvedOption[]): string | undefined {
    let own: string | undefined = 'same'
    let written = false
    for (const o of styled) {
      if (o.name === 'background' || (o.name === 'tint' && !READ_HEADS.has(head) && head !== 'icon' && head !== 'links')) {
        const v = o.values[0] ? literal(o.values[0], this.info.colors) : undefined
        own = v === 'transparent' ? 'same' : this.code(o.values[0])
        written = true
      } else if (['gradient', 'mesh', 'glass', 'class'].includes(o.name)) {
        own = undefined
        written = true
      }
    }
    // a style under a condition may bring a background: what is inside is then read on one or on the other
    const maybe = options.filter((o) => o.name === 'look-if').map((o) => String(literal(o.values[0], {}) ?? '').slice(3))
    if (maybe.some((n) => this.ground('box', this.always(n), []) !== 'same')) return undefined
    if (own !== 'same' || written) return own
    // what has a background of its own without saying it
    if (head === 'button') return styled.some((o) => o.name === 'outline' || o.name === 'ghost') ? 'same' : undefined
    if (['card', 'scene', 'details', 'field', 'textarea', 'select', 'code', 'markdown', 'embed', 'video', 'image'].includes(head)) return undefined
    return 'same'
  }

  /**
   * A text given a color of its own is read on the background of what contains it: said when it cannot be read there
   * (4.5 for a small text, 3 from 24 pixels, or 19 in bold), with a shade next to it that can.
   */
  private checkReadable(c: Command, head: string, styled: ResolvedOption[], options: ResolvedOption[], own: string | undefined) {
    if (!READ_HEADS.has(head) && head !== 'button') return
    // what is hidden from screen readers is decoration: nobody has to read it
    if (options.some((o) => o.name === 'attr' && literal(o.values[0], {}) === 'aria-hidden' && String(literal(o.values[1], {})) === 'true')) return
    const last = (name: string) => [...styled].reverse().find((o) => o.name === name || (name === 'color' && o.name === 'tint' && READ_HEADS.has(head)))
    const color = last('color')
    const fg = this.code(color?.values[0])
    // a background and a color on the same line are already compared (checkContrast)
    if (!fg || !color || (options.includes(color) && options.some((o) => o.name === 'background'))) return
    const bg = own === 'same' ? this.grounds[this.grounds.length - 1] : own
    if (!bg) return
    const number = (name: string) => {
      const e = last(name)?.values[0]
      return e?.k === 'number' && !e.unit ? e.v : undefined
    }
    const opacity = Math.max(0, Math.min(1, number('opacity') ?? 1))
    const size = number('size') ?? (head === 'title' || head === 'subtitle' ? 32 : 16)
    const bold = styled.some((o) => o.name === 'bold') || (number('weight') ?? 400) >= 700
    const need = size >= 24 || (size >= 19 && bold) ? 3 : 4.5
    const rgb = (h: string) => (h.length === 4 ? h.slice(1).split('').map((x) => x + x) : h.slice(1).match(/../g)!).map((x) => parseInt(x, 16))
    const hex = (v: number[]) => '#' + v.map((x) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0')).join('').toUpperCase()
    const back = rgb(bg)
    const seen = (h: string) => hex(rgb(h).map((x, i) => x * opacity + back[i] * (1 - opacity)))
    const ratio = contrast(seen(fg), bg)
    if (ratio >= need) return
    // the closest shade of the same color that can be read here
    const from = rgb(fg)
    let shade: string | undefined
    for (let k = 1; k <= 70 && !shade; k++) {
      const darker = hex(from.map((x) => x * (1 - k / 100)))
      const lighter = hex(from.map((x) => x + (255 - x) * (k / 100)))
      shade = contrast(seen(darker), bg) >= need ? darker : contrast(seen(lighter), bg) >= need ? lighter : undefined
    }
    const faint = opacity < 1 ? msg(` at opacity ${opacity}`, ` à l'opacité ${opacity}`) : ''
    const what = need === 3 ? msg('3 is the minimum for a big text', '3 est le minimum pour un grand texte') : msg('4.5 is the minimum for a text this small', '4,5 est le minimum pour un texte de cette taille')
    const fix = opacity < 1 && contrast(fg, bg) >= need
      ? msg('raise its opacity until it can be read, or show another way that it is not the chosen one (a lighter weight, a line under the one that is).', 'augmente son opacité jusqu’à ce qu’il se lise, ou montre autrement qu’il n’est pas choisi (une graisse plus légère, un trait sous celui qui l’est).')
      : shade
        ? msg(`a shade next to it can be read here: color ${shade}` + (need === 4.5 ? ' (or a text of 24 or more: 3 is then enough)' : size >= 100 ? ' (if it is only decoration, say so: attr "aria-hidden" "true")' : ''), `une teinte toute proche se lit ici : color ${shade}` + (need === 4.5 ? ' (ou un texte de 24 ou plus : 3 suffit alors)' : size >= 100 ? ' (si ce n’est qu’un décor, dis-le : attr "aria-hidden" "true")' : ''))
        : msg('choose a darker or a lighter color for it, or leave “color” out: the color of the text around can be read.', 'choisis pour lui une couleur plus foncée ou plus claire, ou enlève « color » : la couleur du texte autour se lit.')
    this.warn({ ...c.pos, length: c.rawHead.length },
      msg(`this text is hard to read on the background of what contains it (${fg.toUpperCase()}${faint} on ${bg.toUpperCase()}: contrast ${ratio.toFixed(1)}, ${what}).`, `ce texte se lit mal sur le fond de ce qui le contient (${fg.toUpperCase()}${faint} sur ${bg.toUpperCase()} : contraste ${ratio.toFixed(1)}, ${what}).`),
      fix)
  }

  /** The color of the buttons: the one named “accent”, else the first color of the site (its name and its code). */
  private accent(): [string, string] | undefined {
    const name = this.info.colors.accent ? 'accent' : Object.keys(this.info.colors)[0]
    const hex = name ? this.info.colors[name] : undefined
    return name && hex && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex) ? [name, hex] : undefined
  }

  /**
   * A button keeps the background of the buttons unless it is given one. A text color written for it (on its line or
   * in its style) is then read on that background: said when it cannot be read there.
   */
  private checkButtonText(c: Command, options: ResolvedOption[]) {
    const base = (rules: Command[] = []) => rules.filter((r) => r.head === 'style' && !r.state && !r.part).flatMap((r) => r.meaning?.options ?? [])
    const styles = options.filter((o) => o.name === 'look').map((o) => String(literal(o.values[0], {}) ?? '')).filter((n) => n.startsWith('ks-'))
    const all = [...base(this.styleRules.get('button')), ...styles.flatMap((n) => base(this.styleRules.get(n.slice(3)))), ...options]
    if (all.some((o) => ['background', 'tint', 'gradient', 'glass', 'mesh', 'outline', 'ghost', 'class'].includes(o.name))) return
    // this button keeps the background of the buttons: that color matters for the site
    this.usesButtons = true
    const accent = this.accent()
    if (!accent) return
    const color = [...all].reverse().find((o) => o.name === 'color')
    const value = color?.values[0] ? literal(color.values[0], this.info.colors) : undefined
    const hex = typeof value === 'string' ? hexOf(value, this.info.colors) : undefined
    if (!hex || !/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex)) return
    const ratio = contrast(accent[1], hex)
    if (ratio >= 4.5) return
    this.warn({ ...c.pos, length: c.rawHead.length },
      msg(`this button keeps the background of the buttons (${accent[0]} ${accent[1]}): its text color is hard to read on it (contrast ${ratio.toFixed(1)}, 4.5 is the minimum).`, `ce bouton garde le fond des boutons (${accent[0]} ${accent[1]}) : la couleur de son texte s'y lit mal (contraste ${ratio.toFixed(1)}, le minimum est 4,5).`),
      msg('give it a background of its own (background transparent, in its style or on its line), or write “outline” or “ghost” on the button', 'donne-lui un fond à lui (background transparent, dans son style ou sur sa ligne), ou écris « outline » ou « ghost » sur le bouton'))
  }

  /** The color of the buttons must carry a text that can be read: white or near-black, whichever is best. */
  private checkAccent() {
    const accent = this.accent()
    const pos = accent && this.colorPos.get(accent[0])
    if (!accent || !pos || !this.usesButtons) return
    const best = (hex: string) => Math.max(contrast(hex, '#ffffff'), contrast(hex, '#16151a'))
    const ratio = best(accent[1])
    if (ratio >= 4.5) return
    // the closest shade that works: a little darker (for white text) or a little lighter (for dark text)
    const h = accent[1].replace('#', '')
    const rgb = (h.length === 3 ? h.split('').map((x) => x + x) : h.match(/../g)!).map((x) => parseInt(x, 16))
    const hex = (v: number[]) => '#' + v.map((x) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0')).join('').toUpperCase()
    let shade: string | undefined
    for (let k = 1; k <= 60 && !shade; k++) {
      const darker = hex(rgb.map((x) => x * (1 - k / 100)))
      const lighter = hex(rgb.map((x) => x + (255 - x) * (k / 100)))
      shade = best(darker) >= 4.5 ? darker : best(lighter) >= 4.5 ? lighter : undefined
    }
    this.warn(pos, msg(`${q(accent[0])} (${accent[1]}) is the color of the buttons, and no text is easy to read on it (contrast ${ratio.toFixed(1)}, 4.5 is the minimum).`, `${q(accent[0])} (${accent[1]}) est la couleur des boutons, et aucun texte ne s'y lit bien (contraste ${ratio.toFixed(1)}, le minimum est 4,5).`),
      shade ? msg(`a shade next to it works: colors ${accent[0]} ${shade}`, `une teinte toute proche convient : colors ${accent[0]} ${shade}`) : msg('choose a darker or a lighter color for it.', 'choisis pour elle une couleur plus foncée ou plus claire.'))
  }

  /** The content files a list of entries comes from: posts, posts.sort(…).reverse(), a “let” made from them. */
  private entriesOf(e: Expr, s: Scope): string | undefined {
    if (e.k === 'name') {
      const c = s.find(e.name)?.content
      return c && !c.entry ? c.source : undefined
    }
    if (e.k === 'call' && e.fn.k === 'member' && ['sort', 'reverse', 'filter', 'take', 'unique', 'shuffle'].includes(e.fn.prop)) return this.entriesOf(e.fn.object, s)
    return undefined
  }

  /** Set while the values given to a method of such a list are read: its function receives an entry. */
  private entry: string | undefined

  /**
   * In a page, a style or a screen line belongs to the element it is written under. Directly in a loop or a
   * condition it has no element: most often it was meant for the element above it, one step to the right.
   */
  private looseStyle(body: Stmt[], s: Scope, where: 'if' | 'for') {
    // (in what is shown only: the blocks of a page or of a component, not those of a function or of an action)
    let v: Scope | undefined = s
    while (v && v.kind === 'block') v = v.parent
    if (!v?.isView()) return
    for (const x of body) {
      if (x.k !== 'command' || !['style', 'mobile', 'tablet', 'desktop'].includes(x.head)) continue
      // “mobile” with content below is content shown on that screen only, not a style
      if (x.children.some((e) => e.k !== 'command' || e.head !== 'style')) continue
      this.err(x.pos, where === 'if'
        ? msg('this line styles nothing: it is in an “if”, under no element.', 'cette ligne ne change aucun aspect : elle est dans un « si », sous aucun élément.')
        : msg('this line styles nothing: it is in a “for”, under no element.', 'cette ligne ne change aucun aspect : elle est dans un « pour », sous aucun élément.'),
        msg('indent it under the element it is for (two more spaces), or write it on the line of that element.', 'indente-la sous son élément (deux espaces de plus), ou écris-la sur la ligne de cet élément.'))
    }
  }

  /**
   * A word on an element line that is neither one of its options nor a name of the program. The answer, in order:
   * the Kaury form of a habit (font-size, onClick), an element written as an option, an option or a name that
   * looks like it, then the options that exist.
   */
  private unknownOption(word: string, pos: Pos, c: Command, optionHead: string, s: Scope, names: boolean) {
    const at = { ...pos, length: word.length }
    const habit = optionHabit(word)
    const element = canon(word)
    if (!habit && element && ELEMENTS[element]) {
      this.err(at, msg(`${q(word)} is an element, not an option of ${q(c.rawHead)}.`, `${q(word)} est un élément, pas une option de ${q(c.rawHead)}.`),
        msg(`write it on its own line, indented below: ${ELEMENTS[element].example}`, `écris-le sur sa propre ligne, indenté dessous : ${ELEMENTS[element].example}`))
      return
    }
    // a word alone under an element, read as its style: the line has no other head than the word itself
    const alone = c.head === 'style' && canon(c.rawHead) !== 'style' && c.rawHead === word
    // a line of a named style (or an option alone under its element): its first word is an option, not the name of what is styled
    const styleLine = c.head === 'style' && canon(c.rawHead) !== 'style'
    // in a style, the words to propose are those of a style, in the two languages
    const pool = styleLine ? styleWords() : allOptions(optionHead)
    const sug = closest(word, names ? [...pool, ...Object.keys(this.info.colors), ...this.namedStyles] : pool)
    const sugVar = names ? closest(word, s.all()) : undefined
    const some = styleLine ? ['background', 'color', 'font', 'size', 'weight', 'line-height', 'tracking', 'padding', 'margin', 'gap', 'width', 'radius', 'border', 'shadow'] : allOptions(optionHead).slice(0, 8)
    this.err(at, alone
      ? msg(`${q(word)} is neither an element, nor an option, nor one of your styles.`, `${q(word)} n'est ni un élément, ni une option, ni un de tes styles.`)
      : styleLine ? msg(`${q(word)} is neither an option nor one of your styles.`, `${q(word)} n'est ni une option, ni un de tes styles.`)
      : msg(`${q(word)} is neither an option of ${q(c.rawHead)} nor a known name.`, `${q(word)} n'est ni une option de ${q(c.rawHead)}, ni un nom connu.`),
      habit ?? (sug ? msg(`did you mean ${q(sug)}?`, `tu voulais dire ${q(sug)} ?`)
        : sugVar ? msg(`did you mean the variable ${q(sugVar)}?`, `tu voulais dire la variable ${q(sugVar)} ?`)
          : msg(`possible options: ${some.join(', ')}…`, `options possibles : ${some.join(', ')}…`)))
  }

  /** Files named on the line (the picture of an image, a background, a 3D model, a sound…): kept for the build, which checks they exist. */
  private noteFiles(c: Command) {
    const m = c.meaning!
    const note = (e?: Expr) => {
      const path = staticText(e)
      if (e && path && MEDIA_FILE.test(path) && !/^([a-z][a-z0-9+.-]*:|\/\/)/i.test(path)) this.info.files.push({ path, pos: e.pos })
    }
    if (['image', 'video', 'logo', 'object', 'character', 'sound', 'favicon'].includes(c.head)) note(m.positional[0])
    for (const o of m.options) {
      if (o.name === 'fallback' || o.name === 'background' || o.name === 'hover:background' || (o.name === 'image' && c.head === 'seo')) note(o.values[0])
    }
  }

  /** “text add 1, 2” would show the code of the function in the page: a function is called with parentheses. */
  private checkShownFunction(c: Command, positional: Expr[]) {
    const first = positional[0]
    if (!CONTENT_HEADS.has(c.head) || first?.k !== 'name' || first !== c.items[0]?.atoms[0]) return
    const b = first.binding
    if (!b || !(b.kind === 'function' || (b.kind === 'kaury' && b.name in KAURY_FUNCTIONS))) return
    const show = (e: Expr): string =>
      e.k === 'number' ? `${e.v}${e.unit ?? ''}` : e.k === 'name' ? e.name : e.k === 'bool' ? String(e.v)
        : e.k === 'text' && e.parts.every((m) => typeof m === 'string') ? JSON.stringify(e.parts.join('')) : '…'
    this.err({ ...first.pos, length: first.name.length },
      msg(`${q(first.name)} is a function: it is called with parentheses, or the page would show its code.`, `${q(first.name)} est une fonction : elle s'appelle avec des parenthèses, sinon la page afficherait son code.`),
      `${c.rawHead} ${first.name}(${positional.slice(1).map(show).join(', ')})`)
  }

  /** background and color written together and too close to be read: said at once. */
  private checkContrast(options: ResolvedOption[], pos: Pos) {
    const hex = (name: string) => {
      const o = options.find((x) => x.name === name)
      const v = o?.values[0] ? literal(o.values[0], this.info.colors) : undefined
      const h = typeof v === 'string' ? hexOf(v, this.info.colors) : undefined
      return h && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(h) ? h : undefined
    }
    const bg = hex('background')
    const fg = hex('color')
    if (!bg || !fg) return
    const ratio = contrast(bg, fg)
    if (ratio < 3) {
      this.warn(pos, msg(`this text is hard to read on its background (contrast ${ratio.toFixed(1)}, 4.5 is the usual minimum).`, `ce texte se lit mal sur son fond (contraste ${ratio.toFixed(1)}, le minimum habituel est 4,5).`),
        msg('choose a lighter or a darker color; without “color”, Kaury picks a readable one by itself.', 'choisis une couleur plus claire ou plus foncée ; sans « couleur », Kaury en choisit une lisible tout seul.'))
    }
  }

  /** Does this option value depend on the program (a variable, a calculation), or is it written as it is? */
  private computed(e: Expr): boolean {
    switch (e.k) {
      case 'number': case 'color': case 'bool': case 'none': return false
      case 'text': return e.parts.some((m) => typeof m !== 'string')
      case 'name': return !!e.binding && e.binding.kind !== 'kaury' && e.binding.kind !== 'js'
      case 'unary': return !(e.op === '-' && e.e.k === 'number')
      case 'binary': return !(e.op === '-' && e.l.k === 'name' && e.r.k === 'number' && !!this.info.colors[`${e.l.name}-${e.r.v}`])
      default: return true
    }
  }

  private checkValue(x: Expr, s: Scope) {
    // an option value can be a free word (shadow soft, align center) or a named color
    if (x.k === 'name' && !s.find(x.name) && !kauryGlobal(x.name) && !JS_GLOBALS.has(x.name)) return
    // a site color with a number in its name (beige-2), read as a subtraction by the lexer
    if (x.k === 'binary' && x.op === '-' && x.l.k === 'name' && x.r.k === 'number' && !s.find(x.l.name) && this.info.colors[`${x.l.name}-${x.r.v}`]) return
    this.expr(x, s)
  }

  private checkOption(head: string, opt: string, values: Expr[], pos: Pos) {
    const spec = optionSpec(head, opt)
    if (!spec || spec.args === '*' || spec.args === 'e?') return
    const required = spec.args.replace(/.\?/g, '').length
    const max = spec.args.replace(/\?/g, '').length
    if (values.length < required) {
      this.err(pos, msg(`${q(opt)} expects ${required === 1 ? 'a value' : `${required} values`}.`, `${q(opt)} attend ${required === 1 ? 'une valeur' : `${required} valeurs`}.`),
        CONTENT_HEADS.has(head)
          ? msg(`${q(opt)} is an option of ${q(head)}: the content comes first, then the options → ${head} "…", ${spec.example}`, `${q(opt)} est une option de ${q(head)} : le contenu d'abord, puis les options → ${head} "…", ${spec.example}`)
          : msg(`${spec.example}   (if ${q(opt)} is your variable, write (${opt}))`, `${spec.example}   (si c'est ta variable ${q(opt)}, écris (${opt}))`))
    } else if (values.length > max && max === 0) {
      // bold true, required yes
      this.err(pos, msg(`${q(opt)} is written alone, without a value.`, `${q(opt)} s'écrit seul, sans valeur.`),
        msg(`${spec.example}   (to make it depend on something, put the line under an “if”)`, `${spec.example}   (pour qu'il dépende de quelque chose, place la ligne sous un « si »)`))
    } else if (values.length > max && spec.args !== 'e' && values[max - 1]?.k === 'number' && values[max].k === 'name' && UNIT_WORDS.has(values[max].name)) {
      // size 20 px
      const n = values[max - 1] as Extract<Expr, { k: 'number' }>
      const unit = (values[max] as Extract<Expr, { k: 'name' }>).name
      this.err(pos, msg('the unit is glued to the number, without a space.', 'l\'unité se colle au nombre, sans espace.'),
        msg(`${opt} ${n.v}${unit}   (a number alone is in pixels: ${opt} ${n.v})`, `${opt} ${n.v}${unit}   (un nombre seul est en pixels : ${opt} ${n.v})`))
    } else if (values.length > max && spec.args !== 'e') {
      this.err(pos, msg(`${q(opt)} takes at most ${max === 1 ? 'one value' : `${max} values`}.`, `${q(opt)} prend au plus ${max === 1 ? 'une valeur' : `${max} valeurs`}.`),
        msg(`separate the options with commas: ${spec.example}`, `sépare les options par des virgules : ${spec.example}`))
    }
    // an option that takes colors: a word that is no color is a mistake (color FF0000, border 2 oragne)
    if (/^[nc?]*c[nc?]*$/.test(spec.args)) {
      for (const v of values) {
        if (v.k !== 'name' || v.binding || this.info.colors[v.name] || knownColor(v.name) || CSS_COLORS.has(v.name.toLowerCase()) || CSS_SIZES.has(v.name)) continue
        const hex = /^([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(v.name)
        const sug = closest(v.name, [...Object.keys(this.info.colors), ...Object.keys(COLORS)])
        this.err({ ...v.pos, length: v.name.length }, msg(`${q(v.name)} is not a color Kaury knows.`, `${q(v.name)} n'est pas une couleur que Kaury connaît.`),
          hex ? msg(`a color code starts with “#”: ${opt} #${v.name}`, `un code de couleur commence par « # » : ${opt} #${v.name}`)
            : sug ? msg(`did you mean ${q(sug)}?`, `tu voulais dire ${q(sug)} ?`)
              : msg(`write its code (${opt} #40E0D0), or name it once in the site: colors ${v.name} #40E0D0`, `écris son code (${opt} #40E0D0), ou nomme-la une fois dans le site : colors ${v.name} #40E0D0`))
      }
    }
    // an option that takes numbers: a word or a text without a number is a mistake (radius "big", size large)
    if (/^(n\??)+$/.test(spec.args)) {
      for (const v of values) {
        const word = v.k === 'name' && !v.binding ? v.name
          : v.k === 'text' && v.parts.length === 1 && typeof v.parts[0] === 'string' && !/\d/.test(v.parts[0]) ? v.parts[0] : undefined
        if (word === undefined || CSS_SIZES.has(word)) continue
        this.err({ ...v.pos, length: v.k === 'name' ? word.length : word.length + 2 }, msg(`${q(opt)} expects a number, not ${q(word)}.`, `${q(opt)} attend un nombre, pas ${q(word)}.`),
          msg(`${spec.example}   (a number, or a number with its unit: 50%, 2rem, 100vh)`, `${spec.example}   (un nombre, ou un nombre avec son unité : 50%, 2rem, 100vh)`))
      }
    }
    const v0 = values[0]
    // “douce” is “smooth” for a motion and “soft” for a shadow
    const said = v0?.k === 'name' ? (canonValue(v0.name) === 'smooth' && spec.words?.includes('soft') ? 'soft' : canonValue(v0.name)) : ''
    if (spec.words && v0?.k === 'name' && !spec.words.includes(said)) {
      const sug = closest(v0.name, spec.words)
      this.err(pos, msg(`${q(opt)} does not accept ${q(v0.name)}.`, `${q(opt)} n'accepte pas ${q(v0.name)}.`),
        sug ? msg(`did you mean “${opt} ${sug}”?`, `tu voulais dire « ${opt} ${sug} » ?`) : msg(`possible values: ${spec.words.join(', ')}`, `valeurs possibles : ${spec.words.join(', ')}`))
    }
  }

  private checkCommand(c: Command, parent: string | undefined) {
    const m = c.meaning!
    const n = m.positional.length
    const word = (e?: Expr) => (e?.k === 'name' ? canonValue(e.name) : undefined)
    switch (c.head) {
      case 'image':
      case 'video':
        if (!n) this.err(c.pos, msg(`${q(c.rawHead)} needs its file.`, `${q(c.rawHead)} a besoin de son fichier.`), `${c.rawHead} "photo.jpg"`)
        else if (c.head === 'image' && n === 1 && !m.options.some((o) => o.name === 'alt')) {
          this.warn(c.pos, msg('this image has no description (for people who cannot see it, and for Google).', 'cette image n\'a pas de description (pour les personnes qui ne la voient pas, et pour Google).'),
            msg('image "photo.jpg", "What it shows"   (write "" when it is only decoration)', 'image "photo.jpg", "Ce qu\'elle montre"   (écris "" quand elle n\'est que décorative)'))
        }
        break
      case 'lang':
      case 'url':
      case 'favicon':
      case 'font':
      case 'fonts':
        // a setting cut short: said here (the generator would have nothing to write)
        if (!n) {
          this.err(c.pos, msg(`${q(c.rawHead)} needs its value.`, `${q(c.rawHead)} a besoin de sa valeur.`),
            c.head === 'lang' ? `${c.rawHead} "en"` : c.head === 'url' ? `${c.rawHead} "https://example.com"` : c.head === 'favicon' ? `${c.rawHead} "icon.svg"` : `${c.rawHead} "Satoshi"`)
        }
        break
      case 'link':
        if (!n) this.err(c.pos, msg('“link” needs a text and an address.', '« lien » a besoin d\'un texte et d\'une adresse.'), 'link "Contact" "/contact"')
        break
      case 'object':
      case 'character': {
        if (!n) this.err(c.pos, msg(`${q(c.rawHead)} needs its file.`, `${q(c.rawHead)} a besoin de son fichier.`), `${c.rawHead} can "crush.glb"`)
        const src = m.positional[0]
        if (src?.k === 'text' && src.parts.length === 1 && typeof src.parts[0] === 'string') {
          const f = (src.parts[0] as string).toLowerCase()
          if (/\.(glb|gltf)(\?|$)/.test(f) && !m.options.some((o) => o.name === 'alt' || o.name === 'fallback')) {
            this.warn(c.pos, msg('this 3D object has no description and no fallback image: a device that cannot show 3D shows nothing.', 'cet objet 3D n\'a ni description ni image de repli : un appareil qui n\'affiche pas la 3D ne montre rien.'),
              msg(`${c.rawHead} can "crush.glb", alt "A can of soda", fallback "can.png"`, `${c.rawHead} canette "crush.glb", alt "Une canette", fallback "canette.png"`))
          }
          if (/\.(glb|gltf)(\?|$)/.test(f) || /^(sphere|cube|torus|knot|cone|cylinder|capsule|gem|pyramid|tore|noeud|cylindre|gemme|pyramide)$/.test(f)) this.info.threeD = true
          else if (/\.(json|lottie)(\?|$)/.test(f)) this.info.lottie = true
          else if (!/\.(png|jpe?g|webp|avif|gif|svg)(\?|$)/.test(f)) {
            this.err(src.pos, msg(`unknown file format for ${q(c.rawHead)}.`, `format de fichier non reconnu pour ${q(c.rawHead)}.`),
              msg('accepted: a shape (sphere, cube, torus, knot, cone, cylinder, capsule, gem, pyramid), .glb, .gltf (3D), .png, .jpg, .webp, .svg (2D), .json (Lottie).', 'acceptés : une forme (sphere, cube, tore, noeud, cone, cylindre, capsule, gemme, pyramide), .glb, .gltf (3D), .png, .jpg, .webp, .svg (2D), .json (Lottie).'))
          }
        } else if (src) this.info.threeD = true
        break
      }
      case 'light': {
        const w = word(m.positional[0])
        if (!w || !LIGHTS.includes(w)) {
          const sug = w ? closest(w, LIGHTS) : undefined
          this.err(c.pos, msg(`unknown light${w ? ` ${q(w)}` : ''}.`, `lumière inconnue${w ? ` ${q(w)}` : ''}.`),
            sug ? msg(`did you mean “light ${sug}”?`, `tu voulais dire « lumiere ${sug} » ?`) : msg(`moods: ${LIGHTS.join(', ')}`, `ambiances : ${LIGHTS.join(', ')}`))
        }
        break
      }
      case 'camera': {
        const words = m.positional.map((x) => (x.k === 'name' ? canon(x.name) ?? canonValue(x.name) : '')).join('-')
        if (!CAMERAS.includes(words)) this.err(c.pos, msg(`unknown camera ${q(words || '…')}.`, `caméra inconnue ${q(words || '…')}.`), msg(`modes: ${CAMERAS.join(', ').replace('follows-mouse', 'follows mouse')}`, `modes : ${CAMERAS.join(', ')}`))
        break
      }
      case 'transition': {
        const w = word(m.positional[0])
        if (!w || !TRANSITIONS.includes(w)) this.err(c.pos, msg(`unknown transition${w ? ` ${q(w)}` : ''}.`, `transition inconnue${w ? ` ${q(w)}` : ''}.`), `transitions: ${TRANSITIONS.join(', ')}`)
        break
      }
      case 'enters-from':
        if (!m.options.length && !m.positional.length) this.err(c.pos, msg('“enters from” expects a direction.', '« entre depuis » attend une direction.'), 'enters from left   (left, right, top, bottom, fade, zoom)')
        break
      case 'spin': {
        const v = m.positional[0]
        if (v && v.k === 'name' && !v.binding) this.err(v.pos, msg('“spin” expects a speed.', '« tourne » attend une vitesse.'), 'spin 20/s  /  spin on scroll')
        break
      }
    }
    if (m.kind === 'event' && !c.action) {
      this.err(c.pos, msg(`${q(c.head.replace('-', ' '))} must be followed by an action with “->”.`, `${q(c.rawHead)} doit être suivi d'une action avec « -> ».`), 'on click -> jump')
    }
    if ((m.kind === 'style' || m.kind === 'screen') && !parent && c.children.length === 0 && m.options.length === 0) {
      this.err(c.pos, msg(`empty ${q(c.rawHead)}.`, `${q(c.rawHead)} vide.`), 'style background cream, radius 12')
    }
  }

  private children(c: Command, s: Scope) {
    if (c.action) {
      const a = new Scope('action', s)
      this.hoist(c.action, a)
      this.statements(c.action, a)
    }
    if (c.children.length) {
      const b = new Scope('block', s)
      this.hoist(c.children, b)
      for (const e of c.children) {
        if (e.k === 'command') this.command(e, b, c.head)
        else this.statement(e, b)
      }
    }
  }
}
