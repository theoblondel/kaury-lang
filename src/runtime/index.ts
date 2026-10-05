// Runtime Kaury : tout ce que le code produit par le compilateur appelle via « $k. ».

export { etat, derive, effet, lot, racine, sansSuivi, reactif, brut, auNettoyage, Cellule, Derive } from './reactif.js'
export {
  t, affiche, charge, envoie, somme, moyenne, minimum, maximum, arrondi, plancher, plafond, absolu, racine as racineCarree,
  aleatoire, hasard, longueur, maintenant, enTexte, enNombre, prix, formatDate, melange, intervalle, enListe, delai,
  repete, plusTard, memorise, copie, vibre, defile, partage, egal, dans, prop, m, confettis, ErreurReseau,
} from './outils.js'
export {
  h, fragment, unique, texte, attr, style, px, sur, si, pour, composant, contenu, classeRacine, lie, lieCase, options,
  etiquette, formulaire, lienAuto, resousLiens, estNavigateur, slug, chemin,
} from './dom.js'
export {
  souris, defilement, ecran, route, objets, objetNomme, objet, scene, scenePrete, reglage, son, joueSon, mouvement, action,
  dit, corpsDe, demarreGlobaux,
} from './mouvements.js'
export { demarre, aller, seo, rendsPage, trouvePage } from './routeur.js'
export { STYLE_DE_BASE } from './style.js'

import { definisSignaleur } from './reactif.js'
import { definisSignale } from './outils.js'

/** Affiche une erreur clairement (dans la console, et à l'écran en développement). */
export function signale(e: unknown) {
  const msg = e instanceof Error ? e.message : String(e)
  console.error('Kaury :', e)
  const g = globalThis as any
  if (g.__kauryDev && typeof document !== 'undefined' && document.body) {
    let boite = document.querySelector('.k-erreur-dev') as HTMLElement | null
    if (!boite) {
      boite = document.createElement('div')
      boite.className = 'k-erreur-dev'
      boite.addEventListener('click', () => boite!.remove())
      document.body.append(boite)
    }
    boite.innerHTML = `<b>Erreur pendant l'exécution</b>\n${msg.replace(/</g, '&lt;')}\n\n<small>(clique pour fermer)</small>`
  }
}
definisSignaleur(signale)
definisSignale(signale)
