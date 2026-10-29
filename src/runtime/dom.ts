// Building the page: elements, reactive texts, conditions, loops, bound fields.
// Hydration: in the browser, the first render *adopts* the HTML made by the server instead of
// rebuilding it (faster, no flash, the largest image stays the same). Any difference → full re-render.

import { effect, root, untracked, batch, raw, onCleanup, markDynamic } from "./reactive.js"
import { t, toList, call, toNumber, closeWord, local, splitLanguage, languageList } from './utils.js'

export const inBrowser = () => typeof window !== 'undefined' && !(globalThis as any).__kaurySSR

// ---------------- hydration ----------------
let hydrating = false
const touched = new Set<any>()
export class HydrationMismatch extends Error {
  /** Read by the reactive core: this one is not a mistake to report, the page has to be rebuilt (see renderPage). */
  rebuild = true
}
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

const EMPHASIS = /\*([^*\s](?:[^*\n]*[^*\s])?)\*/g

export function text(el: any, fn: () => unknown) {
  effect(() => {
    const s = t(fn())
    // "*word*" → emphasis, like in a fixed text (the rest is escaped: never HTML from a value)
    if (s.includes('*') && new RegExp(EMPHASIS.source).test(s)) {
      const h = s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(EMPHASIS, '<em>$1</em>')
      if (el.innerHTML !== h) el.innerHTML = h
    } else setText(el, s)
  })
}

/**
 * embed: the address waits in data-src and becomes src when the frame comes near the screen
 * (the page inside never competes with the first paint); later changes apply at once.
 */
export function frame(el: any, fn: () => unknown) {
  let near = false
  effect(() => {
    const v = String(fn() ?? '')
    if (near) el.setAttribute('src', withBase(v))
    else el.setAttribute('data-src', withBase(v))
  })
  if (typeof IntersectionObserver === 'undefined' || !inBrowser()) return
  const io = new IntersectionObserver((entries) => {
    if (!entries.some((e) => e.isIntersecting)) return
    near = true
    io.disconnect()
    const v = el.getAttribute('data-src')
    if (v) el.setAttribute('src', v)
  }, { rootMargin: '200px' })
  io.observe(el)
}

/** The attributes that hold an address: under a folder, an address of the site starts with it. */
const ADDRESS = new Set(['href', 'src', 'action', 'poster'])

/**
 * The part of an address after “#” is the name of a section, and a section named with an accent (réalisations) has
 * its id without it: “#réalisations” leads there too.
 */
export function plainHash(url: string): string {
  const at = url.indexOf('#')
  return at < 0 ? url : url.slice(0, at) + url.slice(at).normalize('NFD').replace(/[̀-ͯ]/g, '')
}

