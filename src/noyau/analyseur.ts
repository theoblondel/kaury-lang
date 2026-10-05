// Étape 2 — l'analyseur : transforme les jetons en arbre.
// Comprend ce qui est dans quoi : un titre dans une section dans une page.

import { ErreurKaury, proche } from './erreurs.js'
import { lis, type Jeton } from './lecteur.js'
import { canon } from './mots.js'
import type { Commande, Expr, Instr, Item, Param, Pos } from './arbre.js'

/** Mots qui commencent une ligne d'interface (élément, style, mouvement, événement…). */
export const TETES_INTERFACE = new Set([
  // web
  'section', 'entete', 'pied', 'nav', 'grille', 'colonne', 'ligne', 'boite', 'carte', 'titre', 'sous-titre',
  'texte', 'image', 'video', 'lien', 'liens', 'logo', 'bouton', 'formulaire', 'champ', 'zone', 'choix', 'case',
  'liste', 'element', 'icone', 'separateur', 'espaceur', 'contenu', 'style', 'mobile', 'tablette', 'ordinateur', 'seo',
  'couleurs', 'police', 'polices', 'langue', 'favicon', 'adresse',
  // immersion
  'scene', 'objet', 'personnage', 'lumiere', 'camera', 'au', 'suit', 'entre', 'tourne', 'flotte', 'saute',
  'pulse', 'balance', 'dit', 'joue', 'son', 'transition', 'parallaxe',
])

/** Mots qui coupent une expression (jamais le début d'un argument implicite). */
const MOTS_INFIXES = new Set(['et', 'ou', 'dans', 'puis', 'alors', 'sinon', 'de', 'comme'])

const OPS_AFFECTATION = new Set(['=', '+=', '-=', '*=', '/=', '**='])

interface Drapeaux {
  implicite: boolean // « f a, b » = appel sans parenthèses
  item: boolean // dans une ligne d'interface : « -> » termine, pas de lambda nue
}

const LIBRE: Drapeaux = { implicite: true, item: false }
const ITEM: Drapeaux = { implicite: false, item: true }
const SIMPLE: Drapeaux = { implicite: false, item: false }

export function analyse(source: string): Instr[] {
  const jetons = lis(source)
  return new Analyseur(jetons).programme()
}

/** Analyse une expression seule (utilisé pour les insertions {…} dans les textes). */
function analyseExpressionDans(code: string, ligne: number, colonne: number): Expr {
  let jetons: Jeton[]
  try {
    jetons = lis(code)
  } catch (e) {
    if (e instanceof ErreurKaury) {
      e.ligne = ligne
      e.colonne = colonne + e.colonne - 1
    }
    throw e
  }
  for (const j of jetons) {
    j.ligne = ligne
    j.colonne = colonne + j.colonne - 1
    j.fin = colonne + j.fin - 1
  }
  const a = new Analyseur(jetons.filter((j) => j.t !== 'indente' && j.t !== 'desindente'))
  const e = a.expression(LIBRE)
  if (a.voit().t !== 'ligne' && a.voit().t !== 'fin') {
    throw a.erreur(a.voit(), `je ne comprends pas « ${a.voit().v} » dans cette insertion.`, 'une insertion contient une seule expression : {prix * 2}.')
  }
  return e
}

class Analyseur {
  private i = 0
  constructor(private j: Jeton[]) {}

