// Point d'entrée du compilateur Kaury : texte .kaury → { js, css, erreurs }.

import { analyse } from './analyseur.js'
import { ErreurKaury } from './erreurs.js'
import { verifie, type InfosModule } from './verificateur.js'
import { traduit, type Sortie } from './traducteur.js'
import type { Instr } from './arbre.js'

export { ErreurKaury, ErreursKaury } from './erreurs.js'
export { lis } from './lecteur.js'
export { analyse } from './analyseur.js'
export { verifie } from './verificateur.js'
export { traduit, jsNom } from './traducteur.js'
export { lienPolice } from './css.js'
export * as vocabulaire from './vocabulaire.js'
export * as mots from './mots.js'
export * as globaux from './globaux.js'

export interface Resultat {
  ok: boolean
  js: string
  css: string
  erreurs: ErreurKaury[]
  avertissements: ErreurKaury[]
  infos?: InfosModule
  arbre?: Instr[]
  polices: string[]
  site: { nom?: string; langue?: string }
  carte: { genere: number; source: number }[]
}

export interface OptionsCompile {
  fichier?: string
  runtime?: string // module importé par le code produit (défaut « kaury/runtime »)
  verifieSeulement?: boolean
}

export function compile(source: string, options: OptionsCompile = {}): Resultat {
  const vide: Resultat = { ok: false, js: '', css: '', erreurs: [], avertissements: [], polices: [], site: {}, carte: [] }
  let arbre: Instr[]
  try {
    arbre = analyse(source)
  } catch (e) {
    if (e instanceof ErreurKaury) {
      e.fichier = options.fichier
      return { ...vide, erreurs: [e] }
    }
    throw e
  }
  const { erreurs, avertissements, infos } = verifie(arbre, { fichier: options.fichier })
  if (erreurs.length || options.verifieSeulement) {
    return { ...vide, ok: !erreurs.length, erreurs, avertissements, infos, arbre }
  }
  const s: Sortie = traduit(arbre, infos, { fichier: options.fichier, runtime: options.runtime })
  return { ok: true, js: s.js, css: s.css, erreurs: [], avertissements, infos, arbre, polices: s.polices, site: s.site, carte: s.carte }
}

/** Message lisible pour toutes les erreurs d'une compilation. */
export function formateErreurs(r: Resultat, source: string): string {
  return [...r.erreurs, ...r.avertissements].map((e) => e.formate(source)).join('\n\n')
}

/** Carte de correspondance (source map v3) : chaque ligne JS → sa ligne .kaury. */
export function carteSource(r: Resultat, fichier: string, source: string): string {
  const vlq = (n: number) => {
    let v = n < 0 ? (-n << 1) | 1 : n << 1
    let s = ''
    do {
      let d = v & 31
      v >>>= 5
      if (v) d |= 32
      s += 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'[d]
    } while (v)
    return s
  }
  let prec = 0
  const lignes: string[] = []
  for (const c of r.carte) {
    const src = c.source - 1
    lignes.push(vlq(0) + vlq(0) + vlq(src - prec) + vlq(0))
    prec = src
  }
  return JSON.stringify({ version: 3, file: fichier + '.js', sources: [fichier], sourcesContent: [source], names: [], mappings: lignes.join(';') })
}
