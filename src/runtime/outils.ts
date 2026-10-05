// Fonctions de base disponibles dans tout programme Kaury.

import { brut, lot, Cellule, effet, auNettoyage } from './reactif.js'

const estNav = () => typeof window !== 'undefined' && !(globalThis as any).__kaurySSR

export function t(v: unknown): string {
  if (v === null || v === undefined) return ''
  if (Array.isArray(v)) return v.map(t).join(', ')
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : String(Math.round(v * 100) / 100)
  if (v instanceof Date) return formatDate(v)
  if (typeof v === 'object') {
    try {
      return JSON.stringify(brut(v))
    } catch {
      return String(v)
    }
  }
  return String(v)
}

export function affiche(...valeurs: unknown[]) {
  console.log(...valeurs.map((v) => (typeof v === 'object' && v !== null ? brut(v) : v)))
}

export class ErreurReseau extends Error {
  statut: number
  constructor(message: string, statut: number) {
    super(message)
    this.statut = statut
  }
}

export async function charge(url: string, options: RequestInit = {}): Promise<any> {
  let r: Response
  try {
    r = await fetch(url, options)
  } catch (e) {
    throw new ErreurReseau(`impossible de joindre « ${url} » (connexion coupée ?).`, 0)
  }
  if (!r.ok) throw new ErreurReseau(`« ${url} » a répondu ${r.status} ${r.statusText}.`, r.status)
  const type = r.headers.get('content-type') ?? ''
  if (type.includes('json') || /\.json(\?|$)/.test(url)) return r.json()
  return r.text()
}

export async function envoie(url: string, donnees: unknown = {}, methode = 'POST'): Promise<any> {
  const corps = donnees instanceof FormData ? donnees : JSON.stringify(brut(donnees))
  const entetes: Record<string, string> = donnees instanceof FormData ? {} : { 'Content-Type': 'application/json' }
  return charge(url, { method: methode, body: corps as any, headers: entetes })
}

