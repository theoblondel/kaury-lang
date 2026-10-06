// The projects created by “kaury new”: a site to start from, plus what AI assistants need to write Kaury in it
// (AGENTS.md and the spec). « starter » teaches the language when you read it; the others are real sites
// made of the ready-made blocks (Hero, Pricing, Contact…), their texts in content/ files.

export const TEMPLATES: Record<string, string> = {
  starter: 'a small site that teaches the language (state, styles, 3D, a form)',
  landing: 'a business landing page: hero, features, prices, reviews, questions, contact by e-mail',
  blog: 'a blog: posts written in Markdown, one page each, ready for Google and AI assistants',
  portfolio: 'a portfolio: your work in a gallery, how you work, what clients say, contact',
}

export function newSiteTemplate(name: string, spec?: string, template = 'starter'): Record<string, string> {
  const title = name.replace(/[-_]+/g, ' ').replace(/^\w/, (x) => x.toUpperCase())
  const make = { starter, landing, blog, portfolio }[template as 'starter'] ?? starter
  const files: Record<string, string> = {
    ...make(title),
    '.gitignore': 'dist/\n.kaury-cache/\nnode_modules/\n.env\n',
    'README.md': readme(title, template),
    'AGENTS.md': `# Instructions for AI assistants

This project is written in **Kaury**, a language for websites (\`.kaury\` files). It is not JavaScript, HTML or CSS.

1. Read \`kaury-ai.md\` (in this folder) before writing any Kaury: it is the complete specification.
2. The whole site is in \`site.kaury\`; texts may live in \`content/\` (YAML, Markdown). Images and 3D models go in \`public/\`.
3. After every change, run \`kaury check --json\` and fix every problem it reports (each one has the line, the column and a fix).
4. Never add CSS, HTML or JavaScript files: named styles (\`style name\`), animations (\`animation name\`), the ready-made blocks (\`Hero\`, \`Pricing\`, \`Contact\`…) and the elements of the spec cover everything.
5. Preview with \`kaury dev\`; build with \`kaury build\`.
`,
  }
  if (spec) files['kaury-ai.md'] = spec
  return files
}

const SITE = (title: string, colors = 'accent #F56E2E, cream #F6F1E7, ink #1C1A1A') => `site "${title}"
  colors ${colors}
  fonts "Satoshi", "Cabinet Grotesk"     // text, titles (downloaded at build time)
  lang "en"
  style background cream, color ink`

function readme(title: string, template: string): string {
  const mail = template === 'landing' || template === 'portfolio'
  return `# ${title}

A site written in [Kaury](https://kaury.dev): logic, structure, style and 3D in \`site.kaury\`.

\`\`\`bash
kaury dev      # live preview on http://localhost:3000
kaury check    # checks the code without building
kaury build    # the final, optimized site in dist/
\`\`\`

${template === 'starter' ? 'Images, 3D models (`.glb`) and sounds go in `public/`.' : 'The texts are in `content/`: change them there, the page follows. Images go in `public/`.'}
${mail ? `
## The contact form

It sends an e-mail to the address written in \`site.kaury\` (\`Contact "you@example.com"\`).

- With \`kaury dev\`, the e-mail is shown in the terminal.
- To really send it, create a free key on [resend.com](https://resend.com) and set \`KAURY_MAIL_KEY\` where the site is hosted (Netlify, Vercel or Cloudflare Pages), or in a \`.env\` file to try it locally.
- \`kaury build\` writes the small function that sends it for each of these hosts (\`netlify/\`, \`api/\`, \`functions/\`): keep these folders in the repository.
- On a host you fill by FTP (Apache + PHP), copy \`dist/\` as usual and put a file \`kaury-mail-key.txt\` holding the key next to the site's folder, never inside it.
` : ''}`
}

// ---------------------------------------------------------------- starter
function starter(title: string): Record<string, string> {
  return {
    'site.kaury': `// ${title} — the whole site is in this file.
// Run "kaury dev", edit, save: the page reloads by itself.

// 1. Settings of the whole site
${SITE(title)}

// 2. Data and state
state likes = 0
let ideas = [
  { name: "Short", text: "One line is one idea." },
  { name: "Reactive", text: "A state changes, the page follows." },
  { name: "Immersive", text: "3D is a word, like title." }
]

// 3. Your own words: a named style, used below as « card-soft »
style card-soft
  background white, radius 20, padding 24, gap 8
  hover lift 6, shadow medium

