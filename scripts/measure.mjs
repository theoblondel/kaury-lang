// Measures a built Kaury site with Lighthouse (mobile by default), like PageSpeed does.
// Usage: node scripts/measure.mjs <dist-folder> [path=/] [--desktop] [--detail]
// Lighthouse is installed apart (KAURY_LH, default D:\KauryStudio\outils-lh) so the package stays light.

import { createServer } from 'node:http'
import { readFileSync, existsSync, statSync } from 'node:fs'
import { join, extname, resolve } from 'node:path'
import { gzipSync, brotliCompressSync } from 'node:zlib'
import { pathToFileURL } from 'node:url'

const dist = resolve(process.argv[2] ?? 'dist')
const path = process.argv[3] && !process.argv[3].startsWith('--') ? process.argv[3] : '/'
const desktop = process.argv.includes('--desktop')
const LH = process.env.KAURY_LH ?? 'D:/KauryStudio/outils-lh/node_modules'

const types = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif', '.glb': 'model/gltf-binary',
  '.json': 'application/json', '.woff2': 'font/woff2', '.xml': 'application/xml', '.txt': 'text/plain',
}
// static server like a normal host: compression + long cache (what the generated .htaccess / _headers ask for)
const server = createServer((req, res) => {
  let p = join(dist, decodeURIComponent(new URL(req.url, 'http://x').pathname))
  if (existsSync(p) && statSync(p).isDirectory()) p = join(p, 'index.html')
  if (!existsSync(p)) p = join(dist, '404.html')
  let body = readFileSync(p)
  const ext = extname(p)
  const headers = { 'Content-Type': types[ext] ?? 'application/octet-stream' }
  headers['Cache-Control'] = ext === '.html' ? 'no-cache' : p.includes('_kaury') ? 'public, max-age=31536000, immutable' : 'public, max-age=2592000'
  const ae = req.headers['accept-encoding'] ?? ''
  if (/\.(html|js|css|svg|json|xml|txt|glb)$/.test(ext)) {
    if (ae.includes('br')) {
      body = brotliCompressSync(body)
      headers['Content-Encoding'] = 'br'
    } else if (ae.includes('gzip')) {
      body = gzipSync(body)
      headers['Content-Encoding'] = 'gzip'
    }
  }
  res.writeHead(200, headers)
  res.end(body)
})
await new Promise((ok) => server.listen(0, ok))
const port = server.address().port

const { default: lighthouse } = await import(pathToFileURL(join(LH, 'lighthouse/core/index.js')).href)
const chromeLauncher = await import(pathToFileURL(join(LH, 'chrome-launcher/dist/index.js')).href)
const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless=new', '--no-sandbox'] })
try {
  const config = desktop ? (await import(pathToFileURL(join(LH, 'lighthouse/core/config/desktop-config.js')).href)).default : undefined
  const r = await lighthouse(`http://localhost:${port}${path}`, { port: chrome.port, output: 'json', logLevel: 'error' }, config)
  const c = r.lhr.categories
  const score = (x) => Math.round((x?.score ?? 0) * 100)
  console.log(`Performance ${score(c.performance)} · Accessibility ${score(c.accessibility)} · Best practices ${score(c['best-practices'])} · SEO ${score(c.seo)}`)
  const a = r.lhr.audits
  for (const id of ['first-contentful-paint', 'largest-contentful-paint', 'total-blocking-time', 'cumulative-layout-shift', 'speed-index']) {
    console.log(`  ${a[id].title}: ${a[id].displayValue}`)
  }
  if (process.argv.includes('--detail')) {
    for (const id of ['render-blocking-insight', 'network-dependency-tree-insight', 'lcp-breakdown-insight']) {
      const d = a[id]?.details
      if (d) console.log(id, JSON.stringify(d).slice(0, 1500))
    }
  }
  // what costs points
  const failing = Object.values(a).filter((x) => x.score !== null && x.score < 0.9 && !['informative', 'notApplicable', 'manual'].includes(x.scoreDisplayMode))
  for (const f of failing.slice(0, 25)) {
    console.log(`  ✗ ${f.id} — ${f.title}${f.displayValue ? ' (' + f.displayValue + ')' : ''}`)
    if (['color-contrast', 'target-size', 'link-name', 'button-name', 'image-alt', 'heading-order', 'label'].includes(f.id)) {
      for (const it of (f.details?.items ?? []).slice(0, 6)) console.log(`      · ${it.node?.snippet?.slice(0, 140)} ${it.node?.explanation ? '— ' + it.node.explanation.split('\n')[1]?.trim() : ''}`)
    }
  }
} finally {
  await chrome.kill()
  server.close()
}
