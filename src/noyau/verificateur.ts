// Étape 3 — le vérificateur : repère les fautes et les explique en clair.
// Il relie aussi chaque nom à sa déclaration et donne un sens à chaque ligne d'interface.

import { ErreurKaury, proche } from './erreurs.js'
import type { Commande, Expr, GenreLiaison, Instr, Liaison, OptionResolue, Pos } from './arbre.js'
import { canon, MOTS_RESERVES } from './mots.js'
import {
  CAMERAS, couleurConnue, ELEMENTS, EVENEMENTS, LUMIERES, MOTS_MOUVEMENT, MOUVEMENTS, optionElement, optionStyle,
  REGLAGES, specOption, toutesOptions, TRANSITIONS,
} from './vocabulaire.js'
import { GLOBAUX_JS, globalKaury, nomsGlobaux } from './globaux.js'

type GenrePortee = 'module' | 'page' | 'composant' | 'fonction' | 'bloc' | 'lambda' | 'action'

class Portee {
  noms = new Map<string, Liaison>()
  constructor(public genre: GenrePortee, public parent?: Portee) {}
  cherche(nom: string): Liaison | undefined {
    return this.noms.get(nom) ?? this.parent?.cherche(nom)
  }
  /** Portée qui reçoit les déclarations implicites (« x = 3 » sans soit). */
  hote(): Portee {
    let p: Portee = this
    while (p.genre === 'bloc' && p.parent) p = p.parent
    if (p.genre === 'action') {
      // une action range ses nouveaux états dans la page ou le composant qui la contient
      let q: Portee | undefined = p.parent
      while (q && q.genre !== 'page' && q.genre !== 'composant' && q.genre !== 'module') q = q.parent
      return q ?? p
    }
    return p
  }
  estVue(): boolean {
    return this.genre === 'module' || this.genre === 'page' || this.genre === 'composant'
  }
  tous(): string[] {
    return [...this.noms.keys(), ...(this.parent?.tous() ?? [])]
  }
}

export interface InfosModule {
  pages: { chemin: string; pos: Pos }[]
  composants: string[]
  immersion: boolean
  troisD: boolean
  lottie: boolean
  couleurs: Record<string, string>
  exports: string[]
}

export function verifie(programme: Instr[], options: { fichier?: string; composantsExternes?: string[] } = {}): {
  erreurs: ErreurKaury[]
  avertissements: ErreurKaury[]
  infos: InfosModule
} {
  const v = new Verificateur()
  v.fichier = options.fichier
  v.module(programme)
  for (const e of [...v.erreurs, ...v.avertissements]) e.fichier = options.fichier
  return { erreurs: v.erreurs, avertissements: v.avertissements, infos: v.infos }
}

class Verificateur {
  fichier?: string
  erreurs: ErreurKaury[] = []
  avertissements: ErreurKaury[] = []
  infos: InfosModule = { pages: [], composants: [], immersion: false, troisD: false, lottie: false, couleurs: {}, exports: [] }
  private composants = new Set<string>()

  private err(pos: Pos, quoi: string, essaie?: string) {
    this.erreurs.push(new ErreurKaury(pos, quoi, essaie))
  }
  private attention(pos: Pos, quoi: string, essaie?: string) {
    this.avertissements.push(new ErreurKaury(pos, quoi, essaie, 'avertissement'))
  }

  // ------------------------------------------------------------------
  module(prog: Instr[]) {
    const p = new Portee('module')
    // couleurs du site d'abord (elles servent d'options partout)
    for (const i of prog) if (i.k === 'site') this.lisCouleursSite(i.corps)
    this.hisse(prog, p)
    // les pages et composants s'affichent après le chargement du fichier :
    // on les vérifie en dernier, ils voient donc tout ce qui est déclaré dans le fichier
    const tardif = (i: Instr) => i.k === 'page' || i.k === 'composant' || i.k === 'site' || i.k === 'commande'
    this.instructions(prog.filter((i) => !tardif(i)), p)
    for (const i of prog.filter(tardif)) this.instruction(i, p)
    // pages en double
    const vues = new Map<string, Pos>()
    for (const pg of this.infos.pages) {
      if (vues.has(pg.chemin)) this.err(pg.pos, `la page « ${pg.chemin} » existe déjà (ligne ${vues.get(pg.chemin)!.ligne}).`, 'donne une adresse différente à chaque page.')
      vues.set(pg.chemin, pg.pos)
    }
    for (const [nom, l] of p.noms) {
      if (!l.utilise && l.genre === 'etat' && !this.infos.exports.includes(nom) && l.pos) {
        this.attention(l.pos, `l'état « ${nom} » n'est jamais utilisé.`, 'supprime-le, ou affiche-le quelque part.')
      }
    }
  }

