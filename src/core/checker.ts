// Step 3 — the checker: finds mistakes and explains them clearly.
// It also links every name to its declaration and gives a meaning to every UI line.

import { KauryError, closest, msg, q } from './errors.js'
import type { Command, Expr, BindingKind, Stmt, Binding, ResolvedOption, Pos } from './ast.js'
import { canon, canonValue, RESERVED } from './keywords.js'
import {
  CAMERAS, knownColor, ELEMENTS, EVENTS, LIGHTS, MOTION_WORDS, MOTIONS, elementOption, styleOption,
  optionSpec, allOptions, TRANSITIONS,
} from './vocabulary.js'
import { JS_GLOBALS, kauryGlobal, globalNames } from './globals.js'

type ScopeKind = 'module' | 'page' | 'component' | 'function' | 'block' | 'lambda' | 'action'

class Scope {
  names = new Map<string, Binding>()
  constructor(public kind: ScopeKind, public parent?: Scope) {}
  find(name: string): Binding | undefined {
    return this.names.get(name) ?? this.parent?.find(name)
  }
  /** Scope that receives implicit declarations (« x = 3 » without let/state). */
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
}

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
const FIELD_HEADS = ['field', 'textarea', 'select', 'checkbox']
/** Elements whose first item is their content (a text, an image…). */
const CONTENT_HEADS = new Set(['title', 'subtitle', 'text', 'item', 'icon', 'button', 'link', 'image', 'video', 'card', 'logo', 'markdown'])
const SITE_SETTINGS = ['colors', 'font', 'fonts', 'lang', 'favicon', 'url', 'seo', 'style', 'transition', 'mobile', 'tablet', 'desktop', 'sound']

