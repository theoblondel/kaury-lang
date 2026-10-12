---
name: kaury-taste
description: Design taste for sites written in Kaury. Use it whenever you design or redesign a landing page, a portfolio or a marketing site in a .kaury file. It reads the brief, picks a direction, and keeps the result from looking like a template. Kaury only, never HTML, CSS or JavaScript.
---

# kaury-taste: design taste, written in Kaury

> For landing pages, portfolios and marketing sites written in **Kaury**. Not for dashboards or data tables.
> Every rule is contextual: read the brief first, then apply only what fits.
> You write **Kaury only**. No CSS, no HTML, no JavaScript, no class names. If something seems impossible in Kaury, simplify the design. The language reference is https://dev.kaury.studio/kaury-ai.md: read it first.

Adapted for Kaury from [Taste-Skill](https://github.com/leonxlnx/taste-skill) by Leonxlnx (MIT). The principles are theirs; every example here is Kaury.

## 0. Read the brief before writing a line

Most generated sites look the same because the model jumps to its default look. Read these signals first:

1. **Page kind**: landing, portfolio, redesign, editorial.
2. **Words the person used**: "calm", "premium", "playful", "serious", "editorial", "dark tech".
3. **References**: sites, brands or screenshots they named.
4. **Audience**: a buyer comparing suppliers, a consumer, a recruiter. The audience picks the look, not you.
5. **What already exists**: logo, colors, fonts, photos. On a redesign they are the starting material.
6. **Quiet constraints**: public service, health, children, accessibility first. They override style.

Then state one line before any code:

> Reading this as: *page kind* for *audience*, in a *tone* language, leaning toward *direction*.

If two readings really diverge, ask **one** question. Otherwise decide and go.

Do not default to: a purple or blue glow, a centered hero on a dark gradient, three equal cards, `glass` on everything, loops that never stop, an eyebrow above every heading.

## 1. Three dials

Set them after the design read. They decide layout, motion and density everywhere below.

- **VARIANCE** 1 to 10: 1 is perfect symmetry, 10 is deliberate asymmetry.
- **MOTION** 1 to 10: 1 is static, 10 is cinematic.
- **DENSITY** 1 to 10: 1 is a gallery, 10 is a cockpit.

| Brief | VARIANCE | MOTION | DENSITY |
|---|---|---|---|
| Calm, minimal, editorial | 5 | 3 | 3 |
| Premium consumer, brand | 7 | 6 | 3 |
| Agency, experimental, playful | 9 | 8 | 3 |
| Landing or portfolio (default) | 8 | 6 | 4 |
| Trust first, public service | 3 | 2 | 5 |
| Redesign that preserves | as it is | one more | as it is |

How the dials turn into Kaury:

| Dial | Low | High |
|---|---|---|
| VARIANCE | `grid 3 columns`, `center` | `grid columns 1.2 0.8`, `tilt`, `pin`, one oversized element |
| MOTION | `hover lift 4` only | `enters from …`, a named `animation` with `scroll`, a `scene` |
| DENSITY | `gap 64`, `padding 96`, one idea per section | `gap 16`, compact `grid 4 columns` |

## 2. The foundation: one `site` block, then words

Everything visual is decided once, in the `site` block and in named styles. A page then reads like a sentence.

```kaury
site "Atelier Nord"
  colors accent #1F4FD8, paper #F4F4F1, ink #15171C
  fonts "Satoshi", "Cabinet Grotesk"
  lang "en"
  style background paper, color ink, radius 14, max-width 1240

style display
  font "titles", size 76, line-height 1, tracking -2, weight 800
  tablet size 52
  mobile size 40

style lead
  size 20, line-height 1.5, width 560, color muted

page "/"
  section hero
    title "Furniture that outlives *trends*.", display
    text "Solid oak pieces, built to order in Lausanne and delivered in four weeks.", lead
    button "See the collection", large, to "/collection"
```

Rules:

- **Name a style once, reuse the word.** Three elements with the same five options means a missing `style`.
- **Never repeat a hex code in a page.** Colors live in `colors`; pages say `accent`, `ink`, `muted`, `line`.
- **`radius` and `max-width` on the site style** set the shape of the whole site: that is the shape lock.

## 3. Correct the defaults

### 3.1 Typography

- Two fonts at most: `fonts "text font", "title font"`. Use them as `font "text"` and `font "titles"`.
- Prefer a sans display font (Satoshi, Cabinet Grotesk, General Sans, Clash Display). A serif only when the brand is truly editorial, luxury or heritage and you can say why.
- Emphasis inside a headline is `*word*`, in the same font. Style it once with `style emphasis`. Never bring a second family in for one word. When the font has no real italic (a condensed display font), write `upright, color accent`: the color alone carries the emphasis.
- Display type is tight: `line-height 1`, `tracking -2`. Body text is open: `line-height 1.5`, `width 560`.
- A headline that takes four lines is too big. Lower `size`; do not blame the copy.

### 3.2 Color

- **One accent.** It is the same on the whole page: buttons, links, the one highlighted card.
- Neutral base, one saturated accent. No automatic purple glow, no random `gradient`.
- One family of neutrals: do not mix warm and cool greys.
- For "premium" briefs, the default cream, brass and espresso palette makes every brand invisible. Rotate: cold silver and smoke, deep green and bone, off-black and tan, cobalt and one neutral, pure monochrome with one bright accent.
- Check every button: its text must be readable on its background. Kaury picks a contrasting text color on a colored block; do not override it with a `color` that breaks it.

### 3.3 Layout

- With VARIANCE above 4, do not center the hero. Split it and make the two sides unequal.
- A layout family appears **once** per page. Eight sections need at least four families: a split, a full-width statement, an unequal grid, a list with dividers, a ticker.
- Never three image-and-text splits in a row.
- A grid has exactly as many cells as you have content. No empty tile.
- In a grid of cards, two or three cells need a real difference: an image, the accent, a dark block.
- Every multi-column layout says what it becomes on small screens, on the next line.

```kaury
site "Halden"
  colors accent #0F7B5F, paper #F3F5F2, ink #101614
  fonts "General Sans", "Clash Display"
  style background paper, color ink, radius 20

style tile
  background white, padding 28, gap 10, radius 20
  hover lift 4

style tile-accent
  background accent, padding 28, gap 10, radius 20

page "/"
  section work
    grid columns 1.4 1, gap 20
      tablet columns 1
      column tile-accent
        subtitle "Harbour office, Bergen", level 3, size 34
        text "A 40-desk floor rebuilt around daylight."
      column tile
        subtitle "Lakeside cabin", level 3, size 26
        text "Off-grid, 38 square metres."
```

### 3.4 Photographs

- A page for a place, a product or people needs real photographs in `public/`, each with a description. A grey box, a gradient or an emoji in place of a picture is the first thing that gives a generated page away.
- Photographs from different sources look like a set once they share a look: `grayscale` on all of them in one named style, and `hover grayscale 0` to give the colors back.
- A text never sits straight on a picture. Darken the picture under it: `background "hall.jpg", shade 0.6`, or `shade 0.9 bottom` when the text is at the bottom and the top of the picture should stay clear. On a phone the text covers more of the picture: give it an even veil with `mobile shade 0.7`.
- Next to a tall photograph, the text goes in the middle of it: `column middle`.
- No real logo, no brand name and no recognizable product of someone else in a picture.

### 3.5 Shape, cards, shadows

- One radius scale for the page: all sharp, all soft, or pills for what you click. Buttons, cards and fields follow it.
- A card only when elevation means something. Otherwise group with `border-top 1 line`, `divider` or space.
- `shadow soft` at most on a light page. `shadow strong` is for one element, not for every card.

### 3.6 Hero discipline

- The hero fits the first screen: headline of two lines at most, subtext of twenty words at most, the button visible without scrolling.
- Four text elements at most: an optional eyebrow, the headline, the subtext, the buttons (one primary, one secondary).
- No logo wall, no price teaser, no bullet list inside the hero: they get their own section just below.
- The menu stays on one line on desktop: `links` with five items at most.

### 3.7 Eyebrows and labels

- One eyebrow for three sections, at most. The headline alone is enough.
- Two buttons with the same intent share **one** label on the whole page: choose "Contact" or "Get in touch", never both.
- A button label fits on one line: three words at most.

### 3.8 States and forms

A page that only shows the success state is unfinished. Show the empty state and the sent state, and give every field a label.

```kaury
site "Halden"
  colors accent #0F7B5F, paper #F3F5F2, ink #101614
  style background paper, color ink, radius 20

state sent = false
state name = ""
state items = []

page "/"
  section contact
    if sent
      title "Thanks {name}.", size 40
      text "We answer within one working day."
    else
      form -> sent = true
        field name "Ada Lovelace", required, label "Name"
        field email "ada@example.com", type email, required, label "Email"
        button "Send"
  section list
    if items.length == 0
      text "Nothing saved yet. Add a project to see it here.", color muted
    for it in items
      text it
```

- The label goes in `label "…"`, never only in the hint.
- Real-looking content: no "John Doe", no "Lorem ipsum", no round fake numbers like "10,000+ users". If you have no figure, do not invent one.

## 4. Motion

Motion explains something or it goes. With MOTION under 4, keep to `hover lift 4` and nothing else.

```kaury
site "Halden"
  colors accent #0F7B5F, paper #F3F5F2, ink #101614
  style background paper, color ink, radius 20

animation rise, 0.8s, smooth
  from move 0 32
  to move 0 0

animation widen, scroll
  from grow 0.9, opacity 0.4
  to grow 1, opacity 1

page "/"
  section intro
    title "Buildings that keep the light.", size 64, rise
  section proof
    image "bergen.jpg", "Harbour office in Bergen, seen from the quay", radius 20, widen
```

- One entrance per section, not one per element.
- The headline of the first screen does not fade in: write its entrance with `move` only (`from move 0 32`, `to move 0 0`). What starts at `opacity 0` is read late, by the visitor and by the tools that measure the page.
- A `loop` is for a ticker or a deliberate signature, never for a button that pulses forever.
- `scroll` animations are for one or two key moments of the page.
- Reduced motion is respected by Kaury itself: do not fight it.

## 5. Immersion, with restraint

3D is a statement, so one is enough. Use a `scene` only when MOTION is 7 or more and the subject deserves it.

```kaury
site "Halden"
  colors accent #0F7B5F, night #0B1210, bone #EEF2EC
  style background night, color bone

page "/"
  scene fullscreen, particles dust, background night
    light soft
    object model "tower.glb", size 1.3, fallback "tower.jpg", alt "Scale model of the Halden tower"
      spin slow
      follows mouse, smooth
    title "The tower, before it is built.", size 64, color bone
      enters from bottom
```

- Always `fallback` and `alt`: the page must exist without the 3D.
- One object that reacts beats five that spin.
- The text of a scene is real text in front of the 3D: keep it short and readable.

## 6. Tells that give a generated site away

Remove every one of these before you finish:

- A centered hero over a dark gradient with a glow.
- Three equal cards with an icon, a title and two lines, twice on the same page.
- `glass` or `blur` on more than one element.
- An eyebrow above every heading.
- Emoji used as icons.
- The same accent color changing from one section to the next.
- Placeholder people, placeholder numbers, placeholder testimonials.
- A long dash in the copy. Use a comma, a colon or two sentences.
- Sections that all have the same height, the same padding and the same grid.

## 7. Before you hand it over

1. The design read is written, and the three dials are set.
2. One `site` block holds the colors, the two fonts, the radius and the width.
3. No hex code and no repeated group of options inside a page: they are named styles.
4. One accent, one radius scale, one label per intent.
5. The hero fits one screen; the menu fits one line.
6. No layout family used twice; no empty grid cell.
7. Every multi-column block has its `tablet` or `mobile` line.
8. Every image has a description; every object has `alt` and `fallback`.
9. Empty, sent and error states exist where the page has data or a form.
10. `kaury check site.kaury` passes with no error.
