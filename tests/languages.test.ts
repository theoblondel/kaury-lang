import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, rmSync, mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { build } from '../src/cli/project.js'
import { compile, setLanguage } from '../src/core/index.js'

setLanguage('en')
const TMP = resolve('tests/.tmp')

const LINA = `site "Chez Lina"
  lang "fr", "en"
  url "https://lina.example"

let plats = [{ nom: "Pâtes fraîches", prix: 24 }, { nom: "Tiramisu", prix: 9 }]

page "/"
  header
    logo "Chez Lina"
    links Accueil, Carte
    languages
  section
    title "Bienvenue chez Lina"
    text "Des pâtes fraîches, un jardin, huit tables."
    field nom, "Votre prénom"
    text "Merci {nom} !"
    link "Voir la carte" "/carte"
    image "salle.jpg", "La salle du restaurant"

page "/carte"
  seo "La carte", "Ce que Lina cuisine cette semaine."
  title "La carte"
  for p in plats
    text "{p.nom} — {price(p.prix, "CHF")}"

translate "en"
  "Bienvenue chez Lina" "Welcome to Lina's"
  "Des pâtes fraîches, un jardin, huit tables." "Fresh pasta, a garden, eight tables."
  "Votre prénom" "Your first name"
  "Merci {nom} !" "Thank you {nom}!"
  "Voir la carte" "See the menu"
  "La salle du restaurant" "The dining room"
  "La carte" "The menu"
  "Ce que Lina cuisine cette semaine." "What Lina cooks this week."
  "Pâtes fraîches" "Fresh pasta"
  "Accueil" "Home"
  "Carte" "Menu"
`

async function site(name: string, code: string) {
  const dir = join(TMP, name)
  rmSync(dir, { recursive: true, force: true })
  mkdirSync(join(dir, 'public'), { recursive: true })
  writeFileSync(join(dir, 'site.kaury'), code)
  writeFileSync(join(dir, 'public', 'salle.jpg'), readFileSync(resolve('examples/crush/public/berry.webp')))
  const r = await build(join(dir, 'site.kaury'))
  const page = (p: string) => readFileSync(join(r.dir, p === '/' ? 'index.html' : join(p.slice(1), 'index.html')), 'utf8')
  return { r, page }
}

test('languages: the file is checked without an error or a warning when every text shown is translated', () => {
  const r = compile(LINA, { file: 'x.kaury' })
  assert.deepEqual(r.errors.map((e) => e.message), [])
  assert.deepEqual(r.warnings.map((e) => e.message), [])
})