  // ---------- outils ----------
  voit(d = 0): Jeton {
    return this.j[Math.min(this.i + d, this.j.length - 1)]
  }
  private avance(): Jeton {
    const t = this.j[this.i]
    if (this.i < this.j.length - 1) this.i++
    return t
  }
  private estOp(v: string, d = 0): boolean {
    const t = this.voit(d)
    return t.t === 'op' && t.v === v
  }
  private estMot(c: string, d = 0): boolean {
    const t = this.voit(d)
    return t.t === 'mot' && canon(t.v) === c
  }
  private pos(t: Jeton): Pos {
    return { ligne: t.ligne, colonne: t.colonne, longueur: Math.max(1, t.fin - t.colonne) }
  }
  erreur(t: Jeton, quoi: string, essaie?: string): ErreurKaury {
    return new ErreurKaury(this.pos(t), quoi, essaie)
  }
  private decrit(t: Jeton): string {
    if (t.t === 'ligne') return 'la fin de la ligne'
    if (t.t === 'fin') return 'la fin du fichier'
    if (t.t === 'indente') return 'un bloc indenté'
    if (t.t === 'desindente') return 'la fin du bloc'
    if (t.t === 'texte') return `le texte "${t.v}"`
    return `« ${t.v} »`
  }
  private attendsOp(v: string, essaie?: string): Jeton {
    if (!this.estOp(v)) throw this.erreur(this.voit(), `il manque « ${v} » ici (je vois ${this.decrit(this.voit())}).`, essaie)
    return this.avance()
  }
  private attendsMotCle(c: string, essaie?: string): Jeton {
    if (!this.estMot(c)) throw this.erreur(this.voit(), `il manque le mot « ${c} » ici (je vois ${this.decrit(this.voit())}).`, essaie)
    return this.avance()
  }
  private attendsNom(role: string, essaie?: string): Jeton {
    const t = this.voit()
    if (t.t !== 'mot') throw this.erreur(t, `il faut un nom pour ${role} (je vois ${this.decrit(t)}).`, essaie)
    return this.avance()
  }
  private finDeLigne(essaie?: string) {
    const t = this.voit()
    if (t.t === 'ligne') {
      this.avance()
      return
    }
    if (t.t === 'fin' || t.t === 'desindente') return
    if (t.t === 'op' && t.v === '=' ) {
      throw this.erreur(t, '« = » ne peut pas être ici.', 'pour comparer deux valeurs, écris « == ».')
    }
    throw this.erreur(t, `je ne m'attendais pas à ${this.decrit(t)} ici.`, essaie ?? 'passe à la ligne, ou sépare les options par des virgules.')
  }

  // ---------- programme & blocs ----------
  programme(): Instr[] {
    const corps: Instr[] = []
    while (this.voit().t !== 'fin') {
      if (this.voit().t === 'ligne') {
        this.avance()
        continue
      }
      if (this.voit().t === 'indente') {
        throw this.erreur(this.voit(), 'cette ligne est indentée alors qu\'elle n\'appartient à aucun bloc.',
          'retire les espaces au début de la ligne, ou place-la sous une ligne qui ouvre un bloc (page, si, pour…).')
      }
      if (this.voit().t === 'desindente') {
        this.avance()
        continue
      }
      corps.push(this.instruction())
    }
    return corps
  }

  private bloc(quoi: string): Instr[] {
    if (this.voit().t !== 'indente') {
      throw this.erreur(this.voit(), `${quoi} attend un bloc indenté en dessous.`,
        'passe à la ligne et indente de 2 espaces le contenu du bloc.')
    }
    this.avance()
    const corps: Instr[] = []
    while (this.voit().t !== 'desindente' && this.voit().t !== 'fin') {
      if (this.voit().t === 'ligne') {
        this.avance()
        continue
      }
      if (this.voit().t === 'indente') {
        throw this.erreur(this.voit(), 'cette ligne est trop indentée.', 'aligne-la avec la ligne au-dessus.')
      }
      corps.push(this.instruction())
    }
    if (this.voit().t === 'desindente') this.avance()
    return corps
  }

  private blocOptionnel(): Instr[] {
    return this.voit().t === 'indente' ? this.bloc('cette ligne') : []
  }

