import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { transformSync } from 'esbuild'
import { compile } from '../src/core/index.js'

test('robustness: 1500 damaged files, never an internal crash nor invalid JavaScript', () => {
  const sources = ['examples/crush/site.kaury', 'examples/hello/site.kaury'].map((f) => readFileSync(f, 'utf8'))
  let seed = 42
  const rnd = (n: number) => {
    seed = (seed * 1103515245 + 12345) % 2147483648
    return seed % n
  }
  const crashes = new Map<string, string>()
  let ok = 0
  const bits = ['"', '(', ')', '[', '{', '}', ',', '->', ' ', '\n', '  ', '=', '.', '-', '#', '{x}', 'if ', 'for ']
  for (let i = 0; i < 1500; i++) {
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
  assert.ok(ok > 200, `only ${ok} programs compiled`)
})
