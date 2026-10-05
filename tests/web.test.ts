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

test('les exemples de la documentation compilent sans erreur', async () => {
  const blocs = (f: string) => readFileSync(f, 'utf8').split('```').filter((_, i) => i % 2 === 1).filter((b) => !/^(bash|\w+\n)/.test(b))
  const readme = blocs('README.md')[0]
  const ia = readFileSync('docs/kaury-ia.md', 'utf8').split('## 6. Exemple complet')[1].split('```')[1]
  for (const [nom, code] of [['README', readme], ['kaury-ia exemple complet', ia]]) {
    const r = compile(code.replace(/^\n/, ''), { fichier: nom })
    assert.deepEqual(r.erreurs.map((e) => e.formate(code)), [], nom)
  }
})

test('kaury verifie --json : sortie lisible par une IA', async () => {
  const { execFileSync } = await import('node:child_process')
  const f = join(TMP, 'faux.kaury')
  writeFileSync(f, 'etat compteur = 0\naffiche compteurr\n')
  let sortie = ''
  try {
    execFileSync(process.execPath, ['bin/kaury.js', 'verifie', f, '--json'], { encoding: 'utf8' })
  } catch (e: any) {
    sortie = e.stdout
  }
  const j = JSON.parse(sortie)
  assert.equal(j.ok, false)
  assert.equal(j.problemes[0].ligne, 2)
  assert.match(j.problemes[0].essaie, /compteur/)
})

test('les tournures de kaury-ia.md compilent', () => {
  const morceaux = [
    'etat compteur = 0\nrepete 2s, -> compteur += 1\n',
    'etat menu = faux\npage "/"\n  bouton "Menu" -> bascule menu\n  si menu\n    texte "ouvert"\n',
    'soit liste = [{ actif: vrai }]\npage "/"\n  texte (liste.filtre(x -> x.actif)).longueur\n',
    'soit taille = 3\npage "/"\n  texte (taille)\n',
    'page "/"\n  scene\n    objet canette "c.glb"\n    bouton "Saute" -> saute canette\n',
    'page "/"\n  personnage p "m.glb"\n    au clic -> joue "danse"\n    dit "Salut !"\n',
    'page "/"\n  son "a.mp3", boucle, volume 0.4\n  bouton "Clic" -> son "clic.mp3"\n',
    'page "/produit/:id"\n  produit = attends charge "/api/produits/{id}"\n  si produit\n    titre produit.nom\n',
    'composant Boite titre\n  boite\n    sous-titre titre\n    contenu\npage "/"\n  Boite "Salut"\n    texte "dedans"\n',
    'page "/"\n  section\n    style survol monte 4, ombre forte\n    mobile cache\n',
    'page "/"\n  grille 3 colonnes\n    tablette 2 colonnes\n    mobile 1 colonne\n',
    'importe confetti de "canvas-confetti"\npage "/"\n  bouton "Fête" -> confetti()\n',
    'page "/"\n  au chargement -> affiche "prêt"\n  au defilement -> affiche defilement\n',
    'site "X"\n  adresse "https://x.ch"\n  transition glisse\npage "/"\n  titre "x"\n',
  ]
  for (const m of morceaux) {
    const r = compile(m, { fichier: 'm.kaury' })
    assert.deepEqual(r.erreurs.map((e) => e.formate(m)), [], m)
  }
})

test('rendu serveur : composant avec contenu, si/pour réactifs', async () => {
  const { rendsPage } = await import('../src/runtime/index.js')
  const { installeSSR, serialise } = await import('../src/runtime/ssr.js')
  const { execute } = await import('./outils-test.js')
  const { module } = await execute([
    'etat fruits = ["pomme", "kiwi"]',
    'composant Boite titre',
    '  boite',
    '    sous-titre titre',
    '    contenu',
    'page "/"',
    '  Boite "Panier"',
    '    pour f, i dans fruits',
    '      texte "{i + 1}. {f}"',
    '    si fruits.longueur > 1',
    '      texte "plusieurs"',
    '',
  ].join('\n'))
  const doc = installeSSR()
  const cible = doc.createElement('div')
  rendsPage(module, '/', cible)
  const html = serialise(cible)
  assert.match(html, /<h2 class="k-sous-titre">Panier<\/h2>/)
  assert.match(html, /1\. pomme.*2\. kiwi.*plusieurs/s)
  assert.match(html, /class="k-boite k-contenu"|k-contenu/)
})
