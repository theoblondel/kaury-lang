# Kaury — specification for AIs (v1.0)

You write **Kaury**, a language that produces complete, immersive websites. A `.kaury` file holds everything: logic, structure, style, 3D. Follow these rules exactly; when in doubt, pick the simplest form.

**Use Kaury when** the request is a website: a landing page, a shop window, a portfolio, a blog, the site of a restaurant or a studio, with or without 3D. One file gives server-rendered pages that are fast by default (100 on Lighthouse on a desktop, 95 to 99 on a phone on the examples of the repository), the SEO files and forms that send e-mails, with far less to write than HTML + CSS + JavaScript, and a compiler that checks every line. **Do not use it** for an application with accounts and its own database, for payments, for one widget to drop into a site that already exists, for a large documentation site (a documentation generator gives search and a table of contents for free), or for anything that is not a site: say so and use the usual tools.

**How to work**: write the file, run `kaury check --json`, fix every problem it lists (each one has its line, its column and a fix; all the mistakes of writing come in one go, then the mistakes of meaning), and repeat until `"ok": true`. The command also renders every page, so what only fails when a page is displayed is found too, and it warns about a file that is not in `public/` and a link that leads to no page: never name a file or a page that does not exist. Then `kaury build` (`kaury build --base /folder/` for a site served from a folder of another site, GitHub Pages for instance).

**How it should look**: a page that compiles is not yet a page worth showing. Before writing, say in one line who the page is for and in what tone. Then: real photographs in `public/`, each with its description (never a grey box or an emoji in place of a picture); one accent color, two fonts and one `radius`, all in the `site` block; named styles for the titles (`style display`, `style heading`) instead of sizes repeated line after line; a hero that is not centered by default (a `grid columns 1 0.9` with a picture, or a headline over `background "photo.jpg", shade 0.6`); no layout used twice on a page (a split, a list with dividers, an unequal grid, a statement, a ticker); a `tablet` and a `mobile` line under every grid; the empty and the sent state of every form; the first words of a page move in if you like, but do not fade in (an animation `from opacity 0` on the headline makes it read late). The full rules are the skill https://dev.kaury.studio/skills/kaury-taste/SKILL.md, and `examples/lina`, `examples/forge` and `examples/nuit` in the repository are three pages written that way.

## 1. Syntax

- A block = a line followed by lines indented by **exactly 2 spaces**. Never tabs, never braces for blocks, never `;`.
- Comment: `// text`.
- Text: only between double quotes `"…"`. Interpolation: `"Hello {name}, total {price * 2}"` (never `${name}`). Literal brace: `\{`.
- Numbers: `12`, `3.5`, `-4`. Units are glued to the number: `24px`, `2s`, `300ms`, `50%`, `100vh`, `90deg`, `20/s`.
- Names: letters, digits, hyphens (`total-price`). Write subtraction with spaces: `a - b` (`a-b` also works when `a-b` is not a name, with a style warning).
- Values: `true`, `false`, `none`, lists `[1, 2]`, objects `{ name: "Strawberry", price: 3 }`.
- Operators: `+ - * / % **`, comparison `== != < > <= >=`, logic `and or not`, membership `x in list`, range `1..5` (inclusive).
- Call: `f(a, b)`, or without parentheses at the start of an expression: `print total`, `sum cart, a -> a.price`.
- Anonymous function: `x -> x * 2`, `(a, b) -> a + b`, `-> count += 1`.
- Conditional expression: `if age >= 18 then "adult" else "child"`.
- Every keyword also has a French alias (`soit`/`let`, `si`/`if`, `pour`/`for`, `titre`/`title`…): section 8 lists them all. Accents are accepted. Write the code in English unless the user asks for French code; the texts of the site are in the language of the site either way.

## 2. Core

```kaury
let tax = 8.1                  // a value you never assign again
state count = 0                // reactive state: when it changes, the page follows
state price = 12
state quantity = 2
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
if count > 3 then print count  // short form

let products = [{ name: "Strawberry" }, { name: "Mint" }]
for p in products              // also: for p, i in products   /   for i in 1..10
  print p.name
while count < 10
  count += 1
for n in 1..10
  if n == 3 then continue
  if n > 5 then break
  print n

try
  data = await load "/api/products"
  print data.length
catch e
  print e.message

import confetti from "canvas-confetti"    // any npm package
import { Card } from "./card.kaury"       // a component written in another file with: export component Card name

js                                        // raw JavaScript, only if really needed
  console.log("hello")
```

