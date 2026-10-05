// Aides pour les tests : compiler un programme et l'exécuter dans Node.

import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { compile, formateErreurs } from '../src/noyau/index.js'

const RUNTIME = pathToFileURL(resolve('src/runtime/index.ts')).href
const TMP = resolve('tests/.tmp')
let n = 0

/** Compile et exécute un programme Kaury ; renvoie ce qu'il a affiché. */
export async function execute(source: string): Promise<{ sortie: string[]; module: any }> {
  const r = compile(source, { fichier: 'test.kaury', runtime: RUNTIME })
  if (!r.ok) throw new Error(formateErreurs(r, source))
  mkdirSync(TMP, { recursive: true })
  const f = join(TMP, `prog-${process.pid}-${++n}.mjs`)
  writeFileSync(f, r.js)
  const sortie: string[] = []
  const log = console.log
  console.log = (...a: unknown[]) => sortie.push(a.map((x) => (typeof x === 'string' ? x : JSON.stringify(x))).join(' '))
  try {
    const module = await import(pathToFileURL(f).href)
    return { sortie, module }
  } finally {
    console.log = log
    rmSync(f, { force: true })
  }
}

/** Compile et renvoie les erreurs (messages complets). */
export function erreurs(source: string): string[] {
  const r = compile(source, { fichier: 'test.kaury' })
  return r.erreurs.map((e) => e.formate(source))
}
