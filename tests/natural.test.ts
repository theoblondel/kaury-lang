// What an assistant writes by reflex, with the specification as its only guide, is understood or answered exactly.
// Every case here was written by a fresh assistant in the test of 12 October 2026 (20 sites, 20 requests).

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { compile, setLanguage } from '../src/core/index.js'
import { build } from '../src/cli/project.js'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

setLanguage('en')
const run = (src: string) => {
  const r = compile(src, { file: 'test.kaury' })
  return { css: r.css, js: r.js, errors: r.errors.map((e) => `${e.line}: ${e.what}${e.fix ? ' → ' + e.fix : ''}`), warnings: r.warnings.map((w) => `${w.line}: ${w.what}`) }
}
const HEAD = 'page "/"\n  seo "Home", "A page."\n'
const FRENCH = 'page "/"\n  seo "Accueil", "Une page."\n'
const WIDE = 'style wide\n  max-width 1200\n'

test('a comma right after the element is not a mistake: “row, gap 16” is “row gap 16”', () => {
  const a = run(HEAD + '  row, gap 16\n    text "a"\n  box, padding 18 0, border-top 1 black\n    text "b"\n')
  const b = run(HEAD + '  row gap 16\n    text "a"\n  box padding 18 0, border-top 1 black\n    text "b"\n')
  assert.deepEqual(a.errors, [])
  assert.equal(a.css, b.css)
})

