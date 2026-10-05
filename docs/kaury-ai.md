# Kaury — specification for AIs (v0.2)

You write **Kaury**, a language that produces complete, immersive websites. A `.kaury` file holds everything: logic, structure, style, 3D. Follow these rules exactly; when in doubt, pick the simplest form.

## 1. Syntax

- A block = a line followed by lines indented by **2 spaces**. Never tabs, never braces for blocks, never `;`.
- Comment: `// text`.
- Text: only between double quotes `"…"`. Interpolation: `"Hello {name}, total {price * 2}"`. Literal brace: `\{`.
- Numbers: `12`, `3.5`, `-4`. Glued units: `24px`, `2s`, `300ms`, `50%`, `100vh`, `90deg`, `20/s`.
- Names: letters, digits, hyphens (`total-price`). Write subtraction with spaces: `a - b` (`a-b` also works when `a-b` is not a name, with a style warning).
- Values: `true`, `false`, `none`, lists `[1, 2]`, objects `{ name: "Strawberry", price: 3 }`.
- Operators: `+ - * / % **`, comparison `== != < > <= >=`, logic `and or not`, membership `x in list`, range `1..5` (inclusive).
- Call: `f(a, b)`, or without parentheses at the start of an expression: `print total`, `sum cart, a -> a.price`.
- Anonymous function: `x -> x * 2`, `(a, b) -> a + b`, `-> count += 1`.
- Conditional expression: `if age >= 18 then "adult" else "child"`.
- Every keyword also has a French alias (`soit`/`let`, `si`/`if`, `pour`/`for`, `titre`/`title`…). Accents are accepted. Write in English unless asked otherwise.

## 2. Core

```
let tax = 8.1                  // fixed value (never changes)
state count = 0                // reactive state: when it changes, the page follows
let total = price * quantity   // if the expression reads a state, it is a derived value, recomputed by itself
delivery = 7                   // assignment; creates the variable if it does not exist
count += 1

function double x then x * 2   // one line
function total-price cart      // block; the last line is the returned value
  sum cart, a -> a.price * a.quantity

if total > 50
  delivery = 0
else if total > 20
  delivery = 4
else
  delivery = 7
if x > 3 then print x          // short form

for p in products              // also: for p, i in products   /   for i in 1..10
  print p.name
while lives > 0
  lives -= 1
break / continue / return value

try
  data = await load "/api/products"
catch e
  print e.message

import confetti from "canvas-confetti"    // any npm package
import { Card } from "./card.kaury"
export component Card name

js                                        // raw JavaScript, only if really needed
  console.log("hello")
```

**Built-in functions**: `print`, `load url` (JSON/text), `send url, data`, `sum list[, fn]`, `average`, `min`, `max`, `round x, decimals`, `floor`, `ceil`, `abs`, `sqrt`, `random a, b`, `pick list`, `length x`, `now()`, `to-text`, `to-number`, `price 12.5` (formatted currency, CHF by default: `price 12.5, "EUR"`), `format-date d`, `shuffle`, `range a, b`, `every 2s, -> …`, `later 1s, -> …`, `persist "key", state` (keeps a state in the browser), `copy text`, `confetti()`, `vibrate`, `scroll-to "section-id"`, `share {…}`, `await 2s`.

**Methods** (lists, texts, objects): `.add x`, `.remove x` (or a function), `.clear()`, `.filter fn`, `.map fn`, `.sort fn`, `.reverse()`, `.find fn`, `.contains x`, `.join ", "`, `.each fn`, `.count fn`, `.unique()`, `.take n`, `.sum fn`, `.upper()`, `.lower()`, `.replace a, b`, `.split sep`, `.starts-with x`, `.ends-with x`, `.trim()`, `.insert i, x`, `.update {…}`. Properties: `.length`, `.first`, `.last`, `.keys`, `.values`.

**Global reactive values**: `mouse.x`/`mouse.y` (−1 to 1), `scroll` (0 to 1), `screen.width`, `screen.mobile`, `route.path`, `route.params`.

## 3. The web

