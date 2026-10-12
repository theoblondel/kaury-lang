// Background pictures at build time. The light versions made for the images of the site (images.ts) also serve
// the pictures written as a background (background "hall.jpg"), and the one that opens a page is announced to
// the browser, which otherwise finds it only after reading the stylesheet.

import type { ImageInfo } from './images.js'

/** The addresses of a background picture: the one of wide screens, and the lighter one of phones when there is one. */
export interface Picture {
  large: string
  small?: string
}

/** The versions of an image, from the lightest to the largest. */
function versions(info: ImageInfo | undefined): { url: string; w: number }[] {
  return (info?.srcset ?? '').split(',').map((s) => s.trim().split(/\s+/)).filter((p) => p.length === 2)
    .map(([url, w]) => ({ url, w: parseInt(w, 10) })).filter((v) => v.w > 0).sort((a, b) => a.w - b.w)
}

/** What a picture becomes: its largest light version, and for phones the largest one up to 960 pixels wide. */
function pictureOf(url: string, images: Record<string, ImageInfo>): Picture {
  const all = versions(images[url])
  if (!all.length) return { large: url }
  const large = all[all.length - 1].url
  const small = [...all].reverse().find((v) => v.w <= 960)?.url
  return small && small !== large ? { large, small } : { large }
}

/**
 * Rewrites the background pictures of a stylesheet (the “--k-pic:url("…")” the compiler writes) to their light
 * versions, with a rule for phones after each one. Also returns the picture of each element that has one on every
 * screen (by its class, or “body”): the build announces the one that opens the page.
 */
export function backgroundPictures(css: string, images: Record<string, ImageInfo>): { css: string; pictures: Map<string, Picture> } {
  const pictures = new Map<string, Picture>()
  const out = css.replace(/([^{}]+)\{([^{}]*--k-pic:url\("([^"]+)"\)[^{}]*)\}/g, (rule: string, selector: string, body: string, url: string, at: number) => {
    const picture = pictureOf(url, images)
    const swap = (to: string) => `${selector}{${body.replace(`--k-pic:url("${url}")`, `--k-pic:url("${to}")`)}}`
    // inside a screen rule (mobile background "…"): the picture of that screen, and no rule put inside another
    const before = css.slice(0, at)
    const inside = before.split('{').length > before.split('}').length
    if (inside) {
      const screen = before.slice(before.lastIndexOf('}', before.lastIndexOf('{')) + 1, before.lastIndexOf('{'))
      return swap(/max-width:\s*640px/.test(screen) ? picture.small ?? picture.large : picture.large)
    }
    const sel = selector.trim()
    const own = /^\.([\w-]+)$/.exec(sel)?.[1] ?? (sel === 'body' ? 'body' : undefined)
    if (own) pictures.set(own, picture)
    return swap(picture.large) + (picture.small ? `\n@media (max-width: 640px){${sel}{--k-pic:url("${picture.small}")}}` : '')
  })
  return { css: out, pictures }
}

/**
 * When a background picture comes before the first image of a page, it is the picture of the page: it is announced
 * to the browser (one address for phones, one for wider screens), and the image that had the first place gives it up.
 */
export function heroPicture(body: string, pictures: Map<string, Picture>): { head: string; body: string } {
  let first = -1
  let picture: Picture | undefined
  for (const [name, p] of pictures) {
    const at = name === 'body' ? 0 : body.search(new RegExp(`class="(?:[^"]*\\s)?${name.replace(/[^\w-]/g, '')}(?:\\s[^"]*)?"`))
    if (at >= 0 && (first < 0 || at < first)) {
      first = at
      picture = p
    }
  }
  const image = /<img\b[^>]*class="(?:[^"]*\s)?k-image(?:\s[^"]*)?"[^>]*>/.exec(body)
  if (!picture || (image && image.index < first)) return { head: '', body }
  const link = (href: string, media?: string) => `<link rel="preload" as="image" href="${href}"${media ? ` media="${media}"` : ''} fetchpriority="high">`
  const head = picture.small ? link(picture.small, '(max-width: 640px)') + link(picture.large, '(min-width: 641px)') : link(picture.large)
  if (!image || !/\sfetchpriority="high"/.test(image[0])) return { head, body }
  // “data-k-wait”: the page reads it when it takes this HTML over, and leaves the image waiting
  const waits = image[0].replace(/\sfetchpriority="high"/, '').replace(/\sloading="eager"/, ' loading="lazy"').replace(/>$/, ' data-k-wait>')
  return { head, body: body.slice(0, image.index) + waits + body.slice(image.index + image[0].length) }
}
