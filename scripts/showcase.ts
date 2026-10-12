// The showcase of the site: the designed examples of the repository (examples/<id>/site.kaury), built whole —
// pictures, forms, 3D — into site/public/showcase/<id>/ and served from that folder (kaury build --base).
// They are real sites running inside the site of the language, not screenshots. Called by site-prepare.ts.

import { existsSync, readFileSync, writeFileSync, rmSync, readdirSync, statSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { createHash } from 'node:crypto'
import { stringify } from 'yaml'
import { build } from '../src/cli/project.js'
import { newSiteTemplate } from '../src/cli/template.js'

interface Entry {
  id: string
  title: string
  kind: string
  mood: string
  text: string
  shows: string[]
}

/** In the order they are shown. The first one opens the home page. */
const ENTRIES: Entry[] = [
  { id: 'forge', title: 'Forge', kind: 'Strength gym', mood: 'dark, loud', text: 'A headline over a shaded photograph, a ticker, pictures in black and white, prices that follow a choice.', shows: ['shade', 'grayscale', 'ticker', 'components'] },
  { id: 'nuit', title: 'Nuit', kind: 'Perfume launch', mood: 'cold luxury', text: 'One object in three dimensions that follows the mouse, notes that change the picture when you point at them.', shows: ['3D object', 'state', 'form by e-mail'] },
  { id: 'lina', title: 'Chez Lina', kind: 'Restaurant', mood: 'light, warm', text: 'Led by photography: a picture pinned over another, tabs that filter a menu, a card that stays in view.', shows: ['pin', 'tabs', 'sticky', 'form by e-mail'] },
  { id: 'terre', title: 'Terre', kind: 'Ceramics shop', mood: 'quiet gallery', text: 'A shop: pieces filtered by kind, a page for each one, a basket kept in the browser.', shows: ['pages from a list', 'persist', 'functions', 'tabs'] },
  { id: 'relay', title: 'Relay', kind: 'Product page', mood: 'clear, exact', text: 'No photograph: the picture is the product, drawn in Kaury and alive. Figures and bars follow the period you choose.', shows: ['live chart', 'state', 'data', 'details'] },
  { id: 'crush', title: 'Crush', kind: 'Drink brand', mood: 'pop, immersive', text: 'Three pages, a scene in 3D with a mascot, a cart kept in the browser.', shows: ['scene', 'character', 'persist', 'pages'] },
]

/** What “kaury new” gives: each one is made here as the command makes it, then built like the others. */
const STARTERS = [
  { id: 'landing', title: 'Landing', text: 'A product page made of ready-made blocks: hero, features, prices, questions, contact.' },
  { id: 'portfolio', title: 'Portfolio', text: 'Work, a way of working, what clients say, a form.' },
  { id: 'blog', title: 'Blog', text: 'Posts written in Markdown, one page each, built at once.' },
]

/** A built demonstration is not a page to find on Google: no files for search engines, and “noindex” on its pages. */
function asDemonstration(target: string, pages: string[]) {
  for (const extra of ['sitemap.xml', 'robots.txt', 'llms.txt', '.htaccess', '_headers', '404.html', 'api']) rmSync(join(target, extra), { recursive: true, force: true })
  for (const page of pages) {
    const file = page === '/' ? join(target, 'index.html') : join(target, page.slice(1), 'index.html')
    if (existsSync(file)) writeFileSync(file, readFileSync(file, 'utf8').replace('<head>', '<head>\n<meta name="robots" content="noindex">'))
  }
}

/** What changes the result of a build: the sources of the compiler and of the runtime. */
function stamp(root: string): string {
  const h = createHash('sha1')
  const walk = (dir: string) => {
    for (const f of readdirSync(dir).sort()) {
      const p = join(dir, f)
      if (statSync(p).isDirectory()) walk(p)
      else h.update(f + statSync(p).size + statSync(p).mtimeMs)
    }
  }
  walk(join(root, 'src'))
  return h.digest('hex')
}

function folderHash(dir: string): string {
  const h = createHash('sha1')
  const walk = (d: string) => {
    for (const f of readdirSync(d).sort()) {
      if (f.startsWith('.') || ['api', 'functions', 'netlify', 'dist'].includes(f)) continue
      const p = join(d, f)
      if (statSync(p).isDirectory()) walk(p)
      else h.update(f + statSync(p).size + statSync(p).mtimeMs)
    }
  }
  walk(dir)
  return h.digest('hex')
}

export async function buildShowcase(root: string, site: string): Promise<{ sites: number; built: number }> {
  const out = join(site, 'public', 'showcase')
  const made = stamp(root)
  let built = 0
  const list = []
  // the code of the sites is read by the showcase page only: the home page does not carry it
  const codes = []
  for (const e of ENTRIES) {
    const dir = join(root, 'examples', e.id)
    const entry = join(dir, 'site.kaury')
    if (!existsSync(entry)) throw new Error(`examples/${e.id}/site.kaury does not exist`)
    const target = join(out, e.id)
    const base = `/showcase/${e.id}/`
    const hash = createHash('sha1').update(folderHash(dir) + made).digest('hex')
    const hashFile = join(target, '.source-hash')
    if (!existsSync(hashFile) || readFileSync(hashFile, 'utf8') !== hash) {
      rmSync(target, { recursive: true, force: true })
      const r = await build(entry, { out: target, base })
      // the endpoints of the forms are written next to the source: an example sends no e-mail from here
      for (const d of ['api', 'functions', 'netlify']) rmSync(join(dir, d), { recursive: true, force: true })
      asDemonstration(target, r.pages)
      writeFileSync(hashFile, hash)
      built++
    }
    const code = readFileSync(entry, 'utf8').replace(/\r\n?/g, '\n').trim()
    // its first screen, as a picture: the index of the showcase page shows it before any frame is loaded
    mkdirSync(join(site, 'public', 'shots'), { recursive: true })
    if (existsSync(join(dir, 'preview.jpg'))) writeFileSync(join(site, 'public', 'shots', e.id + '.jpg'), readFileSync(join(dir, 'preview.jpg')))
    // what those lines became: the elements of the first page and the style rules written for it, counted in what was built
    const html = readFileSync(join(target, 'index.html'), 'utf8')
    const elements = (html.slice(html.indexOf('<div id="app">')).match(/<[a-z][a-z0-9]*[\s>]/g) ?? []).length
    const rules = ((/<style>([\s\S]*?)<\/style>/.exec(html)?.[1] ?? '').match(/\}/g) ?? []).length
    list.push({ ...e, path: base, lines: code.split('\n').length, elements, rules, shot: `shots/${e.id}.jpg` })
    codes.push({ id: e.id, raw: code })
  }
  // the starters of “kaury new”
  const starters = []
  for (const t of STARTERS) {
    const id = 'start-' + t.id
    const target = join(out, id)
    const base = `/showcase/${id}/`
    const files = newSiteTemplate(t.title, undefined, t.id)
    const hash = createHash('sha1').update(JSON.stringify(files) + made).digest('hex')
    const hashFile = join(target, '.source-hash')
    if (!existsSync(hashFile) || readFileSync(hashFile, 'utf8') !== hash) {
      const dir = join(site, '.kaury-cache', 'starters', t.id)
      rmSync(dir, { recursive: true, force: true })
      for (const [name, content] of Object.entries(files)) {
        mkdirSync(dirname(join(dir, name)), { recursive: true })
        writeFileSync(join(dir, name), content)
      }
      rmSync(target, { recursive: true, force: true })
      const r = await build(join(dir, 'site.kaury'), { out: target, base })
      asDemonstration(target, r.pages)
      writeFileSync(hashFile, hash)
      built++
    }
    starters.push({ ...t, path: base, command: `kaury new my-site --template ${t.id}` })
  }
  const keep = new Set([...ENTRIES.map((e) => e.id), ...STARTERS.map((t) => 'start-' + t.id)])
  if (existsSync(out)) for (const d of readdirSync(out)) if (!keep.has(d)) rmSync(join(out, d), { recursive: true, force: true })
  writeFileSync(join(site, 'content', 'showcase.yaml'), '# Generated by scripts/showcase.ts from examples/ — do not edit.\n' + stringify({ list, starters }, { lineWidth: 0 }))
  writeFileSync(join(site, 'content', 'showcase-code.yaml'), '# Generated by scripts/showcase.ts from examples/ — do not edit.\n' + stringify({ list: codes }, { lineWidth: 0 }))
  return { sites: list.length + starters.length, built }
}
