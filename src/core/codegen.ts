// Step 4 — the code generator: checked tree → JavaScript + CSS.
// The generated JavaScript uses Kaury's small reactive runtime (no React).
// Every element is created *inside its parent* with $k.h(parent, tag, class): the same code
// builds the page on the server, hydrates the server HTML in the browser, and re-renders later.

import type { Command, Expr, Stmt, Binding, ResolvedOption, Pos } from './ast.js'
import { canon, canonValue } from './keywords.js'
import { declarations, hexOf, isLight, literal, bestText, fontFamily } from './css.js'
import { globalSpec, kauryMethod, PROPERTIES } from './globals.js'
import type { ModuleInfo } from './checker.js'
import { ELEMENTS } from './vocabulary.js'

const JS_RESERVED = new Set([
  'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger', 'default', 'delete', 'do', 'else', 'enum',
  'export', 'extends', 'false', 'finally', 'for', 'function', 'if', 'import', 'in', 'instanceof', 'new', 'null',
  'return', 'super', 'switch', 'this', 'throw', 'true', 'try', 'typeof', 'var', 'void', 'while', 'with', 'yield',
  'let', 'static', 'implements', 'interface', 'package', 'private', 'protected', 'public', 'await', 'arguments', 'eval',
])

/** Kaury name → valid JavaScript identifier. total-price → total$price */
export function jsName(n: string): string {
  let s = n.replace(/-/g, '$')
  if (JS_RESERVED.has(s) || s.startsWith('$k')) s = s + '$'
  return s
}

const jsKey = (k: string) => (/^[\p{L}_$][\p{L}\p{N}_$]*$/u.test(k) ? k : JSON.stringify(k))

export interface Output {
  js: string
  css: string
  map: { generated: number; source: number }[] // JS line → .kaury line
  fonts: string[]
  site: { name?: string; lang?: string; base?: string }
  assets: string[] // import "style.css" / "script.js": stylesheets and browser scripts of the whole site
  mails: string[] // addresses written in « form mail "…" »: the only ones the site's mail endpoint accepts (with those seen while rendering)
}

interface Ctx {
  view: boolean // building UI
  parent?: string // variable holding the parent node
  target?: string // element/object targeted by motions (jump, says…)
  parentHead?: string
}

export function generate(prog: Stmt[], info: ModuleInfo, options: { file?: string; runtime?: string } = {}): Output {
  return new Generator(info, options.file ?? 'site.kaury').module(prog, options.runtime ?? 'kaury/runtime')
}

