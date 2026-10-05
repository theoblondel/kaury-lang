// Building the page: elements, reactive texts, conditions, loops, bound fields.
// Hydration: in the browser, the first render *adopts* the HTML made by the server instead of
// rebuilding it (faster, no flash, the largest image stays the same). Any difference → full re-render.

import { effect, root, untracked, batch, raw, onCleanup, markDynamic } from "./reactive.js"
import { t, toList, call, toNumber } from './utils.js'

export const inBrowser = () => typeof window !== 'undefined' && !(globalThis as any).__kaurySSR

// ---------------- hydration ----------------
let hydrating = false
const touched = new Set<any>()
export class HydrationMismatch extends Error {}
export function setHydrating(v: boolean) {
  hydrating = v
  if (v) touched.clear()
}
/** After hydration: a parent that still has server nodes nobody adopted means the HTML differs. */
export function checkLeftovers() {
  for (const p of touched) {
    if (peek(p)) throw new HydrationMismatch('server HTML has extra nodes')
  }
  touched.clear()
}
export const isHydrating = () => hydrating

function skipBlank(n: any): any {
  while (n && n.nodeType === 3 && !/\S/.test(n.data)) n = n.nextSibling
  return n
}
/** Next node of the parent that is not adopted yet (without taking it). */
function peek(parent: any): any {
  return skipBlank(parent.$kNext === undefined ? parent.firstChild : parent.$kNext)
}
function take(parent: any): any {
  touched.add(parent)
  const n = peek(parent)
  parent.$kNext = n ? n.nextSibling : null
  return n
}
function between(start: any, end: any): any[] {
  const r: any[] = []
  for (let n = start; n && n !== end; n = n.nextSibling) r.push(n)
  return r
}

/** Creates (or adopts, while hydrating) an element inside its parent. */
export function h(parent: any, tag: string, cls?: string): any {
  if (hydrating && parent && parent.nodeType === 1) {
    const n = take(parent)
    if (!n || n.nodeType !== 1 || n.localName !== tag) throw new HydrationMismatch(`expected <${tag}>, found ${n ? n.localName ?? '#text' : 'nothing'}`)
    if (cls) n.className = cls
    else n.removeAttribute('class')
    return n
  }
  const el = document.createElement(tag)
  if (cls) el.className = cls
  if (parent) parent.appendChild(el)
  return el
}

function anchor(parent: any, label: string): any {
  if (hydrating && parent.nodeType === 1) {
    const n = take(parent)
    if (!n || n.nodeType !== 8) throw new HydrationMismatch(`expected the ${label} marker`)
    return n
  }
  const c = document.createComment(label)
  parent.appendChild(c)
  return c
}

export function setText(el: any, s: string) {
  if (el.textContent !== s) el.textContent = s
}

export function text(el: any, fn: () => unknown) {
  effect(() => setText(el, t(fn())))
}

export function attr(el: any, name: string, fn: () => unknown) {
  effect(() => {
    const v = fn()
    if (v === false || v === null || v === undefined) el.removeAttribute(name)
    else el.setAttribute(name, v === true ? '' : String(v))
    if (name === 'disabled') el.disabled = !!v
  })
}

export function style(el: any, prop: string, fn: () => unknown) {
  effect(() => {
    const v = fn()
    el.style.setProperty(prop, v === null || v === undefined ? '' : String(v))
  })
}

export const px = (v: unknown) => (typeof v === 'number' ? `${v}px` : String(v ?? ''))