  // ---------- instructions ----------
  private instruction(): Instr {
    const t = this.voit()
    if (t.t === 'mot') {
      const c = canon(t.v)
      switch (c) {
        case 'soit':
        case 'etat':
          return this.declaration(c === 'etat')
        case 'fonction':
          return this.fonction()
        case 'si':
          return this.si()
        case 'sinon':
          throw this.erreur(t, '« sinon » sans « si » juste au-dessus.', 'place « sinon » au même niveau que son « si », juste après le bloc du « si ».')
        case 'pour':
          return this.pour()
        case 'tant':
          if (this.estMot('que', 1)) return this.tantQue()
          break
        case 'essaie':
          return this.essaie()
        case 'importe':
          return this.importe()
        case 'exporte':
          return this.exporte()
        case 'retourne': {
          this.avance()
          const valeur = this.voit().t === 'ligne' || this.voit().t === 'fin' ? undefined : this.expression(LIBRE)
          this.finDeLigne()
          return { k: 'retourne', valeur, pos: this.pos(t) }
        }
        case 'arrete':
          this.avance()
          this.finDeLigne()
          return { k: 'arrete', pos: this.pos(t) }
        case 'continue':
          if (this.voit(1).t === 'ligne' || this.voit(1).t === 'fin') {
            this.avance()
            this.finDeLigne()
            return { k: 'continue', pos: this.pos(t) }
          }
          break
        case 'ouvre':
        case 'ferme':
        case 'bascule':
          if (this.voit(1).t === 'mot' && this.voit(1).espaceAvant && !this.estAffectationApres()) {
            this.avance()
            const cible = this.expression(SIMPLE)
            this.finDeLigne()
            return { k: 'bascule', mode: c, cible, pos: this.pos(t) }
          }
          break
        case 'aller':
          if (!this.estAffectationApres()) {
            this.avance()
            const chemin = this.expression(LIBRE)
            this.finDeLigne()
            return { k: 'aller', chemin, pos: this.pos(t) }
          }
          break
        case 'js': {
          this.avance()
          const brut = this.voit()
          if (brut.t !== 'brut') throw this.erreur(t, '« js » doit être seul sur sa ligne, avec le code JavaScript indenté dessous.')
          this.avance()
          this.finDeLigne()
          return { k: 'js', code: brut.v, pos: this.pos(t) }
        }
        case 'composant':
          return this.composant()
        case 'page':
          return this.page()
        case 'site':
          if (!this.estAffectationApres()) return this.site()
          break
      }
      if (this.estTeteInterface()) return this.commande()
    }
    // expression ou affectation
    const e = this.expression(LIBRE)
    const op = this.voit()
    if (op.t === 'op' && OPS_AFFECTATION.has(op.v)) {
      if (e.k !== 'nom' && e.k !== 'membre' && e.k !== 'index') {
        throw this.erreur(op, 'on ne peut rien ranger à gauche de ce « = ».', 'à gauche d\'un « = », il faut un nom : total = 3.')
      }
      this.avance()
      const valeur = this.expression(LIBRE)
      this.finDeLigne()
      return { k: 'affecte', cible: e, op: op.v, valeur, pos: this.pos(t) }
    }
    if (op.t === 'op' && op.v === '->') {
      throw this.erreur(op, '« -> » doit suivre un élément d\'interface ou un paramètre.',
        'exemples : bouton "Ok" -> compteur += 1   ou   somme liste, a -> a.prix')
    }
    if (this.voit().t === 'indente' || (this.voit().t === 'ligne' && this.voit(1).t === 'indente')) {
      // souvent un élément mal écrit : « secion » au lieu de « section »
      const mot = e.k === 'nom' ? e.nom : e.k === 'appel' && e.fn.k === 'nom' ? e.fn.nom : undefined
      const sug = mot ? proche(mot, [...TETES_INTERFACE, 'composant', 'fonction', 'page', 'site', 'pour', 'si']) : undefined
      if (mot && sug) {
        throw new ErreurKaury({ ...e.pos, longueur: mot.length }, `« ${mot} » n'est pas un mot de Kaury.`, `tu voulais dire « ${sug} » ?`)
      }
      throw this.erreur(this.voit(), 'ce bloc indenté n\'appartient à rien.',
        'seuls page, section, si, pour, fonction… ouvrent un bloc. Retire l\'indentation.')
    }
    this.finDeLigne()
    return { k: 'expr', e, pos: this.pos(t) }
  }

  /** Le jeton suivant est-il une affectation (« site = 3 ») ? */
  private estAffectationApres(): boolean {
    const s = this.voit(1)
    return s.t === 'op' && (OPS_AFFECTATION.has(s.v) || ((s.v === '.' || s.v === '(' || s.v === '[') && !s.espaceAvant))
  }

  private estTeteInterface(): boolean {
    const t = this.voit()
    if (t.t !== 'mot') return false
    const s = this.voit(1)
    // « titre = 3 », « titre.x », « titre(…) » : ce sont des noms, pas des éléments
    if (s.t === 'op' && !['->', ',', '-', '[', '{', '('].includes(s.v)) return false
    if (s.t === 'op' && (s.v === '(' || s.v === '[') && !s.espaceAvant) return false
    if (s.t === 'op' && s.v === '-' && s.espaceAvant) return false
    const c = canon(t.v)
    if (c && TETES_INTERFACE.has(c)) return true
    // Composant : nom en majuscule
    if (/^\p{Lu}/u.test(t.v)) {
      if (s.t === 'op' && (s.v === '.' || s.v === '(')) return false
      return true
    }
    return false
  }

  private declaration(reactif: boolean): Instr {
    const t = this.avance()
    const nom = this.attendsNom(reactif ? 'cet état' : 'cette variable', reactif ? 'etat compteur = 0' : 'soit tva = 8.1')
    if (!this.estOp('=')) {
      throw this.erreur(this.voit(), `il manque « = » après « ${nom.v} ».`, `${reactif ? 'etat' : 'soit'} ${nom.v} = 0`)
    }
    this.avance()
    const valeur = this.expressionOuBlocObjet()
    this.finDeLigne()
    return { k: 'soit', nom: nom.v, valeur, reactif, pos: this.pos(t) }
  }

