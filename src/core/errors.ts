// Kaury errors: every message says WHERE, WHAT and HOW TO FIX IT.
// Written for humans AND for AIs that need to fix their own code.
// Messages are bilingual: English by default, French when the system language is French.

export type Language = 'en' | 'fr'

function detectLanguage(): Language {
  const g = globalThis as any
  const env = g.process?.env?.KAURY_LANG
  if (env === 'fr' || env === 'en') return env
  try {
    const loc = g.navigator?.language ?? Intl.DateTimeFormat().resolvedOptions().locale ?? ''
    if (String(loc).toLowerCase().startsWith('fr')) return 'fr'
  } catch {
    /* default */
  }
  return 'en'
}

let language: Language = detectLanguage()

export function setLanguage(l: Language) {
  language = l
}
export function getLanguage(): Language {
  return language
}

/** Picks the message in the current language. */
export const msg = (en: string, fr: string) => (language === 'fr' ? fr : en)

export interface Position {
  line: number // 1-based
  column: number // 1-based
  length?: number
}

export class KauryError extends Error {
  line: number
  column: number
  length: number
  what: string
  fix?: string
  file?: string
  severity: 'error' | 'warning'

  constructor(pos: Position, what: string, fix?: string, severity: 'error' | 'warning' = 'error') {
    super(what)
    this.line = pos.line
    this.column = pos.column
    this.length = Math.max(1, pos.length ?? 1)
    this.what = what
    this.fix = fix
    this.severity = severity
  }

  /** Full message with the underlined source excerpt. */
  format(source?: string): string {
    const title = this.severity === 'error' ? msg('Error', 'Erreur') : msg('Warning', 'Attention')
    const where = this.file ? `${this.file}, ${msg('line', 'ligne')} ${this.line}` : `${msg('line', 'ligne')} ${this.line}`
    let out = `${title} ${where}: ${this.what}`
    if (source) {
      const text = source.split(/\r?\n/)[this.line - 1]
      if (text !== undefined) {
        const num = String(this.line)
        out += `\n  ${num} | ${text}`
        out += `\n  ${' '.repeat(num.length)} | ${' '.repeat(Math.max(0, this.column - 1))}${'^'.repeat(this.length)}`
      }
    }
    if (this.fix) out += `\n${msg('Try', 'Essaie')}: ${this.fix}`
    return out
  }

  toJSON() {
    return {
      severity: this.severity,
      file: this.file,
      line: this.line,
      column: this.column,
      length: this.length,
      message: this.what,
      fix: this.fix,
    }
  }
}

/** Several errors at once (the checker never stops at the first one). */
export class KauryErrors extends Error {
  errors: KauryError[]
  source?: string
  constructor(errors: KauryError[], source?: string) {
    super(errors.map((e) => e.format(source)).join('\n\n'))
    this.errors = errors
    this.source = source
  }
}

/** Edit distance, to suggest "did you mean …?". */
export function distance(a: string, b: string): number {
  if (a === b) return 0
  const m = a.length, n = b.length
  if (!m) return n
  if (!n) return m
  let prev = new Array(n + 1)
  let cur = new Array(n + 1)
  for (let j = 0; j <= n; j++) prev[j] = j
  for (let i = 1; i <= m; i++) {
    cur[0] = i
    for (let j = 1; j <= n; j++) {
      const c = a[i - 1] === b[j - 1] ? 0 : 1
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + c)
    }
    ;[prev, cur] = [cur, prev]
  }
  return prev[n]
}

export function closest(word: string, candidates: Iterable<string>): string | undefined {
  let best: string | undefined
  let bestD = Infinity
  const limit = word.length <= 3 ? 1 : word.length <= 6 ? 2 : 3
  for (const c of candidates) {
    const d = distance(word.toLowerCase(), c.toLowerCase())
    if (d < bestD && d <= limit) {
      bestD = d
      best = c
    }
  }
  return best
}

/** « word » in French, "word" in English. */
export const q = (s: string) => msg(`"${s}"`, `« ${s} »`)
