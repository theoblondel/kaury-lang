// Pages, navigation et SEO. Le site est rendu côté serveur (HTML lisible par Google),
// puis le navigateur reprend la main et navigue sans recharger.

import { racine, lot } from './reactif.js'
import { estNavigateur, resousLiens, definisChemins } from './dom.js'
import { demarreGlobaux, route } from './mouvements.js'

export interface PageKaury {
  chemin: string
  rendu: (route: { chemin: string; params: Record<string, string> }) => any
  seo: { titre?: string; description?: string; image?: string } | null
  transition: string | null
}
export interface ModuleKaury {
  $pages: PageKaury[]
  $site: { nom?: string; langue?: string; seo?: any; transition?: string; favicon?: string }
}

let module: ModuleKaury | null = null
let conteneur: any = null
let libereCourante: (() => void) | null = null

export function trouvePage(pages: PageKaury[], chemin: string): { page: PageKaury; params: Record<string, string> } | null {
  const propre = chemin.replace(/\/index\.html$/, '/').replace(/(.)\/$/, '$1') || '/'
  for (const page of pages) {
    const motif = page.chemin.replace(/(.)\/$/, '$1')
    const noms: string[] = []
    const re = new RegExp('^' + motif.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/:([\p{L}_][\p{L}\p{N}_-]*)/gu, (_m, n) => {
      noms.push(n)
      return '([^/]+)'
    }) + '$', 'u')
    const m = re.exec(propre)
    if (m) {
      const params: Record<string, string> = {}
      noms.forEach((n, i) => (params[n] = decodeURIComponent(m[i + 1])))
      return { page, params }
    }
  }
  const p404 = pages.find((p) => p.chemin === '/404')
  return p404 ? { page: p404, params: {} } : null
}

/** Rend une page dans un conteneur (navigateur ou serveur). */
export function rendsPage(mod: ModuleKaury, chemin: string, cible: any): { titre: string; description?: string; image?: string; trouvee: boolean } {
  definisChemins(mod.$pages.map((p) => p.chemin))
  const r = trouvePage(mod.$pages, chemin)
  lot(() => {
    route.chemin = chemin
    route.params = r?.params ?? {}
  })
  libereCourante?.()
  while (cible.firstChild) cible.removeChild(cible.firstChild)
  if (!r) {
    const p = document.createElement('main')
    p.className = 'k-page k-introuvable'
    p.innerHTML = '<section class="k-section"><h1 class="k-titre">Page introuvable</h1><p class="k-texte"><a href="/">Retour à l\'accueil</a></p></section>'
    cible.appendChild(p)
    return { titre: `Page introuvable · ${mod.$site.nom ?? ''}`, trouvee: false }
  }
  const [noeud, libere] = racine(() => r.page.rendu({ chemin, params: r.params }))
  libereCourante = libere
  cible.appendChild(noeud)
  resousLiens(noeud)
  const seo = r.page.seo ?? {}
  const nomSite = mod.$site.nom
  const titre = seo.titre ? (nomSite && seo.titre !== nomSite ? `${seo.titre} · ${nomSite}` : seo.titre) : nomSite ?? 'Kaury'
  return { titre, description: seo.description ?? mod.$site.seo?.description, image: seo.image ?? mod.$site.seo?.image, trouvee: true }
}

/** Démarre le site dans le navigateur. */
export function demarre(mod: ModuleKaury, selecteur = '#app') {
  module = mod
  conteneur = document.querySelector(selecteur) ?? document.body
  demarreGlobaux()
  const info = rendsPage(mod, location.pathname, conteneur)
  document.title = info.titre
  allerAncre(false)
  document.addEventListener('click', (e) => {
    const a = (e.target as HTMLElement)?.closest?.('a')
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    const href = a.getAttribute('href')
    if (!href || a.target === '_blank' || a.hasAttribute('download')) return
    const url = new URL(href, location.href)
    if (url.origin !== location.origin) return
    if (url.pathname === location.pathname && url.hash) return // ancre sur la même page : défilement natif
    if (!trouvePage(mod.$pages, url.pathname)) return
    e.preventDefault()
    aller(url.pathname + url.search + url.hash)
  })
  addEventListener('popstate', () => change(location.pathname, false))
}

function allerAncre(doux: boolean) {
  if (!location.hash) return
  const el = document.getElementById(decodeURIComponent(location.hash.slice(1)))
  el?.scrollIntoView({ behavior: doux ? 'smooth' : 'auto' })
}

/** Navigation vers une autre page (avec transition si elle est réglée). */
export function aller(chemin: string) {
  if (!estNavigateur()) return
  if (!module) {
    location.href = chemin
    return
  }
  history.pushState(null, '', chemin)
  change(new URL(chemin, location.href).pathname, true)
}

function change(chemin: string, haut: boolean) {
  const mod = module!
  const r = trouvePage(mod.$pages, chemin)
  const transition = r?.page.transition ?? mod.$site.transition ?? 'fondu'
  const faire = () => {
    const info = rendsPage(mod, chemin, conteneur)
    document.title = info.titre
    const meta = document.querySelector('meta[name="description"]')
    if (meta && info.description) meta.setAttribute('content', info.description)
    if (location.hash) allerAncre(false)
    else if (haut) scrollTo({ top: 0 })
  }
  const doc = document as any
  if (transition !== 'aucune' && doc.startViewTransition && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.documentElement.dataset.kTransition = transition
    doc.startViewTransition(faire)
  } else faire()
}

/** Réglage SEO venant d'une page (balise seo au milieu du contenu). */
export function seo(d: { titre?: string; description?: string; image?: string }) {
  if (!estNavigateur()) return
  if (d.titre) document.title = d.titre
}
