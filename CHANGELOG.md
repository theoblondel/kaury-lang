# Changelog

## 0.4.0

- **Ready-made blocks**: `Hero`, `Features`, `Steps`, `Stats`, `Pricing`, `Testimonials`, `Team`, `Logos`, `Gallery`, `Faq`, `Cta`, `Contact`, `Footer`. Written in Kaury, added by the compiler when a page uses them, in the site's colors and fonts. A component of the same name in the site replaces one.
- **Forms that send e-mails**: `form mail "hello@you.com", subject "…" -> …`. `kaury dev` shows the e-mail in the terminal; with `KAURY_MAIL_KEY` (a resend.com key) it is really sent. `kaury build` writes the endpoint for Netlify, Vercel and Cloudflare Pages. The address never appears in the page, the endpoint only writes to the site's addresses, and robots are ignored.
- **Templates**: `kaury new my-site --template landing | blog | portfolio` (the default `starter` still teaches the language).
- **Theme colors and fonts**: `accent`, `on-accent`, `ink`, `muted`, `line`, `font "titles"`, `font "text"`.
- A component called with too few or too many values says which ones it takes.
- `links Features` links to the section even when a component has that name.
- A named style can make a column, box, grid or row in a section narrower (`max-width 640`).
- An empty `id` is left out of the page.

## 0.3.0

- First version on npm (`@kaury/cli`): the compiler, the `kaury` command, server rendering, 3D, content collections, the VS Code extension and the site of the language written in Kaury.
