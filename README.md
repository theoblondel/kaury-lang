# Kaury

**A complete language like JavaScript, half as long, and the only one that makes immersion as simple as a title.**

```kaury
state likes = 0

page "/"
  style background cream, font "Clash Display"

  section header
    logo "crush.svg"
    links Home, Flavors, Shop

  scene fullscreen, particles bubbles
    light sunset
    object can "crush.glb"
      spin on scroll
      follows mouse, smooth
    title "Taste the difference", size 80, pink

  section
    button "I like it {likes}" -> likes += 1
      style background pink, radius 12
```

Logic, structure, style and 3D live in the same file. You split by part of the site (page, component), never by technique.

## Start

```bash
npm install -g kaury
kaury new my-site
cd my-site
kaury dev
```

| Command | What it does |
|---|---|
| `kaury new my-site` | creates a ready-to-use project |
| `kaury dev` | shows the site and reloads it on every change |
| `kaury build` | makes the final, optimized site in `dist/` |
| `kaury check [--json]` | checks the code without building (`--json` for AIs) |
| `kaury run program.kaury` | runs a program without pages |
| `kaury compile site.kaury` | shows the generated JavaScript |
| `kaury deploy --netlify` | builds then publishes |

French keywords work too (`soit`, `si`, `pour`, `titre`…), and error messages follow the language of your system (`--lang fr|en`).

## What Kaury does for you

- **Reactive by default**: a `state` changes → the page follows. `let total = price * quantity` recomputes itself.
- **Plain-language errors**, with the line, the underlined word and the fix ("did you mean "count"?").
- **Lighthouse 100 / 100 / 100 / 100** on the example site, 3D included (mobile and desktop):
  - every page is rendered on the server, then the browser *adopts* that HTML (hydration) instead of rebuilding it;
  - images get real dimensions, responsive WebP versions and the right loading priority;
  - fonts are downloaded at build time and served by the site (fast, and no data sent to Google);
  - CSS is inlined, nothing blocks the first paint;
  - the 3D library loads only on pages that need it, after the page is displayed and the visitor's first gesture;
  - text colors on colored backgrounds are chosen for WCAG contrast.
- **SEO and AI-friendly**: canonical links, Open Graph, JSON-LD, `sitemap.xml`, `robots.txt`, `llms.txt`, plus `.htaccess` and `_headers` for caching.
- **Mobile by default**: grids fold, titles shrink, menus collapse behind a button, the 3D camera steps back on narrow screens.
- **Open to JavaScript**: `import confetti from "canvas-confetti"`, and a `js` block for the rest.
- **Made for AIs**: [`docs/kaury-ai.md`](docs/kaury-ai.md) can be pasted as is into Claude, ChatGPT or Cursor.

## How it works

```
.kaury → 1. lexer → 2. parser → 3. checker → 4. code generator → HTML + CSS + JS
                                              5. immersion toolkit (Three.js, Lottie), loaded on demand
```

| Folder | Content |
|---|---|
| `src/core/` | lexer, parser, checker, code generator (TypeScript, also runs in the browser) |
| `src/runtime/` | reactivity, DOM and hydration, router, motions, server rendering |
| `src/immersion/` | 3D (Three.js), Lottie, particles |
| `src/cli/` | the `kaury` command, image and font optimization |
| `examples/` | Crush (complete immersive site), hello |
| `docs/` | specification for AIs |
| `editors/vscode/` | VS Code extension |
| `playground/` | online playground |
| `tests/` | `npm test` |

## Developing Kaury

```bash
npm install
npm test                 # core, errors, build, hydration, robustness
npm run kaury -- dev examples/crush/site.kaury
npm run build            # dist/ (command) + playground bundles
node scripts/measure.mjs dist / --desktop   # Lighthouse
```

MIT license.
