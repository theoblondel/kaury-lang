#!/usr/bin/env node
// The “kaury” command: new, dev, build, check, run, compile, deploy.
// French aliases work too: nouveau, verifie, lance, traduit, publie.

import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, watch } from 'node:fs'
import { createServer } from 'node:http'
import { join, resolve, extname, dirname, relative } from 'node:path'
import { spawnSync } from 'node:child_process'
import { compile, formatErrors, msg, setLanguage } from '../core/index.js'
import { build, run, findEntry, CompileFailure, packageRoot } from './project.js'
import { newSiteTemplate, TEMPLATES } from './template.js'
import { devMailHandler, readEnvFile } from './mail.js'

const c = {
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
  pink: (s: string) => `\x1b[38;5;205m${s}\x1b[0m`,
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  gray: (s: string) => `\x1b[90m${s}\x1b[0m`,
}

const version = () => JSON.parse(readFileSync(join(packageRoot(), 'package.json'), 'utf8')).version as string

function help() {
  console.log(`
${c.pink(c.bold('Kaury'))} ${c.gray('v' + version())} — ${msg('the language for immersive websites', 'le langage des sites immersifs')}

${c.bold(msg('Commands', 'Commandes'))}
  kaury new ${c.gray('my-site')}          ${msg('creates a ready-to-use project', 'crée un projet prêt à l\'emploi')} ${c.gray('(--template starter|landing|blog|portfolio)')}
  kaury dev ${c.gray('[file]')}           ${msg('shows the site and reloads it on every change', 'affiche le site et le recharge à chaque modification')}
  kaury build ${c.gray('[file]')}         ${msg('makes the final, optimized site in dist/', 'produit le site final, optimisé, dans dist/')}
  kaury check ${c.gray('[files]')}        ${msg('checks the code without building', 'vérifie le code sans construire')} ${c.gray('(--json)')}
  kaury run ${c.gray('file.kaury')}       ${msg('runs a program (no page)', 'exécute un programme (sans page)')}
  kaury compile ${c.gray('file.kaury')}   ${msg('shows the generated JavaScript', 'montre le JavaScript produit')}
  kaury deploy ${c.gray('[--netlify|--vercel]')}  ${msg('builds then publishes', 'construit puis met en ligne')}

${c.gray(msg('Options: --lang fr|en (messages), --port 3000, --out dist', 'Options : --lang fr|en (messages), --port 3000, --out dist'))}
${c.gray('Docs: https://kaury.dev   ·   AI spec: docs/kaury-ai.md')}
`)
}

