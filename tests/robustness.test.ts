import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { transformSync } from 'esbuild'
import { compile } from '../src/core/index.js'

test('a property of a number never becomes invalid JavaScript, and nothing is stored inside a value', () => {
  // “size 0.5” cut in two by a damaged line gave “0.float” in the generated code: accepted, then refused by the browser
  const read = compile('let n = 3\nprint 2.size\nprint n.size\npage "/"\n  box size 0. float\n    text "x"\n', { file: 'f.kaury' })
  if (read.ok) transformSync(read.js, { format: 'esm', loader: 'js' })
  for (const src of ['3.x = 1\n', '"a".x = 1\n', 'none.x = 1\n', '3[0] = 1\n']) {
    const r = compile(src, { file: 'f.kaury' })
    assert.equal(r.ok, false, src)
    assert.match(r.errors[0].what, /nothing can be stored inside/)
  }
})

test('a setting of the site written without its value is an error, not a crash of the compiler', () => {
  for (const [setting, example] of [['lang', 'lang "en"'], ['url', 'url "https://'], ['favicon', 'favicon "'], ['font', 'font "']]) {
    const r = compile(`site "A"\n  ${setting}\npage "/"\n  title "x"\n`, { file: 'f.kaury' })
    assert.equal(r.ok, false, setting)
    assert.match(r.errors[0].what, new RegExp(`"${setting}" needs its value`))
    assert.ok(r.errors[0].fix?.includes(example), `${setting}: ${r.errors[0].fix}`)
  }
})

test('robustness: 3000 damaged files (Unix and Windows line endings), never an internal crash nor invalid JavaScript', () => {
  const unix = ['examples/crush/site.kaury', 'examples/hello/site.kaury'].map((f) => readFileSync(f, 'utf8').replace(/\r\n/g, '\n'))
  // the same files as a Windows editor saves them: the damage then falls on other characters
  const sources = [...unix, ...unix.map((s) => s.replace(/\n/g, '\r\n'))]
  let seed = 42
  const rnd = (n: number) => {
    seed = (seed * 1103515245 + 12345) % 2147483648
    return seed % n
  }
  const crashes = new Map<string, string>()
  let ok = 0
  const bits = ['"', '(', ')', '[', '{', '}', ',', '->', ' ', '\n', '  ', '=', '.', '-', '#', '{x}', 'if ', 'for ']
  for (let i = 0; i < 3000; i++) {
    let s = sources[i % sources.length]
    for (let k = 0, n = 1 + rnd(4); k < n; k++) {
      const p = rnd(s.length)
      const op = rnd(4)
      if (op === 0) s = s.slice(0, p) + s.slice(p + 1 + rnd(5))
      else if (op === 1) s = s.slice(0, p) + bits[rnd(bits.length)] + s.slice(p)
      else if (op === 2) {
        const l = s.split('\n')
        l.splice(rnd(l.length), 1)
        s = l.join('\n')
      } else {
        const l = s.split('\n')
        l.splice(rnd(l.length), 0, l[rnd(l.length)])
        s = l.join('\n')
      }
    }
    try {
      const r = compile(s, { file: 'f.kaury' })
      if (r.ok) {
        ok++
        try {
          transformSync(r.js, { format: 'esm', loader: 'js' })
        } catch (x: any) {
          crashes.set('INVALID JS ' + String(x.errors?.[0]?.text), s)
        }
      }
    } catch (e: any) {
      crashes.set(String(e?.stack ?? e).split('\n').slice(0, 2).join(' | '), s)
    }
  }
  assert.deepEqual([...crashes.keys()], [])
  assert.ok(ok > 400, `only ${ok} programs compiled`)
})

test('a function written on a line of its own, never kept nor called, is an error with what was probably meant', () => {
  // found by damaging the designed examples: “on hover -> …” with letters missing became a function nobody calls,
  // and the page compiled to JavaScript that no browser could read
  const r = compile('state note = "iris"\n\npage "/"\n  seo "Home", "A page."\n  button "Iris"\n    onver -> note = "cedar"\n', { file: 'f.kaury' })
  assert.equal(r.ok, false)
  assert.match(r.errors[0].what, /this function is written here and never used/)
  assert.equal(r.errors[0].line, 6)
  assert.match(r.errors[0].fix ?? '', /on click -> /)
  const alone = compile('state count = 0\n\nx -> count += 1\n', { file: 'f.kaury' })
  assert.equal(alone.ok, false)
  assert.match(alone.errors[0].fix ?? '', /let /, 'outside a page: keep it under a name')
})
