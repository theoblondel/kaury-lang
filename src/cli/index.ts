#!/usr/bin/env node
// La commande « kaury » : nouveau, dev, build, verifie, lance, traduit, publie.

import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, watch } from 'node:fs'
import { createServer } from 'node:http'
import { join, resolve, extname, dirname, relative } from 'node:path'
import { spawnSync } from 'node:child_process'
import { compile, formateErreurs } from '../noyau/index.js'
import { construis, lance, trouveEntree, EchecCompilation, racinePaquet } from './projet.js'
import { modeleNouveauSite } from './modele.js'

const c = {
  gras: (s: string) => `\x1b[1m${s}\x1b[0m`,
  rose: (s: string) => `\x1b[38;5;205m${s}\x1b[0m`,
  vert: (s: string) => `\x1b[32m${s}\x1b[0m`,
  rouge: (s: string) => `\x1b[31m${s}\x1b[0m`,
  jaune: (s: string) => `\x1b[33m${s}\x1b[0m`,
  gris: (s: string) => `\x1b[90m${s}\x1b[0m`,
}

const version = () => JSON.parse(readFileSync(join(racinePaquet(), 'package.json'), 'utf8')).version as string

function aide() {
  console.log(`
${c.rose(c.gras('Kaury'))} ${c.gris('v' + version())} — le langage des sites immersifs

${c.gras('Commandes')}
  kaury nouveau ${c.gris('mon-site')}       crée un projet prêt à l'emploi
  kaury dev ${c.gris('[fichier]')}          affiche le site et le recharge à chaque modification
  kaury build ${c.gris('[fichier]')}        produit le site final, optimisé, dans dist/
  kaury verifie ${c.gris('[fichiers]')}     vérifie le code sans construire ${c.gris('(--json pour les IA)')}
  kaury lance ${c.gris('fichier.kaury')}    exécute un programme (sans page)
  kaury traduit ${c.gris('fichier.kaury')}  montre le JavaScript produit
  kaury publie ${c.gris('[--netlify|--vercel]')}  construit puis met en ligne

${c.gras('Aide')}  https://kaury.dev   ·   spécification pour les IA : docs/kaury-ia.md
`)
}

