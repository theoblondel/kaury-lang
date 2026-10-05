import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync, rmSync, mkdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { construis } from '../src/cli/projet.js'
import { compile } from '../src/noyau/index.js'

const TMP = resolve('tests/.tmp')

test('construction du site Crush : HTML rendu côté serveur, liens automatiques', async () => {
  const sortie = join(TMP, 'crush-dist')
  rmSync(sortie, { recursive: true, force: true })
  const r = await construis(resolve('exemples/crush/site.kaury'), { sortie })
  assert.deepEqual(r.pages.sort(), ['/', '/histoire', '/panier'])
  const html = readFileSync(join(sortie, 'index.html'), 'utf8')
  // le contenu existe avant la 3D (SEO)
  assert.match(html, /<h1 class="k-titre[^"]*">Goûte la différence<\/h1>/)
  assert.match(html, /Berry Crush/)
  assert.match(html, /<title>Crush — mocktails en canette · Crush<\/title>/)
  assert.match(html, /name="description" content="Quatre recettes/)
  // liens automatiques : section de la page, autre page
  assert.match(html, /href="#gouts">Gouts</)
  assert.match(html, /href="\/histoire">Histoire</)
  assert.match(html, /href="\/panier">Panier</)
  // l'objet 3D est un emplacement léger, avec son nom accessible
  assert.match(html, /class="k-objet k-personnage k-3d[^"]*"[^>]*aria-label="Kaury, la mascotte de Crush"/)
  assert.ok(existsSync(join(sortie, 'histoire', 'index.html')))
  assert.ok(existsSync(join(sortie, 'mascotte.glb')))
  const css = readFileSync(join(sortie, '_kaury', r.collecte.css.size ? (await import('node:fs')).readdirSync(join(sortie, '_kaury')).find((f) => f.endsWith('.css'))! : ''), 'utf8')
  assert.match(css, /--k-accent:#EA4374/)
})

test('une page sans immersion ne charge aucune bibliothèque 3D', async () => {
  const dossier = join(TMP, 'simple')
  rmSync(dossier, { recursive: true, force: true })
  mkdirSync(dossier, { recursive: true })
  writeFileSync(join(dossier, 'site.kaury'), 'page "/"\n  titre "Bonjour"\n')
  const r = await construis(join(dossier, 'site.kaury'))
  const html = readFileSync(join(r.dossier, 'index.html'), 'utf8')
  const js = /src="\/_kaury\/(site-[^"]+\.js)"/.exec(html)![1]
  const code = readFileSync(join(r.dossier, '_kaury', js), 'utf8')
  assert.doesNotMatch(code, /WebGLRenderer/)
  assert.ok(code.length < 60_000, `le JS de base pèse ${code.length} octets`)
})

test('le traducteur produit du CSS mobile et des classes stables', () => {
  const r = compile('page "/"\n  grille 3 colonnes, espace 24\n    mobile 1 colonne\n    texte "a"\n', { fichier: 'x.kaury' })
  assert.ok(r.ok)
  assert.match(r.css, /@media \(max-width: 640px\)\{(\.[\w-]+){2}\{--k-colonnes:1;grid-template-columns:repeat\(1, minmax\(0, 1fr\)\)\}\}/)
})

test('pages à paramètres : /produit/:id', async () => {
  const { trouvePage, rendsPage } = await import('../src/runtime/index.js')
  const { installeSSR, serialise } = await import('../src/runtime/ssr.js')
  const { execute } = await import('./outils-test.js')
  const { module } = await execute('page "/produit/:id"\n  titre "Produit {id}"\n')
  const r = trouvePage(module.$pages, '/produit/42')
  assert.equal(r?.params.id, '42')
  const doc = installeSSR()
  const cible = doc.createElement('div')
  rendsPage(module, '/produit/42', cible)
  assert.match(serialise(cible), /Produit 42/)
})
