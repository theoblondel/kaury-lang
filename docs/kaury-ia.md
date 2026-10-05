# Kaury — spécification pour les IA (v0.1)

Tu écris du **Kaury**, un langage qui produit des sites web complets et immersifs. Un fichier `.kaury` contient tout : logique, structure, style, 3D. Respecte exactement les règles ci-dessous ; en cas de doute, choisis la forme la plus simple.

## 1. Syntaxe

- Un bloc = une ligne suivie de lignes indentées de **2 espaces**. Jamais de tabulation, jamais d'accolade de bloc, jamais de `;`.
- Commentaire : `// texte`.
- Texte : uniquement entre guillemets doubles `"…"`. Insertion : `"Bonjour {nom}, total {prix * 2}"`. Accolade littérale : `\{`.
- Nombres : `12`, `3.5`, `-4`. Unités collées : `24px`, `2s`, `300ms`, `50%`, `100vh`, `90deg`, `20/s`.
- Noms : lettres, chiffres, tirets (`prix-total`). **Soustraction : toujours avec espaces** `a - b` (sinon `a-b` est un nom).
- Valeurs : `vrai`, `faux`, `rien`, listes `[1, 2]`, objets `{ nom: "Fraise", prix: 3 }`.
- Opérateurs : `+ - * / % **`, comparaison `== != < > <= >=`, logique `et ou non`, appartenance `x dans liste`, intervalle `1..5` (inclus).
- Appel : `f(a, b)` ou sans parenthèses en début d'expression : `affiche total`, `somme panier, a -> a.prix`.
- Fonction anonyme : `x -> x * 2`, `(a, b) -> a + b`, `-> compteur += 1`.
- Condition en expression : `si age >= 18 alors "adulte" sinon "enfant"`.
- Chaque mot-clé a un alias anglais (`soit`/`let`, `si`/`if`, `pour`/`for`, `dans`/`in`, `fonction`/`function`, `page`, `titre`/`title`…). Les accents sont acceptés (`état` = `etat`). Écris de préférence en français.

## 2. Noyau

```
soit tva = 8.1                 // valeur fixe (ne change jamais)
etat compteur = 0              // état réactif : quand il change, la page suit
soit total = prix * quantite   // si l'expression lit un état, c'est un dérivé recalculé tout seul
livraison = 7                  // affectation ; crée la variable si elle n'existe pas
compteur += 1

fonction double x puis x * 2   // une ligne
fonction prix-total panier     // bloc ; la dernière ligne est la valeur rendue
  somme panier, a -> a.prix * a.quantite

si total > 50
  livraison = 0
sinon si total > 20
  livraison = 4
sinon
  livraison = 7
si x > 3 puis affiche x        // forme courte

pour p dans produits           // aussi : pour p, i dans produits   /   pour i dans 1..10
  affiche p.nom
tant que vies > 0
  vies -= 1
arrete / continue / retourne valeur

essaie
  donnees = attends charge "/api/produits"
erreur e
  affiche e.message

importe confetti de "canvas-confetti"     // n'importe quel paquet npm
importe { Carte } de "./carte.kaury"
exporte composant Carte nom

js                                        // JavaScript brut, si vraiment nécessaire
  console.log("bonjour")
```

**Fonctions intégrées** : `affiche`, `charge url` (JSON/texte), `envoie url, donnees`, `somme liste[, fn]`, `moyenne`, `minimum`, `maximum`, `arrondi x, decimales`, `plancher`, `plafond`, `absolu`, `racine`, `aleatoire a, b`, `hasard liste`, `longueur x`, `maintenant()`, `en-texte`, `en-nombre`, `prix 12.5` (→ « 12.50 CHF »), `format-date d`, `melange`, `intervalle a, b`, `repete 2s, -> …`, `plus-tard 1s, -> …`, `memorise "cle", etat` (garde un état dans le navigateur), `copie texte`, `confettis()`, `vibre`, `defile "id-section"`, `partage {…}`, `attends 2s`.

**Méthodes** (listes, textes, objets) : `.ajoute x`, `.retire x` (ou fonction), `.vide()`, `.filtre fn`, `.transforme fn`, `.trie fn`, `.inverse()`, `.trouve fn`, `.contient x`, `.joint ", "`, `.chaque fn`, `.compte fn`, `.unique()`, `.prends n`, `.somme fn`, `.majuscules()`, `.minuscules()`, `.remplace a, b`, `.coupe sep`, `.commence-par x`, `.finit-par x`, `.nettoie()`, `.insere i, x`, `.mets-a-jour {…}`. Propriétés : `.longueur`, `.premier`, `.dernier`, `.cles`, `.valeurs`.

