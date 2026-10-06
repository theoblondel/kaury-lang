// Step 2 — the parser: turns tokens into a tree.
// Understands what is inside what: a title inside a section inside a page.

import { KauryError, closest, msg, q } from './errors.js'
import { tokenize, type Token } from './lexer.js'
import { canon, stripAccents } from './keywords.js'
import { styleOption } from './vocabulary.js'

/** Parts inside an element that a named style can describe: “link color rust”. */
export const STYLE_PARTS = ['title', 'subtitle', 'text', 'link', 'image', 'button', 'icon', 'code', 'block', 'list', 'item', 'table', 'cell', 'quote', 'summary', 'emphasis', 'logo']

/** States a named style can describe (French aliases included). */
export const STYLE_STATES: Record<string, string> = {
  selected: 'selected', selectionne: 'selected', current: 'current', courant: 'current', open: 'open', ouvert: 'open',
  focus: 'focus', pressed: 'pressed', appuye: 'pressed', disabled: 'disabled', desactive: 'disabled', checked: 'checked', coche: 'checked',
}
import type { Command, Expr, Stmt, Item, Param, Pos } from './ast.js'

/** Words that start a UI line (element, style, motion, event…). Canonical forms. */
export const UI_HEADS = new Set([
  // web
  'section', 'header', 'footer', 'nav', 'grid', 'column', 'row', 'box', 'card', 'title', 'subtitle',
  'text', 'image', 'video', 'link', 'links', 'logo', 'button', 'form', 'field', 'textarea', 'select', 'checkbox',
  'list', 'item', 'icon', 'divider', 'spacer', 'slot', 'markdown', 'details', 'embed', 'style', 'mobile', 'tablet', 'desktop', 'seo',
  'colors', 'font', 'fonts', 'lang', 'favicon', 'url', 'alternate', 'head', 'wrapper', 'base',
  // immersion
  'scene', 'object', 'character', 'light', 'camera', 'on', 'follows', 'enters', 'spin', 'float', 'jump',
  'pulse', 'sway', 'says', 'play', 'sound', 'transition', 'parallax',
])

/** Words that end an expression (never the start of an implicit argument). */
const INFIX_WORDS = new Set(['and', 'or', 'in', 'then', 'else', 'from', 'as'])

const ASSIGN_OPS = new Set(['=', '+=', '-=', '*=', '/=', '**='])

/** Two-word heads: on click, follows mouse, enters from. */
const COMPOUND: Record<string, string[]> = {
  on: ['click', 'hover', 'scroll', 'load'],
  follows: ['mouse'],
  enters: ['from'],
}

interface Flags {
  implicit: boolean // “f a, b” = call without parentheses
  item: boolean // inside a UI line: “->” ends it, no bare lambda
}

const FREE: Flags = { implicit: true, item: false }
const ITEM: Flags = { implicit: false, item: true }
const SIMPLE: Flags = { implicit: false, item: false }

export function parse(source: string): Stmt[] {
  return new Parser(tokenize(source)).program()
}

/** Parses a single expression (used for {…} interpolations inside texts). */
function parseInterpolation(code: string, line: number, column: number): Expr {
  let tokens: Token[]
  try {
    tokens = tokenize(code)
  } catch (e) {
    if (e instanceof KauryError) {
      e.line = line
      e.column = column + e.column - 1
    }
    throw e
  }
  for (const t of tokens) {
    t.line = line
    t.column = column + t.column - 1
    t.end = column + t.end - 1
  }
  const p = new Parser(tokens.filter((t) => t.t !== 'indent' && t.t !== 'dedent'))
  const e = p.expression(FREE)
  if (p.peek().t !== 'newline' && p.peek().t !== 'eof') {
    throw p.error(p.peek(), msg(`I don't understand ${q(p.peek().v)} in this interpolation.`, `je ne comprends pas ${q(p.peek().v)} dans cette insertion.`),
      msg('an interpolation holds a single expression: {price * 2}.', 'une insertion contient une seule expression : {prix * 2}.'))
  }
  return e
}

class Parser {
  private i = 0
  constructor(private tokens: Token[]) {}

