// Ready-made components, written in Kaury. Nothing to import: a page that writes « Pricing plans »
// gets the component Pricing (and its styles) added by the compiler; a component of the same name
// written or imported by the site always wins. They follow the site's colors, fonts and radius.
// Every block is compiled by the tests, with the example given here. A block with a heading is the section
// named after it (« Pricing plans, "Prices" » → #prices), so « links Prices » finds it; Contact is #contact.
//
// Their look is the look of most sites an assistant writes, so they follow the rules of a designed page
// (docs/skills/kaury-taste): nothing centered by default, the headings on the edge of the content, no layout
// used twice (a split, a list in two columns, numbered columns, a row of figures, cards, one large quote),
// one accent, and what is soft is soft by opacity, so that it can be read on any background.

export interface Block {
  params: string
  help: string
  example: string
  source: string
}

/** The heading of a block: the same for all, on the edge of the content. */
const HEADING = `
style kb-heading
  font "titles", size 52, line-height 1.02, tracking -1.5, margin 0 0 14 0
  mobile size 34, tracking -1
`

export const BLOCKS: Record<string, Block> = {
  Hero: {
    params: 'heading, intro = "", action = "", href = "#contact", picture = ""',
    help: 'the first screen: a big title, a sentence, a button; with a picture, the text and the picture side by side',
    example: 'Hero "Flowers that *speak*.", "Delivered the same day.", "Order", "#shop"',
    source: `
component Hero heading, intro = "", action = "", href = "#contact", picture = ""
  section
    if picture
      grid columns 1.1 0.9, gap 64
        tablet columns 1, gap 32
        column kb-hero, middle
          title heading
            enters from bottom
          if intro
            text intro
          if action
            button action, to href, large
        image picture, "", cover, kb-hero-picture
    else
      column kb-hero
        title heading
          enters from bottom
        if intro
          text intro
        if action
          button action, to href, large

style kb-hero
  gap 24, padding 48 0 32
  title size 80, line-height 1, tracking -2
  text size 20, line-height 1.5, max-width 540, opacity 0.76
  mobile padding 20 0 12

style kb-hero-picture
  height 560
  tablet height 420
  mobile height 320
`,
  },

  Features: {
    params: 'items, heading = ""',
    help: 'a list in two columns, a line above each; each item has title, text and maybe icon',
    example: 'Features features, "Why us"   // features: [{ title: "Fresh", text: "Cut this morning." }]',
    source: `
component Features items, heading = ""
  section id slug(heading)
    if heading
      subtitle heading, kb-heading
    grid 2 columns, gap 0 56
      mobile columns 1
      for f in items
        row kb-feature
          if f.icon
            icon f.icon
          column gap 6
            subtitle f.title, level 3
            text f.text
          enters from bottom
${HEADING}
style kb-feature
  gap 18, padding 26 0, border-top 1 line
  icon size 28
  subtitle size 22
  text opacity 0.72
`,
  },

  Steps: {
    params: 'items, heading = ""',
    help: 'numbered steps; each item has title and text',
    example: 'Steps steps, "How it works"   // steps: [{ title: "Choose", text: "…" }]',
    source: `
component Steps items, heading = ""
  section id slug(heading)
    if heading
      subtitle heading, kb-heading
    grid 3 columns, gap 20
      for s, i in items
        column kb-step
          text "{i + 1}", kb-step-number
          subtitle s.title, level 3
          text s.text, kb-soft
          enters from bottom
${HEADING}
style kb-step
  gap 10, border-top 2 ink, padding 20 0 0
  subtitle size 22

style kb-step-number
  font "titles", size 40, weight 800, line-height 1

style kb-soft
  opacity 0.72
`,
  },

  Stats: {
    params: 'items',
    help: 'big figures in a row; each item has value and label',
    example: 'Stats [{ value: "2 min", label: "to order" }, { value: "7 days", label: "of freshness" }]',
    source: `
component Stats items
  section
    row kb-stats
      for s in items
        column gap 6
          text s.value, kb-stat-value
          text s.label, kb-soft
          enters from bottom

style kb-stats
  gap 72, padding 8 0
  mobile gap 32

style kb-stat-value
  font "titles", size 64, weight 800, line-height 1, tracking -1

style kb-soft
  opacity 0.72
`,
  },

  Table: {
    params: 'rows, columns, heading = ""',
    help: 'a real table from a list: each column has label and field, and can have format ("price", "date", "number") and align: "right"; a click on a column sorts by it',
    example: 'Table [{ name: "Ana", city: "Vevey", total: 120 }], [{ label: "Name", field: "name" }, { label: "City", field: "city" }, { label: "Total", field: "total", format: "price", align: "right" }], "Orders"',
    source: `
function kb-shown v, format
  if format == "price" then price(v) else if format == "date" then format-date(v) else if format == "number" then format-number(v) else v

component Table rows, columns, heading = ""
  state by = ""
  state down = false
  let ordered = if by == "" then rows else (if down then rows.sort(r -> r[by]).reverse() else rows.sort(r -> r[by]))
  section id slug(heading)
    if heading
      subtitle heading, kb-heading
    box kb-table-frame
      box tag "table", kb-table
        box tag "thead"
          box tag "tr"
            for c in columns
              box tag "th", kb-right (c.align == "right"), attr "scope" "col", attr "aria-sort" (if by != c.field then "none" else if down then "descending" else "ascending")
                button c.label, kb-sort ->
                  down = by == c.field and not down
                  by = c.field
        box tag "tbody"
          for r in ordered
            box tag "tr"
              for c in columns
                text kb-shown(r[c.field], c.format), tag "td", kb-right (c.align == "right")

style kb-table-frame
  margin 24 0 0 0

style kb-table
  width "100%"

style kb-right
  align right

style kb-sort
  background transparent, color ink, padding 0, radius 0, shadow none, weight 700, size 13, uppercase, tracking 1
  hover color accent

css
  .ks-kb-table-frame{overflow-x:auto}
  .ks-kb-table{border-collapse:collapse}
  .ks-kb-table th,.ks-kb-table td{padding:14px 16px;text-align:left;white-space:nowrap}
  .ks-kb-table td{border-top:1px solid var(--k-line);max-width:none}
  .ks-kb-table .ks-kb-right{text-align:right}
  .ks-kb-table th:first-child,.ks-kb-table td:first-child{padding-left:0}
  .ks-kb-table th:last-child,.ks-kb-table td:last-child{padding-right:0}
  .ks-kb-table .ks-kb-sort{box-shadow:none;min-height:0;transform:none}
  .ks-kb-table th[aria-sort=ascending] .ks-kb-sort::after{content:" ↑"}
  .ks-kb-table th[aria-sort=descending] .ks-kb-sort::after{content:" ↓"}
${HEADING}`,
  },

  Chart: {
    params: 'items, heading = "", unit = "", scale = 0',
    help: 'bars drawn from a list; each item has label and value; unit is written after each figure (" CHF", " %"); scale is the value of a full bar (the tallest one when it is not given): the same for two lists to compare',
    example: 'Chart [{ label: "Jan", value: 1850 }, { label: "Feb", value: 1420 }, { label: "Mar", value: 2360 }], "Donations per month", " CHF"',
    source: `
component Chart items, heading = "", unit = "", scale = 0
  let top = if scale > 0 then scale else max(items.map(i -> i.value))
  section id slug(heading)
    if heading
      subtitle heading, kb-heading
    row kb-chart, attr "role" "img", attr "aria-label" "{heading}: {items.map(i -> "{i.label} {format-number(i.value)}{unit}").join(", ")}"
      for i in items
        column kb-bar
          column kb-bar-plot
            text "{format-number(i.value)}{unit}", kb-bar-value, kb-bar-many (items.length > 8)
            box kb-bar-fill, height "{if top > 0 then i.value * 86 / top else 0}%"
          text i.label, kb-bar-label

style kb-chart
  height 300, gap 10, margin 24 0 0 0
  mobile height 220, gap 4

style kb-bar
  gap 8

style kb-bar-plot
  gap 6

style kb-bar-fill
  background accent, radius 4

style kb-bar-value
  size 12, align center, opacity 0.72
  mobile size 10

style kb-bar-many
  mobile hidden

style kb-bar-label
  size 13, weight 600, align center
  mobile size 11

css
  .ks-kb-chart{align-items:stretch;width:100%;flex-wrap:nowrap}
  .ks-kb-bar{flex:1 1 0;min-width:0;height:100%}
  .ks-kb-bar-plot{flex:1 1 0;min-height:0;justify-content:flex-end;border-bottom:1px solid var(--k-line)}
  .ks-kb-bar-fill{min-height:1px;border-bottom-left-radius:0;border-bottom-right-radius:0}
  .ks-kb-bar-value,.ks-kb-bar-label{max-width:none;white-space:nowrap}
${HEADING}`,
  },

  Pricing: {
    params: 'plans, heading = ""',
    help: 'price cards, the featured one filled with the accent color; each plan has name, price, and maybe per, text, features (list), button, link, featured (true)',
    example: 'Pricing plans, "Prices"   // plans: [{ name: "Solo", price: "9 CHF", per: "/ month", features: ["1 site"], featured: true }]',
    source: `
component Pricing plans, heading = ""
  section id slug(heading)
    if heading
      subtitle heading, kb-heading
    grid 3 columns, gap 16
      for p in plans
        card kb-plan, kb-plan-best (p.featured == true)
          text p.name, kb-plan-name
          row gap 8
            text p.price, kb-price
            if p.per
              text p.per, kb-soft
          if p.text
            text p.text, kb-soft
          if p.features
            column gap 0
              for f in p.features
                text f, kb-plan-line
          button p.button or "Choose", to p.link or "#contact", outline, margin auto 0 0 0
          enters from bottom
${HEADING}
style kb-plan
  padding 30, gap 14

style kb-plan-best
  background accent

style kb-plan-name
  uppercase, tracking 2, size 13, weight 600

style kb-price
  font "titles", size 52, weight 800, line-height 1, tracking -1

style kb-plan-line
  padding 10 0, border-top 1 line, size 15

style kb-soft
  opacity 0.72
`,
  },

  Testimonials: {
    params: 'items, heading = ""',
    help: 'quotes of customers, the first one written large; each item has quote, name, and maybe role, photo',
    example: 'Testimonials reviews, "They loved it"   // reviews: [{ quote: "Gorgeous.", name: "Ana", role: "Vevey" }]',
    source: `
component Testimonials items, heading = ""
  section id slug(heading)
    if heading
      subtitle heading, kb-heading
    for t, i in items
      if i == 0
        column kb-quote-first
          text "“{t.quote}”", kb-quote-big
          row gap 12
            if t.photo
              image t.photo, t.name, round, width 44, height 44
            column gap 0
              text t.name, bold
              if t.role
                text t.role, kb-muted
    grid 2 columns, gap 0 56
      mobile columns 1
      for t, i in items
        if i > 0
          column kb-quote
            text "“{t.quote}”", size 19, line-height 1.5
            row gap 12
              if t.photo
                image t.photo, t.name, round, width 44, height 44
              column gap 0
                text t.name, bold
                if t.role
                  text t.role, kb-muted
            enters from bottom
${HEADING}
style kb-quote-first
  gap 22, padding 4 0 40

style kb-quote-big
  font "titles", size 40, line-height 1.15, tracking -1, max-width 900
  mobile size 26

style kb-quote
  gap 16, padding 26 0, border-top 1 line

style kb-muted
  color muted, size 15
`,
  },

  Team: {
    params: 'people, heading = ""',
    help: 'portraits; each person has name, and maybe role, photo',
    example: 'Team people, "The team"   // people: [{ name: "Léa", role: "Florist", photo: "lea.jpg" }]',
    source: `
component Team people, heading = ""
  section id slug(heading)
    if heading
      subtitle heading, kb-heading
    grid 4 columns, gap 20
      for p in people
        column kb-person
          if p.photo
            image p.photo, p.name
          else
            row kb-avatar
              text p.name[0]
          text p.name, bold
          if p.role
            text p.role, kb-muted
          enters from bottom
${HEADING}
style kb-person
  gap 4
  image margin 0 0 8 0

style kb-avatar
  width 72, height 72, round, background accent, center, margin 0 0 8 0
  text font "titles", size 30, weight 800

style kb-muted
  color muted, size 15
`,
  },

  Logos: {
    params: 'images, heading = ""',
    help: 'a row of logos (customers, partners, press), its heading at the start of the row',
    example: 'Logos ["acme.svg", "globex.svg"], "They trust us"',
    source: `
component Logos images, heading = ""
  section id slug(heading)
    row kb-logos
      if heading
        text heading, kb-logos-title
      for src in images
        image src, "", height 32

style kb-logos
  gap 44, padding 8 0
  image opacity 0.7, hover opacity 1
  mobile gap 28

style kb-logos-title
  uppercase, tracking 2, size 12, weight 600, opacity 0.7
`,
  },

  Gallery: {
    params: 'images, heading = ""',
    help: 'a grid of pictures',
    example: 'Gallery ["a.jpg", "b.jpg", "c.jpg"], "Our work"',
    source: `
component Gallery images, heading = ""
  section id slug(heading)
    if heading
      subtitle heading, kb-heading
    grid 3 columns, gap 12
      for src in images
        image src, "", kb-shot
          enters from bottom
${HEADING}
style kb-shot
  hover lift 4
`,
  },

  Faq: {
    params: 'items, heading = "Questions"',
    help: 'questions that open on click, their heading beside them; each item has q and a',
    example: 'Faq faq   // faq: [{ q: "Do you deliver?", a: "Yes, every day." }]',
    source: `
component Faq items, heading = "Questions"
  section id slug(heading)
    grid columns 1 1.7, gap 56
      tablet columns 1, gap 12
      column
        if heading
          subtitle heading, kb-heading
      column kb-faq
        for f in items
          details f.q
            text f.a
${HEADING}
style kb-faq
  gap 4
  text opacity 0.76
`,
  },

  Cta: {
    params: 'heading, intro = "", action = "", href = "#contact"',
    help: 'a band in the accent color that asks for the next step: the sentence on one side, the button on the other',
    example: 'Cta "Ready to bloom?", "Order before noon, delivered tonight.", "Order now", "#shop"',
    source: `
component Cta heading, intro = "", action = "", href = "#contact"
  section id slug(heading)
    card kb-cta
      row gap 32
        column gap 10
          subtitle heading
          if intro
            text intro
        if action
          button action, to href, large, margin 0 0 0 auto
            mobile margin 0

style kb-cta
  background accent, padding 56 48
  subtitle font "titles", size 44, line-height 1.05, tracking -1
  text size 19
  button background on-accent, color accent
  mobile padding 36 24
`,
  },

  Contact: {
    params: 'to, heading = "Contact", intro = "", thanks = "Thank you! We will answer soon."',
    help: 'a contact form (name, email, message) sent by e-mail to the address, its heading beside it',
    example: 'Contact "hello@bloom.ch", "Write to us"',
    source: `
component Contact to, heading = "Contact", intro = "", thanks = "Thank you! We will answer soon."
  section contact
    grid columns 1 1.1, gap 64
      tablet columns 1, gap 20
      column gap 10
        subtitle heading, kb-heading
        if intro
          text intro, kb-contact-intro
      column gap 14
        if sent
          text thanks, bold
        else
          form mail to -> sent = true
            field name "Your name", required, label "Name"
            field email "you@example.com", type email, required, label "Email"
            textarea message "Your message", required, label "Message"
            button "Send", large
${HEADING}
style kb-contact-intro
  size 19, line-height 1.5, max-width 420, opacity 0.76
`,
  },

  Footer: {
    params: 'name, note = ""',
    help: 'the bottom of the page: © year and name, and maybe a note',
    example: 'Footer "Bloom", "Flowers in Vevey since 2009"',
    source: `
component Footer name, note = ""
  footer
    text "© {now().getFullYear()} {name}"
    if note
      text note
`,
  },
}
