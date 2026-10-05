// Étape 1 — le lecteur : découpe le texte en morceaux (jetons).
// Gère l'indentation (blocs), les textes avec {insertions}, les nombres avec unités
// et les noms à tirets (prix-total).

import { ErreurKaury } from './erreurs.js'

export type TypeJeton = 'brut' | 'mot' | 'nombre' | 'texte' | 'couleur' | 'op' | 'ligne' | 'indente' | 'desindente' | 'fin'

export interface MorceauTexte {
  texte?: string
  code?: string
  ligne?: number
  colonne?: number
}

export interface Jeton {
  t: TypeJeton
  v: string
  ligne: number
  colonne: number
  fin: number // colonne de fin (exclue)
  espaceAvant: boolean
  unite?: string
  morceaux?: MorceauTexte[]
}

const UNITES = ['px', 'rem', 'em', '%', 'vh', 'vw', 'svh', 'dvh', 'ms', 's', 'deg', 'fr', 'x']
const OPS = ['**=', '...', '->', '==', '!=', '<=', '>=', '+=', '-=', '*=', '/=', '..', '**', '?.', '??',
  '+', '-', '*', '/', '%', '<', '>', '=', ',', '.', ':', '(', ')', '[', ']', '{', '}', '?', '!', '|', '@']

const estLettre = (c: string) => /[\p{L}_$]/u.test(c)
const estChiffre = (c: string) => c >= '0' && c <= '9'
const estCarMot = (c: string) => /[\p{L}\p{N}_$]/u.test(c)