  // ---------- helpers ----------
  peek(d = 0): Token {
    return this.tokens[Math.min(this.i + d, this.tokens.length - 1)]
  }
  private next(): Token {
    const t = this.tokens[this.i]
    if (this.i < this.tokens.length - 1) this.i++
    return t
  }
  private isOp(v: string, d = 0): boolean {
    const t = this.peek(d)
    return t.t === 'op' && t.v === v
  }
  private isWord(c: string, d = 0): boolean {
    const t = this.peek(d)
    return t.t === 'word' && canon(t.v) === c
  }
  private pos(t: Token): Pos {
    return { line: t.line, column: t.column, length: Math.max(1, t.end - t.column) }
  }
  error(t: Token, what: string, fix?: string): KauryError {
    return new KauryError(this.pos(t), what, fix)
  }
  private describe(t: Token): string {
    if (t.t === 'newline') return msg('the end of the line', 'la fin de la ligne')
    if (t.t === 'eof') return msg('the end of the file', 'la fin du fichier')
    if (t.t === 'indent') return msg('an indented block', 'un bloc indenté')
    if (t.t === 'dedent') return msg('the end of the block', 'la fin du bloc')
    if (t.t === 'text') return msg(`the text "${t.v}"`, `le texte "${t.v}"`)
    return q(t.v)
  }
  private expectOp(v: string, fix?: string): Token {
    if (!this.isOp(v)) throw this.error(this.peek(), msg(`${q(v)} is missing here (I see ${this.describe(this.peek())}).`, `il manque ${q(v)} ici (je vois ${this.describe(this.peek())}).`), fix)
    return this.next()
  }
  private expectWord(c: string, fix?: string): Token {
    if (!this.isWord(c)) throw this.error(this.peek(), msg(`the word ${q(c)} is missing here (I see ${this.describe(this.peek())}).`, `il manque le mot ${q(c)} ici (je vois ${this.describe(this.peek())}).`), fix)
    return this.next()
  }
  private expectName(role: string, fix?: string): Token {
    const t = this.peek()
    if (t.t !== 'word') throw this.error(t, msg(`a name is needed for ${role} (I see ${this.describe(t)}).`, `il faut un nom pour ${role} (je vois ${this.describe(t)}).`), fix)
    return this.next()
  }
  private endOfLine(fix?: string) {
    const t = this.peek()
    if (t.t === 'newline') {
      this.next()
      return
    }
    if (t.t === 'eof' || t.t === 'dedent') return
    if (t.t === 'op' && t.v === '=') {
      throw this.error(t, msg('“=” cannot be here.', '« = » ne peut pas être ici.'), msg('to compare two values, write “==”.', 'pour comparer deux valeurs, écris « == ».'))
    }
    throw this.error(t, msg(`I did not expect ${this.describe(t)} here.`, `je ne m'attendais pas à ${this.describe(t)} ici.`),
      fix ?? msg('start a new line, or separate the options with commas.', 'passe à la ligne, ou sépare les options par des virgules.'))
  }

  // ---------- program & blocks ----------
  program(): Stmt[] {
    const body: Stmt[] = []
    while (this.peek().t !== 'eof') {
      const t = this.peek()
      if (t.t === 'newline' || t.t === 'dedent') {
        this.next()
        continue
      }
      if (t.t === 'indent') {
        throw this.error(t, msg('this line is indented but belongs to no block.', 'cette ligne est indentée alors qu\'elle n\'appartient à aucun bloc.'),
          msg('remove the spaces at the start of the line, or put it under a line that opens a block (page, if, for…).', 'retire les espaces au début de la ligne, ou place-la sous une ligne qui ouvre un bloc (page, si, pour…).'))
      }
      body.push(this.statement())
    }
    return body
  }

  private block(what: string): Stmt[] {
    if (this.peek().t !== 'indent') {
      throw this.error(this.peek(), msg(`${what} expects an indented block below.`, `${what} attend un bloc indenté en dessous.`),
        msg('start a new line and indent the block content by 2 spaces.', 'passe à la ligne et indente de 2 espaces le contenu du bloc.'))
    }
    this.next()
    const body: Stmt[] = []
    while (this.peek().t !== 'dedent' && this.peek().t !== 'eof') {
      if (this.peek().t === 'newline') {
        this.next()
        continue
      }
      if (this.peek().t === 'indent') {
        throw this.error(this.peek(), msg('this line is indented too much.', 'cette ligne est trop indentée.'), msg('align it with the line above.', 'aligne-la avec la ligne au-dessus.'))
      }
      body.push(this.statement())
    }
    if (this.peek().t === 'dedent') this.next()
    return body
  }

  private optionalBlock(): Stmt[] {
    return this.peek().t === 'indent' ? this.block(msg('this line', 'cette ligne')) : []
  }

