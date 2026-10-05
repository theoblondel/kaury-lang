# Kaury

**Un langage complet comme JavaScript, deux fois plus court, et le seul qui rend l'immersion aussi simple qu'un titre.**

```
etat compteur = 0

page "/"
  style fond creme, police "Clash Display"

  section entete
    logo "crush.svg"
    liens Accueil, Gouts, Boutique

  scene plein-ecran, particules bulles
    lumiere coucher-de-soleil
    objet canette "crush.glb"
      tourne au defilement
      suit souris, doux
    titre "Goûte la différence", taille 80, rose

  section
    bouton "J'aime {compteur}" -> compteur += 1
      style fond rose, coins 12
```

Logique, structure, style et 3D vivent dans le même fichier. On découpe par morceau du site (page, composant), jamais par technique.

## Démarrer

```bash
npm install -g kaury
kaury nouveau mon-site
cd mon-site
kaury dev
```

| Commande | Rôle |
|---|---|
| `kaury nouveau mon-site` | crée un projet prêt à l'emploi |
| `kaury dev` | affiche le site et le recharge à chaque modification |
| `kaury build` | produit le site final, optimisé, dans `dist/` |
| `kaury verifie [--json]` | vérifie le code sans construire (`--json` pour les IA) |
| `kaury lance calcul.kaury` | exécute un programme sans page |
| `kaury traduit site.kaury` | montre le JavaScript produit |
| `kaury publie --netlify` | construit puis met en ligne |

## Ce que Kaury fait pour toi

- **Réactif par défaut** : `etat` change → la page suit. `soit total = prix * quantite` se recalcule tout seul.
- **Erreurs en clair**, avec la ligne, le mot souligné et la correction (« tu voulais dire « compteur » ? »).
- **HTML lisible par Google** : chaque page est rendue côté serveur, même les pages immersives.
- **Mobile par défaut** : grilles qui se replient, titres qui s'adaptent, caméra 3D qui recule sur écran étroit.
- **3D légère** : Three.js n'est chargé que sur les pages qui contiennent un objet 3D, et seulement quand il devient visible. Modèles `.glb` compressés (Meshopt, Draco) acceptés.
- **Ouvert sur JavaScript** : `importe confetti de "canvas-confetti"`, et un bloc `js` pour le reste.
- **Bilingue** : chaque mot-clé a un alias anglais (`si`/`if`, `pour`/`for`, `titre`/`title`).
- **Pensé pour les IA** : [`docs/kaury-ia.md`](docs/kaury-ia.md) se colle tel quel dans Claude, ChatGPT ou Cursor.

## Comment ça marche

```
.kaury → 1. lecteur → 2. analyseur → 3. vérificateur → 4. traducteur → HTML + CSS + JS
                                                         5. boîte à outils d'immersion (Three.js, Lottie), chargée à la demande
```

| Dossier | Contenu |
|---|---|
| `src/noyau/` | lecteur, analyseur, vérificateur, traducteur (TypeScript, tourne aussi dans le navigateur) |
| `src/runtime/` | réactivité, DOM, routeur, mouvements, rendu serveur |
| `src/immersion/` | 3D (Three.js), Lottie, particules |
| `src/cli/` | la commande `kaury` |
| `exemples/` | Crush (site immersif complet), démarrage, fleurs |
| `docs/` | spécification pour les IA |
| `editeurs/vscode/` | coloration et extension VS Code |
| `tests/` | `npm test` |

## Développer Kaury

```bash
npm install
npm test                 # tests du noyau, des erreurs et de la construction
npm run kaury -- dev exemples/crush/site.kaury
npm run construit        # dist/ (commande) + terrain/kaury-compilateur.js
```

Licence MIT.
