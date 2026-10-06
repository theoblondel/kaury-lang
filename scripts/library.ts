// The library of the site: ready-made pieces (buttons, navs, heroes, effects…) and whole homepages,
// each one a real .kaury file in site/library/<category>/. Every file is built into its own small
// page under /lib/ (shown in a frame next to its code), and listed in content/library.yaml.
// A piece that does not compile stops the build. Unchanged pieces are not built again.

import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync, existsSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import { stringify } from 'yaml'
import { build } from '../src/cli/project.js'
import { compile } from '../src/core/index.js'

export const CATEGORIES: { id: string; name: string; text: string; height: number }[] = [
  { id: 'buttons', name: 'Buttons', text: 'Pills, neon, glass, brutalist, magnetic. Hover them.', height: 240 },
  { id: 'navs', name: 'Headers & navs', text: 'The top of a site, in every mood. Menus fold on phones by themselves.', height: 190 },
  { id: 'heroes', name: 'Heroes', text: 'First screens that make people stay: huge type, 3D, light, motion.', height: 600 },
  { id: 'cards', name: 'Cards', text: 'Glass, brutalist, product, profile, stats. Every one reacts to the mouse.', height: 440 },
  { id: 'effects', name: 'Effects', text: 'Tickers, typewriters, neon, 3D on scroll, particles, confetti.', height: 420 },
  { id: 'sections', name: 'Sections', text: 'Features, prices, reviews, questions, contact: whole parts of a page.', height: 640 },
  { id: 'footers', name: 'Footers', text: 'The bottom of a site, from quiet to loud.', height: 320 },
  { id: 'templates', name: 'Templates', text: 'Whole homepages, ready to make yours: a restaurant, an agency, a product, a festival…', height: 2200 },
]

interface Piece { id: string; category: string; title: string; style: string; height: number; lines: number; code: string; raw: string; preview: string; edit: string }

/** Newest change in the compiler and runtime: a piece is rebuilt when Kaury itself changes. */
function kauryStamp(root: string): string {
  let newest = 0
  const walk = (d: string) => {
    for (const f of readdirSync(d)) {
      const p = join(d, f)
      const s = statSync(p)
      if (s.isDirectory()) walk(p)
      else newest = Math.max(newest, s.mtimeMs)
    }
  }
  walk(join(root, 'src'))
  return String(newest)
}

export async function buildLibrary(root: string, site: string): Promise<{ pieces: number; built: number }> {
  const lib = join(site, 'library')
  const out = join(site, 'public', 'lib')
  const stamp = kauryStamp(root)
  const pieces: Piece[] = []
  let built = 0
  const seen = new Set<string>()
  for (const cat of CATEGORIES) {
    const dir = join(lib, cat.id)
    if (!existsSync(dir)) continue
    for (const f of readdirSync(dir).filter((x) => x.endsWith('.kaury')).sort()) {
      const raw = readFileSync(join(dir, f), 'utf8').replace(/\r\n?/g, '\n').trim()
      // first line: « // Title · style », then maybe « // height 300 »
      const head = /^\/\/\s*(.+?)\s*·\s*(.+)$/m.exec(raw.split('\n')[0])
      if (!head) throw new Error(`site/library/${cat.id}/${f}: the first line must be « // Title · style »`)
      const height = Number(/^\/\/\s*height\s+(\d+)/m.exec(raw)?.[1] ?? cat.height)
      const code = raw.split('\n').filter((l, i) => !(i === 0 || /^\/\/\s*height\s+\d+\s*$/.test(l))).join('\n').trim()
      const r = compile(code, { file: f })
      if (!r.ok) throw new Error(`site/library/${cat.id}/${f} does not compile:\n` + r.errors.map((e) => e.format(code)).join('\n'))
      const id = f.replace(/^\d+-|\.kaury$/g, '')
      const target = join(out, cat.id, id)
      seen.add(`${cat.id}/${id}`)
      const hash = createHash('sha1').update(raw + stamp).digest('hex')
      const hashFile = join(target, '.source-hash')
      if (!existsSync(hashFile) || readFileSync(hashFile, 'utf8') !== hash) {
        await build(join(dir, f), { out: target })
        // a preview is a piece of a page, not a page to find on Google
        for (const extra of ['sitemap.xml', 'robots.txt', 'llms.txt', '.htaccess', '_headers', '404.html']) rmSync(join(target, extra), { force: true })
        const index = join(target, 'index.html')
        // the preview lives under /lib/<category>/<id>/: its scripts and fonts are there too
        const base = `/lib/${cat.id}/${id}/`
        writeFileSync(index, readFileSync(index, 'utf8').replace('<head>', '<head>\n<meta name="robots" content="noindex">').replace(/(["'(])\/_kaury\//g, `$1${base}_kaury/`).replace('<html ', `<html data-k-base="${base}" `))
        writeFileSync(hashFile, hash)
        built++
      }
      const hash64 = Buffer.from(code, 'utf8').toString('base64')
      pieces.push({ id, category: cat.id, title: head[1], style: head[2], height, lines: code.split('\n').length, code: '```kaury\n' + code + '\n```', raw: code, preview: `/lib/${cat.id}/${id}/`, edit: `/play/#${hash64}` })
    }
  }
  // previews of pieces that no longer exist
  if (existsSync(out)) for (const c of readdirSync(out)) for (const p of readdirSync(join(out, c))) if (!seen.has(`${c}/${p}`)) rmSync(join(out, c, p), { recursive: true, force: true })

  const styles = [...new Set(pieces.filter((p) => p.category !== 'templates').map((p) => p.style))].sort()
  const data = {
    count: pieces.length,
    styles,
    categories: CATEGORIES.map((c) => ({ ...c, count: pieces.filter((p) => p.category === c.id).length, items: pieces.filter((p) => p.category === c.id) })).filter((c) => c.count),
  }
  writeFileSync(join(site, 'content', 'library.yaml'), '# Generated by scripts/library.ts from site/library — do not edit.\n' + stringify(data, { lineWidth: 0 }))
  return { pieces: pieces.length, built }
}