  /** Après « = » : une expression, ou un objet écrit en bloc indenté (clé valeur par ligne). */
  private expressionOuBlocObjet(): Expr {
    return this.expression(LIBRE)
  }

  private params(fin: (t: Jeton) => boolean): Param[] {
    const params: Param[] = []
    while (!fin(this.voit())) {
      const p = this.voit()
      if (p.t !== 'mot') throw this.erreur(p, `un paramètre doit être un nom (je vois ${this.decrit(p)}).`, 'fonction double x puis x * 2')
      this.avance()
      let defaut: Expr | undefined
      if (this.estOp('=')) {
        this.avance()
        defaut = this.expression(SIMPLE)
      }
      params.push({ nom: p.v, defaut, pos: this.pos(p) })
      if (this.estOp(',')) this.avance()
    }
    return params
  }

  private fonction(): Instr {
    const t = this.avance()
    const nom = this.attendsNom('la fonction', 'fonction double x puis x * 2')
    const params = this.params((j) => j.t === 'ligne' || j.t === 'fin' || (j.t === 'mot' && canon(j.v) === 'puis'))
    let corps: Instr[]
    if (this.estMot('puis')) {
      const p = this.avance()
      const e = this.expression(LIBRE)
      corps = [{ k: 'retourne', valeur: e, pos: this.pos(p) }]
      this.finDeLigne()
    } else {
      this.finDeLigne()
      corps = this.bloc(`la fonction « ${nom.v} »`)
    }
    return { k: 'fonction', nom: nom.v, params, corps, pos: this.pos(t) }
  }

  private corpsSi(quoi: string): Instr[] {
    // forme courte : « si x > 3 puis compteur += 1 »
    if (this.estMot('puis')) {
      this.avance()
      return [this.instruction()]
    }
    this.finDeLigne(`après la condition, passe à la ligne (ou écris « puis » pour une action sur la même ligne).`)
    return this.bloc(quoi)
  }

  private si(): Instr {
    const t = this.avance()
    const cond = this.condition()
    const alors = this.corpsSi('« si »')
    const sinonSi: { cond: Expr; corps: Instr[]; pos: Pos }[] = []
    let sinon: Instr[] | undefined
    while (this.estMot('sinon')) {
      const s = this.avance()
      if (this.estMot('si')) {
        this.avance()
        const c = this.condition()
        sinonSi.push({ cond: c, corps: this.corpsSi('« sinon si »'), pos: this.pos(s) })
      } else {
        sinon = this.corpsSi('« sinon »')
        break
      }
    }
    return { k: 'si', cond, alors, sinonSi, sinon, pos: this.pos(t) }
  }

  private condition(): Expr {
    const e = this.expression(LIBRE)
    if (this.estOp('=')) {
      throw this.erreur(this.voit(), '« = » range une valeur ; il ne compare pas.', 'pour comparer, écris « == ».')
    }
    return e
  }

  private pour(): Instr {
    const t = this.avance()
    const v = this.attendsNom('la variable de la boucle', 'pour p dans produits')
    let index: string | undefined
    if (this.estOp(',')) {
      this.avance()
      index = this.attendsNom('le numéro de tour', 'pour p, i dans produits').v
    }
    this.attendsMotCle('dans', `pour ${v.v} dans liste`)
    const source = this.expression(LIBRE)
    this.finDeLigne()
    const corps = this.bloc('« pour »')
    return { k: 'pour', variable: v.v, index, source, corps, pos: this.pos(t) }
  }

  private tantQue(): Instr {
    const t = this.avance()
    this.avance() // que
    const cond = this.condition()
    this.finDeLigne()
    const corps = this.bloc('« tant que »')
    return { k: 'tantque', cond, corps, pos: this.pos(t) }
  }

  private essaie(): Instr {
    const t = this.avance()
    this.finDeLigne()
    const corps = this.bloc('« essaie »')
    let variable: string | undefined
    let erreur: Instr[] | undefined
    if (this.estMot('erreur')) {
      this.avance()
      if (this.voit().t === 'mot') variable = this.avance().v
      this.finDeLigne()
      erreur = this.bloc('« erreur »')
    }
    return { k: 'essaie', corps, variable, erreur, pos: this.pos(t) }
  }

