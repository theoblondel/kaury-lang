// The project created by « kaury new ».

export function newSiteTemplate(name: string): Record<string, string> {
  const title = name.replace(/[-_]+/g, ' ').replace(/^\w/, (x) => x.toUpperCase())
  return {
    'site.kaury': `// ${title} — the whole site is in this file.
// Edit, save: the page reloads by itself.

site "${title}"
  colors accent #FF4F8B, cream #FFF6EE
  font "Satoshi"
  lang "en"

state likes = 0

page "/"
  seo "${title}", "A site made with Kaury."
  style background cream

  section header
    logo "${title}"
    links Home, Ideas, Contact

  section hero, fullscreen, center
    title "Hello, ${title}", size 88
      enters from bottom
    text "Your first Kaury site. One line = one idea."
    object star "star.svg", size 0.6
      float
      follows mouse, smooth
      on click -> jump
    button "I like it ({likes})", large -> likes += 1

  section ideas
    subtitle "Three ideas"
    grid 3 columns, gap 24
      for idea in ideas
        card idea.name, idea.text
          enters from bottom
          style hover lift 6, shadow soft

  section contact, center
    subtitle "Let's talk?"
    form -> sent = true
      field email "Your email", type email, required, label "Email"
      button "Send"
    if sent
      text "Thanks, talk soon!"

  footer
    text "Made with Kaury"

let ideas = [
  { name: "Short", text: "Half the lines of JavaScript." },
  { name: "Reactive", text: "A state changes, the page follows." },
  { name: "Immersive", text: "A 3D object is added like a title." }
]
`,
    'public/star.svg': `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FF8FB3"/><stop offset="1" stop-color="#FF4F8B"/></linearGradient></defs><path d="M50 4l13.6 29.4L96 37.6 72 60l6.2 32.4L50 76.6 21.8 92.4 28 60 4 37.6l32.4-4.2z" fill="url(#g)"/></svg>`,
    '.gitignore': 'dist/\n.kaury-cache/\nnode_modules/\n',
    'README.md': `# ${title}

A site written in [Kaury](https://kaury.dev).

\`\`\`
kaury dev      # live preview
kaury build    # final site in dist/
\`\`\`

Images, 3D models (.glb) and sounds go in \`public/\`.
`,
  }
}
