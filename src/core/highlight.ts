// Syntax highlighting of code blocks (Kaury, shell, JavaScript), done once at build time:
// the page receives colored HTML, never a highlighting library.

import { canon, RESERVED } from './keywords.js'
import { ELEMENTS, SETTINGS, styleOption, MOTIONS, MOTION_WORDS, ELEMENT_OPTIONS, UNIVERSAL_OPTIONS, LIGHTS, knownColor } from './vocabulary.js'

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const span = (cls: string, s: string) => `<span class="k-${cls}">${esc(s)}</span>`

const CONTROL = new Set([...RESERVED, 'from', 'as', 'catch', 'continue', 'open', 'close', 'toggle', 'go', 'js', 'css', 'site', 'on'])
const MOTION_HEADS = new Set(Object.keys(MOTIONS).flatMap((m) => m.split('-')))
const OPTION_WORDS = new Set([
  ...Object.values(ELEMENT_OPTIONS).flatMap((t) => Object.keys(t)), ...Object.keys(UNIVERSAL_OPTIONS),
  ...MOTION_WORDS, ...LIGHTS, 'columns', 'mouse', 'stars', 'snow', 'bubbles', 'dust', 'confetti',
])

/** Colors one word of Kaury, knowing whether it starts the line (an element) or not. */
function kauryWord(w: string, first: boolean): string {
  const c = canon(w) ?? w
  if (CONTROL.has(c)) return span('k', w)
  if (first && (c in ELEMENTS || SETTINGS.has(c) || MOTION_HEADS.has(c) || c === 'scene' || c === 'object')) return span('e', w)
  if (/^[A-Z]/.test(w)) return span('f', w)
  if (knownColor(w)) return span('v', w)
  if (!first && (styleOption(w) || MOTION_HEADS.has(c) || OPTION_WORDS.has(c))) return span('o', w)
  return esc(w)
}

/** Kaury: comments, texts with {interpolations}, numbers with units, keywords, elements, options. */
export function highlightKaury(code: string): string {
  return code.split('\n').map((line) => {
    let out = ''
    let i = 0
    let first = true
    while (i < line.length) {
      const rest = line.slice(i)
      let m: RegExpMatchArray | null
      if (rest.startsWith('//')) {
        out += span('c', rest)
        break
      }
      if (rest[0] === '"') {
        let j = 1
        while (j < rest.length && rest[j] !== '"') j += rest[j] === '\\' ? 2 : 1
        const text = rest.slice(0, j + 1)
        out += `<span class="k-s">${esc(text).replace(/\{([^}]*)\}/g, '<span class="k-i">{$1}</span>')}</span>`
        i += text.length
        first = false
        continue
      }
      if ((m = rest.match(/^#[0-9a-fA-F]{3,8}\b/))) {
        out += span('v', m[0])
      } else if ((m = rest.match(/^-?\d+(\.\d+)?(px|ms|s|%|vh|vw|deg|\/s)?/)) && !/[\w-]/.test(line[i - 1] ?? '')) {
        out += span('n', m[0])
      } else if ((m = rest.match(/^->|^\.\.|^[+\-*/%]?=|^==|^!=|^<=|^>=/))) {
        out += span('p', m[0])
      } else if ((m = rest.match(/^[A-Za-zÀ-ÿ_][\w\-À-ÿ]*/))) {
        // “a-b” stays one name, like the language reads it
        out += kauryWord(m[0], first)
        first = false
      } else {
        m = [rest[0]]
        out += esc(rest[0])
        if (rest[0] !== ' ') first = false
      }
      i += m[0].length
    }
    return out
  }).join('\n')
}

/** Shell: comments, the command, its flags and texts. */
export function highlightShell(code: string): string {
  return code.split('\n').map((line) => {
    if (/^\s*#/.test(line)) return span('c', line)
    const hash = line.search(/\s#/)
    const comment = hash >= 0 ? span('c', line.slice(hash)) : ''
    if (hash >= 0) line = line.slice(0, hash)
    let first = true
    return line.split(/(\s+)/).map((w) => {
      if (!w.trim()) return w
      if (first) {
        first = false
        return span('e', w)
      }
      if (w.startsWith('-')) return span('o', w)
      if (/^["']/.test(w)) return span('s', w)
      if (w.startsWith('#')) return span('c', w)
      return esc(w)
    }).join('') + comment
  }).join('\n')
}

const JS_KEYWORDS = new Set('const let var function return if else for while import from export default async await new class extends try catch throw of in typeof true false null undefined'.split(' '))

/** JavaScript / TypeScript / JSON: comments, texts, numbers, keywords. */
export function highlightJs(code: string): string {
  return code.replace(/(\/\/[^\n]*)|("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_$][\w$]*)|([^A-Za-z_$\d"'`/]+|\/)/g,
    (_, c, s, n, w, other) => {
      if (c) return span('c', c)
      if (s) return span('s', s)
      if (n) return span('n', n)
      if (w) return JS_KEYWORDS.has(w) ? span('k', w) : esc(w)
      return esc(other)
    })
}

/** Colored HTML of a code block, from its language name (unknown language → escaped text). */
export function highlight(code: string, lang = ''): string {
  const l = lang.toLowerCase()
  if (l === 'kaury' || l === 'ky') return highlightKaury(code)
  if (['bash', 'sh', 'shell', 'console', 'zsh', 'powershell', 'ps1'].includes(l)) return highlightShell(code)
  if (['js', 'javascript', 'ts', 'typescript', 'json', 'mjs'].includes(l)) return highlightJs(code)
  return esc(code)
}
