// Mouvements prêts à l'emploi (tourne, flotte, suit souris…) et pont vers l'immersion 2D/3D.
// Les mêmes mouvements marchent sur un titre, une image 2D ou un modèle 3D :
// chaque « corps » a un adaptateur qui applique la transformation (CSS ou Three.js).

import { reactif, etat, auNettoyage, lot } from './reactif.js'
import { estNavigateur, h } from './dom.js'
import { appelle } from './outils.js'

// ---------------- valeurs globales réactives ----------------
export const souris = reactif({ x: 0, y: 0, pixelX: 0, pixelY: 0 })
export const defilement = etat(0)
export const ecran = reactif({ largeur: 1280, hauteur: 800, mobile: false, tablette: false })
export const route = reactif({ chemin: '/', params: {} as Record<string, string> })

let globauxPrets = false
export function demarreGlobaux() {
  if (globauxPrets || !estNavigateur()) return
  globauxPrets = true
  const majEcran = () => lot(() => {
    ecran.largeur = innerWidth
    ecran.hauteur = innerHeight
    ecran.mobile = innerWidth <= 640
    ecran.tablette = innerWidth <= 1024
  })
  majEcran()
  addEventListener('resize', majEcran, { passive: true })
  addEventListener('pointermove', (e) => {
    sourisBrute.x = (e.clientX / innerWidth) * 2 - 1
    sourisBrute.y = (e.clientY / innerHeight) * 2 - 1
    sourisBrute.px = e.clientX
    sourisBrute.py = e.clientY
    sourisBouge = true
  }, { passive: true })
  const majDefil = () => {
    const max = document.documentElement.scrollHeight - innerHeight
    defilement.v = max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0
  }
  addEventListener('scroll', majDefil, { passive: true })
  majDefil()
  reduit = matchMedia('(prefers-reduced-motion: reduce)').matches
}
const sourisBrute = { x: 0, y: 0, px: 0, py: 0 }
let sourisBouge = false
let reduit = false
export const mouvementReduit = () => reduit

// ---------------- corps animés ----------------
export interface Transfo {
  x: number; y: number; z: number // px (DOM) — l'adaptateur 3D convertit
  rx: number; ry: number; rz: number // degrés
  s: number
  o: number
}
export interface Mouvement {
  type: string
  o: Record<string, any>
  debut: number
  duree?: number // actions ponctuelles
  etat?: any
}
export interface Corps {
  el: any
  mouvements: Mouvement[]
  actions: Mouvement[]
  applique: (t: Transfo) => void
  visible: boolean
  p0?: number
  lisse: Transfo
  adaptateur: '2d' | '3d'
  joue?: (nom: string, o?: any) => void
  dit?: (texte: string, o?: any) => void
  ancre?: () => { x: number; y: number } | null
}

const corps = new Set<Corps>()
let boucle = false
let derniere = 0

function transfoNeutre(): Transfo {
  return { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0, s: 1, o: 1 }
}

export function corpsDe(el: any): Corps {
  if (el.$kCorps) return el.$kCorps
  const c: Corps = {
    el,
    mouvements: [],
    actions: [],
    visible: true,
    lisse: transfoNeutre(),
    adaptateur: '2d',
    applique: (t) => {
      const cible = el.$kVisuel ?? el
      cible.style.transform = `translate3d(${t.x}px, ${t.y}px, 0) rotateX(${t.rx}deg) rotateY(${t.ry}deg) rotateZ(${t.rz}deg) scale(${t.s})`
      if (t.o !== 1) cible.style.opacity = String(t.o)
    },
  }
  el.$kCorps = c
  return c
}

function surveille(c: Corps) {
  if (!estNavigateur()) return
  corps.add(c)
  if (typeof IntersectionObserver !== 'undefined' && c.el.nodeType === 1) {
    const io = new IntersectionObserver((es) => {
      for (const e of es) c.visible = e.isIntersecting
    }, { rootMargin: '100px' })
    io.observe(c.el)
    auNettoyage(() => {
      io.disconnect()
      corps.delete(c)
    })
  }
  if (!boucle) {
    boucle = true
    requestAnimationFrame(cadre)
  }
}

