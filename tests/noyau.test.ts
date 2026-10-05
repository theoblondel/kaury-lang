import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execute, erreurs } from './outils-test.js'
import { lis } from '../src/noyau/lecteur.js'

const k = (s: TemplateStringsArray, ...v: unknown[]) => String.raw({ raw: s }, ...v).replace(/^\n/, '')

test('lecteur : indentation, textes, nombres avec unités, noms à tirets', () => {
  const j = lis('si prix-total > 2s\n  affiche "Total : {x}"\n')
  const types = j.map((t) => t.t)
  assert.deepEqual(types, ['mot', 'mot', 'op', 'nombre', 'ligne', 'indente', 'mot', 'texte', 'ligne', 'desindente', 'fin'])
  assert.equal(j[1].v, 'prix-total')
  assert.equal(j[3].unite, 's')
  assert.equal(j[7].morceaux?.[1].code, 'x')
})

test('exemple de la spécification : prix-total et livraison', async () => {
  const { sortie } = await execute(k`
soit panier = [{ prix: 20, quantite: 2 }, { prix: 15, quantite: 1 }]
fonction prix-total panier
  somme panier, a -> a.prix * a.quantite

si prix-total(panier) > 50
  livraison = 0
sinon
  livraison = 7
affiche prix-total(panier), livraison
`)
  assert.deepEqual(sortie, ['55 0'])
})

test('fonctions courtes, retour implicite, récursion', async () => {
  const { sortie } = await execute(k`
fonction double x puis x * 2
fonction factorielle n
  si n <= 1
    retourne 1
  n * factorielle(n - 1)
affiche double(21)
affiche factorielle(5)
`)
  assert.deepEqual(sortie, ['42', '120'])
})

test('boucles, intervalles, tant que, arrete', async () => {
  const { sortie } = await execute(k`
etat total = 0
pour i dans 1..4
  total += i
affiche total
soit n = 0
compte = 0
tant que compte < 10
  compte += 3
  si compte > 5 puis arrete
affiche compte
pour fruit, i dans ["a", "b"]
  affiche "{i}:{fruit}"
`)
  assert.deepEqual(sortie, ['10', '6', '0:a', '1:b'])
})

test('listes : méthodes en français', async () => {
  const { sortie } = await execute(k`
soit nombres = [5, 3, 8, 1]
affiche nombres.trie().joint("-")
affiche nombres.filtre(x -> x > 2).longueur
affiche nombres.transforme(x -> x * 10)
etat l = []
l.ajoute 4
l.ajoute 7
l.retire 4
affiche l, l.premier, l.dernier
affiche 3 dans nombres, 9 dans nombres
affiche "bonjour".majuscules()
`)
  assert.deepEqual(sortie, ['1-3-5-8', '3', '[50,30,80,10]', '[7] 7 7', 'true false', 'BONJOUR'])
})

test('objets, textes avec insertions, si en expression', async () => {
  const { sortie } = await execute(k`
soit produit = { nom: "Fraise", prix: 3.5, "prix-ttc": 3.78 }
soit age = 20
affiche "{produit.nom} coûte {produit.prix} CHF"
affiche si age >= 18 alors "adulte" sinon "enfant"
affiche produit.prix-ttc
affiche prix(produit.prix)
`)
  assert.equal(sortie[0], 'Fraise coûte 3.5 CHF')
  assert.equal(sortie[1], 'adulte')
  assert.equal(sortie[2], '3.78')
  assert.match(sortie[3], /3[.,]50/)
})

test('essaie / erreur', async () => {
  const { sortie } = await execute(k`
essaie
  soit x = rien
  affiche x.nom.longueur
erreur e
  affiche "attrapé"
`)
  assert.deepEqual(sortie, ['attrapé'])
})

test('alias anglais : let, if, for, function', async () => {
  const { sortie } = await execute(k`
let names = ["Ada", "Linus"]
function greet name then "Hi {name}"
for n in names
  if n.length > 3
    print greet(n)
  else
    print "short"
`)
  assert.deepEqual(sortie, ['short', 'Hi Linus'])
})

test('réactivité : un dérivé suit les états', async () => {
  const { sortie } = await execute(k`
etat prix = 10
etat quantite = 2
soit total = prix * quantite
affiche total
quantite = 5
affiche total
`)
  assert.deepEqual(sortie, ['20', '50'])
})

test('attends : attente et fonctions asynchrones', async () => {
  const { sortie } = await execute(k`
fonction lent x
  attends 10ms
  x + 1
affiche attends lent(1)
`)
  assert.deepEqual(sortie, ['2'])
})

test('bloc js brut', async () => {
  const { sortie } = await execute(k`
soit a = 2
js
  const b = a * 21; console.log(String(b))
`)
  assert.deepEqual(sortie, ['42'])
})

test('les réglages ne confondent pas leurs mots avec des couleurs (lumiere nuit)', () => {
  assert.deepEqual(erreurs('page "/"\n  scene\n    lumiere nuit\n    objet "a.glb"\n'), [])
})

// ---------------- erreurs : chaque faute courante a un message clair ----------------
const cas: [string, string, RegExp][] = [
  ['tabulation', 'si vrai\n\taffiche 1\n', /tabulation/],
  ['guillemets simples', "affiche 'salut'\n", /guillemets doubles/],
  ['nom mal écrit', 'etat compteur = 0\naffiche compteurr\n', /tu voulais dire « compteur »/],
  ['= au lieu de ==', 'soit x = 3\nsi x = 3\n  affiche x\n', /==/],
  ['soit modifié', 'soit x = 3\nx = 4\n', /etat x/],
  ['texte non fermé', 'affiche "salut\n', /jamais refermé/],
  ['option mal écrite', 'page "/"\n  titre "x", tialle 3\n', /taille/],
  ['lumière inconnue', 'page "/"\n  scene\n    lumiere disco\n', /lumière inconnue/],
  ['composant inconnu', 'page "/"\n  Cartee "x"\n', /n'existe pas/],
  ['page sans /', 'page "boutique"\n  titre "x"\n', /commence par « \/ »/],
  ['tourne vite', 'page "/"\n  objet "a.glb"\n    tourne vite\n', /attend une vitesse/],
  ['sinon seul', 'sinon\n  affiche 1\n', /sans « si »/],
  ['etat sans =', 'etat compteur\n', /il manque « = »/],
  ['soustraction collée', 'soit a = 3\nsoit b = 1\naffiche a-b\n', /a - b/],
  ['parenthèse non fermée', 'affiche (1 + 2\n', /jamais refermé/],
  ['indentation orpheline', 'affiche 1\n    affiche 2\n', /indent/],
  ['élément en milieu de ligne', 'soit x = titre\n', /début de ligne/],
  ['au sans action', 'page "/"\n  bouton "x"\n    au clic\n', /->/],
  ['fichier objet inconnu', 'page "/"\n  objet "a.docx"\n', /format de fichier/],
  ['composant en minuscule', 'composant carte x\n  texte x\n', /majuscule/],
  ['élément mal écrit avec bloc', 'page "/"\n  secion\n    texte "x"\n', /« section »/],
  ['élément mal écrit', 'page "/"\n  tittre "Salut"\n', /l'élément « titre »/],
]
for (const [nom, src, attendu] of cas) {
  test(`erreur claire : ${nom}`, () => {
    const e = erreurs(src)
    assert.ok(e.length > 0, `aucune erreur pour : ${src}`)
    assert.match(e.join('\n'), attendu)
    assert.match(e[0], /Essaie :|^Erreur/m)
  })
}
