// A site in several languages: `lang "fr", "en"` in `site`, then `translate "en"` with the texts of the file and
// their translation, two by two. The file is written once, in its first language; every page is built once per
// language (“/menu” and “/en/menu”), and a text written in the file takes, in each page, its translation.
//
// A text is found by what it says: “Merci {name} !” matches “Merci {name} !” whatever the line. What is between
// braces in a translation is taken from the text it translates (the same name, read in the same place).

import type { Expr, Pos } from './ast.js'

export type TextExpr = Extract<Expr, { k: 'text' }>

/** A translation written in a `translate` block. */
export interface Translation {
  to: TextExpr
  pos: Pos
  used: boolean
}

/** text of the file (its key) → language → its translation */
export type Dictionary = Map<string, Map<string, Translation>>

/** How a value between braces is written, the same way wherever it is: the key of the place it holds in a text. */
export function exprKey(e: Expr): string {
  switch (e.k) {
    case 'name': return e.name
    case 'number': return `${e.v}${e.unit ?? ''}`
    case 'bool': return String(e.v)
    case 'none': return 'none'
    case 'color': return e.v
    case 'text': return JSON.stringify(textKey(e))
    case 'member': return `${exprKey(e.object)}${e.optional ? '?.' : '.'}${e.prop}`
    case 'index': return `${exprKey(e.object)}[${exprKey(e.index)}]`
    case 'call': return `${exprKey(e.fn)}(${e.args.map(exprKey).join(', ')})`
    case 'binary': return `${exprKey(e.l)} ${e.op} ${exprKey(e.r)}`
    case 'unary': return `${e.op} ${exprKey(e.e)}`
    case 'list': return `[${e.items.map(exprKey).join(', ')}]`
    case 'if': return `if ${exprKey(e.cond)} then ${exprKey(e.then)} else ${exprKey(e.else)}`
    default: return e.k
  }
}

/** The key of a text: what it says, its values written between braces. */
export function textKey(t: TextExpr): string {
  return t.parts.map((p) => (typeof p === 'string' ? p : `{${exprKey(p)}}`)).join('')
}

/** The values between braces of a text, by their key. */
export function holes(t: TextExpr): Map<string, Expr> {
  const out = new Map<string, Expr>()
  for (const p of t.parts) if (typeof p !== 'string') out.set(exprKey(p), p)
  return out
}

/** A translation as a text of the page: its values between braces are those of the text it translates. */
export function translatedText(source: TextExpr, to: TextExpr): TextExpr {
  const own = holes(source)
  return { k: 'text', parts: to.parts.map((p) => (typeof p === 'string' ? p : own.get(exprKey(p)) ?? p)), pos: source.pos }
}

/** Whether a value holds a translated text (a list of dishes written in the file): it then has one version per language. */
export function holdsTranslation(e: Expr | undefined): boolean {
  if (!e) return false
  switch (e.k) {
    case 'text': return !!e.translated || e.parts.some((p) => typeof p !== 'string' && holdsTranslation(p))
    case 'list': return e.items.some(holdsTranslation)
    case 'object': return e.props.some((p) => holdsTranslation(p.value))
    case 'member': return holdsTranslation(e.object)
    case 'index': return holdsTranslation(e.object) || holdsTranslation(e.index)
    case 'call': return holdsTranslation(e.fn) || e.args.some(holdsTranslation)
    case 'binary': return holdsTranslation(e.l) || holdsTranslation(e.r)
    case 'unary': return holdsTranslation(e.e)
    case 'if': return holdsTranslation(e.cond) || holdsTranslation(e.then) || holdsTranslation(e.else)
    case 'spread': return holdsTranslation(e.e)
    default: return false
  }
}

/** "/menu" in "en" → "/en/menu"; the first language keeps the address as it is. */
export function pathIn(path: string, lang: string, first: boolean): string {
  if (first) return path
  return path === '/' ? `/${lang}` : `/${lang}${path}`
}