```
site "Crush"                                   // global settings (optional)
  colors pink #FF4F8B, cream #FFF4E8            // names usable everywhere: background pink
  font "Clash Display"                          // Google Fonts or Fontshare, self-hosted automatically
  lang "en"
  url "https://crush.example"                   // canonical links, sitemap.xml, llms.txt
  style background cream, color #222            // colors of the whole site
  transition fade                               // fade | slide | zoom | curtain | none
  seo "Crush", "Canned mocktails", image "share.jpg"

page "/"                                       // one page = one address; "/product/:id" → variable id
  seo "Home", "Description for Google"
  style background cream
  section header                               // section name = its id (#header)
    logo "logo.svg"
    links Home, Flavors, Shop                   // automatic links: #flavors if that section exists, else /shop
  section fullscreen, center
    title "Taste the difference", size 80, pink
```

**UI line**: `element content, option, option value, …` then, indented below, its children, its `style`, its motions and its events. A color alone (`pink`, `#FF4F8B`) colors the text of text elements and the background of blocks; the text color on a colored background is chosen automatically for contrast.

| Element | Content | Example |
|---|---|---|
| `section [name]`, `header`, `footer`, `nav`, `box`, `column`, `row`, `grid` | children | `grid 3 columns, gap 24` |
| `title`, `subtitle`, `text`, `item`, `icon` | text | `title "Hi {name}", size 64` (`level 2` → h2) |
| `image source[, description]` | | `image "photo.jpg", "A can", radius 16` |
| `video source` | options `autoplay loop muted controls cover` | `video "film.mp4", autoplay, loop` |
| `link text address` | `new-tab` | `link "Contact" "/contact"` |
| `links A, B, C` | menu (folds into a button on phones) | `links Home, Flavors` |
| `logo source-or-text` | links to the home page | `logo "crush.svg"` |
| `button text` | `-> action`, `to "/page"`, `outline`, `ghost`, `large`, `small`, `disabled cond` | `button "I like {n}" -> n += 1` |
| `card [title] [image] [text]` | card block | `card "Strawberry" "strawberry.png"` |
| `form` | `-> action` on submit | see below |
| `field state hint`, `textarea`, `select state options…`, `checkbox state text` | bound to the state (created if missing) | `field email "Your email", type email, required` |
| `list` / `item` | bullets | |
| `divider`, `spacer 48` | | |
| `slot` | inside a component: where the content given between its lines goes | |

**Style options** (on the element line or in `style …`): `background c`, `color c`, `font "X"`, `size n`, `bold`, `light`, `weight n`, `italic`, `underline`, `uppercase`, `line-height n`, `tracking n`, `align left|center|right`, `center`, `radius n`, `round`, `shadow soft|medium|strong|none`, `border n c`, `margin n…`, `padding n…`, `gap n`, `width n`, `height n`, `max-width n`, `min-height n`, `fullscreen`, `full-width`, `opacity n`, `blur n`, `glass`, `gradient c1 c2 [angle]`, `text-gradient c1 c2`, `columns n` (or `3 columns`), `direction row|column`, `hidden`, `sticky`, `front`, `cursor pointer`, `hover …` (everything after it on the line applies on hover: `hover lift 4, shadow strong`), `lift n`, `grow n`, `tilt n`, `animate fade|lift|zoom`.
Numbers without unit = pixels. Screens: `mobile …`, `tablet …`, `desktop …` (options for that size; with a block below = content shown only there).

**Interactions**: `-> action` on the line (click; submit for a form; input for a field), or a child line `on click -> …`, `on hover -> …`, `on load -> …`, `on scroll -> …`. An action is one line or an indented block after `->`. `open menu` / `close menu` / `toggle menu` set a true/false state. `go "/page"` changes page.

**Conditions and loops in a page**: `if`, `else if`, `else`, `for … in …` produce UI and update by themselves.

**Data**: `products = await load "/api/products"` in a page does not block the display; the list fills in when the data arrives.

