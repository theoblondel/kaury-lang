import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { compile } from '../src/noyau/index.js'
import { transformSync } from 'esbuild'
test('robustesse : 1500 fichiers abîmés, jamais de plantage interne ni de JavaScript invalide', () => {
const sources = ['exemples/crush/site.kaury', 'exemples/fleurs/site.kaury', 'exemples/accueil.kaury'].map((f) => readFileSync(f, 'utf8'))
let graine = 42
const alea = (n: number) => { graine = (graine * 1103515245 + 12345) % 2147483648; return graine % n }
const crashs = new Map<string, string>()
let ok = 0
for (let i = 0; i < 1500; i++) {
  let s = sources[i % sources.length]
  const nb = 1 + alea(4)
  for (let k = 0; k < nb; k++) {
    const p = alea(s.length)
    const op = alea(4)
    const morceaux = ['"', '(', ')', '[', '{', '}', ',', '->', ' ', '\n', '  ', '=', '.', '-', '#', '{x}', 'si ', 'pour ']
    if (op === 0) s = s.slice(0, p) + s.slice(p + 1 + alea(5))
    else if (op === 1) s = s.slice(0, p) + morceaux[alea(morceaux.length)] + s.slice(p)
    else if (op === 2) { const l = s.split('\n'); l.splice(alea(l.length), 1); s = l.join('\n') }
    else { const l = s.split('\n'); const j = alea(l.length); l.splice(j, 0, l[alea(l.length)]); s = l.join('\n') }
  }
  try {
    const r = compile(s, { fichier: 'f.kaury' })
    if (r.ok) ok++
    if (r.ok) { try { transformSync(r.js, { format: 'esm', loader: 'js' }) } catch (x: any) { const c = 'JS INVALIDE ' + String(x.errors?.[0]?.text); if (!crashs.has(c)) crashs.set(c, s) } }
  } catch (e: any) {
    const cle = String(e?.stack ?? e).split('\n').slice(0, 2).join(' | ')
    if (!crashs.has(cle)) crashs.set(cle, s)
  }
}


  assert.deepEqual([...crashs.keys()], [])
  assert.ok(ok > 200)
})