export function lis(source: string): Jeton[] {
  const jetons: Jeton[] = []
  const lignes = source.replace(/\r\n?/g, '\n').split('\n')
  const pile = [0]
  let profondeur = 0 // parenthèses / crochets / accolades ouverts
  const ouvreurs: Jeton[] = []

  const pousse = (j: Jeton) => jetons.push(j)

  for (let li = 0; li < lignes.length; li++) {
    const ligne = lignes[li]
    const numLigne = li + 1
    let i = 0

    // Indentation
    if (profondeur === 0) {
      let indent = 0
      while (i < ligne.length && (ligne[i] === ' ' || ligne[i] === '\t')) {
        if (ligne[i] === '\t') {
          throw new ErreurKaury({ ligne: numLigne, colonne: i + 1 }, 'une tabulation sert d\'indentation.',
            'indente avec 2 espaces. Kaury n\'accepte pas les tabulations.')
        }
        indent++
        i++
      }
      const reste = ligne.slice(i)
      if (reste === '' || reste.startsWith('//')) continue // ligne vide ou commentaire
      const haut = pile[pile.length - 1]
      if (indent > haut) {
        pile.push(indent)
        pousse({ t: 'indente', v: '', ligne: numLigne, colonne: 1, fin: indent + 1, espaceAvant: false })
      } else if (indent < haut) {
        while (pile.length && indent < pile[pile.length - 1]) {
          pile.pop()
          pousse({ t: 'desindente', v: '', ligne: numLigne, colonne: 1, fin: 1, espaceAvant: false })
        }
        if (pile[pile.length - 1] !== indent) {
          throw new ErreurKaury({ ligne: numLigne, colonne: 1, longueur: indent || 1 },
            'cette ligne n\'est alignée sur aucun bloc au-dessus.',
            'aligne-la exactement sous la ligne dont elle fait partie (2 espaces par niveau).')
        }
      }
      // Bloc JavaScript brut : « js » seul sur sa ligne, puis du code indenté recopié tel quel.
      if (/^(js|javascript)\s*(\/\/.*)?$/.test(reste)) {
        pousse({ t: 'mot', v: 'js', ligne: numLigne, colonne: indent + 1, fin: indent + 3, espaceAvant: true })
        const brutes: string[] = []
        let k = li + 1
        let retrait = -1
        while (k < lignes.length) {
          const l = lignes[k]
          const ind = l.length - l.trimStart().length
          if (l.trim() !== '' && ind <= indent) break
          if (l.trim() !== '' && (retrait < 0 || ind < retrait)) retrait = ind
          brutes.push(l)
          k++
        }
        while (brutes.length && brutes[brutes.length - 1].trim() === '') brutes.pop()
        const code = brutes.map((l) => l.slice(Math.max(0, retrait))).join('\n')
        pousse({ t: 'brut', v: code, ligne: numLigne + 1, colonne: 1, fin: 1, espaceAvant: true })
        pousse({ t: 'ligne', v: '', ligne: numLigne, colonne: 1, fin: 1, espaceAvant: false })
        li = li + brutes.length
        continue
      }
    } else {
      while (i < ligne.length && (ligne[i] === ' ' || ligne[i] === '\t')) i++
      if (i >= ligne.length || ligne.startsWith('//', i)) continue
    }

    let espace = true
    let aEuJeton = false
    while (i < ligne.length) {
      const c = ligne[i]
      if (c === ' ' || c === '\t') {
        espace = true
        i++
        continue
      }
      if (c === '/' && ligne[i + 1] === '/') break // commentaire
      const col = i + 1

      // Texte
      if (c === '"') {
        const { jeton, suite } = lisTexte(ligne, i, numLigne)
        jeton.espaceAvant = espace
        pousse(jeton)
        i = suite
        espace = false
        aEuJeton = true
        continue
      }

      // Couleur #RRGGBB
      if (c === '#') {
        const m = /^#([0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![\p{L}\p{N}_])/u.exec(ligne.slice(i))
        if (!m) {
          throw new ErreurKaury({ ligne: numLigne, colonne: col }, 'couleur mal écrite.',
            'une couleur s\'écrit avec 3 ou 6 chiffres hexadécimaux : #FF4F8B ou #F48.')
        }
        pousse({ t: 'couleur', v: m[0], ligne: numLigne, colonne: col, fin: col + m[0].length, espaceAvant: espace })
        i += m[0].length
        espace = false
        aEuJeton = true
        continue
      }

      // Nombre (avec - collé : « marge -10 »)
      const negatifColle = c === '-' && espace && estChiffre(ligne[i + 1] ?? '') && dernierPermetUnaire(jetons, aEuJeton)
      if (estChiffre(c) || negatifColle) {
        let j = i + (negatifColle ? 1 : 0)
        while (j < ligne.length && (estChiffre(ligne[j]) || ligne[j] === '_')) j++
        if (ligne[j] === '.' && estChiffre(ligne[j + 1] ?? '')) {
          j++
          while (j < ligne.length && estChiffre(ligne[j])) j++
        }
        let v = ligne.slice(i, j).replace(/_/g, '')
        let unite: string | undefined
        // unité collée : 24px, 2s, 50%, 20/s
        if (ligne.startsWith('/s', j) && !estCarMot(ligne[j + 2] ?? ' ')) {
          unite = '/s'
          j += 2
        } else {
          for (const u of UNITES) {
            if (ligne.startsWith(u, j) && !estCarMot(ligne[j + u.length] ?? ' ')) {
              unite = u
              j += u.length
              break
            }
          }
        }
        pousse({ t: 'nombre', v, unite, ligne: numLigne, colonne: col, fin: j + 1, espaceAvant: espace })
        i = j
        espace = false
        aEuJeton = true
        continue
      }

      // Mot (noms à tirets : prix-total ; apostrophe : l'entree n'est pas un mot)
      if (estLettre(c)) {
        let j = i + 1
        while (j < ligne.length) {
          if (estCarMot(ligne[j])) {
            j++
          } else if (ligne[j] === '-' && estLettre(ligne[j + 1] ?? '') && estCarMot(ligne[j - 1])) {
            j++
          } else break
        }
        pousse({ t: 'mot', v: ligne.slice(i, j), ligne: numLigne, colonne: col, fin: j + 1, espaceAvant: espace })
        i = j
        espace = false
        aEuJeton = true
        continue
      }

      // Opérateurs
      const op = OPS.find((o) => ligne.startsWith(o, i))
      if (op) {
        const j: Jeton = { t: 'op', v: op, ligne: numLigne, colonne: col, fin: col + op.length, espaceAvant: espace }
        if (op === '(' || op === '[' || op === '{') {
          profondeur++
          ouvreurs.push(j)
        } else if (op === ')' || op === ']' || op === '}') {
          const o = ouvreurs.pop()
          const attendu = o ? ({ '(': ')', '[': ']', '{': '}' } as Record<string, string>)[o.v] : undefined
          if (!o || attendu !== op) {
            throw new ErreurKaury({ ligne: numLigne, colonne: col },
              o ? `« ${op} » ferme « ${o.v} » ouvert ligne ${o.ligne}, mais il faut « ${attendu} ».` : `« ${op} » ferme quelque chose qui n'a jamais été ouvert.`,
              o ? `remplace « ${op} » par « ${attendu} ».` : `supprime ce « ${op} ».`)
          }
          profondeur--
        }
        pousse(j)
        i += op.length
        espace = false
        aEuJeton = true
        continue
      }

      if (c === "'") {
        throw new ErreurKaury({ ligne: numLigne, colonne: col }, 'les textes s\'écrivent entre guillemets doubles.',
          'remplace \'…\' par "…". L\'apostrophe reste utilisable dans un texte : "J\'aime".')
      }
      throw new ErreurKaury({ ligne: numLigne, colonne: col }, `caractère inattendu « ${c} ».`, 'supprime-le ou mets-le dans un texte "…".')
    }

    if (profondeur === 0 && aEuJeton) {
      pousse({ t: 'ligne', v: '', ligne: numLigne, colonne: ligne.length + 1, fin: ligne.length + 2, espaceAvant: false })
    }
  }

  if (ouvreurs.length) {
    const o = ouvreurs[ouvreurs.length - 1]
    throw new ErreurKaury({ ligne: o.ligne, colonne: o.colonne }, `« ${o.v} » n'est jamais refermé.`,
      `ajoute « ${({ '(': ')', '[': ']', '{': '}' } as Record<string, string>)[o.v]} » à la fin.`)
  }
  const derniere = lignes.length
  if (jetons.length && jetons[jetons.length - 1].t !== 'ligne' && jetons[jetons.length - 1].t !== 'desindente') {
    pousse({ t: 'ligne', v: '', ligne: derniere, colonne: 1, fin: 1, espaceAvant: false })
  }
  while (pile.length > 1) {
    pile.pop()
    pousse({ t: 'desindente', v: '', ligne: derniere, colonne: 1, fin: 1, espaceAvant: false })
  }
  pousse({ t: 'fin', v: '', ligne: derniere + 1, colonne: 1, fin: 1, espaceAvant: false })
  return jetons
}