**Valeurs réactives globales** : `souris.x`/`souris.y` (−1 à 1), `defilement` (0 à 1), `ecran.largeur`, `ecran.mobile`, `route.chemin`, `route.params`.

## 3. Le web

```
site "Crush"                                   // réglages globaux (facultatif)
  couleurs rose #FF4F8B, creme #FFF4E8          // noms utilisables partout : fond rose
  police "Clash Display"                        // Google Fonts ou Fontshare, chargée seule
  langue "fr"
  style fond creme, couleur #222                // couleurs de tout le site
  transition fondu                              // fondu | glisse | zoom | rideau | aucune
  seo "Crush", "Mocktails en canette", image "partage.jpg"

page "/"                                       // une page = une adresse ; "/produit/:id" → variable id
  seo "Accueil", "Description pour Google"
  style fond creme
  section entete                               // nom de section = son id (#entete)
    logo "logo.svg"
    liens Accueil, Gouts, Boutique              // liens auto : #gouts si la section existe, sinon /boutique
  section plein-ecran, centre
    titre "Goûte la différence", taille 80, rose
```

**Ligne d'interface** : `élément contenu, option, option valeur, …` puis, indentés dessous, ses enfants, ses `style`, ses mouvements et ses événements. Une couleur seule (`rose`, `#FF4F8B`) colore le texte des textes et le fond des blocs.

| Élément | Contenu | Exemple |
|---|---|---|
| `section [nom]`, `entete`, `pied`, `nav`, `boite`, `colonne`, `ligne`, `grille` | enfants | `grille 3 colonnes, espace 24` |
| `titre`, `sous-titre`, `texte`, `element`, `icone` | texte | `titre "Salut {nom}", taille 64` |
| `image source[, description]` | | `image "photo.jpg", "Une canette", coins 16` |
| `video source` | options `auto boucle muet controles couvre` | `video "film.mp4", auto, boucle` |
| `lien texte adresse` | `nouvel` = nouvel onglet | `lien "Contact" "/contact"` |
| `liens A, B, C` | menu | `liens Accueil, Gouts` |
| `logo source-ou-texte` | lien vers l'accueil | `logo "crush.svg"` |
| `bouton texte` | `-> action`, `vers "/page"`, `contour`, `discret`, `grand`, `petit`, `desactive cond` | `bouton "J'aime {n}" -> n += 1` |
| `carte [titre] [image] [texte]` | bloc carte | `carte "Fraise" "fraise.png"` |
| `formulaire` | `-> action` à l'envoi | voir ci-dessous |
| `champ etat indication`, `zone`, `choix etat options…`, `case etat texte` | liés à l'état (créé s'il n'existe pas) | `champ email "Ton e-mail", type email, requis` |
| `liste` / `element` | puces | |
| `separateur`, `espaceur 48` | | |
| `contenu` | dans un composant : où va ce qu'on met entre ses lignes | |

**Options de style** (sur la ligne de l'élément ou dans `style …`) : `fond c`, `couleur c`, `police "X"`, `taille n`, `gras`, `leger`, `poids n`, `italique`, `souligne`, `majuscules`, `interligne n`, `lettres n`, `aligne gauche|centre|droite`, `centre`, `coins n`, `rond`, `ombre douce|moyenne|forte|aucune`, `bordure n c`, `marge n…`, `remplissage n…`, `espace n`, `largeur n`, `hauteur n`, `max-largeur n`, `min-hauteur n`, `plein-ecran`, `pleine-largeur`, `opacite n`, `flou n`, `verre`, `degrade c1 c2 [angle]`, `texte-degrade c1 c2`, `colonnes n` (ou `3 colonnes`), `direction ligne|colonne`, `cache`, `colle` (reste en haut), `devant`, `curseur main`, `survol …` (tout ce qui suit sur la ligne s'applique au survol : `survol monte 4, ombre forte`), `monte n`, `grossit n`, `penche n`, `anime fondu|monte|zoom`.
Nombres sans unité = pixels. Écrans : `mobile …`, `tablette …`, `ordinateur …` (options pour cette taille ; avec un bloc dessous = contenu affiché seulement là).

**Interactions** : `-> action` sur la ligne (clic ; envoi pour un formulaire ; saisie pour un champ), ou en ligne enfant `au clic -> …`, `au survol -> …`, `au chargement -> …`, `au defilement -> …`. Une action peut être une ligne ou un bloc indenté après `->`. `ouvre menu` / `ferme menu` / `bascule menu` règlent un état vrai/faux. `aller "/page"` change de page.

**Conditions et boucles dans la page** : `si`, `sinon si`, `sinon`, `pour … dans …` produisent de l'interface et se mettent à jour seuls.

**Données** : `produits = attends charge "/api/produits"` dans une page n'empêche pas l'affichage ; la liste se remplit quand les données arrivent.

