// Construction d'un site Kaury : compile les .kaury, regroupe le JavaScript, rend chaque page en HTML.

import { existsSync, readdirSync, statSync, readFileSync, mkdirSync, writeFileSync, cpSync, rmSync } from 'node:fs'
import { dirname, join, relative, resolve, extname, basename } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createHash } from 'node:crypto'
import * as esbuild from 'esbuild'
import { compile, carteSource, lienPolice, type Resultat } from '../noyau/index.js'
import { ErreurKaury } from '../noyau/erreurs.js'
import { STYLE_DE_BASE } from '../runtime/style.js'
import { installeSSR } from '../runtime/ssr.js'

export function racinePaquet(): string {
  let d = dirname(fileURLToPath(import.meta.url))
  for (let i = 0; i < 6; i++) {
    const p = join(d, 'package.json')
    if (existsSync(p)) {
      try {
        if (JSON.parse(readFileSync(p, 'utf8')).name === 'kaury') return d
      } catch {
        /* continue */
      }
    }
    d = dirname(d)
  }
  throw new Error('Kaury : impossible de trouver le dossier du paquet.')
}

export function trouveEntree(dossier: string, demande?: string): string {
  if (demande) {
    const p = resolve(dossier, demande)
    if (existsSync(p) && statSync(p).isFile()) return p
    if (existsSync(p) && statSync(p).isDirectory()) return trouveEntree(p)
    throw new Error(`le fichier « ${demande} » n'existe pas.`)
  }
  for (const nom of ['site.kaury', 'index.kaury', 'accueil.kaury', 'main.kaury', 'src/site.kaury']) {
    const p = join(dossier, nom)
    if (existsSync(p)) return p
  }
  const tous = readdirSync(dossier).filter((f) => f.endsWith('.kaury'))
  if (tous.length === 1) return join(dossier, tous[0])
  if (!tous.length) throw new Error(`aucun fichier .kaury dans « ${dossier} ». Crée un site.kaury, ou lance « kaury nouveau mon-site ».`)
  throw new Error(`plusieurs fichiers .kaury ici (${tous.join(', ')}). Nomme le principal « site.kaury », ou indique-le : kaury dev ${tous[0]}`)
}

export interface Collecte {
  css: Map<string, string>
  polices: Set<string>
  site: { nom?: string; langue?: string }
  avertissements: { e: ErreurKaury; source: string }[]
  immersion: boolean
}

export class EchecCompilation extends Error {
  constructor(public erreurs: { e: ErreurKaury; source: string }[]) {
    super(erreurs.map(({ e, source }) => e.formate(source)).join('\n\n'))
  }
}

function pluginKaury(racine: string, collecte: Collecte, dossierSite: string, ssr: boolean, entree = ''): esbuild.Plugin {
  return {
    name: 'kaury',
    setup(b) {
      b.onResolve({ filter: /^kaury\/(runtime|ssr|immersion)$/ }, (a) => {
        const quoi = a.path.split('/')[1]
        const p = quoi === 'ssr' ? 'src/runtime/ssr.ts' : quoi === 'immersion' ? 'src/immersion/index.ts' : 'src/runtime/index.ts'
        return { path: join(racine, p) }
      })
      b.onResolve({ filter: /^kaury:entree$/ }, () => ({ path: 'entree', namespace: 'kaury-virtuel' }))
      b.onLoad({ filter: /.*/, namespace: 'kaury-virtuel' }, () => ({
        contents: entree,
        loader: 'js',
        resolveDir: dossierSite,
      }))
      b.onLoad({ filter: /\.kaury$/ }, async (a) => {
        const source = readFileSync(a.path, 'utf8')
        const fichier = relative(dossierSite, a.path).replace(/\\/g, '/') || basename(a.path)
        let r: Resultat
        try {
          r = compile(source, { fichier })
        } catch (e) {
          return { errors: [{ text: `Erreur interne du compilateur Kaury : ${(e as Error).stack}` }] }
        }
        if (!r.ok) {
          return {
            errors: r.erreurs.map((e) => ({
              text: e.formate(source),
              location: { file: a.path, line: e.ligne, column: e.colonne - 1, length: e.longueur, lineText: source.split(/\r?\n/)[e.ligne - 1] ?? '' },
              detail: e,
            })),
          }
        }
        collecte.css.set(a.path, r.css)
        r.polices.forEach((p) => collecte.polices.add(p))
        if (r.site.nom) collecte.site.nom = r.site.nom
        if (r.site.langue) collecte.site.langue = r.site.langue
        if (r.infos?.immersion) collecte.immersion = true
        if (!ssr) for (const e of r.avertissements) collecte.avertissements.push({ e, source })
        const carte = Buffer.from(carteSource(r, fichier, source)).toString('base64')
        return { contents: `${r.js}\n//# sourceMappingURL=data:application/json;base64,${carte}`, loader: 'js', resolveDir: dirname(a.path) }
      })
    },
  }
}

