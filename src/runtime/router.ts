// Pages, navigation and SEO. The site is rendered on the server (HTML that Google reads),
// then the browser adopts that HTML (hydration) and navigates without reloading.

import { root, batch } from './reactive.js'
import { inBrowser, resolveLinks, setPaths, setHydrating, HydrationMismatch, checkLeftovers } from './dom.js'
import { startGlobals, route } from './motion.js'
import { setLocale } from './utils.js'

export interface KauryPage {
  path: string
  render: (route: { path: string; params: Record<string, string> }, root: any) => any
  seo: { title?: string; description?: string; image?: string } | null
  transition: string | null
}
export interface KauryModule {
  $pages: KauryPage[]
  $site: { name?: string; lang?: string; seo?: any; transition?: string; favicon?: string; url?: string }
}

let mod: KauryModule | null = null
let container: any = null
let releaseCurrent: (() => void) | null = null

export function findPage(pages: KauryPage[], path: string): { page: KauryPage; params: Record<string, string> } | null {
  const clean = path.replace(/\/index\.html$/, '/').replace(/(.)\/$/, '$1') || '/'
  for (const page of pages) {
    const pattern = page.path.replace(/(.)\/$/, '$1')
    const names: string[] = []
    const re = new RegExp('^' + pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/:([\p{L}_][\p{L}\p{N}_-]*)/gu, (_m, n) => {
      names.push(n)
      return '([^/]+)'
    }) + '$', 'u')
    const m = re.exec(clean)
    if (m) {
      const params: Record<string, string> = {}
      names.forEach((n, i) => (params[n] = decodeURIComponent(m[i + 1])))
      return { page, params }
    }
  }
  const notFound = pages.find((p) => p.path === '/404')
  return notFound ? { page: notFound, params: {} } : null
}

/** Renders a page into a container (browser or server). With hydrate, adopts the HTML already there. */
export function renderPage(m: KauryModule, path: string, target: any, hydrate = false): { title: string; description?: string; image?: string; found: boolean; hydrated: boolean } {
  setPaths(m.$pages.map((p) => p.path))
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
    return { title: `Page not found · ${name ?? ''}`, found: false, hydrated: false }
  }
  const route0 = { path, params: r.params }
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
  resolveLinks(target)
  const seo = r.page.seo ?? {}
  const title = seo.title ? (name && seo.title !== name ? `${seo.title} · ${name}` : seo.title) : name ?? 'Kaury'
  return { title, description: seo.description ?? m.$site.seo?.description, image: seo.image ?? m.$site.seo?.image, found: true, hydrated }
}

/** Starts the site in the browser. */
export function start(m: KauryModule, selector = '#app') {
  mod = m
  container = document.querySelector(selector) ?? document.body
  startGlobals()
  const info = renderPage(m, location.pathname, container, true)
  document.documentElement.dataset.kRender = info.hydrated ? 'hydrated' : 'rendered'
  document.title = info.title
  goToHash(false)
  document.addEventListener('click', (e) => {
    const a = (e.target as HTMLElement)?.closest?.('a')
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    const href = a.getAttribute('href')
    if (!href || a.target === '_blank' || a.hasAttribute('download')) return
    const url = new URL(href, location.href)
    if (url.origin !== location.origin) return
    if (url.pathname === location.pathname && url.hash) return // anchor on the same page: native scrolling
    if (!findPage(m.$pages, url.pathname)) return
    e.preventDefault()
    go(url.pathname + url.search + url.hash)
  })
  addEventListener('popstate', () => change(location.pathname, false))
}

function goToHash(smooth: boolean) {
  if (!location.hash) return
  document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' })
}

/** Navigates to another page (with a transition when one is set). */
export function go(path: string) {
  if (!inBrowser()) return
  if (!mod) {
    location.href = path
    return
  }
  history.pushState(null, '', path)
  change(new URL(path, location.href).pathname, true)
}

function change(path: string, top: boolean) {
  const m = mod!
  const r = findPage(m.$pages, path)
  const transition = r?.page.transition ?? m.$site.transition ?? 'fade'
  const doIt = () => {
    const info = renderPage(m, path, container)
    document.title = info.title
    const meta = document.querySelector('meta[name="description"]')
    if (meta && info.description) meta.setAttribute('content', info.description)
    if (location.hash) goToHash(false)
    else if (top) scrollTo({ top: 0 })
  }
  const doc = document as any
  if (transition !== 'none' && doc.startViewTransition && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.documentElement.dataset.kTransition = transition
    doc.startViewTransition(doIt)
  } else doIt()
}

/** SEO setting coming from inside a page. */
export function seo(d: { title?: string; description?: string; image?: string }) {
  if (inBrowser() && d.title) document.title = d.title
}
