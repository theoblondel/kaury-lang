---
title: Blocks, forms and templates
description: Ready-made sections (Hero, Pricing, Faq, Contact…), forms that send e-mails, and the four templates of kaury new.
order: 4.5
group: Guide
---

Most sites are made of the same sections: a first screen, features, prices, reviews, questions, a contact form. Kaury has them **ready-made**. Nothing to install or import: write the name, give the values.

```kaury
let plans = [
  { name: "Small", price: "29 CHF", features: ["7 stems", "A card"] },
  { name: "Large", price: "49 CHF", features: ["12 stems", "A card", "A vase"], featured: true }
]

page "/"
  section header
    logo "Bloom"
    links Prices, Contact
  Hero "Flowers that *speak*.", "Delivered the same day in Vevey.", "See the prices", "#prices"
  Pricing plans, "Prices"
  Contact "hello@bloom.ch"
  Footer "Bloom", "Flowers in Vevey since 2009"
```

They take the colors, fonts and radius of your site. A block with a heading is the section named after it: `Pricing plans, "Prices"` is `#prices`, so `links Prices` finds it.

## The blocks

| Block | Values, in order | Each item |
|---|---|---|
| `Hero` | heading, intro, action, href, picture | |
| `Features` | items, heading | `icon`, `title`, `text` |
| `Steps` | items, heading | `title`, `text` — numbered |
| `Stats` | items | `value`, `label` |
| `Pricing` | plans, heading | `name`, `price`, `per`, `text`, `features`, `button`, `link`, `featured` |
| `Testimonials` | items, heading | `quote`, `name`, `role`, `photo` |
| `Team` | people, heading | `name`, `role`, `photo` (initial when no photo) |
| `Logos` | images, heading | image files |
| `Gallery` | images, heading | image files |
| `Faq` | items, heading | `q`, `a` |
| `Cta` | heading, intro, action, href | |
| `Contact` | to, heading, intro, thanks | |
| `Footer` | name, note | |

Only the first values are required; Kaury tells you when one is missing:

```
Error site.kaury, line 4: "Pricing" needs 1 value (plans), I see 0.
Try: Pricing plans, heading
```

The items are often in a YAML file, so the texts can change without touching the code:

```kaury
import home from "./content/home.yaml"

page "/"
  Features home.features, "Why Bloom"
  Faq home.faq
```

## Make a block yours

A block is an ordinary Kaury component. Write one with the same name and it replaces the built-in one:

```kaury
component Footer name
  footer
    text "{name} — handmade in Vevey"

page "/"
  Footer "Bloom"
```

To restyle without rewriting, use the theme colors: `accent`, `on-accent`, `ink`, `muted`, `line` follow your site, and `font "titles"` is your title font.

## Forms that send e-mails

Add `mail` and an address to a form: what is typed is sent there, then the `->` action runs.

```kaury
page "/"
  section contact
    form mail "hello@bloom.ch", subject "New request" -> sent = true
      field name "Your name", required, label "Name"
      field email "you@example.com", type email, required, label "Email"
      textarea message "Your message", required, label "Message"
      button "Send"
    if sent
      text "Thanks {name}, we answer within the day."
```

- **While you build**: `kaury dev` shows each e-mail in the terminal. Nothing leaves your computer.
- **To really send**: create a free key on [resend.com](https://resend.com) and set it as `KAURY_MAIL_KEY` on your host (or in a `.env` file to try locally).
- **Hosting**: `kaury build` writes the small function that sends the e-mail for Netlify, Vercel and Cloudflare Pages. Keep the `netlify/`, `api/` and `functions/` folders it creates.
- **Safe by default**: the address is never in the page, the endpoint only writes to the addresses of your site, the answer goes to the visitor's e-mail (reply-to), and robots that fill the form instantly are ignored.

## Templates

`kaury new` starts from a template:

```bash
kaury new my-site                        # starter: teaches the language
kaury new my-shop --template landing     # hero, features, prices, reviews, questions, contact
kaury new my-notes --template blog       # Markdown posts, one page each
kaury new my-work --template portfolio   # gallery, process, clients, contact
```

Every template is a real site made of the blocks above, with its texts in `content/`, an `AGENTS.md` and the spec for AI assistants.
