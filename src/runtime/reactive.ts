// Kaury reactivity: when a state changes, only the parts of the page that read it update.

export interface Effect {
  fn: () => void
  deps: Set<Set<Effect>>
  active: boolean
  running: boolean
}

let current: Effect | null = null
let batchDepth = 0
const pending = new Set<Effect>()
const registry = new WeakMap<object, Map<PropertyKey, Set<Effect>>>()
export const ITER = Symbol('kaury.iter')
export const RAW = Symbol('kaury.raw')

let reporter: (e: unknown) => void = (e) => console.error(e)
export function setReporter(f: (e: unknown) => void) {
  reporter = f
}

export function track(target: object, key: PropertyKey) {
  if (!current) return
  let m = registry.get(target)
  if (!m) registry.set(target, (m = new Map()))
  let s = m.get(key)
  if (!s) m.set(key, (s = new Set()))
  if (!s.has(current)) {
    s.add(current)
    current.deps.add(s)
  }
}

export function trigger(target: object, key: PropertyKey) {
  const s = registry.get(target)?.get(key)
  if (!s) return
  for (const e of [...s]) schedule(e)
}

function schedule(e: Effect) {
  if (!e.active || e === current) return
  if (batchDepth > 0) pending.add(e)
  else run(e)
}

function cleanup(e: Effect) {
  for (const s of e.deps) s.delete(e)
  e.deps.clear()
}

let runDepth = 0
function run(e: Effect) {
  if (!e.active || e.running) return
  if (++runDepth > 200) {
    runDepth = 0
    throw new Error('Kaury: infinite loop — a state changes itself while being displayed.')
  }
  cleanup(e)
  const prev = current
  current = e
  e.running = true
  try {
    e.fn()
  } catch (err) {
    reporter(err)
  } finally {
    e.running = false
    current = prev
    runDepth--
  }
}

// ---------------- owners (to release the effects of a removed part) ----------------
interface Owner {
  effects: Effect[]
  cleanups: (() => void)[]
  children: Owner[]
}
let owner: Owner | null = null

export function root<T>(fn: () => T): [T, () => void] {
  const o: Owner = { effects: [], cleanups: [], children: [] }
  owner?.children.push(o)
  const prev = owner
  owner = o
  try {
    return [fn(), () => release(o)]
  } catch (e) {
    release(o) // a failed render (e.g. hydration mismatch) leaves no effect behind
    throw e
  } finally {
    owner = prev
  }
}

function release(o: Owner) {
  for (const e of o.effects) {
    e.active = false
    cleanup(e)
  }
  for (const f of o.cleanups) {
    try {
      f()
    } catch (err) {
      reporter(err)
    }
  }
  o.children.forEach(release)
  o.effects = []
  o.cleanups = []
  o.children = []
}

export function onCleanup(fn: () => void) {
  owner?.cleanups.push(fn)
}

export function effect(fn: () => void): () => void {
  const e: Effect = { fn, deps: new Set(), active: true, running: false }
  owner?.effects.push(e)
  run(e)
  return () => {
    e.active = false
    cleanup(e)
  }
}

export function untracked<T>(fn: () => T): T {
  const prev = current
  current = null
  try {
    return fn()
  } finally {
    current = prev
  }
}

/** Groups several changes: the page redraws once at the end. */
export function batch<T>(fn: () => T): T {
  batchDepth++
  try {
    return fn()
  } finally {
    batchDepth--
    if (batchDepth === 0) {
      while (pending.size) {
        const list = [...pending]
        pending.clear()
        list.forEach(run)
      }
    }
  }
}

// ---------------- reactive objects and lists ----------------
const proxies = new WeakMap<object, any>()
const MUTATING = new Set(['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse', 'fill', 'copyWithin'])

export function raw<T>(v: T): T {
  return v && typeof v === 'object' && (v as any)[RAW] ? (v as any)[RAW] : v
}

export function reactive<T>(v: T): T {
  if (v === null || typeof v !== 'object') return v
  if ((v as any)[RAW]) return v
  const proto = Object.getPrototypeOf(v)
  if (!(Array.isArray(v) || proto === Object.prototype || proto === null)) return v
  const existing = proxies.get(v as any)
  if (existing) return existing
  const p = new Proxy(v as any, {
    get(t, k, r) {
      if (k === RAW) return t
      const val = Reflect.get(t, k, r)
      if (typeof k === 'symbol') return val
      if (Array.isArray(t) && typeof val === 'function' && MUTATING.has(k as string)) {
        return (...args: any[]) => batch(() => (val as Function).apply(r, args.map(raw)))
      }
      track(t, k)
      return reactive(val)
    },
    set(t, k, val, r) {
      const old = t[k]
      const had = Object.prototype.hasOwnProperty.call(t, k)
      const ok = Reflect.set(t, k, raw(val), r)
      if (old !== raw(val) || !had) {
        batch(() => {
          trigger(t, k)
          trigger(t, ITER)
          if (Array.isArray(t) && k !== 'length') trigger(t, 'length')
        })
      }
      return ok
    },
    deleteProperty(t, k) {
      const ok = Reflect.deleteProperty(t, k)
      batch(() => {
        trigger(t, k)
        trigger(t, ITER)
      })
      return ok
    },
    ownKeys(t) {
      track(t, ITER)
      return Reflect.ownKeys(t)
    },
    has(t, k) {
      track(t, k)
      return Reflect.has(t, k)
    },
  })
  proxies.set(v as any, p)
  return p
}

/** A state: a value that updates the page when it changes. */
export class Cell<T = any> {
  private _v: T
  constructor(v: T) {
    this._v = reactive(v)
  }
  get v(): T {
    track(this, 'v')
    return this._v
  }
  set v(n: T) {
    const r = reactive(n)
    if (r === this._v && (r === null || typeof r !== 'object')) return
    this._v = r
    trigger(this, 'v')
  }
  peek(): T {
    return this._v
  }
  toString() {
    return String(this._v)
  }
}

/** A derived value (let total = …): recomputed only when what it reads changes. */
export class Derived<T = any> {
  private dirty = true
  private val!: T
  private e: Effect
  constructor(private compute: () => T) {
    this.e = {
      fn: () => {
        if (!this.dirty) {
          this.dirty = true
          trigger(this, 'v')
        }
      },
      deps: new Set(),
      active: true,
      running: false,
    }
  }
  get v(): T {
    track(this, 'v')
    if (this.dirty) {
      cleanup(this.e)
      const prev = current
      current = this.e
      try {
        this.val = this.compute()
      } finally {
        current = prev
      }
      this.dirty = false
    }
    return this.val
  }
  set v(_: T) {
    throw new Error('Kaury: a value declared with « let » cannot be changed.')
  }
}

export const state = <T>(v: T) => new Cell(v)
export const derived = <T>(f: () => T) => new Derived(f)