  private lisCouleursSite(corps: Instr[]) {
    for (const i of corps) {
      if (i.k === 'commande' && i.tete === 'couleurs') {
        for (const it of i.items) {
          const [n, c] = it.atomes
          if (n?.k === 'nom' && c?.k === 'couleur') this.infos.couleurs[n.nom] = c.v
          else if (n?.k === 'nom' && c?.k === 'nom' && couleurConnue(c.nom)) this.infos.couleurs[n.nom] = `var(--k-${couleurConnue(c.nom)})`
          else this.err(it.pos, 'chaque couleur s\'écrit « nom #code ».', 'couleurs rose #FF4F8B, creme #FFF4E8')
        }
      }
    }
  }

  /** Déclare d'avance ce qu'un bloc définit (fonctions, composants, états…) pour l'utiliser avant sa ligne. */
  private hisse(corps: Instr[], p: Portee) {
    for (const i of corps) {
      switch (i.k) {
        case 'fonction':
          this.declare(p, i.nom, 'fonction', i.pos)
          if (i.exporte) this.infos.exports.push(i.nom)
          break
        case 'composant':
          this.declare(p, i.nom, 'composant', i.pos)
          this.composants.add(i.nom)
          this.infos.composants.push(i.nom)
          if (i.exporte) this.infos.exports.push(i.nom)
          break
        case 'importe':
          for (const n of [i.defaut, i.tout, ...(i.noms ?? []).map((x) => x.alias ?? x.nom)]) {
            if (n) {
              this.declare(p, n, /^\p{Lu}/u.test(n) && i.source.endsWith('.kaury') ? 'composant' : 'import', i.pos)
              if (/^\p{Lu}/u.test(n)) this.composants.add(n)
            }
          }
          break
      }
    }
  }

  private declare(p: Portee, nom: string, genre: GenreLiaison, pos: Pos): Liaison {
    if (MOTS_RESERVES.has(canon(nom) ?? '') && canon(nom) === nom) {
      this.err(pos, `« ${nom} » est un mot réservé de Kaury ; il ne peut pas servir de nom.`, `choisis un autre nom, par exemple « mon-${nom} ».`)
    }
    const deja = p.noms.get(nom)
    if (deja && deja.genre !== 'fonction' && genre !== 'variable' && deja.pos && deja.pos !== pos && p.genre !== 'module') {
      // redéclaration dans la même portée
      if (deja.genre === genre) {
        this.err(pos, `« ${nom} » est déjà déclaré ligne ${deja.pos.ligne}.`, `pour changer sa valeur, écris simplement « ${nom} = … ».`)
      }
    }
    const l: Liaison = { genre, nom, pos }
    p.noms.set(nom, l)
    return l
  }

  // ------------------------------------------------------------------
  private instructions(corps: Instr[], p: Portee) {
    // déclarations implicites : « total = 0 » sans soit/etat
    this.hisseImplicites(corps, p)
    for (const i of corps) this.instruction(i, p)
  }