  // ---------- statements ----------
  private statement(inlineAction = false): Stmt {
    const t = this.peek()
    if (t.t === 'word') {
      const c = canon(t.v)
      switch (c) {
        case 'let':
        case 'state':
          if (this.peek(1).t === 'word') return this.declaration(c === 'state')
          break
        case 'function':
          return this.functionDecl()
        case 'if':
          return this.ifStmt()
        case 'else':
          throw this.error(t, msg('“else” without an “if” right above.', '« sinon » sans « si » juste au-dessus.'),
            msg('put “else” at the same level as its “if”, right after the “if” block.', 'place « sinon » au même niveau que son « si », juste après le bloc du « si ».'))
        case 'for':
          return this.forStmt()
        case 'while':
          return this.whileStmt()
        case 'try':
          return this.tryStmt()
        case 'import':
          return this.importStmt()
        case 'export':
          return this.exportStmt()
        case 'return': {
          this.next()
          const value = this.peek().t === 'newline' || this.peek().t === 'eof' ? undefined : this.expression(FREE)
          this.endOfLine()
          return { k: 'return', value, pos: this.pos(t) }
        }
        case 'break':
          this.next()
          this.endOfLine()
          return { k: 'break', pos: this.pos(t) }
        case 'continue':
          if (this.peek(1).t === 'newline' || this.peek(1).t === 'eof') {
            this.next()
            this.endOfLine()
            return { k: 'continue', pos: this.pos(t) }
          }
          break
        case 'open':
        case 'close':
        case 'toggle':
          if (this.peek(1).t === 'word' && this.peek(1).spaceBefore && !this.assignmentFollows()) {
            this.next()
            const target = this.expression(SIMPLE)
            this.endOfLine()
            return { k: 'toggle', mode: c, target, pos: this.pos(t) }
          }
          break
        case 'go':
          if (!this.assignmentFollows()) {
            this.next()
            const path = this.expression(FREE)
            this.endOfLine()
            return { k: 'go', path, pos: this.pos(t) }
          }
          break
        case 'js': {
          this.next()
          const raw = this.peek()
          if (raw.t !== 'raw') throw this.error(t, msg('“js” must be alone on its line, with the JavaScript code indented below.', '« js » doit être seul sur sa ligne, avec le code JavaScript indenté dessous.'))
          this.next()
          this.endOfLine()
          return { k: 'js', code: raw.v, pos: this.pos(t) }
        }
        case 'css': {
          this.next()
          const raw = this.peek()
          if (raw.t !== 'raw') throw this.error(t, msg('“css” must be alone on its line, with the CSS indented below.', '« css » doit être seul sur sa ligne, avec le CSS indenté dessous.'))
          this.next()
          this.endOfLine()
          return { k: 'css', code: raw.v, pos: this.pos(t) }
        }
        case 'component':
          return this.component()
        case 'animation':
          if (this.peek(1).t === 'word') return this.animationDef()
          break
        case 'style':
          // a named style: “style promise” alone on its line, options indented below
          if (this.peek(1).t === 'word' && this.peek(2).t === 'newline' && this.peek(3).t === 'indent') return this.styleDef()
          break
        case 'page':
          if (this.peek(1).t === 'text') return this.page()
          break
        case 'site':
          if (!this.assignmentFollows()) return this.site()
          break
      }
      if (this.isUiHead()) return this.command()
    }
    // expression or assignment
    const e = this.expression(FREE)
    const op = this.peek()
    if (op.t === 'op' && ASSIGN_OPS.has(op.v)) {
      if (e.k !== 'name' && e.k !== 'member' && e.k !== 'index') {
        throw this.error(op, msg('nothing can be stored on the left of this “=”.', 'on ne peut rien ranger à gauche de ce « = ».'),
          msg('the left of “=” must be a name: total = 3.', 'à gauche d\'un « = », il faut un nom : total = 3.'))
      }
      this.next()
      const value = this.expression(FREE)
      this.endOfLine()
      return { k: 'assign', target: e, op: op.v, value, pos: this.pos(t) }
    }
    if (op.t === 'op' && op.v === '->') {
      throw this.error(op, msg('“->” must follow a UI element or a parameter.', '« -> » doit suivre un élément d\'interface ou un paramètre.'),
        msg('examples: button "Ok" -> count += 1   or   sum list, a -> a.price', 'exemples : bouton "Ok" -> compteur += 1   ou   somme liste, a -> a.prix'))
    }
    if (!inlineAction && (this.peek().t === 'indent' || (this.peek().t === 'newline' && this.peek(1).t === 'indent'))) {
      // often a misspelled element: “secion” instead of “section”
      const word = e.k === 'name' ? e.name : e.k === 'call' && e.fn.k === 'name' ? e.fn.name : undefined
      const sug = word ? closest(word, [...UI_HEADS, 'component', 'function', 'page', 'site', 'for', 'if']) : undefined
      if (word && sug) {
        throw new KauryError({ ...e.pos, length: word.length }, msg(`${q(word)} is not a Kaury word.`, `${q(word)} n'est pas un mot de Kaury.`),
          msg(`did you mean ${q(sug)}?`, `tu voulais dire ${q(sug)} ?`))
      }
      throw this.error(this.peek(), msg('this indented block belongs to nothing.', 'ce bloc indenté n\'appartient à rien.'),
        msg('only page, section, if, for, function… open a block. Remove the indentation.', 'seuls page, section, si, pour, fonction… ouvrent un bloc. Retire l\'indentation.'))
    }
    this.endOfLine()
    return { k: 'expr', e, pos: this.pos(t) }
  }

  /** Is the next token an assignment (“site = 3”)? */
  private assignmentFollows(): boolean {
    const s = this.peek(1)
    return s.t === 'op' && (ASSIGN_OPS.has(s.v) || ((s.v === '.' || s.v === '(' || s.v === '[') && !s.spaceBefore))
  }

  private isUiHead(): boolean {
    const t = this.peek()
    if (t.t !== 'word') return false
    const s = this.peek(1)
    // “title = 3”, “title.x”, “title(…)”: names, not elements
    if (s.t === 'op' && !['->', ',', '-', '[', '{', '('].includes(s.v)) return false
    if (s.t === 'op' && (s.v === '(' || s.v === '[') && !s.spaceBefore) return false
    if (s.t === 'op' && s.v === '-' && s.spaceBefore) return false
    const c = canon(t.v)
    if (c && UI_HEADS.has(c)) return true
    // Component: capitalized name
    if (/^\p{Lu}/u.test(t.v)) {
      if (s.t === 'op' && (s.v === '.' || s.v === '(')) return false
      return true
    }
    return false
  }

  private declaration(reactive: boolean): Stmt {
    const t = this.next()
    const kw = t.v
    const name = this.expectName(reactive ? msg('this state', 'cet état') : msg('this variable', 'cette variable'), reactive ? 'state count = 0' : 'let tax = 8.1')
    if (!this.isOp('=')) {
      throw this.error(this.peek(), msg(`“=” is missing after ${q(name.v)}.`, `il manque « = » après ${q(name.v)}.`), `${kw} ${name.v} = 0`)
    }
    this.next()
    const value = this.expression(FREE)
    this.endOfLine()
    return { k: 'let', name: name.v, value, reactive, pos: this.pos(t) }
  }