  private importe(): Instr {
    const t = this.avance()
    const pos = this.pos(t)
    if (this.voit().t === 'texte') {
      const source = this.avance().v
      this.finDeLigne()
      return { k: 'importe', source, pos }
    }
    let defaut: string | undefined
    let noms: { nom: string; alias?: string }[] | undefined
    let tout: string | undefined
    if (this.estOp('{')) {
      this.avance()
      noms = []
      while (!this.estOp('}')) {
        const n = this.attendsNom('l\'élément à importer', 'importe { a, b } de "paquet"')
        let alias: string | undefined
        if (this.estMot('comme')) {
          this.avance()
          alias = this.attendsNom('le nouveau nom').v
        }
        noms.push({ nom: n.v, alias })
        if (this.estOp(',')) this.avance()
      }
      this.avance()
    } else if (this.estOp('*')) {
      this.avance()
      this.attendsMotCle('comme', 'importe * comme THREE de "three"')
      tout = this.attendsNom('le module').v
    } else {
      defaut = this.attendsNom('ce qu\'on importe', 'importe confetti de "canvas-confetti"').v
    }
    this.attendsMotCle('de', 'importe confetti de "canvas-confetti"')
    const s = this.voit()
    if (s.t !== 'texte') throw this.erreur(s, 'le nom du paquet ou du fichier doit être un texte.', 'importe confetti de "canvas-confetti"')
    this.avance()
    this.finDeLigne()
    return { k: 'importe', defaut, noms, tout, source: s.v, pos }
  }

  private exporte(): Instr {
    const t = this.avance()
    const d = this.instruction()
    if (d.k === 'soit' || d.k === 'fonction' || d.k === 'composant') {
      d.exporte = true
      return d
    }
    throw this.erreur(t, 'on ne peut exporter qu\'une variable, une fonction ou un composant.', 'exporte composant Carte nom')
  }

  private composant(): Instr {
    const t = this.avance()
    const nom = this.attendsNom('le composant', 'composant Carte nom image')
    if (!/^\p{Lu}/u.test(nom.v)) {
      throw this.erreur(nom, `un composant commence par une majuscule : « ${nom.v} ».`,
        `composant ${nom.v[0].toUpperCase() + nom.v.slice(1)}`)
    }
    const params = this.params((j) => j.t === 'ligne' || j.t === 'fin')
    this.finDeLigne()
    const corps = this.bloc(`le composant « ${nom.v} »`)
    return { k: 'composant', nom: nom.v, params, corps, pos: this.pos(t) }
  }

  private page(): Instr {
    const t = this.avance()
    const c = this.voit()
    if (c.t !== 'texte') throw this.erreur(c, 'une page a besoin de son adresse entre guillemets.', 'page "/"   ou   page "/boutique"')
    this.avance()
    if (!c.v.startsWith('/')) throw this.erreur(c, `l'adresse d'une page commence par « / » : « ${c.v} ».`, `page "/${c.v}"`)
    this.finDeLigne()
    const corps = this.bloc(`la page « ${c.v} »`)
    return { k: 'page', chemin: c.v, corps, pos: this.pos(t) }
  }

  private site(): Instr {
    const t = this.avance()
    let nom: Expr | undefined
    if (this.voit().t !== 'ligne') nom = this.expression(SIMPLE)
    this.finDeLigne()
    const corps = this.blocOptionnel()
    return { k: 'site', nom, corps, pos: this.pos(t) }
  }

  // ---------- lignes d'interface ----------
  private commande(): Commande {
    const t = this.avance()
    let tete = canon(t.v) ?? t.v
    if (/^\p{Lu}/u.test(t.v)) tete = t.v
    // mots composés
    const composes: Record<string, string[]> = {
      au: ['clic', 'survol', 'defilement', 'chargement'],
      suit: ['souris'],
      entre: ['depuis'],
    }
    if (composes[tete]) {
      const s = this.voit()
      const cs = s.t === 'mot' ? canon(s.v) : undefined
      if (cs && composes[tete].includes(cs)) {
        this.avance()
        tete = `${tete}-${cs}`
      } else if (tete === 'au') {
        throw this.erreur(s, `« au » doit être suivi de clic, survol, defilement ou chargement.`, 'au clic -> saute')
      }
    }
    const items: Item[] = []
    let action: Instr[] | undefined
    let enfants: Instr[] = []
    while (true) {
      const v = this.voit()
      if (v.t === 'ligne' || v.t === 'fin' || v.t === 'indente' || v.t === 'desindente') break
      if (v.t === 'op' && v.v === '->') break
      if (v.t === 'op' && v.v === ',') {
        if (!items.length && !tete.includes('-')) throw this.erreur(v, 'virgule inattendue juste après le mot de tête.', `${t.v} "contenu", option`)
        this.avance()
        continue
      }
      items.push(this.item())
      const n = this.voit()
      if (n.t === 'op' && n.v === ',') {
        this.avance()
        if (this.voit().t === 'ligne') throw this.erreur(n, 'cette ligne finit par une virgule.', 'retire la virgule, ou ajoute l\'option qui manque.')
      }
    }
    if (this.estOp('->')) {
      const fleche = this.avance()
      if (this.voit().t === 'ligne') {
        this.avance()
        action = this.bloc('« -> »')
      } else if (this.voit().t === 'fin') {
        throw this.erreur(fleche, '« -> » doit être suivi d\'une action.', `${t.v} -> compteur += 1`)
      } else {
        action = [this.instruction()]
        enfants = this.blocOptionnel()
      }
    } else {
      this.finDeLigne()
      enfants = this.blocOptionnel()
    }
    return { k: 'commande', tete, teteBrute: t.v, items, action, enfants, pos: this.pos(t) }
  }

