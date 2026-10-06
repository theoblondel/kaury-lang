---
title: Getting started
description: Install Kaury, create a project, see it live, build it and put it online — in five minutes.
order: 1
group: Start
---

Kaury needs **Node.js 18 or newer**. Nothing else: no framework, no bundler to configure, no config file.

## Install

```bash
npm install -g @kaury/cli
```

Check it worked:

```bash
kaury --version
```

## Create a project

```bash
kaury new my-site
cd my-site
kaury dev
```

Open `http://localhost:3000`. The whole site is in **`site.kaury`**: edit it, save, and the page reloads by itself.

A new project looks like this:

```
my-site/
  site.kaury     ← pages, logic, style and 3D
  public/        ← images, 3D models (.glb), sounds, fonts
```

## Your first page

Replace the content of `site.kaury` with:

```kaury
state likes = 0

page "/"
  section fullscreen, center
    title "Hello, world", size 80
    button "I like it ({likes})", large -> likes += 1
```

Three ideas are already at work:

- `page "/"` is an address. One `page` = one URL.
- `state likes = 0` is a **reactive** value: when it changes, everything that reads it updates.
- `-> likes += 1` is the action of the button. No event listener, no `useState`, no selector.

## Build the final site

```bash
kaury build
```

The optimized site lands in `dist/`: one HTML file per page, rendered on the server, with its CSS inlined, images converted to responsive WebP, fonts self-hosted, `sitemap.xml`, `robots.txt` and `llms.txt` generated.

It is a **static site**: it works on any host (Netlify, Vercel, Cloudflare Pages, GitHub Pages, an Apache or Nginx server…).

## Put it online

```bash
kaury deploy --netlify   # or --vercel
```

Or drag the `dist/` folder onto [app.netlify.com/drop](https://app.netlify.com/drop).

## All the commands

| Command | What it does |
|---|---|
| `kaury new my-site` | creates a ready-to-use project |
| `kaury dev` | shows the site and reloads it on every change |
| `kaury build` | makes the final, optimized site in `dist/` |
| `kaury check [--json]` | checks the code without building (`--json` for AI assistants and editors) |
| `kaury run program.kaury` | runs a program without pages |
| `kaury compile site.kaury` | shows the generated JavaScript |
| `kaury deploy --netlify` | builds then publishes |

Error messages follow the language of your system; force it with `--lang en` or `--lang fr`.

## Editor

The **VS Code extension** (in `editors/vscode/` of the repository) adds coloring, completion of every element and option, and errors underlined as you type.

## Next

- [Build a real site in 10 steps](/docs/tutorial/)
- [Try Kaury in the browser](/playground/), nothing to install
- [Give Kaury to your AI assistant](/for-ai/)