  private params(end: (t: Token) => boolean): Param[] {
    const params: Param[] = []
    while (!end(this.peek())) {
      const p = this.peek()
      if (p.t !== 'word') throw this.error(p, msg(`a parameter must be a name (I see ${this.describe(p)}).`, `un paramètre doit être un nom (je vois ${this.describe(p)}).`), 'function double x then x * 2')
      this.next()
      let def: Expr | undefined
      if (this.isOp('=')) {
        this.next()
        def = this.expression(SIMPLE)
      }
      params.push({ name: p.v, default: def, pos: this.pos(p) })
      if (this.isOp(',')) this.next()
    }
    return params
  }

  private functionDecl(): Stmt {
    const t = this.next()
    const name = this.expectName(msg('the function', 'la fonction'), 'function double x then x * 2')
    const params = this.params((j) => j.t === 'newline' || j.t === 'eof' || (j.t === 'word' && canon(j.v) === 'then'))
    let body: Stmt[]
    if (this.isWord('then')) {
      const p = this.next()
      const e = this.expression(FREE)
      body = [{ k: 'return', value: e, pos: this.pos(p) }]
      this.endOfLine()
    } else {
      this.endOfLine()
      body = this.block(msg(`the function ${q(name.v)}`, `la fonction ${q(name.v)}`))
    }
    return { k: 'function', name: name.v, params, body, pos: this.pos(t) }
  }

  private ifBody(what: string): Stmt[] {
    // short form: “if x > 3 then count += 1”
    if (this.isWord('then')) {
      this.next()
      return [this.statement()]
    }
    this.endOfLine(msg('after the condition, start a new line (or write “then” for an action on the same line).', 'après la condition, passe à la ligne (ou écris « puis » pour une action sur la même ligne).'))
    return this.block(what)
  }

  private ifStmt(): Stmt {
    const t = this.next()
    const cond = this.condition()
    const then = this.ifBody('“if”')
    const elifs: { cond: Expr; body: Stmt[]; pos: Pos }[] = []
    let otherwise: Stmt[] | undefined
    while (this.isWord('else')) {
      const s = this.next()
      if (this.isWord('if')) {
        this.next()
        const c = this.condition()
        elifs.push({ cond: c, body: this.ifBody('“else if”'), pos: this.pos(s) })
      } else {
        otherwise = this.ifBody('“else”')
        break
      }
    }
    return { k: 'if', cond, then, elifs, else: otherwise, pos: this.pos(t) }
  }

  private condition(): Expr {
    const e = this.expression(FREE)
    if (this.isOp('=')) {
      throw this.error(this.peek(), msg('“=” stores a value; it does not compare.', '« = » range une valeur ; il ne compare pas.'), msg('to compare, write “==”.', 'pour comparer, écris « == ».'))
    }
    return e
  }

  private forStmt(): Stmt {
    const t = this.next()
    const v = this.expectName(msg('the loop variable', 'la variable de la boucle'), 'for p in products')
    let index: string | undefined
    if (this.isOp(',')) {
      this.next()
      index = this.expectName(msg('the loop counter', 'le numéro de tour'), 'for p, i in products').v
    }
    this.expectWord('in', `for ${v.v} in list`)
    const source = this.expression(FREE)
    this.endOfLine()
    const body = this.block('“for”')
    return { k: 'for', variable: v.v, index, source, body, pos: this.pos(t) }
  }

  private whileStmt(): Stmt {
    const t = this.next()
    if (t.v === 'tant') this.expectWord('que', 'tant que vies > 0')
    const cond = this.condition()
    this.endOfLine()
    const body = this.block('“while”')
    return { k: 'while', cond, body, pos: this.pos(t) }
  }

  private tryStmt(): Stmt {
    const t = this.next()
    this.endOfLine()
    const body = this.block('“try”')
    let variable: string | undefined
    let handler: Stmt[] | undefined
    if (this.isWord('catch')) {
      this.next()
      if (this.peek().t === 'word') variable = this.next().v
      this.endOfLine()
      handler = this.block('“catch”')
    }
    return { k: 'try', body, variable, handler, pos: this.pos(t) }
  }

  private importStmt(): Stmt {
    const t = this.next()
    const pos = this.pos(t)
    if (this.peek().t === 'text') {
      const source = this.next().v
      this.endOfLine()
      return { k: 'import', source, pos }
    }
    let def: string | undefined
    let names: { name: string; alias?: string }[] | undefined
    let all: string | undefined
    if (this.isOp('{')) {
      this.next()
      names = []
      while (!this.isOp('}')) {
        const n = this.expectName(msg('what to import', 'l\'élément à importer'), 'import { a, b } from "package"')
        let alias: string | undefined
        if (this.isWord('as')) {
          this.next()
          alias = this.expectName(msg('the new name', 'le nouveau nom')).v
        }
        names.push({ name: n.v, alias })
        if (this.isOp(',')) this.next()
      }
      this.next()
    } else if (this.isOp('*')) {
      this.next()
      this.expectWord('as', 'import * as THREE from "three"')
      all = this.expectName(msg('the module', 'le module')).v
    } else {
      def = this.expectName(msg('what to import', 'ce qu\'on importe'), 'import confetti from "canvas-confetti"').v
    }
    this.expectWord('from', 'import confetti from "canvas-confetti"')
    const s = this.peek()
    if (s.t !== 'text') throw this.error(s, msg('the package or file name must be a text.', 'le nom du paquet ou du fichier doit être un texte.'), 'import confetti from "canvas-confetti"')
    this.next()
    this.endOfLine()
    return { k: 'import', default: def, names, all, source: s.v, pos }
  }

