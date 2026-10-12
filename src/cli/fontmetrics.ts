// How wide a font writes, read from its file. While a web font loads, the text is drawn with a font of the
// device; when the two do not have the same width, the lines break elsewhere once the real font arrives and the
// page moves (a row of buttons that takes one line less, and everything below jumps up). The build writes a
// fallback of the same width: the device font, scaled (“size-adjust”) to what is measured here.

import { brotliDecompressSync } from 'node:zlib'

/** The tables of a WOFF2 file are named by a number (the first 63 of this list) or by their four letters. */
const TAGS = ['cmap', 'head', 'hhea', 'hmtx', 'maxp', 'name', 'OS/2', 'post', 'cvt ', 'fpgm', 'glyf', 'loca', 'prep', 'CFF ', 'VORG', 'EBDT', 'EBLC', 'gasp', 'hdmx', 'kern', 'LTSH', 'PCLT', 'VDMX', 'vhea', 'vmtx', 'BASE', 'GDEF', 'GPOS', 'GSUB', 'EBSC', 'JSTF', 'MATH', 'CBDT', 'CBLC', 'COLR', 'CPAL', 'SVG ', 'sbix', 'acnt', 'avar', 'bdat', 'bloc', 'bsln', 'cvar', 'fdsc', 'feat', 'fmtx', 'fvar', 'gvar', 'hsty', 'just', 'lcar', 'mort', 'morx', 'opbd', 'prop', 'trak', 'Zapf', 'Silf', 'Glat', 'Gloc', 'Feat', 'Sill']

/** How often each letter comes in a text in English, the space included (per thousand). */
const LETTERS: Record<string, number> = { ' ': 180, e: 102, t: 75, a: 65, o: 62, i: 57, n: 57, s: 53, r: 50, h: 49, l: 33, d: 33, u: 23, c: 22, m: 20, f: 18, w: 17, g: 16, y: 16, p: 15, b: 13, v: 8, k: 6, x: 1, j: 1, q: 1, z: 1 }

/**
 * The width of an average letter of Arial and of Arial Bold, as a part of the size of the text: measured with
 * textWidth() on the files of Windows (arial.ttf, arialbd.ttf). They are the fonts the fallback is drawn with.
 */
export const ARIAL = { regular: 0.4403, bold: 0.4762 }

type Tables = Map<string, { data: Buffer; transformed: boolean }>

/** The tables of a font file: WOFF2 (what the font services give) or TrueType/OpenType as it is. */
function tablesOf(file: Uint8Array): Tables | undefined {
  const b = Buffer.from(file)
  const tables: Tables = new Map()
  const kind = b.toString('latin1', 0, 4)
  if (kind === 'wOF2') {
    if (b.toString('latin1', 4, 8) === 'ttcf') return undefined // a collection of fonts: not what a site loads
    const count = b.readUInt16BE(12)
    const compressed = b.readUInt32BE(20)
    let p = 48
    const number = () => {
      let v = 0
      for (let i = 0; i < 5; i++) {
        const c = b[p++]
        v = v * 128 + (c & 0x7f)
        if (!(c & 0x80)) break
      }
      return v
    }
    const list: { tag: string; length: number; transformed: boolean }[] = []
    for (let i = 0; i < count; i++) {
      const flags = b[p++]
      const index = flags & 0x3f
      let tag = TAGS[index]
      if (index === 63) {
        tag = b.toString('latin1', p, p + 4)
        p += 4
      }
      const version = flags >> 6
      const length = number()
      // glyf and loca are transformed unless said otherwise (3); the others only when said (hmtx: 1)
      const transformed = tag === 'glyf' || tag === 'loca' ? version !== 3 : version !== 0
      list.push({ tag, length: transformed ? number() : length, transformed })
    }
    const data = brotliDecompressSync(b.subarray(p, p + compressed))
    let at = 0
    for (const t of list) {
      tables.set(t.tag, { data: data.subarray(at, at + t.length), transformed: t.transformed })
      at += t.length
    }
    return tables
  }
  // TrueType, OpenType
  if (kind !== '\x00\x01\x00\x00' && kind !== 'OTTO' && kind !== 'true') return undefined
  const count = b.readUInt16BE(4)
  for (let i = 0; i < count; i++) {
    const o = 12 + i * 16
    tables.set(b.toString('latin1', o, o + 4), { data: b.subarray(b.readUInt32BE(o + 8), b.readUInt32BE(o + 8) + b.readUInt32BE(o + 12)), transformed: false })
  }
  return tables
}