test('an option written alone under its element belongs to that element', () => {
  // the reflex of CSS: the properties listed under what they style
  const a = run(HEAD + '  section hero\n    padding 80 48\n    border-top 1 black\n    title "Hi"\n    row\n      text "a"\n      margin 0 0 0 auto\n')
  const b = run(HEAD + '  section hero, padding 80 48, border-top 1 black\n    title "Hi"\n    row margin 0 0 0 auto\n      text "a"\n')
  assert.deepEqual(a.errors, [])
  assert.deepEqual(a.warnings, [])
  // the same declarations, whether written on the line or under it
  const said = (css: string) => css.split('\n').filter((l) => /padding:80px 48px|border-top:1px|auto/.test(l)).flatMap((l) => l.replace(/^[^{]*\{|\}$/g, '').split(';')).sort()
  assert.equal(said(a.css).length >= 3, true, a.css)
  assert.deepEqual(said(a.css), said(b.css))
})

test('“hover” alone under its element is its hover', () => {
  const a = run(HEAD + '  box padding 24\n    hover lift 4\n    text "a"\n')
  assert.deepEqual(a.errors, [])
  assert.match(a.css, /:hover\{[^}]*translate/)
})

test('an option alone on a line stays a mistake where there is no element above it', () => {
  const a = run(HEAD + '  padding 80 48\n  title "Hi"\n')
  assert.equal(a.errors.length, 1)
})

test('the look of the site can be written line by line in “site”', () => {
  const a = run('site "S"\n  colors accent #C2410C\n  radius 20\n  max-width 1280\n  background #FBF5EA\n' + HEAD + '  button "Go"\n')
  const b = run('site "S"\n  colors accent #C2410C\n  style radius 20, max-width 1280, background #FBF5EA\n' + HEAD + '  button "Go"\n')
  assert.deepEqual(a.errors, [])
  assert.equal(a.css, b.css)
})

test('“rangee” is a row, in a file written in French', () => {
  // the word an assistant chose for a row; “ligne” is the other one
  const a = run(FRENCH + '  colonne espace 20\n    rangee espace 16\n      texte "a"\n')
  const b = run(FRENCH + '  colonne espace 20\n    ligne espace 16\n      texte "a"\n')
  assert.deepEqual(a.errors, [])
  assert.equal(a.css, b.css)
})

test('the French words an assistant reaches for are understood', () => {
  // every one of them was written by an assistant asked for a file in French, and refused
  const fr = run(FRENCH + '  boite rayon 16, largeur-max 900, ombre douce, curseur pointeur, survol lever 4, bordure-haut 1 ligne\n    texte "a", graisse 600\n')
  const en = run(FRENCH + '  box radius 16, max-width 900, shadow soft, cursor pointer, hover lift 4, border-top 1 line\n    text "a", weight 600\n')
  assert.deepEqual(fr.errors, [])
  assert.equal(fr.css, en.css)
  const none = run('etat choisie = aucun\n' + FRENCH + '  bouton "Fermer" -> choisie = aucun\n')
  assert.deepEqual(none.errors, [])
})

test('a slider is a field of type range, with its bounds, and it holds a number', () => {
  const a = run('state rate = 2.5\nstate years = 25\n' + HEAD + '  field rate, type range, min 0, max 10, step 0.05, label "Rate"\n  field years "25", type number, min 5, max 40\n  text "{rate * 2}"\n')
  assert.deepEqual(a.errors, [])
  assert.deepEqual(a.warnings, [])
  assert.match(a.js, /\.type = "range"/)
  // the bounds are on the input, and what it gives is a number (rate * 2 is 5, not "2.52.5")
  for (const name of ['min', 'max', 'step']) assert.match(a.js, new RegExp('"' + name + '"'))
  assert.equal(a.js.split(', "number")').length - 1, 2)
})

test('a state that does not exist, written with its condition, is answered with the two ways there are', () => {
  // “checked (answered and i == q.answer)” on a button, to mark the right answer of a quiz
  const a = run('state done = false\nstyle choice\n  padding 12\n' + HEAD + '  button "A", choice, checked (done)\n')
  assert.equal(a.errors.length, 1)
  assert.match(a.errors[0], /^6: "checked" is not a state of "button"\..*selected, current and open.*style right, then right \(…\)/)
})

// ---------------- found in the second round: what the compiler answered was not enough ----------------
test('a word that is no option, in a style, is answered with options of a style', () => {
  // the answer listed “class, look, tag, attr, id…”: nothing a style line can hold
  const a = run('style display\n  size 60, interligne-hauteur 1.05\n' + HEAD + '  title "Hi", display\n')
  assert.equal(a.errors.length, 1)
  assert.match(a.errors[0], /^2: "interligne-hauteur" is neither an option nor one of your styles\..*line-height.*tracking/)
  assert.doesNotMatch(a.errors[0], /class, look/)
  // and a near word of the same language is proposed
  const b = run('style display\n  taile 60\n' + HEAD + '  title "Hi", display\n')
  assert.match(b.errors[0], /did you mean "taille"\?/)
})

test('on a box, one of your styles wins over a value of the same name', () => {
  // “for step in programme / row step”: the row took the variable, the style “step” was “never used”
  const a = run('let programme = [{ time: "14:00" }]\nstyle step\n  padding 20 0\n' + HEAD + '  for step in programme\n    row step\n      text step.time\n')
  assert.deepEqual(a.errors, [])
  assert.deepEqual(a.warnings, [])
  assert.equal(a.js.includes('ks-step'), true)
})

test('a section, a nav or a header named like one of your styles takes that style', () => {
  // “nav side, sticky 96” with “style side”: the word was the name of the nav only, and the style did nothing
  const a = run('style side\n  padding 8 0\nstyle hero\n  padding 80 48\n' + HEAD + '  section hero\n    title "Hi"\n  nav side, sticky 96\n    link "Docs" "/"\n')
  assert.deepEqual(a.errors, [])
  assert.deepEqual(a.warnings, [])
  assert.equal(a.js.includes('ks-side'), true)
  assert.equal(a.js.includes('ks-hero'), true)
  // and it keeps its name: links Hero still finds it
  assert.match(a.js, /"hero"/)
})

test('a text over a background written on a style line under its box is not compared to the page', () => {
  // “#F6F3EE on #F6F3EE: contrast 1.0”: the photo was written under the section, after the title
  const a = run('site "S"\n  style background #F6F3EE, color #1C1A1A\n' + HEAD + '  section statement\n    title "Read me", color #F6F3EE\n    style background #1C1A1A, padding 120 24\n')
  assert.deepEqual(a.errors, [])
  assert.deepEqual(a.warnings, [])
})

test('a heading that skips a level inside a component is shown where it is written', async () => {
  // the warning pointed at the line of the page: the heading was in a component, with its text read from a list
  const dir = join(resolve('tests/.tmp'), 'natural-heading')
  rmSync(dir, { recursive: true, force: true })
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'site.kaury'), 'let plans = [{ name: "Pro" }]\ncomponent Plan p\n  box\n    subtitle p.name, level 3\n' + HEAD + '  title "Prices"\n  for p in plans\n    Plan p\n')
  const r = await build(join(dir, 'site.kaury'))
  const w = r.collected.warnings.map(({ e }) => `${e.line}: ${e.what}`)
  assert.equal(w.length, 1)
  assert.match(w[0], /^4: in the page "\/", the heading "Pro" is of level 3 right after one of level 1/)
})

