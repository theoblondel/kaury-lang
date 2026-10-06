---
title: SEO, GEO & performance
description: What Kaury generates for Google and for AI assistants, and why the sites it builds score 100 on Lighthouse.
order: 7
group: Guide
---

A Kaury site is ready for search engines **and** for AI assistants (GEO, generative engine optimization) without a plugin.

## What every build generates

| File or tag | Purpose |
|---|---|
| server-rendered HTML for every page | content readable without JavaScript, by any crawler |
| `<title>`, description, canonical link | from `seo` and `url` |
| Open Graph and Twitter tags | sharing previews; share images cropped to 1200×630 |
| `sitemap.xml` | every page, collection pages included |
| `robots.txt` | open by default |
| `llms.txt` | an index of the site for AI assistants |
| JSON-LD `WebSite` | on the home page |
| `hreflang` alternates | with `alternate "fr" "/fr/"` |
| `.htaccess` and `_headers` | long cache for assets, on Apache and Netlify |

## Structured data in one line

`json-ld` turns any object into a `<script type="application/ld+json">`, given to `head`:

```kaury
let faq = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    { "@type": "Question", name: "Do you deliver?", acceptedAnswer: { "@type": "Answer", text: "Yes, the same day." } }
  ]
}

page "/"
  head json-ld(faq)
```

## Writing for AI assistants

Assistants quote pages that answer a question plainly. Kaury helps on the technical side; the rest is writing:

- a **definition sentence** near the top ("Bloom is a flower shop in Vevey that…");
- headings phrased like the questions people ask;
- facts with numbers, dates and places;
- one page per topic, linked together.

## Why Lighthouse gives 100

- every page is rendered on the server, then the browser **adopts** that HTML (hydration) instead of rebuilding it;
- CSS is inlined: nothing blocks the first paint;
- images get real dimensions, responsive WebP versions and the right loading priority;
- fonts are downloaded at build time and served by the site;
- the 3D library loads only where needed, after the first gesture;
- text colors on colored backgrounds are chosen for WCAG contrast;
- a page without interaction ships zero JavaScript.

The measured numbers are on the [home page](/#performance).
