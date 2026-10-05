// Ready-made motions (spin, float, follows mouse…) and the bridge to 2D/3D immersion.
// The same motions work on a title, a 2D image or a 3D model: every "body" has an
// adapter that applies the transform (CSS or Three.js).

import { reactive, state, onCleanup, batch, markDynamic } from './reactive.js'
import { inBrowser, h } from './dom.js'

// ---------------- global reactive values ----------------
export const mouse = reactive({ x: 0, y: 0, pixelX: 0, pixelY: 0 })
export const scroll = state(0)
export const screen = reactive({ width: 1280, height: 800, mobile: false, tablet: false })
export const route = reactive({ path: '/', params: {} as Record<string, string> })

let globalsReady = false
const rawMouse = { x: 0, y: 0, px: 0, py: 0 }
let mouseMoved = false
let reduced = false
export const reducedMotion = () => reduced

export function startGlobals() {
  if (globalsReady || !inBrowser()) return
  globalsReady = true
  const updateScreen = () => batch(() => {
    screen.width = innerWidth
    screen.height = innerHeight
    screen.mobile = innerWidth <= 640
    screen.tablet = innerWidth <= 1024
  })
  updateScreen()
  addEventListener('resize', updateScreen, { passive: true })
  addEventListener('pointermove', (e) => {
    rawMouse.x = (e.clientX / innerWidth) * 2 - 1
    rawMouse.y = (e.clientY / innerHeight) * 2 - 1
    rawMouse.px = e.clientX
    rawMouse.py = e.clientY
    mouseMoved = true
  }, { passive: true })
  const updateScroll = () => {
    const max = document.documentElement.scrollHeight - innerHeight
    scroll.v = max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0
  }
  addEventListener('scroll', updateScroll, { passive: true })
  updateScroll()
  reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
}

// ---------------- animated bodies ----------------
export interface Transform {
  x: number; y: number; z: number // px (DOM) — the 3D adapter converts
  rx: number; ry: number; rz: number // degrees
  s: number
  o: number
}
export interface Motion {
  type: string
  o: Record<string, any>
  start: number
  duration?: number // one-shot actions
  state?: any
}
export interface Body {
  el: any
  motions: Motion[]
  actions: Motion[]
  apply: (t: Transform) => void
  visible: boolean
  p0?: number
  smooth: Transform
  adapter: '2d' | '3d'
  play?: (name: string, o?: any) => void
  says?: (text: string, o?: any) => void
}

const bodies = new Set<Body>()
let looping = false
let last = 0

const neutral = (): Transform => ({ x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0, s: 1, o: 1 })

export function bodyOf(el: any): Body {
  if (el.$kBody) return el.$kBody
  const b: Body = {
    el,
    motions: [],
    actions: [],
    visible: true,
    smooth: neutral(),
    adapter: '2d',
    apply: (t) => {
      const target = el.$kVisual ?? el
      target.style.transform = `translate3d(${t.x}px, ${t.y}px, 0) rotateX(${t.rx}deg) rotateY(${t.ry}deg) rotateZ(${t.rz}deg) scale(${t.s})`
      if (t.o !== 1) target.style.opacity = String(t.o)
    },
  }
  el.$kBody = b
  return b
}

function watch(b: Body) {
  if (!inBrowser()) return
  bodies.add(b)
  if (typeof IntersectionObserver !== 'undefined' && b.el.nodeType === 1) {
    const io = new IntersectionObserver((es) => {
      for (const e of es) b.visible = e.isIntersecting
    }, { rootMargin: '100px' })
    io.observe(b.el)
    onCleanup(() => {
      io.disconnect()
      bodies.delete(b)
    })
  }
  if (!looping) {
    looping = true
    requestAnimationFrame(frame)
  }
}

function progress(el: any): number {
  const r = el.getBoundingClientRect?.()
  if (!r) return 0
  const vh = innerHeight
  return Math.min(1, Math.max(0, (vh - r.top) / (vh + r.height)))
}