/** "photo.jpg" → "/photo.jpg" */
export function path(s: unknown): string {
  const v = String(s ?? '')
  if (/^(\/|[a-z][a-z0-9+.-]*:|#|\.\.\/)/i.test(v)) return v
  return '/' + v.replace(/^\.\//, '')
}

// ---------------- images ----------------
declare const __KAURY_IMAGES__: Record<string, { w: number; h: number; srcset?: string }> | undefined
const images = (): Record<string, { w: number; h: number; srcset?: string }> =>
  (typeof __KAURY_IMAGES__ !== 'undefined' ? __KAURY_IMAGES__ : undefined) ?? (globalThis as any).__kauryImages ?? {}

/**
 * An image with good defaults: real width/height (no layout jump), responsive srcset,
 * eager + high priority for the first image of the page, lazy for the others.
 * priority: 2 = first image of the page, 1 = near the top, 0 = further down.
 */
export function img(el: any, src: string | (() => unknown), priority = 0) {
  el.setAttribute('loading', priority ? 'eager' : 'lazy')
  el.setAttribute('decoding', 'async')
  if (priority === 2) el.setAttribute('fetchpriority', 'high')
  const apply = (s: unknown) => {
    const p = path(s)
    el.setAttribute('src', p)
    const info = images()[p]
    if (!info) return
    el.setAttribute('width', String(info.w))
    el.setAttribute('height', String(info.h))
    if (info.srcset) {
      el.setAttribute('srcset', info.srcset)
      el.setAttribute('sizes', priority ? '(max-width: 640px) 100vw, 60vw' : 'auto, (max-width: 640px) 100vw, 50vw')
    }
  }
  if (typeof src === 'function') effect(() => apply(src()))
  else apply(src)
}

/** Listens to an event. State changes made by the action are grouped. */
export function on(el: any, type: string, fn: (e: any) => any) {
  markDynamic()
  if (!inBrowser() || !el) return
  if (type === 'mount') {
    queueMicrotask(() => batch(() => call(() => fn(undefined))))
    return
  }
  if (type === 'scroll') {
    let planned = false
    const listener = () => {
      if (planned) return
      planned = true
      requestAnimationFrame(() => {
        planned = false
        batch(() => call(() => fn(undefined)))
      })
    }
    addEventListener('scroll', listener, { passive: true })
    onCleanup(() => removeEventListener('scroll', listener))
    return
  }
  const handle = (e: any) => {
    if (type === 'submit') e.preventDefault()
    batch(() => call(() => fn(e)))
  }
  el.addEventListener(type, handle)
  if (type === 'click' && el.tagName && !['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA', 'LABEL'].includes(el.tagName)) {
    // a clickable element must also work with the keyboard
    el.classList.add('k-clickable')
    if (!el.hasAttribute('tabindex')) el.tabIndex = 0
    if (!el.hasAttribute('role')) el.setAttribute('role', 'button')
    el.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        handle(e)
      }
    })
  }
}

// ---------------- if / for ----------------
export function when(parent: any, branches: [() => unknown, (p: any) => void][]) {
  const hydrate = hydrating && parent.nodeType === 1
  let marker: any = null
  let currentIdx = -2
  let nodes: any[] = []
  let release: (() => void) | null = null
  effect(() => {
    const idx = branches.findIndex(([c]) => !!c())
    if (idx === currentIdx) return
    untracked(() => {
      if (!marker && hydrate) {
        // first render while hydrating: adopt the server nodes, then the marker
        const start = peek(parent)
        if (idx >= 0) release = root(() => branches[idx][1](parent))[1]
        nodes = between(start, peek(parent))
        marker = anchor(parent, 'if')
        currentIdx = idx
        return
      }
      if (!marker) marker = anchor(parent, 'if')
      release?.()
      for (const n of nodes) n.parentNode?.removeChild(n)
      currentIdx = idx
      nodes = []
      release = null
      if (idx >= 0) {
        const f = document.createDocumentFragment()
        release = root(() => branches[idx][1](f))[1]
        nodes = [...f.childNodes]
        ;(marker.parentNode ?? parent).insertBefore(f, marker)
      }
    })
  })
  onCleanup(() => release?.())
}

interface Entry {
  nodes: any[]
  release: () => void
}

