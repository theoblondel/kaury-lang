// Un DOM minuscule pour rendre les pages côté serveur (Node) : le HTML existe avant la 3D,
// donc Google lit tout le contenu, même sur une page immersive.

const VIDES = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr'])
const echappe = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const echappeAttr = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

abstract class Noeud {
  parentNode: Element | Fragment | null = null
  childNodes: Noeud[] = []
  abstract nodeType: number
  get firstChild() {
    return this.childNodes[0] ?? null
  }
  get lastChild() {
    return this.childNodes[this.childNodes.length - 1] ?? null
  }
  get nextSibling(): Noeud | null {
    const p = this.parentNode
    if (!p) return null
    return p.childNodes[p.childNodes.indexOf(this) + 1] ?? null
  }
  get isConnected() {
    return true
  }
  appendChild<T extends Noeud>(n: T): T {
    return this.insertBefore(n, null)
  }
  append(...ns: (Noeud | string)[]) {
    for (const n of ns) this.appendChild(typeof n === 'string' ? new Texte(n) : n)
  }
  insertBefore<T extends Noeud>(n: T, ref: Noeud | null): T {
    const aInserer = n instanceof Fragment ? [...n.childNodes] : [n]
    for (const x of aInserer) {
      x.parentNode?.removeChild(x)
      const i = ref ? this.childNodes.indexOf(ref) : -1
      if (i < 0) this.childNodes.push(x)
      else this.childNodes.splice(i, 0, x)
      x.parentNode = this as any
    }
    if (n instanceof Fragment) n.childNodes = []
    return n
  }
  removeChild<T extends Noeud>(n: T): T {
    const i = this.childNodes.indexOf(n)
    if (i >= 0) this.childNodes.splice(i, 1)
    n.parentNode = null
    return n
  }
  remove() {
    this.parentNode?.removeChild(this)
  }
  get textContent(): string {
    return this.childNodes.map((c) => c.textContent).join('')
  }
  set textContent(v: string) {
    for (const c of this.childNodes) c.parentNode = null
    this.childNodes = v === '' ? [] : [new Texte(String(v))]
    for (const c of this.childNodes) c.parentNode = this as any
  }
  addEventListener() {}
  removeEventListener() {}
  dispatchEvent() {
    return true
  }
  abstract html(): string
}

class Texte extends Noeud {
  nodeType = 3
  constructor(public data: string) {
    super()
  }
  get nodeValue() {
    return this.data
  }
  set nodeValue(v: string) {
    this.data = v
  }
  get textContent() {
    return this.data
  }
  set textContent(v: string) {
    this.data = v
  }
  html() {
    return echappe(this.data)
  }
}

class Commentaire extends Noeud {
  nodeType = 8
  constructor(public data: string) {
    super()
  }
  html() {
    return ''
  }
}

class Fragment extends Noeud {
  nodeType = 11
  html() {
    return this.childNodes.map((c) => c.html()).join('')
  }
}

function creeStyle() {
  const decls = new Map<string, string>()
  const kebab = (s: string) => s.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase())
  const cible: any = {
    setProperty: (p: string, v: string) => (v === '' || v === null ? decls.delete(p) : decls.set(p, String(v))),
    removeProperty: (p: string) => decls.delete(p),
    getPropertyValue: (p: string) => decls.get(p) ?? '',
    get cssText() {
      return [...decls].map(([k, v]) => `${k}:${v}`).join(';')
    },
  }
  return new Proxy(cible, {
    get(t, k) {
      if (k in t) return t[k]
      return decls.get(kebab(String(k))) ?? ''
    },
    set(_t, k, v) {
      if (v === '' || v === null || v === undefined) decls.delete(kebab(String(k)))
      else decls.set(kebab(String(k)), String(v))
      return true
    },
  })
}

const PROPS_ATTR: Record<string, string> = {
  id: 'id', className: 'class', href: 'href', src: 'src', alt: 'alt', type: 'type', name: 'name', placeholder: 'placeholder',
  target: 'target', rel: 'rel', loading: 'loading', decoding: 'decoding', role: 'role', htmlFor: 'for', title: 'title',
  rows: 'rows', tabIndex: 'tabindex', draggable: 'draggable', lang: 'lang', preload: 'preload',
}
const PROPS_BOOL = new Set(['required', 'disabled', 'controls', 'muted', 'autoplay', 'loop', 'playsInline', 'selected'])

