// Step 1 — the lexer: cuts the text into tokens.
// Handles indentation (blocks), "text with {interpolation}", numbers with units
// and hyphenated names (total-price).

import { KauryError, msg, q } from './errors.js'

export type TokenType = 'raw' | 'word' | 'number' | 'text' | 'color' | 'op' | 'newline' | 'indent' | 'dedent' | 'eof'

export interface TextPart {
  text?: string
  code?: string
  line?: number
  column?: number
}

export interface Token {
  t: TokenType
  v: string
  line: number
  column: number
  end: number // end column (exclusive)
  spaceBefore: boolean
  unit?: string
  parts?: TextPart[]
}

const UNITS = ['px', 'rem', 'em', '%', 'vh', 'vw', 'svh', 'dvh', 'ms', 's', 'deg', 'fr', 'x']
const OPS = ['**=', '...', '->', '==', '!=', '<=', '>=', '+=', '-=', '*=', '/=', '..', '**', '?.', '??',
  '+', '-', '*', '/', '%', '<', '>', '=', ',', '.', ':', '(', ')', '[', ']', '{', '}', '?', '!', '|', '@']
const CLOSER: Record<string, string> = { '(': ')', '[': ']', '{': '}' }

const isLetter = (c: string) => /[\p{L}_$]/u.test(c)
const isDigit = (c: string) => c >= '0' && c <= '9'
const isWordChar = (c: string) => /[\p{L}\p{N}_$]/u.test(c)