  private hisseImplicites(corps: Instr[], p: Portee) {
    const hote = p.hote()
    // les noms déclarés explicitement (soit / etat) ne sont jamais des déclarations implicites
    const explicites = new Set<string>()
    const cherche = (liste: Instr[]) => {
      for (const i of liste) {
        if (i.k === 'soit') explicites.add(i.nom)
        else if (i.k === 'si') {
          cherche(i.alors)
          i.sinonSi.forEach((x) => cherche(x.corps))
          if (i.sinon) cherche(i.sinon)
        } else if (i.k === 'pour' || i.k === 'tantque') cherche(i.corps)
        else if (i.k === 'essaie') {
          cherche(i.corps)
          if (i.erreur) cherche(i.erreur)
        } else if (i.k === 'commande' && hote.estVue()) cherche(i.enfants)
      }
    }
    cherche(corps)
    const parcours = (liste: Instr[], dansAction: boolean) => {
      for (const i of liste) {
        if (i.k === 'affecte' && i.cible.k === 'nom' && i.op === '=') {
          const nom = i.cible.nom
          if (!p.cherche(nom) && !explicites.has(nom) && !globalKaury(nom) && !GLOBAUX_JS.has(nom)) {
            const vue = hote.estVue()
            const l = this.declare(hote, nom, vue ? 'etat' : 'variable', i.pos)
            l.modifie = true
            i.declare = l
            void dansAction
          }
        }
        if (i.k === 'si') {
          parcours(i.alors, dansAction)
          for (const s of i.sinonSi) parcours(s.corps, dansAction)
          if (i.sinon) parcours(i.sinon, dansAction)
        } else if (i.k === 'pour' || i.k === 'tantque') parcours(i.corps, dansAction)
        else if (i.k === 'essaie') {
          parcours(i.corps, dansAction)
          if (i.erreur) parcours(i.erreur, dansAction)
        } else if (i.k === 'commande' && hote.estVue()) {
          parcours(i.enfants, dansAction)
          if (i.action) parcours(i.action, true)
        }
      }
    }
    parcours(corps, false)
  }

  private instruction(i: Instr, p: Portee) {
    switch (i.k) {
      case 'soit': {
        this.expr(i.valeur, p)
        let genre: GenreLiaison = i.reactif ? 'etat' : 'fixe'
        if (!i.reactif && p.hote().estVue() && this.litDuReactif(i.valeur, p)) genre = 'derive'
        if (i.reactif && !p.hote().estVue() && p.genre !== 'bloc') {
          // un état dans une fonction : autorisé, mais local
        }
        const l = this.declare(p, i.nom, genre, i.pos)
        i.liaison = l
        if (i.exporte) this.infos.exports.push(i.nom)
        break
      }
      case 'affecte': {
        this.expr(i.valeur, p)
        if (i.cible.k === 'nom') {
          const l = i.declare ?? p.cherche(i.cible.nom)
          if (!l) {
            this.nomInconnu(i.cible.nom, i.cible.pos, p)
          } else {
            i.cible.liaison = l
            l.modifie = true
            if (!i.declare) l.utilise = true
            if (l.genre === 'fixe' || l.genre === 'derive') {
              this.err(i.pos, `« ${i.cible.nom} » est déclaré avec « soit » : sa valeur est fixe.`,
                `déclare-le avec « etat ${i.cible.nom} = … » pour pouvoir le changer.`)
            } else if (l.genre === 'fonction' || l.genre === 'composant') {
              this.err(i.pos, `« ${i.cible.nom} » est une ${l.genre}, on ne peut pas lui donner une valeur.`, 'choisis un autre nom de variable.')
            } else if (l.genre === 'prop') {
              this.err(i.pos, `« ${i.cible.nom} » est un paramètre du composant : il vient de l'extérieur et ne se modifie pas ici.`,
                `copie-le dans un état : etat ${i.cible.nom}-local = ${i.cible.nom}`)
            }
          }
        } else this.expr(i.cible, p)
        break
      }
      case 'fonction': {
        const f = new Portee('fonction', p)
        for (const prm of i.params) {
          if (prm.defaut) this.expr(prm.defaut, p)
          this.declare(f, prm.nom, 'param', prm.pos)
        }
        this.hisse(i.corps, f)
        this.instructions(i.corps, f)
        break
      }
      case 'si': {
        this.expr(i.cond, p)
        this.bloc(i.alors, p)
        for (const s of i.sinonSi) {
          this.expr(s.cond, p)
          this.bloc(s.corps, p)
        }
        if (i.sinon) this.bloc(i.sinon, p)
        break
      }
      case 'pour': {
        this.expr(i.source, p)
        const b = new Portee('bloc', p)
        this.declare(b, i.variable, 'boucle', i.pos)
        if (i.index) this.declare(b, i.index, 'boucle', i.pos)
        this.hisse(i.corps, b)
        this.instructions(i.corps, b)
        break
      }
      case 'tantque':
        this.expr(i.cond, p)
        this.bloc(i.corps, p)
        break
      case 'essaie': {
        this.bloc(i.corps, p)
        if (i.erreur) {
          const b = new Portee('bloc', p)
          if (i.variable) this.declare(b, i.variable, 'variable', i.pos)
          this.instructions(i.erreur, b)
        }
        break
      }
      case 'importe':
        break
      case 'retourne':
        if (i.valeur) this.expr(i.valeur, p)
        break
      case 'arrete':
      case 'continue':
        break
      case 'expr':
        this.expr(i.e, p)
        break
      case 'bascule': {
        this.expr(i.cible, p)
        if (i.cible.k === 'nom' && i.cible.liaison) i.cible.liaison.modifie = true
        break
      }
      case 'aller':
        this.expr(i.chemin, p)
        break
      case 'js':
        break
      case 'composant': {
        const c = new Portee('composant', p)
        for (const prm of i.params) {
          if (prm.defaut) this.expr(prm.defaut, p)
          this.declare(c, prm.nom, 'prop', prm.pos)
        }
        this.hisse(i.corps, c)
        this.instructions(i.corps, c)
        break
      }
      case 'page': {
        this.infos.pages.push({ chemin: i.chemin, pos: i.pos })
        const pg = new Portee('page', p)
        // paramètres d'adresse : page "/produit/:id" → id
        for (const m of i.chemin.matchAll(/:([\p{L}_][\p{L}\p{N}_-]*)/gu)) this.declare(pg, m[1], 'fixe', i.pos)
        this.hisse(i.corps, pg)
        this.instructions(i.corps, pg)
        break
      }
      case 'site': {
        if (i.nom) this.expr(i.nom, p)
        for (const c of i.corps) {
          if (c.k !== 'commande' || !['couleurs', 'police', 'polices', 'langue', 'favicon', 'seo', 'style', 'transition', 'mobile', 'tablette', 'ordinateur', 'son'].includes(c.tete)) {
            this.err(c.pos, 'dans « site », on ne met que des réglages : couleurs, police, langue, favicon, seo, style, transition.',
              'déplace cet élément dans une page "/".')
            continue
          }
          this.commande(c, p, 'site')
        }
        break
      }
      case 'commande':
        this.commande(i, p, undefined)
        break
    }
  }

