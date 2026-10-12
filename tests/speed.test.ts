import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, rmSync, mkdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { build } from '../src/cli/project.js'
import { backgroundPictures, heroPicture } from '../src/cli/pictures.js'
import { compile, setLanguage } from '../src/core/index.js'

setLanguage('en')
const TMP = resolve('tests/.tmp')

// Found by measuring three designed pages with Lighthouse: a page led by photographs scored 85,
// because of pictures loaded for nothing, too large for their place, or found too late.

const HEAD = 'page "/"\n  seo "Home", "A page."\n'

test('an image hidden on a screen does not load before the others, and the next one is the first of the page', () => {
  // the small picture placed over the hero, hidden on phones, was downloaded first on every phone
  const r = compile(HEAD + '  image "burrata.jpg", "A plate"\n    mobile hidden\n  image "terrace.jpg", "The terrace"\n', { file: 'test.kaury' })
  assert.deepEqual(r.errors.map((e) => e.format()), [])
  assert.match(r.js, /\$k\.img\([$\w]+, "\/burrata\.jpg", 0\)/)
  assert.match(r.js, /\$k\.img\([$\w]+, "\/terrace\.jpg", 2\)/)
})

test('an image with its width written tells the browser, which takes a file of that size', () => {
  const r = compile(HEAD + '  image "terrace.jpg", "The terrace"\n  image "burrata.jpg", "A plate", width 210\n', { file: 'test.kaury' })
  assert.deepEqual(r.errors.map((e) => e.format()), [])
  assert.match(r.js, /\$k\.img\([$\w]+, "\/burrata\.jpg", 1, 210\)/)
  assert.match(r.js, /\$k\.img\([$\w]+, "\/terrace\.jpg", 2\)/, 'nothing more when no width is written')
  const percent = compile(HEAD + '  image "burrata.jpg", "A plate", width 50%\n', { file: 'test.kaury' })
  assert.match(percent.js, /\$k\.img\([$\w]+, "\/burrata\.jpg", 2\)/, 'a width that depends on the page says nothing')
})

const IMAGES = {
  '/hall.jpg': { w: 1800, h: 1200, srcset: '/_kaury/img/hall-320-ab.webp 320w, /_kaury/img/hall-640-ab.webp 640w, /_kaury/img/hall-960-ab.webp 960w, /_kaury/img/hall-1600-ab.webp 1600w, /_kaury/img/hall-1800-ab.webp 1800w' },
  '/tile.jpg': { w: 300, h: 300 },
}