**Composants** :
```
composant Carte nom image
  carte
    image image, coins 16
    texte nom, gras
  style ombre douce, survol monte 4
// utilisation : Carte "Fraise" "fraise.png"   ou   Carte p.nom, p.photo
```
Nom en Majuscule. Paramètres dans l'ordre. Ce qu'on indente sous un appel va à l'endroit marqué `contenu`.

**Formulaire** :
```
formulaire -> envoye = vrai
  champ email "Ton e-mail", type email, requis, etiquette "E-mail"
  case accepte "J'accepte les conditions"
  bouton "Envoyer"
si envoye
  texte "Merci {email} !"
```

## 4. L'immersion

Niveaux : une **touche** (un `objet` seul dans la page), une **scène** (`scene` avec décor, lumière, caméra), un **univers** (tout le site). Un objet peut être 2D (`.png .jpg .webp .svg`), animé 2D (`.json` Lottie) ou 3D (`.glb .gltf`). Le code est le même.

```
scene accueil, plein-ecran, particules bulles      // particules etoiles|neige|bulles|poussiere|confettis
  lumiere studio                                    // studio|douce|coucher-de-soleil|nuit|neon|jour|dramatique
  camera suit souris                                // fixe|suit souris|vol|libre|orbite
  objet canette "crush.glb", taille 1.2, position 2 0 0
    tourne au defilement                            // aussi : tourne, tourne 90/s, tourne lent, tourne x
    suit souris, doux
    au clic -> saute
  personnage mascotte "mascotte.glb"                // objet avec animations nommées
    entre depuis droite                             // gauche|droite|haut|bas|fondu|zoom
    dit "Salut !"
    au clic -> joue "danse"
  titre "Goûte la différence"                       // le contenu d'une scène passe devant la 3D
```

Mouvements (en ligne enfant = permanent ; après `->` = une fois) : `tourne`, `flotte`, `saute`, `pulse`, `balance`, `suit souris`, `entre depuis …`, `parallaxe 0.3`, `dit "texte"`, `joue "animation"`. Modificateurs : `doux`, `lent`, `rapide`, `inverse`. Viser un objet nommé : `-> saute canette`.
Options d'objet : `taille`, `position x y z`, `rotation x y z`, `hauteur` (objet seul), `secours "image.png"` (si l'appareil ne fait pas de 3D), `ombres`, `texte "description"` (accessibilité et Google), `anime "nom"` (personnage). Options de scène : `hauteur`, `fond`, `brouillard`, `sol`, `particules`.
Son : `son "ambiance.mp3", boucle, volume 0.4` (un bouton muet apparaît seul) ; en action : `-> son "clic.mp3"`.

Règles automatiques : la 3D ne se charge que si la page en contient et quand elle devient visible ; le contenu HTML existe avant la 3D ; mouvement réduit respecté ; écran étroit = caméra reculée.

## 5. Règles d'or pour écrire du Kaury correct

1. Un élément d'interface est toujours **en début de ligne** ; ses options sont séparées par des **virgules**.
2. Pour qu'une valeur change à l'écran, déclare-la avec `etat` (ou laisse une affectation `x = …` dans la page la créer).
3. Les fichiers (images, `.glb`, sons) vont dans `public/` et s'écrivent sans `/` : `"photo.jpg"`.
4. `==` compare, `=` range. `soit` ne se modifie jamais.
5. Les lambdas dans une ligne d'interface vont entre parenthèses : `texte (liste.filtre(x -> x.actif)).longueur`.
6. Un nom de variable identique à une option (ex. `taille`) se met entre parenthèses dans une ligne d'interface : `texte (taille)`.

## 6. Exemple complet

```
site "Fleurs"
  couleurs accent #E93D82, creme #FFF6EE
  police "Satoshi"

etat panier = []
soit total = somme panier, b -> b.prix
soit bouquets = [
  { nom: "Pivoines", prix: 45, image: "pivoines.jpg" },
  { nom: "Tulipes", prix: 30, image: "tulipes.jpg" }
]

composant Bouquet b
  carte b.nom, b.image
    texte prix(b.prix), gras
    bouton "Ajouter" -> panier.ajoute b
  style survol monte 6, ombre douce

page "/"
  seo "Fleurs", "Bouquets livrés à Vevey"
  style fond creme
  section entete
    logo "Fleurs"
    liens Bouquets, Contact
  scene plein-ecran, particules poussiere
    lumiere douce
    objet "fleur.glb", taille 1.4
      tourne lent
      suit souris, doux
    titre "Des fleurs qui parlent", taille 72
  section bouquets
    grille 3 colonnes, espace 24
      pour b dans bouquets
        Bouquet b
    texte "Panier : {panier.longueur} bouquet(s), {prix(total)}"
```