test('a screen or style line written in a loop or a condition, under no element, says where it goes', () => {
  // “mobile 1 column” written one step too far to the left, at the level of the grid it was for: the build failed
  // on another line, with “Cannot read properties of undefined”
  const a = run('let items = [1, 2]\n' + HEAD + '  for i in items\n    grid columns 1 2, gap 32\n      text "a"\n    mobile columns 1\n')
  assert.equal(a.errors.length, 1)
  assert.match(a.errors[0], /^7: this line styles nothing: it is in a “for”, under no element\. → .*under the element/)
  const b = run('state big = true\n' + HEAD + '  column\n    if big\n      text "a"\n      style padding 10\n')
  assert.equal(b.errors.length, 1)
  assert.match(b.errors[0], /^7: this line styles nothing: it is in an “if”, under no element\./)
  // content shown on one screen only is not a style: it stays allowed there
  const c = run('state big = true\n' + HEAD + '  column\n    if big\n      mobile\n        text "a"\n')
  assert.deepEqual(c.errors, [])
})

test('a date is made from a text, and two dates give the time between them', async () => {
  // a countdown to a wedding: “to-number("2027-06-12T14:00")” gave 0, and nothing made a date
  const { run: exec } = await import('./helpers.js')
  const { output } = await exec('let day = to-date("2027-06-12 14:00")\nlet before = to-date("2027-06-10 14:00")\nprint floor((day - before) / 86400000)\nprint format-date(day)\nprint day > now()\n')
  assert.deepEqual(output, ['2', 'June 12, 2027', 'true'])
})

test('a built-in shape has a waiting picture, drawn in the page before the 3D arrives', async () => {
  // the 3D starts at the visitor's first gesture: until then, and where a device cannot do 3D, there was nothing
  const dir = join(resolve('tests/.tmp'), 'natural-poster')
  rmSync(dir, { recursive: true, force: true })
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'site.kaury'), 'site "S"\n  colors accent #F56E2E\n' + HEAD + '  scene hero\n    object "knot", size 1.5, position 2 0.5 0, color accent, metal, alt "A knot"\n    object "gem", color #223344, alt "A gem"\n    title "Hi"\n  object "torus", color accent, alt "A ring"\n')
  const r = await build(join(dir, 'site.kaury'))
  const html = readFileSync(join(r.dir, 'index.html'), 'utf8')
  const posters = [...html.matchAll(/<span class="k-poster k-poster-(\w+)"[^>]*style="([^"]*)"/g)].map((m) => `${m[1]} ${m[2]}`)
  assert.equal(posters.length, 3)
  // its shape, its color, its size and its place in the scene
  assert.match(posters[0], /^knot .*--k-pc: ?var\(--k-accent\).*--k-ps: ?1\.5.*--k-px: ?2.*--k-py: ?0\.5/)
  assert.match(posters[1], /^gem .*--k-pc: ?#223344/)
  assert.match(posters[2], /^torus /)
  // nobody reads it: the object has its description already
  assert.match(html, /<span class="k-poster[^>]*aria-hidden="true"/)
  // it leaves when the 3D is there
  assert.ok(html.includes('.k-ready>.k-poster{opacity:0'))
})