function frame(ts: number) {
  const dt = Math.min(0.05, last ? (ts - last) / 1000 : 0.016)
  last = ts
  const time = ts / 1000
  if (mouseMoved) {
    batch(() => {
      mouse.x = rawMouse.x
      mouse.y = rawMouse.y
      mouse.pixelX = rawMouse.px
      mouse.pixelY = rawMouse.py
    })
    mouseMoved = false
  }
  for (const b of bodies) {
    if (!b.visible && !b.actions.length) continue
    if (!b.el.isConnected && b.el.nodeType === 1) continue
    const t = neutral()
    const p = progress(b.el)
    if (b.p0 === undefined) b.p0 = p
    for (const m of b.motions) if (!reduced || m.type === 'follows-mouse') applyMotion(m, b, t, time, dt, p)
    b.actions = b.actions.filter((a) => applyAction(a, t, ts))
    b.apply(t)
  }
  requestAnimationFrame(frame)
}

const speedOf = (o: Record<string, any>, base: number) => (o.slow ? base * 0.4 : o.fast ? base * 2.5 : base)

function applyMotion(m: Motion, b: Body, t: Transform, time: number, dt: number, p: number) {
  const o = m.o
  switch (m.type) {
    case 'spin': {
      const axis = o.x ? 'rx' : o.z ? 'rz' : 'ry'
      if (o['on-scroll']) {
        const turns = typeof o['on-scroll'] === 'number' ? o['on-scroll'] : 1
        t[axis] += (p - (b.p0 ?? 0)) * 360 * turns * (o.reverse ? -1 : 1) * 1.6
      } else {
        m.state = (m.state ?? 0) + (o.speed ?? speedOf(o, 40)) * dt * (o.reverse ? -1 : 1)
        t[axis] += m.state
      }
      break
    }
    case 'float': {
      const amp = typeof o.value === 'number' ? o.value * 100 : o.speed ?? 14
      t.y += Math.sin(time * speedOf(o, 1.3) + (m.start % 7)) * amp
      t.rz += Math.sin(time * 0.9) * 1.5
      break
    }
    case 'pulse':
      t.s *= 1 + Math.sin(time * speedOf(o, 3)) * (typeof o.speed === 'number' ? o.speed / 100 : 0.05)
      break
    case 'sway':
      t.rz += Math.sin(time * speedOf(o, 1.6)) * (o.speed ?? 6)
      break
    case 'jump': {
      // jumps regularly
      const ph = ((time + (m.start % 3)) % 2.6) / 0.55
      if (ph < 1) t.y -= Math.sin(ph * Math.PI) * (o.speed ?? 40)
      break
    }
    case 'follows-mouse': {
      const force = o.speed ?? 1
      const target = { rx: -mouse.y * 14 * force, ry: mouse.x * 24 * force, x: mouse.x * 10 * force, y: mouse.y * 6 * force }
      const k = o.smooth ? 0.04 : o.fast ? 0.3 : 0.12
      const s = b.smooth
      s.rx += (target.rx - s.rx) * k
      s.ry += (target.ry - s.ry) * k
      s.x += (target.x - s.x) * k
      s.y += (target.y - s.y) * k
      t.rx += s.rx
      t.ry += s.ry
      if (b.adapter === '2d') {
        t.x += s.x
        t.y += s.y
      }
      break
    }
    case 'parallax': {
      const f = typeof o.speed === 'number' ? o.speed : typeof o.value === 'number' ? o.value : 0.3
      t.y += (p - 0.5) * -400 * f
      break
    }
  }
}

const easeOut = (p: number) => 1 - Math.pow(1 - p, 3)

