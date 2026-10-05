// Construction de la page : éléments, textes réactifs, conditions, boucles, champs liés.

import { effet, racine, sansSuivi, lot, brut, auNettoyage } from './reactif.js'
import { t, enListe, appelle, enNombre } from './outils.js'

export const estNavigateur = () => typeof window !== 'undefined' && !(globalThis as any).__kaurySSR

export function h(balise: string, classes?: string): any {
  const el = document.createElement(balise)
  if (classes) el.className = classes
  return el
}
export const fragment = () => document.createDocumentFragment()
export function unique(f: any): any {
  const enfants = [...f.childNodes].filter((n: any) => n.nodeType !== 8 || true)
  return enfants.length === 1 ? enfants[0] : f
}

export function texte(el: any, fn: () => unknown) {
  effet(() => {
    el.textContent = t(fn())
  })
}

export function attr(el: any, nom: string, fn: () => unknown) {
  effet(() => {
    const v = fn()
    if (v === false || v === null || v === undefined) el.removeAttribute(nom)
    else el.setAttribute(nom, v === true ? '' : String(v))
    if (nom === 'disabled') el.disabled = !!v
  })
}

export function style(el: any, prop: string, fn: () => unknown) {
  effet(() => {
    const v = fn()
    el.style.setProperty(prop, v === null || v === undefined ? '' : String(v))
  })
}

export function chemin(s: unknown): string {
  const v = String(s ?? '')
  if (/^(\/|[a-z][a-z0-9+.-]*:|#|\.\.\/)/i.test(v)) return v
  return '/' + v.replace(/^\.\//, '')
}

export const px = (v: unknown) => (typeof v === 'number' ? `${v}px` : String(v ?? ''))

/** Écoute un événement. Les changements d'état faits dans l'action sont regroupés. */
export function sur(el: any, type: string, fn: (e: any) => any) {
  if (!estNavigateur()) return
  if (type === 'mount') {
    queueMicrotask(() => lot(() => appelle(() => fn(undefined))))
    return
  }
  if (type === 'scroll') {
    let prevu = false
    const ecoute = () => {
      if (prevu) return
      prevu = true
      requestAnimationFrame(() => {
        prevu = false
        lot(() => appelle(() => fn(undefined)))
      })
    }
    addEventListener('scroll', ecoute, { passive: true })
    auNettoyage(() => removeEventListener('scroll', ecoute))
    return
  }
  const cibleEl = el?.$kEl ?? el
  const gere = (e: any) => {
    if (type === 'submit') e.preventDefault()
    lot(() => appelle(() => fn(e)))
  }
  cibleEl.addEventListener(type, gere)
  if (type === 'click' && cibleEl.tagName && !['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA', 'LABEL'].includes(cibleEl.tagName)) {
    // un élément cliquable doit l'être aussi au clavier
    cibleEl.classList.add('k-cliquable')
    if (!cibleEl.hasAttribute('tabindex')) cibleEl.tabIndex = 0
    if (!cibleEl.hasAttribute('role')) cibleEl.setAttribute('role', 'button')
    cibleEl.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        gere(e)
      }
    })
  }
}

// ---------------- si / pour ----------------
export function si(parent: any, branches: [() => unknown, (p: any) => void][]) {
  const ancre = document.createComment('si')
  parent.append(ancre)
  let courant = -2
  let noeuds: any[] = []
  let libere: (() => void) | null = null
  effet(() => {
    const idx = branches.findIndex(([c]) => !!c())
    if (idx === courant) return
    sansSuivi(() => {
      libere?.()
      for (const n of noeuds) n.parentNode?.removeChild(n)
      courant = idx
      noeuds = []
      libere = null
      if (idx >= 0) {
        const f = fragment()
        const [, l] = racine(() => branches[idx][1](f))
        libere = l
        noeuds = [...f.childNodes]
        ;(ancre.parentNode ?? parent).insertBefore(f, ancre)
      }
    })
  })
  auNettoyage(() => libere?.())
}

interface Entree {
  noeuds: any[]
  libere: () => void
}

export function pour(parent: any, source: () => unknown, rendu: (item: any, i: number, p: any) => void) {
  const ancre = document.createComment('pour')
  parent.append(ancre)
  let entrees = new Map<unknown, Entree>()
  effet(() => {
    const liste = enListe(source())
    // lire chaque élément pour s'abonner aux remplacements
    const items = liste.map((x, i) => [x, i] as const)
    sansSuivi(() => {
      const nouvelles = new Map<unknown, Entree>()
      const vus = new Map<unknown, number>()
      const conteneur = ancre.parentNode ?? parent
      for (const [item, i] of items) {
        const b = brut(item)
        const base = typeof b === 'object' && b !== null ? b : `${typeof b}:${String(b)}`
        const n = vus.get(base) ?? 0
        vus.set(base, n + 1)
        const cle = n === 0 ? base : `${typeof base === 'string' ? base : 'o'}#${n}#${i}`
        let e = entrees.get(cle)
        if (e) entrees.delete(cle)
        else {
          const f = fragment()
          const [, l] = racine(() => rendu(item, i, f))
          e = { noeuds: [...f.childNodes], libere: l }
        }
        nouvelles.set(cle, e)
        for (const nd of e.noeuds) conteneur.insertBefore(nd, ancre)
      }
      for (const e of entrees.values()) {
        e.libere()
        for (const nd of e.noeuds) nd.parentNode?.removeChild(nd)
      }
      entrees = nouvelles
    })
  })
  auNettoyage(() => {
    for (const e of entrees.values()) e.libere()
  })
}

