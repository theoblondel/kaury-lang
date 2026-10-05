// Étape 4 — le traducteur : arbre validé → JavaScript + CSS.
// Le JavaScript produit utilise le petit runtime réactif de Kaury (pas de React).

import type { Commande, Expr, Instr, Liaison, OptionResolue, Pos } from './arbre.js'
import { canon, sansAccents } from './mots.js'
import { ELEMENTS } from './vocabulaire.js'
import { declarations, hexDe, clair, litteral, lienPolice, px } from './css.js'
import { globalKaury, FONCTIONS_KAURY, VALEURS_KAURY, methodeKaury, PROPRIETES } from './globaux.js'
import type { InfosModule } from './verificateur.js'

const RESERVES_JS = new Set([
  'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger', 'default', 'delete', 'do', 'else', 'enum',
  'export', 'extends', 'false', 'finally', 'for', 'function', 'if', 'import', 'in', 'instanceof', 'new', 'null',
  'return', 'super', 'switch', 'this', 'throw', 'true', 'try', 'typeof', 'var', 'void', 'while', 'with', 'yield',
  'let', 'static', 'implements', 'interface', 'package', 'private', 'protected', 'public', 'await', 'arguments', 'eval',
])

/** Nom Kaury → identifiant JavaScript valide. prix-total → prix$total */
export function jsNom(n: string): string {
  let s = n.replace(/-/g, '$')
  if (RESERVES_JS.has(s) || s.startsWith('$k')) s = s + '$'
  return s
}

const cleJs = (k: string) => (/^[\p{L}_$][\p{L}\p{N}_$]*$/u.test(k) ? k : JSON.stringify(k))

export interface Sortie {
  js: string
  css: string
  carte: { genere: number; source: number }[] // ligne JS → ligne .kaury
  polices: string[]
  site: { nom?: string; langue?: string }
}

interface Ctx {
  vue: boolean // on construit de l'interface
  parent?: string // variable du nœud parent
  cible?: string // élément/objet visé par les mouvements « saute », « dit »…
  teteParent?: string
  async?: boolean
}

export function traduit(prog: Instr[], infos: InfosModule, options: { fichier?: string; runtime?: string } = {}): Sortie {
  const t = new Traducteur(infos, options.fichier ?? 'site.kaury')
  return t.module(prog, options.runtime ?? 'kaury/runtime')
}

class Traducteur {
  private lignes: string[] = []
  private sources: number[] = []
  private retrait = 0
  private ligneSource = 1
  private compteur = 0
  private classes = 0
  private css: string[] = []
  private polices = new Set<string>()
  private site: { nom?: string; langue?: string } = {}
  private prefixe: string

  constructor(private infos: InfosModule, fichier: string) {
    // préfixe de classes stable par fichier
    let h = 0
    for (const c of fichier) h = (h * 31 + c.charCodeAt(0)) >>> 0
    this.prefixe = 'k' + (h % 46656).toString(36)
  }

  private ecris(code: string, pos?: Pos) {
    if (pos) this.ligneSource = pos.ligne
    for (const l of code.split('\n')) {
      this.lignes.push('  '.repeat(this.retrait) + l)
      this.sources.push(this.ligneSource)
    }
  }
  private nouveau(base = 'n'): string {
    return `$${base}${++this.compteur}`
  }

  module(prog: Instr[], runtime: string): Sortie {
    this.ecris(`import * as $k from ${JSON.stringify(runtime)}`)
    // imports d'abord
    for (const i of prog) if (i.k === 'importe') this.importe(i)
    // couleurs du site
    const vars = Object.entries(this.infos.couleurs).map(([n, c]) => `--k-${n}:${c}`)
    if (vars.length) this.css.push(`:root{${vars.join(';')}}`)
    const premiere = Object.keys(this.infos.couleurs)[0]
    if (premiere && !this.infos.couleurs.accent) this.css.push(`:root{--k-accent:var(--k-${premiere})}`)

    const pages: string[] = []
    let siteObj = '{}'
    this.declarationsImplicites(prog, true)
    for (const i of prog) {
      if (i.k === 'importe') continue
      if (i.k === 'page') {
        pages.push(this.page(i))
        continue
      }
      if (i.k === 'site') {
        siteObj = this.siteDecl(i)
        continue
      }
      if (i.k === 'commande') {
        // une ligne d'interface hors page : elle va dans la page « / » implicite
        continue
      }
      this.instruction(i, { vue: false })
    }
    // éléments d'interface au niveau du fichier (sans page) → page "/" implicite
    const libres = prog.filter((i) => i.k === 'commande')
    if (libres.length && !this.infos.pages.some((p) => p.chemin === '/')) {
      pages.push(this.page({ k: 'page', chemin: '/', corps: libres, pos: libres[0].pos }))
    }
    this.ecris(`export const $pages = [${pages.join(', ')}]`)
    this.ecris(`export const $site = ${siteObj}`)
    this.ecris(`export const $immersion = ${JSON.stringify({ troisD: this.infos.troisD, lottie: this.infos.lottie, actif: this.infos.immersion })}`)
    const css = this.css.join('\n')
    this.ecris(`export const $css = ${JSON.stringify(css)}`)
    this.ecris(`export const $polices = ${JSON.stringify([...this.polices])}`)
    return {
      js: this.lignes.join('\n'),
      css,
      carte: this.sources.map((s, g) => ({ genere: g + 1, source: s })),
      polices: [...this.polices],
      site: this.site,
    }
  }

  private importe(i: Extract<Instr, { k: 'importe' }>) {
    let src = i.source
    const parts: string[] = []
    if (i.defaut) parts.push(jsNom(i.defaut))
    if (i.noms) parts.push(`{ ${i.noms.map((n) => (n.alias ? `${cleJs(n.nom)} as ${jsNom(n.alias)}` : jsNom(n.nom))).join(', ')} }`)
    if (i.tout) parts.push(`* as ${jsNom(i.tout)}`)
    if (src.endsWith('.kaury') && i.defaut && /^\p{Lu}/u.test(i.defaut) && !i.noms) {
      // importe Carte de "./carte.kaury" → le composant exporté du même nom
      this.ecris(`import { ${jsNom(i.defaut)} } from ${JSON.stringify(src)}`, i.pos)
      return
    }
    this.ecris(parts.length ? `import ${parts.join(', ')} from ${JSON.stringify(src)}` : `import ${JSON.stringify(src)}`, i.pos)
  }

