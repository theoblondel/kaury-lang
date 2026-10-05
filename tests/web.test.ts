import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync, rmSync, mkdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { build } from '../src/cli/project.js'
import { compile, setLanguage } from '../src/core/index.js'
import { run } from './helpers.js'

setLanguage('en')
const TMP = resolve('tests/.tmp')

test('building the Crush site: server-rendered HTML, automatic links, SEO files', async () => {
  const out = join(TMP, 'crush-dist')
  rmSync(out, { recursive: true, force: true })
  const r = await build(resolve('examples/crush/site.kaury'), { out })
  assert.deepEqual(r.pages.sort(), ['/', '/cart', '/story'])
  const html = readFileSync(join(out, 'index.html'), 'utf8')
  // content exists before the 3D (SEO)
  assert.match(html, /<h1 class="k-title[^"]*">Taste the difference<\/h1>/)
  assert.match(html, /Berry Crush/)
  assert.match(html, /<title>Crush — canned mocktails · Crush<\/title>/)
  assert.match(html, /name="description" content="Four alcohol-free/)
  assert.match(html, /<link rel="canonical" href="https:\/\/crush.example\/">/)
  // automatic links: section of the page, other page
  assert.match(html, /href="#flavors">Flavors</)
  assert.match(html, /href="\/story">Story</)
  assert.match(html, /href="\/cart">Cart</)
  // the 3D object is a light placeholder with an accessible name
  assert.match(html, /class="k-object k-character k-3d[^"]*"[^>]*aria-label="Kaury, the Crush mascot"/)
  // hydration markers, inline CSS, no third-party font
  assert.match(html, /<!--for-->/)
  assert.match(html, /<style>/)
  assert.doesNotMatch(html, /fonts\.googleapis/)
  assert.ok(existsSync(join(out, 'story', 'index.html')))
  assert.ok(existsSync(join(out, 'mascot.glb')))
  for (const f of ['sitemap.xml', 'robots.txt', 'llms.txt', '.htaccess', '_headers']) assert.ok(existsSync(join(out, f)), f)
  assert.match(html, /--k-accent:#EA4374/)
  // accent too light for white text: dark text is chosen automatically (WCAG)
  assert.match(html, /--k-on-accent:#16151a/)
})

test('a static page loads almost no JavaScript, and no 3D', async () => {
  const dir = join(TMP, 'simple')
  rmSync(dir, { recursive: true, force: true })
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'site.kaury'), 'page "/"\n  title "Hello"\n')
  const r = await build(join(dir, 'site.kaury'))
  const html = readFileSync(join(r.dir, 'index.html'), 'utf8')
  assert.match(html, /data-k-page="static"/)
  const js = /src="\/_kaury\/(static-[^"]+\.js)"/.exec(html)![1]
  const code = readFileSync(join(r.dir, '_kaury', js), 'utf8')
  assert.doesNotMatch(code, /WebGLRenderer/)
  assert.ok(code.length < 3_000, `the static page JS weighs ${code.length} bytes`)
})

test('the generator writes mobile CSS that wins over the defaults', () => {
  const r = compile('page "/"\n  grid 3 columns, gap 24\n    mobile 1 column\n    text "a"\n', { file: 'x.kaury' })
  assert.ok(r.ok)
  assert.match(r.css, /@media \(max-width: 640px\)\{(\.[\w-]+){2}\{--k-columns:1;grid-template-columns:repeat\(1, minmax\(0, 1fr\)\)\}\}/)
})

test('pages with parameters: /product/:id', async () => {
  const { findPage, renderPage } = await import('../src/runtime/index.js')
  const { installSSR, serialize } = await import('../src/runtime/ssr.js')
  const { module } = await run('page "/product/:id"\n  title "Product {id}"\n')
  assert.equal(findPage(module.$pages, '/product/42')?.params.id, '42')
  const doc = installSSR()
  const target = doc.createElement('div')
  renderPage(module, '/product/42', target)
  assert.match(serialize(target), /Product 42/)
})

test('server render: component with slot, reactive if/for', async () => {
  const { renderPage } = await import('../src/runtime/index.js')
  const { installSSR, serialize } = await import('../src/runtime/ssr.js')
  const { module } = await run([
    'state fruits = ["apple", "kiwi"]',
    'component Box heading',
    '  box',
    '    subtitle heading',
    '    slot',
    'page "/"',
    '  Box "Basket"',
    '    for f, i in fruits',
    '      text "{i + 1}. {f}"',
    '    if fruits.length > 1',
    '      text "several"',
    '',
  ].join('\n'))
  const doc = installSSR()
  const target = doc.createElement('div')
  renderPage(module, '/', target)
  const html = serialize(target)
  assert.match(html, /<h2 class="k-subtitle">Basket<\/h2>/)
  assert.match(html, /1\. apple.*2\. kiwi.*several/s)
})