export function tokenize(source: string): Token[] {
  const tokens: Token[] = []
  const lines = source.replace(/\r\n?/g, '\n').split('\n')
  const stack = [0]
  let depth = 0 // open parentheses / brackets / braces
  const openers: Token[] = []
  const push = (t: Token) => tokens.push(t)

  for (let li = 0; li < lines.length; li++) {
    const line = lines[li]
    const lineNo = li + 1
    let i = 0

    if (depth === 0) {
      let indent = 0
      while (i < line.length && (line[i] === ' ' || line[i] === '\t')) {
        if (line[i] === '\t') {
          throw new KauryError({ line: lineNo, column: i + 1 }, msg('a tab is used for indentation.', 'une tabulation sert d\'indentation.'),
            msg('indent with 2 spaces. Kaury does not accept tabs.', 'indente avec 2 espaces. Kaury n\'accepte pas les tabulations.'))
        }
        indent++
        i++
      }
      const rest = line.slice(i)
      if (rest === '' || rest.startsWith('//')) continue // empty line or comment
      const top = stack[stack.length - 1]
      if (indent > top) {
        stack.push(indent)
        push({ t: 'indent', v: '', line: lineNo, column: 1, end: indent + 1, spaceBefore: false })
      } else if (indent < top) {
        while (stack.length && indent < stack[stack.length - 1]) {
          stack.pop()
          push({ t: 'dedent', v: '', line: lineNo, column: 1, end: 1, spaceBefore: false })
        }
        if (stack[stack.length - 1] !== indent) {
          throw new KauryError({ line: lineNo, column: 1, length: indent || 1 },
            msg('this line is not aligned with any block above.', 'cette ligne n\'est alignée sur aucun bloc au-dessus.'),
            msg('align it exactly under the line it belongs to (2 spaces per level).', 'aligne-la exactement sous la ligne dont elle fait partie (2 espaces par niveau).'))
        }
      }
      // Raw JavaScript block: « js » alone on its line, then indented code copied as is.
      if (/^(js|javascript)\s*(\/\/.*)?$/.test(rest)) {
        push({ t: 'word', v: 'js', line: lineNo, column: indent + 1, end: indent + 3, spaceBefore: true })
        const raw: string[] = []
        let k = li + 1
        let margin = -1
        while (k < lines.length) {
          const l = lines[k]
          const ind = l.length - l.trimStart().length
          if (l.trim() !== '' && ind <= indent) break
          if (l.trim() !== '' && (margin < 0 || ind < margin)) margin = ind
          raw.push(l)
          k++
        }
        while (raw.length && raw[raw.length - 1].trim() === '') raw.pop()
        const code = raw.map((l) => l.slice(Math.max(0, margin))).join('\n')
        push({ t: 'raw', v: code, line: lineNo + 1, column: 1, end: 1, spaceBefore: true })
        push({ t: 'newline', v: '', line: lineNo, column: 1, end: 1, spaceBefore: false })
        li += raw.length
        continue
      }
    } else {
      while (i < line.length && (line[i] === ' ' || line[i] === '\t')) i++
      if (i >= line.length || line.startsWith('//', i)) continue
    }

    let space = true
    let hadToken = false
    while (i < line.length) {
      const c = line[i]
      if (c === ' ' || c === '\t') {
        space = true
        i++
        continue
      }
      if (c === '/' && line[i + 1] === '/') break // comment
      const col = i + 1

      if (c === '"') {
        const { token, next } = readText(line, i, lineNo)
        token.spaceBefore = space
        push(token)
        i = next
        space = false
        hadToken = true
        continue
      }

      if (c === '#') {
        const m = /^#([0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![\p{L}\p{N}_])/u.exec(line.slice(i))
        if (!m) {
          throw new KauryError({ line: lineNo, column: col }, msg('badly written color.', 'couleur mal écrite.'),
            msg('a color has 3 or 6 hexadecimal digits: #FF4F8B or #F48.', 'une couleur s\'écrit avec 3 ou 6 chiffres hexadécimaux : #FF4F8B ou #F48.'))
        }
        push({ t: 'color', v: m[0], line: lineNo, column: col, end: col + m[0].length, spaceBefore: space })
        i += m[0].length
        space = false
        hadToken = true
        continue
      }

      // Number (with a glued minus: « margin -10 »)
      const gluedMinus = c === '-' && space && isDigit(line[i + 1] ?? '') && previousAllowsUnary(tokens, hadToken)
      if (isDigit(c) || gluedMinus) {
        let j = i + (gluedMinus ? 1 : 0)
        while (j < line.length && (isDigit(line[j]) || line[j] === '_')) j++
        if (line[j] === '.' && isDigit(line[j + 1] ?? '')) {
          j++
          while (j < line.length && isDigit(line[j])) j++
        }
        const v = line.slice(i, j).replace(/_/g, '')
        let unit: string | undefined
        if (line.startsWith('/s', j) && !isWordChar(line[j + 2] ?? ' ')) {
          unit = '/s'
          j += 2
        } else {
          for (const u of UNITS) {
            if (line.startsWith(u, j) && !isWordChar(line[j + u.length] ?? ' ')) {
              unit = u
              j += u.length
              break
            }
          }
        }
        push({ t: 'number', v, unit, line: lineNo, column: col, end: j + 1, spaceBefore: space })
        i = j
        space = false
        hadToken = true
        continue
      }

      // Word (hyphenated names: total-price)
      if (isLetter(c)) {
        let j = i + 1
        while (j < line.length) {
          if (isWordChar(line[j])) j++
          else if (line[j] === '-' && isLetter(line[j + 1] ?? '') && isWordChar(line[j - 1])) j++
          else break
        }
        push({ t: 'word', v: line.slice(i, j), line: lineNo, column: col, end: j + 1, spaceBefore: space })
        i = j
        space = false
        hadToken = true
        continue
      }

      const op = OPS.find((o) => line.startsWith(o, i))
      if (op) {
        const tok: Token = { t: 'op', v: op, line: lineNo, column: col, end: col + op.length, spaceBefore: space }
        if (op === '(' || op === '[' || op === '{') {
          depth++
          openers.push(tok)
        } else if (op === ')' || op === ']' || op === '}') {
          const o = openers.pop()
          const expected = o ? CLOSER[o.v] : undefined
          if (!o || expected !== op) {
            throw new KauryError({ line: lineNo, column: col },
              o ? msg(`${q(op)} closes ${q(o.v)} opened on line ${o.line}, but ${q(expected!)} is needed.`, `${q(op)} ferme ${q(o.v)} ouvert ligne ${o.line}, mais il faut ${q(expected!)}.`)
                : msg(`${q(op)} closes something that was never opened.`, `${q(op)} ferme quelque chose qui n'a jamais été ouvert.`),
              o ? msg(`replace ${q(op)} with ${q(expected!)}.`, `remplace ${q(op)} par ${q(expected!)}.`) : msg(`remove this ${q(op)}.`, `supprime ce ${q(op)}.`))
          }
          depth--
        }
        push(tok)
        i += op.length
        space = false
        hadToken = true
        continue
      }

      if (c === "'") {
        throw new KauryError({ line: lineNo, column: col }, msg('texts are written between double quotes.', 'les textes s\'écrivent entre guillemets doubles.'),
          msg('replace \'…\' with "…". Apostrophes still work inside a text: "It\'s".', 'remplace \'…\' par "…". L\'apostrophe reste utilisable dans un texte : "J\'aime".'))
      }
      throw new KauryError({ line: lineNo, column: col }, msg(`unexpected character ${q(c)}.`, `caractère inattendu ${q(c)}.`),
        msg('remove it or put it inside a text "…".', 'supprime-le ou mets-le dans un texte "…".'))
    }

    if (depth === 0 && hadToken) {
      push({ t: 'newline', v: '', line: lineNo, column: line.length + 1, end: line.length + 2, spaceBefore: false })
    }
  }

  if (openers.length) {
    const o = openers[openers.length - 1]
    throw new KauryError({ line: o.line, column: o.column }, msg(`${q(o.v)} is never closed.`, `${q(o.v)} n'est jamais refermé.`),
      msg(`add ${q(CLOSER[o.v])} at the end.`, `ajoute ${q(CLOSER[o.v])} à la fin.`))
  }
  const last = lines.length
  if (tokens.length && tokens[tokens.length - 1].t !== 'newline' && tokens[tokens.length - 1].t !== 'dedent') {
    push({ t: 'newline', v: '', line: last, column: 1, end: 1, spaceBefore: false })
  }
  while (stack.length > 1) {
    stack.pop()
    push({ t: 'dedent', v: '', line: last, column: 1, end: 1, spaceBefore: false })
  }
  push({ t: 'eof', v: '', line: last + 1, column: 1, end: 1, spaceBefore: false })
  return tokens
}