  // ---------------------------------------------------------------- site
  private siteDecl(i: Extract<Instr, { k: 'site' }>): string {
    const props: string[] = []
    if (i.nom) {
      props.push(`nom: ${this.ex(i.nom)}`)
      const l = litteral(i.nom, {})
      if (typeof l === 'string') this.site.nom = l
    }
    const regles: Commande[] = []
    for (const c of i.corps) {
      if (c.k !== 'commande' || !c.sens) continue
      const p0 = c.sens.positionnels
      switch (c.tete) {
        case 'police':
        case 'polices': {
          const noms = p0.map((x) => litteral(x, {})).filter((x): x is string => typeof x === 'string')
          noms.forEach((n) => this.polices.add(n))
          if (noms[0]) this.css.push(`:root{--k-police:"${noms[0]}", var(--k-police-secours)}`)
          if (noms[1]) this.css.push(`:root{--k-police-titres:"${noms[1]}", var(--k-police-secours)}`)
          break
        }
        case 'langue':
          props.push(`langue: ${this.ex(p0[0])}`)
          this.site.langue = String(litteral(p0[0], {}) ?? 'fr')
          break
        case 'favicon':
          props.push(`favicon: ${this.ex(p0[0])}`)
          break
        case 'seo':
          props.push(`seo: ${this.seo(c)}`)
          break
        case 'transition':
          props.push(`transition: ${JSON.stringify(String(litteral(p0[0], {}) ?? 'fondu'))}`)
          break
        case 'son':
          props.push(`son: ${this.ex(p0[0])}`)
          break
        case 'style':
        case 'mobile':
        case 'tablette':
        case 'ordinateur':
          regles.push(c)
          break
      }
    }
    if (regles.length) {
      // style du site : s'applique à <body>, et ses couleurs deviennent celles de tout le site
      this.reglesStyle('body', 'site', regles, true)
      for (const r of regles) {
        if (r.tete !== 'style') continue
        for (const o of r.sens!.options) {
          const v = litteral(o.valeurs[0], this.infos.couleurs)
          if (v === undefined) continue
          if (o.nom === 'fond' || o.nom === 'teinte') {
            this.css.push(`:root{--k-fond:${v}}`)
            const hex = hexDe(String(v), this.infos.couleurs)
            if (hex && !clair(hex)) this.css.push(`:root{--k-ligne:rgba(255,255,255,.12);--k-doux:rgba(255,255,255,.62)}`)
          }
          if (o.nom === 'couleur') this.css.push(`:root{--k-texte:${v};--k-encre:${v}}`)
        }
      }
    }
    return `{ ${props.join(', ')} }`
  }

  private seo(c: Commande): string {
    const p = c.sens!.positionnels
    const props: string[] = []
    if (p[0]) props.push(`titre: ${this.ex(p[0])}`)
    if (p[1]) props.push(`description: ${this.ex(p[1])}`)
    const img = c.sens!.options.find((o) => o.nom === 'image')
    if (img?.valeurs[0]) props.push(`image: ${this.ex(img.valeurs[0])}`)
    return `{ ${props.join(', ')} }`
  }

  // ---------------------------------------------------------------- pages
  private page(i: Extract<Instr, { k: 'page' }>): string {
    const fn = this.nouveau('page')
    const params = [...i.chemin.matchAll(/:([\p{L}_][\p{L}\p{N}_-]*)/gu)].map((m) => m[1])
    this.ecris(`function ${fn}($route) {`, i.pos)
    this.retrait++
    for (const p of params) this.ecris(`const ${jsNom(p)} = $route.params[${JSON.stringify(p)}]`)
    const racine = this.nouveau('page')
    this.ecris(`const ${racine} = $k.h("main", "k-page")`)
    let seo = 'null'
    const corps = i.corps.filter((x) => {
      if (x.k === 'commande' && x.tete === 'seo') {
        seo = this.seo(x)
        return false
      }
      return true
    })
    let transition = 'null'
    const corps2 = corps.filter((x) => {
      if (x.k === 'commande' && x.tete === 'transition') {
        transition = JSON.stringify(String(litteral(x.sens!.positionnels[0], {}) ?? 'fondu'))
        return false
      }
      return true
    })
    this.contenu(corps2, { vue: true, parent: racine, cible: racine, teteParent: 'page' }, 'page')
    this.ecris(`return ${racine}`)
    this.retrait--
    this.ecris('}')
    return `{ chemin: ${JSON.stringify(i.chemin)}, rendu: ${fn}, seo: ${seo}, transition: ${transition} }`
  }

  /** Déclare en tête de portée les états/variables créés par « x = … » sans soit/etat. */
  private dejaDeclares = new Set<Liaison>()
  private declarationsImplicites(corps: Instr[], vue: boolean) {
    const vues = this.dejaDeclares
    const parcours = (liste: Instr[]) => {
      for (const i of liste) {
        if (i.k === 'affecte' && i.declare && !vues.has(i.declare)) {
          vues.add(i.declare)
          const n = jsNom(i.declare.nom)
          if (i.declare.genre === 'etat') this.ecris(`const ${n} = $k.etat(null)`, i.pos)
          else this.ecris(`let ${n}`, i.pos)
        }
        if (i.k === 'si') {
          parcours(i.alors)
          i.sinonSi.forEach((s) => parcours(s.corps))
          if (i.sinon) parcours(i.sinon)
        } else if (i.k === 'pour' || i.k === 'tantque') parcours(i.corps)
        else if (i.k === 'essaie') {
          parcours(i.corps)
          if (i.erreur) parcours(i.erreur)
        } else if (i.k === 'commande' && vue) {
          parcours(i.enfants)
          if (i.action) parcours(i.action)
          // états créés par les champs (champ email …)
          if (['champ', 'zone', 'choix', 'case'].includes(i.tete)) {
            const a0 = i.sens?.positionnels[0]
            if (a0?.k === 'nom' && a0.liaison && !vues.has(a0.liaison) && a0.liaison.pos === i.items[0]?.pos) {
              vues.add(a0.liaison)
              this.ecris(`const ${jsNom(a0.nom)} = $k.etat(${i.tete === 'case' ? 'false' : '""'})`, i.pos)
            }
          }
        }
      }
    }
    parcours(corps)
  }

  // ---------------------------------------------------------------- instructions (logique)
  private bloc(corps: Instr[], ctx: Ctx, retourneDernier = false) {
    this.declarationsImplicitesLocales(corps, ctx)
    corps.forEach((i, n) => {
      if (retourneDernier && n === corps.length - 1 && i.k === 'expr') {
        this.ecris(`return ${this.ex(i.e)}`, i.pos)
      } else this.instruction(i, ctx)
    })
  }

  private declarationsImplicitesLocales(corps: Instr[], ctx: Ctx) {
    if (ctx.vue) return
    const vues = this.dejaDeclares
    const parcours = (liste: Instr[]) => {
      for (const i of liste) {
        if (i.k === 'affecte' && i.declare && i.declare.genre === 'variable' && !vues.has(i.declare)) {
          vues.add(i.declare)
          this.ecris(`let ${jsNom(i.declare.nom)}`, i.pos)
        }
        if (i.k === 'si') {
          parcours(i.alors)
          i.sinonSi.forEach((s) => parcours(s.corps))
          if (i.sinon) parcours(i.sinon)
        } else if (i.k === 'pour' || i.k === 'tantque') parcours(i.corps)
        else if (i.k === 'essaie') {
          parcours(i.corps)
          if (i.erreur) parcours(i.erreur)
        }
      }
    }
    parcours(corps)
  }

