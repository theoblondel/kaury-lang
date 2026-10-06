// The project created by “kaury new”: a small site that teaches the language when you read it,
// plus what AI assistants need to write Kaury in it (AGENTS.md and the spec).

export function newSiteTemplate(name: string, spec?: string): Record<string, string> {
  const title = name.replace(/[-_]+/g, ' ').replace(/^\w/, (x) => x.toUpperCase())
  const files: Record<string, string> = {
    'site.kaury': `// ${title} — the whole site is in this file.
// Run "kaury dev", edit, save: the page reloads by itself.

// 1. Settings of the whole site
site "${title}"
  colors accent #F56E2E, cream #F6F1E7, ink #1C1A1A
  fonts "Satoshi", "Cabinet Grotesk"     // text, titles (downloaded at build time)
  lang "en"
  style background cream, color ink

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
    '.gitignore': 'dist/\n.kaury-cache/\nnode_modules/\n',
    'README.md': `# ${title}

A site written in [Kaury](https://kaury.dev): logic, structure, style and 3D in \`site.kaury\`.

\`\`\`bash
kaury dev      # live preview on http://localhost:3000
kaury check    # checks the code without building
kaury build    # the final, optimized site in dist/
\`\`\`

Images, 3D models (\`.glb\`) and sounds go in \`public/\`.
`,
    'AGENTS.md': `# Instructions for AI assistants

This project is written in **Kaury**, a language for websites (\`.kaury\` files). It is not JavaScript, HTML or CSS.

1. Read \`kaury-ai.md\` (in this folder) before writing any Kaury: it is the complete specification.
2. The whole site is in \`site.kaury\`. Images and 3D models go in \`public/\`.
3. After every change, run \`kaury check --json\` and fix every problem it reports (each one has the line, the column and a fix).
4. Never add CSS, HTML or JavaScript files: named styles (\`style name\`), animations (\`animation name\`) and the elements of the spec cover everything.
5. Preview with \`kaury dev\`; build with \`kaury build\`.
`,
  }
  if (spec) files['kaury-ai.md'] = spec
  return files
}