const valeursDe = (liste: any, fn?: (x: any) => any): any[] => {
  const l = enListe(liste)
  return fn ? l.map(fn) : l
}
export const somme = (liste: any, fn?: (x: any) => number) => valeursDe(liste, fn).reduce((a: number, b: any) => a + (Number(b) || 0), 0)
export const moyenne = (liste: any, fn?: (x: any) => number) => {
  const v = valeursDe(liste, fn)
  return v.length ? somme(v) / v.length : 0
}
export const minimum = (...a: any[]) => Math.min(...(a.length === 1 && Array.isArray(brut(a[0])) ? enListe(a[0]) : a))
export const maximum = (...a: any[]) => Math.max(...(a.length === 1 && Array.isArray(brut(a[0])) ? enListe(a[0]) : a))
export const arrondi = (x: number, decimales = 0) => {
  const f = 10 ** decimales
  return Math.round(x * f) / f
}
export const plancher = Math.floor
export const plafond = Math.ceil
export const absolu = Math.abs
export const racine = Math.sqrt
export function aleatoire(a?: number, b?: number): number {
  if (a === undefined) return Math.random()
  if (b === undefined) return Math.floor(Math.random() * a) + 1
  return Math.floor(Math.random() * (b - a + 1)) + a
}
export const hasard = (liste: any) => {
  const l = enListe(liste)
  return l[Math.floor(Math.random() * l.length)]
}
export function longueur(x: any): number {
  if (x === null || x === undefined) return 0
  if (typeof x === 'string' || Array.isArray(x)) return x.length
  if (x instanceof Map || x instanceof Set) return x.size
  if (typeof x === 'object') return Object.keys(x).length
  return String(x).length
}
export const maintenant = () => new Date()
export const enTexte = (x: unknown) => t(x)
export const enNombre = (x: unknown) => {
  const n = typeof x === 'string' ? Number(x.replace(/[\s']/g, '').replace(',', '.')) : Number(x)
  return Number.isNaN(n) ? 0 : n
}
export function prix(x: number, devise = 'CHF', langue = 'fr-CH'): string {
  try {
    return new Intl.NumberFormat(langue, { style: 'currency', currency: devise }).format(Number(x) || 0)
  } catch {
    return `${(Number(x) || 0).toFixed(2)} ${devise}`
  }
}
export function formatDate(d: Date | string | number, style: 'long' | 'court' | 'heure' = 'long'): string {
  const date = d instanceof Date ? d : new Date(d)
  if (style === 'heure') return date.toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit' })
  return date.toLocaleDateString('fr-CH', style === 'long' ? { day: 'numeric', month: 'long', year: 'numeric' } : undefined)
}
export function melange<T>(liste: T[]): T[] {
  const l = [...enListe(liste)]
  for (let i = l.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[l[i], l[j]] = [l[j], l[i]]
  }
  return l
}
export function intervalle(a: number, b: number): number[] {
  const r: number[] = []
  if (a <= b) for (let i = a; i <= b; i++) r.push(i)
  else for (let i = a; i >= b; i--) r.push(i)
  return r
}
export function enListe(x: any): any[] {
  if (x === null || x === undefined) return []
  if (Array.isArray(x)) return x
  if (typeof x === 'number') return intervalle(1, x)
  if (typeof x === 'string') return [...x]
  if (typeof x[Symbol.iterator] === 'function') return [...x]
  if (typeof x === 'object') return Object.values(x)
  return [x]
}
export const delai = (ms: number) => new Promise((r) => setTimeout(r, ms))

export function repete(ms: number, fn: () => void): () => void {
  if (!estNav()) return () => {}
  const id = setInterval(() => lot(() => appelle(fn)), ms)
  const stop = () => clearInterval(id)
  auNettoyage(stop)
  return stop
}
export function plusTard(ms: number, fn: () => void): () => void {
  if (!estNav()) return () => {}
  const id = setTimeout(() => lot(() => appelle(fn)), ms)
  const stop = () => clearTimeout(id)
  auNettoyage(stop)
  return stop
}

/** Garde un état dans le navigateur : il survit au rechargement de la page. */
export function memorise(cle: string, cellule: Cellule) {
  if (!estNav() || !(cellule instanceof Cellule)) return
  try {
    const s = localStorage.getItem('kaury:' + cle)
    if (s !== null) cellule.v = JSON.parse(s)
  } catch {
    /* stockage indisponible */
  }
  effet(() => {
    const v = JSON.stringify(brut(cellule.v), (_k, x) => brut(x))
    try {
      localStorage.setItem('kaury:' + cle, v)
    } catch {
      /* stockage plein ou bloqué */
    }
  })
}

export async function copie(texte: string) {
  await navigator.clipboard?.writeText(String(texte))
}
export function vibre(ms = 30) {
  navigator.vibrate?.(ms)
}
export function defile(id: string) {
  const el = document.getElementById(String(id).replace(/^#/, ''))
  el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
export async function partage(donnees: { titre?: string; texte?: string; url?: string } = {}) {
  const d = { title: donnees.titre ?? document.title, text: donnees.texte, url: donnees.url ?? location.href }
  if (navigator.share) return navigator.share(d)
  return copie(d.url)
}

export function appelle(fn: any) {
  try {
    const r = fn()
    if (r && typeof r.catch === 'function') r.catch(signaleFn)
    return r
  } catch (e) {
    signaleFn(e)
  }
}
let signaleFn: (e: unknown) => void = (e) => console.error(e)
export function definisSignale(f: (e: unknown) => void) {
  signaleFn = f
}

// ---------------- comparaisons ----------------
export function egal(a: any, b: any): boolean {
  a = brut(a)
  b = brut(b)
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
export function dans(x: any, conteneur: any): boolean {
  conteneur = brut(conteneur)
  if (conteneur === null || conteneur === undefined) return false
  if (typeof conteneur === 'string') return conteneur.includes(String(x))
  if (Array.isArray(conteneur)) return conteneur.some((y) => egal(x, y))
  if (conteneur instanceof Set || conteneur instanceof Map) return conteneur.has(brut(x))
  if (typeof conteneur === 'object') return String(x) in conteneur
  return false
}

// ---------------- propriétés et méthodes françaises ----------------
export function prop(obj: any, nom: string, original: string): any {
  if (obj === null || obj === undefined) return undefined
  if (typeof obj === 'object' && (original in obj || nom in obj) && !Array.isArray(obj) && typeof obj !== 'string') {
    return obj[original in obj ? original : nom]
  }
  switch (nom) {
    case 'longueur':
      return longueur(obj)
    case 'premier':
      return enListe(obj)[0]
    case 'dernier': {
      const l = enListe(obj)
      return l[l.length - 1]
    }
    case 'cles':
      return Object.keys(obj)
    case 'valeurs':
      return Object.values(obj)
  }
  return obj[original]
}

export function m(obj: any, nom: string, original: string, ...args: any[]): any {
  if (obj === null || obj === undefined) {
    throw new Error(`impossible d'appeler « .${original} » sur rien (la valeur est vide).`)
  }
  if (typeof obj[original] === 'function' && !(nom in KAURY_PRIORITAIRE && typeof obj === 'object' && Array.isArray(brut(obj)))) {
    return lot(() => obj[original](...args))
  }
  const f = METHODES[nom]
  if (!f) throw new Error(`« .${original} » n'existe pas sur cette valeur.`)
  return lot(() => f(obj, ...args))
}
const KAURY_PRIORITAIRE: Record<string, true> = { trie: true, inverse: true }

const parCle = (fn: any) => (typeof fn === 'function' ? fn : (x: any) => (fn ? x?.[fn] : x))

const METHODES: Record<string, (o: any, ...a: any[]) => any> = {
  ajoute: (l, ...x) => {
    if (Array.isArray(brut(l))) l.push(...x)
    else if (l instanceof Set) x.forEach((v) => l.add(v))
    return l
  },
  retire: (l, x) => {
    if (typeof x === 'function') {
      for (let i = l.length - 1; i >= 0; i--) if (x(l[i])) l.splice(i, 1)
    } else {
      const i = brut(l).findIndex((y: any) => egal(y, x))
      if (i >= 0) l.splice(i, 1)
    }
    return l
  },
  vide: (l) => {
    if (Array.isArray(brut(l))) l.splice(0, l.length)
    else for (const k of Object.keys(l)) delete l[k]
    return l
  },
  filtre: (l, fn) => enListe(l).filter(fn),
  transforme: (l, fn) => enListe(l).map(fn),
  trie: (l, fn, sens) => {
    const cle = parCle(fn)
    const copie = [...enListe(l)]
    copie.sort((a, b) => {
      const x = cle(a), y = cle(b)
      return typeof x === 'string' ? String(x).localeCompare(String(y), 'fr') : x - y
    })
    return sens === 'inverse' || fn === 'inverse' ? copie.reverse() : copie
  },
  inverse: (l) => (typeof l === 'string' ? [...l].reverse().join('') : [...enListe(l)].reverse()),
  trouve: (l, fn) => enListe(l).find(fn),
  contient: (l, x) => dans(x, l),
  joint: (l, sep = ', ') => enListe(l).join(sep),
  chaque: (l, fn) => enListe(l).forEach(fn),
  compte: (l, fn) => (fn ? enListe(l).filter(fn).length : longueur(l)),
  unique: (l) => [...new Set(enListe(l).map(brut))],
  prends: (l, n) => enListe(l).slice(0, n),
  somme: (l, fn) => somme(l, fn),
  majuscules: (s) => String(s).toUpperCase(),
  minuscules: (s) => String(s).toLowerCase(),
  remplace: (s, a, b) => String(s).split(a).join(b),
  coupe: (s, sep = ' ') => String(s).split(sep),
  'commence-par': (s, x) => String(s).startsWith(x),
  'finit-par': (s, x) => String(s).endsWith(x),
  nettoie: (s) => String(s).trim(),
  cles: (o) => Object.keys(o),
  valeurs: (o) => Object.values(o),
  premier: (l) => enListe(l)[0],
  dernier: (l) => enListe(l).at(-1),
  longueur: (l) => longueur(l),
  insere: (l, i, x) => {
    l.splice(i, 0, x)
    return l
  },
  'mets-a-jour': (o, changements) => Object.assign(o, changements),
}

// ---------------- confettis (sans dépendance) ----------------
export function confettis(options: { nombre?: number; couleurs?: string[] } = {}) {
  if (!estNav()) return
  const c = document.createElement('canvas')
  c.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9999'
  document.body.append(c)
  const ctx = c.getContext('2d')!
  const dpr = Math.min(2, devicePixelRatio || 1)
  c.width = innerWidth * dpr
  c.height = innerHeight * dpr
  ctx.scale(dpr, dpr)
  const cs = getComputedStyle(document.documentElement)
  const accent = cs.getPropertyValue('--k-accent').trim()
  const couleurs = options.couleurs ?? [accent || '#ff4f8b', '#ffc53d', '#30a46c', '#0090ff', '#8e4ec6']
  const n = options.nombre ?? 140
  const p = Array.from({ length: n }, () => ({
    x: innerWidth / 2, y: innerHeight * 0.6,
    vx: (Math.random() - 0.5) * 16, vy: -Math.random() * 18 - 6,
    r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.3,
    w: 6 + Math.random() * 6, h: 8 + Math.random() * 10,
    c: couleurs[Math.floor(Math.random() * couleurs.length)],
  }))
  const debut = performance.now()
  const cadre = (maintenant: number) => {
    ctx.clearRect(0, 0, innerWidth, innerHeight)
    for (const q of p) {
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
    if (maintenant - debut < 3200) requestAnimationFrame(cadre)
    else c.remove()
  }
  requestAnimationFrame(cadre)
}
