// Content collections (blog posts, projects…) read from files at build time.
// On the server the data is complete. In the browser it is never bundled in the JavaScript:
// a page that needs it finds it inlined in its HTML, otherwise it is fetched on demand.

import { reactive, raw, batch, noteCollection, takeNotedCollections } from './reactive.js'
import { withBase } from './dom.js'

const RAW_ITEMS = Symbol('kaury.items')

/** Server side: the real data, remembering which collections a page read. */
export function serverCollection(id: string, data: any): any {
  if (typeof data !== 'object' || data === null) return data
  return new Proxy(data, {
    get(t, k, r) {
      if (k === RAW_ITEMS) return t
      if (typeof k !== 'symbol') noteCollection(id)
      return Reflect.get(t, k, r)
    },
  })
}

/** Reads a collection without counting it as used (page matching). */
export function rawItems(c: any): any[] {
  return (c && c[RAW_ITEMS]) ?? raw(c) ?? []
}

export function takeUsedCollections(): string[] {
  return takeNotedCollections()
}

let peeking = false

/** Looks at content without asking for it: what is not loaded yet stays unloaded (list of the addresses of a site). */
export function peek<T>(fn: () => T): T {
  const before = peeking
  peeking = true
  try {
    return fn()
  } finally {
    peeking = before
  }
}

/** Browser side: data inlined in the page, or fetched when first needed. */
export function clientCollection(id: string, url: string, list: boolean): any {
  const el = typeof document !== 'undefined' ? document.getElementById('k-data-' + id) : null
  if (el?.textContent) {
    try {
      return reactive(JSON.parse(el.textContent))
    } catch {
      /* fall back to fetching */
    }
  }
  // not inlined: the page does not show it. It is fetched the first time something really reads it,
  // so a page never downloads content it does not use.
  const value: any = reactive(list ? [] : {})
  let started = false
  const start = () => {
    if (started || peeking) return
    started = true
    fetch(withBase(url))
      .then((r) => r.json())
      .then((d) => batch(() => {
        if (list) value.push(...d)
        else Object.assign(value, d)
      }))
      .catch((e) => console.error(`Kaury: cannot load the content "${url}".`, e))
  }
  return new Proxy(value, {
    get(t, k, r) {
      if (typeof k !== 'symbol') start()
      return Reflect.get(t, k, r)
    },
    has(t, k) {
      start()
      return Reflect.has(t, k)
    },
    ownKeys(t) {
      start()
      return Reflect.ownKeys(t)
    },
  })
}
