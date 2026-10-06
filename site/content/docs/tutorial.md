---
title: Tutorial — a real site in 10 steps
description: Build a complete little shop site, from an empty file to a 3D hero, a cart and a contact form.
order: 2
group: Start
---

We build **Bloom**, a fictional flower shop: a home page with a 3D hero, a list of bouquets, a cart that survives a reload, and a contact page. Every step adds a few lines to the same `site.kaury`.

## 1. The site

```kaury
site "Bloom"
  colors accent #E93D82, cream #FFF6EE
  font "Satoshi"
  lang "en"
  url "https://bloom.example"
```

`colors` gives names to colors, usable everywhere (`background cream`). The font is downloaded at build time and served by your site: no request to Google.

## 2. A page

```kaury
page "/"
  seo "Bloom — flowers in Vevey", "Fresh bouquets, delivered the same day."
  style background cream
  section fullscreen, center
    title "Flowers that speak", size 80
    text "Fresh bouquets, delivered the same day."
```

`seo` writes the `<title>`, the description, Open Graph and the canonical link.

## 3. A header

```kaury
  section header, sticky, glass
    logo "Bloom"
    links Bouquets, Contact
```

`links` builds a menu. `Bouquets` points to `#bouquets` if a section has that name, otherwise to the page `/bouquets`. On phones, the menu folds behind a button by itself.

## 4. Data

```kaury
let bouquets = [
  { name: "Peonies", price: 45, image: "peonies.jpg" },
  { name: "Tulips", price: 30, image: "tulips.jpg" },
  { name: "Wild", price: 38, image: "wild.jpg" }
]
```

Images go in `public/` and are written without `/`.

## 5. A loop and a component

```kaury
component Bouquet b
  card b.name, b.image
    text price(b.price), bold
  style hover lift 6, shadow soft

page "/"
  section bouquets
    subtitle "Our bouquets"
    grid 3 columns, gap 24
      for b in bouquets
        Bouquet b
```

A component name starts with a capital letter. `price 45` gives `CHF 45.00` (or `price 45, "EUR"`).

## 6. State: a cart

```kaury
state cart = []
let total = sum cart, b -> b.price
persist "cart", cart
```

`total` reads a state, so it recomputes itself. `persist` keeps the cart in the browser across reloads. In the component, add:

```kaury
    button "Add" -> cart.add b
```

And anywhere in the page:

```kaury
    text "Cart: {cart.length} bouquet(s), {price(total)}"
```

## 7. Conditions

```kaury
    if cart.length == 0
      text "Your cart is empty."
    else
      button "Order ({price(total)})", large -> ordered = true
    if ordered
      text "Thank you!", bold, pink
```

`ordered = true` creates the state on the fly.

## 8. The 3D hero

Put a `flower.glb` in `public/`, then replace the first section:

```kaury
  scene fullscreen, particles dust
    light soft
    object "flower.glb", size 1.4, alt "A peony"
      spin slow
      follows mouse, smooth
    title "Flowers that speak", size 80
```

That's it. Three.js loads **only on this page**, after the page is displayed and the visitor's first gesture, so Lighthouse stays at 100.

## 9. A second page and a form

```kaury
page "/contact"
  seo "Contact", "Order a bouquet or ask a question."
  section
    title "Contact"
    form -> sent = true
      field email "Your email", type email, required, label "Email"
      textarea message "Your message", label "Message"
      button "Send"
    if sent
      text "Thanks, we answer within the day."
```

## 10. Build and publish

```bash
kaury build
kaury deploy --netlify
```

You now have a multi-page site with server rendering, a 3D hero, a persistent cart, a form, a sitemap, `llms.txt` and structured data — in about 70 lines.

**Next:** [the language in depth](/docs/language/) · [every element](/reference/)
