// Built-in functions available in every Kaury program.

import { raw, batch, Cell, effect, onCleanup } from './reactive.js'

const inBrowser = () => typeof window !== 'undefined' && !(globalThis as any).__kaurySSR

let locale = 'en'
/** Language of the site (used to format numbers, prices and dates). */
export function setLocale(l: string | undefined) {
  if (l) locale = l
}

export function t(v: unknown): string {
  if (v === null || v === undefined) return ''
  if (Array.isArray(v)) return v.map(t).join(', ')
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : String(Math.round(v * 100) / 100)
  if (v instanceof Date) return formatDate(v)
  if (typeof v === 'object') {
    try {
      return JSON.stringify(raw(v))
    } catch {
      return String(v)
    }
  }
  return String(v)
}

export function print(...values: unknown[]) {
  console.log(...values.map((v) => (typeof v === 'object' && v !== null ? raw(v) : v)))
}

export class NetworkError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export async function load(url: string, options: RequestInit = {}): Promise<any> {
  let r: Response
  try {
    r = await fetch(url, options)
  } catch {
    throw new NetworkError(`cannot reach "${url}" (connection lost?).`, 0)
  }
  if (!r.ok) throw new NetworkError(`"${url}" answered ${r.status} ${r.statusText}.`, r.status)
  const type = r.headers.get('content-type') ?? ''
  if (type.includes('json') || /\.json(\?|$)/.test(url)) return r.json()
  return r.text()
}

export async function send(url: string, data: unknown = {}, method = 'POST'): Promise<any> {
  const body = data instanceof FormData ? data : JSON.stringify(raw(data))
  const headers: Record<string, string> = data instanceof FormData ? {} : { 'Content-Type': 'application/json' }
  return load(url, { method, body: body as any, headers })
}

const valuesOf = (list: any, fn?: (x: any) => any): any[] => {
  const l = toList(list)
  return fn ? l.map(fn) : l
}
export const sum = (list: any, fn?: (x: any) => number) => valuesOf(list, fn).reduce((a: number, b: any) => a + (Number(b) || 0), 0)
export const average = (list: any, fn?: (x: any) => number) => {
  const v = valuesOf(list, fn)
  return v.length ? sum(v) / v.length : 0
}
export const min = (...a: any[]) => Math.min(...(a.length === 1 && Array.isArray(raw(a[0])) ? toList(a[0]) : a))
export const max = (...a: any[]) => Math.max(...(a.length === 1 && Array.isArray(raw(a[0])) ? toList(a[0]) : a))
export const round = (x: number, decimals = 0) => {
  const f = 10 ** decimals
  return Math.round(x * f) / f
}
export const floor = Math.floor
export const ceil = Math.ceil
export const abs = Math.abs
export const sqrt = Math.sqrt
export function random(a?: number, b?: number): number {
  if (a === undefined) return Math.random()
  if (b === undefined) return Math.floor(Math.random() * a) + 1
  return Math.floor(Math.random() * (b - a + 1)) + a
}
export const pick = (list: any) => {
  const l = toList(list)
  return l[Math.floor(Math.random() * l.length)]
}
export function length(x: any): number {
  if (x === null || x === undefined) return 0
  if (typeof x === 'string' || Array.isArray(x)) return x.length
  if (x instanceof Map || x instanceof Set) return x.size
  if (typeof x === 'object') return Object.keys(x).length
  return String(x).length
}
export const now = () => new Date()
export const toText = (x: unknown) => t(x)
export const toNumber = (x: unknown) => {
  const n = typeof x === 'string' ? Number(x.replace(/[\s']/g, '').replace(',', '.')) : Number(x)
  return Number.isNaN(n) ? 0 : n
}
export function price(x: number, currency = 'CHF'): string {
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(Number(x) || 0)
  } catch {
    return `${currency} ${(Number(x) || 0).toFixed(2)}`
  }
}
export function formatDate(d: Date | string | number, style: 'long' | 'short' | 'time' = 'long'): string {
  const date = d instanceof Date ? d : new Date(d)
  if (style === 'time') return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
  return date.toLocaleDateString(locale, style === 'long' ? { day: 'numeric', month: 'long', year: 'numeric' } : undefined)
}
export function shuffle<T>(list: T[]): T[] {
  const l = [...toList(list)]
  for (let i = l.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[l[i], l[j]] = [l[j], l[i]]
  }
  return l
}
export function range(a: number, b: number): number[] {
  const r: number[] = []
  if (a <= b) for (let i = a; i <= b; i++) r.push(i)
  else for (let i = a; i >= b; i--) r.push(i)
  return r
}
export function toList(x: any): any[] {
  if (x === null || x === undefined) return []
  if (Array.isArray(x)) return x
  if (typeof x === 'number') return range(1, x)
  if (typeof x === 'string') return [...x]
  if (typeof x[Symbol.iterator] === 'function') return [...x]
  if (typeof x === 'object') return Object.values(x)
  return [x]
}
export const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))