export function attr(el: any, name: string, fn: () => unknown) {
  effect(() => {
    const v = fn()
    if (v === false || v === null || v === undefined || (v === '' && name === 'id')) el.removeAttribute(name)
    else el.setAttribute(name, v === true ? '' : ADDRESS.has(name) ? withBase(name === 'href' ? local(plainHash(String(v))) : String(v)) : String(v))
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

/**
 * A site served from a folder (kaury build --base /demo/, or <html data-k-base="/demo/">): its own addresses
 * start with that folder. Addresses of other sites, “#names” and addresses already there are left alone.
 * `set`: a list of files and widths (srcset), each one moved.
 */
export function withBase(url: string, set = false): string {
  const base: string | undefined = (globalThis as any).__kauryBase ?? (typeof document !== 'undefined' ? (document as any).documentElement?.dataset?.kBase : undefined)
  if (!base) return url
  const own = (u: string) => (u.startsWith('/') && !u.startsWith('//') && !u.startsWith(base) ? base + u.slice(1) : u)
  return set ? url.split(',').map((part) => part.replace(/^\s*(\S+)/, (m, u: string) => m.replace(u, own(u)))).join(',') : own(url)
}

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
 * priority: 2 = first image of the page (the only one loaded at once), 1 = near the top (lazy, sized as such), 0 = further down.
 * width: the width written for it, in pixels: the place it takes, so the file to pick.
 */
export function img(el: any, src: string | (() => unknown), priority = 0, width?: number) {
  // the build gave its first place to a background picture that opens the page (data-k-wait): it keeps waiting
  if (priority === 2 && el.hasAttribute('data-k-wait')) priority = 1
  // attributes written by hand (attr "loading" …, attr "sizes" …) win over the automatic ones
  const own = (n: string) => el.hasAttribute(n) && !hydrating
  const ownLoading = own('loading')
  if (!ownLoading) el.setAttribute('loading', priority === 2 ? 'eager' : 'lazy')
  if (!own('decoding')) el.setAttribute('decoding', 'async')
  if (priority === 2 && !ownLoading && !own('fetchpriority')) el.setAttribute('fetchpriority', 'high')
  const ownSizes = own('sizes')
  const apply = (s: unknown) => {
    const p = path(s)
    el.setAttribute('src', withBase(p))
    const info = images()[p]
    if (!info) return
    el.setAttribute('width', String(info.w))
    el.setAttribute('height', String(info.h))
    if (info.srcset) {
      el.setAttribute('srcset', withBase(info.srcset, true))
      if (!ownSizes) el.setAttribute('sizes', width ? `(max-width: ${width}px) 100vw, ${width}px` : priority ? '(max-width: 640px) 100vw, 60vw' : 'auto, (max-width: 640px) 100vw, 50vw')
    }
  }
  if (typeof src === 'function') effect(() => apply(src()))
  else apply(src)
}

/** Real size of an image of the site (known at build time): { width, height }, 0 when unknown. */
export function imageSize(src: unknown): { width: number; height: number } {
  const info = images()[path(src)]
  return { width: info?.w ?? 0, height: info?.h ?? 0 }
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

/** A list of choices: when nothing is chosen yet, the state takes the first choice (what the list shows). */
export function bindSelect(el: any, read: () => unknown, write: (v: unknown) => void) {
  markDynamic()
  effect(() => {
    const v = read()
    let s = v === null || v === undefined ? '' : String(v)
    const first = el.firstChild ? el.firstChild.value ?? el.firstChild.getAttribute?.('value') : undefined
    if (s === '' && first !== undefined && first !== null && String(first) !== '') {
      s = String(first)
      untracked(() => batch(() => write(s)))
    }
    if (el.value !== s) el.value = s
    if (!inBrowser()) {
      for (let o = el.firstChild; o; o = o.nextSibling) {
        if (!o.setAttribute) continue
        if (String(o.value ?? o.getAttribute('value')) === s) o.setAttribute('selected', '')
        else o.removeAttribute?.('selected')
      }
    }
  })
  if (inBrowser()) el.addEventListener('input', () => batch(() => write(el.value)))
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

/**
 * dialog booking: a window over the page while its state is true. The browser's own <dialog> keeps the focus
 * inside and puts the rest of the page out of reach; Escape, the × button and a click beside the window close it,
 * and closing sets the state back to false.
 */
export function dialog(el: any, close: any, read: () => unknown, write: (v: boolean) => void) {
  markDynamic()
  close.type = 'button'
  close.setAttribute('aria-label', closeWord())
  setText(close, '×')
  if (!inBrowser()) return
  let tries = 0
  const show = () => {
    if (el.open || !read()) return
    // a page being built is not in the document yet: shown as soon as it is
    if (!el.isConnected) {
      if (tries++ < 60) requestAnimationFrame(show)
      return
    }
    if (typeof el.showModal === 'function') el.showModal()
    else el.setAttribute('open', '')
  }
  effect(() => {
    if (read()) {
      tries = 0
      untracked(show)
    } else if (el.open) {
      if (typeof el.close === 'function') el.close()
      else el.removeAttribute('open')
    }
  })
  // Escape, el.close(), a form inside with method "dialog": the state follows
  el.addEventListener('close', () => {
    if (untracked(read)) batch(() => write(false))
  })
  close.addEventListener('click', () => batch(() => write(false)))
  // a click on the dark around the window (the window itself keeps its clicks, its padding too)
  el.addEventListener('click', (e: any) => {
    if (e.target !== el) return
    const r = el.getBoundingClientRect()
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) batch(() => write(false))
  })
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
const pendingLinks: { a: any; word: string; elsewhere?: string }[] = []
let knownPaths: string[] = []
export function setPaths(c: string[]) {
  knownPaths = c
}

/** `elsewhere`: where the section of that name is when it is on another page (“/#about”), known by the compiler. */
export function autoLink(a: any, word: string, elsewhere?: string) {
  if (/^(https?:|mailto:|tel:|\/|#)/.test(word)) {
    a.setAttribute('href', withBase(local(word)))
    if (/^https?:/.test(word)) {
      a.setAttribute('target', '_blank')
      a.setAttribute('rel', 'noopener')
    }
    return
  }
  pendingLinks.push({ a, word, elsewhere })
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
  for (const { a, word, elsewhere } of pendingLinks.splice(0)) {
    const s = slug(word)
    let href = '#'
    if (['home', 'accueil', 'index'].includes(s)) href = '/'
    else if (ids.has(s)) href = '#' + s
    else if (knownPaths.includes('/' + s)) href = '/' + s
    else if (knownPaths.some((c) => slug(c) === s)) href = knownPaths.find((c) => slug(c) === s)!
    else {
      const near = [...ids].find((id) => id.startsWith(s) || s.startsWith(id))
      // not in this page: the page that has a section of that name (“/#about”), else the name as it is
      href = near ? '#' + near : elsewhere ?? '#' + s
    }
    a.setAttribute('href', withBase(local(href)))
  }
}

const LANGUAGE_NAMES: Record<string, string> = { fr: 'Français', en: 'English', de: 'Deutsch', it: 'Italiano', es: 'Español', pt: 'Português', nl: 'Nederlands', rm: 'Rumantsch' }

/** languages: the same page in each language of the site (FR · EN), the one shown marked as current. */
export function languages(nav: any, path: string) {
  const { list, current } = languageList()
  nav.setAttribute('aria-label', list[current] === 'fr' ? 'Langue' : 'Language')
  const bare = splitLanguage(path)[1]
  list.forEach((l, j) => {
    const a = h(nav, 'a', 'k-language')
    const href = j ? `/${l}${bare === '/' ? '/' : bare}` : bare
    a.setAttribute('href', withBase(href))
    a.setAttribute('hreflang', l)
    a.setAttribute('lang', l)
    a.setAttribute('aria-label', LANGUAGE_NAMES[l.slice(0, 2)] ?? l)
    if (j === current) a.setAttribute('aria-current', 'true')
    else a.removeAttribute('aria-current')
    setText(a, l.slice(0, 2).toUpperCase())
  })
}

/** Menu of links: on phones it folds behind a button (installed at start, static pages included). */
let menus = 0
export function mobileMenu(nav: any) {
  nav.classList.add('k-menu')
  if (!nav.id) nav.id = 'k-menu-' + ++menus
}

export { installMenus } from './menus.js'

// ---------------- raw HTML and classes ----------------
/** Content written in HTML. While hydrating, the server HTML is kept. */
export function html(el: any, fn: () => unknown) {
  let first = hydrating && !!el.firstChild
  effect(() => {
    const v = String(fn() ?? '')
    if (first) {
      first = false
      return
    }
    el.innerHTML = v
  })
}

/** Classes computed from values: “class "card {kind}"”. */
export function classes(el: any, fn: () => unknown) {
  let prev: string[] = []
  effect(() => {
    const next = String(fn() ?? '').split(/\s+/).filter(Boolean)
    for (const c of prev) if (!next.includes(c)) el.classList.remove(c)
    for (const c of next) el.classList.add(c)
    prev = next
  })
}

// ---------------- markdown ----------------
let markedLoader: Promise<(s: string) => string> | null = null
/**
 * Markdown rendered as rich text. On the server it is rendered at build time; while hydrating,
 * the server HTML is kept; a later change in the browser loads the Markdown library on demand.
 */
export function markdown(el: any, fn: () => unknown, under = false) {
  let first = hydrating && !!el.firstChild
  effect(() => {
    const v = String(fn() ?? '')
    if (first) {
      first = false
      return
    }
    renderMarkdown(el, v, under)
  })
}
/** Under the title of a page, a text that brings its own main heading goes one level down: one <h1> per page. */
export function underTitle(html: string): string {
  if (!/<h1[\s>]/.test(html)) return html
  return html.replace(/<(\/?)h([1-6])(?=[\s>])/g, (_, close, level) => `<${close}h${Math.min(6, Number(level) + 1)}`)
}
function renderMarkdown(el: any, v: string, under: boolean) {
  const g = globalThis as any
  const show = (html: string) => (el.innerHTML = under ? underTitle(html) : html)
  if (g.__kauryMarkdown) {
    show(g.__kauryMarkdown(v))
    return
  }
  markedLoader ??= import('./markdown.js').then((m) => m.parseMarkdown)
  markedLoader.then((parse) => show(parse(v)))
}
