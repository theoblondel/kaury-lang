// Image optimization at build time: real dimensions (no layout jump) and responsive WebP versions.

import { existsSync, readdirSync, statSync, readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs'
import { join, relative, extname, basename, dirname } from 'node:path'
import { createHash } from 'node:crypto'

export interface ImageInfo {
  w: number
  h: number
  srcset?: string
}

const RASTER = /\.(png|jpe?g|webp|avif)$/i
const WIDTHS = [320, 640, 960, 1600]

function walk(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out
  for (const f of readdirSync(dir)) {
    const p = join(dir, f)
    const s = statSync(p)
    if (s.isDirectory()) {
      if (f !== '_kaury' && !f.startsWith('.')) walk(p, out)
    } else out.push(p)
  }
  return out
}

function svgSize(file: string): ImageInfo | undefined {
  const s = readFileSync(file, 'utf8').slice(0, 2000)
  const w = /\swidth="([\d.]+)(px)?"/.exec(s)
  const h = /\sheight="([\d.]+)(px)?"/.exec(s)
  if (w && h) return { w: Math.round(Number(w[1])), h: Math.round(Number(h[1])) }
  const vb = /viewBox="[\d.\-]+[ ,]+[\d.\-]+[ ,]+([\d.]+)[ ,]+([\d.]+)"/.exec(s)
  if (vb) return { w: Math.round(Number(vb[1])), h: Math.round(Number(vb[2])) }
  return undefined
}

/**
 * Optimizes every image of the built site (dist): returns { "/photo.jpg": { w, h, srcset } }.
 * Results are cached in .kaury-cache/img (only changed images are processed again).
 */
export async function optimizeImages(dist: string, cacheDir: string): Promise<Record<string, ImageInfo>> {
  const manifest: Record<string, ImageInfo> = {}
  let sharp: any
  try {
    sharp = (await import('sharp')).default
  } catch {
    sharp = null // without sharp: dimensions of SVG only
  }
  const cacheFile = join(cacheDir, 'images.json')
  const cache: Record<string, { key: string; info: ImageInfo; files: string[] }> = existsSync(cacheFile) ? JSON.parse(readFileSync(cacheFile, 'utf8')) : {}
  mkdirSync(join(cacheDir, 'img'), { recursive: true })
  const outDir = join(dist, '_kaury', 'img')
  mkdirSync(outDir, { recursive: true })

  for (const file of walk(dist)) {
    const url = '/' + relative(dist, file).replace(/\\/g, '/')
    if (/\.svg$/i.test(file)) {
      const info = svgSize(file)
      if (info) manifest[url] = info
      continue
    }
    if (!RASTER.test(file) || !sharp) continue
    const st = statSync(file)
    const key = `${st.size}-${st.mtimeMs}`
    const c = cache[url]
    if (c && c.key === key && c.files.every((f) => existsSync(join(cacheDir, 'img', f)))) {
      for (const f of c.files) copyFileSync(join(cacheDir, 'img', f), join(outDir, f))
      manifest[url] = c.info
      continue
    }
    const meta = await sharp(file).metadata()
    const w = meta.width ?? 0
    const h = meta.height ?? 0
    if (!w || !h) continue
    const hash = createHash('sha1').update(url + key).digest('hex').slice(0, 8)
    const name = basename(file, extname(file)).replace(/[^\w-]+/g, '-')
    const files: string[] = []
    const set: string[] = []
    for (const width of WIDTHS.filter((x) => x < w)) {
      const f = `${name}-${width}-${hash}.webp`
      await sharp(file).resize({ width }).webp({ quality: 78 }).toFile(join(cacheDir, 'img', f))
      copyFileSync(join(cacheDir, 'img', f), join(outDir, f))
      files.push(f)
      set.push(`/_kaury/img/${f} ${width}w`)
    }
    // the largest version too (re-encoded in WebP, often much lighter than the original)
    const fullName = `${name}-${w}-${hash}.webp`
    await sharp(file).webp({ quality: 80 }).toFile(join(cacheDir, 'img', fullName))
    const fullSize = statSync(join(cacheDir, 'img', fullName)).size
    if (fullSize < st.size || !/\.webp$/i.test(file)) {
      copyFileSync(join(cacheDir, 'img', fullName), join(outDir, fullName))
      files.push(fullName)
      set.push(`/_kaury/img/${fullName} ${w}w`)
    } else set.push(`${url} ${w}w`)
    const info: ImageInfo = { w, h, srcset: set.length > 1 ? set.join(', ') : undefined }
    manifest[url] = info
    cache[url] = { key, info, files }
  }
  mkdirSync(dirname(cacheFile), { recursive: true })
  writeFileSync(cacheFile, JSON.stringify(cache))
  return manifest
}