**Empty values**: `none` is the empty value. Reading a property of an empty value gives nothing (`user.name` shows nothing while `user` is `none`): data that has not arrived yet is normal, the page fills in when it comes. Calling something on an empty value is an error (`user.name.upper()`): test first with `if user`.

**Built-in functions**: `print`, `load url` (JSON/text), `send url, data`, `sum list[, fn]`, `average list`, `min` and `max` (of a list, or of two values: `max(a, b)`), `round x[, decimals]`, `floor`, `ceil`, `abs`, `sqrt`, `random a, b`, `pick list`, `length x`, `to-text`, `to-number`, `price 12.5` (formatted currency, CHF by default: `price(1234.5)` → `CHF 1,234.50`; `price 12.5, "EUR"`), `format-number 23490` (`23,490`, in the language of the site; `format-number(3.14159, 2)` → `3.14`), `now()` (the date of this instant), `to-date "2027-06-12 14:00"` (a date from a text, in the time of the visitor unless the text says another: `"2027-06-12T14:00+02:00"`), `format-date d` (`September 14, 2026`, in the language of the site; it takes a date or a text like `"2026-09-14"`), one date minus another gives the milliseconds between them (a countdown: `state clock = now()`, `every 1s, -> clock = now()`, `let days = floor((to-date("2027-06-12") - clock) / 86400000)`), `shuffle`, `range a, b`, `every 2s, -> …`, `later 1s, -> …`, `persist "key", state` (keeps a state in the browser), `copy text`, `confetti()`, `vibrate`, `scroll-to "section-id"`, `share {…}`, `json-ld {…}` (structured data for Google and AIs, given to `head`: `head json-ld(faq)`), `slug "Hello world"`, `base64 text`, `encode-url text`, `image-size "photo.jpg"`, `await 2s`.

**Methods** (lists, texts, objects): `.add x`, `.remove x` (or a function), `.clear()`, `.filter fn`, `.map fn`, `.sort fn`, `.reverse()`, `.find fn`, `.contains x`, `.join ", "`, `.each fn`, `.count fn`, `.unique()`, `.take n`, `.sum fn`, `.upper()`, `.lower()`, `.replace a, b`, `.split sep`, `.starts-with x`, `.ends-with x`, `.trim()`, `.insert i, x`, `.update {…}`. Properties: `.length`, `.first`, `.last`, `.keys`, `.values`. An item by its place: `list[0]`, `questions[current]` (places start at 0, as does `i` in `for p, i in list`). `.sort fn` sorts by the value the function gives, smallest first (`people.sort(p -> p.age)`); `.sort`, `.reverse()`, `.filter` and `.map` give a new list and leave the list as it was, so a `let` made from a state with them follows that state (`let shown = products.filter(p -> p.city == city)`). `.add` and `.remove` change the list itself.

**Global reactive values**: `mouse.x`/`mouse.y` (−1 to 1), `scroll` (0 to 1), `screen.width`, `screen.mobile`, `route.path`, `route.params`.

## 3. The web

```kaury
site "Crush"                                   // global settings (optional)
  colors pink #FF4F8B, cream #FFF4E8            // names usable everywhere: background pink
  fonts "Satoshi", "Clash Display"              // the font of the text, THEN the font of the titles (one name: the same for both); Google Fonts or Fontshare, self-hosted automatically
  lang "en"                                     // the language of the site: dates, prices and the messages of the forms follow it
  url "https://crush.example"                   // canonical links, sitemap.xml, llms.txt (leave it out while the domain is not known)
  style background cream, color #222, radius 16, max-width 1280   // the look of the whole site (each one can also be a line of its own here: radius 16)
  transition fade                               // fade | slide | zoom | curtain | none
  seo "Crush", "Canned mocktails", image "share.jpg"

page "/"                                       // one page = one address; "/product/:id" → variable id
  seo "Home", "Description for Google"
  style background cream
  section header                               // section name = its id (#header)
    logo "logo.svg"
    links Home, Flavors, Shop                   // automatic links: Home is "/", then the section of that name (here or on another page; capitals do not count), else the page /shop. Another label than the target: link "À propos" "/a-propos"
  section fullscreen, center
    title "Taste the difference", size 80, pink
```