function erreursEsbuild(e: any): EchecCompilation | Error {
  const liste = (e?.errors ?? []) as esbuild.Message[]
  const kaury = liste.filter((m) => (m as any).detail instanceof ErreurKaury)
  if (kaury.length) {
    return new EchecCompilation(kaury.map((m) => ({ e: (m as any).detail as ErreurKaury, source: readFileSync(m.location!.file, 'utf8') })))
  }
  if (liste.length) {
    return new Error(liste.map((m) => {
      if (/Could not resolve "(.+)"/.test(m.text)) {
        const paquet = /Could not resolve "(.+)"/.exec(m.text)![1]
        return `le paquet « ${paquet} » est introuvable${m.location ? ` (${m.location.file}:${m.location.line})` : ''}.\nEssaie : npm install ${paquet}`
      }
      return `${m.text}${m.location ? `\n  à ${m.location.file}:${m.location.line}:${m.location.column + 1}` : ''}`
    }).join('\n\n'))
  }
  return e
}

export interface ResultatBuild {
  pages: string[]
  fichiers: number
  dossier: string
  collecte: Collecte
  duree: number
}

export interface OptionsBuild {
  sortie?: string
  dev?: boolean
  minifie?: boolean
}

/** Construit le site complet dans dist/. */
export async function construis(entree: string, o: OptionsBuild = {}): Promise<ResultatBuild> {
  const t0 = Date.now()
  const racine = racinePaquet()
  const dossierSite = dirname(entree)
  const sortie = resolve(dossierSite, o.sortie ?? 'dist')
  const collecte: Collecte = { css: new Map(), polices: new Set(), site: {}, avertissements: [], immersion: false }
  const nodePaths = [join(racine, 'node_modules'), join(dossierSite, 'node_modules')]

  if (existsSync(sortie)) rmSync(sortie, { recursive: true, force: true })
  mkdirSync(join(sortie, '_kaury'), { recursive: true })

  const cheminEntree = JSON.stringify(entree.replace(/\\/g, '/'))
  // 1. le JavaScript du navigateur
  let clientRes: esbuild.BuildResult<{ metafile: true }>
  try {
    const opts: any = {
      entryPoints: { site: 'kaury:entree' },
      bundle: true,
      format: 'esm',
      splitting: true,
      outdir: join(sortie, '_kaury'),
      entryNames: '[name]-[hash]',
      chunkNames: 'morceau-[hash]',
      minify: o.minifie ?? !o.dev,
      sourcemap: true,
      target: ['es2020', 'chrome90', 'safari15', 'firefox90'],
      metafile: true,
      logLevel: 'silent',
      nodePaths,
      plugins: [pluginKaury(racine, collecte, dossierSite, false, `import * as app from ${cheminEntree}\nimport { demarre } from "kaury/runtime"\n${o.dev ? 'globalThis.__kauryDev = true\n' : ''}demarre(app)\n`)],
      define: { 'process.env.NODE_ENV': o.dev ? '"development"' : '"production"' },
    }
    clientRes = await esbuild.build(opts)
  } catch (e) {
    throw erreursEsbuild(e)
  }
  const sorties = Object.keys(clientRes.metafile.outputs)
  const js = sorties.find((f) => /[\\/]site-[^\\/]+\.js$/.test(f))!
  const nomJs = basename(js)

  // 2. le CSS : base + styles des fichiers
  const css = [STYLE_DE_BASE, ...collecte.css.values()].join('\n')
  const hash = createHash('sha1').update(css).digest('hex').slice(0, 8)
  const nomCss = `site-${hash}.css`
  writeFileSync(join(sortie, '_kaury', nomCss), css)

  // 3. le rendu serveur de chaque page
  const fichierSsr = join(dossierSite, '.kaury-cache', `ssr-${Date.now()}.mjs`)
  mkdirSync(dirname(fichierSsr), { recursive: true })
  try {
    const opts: any = {
      entryPoints: { ssr: 'kaury:entree' },
      bundle: true,
      format: 'esm',
      platform: 'node',
      outfile: fichierSsr,
      logLevel: 'silent',
      nodePaths,
      external: ['three', 'three/*', 'lottie-web'],
      plugins: [pluginKaury(racine, { ...collecte, css: new Map(), avertissements: [], polices: new Set() }, dossierSite, true,
        `export * from ${cheminEntree}\nexport { rendsPage } from "kaury/runtime"\nexport { serialise } from "kaury/ssr"\n`)],
    }
    await esbuild.build(opts)
  } catch (e) {
    throw erreursEsbuild(e)
  }
  const doc = installeSSR()
  let mod: any
  try {
    mod = await import(pathToFileURL(fichierSsr).href)
  } finally {
    rmSync(fichierSsr, { force: true })
  }
  const pages: string[] = []
  const chemins: string[] = mod.$pages.map((p: any) => p.chemin)
  if (!chemins.length) throw new Error('ce site n\'a aucune page. Ajoute au moins : page "/"')
  const site = mod.$site ?? {}
  for (const chemin of chemins) {
    if (chemin.includes(':')) continue // pages à paramètres : rendues dans le navigateur
    const cible = doc.createElement('div')
    let info: any
    try {
      info = mod.rendsPage(mod, chemin, cible)
    } catch (e) {
      throw new Error(`erreur en construisant la page « ${chemin} » : ${(e as Error).message}`)
    }
    const html = gabarit({
      corps: mod.serialise(cible).replace(/^<div>|<\/div>$/g, ''),
      titre: info.titre,
      description: info.description,
      image: info.image,
      langue: site.langue ?? collecte.site.langue ?? 'fr',
      nomSite: site.nom ?? collecte.site.nom,
      favicon: site.favicon,
      css: `/_kaury/${nomCss}`,
      js: `/_kaury/${nomJs}`,
      polices: [...collecte.polices],
      dev: !!o.dev,
      chemin,
    })
    const fichier = chemin === '/' ? 'index.html' : chemin === '/404' ? '404.html' : join(chemin.slice(1), 'index.html')
    mkdirSync(dirname(join(sortie, fichier)), { recursive: true })
    writeFileSync(join(sortie, fichier), html)
    pages.push(chemin)
  }
  if (!chemins.includes('/404')) {
    // une page 404 qui démarre le site : les adresses à paramètres (/produit/:id) fonctionnent aussi
    writeFileSync(join(sortie, '404.html'), gabarit({
      corps: '', titre: site.nom ?? 'Kaury', langue: site.langue ?? 'fr', nomSite: site.nom, css: `/_kaury/${nomCss}`, js: `/_kaury/${nomJs}`,
      polices: [...collecte.polices], dev: !!o.dev, chemin: '/404', favicon: site.favicon,
    }))
  }

  // 4. fichiers publics (images, modèles 3D, sons…)
  copiePublic(dossierSite, sortie)
  // plan du site pour Google, si le site connaît son adresse publique (site … / adresse "https://…")
  const adresse = typeof site.adresse === 'string' ? site.adresse.replace(/\/$/, '') : ''
  if (adresse) {
    const urls = pages.filter((p) => p !== '/404').map((p) => `  <url><loc>${adresse}${p === '/' ? '/' : p + '/'}</loc></url>`).join('\n')
    writeFileSync(join(sortie, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`)
  }
  if (!existsSync(join(sortie, 'robots.txt'))) {
    writeFileSync(join(sortie, 'robots.txt'), `User-agent: *\nAllow: /\n${adresse ? `\nSitemap: ${adresse}/sitemap.xml\n` : ''}`)
  }

  return { pages, fichiers: sorties.length, dossier: sortie, collecte, duree: Date.now() - t0 }
}

const MEDIAS = /\.(png|jpe?g|webp|avif|gif|svg|ico|glb|gltf|bin|json|lottie|mp3|ogg|wav|m4a|mp4|webm|woff2?|ttf|otf|pdf|txt|xml|webmanifest|hdr|ktx2)$/i

export function copiePublic(dossierSite: string, sortie: string) {
  const pub = join(dossierSite, 'public')
  if (existsSync(pub)) {
    cpSync(pub, sortie, { recursive: true })
    return
  }
  // sans dossier public/ : on prend les médias posés à côté du site
  const parcours = (d: string, profondeur: number) => {
    for (const f of readdirSync(d)) {
      if (f.startsWith('.') || f === 'node_modules' || f === 'dist') continue
      const p = join(d, f)
      const s = statSync(p)
      if (s.isDirectory() && profondeur < 3) parcours(p, profondeur + 1)
      else if (s.isFile() && MEDIAS.test(f) && f !== 'package.json' && f !== 'package-lock.json') {
        const dest = join(sortie, relative(dossierSite, p))
        mkdirSync(dirname(dest), { recursive: true })
        cpSync(p, dest)
      }
    }
  }
  parcours(dossierSite, 0)
}

const echappe = (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')

export function gabarit(d: {
  corps: string; titre: string; description?: string; image?: string; langue: string; nomSite?: string; favicon?: string
  css: string; js: string; polices: string[]; dev: boolean; chemin: string
}): string {
  const liensPolices = d.polices.map((p) => lienPolice(p)).filter(Boolean) as string[]
  const domaines = [...new Set(liensPolices.map((l) => new URL(l).origin))]
  const icone = d.favicon ? `<link rel="icon" href="${echappe(d.favicon)}">` : `<link rel="icon" href="data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="#16151a"/><text x="32" y="44" font-size="34" font-family="Arial" font-weight="700" fill="#fff" text-anchor="middle">' + echappe((d.nomSite ?? 'K').slice(0, 1).toUpperCase()) + '</text></svg>')}">`
  const jsonld = d.nomSite && d.chemin === '/' ? `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'WebSite', name: d.nomSite, description: d.description })}</script>` : ''
  return `<!doctype html>
<html lang="${echappe(d.langue)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${echappe(d.titre)}</title>
${d.description ? `<meta name="description" content="${echappe(d.description)}">` : ''}
<meta property="og:title" content="${echappe(d.titre)}">
${d.description ? `<meta property="og:description" content="${echappe(d.description)}">` : ''}
${d.image ? `<meta property="og:image" content="${echappe(d.image)}"><meta name="twitter:card" content="summary_large_image">` : ''}
${d.nomSite ? `<meta property="og:site_name" content="${echappe(d.nomSite)}">` : ''}
<meta name="generator" content="Kaury">
${icone}
${domaines.map((o) => `<link rel="preconnect" href="${o}" crossorigin>`).join('\n')}
${liensPolices.map((l) => `<link rel="stylesheet" href="${echappe(l)}">`).join('\n')}
<link rel="stylesheet" href="${d.css}">
<script>document.documentElement.classList.add('k-js')</script>
<script type="module" src="${d.js}"></script>
${jsonld}
</head>
<body>
<div id="app">${d.corps}</div>
${d.dev ? '<script type="module" src="/_kaury/recharge.js"></script>' : ''}
</body>
</html>
`
}

/** Exécute un programme Kaury dans Node (kaury lance fichier.kaury). */
export async function lance(fichier: string) {
  const racine = racinePaquet()
  const dossier = dirname(fichier)
  const sortie = join(dossier, '.kaury-cache', `lance-${Date.now()}.mjs`)
  const collecte: Collecte = { css: new Map(), polices: new Set(), site: {}, avertissements: [], immersion: false }
  try {
    const opts: any = {
      entryPoints: { lance: 'kaury:entree' },
      bundle: true,
      format: 'esm',
      platform: 'node',
      outfile: sortie,
      logLevel: 'silent',
      nodePaths: [join(racine, 'node_modules'), join(dossier, 'node_modules')],
      external: ['three', 'three/*', 'lottie-web'],
      sourcemap: 'inline',
      plugins: [pluginKaury(racine, collecte, dossier, false, `import ${JSON.stringify(fichier.replace(/\\/g, '/'))}\n`)],
    }
    await esbuild.build(opts)
  } catch (e) {
    throw erreursEsbuild(e)
  }
  try {
    await import(pathToFileURL(sortie).href)
  } finally {
    rmSync(sortie, { force: true })
  }
  return collecte
}

export { extname }