// ---------------- found with the second group of assistants (the specification once corrected) ----------------
test('a section named with an accent is found by every way of pointing at it', async () => {
  // “section réalisations”: the menu led to #realisations, the button to #réalisations, and the id kept its accent
  const dir = join(resolve('tests/.tmp'), 'natural-accent')
  rmSync(dir, { recursive: true, force: true })
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'site.kaury'), FRENCH + '  section entete\n    liens Réalisations\n    bouton "Voir", vers "#réalisations"\n    lien "Aussi" "#réalisations"\n  section réalisations\n    titre "Nos réalisations"\n')
  const r = await build(join(dir, 'site.kaury'))
  const html = readFileSync(join(r.dir, 'index.html'), 'utf8')
  assert.deepEqual(r.collected.warnings.map(({ e }) => `${e.line}: ${e.what}`), [])
  assert.match(html, /<section[^>]*id="realisations"/)
  assert.equal(html.split('href="#realisations"').length - 1, 3)
  assert.equal(html.includes('href="#réalisations"'), false)
})

test('any option of an element can be a line of its own under it, not only its look', () => {
  // attr "role" "progressbar" under a box: “I did not expect the text "progressbar" here”
  const a = run('state percent = 40\n' + HEAD + '  box background #EEE, height 8\n    attr "role" "progressbar"\n    attr "aria-valuenow" "{percent}"\n    box background #C2410C, height 8, width "{percent}%"\n  button "Go"\n    large\n    to "#top"\n')
  const b = run('state percent = 40\n' + HEAD + '  box background #EEE, height 8, attr "role" "progressbar", attr "aria-valuenow" "{percent}"\n    box background #C2410C, height 8, width "{percent}%"\n  button "Go", large, to "#top"\n')
  assert.deepEqual(a.errors, [])
  assert.equal(a.js.includes('"progressbar"'), true)
  assert.equal(a.js.includes('k-large'), b.js.includes('k-large'))
  assert.equal(a.css, b.css)
  // what follows “hover” on the line of the element stays the only thing that waits for the pointer
  const c = run(HEAD + '  box padding 24, hover lift 4\n    margin 10\n    text "a"\n')
  assert.deepEqual(c.errors, [])
  assert.doesNotMatch(c.css, /:hover\{[^}]*margin/)
})

test('a field can ask for a time', () => {
  // a table booked for 19:30: the kinds of field had a date and no hour
  const a = run(HEAD + '  form -> print "ok"\n    field day, type date, label "Day"\n    field hour, type time, label "Hour"\n    button "Book"\n')
  assert.deepEqual(a.errors, [])
  assert.match(a.js, /\.type = "time"/)
})

test('a choice or a tick can be required, like a field', () => {
  const a = run(HEAD + '  form -> print "ok"\n    select coming "Yes", "No", required, label "Will you come?"\n    checkbox agree "I agree", required\n    button "Send"\n')
  assert.deepEqual(a.errors, [])
  assert.equal(a.js.split('.required = true').length - 1, 2)
})

test('a choice written on one line is a value, at the start of a line too', async () => {
  // “if format == "price" then price(v) else v” as the last line of a function: “I did not expect "else" here”
  const { run: exec } = await import('./helpers.js')
  const { output } = await exec('function shown v, kind\n  if kind == "double" then v * 2 else if kind == "half" then v / 2 else v\nprint shown(8, "double")\nprint shown(8, "half")\nprint shown(8, "as it is")\nlet n = 3\nif n > 2 then print "big"\n')
  assert.deepEqual(output, ['16', '4', '8', 'big'])
})

