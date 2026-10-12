// Pages, SEO and start-up. Every page is rendered on the server (HTML that Google reads).
// In the browser:
//  - a static page (no state, no interaction) runs no page code at all;
//  - a dynamic page adopts the server HTML (hydration), or is rebuilt if it differs.
// Navigation is between real pages, with native view transitions.

import { root, batch, takeDynamic, adopted } from './reactive.js'
import { inBrowser, resolveLinks, setPaths, setHydrating, HydrationMismatch, checkLeftovers, installMenus, withBase } from './dom.js'
import { startGlobals, route } from './motion.js'
import { setLocale } from './utils.js'
import { rawItems, takeUsedCollections, peek } from './content.js'

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

/**
 * The items of a page written with “for”. In the browser the content may still be on its way
 * (a page that does not use it does not carry it): the list is then empty, never an error.
 * On the server the data is complete, so an error there is a real one and stops the build.
 */
function itemsOf(p: KauryPage): any[] {
  try {
    return rawItems(p.each!())
  } catch (e) {
    if (!inBrowser()) throw e
    return []
  }
}

/** Every address a module can build (pages with “for” are expanded). */
export function allPaths(m: KauryModule): string[] {
  const out: string[] = []
  for (const p of m.$pages) {
    // the list of addresses never makes the browser download content
    if (p.each && p.pathOf) for (const item of peek(() => itemsOf(p))) out.push(clean(p.pathOf(item)))
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
      for (const item of itemsOf(page)) if (clean(page.pathOf(item)) === target) return { page, params: {}, item }
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
      // while developing: said quietly, with the reason (a page rebuilt in the browser shows a little later)
      else if ((globalThis as any).__kauryDev) console.info(`Kaury: the page "${path}" was rebuilt in the browser, its HTML differed from the one made at build time (${e.message}).`)
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
  // static page: the server HTML is final, no page code runs
  if (html.dataset.kPage === 'static') {
    startGlobals()
    adopted()
    html.dataset.kRender = 'static'
  } else {
    // a site served from a folder (<html data-k-base="/demo/">): its pages are read from there
    const base = html.dataset.kBase
    const path = base && location.pathname.startsWith(base) ? '/' + location.pathname.slice(base.length) : location.pathname
    // A page that comes with its HTML adopts it with what the server had (a wide screen, nothing saved), then takes
    // the real size of the screen and the saved states: the page follows them, instead of being rebuilt whole
    // (on every phone for “screen.mobile”, for every returning visitor with “persist”).
    const served = container.firstChild !== null
    if (!served) {
      startGlobals()
      adopted()
    }
    const info = renderPage(m, path, container, served)
    if (served) {
      startGlobals()
      adopted()
    }
    html.dataset.kRender = info.hydrated ? 'hydrated' : 'rendered'
    if (!container.firstChild || !info.found) document.title = info.title
  }
  installMenus()
}

/** Goes to another page (a real navigation, with the native transition). */
export function go(path: string) {
  if (inBrowser()) location.href = withBase(path)
}

/** SEO setting coming from inside a page. */
export function seo(d: { title?: string; description?: string; image?: string }) {
  if (inBrowser() && d.title) document.title = d.title
}
