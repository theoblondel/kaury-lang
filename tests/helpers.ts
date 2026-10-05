// Test helpers: compile a program and run it in Node.

import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { compile, formatErrors, setLanguage } from '../src/core/index.js'

setLanguage('en')
const RUNTIME = pathToFileURL(resolve('src/runtime/index.ts')).href
const TMP = resolve('tests/.tmp')
let n = 0

/** Compiles and runs a Kaury program; returns what it printed. */
export async function run(source: string): Promise<{ output: string[]; module: any }> {
  const r = compile(source, { file: 'test.kaury', runtime: RUNTIME })
  if (!r.ok) throw new Error(formatErrors(r, source))
  mkdirSync(TMP, { recursive: true })
  const f = join(TMP, `prog-${process.pid}-${++n}.mjs`)
  writeFileSync(f, r.js)
  const output: string[] = []
  const log = console.log
  console.log = (...a: unknown[]) => output.push(a.map((x) => (typeof x === 'string' ? x : JSON.stringify(x))).join(' '))
  try {
    const module = await import(pathToFileURL(f).href)
    return { output, module }
  } finally {
    console.log = log
    rmSync(f, { force: true })
  }
}

/** Compiles and returns the errors (full messages). */
export function errors(source: string): string[] {
  const r = compile(source, { file: 'test.kaury' })
  return r.errors.map((e) => e.format(source))
}