  private bloc(corps: Instr[], p: Portee) {
    const b = new Portee('bloc', p)
    this.hisse(corps, b)
    this.instructions(corps, b)
  }

  /** L'expression lit-elle un état (directement ou via un dérivé) ? */
  private litDuReactif(e: Expr, p: Portee): boolean {
    let oui = false
    const voit = (x: Expr) => {
      if (oui) return
      switch (x.k) {
        case 'nom': {
          const l = x.liaison ?? p.cherche(x.nom)
          if (l && (l.genre === 'etat' || l.genre === 'derive' || l.genre === 'prop')) oui = true
          if (!l && ['souris', 'defilement', 'ecran', 'route'].includes(globalKaury(x.nom) ?? '')) oui = true
          break
        }
        case 'texte':
          for (const m of x.morceaux) if (typeof m !== 'string') voit(m)
          break
        case 'liste':
          x.elements.forEach(voit)
          break
        case 'objet':
          x.props.forEach((pp) => voit(pp.valeur))
          break
        case 'membre':
          voit(x.objet)
          break
        case 'index':
          voit(x.objet)
          voit(x.index)
          break
        case 'appel':
          voit(x.fn)
          x.args.forEach(voit)
          break
        case 'binaire':
          voit(x.g)
          voit(x.d)
          break
        case 'unaire':
        case 'etale':
          voit(x.e)
          break
        case 'si':
          voit(x.cond)
          voit(x.alors)
          voit(x.sinon)
          break
        case 'intervalle':
          voit(x.de)
          voit(x.a)
          break
        case 'lambda':
          if (!Array.isArray(x.corps)) voit(x.corps)
          break
        case 'attends':
          break // une attente n'est pas un dérivé
      }
    }
    voit(e)
    return oui
  }