// 4. Pages
page "/"
  seo "${title}", "A site made with Kaury."

  section header
    logo "${title}"
    links Ideas, Contact

  section hero, fullscreen, center
    title "Hello, *${title}*.", size 88
      enters from bottom
    text "Your first Kaury site. Click the knot."
    object "knot", color accent, metal, height 320
      spin slow
      follows mouse, smooth
      on click -> likes += 1
    button "I like it ({likes})", large -> likes += 1

  section ideas
    subtitle "Three ideas"
    grid 3 columns, gap 24
      for idea in ideas
        column card-soft
          subtitle idea.name, level 3
          text idea.text
          enters from bottom

  section contact, center
    subtitle "Let's talk?"
    form -> sent = true
      field email "you@example.com", type email, required, label "Email"
      button "Send"
    if sent
      text "Thanks, talk soon!"

  footer
    text "Made with Kaury"
`,
  }
}

// ---------------------------------------------------------------- landing
function landing(title: string): Record<string, string> {
  return {
    'site.kaury': `// ${title} — a landing page made of ready-made blocks: Hero, Features, Pricing, Contact…
// The texts are in content/home.yaml. Each block is a Kaury component:
// write your own « component Pricing plans, heading » in this file and it replaces the built-in one.

import home from "./content/home.yaml"

${SITE(title)}
  seo "${title}", home.description

// questions and answers, also given to Google and AI assistants
let faq-ld = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: home.faq.map(f -> { "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })
}

page "/"
  head json-ld(faq-ld)

  section header
    logo "${title}"
    links Features, Prices, Contact

  Hero home.hero.title, home.hero.text, home.hero.button, "#prices"
  Logos home.logos, "They trust us"
  Features home.features, "Features"
  Stats home.stats
  Steps home.steps, "How it works"
  Pricing home.plans, "Prices"
  Testimonials home.reviews, "What they say"
  Faq home.faq
  Cta home.cta.title, home.cta.text, home.cta.button
  Contact "hello@example.com", "Contact", "We answer within a day."
  Footer "${title}", "Made with Kaury"
`,
    'content/home.yaml': `description: ${title} makes your mornings simple. Try it free for 14 days.

hero:
  title: Mornings, *made simple*.
  text: ${title} plans your day while the coffee brews. No setup, no account to create.
  button: See the prices

logos: [logo-1.svg, logo-2.svg, logo-3.svg]

features:
  - icon: "⚡"
    title: Fast
    text: Ready in two minutes, from any device.
  - icon: "🔒"
    title: Private
    text: Your data stays yours. Nothing is sold, ever.
  - icon: "💬"
    title: Human
    text: A real person answers within a day.

stats:
  - value: 12k
    label: happy users
  - value: "4.9"
    label: average rating
  - value: 2 min
    label: to start

steps:
  - title: Sign up
    text: Your e-mail, nothing else.
  - title: Choose
    text: Pick what matters to you.
  - title: Enjoy
    text: Your day, planned every morning.

plans:
  - name: Free
    price: 0 CHF
    features: [1 calendar, E-mail support]
  - name: Pro
    price: 9 CHF
    per: / month
    features: [5 calendars, Priority support, Reminders]
    featured: true
    button: Start free
  - name: Team
    price: 29 CHF
    per: / month
    features: [Unlimited calendars, 10 people, Phone support]

reviews:
  - quote: I have not missed a meeting since.
    name: Ana
    role: Designer
  - quote: Simple, and it just works.
    name: Luc
    role: Teacher
  - quote: The best 9 francs I spend each month.
    name: Mia
    role: Founder

faq:
  - q: Can I try it for free?
    a: Yes, the Free plan is free forever, and Pro is free for 14 days.
  - q: Can I cancel at any time?
    a: Yes, in one click, and you keep your data.
  - q: Where is my data stored?
    a: In Switzerland, encrypted.

cta:
  title: Ready for simpler mornings?
  text: Free for 14 days. No card needed.
  button: Start now
`,
    'public/logo-1.svg': logoSvg('NORTH'),
    'public/logo-2.svg': logoSvg('lumen'),
    'public/logo-3.svg': logoSvg('Oak&Co'),
  }
}

// ---------------------------------------------------------------- blog
function blog(title: string): Record<string, string> {
  return {
    'site.kaury': `// ${title} — a blog. Each post is a Markdown file in content/posts/: add one, a page appears.

import posts from "./content/posts/*.md"

${SITE(title)}
  seo "${title}", "Notes on things worth sharing."

let articles = posts.sort(p -> p.date).reverse()

style post-card
  padding 28, gap 8, hover lift 4
  text color muted

style meta
  color muted, size 14

page "/"
  section header
    logo "${title}"
    links About

  Hero "Notes worth *sharing*.", "A new post every week. Short, useful, honest."

  section posts
    grid 2 columns, gap 20
      for post in articles
        card post-card
          text "{format-date post.date} · {post.minutes} min", meta
          subtitle post.title, level 2, size 26
          text post.description
          link "Read →" "/{post.slug}/"
          enters from bottom

  section about, max-width 720
    subtitle "About"
    text "${title} is written by one person, for people who like short and clear things."

  Footer "${title}", "Made with Kaury"

page "/{post.slug}" for post in posts
  seo post.title, post.description
  head json-ld({ "@context": "https://schema.org", "@type": "BlogPosting", headline: post.title, description: post.description, datePublished: post.date })
  section header
    logo "${title}"
    links About
  section article, max-width 760
    link "← All posts" "/"
    text "{format-date post.date} · {post.minutes} min", meta
    title post.title, size 52
    markdown post.body
  Footer "${title}", "Made with Kaury"
`,
    'content/posts/hello-world.md': `---
title: Hello, world
description: Why this blog exists, and what you will find here.
date: 2026-10-01
minutes: 2
---

Welcome! This is the first post. It is a **Markdown** file: \`content/posts/hello-world.md\`.

## Writing a post

1. Create a file in \`content/posts/\`, for example \`my-trip.md\`.
2. Fill the lines between the \`---\` (title, description, date, minutes).
3. Write below them. The page \`/my-trip/\` appears by itself.
`,
    'content/posts/small-things.md': `---
title: Small things, done well
description: Three habits that make a big difference over a year.
date: 2026-10-05
minutes: 3
---

Most progress is boring. That is good news: boring things can be repeated.

## Three habits

- **Write it down.** A note today saves an hour next month.
- **Finish small.** A finished small thing beats an unfinished big one.
- **Share it.** Explaining something is the best way to understand it.

> Do the small things well, and the big things take care of themselves.
`,
  }
}