  private exportStmt(): Stmt {
    const t = this.next()
    const d = this.statement()
    if (d.k === 'let' || d.k === 'function' || d.k === 'component') {
      d.exported = true
      return d
    }
    throw this.error(t, msg('only a variable, a function or a component can be exported.', 'on ne peut exporter qu\'une variable, une fonction ou un composant.'), 'export component Card name')
  }

  private component(): Stmt {
    const t = this.next()
    const name = this.expectName(msg('the component', 'le composant'), 'component Card name image')
    if (!/^\p{Lu}/u.test(name.v)) {
      throw this.error(name, msg(`a component starts with a capital letter: ${q(name.v)}.`, `un composant commence par une majuscule : ${q(name.v)}.`),
        `${t.v} ${name.v[0].toUpperCase() + name.v.slice(1)}`)
    }
    const params = this.params((j) => j.t === 'newline' || j.t === 'eof')
    this.endOfLine()
    const body = this.block(msg(`the component ${q(name.v)}`, `le composant ${q(name.v)}`))
    return { k: 'component', name: name.v, params, body, pos: this.pos(t) }
  }

  private page(): Stmt {
    const t = this.next()
    const c = this.peek()
    if (!c.v.startsWith('/')) throw this.error(c, msg(`a page address starts with “/”: ${q(c.v)}.`, `l'adresse d'une page commence par « / » : ${q(c.v)}.`), `page "/${c.v}"`)
    const address = this.primary(FREE) as Extract<Expr, { k: 'text' }>
    // “page "/blog/{post.slug}" for post in posts”: one page per item, built in advance
    let each: { variable: string; source: Expr } | undefined
    if (this.isWord('for')) {
      this.next()
      const v = this.expectName(msg('the page variable', 'la variable de la page'), 'page "/blog/{post.slug}" for post in posts')
      this.expectWord('in', 'page "/blog/{post.slug}" for post in posts')
      each = { variable: v.v, source: this.expression(FREE) }
    } else if (address.parts.some((p) => typeof p !== 'string')) {
      throw this.error(c, msg('an address with {…} needs “for … in …” to know which pages to build.', 'une adresse avec {…} a besoin de « for … in … » pour savoir quelles pages construire.'), 'page "/blog/{post.slug}" for post in posts')
    }
    this.endOfLine()
    const body = this.block(msg(`the page ${q(c.v)}`, `la page ${q(c.v)}`))
    return { k: 'page', path: c.v, address, each, body, pos: this.pos(t) }
  }

  private site(): Stmt {
    const t = this.next()
    let name: Expr | undefined
    if (this.peek().t !== 'newline') name = this.expression(SIMPLE)
    this.endOfLine()
    const body = this.optionalBlock()
    return { k: 'site', name, body, pos: this.pos(t) }
  }

  // ---------- UI lines ----------
  private command(): Command {
    const t = this.next()
    let head = /^\p{Lu}/u.test(t.v) ? t.v : canon(t.v) ?? t.v
    if (COMPOUND[head]) {
      const s = this.peek()
      const cs = s.t === 'word' ? canon(s.v) : undefined
      if (cs && COMPOUND[head].includes(cs)) {
        this.next()
        head = `${head}-${cs}`
      } else if (head === 'on') {
        throw this.error(s, msg('“on” must be followed by click, hover, scroll or load.', '« au » doit être suivi de clic, survol, defilement ou chargement.'), 'on click -> jump')
      }
    }
    return this.commandRest(t, head)
  }

  /**
   * style promise                     ← a named style, used like an option: column promise
   *   background paper, radius 24
   *   hover lift 4
   *   mobile padding 20
   */
  private styleDef(): Stmt {
    const t = this.next()
    const name = this.next()
    this.endOfLine()
    if (this.peek().t !== 'indent') throw this.error(this.peek(), msg(`the style ${q(name.v)} expects its options indented below.`, `le style ${q(name.v)} attend ses options indentées dessous.`), `style ${name.v}\n  background cream, radius 24`)
    this.next()
    const rules: Command[] = []
    while (this.peek().t !== 'dedent' && this.peek().t !== 'eof') {
      const lt = this.peek()
      if (lt.t === 'newline') {
        this.next()
        continue
      }
      const word = lt.t === 'word' ? stripAccents(lt.v).toLowerCase() : ''
      const screen = ['mobile', 'tablet', 'desktop'].includes(canon(lt.v) ?? lt.v)
      const state = STYLE_STATES[word]
      if (state) this.next()
      // “link color rust”: a part inside the element (followed by an option, not by a comma)
      const pw = this.peek()
      const pword = pw.t === 'word' ? canon(pw.v) ?? stripAccents(pw.v) : ''
      // a part is an element word (link, title…) or one of your own words (eyebrow), followed by an option
      const ownWord = !!pword && !styleOption(pword) && !STYLE_STATES[pword] && !['mobile', 'tablet', 'desktop', 'hover'].includes(pword) && /^[a-z][\w-]*$/.test(pword)
      const part = (STYLE_PARTS.includes(pword) || ownWord) && this.peek(1).t === 'word' ? pword : undefined
      if (part) this.next()
      if (state || part) {
        const r = this.commandRest(this.peek(), 'style')
        r.state = state
        r.part = part
        rules.push(r)
      } else rules.push(screen ? this.command() : this.commandRest(lt, 'style'))
    }
    if (this.peek().t === 'dedent') this.next()
    return { k: 'style-def', name: name.v, rules, pos: this.pos(t) }
  }

