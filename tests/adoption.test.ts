// A page that comes with its HTML adopts it as the server made it — a wide screen, nothing saved — and only then takes
// what the browser knows: the real size of the screen, a state kept with “persist”. Applied before, they make the page
// differ from its HTML, and the whole page is rebuilt (on every phone for “screen.mobile”: measured with Lighthouse).

import { test } from 'node:test'
import assert from 'node:assert/strict'

test('a saved state is restored after the served HTML is adopted, never before, and is not lost meanwhile', async () => {
  const g = globalThis as any
  const store = new Map<string, string>([['kaury:cart', '[1,2]']])
  g.window = g
  g.localStorage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) }
  g.document = { querySelector: (s: string) => (s === '#app' ? { firstChild: {} } : null) } // the page came with its HTML
  try {
    const { state, adopted } = await import('../src/runtime/reactive.js')
    const { persist } = await import('../src/runtime/utils.js')
    const cart = state([] as number[])
    persist('cart', cart)
    assert.equal(cart.v.length, 0, 'while the HTML is being adopted, the state is the one the server had')
    assert.equal(store.get('kaury:cart'), '[1,2]', 'and what was saved is not overwritten by it')
    adopted()
    assert.deepEqual([...cart.v], [1, 2], 'then the saved state comes back')
    cart.v.push(3)
    assert.equal(store.get('kaury:cart'), '[1,2,3]', 'and changes are saved as before')
    // once the page has adopted its HTML, a later “persist” restores at once
    store.set('kaury:theme', '"dark"')
    const theme = state('light')
    persist('theme', theme)
    assert.equal(theme.v, 'dark')
  } finally {
    delete g.window
    delete g.localStorage
    delete g.document
  }
})
