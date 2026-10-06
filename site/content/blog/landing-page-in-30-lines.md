---
title: A landing page in 30 lines
description: Hero, features, pricing and a contact form, server-rendered and Lighthouse 100, in one Kaury file you can read in a minute.
date: 2026-10-06
minutes: 4
tag: Tutorial
---

A landing page has always the same parts: a promise, three reasons to believe it, a price and a way to reach you. In Kaury each part is a few lines. Here is the whole page, then the details.

```kaury
site "Nimbus"
  colors accent #2F6BFF, ink #0E1525, cloud #F4F7FF
  fonts "Inter", "Clash Display"
  style background cloud, color ink

style plan
  background white, radius 20, padding 28, gap 12
  hover lift 6, shadow medium

page "/"
  seo "Nimbus — backups you forget about", "Automatic, encrypted backups for small teams."
  section hero, fullscreen, center
    title "Backups you *forget about*.", size 88
      enters from bottom
    text "Encrypted, automatic, restored in one click."
    button "Start free", large, to "#pricing"
  section features
    grid 3 columns, gap 24
      for f in ["Every hour", "End-to-end encrypted", "Restore in one click"]
        card f
          enters from bottom
  section pricing
    grid 2 columns, gap 24
      column plan
        subtitle "Solo", level 3
        title price(9), size 48
      column plan
        subtitle "Team", level 3
        title price(29), size 48
  section contact, center
    form -> sent = true
      field email "you@company.com", type email, required, label "Email"
      button "Get a demo"
    if sent
      text "Thanks, we write back today."
```

## What each part does

- `site` sets the colors and fonts once. The fonts are downloaded at build time and served by your site.
- `style plan` is a **named style**: a word you can put on any element. It has a hover state, no CSS needed.
- `title "Backups you *forget about*."` puts the words between stars in emphasis.
- `for f in [...]` makes one card per item. Add an item, a card appears.
- `form -> sent = true` runs when the form is valid; `sent` is created on the fly and the page shows the thank-you text by itself.

## Build it

```bash
kaury build
```

You get one HTML page rendered on the server, with its CSS inlined, a sitemap, `robots.txt` and `llms.txt`. Nothing to configure.

**Next:** [your first 3D scene](/blog/first-3d-scene/)