function progression(el: any): number {
  const r = el.getBoundingClientRect?.()
  if (!r) return 0
  const vh = innerHeight
  return Math.min(1, Math.max(0, (vh - r.top) / (vh + r.height)))
}

function cadre(now: number) {
  const dt = Math.min(0.05, derniere ? (now - derniere) / 1000 : 0.016)
  derniere = now
  const temps = now / 1000
  if (sourisBouge) {
    lot(() => {
      souris.x = sourisBrute.x
      souris.y = sourisBrute.y
      souris.pixelX = sourisBrute.px
      souris.pixelY = sourisBrute.py
    })
    sourisBouge = false
  }
  for (const c of corps) {
    if (!c.visible && !c.actions.length) continue
    if (!c.el.isConnected && c.el.nodeType === 1) continue
    const t = transfoNeutre()
    const prog = progression(c.el)
    if (c.p0 === undefined) c.p0 = prog
    for (const m of c.mouvements) if (!reduit || m.type === 'suit-souris') appliqueMouvement(m, c, t, temps, dt, prog)
    c.actions = c.actions.filter((a) => appliqueAction(a, t, now))
    c.applique(t)
  }
  requestAnimationFrame(cadre)
}

const vitesseMot = (o: Record<string, any>, defaut: number) => (o.lent ? defaut * 0.4 : o.rapide ? defaut * 2.5 : defaut)

function appliqueMouvement(m: Mouvement, c: Corps, t: Transfo, temps: number, dt: number, prog: number) {
  const o = m.o
  const echelle = c.adaptateur === '3d' ? 1 : 1
  switch (m.type) {
    case 'tourne': {
      const axe = o.x ? 'rx' : o.z ? 'rz' : 'ry'
      if (o['au-defilement']) {
        const tours = typeof o['au-defilement'] === 'number' ? o['au-defilement'] : 1
        t[axe] += (prog - (c.p0 ?? 0)) * 360 * tours * (o.inverse ? -1 : 1) * 1.6
      } else {
        m.etat = (m.etat ?? 0) + (o.vitesse ?? vitesseMot(o, 40)) * dt * (o.inverse ? -1 : 1)
        t[axe] += m.etat
      }
      break
    }
    case 'flotte': {
      const amp = (typeof o.valeur === 'number' ? o.valeur * 100 : o.vitesse ?? 14) * echelle
      t.y += Math.sin(temps * vitesseMot(o, 1.3) + (m.debut % 7)) * amp
      t.rz += Math.sin(temps * 0.9) * 1.5
      break
    }
    case 'pulse': {
      const amp = typeof o.vitesse === 'number' ? o.vitesse / 100 : 0.05
      t.s *= 1 + Math.sin(temps * vitesseMot(o, 3)) * amp
      break
    }
    case 'balance':
      t.rz += Math.sin(temps * vitesseMot(o, 1.6)) * (o.vitesse ?? 6)
      break
    case 'saute': {
      // saute régulièrement
      const periode = 2.6
      const ph = ((temps + (m.debut % 3)) % periode) / 0.55
      if (ph < 1) t.y -= Math.sin(ph * Math.PI) * (o.vitesse ?? 40)
      break
    }
    case 'suit-souris': {
      const force = o.vitesse ?? 1
      const cible = { rx: -souris.y * 14 * force, ry: souris.x * 24 * force, x: souris.x * 10 * force, y: souris.y * 6 * force }
      const k = o.doux ? 0.04 : o.rapide ? 0.3 : 0.12
      const l = c.lisse
      l.rx += (cible.rx - l.rx) * k
      l.ry += (cible.ry - l.ry) * k
      l.x += (cible.x - l.x) * k
      l.y += (cible.y - l.y) * k
      t.rx += l.rx
      t.ry += l.ry
      if (c.adaptateur === '2d') {
        t.x += l.x
        t.y += l.y
      }
      break
    }
    case 'parallaxe': {
      const f = typeof o.vitesse === 'number' ? o.vitesse : typeof o.valeur === 'number' ? o.valeur : 0.3
      t.y += (prog - 0.5) * -400 * f
      break
    }
    case 'entre-depuis': {
      // géré à part (une seule fois)
      break
    }
  }
}

