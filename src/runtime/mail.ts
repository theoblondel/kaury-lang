// « form mail "hello@bloom.ch" -> … »: what is typed goes by e-mail, through the site's own endpoint.
// The address never travels: the page sends its short id, the endpoint knows the addresses the site wrote
// (found while building), so it cannot be used to write to anyone else.

import { markDynamic } from './reactive.js'
import { inBrowser } from './dom.js'

export const MAIL_ENDPOINT = '/api/kaury-mail'

/** Addresses met while rendering the pages on the server: the build gives them to the endpoint. */
export const mailAddresses = new Set<string>()

/** Short id of an address (FNV-1a, base 36): the same in the page, the build and the endpoint. */
export function mailId(address: string): string {
  let h = 0x811c9dc5
  const s = address.trim().toLowerCase()
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(36)
}

const loadedAt = Date.now()

export function mail(el: any, to: () => unknown, subject: (() => unknown) | null, done: ((e: Event) => unknown) | null) {
  markDynamic()
  if (!inBrowser()) {
    const a = String(to() ?? '')
    if (a) mailAddresses.add(a.trim().toLowerCase())
    return
  }
  el.addEventListener('submit', async (e: Event) => {
    e.preventDefault()
    if (el.getAttribute('aria-busy') === 'true') return
    const fr = (document.documentElement.lang || 'en').startsWith('fr')
    el.querySelector(':scope > .k-form-error')?.remove()
    const fields: Record<string, string> = {}
    for (const [k, v] of new FormData(el)) if (typeof v === 'string' && k) fields[k] = fields[k] ? `${fields[k]}, ${v}` : v
    for (const box of el.querySelectorAll('input[type=checkbox][name]')) fields[box.name] = box.checked ? (fr ? 'oui' : 'yes') : (fr ? 'non' : 'no')
    const buttons = [...el.querySelectorAll('button[type=submit], button:not([type])')] as HTMLButtonElement[]
    el.setAttribute('aria-busy', 'true')
    buttons.forEach((b) => (b.disabled = true))
    try {
      const body = JSON.stringify({ to: mailId(String(to() ?? '')), subject: subject ? String(subject() ?? '') : '', page: location.pathname, fields, time: Date.now() - loadedAt })
      const post = (url: string) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body })
      let r = await post(MAIL_ENDPOINT)
      // an Apache host whose .htaccess has no rewrite: the PHP file itself
      if (r.status === 404 || r.status === 405) r = await post(MAIL_ENDPOINT + '.php')
      if (!r.ok) throw new Error(await r.text())
      if (done) await done(e)
    } catch (err) {
      console.error('Kaury: the form could not be sent.', err)
      const p = document.createElement('p')
      p.className = 'k-form-error'
      p.setAttribute('role', 'alert')
      p.textContent = fr ? 'Le message n\'a pas pu partir. Réessayez dans un instant.' : 'The message could not be sent. Please try again in a moment.'
      el.append(p)
    } finally {
      el.removeAttribute('aria-busy')
      buttons.forEach((b) => (b.disabled = false))
    }
  })
}
