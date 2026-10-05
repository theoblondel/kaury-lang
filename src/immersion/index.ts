// Boîte à outils d'immersion : chargée seulement quand une page contient un objet 3D ou Lottie.
// Three.js en coulisse ; lumière, caméra, ombres et animations ont de bons réglages par défaut.

import { corpsDe, souris, mouvementReduit, ecritBulle } from '../runtime/mouvements.js'

type T3 = typeof import('three')
let THREE: T3
let chargement: Promise<void> | null = null
let GLTFLoader: any, RoomEnvironment: any, OrbitControls: any, MeshoptDecoder: any, DRACOLoader: any

async function chargeThree() {
  if (!chargement) {
    chargement = (async () => {
      THREE = await import('three')
      ;({ GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js'))
      ;({ RoomEnvironment } = await import('three/examples/jsm/environments/RoomEnvironment.js'))
      ;({ OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js'))
      ;({ MeshoptDecoder } = await import('three/examples/jsm/libs/meshopt_decoder.module.js'))
      ;({ DRACOLoader } = await import('three/examples/jsm/loaders/DRACOLoader.js'))
    })()
  }
  return chargement
}

const rad = (d: number) => (d * Math.PI) / 180
const faible = () => (navigator.hardwareConcurrency ?? 8) <= 2 || ((navigator as any).deviceMemory ?? 8) <= 2
const mobile = () => matchMedia('(max-width: 640px), (pointer: coarse)').matches

function couleurCss(hote: Element, v: string | undefined, defaut: string): string {
  if (!v) return defaut
  const m = /^var\((--[\w-]+)\)$/.exec(v)
  if (m) return getComputedStyle(hote).getPropertyValue(m[1]).trim() || defaut
  return v
}

function webglDisponible(): boolean {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

interface Monde {
  ajoute(el: any, i: number, n: number): Promise<void>
  demarre(): void
}

async function creeMonde(hote: HTMLElement, reglages: Record<string, any>, seul: boolean): Promise<Monde | null> {
  if (!webglDisponible()) {
    hote.classList.add('k-sans-3d')
    return null
  }
  await chargeThree()
  const leger = faible()
  const renderer = new THREE.WebGLRenderer({ antialias: !leger, alpha: true, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, leger ? 1 : mobile() ? 1.5 : 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.05
  const toile = renderer.domElement
  toile.classList.add('k-toile')
  toile.setAttribute('aria-hidden', 'true')
  if (seul) hote.append(toile)
  else hote.prepend(toile)

  const scene = new THREE.Scene()
  const cam = new THREE.PerspectiveCamera(35, 1, 0.1, 200)
  const recul = Number(reglages.cameraOptions?.distance ?? reglages.distance ?? 6.5)
  cam.position.set(0, 0.3, recul)
  cam.lookAt(0, 0, 0)

  // environnement doux pour les reflets (rend les matières crédibles)
  const pmrem = new THREE.PMREMGenerator(renderer)
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  scene.environment = env

  // fond, brouillard
  if (reglages.fond && !seul) {
    const c = couleurCss(hote, String(reglages.fond), '')
    if (c && !c.includes('gradient')) {
      try {
        scene.background = new THREE.Color(c)
      } catch {
        /* couleur non lisible par Three : on garde le fond CSS */
      }
    }
  }
  if (reglages.brouillard) {
    const c = couleurCss(hote, typeof reglages.brouillard === 'string' ? reglages.brouillard : undefined, getComputedStyle(hote).backgroundColor || '#ffffff')
    try {
      scene.fog = new THREE.Fog(new THREE.Color(c), recul * 0.9, recul * 3)
    } catch {
      /* rien */
    }
  }

  // lumière
  const groupeLumiere = new THREE.Group()
  scene.add(groupeLumiere)
  const ombres = !!reglages.sol || !!reglages.ombres
  if (ombres) {
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
  }
  const appliqueLumiere = (nom: string) => {
    groupeLumiere.clear()
    const dir = (couleur: number, intensite: number, x: number, y: number, z: number) => {
      const l = new THREE.DirectionalLight(couleur, intensite)
      l.position.set(x, y, z)
      if (ombres) {
        l.castShadow = true
        l.shadow.mapSize.set(1024, 1024)
        l.shadow.radius = 6
        l.shadow.camera.left = -5
        l.shadow.camera.right = 5
        l.shadow.camera.top = 5
        l.shadow.camera.bottom = -5
      }
      groupeLumiere.add(l)
      return l
    }
    const hemi = (ciel: number, sol: number, i: number) => groupeLumiere.add(new THREE.HemisphereLight(ciel, sol, i))
    let envI = 1
    switch (nom) {
      case 'douce':
        hemi(0xffffff, 0xe8ecf5, 1.1)
        dir(0xffffff, 0.8, 2, 5, 4)
        envI = 0.7
        break
      case 'coucher-de-soleil':
        hemi(0xffc49a, 0x3a2350, 0.9)
        dir(0xff8a3d, 2.4, -5, 1.6, 2.5)
        dir(0x8f7bff, 0.6, 4, 2, -3)
        envI = 0.45
        break
      case 'nuit': {
        hemi(0x5566aa, 0x05060f, 0.45)
        dir(0x9fb4ff, 0.7, -2, 4, 3)
        const p = new THREE.PointLight(0xff4f8b, 18, 12)
        p.position.set(2.5, 1, 2.5)
        groupeLumiere.add(p)
        envI = 0.25
        break
      }
      case 'neon': {
        const a = new THREE.PointLight(0xff2bd6, 40, 14)
        a.position.set(-3, 1.5, 2.5)
        const b = new THREE.PointLight(0x00e5ff, 40, 14)
        b.position.set(3, -0.5, 2.5)
        groupeLumiere.add(a, b)
        hemi(0x222244, 0x000000, 0.3)
        envI = 0.3
        break
      }
      case 'jour':
        hemi(0xdff1ff, 0xc9b28a, 1.2)
        dir(0xfff4e0, 2.2, 4, 7, 3)
        envI = 1
        break
      case 'dramatique': {
        const s = new THREE.SpotLight(0xffffff, 60, 20, Math.PI / 7, 0.5, 1.2)
        s.position.set(2, 6, 3)
        if (ombres) s.castShadow = true
        groupeLumiere.add(s)
        hemi(0x334, 0x000000, 0.15)
        envI = 0.2
        break
      }
      default: // studio
        hemi(0xffffff, 0xd9dde6, 0.5)
        dir(0xffffff, 1.6, 3, 4, 5)
        dir(0xcfe0ff, 0.9, -4, 2, -3)
        envI = 1
    }
    scene.environmentIntensity = envI
  }
  appliqueLumiere(String(reglages.lumiere ?? 'studio'))

  // sol qui reçoit les ombres
  if (reglages.sol) {
    const sol = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: 0.22 }))
    sol.rotation.x = -Math.PI / 2
    sol.position.y = -1.1
    sol.receiveShadow = true
    scene.add(sol)
  }

  // particules d'ambiance
  let majParticules: ((t: number, dt: number) => void) | null = null
  if (reglages.particules) majParticules = particules(scene, String(Array.isArray(reglages.particules) ? reglages.particules[0] : reglages.particules === true ? 'poussiere' : reglages.particules))

  // caméra
  const modeCam = String(reglages.camera ?? 'fixe')
  let controles: any = null
  if (modeCam === 'libre' || modeCam === 'orbite') {
    controles = new OrbitControls(cam, toile)
    controles.enableDamping = true
    controles.enableZoom = false
    controles.enablePan = false
    controles.autoRotate = modeCam === 'orbite'
    controles.autoRotateSpeed = 1.2
    toile.style.touchAction = 'pan-y'
  }

  // taille
  let largeur = 0, hauteur = 0
  const redimensionne = () => {
    const r = hote.getBoundingClientRect()
    largeur = Math.max(1, r.width)
    hauteur = Math.max(1, r.height)
    renderer.setSize(largeur, hauteur, false)
    cam.aspect = largeur / hauteur
    // sur un écran étroit, on recule pour que tout reste visible
    cam.position.z = recul * (cam.aspect < 0.8 ? 1.35 : 1)
    cam.updateProjectionMatrix()
  }
  redimensionne()
  new ResizeObserver(redimensionne).observe(hote)

  // visibilité : on ne dessine pas ce qu'on ne voit pas
  let visible = true
  new IntersectionObserver((es) => (visible = es.some((e) => e.isIntersecting)), { rootMargin: '80px' }).observe(hote)

  const pivots: { pivot: any; el: any; haut: number }[] = []
  const melangeurs: any[] = []
  const bulles: { el: HTMLElement; pivot: any; haut: number }[] = []
  const rayon = new THREE.Raycaster()
  const pointeur = new THREE.Vector2()

  const cibleSous = (e: PointerEvent | MouseEvent) => {
    const r = toile.getBoundingClientRect()
    pointeur.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
    rayon.setFromCamera(pointeur, cam)
    for (const p of pivots) if (rayon.intersectObject(p.pivot, true).length) return p
    return null
  }
  if (!seul) {
    toile.style.pointerEvents = 'auto'
    hote.addEventListener('click', (e) => {
      if ((e.target as HTMLElement) !== toile) return
      const p = cibleSous(e)
      if (p) p.el.dispatchEvent(new MouseEvent('click', { bubbles: false }))
    })
    let survole: any = null
    hote.addEventListener('pointermove', (e) => {
      if ((e.target as HTMLElement) !== toile) return
      const p = cibleSous(e)
      if (p?.el !== survole?.el) {
        if (p) p.el.dispatchEvent(new MouseEvent('mouseenter'))
        survole = p
        toile.style.cursor = p && p.el.classList.contains('k-cliquable') ? 'pointer' : ''
      }
    })
  }

  let precedent = performance.now()
  const debutMonde = precedent
  let tourne = false
  const boucle = () => {
    requestAnimationFrame(boucle)
    const maintenant = performance.now()
    const dt = Math.min(0.05, (maintenant - precedent) / 1000)
    precedent = maintenant
    if (!visible) return
    const t = (maintenant - debutMonde) / 1000
    for (const m of melangeurs) m.update(dt)
    majParticules?.(t, dt)
    if (controles) controles.update()
    else if (modeCam === 'suit-souris' && !mouvementReduit()) {
      cam.position.x += (souris.x * 0.9 - cam.position.x) * 0.05
      cam.position.y += (0.3 - souris.y * 0.5 - cam.position.y) * 0.05
      cam.lookAt(0, 0, 0)
    } else if (modeCam === 'vol' && !mouvementReduit()) {
      const a = t * 0.18
      const d = cam.position.z === 0 ? recul : Math.hypot(cam.position.x, cam.position.z)
      cam.position.x = Math.sin(a) * d
      cam.position.z = Math.cos(a) * d
      cam.position.y = 0.6 + Math.sin(t * 0.3) * 0.3
      cam.lookAt(0, 0, 0)
    }
    // bulles accrochées aux objets 3D
    for (const b of bulles) {
      const v = new THREE.Vector3(0, b.haut, 0)
      b.pivot.localToWorld(v)
      v.project(cam)
      b.el.style.left = `${((v.x + 1) / 2) * largeur}px`
      b.el.style.top = `${((1 - v.y) / 2) * hauteur}px`
    }
    renderer.render(scene, cam)
  }

  // les modèles compressés (Meshopt, Draco) s'ouvrent aussi
  const chargeur = new GLTFLoader()
  chargeur.setMeshoptDecoder(MeshoptDecoder)
  const draco = new DRACOLoader()
  draco.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/')
  chargeur.setDRACOLoader(draco)

  return {
    async ajoute(el: any, i: number, n: number) {
      const o = el.$kObjet?.options ?? {}
      const src = el.dataset.src
      const gltf: any = await new Promise((ok, ko) => chargeur.load(src, ok, undefined, (e: any) => ko(new Error(`impossible de charger « ${src} » (${e?.message ?? 'fichier introuvable'}).`))))
      const modele = gltf.scene
      // centre et met à l'échelle : n'importe quel modèle arrive « bien cadré »
      const boite = new THREE.Box3().setFromObject(modele)
      const taille = boite.getSize(new THREE.Vector3())
      const centre = boite.getCenter(new THREE.Vector3())
      const plusGrand = Math.max(taille.x, taille.y, taille.z) || 1
      const echelle = (2.2 / plusGrand) * Number(o.taille ?? 1)
      modele.position.sub(centre)
      const pivot = new THREE.Group()
      const ajusteur = new THREE.Group()
      ajusteur.scale.setScalar(echelle)
      ajusteur.add(modele)
      pivot.add(ajusteur)
      modele.traverse((m: any) => {
        if (m.isMesh) {
          m.castShadow = ombres
          m.receiveShadow = false
        }
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
      const haut = (taille.y * echelle) / 2
      pivots.push({ pivot, el, haut })

      // animations nommées (personnage)
      const corps = corpsDe(el)
      if (gltf.animations?.length) {
        const m = new THREE.AnimationMixer(modele)
        melangeurs.push(m)
        let courante: any = null
        const trouve = (nom?: string) => {
          if (!nom) return gltf.animations.find((a: any) => /idle|attend|repos|wait|stand/i.test(a.name)) ?? gltf.animations[0]
          const s = String(nom).toLowerCase()
          return gltf.animations.find((a: any) => a.name.toLowerCase() === s) ?? gltf.animations.find((a: any) => a.name.toLowerCase().includes(s))
        }
        corps.joue = (nom: string, opts: any = {}) => {
          const clip = trouve(nom)
          if (!clip) {
            console.warn(`Kaury : l'animation « ${nom} » n'existe pas. Animations disponibles : ${gltf.animations.map((a: any) => a.name).join(', ')}`)
            return
          }
          const action = m.clipAction(clip)
          action.reset()
          action.setLoop(opts.une || opts.fois ? THREE.LoopOnce : THREE.LoopRepeat, Infinity)
          action.clampWhenFinished = true
          action.fadeIn(0.3).play()
          if (courante && courante !== action) courante.fadeOut(0.3)
          courante = action
        }
        corps.joue(o.anime ?? el.$kAnimDepart)
      }

      // apparition
      const intro = { debut: performance.now(), duree: el.classList.contains('k-entre') ? 1300 : 900 }
      const depart = { x: 0, y: 0, s: 0.0001 }
      if (el.classList.contains('k-entre-gauche')) Object.assign(depart, { x: -4, s: 1 })
      if (el.classList.contains('k-entre-droite')) Object.assign(depart, { x: 4, s: 1 })
      if (el.classList.contains('k-entre-bas')) Object.assign(depart, { y: -3, s: 1 })
      if (el.classList.contains('k-entre-haut')) Object.assign(depart, { y: 3, s: 1 })
      const ressort = (p: number) => (p >= 1 ? 1 : 1 - Math.pow(2, -10 * p) * Math.cos(p * 7.5))

      // adaptateur : les mouvements Kaury pilotent le pivot 3D
      corps.adaptateur = '3d'
      Object.defineProperty(corps, 'visible', { get: () => visible, set: () => {}, configurable: true })
      corps.applique = (t) => {
        const p = Math.min(1, (performance.now() - intro.debut) / intro.duree)
        const e = mouvementReduit() ? 1 : ressort(p)
        pivot.position.set(base.x + t.x / 100 + depart.x * (1 - e), base.y - t.y / 100 + depart.y * (1 - e), base.z + t.z / 100)
        pivot.rotation.set(base.rx + rad(t.rx), base.ry + rad(t.ry), base.rz + rad(t.rz))
        pivot.scale.setScalar(t.s * (depart.s + (1 - depart.s) * e))
      }
      corps.applique({ x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0, s: 1, o: 1 })
      // bulle de dialogue au-dessus de l'objet
      corps.dit = (texte: string, opts: any) => {
        let b = bulles.find((x) => x.pivot === pivot)
        if (!b) {
          const elB = document.createElement('div')
          elB.className = 'k-bulle k-bulle-3d'
          elB.setAttribute('role', 'status')
          ;(seul ? hote : hote).append(elB)
          b = { el: elB, pivot, haut: haut / echelle / Number(o.taille ?? 1) * Number(o.taille ?? 1) }
          b.haut = haut
          bulles.push(b)
        }
        ecritBulle(b.el, texte, opts)
      }
      if (el.$kDitEnAttente) {
        const [texte, opts] = el.$kDitEnAttente
        el.$kDitEnAttente = null
        setTimeout(() => corps.dit!(texte, opts), 500)
      }
      if (!corps.mouvements.length) {
        // un objet sans mouvement reste vivant : très légère respiration
        corps.mouvements.push({ type: 'flotte', o: { valeur: 0.04, lent: true }, debut: Math.random() * 10 })
      }
      el.classList.add('k-pret')
      hote.classList.add('k-pret')
    },
    demarre() {
      if (tourne) return
      tourne = true
      boucle()
    },
  }
}

export async function monteObjetSeul(el: any) {
  const reglages = { ...(el.$kReglages ?? {}), ombres: el.$kObjet?.options?.ombres }
  const monde = await creeMonde(el, reglages, true)
  if (!monde) return
  await monde.ajoute(el, 0, 1)
  monde.demarre()
  // l'objet seul a besoin du moteur de mouvements
  const { mouvement } = await import('../runtime/mouvements.js')
  if (!corpsDe(el).mouvements.length) mouvement(el, 'flotte', { valeur: 0.04, lent: true })
  else mouvement(el, '_rien', {})
}

export async function monteScene(el: any) {
  const s = el.$kScene
  const monde = await creeMonde(el, s.reglages, false)
  if (!monde) return
  monde.demarre()
  const { mouvement } = await import('../runtime/mouvements.js')
  await Promise.all(s.objets.map(async (o: any, i: number) => {
    try {
      await monde.ajoute(o, i, s.objets.length)
      mouvement(o, '_rien', {})
    } catch (e) {
      console.error('Kaury :', e)
      o.classList.add('k-immersion-erreur')
    }
  }))
}

export async function monteLottie(el: any) {
  const lottie = (await import('lottie-web')).default
  const anim = lottie.loadAnimation({ container: el, renderer: 'svg', loop: true, autoplay: !mouvementReduit(), path: el.dataset.src })
  const corps = corpsDe(el)
  corps.joue = (nom: string, o: any = {}) => {
    if (!nom) return anim.play()
    try {
      anim.goToAndPlay(nom, true)
      anim.loop = !(o.une || o.fois)
    } catch {
      console.warn(`Kaury : le repère « ${nom} » n'existe pas dans l'animation Lottie.`)
    }
  }
  if (el.$kAnimDepart) corps.joue(el.$kAnimDepart)
  el.classList.add('k-pret')
}

// ---------------- particules ----------------
function particules(scene: any, genre: string) {
  const n = genre === 'etoiles' ? 900 : genre === 'confettis' ? 260 : 400
  const pos = new Float32Array(n * 3)
  const vit = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 16
    pos[i * 3 + 1] = (Math.random() - 0.5) * 10
    pos[i * 3 + 2] = (Math.random() - 0.5) * 10 - 2
    vit[i] = 0.3 + Math.random() * 0.7
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  const couleurs: Record<string, number> = { etoiles: 0xffffff, neige: 0xffffff, bulles: 0xbfe9ff, poussiere: 0xfff1d6, confettis: 0xff4f8b }
  const taille: Record<string, number> = { etoiles: 0.05, neige: 0.08, bulles: 0.16, poussiere: 0.05, confettis: 0.1 }
  let colorAttr: any
  if (genre === 'confettis') {
    const c = new Float32Array(n * 3)
    const pal = [0xff4f8b, 0xffc53d, 0x30a46c, 0x0090ff, 0x8e4ec6].map((x) => new THREE.Color(x))
    for (let i = 0; i < n; i++) {
      const col = pal[i % pal.length]
      c[i * 3] = col.r
      c[i * 3 + 1] = col.g
      c[i * 3 + 2] = col.b
    }
    colorAttr = new THREE.BufferAttribute(c, 3)
    geo.setAttribute('color', colorAttr)
  }
  // point rond et doux (sinon Three dessine des carrés)
  const c2 = document.createElement('canvas')
  c2.width = c2.height = 64
  const g2 = c2.getContext('2d')!
  const grad = g2.createRadialGradient(32, 32, 0, 32, 32, 32)
  if (genre === 'bulles') {
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
    color: genre === 'confettis' ? 0xffffff : couleurs[genre] ?? 0xffffff,
    vertexColors: genre === 'confettis',
    size: taille[genre] ?? 0.04,
    transparent: true,
    opacity: genre === 'poussiere' ? 0.6 : 0.9,
    depthWrite: false,
    sizeAttenuation: true,
  })
  const points = new THREE.Points(geo, mat)
  scene.add(points)
  return (t: number, dt: number) => {
    if (mouvementReduit()) return
    const p = geo.attributes.position.array as Float32Array
    for (let i = 0; i < n; i++) {
      const v = vit[i]
      if (genre === 'neige' || genre === 'confettis') {
        p[i * 3 + 1] -= v * dt * 0.8
        p[i * 3] += Math.sin(t + i) * dt * 0.2
        if (p[i * 3 + 1] < -5) p[i * 3 + 1] = 5
      } else if (genre === 'bulles') {
        p[i * 3 + 1] += v * dt * 0.6
        p[i * 3] += Math.sin(t * 2 + i) * dt * 0.1
        if (p[i * 3 + 1] > 5) p[i * 3 + 1] = -5
      } else if (genre === 'poussiere') {
        p[i * 3 + 1] += Math.sin(t * 0.5 + i) * dt * 0.05
        p[i * 3] += Math.cos(t * 0.3 + i) * dt * 0.05
      }
    }
    geo.attributes.position.needsUpdate = true
    if (genre === 'etoiles') {
      points.rotation.y = t * 0.01
      mat.opacity = 0.75 + Math.sin(t * 2) * 0.15
    }
  }
}