const doux = (p: number) => 1 - Math.pow(1 - p, 3)

function appliqueAction(a: Mouvement, t: Transfo, now: number): boolean {
  const p = Math.min(1, (now - a.debut) / (a.duree ?? 700))
  switch (a.type) {
    case 'saute':
      t.y -= Math.sin(p * Math.PI) * (a.o.vitesse ?? 60)
      t.s *= 1 + Math.sin(p * Math.PI) * 0.04
      break
    case 'tourne':
      t[a.o.x ? 'rx' : a.o.z ? 'rz' : 'ry'] += doux(p) * (a.o.vitesse ?? 360)
      break
    case 'pulse':
      t.s *= 1 + Math.sin(p * Math.PI) * 0.15
      break
    case 'balance':
      t.rz += Math.sin(p * Math.PI * 4) * (1 - p) * 12
      break
    case 'flotte':
      t.y -= Math.sin(p * Math.PI) * 20
      break
  }
  return p < 1
}

/** Ajoute un mouvement permanent à un élément ou un objet. */
export function mouvement(el: any, type: string, o: Record<string, any> = {}) {
  if (!el) return
  if (type === 'dit') {
    if (estNavigateur()) setTimeout(() => dit(el, o.valeur ?? o.mot ?? '', o), 600)
    return
  }
  if (type === 'joue') {
    const c = corpsDe(el)
    const nom = o.valeur ?? o.mot
    if (c.joue) c.joue(nom, o)
    else (el.$kAnimDepart = nom)
    return
  }
  if (type === 'entre-depuis') return entreDepuis(el, o)
  const c = corpsDe(el)
  c.mouvements.push({ type, o, debut: Math.random() * 10 })
  if (!estNavigateur()) return
  surveille(c)
}

/** Mouvement ponctuel déclenché par une action (au clic -> saute). */
export function action(el: any, type: string, o: Record<string, any> = {}) {
  if (!el || !estNavigateur()) return
  if (type === 'dit') return dit(el, o.valeur ?? o.mot ?? '', o)
  if (type === 'joue') {
    const c = corpsDe(el)
    return c.joue?.(o.valeur ?? o.mot, o)
  }
  const c = corpsDe(el)
  const durees: Record<string, number> = { saute: 650, tourne: 900, pulse: 450, balance: 900, flotte: 900 }
  c.actions.push({ type, o, debut: performance.now(), duree: o.duree ?? durees[type] ?? 700 })
  surveille(c)
}

function entreDepuis(el: any, o: Record<string, any>) {
  const sens = Object.keys(o).find((k) => ['gauche', 'droite', 'haut', 'bas', 'fondu', 'zoom'].includes(k)) ?? o.mot ?? 'bas'
  el.classList.add('k-entre', `k-entre-${sens}`)
  if (o.valeur2 || o.delai) el.style.transitionDelay = `${o.delai ?? 0}ms`
  if (!estNavigateur()) return
  if (reduit || typeof IntersectionObserver === 'undefined') {
    el.classList.add('k-vu')
    return
  }
  const io = new IntersectionObserver((es) => {
    for (const e of es) {
      if (e.isIntersecting) {
        el.classList.add('k-vu')
        io.disconnect()
      }
    }
  }, { threshold: 0.15 })
  requestAnimationFrame(() => io.observe(el.$kEl ?? el))
  auNettoyage(() => io.disconnect())
}

// ---------------- bulles de dialogue ----------------
export function dit(el: any, texte: string, o: Record<string, any> = {}) {
  if (!estNavigateur() || !el) return
  const c = corpsDe(el)
  if (c.dit) return c.dit(String(texte), o)
  if (el.classList?.contains('k-3d')) {
    // le modèle 3D n'est pas encore chargé : il parlera dès qu'il sera là
    el.$kDitEnAttente = [String(texte), o]
    return
  }
  let bulle: HTMLElement = el.$kBulle
  if (!bulle) {
    bulle = h('div', 'k-bulle')
    bulle.setAttribute('role', 'status')
    el.$kBulle = bulle
    const hote = el.$kEl ?? el
    if (getComputedStyle(hote).position === 'static') hote.style.position = 'relative'
    hote.append(bulle)
  }
  ecritBulle(bulle, String(texte), o)
}

