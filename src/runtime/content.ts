// Content collections (blog posts, projects…) read from files at build time.
// On the server the data is complete. In the browser it is never bundled in the JavaScript:
// a page that needs it finds it inlined in its HTML, otherwise it is fetched on demand.

import { reactive, raw, batch } from './reactive.js'

const used = new Set<string>()
const RAW_ITEMS = Symbol('kaury.items')

/** Server side: the real data, remembering which collections a page read. */
export function serverCollection(id: string, data: any): any {
  if (typeof data !== 'object' || data === null) return data
  return new Proxy(data, {
    get(t, k, r) {
      if (k === RAW_ITEMS) return t
      if (typeof k !== 'symbol') used.add(id)
      return Reflect.get(t, k, r)
    },
  })
}

/** Reads a collection without counting it as used (page matching). */
export function rawItems(c: any): any[] {
  return (c && c[RAW_ITEMS]) ?? raw(c) ?? []
}

export function takeUsedCollections(): string[] {
  const l = [...used]
  used.clear()
  return l
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
  const value: any = reactive(list ? [] : {})
  fetch(url)
    .then((r) => r.json())
    .then((d) => batch(() => {
      if (list) value.push(...d)
      else Object.assign(value, d)
    }))
    .catch((e) => console.error(`Kaury: cannot load the content "${url}".`, e))
  return value
}
