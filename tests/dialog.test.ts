import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, rmSync, mkdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { build } from '../src/cli/project.js'
import { compile, setLanguage } from '../src/core/index.js'

setLanguage('en')
const TMP = resolve('tests/.tmp')

async function page(name: string, code: string) {
  const dir = join(TMP, name)
  rmSync(dir, { recursive: true, force: true })
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'site.kaury'), code)
  const r = await build(join(dir, 'site.kaury'))
  return { r, html: readFileSync(join(r.dir, 'index.html'), 'utf8') }
}

const BOOKING = `page "/"
  title "Chez Lina"
  button "Book a table" -> open booking
  dialog booking, "Book a table"
    form -> close booking
      field name, "Your name"
      button "Send"
`

test('dialog: a window over the page, opened by its state, without an error or a warning', () => {
  const r = compile(BOOKING, { file: 'x.kaury' })
  assert.deepEqual(r.errors.map((e) => e.message), [])
  assert.deepEqual(r.warnings.map((e) => e.message), [])
  assert.match(r.js, /\$k\.dialog\(/)
})

test('dialog: the server writes a closed <dialog> with its close button and its heading', async () => {
  const { html } = await page('dialog-ssr', BOOKING)
  assert.match(html, /<dialog class="k-dialog" aria-label="Book a table"><button class="k-dialog-close" type="button" aria-label="Close">×<\/button><h2 class="k-dialog-title">Book a table<\/h2>/)
  assert.doesNotMatch(html, /<dialog[^>]* open/)
  // the content is in the page (read by search engines), the page carries what opens it
  assert.match(html, /placeholder="Your name"/)
  assert.match(html, /data-k-page="dynamic"/)
  assert.match(html, /\.k-dialog\[open\]/)
})

test('dialog: written before the button, in French, the close button in the language of the site', async () => {
  const { html } = await page('dialog-fr', `site "Lina"
  langue "fr"
page "/"
  fenetre reservation, "Réserver"
    texte "Une table pour ce soir ?"
  titre "Chez Lina"
  bouton "Réserver" -> ouvre reservation
`)
  assert.match(html, /aria-label="Fermer">×</)
  // the title of the page stays its main heading: the window comes first and does not take it
  assert.match(html, /<h1 class="k-title[^"]*">Chez Lina<\/h1>/)
})

test('dialog: a title inside the window is never the main heading', async () => {
  const { html } = await page('dialog-heading', `page "/"
  dialog help
    title "How it works"
  title "Main"
  button "Help" -> open help
`)
  assert.match(html, /<h1 class="k-title[^"]*">Main<\/h1>/)
  assert.match(html, /<h2 class="k-title[^"]*">How it works<\/h2>/)
})

test('dialog: what is written from other habits gets the Kaury form', () => {
  const r = compile('page "/"\n  modal booking\n', { file: 'x.kaury' })
  assert.ok(r.errors.length)
  assert.match(r.errors.map((e) => e.format('page "/"\n  modal booking\n') + (e.fix ?? '')).join('\n'), /dialog booking, "Book a table"/)
})