test('hydration adopts the server HTML (same nodes) and falls back when it differs', async () => {
  const { renderPage } = await import('../src/runtime/index.js')
  const { installSSR } = await import('../src/runtime/ssr.js')
  const { module } = await run([
    'state n = 0',
    'state items = ["a", "b"]',
    'page "/"',
    '  section',
    '    title "Count {n}"',
    '    for x in items',
    '      text x',
    '    if n > 5',
    '      text "big"',
    '    button "+" -> n += 1',
    '',
  ].join('\n'))
  const doc = installSSR()
  const target = doc.createElement('div')
  renderPage(module, '/', target)
  const h1 = target.firstChild.firstChild.firstChild
  const info = renderPage(module, '/', target, true)
  assert.equal(info.hydrated, true)
  assert.equal(target.firstChild.firstChild.firstChild, h1, 'the title node was adopted, not recreated')
  // a different state than the server HTML: rebuilt, never broken
  module.$pages // keep the module
  const target2 = doc.createElement('div')
  renderPage(module, '/', target2)
  target2.firstChild.firstChild.appendChild(doc.createElement('aside')) // tampered HTML
  const before = target2.firstChild
  const info2 = renderPage(module, '/', target2, true)
  assert.equal(info2.found, true)
  assert.notEqual(target2.firstChild, before)
})

test('documentation examples compile without errors', () => {
  const blocks = (f: string) => readFileSync(f, 'utf8').split('```').filter((_, i) => i % 2 === 1)
  const readme = blocks('README.md').find((b) => b.startsWith('kaury\n') || b.includes('page "/"'))!
  const ai = readFileSync('docs/kaury-ai.md', 'utf8').split('## 6. Complete example')[1].split('```')[1]
  for (const [name, code] of [['README', readme], ['kaury-ai complete example', ai]]) {
    const clean = code.replace(/^kaury\n/, '').replace(/^\n/, '')
    const r = compile(clean, { file: name })
    assert.deepEqual(r.errors.map((e) => e.format(clean)), [], name)
  }
})

test('idioms from kaury-ai.md compile', () => {
  const snippets = [
    'state count = 0\nevery 2s, -> count += 1\n',
    'state menu = false\npage "/"\n  button "Menu" -> toggle menu\n  if menu\n    text "open"\n',
    'let list = [{ active: true }]\npage "/"\n  text (list.filter(x -> x.active)).length\n',
    'let size = 3\npage "/"\n  text (size)\n',
    'page "/"\n  scene\n    object can "c.glb"\n    button "Jump" -> jump can\n',
    'page "/"\n  character p "m.glb"\n    on click -> play "dance"\n    says "Hi!"\n',
    'page "/"\n  sound "a.mp3", loop, volume 0.4\n  button "Click" -> sound "click.mp3"\n',
    'page "/product/:id"\n  product = await load "/api/products/{id}"\n  if product\n    title product.name\n',
    'component Box heading\n  box\n    subtitle heading\n    slot\npage "/"\n  Box "Hi"\n    text "inside"\n',
    'page "/"\n  section\n    style hover lift 4, shadow strong\n    mobile hidden\n',
    'page "/"\n  grid 3 columns\n    tablet 2 columns\n    mobile 1 column\n',
    'import confetti from "canvas-confetti"\npage "/"\n  button "Party" -> confetti()\n',
    'page "/"\n  on load -> print "ready"\n  on scroll -> print scroll\n',
    'site "X"\n  url "https://x.ch"\n  transition slide\npage "/"\n  title "x"\n',
    'page "/"\n  scene immediate, particles stars\n    light night\n    object "a.glb"\n',
  ]
  for (const s of snippets) {
    const r = compile(s, { file: 's.kaury' })
    assert.deepEqual(r.errors.map((e) => e.format(s)), [], s)
  }
})

test('kaury check --json: output an AI can read', async () => {
  const { execFileSync } = await import('node:child_process')
  const f = join(TMP, 'wrong.kaury')
  writeFileSync(f, 'state count = 0\nprint countt\n')
  let out = ''
  try {
    execFileSync(process.execPath, ['node_modules/tsx/dist/cli.mjs', 'src/cli/index.ts', 'check', f, '--json', '--lang', 'en'], { encoding: 'utf8' })
  } catch (e: any) {
    out = e.stdout
  }
  const j = JSON.parse(out)
  assert.equal(j.ok, false)
  assert.equal(j.problems[0].line, 2)
  assert.match(j.problems[0].fix, /count/)
})

test('content collections: one page per item, markdown, images, static pages', async () => {
  const r = await build(resolve('tests/fixtures/blog/site.kaury'), { out: join(TMP, 'blog-dist') })
  assert.deepEqual(r.pages.sort(), ['/', '/blog/first-post', '/blog/second-post'])
  assert.equal(r.staticPages, 3)
  const home = readFileSync(join(r.dir, 'index.html'), 'utf8')
  assert.match(home, /<h1 class="k-title">Studio<\/h1>/)
  assert.match(home, /href="\/blog\/second-post"/)
  const post = readFileSync(join(r.dir, 'blog', 'first-post', 'index.html'), 'utf8')
  assert.match(post, /<title>First post · Blog<\/title>/)
  assert.match(post, /<h2[^>]*>Hello<\/h2>/)
  assert.match(post, /<strong>bold<\/strong>/)
  assert.match(post, /src="\/_kaury\/content\/[0-9a-f]{8}-cover\.webp"/)
  assert.match(post, /srcset=/)
  // static: no data and no app code in the page
  assert.doesNotMatch(post, /k-data-|k-item/)
  assert.match(post, /static-[^"]+\.js/)
})