  // ------------------------------------------------------------------
  private nomInconnu(nom: string, pos: Pos, p: Portee) {
    const candidats = [...p.tous(), ...nomsGlobaux()]
    const s = proche(nom, candidats)
    if (nom.includes('-')) {
      const morceaux = nom.split('-')
      if (morceaux.every((m) => p.cherche(m) || /^\d/.test(m))) {
        this.err({ ...pos, longueur: nom.length }, `« ${nom} » n'existe pas.`, `pour soustraire, mets des espaces : ${morceaux.join(' - ')}`)
        return
      }
    }
    const c = canon(nom)
    if (c && ELEMENTS[c]) {
      this.err({ ...pos, longueur: nom.length }, `« ${nom} » est un élément d'interface ; il doit être en début de ligne.`, `passe à la ligne : ${nom} "…"`)
      return
    }
    this.err({ ...pos, longueur: nom.length }, `« ${nom} » n'existe pas.`,
      s ? `tu voulais dire « ${s} » ?` : `déclare-le avant : soit ${nom} = …   (ou etat ${nom} = … s'il change)`)
  }

  expr(e: Expr, p: Portee) {
    switch (e.k) {
      case 'nombre': case 'couleur': case 'bool': case 'rien':
        return
      case 'texte':
        for (const m of e.morceaux) if (typeof m !== 'string') this.expr(m, p)
        return
      case 'nom': {
        const l = p.cherche(e.nom)
        if (l) {
          e.liaison = l
          l.utilise = true
          return
        }
        const g = globalKaury(e.nom)
        if (g) {
          e.liaison = { genre: 'kaury', nom: g }
          return
        }
        if (GLOBAUX_JS.has(e.nom)) {
          e.liaison = { genre: 'js', nom: e.nom }
          return
        }
        this.nomInconnu(e.nom, e.pos, p)
        return
      }
      case 'liste':
        e.elements.forEach((x) => this.expr(x, p))
        return
      case 'objet':
        e.props.forEach((x) => this.expr(x.valeur, p))
        return
      case 'membre':
        this.expr(e.objet, p)
        return
      case 'index':
        this.expr(e.objet, p)
        this.expr(e.index, p)
        return
      case 'appel':
        this.expr(e.fn, p)
        e.args.forEach((x) => this.expr(x, p))
        if (e.fn.k === 'nom' && e.fn.liaison?.genre === 'composant') {
          this.err(e.pos, `« ${e.fn.nom} » est un composant : il s'utilise en début de ligne, pas comme une fonction.`, `${e.fn.nom} ${e.args.length ? '…' : ''}`.trim())
        }
        return
      case 'binaire':
        this.expr(e.g, p)
        this.expr(e.d, p)
        return
      case 'unaire':
      case 'etale':
      case 'attends':
        this.expr(e.e, p)
        return
      case 'lambda': {
        const l = new Portee('lambda', p)
        for (const n of e.params) this.declare(l, n, 'param', e.pos)
        if (Array.isArray(e.corps)) {
          const a = new Portee('action', l)
          this.hisse(e.corps, a)
          this.instructions(e.corps, a)
        } else this.expr(e.corps, l)
        return
      }
      case 'si':
        this.expr(e.cond, p)
        this.expr(e.alors, p)
        this.expr(e.sinon, p)
        return
      case 'intervalle':
        this.expr(e.de, p)
        this.expr(e.a, p)
        return
    }
  }

