import { test } from 'node:test'
import assert from 'node:assert/strict'
import { run, errors } from './helpers.js'
import { tokenize } from '../src/core/lexer.js'
import { compile, setLanguage } from '../src/core/index.js'

const k = (s: TemplateStringsArray, ...v: unknown[]) => String.raw({ raw: s }, ...v).replace(/^\n/, '')

test('lexer: indentation, texts, numbers with units, hyphenated names', () => {
  const t = tokenize('if total-price > 2s\n  print "Total: {x}"\n')
  assert.deepEqual(t.map((x) => x.t), ['word', 'word', 'op', 'number', 'newline', 'indent', 'word', 'text', 'newline', 'dedent', 'eof'])
  assert.equal(t[1].v, 'total-price')
  assert.equal(t[3].unit, 's')
  assert.equal(t[7].parts?.[1].code, 'x')
})

test('spec example: total-price and delivery', async () => {
  const { output } = await run(k`
let cart = [{ price: 20, quantity: 2 }, { price: 15, quantity: 1 }]
function total-price cart
  sum cart, a -> a.price * a.quantity

if total-price(cart) > 50
  delivery = 0
else
  delivery = 7
print total-price(cart), delivery
`)
  assert.deepEqual(output, ['55 0'])
})

test('one-line functions, implicit return, recursion', async () => {
  const { output } = await run(k`
function double x then x * 2
function factorial n
  if n <= 1
    return 1
  n * factorial(n - 1)
print double(21)
print factorial(5)
`)
  assert.deepEqual(output, ['42', '120'])
})

test('loops, ranges, while, break', async () => {
  const { output } = await run(k`
state total = 0
for i in 1..4
  total += i
print total
count = 0
while count < 10
  count += 3
  if count > 5 then break
print count
for fruit, i in ["a", "b"]
  print "{i}:{fruit}"
`)
  assert.deepEqual(output, ['10', '6', '0:a', '1:b'])
})

test('lists: built-in methods', async () => {
  const { output } = await run(k`
let numbers = [5, 3, 8, 1]
print numbers.sort().join("-")
print numbers.filter(x -> x > 2).length
print numbers.map(x -> x * 10)
state l = []
l.add 4
l.add 7
l.remove 4
print l, l.first, l.last
print 3 in numbers, 9 in numbers
print "hello".upper()
`)
  assert.deepEqual(output, ['1-3-5-8', '3', '[50,30,80,10]', '[7] 7 7', 'true false', 'HELLO'])
})

test('objects, interpolated texts, if-expressions', async () => {
  const { output } = await run(k`
let product = { name: "Strawberry", price: 3.5, "price-tax": 3.78 }
let age = 20
print "{product.name} costs {product.price}"
print if age >= 18 then "adult" else "child"
print product.price-tax
`)
  assert.deepEqual(output, ['Strawberry costs 3.5', 'adult', '3.78'])
})

test('try / catch', async () => {
  const { output } = await run(k`
try
  let x = none
  print x.name.length
catch e
  print "caught"
`)
  assert.deepEqual(output, ['caught'])
})

test('French aliases: soit, si, pour, fonction, affiche', async () => {
  const { output } = await run(k`
soit noms = ["Ada", "Linus"]
fonction salue nom puis "Salut {nom}"
pour n dans noms
  si n.longueur > 3
    affiche salue(n)
  sinon
    affiche "court"
`)
  assert.deepEqual(output, ['court', 'Salut Linus'])
})

test('reactivity: a derived value follows the states', async () => {
  const { output } = await run(k`
state price = 10
state quantity = 2
let total = price * quantity
print total
quantity = 5
print total
`)
  assert.deepEqual(output, ['20', '50'])
})

test('await: delays and async functions', async () => {
  const { output } = await run(k`
function slow x
  await 10ms
  x + 1
print await slow(1)
`)
  assert.deepEqual(output, ['2'])
})

test('raw js block', async () => {
  const { output } = await run(k`
let a = 2
js
  const b = a * 21; console.log(String(b))
`)
  assert.deepEqual(output, ['42'])
})