  /**
   * animation marquee, 30s, loop, linear      ← a named animation, used like an option: row marquee
   *   from move 0 0
   *   to move -50% 0
   */
  private animationDef(): Stmt {
    const t = this.next()
    const name = this.next()
    const options: Item[] = []
    while (this.isOp(',')) {
      this.next()
      options.push(this.item())
    }
    this.endOfLine()
    if (this.peek().t !== 'indent') throw this.error(this.peek(), msg(`the animation ${q(name.v)} expects its steps indented below (from …, to …).`, `l'animation ${q(name.v)} attend ses étapes indentées dessous (from …, to …).`), `animation ${name.v}, 2s, loop\n  from opacity 0\n  to opacity 1`)
    this.next()
    const frames: Command[] = []
    while (this.peek().t !== 'dedent' && this.peek().t !== 'eof') {
      const lt = this.next()
      if (lt.t === 'newline') continue
      const w = lt.t === 'word' ? canon(lt.v) ?? stripAccents(lt.v) : ''
      const at = w === 'from' || w === 'de' ? '0%' : w === 'to' || w === 'vers' || w === 'a' ? '100%' : lt.t === 'number' ? `${lt.v}%` : undefined
      if (!at) throw this.error(lt, msg('each step of an animation starts with from, to or a percentage (50%).', 'chaque étape d\'une animation commence par from, to ou un pourcentage (50%).'), '  50% move 0 -20')
      const r = this.commandRest(lt, 'style')
      r.state = at
      frames.push(r)
    }
    if (this.peek().t === 'dedent') this.next()
    return { k: 'animation-def', name: name.v, options, frames, pos: this.pos(t) }
  }

  /** The rest of a UI line once its head is known: items, action, children. */
  private commandRest(t: Token, head: string): Command {
    const items: Item[] = []
    let action: Stmt[] | undefined
    let children: Stmt[] = []
    while (true) {
      const v = this.peek()
      if (v.t === 'newline' || v.t === 'eof' || v.t === 'indent' || v.t === 'dedent') break
      if (v.t === 'op' && v.v === '->') break
      if (v.t === 'op' && v.v === ',') {
        if (!items.length && !head.includes('-')) {
          throw this.error(v, msg('unexpected comma right after the head word.', 'virgule inattendue juste après le mot de tête.'), `${t.v} "content", option`)
        }
        this.next()
        continue
      }
      items.push(this.item())
      const n = this.peek()
      if (n.t === 'op' && n.v === ',') {
        this.next()
        if (this.peek().t === 'newline') throw this.error(n, msg('this line ends with a comma.', 'cette ligne finit par une virgule.'), msg('remove the comma, or add the missing option.', 'retire la virgule, ou ajoute l\'option qui manque.'))
      }
    }
    if (this.isOp('->')) {
      const arrow = this.next()
      if (this.peek().t === 'newline') {
        this.next()
        action = this.block('“->”')
      } else if (this.peek().t === 'eof') {
        throw this.error(arrow, msg('“->” must be followed by an action.', '« -> » doit être suivi d\'une action.'), `${t.v} -> count += 1`)
      } else {
        action = [this.statement(true)]
        children = this.optionalBlock()
      }
    } else {
      this.endOfLine()
      children = this.optionalBlock()
      // « on click » with the action indented below, no « -> » needed
      if (head.startsWith('on-') && !items.length && children.length) {
        action = children
        children = []
      }
    }
    return { k: 'command', head, rawHead: t.v, items, action, children, pos: this.pos(t) }
  }

  private item(): Item {
    const start = this.peek()
    const atoms: Expr[] = []
    while (true) {
      const v = this.peek()
      if (v.t === 'newline' || v.t === 'eof' || v.t === 'indent' || v.t === 'dedent') break
      if (v.t === 'op' && (v.v === ',' || v.v === '->')) break
      if (v.t === 'op' && v.v === ')') throw this.error(v, msg('“)” without “(”.', '« ) » sans « ( ».'))
      atoms.push(this.expression(ITEM))
    }
    return { atoms, pos: this.pos(start) }
  }

  // ---------- expressions ----------
  expression(f: Flags): Expr {
    if (!f.item) {
      const t = this.peek()
      if (t.t === 'op' && t.v === '->') {
        this.next()
        return { k: 'lambda', params: [], body: this.lambdaBody(), pos: this.pos(t) }
      }
      if (t.t === 'word' && this.isOp('->', 1)) {
        this.next()
        this.next()
        return { k: 'lambda', params: [t.v], body: this.lambdaBody(), pos: this.pos(t) }
      }
      if (t.t === 'op' && t.v === '(') {
        const end = this.closingParen()
        if (end > 0 && this.tokens[end + 1]?.t === 'op' && this.tokens[end + 1].v === '->') {
          this.next()
          const params: string[] = []
          while (!this.isOp(')')) {
            params.push(this.expectName(msg('a parameter', 'un paramètre')).v)
            if (this.isOp(',')) this.next()
          }
          this.next()
          this.next()
          return { k: 'lambda', params, body: this.lambdaBody(), pos: this.pos(t) }
        }
      }
    }
    return this.ifExpression(f)
  }

