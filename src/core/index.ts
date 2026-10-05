// Kaury compiler entry point: .kaury text → { js, css, errors }.

import { parse } from './parser.js'
import { KauryError } from './errors.js'
import { check, type ModuleInfo } from './checker.js'
import { generate, type Output } from './codegen.js'
import type { Stmt } from './ast.js'

export { KauryError, KauryErrors, setLanguage, getLanguage, msg } from './errors.js'
export { tokenize } from './lexer.js'
export { parse } from './parser.js'
export { check } from './checker.js'
export { generate, jsName, assetPath } from './codegen.js'
export { fontUrl } from './css.js'
export * as vocabulary from './vocabulary.js'
export * as keywords from './keywords.js'
export * as globals from './globals.js'

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
  map: { generated: number; source: number }[]
}

export interface CompileOptions {
  file?: string
  runtime?: string // module imported by the generated code (default "kaury/runtime")
  checkOnly?: boolean
}

export function compile(source: string, options: CompileOptions = {}): Result {
  const empty: Result = { ok: false, js: '', css: '', errors: [], warnings: [], fonts: [], site: {}, assets: [], map: [] }
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
  const { errors, warnings, info } = check(ast, { file: options.file })
  if (errors.length || options.checkOnly) return { ...empty, ok: !errors.length, errors, warnings, info, ast }
  const out: Output = generate(ast, info, { file: options.file, runtime: options.runtime })
  return { ok: true, js: out.js, css: out.css, errors: [], warnings, info, ast, fonts: out.fonts, site: out.site, assets: out.assets, map: out.map }
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