// ---------------------------------------------------------------- portfolio
function portfolio(title: string): Record<string, string> {
  const shapes: Record<string, string> = {}
  const palette = [['#F56E2E', '#F6D365'], ['#1C1A1A', '#F56E2E'], ['#3D5C3D', '#E9DDB9'], ['#A83E0D', '#F1E8CB'], ['#14213D', '#7CC4FA'], ['#E93D82', '#FFF4E8']]
  palette.forEach(([a, b], i) => (shapes[`public/work/${i + 1}.svg`] = workSvg(a, b, i)))
  return {
    'site.kaury': `// ${title} — a portfolio. The texts are in content/portfolio.yaml, the pictures in public/work/.

import data from "./content/portfolio.yaml"

${SITE(title, 'accent #1C1A1A, cream #F6F1E7, ink #1C1A1A, orange #F56E2E')}
  seo "${title}", data.description

style emphasis
  italic, color orange

page "/"
  section header
    logo "${title}"
    links Work, Contact

  Hero data.hero.title, data.hero.text, "Let's work together", "#contact"
  Gallery data.work, "Work"
  Steps data.process, "How I work"
  Testimonials data.reviews, "Clients"
  Contact "hello@example.com", "Contact", "Tell me about your project."
  Footer "${title}", data.place
`,
    'content/portfolio.yaml': `description: ${title} — design for brands that want to be remembered.
place: Based in Vevey, working everywhere

hero:
  title: I design brands people *remember*.
  text: Logos, websites and everything in between, for small companies with big ideas.

work: [work/1.svg, work/2.svg, work/3.svg, work/4.svg, work/5.svg, work/6.svg]

process:
  - title: Listen
    text: A call to understand you, your clients and your goals.
  - title: Make
    text: Two directions, one chosen together, refined until it is right.
  - title: Deliver
    text: All the files, a short guide, and help when you need it.

reviews:
  - quote: We finally look like who we are.
    name: Sara
    role: Café owner
  - quote: Fast, clear, and a joy to work with.
    name: Marc
    role: Architect
  - quote: Our sales went up the month after.
    name: Ines
    role: Shop owner
`,
    ...shapes,
  }
}

function logoSvg(word: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="140" height="36" viewBox="0 0 140 36"><text x="70" y="25" text-anchor="middle" font-family="Georgia, serif" font-size="22" font-weight="700" fill="#1C1A1A">${word.replace(/&/g, '&amp;')}</text></svg>\n`
}

function workSvg(a: string, b: string, i: number): string {
  const shape = [
    `<circle cx="400" cy="300" r="190" fill="${b}"/>`,
    `<rect x="210" y="110" width="380" height="380" rx="40" fill="${b}" transform="rotate(12 400 300)"/>`,
    `<path d="M400 90 L640 500 L160 500 Z" fill="${b}"/>`,
    `<circle cx="320" cy="300" r="170" fill="${b}"/><circle cx="500" cy="300" r="170" fill="${a}" stroke="${b}" stroke-width="24"/>`,
    `<rect x="140" y="240" width="520" height="120" rx="60" fill="${b}"/><circle cx="400" cy="300" r="90" fill="${a}"/>`,
    `<path d="M150 450 C 250 100, 550 100, 650 450" stroke="${b}" stroke-width="60" fill="none" stroke-linecap="round"/>`,
  ][i % 6]
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600"><rect width="800" height="600" fill="${a}"/>${shape}</svg>\n`
}
