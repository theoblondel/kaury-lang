// Style options → CSS.

import type { Expr } from './ast.js'
import { canon, canonValue } from './keywords.js'
import { COLORS, knownColor } from './vocabulary.js'

export type Decl = [string, string]

/** Literal value of an expression (or undefined when it depends on the program). */
export function literal(e: Expr | undefined, siteColors: Record<string, string>): string | number | undefined {
  if (!e) return undefined
  switch (e.k) {
    case 'number':
      return e.unit && e.unit !== 'px' ? `${e.v}${e.unit}` : e.v
    case 'color':
      return e.v
    case 'text':
      if (e.parts.every((m) => typeof m === 'string')) return (e.parts as string[]).join('')
      return undefined
    case 'name': {
      if (e.binding && e.binding.kind !== 'kaury' && e.binding.kind !== 'js') return undefined
      if (siteColors[e.name]) return `var(--k-${e.name})`
      const c = knownColor(e.name)
      if (c) return `var(--k-${c})`
      return canon(e.name) ?? canonValue(e.name)
    }
    case 'unary':
      if (e.op === '-' && e.e.k === 'number') return -e.e.v
      return undefined
    case 'bool':
      return e.v ? 'true' : 'false'
  }
  return undefined
}

export const px = (v: string | number | undefined, fallback = '0') => (v === undefined ? fallback : typeof v === 'number' ? `${v}px` : v)

/** Real hex color (to compute a contrast), when known. */
export function hexOf(v: string, siteColors: Record<string, string>): string | undefined {
  if (v.startsWith('#')) return v
  const m = /^var\(--k-([\w-]+)\)$/.exec(v)
  if (m) {
    const n = m[1]
    if (siteColors[n]?.startsWith('#')) return siteColors[n]
    if (COLORS[n]?.startsWith('#')) return COLORS[n]
  }
  return undefined
}

export function luminance(hex: string): number {
  let h = hex.replace('#', '')
  if (h.length === 3 || h.length === 4) h = h.split('').slice(0, 3).map((c) => c + c).join('')
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  const [r, g, b] = [0, 2, 4].map((i) => lin(parseInt(h.slice(i, i + 2), 16) / 255))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
export const isLight = (hex: string) => luminance(hex) > 0.45
/** WCAG contrast ratio between two hex colors. */
export function contrast(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m)
  return (x + 0.05) / (y + 0.05)
}

const SHADOWS: Record<string, string> = {
  soft: '0 10px 30px -12px rgba(0,0,0,.18), 0 2px 6px rgba(0,0,0,.06)',
  medium: '0 18px 40px -14px rgba(0,0,0,.28), 0 4px 10px rgba(0,0,0,.08)',
  strong: '0 30px 60px -20px rgba(0,0,0,.45), 0 8px 18px rgba(0,0,0,.12)',
  none: 'none',
  inner: 'inset 0 2px 8px rgba(0,0,0,.15)',
}

const TEXT_HEADS = new Set(['title', 'subtitle', 'text', 'link', 'icon', 'item', 'links'])

