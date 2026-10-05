// Traduction des options de style en CSS.

import type { Expr } from './arbre.js'
import { canon, sansAccents } from './mots.js'
import { COULEURS, couleurConnue } from './vocabulaire.js'

export type Decl = [string, string]

/** Valeur littérale d'une expression (ou undefined si elle dépend du programme). */
export function litteral(e: Expr | undefined, couleursSite: Record<string, string>): string | number | undefined {
  if (!e) return undefined
  switch (e.k) {
    case 'nombre':
      return e.unite && e.unite !== 'px' ? `${e.v}${e.unite}` : e.v
    case 'couleur':
      return e.v
    case 'texte':
      if (e.morceaux.every((m) => typeof m === 'string')) return (e.morceaux as string[]).join('')
      return undefined
    case 'nom':
      if (e.liaison && e.liaison.genre !== 'kaury' && e.liaison.genre !== 'js') return undefined
      if (couleursSite[e.nom]) return `var(--k-${e.nom})`
      {
        const c = couleurConnue(e.nom)
        if (c) return `var(--k-${c})`
      }
      return canon(e.nom) ?? sansAccents(e.nom)
    case 'unaire':
      if (e.op === '-' && e.e.k === 'nombre') return -e.e.v
      return undefined
    case 'bool':
      return e.v ? 'vrai' : 'faux'
  }
  return undefined
}

export const px = (v: string | number | undefined, defaut = '0') => (v === undefined ? defaut : typeof v === 'number' ? `${v}px` : v)

/** Couleur littérale vers valeur CSS. */
export function couleurCss(v: string | number | undefined): string | undefined {
  if (v === undefined) return undefined
  return String(v)
}

/** Couleur hexadécimale réelle (pour calculer un contraste), si connue. */
export function hexDe(v: string, couleursSite: Record<string, string>): string | undefined {
  if (v.startsWith('#')) return v
  const m = /^var\(--k-([\w-]+)\)$/.exec(v)
  if (m) {
    const n = m[1]
    if (couleursSite[n]?.startsWith('#')) return couleursSite[n]
    if (COULEURS[n]?.startsWith('#')) return COULEURS[n]
  }
  return undefined
}

export function clair(hex: string): boolean {
  let h = hex.replace('#', '')
  if (h.length === 3 || h.length === 4) h = h.split('').slice(0, 3).map((c) => c + c).join('')
  const r = parseInt(h.slice(0, 2), 16) / 255, g = parseInt(h.slice(2, 4), 16) / 255, b = parseInt(h.slice(4, 6), 16) / 255
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  const L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
  return L > 0.45
}

const OMBRES: Record<string, string> = {
  douce: '0 10px 30px -12px rgba(0,0,0,.18), 0 2px 6px rgba(0,0,0,.06)',
  moyenne: '0 18px 40px -14px rgba(0,0,0,.28), 0 4px 10px rgba(0,0,0,.08)',
  forte: '0 30px 60px -20px rgba(0,0,0,.45), 0 8px 18px rgba(0,0,0,.12)',
  aucune: 'none',
  interieure: 'inset 0 2px 8px rgba(0,0,0,.15)',
}

const TEXTES = new Set(['titre', 'sous-titre', 'texte', 'lien', 'icone', 'element', 'liens'])

/**
 * Déclarations CSS pour une option. `vals` sont déjà littéraux.
 * Renvoie aussi `transform` à part (plusieurs options peuvent le composer).
 */