function applyAction(a: Motion, t: Transform, ts: number): boolean {
  const p = Math.min(1, (ts - a.start) / (a.duration ?? 700))
  switch (a.type) {
    case 'jump':
      t.y -= Math.sin(p * Math.PI) * (a.o.speed ?? 60)
      t.s *= 1 + Math.sin(p * Math.PI) * 0.04
      break
    case 'spin':
      t[a.o.x ? 'rx' : a.o.z ? 'rz' : 'ry'] += easeOut(p) * (a.o.speed ?? 360)
      break
    case 'pulse':
      t.s *= 1 + Math.sin(p * Math.PI) * 0.15
      break
    case 'sway':
      t.rz += Math.sin(p * Math.PI * 4) * (1 - p) * 12
      break
    case 'float':
      t.y -= Math.sin(p * Math.PI) * 20
      break
  }
  return p < 1
}

/** Adds a permanent motion to an element or an object. */
export function motion(el: any, type: string, o: Record<string, any> = {}) {
  if (!el) return
  if (type !== 'enters-from') markDynamic()
  if (type === 'says') {
    if (inBrowser()) setTimeout(() => says(el, o.value ?? o.word ?? '', o), 600)
    return
  }
  if (type === 'play') {
    const b = bodyOf(el)
    const name = o.value ?? o.word
    if (b.play) b.play(name, o)
    else el.$kStartAnimation = name
    return
  }
  if (type === 'enters-from') return entersFrom(el, o)
  const b = bodyOf(el)
  b.motions.push({ type, o, start: Math.random() * 10 })
  if (inBrowser()) watch(b)
}

/** One-shot motion triggered by an action (on click -> jump). */
export function action(el: any, type: string, o: Record<string, any> = {}) {
  if (!el || !inBrowser()) return
  if (type === 'says') return says(el, o.value ?? o.word ?? '', o)
  if (type === 'play') return bodyOf(el).play?.(o.value ?? o.word, o)
  const b = bodyOf(el)
  const durations: Record<string, number> = { jump: 650, spin: 900, pulse: 450, sway: 900, float: 900 }
  b.actions.push({ type, o, start: performance.now(), duration: o.duration ?? durations[type] ?? 700 })
  watch(b)
}

function entersFrom(el: any, o: Record<string, any>) {
  // pure CSS (scroll-driven animation): no JavaScript, content visible even without it
  const dir = Object.keys(o).find((k) => ['left', 'right', 'top', 'bottom', 'fade', 'zoom'].includes(k)) ?? o.word ?? 'bottom'
  el.classList.add('k-enter', `k-enter-${dir}`)
}

// ---------------- speech bubbles ----------------
export function says(el: any, text: string, o: Record<string, any> = {}) {
  if (!inBrowser() || !el) return
  const b = bodyOf(el)
  if (b.says) return b.says(String(text), o)
  if (el.classList?.contains('k-3d')) {
    // the 3D model is not loaded yet: it will talk as soon as it is there
    el.$kPendingSays = [String(text), o]
    return
  }
  let bubble: HTMLElement = el.$kBubble
  if (!bubble) {
    bubble = document.createElement('div')
    bubble.className = 'k-bubble'
    bubble.setAttribute('role', 'status')
    el.$kBubble = bubble
    if (getComputedStyle(el).position === 'static') el.style.position = 'relative'
    el.append(bubble)
  }
  writeBubble(bubble, String(text), o)
}

export function writeBubble(bubble: HTMLElement, text: string, o: Record<string, any> = {}) {
  clearTimeout((bubble as any).$kTimer)
  clearInterval((bubble as any).$kTyping)
  bubble.textContent = ''
  bubble.classList.add('k-bubble-visible')
  let i = 0
  ;(bubble as any).$kTyping = setInterval(() => {
    bubble.textContent = text.slice(0, ++i)
    if (i >= text.length) clearInterval((bubble as any).$kTyping)
  }, reduced ? 0 : 28)
  if (!o.stays) {
    ;(bubble as any).$kTimer = setTimeout(() => bubble.classList.remove('k-bubble-visible'), Math.max(2600, text.length * 70))
  }
}

// ---------------- objects, scenes, sounds ----------------
const named = new Map<string, any>()
export const objects = new Proxy({}, { get: (_t, k) => named.get(String(k)) })
export function namedObject(name: string) {
  return named.get(name)
}