  private instruction(i: Instr, ctx: Ctx) {
    this.ligneSource = i.pos.ligne
    switch (i.k) {
      case 'soit': {
        const n = jsNom(i.nom)
        const ex = i.exporte ? 'export ' : ''
        const g = i.liaison?.genre
        if (g === 'etat') this.ecris(`${ex}const ${n} = $k.etat(${this.ex(i.valeur)})`, i.pos)
        else if (g === 'derive') this.ecris(`${ex}const ${n} = $k.derive(() => ${this.ex(i.valeur)})`, i.pos)
        else this.ecris(`${ex}const ${n} = ${this.ex(i.valeur)}`, i.pos)
        return
      }
      case 'affecte': {
        const val = this.ex(i.valeur)
        const cible = this.cible(i.cible)
        if (contientAttends(i.valeur) && ctx.vue) {
          // dans une page : on n'attend pas, la page s'affiche et se complète dès que la donnée arrive
          this.ecris(`;(async () => { try { ${cible} ${i.op} ${val} } catch ($e) { $k.signale($e) } })()`, i.pos)
        } else this.ecris(`${cible} ${i.op} ${val}`, i.pos)
        return
      }
      case 'fonction': {
        const asy = contientAttendsCorps(i.corps) ? 'async ' : ''
        const ex = i.exporte ? 'export ' : ''
        this.ecris(`${ex}${asy}function ${jsNom(i.nom)}(${i.params.map((p) => jsNom(p.nom) + (p.defaut ? ` = ${this.ex(p.defaut)}` : '')).join(', ')}) {`, i.pos)
        this.retrait++
        this.bloc(i.corps, { vue: false }, true)
        this.retrait--
        this.ecris('}')
        return
      }
      case 'si': {
        if (ctx.vue) return this.siVue(i, ctx)
        this.ecris(`if (${this.ex(i.cond)}) {`, i.pos)
        this.retrait++
        this.bloc(i.alors, ctx)
        this.retrait--
        for (const s of i.sinonSi) {
          this.ecris(`} else if (${this.ex(s.cond)}) {`, s.pos)
          this.retrait++
          this.bloc(s.corps, ctx)
          this.retrait--
        }
        if (i.sinon) {
          this.ecris('} else {')
          this.retrait++
          this.bloc(i.sinon, ctx)
          this.retrait--
        }
        this.ecris('}')
        return
      }
      case 'pour': {
        if (ctx.vue) return this.pourVue(i, ctx)
        const v = jsNom(i.variable)
        if (i.index) {
          this.ecris(`for (const [${jsNom(i.index)}, ${v}] of $k.enListe(${this.ex(i.source)}).entries()) {`, i.pos)
        } else this.ecris(`for (const ${v} of $k.enListe(${this.ex(i.source)})) {`, i.pos)
        this.retrait++
        this.bloc(i.corps, ctx)
        this.retrait--
        this.ecris('}')
        return
      }
      case 'tantque':
        this.ecris(`while (${this.ex(i.cond)}) {`, i.pos)
        this.retrait++
        this.bloc(i.corps, ctx)
        this.retrait--
        this.ecris('}')
        return
      case 'essaie':
        this.ecris('try {', i.pos)
        this.retrait++
        this.bloc(i.corps, ctx)
        this.retrait--
        this.ecris(`} catch (${i.variable ? jsNom(i.variable) : '$e'}) {`)
        this.retrait++
        if (i.erreur) this.bloc(i.erreur, ctx)
        this.retrait--
        this.ecris('}')
        return
      case 'importe':
        return
      case 'retourne':
        this.ecris(i.valeur ? `return ${this.ex(i.valeur)}` : 'return', i.pos)
        return
      case 'arrete':
        this.ecris('break', i.pos)
        return
      case 'continue':
        this.ecris('continue', i.pos)
        return
      case 'expr':
        if (ctx.vue && contientAttends(i.e)) {
          this.ecris(`;(async () => { try { ${this.ex(i.e)} } catch ($e) { $k.signale($e) } })()`, i.pos)
        } else this.ecris(this.ex(i.e), i.pos)
        return
      case 'bascule': {
        const c = this.cible(i.cible)
        const v = i.mode === 'ouvre' ? 'true' : i.mode === 'ferme' ? 'false' : `!${c}`
        this.ecris(`${c} = ${v}`, i.pos)
        return
      }
      case 'aller':
        this.ecris(`$k.aller(${this.ex(i.chemin)})`, i.pos)
        return
      case 'js':
        this.ecris(i.code, i.pos)
        return
      case 'composant':
        return this.composant(i)
      case 'page':
        return
      case 'site':
        return
      case 'commande':
        if (ctx.vue) return this.commandeVue(i, ctx)
        // hors interface : mouvements / sons utilisés comme actions
        return this.commandeAction(i, ctx)
    }
  }

  private cible(e: Expr): string {
    if (e.k === 'nom') {
      const l = e.liaison
      if (l && (l.genre === 'etat' || l.genre === 'derive')) return `${jsNom(e.nom)}.v`
      return jsNom(e.nom)
    }
    return this.ex(e)
  }

  // ---------------------------------------------------------------- composants
  private composant(i: Extract<Instr, { k: 'composant' }>) {
    const ex = i.exporte ? 'export ' : ''
    this.ecris(`${ex}function ${jsNom(i.nom)}($p = {}) {`, i.pos)
    this.retrait++
    // valeurs par défaut des paramètres
    for (const p of i.params) {
      if (p.defaut) this.ecris(`if ($p[${JSON.stringify(p.nom)}] === undefined) Object.defineProperty($p, ${JSON.stringify(p.nom)}, { get: () => ${this.ex(p.defaut)} })`)
    }
    const frag = this.nouveau('c')
    this.ecris(`const ${frag} = $k.fragment()`)
    this.contenu(i.corps, { vue: true, parent: frag, cible: undefined, teteParent: 'composant' }, 'composant')
    this.ecris(`return $k.unique(${frag})`)
    this.retrait--
    this.ecris('}')
    this.ecris(`${jsNom(i.nom)}.$params = ${JSON.stringify(i.params.map((p) => p.nom))}`)
  }

  // ---------------------------------------------------------------- interface
  /** Contenu d'un bloc d'interface : réglages appliqués au parent, puis enfants. */
  private contenu(corps: Instr[], ctx: Ctx, teteParent: string) {
    this.declarationsImplicites(corps, true)
    for (const i of corps) {
      if (i.k === 'commande' && i.sens && (i.sens.genre === 'style' || i.sens.genre === 'reactif-ecran')) {
        if (i.enfants.some((e) => e.k !== 'commande' || !['style'].includes(e.tete))) {
          // « mobile » avec du contenu : affiché seulement sur mobile
          const w = this.nouveau()
          this.ecris(`const ${w} = $k.h("div", "k-seul-${i.tete}")`, i.pos)
          this.ecris(`${ctx.parent}.append(${w})`)
          this.contenu(i.enfants, { ...ctx, parent: w }, teteParent)
        }
        continue
      }
      this.instruction(i, ctx)
    }
    // styles et réglages qui visent le parent
    const regles = corps.filter((i): i is Commande => i.k === 'commande' && !!i.sens && (i.sens.genre === 'style' || i.sens.genre === 'reactif-ecran'))
    if (regles.length && ctx.parent) {
      const cls = this.nouvelleClasse()
      const { dynamique } = this.reglesStyle('.' + cls, teteParent, regles, false)
      this.ecris(`${ctx.parent}.classList?.add(${JSON.stringify(cls)})`)
      if (teteParent === 'composant') this.ecris(`$k.classeRacine(${ctx.parent}, ${JSON.stringify(cls)})`)
      for (const d of dynamique) this.ecris(`$k.style(${ctx.parent}, ${JSON.stringify(d[0])}, () => ${d[1]})`)
    }
  }

