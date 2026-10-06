// Ready-made components, written in Kaury. Nothing to import: a page that writes « Pricing plans »
// gets the component Pricing (and its styles) added by the compiler; a component of the same name
// written or imported by the site always wins. They follow the site's colors, fonts and radius.
// Every block is compiled by the tests, with the example given here. A block with a heading is the section
// named after it (« Pricing plans, "Prices" » → #prices), so « links Prices » finds it; Contact is #contact.

export interface Block {
  params: string
  help: string
  example: string
  source: string
}

export const BLOCKS: Record<string, Block> = {
  Hero: {
    params: 'heading, intro = "", action = "", href = "#contact", picture = ""',
    help: 'the first screen: a big title, a sentence, a button, an image',
    example: 'Hero "Flowers that *speak*.", "Delivered the same day.", "Order", "#shop"',
    source: `
component Hero heading, intro = "", action = "", href = "#contact", picture = ""
  section
    column kb-hero
      title heading
        enters from bottom
      if intro
        text intro
      if action
        button action, to href, large
      if picture
        image picture

style kb-hero
  center, gap 22, padding 72 0 48
  title size 76, center
  text size 20, color muted, center
  image radius 24, margin 28 0 0
`,
  },

  Features: {
    params: 'items, heading = ""',
    help: 'a grid of cards; each item has title, text and maybe icon',
    example: 'Features features, "Why us"   // features: [{ icon: "🌸", title: "Fresh", text: "Cut this morning." }]',
    source: `
component Features items, heading = ""
  section id slug(heading)
    if heading
      subtitle heading, center
    grid 3 columns, gap 20
      for f in items
        card kb-feature
          if f.icon
            icon f.icon
          subtitle f.title, level 3
          text f.text
          enters from bottom

style kb-feature
  padding 28, gap 10
  icon size 32
  subtitle size 22
  text color muted
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
      subtitle heading, center
    grid 3 columns, gap 20
      for s, i in items
        column kb-step
          text "{i + 1}", kb-step-number
          subtitle s.title, level 3
          text s.text
          enters from bottom

style kb-step
  gap 10, border-top 2 ink, padding 20 0 0
  text color muted
  subtitle size 22

style kb-step-number
  font "titles", size 40, weight 800, color accent, line-height 1
`,
  },

  Stats: {
    params: 'items',
    help: 'big numbers in a row; each item has value and label',
    example: 'Stats [{ value: "12k", label: "bouquets" }, { value: "4.9", label: "rating" }]',
    source: `
component Stats items
  section
    row kb-stats
      for s in items
        column center, gap 4
          text s.value, kb-stat-value
          text s.label
          enters from bottom

style kb-stats
  center, gap 64, padding 24 0
  text color muted, center

style kb-stat-value
  font "titles", size 56, weight 800, color accent, line-height 1
`,
  },

  Pricing: {
    params: 'plans, heading = ""',
    help: 'price cards; each plan has name, price, and maybe per, text, features (list), button, link, featured (true)',
    example: 'Pricing plans, "Prices"   // plans: [{ name: "Solo", price: "9 CHF", per: "/ month", features: ["1 site"], featured: true }]',
    source: `
component Pricing plans, heading = ""
  section id slug(heading)
    if heading
      subtitle heading, center
    grid 3 columns, gap 20
      for p in plans
        card kb-plan, current p.featured == true
          text p.name, bold
          row gap 6
            text p.price, kb-price
            if p.per
              text p.per
          if p.text
            text p.text
          if p.features
            list
              for f in p.features
                item f
          button p.button or "Choose", to p.link or "#contact", outline
          enters from bottom

style kb-plan
  padding 28, gap 14
  current border 2 accent, shadow medium
  text color muted
  item color ink

style kb-price
  font "titles", size 44, weight 800, color ink, line-height 1
`,
  },

  Testimonials: {
    params: 'items, heading = ""',
    help: 'quotes of customers; each item has quote, name, and maybe role, photo',
    example: 'Testimonials reviews, "They loved it"   // reviews: [{ quote: "Gorgeous.", name: "Ana", role: "Vevey" }]',
    source: `
component Testimonials items, heading = ""
  section id slug(heading)
    if heading
      subtitle heading, center
    grid 3 columns, gap 20
      for t in items
        card kb-quote
          text "“{t.quote}”"
          row gap 12
            if t.photo
              image t.photo, round, width 44, height 44
            column gap 0
              text t.name, bold
              if t.role
                text t.role, kb-muted
          enters from bottom

style kb-quote
  padding 28, gap 18
  text size 18

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
      subtitle heading, center
    grid 4 columns, gap 20
      for p in people
        column kb-person
          if p.photo
            image p.photo
          else
            row kb-avatar
              text p.name[0]
          text p.name, bold
          if p.role
            text p.role, kb-muted
          enters from bottom

style kb-person
  gap 4
  image radius 20, margin 0 0 8 0

style kb-avatar
  width 72, height 72, round, background accent, center, margin 0 0 8 0
  text color on-accent, font "titles", size 30, weight 800

style kb-muted
  color muted, size 15
`,
  },

  Logos: {
    params: 'images, heading = ""',
    help: 'a row of logos (customers, partners, press)',
    example: 'Logos ["acme.svg", "globex.svg"], "They trust us"',
    source: `
component Logos images, heading = ""
  section id slug(heading)
    if heading
      text heading, kb-logos-title
    row kb-logos
      for src in images
        image src, height 36

style kb-logos
  center, gap 48, padding 8 0
  image opacity 0.7, hover opacity 1

style kb-logos-title
  center, color muted, uppercase, tracking 1, size 13
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
      subtitle heading, center
    grid 3 columns, gap 12
      for src in images
        image src, kb-shot
          enters from bottom

style kb-shot
  radius 16, hover lift 4
`,
  },

  Faq: {
    params: 'items, heading = "Questions"',
    help: 'questions that open on click; each item has q and a',
    example: 'Faq faq   // faq: [{ q: "Do you deliver?", a: "Yes, every day." }]',
    source: `
component Faq items, heading = "Questions"
  section id slug(heading)
    column kb-faq
      if heading
        subtitle heading
      for f in items
        details f.q
          text f.a

style kb-faq
  max-width 760, margin 0 auto, gap 4
  text color muted
`,
  },

  Cta: {
    params: 'heading, intro = "", action = "", href = "#contact"',
    help: 'a colored band that asks for the next step',
    example: 'Cta "Ready to bloom?", "Order before noon, delivered tonight.", "Order now", "#shop"',
    source: `
component Cta heading, intro = "", action = "", href = "#contact"
  section id slug(heading)
    column kb-cta
      subtitle heading
      if intro
        text intro
      if action
        button action, to href, large

style kb-cta
  background accent, color on-accent, radius 28, padding 64 32, center, gap 16
  subtitle color on-accent, center
  text color on-accent, center
  button background on-accent, color accent
`,
  },

  Contact: {
    params: 'to, heading = "Contact", intro = "", thanks = "Thank you! We will answer soon."',
    help: 'a contact form (name, email, message) sent by e-mail to the address',
    example: 'Contact "hello@bloom.ch", "Write to us"',
    source: `
component Contact to, heading = "Contact", intro = "", thanks = "Thank you! We will answer soon."
  section contact
    column kb-contact
      subtitle heading
      if intro
        text intro
      if sent
        text thanks, bold
      else
        form mail to -> sent = true
          field name "Your name", required, label "Name"
          field email "you@example.com", type email, required, label "Email"
          textarea message "Your message", required, label "Message"
          button "Send", large

style kb-contact
  max-width 560, margin 0 auto, gap 14
  text color muted
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