// ---------------- composants ----------------
export function composant(fn: any, args: (() => unknown)[], enfants: ((p: any) => void) | null) {
  const noms: string[] = fn.$params ?? []
  const props: any = {}
  noms.forEach((n, i) => {
    if (args[i]) Object.defineProperty(props, n, { get: args[i], enumerable: true })
  })
  if (args.length > noms.length) {
    console.warn(`Kaury : « ${fn.name} » reçoit ${args.length} valeurs mais n'a que ${noms.length} paramètres.`)
  }
  props.$enfants = enfants
  return fn(props)
}

export function contenu(el: any, enfants: ((p: any) => void) | null) {
  if (enfants) enfants(el)
  el.classList.add('k-contenu')
}

export function classeRacine(f: any, cls: string) {
  for (const n of [...(f.childNodes ?? [])]) if (n.nodeType === 1) n.classList.add(cls)
}

// ---------------- formulaires ----------------
export function lie(el: any, lit: () => unknown, ecrit: (v: unknown) => void, genre?: string) {
  effet(() => {
    const v = lit()
    const s = v === null || v === undefined ? '' : String(v)
    if (el.value !== s) el.value = s
    if (!estNavigateur()) el.setAttribute('value', s)
  })
  if (estNavigateur()) el.addEventListener('input', () => lot(() => ecrit(genre === 'nombre' ? enNombre(el.value) : el.value)))
}

export function lieCase(el: any, lit: () => unknown, ecrit: (v: boolean) => void) {
  effet(() => {
    el.checked = !!lit()
    if (!estNavigateur()) {
      if (el.checked) el.setAttribute('checked', '')
      else el.removeAttribute('checked')
    }
  })
  if (estNavigateur()) el.addEventListener('change', () => lot(() => ecrit(el.checked)))
}

export function options(el: any, liste: () => unknown[]) {
  effet(() => {
    const vals = liste()
    const courant = el.value
    while (el.firstChild) el.removeChild(el.firstChild)
    for (const v of vals) {
      const o = document.createElement('option')
      const b: any = brut(v)
      const valeur = typeof b === 'object' && b ? b.valeur ?? b.value ?? b.nom : b
      o.value = String(valeur)
      o.textContent = t(typeof b === 'object' && b ? b.texte ?? b.label ?? b.nom : b)
      el.appendChild(o)
    }
    if (courant) el.value = courant
  })
}

/** Entoure un champ de son étiquette (accessibilité). */
export function etiquette(el: any): any {
  const texteEt = el.dataset?.etiquette ?? el.getAttribute?.('data-etiquette')
  if (!texteEt) return el
  const l = h('label', el.type === 'checkbox' ? 'k-etiquette k-etiquette-case' : 'k-etiquette')
  const s = h('span')
  s.textContent = texteEt
  if (el.type === 'checkbox') l.append(el, s)
  else l.append(s, el)
  return l
}

export function formulaire(el: any) {
  el.setAttribute('novalidate', '')
  if (!estNavigateur()) return
  el.addEventListener('submit', (e: Event) => {
    if (!el.checkValidity()) {
      e.stopImmediatePropagation()
      e.preventDefault()
      el.classList.add('k-verifie')
      el.reportValidity()
    }
  }, { capture: true })
}

// ---------------- liens automatiques ----------------
const liensEnAttente: { a: any; mot: string }[] = []
let cheminsConnus: string[] = []
export function definisChemins(c: string[]) {
  cheminsConnus = c
}

export function lienAuto(a: any, mot: string) {
  if (/^(https?:|mailto:|tel:|\/|#)/.test(mot)) {
    a.setAttribute('href', mot)
    if (/^https?:/.test(mot)) {
      a.setAttribute('target', '_blank')
      a.setAttribute('rel', 'noopener')
    }
    return
  }
  liensEnAttente.push({ a, mot })
}

export function slug(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

/** Une fois la page construite : « Gouts » → #gouts si la section existe, sinon /gouts si la page existe. */
export function resousLiens(racinePage: any) {
  const ids = new Set<string>()
  const parcours = (n: any) => {
    if (n.id) ids.add(n.id)
    for (const e of n.childNodes ?? []) parcours(e)
  }
  parcours(racinePage)
  for (const { a, mot } of liensEnAttente.splice(0)) {
    const s = slug(mot)
    let href = '#'
    if (['accueil', 'home', 'index'].includes(s)) href = '/'
    else if (ids.has(s)) href = '#' + s
    else if (cheminsConnus.includes('/' + s)) href = '/' + s
    else if (cheminsConnus.some((c) => slug(c) === s)) href = cheminsConnus.find((c) => slug(c) === s)!
    else {
      const proche = [...ids].find((id) => id.startsWith(s) || s.startsWith(id))
      href = proche ? '#' + proche : '#' + s
    }
    a.setAttribute('href', href)
  }
}

/** Carte aux valeurs calculées : image (si c'est un fichier image), titre, puis texte. */
export function carte(el: any, valeurs: (() => unknown)[]) {
  const img = h('img', 'k-carte-image')
  img.loading = 'lazy'
  const titre = h('h3', 'k-carte-titre')
  const texteEl = h('p', 'k-carte-texte')
  el.append(img, titre, texteEl)
  effet(() => {
    const v = valeurs.map((f) => f())
    const estImg = (x: unknown) => typeof x === 'string' && /\.(png|jpe?g|webp|avif|gif|svg)(\?.*)?$/i.test(x)
    const image = v.find(estImg) as string | undefined
    const textes = v.filter((x) => !estImg(x))
    if (image) {
      img.setAttribute('src', chemin(image))
      img.setAttribute('alt', t(textes[0]))
    } else img.parentNode?.removeChild(img)
    titre.textContent = t(textes[0])
    if (textes[1] !== undefined) texteEl.textContent = t(textes[1])
    else texteEl.parentNode?.removeChild(texteEl)
  })
}