  // ------------------------------------------------------------------
  // Lignes d'interface
  private commande(c: Commande, p: Portee, parent: string | undefined) {
    const tete = c.tete
    const estComposant = /^\p{Lu}/u.test(tete)
    if (estComposant) {
      const l = p.cherche(tete)
      if (!l) {
        const s = proche(tete, this.composants)
        this.err({ ...c.pos, longueur: tete.length }, `le composant « ${tete} » n'existe pas.`,
          s ? `tu voulais dire « ${s} » ?` : `crée-le avec « composant ${tete} … » ou importe-le : importe ${tete} de "./${tete.toLowerCase()}.kaury"`)
      } else l.utilise = true
      const positionnels: Expr[] = []
      for (const it of c.items) for (const a of it.atomes) {
        this.expr(a, p)
        positionnels.push(a)
      }
      c.sens = { genre: 'composant', positionnels, options: [] }
      this.enfants(c, p)
      return
    }

    const estMouvement = !!MOUVEMENTS[tete]
    const genre = ELEMENTS[tete] ? 'element' : EVENEMENTS.has(tete) ? 'evenement' : estMouvement ? 'mouvement'
      : tete === 'style' ? 'style' : ['mobile', 'tablette', 'ordinateur'].includes(tete) ? 'reactif-ecran' : 'reglage'
    if (ELEMENTS[tete]?.genre === 'immersion' || ['scene', 'lumiere', 'camera'].includes(tete) || estMouvement) this.infos.immersion = true

    const positionnels: Expr[] = []
    const options: OptionResolue[] = []
    let nomObjet: string | undefined
    let dansSurvol = false
    const teteOptions = genre === 'reactif-ecran' || genre === 'style' ? (parent ?? 'boite') : tete

    for (const it of c.items) {
      const a = it.atomes
      const a0 = a[0]
      if (!a0) continue
      const mot = a0.k === 'nom' ? a0.nom : undefined
      // mouvements : mots libres (doux, x, au defilement…)
      if (estMouvement && mot && (MOTS_MOUVEMENT.has(canon(mot) ?? mot) || MOTS_MOUVEMENT.has(mot))) {
        let nom = canon(mot) ?? mot
        let valeurs = a.slice(1)
        if (nom === 'au' && a[1]?.k === 'nom' && canon(a[1].nom) === 'defilement') {
          nom = 'au-defilement'
          valeurs = a.slice(2)
        }
        valeurs.forEach((x) => this.expr(x, p))
        options.push({ nom, valeurs, pos: it.pos })
        continue
      }
      let opt = mot ? (optionElement(teteOptions, mot) ?? (genre !== 'mouvement' && genre !== 'evenement' ? optionStyle(mot) : undefined)) : undefined
      // une variable déclarée l'emporte sur une option de même nom quand elle est seule (texte taille)
      if (opt && mot && a.length === 1 && p.cherche(mot) && (specOption(teteOptions, opt)?.args ?? '').replace(/\?/g, '').length > 0) opt = undefined
      if (opt) {
        const valeurs = a.slice(1)
        valeurs.forEach((x) => this.verifieValeur(x, p))
        if (opt === 'survol') dansSurvol = true
        options.push({ nom: dansSurvol && opt !== 'survol' ? `survol:${opt}` : opt, valeurs, pos: it.pos })
        if (opt === 'survol' && valeurs.length) {
          // « survol monte 4 » → survol:monte 4
          const v0 = valeurs[0]
          const sous = v0.k === 'nom' ? optionStyle(v0.nom) : undefined
          if (!sous) this.err(it.pos, '« survol » doit être suivi d\'un style.', 'survol monte 4   ou   survol fond rose')
          else {
            options.pop()
            options.push({ nom: `survol:${sous}`, valeurs: valeurs.slice(1), pos: it.pos })
          }
        }
        this.valideOption(tete, opt, valeurs, it.pos)
        continue
      }
      // « 3 colonnes »
      if (a0.k === 'nombre' && a[1]?.k === 'nom') {
        const o2 = optionElement(teteOptions, a[1].nom) ?? optionStyle(a[1].nom)
        if (o2) {
          options.push({ nom: dansSurvol ? `survol:${o2}` : o2, valeurs: [a0, ...a.slice(2)], pos: it.pos })
          continue
        }
      }
      // couleur seule : « rose », « #FF4F8B »
      if (a.length === 1 && (a0.k === 'couleur' || (mot && !p.cherche(mot) && (this.infos.couleurs[mot] || couleurConnue(mot))))) {
        options.push({ nom: dansSurvol ? 'survol:teinte' : 'teinte', valeurs: [a0], pos: it.pos })
        continue
      }
      // nom de section / d'objet (pas une variable)
      if (mot && !p.cherche(mot) && !globalKaury(mot) && !GLOBAUX_JS.has(mot)) {
        if (['section', 'boite', 'grille', 'ligne', 'colonne', 'scene', 'carte', 'formulaire', 'liste'].includes(tete) && !positionnels.length && a.length === 1 && !nomObjet) {
          nomObjet = mot
          continue
        }
        if ((tete === 'objet' || tete === 'personnage') && a.length >= 2 && !nomObjet) {
          nomObjet = mot
          a.slice(1).forEach((x) => {
            this.expr(x, p)
            positionnels.push(x)
          })
          continue
        }
        if (tete === 'liens') {
          positionnels.push(...a)
          continue
        }
        if (['champ', 'zone', 'choix', 'case'].includes(tete) && !positionnels.length) {
          // le premier nom d'un champ est l'état qu'il remplit : on le crée s'il n'existe pas
          const hote = p.hote()
          const l = this.declare(hote, mot, hote.estVue() ? 'etat' : 'variable', it.pos)
          l.modifie = true
          l.utilise = true
          if (a0.k === 'nom') a0.liaison = l
          positionnels.push(a0)
          a.slice(1).forEach((x) => {
            this.expr(x, p)
            positionnels.push(x)
          })
          continue
        }
        if (genre === 'mouvement' || genre === 'evenement' || genre === 'reglage') {
          // mots libres : lumiere studio, camera vol, transition fondu, saute canette
          positionnels.push(...a)
          for (const x of a.slice(1)) this.expr(x, p)
          continue
        }
        if (genre === 'style' || genre === 'reactif-ecran' || ELEMENTS[tete]) {
          const toutes = [...toutesOptions(teteOptions), ...Object.keys(this.infos.couleurs)]
          const s = proche(mot, toutes)
          const sv = proche(mot, p.tous())
          this.err({ ...it.pos, longueur: mot.length }, `« ${mot} » n'est ni une option de « ${c.teteBrute} », ni un nom connu.`,
            s ? `tu voulais dire « ${s} » ?` : sv ? `tu voulais dire la variable « ${sv} » ?` : `options possibles : ${toutesOptions(teteOptions).slice(0, 8).join(', ')}…`)
          continue
        }
      }
      for (const x of a) {
        this.expr(x, p)
        positionnels.push(x)
      }
    }
    c.sens = { genre, positionnels, options, nomObjet }
    this.valideCommande(c, p, parent)
    if (nomObjet && (tete === 'objet' || tete === 'personnage')) {
      const l = this.declare(p.hote(), nomObjet, 'objet', c.pos)
      l.utilise = true
    }
    this.enfants(c, p)
  }

