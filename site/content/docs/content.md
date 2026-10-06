---
title: Content — collections, blog, Markdown
description: Read Markdown, MDX and YAML files at build time, make one page per item, write a blog.
order: 6
group: Guide
---

Content lives in files next to your site, not in a database. Kaury reads it **at build time**: the pages are complete HTML, and the data is never shipped in the JavaScript.

## Import content

```kaury
import posts from "./content/*/index.md"   // a list: one entry per file
import about from "./content/about.yaml"    // one object
```

Supported: Markdown (`.md`, `.mdx`, `.markdown`), YAML (`.yaml`, `.yml`).

Each entry has the fields of its front matter, plus:

| Field | Value |
|---|---|
| `slug` | the name of the file (or of its folder for `index.md`) |
| `body` | the Markdown text |
| `created`, `updated` | ISO dates of the file |

Images written in the front matter (`cover: ./cover.jpg`) are copied, optimized and get their real dimensions.

## One page per item

```kaury
page "/blog/{post.slug}" for post in posts
  seo post.title, post.description
  section
    title post.title
    markdown post.body
```

## A list page

```kaury
page "/blog"
  section
    title "Blog"
    for post in posts.sort(p -> p.date).reverse()
      card post.title, post.cover
        text post.description
        link "Read", "/blog/{post.slug}"
```

## Markdown

`markdown text` renders Markdown as rich text:

- headings get an id and an anchor (`## Install` → `#install`);
- code blocks are **colored at build time** for `kaury`, `bash` and `js` — no highlighting library is sent to the browser;
- tables, lists, quotes and links work as expected.

## Pages with zero JavaScript

A page that has no state, no event and no 3D is sent **without any JavaScript**. Entrances (`enters from bottom`) are then done in pure CSS. Blog posts and docs pages are typically in this case: this page you are reading is one of them.
