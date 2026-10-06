// Kaury runtime: everything the generated code calls through “$k.”.

export { state, derived, effect, batch, root, untracked, reactive, raw, onCleanup, Cell, Derived } from './reactive.js'
export {
  t, print, load, send, sum, average, min, max, round, floor, ceil, abs, sqrt, random, pick, length, now, toText, toNumber,
  price, formatDate, shuffle, range, toList, delay, every, later, persist, copy, vibrate, scrollTo, share, equal, has, prop, m,
  confetti, NetworkError, setLocale, jsonLd,
} from './utils.js'
export {
  h, setText, text, attr, style, px, path, img, on, when, each, component, mark, rootNodes, rootClass, slot, bind, bindCheck,
  options, form, card, frame, autoLink, resolveLinks, mobileMenu, installMenus, markdown, html, classes, imageSize, inBrowser, slug,
} from './dom.js'
export { serverCollection, clientCollection, rawItems } from './content.js'
export { mail, mailId, mailAddresses, MAIL_ENDPOINT } from './mail.js'
export {
  mouse, scroll, screen, route, objects, namedObject, object, scene, sceneReady, setting, sound, playSound, motion, action,
  says, bodyOf, startGlobals,
} from './motion.js'
export { start, go, seo, renderPage, findPage, allPaths } from './router.js'
export { BASE_STYLE } from './style.js'

import { setReporter } from './reactive.js'
import { setReport } from './utils.js'

/** Shows an error clearly (in the console, and on screen during development). */
export function report(e: unknown) {
  const message = e instanceof Error ? e.message : String(e)
  console.error('Kaury:', e)
  const g = globalThis as any
  if (g.__kauryDev && typeof document !== 'undefined' && document.body) {
    let box = document.querySelector('.k-dev-error') as HTMLElement | null
    if (!box) {
      box = document.createElement('div')
      box.className = 'k-dev-error'
      box.addEventListener('click', () => box!.remove())
      document.body.append(box)
    }
    box.innerHTML = `<b>Runtime error</b>\n${message.replace(/</g, '&lt;')}\n\n<small>(click to close)</small>`
  }
}
setReporter(report)
setReport(report)
