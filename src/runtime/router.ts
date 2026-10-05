// Pages, SEO and start-up. Every page is rendered on the server (HTML that Google reads).
// In the browser:
//  - a static page (no state, no interaction) runs no page code at all;
//  - a dynamic page adopts the server HTML (hydration), or is rebuilt if it differs.
// Navigation is between real pages, with native view transitions.

import { root, batch, takeDynamic } from './reactive.js'
import { inBrowser, resolveLinks, setPaths, setHydrating, HydrationMismatch, checkLeftovers, installMenus } from './dom.js'
import { startGlobals, route } from './motion.js'
import { setLocale } from './utils.js'
import { rawItems, takeUsedCollections } from './content.js'

type Route = { path: string; params: Record<string, string>; item?: any }
export interface KauryPage {
  path: string
  render: (route: Route, root: any) => any
  seo: ((route: Route) => { title?: string; description?: string; image?: string } | null) | null
  lang?: (route: Route) => string | null
  alternates?: (route: Route) => [string, string][] | null
  head?: (route: Route) => string | null
  transition: string | null
  each?: () => any
  pathOf?: (item: any) => string
}
export interface KauryModule {
  $pages: KauryPage[]
  $site: { name?: string; lang?: string; seo?: any; transition?: string; favicon?: string; url?: string; head?: string }
}

let releaseCurrent: (() => void) | null = null

const clean = (p: string) => p.replace(/\/index\.html$/, '/').replace(/(.)\/$/, '$1') || '/'

/** Every address a module can build (pages with « for » are expanded). */
export function allPaths(m: KauryModule): string[] {
  const out: string[] = []
  for (const p of m.$pages) {
    if (p.each && p.pathOf) for (const item of rawItems(p.each())) out.push(clean(p.pathOf(item)))
    else out.push(p.path)
  }
  return out
}

export function findPage(pages: KauryPage[], path: string): { page: KauryPage; params: Record<string, string>; item?: any } | null {
  const target = clean(path)
  for (const page of pages) {
    if (page.each && page.pathOf) {
      // the item may be inlined in the page (browser), otherwise searched in the collection
      const inline = typeof document !== 'undefined' && inBrowser() ? document.getElementById('k-item') : null
      if (inline?.textContent && page.path === inline.dataset.kPath) {
        const item = JSON.parse(inline.textContent)
        if (clean(page.pathOf(item)) === target) return { page, params: {}, item }
      }
      for (const item of rawItems(page.each())) if (clean(page.pathOf(item)) === target) return { page, params: {}, item }
      continue
    }
    const names: string[] = []
    const re = new RegExp('^' + clean(page.path).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/:([\p{L}_][\p{L}\p{N}_-]*)/gu, (_m, n) => {
      names.push(n)
      return '([^/]+)'
    }) + '$', 'u')
    const m = re.exec(target)
    if (m) {
      const params: Record<string, string> = {}
      names.forEach((n, i) => (params[n] = decodeURIComponent(m[i + 1])))
      return { page, params }
    }
  }
  const notFound = pages.find((p) => p.path === '/404')
  return notFound ? { page: notFound, params: {} } : null
}

export interface RenderInfo {
  title: string
  description?: string
  image?: string
  lang?: string
  found: boolean
  hydrated: boolean
  dynamic: boolean // the page needs its JavaScript in the browser
  collections: string[] // content collections the page read
  item?: any
  pattern?: string
  alternates?: [string, string][]
  head?: string
}

/** Renders a page into a container (browser or server). With hydrate, adopts the HTML already there. */
export function renderPage(m: KauryModule, path: string, target: any, hydrate = false): RenderInfo {
  setPaths(allPaths(m))
  setLocale(m.$site.lang)
  const r = findPage(m.$pages, path)
  batch(() => {
    route.path = path
    route.params = r?.params ?? {}
  })
  releaseCurrent?.()
  releaseCurrent = null
  const name = m.$site.name
  if (!r) {
    while (target.firstChild) target.removeChild(target.firstChild)
    const p = document.createElement('main')
    p.className = 'k-page k-not-found'
    p.innerHTML = '<section class="k-section"><h1 class="k-title">Page not found</h1><p class="k-text"><a href="/">Back to the home page</a></p></section>'
    target.appendChild(p)
    return { title: `Page not found · ${name ?? ''}`, found: false, hydrated: false, dynamic: false, collections: [] }
  }
  const route0: Route = { path, params: r.params, item: r.item }
  takeDynamic()
  takeUsedCollections()
  let hydrated = false
  if (hydrate && target.firstChild) {
    target.$kNext = undefined
    setHydrating(true)
    try {
      const [, release] = root(() => {
        r.page.render(route0, target)
        checkLeftovers()
      })
      releaseCurrent = release
      hydrated = true
    } catch (e) {
      // the page differs from the server HTML (saved cart, date…): rebuild it normally
      releaseCurrent?.()
      releaseCurrent = null
      if (!(e instanceof HydrationMismatch)) console.error(e)
    } finally {
      setHydrating(false)
    }
  }
  if (!hydrated) {
    while (target.firstChild) target.removeChild(target.firstChild)
    const [, release] = root(() => r.page.render(route0, target))
    releaseCurrent = release
  }
  const dynamic = takeDynamic()
  const collections = takeUsedCollections()
  resolveLinks(target)
  const seo = r.page.seo?.(route0) ?? {}
  const title = seo.title ? (name && !seo.title.includes(name) ? `${seo.title} · ${name}` : seo.title) : name ?? 'Kaury'
  return {
    title, description: seo.description ?? m.$site.seo?.description, image: seo.image ?? m.$site.seo?.image,
    lang: r.page.lang?.(route0) ?? undefined, alternates: r.page.alternates?.(route0) ?? undefined, head: r.page.head?.(route0) ?? undefined, found: true, hydrated, dynamic, collections, item: r.item, pattern: r.page.path,
  }
}

/** Starts the site in the browser. */
export function start(m: KauryModule, selector = '#app') {
  const container = document.querySelector(selector) ?? document.body
  const html = document.documentElement
  if (m.$site.transition) html.dataset.kTransition = m.$site.transition
  startGlobals()
  // static page: the server HTML is final, no page code runs
  if (html.dataset.kPage === 'static') {
    html.dataset.kRender = 'static'
  } else {
    const info = renderPage(m, location.pathname, container, container.firstChild !== null)
    html.dataset.kRender = info.hydrated ? 'hydrated' : 'rendered'
    if (!container.firstChild || !info.found) document.title = info.title
  }
  installMenus()
}

/** Goes to another page (a real navigation, with the native transition). */
export function go(path: string) {
  if (inBrowser()) location.href = path
}

/** SEO setting coming from inside a page. */
export function seo(d: { title?: string; description?: string; image?: string }) {
  if (inBrowser() && d.title) document.title = d.title
}
