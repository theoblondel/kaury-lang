// L'arbre produit par l'analyseur. Chaque nœud garde sa position (ligne, colonne).

export interface Pos {
  ligne: number
  colonne: number
  longueur?: number
}

export type GenreLiaison =
  | 'etat' | 'derive' | 'fixe' | 'variable' | 'fonction' | 'composant' | 'param' | 'prop' | 'import'
  | 'boucle' | 'kaury' | 'js' | 'objet'

export interface Liaison {
  genre: GenreLiaison
  nom: string
  js?: string // nom dans le code produit
  pos?: Pos
  utilise?: boolean
  modifie?: boolean
}

// ---------- Expressions ----------
export type Expr =
  | { k: 'nombre'; v: number; unite?: string; pos: Pos }
  | { k: 'texte'; morceaux: (string | Expr)[]; pos: Pos }
  | { k: 'couleur'; v: string; pos: Pos }
  | { k: 'bool'; v: boolean; pos: Pos }
  | { k: 'rien'; pos: Pos }
  | { k: 'nom'; nom: string; pos: Pos; liaison?: Liaison }
  | { k: 'liste'; elements: Expr[]; pos: Pos }
  | { k: 'objet'; props: { cle: string; valeur: Expr; etale?: boolean }[]; pos: Pos }
  | { k: 'membre'; objet: Expr; prop: string; optionnel?: boolean; pos: Pos }
  | { k: 'index'; objet: Expr; index: Expr; pos: Pos }
  | { k: 'appel'; fn: Expr; args: Expr[]; pos: Pos }
  | { k: 'binaire'; op: string; g: Expr; d: Expr; pos: Pos }
  | { k: 'unaire'; op: string; e: Expr; pos: Pos }
  | { k: 'lambda'; params: string[]; corps: Expr | Instr[]; pos: Pos }
  | { k: 'attends'; e: Expr; pos: Pos }
  | { k: 'si'; cond: Expr; alors: Expr; sinon: Expr; pos: Pos }
  | { k: 'intervalle'; de: Expr; a: Expr; pos: Pos }
  | { k: 'etale'; e: Expr; pos: Pos }

// ---------- Instructions ----------
export type Instr =
  | { k: 'soit'; nom: string; valeur: Expr; reactif: boolean; exporte?: boolean; pos: Pos; liaison?: Liaison }
  | { k: 'affecte'; cible: Expr; op: string; valeur: Expr; pos: Pos; declare?: Liaison }
  | { k: 'fonction'; nom: string; params: Param[]; corps: Instr[]; exporte?: boolean; pos: Pos }
  | { k: 'si'; cond: Expr; alors: Instr[]; sinonSi: { cond: Expr; corps: Instr[]; pos: Pos }[]; sinon?: Instr[]; pos: Pos }
  | { k: 'pour'; variable: string; index?: string; source: Expr; corps: Instr[]; pos: Pos }
  | { k: 'tantque'; cond: Expr; corps: Instr[]; pos: Pos }
  | { k: 'essaie'; corps: Instr[]; variable?: string; erreur?: Instr[]; pos: Pos }
  | { k: 'importe'; defaut?: string; noms?: { nom: string; alias?: string }[]; tout?: string; source: string; pos: Pos }
  | { k: 'retourne'; valeur?: Expr; pos: Pos }
  | { k: 'arrete'; pos: Pos }
  | { k: 'continue'; pos: Pos }
  | { k: 'expr'; e: Expr; pos: Pos }
  | { k: 'bascule'; mode: 'ouvre' | 'ferme' | 'bascule'; cible: Expr; pos: Pos }
  | { k: 'aller'; chemin: Expr; pos: Pos }
  | { k: 'js'; code: string; pos: Pos }
  | { k: 'composant'; nom: string; params: Param[]; corps: Instr[]; exporte?: boolean; pos: Pos }
  | { k: 'page'; chemin: string; corps: Instr[]; pos: Pos }
  | { k: 'site'; nom?: Expr; corps: Instr[]; pos: Pos }
  | Commande

export interface Param {
  nom: string
  defaut?: Expr
  pos: Pos
}

/**
 * Une ligne d'interface : un mot de tête suivi d'éléments séparés par des virgules.
 *   titre "Salut", taille 80, rose
 *   objet canette "crush.glb"
 *   au clic -> saute
 * Le vérificateur interprète ensuite les éléments (contenu, options, réglages).
 */
export interface Commande {
  k: 'commande'
  tete: string // canonique (ex. « au-clic », « titre ») ou nom de composant (Carte)
  teteBrute: string
  items: Item[]
  action?: Instr[]
  enfants: Instr[]
  pos: Pos
  // rempli par le vérificateur
  sens?: SensCommande
}

/** Un élément de la liste après la tête : plusieurs « atomes » collés (ex. « taille 80 »). */
export interface Item {
  atomes: Expr[]
  pos: Pos
}

export interface OptionResolue {
  nom: string // canonique
  valeurs: Expr[]
  pos: Pos
}

export interface SensCommande {
  genre: 'element' | 'composant' | 'style' | 'reactif-ecran' | 'evenement' | 'mouvement' | 'reglage'
  positionnels: Expr[]
  options: OptionResolue[]
  nomObjet?: string
}