  private lambdaBody(): Expr | Stmt[] {
    if (this.peek().t === 'newline' && this.peek(1).t === 'indent') {
      this.next()
      return this.block(msg('this function', 'cette fonction'))
    }
    if (this.peek().t === 'word' && this.isActionAhead()) return [this.statement()]
    return this.expression(FREE)
  }

  /** In a lambda, an assignment “-> total += 1” is an action. Also UI motions (-> jump). */
  private isActionAhead(): boolean {
    const t = this.peek()
    const c = canon(t.v)
    if (c && ['open', 'close', 'toggle', 'go'].includes(c)) return true
    let k = this.i
    let depth = 0
    while (k < this.tokens.length) {
      const x = this.tokens[k]
      if (x.t === 'newline' || x.t === 'eof') return false
      if (x.t === 'op') {
        if ('([{'.includes(x.v)) depth++
        else if (')]}'.includes(x.v)) {
          if (depth === 0) return false
          depth--
        } else if (depth === 0 && x.v === ',') return false
        else if (depth === 0 && ASSIGN_OPS.has(x.v)) return true
      }
      k++
    }
    return false
  }

  private closingParen(): number {
    let p = 0
    for (let k = this.i; k < this.tokens.length; k++) {
      const t = this.tokens[k]
      if (t.t === 'op' && '([{'.includes(t.v)) p++
      if (t.t === 'op' && ')]}'.includes(t.v)) {
        p--
        if (p === 0) return k
      }
      if (t.t === 'newline' || t.t === 'eof') return -1
    }
    return -1
  }

  private ifExpression(f: Flags): Expr {
    if (this.isWord('if')) {
      const t = this.next()
      const cond = this.or(f)
      this.expectWord('then', 'if age >= 18 then "adult" else "child"')
      const then = this.or(f)
      this.expectWord('else', 'if age >= 18 then "adult" else "child"')
      const otherwise = this.ifExpression(f)
      return { k: 'if', cond, then, else: otherwise, pos: this.pos(t) }
    }
    return this.or(f)
  }

  private or(f: Flags): Expr {
    let l = this.and(f)
    while (this.isWord('or') || this.isOp('??')) {
      const t = this.next()
      const op = t.v === '??' ? '??' : '||'
      l = { k: 'binary', op, l, r: this.and(f), pos: this.pos(t) }
    }
    return l
  }

  private and(f: Flags): Expr {
    let l = this.not(f)
    while (this.isWord('and')) {
      const t = this.next()
      l = { k: 'binary', op: '&&', l, r: this.not(f), pos: this.pos(t) }
    }
    return l
  }

  private not(f: Flags): Expr {
    if (this.isWord('not') || this.isOp('!')) {
      const t = this.next()
      return { k: 'unary', op: '!', e: this.not(f), pos: this.pos(t) }
    }
    return this.comparison(f)
  }

  private comparison(f: Flags): Expr {
    let l = this.range(f)
    while (true) {
      const t = this.peek()
      if (t.t === 'op' && ['==', '!=', '<', '>', '<=', '>='].includes(t.v)) {
        this.next()
        l = { k: 'binary', op: t.v, l, r: this.range(f), pos: this.pos(t) }
      } else if (t.t === 'word' && canon(t.v) === 'in' && !f.item) {
        this.next()
        l = { k: 'binary', op: 'in', l, r: this.range(f), pos: this.pos(t) }
      } else break
    }
    return l
  }

  private range(f: Flags): Expr {
    const l = this.additive(f)
    if (this.isOp('..')) {
      const t = this.next()
      return { k: 'range', from: l, to: this.additive(f), pos: this.pos(t) }
    }
    return l
  }

  private additive(f: Flags): Expr {
    let l = this.multiplicative(f)
    while (this.isOp('+') || this.isOp('-')) {
      const t = this.next()
      l = { k: 'binary', op: t.v, l, r: this.multiplicative(f), pos: this.pos(t) }
    }
    return l
  }

  private multiplicative(f: Flags): Expr {
    let l = this.power(f)
    while (this.isOp('*') || this.isOp('/') || this.isOp('%')) {
      const t = this.next()
      l = { k: 'binary', op: t.v, l, r: this.power(f), pos: this.pos(t) }
    }
    return l
  }

  private power(f: Flags): Expr {
    const l = this.unary(f)
    if (this.isOp('**')) {
      const t = this.next()
      return { k: 'binary', op: '**', l, r: this.power(f), pos: this.pos(t) }
    }
    return l
  }

  private unary(f: Flags): Expr {
    const t = this.peek()
    if (t.t === 'op' && t.v === '-') {
      this.next()
      return { k: 'unary', op: '-', e: this.unary(f), pos: this.pos(t) }
    }
    if (t.t === 'op' && t.v === '...') {
      this.next()
      return { k: 'spread', e: this.unary(f), pos: this.pos(t) }
    }
    if (t.t === 'word' && canon(t.v) === 'await') {
      this.next()
      return { k: 'await', e: this.unary({ ...f, implicit: !f.item }), pos: this.pos(t) }
    }
    return this.postfix(f)
  }

