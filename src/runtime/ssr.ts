// A tiny DOM to render pages on the server (Node): the HTML exists before the 3D,
// so Google reads all the content, even on an immersive page.

const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr'])
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const escAttr = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

abstract class SNode {
  parentNode: SElement | SFragment | null = null
  childNodes: SNode[] = []
  abstract nodeType: number
  [key: string]: any
  get firstChild() {
    return this.childNodes[0] ?? null
  }
  get lastChild() {
    return this.childNodes[this.childNodes.length - 1] ?? null
  }
  get nextSibling(): SNode | null {
    const p = this.parentNode
    if (!p) return null
    return p.childNodes[p.childNodes.indexOf(this) + 1] ?? null
  }
  get isConnected() {
    return true
  }
  appendChild<T extends SNode>(n: T): T {
    return this.insertBefore(n, null)
  }
  append(...ns: (SNode | string)[]) {
    for (const n of ns) this.appendChild(typeof n === 'string' ? new SText(n) : n)
  }
  insertBefore<T extends SNode>(n: T, ref: SNode | null): T {
    const list = n instanceof SFragment ? [...n.childNodes] : [n]
    for (const x of list) {
      x.parentNode?.removeChild(x)
      const i = ref ? this.childNodes.indexOf(ref) : -1
      if (i < 0) this.childNodes.push(x)
      else this.childNodes.splice(i, 0, x)
      x.parentNode = this as any
    }
    if (n instanceof SFragment) n.childNodes = []
    return n
  }
  removeChild<T extends SNode>(n: T): T {
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
    this.childNodes = v === '' ? [] : [new SText(String(v))]
    for (const c of this.childNodes) c.parentNode = this as any
  }
  addEventListener() {}
  removeEventListener() {}
  dispatchEvent() {
    return true
  }
  abstract html(): string
}

class SText extends SNode {
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
    return esc(this.data)
  }
}

class SComment extends SNode {
  nodeType = 8
  constructor(public data: string) {
    super()
  }
  // markers of « if » and « for » blocks: the browser needs them to adopt the HTML
  html() {
    return `<!--${this.data}-->`
  }
}

class SFragment extends SNode {
  nodeType = 11
  html() {
    return this.childNodes.map((c) => c.html()).join('')
  }
}

function makeStyle() {
  const decls = new Map<string, string>()
  const kebab = (s: string) => s.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase())
  const target: any = {
    setProperty: (p: string, v: string) => (v === '' || v === null ? decls.delete(p) : decls.set(p, String(v))),
    removeProperty: (p: string) => decls.delete(p),
    getPropertyValue: (p: string) => decls.get(p) ?? '',
    get cssText() {
      return [...decls].map(([k, v]) => `${k}:${v}`).join(';')
    },
  }
  return new Proxy(target, {
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

const PROP_ATTRS: Record<string, string> = {
  id: 'id', className: 'class', href: 'href', src: 'src', alt: 'alt', type: 'type', name: 'name', placeholder: 'placeholder',
  target: 'target', rel: 'rel', loading: 'loading', decoding: 'decoding', role: 'role', htmlFor: 'for', title: 'title',
  rows: 'rows', tabIndex: 'tabindex', draggable: 'draggable', lang: 'lang', preload: 'preload',
}
const BOOL_PROPS = new Set(['required', 'disabled', 'controls', 'muted', 'autoplay', 'loop', 'playsInline', 'selected'])

class SElement extends SNode {
  nodeType = 1
  attrs = new Map<string, string>()
  style = makeStyle()
  tagName: string
  value = ''
  checked = false
  rawHtml?: string
  constructor(public localName: string) {
    super()
    this.tagName = localName.toUpperCase()
    for (const [p, a] of Object.entries(PROP_ATTRS)) {
      Object.defineProperty(this, p, {
        get: () => (p === 'tabIndex' ? Number(this.attrs.get(a) ?? -1) : this.attrs.get(a) ?? ''),
        set: (v) => this.attrs.set(a, String(v)),
        configurable: true,
      })
    }
    for (const p of BOOL_PROPS) {
      Object.defineProperty(this, p, {
        get: () => this.attrs.has(p.toLowerCase()),
        set: (v) => (v ? this.attrs.set(p.toLowerCase(), '') : this.attrs.delete(p.toLowerCase())),
        configurable: true,
      })
    }
  }
  get classList() {
    const el = this
    const list = () => (el.attrs.get('class') ?? '').split(/\s+/).filter(Boolean)
    return {
      add: (...c: string[]) => el.attrs.set('class', [...new Set([...list(), ...c])].join(' ')),
      remove: (...c: string[]) => el.attrs.set('class', list().filter((x) => !c.includes(x)).join(' ')),
      contains: (c: string) => list().includes(c),
      toggle: (c: string, f?: boolean) => {
        const a = f ?? !list().includes(c)
        if (a) el.classList.add(c)
        else el.classList.remove(c)
        return a
      },
    }
  }
  get dataset() {
    const el = this
    const name = (k: PropertyKey) => 'data-' + String(k).replace(/[A-Z]/g, (c) => '-' + c.toLowerCase())
    return new Proxy({}, {
      get: (_t, k) => el.attrs.get(name(k)),
      set: (_t, k, v) => {
        el.attrs.set(name(k), String(v))
        return true
      },
    })
  }
  setAttribute(n: string, v: string) {
    this.attrs.set(n.toLowerCase(), String(v))
  }
  getAttribute(n: string) {
    return this.attrs.get(n.toLowerCase()) ?? null
  }
  hasAttribute(n: string) {
    return this.attrs.has(n.toLowerCase())
  }
  removeAttribute(n: string) {
    this.attrs.delete(n.toLowerCase())
  }
  set innerHTML(h: string) {
    this.childNodes = []
    this.rawHtml = h
  }
  get innerHTML() {
    return this.rawHtml ?? this.childNodes.map((c) => c.html()).join('')
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
    const attrs = new Map(this.attrs)
    const css = this.style.cssText
    if (css) attrs.set('style', css)
    if (attrs.get('class') === '') attrs.delete('class')
    const a = [...attrs].map(([k, v]) => (v === '' && k !== 'alt' && k !== 'value' ? ` ${k}` : ` ${k}="${escAttr(v)}"`)).join('')
    if (VOID.has(this.localName)) return `<${this.localName}${a}>`
    const inner = this.localName === 'textarea' ? esc(this.value) : this.innerHTML
    return `<${this.localName}${a}>${inner}</${this.localName}>`
  }
}

export function createDocument() {
  return {
    body: new SElement('body'),
    head: new SElement('head'),
    documentElement: new SElement('html'),
    title: '',
    readyState: 'complete',
    createElement: (t: string) => new SElement(t.toLowerCase()),
    createTextNode: (t: string) => new SText(t),
    createComment: (t: string) => new SComment(t),
    createDocumentFragment: () => new SFragment(),
    querySelector: () => null,
    getElementById: () => null,
    addEventListener() {},
  }
}

export function serialize(n: any): string {
  return n.html ? n.html() : ''
}

/** Prepares the global environment for a server render. */
export function installSSR() {
  const g = globalThis as any
  g.__kaurySSR = true
  g.document = createDocument()
  return g.document
}