const EXT_3D = /\.(glb|gltf)(\?|#|$)/i
const EXT_LOTTIE = /\.(json|lottie)(\?|#|$)/i

export interface ObjectOptions {
  kind: 'object' | 'character'
  src: string
  name: string | null
  options: Record<string, any>
}

export function object(parent: any, d: ObjectOptions): any {
  markDynamic()
  const el = h(parent, 'div', `k-object k-${d.kind}`)
  const src = String(d.src ?? '')
  const o = d.options ?? {}
  el.$kObject = d
  if (d.name) {
    named.set(d.name, el)
    el.setAttribute('data-name', d.name)
  }
  const scene = parent?.$kScene
  const label = () => {
    if (o.alt) {
      el.setAttribute('role', 'img')
      el.setAttribute('aria-label', String(o.alt))
    }
  }
  if (EXT_3D.test(src)) {
    el.classList.add('k-3d')
    el.setAttribute('data-src', src)
    label()
    if (o.fallback) {
      const im = h(el, 'img', 'k-fallback')
      im.setAttribute('src', o.fallback)
      im.setAttribute('alt', o.alt ?? '')
    }
    if (!scene) {
      // a "touch": an object alone in the page gets its own small scene
      if (o.height) el.style.height = typeof o.height === 'number' ? `${o.height}px` : o.height
      mountWhenVisible(el, () => import('../immersion/index.js').then((m) => m.mountSingleObject(el)), o.immediate ? 'immediate' : 'wait')
    } else scene.objects.push(el)
  } else if (EXT_LOTTIE.test(src)) {
    el.classList.add('k-lottie')
    el.setAttribute('data-src', src)
    label()
    mountWhenVisible(el, () => import('../immersion/index.js').then((m) => m.mountLottie(el)), 'none')
    if (scene) scene.layers.push(el)
  } else {
    const im = h(el, 'img', 'k-object-image')
    im.setAttribute('src', src)
    im.setAttribute('alt', o.alt ?? '')
    im.setAttribute('draggable', 'false')
    im.setAttribute('decoding', 'async')
    el.$kVisual = im
    if (scene) scene.layers.push(el)
  }
  if (o.size && !EXT_3D.test(src)) el.style.setProperty('--k-size', String(o.size))
  if (o.position && !EXT_3D.test(src) && Array.isArray(o.position)) {
    el.classList.add('k-placed')
    el.style.left = `${50 + Number(o.position[0]) * 10}%`
    el.style.top = `${50 - Number(o.position[1]) * 10}%`
  }
  bodyOf(el)
  return el
}

export function scene(parent: any, o: Record<string, any> = {}): any {
  markDynamic()
  const el = h(parent, 'div', 'k-scene')
  el.$kScene = { objects: [] as any[], layers: [] as any[], settings: { ...o } as Record<string, any> }
  if (o.height) el.style.height = typeof o.height === 'number' ? `${o.height}px` : o.height
  if (o.background && typeof o.background === 'string') el.style.background = o.background
  return el
}

export function sceneReady(el: any) {
  const s = el.$kScene
  // 2D objects: spread from left to right when they have no position
  const free = (s?.layers ?? []).filter((c: any) => !c.classList.contains('k-placed'))
  free.forEach((c: any, i: number) => {
    if (free.length > 1) c.style.left = `${((i + 1) / (free.length + 1)) * 100}%`
  })
  if (!s?.objects.length && !s?.settings.particles) return
  el.classList.add('k-scene-3d')
  mountWhenVisible(el, () => import('../immersion/index.js').then((m) => m.mountScene(el)), s.settings.immediate ? 'immediate' : 'wait')
}

export function setting(el: any, name: string, value: string, options: Record<string, any> = {}) {
  if (!el) return
  const s = el.$kScene ?? el.$kSettings ?? (el.$kSettings = {})
  const target = s.settings ?? s
  target[name] = value
  if (Object.keys(options).length) target[name + 'Options'] = options
  el.$kApplySetting?.(name, value, options)
}

/**
 * Waits until the page is loaded and the visitor has done something (moved the mouse, scrolled,
 * touched, typed): the heavy 3D never competes with the first display ("facade" pattern).
 * A scene marked « immediate » starts as soon as the page is loaded and the browser is idle.
 */
let interacted = false
let waiters: (() => void)[] = []
if (typeof window !== 'undefined' && !(globalThis as any).__kaurySSR) {
  const wake = () => {
    if (interacted) return
    interacted = true
    for (const e of ['pointermove', 'pointerdown', 'scroll', 'keydown', 'touchstart', 'wheel']) removeEventListener(e, wake)
    waiters.splice(0).forEach((f) => f())
  }
  for (const e of ['pointermove', 'pointerdown', 'scroll', 'keydown', 'touchstart', 'wheel']) addEventListener(e, wake, { passive: true })
}
function afterLoad(immediate = false): Promise<void> {
  return new Promise((done) => {
    const idle = () => ('requestIdleCallback' in window ? (window as any).requestIdleCallback(() => done(), { timeout: 1500 }) : setTimeout(done, 300))
    const loaded = () => (immediate || interacted ? idle() : waiters.push(idle))
    if (document.readyState === 'complete') loaded()
    else addEventListener('load', loaded, { once: true })
  })
}

function mountWhenVisible(el: any, mount: () => Promise<unknown>, mode: 'wait' | 'immediate' | 'none' = 'wait') {
  if (!inBrowser()) return
  let done = false
  const go = () => {
    if (done) return
    done = true
    ;(mode === 'none' ? Promise.resolve() : afterLoad(mode === 'immediate')).then(mount).catch((e) => {
      console.error('Kaury immersion:', e)
      el.classList.add('k-immersion-error')
    })
  }
  if (typeof IntersectionObserver === 'undefined') return queueMicrotask(go)
  const io = new IntersectionObserver((es) => {
    if (es.some((e) => e.isIntersecting)) {
      io.disconnect()
      go()
    }
  }, { rootMargin: '300px' })
  requestAnimationFrame(() => io.observe(el))
  onCleanup(() => io.disconnect())
}

// sounds
let muted = false
const sounds = new Set<HTMLAudioElement>()
export function sound(parent: any, src: string, o: Record<string, any> = {}): any {
  markDynamic()
  const el = h(parent, 'div', 'k-sound')
  if (!inBrowser()) return el
  const audio = new Audio(src)
  audio.loop = !!o.loop
  audio.volume = typeof o.volume === 'number' ? o.volume : 0.6
  audio.preload = 'auto'
  sounds.add(audio)
  // most browsers block sound before an interaction: wait for the first gesture
  const start = () => {
    if (!muted) audio.play().catch(() => {})
    removeEventListener('pointerdown', start)
    removeEventListener('keydown', start)
  }
  addEventListener('pointerdown', start)
  addEventListener('keydown', start)
  muteButton()
  onCleanup(() => {
    audio.pause()
    sounds.delete(audio)
  })
  return el
}

export function playSound(src: string, o: Record<string, any> = {}) {
  if (!inBrowser() || muted) return
  const a = new Audio(src)
  a.volume = typeof o.volume === 'number' ? o.volume : 0.7
  a.play().catch(() => {})
}

let buttonMade = false
function muteButton() {
  if (buttonMade) return
  buttonMade = true
  const b = document.createElement('button')
  b.className = 'k-mute'
  b.type = 'button'
  const update = () => {
    b.textContent = muted ? '🔇' : '🔊'
    b.setAttribute('aria-label', muted ? 'Turn sound on' : 'Turn sound off')
  }
  update()
  b.addEventListener('click', () => {
    muted = !muted
    for (const s of sounds) {
      if (muted) s.pause()
      else s.play().catch(() => {})
    }
    update()
  })
  document.body.append(b)
}
