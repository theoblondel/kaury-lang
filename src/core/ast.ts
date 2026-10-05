// The tree built by the parser. Every node keeps its position (line, column).

export interface Pos {
  line: number
  column: number
  length?: number
}

export type BindingKind =
  | 'state' | 'derived' | 'const' | 'variable' | 'function' | 'component' | 'param' | 'prop' | 'import'
  | 'loop' | 'kaury' | 'js' | 'object'

export interface Binding {
  kind: BindingKind
  name: string
  pos?: Pos
  used?: boolean
  mutated?: boolean
}

// ---------- Expressions ----------
export type Expr =
  | { k: 'number'; v: number; unit?: string; pos: Pos }
  | { k: 'text'; parts: (string | Expr)[]; pos: Pos }
  | { k: 'color'; v: string; pos: Pos }
  | { k: 'bool'; v: boolean; pos: Pos }
  | { k: 'none'; pos: Pos }
  | { k: 'name'; name: string; pos: Pos; binding?: Binding }
  | { k: 'list'; items: Expr[]; pos: Pos }
  | { k: 'object'; props: { key: string; value: Expr; spread?: boolean }[]; pos: Pos }
  | { k: 'member'; object: Expr; prop: string; optional?: boolean; pos: Pos }
  | { k: 'index'; object: Expr; index: Expr; pos: Pos }
  | { k: 'call'; fn: Expr; args: Expr[]; pos: Pos }
  | { k: 'binary'; op: string; l: Expr; r: Expr; pos: Pos }
  | { k: 'unary'; op: string; e: Expr; pos: Pos }
  | { k: 'lambda'; params: string[]; body: Expr | Stmt[]; pos: Pos }
  | { k: 'await'; e: Expr; pos: Pos }
  | { k: 'if'; cond: Expr; then: Expr; else: Expr; pos: Pos }
  | { k: 'range'; from: Expr; to: Expr; pos: Pos }
  | { k: 'spread'; e: Expr; pos: Pos }

// ---------- Statements ----------
export type Stmt =
  | { k: 'let'; name: string; value: Expr; reactive: boolean; exported?: boolean; pos: Pos; binding?: Binding }
  | { k: 'assign'; target: Expr; op: string; value: Expr; pos: Pos; declares?: Binding }
  | { k: 'function'; name: string; params: Param[]; body: Stmt[]; exported?: boolean; pos: Pos }
  | { k: 'if'; cond: Expr; then: Stmt[]; elifs: { cond: Expr; body: Stmt[]; pos: Pos }[]; else?: Stmt[]; pos: Pos }
  | { k: 'for'; variable: string; index?: string; source: Expr; body: Stmt[]; pos: Pos }
  | { k: 'while'; cond: Expr; body: Stmt[]; pos: Pos }
  | { k: 'try'; body: Stmt[]; variable?: string; handler?: Stmt[]; pos: Pos }
  | { k: 'import'; default?: string; names?: { name: string; alias?: string }[]; all?: string; source: string; pos: Pos }
  | { k: 'return'; value?: Expr; pos: Pos }
  | { k: 'break'; pos: Pos }
  | { k: 'continue'; pos: Pos }
  | { k: 'expr'; e: Expr; pos: Pos }
  | { k: 'toggle'; mode: 'open' | 'close' | 'toggle'; target: Expr; pos: Pos }
  | { k: 'go'; path: Expr; pos: Pos }
  | { k: 'js'; code: string; pos: Pos }
  | { k: 'component'; name: string; params: Param[]; body: Stmt[]; exported?: boolean; pos: Pos }
  | { k: 'page'; path: string; address?: Expr; each?: { variable: string; source: Expr }; body: Stmt[]; pos: Pos }
  | { k: 'site'; name?: Expr; body: Stmt[]; pos: Pos }
  | Command

export interface Param {
  name: string
  default?: Expr
  pos: Pos
}

/**
 * A UI line: a head word followed by comma-separated items.
 *   title "Hello", size 80, pink
 *   object can "crush.glb"
 *   on click -> jump
 * The checker then decides what each item means (content, options, settings).
 */
export interface Command {
  k: 'command'
  head: string // canonical (e.g. "on-click", "title") or a component name (Card)
  rawHead: string
  items: Item[]
  action?: Stmt[]
  children: Stmt[]
  pos: Pos
  // filled in by the checker
  meaning?: Meaning
}

/** One item after the head: several "atoms" side by side (e.g. « size 80 »). */
export interface Item {
  atoms: Expr[]
  pos: Pos
}

export interface ResolvedOption {
  name: string // canonical
  values: Expr[]
  pos: Pos
}

export interface Meaning {
  kind: 'element' | 'component' | 'style' | 'screen' | 'event' | 'motion' | 'setting'
  positional: Expr[]
  options: ResolvedOption[]
  objectName?: string
}
