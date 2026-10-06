// Kaury compiler entry point: .kaury text → { js, css, errors }.

import { parse } from './parser.js'
import { KauryError } from './errors.js'
import { check, type ModuleInfo } from './checker.js'
import { generate, type Output } from './codegen.js'
import type { Stmt, Pos } from './ast.js'
import { BLOCKS } from './blocks.js'

export { KauryError, KauryErrors, setLanguage, getLanguage, msg } from './errors.js'
export { tokenize } from './lexer.js'
export { parse } from './parser.js'
export { check } from './checker.js'
export { generate, jsName, assetPath } from './codegen.js'
export { fontUrl } from './css.js'
export * as vocabulary from './vocabulary.js'
export * as keywords from './keywords.js'
export * as globals from './globals.js'
export { BLOCKS } from './blocks.js'

export interface Result {
  ok: boolean
  js: string
  css: string
  errors: KauryError[]
  warnings: KauryError[]
  info?: ModuleInfo
  ast?: Stmt[]
  fonts: string[]
  site: { name?: string; lang?: string; base?: string }
  assets: string[]
  mails: string[]
  map: { generated: number; source: number }[]
}

export interface CompileOptions {
  file?: string
  runtime?: string // module imported by the generated code (default "kaury/runtime")
  checkOnly?: boolean
}

export function compile(source: string, options: CompileOptions = {}): Result {
  const empty: Result = { ok: false, js: '', css: '', errors: [], warnings: [], fonts: [], site: {}, assets: [], mails: [], map: [] }
  let ast: Stmt[]
  try {
    ast = parse(source)
  } catch (e) {
    if (e instanceof KauryError) {
      e.file = options.file
      return { ...empty, errors: [e] }
    }
    throw e
  }
  ast = withBlocks(ast)
  const { errors, warnings, info } = check(ast, { file: options.file })
  if (errors.length || options.checkOnly) return { ...empty, ok: !errors.length, errors, warnings, info, ast }
  const out: Output = generate(ast, info, { file: options.file, runtime: options.runtime })
  return { ok: true, js: out.js, css: out.css, errors: [], warnings, info, ast, fonts: out.fonts, site: out.site, assets: out.assets, mails: out.mails, map: out.map }
}

/**
 * Adds the ready-made components (Hero, Pricing, Contact…) the program uses without writing or importing them.
 * Their lines point at the first line that uses them: an error at run time shows where the block is called.
 */
function withBlocks(ast: Stmt[]): Stmt[] {
  const used = new Map<string, Pos>()
  const visit = (x: any) => {
    if (!x || typeof x !== 'object') return
    if (Array.isArray(x)) return x.forEach(visit)
    if (x.k === 'command' && typeof x.head === 'string' && /^\p{Lu}/u.test(x.head) && !used.has(x.head)) used.set(x.head, x.pos)
    for (const key in x) if (key !== 'pos' && key !== 'binding' && key !== 'meaning') visit(x[key])
  }
  visit(ast)
  const defined = new Set<string>()
  const styles = new Set<string>()
  for (const s of ast) {
    if (s.k === 'component') defined.add(s.name)
    if (s.k === 'import') for (const n of [s.default, s.all, ...(s.names ?? []).map((x) => x.alias ?? x.name)]) if (n) defined.add(n)
    if (s.k === 'style-def') styles.add(s.name)
  }
  const added: Stmt[] = []
  for (const name of Object.keys(BLOCKS)) {
    const at = used.get(name)
    if (!at || defined.has(name)) continue
    for (const s of parse(BLOCKS[name].source)) {
      if (s.k === 'style-def') {
        if (styles.has(s.name)) continue
        styles.add(s.name)
      }
      added.push(relocate(s, at))
    }
  }
  return added.length ? [...ast, ...added] : ast
}

function relocate<T>(x: T, at: Pos): T {
  if (!x || typeof x !== 'object') return x
  if (Array.isArray(x)) return x.map((y) => relocate(y, at)) as T
  const out: any = {}
  for (const [k, v] of Object.entries(x)) out[k] = k === 'pos' ? { ...at, length: 0 } : relocate(v, at)
  return out
}

/** Readable message for all the problems of a compilation. */
export function formatErrors(r: Result, source: string): string {
  return [...r.errors, ...r.warnings].map((e) => e.format(source)).join('\n\n')
}

/** Source map v3: each JS line → its .kaury line. */
export function sourceMap(r: Result, file: string, source: string): string {
  const vlq = (n: number) => {
    let v = n < 0 ? (-n << 1) | 1 : n << 1
    let s = ''
    do {
      let d = v & 31
      v >>>= 5
      if (v) d |= 32
      s += 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'[d]
    } while (v)
    return s
  }
  let prev = 0
  const lines: string[] = []
  for (const c of r.map) {
    const src = c.source - 1
    lines.push(vlq(0) + vlq(0) + vlq(src - prev) + vlq(0))
    prev = src
  }
  return JSON.stringify({ version: 3, file: file + '.js', sources: [file], sourcesContent: [source], names: [], mappings: lines.join(';') })
}