export function every(ms: number, fn: () => void): () => void {
  if (!inBrowser()) return () => {}
  const id = setInterval(() => batch(() => call(fn)), ms)
  const stop = () => clearInterval(id)
  onCleanup(stop)
  return stop
}
export function later(ms: number, fn: () => void): () => void {
  if (!inBrowser()) return () => {}
  const id = setTimeout(() => batch(() => call(fn)), ms)
  const stop = () => clearTimeout(id)
  onCleanup(stop)
  return stop
}

/** Keeps a state in the browser: it survives a page reload. */
export function persist(key: string, cell: Cell) {
  if (!inBrowser() || !(cell instanceof Cell)) return
  try {
    const s = localStorage.getItem('kaury:' + key)
    if (s !== null) cell.v = JSON.parse(s)
  } catch {
    /* storage unavailable */
  }
  effect(() => {
    // read through reactivity: every item and the length are tracked
    const v = JSON.stringify(cell.v)
    try {
      localStorage.setItem('kaury:' + key, v)
    } catch {
      /* storage full or blocked */
    }
  })
}

export async function copy(text: string) {
  await navigator.clipboard?.writeText(String(text))
}
export function vibrate(ms = 30) {
  navigator.vibrate?.(ms)
}
export function scrollTo(id: string) {
  const el = document.getElementById(String(id).replace(/^#/, ''))
  el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
export async function share(data: { title?: string; text?: string; url?: string } = {}) {
  const d = { title: data.title ?? document.title, text: data.text, url: data.url ?? location.href }
  if (navigator.share) return navigator.share(d)
  return copy(d.url)
}

let reportFn: (e: unknown) => void = (e) => console.error(e)
export function setReport(f: (e: unknown) => void) {
  reportFn = f
}
export function call(fn: any) {
  try {
    const r = fn()
    if (r && typeof r.catch === 'function') r.catch(reportFn)
    return r
  } catch (e) {
    reportFn(e)
  }
}

// ---------------- comparisons ----------------
export function equal(a: any, b: any): boolean {
  a = raw(a)
  b = raw(b)
  if (a === b) return true
  if (a === null || b === null || a === undefined || b === undefined) return a == b
  if (typeof a === 'object' && typeof b === 'object') {
    if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime()
    try {
      return JSON.stringify(a) === JSON.stringify(b)
    } catch {
      return false
    }
  }
  return false
}
/** x in container */
export function has(container: any, x: any): boolean {
  container = raw(container)
  if (container === null || container === undefined) return false
  if (typeof container === 'string') return container.includes(String(x))
  if (Array.isArray(container)) return container.some((y) => equal(x, y))
  if (container instanceof Set || container instanceof Map) return container.has(raw(x))
  if (typeof container === 'object') return String(x) in container
  return false
}

// ---------------- built-in properties and methods ----------------
export function prop(obj: any, name: string, original: string): any {
  if (obj === null || obj === undefined) return undefined
  if (typeof obj === 'object' && !Array.isArray(obj) && (original in obj || name in obj)) return obj[original in obj ? original : name]
  switch (name) {
    case 'length': return length(obj)
    case 'first': return toList(obj)[0]
    case 'last': {
      const l = toList(obj)
      return l[l.length - 1]
    }
    case 'keys': return Object.keys(obj)
    case 'values': return Object.values(obj)
  }
  return obj[original]
}

const KAURY_FIRST = new Set(['sort', 'reverse']) // non-mutating Kaury versions win on lists

export function m(obj: any, name: string, original: string, ...args: any[]): any {
  if (obj === null || obj === undefined) throw new Error(`cannot call ".${original}" on nothing (the value is empty).`)
  if (typeof obj[original] === 'function' && !(KAURY_FIRST.has(name) && Array.isArray(raw(obj)))) return batch(() => obj[original](...args))
  const f = METHODS[name]
  if (!f) throw new Error(`".${original}" does not exist on this value.`)
  return batch(() => f(obj, ...args))
}

const byKey = (fn: any) => (typeof fn === 'function' ? fn : (x: any) => (fn ? x?.[fn] : x))

const METHODS: Record<string, (o: any, ...a: any[]) => any> = {
  add: (l, ...x) => {
    if (Array.isArray(raw(l))) l.push(...x)
    else if (l instanceof Set) x.forEach((v) => l.add(v))
    return l
  },
  remove: (l, x) => {
    if (typeof x === 'function') {
      for (let i = l.length - 1; i >= 0; i--) if (x(l[i])) l.splice(i, 1)
    } else {
      const i = raw(l).findIndex((y: any) => equal(y, x))
      if (i >= 0) l.splice(i, 1)
    }
    return l
  },
  clear: (l) => {
    if (Array.isArray(raw(l))) l.splice(0, l.length)
    else for (const k of Object.keys(l)) delete l[k]
    return l
  },
  filter: (l, fn) => toList(l).filter(fn),
  map: (l, fn) => toList(l).map(fn),
  sort: (l, fn, dir) => {
    const key = byKey(fn)
    const copy = [...toList(l)]
    copy.sort((a, b) => {
      const x = key(a), y = key(b)
      return typeof x === 'string' ? String(x).localeCompare(String(y), locale) : x - y
    })
    return dir === 'reverse' || fn === 'reverse' ? copy.reverse() : copy
  },
  reverse: (l) => (typeof l === 'string' ? [...l].reverse().join('') : [...toList(l)].reverse()),
  find: (l, fn) => toList(l).find(fn),
  contains: (l, x) => has(l, x),
  join: (l, sep = ', ') => toList(l).join(sep),
  each: (l, fn) => toList(l).forEach(fn),
  count: (l, fn) => (fn ? toList(l).filter(fn).length : length(l)),
  unique: (l) => [...new Set(toList(l).map(raw))],
  take: (l, n) => toList(l).slice(0, n),
  sum: (l, fn) => sum(l, fn),
  upper: (s) => String(s).toUpperCase(),
  lower: (s) => String(s).toLowerCase(),
  replace: (s, a, b) => String(s).split(a).join(b),
  split: (s, sep = ' ') => String(s).split(sep),
  'starts-with': (s, x) => String(s).startsWith(x),
  'ends-with': (s, x) => String(s).endsWith(x),
  trim: (s) => String(s).trim(),
  keys: (o) => Object.keys(o),
  values: (o) => Object.values(o),
  first: (l) => toList(l)[0],
  last: (l) => toList(l).at(-1),
  length: (l) => length(l),
  insert: (l, i, x) => {
    l.splice(i, 0, x)
    return l
  },
  update: (o, changes) => Object.assign(o, changes),
}

// ---------------- confetti (no dependency) ----------------
export function confetti(options: { count?: number; colors?: string[] } = {}) {
  if (!inBrowser()) return
  const c = document.createElement('canvas')
  c.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9999'
  c.setAttribute('aria-hidden', 'true')
  document.body.append(c)
  const ctx = c.getContext('2d')!
  const dpr = Math.min(2, devicePixelRatio || 1)
  c.width = innerWidth * dpr
  c.height = innerHeight * dpr
  ctx.scale(dpr, dpr)
  const accent = getComputedStyle(document.documentElement).getPropertyValue('--k-accent').trim()
  const colors = options.colors ?? [accent || '#ff4f8b', '#ffc53d', '#30a46c', '#0090ff', '#8e4ec6']
  const n = options.count ?? 140
  const parts = Array.from({ length: n }, () => ({
    x: innerWidth / 2, y: innerHeight * 0.6,
    vx: (Math.random() - 0.5) * 16, vy: -Math.random() * 18 - 6,
    r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.3,
    w: 6 + Math.random() * 6, h: 8 + Math.random() * 10,
    c: colors[Math.floor(Math.random() * colors.length)],
  }))
  const start = performance.now()
  const frame = (ts: number) => {
    ctx.clearRect(0, 0, innerWidth, innerHeight)
    for (const q of parts) {
      q.vy += 0.45
      q.vx *= 0.99
      q.x += q.vx
      q.y += q.vy
      q.r += q.vr
      ctx.save()
      ctx.translate(q.x, q.y)
      ctx.rotate(q.r)
      ctx.fillStyle = q.c
      ctx.fillRect(-q.w / 2, -q.h / 2, q.w, q.h)
      ctx.restore()
    }
    if (ts - start < 3200) requestAnimationFrame(frame)
    else c.remove()
  }
  requestAnimationFrame(frame)
}

/**
 * Structured data for Google and AI assistants: json-ld { "@type": "FAQPage", … } → a <script type="application/ld+json">,
 * to give to “head”. Several objects → several scripts. a “</script>” inside a text can never close it early.
 */
export function jsonLd(...items: unknown[]): string {
  return items
    .filter((x) => x != null)
    .map((x) => {
      const data = JSON.stringify(raw(x as object) ?? x).replace(/</g, String.fromCharCode(92) + 'u003c') // a backslash, then u003c
      return `<script type="application/ld+json">${data}</script>`
    })
    .join('')
}
