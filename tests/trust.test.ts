// Nothing passes in silence: a mistake is caught by the compiler, with the line and the fix,
// or the build stops. These are the mistakes an AI (or a beginner) makes when it guesses.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, rmSync, mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { errors, run } from './helpers.js'
import { compile, setLanguage } from '../src/core/index.js'
import { build } from '../src/cli/project.js'

setLanguage('en')
const TMP = resolve('tests/.tmp')
const warnings = (src: string) => compile(src, { file: 'test.kaury' }).warnings.map((w) => w.format(src))
/** The warnings of a build. */
const built = (r: { collected: { warnings: { e: { line: number; what: string; fix?: string } }[] } }) => r.collected.warnings.map(({ e }) => e)

// ---------------- all the mistakes at once ----------------
test('every mistake of writing in a file is listed in one go, one per line', () => {
  const src = [
    'let a = 3;', //                      1  ;
    'let b = a === 3', //                 2  ===
    'if a > 1 && b', //                   3  &&
    '  print a', //                          (the block of a refused line is not a second mistake)
    'else', //                               (nor the “else” of a refused “if”)
    '  print b',
    'function add(x, y)', //              7  parentheses
    '  x + y',
    'page "/"',
    "  text 'hi'", //                     10 single quotes
    '  div', //                           11 HTML
    '    text "x"',
    '  title "ok"',
    '  button "Go" -> a++', //            14 ++
    '  text "open', //                    15 text never closed
    '',
  ].join('\n')
  const r = compile(src, { file: 'test.kaury' })
  assert.deepEqual(r.errors.map((e) => e.line), [1, 2, 3, 7, 10, 11, 14, 15])
  assert.match(r.errors[0].what, /Kaury has no ";"/)
  assert.match(r.errors[4].what, /double quotes/)
  assert.match(r.errors[5].fix ?? '', /in Kaury: box/)
  assert.ok(r.errors.every((e) => e.file === 'test.kaury'))
})

test('a page written with the braces and the words of JavaScript gets all its answers in one go', () => {
  const src = [
    '// written by habit, the way a model that has never seen Kaury would',
    'const title = "My shop";', //                      2  ;
    'var count = 0', //                                 3  var
    '',
    'function increment() {', //                        5  braces
    '  count++', //                                     6  ++
    '}',
    '',
    'page "/" {', //                                    9  braces
    '  <h1>Welcome</h1>', //                            10 tags
    '  div className "hero"', //                        11 div
    '    h1 "Hello"',
    '    p "Fresh every day", font-size 18, color: gray', // 13 :
    '    button "Add" onClick -> increment()',
    '    if count > 0 && count < 10', //                15 &&
    '      span `You have ${count} items`', //          16 `
    '    elif count >= 10', //                          17 elif
    '      text "A lot!"',
    '}',
    '',
  ].join('\n')
  const r = compile(src, { file: 'test.kaury' })
  assert.deepEqual(r.errors.map((e) => e.line), [2, 3, 5, 6, 9, 10, 11, 13, 15, 16, 17])
  assert.match(r.errors[2].what, /indentation, without \{ \}/)
  assert.match(r.errors[4].what, /indentation, without \{ \}/)
})

test('a file without mistake of writing is read exactly as before', () => {
  const src = [
    'state n = 0',
    'state cart = []',
    'function double x then x * 2',
    'let config = {',
    '  name: "Shop",',
    '  tags: ["a", "b"]',
    '}',
    'page "/"',
    '  section',
    '    title "Hi {double(n)} {config.name}", size 40',
    '    button "+" -> n += 1',
    '    button "Add" -> cart.add {',
    '      name: "Mint",',
    '      price: 3',
    '    }',
    '    text "{cart.length}"',
    '',
  ].join('\n')
  const r = compile(src, { file: 'test.kaury' })
  assert.deepEqual(r.errors.map((e) => e.format(src)), [])
  assert.match(r.js, /double\(n\.v\)/)
  assert.match(r.js, /name: "Mint", price: 3/)
})

// ---------------- suggestions ----------------
test('a misspelled element is answered with the element, never with a JavaScript name', () => {
  const e = errors('page "/"\n  section\n    buton "Click"\n').join('\n')
  assert.match(e, /the element "button"/)
  assert.doesNotMatch(e, /btoa/)
})

test('a misspelled element followed by an action says which element was meant', () => {
  const e = errors('state count = 0\npage "/"\n  buton "Click" -> count += 1\n').join('\n')
  assert.match(e, /"buton" is not a Kaury word/)
  assert.match(e, /did you mean "button"/)
})

test('an unknown name never gets a JavaScript global as a suggestion', () => {
  const e = errors('page "/"\n  button "y" -> undefined-fn 3\n').join('\n')
  assert.match(e, /"undefined-fn" does not exist/)
  assert.doesNotMatch(e, /did you mean "undefined"/)
})

test('“3 colums”: the option is suggested, not an element', () => {
  const e = errors('page "/"\n  grid 3 colums, gap 24\n    text "x"\n').join('\n')
  assert.match(e, /did you mean "columns"/)
  assert.doesNotMatch(e, /the element/)
})

// ---------------- values of options ----------------
test('an option that takes a number refuses a text without number', () => {
  const e = errors('page "/"\n  box radius "big"\n    text "x", size "large"\n')
  assert.equal(e.length, 2)
  assert.match(e[0], /"radius" expects a number, not "big"/)
  assert.match(e[0], /radius 12/)
  assert.match(e[1], /"size" expects a number, not "large"/)
})

test('an option that takes a number refuses a word that is not a variable', () => {
  const e = errors('page "/"\n  box padding huge\n    text "x", size large\n')
  assert.equal(e.length, 2)
  assert.match(e[0], /"padding" expects a number, not "huge"/)
  assert.match(e[1], /"size" expects a number, not "large"/)
})

test('numbers, units, variables, calculations and CSS lengths stay accepted', () => {
  assert.deepEqual(errors([
    'let s = 3',
    'state w = 40',
    'page "/"',
    '  box padding 12 24, width 50%, height auto, radius s, max-width "min(90vw, 640px)"',
    '    text "x", size s * 2, tracking -1, line-height 1.5',
    '    box width "{w}%"',
    '',
  ].join('\n')), [])
})

