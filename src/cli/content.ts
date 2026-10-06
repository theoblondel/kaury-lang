// Content collections: “import posts from "./content/blog/*/index.mdx"”.
// Reads YAML, JSON and Markdown/MDX files (front matter + body), copies the images they point to,
// and gives each entry a “slug” (the file name, or its folder name for index files).

import { existsSync, readdirSync, readFileSync, statSync, mkdirSync, copyFileSync } from 'node:fs'
import { join, dirname, basename, extname, resolve, sep } from 'node:path'
import { createHash } from 'node:crypto'
import { parse as parseYaml } from 'yaml'

export const CONTENT_SOURCE = /(\*|\.(md|mdx|mdoc|markdown|ya?ml)$)/i
const IMAGE = /\.(png|jpe?g|webp|avif|gif|svg)$/i

export interface LoadedContent {
  id: string
  list: boolean
  data: any
  files: string[]
}

/** Expands a simple glob (* inside path segments, no **). */
function expand(pattern: string): string[] {
  const abs = resolve(pattern)
  const parts = abs.split(/[\\/]/)
  let current = [parts[0] + sep]
  for (const part of parts.slice(1)) {
    if (!part) continue
    const next: string[] = []
    if (part.includes('*')) {
      const re = new RegExp('^' + part.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$')
      for (const dir of current) {
        if (!existsSync(dir) || !statSync(dir).isDirectory()) continue
        for (const f of readdirSync(dir).sort()) if (re.test(f) && !f.startsWith('.')) next.push(join(dir, f))
      }
    } else for (const dir of current) next.push(join(dir, part))
    current = next.filter((p) => existsSync(p))
  }
  return current.filter((p) => statSync(p).isFile())
}

function slugOf(file: string): string {
  const base = basename(file, extname(file))
  return base === 'index' ? basename(dirname(file)) : base
}

function readEntry(file: string): any {
  // files saved on Windows (CRLF) read the same as the others
  const text = readFileSync(file, 'utf8').replace(/^﻿/, '').replace(/\r\n?/g, '\n')
  const ext = extname(file).toLowerCase()
  if (ext === '.json') return JSON.parse(text)
  if (ext === '.yaml' || ext === '.yml') return parseYaml(text) ?? {}
  // Markdown / MDX: front matter between --- lines, then the body
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(text)
  if (!m) return { body: text }
  return { ...(parseYaml(m[1]) ?? {}), body: m[2].replace(/^\s*import .+$/gm, '').trim() }
}

/** Copies the images an entry points to (relative paths) and rewrites them as site URLs. */
function images(value: any, fromDir: string, out: string): any {
  if (typeof value === 'string') {
    if (/^\.{1,2}\//.test(value) && IMAGE.test(value)) {
      const src = resolve(fromDir, value)
      if (!existsSync(src)) return value
      const name = createHash('sha1').update(src).digest('hex').slice(0, 8) + '-' + basename(src).replace(/[^\w.-]+/g, '-')
      const dest = join(out, '_kaury', 'content', name)
      mkdirSync(dirname(dest), { recursive: true })
      if (!existsSync(dest)) copyFileSync(src, dest)
      return `/_kaury/content/${name}`
    }
    return value
  }
  if (Array.isArray(value)) return value.map((v) => images(v, fromDir, out))
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    const r: any = {}
    for (const [k, v] of Object.entries(value)) r[k] = images(v, fromDir, out)
    return r
  }
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  return value
}

/**
 * When the entry was created and last changed (ISO dates). “created” gives the order entries were
 * added in (for an index file, its folder's creation), handy to break ties: posts.sort(p -> p.created).
 */
function dates(file: string): { created: string; updated: string } {
  const own = statSync(file)
  const created = basename(file, extname(file)) === 'index' ? statSync(dirname(file)).birthtimeMs : own.birthtimeMs
  return { created: new Date(created || own.mtimeMs).toISOString(), updated: new Date(own.mtimeMs).toISOString() }
}

const cache = new Map<string, LoadedContent>()

export function loadContent(pattern: string, out: string): LoadedContent {
  const key = pattern + '|' + out
  const hit = cache.get(key)
  if (hit) return hit
  const list = pattern.includes('*')
  const files = list ? expand(pattern) : [resolve(pattern)]
  const entries = files.map((f) => ({ slug: slugOf(f), ...dates(f), ...images(readEntry(f), dirname(f), out) }))
  const id = createHash('sha1').update(resolve(pattern)).digest('hex').slice(0, 10)
  const result: LoadedContent = { id, list, data: list ? entries : entries[0] ?? {}, files }
  cache.set(key, result)
  return result
}

export function clearContentCache() {
  cache.clear()
}