  private verifieValeur(x: Expr, p: Portee) {
    // une valeur d'option peut être un mot libre (ombre douce, aligne centre) ou une couleur nommée
    if (x.k === 'nom' && !p.cherche(x.nom) && !globalKaury(x.nom) && !GLOBAUX_JS.has(x.nom)) return
    this.expr(x, p)
  }

  private valideOption(tete: string, opt: string, valeurs: Expr[], pos: Pos) {
    const s = specOption(tete, opt)
    if (!s || s.args === '*' || s.args === 'e?' ) return
    const requis = s.args.replace(/.\?/g, '').length
    const max = s.args.replace(/\?/g, '').length
    if (valeurs.length < requis) {
      this.err(pos, `« ${opt} » attend ${requis === 1 ? 'une valeur' : `${requis} valeurs`}.`, `${s.exemple}   (si c'est ta variable « ${opt} », écris (${opt}))`)
    } else if (valeurs.length > max && s.args !== 'e') {
      this.err(pos, `« ${opt} » prend au plus ${max === 0 ? 'aucune valeur' : max === 1 ? 'une valeur' : `${max} valeurs`}.`, `sépare les options par des virgules : ${s.exemple}`)
    }
    if (s.mots && valeurs[0]?.k === 'nom' && !s.mots.includes(canon(valeurs[0].nom) ?? valeurs[0].nom)) {
      const w = (valeurs[0] as any).nom
      const sug = proche(w, s.mots)
      this.err(pos, `« ${opt} » n'accepte pas « ${w} ».`, sug ? `tu voulais dire « ${opt} ${sug} » ?` : `valeurs possibles : ${s.mots.join(', ')}`)
    }
  }