function dernierPermetUnaire(jetons: Jeton[], aEuJeton: boolean): boolean {
  if (!aEuJeton) return true
  const d = jetons[jetons.length - 1]
  if (!d) return true
  // « a -1 » dans une liste d'options : -1 est un nombre. « a - 1 » reste une soustraction.
  return d.t === 'mot' || d.t === 'op' || d.t === 'nombre' || d.t === 'texte'
}

/** Lit un texte "…" avec ses insertions {expr}. */
function lisTexte(ligne: string, debut: number, numLigne: number): { jeton: Jeton; suite: number } {
  const morceaux: MorceauTexte[] = []
  let i = debut + 1
  let courant = ''
  while (true) {
    if (i >= ligne.length) {
      throw new ErreurKaury({ ligne: numLigne, colonne: debut + 1 }, 'ce texte n\'est jamais refermé.',
        'ajoute un guillemet " à la fin du texte.')
    }
    const c = ligne[i]
    if (c === '\\') {
      const n = ligne[i + 1]
      const map: Record<string, string> = { n: '\n', t: '\t', '"': '"', '\\': '\\', '{': '{', '}': '}' }
      if (n === undefined || !(n in map)) {
        throw new ErreurKaury({ ligne: numLigne, colonne: i + 1, longueur: 2 }, `séquence « \\${n ?? ''} » inconnue dans un texte.`,
          'utilise \\n (retour à la ligne), \\" (guillemet), \\{ ou \\} (accolades), \\\\ (barre).')
      }
      courant += map[n]
      i += 2
      continue
    }
    if (c === '"') {
      i++
      break
    }
    if (c === '{') {
      if (courant) morceaux.push({ texte: courant })
      courant = ''
      // trouver l'accolade fermante correspondante
      let p = 1
      let j = i + 1
      let dansTexte = false
      while (j < ligne.length && p > 0) {
        const d = ligne[j]
        if (dansTexte) {
          if (d === '\\') j++
          else if (d === '"') dansTexte = false
        } else if (d === '"') dansTexte = true
        else if (d === '{') p++
        else if (d === '}') p--
        if (p > 0) j++
      }
      if (p > 0) {
        throw new ErreurKaury({ ligne: numLigne, colonne: i + 1 }, 'insertion « { » jamais refermée dans ce texte.',
          'ferme-la avec « } », ou écris \\{ pour une vraie accolade.')
      }
      const code = ligne.slice(i + 1, j)
      if (!code.trim()) {
        throw new ErreurKaury({ ligne: numLigne, colonne: i + 1, longueur: 2 }, 'insertion vide « {} » dans un texte.',
          'mets un nom entre les accolades : "Bonjour {nom}".')
      }
      morceaux.push({ code, ligne: numLigne, colonne: i + 2 })
      i = j + 1
      continue
    }
    courant += c
    i++
  }
  if (courant || !morceaux.length) morceaux.push({ texte: courant })
  const v = morceaux.map((m) => m.texte ?? `{${m.code}}`).join('')
  return {
    jeton: { t: 'texte', v, morceaux, ligne: numLigne, colonne: debut + 1, fin: i + 1, espaceAvant: true },
    suite: i,
  }
}