**Components**:
```
component Card name image
  card
    image image, radius 16
    text name, bold
  style shadow soft, hover lift 4
// usage: Card "Strawberry" "strawberry.png"   or   Card p.name, p.photo
```
Name starts with a capital letter. Parameters in order. What is indented under a call goes where `slot` is.

**Form**:
```
form -> sent = true
  field email "Your email", type email, required, label "Email"
  checkbox agree "I agree to the terms"
  button "Send"
if sent
  text "Thanks {email}!"
```

## 4. Immersion

Levels: a **touch** (one `object` alone in a page), a **scene** (`scene` with decor, light, camera), a **universe** (the whole site). An object can be 2D (`.png .jpg .webp .svg`), animated 2D (`.json` Lottie) or 3D (`.glb .gltf`, Meshopt/Draco compressed accepted). The code is the same.

```
scene home, fullscreen, particles bubbles          // particles stars|snow|bubbles|dust|confetti
  light studio                                      // studio|soft|sunset|night|neon|day|dramatic
  camera follows mouse                              // fixed|follows mouse|fly|free|orbit
  object can "crush.glb", size 1.2, position 2 0 0
    spin on scroll                                  // also: spin, spin 90/s, spin slow, spin x
    follows mouse, smooth
    on click -> jump
  character mascot "mascot.glb"                     // object with named animations
    enters from right                               // left|right|top|bottom|fade|zoom
    says "Hi!"
    on click -> play "dance"
  title "Taste the difference"                      // the content of a scene goes in front of the 3D
```

Motions (child line = permanent; after `->` = once): `spin`, `float`, `jump`, `pulse`, `sway`, `follows mouse`, `enters from …`, `parallax 0.3`, `says "text"`, `play "animation"`. Modifiers: `smooth`, `slow`, `fast`, `reverse`. Target a named object: `-> jump can`.
Object options: `size`, `position x y z`, `rotation x y z`, `height` (single object), `fallback "image.png"` (when the device cannot do 3D), `shadows`, `alt "description"` (accessibility and Google), `animation "name"` (character), `immediate`. Scene options: `height`, `background`, `fog`, `ground`, `particles`, `immediate`.
Sound: `sound "ambient.mp3", loop, volume 0.4` (a mute button appears by itself); as an action: `-> sound "click.mp3"`.

Automatic rules: the 3D loads only on pages that contain it, when it becomes visible, after the page is displayed and the visitor's first gesture (add `immediate` to skip the wait); the HTML content exists before the 3D; reduced motion is respected; on a narrow screen the camera steps back.

## 5. Golden rules for correct Kaury

1. A UI element always **starts a line**; its options are separated by **commas**.
2. For a value to change on screen, declare it with `state` (or let an assignment `x = …` in the page create it).
3. Files (images, `.glb`, sounds) go in `public/` and are written without `/`: `"photo.jpg"`.
4. `==` compares, `=` stores. `let` never changes.
5. Lambdas inside a UI line go between parentheses: `text (list.filter(x -> x.active)).length`.
6. The first item of a content element is its content: `text size` shows the variable `size`; options come after a comma (`text size, bold`).

## 6. Complete example

```
site "Flowers"
  colors accent #E93D82, cream #FFF6EE
  font "Satoshi"
  lang "en"

state cart = []
let total = sum cart, b -> b.price
let bouquets = [
  { name: "Peonies", price: 45, image: "peonies.jpg" },
  { name: "Tulips", price: 30, image: "tulips.jpg" }
]

component Bouquet b
  card b.name, b.image
    text price(b.price), bold
    button "Add" -> cart.add b
  style hover lift 6, shadow soft

page "/"
  seo "Flowers", "Bouquets delivered in Vevey"
  style background cream
  section header
    logo "Flowers"
    links Bouquets, Contact
  scene fullscreen, particles dust
    light soft
    object "flower.glb", size 1.4
      spin slow
      follows mouse, smooth
    title "Flowers that speak", size 72
  section bouquets
    grid 3 columns, gap 24
      for b in bouquets
        Bouquet b
    text "Cart: {cart.length} bouquet(s), {price(total)}"
```