test('the first word of a field is the state it fills, even when an option has that name', () => {
  // “select size "S", "M", "L"” is the example of the docs: “size” was read as the text size, and the choice went nowhere
  const src = 'page "/"\n  select size "S", "M", "L"\n  text "Chosen: {size}"\n  checkbox bold "Bold text"\n  if bold\n    text "Bold"\n'
  const r = compile(src, { file: 'test.kaury' })
  assert.deepEqual(r.errors.map((e) => e.format(src)), [])
  assert.match(r.js, /const size = \$k\.state\(/)
  assert.match(r.js, /\$k\.bindSelect\(\$n\d+, \(\) => size\.v/)
  assert.doesNotMatch(r.css, /font-size:\s*S/)
})

test('what a field fills can be shown above the form that asks for it', () => {
  // the usual thank-you message: written before the form in the file, shown instead of it once sent
  const src = [
    'state sent = false',
    'page "/"',
    '  section',
    '    if sent',
    '      text "Thank you {name}! We wrote to {email}, size {size}."',
    '    else',
    '      form -> sent = true',
    '        field name "Your name", required',
    '        field email "you@example.com", type email',
    '        select size "S", "M", "L"',
    '        button "Send"',
    '',
  ].join('\n')
  const r = compile(src, { file: 'test.kaury' })
  assert.deepEqual(r.errors.map((e) => e.format(src)), [])
  assert.match(r.js, /const name = \$k\.state\(/)
  assert.match(r.js, /\$k\.bind\(\$n\d+, \(\) => name\.v/)
})

test('an unknown name is not answered with a short alias nobody wrote', () => {
  const e = errors('page "/"\n  text "Hello {name}"\n').join('\n')
  assert.match(e, /"name" does not exist/)
  assert.doesNotMatch(e, /"num"/)
  assert.match(e, /state name = /)
})

test('a line whose first word is unknown gets one answer, in the language of the writer', () => {
  setLanguage('fr')
  const fr = compile('page "/"\n  formulaire\n    zonne-texte projet "Votre projet", etiquette "Projet"\n').errors.map((e) => e.format())
  setLanguage('en')
  assert.equal(fr.length, 1, fr.join('\n')) // not one more for “projet” and one for “etiquette”
  assert.match(fr[0], /« zonne-texte » n'existe pas/)
  assert.match(fr[0], /l'élément « zone-texte »/)
  // the natural French names of the form elements exist
  assert.deepEqual(errors('page "/"\n  formulaire\n    zone-texte projet "Votre projet", etiquette "Projet"\n    liste-deroulante taille "S", "M"\n    case-a-cocher accord "J\'accepte"\n  section pied-de-page\n    texte "Morel"\n'), [])
})

test('a field can fill a state that already exists and is named like an option', () => {
  const src = 'state size = "M"\npage "/"\n  select size "S", "M", "L"\n'
  const r = compile(src, { file: 'test.kaury' })
  assert.deepEqual(r.errors.map((e) => e.format(src)), [])
  assert.match(r.js, /\$k\.bindSelect\(\$n\d+, \(\) => size\.v/)
})

// ---------------- functions ----------------
test('a function called with too few values says which ones it takes', () => {
  const e = errors('function add a b then a + b\nprint add(1)\n').join('\n')
  assert.match(e, /"add" needs 2 values \(a, b\), I see 1/)
})

test('a function called with too many values says so', () => {
  const e = errors('function add a b then a + b\nprint add(1, 2, 3)\n').join('\n')
  assert.match(e, /"add" takes at most 2 values \(a, b\), I see 3/)
})

test('default values and spread lists are counted correctly', () => {
  assert.deepEqual(errors([
    'function greet name, greeting = "Hi" then "{greeting} {name}"',
    'function add a b then a + b',
    'let pair = [1, 2]',
    'print greet("Ada")',
    'print greet("Ada", "Hello")',
    'print add(...pair)',
    '',
  ].join('\n')), [])
})

test('a function shown without being called is an error, not its source code in the page', () => {
  const e = errors('function add a b then a + b\npage "/"\n  text add 1, 2\n').join('\n')
  assert.match(e, /"add" is a function/)
  assert.match(e, /text add\(1, 2\)/)
})

test('a built-in function shown without being called is an error too', () => {
  const e = errors('page "/"\n  text now\n').join('\n')
  assert.match(e, /"now" is a function/)
  assert.match(e, /text now\(\)/)
})

test('a variable named like a built-in function is still shown as content', () => {
  assert.deepEqual(errors('let price = 12\npage "/"\n  text price\n  text price, bold\n'), [])
})

// ---------------- empty values ----------------
test('reading a property of an empty value gives nothing instead of crashing', async () => {
  const { output } = await run([
    'let user = none',
    'let list = []',
    'print "Hello {user.name}!"',
    'print user.address.city == none',
    'print list[0].title == none',
    'print list.first.title == none',
    '',
  ].join('\n'))
  assert.deepEqual(output, ['Hello !', 'true', 'true', 'true'])
})

test('storing into a property still works', async () => {
  const { output } = await run([
    'state user = { name: "Ada", tags: [], address: { city: "Vevey" } }',
    'user.name = "Linus"',
    'user.address.city = "Bulle"',
    'user.tags.add "x"',
    'user.count = 1',
    'user.count += 2',
    'print user.name, user.address.city, user.tags.length, user.count',
    '',
  ].join('\n'))
  assert.deepEqual(output, ['Linus Bulle 1 3'])
})

test('calling something on an empty value stays an error, with a clear message', async () => {
  const { output } = await run('let user = none\ntry\n  print user.name.upper()\ncatch e\n  print e.message\ntry\n  user.save()\ncatch e\n  print "caught"\n')
  assert.match(output[0], /cannot call "\.upper" on nothing/)
  assert.equal(output[1], 'caught')
})

// ---------------- the build ----------------
const site = (name: string, source: string) => {
  const dir = join(TMP, name)
  rmSync(dir, { recursive: true, force: true })
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'site.kaury'), source)
  return join(dir, 'site.kaury')
}

test('a page that reads empty data is built, and shows nothing there', async () => {
  const r = await build(site('trust-empty', 'state user = none\npage "/"\n  title "Hello {user.name}"\n  button "Log in" -> user = { name: "Ada" }\n'))
  assert.match(readFileSync(join(r.dir, 'index.html'), 'utf8'), /<h1[^>]*>Hello <\/h1>/)
})

test('a page that fails while it is built stops the build, with the Kaury line and the reason', async () => {
  const entry = site('trust-fail', 'state user = none\npage "/"\n  title "Hi"\n  text user.name.upper()\n')
  await assert.rejects(build(entry), (e: any) => {
    const text = String(e.message)
    assert.match(text, /site\.kaury, line 4/)
    assert.match(text, /text user\.name\.upper\(\)/)
    assert.match(text, /cannot call "\.upper" on nothing/)
    assert.match(text, /page "\/"/)
    return true
  })
})

// ---------------- kaury check ----------------
const check = async (entry: string) => {
  const { execFileSync } = await import('node:child_process')
  try {
    return JSON.parse(execFileSync(process.execPath, ['node_modules/tsx/dist/cli.mjs', 'src/cli/index.ts', 'check', entry, '--json', '--lang', 'en'], { encoding: 'utf8' }))
  } catch (e: any) {
    return JSON.parse(e.stdout)
  }
}

test('kaury check renders the pages too: what only fails on display is found, with its line', async () => {
  const j = await check(site('trust-check', 'state user = none\npage "/"\n  title "Hi"\n  text user.name.upper()\n'))
  assert.equal(j.ok, false)
  const failed = j.problems.filter((p: any) => p.severity === 'error')
  assert.equal(failed.length, 1)
  assert.equal(failed[0].file, 'tests/.tmp/trust-check/site.kaury') // from where the command runs, like the other problems
  assert.equal(failed[0].line, 4)
  assert.match(failed[0].message, /cannot call "\.upper" on nothing/)
  assert.match(failed[0].fix, /if user/)
})

test('kaury check says ok when every page renders, and writes no site', async () => {
  const entry = site('trust-check-ok', 'site "S"\n  seo "S", "A small site."\nstate user = none\npage "/"\n  title "Hello {user.name}"\n  button "Log in" -> user = { name: "Ada" }\npage "/about"\n  title "About"\n')
  const j = await check(entry)
  assert.deepEqual(j, { ok: true, files: 1, pages: 2, problems: [] })
  assert.equal(existsSync(join(entry, '..', 'dist')), false)
})

// ---------------- files and links that lead nowhere ----------------
const DEAD = [
  'site "Shop"',
  '  favicon "nope.svg"',
  'page "/"',
  '  section header',
  '    logo "logo-missing.svg"',
  '    links Home, Flavors, Shop, Contact',
  '  section flavors',
  '    image "missing.jpg", "A can"',
  '    image "fotos/can.jpg", "A can"',
  '    link "About" "/about"',
  '    link "Bad anchor" "#nowhere"',
  '    button "Buy", to "/buy"',
  '    button "Go" -> go "/gone"',
  '    box background "bg-missing.jpg"',
  '      text "x"',
  '  scene',
  '    light soft',
  '    object can "missing.glb", alt "A can", fallback "fallback-missing.png"',
  'page "/shop"',
  '  title "Shop"',
  '',
].join('\n')

test('a file that is not in “public” and a link that leads to no page are said, with their line', async () => {
  const entry = site('trust-dead', DEAD)
  mkdirSync(join(entry, '..', 'public', 'photos'), { recursive: true })
  writeFileSync(join(entry, '..', 'public', 'photos', 'can.jpg'), 'x')
  const r = await build(entry, { dev: true }) // dev: the images are not optimized (these are not real pictures)
  const w = built(r).map((e) => `${e.line}: ${e.what} → ${e.fix}`)
  const has = (line: number, re: RegExp) => assert.ok(w.some((x) => x.startsWith(`${line}: `) && re.test(x)), `line ${line} ${re}\n${w.join('\n')}`)
  has(2, /"nope\.svg" is not in the folder "public"/)
  has(5, /"logo-missing\.svg" is not in the folder "public"/)
  has(8, /"missing\.jpg" is not in the folder "public"/)
  has(9, /"fotos\/can\.jpg" is not in the folder "public".*did you mean "photos\/can\.jpg"/)
  has(14, /"bg-missing\.jpg" is not in the folder "public"/)
  has(18, /"missing\.glb" is not in the folder "public"/)
  has(18, /"fallback-missing\.png" is not in the folder "public"/)
  has(10, /"\/about" leads to no page of the site.*page "\/about"/)
  has(11, /"#nowhere" finds nothing named "nowhere" in the page "\/"/)
  has(12, /"\/buy" leads to no page/)
  has(13, /"\/gone" leads to no page/)
  has(6, /"#contact" finds nothing named "contact"/) // links Contact: neither a section nor a page of that name
  assert.equal(w.length, 12, w.join('\n'))
})

test('kaury check lists the files and the links that lead nowhere, as warnings', async () => {
  const j = await check(site('trust-dead-check', DEAD))
  assert.equal(j.ok, true)
  assert.ok(j.problems.every((p: any) => p.severity === 'warning'))
  assert.ok(j.problems.some((p: any) => p.line === 8 && /missing\.jpg/.test(p.message)))
  assert.ok(j.problems.some((p: any) => p.line === 10 && /\/about/.test(p.message)))
})

test('files that exist and links that lead somewhere give no warning', async () => {
  const entry = site('trust-alive', [
    'let plans = [{ name: "Solo", price: "9 CHF", features: ["1 site"] }]',
    'let products = [{ slug: "mint" }, { slug: "berry" }]',
    'page "/"',
    '  section header',
    '    logo "logo.svg" "Shop"',
    '    links Home, Flavors, Shop, Prices, Contact',
    '  section flavors',
    '    image "can.jpg", "A can"',
    '    image "https://example.com/far.jpg", "Far away"',
    '    link "Shop" "/shop"',
    '    link "Shop" "/shop/"',
    '    link "Product" "/product/42"',
    '    link "Mint" "/flavor/mint"',
    '    link "Menu" "/menu.pdf"',
    '    link "Out" "https://example.com"',
    '    link "Mail" "mailto:hello@bloom.ch"',
    '    link "Top" "#flavors"',
    '    link "Prices" "/#prices"',
    '    button "Buy", to "/shop?from=home"',
    '    button "Go" -> go "/shop"',
    '    object "knot", color pink',
    '  Pricing plans, "Prices"',
    '  Contact "hello@bloom.ch"',
    'page "/shop"',
    '  title "Shop"',
    'page "/product/:id"',
    '  title "Product {id}"',
    'page "/flavor/{p.slug}" for p in products',
    '  title p.slug',
    '',
  ].join('\n'))
  const pub = join(entry, '..', 'public')
  mkdirSync(pub, { recursive: true })
  for (const f of ['logo.svg', 'can.jpg', 'menu.pdf']) writeFileSync(join(pub, f), f.endsWith('.svg') ? '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"/>' : 'x')
  const r = await build(entry, { dev: true })
  assert.deepEqual(built(r).map((e) => `${e.line}: ${e.what}`), [])
})

test('a menu word whose section is on another page leads to that page', async () => {
  // one menu for the whole site: “About” and “Contact” live on the home page, the menu is on every page
  const entry = site('trust-menu', [
    'component Menu',
    '  section header',
    '    logo "Shop"',
    '    links Home, About, Shop, Contact',
    'page "/"',
    '  Menu',
    '  section about',
    '    text "About us"',
    '  Contact "hello@bloom.ch"',
    'page "/shop"',
    '  Menu',
    '  title "Shop"',
    '',
  ].join('\n'))
  const r = await build(entry, { dev: true })
  const home = readFileSync(join(r.dir, 'index.html'), 'utf8')
  const shop = readFileSync(join(r.dir, 'shop', 'index.html'), 'utf8')
  assert.match(home, /href="#about"/)
  assert.match(home, /href="#contact"/)
  assert.match(shop, /href="\/#about"/)
  assert.match(shop, /href="\/#contact"/)
  assert.deepEqual(built(r).map((e) => `${e.line}: ${e.what}`), [])
})

// ---------------- options that are accepted must do something ----------------
test('“level” sets the heading of a subtitle too, not only of a title', () => {
  // subtitle "…", level 3 was accepted and ignored: an <h2> every time
  const r = compile('let d = { name: "A" }\npage "/"\n  title "T"\n  title "T2", level 2\n  subtitle "S"\n  subtitle "S3", level 3\n  subtitle d.name, level 4\n', { file: 'test.kaury' })
  assert.deepEqual(r.errors, [])
  assert.deepEqual([...r.js.matchAll(/\$k\.h\(\$\w+, "(h\d)"/g)].map((m) => m[1]), ['h1', 'h2', 'h2', 'h3', 'h4'])
})

test('“pin” and “sticky” keep their place when “front” is written with them', () => {
  // a cart drawer: “pin top 0 right 0” in its style, “front” on its line — “front” put it back in the flow
  const r = compile('style drawer\n  pin top 0 right 0, width 360\npage "/"\n  box drawer, front\n    text "x"\n  box sticky 20, front\n    text "y"\n', { file: 'test.kaury' })
  assert.deepEqual(r.errors, [])
  assert.match(r.css, /\.ks-drawer\{[^}]*position:absolute!important/)
  assert.match(r.css, /position:sticky!important/)
  assert.match(r.css, /z-index:10/)
})

test('a named style or a size on the line sets the size of a heading of any level', async () => {
  // found while designing a real site: “title "The menu", heading, level 2” kept the size of the base style,
  // because that one was written “h2.k-title”, heavier for the browser than the class of a named style
  const { BASE_STYLE } = await import('../src/runtime/style.js')
  assert.doesNotMatch(BASE_STYLE, /(^|[,}\s])h[1-6]\.k-(title|subtitle)/, 'no base rule may weigh more than a named style')
  assert.match(BASE_STYLE, /\.k-title:where\(h2:not\(\.k-same\)\),\.k-subtitle\{font-size:/)
  assert.match(BASE_STYLE, /\.k-title:where\(h3\)\{font-size:/)
})

test('a size written for a screen is the size on that screen', () => {
  // found on a phone: “mobile size 46” gave a title of 22 px, because the automatic shrinking of big texts
  // (made for a size given once, for every screen) was applied again inside the rule written for phones
  const r = compile('style display\n  size 92\n  tablet size 64\n  mobile size 46\npage "/"\n  seo "Home", "A page."\n  title "Long lunches", display\n  title "Once", size 80\n', { file: 'test.kaury' })
  assert.deepEqual(r.errors.map((e) => e.format()), [])
  // given once: it follows the width of the screen by itself
  assert.match(r.css, /\.ks-display\{font-size:clamp\(\d+px, ?[\d.]+vw, ?92px\)/)
  assert.match(r.css, /font-size:clamp\(\d+px, ?[\d.]+vw, ?80px\)/)
  // given for a screen: exactly that
  assert.match(r.css, /@media \(min-width: 641px\) and \(max-width: 1024px\)\{\.ks-display\.ks-display\{font-size:64px\}\}/)
  assert.match(r.css, /@media \(max-width: 640px\)\{\.ks-display\.ks-display\{font-size:46px\}\}/)
})

test('“middle” puts a block in the middle of its row or of its grid line', () => {
  // a text next to a tall photo: without it, the text stays at the top and leaves a hole below
  const r = compile('page "/"\n  seo "Home", "A page."\n  grid columns 1 1\n    column middle\n      text "Next to the photo"\n    box height 400\n      text "x"\n', { file: 'test.kaury' })
  assert.deepEqual(r.errors.map((e) => e.format()), [])
  assert.match(r.css, /align-self:center/)
})

test('“grayscale” shows a picture in black and white, and “hover grayscale 0” gives its colors back', () => {
  // photographs from different sources, brought to one look: the usual move of a designed page
  const src = 'style portrait\n  grayscale\n  hover grayscale 0\n\npage "/"\n  seo "Home", "A page."\n  image "a.jpg", "A coach in the gym", portrait\n'
  const r = compile(src, { file: 'test.kaury' })
  assert.deepEqual(r.errors.map((e) => e.format()), [])
  assert.match(r.css, /\{[^}]*filter:grayscale\(1\)/)
  assert.match(r.css, /:hover\{filter:grayscale\(0\)\}/)
  assert.match(r.css, /transition:[^}]*filter \.35s/, 'the colors come back smoothly')
})

test('“grayscale” and “blur” on the same line are both kept', () => {
  const r = compile('page "/"\n  seo "Home", "A page."\n  box grayscale, blur 4\n    text "x"\n', { file: 'test.kaury' })
  assert.deepEqual(r.errors.map((e) => e.format()), [])
  assert.match(r.css, /filter:grayscale\(1\) blur\(4px\)/)
})

test('“noir-et-blanc” and “monochrome” are other ways to write “grayscale”; “gray” alone stays the color', () => {
  for (const word of ['noir-et-blanc', 'monochrome', 'greyscale']) {
    const r = compile(`page "/"\n  seo "Home", "A page."\n  box ${word}\n    text "x"\n`, { file: 'test.kaury' })
    assert.deepEqual(r.errors.map((e) => e.format()), [], word)
    assert.match(r.css, /filter:grayscale\(1\)/, word)
  }
  const gray = compile('page "/"\n  seo "Home", "A page."\n  box gray\n    text "x"\n', { file: 'test.kaury' })
  assert.match(gray.css, /background:var\(--k-gray\)/)
})

test('“shade” darkens a background picture so the text in front stays readable', () => {
  // the hero written over a photograph: without a veil, the headline is lost in the picture
  const r = compile('page "/"\n  seo "Home", "A page."\n  section hero, background "hall.jpg", shade 0.6\n    title "Strong is built here."\n', { file: 'test.kaury' })
  assert.deepEqual(r.errors.map((e) => e.format()), [])
  assert.match(r.css, /--k-pic:url\("\/hall\.jpg"\);background:linear-gradient\([^;]*var\(--k-shade,0\)[^;]*var\(--k-pic\)/)
  assert.match(r.css, /--k-shade:0\.6/)
  assert.match(r.css, /color:#fff/, 'the text turns light on the darkened picture')
})

test('“shade 0.8 bottom” darkens toward one side and leaves the other side of the picture clear', () => {
  const r = compile('page "/"\n  seo "Home", "A page."\n  section hero, background "hall.jpg", shade 0.8 bottom\n    title "Strong is built here."\n', { file: 'test.kaury' })
  assert.deepEqual(r.errors.map((e) => e.format()), [])
  assert.match(r.css, /--k-shade:0\.8/)
  assert.match(r.css, /--k-shade-from:0/)
  assert.match(r.css, /--k-shade-to:to bottom/)
})

test('a “shade” written for one screen replaces the one above entirely', () => {
  // darker toward the bottom on a desktop, an even veil on a phone where the text covers the whole picture
  const r = compile('page "/"\n  seo "Home", "A page."\n  section hero, background "hall.jpg", shade 0.9 bottom\n    mobile shade 0.7\n    title "Strong is built here."\n', { file: 'test.kaury' })
  assert.deepEqual(r.errors.map((e) => e.format()), [])
  assert.match(r.css, /@media \(max-width: 640px\)\{[^}]*\{--k-shade:0\.7;--k-shade-from:0\.7/)
})

test('a size a little above 36 does not fall under the size of a small heading on a phone', () => {
  // “size 36” stayed 36 on a phone while “size 38” became 18: smaller than the text around it
  const r = compile('page "/"\n  seo "Home", "A page."\n  title "Ines Moreau", size 38\n  title "Strong", size 216\n', { file: 'test.kaury' })
  assert.deepEqual(r.errors.map((e) => e.format()), [])
  assert.match(r.css, /font-size:clamp\(30px, 2\.92vw, 38px\)/)
  assert.match(r.css, /font-size:clamp\(104px, 16\.62vw, 216px\)/, 'the very big ones keep shrinking as before')
})

test('a light “shade” leaves the color of the text alone, and a color written wins', () => {
  const light = compile('page "/"\n  seo "Home", "A page."\n  section hero, background "hall.jpg", shade 0.2\n    title "Hello"\n', { file: 'test.kaury' })
  assert.deepEqual(light.errors.map((e) => e.format()), [])
  assert.match(light.css, /--k-shade:0\.2/)
  assert.doesNotMatch(light.css, /color:#fff/)
  const own = compile('page "/"\n  seo "Home", "A page."\n  section hero, background "hall.jpg", shade 0.6, color yellow\n    title "Hello"\n', { file: 'test.kaury' })
  assert.deepEqual(own.errors.map((e) => e.format()), [])
  assert.doesNotMatch(own.css, /color:#fff/)
})

test('the veil of a picture is not handed down to the pictures inside it', async () => {
  // a shaded hero with a card that has its own background picture: the card keeps its picture as it is
  const { BASE_STYLE } = await import('../src/runtime/style.js')
  assert.match(BASE_STYLE, /@property --k-shade\{syntax:"<number>";inherits:false;initial-value:0\}/)
  assert.match(BASE_STYLE, /@property --k-shade-from\{syntax:"\*";inherits:false\}/)
  assert.match(BASE_STYLE, /@property --k-shade-to\{syntax:"\*";inherits:false\}/)
})

test('a button with its own background has no glow of the accent color left under it', async () => {
  // an outlined button on a page whose accent is green kept a green halo under an empty frame
  const { BASE_STYLE } = await import('../src/runtime/style.js')
  assert.match(BASE_STYLE, /@property --k-glow\{syntax:"\*";inherits:false\}/)
  assert.match(BASE_STYLE, /\.k-button\{[^}]*box-shadow:0 8px 20px -10px color-mix\(in srgb,var\(--k-glow,var\(--k-accent\)\) 70%,transparent\)/)
  assert.match(BASE_STYLE, /\.k-button:hover\{[^}]*color-mix\(in srgb,var\(--k-glow,var\(--k-accent\)\) 75%,transparent\)/)
  const r = compile('style quiet\n  background transparent, border 2 ink\n\npage "/"\n  seo "Home", "A page."\n  button "See the menu", quiet\n  button "Order", night\n', { file: 'test.kaury' })
  assert.deepEqual(r.errors.map((e) => e.format()), [])
  assert.match(r.css, /background:transparent;[^}]*--k-glow:transparent/)
  assert.match(r.css, /background:var\(--k-night\);[^}]*--k-glow:var\(--k-night\)/, 'a color written alone on a button too')
})

test('in a “no-wrap” row the texts stay on one line too (a ticker)', async () => {
  // the row did not wrap, but “Open gym” was cut in two inside it
  const { BASE_STYLE } = await import('../src/runtime/style.js')
  assert.match(BASE_STYLE, /\.k-title,\.k-subtitle,\.k-text\{white-space:var\(--k-ws,pre-line\)\}/)
  const r = compile('page "/"\n  seo "Home", "A page."\n  row no-wrap\n    text "Open gym"\n', { file: 'test.kaury' })
  assert.deepEqual(r.errors.map((e) => e.format()), [])
  assert.match(r.css, /--k-ws:pre[;}]/)
})

test('“direction column” lets the children take the whole width, unless “center” is written', () => {
  // a footer in a column: its row of addresses was shrunk and centered, and “margin 0 0 0 auto” pushed nothing
  const r = compile('page "/"\n  seo "Home", "A page."\n  footer direction column\n    row\n      text "Rue de Genève 88"\n', { file: 'test.kaury' })
  assert.deepEqual(r.errors.map((e) => e.format()), [])
  assert.match(r.css, /flex-direction:column;align-items:stretch/)
  const centered = compile('page "/"\n  seo "Home", "A page."\n  footer direction column, center\n    text "Rue de Genève 88"\n', { file: 'test.kaury' })
  assert.doesNotMatch(centered.css, /align-items:stretch/)
  const before = compile('page "/"\n  seo "Home", "A page."\n  footer center, direction column\n    text "Rue de Genève 88"\n', { file: 'test.kaury' })
  assert.doesNotMatch(before.css, /align-items:stretch/)
  const across = compile('page "/"\n  seo "Home", "A page."\n  column direction row\n    text "Rue de Genève 88"\n', { file: 'test.kaury' })
  assert.doesNotMatch(across.css, /align-items:stretch/)
})

test('“upright” takes the italic away: an emphasis shown by its color alone', () => {
  const r = compile('site "Forge"\n  colors accent #C8F03C\n\nstyle emphasis\n  upright, color accent\n\npage "/"\n  seo "Home", "A page."\n  title "Strong is *built* here."\n', { file: 'test.kaury' })
  assert.deepEqual(r.errors.map((e) => e.format()), [])
  assert.match(r.css, /font-style:normal/)
  for (const word of ['droit', 'no-italic']) {
    const other = compile(`page "/"\n  seo "Home", "A page."\n  text "x", ${word}\n`, { file: 'test.kaury' })
    assert.deepEqual(other.errors.map((e) => e.format()), [], word)
    assert.match(other.css, /font-style:normal/, word)
  }
})

const LINA = 'site "Lina"\n  colors accent #B4432B, paper #EEF0E7, leaf #DCE3CD, ink #1C2118, night #0A0B0D, silver #D5DBE0\n  style background paper, color ink\n\nstyle tinted\n  background leaf, padding 36\n\nstyle label\n  uppercase, size 12, weight 700, color accent\n\n'
const hard = (r: { warnings: { message: string; line: number; fix?: string }[] }) => r.warnings.filter((w) => /hard to read on the background of what contains it/.test(w.message))

test('a small text whose color cannot be read on the background of the box it is in gets a warning', () => {
  // found by Lighthouse on a designed page: the label was fine on the page, not inside the tinted card
  const r = compile(LINA + 'page "/"\n  seo "Home", "A page."\n  column tinted\n    text "Lina\'s table", label\n', { file: 'test.kaury' })
  assert.deepEqual(r.errors.map((e) => e.format()), [])
  assert.equal(hard(r).length, 1)
  assert.match(hard(r)[0].message, /#B4432B on #DCE3CD: contrast 4\.2, 4\.5 is the minimum/)
  assert.equal(hard(r)[0].line, 14, 'on the line of the text')
  // the answer is a color that works, checked here against the same background
  const shade = /color (#[0-9A-F]{6})/.exec(hard(r)[0].fix ?? '')?.[1]
  assert.ok(shade, 'a shade is proposed')
  const again = compile(LINA.replace('size 12, weight 700, color accent', `size 12, weight 700, color ${shade}`) + 'page "/"\n  seo "Home", "A page."\n  column tinted\n    text "Lina\'s table", label\n', { file: 'test.kaury' })
  assert.equal(hard(again).length, 0, 'the proposed shade is accepted')
})

test('the same text straight on the page, or written big, is left alone', () => {
  const page = compile(LINA + 'page "/"\n  seo "Home", "A page."\n  section\n    text "Lina\'s table", label\n', { file: 'test.kaury' })
  assert.equal(hard(page).length, 0, 'contrast 4.8 on the page')
  const big = compile(LINA + 'page "/"\n  seo "Home", "A page."\n  column tinted\n    title "Five plates", size 40, color accent\n', { file: 'test.kaury' })
  assert.equal(hard(big).length, 0, 'a big text needs 3, not 4.5')
})

test('the warning follows the tree: through a “for”, a row, an “if”', () => {
  const r = compile(LINA + 'let plates = ["One", "Two"]\n\npage "/"\n  seo "Home", "A page."\n  column tinted\n    row\n      for p in plates\n        if p\n          text p, label\n', { file: 'test.kaury' })
  assert.deepEqual(r.errors.map((e) => e.format()), [])
  assert.equal(hard(r).length, 1)
})

test('a text made faint with “opacity” is read as it is seen', () => {
  // the names of the notes one is not looking at: too faint to be read at all
  const src = LINA + 'style name\n  background transparent, color silver, size 52, opacity 0.28\n\npage "/"\n  seo "Home", "A page."\n  section notes, background night\n    button "Incense", name\n'
  const r = compile(src, { file: 'test.kaury' })
  assert.deepEqual(r.errors.map((e) => e.format()), [])
  assert.equal(hard(r).length, 1)
  assert.match(hard(r)[0].message, /contrast 2\.\d, 3 is the minimum/)
  const fine = compile(src.replace('opacity 0.28', 'opacity 0.5'), { file: 'test.kaury' })
  assert.equal(hard(fine).length, 0)
})

test('a big faint text that is only decoration can say so, and is then left alone', () => {
  // the name of the place written very big and very pale at the bottom of the page
  const mark = 'style wordmark\n  size 230, weight 800, color leaf\n\npage "/"\n  seo "Home", "A page."\n  footer\n    text "Chez Lina", wordmark'
  const r = compile(LINA + mark + '\n', { file: 'test.kaury' })
  assert.equal(hard(r).length, 1)
  assert.match(hard(r)[0].fix ?? '', /attr "aria-hidden" "true"/, 'the way to say it is given')
  const said = compile(LINA + mark + ', attr "aria-hidden" "true"\n', { file: 'test.kaury' })
  assert.deepEqual(said.errors.map((e) => e.format()), [])
  assert.equal(hard(said).length, 0)
})

test('nothing is said when the background is not known: a picture, a gradient, a style under a condition', () => {
  const picture = compile(LINA + 'page "/"\n  seo "Home", "A page."\n  section hero, background "hall.jpg"\n    text "Lina\'s table", label\n', { file: 'test.kaury' })
  assert.equal(hard(picture).length, 0)
  const gradient = compile(LINA + 'page "/"\n  seo "Home", "A page."\n  box gradient leaf paper\n    text "Lina\'s table", label\n', { file: 'test.kaury' })
  assert.equal(hard(gradient).length, 0)
  const condition = compile(LINA + 'state on = true\n\npage "/"\n  seo "Home", "A page."\n  column tinted on\n    text "Lina\'s table", label\n', { file: 'test.kaury' })
  assert.equal(hard(condition).length, 0)
})

test('a button, a link or an icon written directly in a section keeps its own width', async () => {
  // the usual hero — a title, a text, a button — stretched the button across the whole page
  const { BASE_STYLE } = await import('../src/runtime/style.js')
  const generic = BASE_STYLE.indexOf('.k-section>*:not(.k-full,.k-column,.k-box,.k-grid,.k-row){width:100%')
  const own = BASE_STYLE.search(/\.k-section>\.k-button,\.k-section>\.k-link,\.k-section>\.k-icon\{width:fit-content;margin-inline:var\(--k-mx,var\(--k-mi,0px\)\)\}/)
  assert.ok(generic > 0, 'the rule that sizes what is in a section')
  // same weight for the browser: the later rule wins, so it has to come after
  assert.ok(own > generic, 'its exception for what has a width of its own, written after it')
})

// ---------------- a state kept in the browser ----------------
test('a page whose saved state differs from the served HTML is rebuilt whole, not left half-built', async () => {
  // a cart kept with “persist”: the HTML was made with an empty cart, the visitor comes back with a full one
  const { renderPage } = await import('../src/runtime/index.js')
  const { installSSR, serialize } = await import('../src/runtime/ssr.js')
  const src = [
    'export state cart = []',
    'page "/"',
    '  section',
    '    title "Your order"',
    '    if cart.length == 0',
    '      text "Your cart is empty."',
    '      button "See the wines", to "/"',
    '    else',
    '      for line in cart',
    '        text "{line.n} × {line.name}"',
    '      text "Total"',
    '      button "Order" -> cart.clear()',
    '',
  ].join('\n')
  const doc = installSSR()
  const target = doc.createElement('div')
  renderPage((await run(src)).module, '/', target) // what the server sent: made by another run of the program
  assert.match(serialize(target), /Your cart is empty/)
  const { module } = await run(src) // the program as it starts in the browser, with what the visitor had saved
  module.cart.v = [{ n: 2, name: 'Gamay' }, { n: 1, name: 'Syrah' }]
  const said: string[] = []
  const quiet: string[] = []
  const error = console.error
  const note = console.info
  console.error = (...a: unknown[]) => said.push(a.map(String).join(' '))
  console.info = (...a: unknown[]) => quiet.push(a.map(String).join(' '))
  ;(globalThis as any).__kauryDev = true // as under “kaury dev”
  let info: any
  try {
    info = renderPage(module, '/', target, true) // the browser adopts the HTML… or rebuilds the page
  } finally {
    console.error = error
    console.info = note
    delete (globalThis as any).__kauryDev
  }
  // while developing, the author is told quietly, with the reason
  assert.equal(quiet.length, 1)
  assert.match(quiet[0], /the page "\/" was rebuilt in the browser.*expected <p>/)
  const html = serialize(target)
  assert.equal(info.hydrated, false, 'the page was rebuilt')
  assert.match(html, /2 × Gamay.*1 × Syrah.*Total.*Order/s)
  assert.doesNotMatch(html, /Your cart is empty/)
  assert.deepEqual(said, [], 'nothing is said to the visitor: a saved state is not a mistake')
})

// ---------------- what search engines need ----------------
test('a page without “seo” is described by its own first sentence', async () => {
  // measured with Lighthouse on a site written without a “seo” line: SEO 91, and 100 once the page has a description
  const entry = site('trust-excerpt', [
    'site "Forge"',
    '  url "https://forge.example"',
    'page "/"',
    '  section header',
    '    logo "Forge"',
    '    links Prices',
    '  section fullscreen, center',
    '    title "Stronger than *yesterday*."',
    '    text "Open"',
    '    text "A gym in Bulle with real coaches, small classes & no mirror selfies. Your first session is free, and so is the second one if you bring a friend who has never lifted anything heavier than a laptop."',
    'page "/prices"',
    '  seo "Prices", "What a month at Forge costs."',
    '  title "Prices"',
    '  text "From 59 francs a month, with no contract and nothing to sign for more than thirty days."',
    'page "/empty"',
    '  title "Soon"',
    '',
  ].join('\n'))
  const r = await build(entry, { dev: true })
  const meta = (file: string) => /<meta name="description" content="([^"]*)"/.exec(readFileSync(join(r.dir, file), 'utf8'))?.[1]
  // the first sentence long enough to say something, cut at a word, under what Google shows
  const home = meta('index.html')!
  assert.match(home, /^A gym in Bulle with real coaches, small classes &amp; no mirror selfies\. Your first session is free/)
  assert.ok(home.length <= 170 && home.endsWith('…'), home)
  // what the author wrote is kept as it is
  assert.equal(meta('prices/index.html'), 'What a month at Forge costs.')
  // a page with nothing to say gets its title, never an empty description
  assert.equal(meta('empty/index.html'), 'Soon')
  // and the file for AI assistants has its summary
  assert.match(readFileSync(join(r.dir, 'llms.txt'), 'utf8'), /> A gym in Bulle with real coaches/)
})

// ---------------- accessibility by default ----------------
test('buttons with “selected” are accessible without a role written by hand', async () => {
  // measured with Lighthouse on five sites written from the spec: “Required ARIA parent role not present: tablist”
  const { renderPage } = await import('../src/runtime/index.js')
  const { installSSR, serialize } = await import('../src/runtime/ssr.js')
  const src = [
    'state tab = 0',
    'let kinds = ["a", "b"]',
    'style chip',
    '  padding 8 16',
    '  selected background black, color white',
    'page "/"',
    '  row gap 8', //                                       tabs written one by one
    '    button "One", chip, selected (tab == 0) -> tab = 0',
    '    button "Two", chip, selected (tab == 1) -> tab = 1',
    '  row gap 8', //                                       tabs made by a loop
    '    for k, i in kinds',
    '      button k, selected (tab == i) -> tab = i',
    '  section', //                                         directly in a section: a button that is on or off
    '    button "Solo", chip, selected (tab == 0) -> tab = 0',
    '  row attr "role" "tablist"', //                       a role written by the author is kept, not doubled
    '    button "Own", selected (tab == 0) -> tab = 0',
    '',
  ].join('\n')
  const { module } = await run(src)
  const doc = installSSR()
  const target = doc.createElement('div')
  renderPage(module, '/', target)
  const html = serialize(target)
  const count = (re: RegExp) => (html.match(re) ?? []).length
  assert.equal(count(/<div[^>]*role="tablist"/g), 3, html)
  assert.equal(count(/<button[^>]*role="tab"/g), 5)
  assert.equal(count(/<button[^>]*aria-selected="(true|false)"/g), 5)
  // alone in a section: no list of tabs to belong to, so a button that is pressed or not
  assert.match(html, /<button[^>]*aria-pressed="true"[^>]*>Solo<\/button>/)
  assert.doesNotMatch(html, /<button[^>]*role="tab"[^>]*>Solo/)
  assert.doesNotMatch(html, /<section[^>]*role=/)
  // the “selected” look of a style applies to both
  assert.match(compile(src, { file: 'test.kaury' }).css, /\.ks-chip:is\(\[aria-selected="true"\],\[aria-pressed="true"\]\)\{background:/)
})

test('the color of buttons must carry a text that can be read', () => {
  // measured with Lighthouse on a site written from the spec: white on #B5651D, contrast 4.33 for a minimum of 4.5
  const w = warnings('site "Levain"\n  colors crust #B5651D, flour #FBF6EC\npage "/"\n  seo "Home", "A bakery."\n  button "Order"\n')
  assert.equal(w.length, 1, w.join('\n'))
  assert.match(w[0], /line 2: "crust" \(#B5651D\) is the color of the buttons, and no text is easy to read on it \(contrast 4\.3, 4\.5 is the minimum\)/)
  // the shade proposed is close, and really works
  const shade = /works: colors crust (#[0-9A-F]{6})/.exec(w[0])?.[1]
  assert.ok(shade, w[0])
  assert.deepEqual(warnings(`site "Levain"\n  colors crust ${shade}, flour #FBF6EC\npage "/"\n  seo "Home", "A bakery."\n  button "Order"\n`), [])
  // a color that works is left alone, and a site without button is not concerned
  assert.deepEqual(warnings('site "Lina"\n  colors terracotta #C2553A\npage "/"\n  seo "Home", "A table."\n  button "Book"\n'), [])
  assert.deepEqual(warnings('site "Levain"\n  colors crust #B5651D\npage "/"\n  seo "Home", "A bakery."\n  title "Bread", color crust\n'), [])
})

test('a button given a text color but no background is checked against the color of the buttons', () => {
  // measured with Lighthouse: a “step” style with “color smoke”, on the default gold of the buttons — contrast 1.61
  const src = [
    'site "Nuit"',
    '  colors gold #D9B26F, smoke #8E8EA3, night #0B0B12',
    '  style background night',
    'style step',
    '  padding 10 18, border 1 smoke, color smoke',
    '  selected color gold',
    'style clear',
    '  background transparent, color smoke',
    'page "/"',
    '  seo "Nuit", "A perfume."',
    '  row',
    '    button "A", step',
    '    button "B", step, outline',
    '    button "C", clear',
    '    button "D", color night',
    '    button "E", smoke, color night',
    '',
  ].join('\n')
  const w = warnings(src)
  assert.equal(w.length, 1, w.join('\n'))
  assert.match(w[0], /line 12: this button keeps the background of the buttons \(gold #D9B26F\): its text color is hard to read on it \(contrast 1\.6, 4\.5 is the minimum\)/)
  assert.match(w[0], /background transparent.*“outline” or “ghost”/)
})

test('a heading that skips a level is said, with its line', async () => {
  // measured with Lighthouse on two sites written from the spec: “Heading elements are not in a sequentially-descending order”
  const entry = site('trust-headings', [
    'let tiles = [{ name: "Pulse" }, { name: "Atlas" }]',
    'page "/"',
    '  title "Design that ships."',
    '  section work',
    '    for t in tiles',
    '      subtitle t.name, level 3',
    'page "/about"',
    '  title "About"',
    '  subtitle "The studio"',
    '  subtitle "People", level 3',
    '  subtitle "Tools", level 5',
    '',
  ].join('\n'))
  const r = await build(entry, { dev: true })
  const w = built(r).map((e) => `${e.line}: ${e.what} → ${e.fix}`)
  assert.equal(w.length, 2, w.join('\n'))
  // made by a loop: said at the line of the page, once
  assert.match(w[0], /^2: in the page "\/", the heading "Pulse" is of level 3 right after one of level 1.*level 2/)
  // written as it is: said at its own line
  assert.match(w[1], /^11: in the page "\/about", the heading "Tools" is of level 5 right after one of level 3.*level 4/)
})

// ---------------- ready-made blocks ----------------
test('the ready-made blocks never warn about what the author cannot change', () => {
  const src = [
    'let people = [{ name: "Ada", role: "Developer", photo: "ada.jpg" }]',
    'let quotes = [{ quote: "Great work", name: "Bob", role: "Client", photo: "bob.jpg" }]',
    'let shots = ["a.jpg", "b.jpg"]',
    'page "/"',
    '  seo "Home", "A page made of ready-made blocks."',
    '  Hero "Hello", "Intro", "Go", "#contact", "hero.jpg"',
    '  Testimonials quotes, "Reviews"',
    '  Team people, "Team"',
    '  Logos shots, "They trust us"',
    '  Gallery shots, "Gallery"',
    '',
  ].join('\n')
  const r = compile(src, { file: 'test.kaury' })
  assert.deepEqual(r.errors.map((e) => e.format(src)), [])
  assert.deepEqual(r.warnings.map((w) => w.what), [])
  // the faces are described by the name of the person; pictures that only decorate are marked as such
  assert.match(r.js, /p\?\.name|p\.name/)
})

// ---------------- indentation ----------------
test('an indentation that is not 2 spaces gets a warning that says so', () => {
  const w = warnings('page "/"\n   title "Three spaces"\n').join('\n')
  assert.match(w, /indented by 3 spaces/)
  assert.match(w, /2 spaces/)
  assert.deepEqual(warnings('page "/"\n  seo "Home", "A page."\n  section\n    title "Two spaces"\n'), [])
})

test('a style named after an element, written on another element, is said: it would do nothing there', () => {
  // “style card” restyles every card; “column card” took the word, and the column kept its plain look, in silence
  const r = compile('style card\n  background white, padding 28\n\npage "/"\n  seo "Home", "A page."\n  column card\n    text "Routes"\n', { file: 'test.kaury' })
  const said = r.warnings.filter((w) => /styles every "card"/.test(w.message))
  assert.equal(said.length, 1)
  assert.equal(said[0].line, 6)
  assert.match(said[0].fix ?? '', /style panel/)
  // on the element it is made for, nothing is said
  const fine = compile('style card\n  background white, padding 28\n\npage "/"\n  seo "Home", "A page."\n  card\n    text "Routes"\n', { file: 'test.kaury' })
  assert.equal(fine.warnings.filter((w) => /styles every/.test(w.message)).length, 0)
})

test('a named style misspelled on a box is said: the word would only become the name of the box', () => {
  // “column tintd” gave the column the id “tintd” and no style at all, without a word
  const r = compile('style tinted\n  background white, padding 28\n\npage "/"\n  seo "Home", "A page."\n  column tintd\n    text "Routes"\n  column tinted\n    text "x"\n', { file: 'test.kaury' })
  const said = r.warnings.filter((w) => /becomes the name of this/.test(w.message))
  assert.equal(said.length, 1)
  assert.equal(said[0].line, 6)
  assert.match(said[0].fix ?? '', /did you mean the style "tinted"/)
  // a name that looks like no style is a name, and nothing is said
  const named = compile('style tinted\n  background white\n\npage "/"\n  seo "Home", "A page."\n  column prices\n    text "x"\n  box tinted\n    text "y"\n', { file: 'test.kaury' })
  assert.equal(named.warnings.filter((w) => /becomes the name of this/.test(w.message)).length, 0)
})

// ---------------- one main heading per page ----------------
const headings = (html: string) => [...html.matchAll(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/g)].map((m) => `h${m[1]} ${m[2].replace(/<[^>]+>/g, '')}`)

test('the first title of a page is its main heading, the next ones are of level 2', async () => {
  // found on the home page of the language: two <h1>. A title is written for every part of a page; one of them
  // only is the subject of the page, for a screen reader and for a search engine.
  const r = await build(site('trust-one-h1', [
    'page "/"',
    '  section hero',
    '    title "Flowers"',
    '  section',
    '    title "Our bouquets"',
    '    subtitle "Roses", level 3',
    '  section',
    '    title "Find us", level 1',
    'page "/about"',
    '  title "About"',
    '  title "The team"',
  ].join('\n') + '\n'))
  assert.deepEqual(headings(readFileSync(join(r.dir, 'index.html'), 'utf8')), ['h1 Flowers', 'h2 Our bouquets', 'h3 Roses', 'h1 Find us'])
  // each page counts for itself
  assert.deepEqual(headings(readFileSync(join(r.dir, 'about', 'index.html'), 'utf8')), ['h1 About', 'h2 The team'])
  assert.deepEqual(built(r), [])
  // it stays as big as a title: only what it is called changes, not how the page looks (“level 2” makes it smaller)
  const page = readFileSync(join(r.dir, 'index.html'), 'utf8')
  assert.match(page, /<h2 class="k-title k-same[^"]*">Our bouquets/)
  assert.ok(page.includes('.k-title:where(h2:not(.k-same))'))
  assert.match(readFileSync(join(r.dir, 'about', 'index.html'), 'utf8'), /<h2 class="k-title k-same[^"]*">The team/)
})

test('a title that only shows in one case does not take the place of the main heading', async () => {
  // a menu that opens, a message after a form: the title written after it is still the first one sure to be there;
  // and the two sides of a choice are one place, not two
  const r = await build(site('trust-one-h1-if', [
    'state open = false',
    'state sent = false',
    'page "/"',
    '  if open',
    '    title "Menu"',
    '  if sent',
    '    title "Thank you"',
    '  else',
    '    title "Write to us"',
    '  title "Where we are"',
  ].join('\n') + '\n'))
  assert.deepEqual(headings(readFileSync(join(r.dir, 'index.html'), 'utf8')), ['h1 Write to us', 'h2 Where we are'])
  const js = compile('state sent = false\npage "/"\n  if sent\n    title "Thank you"\n  else\n    title "Write to us"\n  title "Where we are"\n', { file: 't.kaury' }).js
  assert.equal((js.match(/"h1"/g) ?? []).length, 2)
  assert.equal((js.match(/"h2"/g) ?? []).length, 1)
})

test('a ready-made block or a component that brings a title is the main heading of the page', async () => {
  const r = await build(site('trust-one-h1-block', [
    'component Top name',
    '  title name',
    'page "/"',
    '  Hero "Flowers that speak.", "Delivered the same day."',
    '  title "Our bouquets"',
    'page "/about"',
    '  Top "About"',
    '  title "The team"',
  ].join('\n') + '\n'))
  assert.deepEqual(headings(readFileSync(join(r.dir, 'index.html'), 'utf8')), ['h1 Flowers that speak.', 'h2 Our bouquets'])
  assert.deepEqual(headings(readFileSync(join(r.dir, 'about', 'index.html'), 'utf8')), ['h1 About', 'h2 The team'])
})

test('a Markdown text that brings its own main heading goes one level down under the title of the page', async () => {
  // found on the “For AI” page of the language: the specification starts with “# Kaury”, under the title of the page
  const r = await build(site('trust-one-h1-markdown', [
    'let post = "# The post\\n\\nHello.\\n\\n## A part\\n\\n### A detail"',
    'let plain = "Hello.\\n\\n## A part"',
    'page "/"',
    '  title "Journal"',
    '  markdown post',
    '  markdown plain',
    'page "/alone"',
    '  markdown post',
  ].join('\n') + '\n'))
  // under a title: everything one level down; a text without main heading is left as it is
  assert.deepEqual(headings(readFileSync(join(r.dir, 'index.html'), 'utf8')).map((h) => h.replace('#', '')), ['h1 Journal', 'h2 The post', 'h3 A part', 'h4 A detail', 'h2 A part'])
  // alone in its page, its heading is the heading of the page
  assert.deepEqual(headings(readFileSync(join(r.dir, 'alone', 'index.html'), 'utf8')).map((h) => h.replace('#', '')), ['h1 The post', 'h2 A part', 'h3 A detail'])
})

test('the height written on a scene is its height, even a small one', async () => {
  // found while looking for something else: “scene height 300” stayed 540 px tall on a laptop, because the scene
  // keeps a least height (60 % of the screen) for when nothing is written, and that one won
  const r = await build(site('trust-scene-height', 'page "/"\n  scene height 300\n    object "gem", alt "A gem"\n  scene\n    object "gem", alt "A gem"\n'))
  const scenes = [...readFileSync(join(r.dir, 'index.html'), 'utf8').matchAll(/<div class="k-scene[^"]*"([^>]*)>/g)].map((m) => m[1])
  assert.equal(scenes.length, 2)
  assert.match(scenes[0], /style="[^"]*height: ?300px/)
  assert.match(scenes[0], /min-height: ?0/)
  // nothing written: the least height stays
  assert.doesNotMatch(scenes[1], /min-height/)
})