/** The glyph of a character, from the “cmap” table (the format every Latin font has: 4). */
function glyphOf(cmap: Buffer, code: number): number {
  const records = cmap.readUInt16BE(2)
  for (let i = 0; i < records; i++) {
    const platform = cmap.readUInt16BE(4 + i * 8)
    const sub = cmap.readUInt32BE(8 + i * 8)
    if ((platform !== 3 && platform !== 0) || cmap.readUInt16BE(sub) !== 4) continue
    const segments = cmap.readUInt16BE(sub + 6) / 2
    const ends = sub + 14
    const starts = ends + segments * 2 + 2
    const deltas = starts + segments * 2
    const offsets = deltas + segments * 2
    for (let s = 0; s < segments; s++) {
      if (code > cmap.readUInt16BE(ends + s * 2)) continue
      const start = cmap.readUInt16BE(starts + s * 2)
      if (code < start) return 0
      const offset = cmap.readUInt16BE(offsets + s * 2)
      if (!offset) return (code + cmap.readUInt16BE(deltas + s * 2)) & 0xffff
      const glyph = cmap.readUInt16BE(offsets + s * 2 + offset + (code - start) * 2)
      return glyph ? (glyph + cmap.readUInt16BE(deltas + s * 2)) & 0xffff : 0
    }
  }
  return 0
}

/**
 * The width of an average letter of a text, as a part of the size of the text (0.46: a text of 100 pixels
 * writes letters 46 pixels wide on average). Nothing when the file cannot be read: the build goes on without it.
 */
export function textWidth(file: Uint8Array): number | undefined {
  try {
    const t = tablesOf(file)
    const head = t?.get('head')?.data
    const hhea = t?.get('hhea')?.data
    const hmtx = t?.get('hmtx')
    const cmap = t?.get('cmap')?.data
    if (!head || !hhea || !hmtx || !cmap) return undefined
    const unitsPerEm = head.readUInt16BE(18)
    const measured = hhea.readUInt16BE(34)
    // a transformed table starts with one byte of flags, then the widths alone
    const widthOf = (glyph: number) => {
      const i = Math.min(glyph, measured - 1)
      return hmtx.transformed ? hmtx.data.readUInt16BE(1 + i * 2) : hmtx.data.readUInt16BE(i * 4)
    }
    let total = 0
    let weight = 0
    for (const [letter, often] of Object.entries(LETTERS)) {
      const glyph = glyphOf(cmap, letter.charCodeAt(0))
      if (!glyph) continue
      total += widthOf(glyph) * often
      weight += often
    }
    if (!unitsPerEm || weight < 500) return undefined
    return total / weight / unitsPerEm
  } catch {
    return undefined
  }
}

/**
 * The fallback of a family: the font of the device (Arial; Arial Bold for the bold weights), scaled so that it
 * writes as wide as the real font. Written as “<family> fallback”, the name the compiler puts after the family.
 */
export function fallbackFaces(family: string, regular?: number, bold?: number): string {
  const adjust = (width: number, arial: number) => Math.max(70, Math.min(140, (width / arial) * 100)).toFixed(1)
  let css = ''
  if (regular) css += `@font-face{font-family:"${family} fallback";src:local("Arial");font-weight:100 500;size-adjust:${adjust(regular, ARIAL.regular)}%}\n`
  if (bold ?? regular) css += `@font-face{font-family:"${family} fallback";src:local("Arial Bold"),local("Arial");font-weight:${regular ? '600' : '100'} 900;size-adjust:${adjust((bold ?? regular)!, bold ? ARIAL.bold : ARIAL.regular)}%}\n`
  return css
}
