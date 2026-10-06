// Every Kaury example of the documentation must compile: the docs and the AI spec can never lie.
// A block that is a fragment (it starts indented, or uses names defined elsewhere) is wrapped or skipped
// only when it says so with a first line "// fragment".
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { compile, setLanguage } from '../src/core/index.js'

setLanguage('en')

function blocks(file: string): { code: string; line: number }[] {
  const text = readFileSync(file, 'utf8')
  const out: { code: string; line: number }[] = []
  const re = /```kaury\n([\s\S]*?)```/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) out.push({ code: m[1], line: text.slice(0, m.index).split('\n').length })
  return out
}

/** A fragment is made whole: indented lines go into a page, unknown names are declared. */
function whole(code: string): string {
  const lines = code.replace(/\s+$/, '').split('\n')
  const indented = lines.filter((l) => l.trim()).every((l) => /^\s/.test(l))
  return indented ? 'page "/"\n  section\n' + lines.map((l) => '  ' + l).join('\n') : code
}

const files = [resolve('README.md'), resolve('docs/kaury-ai.md'), ...['docs', 'blog'].flatMap((d) => readdirSync(resolve('site/content', d)).map((f) => resolve('site/content', d, f)))]

for (const file of files) {
  test(`examples of ${file.split(/[\\/]/).slice(-2).join('/')} compile`, () => {
    const failures: string[] = []
    for (const b of blocks(file)) {
      if (b.code.startsWith('// fragment')) continue
      const r = compile(whole(b.code), { checkOnly: true })
      // names used before their definition elsewhere in the docs are not errors of the example
      const real = r.errors.filter((e) => !/does not exist/.test(e.message))
      if (real.length) failures.push(`line ${b.line}:\n${b.code}\n→ ${real.map((e) => e.message).join('\n→ ')}`)
    }
    assert.equal(failures.length, 0, failures.join('\n\n'))
  })
}

test('every example of the vocabulary compiles', async () => {
  const { vocabulary } = await import('../src/core/index.js')
  const failures: string[] = []
  const tryLine = (label: string, line: string) => {
    const r = compile(`page "/"\n  scene\n    light soft\n  section\n    ${line}`, { checkOnly: true })
    const real = r.errors.filter((e) => !/does not exist/.test(e.message))
    if (real.length) failures.push(`${label}: ${line}\n→ ${real.map((e) => e.message).join('\n→ ')}`)
  }
  const isElementLine = (ex: string) => ex.split(' ')[0] in vocabulary.ELEMENTS || ['mobile', 'tablet', 'desktop', 'hover', 'style'].includes(ex.split(' ')[0])
  // style and universal options: on a box (or as written when the example is a whole line)
  for (const t of [vocabulary.STYLES, vocabulary.UNIVERSAL_OPTIONS]) {
    for (const [name, spec] of Object.entries(t)) {
      for (const ex of spec.example.split(/\s+\/\s+/)) tryLine(name, isElementLine(ex) ? ex : `box ${ex}`)
    }
  }
  // options of one element: on that element (seo is a setting, tested by the docs)
  for (const [head, table] of Object.entries(vocabulary.ELEMENT_OPTIONS)) {
    const el = vocabulary.ELEMENTS[head]
    if (!el) continue
    for (const [name, spec] of Object.entries(table)) {
      for (const ex of spec.example.split(/\s+\/\s+/)) tryLine(`${head}.${name}`, isElementLine(ex) ? ex : `${el.example}${el.example.trim() === head ? " " : ", "}${ex}`)
    }
  }
  for (const [name, el] of Object.entries(vocabulary.ELEMENTS)) {
    const r = compile(`page "/"\n  section\n    ${el.example}`, { checkOnly: true })
    const real = r.errors.filter((e) => !/does not exist/.test(e.message))
    if (real.length) failures.push(`${name}: ${el.example}\n→ ${real.map((e) => e.message).join('\n→ ')}`)
  }
  assert.equal(failures.length, 0, failures.join('\n\n'))
})
