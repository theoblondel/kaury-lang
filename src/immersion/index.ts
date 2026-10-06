// Immersion toolkit: loaded only when a page holds a 3D or Lottie object, after the page is displayed.
// Three.js behind the scenes; light, camera, shadows and animations have good defaults.
// The work is split into small steps so the page never freezes while the 3D starts.

import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { bodyOf, mouse, reducedMotion, writeBubble, motion } from '../runtime/motion.js'

let OrbitControls: any

const rad = (d: number) => (d * Math.PI) / 180

/** object "knot", color orange, metal: shapes made by Kaury, no file to load. */
export const SHAPE = /^\/?(sphere|cube|torus|knot|cone|cylinder|capsule|gem|pyramid|tore|noeud|cylindre|gemme|pyramide)$/i
function shapeModel(name: string, o: Record<string, any>): any {
  const n = name.replace(/^\//, '').toLowerCase()
  const geo =
    n === 'cube' ? new THREE.BoxGeometry(1.4, 1.4, 1.4, 4, 4, 4)
      : n === 'torus' || n === 'tore' ? new THREE.TorusGeometry(1, 0.38, 48, 160)
        : n === 'knot' || n === 'noeud' ? new THREE.TorusKnotGeometry(0.9, 0.3, 260, 40)
          : n === 'cone' ? new THREE.ConeGeometry(1, 1.8, 64)
            : n === 'cylinder' || n === 'cylindre' ? new THREE.CylinderGeometry(0.9, 0.9, 1.6, 64)
              : n === 'capsule' ? new THREE.CapsuleGeometry(0.6, 1, 16, 48)
                : n === 'gem' || n === 'gemme' ? new THREE.IcosahedronGeometry(1.1, 0)
                  : n === 'pyramid' || n === 'pyramide' ? new THREE.ConeGeometry(1.1, 1.6, 4)
                    : new THREE.SphereGeometry(1, 96, 64)
  const css = (v: unknown) => {
    const s = String(v ?? '')
    const m = /^var\((--[\w-]+)\)$/.exec(s)
    return m && typeof document !== 'undefined' ? getComputedStyle(document.documentElement).getPropertyValue(m[1]).trim() || '#f56e2e' : s || '#f56e2e'
  }
  const color = new THREE.Color(css(o.color ?? o.tint))
  const mat = new THREE.MeshPhysicalMaterial({
    color,
    metalness: o.metal ? 0.95 : 0.05,
    roughness: o.metal ? 0.22 : o.matte ? 0.95 : 0.35,
    clearcoat: o.matte ? 0 : 0.6,
    clearcoatRoughness: 0.2,
    transmission: o.glass ? 1 : 0,
    thickness: o.glass ? 1.2 : 0,
    ior: 1.4,
    emissive: o.glow ? color : new THREE.Color(0),
    emissiveIntensity: o.glow ? 0.6 : 0,
    flatShading: n === 'gem' || n === 'gemme',
  })
  const group = new THREE.Group()
  group.add(new THREE.Mesh(geo, mat))
  return { scene: group, animations: [] }
}
const lowEnd = () => (navigator.hardwareConcurrency ?? 8) <= 2 || ((navigator as any).deviceMemory ?? 8) <= 2
const isPhone = () => matchMedia('(max-width: 640px), (pointer: coarse)').matches
/** Gives the browser a breath between two heavy steps (keeps the page responsive). */
const breathe = () => new Promise<void>((r) => ((globalThis as any).scheduler?.yield ? (globalThis as any).scheduler.yield().then(r) : setTimeout(r, 0)))

function cssColor(host: Element, v: string | undefined, fallback: string): string {
  if (!v) return fallback
  const m = /^var\((--[\w-]+)\)$/.exec(v)
  if (m) return getComputedStyle(host).getPropertyValue(m[1]).trim() || fallback
  return v
}

function webglAvailable(): boolean {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

interface World {
  add(el: any, i: number, n: number): Promise<void>
  start(): void
}

async function createWorld(host: HTMLElement, settings: Record<string, any>, single: boolean): Promise<World | null> {
  if (!webglAvailable()) {
    host.classList.add('k-no-3d')
    return null
  }
  const light = lowEnd()
  const renderer = new THREE.WebGLRenderer({ antialias: !light, alpha: true, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, light ? 1 : isPhone() ? 1.5 : 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.05
  const canvas = renderer.domElement
  canvas.classList.add('k-canvas')
  canvas.setAttribute('aria-hidden', 'true')
  if (single) host.append(canvas)
  else host.prepend(canvas)
  await breathe()

  const scene = new THREE.Scene()
  const cam = new THREE.PerspectiveCamera(35, 1, 0.1, 200)
  const distance = Number(settings.cameraOptions?.distance ?? settings.distance ?? 6.5)
  cam.position.set(0, 0.3, distance)
  cam.lookAt(0, 0, 0)

  // soft environment for reflections (makes materials believable)
  const pmrem = new THREE.PMREMGenerator(renderer)
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  await breathe()

  if (settings.background && !single) {
    const c = cssColor(host, String(settings.background), '')
    if (c && !c.includes('gradient')) {
      try {
        scene.background = new THREE.Color(c)
      } catch {
        /* color Three cannot read: keep the CSS background */
      }
    }
  }
  if (settings.fog) {
    const c = cssColor(host, typeof settings.fog === 'string' ? settings.fog : undefined, getComputedStyle(host).backgroundColor || '#ffffff')
    try {
      scene.fog = new THREE.Fog(new THREE.Color(c), distance * 0.9, distance * 3)
    } catch {
      /* nothing */
    }
  }

  // light
  const lights = new THREE.Group()
  scene.add(lights)
  const shadows = !!settings.ground || !!settings.shadows
  if (shadows) {
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
  }
  const applyLight = (name: string) => {
    lights.clear()
    const dir = (color: number, intensity: number, x: number, y: number, z: number) => {
      const l = new THREE.DirectionalLight(color, intensity)
      l.position.set(x, y, z)
      if (shadows) {
        l.castShadow = true
        l.shadow.mapSize.set(1024, 1024)
        l.shadow.radius = 6
        l.shadow.camera.left = -5
        l.shadow.camera.right = 5
        l.shadow.camera.top = 5
        l.shadow.camera.bottom = -5
      }
      lights.add(l)
    }
    const hemi = (sky: number, ground: number, i: number) => lights.add(new THREE.HemisphereLight(sky, ground, i))
    let envI = 1
    switch (name) {
      case 'soft':
        hemi(0xffffff, 0xe8ecf5, 1.1)
        dir(0xffffff, 0.8, 2, 5, 4)
        envI = 0.7
        break
      case 'sunset':
        hemi(0xffc49a, 0x3a2350, 0.9)
        dir(0xff8a3d, 2.4, -5, 1.6, 2.5)
        dir(0x8f7bff, 0.6, 4, 2, -3)
        envI = 0.45
        break
      case 'night': {
        hemi(0x5566aa, 0x05060f, 0.45)
        dir(0x9fb4ff, 0.7, -2, 4, 3)
        const p = new THREE.PointLight(0xff4f8b, 18, 12)
        p.position.set(2.5, 1, 2.5)
        lights.add(p)
        envI = 0.25
        break
      }
      case 'neon': {
        const a = new THREE.PointLight(0xff2bd6, 40, 14)
        a.position.set(-3, 1.5, 2.5)
        const b = new THREE.PointLight(0x00e5ff, 40, 14)
        b.position.set(3, -0.5, 2.5)
        lights.add(a, b)
        hemi(0x222244, 0x000000, 0.3)
        envI = 0.3
        break
      }
      case 'day':
        hemi(0xdff1ff, 0xc9b28a, 1.2)
        dir(0xfff4e0, 2.2, 4, 7, 3)
        break
      case 'dramatic': {
        const s = new THREE.SpotLight(0xffffff, 60, 20, Math.PI / 7, 0.5, 1.2)
        s.position.set(2, 6, 3)
        if (shadows) s.castShadow = true
        lights.add(s)
        hemi(0x333344, 0x000000, 0.15)
        envI = 0.2
        break
      }
      default: // studio
        hemi(0xffffff, 0xd9dde6, 0.5)
        dir(0xffffff, 1.6, 3, 4, 5)
        dir(0xcfe0ff, 0.9, -4, 2, -3)
    }
    scene.environmentIntensity = envI
  }
  applyLight(String(settings.light ?? 'studio'))
  ;(host as any).$kApplySetting = (name: string, value: string) => {
    if (name === 'light') applyLight(value)
  }

  if (settings.ground) {
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: 0.22 }))
    ground.rotation.x = -Math.PI / 2
    ground.position.y = -1.1
    ground.receiveShadow = true
    scene.add(ground)
  }

  let updateParticles: ((t: number, dt: number) => void) | null = null
  if (settings.particles) {
    const kind = Array.isArray(settings.particles) ? settings.particles[0] : settings.particles === true ? 'dust' : settings.particles
    updateParticles = particles(scene, String(kind))
  }

  // camera
  const camMode = String(settings.camera ?? 'fixed')
  let controls: any = null
  if (camMode === 'free' || camMode === 'orbit') {
    OrbitControls ??= (await import('three/examples/jsm/controls/OrbitControls.js')).OrbitControls
    controls = new OrbitControls(cam, canvas)
    controls.enableDamping = true
    controls.enableZoom = false
    controls.enablePan = false
    controls.autoRotate = camMode === 'orbit'
    controls.autoRotateSpeed = 1.2
    canvas.style.touchAction = 'pan-y'
  }

  let width = 0, height = 0
  const resize = () => {
    const r = host.getBoundingClientRect()
    width = Math.max(1, r.width)
    height = Math.max(1, r.height)
    renderer.setSize(width, height, false)
    cam.aspect = width / height
    // on a narrow screen, step back so everything stays visible
    cam.position.z = distance * (cam.aspect < 0.8 ? 1.35 : 1)
    cam.updateProjectionMatrix()
  }
  resize()
  new ResizeObserver(resize).observe(host)

  // we never draw what nobody sees
  let visible = true
  new IntersectionObserver((es) => (visible = es.some((e) => e.isIntersecting)), { rootMargin: '80px' }).observe(host)

  const pivots: { pivot: any; el: any }[] = []
  const mixers: any[] = []
  const bubbles: { el: HTMLElement; pivot: any; top: number }[] = []
  const ray = new THREE.Raycaster()
  const pointer = new THREE.Vector2()

  const hit = (e: MouseEvent) => {
    const r = canvas.getBoundingClientRect()
    pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
    ray.setFromCamera(pointer, cam)
    for (const p of pivots) if (ray.intersectObject(p.pivot, true).length) return p
    return null
  }
  if (!single) {
    canvas.style.pointerEvents = 'auto'
    host.addEventListener('click', (e) => {
      if (e.target !== canvas) return
      const p = hit(e)
      if (p) p.el.dispatchEvent(new MouseEvent('click', { bubbles: false }))
    })
    let hovered: any = null
    host.addEventListener('pointermove', (e) => {
      if (e.target !== canvas) return
      const p = hit(e)
      if (p?.el !== hovered?.el) {
        if (p) p.el.dispatchEvent(new MouseEvent('mouseenter'))
        hovered = p
        canvas.style.cursor = p && p.el.classList.contains('k-clickable') ? 'pointer' : ''
      }
    })
  }

  let prev = performance.now()
  const t0 = prev
  let running = false
  const loop = () => {
    requestAnimationFrame(loop)
    const ts = performance.now()
    const dt = Math.min(0.05, (ts - prev) / 1000)
    prev = ts
    if (!visible) return
    const time = (ts - t0) / 1000
    for (const m of mixers) m.update(dt)
    updateParticles?.(time, dt)
    if (controls) controls.update()
    else if (camMode === 'follows-mouse' && !reducedMotion()) {
      cam.position.x += (mouse.x * 0.9 - cam.position.x) * 0.05
      cam.position.y += (0.3 - mouse.y * 0.5 - cam.position.y) * 0.05
      cam.lookAt(0, 0, 0)
    } else if (camMode === 'fly' && !reducedMotion()) {
      const a = time * 0.18
      const d = Math.hypot(cam.position.x, cam.position.z) || distance
      cam.position.x = Math.sin(a) * d
      cam.position.z = Math.cos(a) * d
      cam.position.y = 0.6 + Math.sin(time * 0.3) * 0.3
      cam.lookAt(0, 0, 0)
    }
    // speech bubbles attached to 3D objects
    for (const b of bubbles) {
      const v = new THREE.Vector3(0, b.top, 0)
      b.pivot.localToWorld(v)
      v.project(cam)
      b.el.style.left = `${((v.x + 1) / 2) * width}px`
      b.el.style.top = `${((1 - v.y) / 2) * height}px`
    }
    renderer.render(scene, cam)
  }

  // compressed models (Meshopt, Draco) open too
  const loader = new GLTFLoader()
  loader.setMeshoptDecoder(MeshoptDecoder)
  const draco = new DRACOLoader()
  draco.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/')
  loader.setDRACOLoader(draco)

  return {
    async add(el: any, i: number, n: number) {
      const o = el.$kObject?.options ?? {}
      const src = el.getAttribute('data-src')
      const gltf: any = SHAPE.test(src) ? shapeModel(src, o) : await new Promise((ok, ko) => loader.load(src, ok, undefined, (e: any) => ko(new Error(`cannot load "${src}" (${e?.message ?? 'file not found'}).`))))
      await breathe()
      const model = gltf.scene
      // center and scale: any model arrives well framed
      const box = new THREE.Box3().setFromObject(model)
      const size = box.getSize(new THREE.Vector3())
      const center = box.getCenter(new THREE.Vector3())
      const biggest = Math.max(size.x, size.y, size.z) || 1
      const scale = (2.2 / biggest) * Number(o.size ?? 1)
      model.position.sub(center)
      const pivot = new THREE.Group()
      const fitter = new THREE.Group()
      fitter.scale.setScalar(scale)
      fitter.add(model)
      pivot.add(fitter)
      model.traverse((m: any) => {
        if (m.isMesh) m.castShadow = shadows
      })
      const base = { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0 }
      if (Array.isArray(o.position)) {
        base.x = Number(o.position[0] ?? 0)
        base.y = Number(o.position[1] ?? 0)
        base.z = Number(o.position[2] ?? 0)
      } else if (n > 1) base.x = (i - (n - 1) / 2) * Math.min(2.6, 6 / n)
      if (Array.isArray(o.rotation)) {
        base.rx = rad(Number(o.rotation[0] ?? 0))
        base.ry = rad(Number(o.rotation[1] ?? 0))
        base.rz = rad(Number(o.rotation[2] ?? 0))
      }
      pivot.position.set(base.x, base.y, base.z)
      scene.add(pivot)
      const top = (size.y * scale) / 2
      pivots.push({ pivot, el })
      // shaders are compiled in the background before the first frame (no freeze)
      if ((renderer as any).compileAsync) await (renderer as any).compileAsync(scene, cam).catch(() => {})
      await breathe()

      // named animations (character)
      const body = bodyOf(el)
      if (gltf.animations?.length) {
        const mixer = new THREE.AnimationMixer(model)
        mixers.push(mixer)
        let current: any = null
        const find = (name?: string) => {
          if (!name) return gltf.animations.find((a: any) => /idle|wait|stand|rest|attend|repos/i.test(a.name)) ?? gltf.animations[0]
          const s = String(name).toLowerCase()
          return gltf.animations.find((a: any) => a.name.toLowerCase() === s) ?? gltf.animations.find((a: any) => a.name.toLowerCase().includes(s))
        }
        body.play = (name: string, opts: any = {}) => {
          const clip = find(name)
          if (!clip) {
            console.warn(`Kaury: the animation "${name}" does not exist. Available: ${gltf.animations.map((a: any) => a.name).join(', ')}`)
            return
          }
          const act = mixer.clipAction(clip)
          act.reset()
          act.setLoop(opts.once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity)
          act.clampWhenFinished = true
          act.fadeIn(0.3).play()
          if (current && current !== act) current.fadeOut(0.3)
          current = act
        }
        body.play(o.animation ?? el.$kStartAnimation)
      }

      // entrance
      const intro = { start: performance.now(), duration: 1100 }
      const from = { x: 0, y: 0, s: 0.0001 }
      const cls = el.className as string
      if (/k-enter(-now)?-left/.test(cls)) Object.assign(from, { x: -4, s: 1 })
      if (/k-enter(-now)?-right/.test(cls)) Object.assign(from, { x: 4, s: 1 })
      if (/k-enter(-now)?-bottom/.test(cls)) Object.assign(from, { y: -3, s: 1 })
      if (/k-enter(-now)?-top/.test(cls)) Object.assign(from, { y: 3, s: 1 })
      const spring = (p: number) => (p >= 1 ? 1 : 1 - Math.pow(2, -10 * p) * Math.cos(p * 7.5))

      // adapter: Kaury motions drive the 3D pivot
      body.adapter = '3d'
      Object.defineProperty(body, 'visible', { get: () => visible, set: () => {}, configurable: true })
      body.apply = (t) => {
        const p = Math.min(1, (performance.now() - intro.start) / intro.duration)
        const e = reducedMotion() ? 1 : spring(p)
        pivot.position.set(base.x + t.x / 100 + from.x * (1 - e), base.y - t.y / 100 + from.y * (1 - e), base.z + t.z / 100)
        pivot.rotation.set(base.rx + rad(t.rx), base.ry + rad(t.ry), base.rz + rad(t.rz))
        pivot.scale.setScalar(t.s * (from.s + (1 - from.s) * e))
      }
      body.apply({ x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0, s: 1, o: 1 })
      // speech bubble above the object
      body.says = (text: string, opts: any) => {
        let b = bubbles.find((x) => x.pivot === pivot)
        if (!b) {
          const elB = document.createElement('div')
          elB.className = 'k-bubble k-bubble-3d'
          elB.setAttribute('role', 'status')
          host.append(elB)
          b = { el: elB, pivot, top }
          bubbles.push(b)
        }
        writeBubble(b.el, text, opts)
      }
      if (el.$kPendingSays) {
        const [text, opts] = el.$kPendingSays
        el.$kPendingSays = null
        setTimeout(() => body.says!(text, opts), 500)
      }
      // an object without motion stays alive: a very light breathing
      if (!body.motions.length) motion(el, 'float', { value: 0.04, slow: true })
      else motion(el, '_watch', {})
      el.classList.add('k-ready')
      host.classList.add('k-ready')
    },
    start() {
      if (running) return
      running = true
      loop()
    },
  }
}

export async function mountSingleObject(el: any) {
  const settings = { ...(el.$kSettings ?? {}), shadows: el.$kObject?.options?.shadows }
  const world = await createWorld(el, settings, true)
  if (!world) return
  await world.add(el, 0, 1)
  world.start()
}

export async function mountScene(el: any) {
  const s = el.$kScene
  const world = await createWorld(el, s.settings, false)
  if (!world) return
  world.start()
  for (const [i, o] of s.objects.entries()) {
    try {
      await world.add(o, i, s.objects.length)
    } catch (e) {
      console.error('Kaury:', e)
      o.classList.add('k-immersion-error')
    }
  }
}

export async function mountLottie(el: any) {
  const lottie = (await import('lottie-web')).default
  const anim = lottie.loadAnimation({ container: el, renderer: 'svg', loop: true, autoplay: !reducedMotion(), path: el.getAttribute('data-src') })
  const body = bodyOf(el)
  body.play = (name: string, o: any = {}) => {
    if (!name) return anim.play()
    try {
      anim.goToAndPlay(name, true)
      anim.loop = !o.once
    } catch {
      console.warn(`Kaury: the marker "${name}" does not exist in the Lottie animation.`)
    }
  }
  if (el.$kStartAnimation) body.play(el.$kStartAnimation)
  el.classList.add('k-ready')
}

// ---------------- particles ----------------
function particles(scene: any, kind: string) {
  const n = kind === 'stars' ? 900 : kind === 'confetti' ? 260 : 400
  const pos = new Float32Array(n * 3)
  const speed = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 16
    pos[i * 3 + 1] = (Math.random() - 0.5) * 10
    pos[i * 3 + 2] = (Math.random() - 0.5) * 10 - 2
    speed[i] = 0.3 + Math.random() * 0.7
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  const colors: Record<string, number> = { stars: 0xffffff, snow: 0xffffff, bubbles: 0xbfe9ff, dust: 0xfff1d6, confetti: 0xff4f8b }
  const sizes: Record<string, number> = { stars: 0.05, snow: 0.08, bubbles: 0.16, dust: 0.05, confetti: 0.1 }
  if (kind === 'confetti') {
    const c = new Float32Array(n * 3)
    const pal = [0xff4f8b, 0xffc53d, 0x30a46c, 0x0090ff, 0x8e4ec6].map((x) => new THREE.Color(x))
    for (let i = 0; i < n; i++) {
      const col = pal[i % pal.length]
      c.set([col.r, col.g, col.b], i * 3)
    }
    geo.setAttribute('color', new THREE.BufferAttribute(c, 3))
  }
  // round, soft dot (otherwise Three draws squares)
  const c2 = document.createElement('canvas')
  c2.width = c2.height = 64
  const g2 = c2.getContext('2d')!
  const grad = g2.createRadialGradient(32, 32, 0, 32, 32, 32)
  if (kind === 'bubbles') {
    grad.addColorStop(0, 'rgba(255,255,255,0.05)')
    grad.addColorStop(0.75, 'rgba(255,255,255,0.35)')
    grad.addColorStop(0.9, 'rgba(255,255,255,0.9)')
    grad.addColorStop(1, 'rgba(255,255,255,0)')
  } else {
    grad.addColorStop(0, 'rgba(255,255,255,1)')
    grad.addColorStop(0.4, 'rgba(255,255,255,0.8)')
    grad.addColorStop(1, 'rgba(255,255,255,0)')
  }
  g2.fillStyle = grad
  g2.fillRect(0, 0, 64, 64)
  const sprite = new THREE.CanvasTexture(c2)
  sprite.colorSpace = THREE.SRGBColorSpace
  const mat = new THREE.PointsMaterial({
    map: sprite,
    color: kind === 'confetti' ? 0xffffff : colors[kind] ?? 0xffffff,
    vertexColors: kind === 'confetti',
    size: sizes[kind] ?? 0.05,
    transparent: true,
    opacity: kind === 'dust' ? 0.6 : 0.9,
    depthWrite: false,
    sizeAttenuation: true,
  })
  const points = new THREE.Points(geo, mat)
  scene.add(points)
  return (t: number, dt: number) => {
    if (reducedMotion()) return
    const p = geo.attributes.position.array as Float32Array
    for (let i = 0; i < n; i++) {
      const v = speed[i]
      if (kind === 'snow' || kind === 'confetti') {
        p[i * 3 + 1] -= v * dt * 0.8
        p[i * 3] += Math.sin(t + i) * dt * 0.2
        if (p[i * 3 + 1] < -5) p[i * 3 + 1] = 5
      } else if (kind === 'bubbles') {
        p[i * 3 + 1] += v * dt * 0.6
        p[i * 3] += Math.sin(t * 2 + i) * dt * 0.1
        if (p[i * 3 + 1] > 5) p[i * 3 + 1] = -5
      } else if (kind === 'dust') {
        p[i * 3 + 1] += Math.sin(t * 0.5 + i) * dt * 0.05
        p[i * 3] += Math.cos(t * 0.3 + i) * dt * 0.05
      }
    }
    geo.attributes.position.needsUpdate = true
    if (kind === 'stars') {
      points.rotation.y = t * 0.01
      mat.opacity = 0.75 + Math.sin(t * 2) * 0.15
    }
  }
}