/** CSS declarations for one option; `transform` is returned apart (several options compose it). */
export function declarations(head: string, opt: string, vals: (string | number | undefined)[], siteColors: Record<string, string>): { decl: Decl[]; transform?: string } {
  const v0 = vals[0]
  switch (opt) {
    case 'tint': {
      const c = String(v0)
      if (TEXT_HEADS.has(head)) return { decl: [['color', c]] }
      return { decl: [['background', c], ...autoContrast(c, siteColors)] }
    }
    case 'background': {
      if (typeof v0 === 'string' && /\.(png|jpe?g|webp|avif|gif|svg)$/i.test(v0)) {
        const u = /^(\/|[a-z][a-z0-9+.-]*:)/i.test(v0) ? v0 : '/' + v0.replace(/^\.\//, '')
        return { decl: [['background', `center/cover no-repeat url("${u}")`]] }
      }
      const c = v0 === undefined ? 'transparent' : String(v0)
      return { decl: [['background', c], ...autoContrast(c, siteColors)] }
    }
    case 'color': return { decl: [['color', v0 === undefined ? 'inherit' : String(v0)]] }
    case 'font': return { decl: [['font-family', `"${v0}", var(--k-font-fallback)`]] }
    case 'size': {
      if (typeof v0 === 'number' && (head === 'title' || head === 'subtitle') && v0 > 36) {
        // big titles shrink on small screens by themselves
        return { decl: [['font-size', `clamp(${Math.round(v0 * 0.48)}px, ${(v0 / 13).toFixed(2)}vw, ${v0}px)`]] }
      }
      return { decl: [['font-size', px(v0)]] }
    }
    case 'bold': return { decl: [['font-weight', '700']] }
    case 'light': return { decl: [['font-weight', '300']] }
    case 'weight': return { decl: [['font-weight', String(v0)]] }
    case 'italic': return { decl: [['font-style', 'italic']] }
    case 'underline': return { decl: [['text-decoration', 'underline']] }
    case 'uppercase': return { decl: [['text-transform', 'uppercase'], ['letter-spacing', '.06em']] }
    case 'line-height': return { decl: [['line-height', String(v0)]] }
    case 'tracking': return { decl: [['letter-spacing', px(v0)]] }
    case 'align': return { decl: [['text-align', String(v0 ?? 'left')]] }
    case 'center': return { decl: [['text-align', 'center'], ['align-items', 'center'], ['justify-content', 'center'], ['margin-inline', 'auto']] }
    case 'radius': return { decl: [['border-radius', px(v0)], ['overflow', 'hidden']] }
    case 'round': return { decl: [['border-radius', '999px']] }
    case 'shadow': return { decl: [['box-shadow', SHADOWS[String(v0 ?? 'soft')] ?? (typeof v0 === 'number' ? `0 ${v0}px ${v0 * 3}px -${v0}px rgba(0,0,0,.25)` : SHADOWS.soft)]] }
    case 'border': {
      const w = typeof v0 === 'number' ? v0 : 1
      const c = vals.find((x) => typeof x === 'string') ?? 'currentColor'
      return { decl: [['border', `${w}px solid ${c}`]] }
    }
    case 'margin': return { decl: [['margin', vals.map((x) => px(x)).join(' ')]] }
    case 'padding': return { decl: [['padding', vals.map((x) => px(x)).join(' ')]] }
    case 'gap': return { decl: [['gap', px(v0)]] }
    case 'width': return { decl: [['width', px(v0)], ['max-width', '100%']] }
    case 'height': return { decl: [['height', px(v0)]] }
    case 'max-width': return { decl: [['max-width', px(v0)], ['margin-inline', 'auto'], ['width', '100%']] }
    case 'min-height': return { decl: [['min-height', px(v0)]] }
    case 'fullscreen': return { decl: [['min-height', '100svh'], ['display', 'flex'], ['flex-direction', 'column'], ['justify-content', 'center']] }
    case 'full-width': return { decl: [['max-width', 'none'], ['width', '100%'], ['padding-inline', '0']] }
    case 'opacity': return { decl: [['opacity', String(v0)]] }
    case 'blur': return { decl: [['filter', `blur(${px(v0)})`]] }
    case 'glass': return { decl: [['background', 'color-mix(in srgb, var(--k-bg) 55%, transparent)'], ['backdrop-filter', 'blur(16px) saturate(1.4)'], ['-webkit-backdrop-filter', 'blur(16px) saturate(1.4)'], ['border', '1px solid color-mix(in srgb, var(--k-text) 10%, transparent)']] }
    case 'gradient': {
      const cols = vals.filter((x) => typeof x === 'string')
      const angle = vals.find((x) => typeof x === 'number') ?? 135
      return { decl: [['background', `linear-gradient(${angle}deg, ${cols.join(', ')})`]] }
    }
    case 'text-gradient': {
      const cols = vals.filter((x) => typeof x === 'string')
      return { decl: [['background', `linear-gradient(90deg, ${cols.join(', ')})`], ['-webkit-background-clip', 'text'], ['background-clip', 'text'], ['color', 'transparent']] }
    }
    case 'columns': return { decl: [['--k-columns', String(v0)], ['grid-template-columns', `repeat(${v0}, minmax(0, 1fr))`]] }
    case 'direction': return { decl: [['display', 'flex'], ['flex-direction', v0 === 'row' ? 'row' : 'column']] }
    case 'hidden': return { decl: [['display', 'none']] }
    case 'sticky': return { decl: [['position', 'sticky'], ['top', '0'], ['z-index', '50']] }
    case 'front': return { decl: [['position', 'relative'], ['z-index', '10']] }
    case 'cursor': {
      const m: Record<string, string> = { pointer: 'pointer', arrow: 'default', text: 'text', none: 'none' }
      return { decl: [['cursor', m[String(v0)] ?? 'pointer']] }
    }
    case 'lift': return { decl: [], transform: `translateY(${-Number(v0 ?? 4)}px)` }
    case 'grow': return { decl: [], transform: `scale(${v0 ?? 1.05})` }
    case 'tilt': return { decl: [], transform: `rotate(${v0 ?? 2}deg)` }
    case 'animate': return { decl: [['animation', `k-${v0} .8s cubic-bezier(.2,.7,.2,1) both`]] }
  }
  return { decl: [] }
}

/** Text color (white or near-black) that reads best on a background, WCAG contrast first. */
export function bestText(bg: string): string {
  const white = contrast(bg, '#ffffff')
  const dark = contrast(bg, '#16151a')
  return white >= 4.5 || white >= dark ? '#fff' : '#16151a'
}

function autoContrast(c: string, siteColors: Record<string, string>): Decl[] {
  const hex = hexOf(c, siteColors)
  if (!hex) return []
  return [['color', bestText(hex)]]
}

/** Known fonts hosted by Fontshare (the others come from Google Fonts). */
export const FONTSHARE = new Set([
  'Clash Display', 'Clash Grotesk', 'Satoshi', 'General Sans', 'Cabinet Grotesk', 'Switzer', 'Zodiak', 'Erode',
  'Gambetta', 'Supreme', 'Chillax', 'Panchang', 'Boska', 'Sentient', 'Ranade', 'Tanker', 'Author', 'Bespoke Serif',
  'Excon', 'Melodrama', 'Pally', 'Synonym', 'Telma', 'Rowan', 'Khand', 'Nippo', 'Hoover',
])
export const SYSTEM_FONTS = new Set(['system-ui', 'serif', 'sans-serif', 'monospace', 'Arial', 'Helvetica', 'Georgia', 'Times New Roman'])

export function fontUrl(name: string): string | undefined {
  if (SYSTEM_FONTS.has(name)) return undefined
  if (FONTSHARE.has(name)) return `https://api.fontshare.com/v2/css?f[]=${name.toLowerCase().replace(/ /g, '-')}@300,400,500,600,700&display=swap`
  return `https://fonts.googleapis.com/css2?family=${name.replace(/ /g, '+')}:wght@300;400;500;600;700;800&display=swap`
}
