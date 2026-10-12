// Habits from HTML, CSS, JavaScript, React or Python: whoever writes Kaury for the first time (an AI above all)
// reaches for what it already knows. The compiler answers with the Kaury way to say it, not with a guess.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { errors } from './helpers.js'
import { compile, setLanguage } from '../src/core/index.js'
import { OPTION_HABITS, ELEMENT_HABITS } from '../src/core/habits.js'

setLanguage('en')

/** A page with a state, a list and a value, and the lines given inside a section. */
const page = (body: string) => `state count = 0\nstate items = []\nlet total = 12\npage "/"\n  section\n${body.split('\n').map((l) => '    ' + l).join('\n')}\n    text "{count} {items.length} {total}"\n`

const cases: [string, string, RegExp][] = [
  // ---- CSS ----
  ['css: font-size', page('text "Hi", font-size 20'), /in Kaury: size 20/],
  ['css: background-color', page('box background-color pink\n  text "x"'), /in Kaury: background pink/],
  ['css: border-radius', page('box border-radius 8\n  text "x"'), /in Kaury: radius 12/],
  ['css: margin-top', page('text "Hi", margin-top 20'), /in Kaury: margin 20 0 0 0 +\(top, right, bottom, left\)/],
  ['css: padding-x', page('box padding-x 20\n  text "x"'), /in Kaury: padding 0 20/],
  ['css: display', page('box display flex\n  text "x"'), /row \(side by side\), column \(stacked\)/],
  ['css: text-align', page('text "Hi", text-align center'), /in Kaury: align center/],
  ['css: font-weight', page('text "Hi", font-weight 600'), /in Kaury: weight 600/],
  ['css: z-index', page('box z-index 10\n  text "x"'), /in Kaury: front/],
  ['css: justify-content', page('row justify-content center\n  text "x"'), /in Kaury: center/],
  ['css: a colon after the option', page('title "Hi", color: red'), /Kaury writes no ":" here[\s\S]*color red/],
  ['css: hex color without #', page('text "Hi", color FF0000'), /"FF0000" is not a color[\s\S]*#FF0000/],
  ['css: unknown color name', page('text "Hi", color turquoise-blue'), /"turquoise-blue" is not a color[\s\S]*colors turquoise-blue #/],
  ['css: misspelled color name', page('box border 2 oragne\n  text "x"'), /"oragne" is not a color[\s\S]*did you mean "orange"/],
  // ---- HTML ----
  ['html: div', page('div\n  text "x"'), /"div" is not a Kaury word[\s\S]*in Kaury: box/],
  ['html: h1', page('h1 "Title"'), /in Kaury: title "…"/],
  ['html: h3', page('h3 "Title"'), /in Kaury: subtitle "…", level 3/],
  ['html: p', page('p "Paragraph"'), /in Kaury: text "…"/],
  ['html: a', page('a "Contact" "/contact"'), /in Kaury: link "Contact" "\/contact"/],
  ['html: img', page('img "photo.jpg", "A photo"'), /in Kaury: image "photo\.jpg", "What it shows"/],
  ['html: ul', page('ul\n  li "One"'), /in Kaury: list/],
  ['html: tags', page('<h1>Title</h1>'), /Kaury has no tags[\s\S]*title "…"/],
  ['html: container', page('container\n  text "x"'), /in Kaury: box/],
  ['html: hero', page('hero\n  title "x"'), /in Kaury: Hero "Title"/],
  ['html: navbar', page('navbar\n  link "a" "/a"'), /in Kaury: header/],
  ['html: flex', page('flex\n  text "x"'), /in Kaury: row/],
  ['html: submit', page('form\n  field email "E"\n  submit "Send"'), /in Kaury: button "Send"/],
  // ---- JavaScript ----
  ['js: var', 'var x = 3\nprint x\n', /"var" is not a Kaury word[\s\S]*let x = 3[\s\S]*state x = 3/],
  ['js: ===', 'let x = 3\nif x === 3\n  print x\n', /"===" is written "=="/],
  ['js: !==', 'let x = 3\nif x !== 3\n  print x\n', /"!==" is written "!="/],
  ['js: &&', 'let x = 3\nif x > 1 && x < 5\n  print x\n', /"&&" is written "and"/],
  ['js: ||', 'let x = 3\nif x > 1 || x < 5\n  print x\n', /"\|\|" is written "or"/],
  ['js: =>', 'let l = [1, 2]\nprint l.map(x => x * 2)\n', /"=>" is written "->"/],
  ['js: function with parentheses', 'function add(a, b)\n  a + b\nprint add(1, 2)\n', /without parentheses[\s\S]*function add a, b/],
  ['js: template text', 'let n = "A"\nprint `Hello ${n}`\n', /double quotes[\s\S]*"Hello \{name\}"/],
  ['js: ternary', 'let x = 3\nprint x > 2 ? "big" : "small"\n', /if x > 2 then "big" else "small"/],
  ['js: semicolon', 'let x = 3;\nprint x\n', /Kaury has no ";"/],
  ['js: braces', 'let x = 3\nif x > 2 {\n  print x\n}\n', /indentation, without \{ \}/],
  ['js: ++', 'state n = 0\nn++\nprint n\n', /"\+\+" does not exist[\s\S]*n \+= 1/],
  ['js: # comment', '# a comment\nprint 1\n', /a comment starts with "\/\/"/],
  ['js: /* comment */', '/* a comment */\nprint 1\n', /a comment starts with "\/\/"/],
  ['python: elif', 'let x = 3\nif x > 5\n  print 1\nelif x > 2\n  print 2\n', /in Kaury: else if/],
  ['python: def', 'def double x\n  x * 2\nprint double(2)\n', /in Kaury: function double x then x \* 2/],
  ['python: True', 'let x = True\nprint x\n', /in Kaury: true/],
  ['python: None', 'let x = None\nprint x\n', /in Kaury: none/],
  ['js: async function', 'async function f\n  await 10ms\n', /"async"[\s\S]*await/],
  // ---- React, Vue ----
  ['react: onClick', page('button "Go", onClick -> count += 1'), /button "Go" -> count \+= 1/],
  ['react: className', page('box className "hero"\n  text "x"'), /a named style/],
  ['vue: show', page('text "x", show count > 0'), /in Kaury: hidden \(count == 0\)/],
  ['react: onClick glued to the content', page('button "Go" onClick -> count += 1'), /"onClick" is neither an option[\s\S]*an action is written after “->”/],
  ['react: key', page('for item in items\n  text item, key item'), /"key"[\s\S]*nothing to write/],
  ['html: href on a link', page('link "Contact", href "/contact"'), /link "Contact" "\/contact"/],
  ['html: placeholder after the type', page('input type "email", placeholder "Your email"'), /"placeholder" is neither an option[\s\S]*the hint is the text after the state/],
  ['an element written as an option', page('card "A", text "B"'), /"text" is an element[\s\S]*its own line/],
  ['an unknown word glued to the content', page('title "Hello" sparkly'), /"sparkly" is neither an option of "title" nor a known name/],
  // ---- Kaury, almost ----
  ['a comma is missing before an option', page('title "Hello" size 80'), /a comma is missing before "size"[\s\S]*title "…", size 24/],
  ['a comma is missing before “to”', page('button "Go" to "/shop"'), /a comma is missing before "to"[\s\S]*button "…", to "\/shop"/],
  ['a comma is missing in a container', page('row items center\n  text "x"'), /a comma is missing before "center"[\s\S]*row …, center/],
  ['a unit separated from its number', page('text "Hi", size 20 px'), /the unit is glued to the number[\s\S]*size 20px/],
  ['vue: a condition written as an option', page('text "x", if count > 0'), /on its own line[\s\S]*if count > 0/],
  ['each', page('each item in items\n  text item'), /in Kaury: for item in items/],
  ['repeat', page('repeat 3\n  text "x"'), /in Kaury: for i in 1\.\.3/],
  ['a flag with a value', page('text "x", bold true'), /"bold" is written alone/],
  ['a size word', page('title "x", huge'), /in Kaury: size 48/],
  ['page without quotes', 'page /about\n  title "x"\n', /page "\/about"/],
  ['page with a name', 'page about\n  title "x"\n', /page "\/about"/],
  ['route', 'route "/about"\n  title "x"\n', /in Kaury: page "\/about"/],
  ['colors with =', 'site "A"\n  colors pink = #E93D82\npage "/"\n  title "x"\n', /colors pink #FF4F8B/],
  ['colors with :', 'site "A"\n  colors pink: #E93D82\npage "/"\n  title "x"\n', /colors pink #FF4F8B/],
  ['component with parentheses', 'component Card(name)\n  text name\npage "/"\n  Card "x"\n', /without parentheses[\s\S]*component Card name/],
  ['component called with names', 'component Card name\n  text name\npage "/"\n  Card name: "x"\n', /Kaury writes no ":" here/],
  ['style with a colon', 'style card:\n  padding 24\npage "/"\n  box card\n    text "x"\n', /Kaury writes no ":" here/],
]

for (const [name, src, expected] of cases) {
  test(`habit answered: ${name}`, () => {
    const e = errors(src)
    assert.ok(e.length > 0, `no error for: ${src}`)
    assert.match(e.join('\n'), expected)
  })
}

test('a habit never hides what is correct Kaury', () => {
  // words that look like habits but are declared by the program keep working
  assert.deepEqual(errors([
    'function p x then x * 2',
    'function each list then list.length',
    'let var-x = 3',
    'let display = "shown"',
    'print p(2), each([1, 2]), var-x, display',
    'page "/"',
    '  text display',
    '  text "{p(3)}", color pink, border 1 gray, glow gold 20',
    '  box background transparent, color inherit, border 2 currentColor',
    '    text "x"',
    // a field: “type” and “label” are its options, “size” and “color” are states it fills
    '  field type email, required, label "Email"',
    '  input type "email"',
    '  select size "S", "M", "L"',
    '  select color "Red", "Blue", label "Color"',
    '  text "{size} {color}"',
    '',
  ].join('\n')), [])
})

test('every Kaury form proposed for an option really compiles', () => {
  const wrong: string[] = []
  for (const [word, h] of Object.entries(OPTION_HABITS)) {
    if (!h.k) continue
    const src = `state count = 0\npage "/"\n  ${h.on ? `${h.on}, ` : 'box '}${h.k}\n  text count\n`
    const r = compile(src, { file: 'habit.kaury' })
    if (r.errors.length) wrong.push(`${word} → ${h.k}: ${r.errors[0].what}`)
  }
  assert.deepEqual(wrong, [])
})

test('every Kaury form proposed for an element really compiles', () => {
  const wrong: string[] = []
  for (const [word, h] of Object.entries(ELEMENT_HABITS)) {
    if (!h.k) continue
    const line = h.k.replace(/…/g, 'x')
    // a page and a site are written at the start of the file; everything else goes inside a page
    const src = line.startsWith('page ') ? `${line}\n  title "x"\n` : line.startsWith('site ') ? `${line}\npage "/"\n  title "x"\n` : `page "/"\n  ${line}\n`
    const r = compile(src, { file: 'habit.kaury' })
    if (r.errors.length) wrong.push(`${word} → ${h.k}: ${r.errors[0].what}`)
  }
  assert.deepEqual(wrong, [])
})