test('languages: every page is built in each language, its texts translated, its links kept in its language', async () => {
  const { r, page } = await site('lang-lina', LINA)
  assert.deepEqual(r.pages.sort(), ['/', '/carte', '/en', '/en/carte'])
  const fr = page('/')
  const en = page('/en')
  assert.match(fr, /<html lang="fr"/)
  assert.match(en, /<html lang="en"/)
  assert.match(fr, />Bienvenue chez Lina</)
  assert.match(en, />Welcome to Lina's</)
  assert.match(en, />Fresh pasta, a garden, eight tables\.</)
  assert.match(en, /placeholder="Your first name"/)
  assert.match(en, /alt="The dining room"/)
  // an address of the site stays in the language of the page; a file does not move
  assert.match(fr, /href="\/carte">Voir la carte</)
  assert.match(en, /href="\/en\/carte">See the menu</)
  assert.match(en, /src="\/salle/)
  assert.doesNotMatch(en, /src="\/en\/salle/)
  // the menu: the home page and the page of the menu in the same language
  assert.match(en, /href="\/en\/"[^>]*>Home</)
  assert.match(en, /href="\/en\/carte"[^>]*>Menu</)
  // each page names its versions, for search engines
  assert.match(fr, /<link rel="alternate" hreflang="fr" href="https:\/\/lina.example\/"/)
  assert.match(fr, /<link rel="alternate" hreflang="en" href="https:\/\/lina.example\/en\/"/)
  assert.match(en, /<link rel="canonical" href="https:\/\/lina.example\/en\/"/)
  // the switch: the same page in the other language, the current one marked
  assert.match(en, /<nav class="k-languages[^"]*" aria-label="Language"><a class="k-language" href="\/" hreflang="fr" lang="fr" aria-label="Français">FR<\/a><a class="k-language" href="\/en\/" hreflang="en" lang="en" aria-label="English" aria-current="true">EN<\/a><\/nav>/)
  assert.match(fr, /aria-label="Langue"/)
  // a value of the file, a price in the language of the page, the SEO of the page
  const menuEn = page('/en/carte')
  assert.match(menuEn, />Fresh pasta — CHF\s?24\.00</)
  assert.match(menuEn, />Tiramisu — /)
  assert.match(menuEn, /<title>The menu · Chez Lina<\/title>/)
  assert.match(menuEn, /name="description" content="What Lina cooks this week\."/)
  assert.match(page('/carte'), />Pâtes fraîches — 24,00\sCHF</)
  assert.match(page('/carte'), /href="\/en\/carte\/" hreflang="en"|hreflang="en" href="https:\/\/lina.example\/en\/carte\/"/)
  // both versions in the sitemap
  const sitemap = readFileSync(join(r.dir, 'sitemap.xml'), 'utf8')
  assert.match(sitemap, /lina.example\/en\/carte\//)
  assert.ok(existsSync(join(r.dir, 'en', 'carte', 'index.html')))
})

test('languages: a text shown without its translation, a translation of nothing, a value it does not have', () => {
  const code = `site "Lina"
  lang "fr", "en"
page "/"
  title "Bienvenue"
  text "Une table ce soir ?"
  text "Merci {nom} !"
  field nom
translate "en"
  "Bienvenue" "Welcome"
  "Une table ce soir?" "A table tonight?"
  "Merci {nom} !" "Thanks {name}!"
`
  const r = compile(code, { file: 'x.kaury' })
  assert.deepEqual(r.errors.map((e) => [e.line, e.message]), [[11, 'the translation reads {name}, which the text it translates does not have.']])
  const warnings = r.warnings.map((e) => [e.line, e.message, e.fix])
  assert.deepEqual(warnings.find((w) => w[0] === 5)?.slice(1), ['"Une table ce soir ?" has no translation into "en": that page shows it as it is written.', 'add it to the block translate "en": "Une table ce soir ?" "…"'])
  assert.deepEqual(warnings.find((w) => w[0] === 10)?.slice(1), ['no text of the file says "Une table ce soir?": this translation into "en" is never used.', 'the file says "Une table ce soir ?": write it the same way, letter for letter.'])
})

test('languages: translate needs the languages of the site, and not the one of the file', () => {
  const one = compile('page "/"\n  title "Bonjour"\ntranslate "en"\n  "Bonjour" "Hello"\n', { file: 'x.kaury' })
  assert.match(one.errors[0].message, /the site has one language/)
  const first = compile('site "S"\n  lang "fr", "en"\npage "/"\n  title "Bonjour"\ntranslate "fr"\n  "Bonjour" "Bonjour"\n', { file: 'x.kaury' })
  assert.match(first.errors[0].message, /"fr" is the language the file is written in/)
  const other = compile('site "S"\n  lang "fr", "en"\npage "/"\n  title "Bonjour"\ntranslate "de"\n  "Bonjour" "Hallo"\n', { file: 'x.kaury' })
  assert.match(other.errors[0].message, /"de" is not one of the languages of the site/)
  assert.equal(other.errors[0].fix, 'lang "fr", "en", "de"')
})

test('languages: a site of one language is unchanged', () => {
  const r = compile('site "S"\n  lang "fr"\npage "/"\n  link "Carte" "/carte"\n', { file: 'x.kaury' })
  assert.match(r.js, /setAttribute\("href", "\/carte"\)/)
  assert.doesNotMatch(r.js, /\$k\.tr\(/)
})
