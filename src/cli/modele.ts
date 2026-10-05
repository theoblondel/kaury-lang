// Le projet créé par « kaury nouveau ».

export function modeleNouveauSite(nom: string): Record<string, string> {
  const titre = nom.replace(/[-_]+/g, ' ').replace(/^\w/, (x) => x.toUpperCase())
  return {
    'site.kaury': `// ${titre} — tout le site est dans ce fichier.
// Modifie, enregistre : la page se recharge toute seule.

site "${titre}"
  couleurs accent #FF4F8B, creme #FFF6EE
  police "Satoshi"
  langue "fr"

etat likes = 0

page "/"
  seo "${titre}", "Un site fait avec Kaury."
  style fond creme

  section entete
    logo "${titre}"
    liens Accueil, Idees, Contact

  section plein-ecran, centre
    titre "Bonjour, ${titre}", taille 88
      entre depuis bas
    texte "Ton premier site en Kaury. Une ligne = une idée."
      entre depuis bas
    objet etoile "etoile.svg", taille 0.6
      flotte
      suit souris, doux
      au clic -> saute
    bouton "J'aime ({likes})", grand -> likes += 1

  section idees
    sous-titre "Trois idées"
    grille 3 colonnes, espace 24
      pour idee dans idees
        carte idee.nom, idee.texte
          entre depuis bas
          style survol monte 6, ombre douce

  section contact, centre
    sous-titre "On se parle ?"
    formulaire -> merci = vrai
      champ email "Ton e-mail", type email, requis
      bouton "Envoyer"
    si merci
      texte "Merci, à très vite !"

  pied
    texte "Fait avec Kaury"

soit idees = [
  { nom: "Court", texte: "Deux fois moins de lignes qu'en JavaScript." },
  { nom: "Réactif", texte: "Un état change, la page suit toute seule." },
  { nom: "Immersif", texte: "Un objet 3D s'ajoute comme un titre." }
]
`,
    'public/etoile.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FF8FB3"/><stop offset="1" stop-color="#FF4F8B"/></linearGradient></defs><path d="M50 4l13.6 29.4L96 37.6 72 60l6.2 32.4L50 76.6 21.8 92.4 28 60 4 37.6l32.4-4.2z" fill="url(#g)"/></svg>`,
    '.gitignore': 'dist/\n.kaury-cache/\nnode_modules/\n',
    'README.md': `# ${titre}

Site écrit en [Kaury](https://kaury.dev).

\`\`\`
kaury dev      # aperçu en direct
kaury build    # site final dans dist/
\`\`\`

Les images, modèles 3D (.glb) et sons vont dans \`public/\`.
`,
  }
}