export function ecritBulle(bulle: HTMLElement, texte: string, o: Record<string, any> = {}) {
  clearTimeout((bulle as any).$kMinuteur)
  clearInterval((bulle as any).$kFrappe)
  bulle.textContent = ''
  bulle.classList.add('k-bulle-visible')
  let i = 0
  ;(bulle as any).$kFrappe = setInterval(() => {
    bulle.textContent = texte.slice(0, ++i)
    if (i >= texte.length) clearInterval((bulle as any).$kFrappe)
  }, reduit ? 0 : 28)
  if (!o.reste) {
    ;(bulle as any).$kMinuteur = setTimeout(() => bulle.classList.remove('k-bulle-visible'), Math.max(2600, texte.length * 70))
  }
}

// ---------------- objets, scènes, sons ----------------
const nommes = new Map<string, any>()
export const objets = new Proxy({}, { get: (_t, k) => nommes.get(String(k)) })
export function objetNomme(nom: string) {
  return nommes.get(nom)
}

const EXT_3D = /\.(glb|gltf)(\?|#|$)/i
const EXT_LOTTIE = /\.(json|lottie)(\?|#|$)/i

export interface OptionsObjet {
  genre: 'objet' | 'personnage'
  src: string
  nom: string | null
  options: Record<string, any>
}

export function objet(parent: any, d: OptionsObjet): any {
  const el = h('div', `k-objet k-${d.genre}`)
  const src = String(d.src ?? '')
  const o = d.options ?? {}
  el.$kObjet = d
  if (d.nom) {
    nommes.set(d.nom, el)
    el.dataset.nom = d.nom
  }
  const scene = parent?.$kScene
  if (EXT_3D.test(src)) {
    el.classList.add('k-3d')
    el.dataset.src = src
    if (o.texte) {
      el.setAttribute('role', 'img')
      el.setAttribute('aria-label', String(o.texte))
    }
    if (o.secours) {
      const img = h('img', 'k-secours')
      img.src = o.secours
      img.alt = o.texte ?? ''
      el.append(img)
    }
    if (!scene) {
      // une « touche » : objet seul dans la page, il a sa propre petite scène
      if (o.hauteur) el.style.height = typeof o.hauteur === 'number' ? `${o.hauteur}px` : o.hauteur
      monteQuandVisible(el, () => import('../immersion/index.js').then((m) => m.monteObjetSeul(el)))
    } else scene.objets.push(el)
  } else if (EXT_LOTTIE.test(src)) {
    el.classList.add('k-lottie')
    el.dataset.src = src
    if (o.texte) {
      el.setAttribute('role', 'img')
      el.setAttribute('aria-label', String(o.texte))
    }
    monteQuandVisible(el, () => import('../immersion/index.js').then((m) => m.monteLottie(el)))
    if (scene) scene.calques.push(el)
  } else {
    const img = h('img', 'k-objet-image')
    img.src = src
    img.alt = o.texte ?? ''
    img.draggable = false
    img.decoding = 'async'
    el.append(img)
    el.$kVisuel = img
    if (scene) scene.calques.push(el)
  }
  if (o.taille && !EXT_3D.test(src)) el.style.setProperty('--k-taille', String(o.taille))
  if (o.position && !EXT_3D.test(src) && Array.isArray(o.position)) {
    el.classList.add('k-place')
    el.style.left = `${50 + Number(o.position[0]) * 10}%`
    el.style.top = `${50 - Number(o.position[1]) * 10}%`
  }
  corpsDe(el)
  parent.append(el)
  return el
}

export function scene(parent: any, o: Record<string, any> = {}): any {
  const el = h('div', 'k-scene')
  el.$kScene = { objets: [] as any[], calques: [] as any[], reglages: { ...o } as Record<string, any> }
  if (o.hauteur) el.style.height = typeof o.hauteur === 'number' ? `${o.hauteur}px` : o.hauteur
  if (o.fond && typeof o.fond === 'string') el.style.background = o.fond
  parent.append(el)
  return el
}

export function scenePrete(el: any) {
  const s = el.$kScene
  // objets 2D : répartis de gauche à droite s'ils n'ont pas de position
  const libres = (s?.calques ?? []).filter((c: any) => !c.classList.contains('k-place'))
  libres.forEach((c: any, i: number) => {
    if (libres.length > 1) c.style.left = `${((i + 1) / (libres.length + 1)) * 100}%`
  })
  if (!s?.objets.length && !s?.reglages.particules) return
  el.classList.add('k-scene-3d')
  monteQuandVisible(el, () => import('../immersion/index.js').then((m) => m.monteScene(el)))
}

export function reglage(el: any, nom: string, valeur: string, options: Record<string, any> = {}) {
  if (!el) return
  const s = el.$kScene ?? el.$kReglages ?? (el.$kReglages = {})
  const cible = s.reglages ?? s
  cible[nom] = valeur
  if (Object.keys(options).length) cible[nom + 'Options'] = options
  el.$kAppliqueReglage?.(nom, valeur, options)
}

function monteQuandVisible(el: any, monte: () => Promise<unknown>) {
  if (!estNavigateur()) return
  let fait = false
  const go = () => {
    if (fait) return
    fait = true
    monte().catch((e) => {
      console.error('Kaury immersion :', e)
      el.classList.add('k-immersion-erreur')
    })
  }
  if (typeof IntersectionObserver === 'undefined') return queueMicrotask(go)
  const io = new IntersectionObserver((es) => {
    if (es.some((e) => e.isIntersecting)) {
      io.disconnect()
      go()
    }
  }, { rootMargin: '300px' })
  requestAnimationFrame(() => io.observe(el))
  auNettoyage(() => io.disconnect())
}

// sons
let muetGlobal = false
const sons = new Set<HTMLAudioElement>()
export function son(parent: any, src: string, o: Record<string, any> = {}): any {
  const el = h('div', 'k-son')
  if (!estNavigateur()) return el
  const audio = new Audio(src)
  audio.loop = !!o.boucle
  audio.volume = typeof o.volume === 'number' ? o.volume : 0.6
  audio.preload = 'auto'
  sons.add(audio)
  // la plupart des navigateurs bloquent le son avant une interaction : on attend le premier geste
  const demarre = () => {
    if (!muetGlobal) audio.play().catch(() => {})
    removeEventListener('pointerdown', demarre)
    removeEventListener('keydown', demarre)
  }
  addEventListener('pointerdown', demarre)
  addEventListener('keydown', demarre)
  boutonMuet()
  auNettoyage(() => {
    audio.pause()
    sons.delete(audio)
  })
  void parent
  return el
}

export function joueSon(src: string, o: Record<string, any> = {}) {
  if (!estNavigateur() || muetGlobal) return
  const a = new Audio(src)
  a.volume = typeof o.volume === 'number' ? o.volume : 0.7
  a.play().catch(() => {})
}

let boutonCree = false
function boutonMuet() {
  if (boutonCree) return
  boutonCree = true
  const b = h('button', 'k-muet')
  b.type = 'button'
  const maj = () => {
    b.textContent = muetGlobal ? '🔇' : '🔊'
    b.setAttribute('aria-label', muetGlobal ? 'Activer le son' : 'Couper le son')
  }
  maj()
  b.addEventListener('click', () => {
    muetGlobal = !muetGlobal
    for (const s of sons) {
      if (muetGlobal) s.pause()
      else s.play().catch(() => {})
    }
    maj()
  })
  document.body.append(b)
}

export function appelleSur(el: any, type: string) {
  const ev = new (globalThis as any).Event(type)
  ;(el.$kEl ?? el).dispatchEvent(ev)
  void appelle
}