class Checker {
  errors: KauryError[] = []
  warnings: KauryError[] = []
  info: ModuleInfo = { pages: [], components: [], immersion: false, threeD: false, lottie: false, colors: {}, exports: [] }
  private components = new Set<string>()

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
    for (const [name, b] of s.names) {
      if (!b.used && b.kind === 'state' && !this.info.exports.includes(name) && b.pos) {
        this.warn(b.pos, msg(`the state ${q(name)} is never used.`, `l'état ${q(name)} n'est jamais utilisé.`), msg('remove it, or show it somewhere.', 'supprime-le, ou affiche-le quelque part.'))
      }
    }
  }

  private readSiteColors(body: Stmt[]) {
    for (const i of body) {
      if (i.k === 'command' && i.head === 'colors') {
        for (const it of i.items) {
          const [n, c] = it.atoms
          if (n?.k === 'name' && c?.k === 'color') this.info.colors[n.name] = c.v
          else if (n?.k === 'name' && c?.k === 'name' && knownColor(c.name)) this.info.colors[n.name] = `var(--k-${knownColor(c.name)})`
          else this.err(it.pos, msg('each color is written « name #code ».', 'chaque couleur s\'écrit « nom #code ».'), 'colors pink #FF4F8B, cream #FFF4E8')
        }
      }
    }
  }

  /** Declares ahead what a block defines (functions, components, imports) so it can be used before its line. */
  private hoist(body: Stmt[], s: Scope) {
    for (const i of body) {
      switch (i.k) {
        case 'function':
          this.declare(s, i.name, 'function', i.pos)
          if (i.exported) this.info.exports.push(i.name)
          break
        case 'component':
          this.declare(s, i.name, 'component', i.pos)
          this.components.add(i.name)
          this.info.components.push(i.name)
          if (i.exported) this.info.exports.push(i.name)
          break
        case 'import':
          for (const n of [i.default, i.all, ...(i.names ?? []).map((x) => x.alias ?? x.name)]) {
            if (n) {
              this.declare(s, n, /^\p{Lu}/u.test(n) && i.source.endsWith('.kaury') ? 'component' : 'import', i.pos)
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
        msg(`to change its value, just write « ${name} = … ».`, `pour changer sa valeur, écris simplement « ${name} = … ».`))
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
        if (i.k === 'if') {
          walk(i.then)
          i.elifs.forEach((x) => walk(x.body))
          if (i.else) walk(i.else)
        } else if (i.k === 'for' || i.k === 'while') walk(i.body)
        else if (i.k === 'try') {
          walk(i.body)
          if (i.handler) walk(i.handler)
        } else if (i.k === 'command' && host.isView()) {
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
        if (i.exported) this.info.exports.push(i.name)
        break
      }
      case 'assign': {
        this.expr(i.value, s)
        if (i.target.k === 'name') {
          const b = i.declares ?? s.find(i.target.name)
          if (!b) this.unknownName(i.target.name, i.target.pos, s)
          else {
            i.target.binding = b
            b.mutated = true
            if (!i.declares) b.used = true
            if (b.kind === 'const' || b.kind === 'derived') {
              this.err(i.pos, msg(`${q(i.target.name)} is declared with « let »: its value is fixed.`, `${q(i.target.name)} est déclaré avec « soit » : sa valeur est fixe.`),
                msg(`declare it with « state ${i.target.name} = … » to be able to change it.`, `déclare-le avec « etat ${i.target.name} = … » pour pouvoir le changer.`))
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
        this.block(i.then, s)
        for (const x of i.elifs) {
          this.expr(x.cond, s)
          this.block(x.body, s)
        }
        if (i.else) this.block(i.else, s)
        break
      case 'for': {
        this.expr(i.source, s)
        const b = new Scope('block', s)
        this.declare(b, i.variable, 'loop', i.pos)
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
        break
      case 'return':
        if (i.value) this.expr(i.value, s)
        break
      case 'expr':
        this.expr(i.e, s)
        break
      case 'toggle':
        this.expr(i.target, s)
        if (i.target.k === 'name' && i.target.binding) i.target.binding.mutated = true
        break
      case 'go':
        this.expr(i.path, s)
        break
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
          this.declare(pg, i.each.variable, 'loop', i.pos).used = true
          if (i.address) this.expr(i.address, pg)
        }
        this.hoist(i.body, pg)
        this.statements(i.body, pg)
        break
      }
      case 'site': {
        if (i.name) this.expr(i.name, s)
        for (const c of i.body) {
          if (c.k !== 'command' || !SITE_SETTINGS.includes(c.head)) {
            this.err(c.pos, msg('« site » only holds settings: colors, font, lang, favicon, url, seo, style, transition.', 'dans « site », on ne met que des réglages : couleurs, police, langue, favicon, adresse, seo, style, transition.'),
              msg('move this element into a page "/".', 'déplace cet élément dans une page "/".'))
            continue
          }
          this.command(c, s, 'site')
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
          if (b && (b.kind === 'state' || b.kind === 'derived' || b.kind === 'prop')) yes = true
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
    const sug = closest(name, [...s.all(), ...globalNames()])
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
    const element = sug ? undefined : closest(name, Object.keys(ELEMENTS))
    this.err({ ...pos, length: name.length }, msg(`${q(name)} does not exist.`, `${q(name)} n'existe pas.`),
      sug ? msg(`did you mean ${q(sug)}?`, `tu voulais dire ${q(sug)} ?`)
        : element ? msg(`did you mean the element ${q(element)}?`, `tu voulais dire l'élément ${q(element)} ?`)
          : msg(`declare it first: let ${name} = …   (or state ${name} = … if it changes)`, `déclare-le avant : soit ${name} = …   (ou etat ${name} = … s'il change)`))
  }

  expr(e: Expr, s: Scope) {
    switch (e.k) {
      case 'number': case 'color': case 'bool': case 'none':
        return
      case 'text':
        for (const m of e.parts) if (typeof m !== 'string') this.expr(m, s)
        return
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
        // « a-b » when « a » and « b » exist but « a-b » does not: it is a subtraction
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
      case 'member': this.expr(e.object, s); return
      case 'index': this.expr(e.object, s); this.expr(e.index, s); return
      case 'call':
        this.expr(e.fn, s)
        e.args.forEach((x) => this.expr(x, s))
        if (e.fn.k === 'name' && e.fn.binding?.kind === 'component') {
          this.err(e.pos, msg(`${q(e.fn.name)} is a component: it is used at the start of a line, not like a function.`, `${q(e.fn.name)} est un composant : il s'utilise en début de ligne, pas comme une fonction.`),
            `${e.fn.name} ${e.args.length ? '…' : ''}`.trim())
        }
        return
      case 'binary': this.expr(e.l, s); this.expr(e.r, s); return
      case 'unary': case 'spread': case 'await': this.expr(e.e, s); return
      case 'lambda': {
        const l = new Scope('lambda', s)
        for (const n of e.params) this.declare(l, n, 'param', e.pos)
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
            : msg(`create it with « component ${head} … » or import it: import ${head} from "./${head.toLowerCase()}.kaury"`, `crée-le avec « composant ${head} … » ou importe-le : importe ${head} de "./${head.toLowerCase()}.kaury"`))
      } else b.used = true
      const positional: Expr[] = []
      for (const it of c.items) for (const a of it.atoms) {
        this.expr(a, s)
        positional.push(a)
      }
      c.meaning = { kind: 'component', positional, options: [] }
      this.children(c, s)
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
      let opt = word ? (elementOption(optionHead, word) ?? (kind !== 'motion' && kind !== 'event' && kind !== 'setting' ? styleOption(word) : undefined)) : undefined
      // a declared variable wins over an option of the same name:
      // - as the first item of an element that shows content (text size → shows « size »)
      // - or alone where the option would need a value
      const firstContent = it === c.items[0] && CONTENT_HEADS.has(head)
      if (opt && word && a.length === 1 && s.find(word) && (firstContent || (optionSpec(optionHead, opt)?.args ?? '').replace(/\?/g, '').length > 0)) opt = undefined
      if (opt) {
        const values = a.slice(1)
        values.forEach((x) => this.checkValue(x, s))
        if (opt === 'hover') inHover = true
        options.push({ name: inHover && opt !== 'hover' ? `hover:${opt}` : opt, values, pos: it.pos })
        if (opt === 'hover' && values.length) {
          // « hover lift 4 » → hover:lift 4
          const v0 = values[0]
          const sub = v0.k === 'name' ? styleOption(v0.name) : undefined
          if (!sub) this.err(it.pos, msg('« hover » must be followed by a style.', '« survol » doit être suivi d\'un style.'), 'hover lift 4   /   hover background pink')
          else {
            options.pop()
            options.push({ name: `hover:${sub}`, values: values.slice(1), pos: it.pos })
          }
        }
        this.checkOption(head, opt, values, it.pos)
        continue
      }
      // « 3 columns »
      if (a0.k === 'number' && a[1]?.k === 'name') {
        const o2 = elementOption(optionHead, a[1].name) ?? styleOption(a[1].name)
        if (o2) {
          options.push({ name: inHover ? `hover:${o2}` : o2, values: [a0, ...a.slice(2)], pos: it.pos })
          continue
        }
      }
      // a color alone: « pink », « #FF4F8B »
      if (kind !== 'setting' && kind !== 'motion' && a.length === 1 && (a0.k === 'color' || (word && !s.find(word) && (this.info.colors[word] || knownColor(word))))) {
        options.push({ name: inHover ? 'hover:tint' : 'tint', values: [a0], pos: it.pos })
        continue
      }
      // section / object name (not a variable)
      if (word && !s.find(word) && !kauryGlobal(word) && !JS_GLOBALS.has(word)) {
        if (NAMED_CONTAINERS.includes(head) && !positional.length && a.length === 1 && !objectName) {
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
        if (FIELD_HEADS.includes(head) && !positional.length) {
          // the first name of a field is the state it fills: created if it does not exist
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
          const all = [...allOptions(optionHead), ...Object.keys(this.info.colors)]
          const sug = closest(word, all)
          const sugVar = closest(word, s.all())
          this.err({ ...it.pos, length: word.length }, msg(`${q(word)} is neither an option of ${q(c.rawHead)} nor a known name.`, `${q(word)} n'est ni une option de ${q(c.rawHead)}, ni un nom connu.`),
            sug ? msg(`did you mean ${q(sug)}?`, `tu voulais dire ${q(sug)} ?`)
              : sugVar ? msg(`did you mean the variable ${q(sugVar)}?`, `tu voulais dire la variable ${q(sugVar)} ?`)
                : msg(`possible options: ${allOptions(optionHead).slice(0, 8).join(', ')}…`, `options possibles : ${allOptions(optionHead).slice(0, 8).join(', ')}…`))
          continue
        }
      }
      for (const x of a) {
        this.expr(x, s)
        positional.push(x)
      }
    }
    c.meaning = { kind, positional, options, objectName }
    this.checkCommand(c, parent)
    if (objectName && (head === 'object' || head === 'character')) {
      const b = this.declare(s.host(), objectName, 'object', c.pos)
      b.used = true
    }
    this.children(c, s)
  }

  private checkValue(x: Expr, s: Scope) {
    // an option value can be a free word (shadow soft, align center) or a named color
    if (x.k === 'name' && !s.find(x.name) && !kauryGlobal(x.name) && !JS_GLOBALS.has(x.name)) return
    this.expr(x, s)
  }

  private checkOption(head: string, opt: string, values: Expr[], pos: Pos) {
    const spec = optionSpec(head, opt)
    if (!spec || spec.args === '*' || spec.args === 'e?') return
    const required = spec.args.replace(/.\?/g, '').length
    const max = spec.args.replace(/\?/g, '').length
    if (values.length < required) {
      this.err(pos, msg(`${q(opt)} expects ${required === 1 ? 'a value' : `${required} values`}.`, `${q(opt)} attend ${required === 1 ? 'une valeur' : `${required} valeurs`}.`),
        msg(`${spec.example}   (if ${q(opt)} is your variable, write (${opt}))`, `${spec.example}   (si c'est ta variable ${q(opt)}, écris (${opt}))`))
    } else if (values.length > max && spec.args !== 'e') {
      this.err(pos, msg(`${q(opt)} takes at most ${max === 0 ? 'no value' : max === 1 ? 'one value' : `${max} values`}.`, `${q(opt)} prend au plus ${max === 0 ? 'aucune valeur' : max === 1 ? 'une valeur' : `${max} valeurs`}.`),
        msg(`separate the options with commas: ${spec.example}`, `sépare les options par des virgules : ${spec.example}`))
    }
    const v0 = values[0]
    if (spec.words && v0?.k === 'name' && !spec.words.includes(canonValue(v0.name))) {
      const sug = closest(v0.name, spec.words)
      this.err(pos, msg(`${q(opt)} does not accept ${q(v0.name)}.`, `${q(opt)} n'accepte pas ${q(v0.name)}.`),
        sug ? msg(`did you mean « ${opt} ${sug} »?`, `tu voulais dire « ${opt} ${sug} » ?`) : msg(`possible values: ${spec.words.join(', ')}`, `valeurs possibles : ${spec.words.join(', ')}`))
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
        break
      case 'link':
        if (!n) this.err(c.pos, msg('« link » needs a text and an address.', '« lien » a besoin d\'un texte et d\'une adresse.'), 'link "Contact" "/contact"')
        break
      case 'object':
      case 'character': {
        if (!n) this.err(c.pos, msg(`${q(c.rawHead)} needs its file.`, `${q(c.rawHead)} a besoin de son fichier.`), `${c.rawHead} can "crush.glb"`)
        const src = m.positional[0]
        if (src?.k === 'text' && src.parts.length === 1 && typeof src.parts[0] === 'string') {
          const f = (src.parts[0] as string).toLowerCase()
          if (/\.(glb|gltf)(\?|$)/.test(f)) this.info.threeD = true
          else if (/\.(json|lottie)(\?|$)/.test(f)) this.info.lottie = true
          else if (!/\.(png|jpe?g|webp|avif|gif|svg)(\?|$)/.test(f)) {
            this.err(src.pos, msg(`unknown file format for ${q(c.rawHead)}.`, `format de fichier non reconnu pour ${q(c.rawHead)}.`),
              msg('accepted formats: .glb, .gltf (3D), .png, .jpg, .webp, .svg (2D), .json (Lottie).', 'formats acceptés : .glb, .gltf (3D), .png, .jpg, .webp, .svg (2D), .json (Lottie).'))
          }
        } else if (src) this.info.threeD = true
        break
      }
      case 'light': {
        const w = word(m.positional[0])
        if (!w || !LIGHTS.includes(w)) {
          const sug = w ? closest(w, LIGHTS) : undefined
          this.err(c.pos, msg(`unknown light${w ? ` ${q(w)}` : ''}.`, `lumière inconnue${w ? ` ${q(w)}` : ''}.`),
            sug ? msg(`did you mean « light ${sug} »?`, `tu voulais dire « lumiere ${sug} » ?`) : msg(`moods: ${LIGHTS.join(', ')}`, `ambiances : ${LIGHTS.join(', ')}`))
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
        if (!m.options.length && !m.positional.length) this.err(c.pos, msg('« enters from » expects a direction.', '« entre depuis » attend une direction.'), 'enters from left   (left, right, top, bottom, fade, zoom)')
        break
      case 'spin': {
        const v = m.positional[0]
        if (v && v.k === 'name' && !v.binding) this.err(v.pos, msg('« spin » expects a speed.', '« tourne » attend une vitesse.'), 'spin 20/s  /  spin on scroll')
        break
      }
    }
    if (m.kind === 'event' && !c.action) {
      this.err(c.pos, msg(`${q(c.head.replace('-', ' '))} must be followed by an action with « -> ».`, `${q(c.rawHead)} doit être suivi d'une action avec « -> ».`), 'on click -> jump')
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
