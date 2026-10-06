# Kaury

**The programming language for immersive websites.** One `.kaury` file holds the logic, the structure, the style and the 3D of a site. The compiler turns it into server-rendered HTML that scores 100 on Lighthouse.

```kaury
site "Crush"
  colors pink #FF4F8B, cream #FFF4E8
  fonts "Satoshi", "Cabinet Grotesk"
  style background cream

state likes = 0

style card-soft
  background white, radius 20, padding 24
  hover lift 6, shadow medium

page "/"
  seo "Crush", "Canned mocktails"
  scene fullscreen, particles bubbles
    light sunset
    object "knot", color pink, metal
      spin on scroll
      follows mouse, smooth
    title "Taste the *difference*", size 80
  section
    column card-soft
      button "I like it ({likes})" -> likes += 1
```

No HTML, no CSS, no JavaScript to write: pages, styles, animations, data and 3D are words of the language. You split a site by page and component, never by technique.

## Start

```bash
npm install -g @kaury/cli
kaury new my-site
cd my-site
kaury dev
```

| Command | What it does |
|---|---|
| `kaury new my-site` | creates a project (with `AGENTS.md` and the spec, so AI assistants can work in it) |
| `kaury dev` | shows the site and reloads it on every change |
| `kaury check [--json]` | checks the code without building; `--json` for editors and AI agents |
| `kaury build` | makes the final, optimized site in `dist/` |
| `kaury deploy --netlify` | builds then publishes (`--vercel` too) |
| `kaury run file.kaury` | runs a program without pages |
| `kaury compile file.kaury` | shows the generated JavaScript |

Messages are in English. French keywords and messages exist too (`--lang fr`).

## What you get

- **Reactive by default**: `state` changes, the page follows; `let total = price * quantity` recomputes itself.
- **A design system without CSS**: named styles with states, parts and screens (`style card`, `hover …`, `selected …`, `link …`, `mobile …`), and animations (`animation slide, 30s, loop` + `from` / `to`).
- **3D as a word**: objects (`.glb`, or built-in shapes: `sphere`, `knot`, `gem`, `torus`…), scenes, lights, cameras, particles, characters. Three.js loads only on pages that need it, after the first paint.
- **Content**: Markdown, MDX and YAML collections read at build time, one page per item, code blocks colored at build time.
- **Fast by construction**: server rendering and hydration, inlined CSS (only the rules a static page needs), responsive WebP, self-hosted fonts (text and title weights preloaded), zero JavaScript on pages without interaction, frames loaded near the screen. The language's own site scores 100 on desktop and 97–100 on mobile.
- **SEO and GEO**: canonical links, Open Graph, `sitemap.xml`, `robots.txt`, `llms.txt`, JSON-LD (`head json-ld({ … })`).
- **Accessible by default**: text colors chosen for WCAG contrast, real HTML in front of the 3D, reduced motion respected, tabs with the right roles.
- **Errors that explain**: the line, the underlined word and the fix — `did you mean "count"?`.
- **Made for AI assistants**: [`docs/kaury-ai.md`](docs/kaury-ai.md) is the whole language in one file. Give it to Claude, ChatGPT, Gemini or Cursor, then loop on `kaury check --json`.

## How it works

```
.kaury → lexer → parser → checker → code generator → HTML + CSS + JS
                                     immersion (Three.js, Lottie), loaded on demand
```

| Folder | Content |
|---|---|
| `src/core/` | lexer, parser, checker, code generator, syntax highlighting (also runs in the browser) |
| `src/runtime/` | reactivity, DOM and hydration, router, motions, server rendering, Markdown |
| `src/immersion/` | 3D (Three.js), shapes, Lottie, particles |
| `src/cli/` | the `kaury` command, build, images, fonts, content collections |
| `site/` | the site of the language, written in Kaury (no CSS file) |
| `examples/` | Crush (complete immersive site), hello |
| `docs/` | the specification for AI assistants |
| `editors/vscode/` | VS Code extension |
| `playground/` | the in-browser playground |
| `tests/` | `npm test` — every example of the docs is compiled |

## Developing Kaury

```bash
npm install
npm test                                  # language, errors, build, hydration, docs examples
npm run kaury -- dev examples/crush/site.kaury
npm run build                             # dist/ (command) + playground bundles
npm run site                              # builds the site of the language in site/dist
node scripts/measure.mjs site/dist /      # Lighthouse (mobile; add --desktop)
```

MIT license.