async function main() {
  const [cmd, ...args] = process.argv.slice(2)
  const drapeaux = new Set(args.filter((a) => a.startsWith('--')))
  const positions = args.filter((a) => !a.startsWith('--'))
  const ici = process.cwd()
  switch (cmd) {
    case undefined:
    case 'aide':
    case 'help':
    case '--help':
    case '-h':
      return aide()
    case '--version':
    case '-v':
    case 'version':
      return console.log(version())
    case 'nouveau':
    case 'new':
      return nouveau(positions[0] ?? 'mon-site')
    case 'dev':
      return dev(ici, positions[0], Number(valeur(args, '--port') ?? 3000))
    case 'build':
    case 'construis':
      return build(ici, positions[0], valeur(args, '--sortie'))
    case 'verifie':
    case 'check':
      return verifie(ici, positions, drapeaux.has('--json'))
    case 'lance':
    case 'run':
      return lanceCmd(ici, positions[0])
    case 'traduit':
    case 'compile':
      return traduit(ici, positions[0], drapeaux.has('--css'))
    case 'publie':
    case 'deploy':
      return publie(ici, positions[0], drapeaux)
    default:
      // « kaury fichier.kaury » = lance ou dev selon le contenu
      if (cmd.endsWith('.kaury')) {
        const src = readFileSync(resolve(ici, cmd), 'utf8')
        if (/^\s*page\s+"/m.test(src)) return dev(ici, cmd, 3000)
        return lanceCmd(ici, cmd)
      }
      console.error(c.rouge(`Commande inconnue « ${cmd} ».`))
      aide()
      process.exitCode = 1
  }
}

function valeur(args: string[], nom: string): string | undefined {
  const i = args.indexOf(nom)
  if (i >= 0) return args[i + 1]
  const eg = args.find((a) => a.startsWith(nom + '='))
  return eg?.split('=')[1]
}

function afficheEchec(e: unknown) {
  if (e instanceof EchecCompilation) {
    for (const { e: err, source } of e.erreurs) console.error('\n' + c.rouge(err.formate(source)))
    console.error(c.gris(`\n${e.erreurs.length} erreur${e.erreurs.length > 1 ? 's' : ''}.`))
  } else console.error(c.rouge('\nErreur : ' + ((e as Error)?.message ?? String(e))))
  process.exitCode = 1
}

// ---------------------------------------------------------------- nouveau
function nouveau(nom: string) {
  const dossier = resolve(process.cwd(), nom)
  if (existsSync(dossier) && readdirSync(dossier).length) {
    console.error(c.rouge(`Le dossier « ${nom} » existe déjà et n'est pas vide.`))
    process.exitCode = 1
    return
  }
  for (const [chemin, contenu] of Object.entries(modeleNouveauSite(nom))) {
    const p = join(dossier, chemin)
    mkdirSync(dirname(p), { recursive: true })
    writeFileSync(p, contenu)
  }
  console.log(`
${c.vert('✓')} Projet ${c.gras(nom)} créé.

  cd ${nom}
  kaury dev

Ouvre ${c.gras('site.kaury')} : tout le site est dans ce fichier.
`)
}

// ---------------------------------------------------------------- build
async function build(ici: string, fichier?: string, sortie?: string) {
  try {
    const entree = trouveEntree(ici, fichier)
    console.log(c.gris(`Construction de ${relative(ici, entree)}…`))
    const r = await construis(entree, { sortie })
    for (const { e, source } of r.collecte.avertissements) console.log(c.jaune(e.formate(source)))
    console.log(`${c.vert('✓')} ${r.pages.length} page${r.pages.length > 1 ? 's' : ''} (${r.pages.join(', ')}) en ${r.duree} ms → ${relative(ici, r.dossier) || '.'}`)
    if (r.collecte.immersion) console.log(c.gris('  immersion : la bibliothèque 3D est chargée seulement sur les pages qui en ont besoin.'))
  } catch (e) {
    afficheEchec(e)
  }
}

// ---------------------------------------------------------------- verifie
function fichiersKaury(d: string): string[] {
  const r: string[] = []
  for (const f of readdirSync(d)) {
    if (f.startsWith('.') || f === 'node_modules' || f === 'dist') continue
    const p = join(d, f)
    if (statSync(p).isDirectory()) r.push(...fichiersKaury(p))
    else if (f.endsWith('.kaury')) r.push(p)
  }
  return r
}

function verifie(ici: string, fichiers: string[], json: boolean) {
  const liste = fichiers.length ? fichiers.map((f) => resolve(ici, f)) : fichiersKaury(ici)
  const tout: any[] = []
  let nbErr = 0
  for (const f of liste) {
    const src = readFileSync(f, 'utf8')
    const r = compile(src, { fichier: relative(ici, f).replace(/\\/g, '/'), verifieSeulement: true })
    nbErr += r.erreurs.length
    if (json) tout.push(...[...r.erreurs, ...r.avertissements].map((e) => e.versJSON()))
    else {
      const msg = formateErreurs(r, src)
      if (msg) console.log((r.erreurs.length ? c.rouge : c.jaune)(msg) + '\n')
    }
  }
  if (json) console.log(JSON.stringify({ ok: nbErr === 0, fichiers: liste.length, problemes: tout }, null, 2))
  else if (nbErr === 0) console.log(`${c.vert('✓')} ${liste.length} fichier${liste.length > 1 ? 's' : ''} vérifié${liste.length > 1 ? 's' : ''}, aucune erreur.`)
  else console.log(c.rouge(`${nbErr} erreur${nbErr > 1 ? 's' : ''}.`))
  if (nbErr) process.exitCode = 1
}

// ---------------------------------------------------------------- lance / traduit
async function lanceCmd(ici: string, fichier?: string) {
  if (!fichier) {
    console.error(c.rouge('Indique le fichier à lancer : kaury lance calcul.kaury'))
    process.exitCode = 1
    return
  }
  try {
    await lance(resolve(ici, fichier))
  } catch (e) {
    afficheEchec(e)
  }
}

function traduit(ici: string, fichier: string | undefined, css: boolean) {
  if (!fichier) {
    console.error(c.rouge('Indique le fichier : kaury traduit site.kaury'))
    process.exitCode = 1
    return
  }
  const src = readFileSync(resolve(ici, fichier), 'utf8')
  const r = compile(src, { fichier })
  if (!r.ok) {
    console.error(c.rouge(formateErreurs(r, src)))
    process.exitCode = 1
    return
  }
  console.log(css ? r.css : r.js)
}

// ---------------------------------------------------------------- dev
async function dev(ici: string, fichier: string | undefined, port: number) {
  let entree: string
  try {
    entree = trouveEntree(ici, fichier)
  } catch (e) {
    return afficheEchec(e)
  }
  const dossierSite = dirname(entree)
  const sortie = join(dossierSite, '.kaury-cache', 'dev')
  let erreur: string | null = null
  let version = 0
  const clients = new Set<any>()

  const reconstruis = async () => {
    const t0 = Date.now()
    try {
      const r = await construis(entree, { sortie, dev: true, minifie: false })
      erreur = null
      for (const { e, source } of r.collecte.avertissements) console.log(c.jaune(e.formate(source)))
      console.log(`${c.vert('✓')} ${c.gris(new Date().toLocaleTimeString('fr-CH'))} ${r.pages.length} page${r.pages.length > 1 ? 's' : ''} prête${r.pages.length > 1 ? 's' : ''} en ${Date.now() - t0} ms`)
    } catch (e) {
      erreur = e instanceof EchecCompilation ? e.erreurs.map(({ e: x, source }) => x.formate(source)).join('\n\n') : (e as Error).message
      afficheEchec(e)
      process.exitCode = 0
    }
    version++
    for (const r of clients) r.write(`data: ${version}\n\n`)
  }
  await reconstruis()

  let minuteur: any
  watch(dossierSite, { recursive: true }, (_ev, f) => {
    if (!f || f.includes('.kaury-cache') || f.startsWith('dist') || f.includes('node_modules')) return
    clearTimeout(minuteur)
    minuteur = setTimeout(reconstruis, 60)
  })

  const types: Record<string, string> = {
    '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif', '.gif': 'image/gif',
    '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.webm': 'video/webm',
    '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.map': 'application/json', '.txt': 'text/plain; charset=utf-8',
  }
  const serveur = createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://x')
    if (url.pathname === '/_kaury/evenements') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' })
      res.write(`data: ${version}\n\n`)
      clients.add(res)
      req.on('close', () => clients.delete(res))
      return
    }
    if (url.pathname === '/_kaury/recharge.js') {
      res.writeHead(200, { 'Content-Type': 'text/javascript' })
      res.end(`let v=null;const s=new EventSource('/_kaury/evenements');s.onmessage=(e)=>{if(v!==null&&e.data!==v)location.reload();v=e.data}`)
      return
    }
    if (erreur) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      res.end(pageErreur(erreur))
      return
    }
    let chemin = decodeURIComponent(url.pathname)
    let p = join(sortie, chemin)
    if (existsSync(p) && statSync(p).isDirectory()) p = join(p, 'index.html')
    if (!existsSync(p) && !extname(chemin)) p = join(sortie, '404.html')
    if (!existsSync(p)) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
      res.end(`Introuvable : ${chemin}\n(les images, modèles et sons vont dans le dossier public/)`)
      return
    }
    res.writeHead(p.endsWith('404.html') && chemin !== '/404' ? 200 : 200, { 'Content-Type': types[extname(p)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' })
    res.end(readFileSync(p))
  })
  serveur.on('error', (e: any) => {
    if (e.code === 'EADDRINUSE') {
      console.log(c.jaune(`Le port ${port} est pris, j'essaie ${port + 1}…`))
      serveur.listen(++port)
    } else afficheEchec(e)
  })
  serveur.listen(port, () => {
    console.log(`\n${c.rose(c.gras('Kaury'))} tourne sur ${c.gras(`http://localhost:${port}`)}\n${c.gris('Modifie ' + relative(ici, entree) + ' : la page se recharge toute seule. Ctrl+C pour arrêter.')}\n`)
  })
}

function pageErreur(msg: string): string {
  const e = msg.replace(/&/g, '&amp;').replace(/</g, '&lt;')
  return `<!doctype html><meta charset="utf-8"><title>Erreur Kaury</title><style>body{margin:0;background:#160d18;color:#ffe3ea;font:15px/1.6 ui-monospace,Consolas,monospace;padding:6vh 6vw}h1{font:700 22px system-ui;color:#ff4f8b}pre{white-space:pre-wrap;background:#21122a;border:1px solid #ff4f8b55;border-radius:14px;padding:22px}</style><h1>Kaury a trouvé un problème</h1><pre>${e}</pre><p style="opacity:.7">Corrige le fichier : la page se recharge toute seule.</p><script type="module" src="/_kaury/recharge.js"></script>`
}

// ---------------------------------------------------------------- publie
async function publie(ici: string, fichier: string | undefined, drapeaux: Set<string>) {
  await build(ici, fichier)
  if (process.exitCode) return
  const dist = join(dirname(trouveEntree(ici, fichier)), 'dist')
  if (drapeaux.has('--vercel')) {
    spawnSync('npx', ['--yes', 'vercel', 'deploy', dist, '--prod'], { stdio: 'inherit', shell: true })
  } else if (drapeaux.has('--netlify')) {
    spawnSync('npx', ['--yes', 'netlify-cli', 'deploy', '--dir', dist, '--prod'], { stdio: 'inherit', shell: true })
  } else {
    console.log(`
Le site est prêt dans ${c.gras(relative(ici, dist) || 'dist')}. C'est un site statique : il marche partout.

  ${c.gras('kaury publie --netlify')}   met en ligne sur Netlify
  ${c.gras('kaury publie --vercel')}    met en ligne sur Vercel
  ou glisse le dossier dist/ sur ${c.gras('https://app.netlify.com/drop')}
  ou copie-le chez ton hébergeur (FTP).
`)
  }
}

main().catch(afficheEchec)
