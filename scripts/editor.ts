// Keeps the VS Code extension in step with the language (run by « npm run build »):
// - its copy of the compiler (live errors, completion) is the one just built;
// - the word lists of its coloring come from the vocabulary of the compiler, never written by hand.

import { readFileSync, writeFileSync, copyFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ELEMENTS, SETTINGS, MOTIONS, MOTION_WORDS } from '../src/core/vocabulary.js'
import { allKeywords, aliasesOf } from '../src/core/keywords.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const ext = join(root, 'editors', 'vscode')
copyFileSync(join(root, 'dist', 'core.js'), join(ext, 'core.js'))

const withAliases = (words: string[]) => [...new Set(words.flatMap((w) => [w, ...aliasesOf(w)]))]
// longest first: the regex alternation must try « sous-titre » before « sous »
const alternation = (words: string[]) => [...new Set(words)].filter(Boolean).sort((a, b) => b.length - a.length || a.localeCompare(b)).map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')

const elements = withAliases([...Object.keys(ELEMENTS), ...SETTINGS, 'style', 'animation'])
const CONTROL = ['let', 'state', 'function', 'then', 'if', 'else', 'for', 'in', 'while', 'await', 'try', 'catch', 'import', 'from', 'as', 'export', 'return', 'break', 'continue', 'open', 'close', 'toggle', 'go', 'js', 'css']
const control = withAliases(CONTROL.filter((w) => allKeywords().includes(w)))
const motions = withAliases([...Object.keys(MOTIONS).flatMap((m) => m.split('-')), ...MOTION_WORDS, 'object', 'character', 'scene', 'light', 'camera', 'sound', 'hover', 'click', 'load', 'scroll', 'mouse'])

const file = join(ext, 'syntaxes', 'kaury.tmLanguage.json')
const g = JSON.parse(readFileSync(file, 'utf8'))
for (const p of g.patterns) {
  if (p.name === 'keyword.control.kaury') p.match = `(?<![\\w-])(${alternation(control)})(?![\\w-])`
  if (p.name === 'entity.name.tag.kaury') p.match = `^\\s*(${alternation(elements)})(?![\\w-])`
  if (p.name === 'support.function.immersion.kaury') p.match = `(?<![\\w-])(${alternation(motions)})(?![\\w-])`
}
writeFileSync(file, JSON.stringify(g, null, 2) + '\n')
console.log(`editor: compiler copied, ${elements.length} element words, ${control.length} keywords, ${motions.length} motion words`)