  private valideCommande(c: Commande, p: Portee, parent: string | undefined) {
    const s = c.sens!
    const n = s.positionnels.length
    switch (c.tete) {
      case 'image':
      case 'video':
        if (!n) this.err(c.pos, `« ${c.teteBrute} » a besoin de son fichier.`, `${c.teteBrute} "photo.jpg"`)
        break
      case 'lien':
        if (!n) this.err(c.pos, '« lien » a besoin d\'un texte et d\'une adresse.', 'lien "Contact" "/contact"')
        break
      case 'objet':
      case 'personnage': {
        if (!n) this.err(c.pos, `« ${c.teteBrute} » a besoin de son fichier.`, `${c.teteBrute} canette "crush.glb"`)
        const src = s.positionnels[0]
        if (src?.k === 'texte' && src.morceaux.length === 1 && typeof src.morceaux[0] === 'string') {
          const f = (src.morceaux[0] as string).toLowerCase()
          if (/\.(glb|gltf)(\?|$)/.test(f)) this.infos.troisD = true
          else if (/\.(json|lottie)(\?|$)/.test(f)) this.infos.lottie = true
          else if (!/\.(png|jpe?g|webp|avif|gif|svg)(\?|$)/.test(f)) {
            this.err(src.pos, `format de fichier non reconnu pour « ${c.teteBrute} ».`, 'formats acceptés : .glb, .gltf (3D), .png, .jpg, .webp, .svg (2D), .json (Lottie).')
          }
        } else if (src) this.infos.troisD = true
        break
      }
      case 'lumiere': {
        const m = s.positionnels[0]
        const nom = m?.k === 'nom' ? m.nom : undefined
        if (!nom || !LUMIERES.includes(nom)) {
          const sug = nom ? proche(nom, LUMIERES) : undefined
          this.err(c.pos, `lumière inconnue${nom ? ` « ${nom} »` : ''}.`, sug ? `tu voulais dire « lumiere ${sug} » ?` : `ambiances : ${LUMIERES.join(', ')}`)
        }
        break
      }
      case 'camera': {
        const mots = s.positionnels.map((m) => (m.k === 'nom' ? canon(m.nom) ?? m.nom : '')).join('-')
        if (!CAMERAS.includes(mots)) this.err(c.pos, `caméra inconnue « ${mots || '…'} ».`, `modes : ${CAMERAS.join(', ').replace('suit-souris', 'suit souris')}`)
        break
      }
      case 'transition': {
        const m = s.positionnels[0]
        const nom = m?.k === 'nom' ? m.nom : undefined
        if (!nom || !TRANSITIONS.includes(nom)) this.err(c.pos, `transition inconnue${nom ? ` « ${nom} »` : ''}.`, `transitions : ${TRANSITIONS.join(', ')}`)
        break
      }
      case 'entre-depuis': {
        if (!s.options.length) this.err(c.pos, '« entre depuis » attend une direction.', 'entre depuis gauche   (gauche, droite, haut, bas, fondu, zoom)')
        break
      }
      case 'tourne': {
        const v = s.positionnels[0]
        if (v && v.k === 'nom' && !v.liaison) {
          this.err(v.pos, `« tourne » attend une vitesse.`, 'tourne 20/s  ou  tourne au defilement')
        }
        break
      }
    }
    if (s.genre === 'evenement' && !c.action) {
      this.err(c.pos, `« ${c.teteBrute.replace('-', ' ')} » doit être suivi d'une action avec « -> ».`, 'au clic -> saute')
    }
    if ((s.genre === 'style' || s.genre === 'reactif-ecran') && !parent && c.enfants.length === 0 && s.options.length === 0) {
      this.err(c.pos, `« ${c.teteBrute} » vide.`, 'style fond creme, coins 12')
    }
    if (c.action && s.genre === 'element' && !['bouton', 'formulaire', 'lien', 'objet', 'personnage', 'carte', 'image', 'boite', 'icone', 'texte', 'titre', 'section', 'champ', 'case', 'choix', 'zone', 'ligne', 'colonne', 'grille', 'logo', 'element'].includes(c.tete)) {
      this.attention(c.pos, `une action « -> » sur « ${c.teteBrute} » se déclenche au clic.`)
    }
  }

  private enfants(c: Commande, p: Portee) {
    if (c.action) {
      const a = new Portee('action', p)
      this.hisse(c.action, a)
      this.instructions(c.action, a)
    }
    if (c.enfants.length) {
      const b = new Portee('bloc', p)
      this.hisse(c.enfants, b)
      for (const e of c.enfants) {
        if (e.k === 'commande') this.commande(e, b, c.tete)
        else this.instruction(e, b)
      }
    }
  }
}