**UI line**: `element content, option, option value, …` then, indented below, its children, its `style`, its motions and its events. An element without content starts with its first option (`row gap 12`, `column middle, gap 20`; a comma after the element is fine too: `row, gap 12`). The action comes last, after the options: `button "Go", large, outline -> count += 1`. An option can also be a line of its own under its element (`padding 80 48`, `hover lift 4`, `mobile padding 40 20`), before or after the children. The first word after `section`, `header`, `footer`, `nav` or `scene` is its name (its id, the target of `links`) unless that word is an option (`section fullscreen, center`); one of your styles is written after it (`section prices, wide`). `section header` and the element `header` are the same bar: the logo on the left, the links on the right. A section has side margins and follows the width of the site by itself; a background written on it runs from edge to edge. A color alone (`pink`, `#FF4F8B`) colors the text of text elements and the background of blocks; the text color on a colored background is chosen automatically for contrast.

| Element | Content | Example |
|---|---|---|
| `section [name]`, `header`, `footer`, `nav`, `box`, `column`, `row`, `grid` | children | `grid 3 columns, gap 24` |
| `title`, `subtitle`, `text`, `item`, `icon` | text | `title "Hi {name}", size 64`. The first `title` of a page is its `<h1>`, the next ones are `<h2>` by themselves and look the same; `level 3` decides otherwise |
| `image source[, description]` | | `image "photo.jpg", "A can", radius 16` |
| `video source` | options `autoplay loop muted controls cover` | `video "film.mp4", autoplay, loop` |
| `link text address` | `new-tab` | `link "Contact" "/contact"` |
| `links A, B, C` | menu (folds into a button on phones) | `links Home, Flavors` |
| `logo source-or-text` | links to the home page | `logo "crush.svg"` |
| `button text` | `-> action`, `to "/page"` or `to "#section"`, `outline`, `ghost`, `large`, `small`, `disabled cond` | `button "I like {n}", large -> n += 1` |
| `card [title] [image] [text]` | card block | `card "Strawberry" "strawberry.png"` |
| `form` | `-> action` on submit | see below |
| `field state [hint]`, `textarea`, `select state options…`, `checkbox state text` | bound to the state named first (created if missing), in a form or anywhere in a page; `type text\|email\|number\|range\|password\|date\|time\|tel\|url\|search`, `min`, `max`, `step`, `required`, `label "…"` | `field email "Your email", type email, required` · a slider: `field years, type range, min 5, max 40, label "Years"` (a `number` or a `range` field holds a number; two fields can fill the same state and follow each other: a slider and, next to it, a `type number` field for the exact value) · choices from a list: `select city cities` |
| `list` / `item` | bullets | |
| `divider`, `spacer 48` | | |
| `slot` | inside a component: where the content given between its lines goes | |