export function declarations(tete: string, opt: string, vals: (string | number | undefined)[], couleursSite: Record<string, string>): { decl: Decl[]; transform?: string } {
  const v0 = vals[0]
  switch (opt) {
    case 'teinte': {
      const c = couleurCss(v0)!
      if (TEXTES.has(tete)) return { decl: [['color', c]] }
      return { decl: [['background', c], ...contraste(c, couleursSite)] }
    }
    case 'fond': {
      if (typeof v0 === 'string' && /\.(png|jpe?g|webp|avif|gif|svg)$/i.test(v0)) {
        const u = /^(\/|[a-z][a-z0-9+.-]*:)/i.test(v0) ? v0 : '/' + v0.replace(/^\.\//, '')
        return { decl: [['background', `center/cover no-repeat url("${u}")`]] }
      }
      const c = couleurCss(v0) ?? 'transparent'
      return { decl: [['background', c], ...contraste(c, couleursSite)] }
    }
    case 'couleur':
      return { decl: [['color', couleurCss(v0) ?? 'inherit']] }
    case 'police':
      return { decl: [['font-family', `"${v0}", var(--k-police-secours)`]] }
    case 'taille': {
      if (typeof v0 === 'number' && (tete === 'titre' || tete === 'sous-titre') && v0 > 36) {
        return { decl: [['font-size', `clamp(${Math.round(v0 * 0.48)}px, ${(v0 / 13).toFixed(2)}vw, ${v0}px)`]] }
      }
      return { decl: [['font-size', px(v0)]] }
    }
    case 'gras': return { decl: [['font-weight', '700']] }
    case 'leger': return { decl: [['font-weight', '300']] }
    case 'poids': return { decl: [['font-weight', String(v0)]] }
    case 'italique': return { decl: [['font-style', 'italic']] }
    case 'souligne': return { decl: [['text-decoration', 'underline']] }
    case 'majuscules': return { decl: [['text-transform', 'uppercase'], ['letter-spacing', '.06em']] }
    case 'interligne': return { decl: [['line-height', String(v0)]] }
    case 'lettres': return { decl: [['letter-spacing', px(v0)]] }
    case 'aligne': {
      const m: Record<string, string> = { gauche: 'left', centre: 'center', droite: 'right', justifie: 'justify' }
      return { decl: [['text-align', m[String(v0)] ?? 'left']] }
    }
    case 'centre':
      return { decl: [['text-align', 'center'], ['align-items', 'center'], ['justify-content', 'center'], ['margin-inline', 'auto']] }
    case 'coins': return { decl: [['border-radius', px(v0)], ['overflow', 'hidden']] }
    case 'rond': return { decl: [['border-radius', '999px']] }
    case 'ombre': return { decl: [['box-shadow', OMBRES[String(v0 ?? 'douce')] ?? (typeof v0 === 'number' ? `0 ${v0}px ${Number(v0) * 3}px -${v0}px rgba(0,0,0,.25)` : OMBRES.douce)]] }
    case 'bordure': {
      const ep = typeof v0 === 'number' ? v0 : 1
      const coul = vals.find((x) => typeof x === 'string') ?? 'currentColor'
      return { decl: [['border', `${ep}px solid ${coul}`]] }
    }
    case 'marge': return { decl: [['margin', vals.map((x) => px(x)).join(' ')]] }
    case 'remplissage': return { decl: [['padding', vals.map((x) => px(x)).join(' ')]] }
    case 'espace': return { decl: [['gap', px(v0)]] }
    case 'largeur': return { decl: [['width', px(v0)], ['max-width', '100%']] }
    case 'hauteur': return { decl: [['height', px(v0)]] }
    case 'max-largeur': return { decl: [['max-width', px(v0)], ['margin-inline', 'auto'], ['width', '100%']] }
    case 'min-hauteur': return { decl: [['min-height', px(v0)]] }
    case 'plein-ecran': return { decl: [['min-height', '100svh'], ['display', 'flex'], ['flex-direction', 'column'], ['justify-content', 'center']] }
    case 'pleine-largeur': return { decl: [['max-width', 'none'], ['width', '100%'], ['padding-inline', '0']] }
    case 'opacite': return { decl: [['opacity', String(v0)]] }
    case 'flou': return { decl: [['filter', `blur(${px(v0)})`]] }
    case 'verre': return { decl: [['background', 'color-mix(in srgb, var(--k-fond) 55%, transparent)'], ['backdrop-filter', 'blur(16px) saturate(1.4)'], ['-webkit-backdrop-filter', 'blur(16px) saturate(1.4)'], ['border', '1px solid color-mix(in srgb, var(--k-texte) 10%, transparent)']] }
    case 'degrade': {
      const coul = vals.filter((x) => typeof x === 'string')
      const angle = vals.find((x) => typeof x === 'number') ?? 135
      return { decl: [['background', `linear-gradient(${angle}deg, ${coul.join(', ')})`]] }
    }
    case 'texte-degrade': {
      const coul = vals.filter((x) => typeof x === 'string')
      return { decl: [['background', `linear-gradient(90deg, ${coul.join(', ')})`], ['-webkit-background-clip', 'text'], ['background-clip', 'text'], ['color', 'transparent']] }
    }
    case 'colonnes': return { decl: [['--k-colonnes', String(v0)], ['grid-template-columns', `repeat(${v0}, minmax(0, 1fr))`]] }
    case 'direction': return { decl: [['display', 'flex'], ['flex-direction', v0 === 'ligne' ? 'row' : 'column']] }
    case 'cache': return { decl: [['display', 'none']] }
    case 'colle': return { decl: [['position', 'sticky'], ['top', '0'], ['z-index', '50']] }
    case 'devant': return { decl: [['position', 'relative'], ['z-index', '10']] }
    case 'curseur': {
      const m: Record<string, string> = { main: 'pointer', fleche: 'default', texte: 'text', aucun: 'none' }
      return { decl: [['cursor', m[String(v0)] ?? 'pointer']] }
    }
    case 'monte': return { decl: [], transform: `translateY(${-Number(v0 ?? 4)}px)` }
    case 'grossit': return { decl: [], transform: `scale(${v0 ?? 1.05})` }
    case 'penche': return { decl: [], transform: `rotate(${v0 ?? 2}deg)` }
    case 'anime': return { decl: [['animation', `k-${v0} .8s cubic-bezier(.2,.7,.2,1) both`]] }
  }
  return { decl: [] }
}

function contraste(c: string, couleursSite: Record<string, string>): Decl[] {
  const hex = hexDe(c, couleursSite)
  if (!hex) return []
  return [['color', clair(hex) ? 'var(--k-encre, #111)' : '#fff']]
}

/** Polices connues hébergées par Fontshare (les autres viennent de Google Fonts). */
export const POLICES_FONTSHARE = new Set([
  'Clash Display', 'Clash Grotesk', 'Satoshi', 'General Sans', 'Cabinet Grotesk', 'Switzer', 'Zodiak', 'Erode',
  'Gambetta', 'Supreme', 'Chillax', 'Panchang', 'Boska', 'Sentient', 'Ranade', 'Tanker', 'Author', 'Bespoke Serif',
  'Excon', 'Melodrama', 'Pally', 'Synonym', 'Telma', 'Rowan', 'Khand', 'Plus Jakarta Sans', 'Nippo', 'Hoover',
])
export const POLICES_SYSTEME = new Set(['system-ui', 'serif', 'sans-serif', 'monospace', 'Arial', 'Helvetica', 'Georgia', 'Times New Roman'])

export function lienPolice(nom: string): string | undefined {
  if (POLICES_SYSTEME.has(nom)) return undefined
  if (POLICES_FONTSHARE.has(nom)) {
    return `https://api.fontshare.com/v2/css?f[]=${nom.toLowerCase().replace(/ /g, '-')}@300,400,500,600,700&display=swap`
  }
  return `https://fonts.googleapis.com/css2?family=${nom.replace(/ /g, '+')}:wght@300;400;500;600;700;800&display=swap`
}
