// Réactivité de Kaury : un état change → seules les parties de page qui le lisent se mettent à jour.

export interface Effet {
  fn: () => void
  deps: Set<Set<Effet>>
  actif: boolean
  enCours: boolean
}

let effetCourant: Effet | null = null
let profondeurLot = 0
const enAttente = new Set<Effet>()
const registre = new WeakMap<object, Map<PropertyKey, Set<Effet>>>()
export const ITER = Symbol('kaury.iter')
export const BRUT = Symbol('kaury.brut')

export let signaleur: (e: unknown) => void = (e) => console.error(e)
export function definisSignaleur(f: (e: unknown) => void) {
  signaleur = f
}

export function suit(cible: object, cle: PropertyKey) {
  if (!effetCourant) return
  let m = registre.get(cible)
  if (!m) registre.set(cible, (m = new Map()))
  let s = m.get(cle)
  if (!s) m.set(cle, (s = new Set()))
  if (!s.has(effetCourant)) {
    s.add(effetCourant)
    effetCourant.deps.add(s)
  }
}

export function declenche(cible: object, cle: PropertyKey) {
  const s = registre.get(cible)?.get(cle)
  if (!s) return
  for (const e of [...s]) planifie(e)
}

function planifie(e: Effet) {
  if (!e.actif || e === effetCourant) return
  if (profondeurLot > 0) enAttente.add(e)
  else lance(e)
}

function nettoie(e: Effet) {
  for (const s of e.deps) s.delete(e)
  e.deps.clear()
}

let profondeurLancement = 0
function lance(e: Effet) {
  if (!e.actif || e.enCours) return
  if (++profondeurLancement > 200) {
    profondeurLancement = 0
    throw new Error('Kaury : boucle infinie — un état se modifie lui-même pendant son affichage.')
  }
  nettoie(e)
  const prec = effetCourant
  effetCourant = e
  e.enCours = true
  try {
    e.fn()
  } catch (err) {
    signaleur(err)
  } finally {
    e.enCours = false
    effetCourant = prec
    profondeurLancement--
  }
}

// ---------------- propriétaires (pour libérer les effets d'une partie retirée) ----------------
export interface Proprio {
  effets: Effet[]
  nettoyages: (() => void)[]
  enfants: Proprio[]
}
let proprioCourant: Proprio | null = null

export function racine<T>(fn: () => T): [T, () => void] {
  const p: Proprio = { effets: [], nettoyages: [], enfants: [] }
  proprioCourant?.enfants.push(p)
  const prec = proprioCourant
  proprioCourant = p
  try {
    return [fn(), () => libere(p)]
  } finally {
    proprioCourant = prec
  }
}

function libere(p: Proprio) {
  for (const e of p.effets) {
    e.actif = false
    nettoie(e)
  }
  for (const f of p.nettoyages) {
    try {
      f()
    } catch (err) {
      signaleur(err)
    }
  }
  p.enfants.forEach(libere)
  p.effets = []
  p.nettoyages = []
  p.enfants = []
}

export function auNettoyage(fn: () => void) {
  proprioCourant?.nettoyages.push(fn)
}

export function effet(fn: () => void): () => void {
  const e: Effet = { fn, deps: new Set(), actif: true, enCours: false }
  proprioCourant?.effets.push(e)
  lance(e)
  return () => {
    e.actif = false
    nettoie(e)
  }
}

export function sansSuivi<T>(fn: () => T): T {
  const prec = effetCourant
  effetCourant = null
  try {
    return fn()
  } finally {
    effetCourant = prec
  }
}

/** Regroupe plusieurs changements : la page ne se redessine qu'une fois à la fin. */
export function lot<T>(fn: () => T): T {
  profondeurLot++
  try {
    return fn()
  } finally {
    profondeurLot--
    if (profondeurLot === 0) {
      while (enAttente.size) {
        const liste = [...enAttente]
        enAttente.clear()
        liste.forEach(lance)
      }
    }
  }
}

// ---------------- objets et listes réactifs ----------------
const proxies = new WeakMap<object, any>()

export function brut<T>(v: T): T {
  return v && typeof v === 'object' && (v as any)[BRUT] ? (v as any)[BRUT] : v
}

export function reactif<T>(v: T): T {
  if (v === null || typeof v !== 'object') return v
  if ((v as any)[BRUT]) return v
  const proto = Object.getPrototypeOf(v)
  if (!(Array.isArray(v) || proto === Object.prototype || proto === null)) return v
  const deja = proxies.get(v as any)
  if (deja) return deja
  const p = new Proxy(v as any, {
    get(t, k, r) {
      if (k === BRUT) return t
      const val = Reflect.get(t, k, r)
      if (typeof k === 'symbol') return val
      if (Array.isArray(t) && typeof val === 'function' && METHODES_MUTANTES.has(k as string)) {
        return (...args: any[]) => lot(() => (val as Function).apply(r, args.map(brut)))
      }
      suit(t, k)
      return reactif(val)
    },
    set(t, k, val, r) {
      const ancien = t[k]
      const avait = Object.prototype.hasOwnProperty.call(t, k)
      const ok = Reflect.set(t, k, brut(val), r)
      if (ancien !== brut(val) || !avait) {
        lot(() => {
          declenche(t, k)
          declenche(t, ITER)
          if (Array.isArray(t) && k !== 'length') declenche(t, 'length')
        })
      }
      return ok
    },
    deleteProperty(t, k) {
      const ok = Reflect.deleteProperty(t, k)
      lot(() => {
        declenche(t, k)
        declenche(t, ITER)
      })
      return ok
    },
    ownKeys(t) {
      suit(t, ITER)
      return Reflect.ownKeys(t)
    },
    has(t, k) {
      suit(t, k)
      return Reflect.has(t, k)
    },
  })
  proxies.set(v as any, p)
  return p
}

const METHODES_MUTANTES = new Set(['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse', 'fill', 'copyWithin'])

/** Un état : une valeur qui, quand elle change, met la page à jour. */
export class Cellule<T = any> {
  private _v: T
  constructor(v: T) {
    this._v = reactif(v)
  }
  get v(): T {
    suit(this, 'v')
    return this._v
  }
  set v(n: T) {
    const r = reactif(n)
    if (r === this._v && (r === null || typeof r !== 'object')) return
    this._v = r
    declenche(this, 'v')
  }
  /** Lecture sans abonnement. */
  peek(): T {
    return this._v
  }
  toString() {
    return String(this._v)
  }
}

/** Une valeur dérivée (soit total = …) : recalculée seulement quand ce qu'elle lit change. */
export class Derive<T = any> {
  private sale = true
  private val!: T
  private e: Effet
  constructor(private calcul: () => T) {
    this.e = {
      fn: () => {
        if (!this.sale) {
          this.sale = true
          declenche(this, 'v')
        }
      },
      deps: new Set(),
      actif: true,
      enCours: false,
    }
  }
  get v(): T {
    suit(this, 'v')
    if (this.sale) {
      nettoie(this.e)
      const prec = effetCourant
      effetCourant = this.e
      try {
        this.val = this.calcul()
      } finally {
        effetCourant = prec
      }
      this.sale = false
    }
    return this.val
  }
  set v(_: T) {
    throw new Error('Kaury : une valeur déclarée avec « soit » ne se modifie pas.')
  }
}

export const etat = <T>(v: T) => new Cellule(v)
export const derive = <T>(f: () => T) => new Derive(f)