// ---------------- figures: a table, a chart, a number ----------------
test('a number is written the way people read it', async () => {
  // “price” was the only way to get a separator: CHF 23,490.00 for a number of members
  const { run: exec } = await import('./helpers.js')
  const { output } = await exec('print format-number(23490)\nprint format-number(1234.5678, 1)\nprint format-number(0.256, 2)\nprint format-number(12)\n')
  assert.deepEqual(output, ['23,490', '1,234.6', '0.26', '12'])
})

test('Table is a real table, with its columns, its formats and a sort on each column', async () => {
  // asked by the assistants: they drew tables with grids, which a screen reader does not read as a table
  const dir = join(resolve('tests/.tmp'), 'natural-table')
  rmSync(dir, { recursive: true, force: true })
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'site.kaury'), [
    'let gifts = [',
    '  { date: "2026-10-10", donor: "Claire D.", amount: 1200 },',
    '  { date: "2026-10-08", donor: "Anonymous", amount: 50 }',
    ']',
    'let columns = [',
    '  { label: "Date", field: "date", format: "date" },',
    '  { label: "Donor", field: "donor" },',
    '  { label: "Amount", field: "amount", format: "price", align: "right" }',
    ']',
    HEAD + '  title "Figures"',
    '  Table gifts, columns, "Latest donations"',
    '',
  ].join('\n'))
  const r = await build(join(dir, 'site.kaury'))
  const html = readFileSync(join(r.dir, 'index.html'), 'utf8')
  assert.deepEqual(r.collected.warnings.map(({ e }) => `${e.line}: ${e.what}`), [])
  // the section named after its heading, then the table itself
  assert.match(html, /<section[^>]*id="latest-donations"/)
  assert.equal(html.split('<th ').length - 1, 3)
  assert.match(html, /<th [^>]*scope="col"[^>]*aria-sort="none"[^>]*><button[^>]*>Date/)
  assert.equal(html.split('<tr').length - 1, 3)
  assert.match(html, /<td[^>]*>October 10, 2026<\/td><td[^>]*>Claire D\.<\/td><td[^>]*>CHF.1,200\.00<\/td>/)
  // it is laid out as a table (a box given the tag of a table is one)
  assert.ok(html.includes('table.k-box{display:table'))
})

test('Chart draws bars from a list, and says its figures to who cannot see them', async () => {
  const dir = join(resolve('tests/.tmp'), 'natural-chart')
  rmSync(dir, { recursive: true, force: true })
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'site.kaury'), 'let months = [{ label: "Jan", value: 1850 }, { label: "Feb", value: 925 }, { label: "Mar", value: 0 }]\n' + HEAD + '  title "Figures"\n  Chart months, "Donations per month", " CHF"\n')
  const r = await build(join(dir, 'site.kaury'))
  const html = readFileSync(join(r.dir, 'index.html'), 'utf8')
  assert.deepEqual(r.collected.warnings.map(({ e }) => `${e.line}: ${e.what}`), [])
  assert.match(html, /role="img" aria-label="Donations per month: Jan 1,850 CHF, Feb 925 CHF, Mar 0 CHF"/)
  // the tallest bar is the measure of the others: half the value, half the height
  const heights = [...html.matchAll(/class="k-box ks-kb-bar-fill[^"]*" style="height:([\d.]+)%/g)].map((m) => Number(m[1]))
  assert.equal(heights.length, 3)
  assert.equal(heights[1] * 2, heights[0])
  assert.equal(heights[2], 0)
  assert.match(html, />1,850 CHF</)
})