export function each(parent: any, source: () => unknown, render: (item: any, i: number, p: any) => void) {
  const hydrate = hydrating && parent.nodeType === 1
  let marker: any = null
  let entries = new Map<unknown, Entry>()
  effect(() => {
    const items = toList(source()).map((x, i) => [x, i] as const)
    untracked(() => {
      const next = new Map<unknown, Entry>()
      const seen = new Map<unknown, number>()
      const keyOf = (item: unknown, i: number) => {
        const b = raw(item)
        const base = typeof b === 'object' && b !== null ? b : `${typeof b}:${String(b)}`
        const n = seen.get(base) ?? 0
        seen.set(base, n + 1)
        return n === 0 ? base : `${typeof base === 'string' ? base : 'o'}#${n}#${i}`
      }
      if (!marker && hydrate) {
        for (const [item, i] of items) {
          const start = peek(parent)
          const [, rel] = root(() => render(item, i, parent))
          next.set(keyOf(item, i), { nodes: between(start, peek(parent)), release: rel })
        }
        marker = anchor(parent, 'for')
        entries = next
        return
      }
      if (!marker) marker = anchor(parent, 'for')
      const container = marker.parentNode ?? parent
      for (const [item, i] of items) {
        const key = keyOf(item, i)
        let e = entries.get(key)
        if (e) entries.delete(key)
        else {
          const f = document.createDocumentFragment()
          const [, rel] = root(() => render(item, i, f))
          e = { nodes: [...f.childNodes], release: rel }
        }
        next.set(key, e)
        for (const nd of e.nodes) container.insertBefore(nd, marker)
      }
      for (const e of entries.values()) {
        e.release()
        for (const nd of e.nodes) nd.parentNode?.removeChild(nd)
      }
      entries = next
    })
  })
  onCleanup(() => {
    for (const e of entries.values()) e.release()
  })
}

// ---------------- components ----------------
export function component(parent: any, fn: any, args: (() => unknown)[], slotFn: ((p: any) => void) | null): any[] {
  const names: string[] = fn.$params ?? []
  const props: any = {}
  names.forEach((n, i) => {
    if (args[i]) Object.defineProperty(props, n, { get: args[i], enumerable: true })
  })
  if (args.length > names.length) console.warn(`Kaury: "${fn.name}" receives ${args.length} values but has only ${names.length} parameters.`)
  props.$slot = slotFn
  return fn(props, parent) ?? []
}

/** Position in a parent, to find later the nodes a component created. */
export function mark(parent: any): { before: any; hydrating: boolean } {
  return hydrating && parent.nodeType === 1 ? { before: peek(parent), hydrating: true } : { before: parent.lastChild, hydrating: false }
}

export function rootNodes(parent: any, m: { before: any; hydrating: boolean }): any[] {
  if (m.hydrating) return between(m.before, peek(parent)).filter((n) => n.nodeType === 1)
  const start = m.before ? m.before.nextSibling : parent.firstChild
  return between(start, null).filter((n) => n.nodeType === 1)
}

export function rootClass(parent: any, m: { before: any; hydrating: boolean }, cls: string) {
  for (const n of rootNodes(parent, m)) n.classList.add(cls)
}

export function slot(el: any, fill: ((p: any) => void) | null) {
  el.classList.add('k-slot')
  if (fill) fill(el)
}

// ---------------- forms ----------------
export function bind(el: any, read: () => unknown, write: (v: unknown) => void, kind?: string) {
  markDynamic()
  effect(() => {
    const v = read()
    const s = v === null || v === undefined ? '' : String(v)
    if (el.value !== s) el.value = s
    if (!inBrowser() && el.localName === 'input') el.setAttribute('value', s)
  })
  if (inBrowser()) el.addEventListener('input', () => batch(() => write(kind === 'number' ? toNumber(el.value) : el.value)))
}

export function bindCheck(el: any, read: () => unknown, write: (v: boolean) => void) {
  markDynamic()
  effect(() => {
    el.checked = !!read()
    if (!inBrowser()) {
      if (el.checked) el.setAttribute('checked', '')
      else el.removeAttribute('checked')
    }
  })
  if (inBrowser()) el.addEventListener('change', () => batch(() => write(el.checked)))
}

export function options(el: any, list: () => unknown[]) {
  effect(() => {
    const vals = list()
    const cur = el.value
    while (el.firstChild) el.removeChild(el.firstChild)
    for (const v of vals) {
      const o = document.createElement('option')
      const b: any = raw(v)
      const value = typeof b === 'object' && b ? b.value ?? b.name : b
      o.value = String(value)
      o.textContent = t(typeof b === 'object' && b ? b.label ?? b.name : b)
      el.appendChild(o)
    }
    if (cur) el.value = cur
  })
}

