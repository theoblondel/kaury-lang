import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { renderCheck } from '../src/cli/project.js'
import { compile, setLanguage } from '../src/core/index.js'

setLanguage('en')

// The designed examples are what an assistant is shown as “a page worth showing”:
// they must stay without an error and without a warning as the language moves.
for (const name of ['lina', 'forge', 'nuit', 'terre', 'relay']) {
  test(`the example “${name}” passes the check with no error and no warning`, async () => {
    const entry = resolve(`examples/${name}/site.kaury`)
    const source = readFileSync(entry, 'utf8')
    const r = compile(source, { file: entry })
    assert.deepEqual(r.errors.map((e) => e.format()), [])
    assert.deepEqual(r.warnings.map((e) => e.format()), [])
    const { pages, failed, warnings } = await renderCheck(entry)
    assert.ok(pages >= 1)
    assert.deepEqual(failed.map((f) => f.e.format()), [])
    assert.deepEqual(warnings.map((w) => w.e.format()), [])
  })

  test(`the example “${name}” uses every picture of its public folder`, () => {
    const source = readFileSync(resolve(`examples/${name}/site.kaury`), 'utf8')
    const unused = (existsSync(resolve(`examples/${name}/public`)) ? readdirSync(resolve(`examples/${name}/public`)) : []).filter((file) => !source.includes(`"${file}"`))
    assert.deepEqual(unused, [])
  })
}