test('deep reactivity: an effect follows changes inside a list', async () => {
  const { state, effect } = await import('../src/runtime/reactive.js')
  const l = state<any[]>([])
  const seen: string[] = []
  effect(() => {
    seen.push(JSON.stringify(l.v))
  })
  l.v.push({ name: 'a' })
  l.v[0].name = 'b'
  assert.deepEqual(seen, ['[]', '[{"name":"a"}]', '[{"name":"b"}]'])
})

test('settings never mistake their words for colors (light night)', () => {
  assert.deepEqual(errors('page "/"\n  scene\n    light night\n    object "a.glb"\n'), [])
})

test('messages exist in French too', () => {
  setLanguage('fr')
  const r = compile('state compteur = 0\nprint compteurr\n')
  const text = r.errors[0].format()
  setLanguage('en')
  assert.match(text, /n'existe pas/)
  assert.match(text, /Essaie/)
})

// ---------------- errors: every common mistake has a clear message ----------------
const cases: [string, string, RegExp][] = [
  ['tab', 'if true\n\tprint 1\n', /tab/],
  ['single quotes', "print 'hi'\n", /double quotes/],
  ['misspelled name', 'state count = 0\nprint countt\n', /did you mean "count"/],
  ['= instead of ==', 'let x = 3\nif x = 3\n  print x\n', /==/],
  ['let changed', 'let x = 3\nx = 4\n', /state x/],
  ['unclosed text', 'print "hi\n', /never closed/],
  ['misspelled option', 'page "/"\n  title "x", siez 3\n', /size/],
  ['unknown light', 'page "/"\n  scene\n    light disco\n', /unknown light/],
  ['unknown component', 'page "/"\n  Cardd "x"\n', /does not exist/],
  ['page without /', 'page "shop"\n  title "x"\n', /starts with “\/”/],
  ['spin fast', 'page "/"\n  object "a.glb"\n    spin quick\n', /expects a speed/],
  ['else alone', 'else\n  print 1\n', /without an “if”/],
  ['state without =', 'state count\n', /“=” is missing/],
  ['unclosed parenthesis', 'print (1 + 2\n', /never closed/],
  ['orphan indentation', 'print 1\n    print 2\n', /indent/],
  ['element mid-line', 'let x = title\n', /must start a line/],
  ['on without action', 'page "/"\n  button "x"\n    on click\n', /->/],
  ['unknown object format', 'page "/"\n  object "a.docx"\n', /unknown file format/],
  ['lowercase component', 'component card x\n  text x\n', /capital letter/],
  ['misspelled element with block', 'page "/"\n  secion\n    text "x"\n', /"section"/],
  ['misspelled element', 'page "/"\n  tittle "Hi"\n', /the element "title"/],
]
for (const [name, src, expected] of cases) {
  test(`clear error: ${name}`, () => {
    const e = errors(src)
    assert.ok(e.length > 0, `no error for: ${src}`)
    assert.match(e.join('\n'), expected)
  })
}

test('an inline action can be followed by a block of children', () => {
  assert.deepEqual(errors('function go-on\n  print 1\npage "/"\n  form -> go-on()\n    field email "Email"\n    button "Send"\n'), [])
})

test('pitfall fixed: a-b is read as a subtraction (with a style warning)', async () => {
  const src = 'let a = 3\nlet b = 1\nprint a-b\n'
  const { output } = await run(src)
  assert.deepEqual(output, ['2'])
  assert.match(compile(src).warnings[0].format(), /a - b/)
})

test('pitfall fixed: a variable named like an option is shown as content', () => {
  const r = compile('let size = 3\nlet bold = "x"\npage "/"\n  text size\n  text bold, bold\n')
  assert.deepEqual(r.errors, [])
  assert.match(r.js, /\$k\.text\(\$n\d+, \(\) => size\)/)
  assert.match(r.js, /\$k\.text\(\$n\d+, \(\) => bold\)/)
})