test('Chart keeps one scale when it is given the top of it', async () => {
  // a switch between two years: each year was drawn to its own tallest bar, and the two could not be compared
  const dir = join(resolve('tests/.tmp'), 'natural-chart-top')
  rmSync(dir, { recursive: true, force: true })
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'site.kaury'), 'let months = [{ label: "Jan", value: 1000 }, { label: "Feb", value: 500 }]\n' + HEAD + '  title "Figures"\n  Chart months, "Donations", " CHF", 2000\n')
  const r = await build(join(dir, 'site.kaury'))
  const html = readFileSync(join(r.dir, 'index.html'), 'utf8')
  const heights = [...html.matchAll(/class="k-box ks-kb-bar-fill[^"]*" style="height:([\d.]+)%/g)].map((m) => Number(m[1]))
  assert.deepEqual(heights, [43, 21.5])
})

// ---------------- the stylesheet of a page ----------------
test('a page that runs code carries its own rules, not those written for the other pages', async () => {
  // a page without code already lost the rules of elements it does not have; a page with a counter carried the
  // styles of the whole site (every other page of it), because what it shows can change
  const dir = join(resolve('tests/.tmp'), 'natural-own-css')
  rmSync(dir, { recursive: true, force: true })
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'site.kaury'), [
    'state n = 0',
    'state open = false',
    'component Shared',
    '  box padding 33',
    '    text "shared"',
    'page "/"',
    '  seo "Home", "A page."',
    '  box padding 11',
    '    button "a {n}" -> n += 1',
    '  if open',
    '    box padding 44', //            not in the page as built: it comes later, and it is of this page
    '      text "later"',
    '  Shared',
    'page "/b"',
    '  seo "B", "Another page."',
    '  box padding 22',
    '    button "b {n}" -> n += 1',
    '  Shared',
    '',
  ].join('\n'))
  const r = await build(join(dir, 'site.kaury'))
  const home = readFileSync(join(r.dir, 'index.html'), 'utf8')
  const other = readFileSync(join(r.dir, 'b', 'index.html'), 'utf8')
  for (const mine of ['padding:11px', 'padding:44px', 'padding:33px']) assert.ok(home.includes(mine), mine)
  assert.equal(home.includes('padding:22px'), false)
  for (const mine of ['padding:22px', 'padding:33px']) assert.ok(other.includes(mine), mine)
  assert.equal(other.includes('padding:11px'), false)
  assert.equal(other.includes('padding:44px'), false)
})

test('a page that runs code carries the named styles it can use, through its components too', async () => {
  // the styles you name are most of a stylesheet: each page keeps those written in it and in what it calls
  const dir = join(resolve('tests/.tmp'), 'natural-own-styles')
  rmSync(dir, { recursive: true, force: true })
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'site.kaury'), [
    'state n = 0',
    'style only-home',
    '  padding 51',
    'style only-b',
    '  padding 52',
    '  hover padding 53',
    'style in-inner',
    '  padding 54',
    'style later',
    '  padding 55',
    'style nowhere-yet',
    '  padding 56',
    'animation drift, 9s, loop',
    '  from move 0 0',
    '  to move 57 0',
    'component Inner',
    '  box in-inner',
    '    text "inner"',
    'component Outer',
    '  Inner',
    'page "/"',
    '  seo "Home", "A page."',
    '  box only-home',
    '    button "a {n}" -> n += 1',
    '  box later (n > 3)', //            given by a condition: of this page, even if not shown yet
    '    text "later"',
    'page "/b"',
    '  seo "B", "Another page."',
    '  box only-b, drift',
    '    button "b {n}" -> n += 1',
    '  Outer',
    '',
  ].join('\n'))
  const r = await build(join(dir, 'site.kaury'))
  const home = readFileSync(join(r.dir, 'index.html'), 'utf8')
  const other = readFileSync(join(r.dir, 'b', 'index.html'), 'utf8')
  const has = (html: string) => [51, 52, 53, 54, 55, 56].filter((n) => html.includes(`padding:${n}px`))
  assert.deepEqual(has(home), [51, 55, 56]) // (a style used nowhere is not known to belong to another page: it stays)
  assert.deepEqual(has(other), [52, 53, 54, 56])
  // the animation named on the second page plays there only
  assert.equal(home.includes('.ka-drift{'), false)
  assert.equal(other.includes('.ka-drift{'), true)
})

