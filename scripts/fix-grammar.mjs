// Replaces backspace characters (a badly escaped "\b") with the real regex word boundary in the VS Code grammar.
import { readFileSync, writeFileSync } from 'node:fs'
const f = new URL('../editors/vscode/syntaxes/kaury.tmLanguage.json', import.meta.url)
const fix = (o) => (typeof o === 'string' ? o.replaceAll('\u0008', '\\b') : Array.isArray(o) ? o.map(fix) : o && typeof o === 'object' ? Object.fromEntries(Object.entries(o).map(([k, v]) => [k, fix(v)])) : o)
const g = fix(JSON.parse(readFileSync(f, 'utf8')))
writeFileSync(f, JSON.stringify(g, null, 2) + '\n')
for (const p of g.patterns) if (p.match) new RegExp(p.match.replace(/\\p\{/g, '\\p{'), 'u')
console.log('grammar ok')
