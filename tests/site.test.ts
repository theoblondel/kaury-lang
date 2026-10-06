// What the site of the language (site/) asked of Kaury: look, json-ld, section names, code blocks, SVG sizes.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, rmSync, mkdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { build } from '../src/cli/project.js'
import { setLanguage } from '../src/core/index.js'
import { highlight } from '../src/core/highlight.js'
import { jsonLd } from '../src/runtime/utils.js'

setLanguage('en')
const TMP = resolve('tests/.tmp/site-features')

test('code blocks: Kaury, shell and JS are colored at build time', () => {
  const k = highlight('state likes = 0 // note\nbutton "I like {likes}", large -> likes += 1', 'kaury')
  assert.match(k, /<span class="k-k">state<\/span>/)
  assert.match(k, /<span class="k-c">\/\/ note<\/span>/)
  assert.match(k, /<span class="k-e">button<\/span>/)
  assert.match(k, /<span class="k-i">\{likes\}<\/span>/)
  assert.match(k, /<span class="k-o">large<\/span>/)
  assert.match(highlight('npm i -g kaury # go', 'bash'), /<span class="k-e">npm<\/span> i <span class="k-o">-g<\/span> kaury<span class="k-c"> # go<\/span>/)
  assert.equal(highlight('<b>', 'unknown'), '&lt;b&gt;')
})

test('json-ld: structured data that a text can never close early', () => {
  const s = jsonLd({ '@type': 'FAQPage', name: '</script><img src=x>' })
  assert.match(s, /^<script type="application\/ld\+json">\{"@type":"FAQPage"/)
  assert.doesNotMatch(s.slice(35, -9), /<\//)
})

test('look adds a class, section names win over variables, blank lines survive in <pre>, SVG size from the root tag', async () => {
  rmSync(TMP, { recursive: true, force: true })
  mkdirSync(join(TMP, 'public'), { recursive: true })
  writeFileSync(join(TMP, 'public', 'wide.svg'), '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 340"><rect width="300" height="220"/></svg>')
  writeFileSync(join(TMP, 'site.kaury'), [
    'let examples = [1, 2]',
    'let faq = { "@context": "https://schema.org", "@type": "FAQPage" }',
    '',
    'page "/"',
    '  head json-ld(faq)',
    '  section examples',
    '    grid 3 columns, look "pricing"',
    '      text "a"',
    '  section performance',
    '    image "wide.svg", "A wide drawing"',
    '    markdown "```kaury\\nlet a = 1\\n\\npage \\"/\\"\\n```"',
  ].join('\n'))
  const out = join(TMP, 'dist')
  await build(join(TMP, 'site.kaury'), { out })
  const html = readFileSync(join(out, 'index.html'), 'utf8')
  assert.match(html, /<section[^>]*id="examples"/)
  assert.match(html, /<section[^>]*id="performance"/)
  assert.match(html, /class="k-grid pricing/)
  assert.match(html, /<script type="application\/ld\+json">\{"@context":"https:\/\/schema.org","@type":"FAQPage"\}<\/script>/)
  assert.match(html, /src="\/wide.svg" width="1200" height="340"/)
  assert.match(html, /<span class="k-n">1<\/span>\n\n<span class="k-k">page<\/span>/)
})

test('named styles, states, parts, element defaults and animations: a site without CSS', async () => {
  const dir = join(TMP, 'styles')
  rmSync(dir, { recursive: true, force: true })
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'site.kaury'), [
    'style button',
    '  border 2 #1C1A1A, radius 999',
    '',
    'style card-dark',
    '  background #1C1A1A, padding 24, shadow hard',
    '  hover lift 4',
    '  link color #F56E2E',
    '  mobile padding 12',
    '',
    'style tab-pill',
    '  selected background #1C1A1A',
    '',
    'animation slide, 30s, loop, linear',
    '  from move 0 0',
    '  to move -50% 0',
    '',
    'state tab = 0',
    'page "/"',
    '  section faq',
    '    title "One file. An *immersive* website."',
    '    grid columns 2 1, gap 24 56',
    '      box card-dark',
    '        link "Go" "/x"',
    '      row no-wrap, slide',
    '        text "a"',
    '    button "A", tab-pill, selected (tab == 0) -> tab = 0',
    '    box hidden (tab != 1)',
    '      text "B"',
    '    details "Is it free?"',
    '      text "Yes."',
    '    embed "/play/", "Playground"',
    '    text "x", pin bottom 0 right -20',
  ].join('\n'))
  const out = join(dir, 'dist')
  await build(join(dir, 'site.kaury'), { out })
  const html = readFileSync(join(out, 'index.html'), 'utf8')
  assert.match(html, /<section[^>]*id="faq"/) // a section name wins over a style of the same name… and over nothing else
  assert.match(html, /<em>immersive<\/em>/)
  assert.match(html, /\.k-button\{border:2px solid #1c1a1a;border-radius:999px/i)
  assert.match(html, /\.ks-card-dark\{background:#1c1a1a[^}]*padding:24px/i)
  assert.match(html, /\.ks-card-dark:hover\{[^}]*translateY\(-4px\)/)
  assert.ok(html.includes('.ks-card-dark :where(a:not(.k-logo,.k-button)){color:#f56e2e}'), 'link part of a named style')
  assert.match(html, /\.ks-tab-pill\[aria-selected="?true"?\]\{background:#1c1a1a/i)
  assert.match(html, /@keyframes ks-slide\{0%\{transform:translate\(0[^)]*\)\}(100%|to)\{transform:translate\(-50%[^)]*\)\}\}/)
  assert.match(html, /\.ka-slide\{animation:ks-slide 30s linear 0s infinite/)
  assert.match(html, /class="k-box ks-card-dark/)
  assert.match(html, /aria-selected="true"/)
  assert.match(html, /<div class="k-box[^"]*" hidden>/)
  assert.match(html, /<details class="k-details[^"]*"><summary class="k-summary">Is it free\?<\/summary>/)
  assert.match(html, /<iframe class="k-embed[^"]*" data-src="\/play\/" title="Playground" loading="lazy">/) // loads near the screen
  assert.match(html, /grid-template-columns:minmax\(0, ?2fr\) ?minmax\(0, ?1fr\)/)
  assert.match(html, /gap:24px 56px/)
  assert.match(html, /position:absolute;bottom:0(px)?;right:-20px/)
})

test('padding and margin take one to four values', async () => {
  const { compile } = await import('../src/core/index.js')
  const r = compile('page "/"\n  box padding 32, margin 8 16\n    text "a"\n')
  assert.ok(r.ok, r.errors.map((e) => e.message).join('\n'))
  assert.match(r.css, /padding:32px/)
  assert.match(r.css, /margin:8px 16px/)
})

test('a static page keeps only the CSS of its own elements', async () => {
  const { pruneCss } = await import('../src/cli/project.js')
  const css = '.k-text{margin:0}.kab1-1{color:red}.kab1-2{color:blue}.ks-card{padding:2px}.ks-card:hover{color:red}@media (max-width:640px){.kab1-2{color:green}.kab1-1{color:pink}}@keyframes ks-x{to{opacity:1}}'
  const out = pruneCss(css, '<p class="k-text kab1-1">a</p><div class="ks-card"></div>')
  assert.equal(out, '.k-text{margin:0}.kab1-1{color:red}.ks-card{padding:2px}.ks-card:hover{color:red}@media (max-width:640px){.kab1-1{color:pink}}@keyframes ks-x{to{opacity:1}}')
})