  private item(): Item {
    const debut = this.voit()
    const atomes: Expr[] = []
    while (true) {
      const v = this.voit()
      if (v.t === 'ligne' || v.t === 'fin' || v.t === 'indente' || v.t === 'desindente') break
      if (v.t === 'op' && (v.v === ',' || v.v === '->')) break
      if (v.t === 'op' && v.v === ')') throw this.erreur(v, '« ) » sans « ( ».')
      atomes.push(this.expression(ITEM))
    }
    return { atomes, pos: this.pos(debut) }
  }

  // ---------- expressions ----------
  expression(f: Drapeaux): Expr {
    // lambda : « a -> … » ou « (a, b) -> … »
    if (!f.item) {
      const t = this.voit()
      if (t.t === 'op' && t.v === '->') {
        this.avance()
        return { k: 'lambda', params: [], corps: this.corpsLambda(), pos: this.pos(t) }
      }
      if (t.t === 'mot' && this.estOp('->', 1)) {
        this.avance()
        this.avance()
        return { k: 'lambda', params: [t.v], corps: this.corpsLambda(), pos: this.pos(t) }
      }
      if (t.t === 'op' && t.v === '(') {
        const fin = this.parentheseFermante()
        if (fin > 0 && this.j[fin + 1]?.t === 'op' && this.j[fin + 1].v === '->') {
          this.avance()
          const params: string[] = []
          while (!this.estOp(')')) {
            params.push(this.attendsNom('un paramètre').v)
            if (this.estOp(',')) this.avance()
          }
          this.avance()
          this.avance()
          return { k: 'lambda', params, corps: this.corpsLambda(), pos: this.pos(t) }
        }
      }
    }
    return this.siExpression(f)
  }

  private corpsLambda(): Expr | Instr[] {
    if (this.voit().t === 'ligne' && this.voit(1).t === 'indente') {
      this.avance()
      return this.bloc('cette fonction')
    }
    if (this.voit().t === 'mot' && this.estTeteAction()) {
      return [this.instruction()]
    }
    return this.expression(LIBRE)
  }

  /** Dans une lambda, une affectation « -> total += 1 » est une action. */
  private estTeteAction(): boolean {
    let k = this.i
    let prof = 0
    while (k < this.j.length) {
      const t = this.j[k]
      if (t.t === 'ligne' || t.t === 'fin') return false
      if (t.t === 'op') {
        if ('([{'.includes(t.v)) prof++
        else if (')]}'.includes(t.v)) {
          if (prof === 0) return false
          prof--
        } else if (prof === 0 && t.v === ',') return false
        else if (prof === 0 && OPS_AFFECTATION.has(t.v)) return true
      }
      k++
    }
    return false
  }

  private parentheseFermante(): number {
    let p = 0
    for (let k = this.i; k < this.j.length; k++) {
      const t = this.j[k]
      if (t.t === 'op' && '([{'.includes(t.v)) p++
      if (t.t === 'op' && ')]}'.includes(t.v)) {
        p--
        if (p === 0) return k
      }
      if (t.t === 'ligne' || t.t === 'fin') return -1
    }
    return -1
  }

  private siExpression(f: Drapeaux): Expr {
    if (this.estMot('si')) {
      const t = this.avance()
      const cond = this.ou(f)
      this.attendsMotCle('alors', 'si age >= 18 alors "adulte" sinon "enfant"')
      const alors = this.ou(f)
      this.attendsMotCle('sinon', 'si age >= 18 alors "adulte" sinon "enfant"')
      const sinon = this.siExpression(f)
      return { k: 'si', cond, alors, sinon, pos: this.pos(t) }
    }
    return this.ou(f)
  }

