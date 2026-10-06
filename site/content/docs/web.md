---
title: Pages & elements
description: Pages, sections, elements, styles, interactions, components, forms and responsive design.
order: 4
group: Guide
---

## The site

```kaury
site "Crush"
  colors pink #FF4F8B, cream #FFF4E8
  fonts "Inter", "Clash Display"   // text, titles
  lang "en"
  url "https://crush.example"
  style background cream, color #222
  transition fade                  // fade | slide | zoom | curtain | none
  seo "Crush", "Canned mocktails", image "share.jpg"
```

Everything is optional. `url` enables canonical links, `sitemap.xml` and `llms.txt`.

## Pages

```kaury
page "/"
  title "Home"
page "/about"
  title "About"
page "/product/:id"                         // route.params.id
  title "Product {route.params.id}"
page "/blog/{post.slug}" for post in posts  // one page per item of a collection
  title post.title
page "/404"
  title "Not found"
```

## The UI line

Every element follows the same shape:

```text
element content, option, option value, …
  children, style, motions and events
```

```kaury
title "Hi {name}", size 64, pink
image "photo.jpg", "A can", radius 16
button "Buy", large -> cart.add can
grid 3 columns, gap 24
```

A color alone colors the text of text elements and the background of blocks. On a colored background, the text color is chosen for **WCAG contrast** automatically.

## Elements

| Element | Use |
|---|---|
| `section [name]`, `header`, `footer`, `nav` | parts of the page (`section flavors` → `#flavors`) |
| `box`, `column`, `row`, `grid` | layout |
| `title`, `subtitle`, `text`, `icon` | text (`level 2` → `<h2>`) |
| `image`, `video` | media (`cover`, `autoplay`, `loop`…) |
| `link`, `links`, `logo`, `button` | navigation and actions |
| `card` | a card with title, image, text |
| `form`, `field`, `textarea`, `select`, `checkbox` | forms bound to states |
| `list`, `item`, `divider`, `spacer` | lists and spacing |
| `markdown` | Markdown rendered as rich text, colored code included |

Every option of every element is in the [reference](/reference/).

## Style

Options go on the line, or in a `style` line below:

```kaury
card
  style background white, radius 20, shadow soft, hover lift 6
```

Useful ones: `size`, `bold`, `align center`, `radius`, `round`, `shadow soft|medium|strong`, `border 1 gray`, `padding`, `margin`, `gap`, `max-width`, `fullscreen`, `glass`, `gradient c1 c2 [angle]`, `text-gradient c1 c2`, `opacity`, `blur`, `sticky`, `hover …`, `animate fade`. Numbers without unit are pixels.

## Responsive

```kaury
grid 4 columns, gap 24
  tablet 2 columns
  mobile 1 columns
```

`mobile`, `tablet`, `desktop` take options for that size — or, with a block below, content shown only there. By default grids fold, titles shrink and menus collapse on small screens.

## Interactions

```kaury
button "Add" -> cart.add product           // click
button "Menu" -> toggle menu
button "Shop", to "/shop"
box
  on hover -> hovered = true
  on click
    count += 1
    confetti()
```

`open menu`, `close menu`, `toggle menu` set a true/false state. `go "/page"` changes page.

## Conditions and loops in a page

```kaury
if cart.length == 0
  text "Empty for now."
else
  for item in cart
    row gap 12
      text item.name
      button "Remove", small -> cart.remove item
```

They produce UI and update by themselves.

## Components

```kaury
component Card name image
  card
    image image, radius 16
    text name, bold
    slot
  style shadow soft, hover lift 4

Card "Strawberry" "strawberry.png"
  text "Our bestseller"      // goes where slot is
```

## Forms

```kaury
form -> sent = true
  field email "Your email", type email, required, label "Email"
  select size "S", "M", "L", label "Size"
  checkbox agree "I agree to the terms"
  button "Send", disabled not agree
if sent
  text "Thanks {email}!"
```

Each field is bound to a state of the same name, created if missing.

## Your own styles

A design system without CSS. A `style` with a new name becomes a word you put on any element line:

```kaury
style card-dark
  background #1C1A1A, color white, padding 24, radius 24
  hover lift 4, shadow hard
  link color orange
  mobile padding 12

page "/"
  section
    box card-dark
      link "Read more" "/blog/"
```

- **states**: `hover`, `selected`, `current`, `open`, `focus`, `pressed`, `disabled`, `checked`;
- **parts** inside: `title`, `text`, `link`, `image`, `button`, `code`, `summary`, `emphasis`…;
- **screens**: `mobile`, `tablet`, `desktop`.

Named after an element, a style restyles all of them: `style button`, `style title`, `style header`, `style markdown`.

## Animations

```kaury
animation slide, 30s, loop, linear
  from move 0 0
  to move -50% 0

page "/"
  section
    row no-wrap, slide
      text "Kaury ✳ Kaury ✳ Kaury ✳"
```

Options: a duration, `loop`, `times 3`, `delay 1s`, `linear`, `smooth`, `bounce`, `steps 12`, `alternate`, and `scroll` to play it while the element scrolls into view. Steps are `from`, `to` or a percentage, with any style option (`move`, `grow`, `tilt`, `opacity`, `reveal 0%`…). Reduced motion is respected by itself.

## Exact HTML when you need it

Every element accepts `class`, `tag`, `attr`, `id` and `html`, to reuse an existing stylesheet or reach precise markup:

```kaury
box tag "figure", class "hero", attr "aria-label" "Our team"
text "Line one<br>line two", html
```

`head "…"` adds raw HTML to the `<head>` of a page, and a `css` block is still there for an existing stylesheet — but a Kaury site does not need one: [this site](https://github.com/theoblondel/kaury-lang/blob/main/site/site.kaury) has none.