// ---------------- content in files ----------------
test('a field read from a content file that no file has is said, with the one meant', async () => {
  // “post.titel” showed nothing, in silence: an empty value is normal for data that arrives, not for a field that exists nowhere
  const dir = join(resolve('tests/.tmp'), 'natural-content')
  rmSync(dir, { recursive: true, force: true })
  mkdirSync(join(dir, 'content', 'posts'), { recursive: true })
  writeFileSync(join(dir, 'content', 'posts', 'first.md'), '---\ntitle: First\ndescription: The first post.\ndate: 2026-09-14\n---\n\nHello.\n')
  writeFileSync(join(dir, 'content', 'posts', 'second.md'), '---\ntitle: Second\ndescription: The second post.\ndate: 2026-09-20\ncover: photo.jpg\n---\n\nHello again.\n')
  writeFileSync(join(dir, 'content', 'about.yaml'), 'name: Ana\nhero:\n  line: Hello\n')
  writeFileSync(join(dir, 'site.kaury'), [
    'import posts from "./content/posts/*.md"',
    'import about from "./content/about.yaml"',
    'let recent = posts.sort(p -> p.date).reverse()',
    'page "/"',
    '  seo "Home", "A page."',
    '  title "Blog of {about.nmae}"', //                      6: nmae
    '  text about.hero.line',
    '  for post in recent',
    '    subtitle post.titel', //                             9: titel
    '    text post.description',
    '    text post.cover', //                                    (one file has it: fine)
    '    text "{post.slug} {post.body.length} {post.created}"', // (given by Kaury)
    '  text "{posts.filter(p -> p.draft).length} drafts"', //  13: draft
    'page "/blog/{post.slug}" for post in posts',
    '  seo post.title, post.descripton', //                   15: descripton
    '  title post.title',
    '',
  ].join('\n'))
  const r = await build(join(dir, 'site.kaury'))
  const w = r.collected.warnings.map(({ e }) => `${e.line}: ${e.what}${e.fix ? ' → ' + e.fix : ''}`)
  assert.equal(w.length, 4, w.join('\n'))
  assert.match(w[0], /^6: "nmae" is not in "\.\/content\/about\.yaml"\. → did you mean "name"\?/)
  assert.match(w[1], /^9: no file of "\.\/content\/posts\/\*\.md" has a field "titel"\. → did you mean "title"\?/)
  assert.match(w[2], /^13: no file of "\.\/content\/posts\/\*\.md" has a field "draft"\. → .*title, description, date/)
  assert.match(w[3], /^15: .*"descripton"\. → did you mean "description"\?/)
})

test('a word that is no element, with lines under it, says so and names the elements that hold others', () => {
  // the answer was “this indented block belongs to nothing”
  const a = run(HEAD + '  wrapper-box gap 16\n    text "a"\n')
  assert.equal(a.errors.length, 1)
  assert.match(a.errors[0], /^3: "wrapper-box" is not a Kaury word\..*section.*row.*column.*grid.*box/)
})

test('one of your styles written alone under its element is given to it', () => {
  const a = run(WIDE + HEAD + '  section statement\n    wide\n    title "Hi"\n  section other\n    style wide\n    title "Ho"\n')
  assert.deepEqual(a.errors, [])
  assert.deepEqual(a.warnings, [])
  // on the element: before, “style wide” under a section was accepted and did nothing
  assert.equal(a.js.split('classList.add("ks-wide")').length - 1, 2)
  // a word that is no style of yours is said, with the nearest one
  const b = run(WIDE + HEAD + '  section statement\n    wyde\n    title "Hi"\n')
  assert.equal(b.errors.length, 1)
  assert.match(b.errors[0], /^6: "wyde" is neither an element, nor an option, nor one of your styles\. → did you mean "wide"\?/)
})