export function form(el: any) {
  markDynamic()
  el.setAttribute('novalidate', '')
  if (!inBrowser()) return
  el.addEventListener('submit', (e: Event) => {
    if (!el.checkValidity()) {
      e.stopImmediatePropagation()
      e.preventDefault()
      el.classList.add('k-validated')
      el.reportValidity()
    }
  }, { capture: true })
}

// ---------------- cards with computed values ----------------
/** Image (when the value is an image file), title, then text. */
export function card(el: any, values: (() => unknown)[]) {
  const isImg = (x: unknown) => typeof x === 'string' && /\.(png|jpe?g|webp|avif|gif|svg)(\?.*)?$/i.test(x)
  const first = untracked(() => values.map((f) => f()))
  const image = first.some(isImg) ? h(el, 'img', 'k-card-image') : null
  const title = h(el, 'h3', 'k-card-title')
  const body = first.filter((x) => !isImg(x)).length > 1 ? h(el, 'p', 'k-card-text') : null
  if (image) img(image, () => values.map((f) => f()).find(isImg) ?? '', 0)
  effect(() => {
    const texts = values.map((f) => f()).filter((x) => !isImg(x))
    if (image) image.setAttribute('alt', t(texts[0]))
    setText(title, t(texts[0]))
    if (body) setText(body, t(texts[1]))
  })
}

// ---------------- automatic links ----------------
const pendingLinks: { a: any; word: string }[] = []
let knownPaths: string[] = []
export function setPaths(c: string[]) {
  knownPaths = c
}

export function autoLink(a: any, word: string) {
  if (/^(https?:|mailto:|tel:|\/|#)/.test(word)) {
    a.setAttribute('href', word)
    if (/^https?:/.test(word)) {
      a.setAttribute('target', '_blank')
      a.setAttribute('rel', 'noopener')
    }
    return
  }
  pendingLinks.push({ a, word })
}

export function slug(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

/** Once the page is built: "Flavors" → #flavors when the section exists, else /flavors when the page exists. */
export function resolveLinks(pageRoot: any) {
  const ids = new Set<string>()
  const walk = (n: any) => {
    if (n.id) ids.add(n.id)
    for (const e of n.childNodes ?? []) walk(e)
  }
  walk(pageRoot)
  for (const { a, word } of pendingLinks.splice(0)) {
    const s = slug(word)
    let href = '#'
    if (['home', 'accueil', 'index'].includes(s)) href = '/'
    else if (ids.has(s)) href = '#' + s
    else if (knownPaths.includes('/' + s)) href = '/' + s
    else if (knownPaths.some((c) => slug(c) === s)) href = knownPaths.find((c) => slug(c) === s)!
    else {
      const near = [...ids].find((id) => id.startsWith(s) || s.startsWith(id))
      href = near ? '#' + near : '#' + s
    }
    a.setAttribute('href', href)
  }
}

/** Menu of links: on phones it folds behind a button (installed at start, static pages included). */
let menus = 0
export function mobileMenu(nav: any) {
  nav.classList.add('k-menu')
  if (!nav.id) nav.id = 'k-menu-' + ++menus
}

export { installMenus } from './menus.js'

// ---------------- markdown ----------------
let markedLoader: Promise<(s: string) => string> | null = null
/**
 * Markdown rendered as rich text. On the server it is rendered at build time; while hydrating,
 * the server HTML is kept; a later change in the browser loads the Markdown library on demand.
 */
export function markdown(el: any, fn: () => unknown) {
  let first = hydrating && !!el.firstChild
  effect(() => {
    const v = String(fn() ?? '')
    if (first) {
      first = false
      return
    }
    renderMarkdown(el, v)
  })
}
function renderMarkdown(el: any, v: string) {
  const g = globalThis as any
  if (g.__kauryMarkdown) {
    el.innerHTML = g.__kauryMarkdown(v)
    return
  }
  markedLoader ??= import('marked').then((m) => (s: string) => m.marked.parse(s, { async: false }) as string)
  markedLoader.then((parse) => (el.innerHTML = parse(v)))
}