  private ou(f: Drapeaux): Expr {
    let g = this.et(f)
    while (this.estMot('ou') || this.estOp('??')) {
      const t = this.avance()
      const op = t.v === '??' ? '??' : '||'
      g = { k: 'binaire', op, g, d: this.et(f), pos: this.pos(t) }
    }
    return g
  }

  private et(f: Drapeaux): Expr {
    let g = this.non(f)
    while (this.estMot('et')) {
      const t = this.avance()
      g = { k: 'binaire', op: '&&', g, d: this.non(f), pos: this.pos(t) }
    }
    return g
  }

  private non(f: Drapeaux): Expr {
    if (this.estMot('non') || (this.estOp('!'))) {
      const t = this.avance()
      return { k: 'unaire', op: '!', e: this.non(f), pos: this.pos(t) }
    }
    return this.comparaison(f)
  }

  private comparaison(f: Drapeaux): Expr {
    let g = this.intervalle(f)
    while (true) {
      const t = this.voit()
      if (t.t === 'op' && ['==', '!=', '<', '>', '<=', '>='].includes(t.v)) {
        this.avance()
        g = { k: 'binaire', op: t.v, g, d: this.intervalle(f), pos: this.pos(t) }
      } else if (t.t === 'mot' && canon(t.v) === 'dans' && !f.item && this.dansEstOperateur()) {
        this.avance()
        g = { k: 'binaire', op: 'dans', g, d: this.intervalle(f), pos: this.pos(t) }
      } else break
    }
    return g
  }

  private dansEstOperateur(): boolean {
    // « pour p dans … » est géré par pour() ; ici « x dans liste » = appartenance
    return true
  }

  private intervalle(f: Drapeaux): Expr {
    const g = this.additif(f)
    if (this.estOp('..')) {
      const t = this.avance()
      return { k: 'intervalle', de: g, a: this.additif(f), pos: this.pos(t) }
    }
    return g
  }

  private additif(f: Drapeaux): Expr {
    let g = this.multiplicatif(f)
    while (this.estOp('+') || this.estOp('-')) {
      const t = this.avance()
      g = { k: 'binaire', op: t.v, g, d: this.multiplicatif(f), pos: this.pos(t) }
    }
    return g
  }

  private multiplicatif(f: Drapeaux): Expr {
    let g = this.puissance(f)
    while (this.estOp('*') || this.estOp('/') || this.estOp('%')) {
      const t = this.avance()
      g = { k: 'binaire', op: t.v, g, d: this.puissance(f), pos: this.pos(t) }
    }
    return g
  }

  private puissance(f: Drapeaux): Expr {
    const g = this.unaire(f)
    if (this.estOp('**')) {
      const t = this.avance()
      return { k: 'binaire', op: '**', g, d: this.puissance(f), pos: this.pos(t) }
    }
    return g
  }

  private unaire(f: Drapeaux): Expr {
    const t = this.voit()
    if (t.t === 'op' && t.v === '-') {
      this.avance()
      return { k: 'unaire', op: '-', e: this.unaire(f), pos: this.pos(t) }
    }
    if (t.t === 'op' && t.v === '...') {
      this.avance()
      return { k: 'etale', e: this.unaire(f), pos: this.pos(t) }
    }
    if (t.t === 'mot' && canon(t.v) === 'attends') {
      this.avance()
      return { k: 'attends', e: this.unaire({ ...f, implicite: !f.item }), pos: this.pos(t) }
    }
    return this.postfixe(f)
  }

  private postfixe(f: Drapeaux): Expr {
    let e = this.primaire(f)
    while (true) {
      const t = this.voit()
      if (t.t === 'op' && (t.v === '.' || t.v === '?.') && !t.espaceAvant) {
        this.avance()
        const p = this.voit()
        if (p.t !== 'mot') throw this.erreur(p, `après « ${t.v} », il faut un nom de propriété.`, 'produit.prix')
        this.avance()
        e = { k: 'membre', objet: e, prop: p.v, optionnel: t.v === '?.', pos: this.pos(p) }
      } else if (t.t === 'op' && t.v === '(' && !t.espaceAvant) {
        this.avance()
        const args: Expr[] = []
        while (!this.estOp(')')) {
          args.push(this.expression(LIBRE))
          if (this.estOp(',')) this.avance()
          else if (!this.estOp(')')) throw this.erreur(this.voit(), 'il manque « , » ou « ) » dans cet appel.', 'f(a, b)')
        }
        this.avance()
        e = { k: 'appel', fn: e, args, pos: this.pos(t) }
      } else if (t.t === 'op' && t.v === '[' && !t.espaceAvant) {
        this.avance()
        const index = this.expression(LIBRE)
        this.attendsOp(']')
        e = { k: 'index', objet: e, index, pos: this.pos(t) }
      } else break
    }
    // appel implicite : « affiche total », « somme panier, a -> a.prix »
    if (f.implicite && (e.k === 'nom' || e.k === 'membre') && this.debutArgument()) {
      const args: Expr[] = []
      do {
        if (this.estOp(',')) this.avance()
        args.push(this.expression(LIBRE))
      } while (this.estOp(','))
      e = { k: 'appel', fn: e, args, pos: e.pos }
    }
    return e
  }

