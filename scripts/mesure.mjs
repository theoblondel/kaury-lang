// Mesure un site Kaury construit avec Lighthouse (mobile), comme le ferait PageSpeed.
// Usage : node scripts/mesure.mjs <dossier-dist> [chemin=/] [--ordinateur]
// Lighthouse est installé à part (D:\KauryStudio\outils-lh) pour ne pas alourdir le paquet.

import { createServer } from 'node:http'
import { readFileSync, existsSync, statSync } from 'node:fs'
import { join, extname, resolve } from 'node:path'
import { gzipSync, brotliCompressSync } from 'node:zlib'
import { pathToFileURL } from 'node:url'

const dist = resolve(process.argv[2] ?? 'dist')
const chemin = process.argv[3] && !process.argv[3].startsWith('--') ? process.argv[3] : '/'
const ordinateur = process.argv.includes('--ordinateur')
const LH = process.env.KAURY_LH ?? 'D:/KauryStudio/outils-lh/node_modules'

const types = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif', '.glb': 'model/gltf-binary',
  '.json': 'application/json', '.woff2': 'font/woff2', '.xml': 'application/xml', '.txt': 'text/plain',
}
// serveur statique comme un hébergeur normal : compression + cache long sur les fichiers à empreinte
const serveur = createServer((req, res) => {
  let p = join(dist, decodeURIComponent(new URL(req.url, 'http://x').pathname))
  if (existsSync(p) && statSync(p).isDirectory()) p = join(p, 'index.html')
  if (!existsSync(p)) p = join(dist, '404.html')
  let corps = readFileSync(p)
  const ext = extname(p)
  const entetes = { 'Content-Type': types[ext] ?? 'application/octet-stream' }
  entetes['Cache-Control'] = p.includes('_kaury') ? 'public, max-age=31536000, immutable' : 'public, max-age=600'
  const ae = req.headers['accept-encoding'] ?? ''
  if (/\.(html|js|css|svg|json|xml|txt|glb)$/.test(ext)) {
    if (ae.includes('br')) {
      corps = brotliCompressSync(corps)
      entetes['Content-Encoding'] = 'br'
    } else if (ae.includes('gzip')) {
      corps = gzipSync(corps)
      entetes['Content-Encoding'] = 'gzip'
    }
  }
  res.writeHead(200, entetes)
  res.end(corps)
})
await new Promise((ok) => serveur.listen(0, ok))
const port = serveur.address().port

const { default: lighthouse } = await import(pathToFileURL(join(LH, 'lighthouse/core/index.js')).href)
const chromeLauncher = await import(pathToFileURL(join(LH, 'chrome-launcher/dist/index.js')).href)
const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless=new', '--no-sandbox'] })
try {
  const r = await lighthouse(`http://localhost:${port}${chemin}`, { port: chrome.port, output: 'json', logLevel: 'error' },
    ordinateur ? (await import(pathToFileURL(join(LH, 'lighthouse/core/config/desktop-config.js')).href)).default : undefined)
  const c = r.lhr.categories
  const note = (x) => Math.round((x?.score ?? 0) * 100)
  console.log(`Performance ${note(c.performance)} · Accessibilité ${note(c.accessibility)} · Bonnes pratiques ${note(c['best-practices'])} · SEO ${note(c.seo)}`)
  const a = r.lhr.audits
  for (const id of ['first-contentful-paint', 'largest-contentful-paint', 'total-blocking-time', 'cumulative-layout-shift', 'speed-index']) {
    console.log(`  ${a[id].title} : ${a[id].displayValue}`)
  }
  // ce qui fait perdre des points
  const fautes = Object.values(a).filter((x) => x.score !== null && x.score < 0.9 && x.scoreDisplayMode !== 'informative' && x.scoreDisplayMode !== 'notApplicable' && x.scoreDisplayMode !== 'manual')
  for (const f of fautes.slice(0, 25)) console.log(`  ✗ ${f.id} — ${f.title}${f.displayValue ? ' (' + f.displayValue + ')' : ''}`)
} finally {
  await chrome.kill()
  serveur.close()
}