class Element extends Noeud {
  nodeType = 1
  attributs = new Map<string, string>()
  style = creeStyle()
  tagName: string
  value = ''
  checked = false
  html_brut?: string
  [cle: string]: any
  constructor(public localName: string) {
    super()
    this.tagName = localName.toUpperCase()
    for (const [p, a] of Object.entries(PROPS_ATTR)) {
      Object.defineProperty(this, p, {
        get: () => (p === 'tabIndex' ? Number(this.attributs.get(a) ?? -1) : this.attributs.get(a) ?? ''),
        set: (v) => this.attributs.set(a, String(v)),
        configurable: true,
      })
    }
    for (const p of PROPS_BOOL) {
      Object.defineProperty(this, p, {
        get: () => this.attributs.has(p.toLowerCase()),
        set: (v) => (v ? this.attributs.set(p.toLowerCase(), '') : this.attributs.delete(p.toLowerCase())),
        configurable: true,
      })
    }
  }
  get classList() {
    const el = this
    const liste = () => (el.attributs.get('class') ?? '').split(/\s+/).filter(Boolean)
    return {
      add: (...c: string[]) => el.attributs.set('class', [...new Set([...liste(), ...c])].join(' ')),
      remove: (...c: string[]) => el.attributs.set('class', liste().filter((x) => !c.includes(x)).join(' ')),
      contains: (c: string) => liste().includes(c),
      toggle: (c: string, f?: boolean) => {
        const a = f ?? !liste().includes(c)
        if (a) el.classList.add(c)
        else el.classList.remove(c)
        return a
      },
    }
  }
  get dataset() {
    const el = this
    return new Proxy({}, {
      get: (_t, k) => el.attributs.get('data-' + String(k).replace(/[A-Z]/g, (c) => '-' + c.toLowerCase())),
      set: (_t, k, v) => {
        el.attributs.set('data-' + String(k).replace(/[A-Z]/g, (c) => '-' + c.toLowerCase()), String(v))
        return true
      },
    })
  }
  setAttribute(n: string, v: string) {
    this.attributs.set(n.toLowerCase(), String(v))
  }
  getAttribute(n: string) {
    return this.attributs.get(n.toLowerCase()) ?? null
  }
  hasAttribute(n: string) {
    return this.attributs.has(n.toLowerCase())
  }
  removeAttribute(n: string) {
    this.attributs.delete(n.toLowerCase())
  }
  set innerHTML(h: string) {
    this.childNodes = []
    this.html_brut = h
  }
  get innerHTML() {
    return this.html_brut ?? this.childNodes.map((c) => c.html()).join('')
  }
  getBoundingClientRect() {
    return { top: 0, left: 0, width: 0, height: 0, bottom: 0, right: 0 }
  }
  closest() {
    return null
  }
  querySelector() {
    return null
  }
  checkValidity() {
    return true
  }
  html(): string {
    const attrs = new Map(this.attributs)
    const css = this.style.cssText
    if (css) attrs.set('style', css)
    if (this.localName === 'input' && this.value && !attrs.has('value')) attrs.set('value', this.value)
    const a = [...attrs].map(([k, v]) => (v === '' && k !== 'alt' && k !== 'value' ? ` ${k}` : ` ${k}="${echappeAttr(v)}"`)).join('')
    if (VIDES.has(this.localName)) return `<${this.localName}${a}>`
    const interieur = this.localName === 'textarea' ? echappe(this.value) : this.innerHTML
    return `<${this.localName}${a}>${interieur}</${this.localName}>`
  }
}

export function creeDocument() {
  const body = new Element('body')
  const head = new Element('head')
  return {
    body,
    head,
    documentElement: new Element('html'),
    title: '',
    createElement: (t: string) => new Element(t.toLowerCase()),
    createTextNode: (t: string) => new Texte(t),
    createComment: (t: string) => new Commentaire(t),
    createDocumentFragment: () => new Fragment(),
    querySelector: () => null,
    getElementById: () => null,
    addEventListener() {},
  }
}

export function serialise(n: any): string {
  return n.html ? n.html() : ''
}

/** Prépare l'environnement global pour un rendu serveur. */
export function installeSSR() {
  const g = globalThis as any
  g.__kaurySSR = true
  g.document = creeDocument()
  return g.document
}
