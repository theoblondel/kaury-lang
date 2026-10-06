// Fonts are downloaded at build time and served by the site itself:
// faster (no third-party connection), and no visitor data sent to Google (GDPR).

import { existsSync, readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import { fontUrl } from '../core/index.js'

// a modern browser user agent: the font services answer with woff2 files
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'

export interface SelfHostedFonts {
  css: string // @font-face rules pointing to /_kaury/fonts/…
  preload: string[] // the most useful files, preloaded
  external: string[] // fonts that could not be downloaded (linked as before)
}

/** Keeps latin blocks only (the others are rarely used on our sites). */
function latinOnly(css: string): string[] {
  const blocks = css.match(/@font-face\s*{[^}]*}/g) ?? []
  const withRange = blocks.filter((b) => /unicode-range/.test(b))
  if (!withRange.length) return blocks
  return blocks.filter((b) => !/unicode-range/.test(b) || /U\+0000-00FF/i.test(b))
}

/**
 * titleWeight: the weight the titles really use (800 for a site with « weight 800 » titles): its file is preloaded
 * with the text font, so titles never change width after the first paint (no layout shift).
 */
export async function selfHostFonts(names: string[], out: string, cacheDir: string, titleWeight = 700): Promise<SelfHostedFonts> {
  const result: SelfHostedFonts = { css: '', preload: [], external: [] }
  const dir = join(out, '_kaury', 'fonts')
  const cache = join(cacheDir, 'fonts')
  mkdirSync(dir, { recursive: true })
  mkdirSync(cache, { recursive: true })
  for (const [index, name] of names.entries()) {
    const url = fontUrl(name)
    if (!url) continue
    try {
      const cssKey = join(cache, createHash('sha1').update(url).digest('hex').slice(0, 12) + '.css')
      let css: string
      if (existsSync(cssKey)) css = readFileSync(cssKey, 'utf8')
      else {
        const r = await fetch(url, { headers: { 'User-Agent': UA } })
        if (!r.ok) throw new Error(String(r.status))
        css = await r.text()
        writeFileSync(cssKey, css)
      }
      const blocks = latinOnly(css)
      let first = true
      for (let block of blocks) {
        const src = /url\((['"]?)([^)'"]+)\1\)\s*format\(['"]?woff2/.exec(block) ?? /url\((['"]?)([^)'"]+)\1\)/.exec(block)
        if (!src) continue
        const remote = src[2].startsWith('//') ? 'https:' + src[2] : src[2]
        const file = createHash('sha1').update(remote).digest('hex').slice(0, 16) + '.woff2'
        const cached = join(cache, file)
        if (!existsSync(cached)) {
          const r = await fetch(remote, { headers: { 'User-Agent': UA } })
          if (!r.ok) throw new Error(String(r.status))
          writeFileSync(cached, Buffer.from(await r.arrayBuffer()))
        }
        copyFileSync(cached, join(dir, file))
        block = block.replace(/src:[^;]+;/, `src:url(/_kaury/fonts/${file}) format("woff2");`)
        if (!/font-display/.test(block)) block = block.replace('{', '{font-display:swap;')
        result.css += block.replace(/\s+/g, ' ') + '\n'
        // preload the regular weight of the text font, and the weight the titles use of the second font
        const weight = /font-weight:\s*(\d+)/.exec(block)?.[1]
        const wanted = index === 0 ? '400' : index === 1 ? String(titleWeight) : ''
        if (first && result.preload.length < 2 && wanted && (!weight || weight === wanted)) {
          result.preload.push(`/_kaury/fonts/${file}`)
          first = false
        }
      }
    } catch {
      result.external.push(name) // offline or unknown font: linked from its service
    }
  }
  return result
}