  private debutArgument(): boolean {
    const t = this.voit()
    if (!t.espaceAvant) return false
    if (t.t === 'nombre' || t.t === 'texte' || t.t === 'couleur') return true
    if (t.t === 'mot') {
      const c = canon(t.v)
      if (c && MOTS_INFIXES.has(c)) return false
      return true
    }
    if (t.t === 'op' && (t.v === '[' || t.v === '{' || t.v === '(' || t.v === '...')) return true
    if (t.t === 'op' && t.v === '->') return true
    return false
  }

  private primaire(f: Drapeaux): Expr {
    const t = this.voit()
    switch (t.t) {
      case 'nombre':
        this.avance()
        return { k: 'nombre', v: Number(t.v), unite: t.unite, pos: this.pos(t) }
      case 'couleur':
        this.avance()
        return { k: 'couleur', v: t.v, pos: this.pos(t) }
      case 'texte': {
        this.avance()
        const morceaux: (string | Expr)[] = []
        for (const m of t.morceaux ?? []) {
          if (m.code !== undefined) morceaux.push(analyseExpressionDans(m.code, m.ligne!, m.colonne!))
          else morceaux.push(m.texte ?? '')
        }
        return { k: 'texte', morceaux, pos: this.pos(t) }
      }
      case 'mot': {
        const c = canon(t.v)
        if (c === 'vrai' || c === 'faux') {
          this.avance()
          return { k: 'bool', v: c === 'vrai', pos: this.pos(t) }
        }
        if (c === 'rien') {
          this.avance()
          return { k: 'rien', pos: this.pos(t) }
        }
        if (c === 'si') return this.siExpression(f)
        this.avance()
        return { k: 'nom', nom: t.v, pos: this.pos(t) }
      }
      case 'op': {
        if (t.v === '(') {
          this.avance()
          const e = this.expression(LIBRE)
          this.attendsOp(')')
          return e
        }
        if (t.v === '[') {
          this.avance()
          const elements: Expr[] = []
          while (!this.estOp(']')) {
            elements.push(this.expression(LIBRE))
            if (this.estOp(',')) this.avance()
            else if (!this.estOp(']')) throw this.erreur(this.voit(), 'il manque « , » entre deux éléments de la liste.', '[1, 2, 3]')
          }
          this.avance()
          return { k: 'liste', elements, pos: this.pos(t) }
        }
        if (t.v === '{') {
          this.avance()
          const props: { cle: string; valeur: Expr; etale?: boolean }[] = []
          while (!this.estOp('}')) {
            if (this.estOp('...')) {
              const s = this.avance()
              props.push({ cle: '', valeur: this.expression(LIBRE), etale: true })
              void s
            } else {
              const k = this.voit()
              if (k.t !== 'mot' && k.t !== 'texte' && k.t !== 'nombre') throw this.erreur(k, 'une clé d\'objet doit être un nom.', '{ nom: "Fraise", prix: 4 }')
              this.avance()
              if (this.estOp(':')) {
                this.avance()
                props.push({ cle: k.v, valeur: this.expression(LIBRE) })
              } else if (k.t === 'mot') {
                props.push({ cle: k.v, valeur: { k: 'nom', nom: k.v, pos: this.pos(k) } })
              } else throw this.erreur(this.voit(), `il manque « : » après la clé « ${k.v} ».`, '{ nom: "Fraise" }')
            }
            if (this.estOp(',')) this.avance()
            else if (!this.estOp('}')) throw this.erreur(this.voit(), 'il manque « , » entre deux propriétés.', '{ nom: "Fraise", prix: 4 }')
          }
          this.avance()
          return { k: 'objet', props, pos: this.pos(t) }
        }
        if (t.v === '->') {
          throw this.erreur(t, '« -> » sans paramètre devant.', 'x -> x * 2')
        }
        break
      }
    }
    throw this.erreur(t, `je m'attendais à une valeur, mais je vois ${this.decrit(t)}.`,
      t.t === 'indente' ? 'cette ligne est peut-être trop indentée.' : 'un nombre, un "texte", un nom, une [liste] ou un {objet}.')
  }
}