  private nouvelleClasse(): string {
    return `${this.prefixe}-${(++this.classes).toString(36)}`
  }

  /** Transforme des lignes style/mobile/… en règles CSS pour un sélecteur. */
  private reglesStyle(selecteur: string, tete: string, regles: Commande[], _site: boolean): { dynamique: [string, string][]; statique: boolean } {
    const dynamique: [string, string][] = []
    const media: Record<string, string> = {
      mobile: '@media (max-width: 640px)',
      tablette: '@media (max-width: 1024px)',
      ordinateur: '@media (min-width: 1025px)',
    }
    for (const r of regles) {
      const ou = r.tete === 'style' ? undefined : media[r.tete]
      this.optionsVersCss(selecteur, tete, r.sens!.options, ou, dynamique)
      // « style » peut aussi avoir des sous-lignes : style\n  mobile cache
      for (const e of r.enfants) {
        if (e.k === 'commande' && e.sens && (e.sens.genre === 'reactif-ecran' || e.sens.genre === 'style')) {
          this.optionsVersCss(selecteur, tete, e.sens.options, e.tete === 'style' ? ou : media[e.tete], dynamique)
        }
      }
    }
    return { dynamique, statique: true }
  }

  /** Écrit les règles CSS des options ; renvoie les options dynamiques (qui dépendent du programme). */
  private optionsVersCss(sel: string, tete: string, options: OptionResolue[], media: string | undefined, dynamique: [string, string][]) {
    const normal: string[] = []
    const survol: string[] = []
    const tr: string[] = []
    const trSurvol: string[] = []
    let aCouleurTexte = false
    for (const o of options) {
      const survolOpt = o.nom.startsWith('survol:')
      const nom = survolOpt ? o.nom.slice(7) : o.nom
      if (OPTIONS_NON_STYLE.has(nom) && !survolOpt) continue
      const vals = o.valeurs.map((v) => litteral(v, this.infos.couleurs))
      if (vals.some((v) => v === undefined) && o.valeurs.length) {
        // valeur calculée : appliquée en direct
        if (!survolOpt && !media) {
          const prop = PROP_DYNAMIQUE[nom]
          if (prop) {
            const e = this.ex(o.valeurs[0])
            dynamique.push([prop, UNITE_PX.has(nom) ? `$k.px(${e})` : nom === 'teinte' && TEXTE_TETES.has(tete) ? e : e])
            if (nom === 'teinte' && !TEXTE_TETES.has(tete)) dynamique[dynamique.length - 1][0] = 'background'
          }
        }
        continue
      }
      const { decl, transform } = declarations(tete, nom, vals, this.infos.couleurs)
      if (nom === 'couleur') aCouleurTexte = true
      const cible = survolOpt ? survol : normal
      for (const [p, v] of decl) {
        if (p === 'color' && aCouleurTexte && nom !== 'couleur' && !survolOpt) continue
        if (p === 'font-family') {
          const m = /^"([^"]+)"/.exec(v)
          if (m) this.polices.add(m[1])
        }
        cible.push(`${p}:${v}`)
      }
      if (transform) (survolOpt ? trSurvol : tr).push(transform)
    }
    if (tr.length) normal.push(`transform:${tr.join(' ')}`)
    if (trSurvol.length) survol.push(`transform:${trSurvol.join(' ')}`)
    const ajoute = (s: string, decls: string[]) => {
      if (!decls.length) return
      // dans une règle mobile/tablette, on double la classe pour passer devant les réglages par défaut
      if (media && /^\.[\w-]+$/.test(s)) s = s + s
      const regle = `${s}{${decls.join(';')}}`
      this.css.push(media ? `${media}{${regle}}` : regle)
    }
    // les couleurs explicites passent après le contraste automatique
    ajoute(sel, dedoublonne(normal))
    if (survol.length) {
      ajoute(sel, ['transition:transform .35s cubic-bezier(.2,.7,.2,1), box-shadow .35s, background .35s, color .35s, opacity .35s'])
      ajoute(`${sel}:hover`, dedoublonne(survol))
    }
  }

  private commandeVue(c: Commande, ctx: Ctx) {
    const s = c.sens!
    const parent = ctx.parent!
    if (s.genre === 'composant') {
      const props: string[] = []
      // paramètres dans l'ordre de la déclaration : on passe une liste, le composant les nomme
      const n = this.nouveau()
      const args = s.positionnels.map((p) => `() => ${this.ex(p)}`)
      let enfants = 'null'
      if (c.enfants.length) {
        const fn = this.nouveau('slot')
        this.ecris(`const ${fn} = ($parent) => {`, c.pos)
        this.retrait++
        this.contenu(c.enfants, { ...ctx, parent: '$parent' }, 'boite')
        this.retrait--
        this.ecris('}')
        enfants = fn
      }
      this.ecris(`const ${n} = $k.composant(${jsNom(c.tete)}, [${args.join(', ')}], ${enfants}${props.length ? ', {' + props.join(', ') + '}' : ''})`, c.pos)
      this.ecris(`${parent}.append(${n})`)
      if (c.action) this.evenement(n, 'click', c.action, ctx)
      return
    }
    if (s.genre === 'evenement') {
      const ev: Record<string, string> = { 'au-clic': 'click', 'au-survol': 'mouseenter', 'au-defilement': 'scroll', 'au-chargement': 'mount' }
      this.evenement(ctx.cible ?? parent, ev[c.tete], c.action ?? [], ctx)
      return
    }
    if (s.genre === 'mouvement') {
      this.ecris(`$k.mouvement(${ctx.cible ?? parent}, ${JSON.stringify(c.tete)}, ${this.optionsMouvement(c)})`, c.pos)
      return
    }
    if (s.genre === 'reglage') {
      switch (c.tete) {
        case 'lumiere':
          this.ecris(`$k.reglage(${ctx.cible ?? parent}, "lumiere", ${JSON.stringify(this.mots(c))})`, c.pos)
          return
        case 'camera':
          this.ecris(`$k.reglage(${ctx.cible ?? parent}, "camera", ${JSON.stringify(this.mots(c))}, ${this.optionsObjet(c.sens!.options)})`, c.pos)
          return
        case 'seo':
          this.ecris(`$k.seo(${this.seo(c)})`, c.pos)
          return
        case 'transition':
          return
        default:
          return
      }
    }
    this.element(c, ctx)
  }

  private mots(c: Commande): string {
    return c.sens!.positionnels.map((m) => (m.k === 'nom' ? canon(m.nom) ?? sansAccents(m.nom) : String(litteral(m, {})))).join('-')
  }

  private optionsMouvement(c: Commande): string {
    const s = c.sens!
    const props: string[] = []
    for (const o of s.options) {
      props.push(`${cleJs(o.nom)}: ${o.valeurs.length ? this.valeurMouvement(o.valeurs[0]) : 'true'}`)
    }
    if (s.positionnels.length) {
      const p0 = s.positionnels[0]
      if (p0.k === 'nombre') props.push(`vitesse: ${p0.v}`, `unite: ${JSON.stringify(p0.unite ?? '')}`)
      else if (p0.k === 'nom' && !p0.liaison) props.push(`mot: ${JSON.stringify(canon(p0.nom) ?? sansAccents(p0.nom))}`)
      else props.push(`valeur: ${this.ex(p0)}`)
      if (s.positionnels[1]) props.push(`valeur2: ${this.ex(s.positionnels[1])}`)
    }
    return `{ ${props.join(', ')} }`
  }

  private valeurMouvement(e: Expr): string {
    if (e.k === 'nombre') return e.unite === 's' ? String(e.v * 1000) : String(e.v)
    if (e.k === 'nom' && !e.liaison) return JSON.stringify(canon(e.nom) ?? sansAccents(e.nom))
    return this.ex(e)
  }

  private optionsObjet(options: OptionResolue[]): string {
    const props: string[] = []
    for (const o of options) {
      const couleur = ['fond', 'brouillard', 'sol'].includes(o.nom)
      const vals = o.valeurs.map((v) => (couleur ? this.exVal(v) : v.k === 'nom' && !v.liaison ? JSON.stringify(canon(v.nom) ?? sansAccents(v.nom)) : o.nom === 'secours' ? this.exChemin(v) : this.exVal(v)))
      props.push(`${cleJs(o.nom)}: ${vals.length === 0 ? 'true' : vals.length === 1 ? vals[0] : `[${vals.join(', ')}]`}`)
    }
    return `{ ${props.join(', ')} }`
  }

  /** Valeur d'option : couleurs nommées résolues. */
  /** Chemin de fichier : « photo.jpg » devient « /photo.jpg » (valable sur toutes les pages). */
  private exChemin(v: Expr | undefined): string {
    if (!v) return 'null'
    const l = v.k === 'texte' ? litteral(v, {}) : undefined
    if (typeof l === 'string') return JSON.stringify(cheminAsset(l))
    return `$k.chemin(${this.ex(v)})`
  }

  private exVal(v: Expr): string {
    const l = litteral(v, this.infos.couleurs)
    if (l !== undefined && (v.k === 'nom' || v.k === 'couleur')) return JSON.stringify(l)
    if (v.k === 'nombre' && v.unite === 's') return String(v.v * 1000)
    return this.ex(v)
  }

  private evenement(cible: string, type: string, action: Instr[], ctx: Ctx) {
    const asy = contientAttendsCorps(action) ? 'async ' : ''
    this.ecris(`$k.sur(${cible}, ${JSON.stringify(type)}, ${asy}($evt) => {`)
    this.retrait++
    this.declarationsImplicitesLocales(action, { vue: false })
    for (const a of action) this.instruction(a, { vue: false, cible: ctx.cible ?? cible })
    this.retrait--
    this.ecris('})')
  }

  /** Une commande utilisée comme action : saute, tourne, dit "…", son "clic.mp3". */
  private commandeAction(c: Commande, ctx: Ctx) {
    const s = c.sens
    if (!s) return
    if (s.genre === 'mouvement') {
      let cible = ctx.cible ?? 'null'
      const p0 = s.positionnels[0]
      if (p0 && p0.k === 'nom' && p0.liaison?.genre === 'objet') cible = `$k.objetNomme(${JSON.stringify(p0.nom)})`
      this.ecris(`$k.action(${cible}, ${JSON.stringify(c.tete)}, ${this.optionsMouvement(c)})`, c.pos)
      return
    }
    if (c.tete === 'son') {
      this.ecris(`$k.joueSon(${this.ex(s.positionnels[0])}, ${this.optionsObjet(s.options)})`, c.pos)
      return
    }
    if (c.tete === 'lumiere') {
      this.ecris(`$k.reglage(${ctx.cible ?? 'null'}, "lumiere", ${JSON.stringify(this.mots(c))})`, c.pos)
      return
    }
    this.ecris(`$k.signale(new Error(${JSON.stringify(`« ${c.teteBrute} » ne peut pas être une action.`)}))`, c.pos)
  }

  // ---------------------------------------------------------------- éléments
  private element(c: Commande, ctx: Ctx) {
    const s = c.sens!
    const tete = c.tete
    const spec = ELEMENTS[tete]
    const parent = ctx.parent!
    const n = this.nouveau()
    const p = s.positionnels
    const opt = (nom: string) => s.options.find((o) => o.nom === nom)
    this.ligneSource = c.pos.ligne

    // ---- immersion ----
    if (tete === 'objet' || tete === 'personnage') {
      this.ecris(`const ${n} = $k.objet(${parent}, { genre: ${JSON.stringify(tete)}, src: ${this.exChemin(p[0])}, nom: ${JSON.stringify(s.nomObjet ?? null)}, options: ${this.optionsObjet(s.options)} })`, c.pos)
      this.classeStyle(n, tete, s.options, ['taille', 'position', 'rotation', 'hauteur', 'secours', 'ombres', 'texte', 'anime'])
      this.enfantsElement(c, { ...ctx, parent: n, cible: n, teteParent: tete })
      if (c.action) this.evenement(n, 'click', c.action, { ...ctx, cible: n })
      return
    }
    if (tete === 'scene') {
      this.ecris(`const ${n} = $k.scene(${parent}, ${this.optionsObjet(s.options.filter((o) => ['hauteur', 'fond', 'brouillard', 'sol', 'particules'].includes(o.nom)))})`, c.pos)
      if (s.nomObjet) this.ecris(`${n}.id = ${JSON.stringify(s.nomObjet)}`)
      this.classeStyle(n, tete, s.options, ['hauteur', 'fond', 'brouillard', 'sol', 'particules'])
      this.enfantsElement(c, { ...ctx, parent: n, cible: n, teteParent: tete })
      this.ecris(`$k.scenePrete(${n})`)
      return
    }
    if (tete === 'son') {
      this.ecris(`const ${n} = $k.son(${parent}, ${this.exChemin(p[0])}, ${this.optionsObjet(s.options)})`, c.pos)
      return
    }

    // ---- web ----
    let balise = spec?.balise ?? 'div'
    if (tete === 'titre') {
      const niv = opt('niveau')?.valeurs[0]
      if (niv?.k === 'nombre') balise = `h${Math.min(6, Math.max(1, niv.v))}`
    }
    if (tete === 'bouton' && opt('vers')) balise = 'a'
    const classes = [`k-${tete}`]
    if (tete === 'section' && s.nomObjet) classes.push(`k-section-${s.nomObjet}`)
    for (const v of ['contour', 'discret', 'grand', 'petit']) if (opt(v)) classes.push(`k-${v}`)
    this.ecris(`const ${n} = $k.h(${JSON.stringify(balise)}, ${JSON.stringify(classes.join(' '))})`, c.pos)
    if (s.nomObjet) this.ecris(`${n}.id = ${JSON.stringify(s.nomObjet)}`)

    switch (tete) {
      case 'titre':
      case 'sous-titre':
      case 'texte':
      case 'element':
      case 'icone':
        if (p.length) this.texte(n, p)
        break
      case 'bouton':
        if (p.length) this.texte(n, p.slice(0, 1))
        if (opt('vers')) this.attr(n, 'href', opt('vers')!.valeurs[0])
        else this.ecris(`${n}.type = ${JSON.stringify(this.dansFormulaire(ctx) && !c.action ? 'submit' : 'button')}`)
        {
          const d = opt('desactive')
          if (d) this.ecris(`$k.attr(${n}, "disabled", () => ${d.valeurs[0] ? this.ex(d.valeurs[0]) : 'true'})`)
        }
        break
      case 'lien': {
        const texte = p[0]
        const href = p[1] ?? p[0]
        this.texte(n, [texte])
        this.attr(n, 'href', href)
        if (opt('nouvel')) this.ecris(`${n}.target = "_blank"; ${n}.rel = "noopener"`)
        break
      }
      case 'image': {
        this.attr(n, 'src', p[0])
        const alt = opt('texte')?.valeurs[0] ?? p[1]
        if (alt) this.attr(n, 'alt', alt)
        else this.ecris(`${n}.alt = ""`)
        this.ecris(`${n}.loading = "lazy"; ${n}.decoding = "async"`)
        if (opt('couvre')) this.ecris(`${n}.classList.add("k-couvre")`)
        break
      }
      case 'video': {
        this.attr(n, 'src', p[0])
        const auto = !!opt('auto')
        if (auto || opt('muet')) this.ecris(`${n}.muted = true; ${n}.setAttribute("muted", "")`)
        if (auto) this.ecris(`${n}.autoplay = true; ${n}.setAttribute("autoplay", ""); ${n}.setAttribute("playsinline", "")`)
        if (opt('boucle')) this.ecris(`${n}.loop = true; ${n}.setAttribute("loop", "")`)
        if (opt('controles') || !auto) this.ecris(`${n}.controls = true; ${n}.setAttribute("controls", "")`)
        if (opt('couvre')) this.ecris(`${n}.classList.add("k-couvre")`)
        break
      }
      case 'carte': {
        if (p.length && p.some((x) => !(x.k === 'texte' && litteral(x, {}) !== undefined))) {
          // valeurs calculées : le runtime reconnaît l'image (fichier .jpg, .png…) au moment de l'affichage
          this.ecris(`$k.carte(${n}, [${p.map((x) => `() => ${this.ex(x)}`).join(', ')}])`)
          break
        }
        // carte "Fraise" "fraise.png" → image + titre
        const img = p.find((x) => estImage(x))
        const titres = p.filter((x) => x !== img)
        if (img) {
          const i2 = this.nouveau()
          this.ecris(`const ${i2} = $k.h("img", "k-carte-image")`)
          this.attr(i2, 'src', img)
          if (titres[0]) this.attr(i2, 'alt', titres[0])
          this.ecris(`${i2}.loading = "lazy"; ${n}.append(${i2})`)
        }
        if (titres[0]) {
          const t2 = this.nouveau()
          this.ecris(`const ${t2} = $k.h("h3", "k-carte-titre")`)
          this.texte(t2, [titres[0]])
          this.ecris(`${n}.append(${t2})`)
        }
        if (titres[1]) {
          const t3 = this.nouveau()
          this.ecris(`const ${t3} = $k.h("p", "k-carte-texte")`)
          this.texte(t3, [titres[1]])
          this.ecris(`${n}.append(${t3})`)
        }
        break
      }
      case 'liens': {
        for (const x of p) {
          const a = this.nouveau()
          this.ecris(`const ${a} = $k.h("a", "k-lien-nav")`)
          if (x.k === 'nom' && !x.liaison) {
            const libelle = x.nom.replace(/-/g, ' ')
            this.ecris(`${a}.textContent = ${JSON.stringify(libelle)}`)
            this.ecris(`$k.lienAuto(${a}, ${JSON.stringify(x.nom)})`)
          } else if (x.k === 'texte') {
            const l = litteral(x, {})
            this.texte(a, [x])
            this.ecris(`$k.lienAuto(${a}, ${JSON.stringify(String(l ?? ''))})`)
          } else {
            this.texte(a, [x])
          }
          this.ecris(`${n}.append(${a})`)
        }
        break
      }
      case 'logo': {
        this.ecris(`${n}.href = "/"; ${n}.setAttribute("aria-label", "Accueil")`)
        const x = p[0]
        if (x && estImage(x)) {
          const i2 = this.nouveau()
          this.ecris(`const ${i2} = $k.h("img", "k-logo-image")`)
          this.attr(i2, 'src', x)
          this.ecris(`${i2}.alt = document.title || "Logo"; ${n}.append(${i2})`)
        } else if (x) this.texte(n, [x])
        break
      }
      case 'separateur':
        break
      case 'contenu':
        this.ecris(`$k.contenu(${n}, $p.$enfants)`)
        break
      case 'espaceur':
        if (p[0]) this.ecris(`${n}.style.height = $k.px(${this.ex(p[0])})`)
        break
      case 'champ':
      case 'zone':
      case 'choix':
      case 'case':
        this.champ(c, n)
        break
      case 'grille': {
        // nombre seul : « grille 3 »
        if (p[0]?.k === 'nombre' && !opt('colonnes')) {
          s.options.push({ nom: 'colonnes', valeurs: [p[0]], pos: p[0].pos })
        }
        break
      }
    }

    // options → classe CSS
    this.classeStyle(n, tete, s.options, [])
    // enfants
    this.enfantsElement(c, { ...ctx, parent: n, cible: n, teteParent: tete })
    // action « -> »
    if (c.action) {
      const ev = tete === 'formulaire' ? 'submit' : ['champ', 'zone'].includes(tete) ? 'input' : ['choix', 'case'].includes(tete) ? 'change' : 'click'
      this.evenement(n, ev, c.action, { ...ctx, cible: n })
    }
    if (tete === 'formulaire') this.ecris(`$k.formulaire(${n})`)
    const final = ['champ', 'zone', 'choix', 'case'].includes(tete) && (opt('etiquette') || tete === 'case') ? `$k.etiquette(${n})` : n
    this.ecris(`${parent}.append(${final})`)
  }

  private dansFormulaire(ctx: Ctx): boolean {
    return ctx.teteParent === 'formulaire'
  }

  private champ(c: Commande, n: string) {
    const s = c.sens!
    const p = s.positionnels
    const etat = p[0]
    const opt = (nom: string) => s.options.find((o) => o.nom === nom)
    const ref = etat && etat.k === 'nom' ? this.cible(etat) : undefined
    if (etat?.k === 'nom') this.ecris(`${n}.name = ${JSON.stringify(etat.nom)}`)
    if (c.tete === 'champ' || c.tete === 'zone') {
      if (p[1]) this.attr(n, 'placeholder', p[1])
      const type = opt('type')?.valeurs[0]
      const types: Record<string, string> = { texte: 'text', email: 'email', nombre: 'number', motdepasse: 'password', date: 'date', tel: 'tel', url: 'url', recherche: 'search' }
      if (c.tete === 'champ') this.ecris(`${n}.type = ${JSON.stringify(type?.k === 'nom' ? types[type.nom] ?? 'text' : 'text')}`)
      if (opt('lignes')) this.ecris(`${n}.rows = ${this.ex(opt('lignes')!.valeurs[0])}`)
      if (ref) this.ecris(`$k.lie(${n}, () => ${ref}, ($v) => { ${ref} = $v }${type?.k === 'nom' && type.nom === 'nombre' ? ', "nombre"' : ''})`)
    } else if (c.tete === 'choix') {
      const choix = p.slice(1)
      this.ecris(`$k.options(${n}, () => [${choix.map((x) => (x.k === 'liste' ? `...${this.ex(x)}` : x.k === 'nom' && x.liaison ? `...$k.enListe(${this.ex(x)})` : this.ex(x))).join(', ')}])`)
      if (ref) this.ecris(`$k.lie(${n}, () => ${ref}, ($v) => { ${ref} = $v })`)
    } else if (c.tete === 'case') {
      this.ecris(`${n}.type = "checkbox"`)
      if (p[1]) this.ecris(`${n}.dataset.etiquette = ${this.ex(p[1])}`)
      if (ref) this.ecris(`$k.lieCase(${n}, () => ${ref}, ($v) => { ${ref} = $v })`)
    }
    if (opt('requis')) this.ecris(`${n}.required = true`)
    const et = opt('etiquette')?.valeurs[0]
    if (et) this.ecris(`${n}.dataset.etiquette = ${this.ex(et)}`)
  }

  private enfantsElement(c: Commande, ctx: Ctx) {
    if (!c.enfants.length) return
    this.contenu(c.enfants, ctx, c.tete)
  }

  /** Applique les options de style d'un élément via une classe générée. */
  private classeStyle(n: string, tete: string, options: OptionResolue[], ignore: string[]) {
    const opts = options.filter((o) => !ignore.includes(o.nom) && !OPTIONS_NON_STYLE.has(o.nom.replace('survol:', '')))
    if (!opts.length) return
    const cls = this.nouvelleClasse()
    const dynamique: [string, string][] = []
    this.optionsVersCss('.' + cls, tete, opts, undefined, dynamique)
    this.ecris(`${n}.classList.add(${JSON.stringify(cls)})`)
    for (const d of dynamique) this.ecris(`$k.style(${n}, ${JSON.stringify(d[0])}, () => ${d[1]})`)
  }

  private texte(n: string, morceaux: Expr[]) {
    const e = morceaux[0]
    if (!e) return
    const l = e.k === 'texte' || e.k === 'nombre' ? litteral(e, {}) : undefined
    if (l !== undefined) this.ecris(`${n}.textContent = ${JSON.stringify(String(l))}`)
    else this.ecris(`$k.texte(${n}, () => ${this.ex(e)})`)
  }

  private attr(n: string, nom: string, e: Expr) {
    let l = e.k === 'texte' ? litteral(e, {}) : undefined
    if (l !== undefined && (nom === 'src' || nom === 'poster')) l = cheminAsset(String(l))
    if (l !== undefined) this.ecris(`${n}.setAttribute(${JSON.stringify(nom)}, ${JSON.stringify(String(l))})`)
    else if (nom === 'src' || nom === 'poster') this.ecris(`$k.attr(${n}, ${JSON.stringify(nom)}, () => $k.chemin(${this.ex(e)}))`)
    else this.ecris(`$k.attr(${n}, ${JSON.stringify(nom)}, () => ${this.ex(e)})`)
  }

  private siVue(i: Extract<Instr, { k: 'si' }>, ctx: Ctx) {
    const branches: string[] = []
    const fn = (corps: Instr[]) => {
      const nom = this.nouveau('br')
      this.ecris(`const ${nom} = ($parent) => {`)
      this.retrait++
      this.contenu(corps, { ...ctx, parent: '$parent' }, ctx.teteParent ?? 'boite')
      this.retrait--
      this.ecris('}')
      return nom
    }
    branches.push(`[() => ${this.ex(i.cond)}, ${fn(i.alors)}]`)
    for (const s of i.sinonSi) branches.push(`[() => ${this.ex(s.cond)}, ${fn(s.corps)}]`)
    if (i.sinon) branches.push(`[() => true, ${fn(i.sinon)}]`)
    this.ecris(`$k.si(${ctx.parent}, [${branches.join(', ')}])`, i.pos)
  }

  private pourVue(i: Extract<Instr, { k: 'pour' }>, ctx: Ctx) {
    const v = jsNom(i.variable)
    const idx = i.index ? jsNom(i.index) : '$i'
    this.ecris(`$k.pour(${ctx.parent}, () => ${this.ex(i.source)}, (${v}, ${idx}, $parent) => {`, i.pos)
    this.retrait++
    this.contenu(i.corps, { ...ctx, parent: '$parent' }, ctx.teteParent ?? 'boite')
    this.retrait--
    this.ecris('})')
  }

  // ---------------------------------------------------------------- expressions
  ex(e: Expr): string {
    switch (e.k) {
      case 'nombre':
        if (e.unite === 's') return String(e.v * 1000)
        if (e.unite === 'ms' || e.unite === 'px' || e.unite === 'deg' || !e.unite) return String(e.v)
        if (e.unite === '/s') return String(e.v)
        return JSON.stringify(`${e.v}${e.unite}`)
      case 'texte': {
        if (e.morceaux.every((m) => typeof m === 'string')) return JSON.stringify((e.morceaux as string[]).join(''))
        return '`' + e.morceaux.map((m) => (typeof m === 'string' ? m.replace(/[`\\]|\$\{/g, (x) => '\\' + x) : `\${$k.t(${this.ex(m)})}`)).join('') + '`'
      }
      case 'couleur':
        return JSON.stringify(e.v)
      case 'bool':
        return e.v ? 'true' : 'false'
      case 'rien':
        return 'null'
      case 'nom': {
        const l = e.liaison
        if (!l) return jsNom(e.nom)
        switch (l.genre) {
          case 'etat':
          case 'derive':
            return `${jsNom(e.nom)}.v`
          case 'prop':
            return `$p[${JSON.stringify(e.nom)}]`
          case 'kaury': {
            const f = (FONCTIONS_KAURY as any)[l.nom] ?? (VALEURS_KAURY as any)[l.nom]
            if (l.nom === 'defilement') return '$k.defilement.v'
            return `$k.${f?.js ?? jsNom(l.nom)}`
          }
          case 'objet':
            return `$k.objetNomme(${JSON.stringify(e.nom)})`
          default:
            return jsNom(e.nom)
        }
      }
      case 'liste':
        return `[${e.elements.map((x) => this.ex(x)).join(', ')}]`
      case 'objet':
        return `{ ${e.props.map((p) => (p.etale ? `...${this.ex(p.valeur)}` : `${cleJs(p.cle)}: ${this.ex(p.valeur)}`)).join(', ')} }`
      case 'membre': {
        const o = this.ex(e.objet)
        const m = methodeKaury(e.prop)
        if (m && PROPRIETES.has(m)) return `$k.prop(${o}, ${JSON.stringify(m)}, ${JSON.stringify(e.prop)})`
        if (/^[\p{L}_$][\p{L}\p{N}_$]*$/u.test(e.prop)) return `${o}${e.optionnel ? '?.' : '.'}${e.prop}`
        return `${o}${e.optionnel ? '?.' : ''}[${JSON.stringify(e.prop)}]`
      }
      case 'index':
        return `${this.ex(e.objet)}[${this.ex(e.index)}]`
      case 'appel': {
        if (e.fn.k === 'membre') {
          const m = methodeKaury(e.fn.prop)
          if (m) return `$k.m(${this.ex(e.fn.objet)}, ${JSON.stringify(m)}, ${JSON.stringify(e.fn.prop)}${e.args.map((a) => ', ' + this.ex(a)).join('')})`
        }
        if (e.fn.k === 'nom' && e.fn.liaison?.genre === 'kaury' && e.fn.liaison.nom === 'memorise') {
          // memorise "panier", panier : on passe l'état lui-même, pas sa valeur
          return `$k.memorise(${e.args.map((a) => (a.k === 'nom' && a.liaison?.genre === 'etat' ? jsNom(a.nom) : this.ex(a))).join(', ')})`
        }
        return `${this.ex(e.fn)}(${e.args.map((a) => this.ex(a)).join(', ')})`
      }
      case 'binaire': {
        const g = this.ex(e.g)
        const d = this.ex(e.d)
        switch (e.op) {
          case '==': return `$k.egal(${g}, ${d})`
          case '!=': return `!$k.egal(${g}, ${d})`
          case 'dans': return `$k.dans(${g}, ${d})`
          default: return `(${g} ${e.op} ${d})`
        }
      }
      case 'unaire':
        return `${e.op}${this.ex(e.e)}`
      case 'etale':
        return `...${this.ex(e.e)}`
      case 'lambda': {
        const asy = Array.isArray(e.corps) ? (contientAttendsCorps(e.corps) ? 'async ' : '') : contientAttends(e.corps) ? 'async ' : ''
        const params = `(${e.params.map(jsNom).join(', ')})`
        if (!Array.isArray(e.corps)) {
          const corps = this.ex(e.corps)
          return `${asy}${params} => ${corps.startsWith('{') ? `(${corps})` : corps}`
        }
        // corps en bloc : on le produit à part
        const sauve = this.lignes
        const sauveS = this.sources
        const sauveR = this.retrait
        this.lignes = []
        this.sources = []
        this.retrait = 1
        this.declarationsImplicitesLocales(e.corps, { vue: false })
        for (const i of e.corps) this.instruction(i, { vue: false })
        const corps = this.lignes.join('\n')
        const srcs = this.sources
        this.lignes = sauve
        this.sources = sauveS
        this.retrait = sauveR
        void srcs
        return `${asy}${params} => {\n${corps}\n${'  '.repeat(this.retrait)}}`
      }
      case 'attends':
        if (e.e.k === 'nombre' && (e.e.unite === 's' || e.e.unite === 'ms' || !e.e.unite)) return `(await $k.delai(${this.ex(e.e)}))`
        return `(await ${this.ex(e.e)})`
      case 'si':
        return `(${this.ex(e.cond)} ? ${this.ex(e.alors)} : ${this.ex(e.sinon)})`
      case 'intervalle':
        return `$k.intervalle(${this.ex(e.de)}, ${this.ex(e.a)})`
    }
  }
}

// options qui ne sont pas du style (traitées par l'élément lui-même)
const OPTIONS_NON_STYLE = new Set(['niveau', 'texte', 'couvre', 'boucle', 'muet', 'auto', 'controles', 'vers', 'contour', 'discret', 'grand', 'petit',
  'desactive', 'nouvel', 'type', 'requis', 'etiquette', 'lignes', 'image', 'position', 'rotation', 'secours', 'ombres', 'brouillard', 'sol', 'particules', 'distance', 'volume'])
const PROP_DYNAMIQUE: Record<string, string> = {
  fond: 'background', couleur: 'color', taille: 'font-size', opacite: 'opacity', largeur: 'width', hauteur: 'height',
  teinte: 'color', coins: 'border-radius', marge: 'margin', remplissage: 'padding', espace: 'gap', flou: 'filter',
}
const UNITE_PX = new Set(['taille', 'largeur', 'hauteur', 'coins', 'marge', 'remplissage', 'espace'])
const TEXTE_TETES = new Set(['titre', 'sous-titre', 'texte', 'lien', 'icone', 'element'])

export function cheminAsset(s: string): string {
  if (/^(\/|[a-z][a-z0-9+.-]*:|#|\.\.\/)/i.test(s)) return s
  return '/' + s.replace(/^\.\//, '')
}

function estImage(e: Expr): boolean {
  if (e.k !== 'texte') return false
  const l = e.morceaux.map((m) => (typeof m === 'string' ? m : '')).join('')
  return /\.(png|jpe?g|webp|avif|gif|svg)(\?.*)?$/i.test(l)
}

function dedoublonne(decls: string[]): string[] {
  const vues = new Map<string, string>()
  for (const d of decls) vues.set(d.slice(0, d.indexOf(':')), d)
  return [...vues.values()]
}

export function contientAttends(e: Expr): boolean {
  switch (e.k) {
    case 'attends': return true
    case 'texte': return e.morceaux.some((m) => typeof m !== 'string' && contientAttends(m))
    case 'liste': return e.elements.some(contientAttends)
    case 'objet': return e.props.some((p) => contientAttends(p.valeur))
    case 'membre': return contientAttends(e.objet)
    case 'index': return contientAttends(e.objet) || contientAttends(e.index)
    case 'appel': return contientAttends(e.fn) || e.args.some(contientAttends)
    case 'binaire': return contientAttends(e.g) || contientAttends(e.d)
    case 'unaire': case 'etale': return contientAttends(e.e)
    case 'si': return contientAttends(e.cond) || contientAttends(e.alors) || contientAttends(e.sinon)
    case 'intervalle': return contientAttends(e.de) || contientAttends(e.a)
    default: return false // une lambda a sa propre portée
  }
}

export function contientAttendsCorps(corps: Instr[]): boolean {
  for (const i of corps) {
    switch (i.k) {
      case 'soit': if (contientAttends(i.valeur)) return true; break
      case 'affecte': if (contientAttends(i.valeur) || contientAttends(i.cible)) return true; break
      case 'expr': if (contientAttends(i.e)) return true; break
      case 'retourne': if (i.valeur && contientAttends(i.valeur)) return true; break
      case 'si': if (contientAttends(i.cond) || contientAttendsCorps(i.alors) || i.sinonSi.some((s) => contientAttends(s.cond) || contientAttendsCorps(s.corps)) || (i.sinon && contientAttendsCorps(i.sinon))) return true; break
      case 'pour': if (contientAttends(i.source) || contientAttendsCorps(i.corps)) return true; break
      case 'tantque': if (contientAttends(i.cond) || contientAttendsCorps(i.corps)) return true; break
      case 'essaie': if (contientAttendsCorps(i.corps) || (i.erreur && contientAttendsCorps(i.erreur))) return true; break
      case 'aller': if (contientAttends(i.chemin)) return true; break
    }
  }
  return false
}

export { px, hexDe, clair, lienPolice, globalKaury }