function previousAllowsUnary(tokens: Token[], hadToken: boolean): boolean {
  if (!hadToken) return true
  const d = tokens[tokens.length - 1]
  if (!d) return true
  // « a -1 » in an option list: -1 is a number. « a - 1 » stays a subtraction.
  return d.t === 'word' || d.t === 'op' || d.t === 'number' || d.t === 'text'
}

/** Reads a "…" text with its {expr} interpolations. */
function readText(line: string, start: number, lineNo: number): { token: Token; next: number } {
  const parts: TextPart[] = []
  let i = start + 1
  let cur = ''
  while (true) {
    if (i >= line.length) {
      throw new KauryError({ line: lineNo, column: start + 1 }, msg('this text is never closed.', 'ce texte n\'est jamais refermé.'),
        msg('add a " at the end of the text.', 'ajoute un guillemet " à la fin du texte.'))
    }
    const c = line[i]
    if (c === '\\') {
      const n = line[i + 1]
      const map: Record<string, string> = { n: '\n', t: '\t', '"': '"', '\\': '\\', '{': '{', '}': '}' }
      if (n === undefined || !(n in map)) {
        throw new KauryError({ line: lineNo, column: i + 1, length: 2 }, msg(`unknown sequence ${q('\\' + (n ?? ''))} in a text.`, `séquence ${q('\\' + (n ?? ''))} inconnue dans un texte.`),
          msg('use \\n (new line), \\" (quote), \\{ or \\} (braces), \\\\ (backslash).', 'utilise \\n (retour à la ligne), \\" (guillemet), \\{ ou \\} (accolades), \\\\ (barre).'))
      }
      cur += map[n]
      i += 2
      continue
    }
    if (c === '"') {
      i++
      break
    }
    if (c === '{') {
      if (cur) parts.push({ text: cur })
      cur = ''
      let p = 1
      let j = i + 1
      let inText = false
      while (j < line.length && p > 0) {
        const d = line[j]
        if (inText) {
          if (d === '\\') j++
          else if (d === '"') inText = false
        } else if (d === '"') inText = true
        else if (d === '{') p++
        else if (d === '}') p--
        if (p > 0) j++
      }
      if (p > 0) {
        throw new KauryError({ line: lineNo, column: i + 1 }, msg('interpolation « { » never closed in this text.', 'insertion « { » jamais refermée dans ce texte.'),
          msg('close it with « } », or write \\{ for a real brace.', 'ferme-la avec « } », ou écris \\{ pour une vraie accolade.'))
      }
      const code = line.slice(i + 1, j)
      if (!code.trim()) {
        throw new KauryError({ line: lineNo, column: i + 1, length: 2 }, msg('empty interpolation « {} » in a text.', 'insertion vide « {} » dans un texte.'),
          msg('put a name between the braces: "Hello {name}".', 'mets un nom entre les accolades : "Bonjour {nom}".'))
      }
      parts.push({ code, line: lineNo, column: i + 2 })
      i = j + 1
      continue
    }
    cur += c
    i++
  }
  if (cur || !parts.length) parts.push({ text: cur })
  const v = parts.map((m) => m.text ?? `{${m.code}}`).join('')
  return { token: { t: 'text', v, parts, line: lineNo, column: start + 1, end: i + 1, spaceBefore: true }, next: i }
}
