// A site that lives in a folder of another site (kaury build --base /demo/): the addresses it wrote from the
// root (“/photo.jpg”, “/about”, “/_kaury/site.js”) start with that folder. The runtime does the same for what a
// page writes after it is displayed (withBase in runtime/dom.ts), from the “data-k-base” written here.

import { SHAPE } from '../runtime/motion.js'

/** “/demo”, “demo/” or “/demo/” → “/demo/”; the root or nothing → no folder. */
export function folderOf(base: string | undefined): string {
  const clean = (base ?? '').trim().replace(/^\/+|\/+$/g, '')
  return clean ? `/${clean}/` : ''
}

/** Moves the addresses of a built page under its folder. An address already there, or not of the site, is left alone. */
export function underFolder(html: string, base: string): string {
  const own = (url: string) => (url.startsWith('/') && !url.startsWith('//') && !url.startsWith(base) ? base + url.slice(1) : url)
  return html
    .replace(/<html /, `<html data-k-base="${base}" `)
    // written just above: the folder itself goes at the end of the tag, where a reader looks for it
    .replace(/<html data-k-base="([^"]*)" ([^>]*)>/, '<html $2 data-k-base="$1">')
    // “data-src” also holds the name of a shape Kaury draws itself (object "gem"): a name is no address
    .replace(/\b(href|src|action|poster|data-src)="([^"]*)"/g, (_, name: string, url: string) => `${name}="${name === 'data-src' && SHAPE.test(url) ? url : own(url)}"`)
    .replace(/\b(srcset|imagesrcset)="([^"]*)"/g, (_, name: string, set: string) => `${name}="${set.split(',').map((part) => part.replace(/^\s*(\S+)/, (m, url: string) => m.replace(url, own(url)))).join(',')}"`)
    .replace(/url\((["']?)(\/[^)"']*)\1\)/g, (_, quote: string, url: string) => `url(${quote}${own(url)}${quote})`)
}