async function main() {
  const argv = process.argv.slice(2)
  const lang = value(argv, '--lang')
  if (lang === 'fr' || lang === 'en') setLanguage(lang)
  const args = argv.filter((a, i) => !(a === '--lang' || argv[i - 1] === '--lang'))
  const [cmd, ...rest] = args
  const flags = new Set(rest.filter((a) => a.startsWith('--')))
  const positional = rest.filter((a, i) => !a.startsWith('--') && !['--port', '--out', '--template', '-t'].includes(rest[i - 1]))
  const here = process.cwd()
  switch (cmd) {
    case undefined: case 'help': case 'aide': case '--help': case '-h':
      return help()
    case '--version': case '-v': case 'version':
      return console.log(version())
    case 'new': case 'nouveau':
      return newProject(positional[0] ?? 'my-site', value(rest, '--template') ?? value(rest, '-t') ?? 'starter')
    case 'dev':
      return dev(here, positional[0], Number(value(rest, '--port') ?? 3000))
    case 'build': case 'construis':
      return buildCmd(here, positional[0], value(rest, '--out') ?? value(rest, '--sortie'))
    case 'check': case 'verifie':
      return check(here, positional, flags.has('--json'))
    case 'run': case 'lance':
      return runCmd(here, positional[0])
    case 'compile': case 'traduit':
      return compileCmd(here, positional[0], flags.has('--css'))
    case 'deploy': case 'publie':
      return deploy(here, positional[0], flags)
    default:
      if (cmd.endsWith('.kaury')) {
        const src = readFileSync(resolve(here, cmd), 'utf8')
        if (/^\s*page\s+"/m.test(src)) return dev(here, cmd, 3000)
        return runCmd(here, cmd)
      }
      console.error(c.red(msg(`Unknown command "${cmd}".`, `Commande inconnue « ${cmd} ».`)))
      help()
      process.exitCode = 1
  }
}

function value(args: string[], name: string): string | undefined {
  const i = args.indexOf(name)
  if (i >= 0) return args[i + 1]
  return args.find((a) => a.startsWith(name + '='))?.split('=')[1]
}

function showFailure(e: unknown) {
  if (e instanceof CompileFailure) {
    for (const { e: err, source } of e.errors) console.error('\n' + c.red(err.format(source)))
    console.error(c.gray(`\n${e.errors.length} ${msg('error', 'erreur')}${e.errors.length > 1 ? 's' : ''}.`))
  } else console.error(c.red(`\n${msg('Error', 'Erreur')}: ${(e as Error)?.message ?? String(e)}`))
  process.exitCode = 1
}

// ---------------------------------------------------------------- new
function newProject(name: string, template: string) {
  if (!TEMPLATES[template]) {
    console.error(c.red(msg(`Unknown template "${template}".`, `Modèle inconnu « ${template} ».`)))
    for (const [t, d] of Object.entries(TEMPLATES)) console.error(`  ${c.bold(t.padEnd(10))} ${c.gray(d)}`)
    process.exitCode = 1
    return
  }
  const dir = resolve(process.cwd(), name)
  if (existsSync(dir) && readdirSync(dir).length) {
    console.error(c.red(msg(`The folder "${name}" already exists and is not empty.`, `Le dossier « ${name} » existe déjà et n'est pas vide.`)))
    process.exitCode = 1
    return
  }
  const specFile = join(packageRoot(), 'docs', 'kaury-ai.md')
  const spec = existsSync(specFile) ? readFileSync(specFile, 'utf8') : undefined
  for (const [path, content] of Object.entries(newSiteTemplate(name, spec, template))) {
    const p = join(dir, path)
    mkdirSync(dirname(p), { recursive: true })
    writeFileSync(p, content)
  }
  console.log(`\n${c.green('✓')} ${msg('Project', 'Projet')} ${c.bold(name)} ${msg('created', 'créé')} (${template}).\n\n  cd ${name}\n  kaury dev\n\n${msg('Open', 'Ouvre')} ${c.bold('site.kaury')}: ${msg('the whole site is in this file.', 'tout le site est dans ce fichier.')}`)
  if (template === 'starter') console.log(c.gray(msg(`Other starting points: ${Object.keys(TEMPLATES).filter((t) => t !== 'starter').map((t) => `kaury new ${name} --template ${t}`).join(' · ')}`, `Autres points de départ : ${Object.keys(TEMPLATES).filter((t) => t !== 'starter').map((t) => `kaury new ${name} --template ${t}`).join(' · ')}`)))
  console.log('')
}

// ---------------------------------------------------------------- build
async function buildCmd(here: string, file?: string, out?: string) {
  try {
    const entry = findEntry(here, file)
    console.log(c.gray(msg(`Building ${relative(here, entry)}…`, `Construction de ${relative(here, entry)}…`)))
    const r = await build(entry, { out })
    for (const { e, source } of r.collected.warnings) console.log(c.yellow(e.format(source)))
    console.log(`${c.green('✓')} ${r.pages.length} page${r.pages.length > 1 ? 's' : ''} (${r.pages.join(', ')}), ${r.images} image${r.images === 1 ? '' : 's'} ${msg('optimized', 'optimisée' + (r.images > 1 ? 's' : ''))}, ${r.duration} ms → ${relative(here, r.dir) || '.'}`)
    if (r.collected.immersion) console.log(c.gray(msg('  immersion: the 3D library loads only on pages that need it, after the page is displayed.', '  immersion : la 3D se charge seulement sur les pages qui en ont besoin, après l\'affichage.')))
    if (r.mailFiles.length) console.log(c.gray(msg(`  forms by e-mail: endpoint written for Netlify, Vercel and Cloudflare Pages (${r.mailFiles.join(', ')}). Set KAURY_MAIL_KEY (a resend.com key) on the host.`, `  formulaires par e-mail : point d'envoi écrit pour Netlify, Vercel et Cloudflare Pages (${r.mailFiles.join(', ')}). Règle KAURY_MAIL_KEY (une clé resend.com) chez l'hébergeur.`)))
  } catch (e) {
    showFailure(e)
  }
}

// ---------------------------------------------------------------- check
function kauryFiles(d: string): string[] {
  const r: string[] = []
  for (const f of readdirSync(d)) {
    if (f.startsWith('.') || f === 'node_modules' || f === 'dist') continue
    const p = join(d, f)
    if (statSync(p).isDirectory()) r.push(...kauryFiles(p))
    else if (f.endsWith('.kaury')) r.push(p)
  }
  return r
}

function check(here: string, files: string[], json: boolean) {
  const list = files.length ? files.flatMap((f) => (statSync(resolve(here, f)).isDirectory() ? kauryFiles(resolve(here, f)) : [resolve(here, f)])) : kauryFiles(here)
  const all: any[] = []
  let errors = 0
  for (const f of list) {
    const src = readFileSync(f, 'utf8')
    const r = compile(src, { file: relative(here, f).replace(/\\/g, '/'), checkOnly: true })
    errors += r.errors.length
    if (json) all.push(...[...r.errors, ...r.warnings].map((e) => e.toJSON()))
    else {
      const m = formatErrors(r, src)
      if (m) console.log((r.errors.length ? c.red : c.yellow)(m) + '\n')
    }
  }
  if (json) console.log(JSON.stringify({ ok: errors === 0, files: list.length, problems: all }, null, 2))
  else if (errors === 0) console.log(`${c.green('✓')} ${list.length} ${msg('file' + (list.length > 1 ? 's' : '') + ' checked, no error.', 'fichier' + (list.length > 1 ? 's vérifiés' : ' vérifié') + ', aucune erreur.')}`)
  else console.log(c.red(`${errors} ${msg('error', 'erreur')}${errors > 1 ? 's' : ''}.`))
  if (errors) process.exitCode = 1
}

// ---------------------------------------------------------------- run / compile
async function runCmd(here: string, file?: string) {
  if (!file) {
    console.error(c.red(msg('Give the file to run: kaury run program.kaury', 'Indique le fichier à lancer : kaury lance calcul.kaury')))
    process.exitCode = 1
    return
  }
  try {
    await run(resolve(here, file))
  } catch (e) {
    showFailure(e)
  }
}

function compileCmd(here: string, file: string | undefined, css: boolean) {
  if (!file) {
    console.error(c.red(msg('Give the file: kaury compile site.kaury', 'Indique le fichier : kaury traduit site.kaury')))
    process.exitCode = 1
    return
  }
  const src = readFileSync(resolve(here, file), 'utf8')
  const r = compile(src, { file })
  if (!r.ok) {
    console.error(c.red(formatErrors(r, src)))
    process.exitCode = 1
    return
  }
  console.log(css ? r.css : r.js)
}

// ---------------------------------------------------------------- dev
async function dev(here: string, file: string | undefined, port: number) {
  let entry: string
  try {
    entry = findEntry(here, file)
  } catch (e) {
    return showFailure(e)
  }
  const siteDir = dirname(entry)
  const out = join(siteDir, '.kaury-cache', 'dev')
  let error: string | null = null
  let ver = 0
  let mails: Record<string, string> = {}
  const sendMail = devMailHandler({ ...readEnvFile(siteDir), ...process.env })
  const clients = new Set<any>()

  const rebuild = async () => {
    const t0 = Date.now()
    try {
      const r = await build(entry, { out, dev: true, minify: false })
      mails = r.mails
      error = null
      for (const { e, source } of r.collected.warnings) console.log(c.yellow(e.format(source)))
      console.log(`${c.green('✓')} ${c.gray(new Date().toLocaleTimeString())} ${r.pages.length} page${r.pages.length > 1 ? 's' : ''} ${msg('ready in', 'prête' + (r.pages.length > 1 ? 's' : '') + ' en')} ${Date.now() - t0} ms`)
    } catch (e) {
      error = e instanceof CompileFailure ? e.errors.map(({ e: x, source }) => x.format(source)).join('\n\n') : (e as Error).message
      showFailure(e)
      process.exitCode = 0
    }
    ver++
    for (const r of clients) r.write(`data: ${ver}\n\n`)
  }
  await rebuild()

  let timer: any
  const later = () => {
    clearTimeout(timer)
    timer = setTimeout(rebuild, 60)
  }
  watch(siteDir, { recursive: true }, (_ev, f) => {
    if (!f || f.includes('.kaury-cache') || f.startsWith('dist') || f.includes('node_modules')) return
    later()
  })
  // while developing Kaury itself: a runtime change rebuilds the site too
  for (const d of ['runtime', 'immersion']) {
    const p = join(packageRoot(), 'src', d)
    if (existsSync(p)) watch(p, { recursive: true }, later)
  }

  const types: Record<string, string> = {
    '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif', '.gif': 'image/gif',
    '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.webm': 'video/webm',
    '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.map': 'application/json', '.txt': 'text/plain; charset=utf-8',
  }
  const server = createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://x')
    if (url.pathname === '/_kaury/events') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' })
      res.write(`data: ${ver}\n\n`)
      clients.add(res)
      req.on('close', () => clients.delete(res))
      return
    }
    if (url.pathname === '/api/kaury-mail' && req.method === 'POST') {
      let body = ''
      req.on('data', (d) => (body += d))
      req.on('end', async () => {
        const r = await sendMail(body, `http://localhost:${port}${url.pathname}`, mails)
        if (r.preview) {
          console.log(`\n${c.pink('✉')} ${c.bold(msg('E-mail to', 'E-mail pour'))} ${r.preview.to}`)
          for (const [k, v] of Object.entries(r.preview.fields)) console.log(`  ${c.gray(k + ':')} ${v}`)
          console.log(c.gray(msg('  (not sent: put KAURY_MAIL_KEY, a resend.com key, in .env to send it for real)', '  (pas envoyé : mets KAURY_MAIL_KEY, une clé resend.com, dans .env pour l\'envoyer vraiment)')))
        } else if (r.status !== 200) console.log(c.red(`✉ ${r.body}`))
        else console.log(`${c.green('✉')} ${msg('e-mail sent', 'e-mail envoyé')}`)
        res.writeHead(r.status, { 'Content-Type': 'application/json' })
        res.end(r.body)
      })
      return
    }
    if (url.pathname === '/_kaury/reload.js') {
      res.writeHead(200, { 'Content-Type': 'text/javascript' })
      res.end(`let v=null;const s=new EventSource('/_kaury/events');s.onmessage=(e)=>{if(v!==null&&e.data!==v)location.reload();v=e.data}`)
      return
    }
    if (error) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      res.end(errorPage(error))
      return
    }
    const path = decodeURIComponent(url.pathname)
    let p = join(out, path)
    if (existsSync(p) && statSync(p).isDirectory()) p = join(p, 'index.html')
    if (!existsSync(p) && !extname(path)) p = join(out, '404.html')
    if (!existsSync(p)) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
      res.end(msg(`Not found: ${path}\n(images, models and sounds go in the public/ folder)`, `Introuvable : ${path}\n(les images, modèles et sons vont dans le dossier public/)`))
      return
    }
    res.writeHead(200, { 'Content-Type': types[extname(p)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' })
    res.end(readFileSync(p))
  })
  server.on('error', (e: any) => {
    if (e.code === 'EADDRINUSE') {
      console.log(c.yellow(msg(`Port ${port} is taken, trying ${port + 1}…`, `Le port ${port} est pris, j'essaie ${port + 1}…`)))
      server.listen(++port)
    } else showFailure(e)
  })
  server.listen(port, () => {
    console.log(`\n${c.pink(c.bold('Kaury'))} ${msg('runs on', 'tourne sur')} ${c.bold(`http://localhost:${port}`)}\n${c.gray(msg(`Edit ${relative(here, entry)}: the page reloads by itself. Ctrl+C to stop.`, `Modifie ${relative(here, entry)} : la page se recharge toute seule. Ctrl+C pour arrêter.`))}\n`)
  })
}

function errorPage(m: string): string {
  const e = m.replace(/&/g, '&amp;').replace(/</g, '&lt;')
  return `<!doctype html><meta charset="utf-8"><title>Kaury error</title><style>body{margin:0;background:#160d18;color:#ffe3ea;font:15px/1.6 ui-monospace,Consolas,monospace;padding:6vh 6vw}h1{font:700 22px system-ui;color:#ff4f8b}pre{white-space:pre-wrap;background:#21122a;border:1px solid #ff4f8b55;border-radius:14px;padding:22px}</style><h1>${msg('Kaury found a problem', 'Kaury a trouvé un problème')}</h1><pre>${e}</pre><p style="opacity:.7">${msg('Fix the file: the page reloads by itself.', 'Corrige le fichier : la page se recharge toute seule.')}</p><script type="module" src="/_kaury/reload.js"></script>`
}

// ---------------------------------------------------------------- deploy
async function deploy(here: string, file: string | undefined, flags: Set<string>) {
  await buildCmd(here, file)
  if (process.exitCode) return
  const dist = join(dirname(findEntry(here, file)), 'dist')
  if (flags.has('--vercel')) spawnSync('npx', ['--yes', 'vercel', 'deploy', dist, '--prod'], { stdio: 'inherit', shell: true })
  else if (flags.has('--netlify')) spawnSync('npx', ['--yes', 'netlify-cli', 'deploy', '--dir', dist, '--prod'], { stdio: 'inherit', shell: true })
  else {
    console.log(`\n${msg('The site is ready in', 'Le site est prêt dans')} ${c.bold(relative(here, dist) || 'dist')}. ${msg('It is a static site: it works anywhere.', 'C\'est un site statique : il marche partout.')}\n
  ${c.bold('kaury deploy --netlify')}   ${msg('publishes on Netlify', 'met en ligne sur Netlify')}
  ${c.bold('kaury deploy --vercel')}    ${msg('publishes on Vercel', 'met en ligne sur Vercel')}
  ${msg('or drop the dist/ folder on', 'ou glisse le dossier dist/ sur')} ${c.bold('https://app.netlify.com/drop')}
  ${msg('or copy it to your host (FTP) — the .htaccess file is ready for Apache.', 'ou copie-le chez ton hébergeur (FTP) — le fichier .htaccess est prêt pour Apache.')}\n`)
  }
}

main().catch(showFailure)