  private postfix(f: Flags): Expr {
    let e = this.primary(f)
    while (true) {
      const t = this.peek()
      if (t.t === 'op' && (t.v === '.' || t.v === '?.') && !t.spaceBefore) {
        this.next()
        const p = this.peek()
        if (p.t !== 'word') throw this.error(p, msg(`after ${q(t.v)}, a property name is needed.`, `après ${q(t.v)}, il faut un nom de propriété.`), 'product.price')
        this.next()
        e = { k: 'member', object: e, prop: p.v, optional: t.v === '?.', pos: this.pos(p) }
      } else if (t.t === 'op' && t.v === '(' && !t.spaceBefore) {
        this.next()
        const args: Expr[] = []
        while (!this.isOp(')')) {
          args.push(this.expression(FREE))
          if (this.isOp(',')) this.next()
          else if (!this.isOp(')')) throw this.error(this.peek(), msg('“,” or “)” is missing in this call.', 'il manque « , » ou « ) » dans cet appel.'), 'f(a, b)')
        }
        this.next()
        e = { k: 'call', fn: e, args, pos: this.pos(t) }
      } else if (t.t === 'op' && t.v === '[' && !t.spaceBefore) {
        this.next()
        const index = this.expression(FREE)
        this.expectOp(']')
        e = { k: 'index', object: e, index, pos: this.pos(t) }
      } else break
    }
    // implicit call: “print total”, “sum cart, a -> a.price”
    if (f.implicit && (e.k === 'name' || e.k === 'member') && this.argumentStarts()) {
      const args: Expr[] = []
      do {
        if (this.isOp(',')) this.next()
        args.push(this.expression(FREE))
      } while (this.isOp(','))
      e = { k: 'call', fn: e, args, pos: e.pos }
    }
    return e
  }

  private argumentStarts(): boolean {
    const t = this.peek()
    if (!t.spaceBefore) return false
    if (t.t === 'number' || t.t === 'text' || t.t === 'color') return true
    if (t.t === 'word') {
      const c = canon(t.v)
      return !(c && INFIX_WORDS.has(c))
    }
    if (t.t === 'op' && (t.v === '[' || t.v === '{' || t.v === '(' || t.v === '...' || t.v === '->')) return true
    return false
  }

  private primary(f: Flags): Expr {
    const t = this.peek()
    switch (t.t) {
      case 'number':
        this.next()
        return { k: 'number', v: Number(t.v), unit: t.unit, pos: this.pos(t) }
      case 'color':
        this.next()
        return { k: 'color', v: t.v, pos: this.pos(t) }
      case 'text': {
        this.next()
        const parts: (string | Expr)[] = []
        for (const m of t.parts ?? []) {
          if (m.code !== undefined) parts.push(parseInterpolation(m.code, m.line!, m.column!))
          else parts.push(m.text ?? '')
        }
        return { k: 'text', parts, pos: this.pos(t) }
      }
      case 'word': {
        const c = canon(t.v)
        if (c === 'true' || c === 'false') {
          this.next()
          return { k: 'bool', v: c === 'true', pos: this.pos(t) }
        }
        if (c === 'none') {
          this.next()
          return { k: 'none', pos: this.pos(t) }
        }
        if (c === 'if') return this.ifExpression(f)
        this.next()
        return { k: 'name', name: t.v, pos: this.pos(t) }
      }
      case 'op': {
        if (t.v === '(') {
          this.next()
          const e = this.expression(FREE)
          this.expectOp(')')
          return e
        }
        if (t.v === '[') {
          this.next()
          const items: Expr[] = []
          while (!this.isOp(']')) {
            items.push(this.expression(FREE))
            if (this.isOp(',')) this.next()
            else if (!this.isOp(']')) throw this.error(this.peek(), msg('“,” is missing between two list items.', 'il manque « , » entre deux éléments de la liste.'), '[1, 2, 3]')
          }
          this.next()
          return { k: 'list', items, pos: this.pos(t) }
        }
        if (t.v === '{') {
          this.next()
          const props: { key: string; value: Expr; spread?: boolean }[] = []
          while (!this.isOp('}')) {
            if (this.isOp('...')) {
              this.next()
              props.push({ key: '', value: this.expression(FREE), spread: true })
            } else {
              const k = this.peek()
              if (k.t !== 'word' && k.t !== 'text' && k.t !== 'number') throw this.error(k, msg('an object key must be a name.', 'une clé d\'objet doit être un nom.'), '{ name: "Strawberry", price: 4 }')
              this.next()
              if (this.isOp(':')) {
                this.next()
                props.push({ key: k.v, value: this.expression(FREE) })
              } else if (k.t === 'word') {
                props.push({ key: k.v, value: { k: 'name', name: k.v, pos: this.pos(k) } })
              } else throw this.error(this.peek(), msg(`“:” is missing after the key ${q(k.v)}.`, `il manque « : » après la clé ${q(k.v)}.`), '{ name: "Strawberry" }')
            }
            if (this.isOp(',')) this.next()
            else if (!this.isOp('}')) throw this.error(this.peek(), msg('“,” is missing between two properties.', 'il manque « , » entre deux propriétés.'), '{ name: "Strawberry", price: 4 }')
          }
          this.next()
          return { k: 'object', props, pos: this.pos(t) }
        }
        if (t.v === '->') throw this.error(t, msg('“->” without a parameter before it.', '« -> » sans paramètre devant.'), 'x -> x * 2')
        break
      }
    }
    throw this.error(t, msg(`I expected a value, but I see ${this.describe(t)}.`, `je m'attendais à une valeur, mais je vois ${this.describe(t)}.`),
      t.t === 'indent' ? msg('this line may be indented too much.', 'cette ligne est peut-être trop indentée.') : msg('a number, a "text", a name, a [list] or an {object}.', 'un nombre, un "texte", un nom, une [liste] ou un {objet}.'))
  }
}
