// Erreurs Kaury : chaque message dit OÙ, QUOI et COMMENT corriger.
// Format pensé pour un humain ET pour une IA qui doit se corriger seule.

export interface Position {
  ligne: number // 1-based
  colonne: number // 1-based
  longueur?: number
}

export class ErreurKaury extends Error {
  ligne: number
  colonne: number
  longueur: number
  quoi: string
  essaie?: string
  fichier?: string
  gravite: 'erreur' | 'avertissement'

  constructor(pos: Position, quoi: string, essaie?: string, gravite: 'erreur' | 'avertissement' = 'erreur') {
    super(quoi)
    this.ligne = pos.ligne
    this.colonne = pos.colonne
    this.longueur = Math.max(1, pos.longueur ?? 1)
    this.quoi = quoi
    this.essaie = essaie
    this.gravite = gravite
  }

  /** Message complet avec l'extrait de code souligné. */
  formate(source?: string): string {
    const titre = this.gravite === 'erreur' ? 'Erreur' : 'Attention'
    const ou = this.fichier ? `${this.fichier}, ligne ${this.ligne}` : `ligne ${this.ligne}`
    let out = `${titre} ${ou} : ${this.quoi}`
    if (source) {
      const lignes = source.split(/\r?\n/)
      const texte = lignes[this.ligne - 1]
      if (texte !== undefined) {
        const num = String(this.ligne)
        out += `\n  ${num} | ${texte}`
        out += `\n  ${' '.repeat(num.length)} | ${' '.repeat(Math.max(0, this.colonne - 1))}${'^'.repeat(this.longueur)}`
      }
    }
    if (this.essaie) out += `\nEssaie : ${this.essaie}`
    return out
  }

  versJSON() {
    return {
      gravite: this.gravite,
      fichier: this.fichier,
      ligne: this.ligne,
      colonne: this.colonne,
      longueur: this.longueur,
      message: this.quoi,
      essaie: this.essaie,
    }
  }
}

/** Plusieurs erreurs d'un coup (le vérificateur ne s'arrête pas à la première). */
export class ErreursKaury extends Error {
  erreurs: ErreurKaury[]
  source?: string
  constructor(erreurs: ErreurKaury[], source?: string) {
    super(erreurs.map((e) => e.formate(source)).join('\n\n'))
    this.erreurs = erreurs
    this.source = source
  }
}

/** Distance d'édition, pour proposer « tu voulais dire … ? ». */
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

export function proche(mot: string, candidats: Iterable<string>): string | undefined {
  let best: string | undefined
  let bestD = Infinity
  const seuil = mot.length <= 3 ? 1 : mot.length <= 6 ? 2 : 3
  for (const c of candidats) {
    const d = distance(mot.toLowerCase(), c.toLowerCase())
    if (d < bestD && d <= seuil) {
      bestD = d
      best = c
    }
  }
  return best
}
