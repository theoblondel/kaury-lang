// Building a Kaury site: compiles the .kaury files, bundles the JavaScript, renders every page to HTML.

import { existsSync, readdirSync, statSync, readFileSync, mkdirSync, writeFileSync, cpSync, rmSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { dirname, join, relative, resolve, basename } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import * as esbuild from 'esbuild'
import { compile, sourceMap, fontUrl, msg, type Result } from '../core/index.js'
import { KauryError } from '../core/errors.js'
import { BASE_STYLE, classesOnly } from '../runtime/style.js'
import { installSSR } from '../runtime/ssr.js'
import { optimizeImages, type ImageInfo } from './images.js'
import { selfHostFonts } from './fonts.js'
import { loadContent, clearContentCache, CONTENT_SOURCE, type LoadedContent } from './content.js'
import { parseMarkdown } from '../runtime/markdown.js'
import { mailMap, writeMailFunctions, writePhpMail } from './mail.js'

export function packageRoot(): string {
  let d = dirname(fileURLToPath(import.meta.url))
  for (let i = 0; i < 6; i++) {
    const p = join(d, 'package.json')
    if (existsSync(p)) {
      try {
        if (['kaury', '@kaury/cli'].includes(JSON.parse(readFileSync(p, 'utf8')).name)) return d
      } catch {
        /* keep looking */
      }
    }
    d = dirname(d)
  }
  throw new Error('Kaury: cannot find the package folder.')
}

export function findEntry(dir: string, asked?: string): string {
  if (asked) {
    const p = resolve(dir, asked)
    if (existsSync(p) && statSync(p).isFile()) return p
    if (existsSync(p) && statSync(p).isDirectory()) return findEntry(p)
    throw new Error(msg(`the file "${asked}" does not exist.`, `le fichier « ${asked} » n'existe pas.`))
  }
  for (const name of ['site.kaury', 'index.kaury', 'main.kaury', 'home.kaury', 'src/site.kaury']) {
    const p = join(dir, name)
    if (existsSync(p)) return p
  }
  const all = readdirSync(dir).filter((f) => f.endsWith('.kaury'))
  if (all.length === 1) return join(dir, all[0])
  if (!all.length) throw new Error(msg(`no .kaury file in "${dir}". Create a site.kaury, or run "kaury new my-site".`, `aucun fichier .kaury dans « ${dir} ». Crée un site.kaury, ou lance « kaury nouveau mon-site ».`))
  throw new Error(msg(`several .kaury files here (${all.join(', ')}). Name the main one "site.kaury", or pass it: kaury dev ${all[0]}`, `plusieurs fichiers .kaury ici (${all.join(', ')}). Nomme le principal « site.kaury », ou indique-le : kaury dev ${all[0]}`))
}

export interface Collected {
  css: Map<string, string>
  fonts: Set<string>
  site: { name?: string; lang?: string }
  warnings: { e: KauryError; source: string }[]
  immersion: boolean
  content: Map<string, any>
  mails: Set<string>
}

export class CompileFailure extends Error {
  constructor(public errors: { e: KauryError; source: string }[]) {
    super(errors.map(({ e, source }) => e.format(source)).join('\n\n'))
  }
}

function kauryPlugin(root: string, collected: Collected, siteDir: string, ssr: boolean, entries: Record<string, string>, out: string): esbuild.Plugin {
  return {
    name: 'kaury',
    setup(b) {
      b.onResolve({ filter: /^kaury\/(runtime|ssr|immersion|runtime\/menus)$/ }, (a) => {
        const what = a.path.slice('kaury/'.length)
        const p = what === 'ssr' ? 'src/runtime/ssr.ts' : what === 'immersion' ? 'src/immersion/index.ts' : what === 'runtime/menus' ? 'src/runtime/menus.ts' : 'src/runtime/index.ts'
        return { path: join(root, p) }
      })
      b.onResolve({ filter: /^kaury:entry:/ }, (a) => ({ path: a.path.slice('kaury:entry:'.length), namespace: 'kaury-virtual' }))
      b.onLoad({ filter: /.*/, namespace: 'kaury-virtual' }, (a) => ({ contents: entries[a.path], loader: 'js', resolveDir: siteDir }))
      // content collections imported by a .kaury file
      b.onResolve({ filter: CONTENT_SOURCE }, (a) => {
        if (!a.importer.endsWith('.kaury')) return undefined
        return { path: resolve(a.resolveDir, a.path), namespace: 'kaury-content' }
      })
      b.onLoad({ filter: /.*/, namespace: 'kaury-content' }, (a) => {
        let c: LoadedContent
        try {
          c = loadContent(a.path, out)
        } catch (e) {
          return { errors: [{ text: msg(`cannot read the content "${a.path}": ${(e as Error).message}`, `impossible de lire le contenu « ${a.path} » : ${(e as Error).message}`) }] }
        }
        collected.content.set(c.id, c.data)
        if (ssr) return { contents: `import { serverCollection } from "kaury/runtime"\nexport default serverCollection(${JSON.stringify(c.id)}, ${JSON.stringify(c.data)})`, loader: 'js', resolveDir: siteDir, watchFiles: c.files }
        // in the browser the data is never bundled: inlined in the pages that need it, or fetched
        mkdirSync(join(out, '_kaury', 'data'), { recursive: true })
        writeFileSync(join(out, '_kaury', 'data', `${c.id}.json`), JSON.stringify(c.data))
        return { contents: `import { clientCollection } from "kaury/runtime"\nexport default clientCollection(${JSON.stringify(c.id)}, "/_kaury/data/${c.id}.json", ${c.list})`, loader: 'js', resolveDir: siteDir }
      })
      b.onLoad({ filter: /\.kaury$/ }, async (a) => {
        const source = readFileSync(a.path, 'utf8')
        const file = relative(siteDir, a.path).replace(/\\/g, '/') || basename(a.path)
        let r: Result
        try {
          r = compile(source, { file })
        } catch (e) {
          return { errors: [{ text: `Kaury compiler internal error: ${(e as Error).stack}` }] }
        }
        if (!r.ok) {
          return {
            errors: r.errors.map((e) => ({
              text: e.format(source),
              location: { file: a.path, line: e.line, column: e.column - 1, length: e.length, lineText: source.split(/\r?\n/)[e.line - 1] ?? '' },
              detail: e,
            })),
          }
        }
        collected.css.set(a.path, r.css)
        r.fonts.forEach((f) => collected.fonts.add(f))
        r.mails.forEach((m) => collected.mails.add(m))
        if (r.site.name) collected.site.name = r.site.name
        if (r.site.lang) collected.site.lang = r.site.lang
        if (r.info?.threeD) collected.immersion = true
        if (!ssr) for (const e of r.warnings) collected.warnings.push({ e, source })
        const map = Buffer.from(sourceMap(r, file, source)).toString('base64')
        return { contents: `${r.js}\n//# sourceMappingURL=data:application/json;base64,${map}`, loader: 'js', resolveDir: dirname(a.path) }
      })
    },
  }
}

function esbuildErrors(e: any): CompileFailure | Error {
  const list = (e?.errors ?? []) as esbuild.Message[]
  const kaury = list.filter((m) => (m as any).detail instanceof KauryError)
  if (kaury.length) return new CompileFailure(kaury.map((m) => ({ e: (m as any).detail as KauryError, source: readFileSync(m.location!.file, 'utf8') })))
  if (list.length) {
    return new Error(list.map((m) => {
      const r = /Could not resolve "(.+)"/.exec(m.text)
      if (r) return msg(`the package "${r[1]}" was not found${m.location ? ` (${m.location.file}:${m.location.line})` : ''}.\nTry: npm install ${r[1]}`, `le paquet « ${r[1]} » est introuvable${m.location ? ` (${m.location.file}:${m.location.line})` : ''}.\nEssaie : npm install ${r[1]}`)
      return `${m.text}${m.location ? `\n  at ${m.location.file}:${m.location.line}:${m.location.column + 1}` : ''}`
    }).join('\n\n'))
  }
  return e
}

export interface BuildResult {
  pages: string[]
  files: number
  dir: string
  collected: Collected
  duration: number
  images: number
  staticPages: number
  mails: Record<string, string> // id → address of the forms that send e-mails
  mailFiles: string[] // endpoint files written for the hosts
}

export interface BuildOptions {
  out?: string
  dev?: boolean
  minify?: boolean
}

/** Builds the whole site into dist/. */
export async function build(entry: string, o: BuildOptions = {}): Promise<BuildResult> {
  const t0 = Date.now()
  const root = packageRoot()
  const siteDir = dirname(entry)
  const out = resolve(siteDir, o.out ?? 'dist')
  const cacheDir = join(siteDir, '.kaury-cache')
  const collected: Collected = { css: new Map(), fonts: new Set(), site: {}, warnings: [], immersion: false, content: new Map(), mails: new Set() }
  const nodePaths = [join(root, 'node_modules'), join(siteDir, 'node_modules')]
  clearContentCache()

  if (existsSync(out)) rmSync(out, { recursive: true, force: true })
  mkdirSync(join(out, '_kaury'), { recursive: true })

  // 1. public files (images, 3D models, sounds…)
  copyPublic(siteDir, out)
  const entryPath = JSON.stringify(entry.replace(/\\/g, '/'))

  // stylesheets and browser scripts imported by the site (import "style.css"): for every page
  const assets = siteAssets(entry)
  const scriptImports = assets.scripts.map((s) => `import ${JSON.stringify(s.replace(/\\/g, '/'))}\n`).join('')

  // 2. the browser JavaScript: the full app for dynamic pages, a tiny script for static ones
  let clientRes: esbuild.BuildResult<{ metafile: true }>
  try {
    clientRes = await esbuild.build({
      entryPoints: { site: 'kaury:entry:site', static: 'kaury:entry:static' },
      bundle: true,
      format: 'esm',
      splitting: true,
      outdir: join(out, '_kaury'),
      entryNames: '[name]-[hash]',
      chunkNames: 'chunk-[hash]',
      minify: o.minify ?? !o.dev,
      sourcemap: true,
      target: ['es2020', 'chrome90', 'safari15', 'firefox90'],
      metafile: true,
      logLevel: 'silent',
      nodePaths,
      define: { 'process.env.NODE_ENV': o.dev ? '"development"' : '"production"', __KAURY_IMAGES__: '{}' },
      plugins: [kauryPlugin(root, collected, siteDir, false, {
        site: `import * as app from ${entryPath}\nimport { start } from "kaury/runtime"\n${o.dev ? 'globalThis.__kauryDev = true\n' : ''}start(app)\n${scriptImports}`,
        static: `import { installMenus } from "kaury/runtime/menus"\ninstallMenus()\n${scriptImports}`,
      }, out)],
    })
  } catch (e) {
    throw esbuildErrors(e)
  }
  const outputs = clientRes.metafile.outputs
  const entryFile = (name: string) => Object.keys(outputs).find((f) => basename(f).startsWith(name + '-') && f.endsWith('.js'))!
  const siteJs = entryFile('site')
  const staticJs = entryFile('static')
  // chunks an entry needs at once: preloaded in parallel
  const preloadOf = (f: string) => (outputs[f].imports ?? []).filter((i) => i.kind === 'import-statement').map((i) => '/_kaury/' + basename(i.path))

  // 3. optimized images (public files and content images)
  const images: Record<string, ImageInfo> = o.dev ? {} : await optimizeImages(out, cacheDir)

  // 4. CSS: base + the styles of the files (inlined in each page: no blocking request)
  // fonts: downloaded and served by the site itself (no third party, no blocking)
  const siteCss = [...collected.css.values()].join('\n')
  const titleWeight = Math.max(700, ...[...siteCss.matchAll(/font-weight:\s*(\d+)/g)].map((m) => Number(m[1])).filter((w) => w <= 900))
  const fonts = await selfHostFonts([...collected.fonts], out, cacheDir, titleWeight)
  const css = await minifyCss([fonts.css, assets.base === 'none' ? classesOnly(BASE_STYLE) : BASE_STYLE, ...assets.styles, ...collected.css.values()].join('\n'), !o.dev)

  // 5. server render of every page
  const ssrFile = join(cacheDir, `ssr-${Date.now()}.mjs`)
  mkdirSync(dirname(ssrFile), { recursive: true })
  try {
    await esbuild.build({
      entryPoints: { ssr: 'kaury:entry:ssr' },
      bundle: true,
      format: 'esm',
      platform: 'node',
      outfile: ssrFile,
      logLevel: 'silent',
      nodePaths,
      define: { 'process.env.NODE_ENV': '"production"', __KAURY_IMAGES__: JSON.stringify(images) },
      // nothing external: the server render must work wherever the project is (three, marked… live in Kaury's folder)
      plugins: [kauryPlugin(root, { ...collected, css: new Map(), warnings: [], fonts: new Set(), content: collected.content }, siteDir, true, {
        ssr: `export * from ${entryPath}\nexport { renderPage, allPaths, mailAddresses } from "kaury/runtime"\nexport { serialize } from "kaury/ssr"\n`,
      }, out)],
    })
  } catch (e) {
    throw esbuildErrors(e)
  }
  const doc = installSSR()
  ;(globalThis as any).__kauryMarkdown = parseMarkdown
  let mod: any
  try {
    mod = await import(pathToFileURL(ssrFile).href)
  } finally {
    rmSync(ssrFile, { force: true })
  }
  const paths: string[] = mod.allPaths(mod)
  if (!paths.length) throw new Error(msg('this site has no page. Add at least: page "/"', 'ce site n\'a aucune page. Ajoute au moins : page "/"'))
  const site = mod.$site ?? {}
  const siteUrl = typeof site.url === 'string' ? site.url.replace(/\/$/, '') : ''
  const lang = site.lang ?? collected.site.lang ?? 'en'
  const pages: string[] = []
  const pageInfos: { path: string; title: string; description?: string }[] = []
  let staticPages = 0
  const common = { lang, siteName: site.name ?? collected.site.name, favicon: site.favicon, css, fonts: fonts.external, fontPreload: fonts.preload, dev: !!o.dev, siteUrl, transition: site.transition }
  for (const path of paths) {
    if (path.includes(':')) continue // pages with parameters and no list: rendered in the browser
    const target = doc.createElement('div')
    let info: any
    try {
      info = mod.renderPage(mod, path, target)
    } catch (e) {
      throw new Error(msg(`error while building the page "${path}": ${(e as Error).message}`, `erreur en construisant la page « ${path} » : ${(e as Error).message}`))
    }
    const dynamic = !!info.dynamic || !!o.dev
    if (!dynamic) staticPages++
    // the data a dynamic page reads is inlined, so it hydrates without waiting for the network
    const data = dynamic
      ? info.collections.map((id: string) => `<script type="application/json" id="k-data-${id}">${jsonForHtml(collected.content.get(id))}</script>`).join('') +
        (info.item ? `<script type="application/json" id="k-item" data-k-path="${esc(info.pattern)}">${jsonForHtml(info.item)}</script>` : '')
      : ''
    const js = dynamic ? siteJs : staticJs
    const share = await shareImage(info.image, out, cacheDir)
    const body = mod.serialize(target).replace(/^<div>|<\/div>$/g, '')
    const html = template({
      ...common, css: dynamic ? common.css : pruneCss(common.css, body), lang: info.lang ?? lang, body, data,
      title: info.title, description: info.description, image: share?.url ?? info.image, imageSize: share?.size, alternates: info.alternates, head: (site.head ?? '') + (info.head ?? ''), path, js: '/_kaury/' + basename(js), preload: preloadOf(js), pageKind: dynamic ? 'dynamic' : 'static',
    })
    const file = path === '/' ? 'index.html' : path === '/404' ? '404.html' : join(path.slice(1), 'index.html')
    mkdirSync(dirname(join(out, file)), { recursive: true })
    writeFileSync(join(out, file), html)
    pages.push(path)
    pageInfos.push({ path, title: info.title, description: info.description })
  }
  if (!paths.includes('/404')) {
    // a 404 page that starts the site: addresses with parameters (/product/:id) work too
    writeFileSync(join(out, '404.html'), template({ ...common, body: '', title: site.name ?? 'Kaury', path: '/404', noindex: true, js: '/_kaury/' + basename(siteJs), preload: preloadOf(siteJs), pageKind: 'dynamic' }))
  }

  // the endpoint of the forms that send e-mails, for the hosts that run functions
  const mails = mailMap([...collected.mails, ...(mod.mailAddresses ?? [])])
  const mailFiles = o.dev ? [] : writeMailFunctions(siteDir, mails)
  if (!o.dev) writePhpMail(out, mails)

  // 6. files for search engines, AIs and hosts
  const ownRobots = existsSync(join(out, 'robots.txt'))
  if (siteUrl) {
    const urls = pages.filter((p) => p !== '/404').map((p) => `  <url><loc>${siteUrl}${p === '/' ? '/' : p + '/'}</loc></url>`).join('\n')
    writeFileSync(join(out, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`)
  }
  if (!ownRobots) writeFileSync(join(out, 'robots.txt'), `User-agent: *\nAllow: /\n${siteUrl ? `\nSitemap: ${siteUrl}/sitemap.xml\n` : ''}`)
  if (!existsSync(join(out, 'llms.txt'))) writeFileSync(join(out, 'llms.txt'), llmsTxt(common.siteName, site.seo?.description ?? pageInfos[0]?.description, pageInfos.filter((p) => p.path !== '/404'), siteUrl))
  if (!existsSync(join(out, '.htaccess'))) writeFileSync(join(out, '.htaccess'), HTACCESS)
  if (!existsSync(join(out, '_headers'))) writeFileSync(join(out, '_headers'), HEADERS)

  return { pages, files: Object.keys(outputs).length, dir: out, collected, duration: Date.now() - t0, images: Object.keys(images).length, staticPages, mails, mailFiles }
}

/** og:locale from the page language: fr-CH → fr_CH, en → en_US. */
function ogLocale(lang: string): string {
  const [l, r] = lang.split('-')
  const regions: Record<string, string> = { en: 'US', fr: 'FR', de: 'DE', it: 'IT', es: 'ES', pt: 'PT', nl: 'NL' }
  return `${l.toLowerCase()}_${(r ?? regions[l.toLowerCase()] ?? l).toUpperCase()}`
}

/**
 * Share image of a page (WhatsApp, LinkedIn, iMessage…): networks show 1.91:1 and crop the rest at random.
 * A raster image of another shape is cut to 1200×630 JPEG (every bot reads JPEG); one already right is kept.
 */
async function shareImage(src: string | undefined, out: string, cacheDir: string): Promise<{ url: string; size: [number, number] } | undefined> {
  if (!src || !src.startsWith('/') || !/\.(png|jpe?g|webp|avif)$/i.test(src)) return undefined
  const file = join(out, src.slice(1))
  if (!existsSync(file)) return undefined
  let sharp: any
  try {
    sharp = (await import('sharp')).default
  } catch {
    return undefined
  }
  const meta = await sharp(file).metadata()
  if (meta.width === 1200 && meta.height === 630) return { url: src, size: [1200, 630] }
  const key = createHash('sha1').update(src + statSync(file).size + statSync(file).mtimeMs).digest('hex').slice(0, 12)
  const name = `${basename(src).replace(/\.[^.]+$/, '').replace(/[^\w-]+/g, '-')}-${key}.jpg`
  const cached = join(cacheDir, 'share', name)
  if (!existsSync(cached)) {
    mkdirSync(dirname(cached), { recursive: true })
    await sharp(file).resize(1200, 630, { fit: 'cover' }).jpeg({ quality: 78, mozjpeg: true }).toFile(cached)
  }
  mkdirSync(join(out, '_kaury', 'share'), { recursive: true })
  cpSync(cached, join(out, '_kaury', 'share', name))
  return { url: `/_kaury/share/${name}`, size: [1200, 630] }
}

/**
 * A page without JavaScript never changes its HTML: the rules of the site written for elements it does not have
 * (classes made by Kaury: .kxxx-1, .ks-name, .ka-name) are removed from its stylesheet. The base look is kept.
 */
export function pruneCss(css: string, html: string): string {
  const present = new Set<string>()
  for (const m of html.matchAll(/class="([^"]*)"/g)) for (const c of m[1].split(/\s+/)) if (c) present.add(c)
  const own = /\.(k[a-z0-9]{2,5}-[0-9a-z]+|ks-[\w-]+|ka-[\w-]+)/g
  const keep = (selector: string) => selector.split(',').some((sel) => [...sel.matchAll(own)].every((m) => present.has(m[1])))
  let out = ''
  let i = 0
  while (i < css.length) {
    const open = css.indexOf('{', i)
    if (open < 0) {
      out += css.slice(i)
      break
    }
    const head = css.slice(i, open)
    // the matching closing brace (rules nested in @media / @supports)
    let depth = 1
    let j = open + 1
    while (j < css.length && depth) {
      if (css[j] === '{') depth++
      else if (css[j] === '}') depth--
      j++
    }
    const inner = css.slice(open + 1, j - 1)
    if (head.trim().startsWith('@media') || head.trim().startsWith('@supports')) {
      const kept = pruneCss(inner, html)
      if (kept.trim()) out += `${head}{${kept}}`
    } else if (head.trim().startsWith('@') || keep(head)) out += css.slice(i, j)
    i = j
  }
  return out
}

/** JSON safe to put inside a <script> tag. */
function jsonForHtml(v: unknown): string {
  const bs = String.fromCharCode(92) // a backslash
  return JSON.stringify(v ?? null)
    .replace(/</g, bs + 'u003c')
    .replace(new RegExp(String.fromCharCode(0x2028), 'g'), bs + 'u2028')
    .replace(new RegExp(String.fromCharCode(0x2029), 'g'), bs + 'u2029')
}

const MEDIA = /\.(png|jpe?g|webp|avif|gif|svg|ico|glb|gltf|bin|json|lottie|mp3|ogg|wav|m4a|mp4|webm|woff2?|ttf|otf|pdf|txt|xml|webmanifest|hdr|ktx2)$/i

export function copyPublic(siteDir: string, out: string) {
  const pub = join(siteDir, 'public')
  if (existsSync(pub)) {
    cpSync(pub, out, { recursive: true })
    return
  }
  // without a public/ folder: take the media files next to the site
  const walk = (d: string, depth: number) => {
    for (const f of readdirSync(d)) {
      if (f.startsWith('.') || f === 'node_modules' || f === 'dist') continue
      const p = join(d, f)
      const s = statSync(p)
      if (s.isDirectory() && depth < 3) walk(p, depth + 1)
      else if (s.isFile() && MEDIA.test(f) && !/^package(-lock)?\.json$/.test(f)) {
        const dest = join(out, relative(siteDir, p))
        mkdirSync(dirname(dest), { recursive: true })
        cpSync(p, dest)
      }
    }
  }
  walk(siteDir, 0)
}

async function minifyCss(css: string, minify = true): Promise<string> {
  if (!minify) return css
  try {
    return (await esbuild.transform(css, { loader: 'css', minify: true, logLevel: 'silent' })).code.trim()
  } catch {
    return css.replace(/\/\*[\s\S]*?\*\//g, '')
  }
}

/** import "style.css" / import "script.js" in the site file: read before building. */
function siteAssets(entry: string): { styles: string[]; scripts: string[]; base?: string } {
  const r = compile(readFileSync(entry, 'utf8'), { file: basename(entry), checkOnly: false })
  const dir = dirname(entry)
  const styles: string[] = []
  const scripts: string[] = []
  for (const a of r.assets ?? []) {
    const p = resolve(dir, a)
    if (!existsSync(p)) throw new Error(msg(`the file "${a}" imported by the site does not exist`, `le fichier « ${a} » importé par le site n'existe pas`))
    if (a.endsWith('.css')) styles.push(readFileSync(p, 'utf8'))
    else scripts.push(p)
  }
  return { styles, scripts, base: r.site?.base }
}

const esc = (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')

export function template(d: {
  body: string; title: string; description?: string; image?: string; lang: string; siteName?: string; favicon?: string
  css: string; js: string; preload?: string[]; fonts: string[]; fontPreload?: string[]; dev: boolean; path: string; siteUrl?: string; noindex?: boolean; data?: string; pageKind?: string; transition?: string; alternates?: [string, string][]; head?: string; imageSize?: [number, number]
}): string {
  const fontLinks = d.fonts.map((p) => fontUrl(p)).filter(Boolean) as string[]
  const origins = [...new Set(fontLinks.map((l) => new URL(l).origin))]
  const icon = /rel="icon"/.test(d.head ?? '') ? '' : d.favicon
    ? `<link rel="icon" href="${esc(d.favicon)}">`
    : `<link rel="icon" href="data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="#16151a"/><text x="32" y="44" font-size="34" font-family="Arial" font-weight="700" fill="#fff" text-anchor="middle">' + esc((d.siteName ?? 'K').slice(0, 1).toUpperCase()) + '</text></svg>')}">`
  const canonical = d.siteUrl && !d.noindex ? `${d.siteUrl}${d.path === '/' ? '/' : d.path + '/'}` : ''
  const image = d.image && d.siteUrl && d.image.startsWith('/') ? d.siteUrl + d.image : d.image
  const jsonld = d.siteName && d.path === '/' && !/application\/ld\+json/.test(d.head ?? '') ? `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'WebSite', name: d.siteName, description: d.description, url: d.siteUrl || undefined })}</script>` : ''
  const html = `<!doctype html>
<html lang="${esc(d.lang)}"${d.pageKind ? ` data-k-page="${d.pageKind}"` : ""}${d.transition ? ` data-k-transition="${esc(d.transition)}"` : ""}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(d.title)}</title>
${d.description ? `<meta name="description" content="${esc(d.description)}">` : ''}
${d.noindex ? '<meta name="robots" content="noindex">' : ''}
${canonical ? `<link rel="canonical" href="${esc(canonical)}">` : ''}
${(d.alternates ?? []).map(([l, p], i) => {
    const href = (d.siteUrl ?? '') + p
    return `<link rel="alternate" hreflang="${esc(l)}" href="${esc(href)}">` + (i === 0 ? `<link rel="alternate" hreflang="x-default" href="${esc(href)}">` : '')
  }).join('\n')}
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(d.title)}">
${d.description ? `<meta property="og:description" content="${esc(d.description)}">` : ''}
${canonical ? `<meta property="og:url" content="${esc(canonical)}">` : ''}
${image ? `<meta property="og:image" content="${esc(image)}">${d.imageSize ? `<meta property="og:image:width" content="${d.imageSize[0]}"><meta property="og:image:height" content="${d.imageSize[1]}">` : ''}<meta property="og:image:alt" content="${esc(d.title)}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(d.title)}">${d.description ? `<meta name="twitter:description" content="${esc(d.description)}">` : ''}<meta name="twitter:image" content="${esc(image)}">` : ''}
<meta property="og:locale" content="${ogLocale(d.lang)}">
${d.siteName ? `<meta property="og:site_name" content="${esc(d.siteName)}">` : ''}
<meta name="generator" content="Kaury">
${icon}
${origins.map((o) => `<link rel="preconnect" href="${o}" crossorigin>`).join('\n')}
${fontLinks.map((l) => `<link rel="stylesheet" href="${esc(l)}" media="print" onload="this.media='all'"><noscript><link rel="stylesheet" href="${esc(l)}"></noscript>`).join('\n')}
${(d.fontPreload ?? []).map((f) => `<link rel="preload" href="${f}" as="font" type="font/woff2" crossorigin>`).join('\n')}
${d.head ?? ''}
<style>${d.css}</style>
<script>document.documentElement.classList.add('k-js')</script>
<script type="module" src="${d.js}"></script>
${(d.preload ?? []).map((p) => `<link rel="modulepreload" href="${p}">`).join('\n')}
${jsonld}
</head>
<body>
<div id="app">${d.body}</div>${d.data ?? ""}
${d.dev ? '<script type="module" src="/_kaury/reload.js"></script>' : ''}
</body>
</html>
`
  // tidy the empty lines of the head only: the body may hold <pre> blocks whose blank lines matter
  const at = html.indexOf('<body>')
  return html.slice(0, at).replace(/\n{2,}/g, '\n') + html.slice(at)
}

function llmsTxt(name: string | undefined, description: string | undefined, pages: { path: string; title: string; description?: string }[], url: string): string {
  const lines = [`# ${name ?? 'Site'}`, '']
  if (description) lines.push(`> ${description}`, '')
  lines.push('## Pages', '')
  for (const p of pages) lines.push(`- [${p.title}](${url}${p.path === '/' ? '/' : p.path + '/'})${p.description ? `: ${p.description}` : ''}`)
  return lines.join('\n') + '\n'
}

const HTACCESS = `# Generated by Kaury — cache and compression for Apache hosts
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/css text/javascript application/javascript application/json image/svg+xml text/plain application/xml model/gltf+json
</IfModule>
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType image/webp "access plus 30 days"
  ExpiresByType image/avif "access plus 30 days"
  ExpiresByType image/png "access plus 30 days"
  ExpiresByType image/jpeg "access plus 30 days"
  ExpiresByType image/svg+xml "access plus 30 days"
  ExpiresByType model/gltf-binary "access plus 30 days"
  ExpiresByType text/html "access plus 0 seconds"
</IfModule>
<IfModule mod_headers.c>
  <FilesMatch "^(site|chunk)-.*\\.js$">
    Header set Cache-Control "public, max-age=31536000, immutable"
  </FilesMatch>
  Header always set X-Content-Type-Options "nosniff"
  Header always set Referrer-Policy "strict-origin-when-cross-origin"
</IfModule>
AddType model/gltf-binary .glb
AddType model/gltf+json .gltf
ErrorDocument 404 /404.html
# forms that send e-mails (form mail "…"): the PHP endpoint written by kaury build
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteRule ^api/kaury-mail/?$ api/kaury-mail.php [L]
</IfModule>
`

const HEADERS = `# Generated by Kaury — Netlify / Cloudflare Pages
/_kaury/*
  Cache-Control: public, max-age=31536000, immutable
/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
`

/** Runs a Kaury program in Node (kaury run file.kaury). */
export async function run(file: string) {
  const root = packageRoot()
  const dir = dirname(file)
  const out = join(dir, '.kaury-cache', `run-${Date.now()}.mjs`)
  const collected: Collected = { css: new Map(), fonts: new Set(), site: {}, warnings: [], immersion: false, content: new Map(), mails: new Set() }
  try {
    await esbuild.build({
      entryPoints: { run: 'kaury:entry:run' },
      bundle: true,
      format: 'esm',
      platform: 'node',
      outfile: out,
      logLevel: 'silent',
      nodePaths: [join(root, 'node_modules'), join(dir, 'node_modules')],
      external: ['three', 'three/*', 'lottie-web'],
      sourcemap: 'inline',
      define: { __KAURY_IMAGES__: '{}' },
      plugins: [kauryPlugin(root, collected, dir, true, { run: `import ${JSON.stringify(file.replace(/\\/g, '/'))}\n` }, join(dir, '.kaury-cache', 'run-out'))],
    })
  } catch (e) {
    throw esbuildErrors(e)
  }
  try {
    await import(pathToFileURL(out).href)
  } finally {
    rmSync(out, { force: true })
  }
  return collected
}