/** "photo.jpg" → "/photo.jpg" (valid on every page). */
export function assetPath(s: string): string {
  if (/^(\/|[a-z][a-z0-9+.-]*:|#|\.\.\/)/i.test(s)) return s
  return '/' + s.replace(/^\.\//, '')
}

// options that are not styles (handled by the element itself)
const NON_STYLE = new Set(['level', 'alt', 'cover', 'loop', 'muted', 'autoplay', 'controls', 'to', 'outline', 'ghost', 'large', 'small',
  'disabled', 'new-tab', 'type', 'required', 'label', 'rows', 'image', 'position', 'rotation', 'fallback', 'shadows', 'fog', 'ground',
  'particles', 'distance', 'volume', 'animation', 'immediate', 'class', 'look', 'tag', 'attr', 'id', 'html', 'selected', 'current', 'open'])
const DYNAMIC_PROP: Record<string, string> = {
  background: 'background', color: 'color', size: 'font-size', opacity: 'opacity', width: 'width', height: 'height',
  tint: 'color', radius: 'border-radius', margin: 'margin', padding: 'padding', gap: 'gap',
}
const PX_UNIT = new Set(['size', 'width', 'height', 'radius', 'margin', 'padding', 'gap'])
const TEXT_HEADS = new Set(['title', 'subtitle', 'text', 'link', 'icon', 'item'])
/** “style header”, “style emphasis”…: the elements a named style restyles everywhere. */
const ELEMENT_SELECTOR: Record<string, string> = {
  header: '.k-section-header,.k-header', emphasis: 'em', links: '.k-links', link: '.k-link',
}
/** Parts inside an element (“link color rust” in a style). */
const PART_SELECTOR: Record<string, string> = {
  title: '.k-title,h1,h2,h3,h4', subtitle: '.k-subtitle', text: '.k-text,p', link: 'a:not(.k-logo,.k-button)', image: 'img', button: '.k-button',
  icon: '.k-icon', code: ':not(pre)>code', block: 'pre', list: 'ul,ol', item: 'li', table: 'table', cell: 'th,td',
  quote: 'blockquote', summary: 'summary', emphasis: 'em', logo: '.k-logo',
}

/** States of a named style → CSS. */
const STATE_SELECTOR: Record<string, string> = {
  selected: '[aria-selected="true"]', current: '[aria-current="page"]', open: '[open]', focus: ':focus-visible',
  pressed: ':active', disabled: ':disabled', checked: ':checked',
}

const MEDIA: Record<string, string> = {
  mobile: '@media (max-width: 640px)',
  tablet: '@media (min-width: 641px) and (max-width: 1024px)',
  desktop: '@media (min-width: 1025px)',
}

class Generator {
  private lines: string[] = []
  private sources: number[] = []
  private indent = 0
  private srcLine = 1
  private counter = 0
  private classes = 0
  private css: string[] = []
  private fonts = new Set<string>()
  private assets: string[] = []
  private mails: string[] = []
  private site: { name?: string; lang?: string; base?: string } = {}
  private prefix: string
  private declared = new Set<Binding>()
  private imagesInPage = 0
  private repeated = 0 // inside a component or a loop: the same line makes many images

  constructor(private info: ModuleInfo, file: string) {
    let h = 0
    for (const c of file) h = (h * 31 + c.charCodeAt(0)) >>> 0
    this.prefix = 'k' + (h % 46656).toString(36) // stable class prefix per file
  }

  private emit(code: string, pos?: Pos) {
    if (pos) this.srcLine = pos.line
    for (const l of code.split('\n')) {
      this.lines.push('  '.repeat(this.indent) + l)
      this.sources.push(this.srcLine)
    }
  }
  private fresh(base = 'n'): string {
    return `$${base}${++this.counter}`
  }

  module(prog: Stmt[], runtime: string): Output {
    this.emit(`import * as $k from ${JSON.stringify(runtime)}`)
    for (const i of prog) if (i.k === 'import') this.importStmt(i)
    const vars = Object.entries(this.info.colors).map(([n, c]) => `--k-${n}:${c}`)
    if (vars.length) this.css.push(`:root{${vars.join(';')}}`)
    const first = Object.keys(this.info.colors)[0]
    if (first && !this.info.colors.accent) this.css.push(`:root{--k-accent:var(--k-${first})}`)
    const accent = this.info.colors.accent ?? (first ? this.info.colors[first] : undefined)
    // text on the accent color: white or near-black, whichever passes the WCAG contrast
    if (accent && accent.startsWith('#') && bestText(accent) !== '#fff') this.css.push(':root{--k-on-accent:#16151a}')

    const pages: string[] = []
    let siteObj = '{}'
    this.implicitDeclarations(prog, true)
    for (const i of prog) {
      if (i.k === 'import' || i.k === 'command') continue
      if (i.k === 'page') {
        pages.push(this.page(i))
        continue
      }
      if (i.k === 'site') {
        siteObj = this.siteDecl(i)
        continue
      }
      this.statement(i, { view: false })
    }
    // UI lines at file level (without a page) → implicit page "/"
    const loose = prog.filter((i) => i.k === 'command')
    if (loose.length && !this.info.pages.some((p) => p.path === '/')) {
      pages.push(this.page({ k: 'page', path: '/', body: loose, pos: loose[0].pos }))
    }
    this.emit(`export const $pages = [${pages.join(', ')}]`)
    this.emit(`export const $site = ${siteObj}`)
    this.emit(`export const $immersion = ${JSON.stringify({ threeD: this.info.threeD, lottie: this.info.lottie, active: this.info.immersion })}`)
    const css = this.css.join('\n')
    this.emit(`export const $css = ${JSON.stringify(css)}`)
    this.emit(`export const $fonts = ${JSON.stringify([...this.fonts])}`)
    return {
      js: this.lines.join('\n'),
      css,
      map: this.sources.map((s, g) => ({ generated: g + 1, source: s })),
      fonts: [...this.fonts],
      site: this.site,
      assets: this.assets,
      mails: this.mails,
    }
  }

  private importStmt(i: Extract<Stmt, { k: 'import' }>) {
    const parts: string[] = []
    if (i.default) parts.push(jsName(i.default))
    if (i.names) parts.push(`{ ${i.names.map((n) => (n.alias ? `${jsKey(n.name)} as ${jsName(n.alias)}` : jsName(n.name))).join(', ')} }`)
    if (i.all) parts.push(`* as ${jsName(i.all)}`)
    if (!parts.length && /\.(css|js|mjs|ts)$/.test(i.source)) {
      // a stylesheet or a browser script for every page: handled by the build, never run on the server
      this.assets.push(i.source)
      return
    }
    if (i.source.endsWith('.kaury') && i.default && /^\p{Lu}/u.test(i.default) && !i.names) {
      // import Card from "./card.kaury" → the exported component of the same name
      this.emit(`import { ${jsName(i.default)} } from ${JSON.stringify(i.source)}`, i.pos)
      return
    }
    this.emit(parts.length ? `import ${parts.join(', ')} from ${JSON.stringify(i.source)}` : `import ${JSON.stringify(i.source)}`, i.pos)
  }

  // ---------------------------------------------------------------- site
  private siteDecl(i: Extract<Stmt, { k: 'site' }>): string {
    const props: string[] = []
    if (i.name) {
      props.push(`name: ${this.ex(i.name)}`)
      const l = literal(i.name, {})
      if (typeof l === 'string') this.site.name = l
    }
    const rules: Command[] = []
    for (const c of i.body) {
      if (c.k !== 'command' || !c.meaning) continue
      const p0 = c.meaning.positional
      switch (c.head) {
        case 'font':
        case 'fonts': {
          const names = p0.map((x) => literal(x, {})).filter((x): x is string => typeof x === 'string')
          names.forEach((n) => this.fonts.add(n))
          if (names[0]) this.css.push(`:root{--k-font:${fontFamily(names[0])}}`)
          if (names[1]) this.css.push(`:root{--k-font-titles:${fontFamily(names[1])}}`)
          break
        }
        case 'lang':
          props.push(`lang: ${this.ex(p0[0])}`)
          this.site.lang = String(literal(p0[0], {}) ?? 'en')
          break
        case 'url':
          props.push(`url: ${this.ex(p0[0])}`)
          break
        case 'favicon':
          props.push(`favicon: ${this.exPath(p0[0])}`)
          break
        case 'base': {
          // base none: no default look for plain tags (the site brings its own stylesheet)
          const v = p0[0]
          this.site.base = v?.k === 'none' ? 'none' : String(v?.k === 'name' ? v.name : literal(v, {}) ?? 'default')
          break
        }
        case 'head':
          props.push(`head: [${p0.map((x) => this.ex(x)).join(', ')}].join("")`)
          break
        case 'seo':
          props.push(`seo: ${this.seo(c)}`)
          break
        case 'transition':
          props.push(`transition: ${JSON.stringify(String(literal(p0[0], {}) ?? 'fade'))}`)
          break
        case 'style':
        case 'mobile':
        case 'tablet':
        case 'desktop':
          rules.push(c)
          break
      }
    }
    if (rules.length) {
      // site-wide measures, not styles of <body>: radius of every block, width of the content, space between children
      const THEME: Record<string, string> = { radius: '--k-radius', 'max-width': '--k-width', gap: '--k-gap' }
      for (const r of rules) {
        if (!r.meaning) continue
        r.meaning.options = r.meaning.options.filter((o) => {
          const v = THEME[o.name] ? literal(o.values[0], this.info.colors) : undefined
          if (v === undefined) return true
          this.css.push(`:root{${THEME[o.name]}:${typeof v === 'number' ? v + 'px' : v}}`)
          return false
        })
      }
      // site style: applies to <body>, and its colors become the colors of the whole site
      this.styleRules('body', 'site', rules)
      for (const r of rules) {
        if (r.head !== 'style') continue
        for (const o of r.meaning!.options) {
          const v = literal(o.values[0], this.info.colors)
          if (v === undefined) continue
          if (o.name === 'background' || o.name === 'tint') {
            this.css.push(`:root{--k-bg:${v}}`)
            const hex = hexOf(String(v), this.info.colors)
            if (hex && !isLight(hex)) this.css.push(':root{--k-line:rgba(255,255,255,.12);--k-muted:rgba(255,255,255,.72);color-scheme:dark}')
          }
          // never a variable defined by itself (a site color named « ink » is already --k-ink)
          if (o.name === 'color') this.css.push(v === 'var(--k-ink)' ? ':root{--k-text:var(--k-ink)}' : `:root{--k-text:${v};--k-ink:${v}}`)
        }
      }
    }
    return `{ ${props.join(', ')} }`
  }

  private seo(c: Command): string {
    const p = c.meaning!.positional
    const props: string[] = []
    if (p[0]) props.push(`title: ${this.ex(p[0])}`)
    if (p[1]) props.push(`description: ${this.ex(p[1])}`)
    const img = c.meaning!.options.find((o) => o.name === 'image')
    if (img?.values[0]) props.push(`image: ${this.exPath(img.values[0])}`)
    return `{ ${props.join(', ')} }`
  }

  // ---------------------------------------------------------------- pages
  private page(i: Extract<Stmt, { k: 'page' }>): string {
    const fn = this.fresh('page')
    const params = [...i.path.matchAll(/:([\p{L}_][\p{L}\p{N}_-]*)/gu)].map((m) => m[1])
    this.imagesInPage = 0
    const item = i.each ? `const ${jsName(i.each.variable)} = $route.item` : ''
    this.emit(`function ${fn}($route, $root) {`, i.pos)
    this.indent++
    for (const p of params) this.emit(`const ${jsName(p)} = $route.params[${JSON.stringify(p)}]`)
    if (item) this.emit(item)
    const root = this.fresh('page')
    let rootTag = 'main'
    let rootClass = 'k-page'
    const wrap = i.body.find((x) => x.k === 'command' && x.head === 'wrapper') as Command | undefined
    if (wrap) {
      const [t, c] = wrap.meaning!.positional.map((x) => literal(x, {}))
      if (typeof t === 'string' && /^[a-z][a-z0-9-]*$/.test(t)) rootTag = t
      // wrapper none: the page goes straight into the site container
      const w0 = wrap.meaning!.positional[0]
      if (w0?.k === 'none' || (w0?.k === 'name' && canonValue(w0.name) === 'none')) rootTag = ''
      if (typeof c === 'string') rootClass = c
    }
    if (rootTag) this.emit(`const ${root} = $k.h($root, ${JSON.stringify(rootTag)}, ${JSON.stringify(rootClass)})`)
    else this.emit(`const ${root} = $root`)
    let head = 'null'
    let seo = 'null'
    let transition = 'null'
    let lang = 'null'
    let alternates = 'null'
    const body = i.body.filter((x) => {
      if (x.k === 'command' && x.head === 'seo') {
        seo = this.seo(x)
        return false
      }
      if (x.k === 'command' && x.head === 'transition') {
        transition = JSON.stringify(String(literal(x.meaning!.positional[0], {}) ?? 'fade'))
        return false
      }
      if (x.k === 'command' && x.head === 'lang') {
        lang = this.ex(x.meaning!.positional[0])
        return false
      }
      if (x.k === 'command' && x.head === 'wrapper') return false
      if (x.k === 'command' && x.head === 'head') {
        // head "<script type=…>": raw HTML added to the <head> of this page
        head = `[${x.meaning!.positional.map((a) => this.ex(a)).join(', ')}].join("")`
        return false
      }
      if (x.k === 'command' && x.head === 'alternate') {
        // alternate "fr" "/page/", "en" "/en/page/": versions of the page in other languages
        const pairs = x.items.map((it) => `[${it.atoms.map((a) => this.ex(a)).join(', ')}]`)
        alternates = `[${pairs.join(', ')}]`
        return false
      }
      return true
    })
    this.content(body, { view: true, parent: root, target: root, parentHead: 'page' }, 'page')
    this.emit(`return ${root}`)
    this.indent--
    this.emit('}')
    const prelude = [...params.map((p) => `const ${jsName(p)} = $route.params[${JSON.stringify(p)}];`), item ? item + ';' : ''].join(' ')
    const each = i.each
      ? `, each: () => ${this.ex(i.each.source)}, pathOf: (${jsName(i.each.variable)}) => ${this.ex(i.address!)}`
      : ''
    return `{ path: ${JSON.stringify(i.path)}${each}, render: ${fn}, seo: ($route) => { ${prelude} return ${seo} }, lang: ($route) => { ${prelude} return ${lang} }, alternates: ($route) => { ${prelude} return ${alternates} }, head: ($route) => { ${prelude} return ${head} }, transition: ${transition} }`
  }

  /** Declares at the top of a scope the states/variables created by “x = …” without let/state. */
  private implicitDeclarations(body: Stmt[], view: boolean) {
    const walk = (list: Stmt[]) => {
      for (const i of list) {
        if (i.k === 'assign' && i.declares && !this.declared.has(i.declares)) {
          this.declared.add(i.declares)
          const n = jsName(i.declares.name)
          if (i.declares.kind === 'state') this.emit(`const ${n} = $k.state(null)`, i.pos)
          else this.emit(`let ${n}`, i.pos)
        }
        if (i.k === 'toggle' && i.declares && !this.declared.has(i.declares)) {
          this.declared.add(i.declares)
          this.emit(`const ${jsName(i.declares.name)} = $k.state(false)`, i.pos)
        }
        if (i.k === 'if') {
          walk(i.then)
          i.elifs.forEach((x) => walk(x.body))
          if (i.else) walk(i.else)
        } else if (i.k === 'for' || i.k === 'while') walk(i.body)
        else if (i.k === 'try') {
          walk(i.body)
          if (i.handler) walk(i.handler)
        } else if (i.k === 'command' && view) {
          walk(i.children)
          if (i.action) walk(i.action)
          // states created by fields (field email …)
          if (['field', 'textarea', 'select', 'checkbox'].includes(i.head)) {
            const a0 = i.meaning?.positional[0]
            if (a0?.k === 'name' && a0.binding && !this.declared.has(a0.binding) && a0.binding.pos === i.items[0]?.pos) {
              this.declared.add(a0.binding)
              this.emit(`const ${jsName(a0.name)} = $k.state(${i.head === 'checkbox' ? 'false' : '""'})`, i.pos)
            }
          }
        }
      }
    }
    walk(body)
  }

  private localDeclarations(body: Stmt[]) {
    const walk = (list: Stmt[]) => {
      for (const i of list) {
        if (i.k === 'assign' && i.declares && i.declares.kind === 'variable' && !this.declared.has(i.declares)) {
          this.declared.add(i.declares)
          this.emit(`let ${jsName(i.declares.name)}`, i.pos)
        }
        if (i.k === 'if') {
          walk(i.then)
          i.elifs.forEach((x) => walk(x.body))
          if (i.else) walk(i.else)
        } else if (i.k === 'for' || i.k === 'while') walk(i.body)
        else if (i.k === 'try') {
          walk(i.body)
          if (i.handler) walk(i.handler)
        }
      }
    }
    walk(body)
  }

  // ---------------------------------------------------------------- statements (logic)
  private block(body: Stmt[], ctx: Ctx, returnLast = false) {
    if (!ctx.view) this.localDeclarations(body)
    body.forEach((i, n) => {
      if (returnLast && n === body.length - 1 && i.k === 'expr') this.emit(`return ${this.ex(i.e)}`, i.pos)
      else this.statement(i, ctx)
    })
  }

  private statement(i: Stmt, ctx: Ctx) {
    this.srcLine = i.pos.line
    switch (i.k) {
      case 'let': {
        const n = jsName(i.name)
        const ex = i.exported ? 'export ' : ''
        const kind = i.binding?.kind
        if (kind === 'state') this.emit(`${ex}const ${n} = $k.state(${this.ex(i.value)})`, i.pos)
        else if (kind === 'derived') this.emit(`${ex}const ${n} = $k.derived(() => (${this.ex(i.value)}))`, i.pos)
        else this.emit(`${ex}const ${n} = ${this.ex(i.value)}`, i.pos)
        return
      }
      case 'assign': {
        const val = this.ex(i.value)
        const target = this.target(i.target)
        if (hasAwait(i.value) && ctx.view) {
          // in a page we do not wait: the page shows up and fills in when the data arrives
          this.emit(`;(async () => { try { ${target} ${i.op} ${val} } catch ($e) { $k.report($e) } })()`, i.pos)
        } else this.emit(`${target} ${i.op} ${val}`, i.pos)
        return
      }
      case 'function': {
        const asy = bodyHasAwait(i.body) ? 'async ' : ''
        const ex = i.exported ? 'export ' : ''
        this.emit(`${ex}${asy}function ${jsName(i.name)}(${i.params.map((p) => jsName(p.name) + (p.default ? ` = ${this.ex(p.default)}` : '')).join(', ')}) {`, i.pos)
        this.indent++
        this.block(i.body, { view: false }, true)
        this.indent--
        this.emit('}')
        return
      }
      case 'if': {
        if (ctx.view) return this.ifView(i, ctx)
        this.emit(`if (${this.ex(i.cond)}) {`, i.pos)
        this.indent++
        this.block(i.then, ctx)
        this.indent--
        for (const x of i.elifs) {
          this.emit(`} else if (${this.ex(x.cond)}) {`, x.pos)
          this.indent++
          this.block(x.body, ctx)
          this.indent--
        }
        if (i.else) {
          this.emit('} else {')
          this.indent++
          this.block(i.else, ctx)
          this.indent--
        }
        this.emit('}')
        return
      }
      case 'for': {
        if (ctx.view) return this.forView(i, ctx)
        const v = jsName(i.variable)
        if (i.index) this.emit(`for (const [${jsName(i.index)}, ${v}] of $k.toList(${this.ex(i.source)}).entries()) {`, i.pos)
        else this.emit(`for (const ${v} of $k.toList(${this.ex(i.source)})) {`, i.pos)
        this.indent++
        this.block(i.body, ctx)
        this.indent--
        this.emit('}')
        return
      }
      case 'while':
        this.emit(`while (${this.ex(i.cond)}) {`, i.pos)
        this.indent++
        this.block(i.body, ctx)
        this.indent--
        this.emit('}')
        return
      case 'try':
        this.emit('try {', i.pos)
        this.indent++
        this.block(i.body, ctx)
        this.indent--
        this.emit(`} catch (${i.variable ? jsName(i.variable) : '$e'}) {`)
        this.indent++
        if (i.handler) this.block(i.handler, ctx)
        this.indent--
        this.emit('}')
        return
      case 'import':
      case 'page':
      case 'site':
        return
      case 'return':
        this.emit(i.value ? `return ${this.ex(i.value)}` : 'return', i.pos)
        return
      case 'break':
        this.emit('break', i.pos)
        return
      case 'continue':
        this.emit('continue', i.pos)
        return
      case 'expr':
        if (ctx.view && hasAwait(i.e)) this.emit(`;(async () => { try { ${this.ex(i.e)} } catch ($e) { $k.report($e) } })()`, i.pos)
        else this.emit(this.ex(i.e), i.pos)
        return
      case 'toggle': {
        const t = this.target(i.target)
        const v = i.mode === 'open' ? 'true' : i.mode === 'close' ? 'false' : `!${t}`
        this.emit(`${t} = ${v}`, i.pos)
        return
      }
      case 'go':
        this.emit(`$k.go(${this.ex(i.path)})`, i.pos)
        return
      case 'js':
        this.emit(i.code, i.pos)
        return
      case 'css':
        // raw CSS: added to the stylesheet of the site, as written
        this.css.push(i.code)
        return
      case 'animation-def':
        this.animationDef(i)
        return
      case 'style-def':
        // named style → a class of the site: .ks-promise
        {
          // “style button” restyles every button of the site; “style promise” makes a new word
          const bases = (ELEMENT_SELECTOR[i.name] ?? (i.name in ELEMENTS ? `.k-${i.name}` : `.ks-${i.name}`)).split(',')
          const head = i.name in ELEMENTS ? i.name : 'box'
          for (const r of i.rules) {
            const state = r.state ? STATE_SELECTOR[r.state] : ''
            const parts = r.part ? (PART_SELECTOR[r.part] ?? `.ks-${r.part}`).split(',') : ['']
            // :where() keeps a part as light as one class: an option written on the element itself still wins
            // one of your own words inside (eyebrow in dark) wins over that word alone: no :where()
            const own = !!r.part && !PART_SELECTOR[r.part]
            const sel = bases.map((b) => `${b}${state}${r.part ? (own ? ` .ks-${r.part}` : ` :where(${parts.map((p) => p.trim()).join(',')})`) : ''}`).join(',')
            const h = r.part ? (r.part in ELEMENTS ? r.part : PART_SELECTOR[r.part] ? 'text' : 'box') : head
            if (r.state || r.part) this.optionsToCss(sel, h, r.meaning!.options, r.head === 'style' ? undefined : MEDIA[r.head], [])
            else this.styleRules(sel, h, [r])
          }
        }
        return
      case 'component':
        return this.component(i)
      case 'command':
        if (ctx.view) return this.commandView(i, ctx)
        return this.commandAction(i, ctx)
    }
  }

  private target(e: Expr): string {
    if (e.k === 'name') {
      const b = e.binding
      if (b && (b.kind === 'state' || b.kind === 'derived')) return `${jsName(e.name)}.v`
      return jsName(e.name)
    }
    return this.ex(e)
  }

  // ---------------------------------------------------------------- components
  private component(i: Extract<Stmt, { k: 'component' }>) {
    const ex = i.exported ? 'export ' : ''
    this.emit(`${ex}function ${jsName(i.name)}($p = {}, $parent) {`, i.pos)
    this.indent++
    for (const p of i.params) {
      if (p.default) this.emit(`if ($p[${JSON.stringify(p.name)}] === undefined) Object.defineProperty($p, ${JSON.stringify(p.name)}, { get: () => ${this.ex(p.default)} })`)
    }
    this.emit('const $start = $k.mark($parent)')
    this.repeated++
    this.content(i.body, { view: true, parent: '$parent', target: undefined, parentHead: 'component' }, 'component')
    this.repeated--
    this.emit('return $k.rootNodes($parent, $start)')
    this.indent--
    this.emit('}')
    this.emit(`${jsName(i.name)}.$params = ${JSON.stringify(i.params.map((p) => p.name))}`)
  }

  // ---------------------------------------------------------------- UI
  /** Content of a UI block: settings applied to the parent, then children. */
  private content(body: Stmt[], ctx: Ctx, parentHead: string) {
    this.implicitDeclarations(body, true)
    for (const i of body) {
      if (i.k === 'command' && i.meaning && (i.meaning.kind === 'style' || i.meaning.kind === 'screen')) {
        if (i.children.some((e) => e.k !== 'command' || e.head !== 'style')) {
          // “mobile” with content: shown only on mobile
          const w = this.fresh()
          this.emit(`const ${w} = $k.h(${ctx.parent}, "div", "k-only-${i.head}")`, i.pos)
          this.content(i.children, { ...ctx, parent: w }, parentHead)
        }
        continue
      }
      this.statement(i, ctx)
    }
    const rules = body.filter((i): i is Command => i.k === 'command' && !!i.meaning && (i.meaning.kind === 'style' || i.meaning.kind === 'screen'))
    if (rules.length && ctx.parent) {
      const cls = this.newClass()
      const dynamic = this.styleRules('.' + cls, parentHead, rules)
      if (parentHead === 'component') {
        this.emit(`$k.rootClass(${ctx.parent}, $start, ${JSON.stringify(cls)})`)
        for (const d of dynamic) this.emit(`for (const $r of $k.rootNodes(${ctx.parent}, $start)) $k.style($r, ${JSON.stringify(d[0])}, () => ${d[1]})`)
      } else {
        this.emit(`${ctx.parent}.classList.add(${JSON.stringify(cls)})`)
        for (const d of dynamic) this.emit(`$k.style(${ctx.parent}, ${JSON.stringify(d[0])}, () => ${d[1]})`)
      }
    }
  }

  private newClass(): string {
    return `${this.prefix}-${(++this.classes).toString(36)}`
  }

  /** animation name, 2s, loop … + steps → @keyframes and a class .ka-name that plays it. */
  private animationDef(i: Extract<Stmt, { k: 'animation-def' }>) {
    const steps: string[] = []
    for (const f of i.frames) {
      const before = this.css.length
      this.optionsToCss('@@', 'box', f.meaning!.options.filter((o) => !o.name.startsWith('hover:')), undefined, [])
      const decls = this.css.splice(before).map((r) => /^@@\{(.*)\}$/.exec(r)?.[1]).filter(Boolean)
      steps.push(`${f.state}{${decls.join(';')}}`)
    }
    let duration = '1s', delay = '', count = '1', ease = 'cubic-bezier(.16,1,.3,1)', direction = '', onScroll = false
    for (const it of i.options) {
      const vals = it.atoms.map((a) => literal(a, this.info.colors))
      const [w, x] = vals
      if (typeof w === 'string' && /^[\d.]+m?s$/.test(w)) duration = w
      else if (w === 'loop' || w === 'boucle') count = 'infinite'
      else if (w === 'delay' || w === 'delai') delay = String(x ?? '0s')
      else if (w === 'linear' || w === 'lineaire') ease = 'linear'
      else if (w === 'smooth' || w === 'doux') ease = 'ease-in-out'
      else if (w === 'bounce' || w === 'rebond') ease = 'cubic-bezier(.34,1.56,.64,1)'
      else if (w === 'steps' || w === 'etapes') ease = `steps(${x ?? 10},end)`
      else if (w === 'alternate' || w === 'aller-retour') direction = 'alternate'
      else if (w === 'times' || w === 'fois') count = String(x ?? 1)
      else if (w === 'scroll' || w === 'defilement') onScroll = true
      else if (typeof w === 'number') count = String(w)
    }
    const anim = `ks-${i.name}`
    this.css.push(`@keyframes ${anim}{${steps.join('')}}`)
    const rule = onScroll
      ? `animation:${anim} linear both;animation-timeline:view();animation-range:entry 0% cover 45%`
      : `animation:${anim} ${duration} ${ease} ${delay || '0s'} ${count} ${direction || 'normal'} both`
    this.css.push(`.ka-${i.name}{${rule}}`)
    this.css.push(`@media (prefers-reduced-motion:reduce){.ka-${i.name}{animation:none}}`)
  }

  /** style/mobile/… lines → CSS rules for a selector; returns the dynamic ones. */
  private styleRules(selector: string, head: string, rules: Command[]): [string, string][] {
    const dynamic: [string, string][] = []
    for (const r of rules) {
      const where = r.head === 'style' ? undefined : MEDIA[r.head]
      this.optionsToCss(selector, head, r.meaning!.options, where, dynamic)
      for (const e of r.children) {
        if (e.k === 'command' && e.meaning && (e.meaning.kind === 'screen' || e.meaning.kind === 'style')) {
          this.optionsToCss(selector, head, e.meaning.options, e.head === 'style' ? where : MEDIA[e.head], dynamic)
        }
      }
    }
    return dynamic
  }

  private optionsToCss(sel: string, head: string, options: ResolvedOption[], media: string | undefined, dynamic: [string, string][]) {
    const normal: string[] = []
    const hover: string[] = []
    const tr: string[] = []
    const trHover: string[] = []
    let explicitColor = false
    for (const o of options) {
      const isHover = o.name.startsWith('hover:')
      const name = isHover ? o.name.slice(6) : o.name
      if (NON_STYLE.has(name) && !isHover) continue
      const vals = o.values.map((v) => literal(v, this.info.colors))
      if (vals.some((v) => v === undefined) && o.values.length) {
        // computed value: applied live
        if (!isHover && !media) {
          const prop = DYNAMIC_PROP[name]
          if (prop) {
            const e = this.ex(o.values[0])
            dynamic.push([name === 'tint' && !TEXT_HEADS.has(head) ? 'background' : prop, PX_UNIT.has(name) ? `$k.px(${e})` : e])
          }
        }
        continue
      }
      const { decl, transform } = declarations(head, name, vals, this.info.colors)
      if (name === 'color') explicitColor = true
      const into = isHover ? hover : normal
      for (const [p, v] of decl) {
        if (p === 'color' && explicitColor && name !== 'color' && !isHover) continue
        if (p === 'font-family') {
          const m = /^"([^"]+)"/.exec(v)
          if (m) this.fonts.add(m[1])
        }
        into.push(`${p}:${v}`)
      }
      if (transform) (isHover ? trHover : tr).push(transform)
    }
    if (tr.length) normal.push(`transform:${tr.join(' ')}`)
    if (trHover.length) hover.push(`transform:${trHover.join(' ')}`)
    const add = (s: string, decls: string[]) => {
      if (!decls.length) return
      // inside a mobile/tablet rule, double the class to win over the defaults
      if (media && /^\.[\w-]+$/.test(s)) s = s + s
      const rule = `${s}{${decls.join(';')}}`
      this.css.push(media ? `${media}{${rule}}` : rule)
    }
    if (options.some((o) => o.name === 'grain')) {
      const page = sel === 'body'
      this.css.push(`${sel}::after{content:"";position:${page ? 'fixed' : 'absolute'};inset:0;z-index:60;pointer-events:none;opacity:.4;mix-blend-mode:multiply;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3CfeColorMatrix values='0 0 0 0 0.11 0 0 0 0 0.1 0 0 0 0 0.1 0 0 0 0.05 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")}`)
      if (!page) normal.push('position:relative')
    }
    add(sel, dedupe(normal))
    if (hover.length) {
      add(sel, ['transition:transform .35s cubic-bezier(.2,.7,.2,1), box-shadow .35s, background .35s, color .35s, opacity .35s'])
      add(`${sel}:hover`, dedupe(hover))
    }
  }

  private commandView(c: Command, ctx: Ctx) {
    const m = c.meaning!
    const parent = ctx.parent!
    if (m.kind === 'component') {
      const n = this.fresh()
      const args = m.positional.map((p) => `() => ${this.ex(p)}`)
      let slot = 'null'
      if (c.children.length) {
        const fn = this.fresh('slot')
        this.emit(`const ${fn} = ($parent) => {`, c.pos)
        this.indent++
        this.content(c.children, { ...ctx, parent: '$parent' }, 'box')
        this.indent--
        this.emit('}')
        slot = fn
      }
      this.emit(`const ${n} = $k.component(${parent}, ${jsName(c.head)}, [${args.join(', ')}], ${slot})`, c.pos)
      if (c.action) this.event(`${n}[0]`, 'click', c.action, ctx)
      return
    }
    if (m.kind === 'event') {
      const ev: Record<string, string> = { 'on-click': 'click', 'on-hover': 'mouseenter', 'on-scroll': 'scroll', 'on-load': 'mount' }
      this.event(ctx.target ?? parent, ev[c.head], c.action ?? [], ctx)
      return
    }
    if (m.kind === 'motion') {
      this.emit(`$k.motion(${ctx.target ?? parent}, ${JSON.stringify(c.head)}, ${this.motionOptions(c)})`, c.pos)
      return
    }
    if (m.kind === 'setting') {
      switch (c.head) {
        case 'light':
          this.emit(`$k.setting(${ctx.target ?? parent}, "light", ${JSON.stringify(this.words(c))})`, c.pos)
          return
        case 'camera':
          this.emit(`$k.setting(${ctx.target ?? parent}, "camera", ${JSON.stringify(this.words(c))}, ${this.objectOptions(m.options)})`, c.pos)
          return
        case 'seo':
          this.emit(`$k.seo(${this.seo(c)})`, c.pos)
          return
      }
      return
    }
    this.element(c, ctx)
  }

  private words(c: Command): string {
    return c.meaning!.positional.map((x) => (x.k === 'name' ? canon(x.name) ?? canonValue(x.name) : String(literal(x, {})))).join('-')
  }

  private motionOptions(c: Command): string {
    const m = c.meaning!
    const props: string[] = []
    for (const o of m.options) props.push(`${jsKey(o.name)}: ${o.values.length ? this.motionValue(o.values[0]) : 'true'}`)
    if (m.positional.length) {
      const p0 = m.positional[0]
      if (p0.k === 'number') props.push(`speed: ${p0.v}`, `unit: ${JSON.stringify(p0.unit ?? '')}`)
      else if (p0.k === 'name' && !p0.binding) props.push(`word: ${JSON.stringify(canon(p0.name) ?? canonValue(p0.name))}`)
      else props.push(`value: ${this.ex(p0)}`)
      if (m.positional[1]) props.push(`value2: ${this.ex(m.positional[1])}`)
    }
    return `{ ${props.join(', ')} }`
  }

  private motionValue(e: Expr): string {
    if (e.k === 'number') return e.unit === 's' ? String(e.v * 1000) : String(e.v)
    if (e.k === 'name' && !e.binding) return JSON.stringify(canon(e.name) ?? canonValue(e.name))
    return this.ex(e)
  }

  private objectOptions(options: ResolvedOption[]): string {
    const props: string[] = []
    for (const o of options) {
      const isColor = ['background', 'fog', 'ground', 'color', 'tint'].includes(o.name)
      const vals = o.values.map((v) => (isColor ? this.exValue(v)
        : v.k === 'name' && !v.binding ? JSON.stringify(canon(v.name) ?? canonValue(v.name))
          : o.name === 'fallback' ? this.exPath(v) : this.exValue(v)))
      props.push(`${jsKey(o.name)}: ${vals.length === 0 ? 'true' : vals.length === 1 ? vals[0] : `[${vals.join(', ')}]`}`)
    }
    return `{ ${props.join(', ')} }`
  }

  /** File path: "photo.jpg" becomes "/photo.jpg" (valid on every page). */
  private exPath(v: Expr | undefined): string {
    if (!v) return 'null'
    const l = v.k === 'text' ? literal(v, {}) : undefined
    if (typeof l === 'string') return JSON.stringify(assetPath(l))
    return `$k.path(${this.ex(v)})`
  }

  /** Option value: named colors resolved. */
  private exValue(v: Expr): string {
    const l = literal(v, this.info.colors)
    if (l !== undefined && (v.k === 'name' || v.k === 'color')) return JSON.stringify(l)
    if (v.k === 'number' && v.unit === 's') return String(v.v * 1000)
    return this.ex(v)
  }

  private event(target: string, type: string, action: Stmt[], ctx: Ctx) {
    this.emit(`$k.on(${target}, ${JSON.stringify(type)}, ${this.handler(action, { ...ctx, target: ctx.target ?? target })})`)
  }

  /** An action as a function expression: its body is emitted on the lines that follow. */
  private handler(action: Stmt[], ctx: Ctx): string {
    const asy = bodyHasAwait(action) ? 'async ' : ''
    const name = this.fresh('act')
    this.emit(`const ${name} = ${asy}($event) => {`)
    this.indent++
    this.localDeclarations(action)
    for (const a of action) this.statement(a, { view: false, target: ctx.target })
    this.indent--
    this.emit('}')
    return name
  }

  /** A command used as an action: jump, spin, says "…", sound "click.mp3". */
  private commandAction(c: Command, ctx: Ctx) {
    const m = c.meaning
    if (!m) return
    if (m.kind === 'motion') {
      let target = ctx.target ?? 'null'
      const p0 = m.positional[0]
      if (p0 && p0.k === 'name' && p0.binding?.kind === 'object') target = `$k.namedObject(${JSON.stringify(p0.name)})`
      this.emit(`$k.action(${target}, ${JSON.stringify(c.head)}, ${this.motionOptions(c)})`, c.pos)
      return
    }
    if (c.head === 'sound') {
      this.emit(`$k.playSound(${this.exPath(m.positional[0])}, ${this.objectOptions(m.options)})`, c.pos)
      return
    }
    if (c.head === 'light') {
      this.emit(`$k.setting(${ctx.target ?? 'null'}, "light", ${JSON.stringify(this.words(c))})`, c.pos)
      return
    }
    this.emit(`$k.report(new Error(${JSON.stringify(`"${c.rawHead}" cannot be an action.`)}))`, c.pos)
  }

  // ---------------------------------------------------------------- elements
  private element(c: Command, ctx: Ctx) {
    const m = c.meaning!
    const head = c.head
    const parent = ctx.parent!
    const n = this.fresh()
    const p = m.positional
    const opt = (name: string) => m.options.find((o) => o.name === name)
    this.srcLine = c.pos.line

    // ---- immersion ----
    if (head === 'object' || head === 'character') {
      this.emit(`const ${n} = $k.object(${parent}, { kind: ${JSON.stringify(head)}, src: ${this.exPath(p[0])}, name: ${JSON.stringify(m.objectName ?? null)}, options: ${this.objectOptions(m.options)} })`, c.pos)
      this.styleClass(n, head, m.options, ['size', 'position', 'rotation', 'height', 'fallback', 'shadows', 'alt', 'animation'])
      this.childrenOf(c, { ...ctx, parent: n, target: n, parentHead: head })
      if (c.action) this.event(n, 'click', c.action, { ...ctx, target: n })
      return
    }
    if (head === 'scene') {
      this.emit(`const ${n} = $k.scene(${parent}, ${this.objectOptions(m.options.filter((o) => ['height', 'background', 'fog', 'ground', 'particles', 'immediate'].includes(o.name)))})`, c.pos)
      if (m.objectName) this.emit(`${n}.id = ${JSON.stringify(m.objectName)}`)
      this.styleClass(n, head, m.options, ['height', 'background', 'fog', 'ground', 'particles', 'immediate'])
      this.childrenOf(c, { ...ctx, parent: n, target: n, parentHead: head })
      this.emit(`$k.sceneReady(${n})`)
      return
    }
    if (head === 'sound') {
      this.emit(`const ${n} = $k.sound(${parent}, ${this.exPath(p[0])}, ${this.objectOptions(m.options)})`, c.pos)
      return
    }

    // ---- web ----
    // a slot without options adds no element: the content given to the component goes right here
    if (head === 'slot' && !m.options.length && !c.children.length) {
      this.emit(`if ($p.$slot) $p.$slot(${parent})`, c.pos)
      return
    }
    let tag = ({
      details: 'details', embed: 'iframe',
      section: 'section', header: 'header', footer: 'footer', nav: 'nav', grid: 'div', column: 'div', row: 'div', box: 'div',
      card: 'article', title: 'h1', subtitle: 'h2', text: 'p', image: 'img', video: 'video', link: 'a', links: 'nav', logo: 'a',
      button: 'button', form: 'form', field: 'input', textarea: 'textarea', select: 'select', checkbox: 'input', list: 'ul',
      item: 'li', icon: 'span', divider: 'hr', spacer: 'div', slot: 'div', markdown: 'div',
    } as Record<string, string>)[head] ?? 'div'
    if (head === 'title') {
      const lvl = opt('level')?.values[0]
      if (lvl?.k === 'number') tag = `h${Math.min(6, Math.max(1, lvl.v))}`
    }
    if (head === 'button' && opt('to')) tag = 'a'
    {
      const t = opt('tag')?.values[0]
      const tv = t?.k === 'name' ? t.name : t?.k === 'text' ? literal(t, {}) : undefined
      if (typeof tv === 'string' && /^[a-z][a-z0-9-]*$/.test(tv)) tag = tv
    }
    let classes = [`k-${head}`]
    if (m.objectName) classes.push(`k-${head}-${m.objectName}`)
    for (const v of ['outline', 'ghost', 'large', 'small']) if (opt(v)) classes.push(`k-${v}`)
    // own classes replace the default look (the menu keeps the classes its script needs)
    const own = opt('class')?.values[0]
    let dynamicClass: Expr | undefined
    if (own) {
      const l = own.k === 'text' ? literal(own, {}) : undefined
      classes = head === 'links' ? ['k-links'] : []
      if (typeof l === 'string') classes.push(...l.split(/\s+/).filter(Boolean))
      else dynamicClass = own
    }
    // look "name": a class of your own added to the default look (styled in a css block)
    let dynamicLook: Expr | undefined
    const look = opt('look')?.values[0]
    if (look) {
      const l = look.k === 'text' ? literal(look, {}) : undefined
      if (typeof l === 'string') classes.push(...l.split(/\s+/).filter(Boolean))
      else dynamicLook = look
    }

    // fields with a label: the label wraps the field
    let into = parent
    const isField = ['field', 'textarea', 'select', 'checkbox'].includes(head)
    const label = isField ? opt('label')?.values[0] ?? (head === 'checkbox' ? p[1] : undefined) : undefined
    let labelText: string | undefined
    if (label) {
      const l = this.fresh()
      this.emit(`const ${l} = $k.h(${parent}, "label", ${JSON.stringify(head === 'checkbox' ? 'k-label k-label-check' : 'k-label')})`)
      if (head !== 'checkbox') {
        const sp = this.fresh()
        this.emit(`const ${sp} = $k.h(${l}, "span")`)
        this.text(sp, label)
      } else labelText = this.fresh()
      into = l
    }
    this.emit(`const ${n} = $k.h(${into}, ${JSON.stringify(tag)}, ${JSON.stringify(classes.join(' '))})`, c.pos)
    if (label && head === 'checkbox' && labelText) {
      this.emit(`const ${labelText} = $k.h(${into}, "span")`)
      this.text(labelText, label)
    }
    if (m.objectName) this.emit(`${n}.id = ${JSON.stringify(m.objectName)}`)
    if (dynamicClass) this.emit(`$k.classes(${n}, () => ${this.ex(dynamicClass)})`)
    if (dynamicLook) this.emit(`$k.classes(${n}, () => ${this.ex(dynamicLook)})`)
    if (opt('id')) this.attr(n, 'id', opt('id')!.values[0])
    // states driven by a condition: hidden (x), selected (tab == 1), current (…), open (…)
    for (const [o, a, on, off] of [['hidden', 'hidden', 'true', 'null'], ['selected', 'aria-selected', '"true"', '"false"'], ['current', 'aria-current', '"page"', 'null'], ['open', 'open', 'true', 'null']] as const) {
      const v = opt(o)?.values[0]
      if (v && literal(v, {}) === undefined) this.emit(`$k.attr(${n}, ${JSON.stringify(a)}, () => (${this.ex(v)}) ? ${on} : ${off})`)
      else if (opt(o) && o !== 'hidden') this.emit(`${n}.setAttribute(${JSON.stringify(a)}, ${on === 'true' ? '""' : on})`)
      // a selected button is a tab (aria-selected belongs to tabs)
      if (o === 'selected' && opt(o) && head === 'button') this.emit(`${n}.setAttribute("role", "tab")`)
    }
    for (const a of m.options.filter((o) => o.name === 'attr')) {
      const nameLit = a.values[0]?.k === 'text' ? literal(a.values[0], {}) : a.values[0]?.k === 'name' ? (a.values[0] as any).name : undefined
      if (typeof nameLit !== 'string') continue
      if (a.values[1]) this.attr(n, nameLit, a.values[1])
      else this.emit(`${n}.setAttribute(${JSON.stringify(nameLit)}, "")`)
    }
    const html = opt('html')
    if (html) {
      // content written in HTML: kept as is while hydrating
      const src = html.values[0] ?? p[0]
      if (src) this.emit(`$k.html(${n}, () => ${this.ex(src)})`)
    }

    this.skipText = !!html
    switch (head) {
      case 'title':
      case 'subtitle':
      case 'text':
      case 'item':
      case 'icon':
        if (p.length) this.text(n, p[0])
        if (head === 'icon') this.emit(`${n}.setAttribute("aria-hidden", "true")`)
        break
      case 'button':
        if (p.length) this.text(n, p[0])
        if (opt('to')) this.attr(n, 'href', opt('to')!.values[0])
        else this.emit(`${n}.type = ${JSON.stringify(ctx.parentHead === 'form' && !c.action ? 'submit' : 'button')}`)
        {
          const d = opt('disabled')
          if (d) this.emit(`$k.attr(${n}, "disabled", () => ${d.values[0] ? this.ex(d.values[0]) : 'true'})`)
        }
        break
      case 'link': {
        this.text(n, p[0])
        this.attr(n, 'href', p[1] ?? p[0])
        if (opt('new-tab')) this.emit(`${n}.target = "_blank"; ${n}.rel = "noopener"`)
        break
      }
      case 'image': {
        const alt = opt('alt')?.values[0] ?? p[1]
        if (alt) this.attr(n, 'alt', alt)
        else this.emit(`${n}.alt = ""`)
        this.image(n, p[0])
        if (opt('cover')) this.emit(`${n}.classList.add("k-cover")`)
        break
      }
      case 'video': {
        this.attr(n, 'src', p[0])
        const auto = !!opt('autoplay')
        if (auto || opt('muted')) this.emit(`${n}.muted = true; ${n}.setAttribute("muted", "")`)
        if (auto) this.emit(`${n}.autoplay = true; ${n}.setAttribute("autoplay", ""); ${n}.setAttribute("playsinline", "")`)
        if (opt('loop')) this.emit(`${n}.loop = true; ${n}.setAttribute("loop", "")`)
        if (opt('controls') || !auto) this.emit(`${n}.controls = true; ${n}.setAttribute("controls", "")`)
        if (opt('cover')) this.emit(`${n}.classList.add("k-cover")`)
        break
      }
      case 'card': {
        if (p.length && p.some((x) => !(x.k === 'text' && literal(x, {}) !== undefined))) {
          // computed values: the runtime recognizes the image (.jpg, .png…) when displaying
          this.emit(`$k.card(${n}, [${p.map((x) => `() => ${this.ex(x)}`).join(', ')}])`)
          break
        }
        const img = p.find((x) => isImage(x))
        const texts = p.filter((x) => x !== img)
        if (img) {
          const i2 = this.fresh()
          this.emit(`const ${i2} = $k.h(${n}, "img", "k-card-image")`)
          if (texts[0]) this.attr(i2, 'alt', texts[0])
          else this.emit(`${i2}.alt = ""`)
          this.image(i2, img)
        }
        if (texts[0]) {
          const t2 = this.fresh()
          this.emit(`const ${t2} = $k.h(${n}, "h3", "k-card-title")`)
          this.text(t2, texts[0])
        }
        if (texts[1]) {
          const t3 = this.fresh()
          this.emit(`const ${t3} = $k.h(${n}, "p", "k-card-text")`)
          this.text(t3, texts[1])
        }
        break
      }
      case 'links': {
        for (const x of p) {
          const a = this.fresh()
          this.emit(`const ${a} = $k.h(${n}, "a", "k-nav-link")`)
          if (x.k === 'name' && (!x.binding || x.binding.kind === 'component')) {
            this.emit(`$k.setText(${a}, ${JSON.stringify(x.name.replace(/-/g, ' '))})`)
            this.emit(`$k.autoLink(${a}, ${JSON.stringify(x.name)})`)
          } else if (x.k === 'text') {
            this.text(a, x)
            this.emit(`$k.autoLink(${a}, ${JSON.stringify(String(literal(x, {}) ?? ''))})`)
          } else this.text(a, x)
        }
        // in a header: collapsible menu on phones
        if (p.length >= 3 && ['header', 'section', 'nav'].includes(ctx.parentHead ?? '')) this.emit(`$k.mobileMenu(${n})`)
        break
      }
      case 'logo': {
        this.emit(`${n}.setAttribute("href", "/"); ${n}.setAttribute("aria-label", ${JSON.stringify(this.site.name ? `${this.site.name} — home` : 'Home')})`)
        const x = p[0]
        if (x && isImage(x)) {
          const i2 = this.fresh()
          this.emit(`const ${i2} = $k.h(${n}, "img", "k-logo-image")`)
          this.emit(`${i2}.alt = ${JSON.stringify(this.site.name ?? 'Logo')}`)
          this.image(i2, x, true)
          // logo "mark.svg" "Kaury": the mark and the name
          if (p[1]) {
            const t2 = this.fresh()
            this.emit(`const ${t2} = $k.h(${n}, "span", "k-logo-text")`)
            this.text(t2, p[1])
          }
        } else if (x) this.text(n, x)
        break
      }
      case 'spacer':
        if (p[0]) this.emit(`${n}.style.height = $k.px(${this.ex(p[0])})`)
        break
      case 'details': {
        // details "Question": the content below shows when it is opened
        const s2 = this.fresh()
        this.emit(`const ${s2} = $k.h(${n}, "summary", "k-summary")`)
        if (p[0]) this.text(s2, p[0])
        break
      }
      case 'embed':
        // the page inside loads only when it comes near the screen (never during the first paint)
        if (p[0]) this.emit(`$k.frame(${n}, () => ${this.ex(p[0])})`)
        if (p[1]) this.attr(n, 'title', p[1])
        this.emit(`${n}.setAttribute("loading", "lazy")`)
        break
      case 'slot':
        this.emit(`$k.slot(${n}, $p.$slot)`)
        break
      case 'markdown':
        if (p[0]) this.emit(`$k.markdown(${n}, () => ${this.ex(p[0])})`)
        break
      case 'field':
      case 'textarea':
      case 'select':
      case 'checkbox':
        this.field(c, n)
        break
      case 'grid':
        if (p[0]?.k === 'number' && !opt('columns')) m.options.push({ name: 'columns', values: [p[0]], pos: p[0].pos })
        break
    }

    this.skipText = false
    // « center » in a row centers what is inside, it does not push the neighbours away (no auto margins)
    if (ctx.parentHead === 'row' && m.options.some((o) => o.name === 'center') && !m.options.some((o) => o.name === 'margin')) {
      m.options.push({ name: 'margin', values: [{ k: 'number', v: 0, pos: c.pos } as Expr], pos: c.pos })
    }
    this.styleClass(n, head, m.options, [])
    this.childrenOf(c, { ...ctx, parent: n, target: n, parentHead: head })
    const mail = head === 'form' ? opt('mail') : undefined
    if (mail?.values[0]) {
      // form mail "hello@bloom.ch" -> …: sent by e-mail through the site's own endpoint, then the action runs
      const to = mail.values[0]
      const l = literal(to, {})
      if (typeof l === 'string') this.mails.push(l)
      const subject = opt('subject')?.values[0]
      this.emit(`$k.form(${n})`)
      this.emit(`$k.mail(${n}, () => ${this.ex(to)}, ${subject ? `() => ${this.ex(subject)}` : 'null'}, ${c.action ? this.handler(c.action, { ...ctx, target: n }) : 'null'})`, c.pos)
      return
    }
    if (c.action) {
      const ev = head === 'form' ? 'submit' : ['field', 'textarea'].includes(head) ? 'input' : ['select', 'checkbox'].includes(head) ? 'change' : 'click'
      this.event(n, ev, c.action, { ...ctx, target: n })
    }
    if (head === 'form') this.emit(`$k.form(${n})`)
  }

  private image(n: string, src: Expr, eager = false) {
    // the first images of a page are probably visible at once: they load first (logos aside)
    let priority = 1
    if (this.repeated) priority = 0
    else if (!eager) {
      priority = this.imagesInPage === 0 ? 2 : this.imagesInPage < 3 ? 1 : 0
      this.imagesInPage++
    }
    const l = src.k === 'text' ? literal(src, {}) : undefined
    const value = typeof l === 'string' ? JSON.stringify(assetPath(l)) : `() => ${this.ex(src)}`
    this.emit(`$k.img(${n}, ${value}, ${priority})`)
  }

  private field(c: Command, n: string) {
    const m = c.meaning!
    const p = m.positional
    const st = p[0]
    const opt = (name: string) => m.options.find((o) => o.name === name)
    const ref = st && st.k === 'name' ? this.target(st) : undefined
    if (st?.k === 'name') this.emit(`${n}.name = ${JSON.stringify(st.name)}`)
    if (c.head === 'field' || c.head === 'textarea') {
      if (p[1]) this.attr(n, 'placeholder', p[1])
      const type = opt('type')?.values[0]
      const types: Record<string, string> = { text: 'text', email: 'email', number: 'number', password: 'password', date: 'date', tel: 'tel', url: 'url', search: 'search' }
      const tv = type?.k === 'name' ? types[canonValue(type.name)] ?? 'text' : 'text'
      if (c.head === 'field') this.emit(`${n}.type = ${JSON.stringify(tv)}`)
      if (opt('rows')) this.emit(`${n}.rows = ${this.ex(opt('rows')!.values[0])}`)
      if (ref) this.emit(`$k.bind(${n}, () => ${ref}, ($v) => { ${ref} = $v }${tv === 'number' ? ', "number"' : ''})`)
      if (!opt('label') && p[1]) this.attr(n, 'aria-label', p[1])
    } else if (c.head === 'select') {
      const choices = p.slice(1)
      this.emit(`$k.options(${n}, () => [${choices.map((x) => (x.k === 'list' ? `...${this.ex(x)}` : x.k === 'name' && x.binding ? `...$k.toList(${this.ex(x)})` : this.ex(x))).join(', ')}])`)
      if (ref) this.emit(`$k.bind(${n}, () => ${ref}, ($v) => { ${ref} = $v })`)
      if (!opt('label') && st?.k === 'name') this.emit(`${n}.setAttribute("aria-label", ${JSON.stringify(st.name)})`)
    } else if (c.head === 'checkbox') {
      this.emit(`${n}.type = "checkbox"`)
      if (ref) this.emit(`$k.bindCheck(${n}, () => ${ref}, ($v) => { ${ref} = $v })`)
    }
    if (opt('required')) this.emit(`${n}.required = true`)
  }

  private childrenOf(c: Command, ctx: Ctx) {
    if (c.children.length) this.content(c.children, ctx, c.head)
  }

  /** Style options of an element → a generated class. */
  private styleClass(n: string, head: string, options: ResolvedOption[], ignore: string[]) {
    const opts = options.filter((o) => !ignore.includes(o.name) && !NON_STYLE.has(o.name.replace('hover:', '')))
    if (!opts.length) return
    const cls = this.newClass()
    const dynamic: [string, string][] = []
    this.optionsToCss('.' + cls, head, opts, undefined, dynamic)
    this.emit(`${n}.classList.add(${JSON.stringify(cls)})`)
    for (const d of dynamic) this.emit(`$k.style(${n}, ${JSON.stringify(d[0])}, () => ${d[1]})`)
  }

  private skipText = false
  private text(n: string, e: Expr | undefined) {
    if (!e || this.skipText) return
    const l = e.k === 'text' || e.k === 'number' ? literal(e, {}) : undefined
    // "One file. An *immersive* website." → emphasis, without writing HTML
    if (typeof l === 'string' && /\*[^*\s]([^*\n]*[^*\s])?\*/.test(l)) {
      const h = l.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\*([^*\s](?:[^*\n]*[^*\s])?)\*/g, '<em>$1</em>').replace(/\n/g, '<br>')
      this.emit(`$k.html(${n}, () => ${JSON.stringify(h)})`)
    } else if (l !== undefined) this.emit(`$k.setText(${n}, ${JSON.stringify(String(l))})`)
    else this.emit(`$k.text(${n}, () => ${this.ex(e)})`)
  }

  private attr(n: string, name: string, e: Expr) {
    let l = e.k === 'text' ? literal(e, {}) : undefined
    if (l !== undefined && (name === 'src' || name === 'poster')) l = assetPath(String(l))
    if (l !== undefined) this.emit(`${n}.setAttribute(${JSON.stringify(name)}, ${JSON.stringify(String(l))})`)
    else if (name === 'src' || name === 'poster') this.emit(`$k.attr(${n}, ${JSON.stringify(name)}, () => $k.path(${this.ex(e)}))`)
    else this.emit(`$k.attr(${n}, ${JSON.stringify(name)}, () => ${this.ex(e)})`)
  }

  private ifView(i: Extract<Stmt, { k: 'if' }>, ctx: Ctx) {
    const branches: string[] = []
    const fn = (body: Stmt[]) => {
      const name = this.fresh('br')
      this.emit(`const ${name} = ($parent) => {`)
      this.indent++
      this.content(body, { ...ctx, parent: '$parent' }, ctx.parentHead ?? 'box')
      this.indent--
      this.emit('}')
      return name
    }
    branches.push(`[() => ${this.ex(i.cond)}, ${fn(i.then)}]`)
    for (const x of i.elifs) branches.push(`[() => ${this.ex(x.cond)}, ${fn(x.body)}]`)
    if (i.else) branches.push(`[() => true, ${fn(i.else)}]`)
    this.emit(`$k.when(${ctx.parent}, [${branches.join(', ')}])`, i.pos)
  }

  private forView(i: Extract<Stmt, { k: 'for' }>, ctx: Ctx) {
    const v = jsName(i.variable)
    const idx = i.index ? jsName(i.index) : '$i'
    this.emit(`$k.each(${ctx.parent}, () => ${this.ex(i.source)}, (${v}, ${idx}, $parent) => {`, i.pos)
    this.indent++
    this.repeated++
    this.content(i.body, { ...ctx, parent: '$parent' }, ctx.parentHead ?? 'box')
    this.repeated--
    this.indent--
    this.emit('})')
  }

  // ---------------------------------------------------------------- expressions
  ex(e: Expr): string {
    switch (e.k) {
      case 'number':
        if (e.unit === 's') return String(e.v * 1000)
        if (!e.unit || ['ms', 'px', 'deg', '/s'].includes(e.unit)) return String(e.v)
        return JSON.stringify(`${e.v}${e.unit}`)
      case 'text': {
        if (e.parts.every((m) => typeof m === 'string')) return JSON.stringify((e.parts as string[]).join(''))
        return '`' + e.parts.map((m) => (typeof m === 'string' ? m.replace(/[`\\]|\$\{/g, (x) => '\\' + x) : `\${$k.t(${this.ex(m)})}`)).join('') + '`'
      }
      case 'color':
        return JSON.stringify(e.v)
      case 'bool':
        return e.v ? 'true' : 'false'
      case 'none':
        return 'null'
      case 'name': {
        const b = e.binding
        if (!b) return jsName(e.name)
        switch (b.kind) {
          case 'state':
          case 'derived':
            return `${jsName(e.name)}.v`
          case 'prop':
            return `$p[${JSON.stringify(e.name)}]`
          case 'kaury': {
            if (b.name === 'scroll') return '$k.scroll.v'
            return `$k.${globalSpec(b.name)?.js ?? jsName(b.name)}`
          }
          case 'object':
            return `$k.namedObject(${JSON.stringify(e.name)})`
          default:
            return jsName(e.name)
        }
      }
      case 'list':
        return `[${e.items.map((x) => this.ex(x)).join(', ')}]`
      case 'object':
        // always between parentheses: “() => ({ … })” is an object, “() => { … }” would be a block
        return `({ ${e.props.map((p) => (p.spread ? `...${this.ex(p.value)}` : `${jsKey(p.key)}: ${this.ex(p.value)}`)).join(', ')} })`
      case 'member': {
        const o = this.ex(e.object)
        const m = kauryMethod(e.prop)
        if (m && PROPERTIES.has(m)) return `$k.prop(${o}, ${JSON.stringify(m)}, ${JSON.stringify(e.prop)})`
        if (/^[\p{L}_$][\p{L}\p{N}_$]*$/u.test(e.prop)) return `${o}${e.optional ? '?.' : '.'}${e.prop}`
        return `${o}${e.optional ? '?.' : ''}[${JSON.stringify(e.prop)}]`
      }
      case 'index':
        return `${this.ex(e.object)}[${this.ex(e.index)}]`
      case 'call': {
        if (e.fn.k === 'member') {
          const m = kauryMethod(e.fn.prop)
          if (m) return `$k.m(${this.ex(e.fn.object)}, ${JSON.stringify(m)}, ${JSON.stringify(e.fn.prop)}${e.args.map((a) => ', ' + this.ex(a)).join('')})`
        }
        if (e.fn.k === 'name' && e.fn.binding?.kind === 'kaury' && e.fn.binding.name === 'persist') {
          // persist "cart", cart: pass the state itself, not its value
          return `$k.persist(${e.args.map((a) => (a.k === 'name' && a.binding?.kind === 'state' ? jsName(a.name) : this.ex(a))).join(', ')})`
        }
        return `${this.ex(e.fn)}(${e.args.map((a) => this.ex(a)).join(', ')})`
      }
      case 'binary': {
        const l = this.ex(e.l)
        const r = this.ex(e.r)
        switch (e.op) {
          case '==': return `$k.equal(${l}, ${r})`
          case '!=': return `!$k.equal(${l}, ${r})`
          case 'in': return `$k.has(${r}, ${l})`
          // two lists joined: [1, 2] + more → one list (numbers and texts add as usual)
          case '+': return [e.l.k, e.r.k].some((k) => k === 'number' || k === 'text') ? `(${l} + ${r})` : `$k.plus(${l}, ${r})`
          default: return `(${l} ${e.op} ${r})`
        }
      }
      case 'unary':
        return `${e.op}${this.ex(e.e)}`
      case 'spread':
        return `...${this.ex(e.e)}`
      case 'lambda': {
        const asy = Array.isArray(e.body) ? (bodyHasAwait(e.body) ? 'async ' : '') : hasAwait(e.body) ? 'async ' : ''
        const params = `(${e.params.map(jsName).join(', ')})`
        if (!Array.isArray(e.body)) {
          const body = this.ex(e.body)
          return `${asy}${params} => ${body.startsWith('{') ? `(${body})` : body}`
        }
        // block body: generated apart
        const [savedL, savedS, savedI] = [this.lines, this.sources, this.indent]
        this.lines = []
        this.sources = []
        this.indent = 1
        this.localDeclarations(e.body)
        for (const i of e.body) this.statement(i, { view: false })
        const body = this.lines.join('\n')
        this.lines = savedL
        this.sources = savedS
        this.indent = savedI
        return `${asy}${params} => {\n${body}\n${'  '.repeat(this.indent)}}`
      }
      case 'await':
        if (e.e.k === 'number' && (e.e.unit === 's' || e.e.unit === 'ms' || !e.e.unit)) return `(await $k.delay(${this.ex(e.e)}))`
        return `(await ${this.ex(e.e)})`
      case 'if':
        return `(${this.ex(e.cond)} ? ${this.ex(e.then)} : ${this.ex(e.else)})`
      case 'range':
        return `$k.range(${this.ex(e.from)}, ${this.ex(e.to)})`
    }
  }
}

function isImage(e: Expr): boolean {
  if (e.k !== 'text') return false
  const l = e.parts.map((m) => (typeof m === 'string' ? m : '')).join('')
  return /\.(png|jpe?g|webp|avif|gif|svg)(\?.*)?$/i.test(l)
}

function dedupe(decls: string[]): string[] {
  const seen = new Map<string, string>()
  for (const d of decls) seen.set(d.slice(0, d.indexOf(':')), d)
  return [...seen.values()]
}

export function hasAwait(e: Expr): boolean {
  switch (e.k) {
    case 'await': return true
    case 'text': return e.parts.some((m) => typeof m !== 'string' && hasAwait(m))
    case 'list': return e.items.some(hasAwait)
    case 'object': return e.props.some((p) => hasAwait(p.value))
    case 'member': return hasAwait(e.object)
    case 'index': return hasAwait(e.object) || hasAwait(e.index)
    case 'call': return hasAwait(e.fn) || e.args.some(hasAwait)
    case 'binary': return hasAwait(e.l) || hasAwait(e.r)
    case 'unary': case 'spread': return hasAwait(e.e)
    case 'if': return hasAwait(e.cond) || hasAwait(e.then) || hasAwait(e.else)
    case 'range': return hasAwait(e.from) || hasAwait(e.to)
    default: return false // a lambda has its own scope
  }
}

export function bodyHasAwait(body: Stmt[]): boolean {
  for (const i of body) {
    switch (i.k) {
      case 'let': if (hasAwait(i.value)) return true; break
      case 'assign': if (hasAwait(i.value) || hasAwait(i.target)) return true; break
      case 'expr': if (hasAwait(i.e)) return true; break
      case 'return': if (i.value && hasAwait(i.value)) return true; break
      case 'if': if (hasAwait(i.cond) || bodyHasAwait(i.then) || i.elifs.some((x) => hasAwait(x.cond) || bodyHasAwait(x.body)) || (i.else && bodyHasAwait(i.else))) return true; break
      case 'for': if (hasAwait(i.source) || bodyHasAwait(i.body)) return true; break
      case 'while': if (hasAwait(i.cond) || bodyHasAwait(i.body)) return true; break
      case 'try': if (bodyHasAwait(i.body) || (i.handler && bodyHasAwait(i.handler))) return true; break
      case 'go': if (hasAwait(i.path)) return true; break
    }
  }
  return false
}