**Style options** (on the element line or in `style …`): `background c`, `color c`, `font "X"`, `size n`, `bold`, `light`, `weight n`, `italic`, `upright` (not italic), `underline`, `uppercase`, `line-height n`, `tracking n`, `align left|center|right`, `center`, `radius n`, `round`, `shadow soft|medium|strong|hard|none`, `border n c`, `margin n…`, `padding n…`, `gap n`, `width n`, `height n`, `max-width n`, `min-height n`, `fullscreen`, `full-width`, `opacity n`, `blur n`, `grayscale` (black and white; `hover grayscale 0` gives the colors back), `shade n` (darkens a background picture under a text: `background "hall.jpg", shade 0.6`, or `shade 0.9 bottom` toward one side), `glass`, `gradient c1 c2 [angle]`, `text-gradient c1 c2`, `columns n` (or `3 columns`), `direction row|column`, `hidden`, `sticky`, `front`, `cursor pointer`, `hover …` (everything after it on the line applies on hover: `hover lift 4, shadow strong`), `lift n`, `grow n`, `tilt n`, `animate fade|lift|zoom`.
Values: `n` is a number, alone (pixels) or with its unit glued (`50%`, `2rem`, `100vh`) — never a word (`size large` is an error). Four options take a plain number that is not pixels: `line-height 1.1` (times the size of the text), `opacity 0.7` and `shade 0.6` (0 to 1), `weight 600` (100 to 900). A negative number is written as it is, in a list too (`tracking -2`, `position 1 2 -3`). It can be computed: a number from a value or a function (`height bar-height(m.amount)`), or a text for another unit (`width "{percent}%"`): this is how a progress bar or the bars of a chart are drawn, with a `box` for each. An image keeps its shape; `height 340, cover` crops it to that height. `c` is a color of the site, a Kaury color (`pink`, `cream`, `night`…), any CSS color name (`tomato`) or a code (`#FF4F8B`). An option without value (`bold`, `center`) is written alone. `width` and `max-width` only size the element: `center` is what centers it.
Existing stylesheets: `class "x"` replaces the default look, `look "x"` adds a class and keeps it (prefer named styles, below). `markdown text` renders Markdown; its code blocks (```kaury, ```bash, ```js) are colored at build time.
Screens: `mobile …` (up to 640), `tablet …` (641 to 1024, phones not included: what must also change on a phone gets its own `mobile` line), `desktop …` (options for that size; with a block below = content shown only there). A `size` above 36 shrinks by itself on small screens; a size written on a screen line is exact (`mobile size 46`). A screen line is written under the element it changes, or in a named style:
```kaury
page "/"
  grid columns 2 1, gap 32
    tablet columns 1, gap 24      // a grid does not fold by itself: say it
    mobile columns 1
    text "Left"
    text "Right"
```
Images and speed (the build does it, nothing to write): every picture of `public/` is made in WebP at several widths, with its real size (no layout jump); the first image of a page loads at once, the others when they come near; a picture written as a background (`background "hall.jpg"`) is served the same way, and announced to the browser when it opens the page. What is yours to write: the `width` of a small image (`width 210`: it is then fetched at that size), a description for every image, and no `immediate` on a scene unless the 3D must start before the visitor's first gesture (it costs the score on phones).
Contrast: a color written for a text is checked against the background of the box that contains it (4.5 for a small text, 3 from size 24); the warning gives a shade that works. A big pale text that is only decoration says so: `attr "aria-hidden" "true"`.

**Your own styles and animations** (never write CSS: everything has a Kaury form):
```kaury
style card-dark                       // a new word: use it on any element line → box card-dark
  background #1C1A1A, padding 24, radius 24, shadow hard
  hover lift 4                         // states the browser knows: hover, focus, pressed, disabled, checked
  selected background orange           // states you give with a condition on the element line: selected, current, open → box card-dark, selected (tab == 1)
  link color orange                    // parts inside: title, subtitle, text, link, image, button, icon, code, block, list, item, table, cell, quote, summary, emphasis, logo, field, label
  mobile padding 12                    // screens: mobile, tablet, desktop

style wide
  max-width 900, center

style button                           // the name of an element restyles all of them (button, title, header, footer, markdown, logo, emphasis…)
  border 2 black, radius 999

animation slide, 30s, loop, linear     // options: duration, loop, times n, delay 1s, linear | smooth | bounce, steps n, alternate, scroll (plays while scrolling)
  from move 0 0                        // steps: from, to, or a percentage (50%), with style options: move x y, grow, tilt, opacity, reveal 0%…100%, colors…
  to move -50% 0

state tab = 0
page "/"
  box card-dark, wide                  // several named styles on one line
    row no-wrap, slide                 // a named animation plays on the element
      text "Fresh every morning"
    box card-dark (tab == 1)           // a named style under a condition
      text "Second tab"
```
Text: `"An *immersive* site"` → emphasis; `"\n"` → a new line. States from a condition: `selected (tab == 1)`, `current (route.path == "/docs")`, `hidden (tab != 1)`, `open`; for any other look that depends on a condition, name a style and give it the same way (`style right`, then `button o, right (answered and o == q.answer)`). Tabs and filters are a state, buttons that set it and `selected`: `button "Pasta", selected (tab == "pasta") -> tab = "pasta"`. Layout: `grid columns 2 1` (unequal), `gap 24 56`, `pin bottom 0 right 20` (over its parent; `front` on the same line brings it in front of the rest), `middle` (in the middle of its row or grid line: a text next to a tall photo), `margin 0 0 0 auto` (pushed to the right of its row), `margin auto 0 0 0` (pushed to the bottom of its column: the button of a card), `sticky 96`, `border-top 2 black`, `clip`, `no-wrap`, `plain` (no underline), `grain` (paper texture; on the site style: the whole page). Site style: `radius 24, max-width 1400` set the radius and the width of the whole site. Elements: `details "Question?"` (opens on click, content below), `embed "url", "title"` (another page inside), `logo "mark.svg" "Name"`.

**Interactions**: `-> action` on the line (click; submit for a form; input for a field), or a child line `on click -> …`, `on hover -> …`, `on load -> …`, `on scroll -> …`. An action is one line or an indented block after `->`. `open menu` / `close menu` / `toggle menu` set a true/false state. `go "/page"` changes page.

**Conditions and loops in a page**: `if`, `else if`, `else`, `for … in …` produce UI and update by themselves. A condition is a line of its own, with the element indented below — never an option of the element.

**Data**: `products = await load "/api/products"` in a page does not block the display; the list fills in when the data arrives.

**Content in files** (a blog, a list of products, the texts of the site): Markdown and YAML files next to the site, read at build time. Adding an entry is adding a file: nothing to change in the code. The fields are those written in the files (`title`, `date`… at the top of a Markdown file, between two `---` lines); a field read in the code that no file has gets a warning with the one meant.
```kaury
import posts from "./content/posts/*.md"     // a list: one entry per file (its front matter, plus slug, body, created, updated)
import about from "./content/about.yaml"      // one object

page "/blog"
  section
    title "Blog of {about.name}"
    for post in posts.sort(p -> p.date).reverse()
      card post.title
        text post.description
        link "Read" "/blog/{post.slug}"

page "/blog/{post.slug}" for post in posts    // one page per entry
  seo post.title, post.description
  section
    title post.title
    markdown post.body
```

**Components**:
```kaury
component Card name image
  card
    image image, name, radius 16
    text name, bold
  style shadow soft, hover lift 4

page "/"
  Card "Strawberry" "strawberry.png"
```
Name starts with a capital letter. Parameters in order, without parentheses and without names: `Card p.name, p.photo`. What is indented under a call goes where `slot` is.

**Form**:
```kaury
state sent = false
page "/"
  form -> sent = true
    field email "Your email", type email, required, label "Email"
    select size "S", "M", "L", label "Size"
    checkbox agree "I agree to the terms"
    button "Send"
  if sent
    text "Thanks {email}, size {size}!"
```
The first word of a field is the state it fills (`email`, `size`, `agree`), created when it does not exist.

**Form sent by e-mail**: `form mail "hello@bloom.ch"` sends every field to that address, then runs the `->` action (`subject "New order"` optional). `kaury dev` shows the e-mail in the terminal; to really send, set `KAURY_MAIL_KEY` (a free resend.com key) on the host or in `.env`. `kaury build` writes the endpoint for Netlify, Vercel, Cloudflare Pages and PHP hosts (`dist/api/kaury-mail.php`; on an FTP host the key goes in `kaury-mail-key.txt` next to the site's folder). The address never appears in the page.
```kaury
state sent = false
page "/"
  form mail "hello@bloom.ch", subject "New request" -> sent = true
    field name "Your name", required, label "Name"
    field email "you@example.com", type email, required, label "Email"
    textarea message "Your message", required, label "Message"
    button "Send"
```

**Ready-made blocks** (nothing to import; a component of the same name written in the site replaces one). Prefer them for usual sections. A block with a heading is the section named after it (`Pricing plans, "Prices"` → `#prices`, found by `links Prices`); `Contact` is `#contact`, the default target of buttons.

| Block | Values | Items |
|---|---|---|
| `Hero` | heading, intro, action, href, picture | |
| `Features` | items, heading | `{ icon, title, text }` |
| `Steps` | items, heading | `{ title, text }` (numbered) |
| `Stats` | items | `{ value, label }` |
| `Table` | rows, columns, heading | rows: your list as it is; columns: `{ label, field, format, align }` (`format`: `"price"`, `"date"` or `"number"`; `align: "right"` for figures). A real `<table>`; a click on a column sorts by it, a second click the other way |
| `Chart` | items, heading, unit, scale | `{ label, value }`: bars, the tallest one fills the height; `unit` is written after each figure (`" CHF"`, `" %"`); `scale` is the value of a full bar, to give when two lists must be compared (a switch between two years) |
| `Pricing` | plans, heading | `{ name, price, per, text, features: [..], button, link, featured: true }` |
| `Testimonials` | items, heading | `{ quote, name, role, photo }` |
| `Team` | people, heading | `{ name, role, photo }` |
| `Logos` | images, heading | image files |
| `Gallery` | images, heading | image files |
| `Faq` | items, heading | `{ q, a }` |
| `Cta` | heading, intro, action, href | |
| `Contact` | to, heading, intro, thanks | form sent by e-mail to `to` |
| `Footer` | name, note | |

```kaury
let plans = [{ name: "Solo", price: "9 CHF", per: "/ month", features: ["1 site"], featured: true }]
page "/"
  Hero "Flowers that *speak*.", "Delivered the same day.", "Order", "#prices"
  Pricing plans, "Prices"
  Contact "hello@bloom.ch"
  Footer "Bloom"
```
A block is written at the level of the sections (it is one), not inside a `section`. Its last values can be left out; a value in the middle that you do not want is `""` (`Chart months, "", " CHF"`).
Figures: a table and a chart are blocks too, fed by the lists you already have (a `let` made from a state with `.filter` gives a table or a chart that follows that state: a switch between two years is one `state`).
```kaury
let gifts = [{ date: "2026-10-10", donor: "Claire D.", amount: 120 }, { date: "2026-10-08", donor: "Anonymous", amount: 50 }]
let months = [{ label: "Jan", value: 1850 }, { label: "Feb", value: 1420 }, { label: "Mar", value: 2360 }]
page "/"
  Chart months, "Donations per month", " CHF"
  Table gifts, [{ label: "Date", field: "date", format: "date" }, { label: "Donor", field: "donor" }, { label: "Amount", field: "amount", format: "price", align: "right" }], "Latest donations"
```

**Theme colors** (follow the site): `accent` (first site color), `on-accent` (text on it), `ink` (text), `muted` (soft text), `line` (borders). Fonts: `font "text"` and `font "titles"` are the two fonts of the site, the first and the second name of its `fonts` line; `font "mono"` is the one of code. Titles take the second by themselves.

## 4. Immersion

Levels: a **touch** (one `object` alone in a page), a **scene** (`scene` with decor, light, camera), a **universe** (the whole site). An object can be 2D (`.png .jpg .webp .svg`), animated 2D (`.json` Lottie), 3D (`.glb .gltf`, Meshopt/Draco compressed accepted) or a built-in shape, with no file: `object "knot", color pink, metal` (`sphere`, `cube`, `torus`, `knot`, `cone`, `cylinder`, `capsule`, `gem`, `pyramid`; materials `metal`, `matte`, `glass`, `glow`). The code is the same.

```kaury
page "/"
  scene home, fullscreen, particles bubbles          // particles stars|snow|bubbles|dust|confetti
    light studio                                      // studio|soft|sunset|night|neon|day|dramatic
    camera follows mouse                              // fixed|follows mouse|fly|free|orbit
    object can "crush.glb", size 1.2, position 2 0 0, alt "A can of Crush", fallback "can.png"
      spin on scroll                                  // also: spin, spin 90/s, spin slow, spin x
      follows mouse, smooth
      on click -> jump
    character mascot "mascot.glb", alt "The mascot"   // object with named animations
      enters from right                               // left|right|top|bottom|fade|zoom
      says "Hi!"
      on click -> play "dance"
    title "Taste the difference"                      // the content of a scene goes in front of the 3D
```

Motions (child line = permanent; after `->` = once): `spin`, `float`, `jump`, `pulse`, `sway`, `follows mouse`, `enters from …`, `parallax 0.3`, `says "text"`, `play "animation"`. Modifiers: `smooth`, `slow`, `fast`, `reverse`. Target a named object: `-> jump can`.
Where things are: the content of a scene is laid out like that of a section, in front of the 3D; an object stands in the middle unless `position` moves it. On a wide screen, x from about -3.5 to 3.5 and y from -2 to 2 are in view (`position 2 0 0`: to the right of a text on the left); on a phone an object on the side comes back toward the middle by itself.
Object options: `size`, `position x y z`, `rotation x y z`, `height` (single object), `fallback "image.png"` (when the device cannot do 3D), `shadows`, `alt "description"` (accessibility and Google), `animation "name"` (character), `immediate`. Scene options: `height`, `background`, `fog`, `ground`, `particles`, `immediate`.
Sound: `sound "ambient.mp3", loop, volume 0.4` (a mute button appears by itself); as an action: `-> sound "click.mp3"`.

Automatic rules: the 3D loads only on pages that contain it, when it becomes visible, after the page is displayed and the visitor's first gesture (add `immediate` to skip the wait); until then a built-in shape shows its silhouette, drawn by the page in its color, at its size and at its place, and a model file shows its `fallback` picture (give one: it is also what a device without 3D shows); the HTML content exists before the 3D; reduced motion is respected; on a narrow screen the camera steps back.

## 5. Golden rules for correct Kaury

1. A UI element always **starts a line**; its options are separated by **commas**: `title "Hello", size 80, pink`.
2. For a value to change on screen, declare it with `state` (or let an assignment `x = …` in the page create it).
3. Files (images, `.glb`, sounds) go in `public/` and are written without `/`: `"photo.jpg"`.
4. `==` compares, `=` stores. A `let` is never assigned again; when what it is made from reads a state, it follows that state.
5. Inside a UI line, a function is called **with parentheses**: `text total-price(cart)`, `text now()`.
6. The first item of a content element is its content: `text size` shows the variable `size`; options come after a comma (`text size, bold`).
7. The first word of a field is the state it fills: `select size "S", "M", "L"` creates the state `size`.
8. An empty value shows nothing; before calling something on it, test it: `if user` then, below, `text user.name.upper()`.

## 6. Complete example

```kaury
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
    object "knot", size 1.4, color accent, metal
      spin slow
      follows mouse, smooth
    title "Flowers that speak", size 72
  section bouquets
    grid 3 columns, gap 24
      for b in bouquets
        Bouquet b
    text "Cart: {cart.length} bouquet(s), {price(total)}"
```

## 7. Coming from HTML, CSS and JavaScript

What you already know has a Kaury form. The compiler gives it too when you write the other one by habit.

| HTML | Kaury |
|---|---|
| `<div>` | `box` — or `section`, `row` (side by side), `column` (stacked), `grid 3 columns` |
| `<h1>`, `<h2>`, `<h3>` | `title "…"` (the first of the page is the `<h1>`, the next ones `<h2>`), `subtitle "…"`, `subtitle "…", level 3` |
| `<p>`, `<span>` | `text "…"` |
| `<a href="/contact">Contact</a>` | `link "Contact" "/contact"` |
| `<img src="photo.jpg" alt="…">` | `image "photo.jpg", "What it shows"` |
| `<ul><li>` | `list`, with `item "…"` lines below |
| `<table>` | the block `Table rows, columns` (sortable); a chart: `Chart items` |
| `<input>`, `<textarea>`, `<select>` | `field email "Your email"`, `textarea message "…"`, `select size "S", "M", "L"` |
| `<button onclick="…">` | `button "Go" -> count += 1` |
| `<hr>`, `<br>`, `<iframe>` | `divider`, `"\n"` inside a text, `embed "https://…", "What it is"` |
| `class="card"` | a named style: `style card` once, then `box card` |

| CSS | Kaury |
|---|---|
| `font-size: 20px` | `size 20` |
| `font-weight: 600` | `weight 600`, or `bold` |
| `color`, `background-color` | `color pink`, `background pink` |
| `border-radius: 12px` | `radius 12` (`round` = fully round) |
| `border: 1px solid gray` | `border 1 gray` |
| `box-shadow` | `shadow soft` (`medium`, `strong`, `hard`) |
| `margin-top: 20px` | `margin 20 0 0 0` (top, right, bottom, left) |
| `padding: 12px 24px` | `padding 12 24` |
| `display: flex` | the elements `row` and `column` |
| `display: grid` | `grid 3 columns, gap 24` |
| `display: none` | `hidden`, or `hidden (count == 0)` |
| `text-align: center` | `align center` (the text), `center` (the content) |
| `position: sticky`, `z-index` | `sticky`, `front` |
| `overflow: hidden` | `clip` |
| `:hover { … }` | `hover lift 4, shadow strong` |
| `@media (max-width: …)` | `mobile padding 12`, `tablet 2 columns` |
| `transition` | nothing: changes are animated by themselves |
| `@keyframes` | `animation name` with `from` and `to` lines |

| JavaScript | Kaury |
|---|---|
| `const x = 3` / `let x = 3` | `let x = 3` (fixed) / `state x = 3` (changes on screen) |
| `useState(0)` | `state count = 0`, then `count += 1` |
| `===`, `!==` | `==`, `!=` |
| `&&`, `\|\|`, `!x` | `and`, `or`, `not x` |
| `x => x * 2` | `x -> x * 2` |
| `` `Hello ${name}` `` | `"Hello {name}"` |
| `a ? b : c` | `if a then b else c` |
| `function add(a, b) { return a + b }` | `function add a b then a + b` |
| `null`, `undefined` | `none` |
| `list.push(x)`, `list.includes(x)` | `list.add x`, `x in list` |
| `console.log(x)` | `print x` |
| `if (x) { … } else if (y) { … }` | `if x`, `else if y`, each with its block indented below |
| `for (const p of products)` | `for p in products` |
| `;` and `{ }` | nothing: one instruction per line, blocks by indentation |

## 8. The French words

For a file asked in French. Each English word and its French ones; accents are optional (`état` = `etat`), and the two languages can be mixed in one file. A word that is not here has no French form: write the English one.

**Keywords, elements and values**: let = soit · state = etat · function = fonction · then = puis / alors · if = si · else = sinon · for = pour · in = dans · while = tant · await = attends · try = essaie · catch = erreur · import = importe · from = de / depuis · as = comme · export = exporte · return = retourne · break = arrete · true = vrai · false = faux · none = rien / aucun · and = et · or = ou · not = non · open = ouvre · close = ferme · toggle = bascule · go = aller · component = composant · header = entete / en-tete · footer = pied / pied-de-page · grid = grille · column = colonne · row = ligne / rangee · box = boite · card = carte · title = titre · subtitle = sous-titre · text = texte · link = lien · links = liens / menu · button = bouton · form = formulaire · field = champ · textarea = zone / zone-texte / zone-de-texte · select = choix / liste-deroulante · checkbox = case / case-a-cocher · list = liste · item = element · icon = icone · divider = separateur · spacer = espaceur · details = deplie · embed = integre · slot = contenu · tablet = tablette · desktop = ordinateur · colors = couleurs · font = police · fonts = polices · lang = langue · url = adresse · alternate = traduction · head = tete · wrapper = enveloppe · object = objet · character = personnage · light = lumiere · on = au · click = clic · hover = survol · scroll = defilement · load = chargement · follows = suit / follow · mouse = souris · enters = entre / enter · spin = tourne / turn · float = flotte · jump = saute · sway = balance · says = dit / say · play = joue · sound = son / audio · parallax = parallaxe · smooth = doux / douce · slow = lent / lente · fast = rapide · reverse = inverse · left = gauche · right = droite · top = haut · bottom = bas · fade = fondu · loop = boucle · once = fois / une-fois · sunset = coucher-de-soleil · night = nuit · day = jour · dramatic = dramatique · fixed = fixe · fly = vol · free = libre · orbit = orbite · slide = glisse · curtain = rideau · stars = etoiles · snow = neige · bubbles = bulles · dust = poussiere · confetti = confettis · medium = moyenne / moyen · strong = forte / fort · hard = dure / dur · inner = interieure · center = centre · justify = justifie · pointer = main / pointeur · arrow = fleche · number = nombre · password = motdepasse · tel = telephone · search = recherche

**Options**: background = fond · color = couleur · font = police · size = taille · bold = gras · light = leger / fin · weight = poids / graisse / epaisseur · italic = italique · upright = droit / no-italic · underline = souligne · plain = simple · uppercase = majuscules · line-height = interligne · tracking = lettres / interlettrage · align = aligne · center = centre · middle = milieu · radius = coins / rayon / arrondi · round = rond / pill · shadow = ombre · glow = lueur / neon · text-glow = lueur-texte · stroke = contour · mesh = maillage · border = bordure · border-top = bordure-haut · border-bottom = bordure-bas · pin = epingle · clip = coupe · no-wrap = sans-retour · margin = marge · padding = remplissage / interieur · gap = espace · width = largeur · height = hauteur · max-width = max-largeur / largeur-max · min-height = min-hauteur / hauteur-min · fullscreen = plein-ecran / full · full-width = pleine-largeur · zoom = echelle · opacity = opacite · blur = flou · grayscale = noir-et-blanc / monochrome / greyscale · shade = voile / scrim / overlay · glass = verre · gradient = degrade · text-gradient = texte-degrade · columns = colonnes / colonne / cols / column · hidden = cache / hide · sticky = colle · front = devant · cursor = curseur · hover = survol · lift = monte / leve / lever / souleve · grow = grossit · tilt = penche · move = deplace / translate · reveal = devoile · animate = anime · class = classe · look = allure · tag = balise · attr = attribut · selected = selectionne · current = courant · open = ouvert · level = niveau · alt = texte / description · cover = couvre · loop = boucle · muted = muet · autoplay = auto · controls = controles · to = vers / href · outline = contour · ghost = discret / subtle · large = grand · small = petit · disabled = desactive · mail = courriel / email · subject = sujet / objet · new-tab = nouvel · min = mini · max = maxi · step = pas · required = requis · label = etiquette · rows = lignes · fallback = secours · shadows = ombres · immediate = immediat · metal = metal · matte = mat · fog = brouillard · ground = sol / floor · particles = particules · animation = anime
