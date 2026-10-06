// Markdown → HTML, the same on the server (build) and in the browser (loaded on demand):
// headings get an id (links to a part of the page), code blocks are colored.

import { Marked } from 'marked'
import { highlight } from '../core/highlight.js'

const slug = (s: string) =>
  s.replace(/&[a-z#0-9]+;/gi, '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

const md = new Marked({
  renderer: {
    heading({ tokens, depth }) {
      const inner = this.parser.parseInline(tokens)
      const id = slug(inner.replace(/<[^>]+>/g, ''))
      return depth === 1 ? `<h1>${inner}</h1>\n` : `<h${depth} id="${id}"><a class="k-anchor" href="#${id}" aria-hidden="true" tabindex="-1">#</a>${inner}</h${depth}>\n`
    },
    code({ text, lang }) {
      const l = (lang ?? '').split(/\s/)[0]
      return `<pre class="k-code"${l ? ` data-lang="${l}"` : ''}><code>${highlight(text, l)}</code></pre>\n`
    },
  },
})

export function parseMarkdown(source: string): string {
  return md.parse(String(source ?? ''), { async: false }) as string
}