test('a background picture is served in its light versions: the large one, and a smaller one on phones', () => {
  const css = '.k1-7{color:#fff;--k-pic:url("/hall.jpg");background:linear-gradient(0deg,#000,#000),center/cover no-repeat var(--k-pic)}\n.k1-8{color:red}'
  const out = backgroundPictures(css, IMAGES)
  assert.match(out.css, /\.k1-7\{color:#fff;--k-pic:url\("\/_kaury\/img\/hall-1800-ab\.webp"\);background:/)
  assert.match(out.css, /@media \(max-width: 640px\)\{\.k1-7\{--k-pic:url\("\/_kaury\/img\/hall-960-ab\.webp"\)\}\}/)
  assert.match(out.css, /\.k1-8\{color:red\}/, 'the rest is left as it is')
  assert.deepEqual(out.pictures.get('k1-7'), { large: '/_kaury/img/hall-1800-ab.webp', small: '/_kaury/img/hall-960-ab.webp' })
})

test('a background picture with no lighter version, or inside a screen rule, keeps its address', () => {
  const plain = backgroundPictures('.k1-7{--k-pic:url("/tile.jpg");background:center/cover no-repeat var(--k-pic)}', IMAGES)
  assert.match(plain.css, /--k-pic:url\("\/tile\.jpg"\)/)
  assert.doesNotMatch(plain.css, /@media/)
  assert.deepEqual(plain.pictures.get('k1-7'), { large: '/tile.jpg' })
  const screen = backgroundPictures('@media (max-width: 640px){.k1-7.k1-7{--k-pic:url("/hall.jpg");background:center/cover no-repeat var(--k-pic)}}', IMAGES)
  assert.match(screen.css, /^@media \(max-width: 640px\)\{\.k1-7\.k1-7\{--k-pic:url\("\/_kaury\/img\/hall-960-ab\.webp"\);background:[^}]*\}\}$/, 'the picture of a phone rule is the small one, and no rule is put inside another')
  assert.equal(screen.pictures.size, 0, 'only what every screen shows is known as the picture of the element')
})

test('the background picture that opens a page is announced to the browser, and the image after it waits', () => {
  // the hero written over a photograph: the browser found the picture only after reading the stylesheet
  const pictures = new Map([['k1-7', { large: '/_kaury/img/hall-1800-ab.webp', small: '/_kaury/img/hall-960-ab.webp' }]])
  const body = '<main><section class="k-section k1-7 k1-c" id="hero"><h1>Strong</h1></section><section><img class="k-image k1-y" alt="A rack" loading="eager" decoding="async" fetchpriority="high" src="/rack.jpg"><img class="k-image" alt="Two" loading="eager" src="/two.jpg"></section></main>'
  const r = heroPicture(body, pictures)
  assert.match(r.head, /<link rel="preload" as="image" href="\/_kaury\/img\/hall-960-ab\.webp" media="\(max-width: 640px\)" fetchpriority="high">/)
  assert.match(r.head, /<link rel="preload" as="image" href="\/_kaury\/img\/hall-1800-ab\.webp" media="\(min-width: 641px\)" fetchpriority="high">/)
  // “data-k-wait”: the page keeps that choice when it takes the HTML over, instead of loading the image at once again
  assert.match(r.body, /<img class="k-image k1-y" alt="A rack" loading="lazy" decoding="async" src="\/rack\.jpg" data-k-wait>/)
  assert.match(r.body, /<img class="k-image" alt="Two" loading="eager" src="\/two\.jpg">/, 'only the image that had the first place gives it up')
})

test('an image that gave its first place to a background picture keeps waiting when the page takes its HTML over', async () => {
  // the page set it to load at once again while adopting the HTML: the picture of the page lost its head start
  const { img, setHydrating } = await import('../src/runtime/dom.js')
  const attrs = new Map<string, string>([['data-k-wait', ''], ['loading', 'lazy']])
  const el = { hasAttribute: (n: string) => attrs.has(n), getAttribute: (n: string) => attrs.get(n) ?? null, setAttribute: (n: string, v: string) => void attrs.set(n, v), removeAttribute: (n: string) => void attrs.delete(n) }
  const first = new Map<string, string>([['loading', 'eager'], ['fetchpriority', 'high']])
  const el2 = { hasAttribute: (n: string) => first.has(n), getAttribute: (n: string) => first.get(n) ?? null, setAttribute: (n: string, v: string) => void first.set(n, v), removeAttribute: (n: string) => void first.delete(n) }
  setHydrating(true)
  try {
    img(el, '/rack.jpg', 2)
    img(el2, '/terrace.jpg', 2)
  } finally {
    setHydrating(false)
  }
  assert.equal(attrs.get('loading'), 'lazy')
  assert.equal(attrs.has('fetchpriority'), false)
  assert.equal(first.get('loading'), 'eager', 'the first image of a page with no background picture still loads at once')
  assert.equal(first.get('fetchpriority'), 'high')
})

test('a background picture further down than the first image changes nothing', () => {
  const pictures = new Map([['k1-7', { large: '/_kaury/img/hall-1800-ab.webp', small: '/_kaury/img/hall-960-ab.webp' }]])
  const body = '<main><section><img class="k-image" alt="A rack" loading="eager" fetchpriority="high" src="/rack.jpg"></section><section class="k-section k1-7"></section></main>'
  const r = heroPicture(body, pictures)
  assert.equal(r.head, '')
  assert.equal(r.body, body)
  const logo = '<header><img class="k-logo-image" alt="Forge" src="/logo.svg"></header><section class="k-section k1-7"><h1>Strong</h1></section>'
  assert.match(heroPicture(logo, pictures).head, /rel="preload"/, 'a logo is not the picture of the page')
})

test('building a page over a photograph: light background, announced, and the images sized for their place', async () => {
  const sharp = (await import('sharp')).default
  const dir = join(TMP, 'speed')
  rmSync(dir, { recursive: true, force: true })
  mkdirSync(join(dir, 'public'), { recursive: true })
  const picture = (file: string, w: number, h: number, color: string) => sharp({ create: { width: w, height: h, channels: 3, background: color } }).jpeg({ quality: 90 }).toFile(join(dir, 'public', file))
  await picture('hall.jpg', 1800, 1200, '#334455')
  await picture('rack.jpg', 1400, 900, '#556677')
  await picture('small.jpg', 1400, 900, '#778899')
  await picture('gone.jpg', 1400, 900, '#99aabb')
  writeFileSync(join(dir, 'site.kaury'), [
    'site "Speed"', '  lang "en"', '',
    'page "/"', '  seo "Home", "A page."',
    '  section hero, background "hall.jpg", shade 0.6', '    title "Strong"',
    '  section', '    image "rack.jpg", "A rack"', '    image "small.jpg", "A plate", width 210', '    image "gone.jpg", "Hidden on phones"', '      mobile hidden', '',
  ].join('\n'))
  const r = await build(join(dir, 'site.kaury'), { out: join(dir, 'dist') })
  const html = readFileSync(join(r.dir, 'index.html'), 'utf8')
  assert.match(html, /--k-pic:url\(["']?\/_kaury\/img\/hall-1800-[0-9a-f]{8}\.webp["']?\)/)
  assert.match(html, /@media\s*\(max-width:\s*640px\)\{[^{}]*\{--k-pic:url\(["']?\/_kaury\/img\/hall-960-[0-9a-f]{8}\.webp["']?\)\}\}/)
  assert.match(html, /<link rel="preload" as="image" href="\/_kaury\/img\/hall-960-[0-9a-f]{8}\.webp" media="\(max-width: 640px\)" fetchpriority="high">/)
  assert.match(html, /<img class="[^"]*" alt="A rack" loading="lazy"[^>]*>/)
  assert.doesNotMatch(html, /alt="A rack"[^>]*fetchpriority/)
  assert.match(html, /<img class="[^"]*" alt="A plate"[^>]*sizes="\(max-width: 210px\) 100vw, 210px">/)
  assert.match(html, /<img class="[^"]*" alt="Hidden on phones" loading="lazy"/)
  // the widths a phone and a tablet really ask for exist: 800 (a phone of 400 points, twice as dense), 1280
  assert.match(html, /alt="A rack"[^>]*srcset="[^"]*rack-800-[0-9a-f]{8}\.webp 800w[^"]*rack-1280-[0-9a-f]{8}\.webp 1280w/)
})

test('only the first image of a page loads at once: the next ones wait for their turn', async () => {
  // three images “near the top” loaded together took the bandwidth of the one the visitor is looking at
  const { BASE } = await pageWithImages()
  const tags = [...BASE.matchAll(/<img[^>]*>/g)].map((m) => m[0])
  assert.equal(tags.length, 3)
  assert.match(tags[0], /loading="eager"[^>]*fetchpriority="high"/)
  assert.match(tags[1], /loading="lazy"/)
  assert.match(tags[2], /loading="lazy"/)
  assert.match(tags[1], /sizes="\(max-width: 640px\) 100vw, 60vw"/, 'it keeps the size of what is near the top')
})

async function pageWithImages(): Promise<{ BASE: string }> {
  const sharp = (await import('sharp')).default
  const dir = join(TMP, 'speed-three')
  rmSync(dir, { recursive: true, force: true })
  mkdirSync(join(dir, 'public'), { recursive: true })
  for (const [i, name] of ['one.jpg', 'two.jpg', 'three.jpg'].entries()) {
    await sharp({ create: { width: 1400, height: 900, channels: 3, background: `#${i + 3}${i + 3}5566` } }).jpeg({ quality: 90 }).toFile(join(dir, 'public', name))
  }
  writeFileSync(join(dir, 'site.kaury'), ['site "Three"', '  lang "en"', '', 'page "/"', '  seo "Home", "A page."', '  section', '    image "one.jpg", "One"', '    image "two.jpg", "Two"', '    image "three.jpg", "Three"', ''].join('\n'))
  const r = await build(join(dir, 'site.kaury'), { out: join(dir, 'dist') })
  return { BASE: readFileSync(join(r.dir, 'index.html'), 'utf8') }
}

// ---- the fallback of a web font: the device font, scaled to the width of the real one

/** A tiny font: “a” to “z” and the space, every letter `advance` units wide out of 1000. */
function tinyFont(advance: number): { tables: [string, Buffer][] } {
  const head = Buffer.alloc(54)
  head.writeUInt16BE(1000, 18) // unitsPerEm
  const hhea = Buffer.alloc(36)
  hhea.writeUInt16BE(28, 34) // 28 glyphs measured: .notdef, the space, a to z
  const hmtx = Buffer.alloc(28 * 4)
  for (let g = 1; g < 28; g++) hmtx.writeUInt16BE(advance, g * 4)
  // cmap, format 4: the space → glyph 1, a…z → glyphs 2…27, then the closing segment
  const sub = Buffer.alloc(16 + 3 * 8)
  sub.writeUInt16BE(4, 0)
  sub.writeUInt16BE(sub.length, 2)
  sub.writeUInt16BE(6, 6) // 3 segments
  const ends = [32, 122, 0xffff], starts = [32, 97, 0xffff], deltas = [(1 - 32) & 0xffff, (2 - 97) & 0xffff, 1]
  for (let i = 0; i < 3; i++) {
    sub.writeUInt16BE(ends[i], 14 + i * 2)
    sub.writeUInt16BE(starts[i], 14 + 6 + 2 + i * 2)
    sub.writeUInt16BE(deltas[i], 14 + 6 + 2 + 6 + i * 2)
  }
  const cmap = Buffer.concat([Buffer.from([0, 0, 0, 1, 0, 3, 0, 1, 0, 0, 0, 12]), sub])
  return { tables: [['cmap', cmap], ['head', head], ['hhea', hhea], ['hmtx', hmtx]] }
}

test('the width a font writes at is read from its file, as the font services give it (WOFF2) or as it is (TrueType)', async () => {
  const { brotliCompressSync } = await import('node:zlib')
  const { textWidth } = await import('../src/cli/fontmetrics.js')
  const { tables } = tinyFont(520)
  // TrueType: a directory of 16 bytes per table, then the tables
  const dir = Buffer.alloc(12 + tables.length * 16)
  dir.writeUInt32BE(0x00010000, 0)
  dir.writeUInt16BE(tables.length, 4)
  let at = dir.length
  tables.forEach(([tag, data], i) => {
    dir.write(tag, 12 + i * 16, 'latin1')
    dir.writeUInt32BE(at, 12 + i * 16 + 8)
    dir.writeUInt32BE(data.length, 12 + i * 16 + 12)
    at += data.length
  })
  const ttf = Buffer.concat([dir, ...tables.map(([, d]) => d)])
  assert.equal(textWidth(ttf)?.toFixed(2), '0.52')
  // WOFF2: tables named by their number (cmap 0, head 1, hhea 2, hmtx 3), their lengths, then everything compressed
  const entries = Buffer.concat(tables.map(([, d], i) => Buffer.from([i, d.length >> 7 ? 0x80 | (d.length >> 7) : -1, d.length & 0x7f].filter((x) => x >= 0))))
  const stream = brotliCompressSync(Buffer.concat(tables.map(([, d]) => d)))
  const header = Buffer.alloc(48)
  header.write('wOF2', 0, 'latin1')
  header.writeUInt32BE(0x00010000, 4)
  header.writeUInt16BE(tables.length, 12)
  header.writeUInt32BE(stream.length, 20)
  assert.equal(textWidth(Buffer.concat([header, entries, stream]))?.toFixed(2), '0.52')
  assert.equal(textWidth(Buffer.from('not a font')), undefined, 'a file that is no font says nothing, and the build goes on')
})

test('a web font gets a fallback of its width, and the family names it right after itself', async () => {
  // a row of buttons took one line less when the real font arrived, and the page jumped (0.15 of layout shift)
  const { fallbackFaces, ARIAL } = await import('../src/cli/fontmetrics.js')
  const css = fallbackFaces('Tanker', ARIAL.regular * 0.8)
  assert.match(css, /@font-face\{font-family:"Tanker fallback";src:local\("Arial"\);font-weight:100 500;size-adjust:80\.0%\}/)
  assert.match(css, /src:local\("Arial Bold"\),local\("Arial"\);font-weight:600 900;size-adjust:80\.0%/, 'the bold weights too, from the same measure when no bold file was read')
  const both = fallbackFaces('Satoshi', ARIAL.regular, ARIAL.bold * 1.1)
  assert.match(both, /font-weight:100 500;size-adjust:100\.0%/)
  assert.match(both, /font-weight:600 900;size-adjust:110\.0%/)
  const r = compile('site "X"\n  fonts "Satoshi", "Tanker"\n\npage "/"\n  seo "Home", "A page."\n  text "x", font "Tanker"\n', { file: 'test.kaury' })
  assert.match(r.css, /--k-font:"Satoshi", "Satoshi fallback", var\(--k-font-fallback\)/)
  assert.match(r.css, /font-family:"Tanker", "Tanker fallback", var\(--k-font-fallback\)/)
})

test('the font file loaded first for the titles is the one the titles really use', async () => {
  // a site with thin titles (weight 300) loaded the bold file first: the thin one came late, and the headline with it
  const { titleWeightOf } = await import('../src/cli/fonts.js')
  assert.equal(titleWeightOf('.k-title{font-weight:300}.ks-x{font-weight:700}'), 300, 'the weight written for every title')
  assert.equal(titleWeightOf('.ks-display{font-weight:800}.ks-x{font-weight:500}'), 800, 'no weight for the titles: the heaviest one used')
  assert.equal(titleWeightOf('.ks-x{color:red}'), 700, 'nothing written: the weight of the titles of Kaury')
  assert.equal(titleWeightOf('.k-title{font-weight:300}\n.k-title{font-weight:600}'), 600, 'the last one written wins, as in the page')
})

test('an object placed to the side of a scene comes back toward the middle on a narrow screen', async () => {
  // the object of the first screen, at the right of the text on a desktop, was out of the picture on every phone
  const { sideways } = await import('../src/immersion/place.js')
  assert.equal(sideways(2.3, 1.6), 2.3, 'a wide screen changes nothing')
  assert.equal(sideways(2.3, 0.9), 2.3)
  assert.equal(sideways(-2, 0.45), -1, 'half as wide as needed: half the way back, on either side')
  assert.equal(sideways(0, 0.5), 0, 'the middle stays the middle')
  // on a phone it is still at the side, half in the picture: beside the text as far as a phone allows, not behind it
  assert.ok(sideways(2.3, 0.5) > 1.2 && sideways(2.3, 0.5) < 1.4)
})
