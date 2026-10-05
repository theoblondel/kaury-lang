// Le vocabulaire de l'interface : éléments, options de style, couleurs, mouvements.
// Une seule source de vérité, lue par le vérificateur, le traducteur, la doc et l'extension VS Code.

import { sansAccents } from './mots.js'

// ---------------- Couleurs ----------------
export const COULEURS: Record<string, string> = {
  rouge: '#e5484d', orange: '#f76b15', jaune: '#ffc53d', vert: '#30a46c', bleu: '#0090ff',
  violet: '#8e4ec6', rose: '#e93d82', noir: '#111111', blanc: '#ffffff', gris: '#8b8d98',
  creme: '#fff4e8', beige: '#efe3cf', marron: '#8a5a3b', turquoise: '#12a594', or: '#d4a72c',
  argent: '#c0c4cc', marine: '#14213d', corail: '#ff7f61', menthe: '#7fe0c0', lavande: '#b9a6ef',
  ciel: '#7cc4fa', sable: '#e9d8b4', ardoise: '#3c4454', nuit: '#0b1020', transparent: 'transparent',
}
const COULEURS_EN: Record<string, string> = {
  red: 'rouge', yellow: 'jaune', green: 'vert', blue: 'bleu', purple: 'violet', pink: 'rose', black: 'noir',
  white: 'blanc', grey: 'gris', gray: 'gris', cream: 'creme', brown: 'marron', teal: 'turquoise', gold: 'or',
  silver: 'argent', navy: 'marine', coral: 'corail', mint: 'menthe', lavender: 'lavande', sky: 'ciel',
  sand: 'sable', slate: 'ardoise', night: 'nuit',
}
export function couleurConnue(mot: string): string | undefined {
  const m = sansAccents(mot).toLowerCase()
  if (m in COULEURS) return m
  if (m in COULEURS_EN) return COULEURS_EN[m]
  return undefined
}

// ---------------- Options ----------------
// Type de valeur attendu : n = nombre (px par défaut), c = couleur, t = texte, m = mot parmi une liste, e = expression
export interface SpecOption {
  args: string // ex. « n » , « c », « nn? », « » (drapeau), « m », « * » (n'importe)
  mots?: string[] // valeurs autorisées pour « m »
  alias?: string[]
  aide: string
  exemple: string
}

export const STYLES: Record<string, SpecOption> = {
  fond: { args: 'e', alias: ['background', 'bg'], aide: 'couleur, dégradé ou image de fond', exemple: 'fond creme' },
  couleur: { args: 'c', alias: ['color'], aide: 'couleur du texte', exemple: 'couleur #333' },
  police: { args: 't', alias: ['font'], aide: 'police de caractères', exemple: 'police "Clash Display"' },
  taille: { args: 'n', alias: ['size'], aide: 'taille du texte (ou de l\'objet)', exemple: 'taille 24' },
  gras: { args: '', alias: ['bold'], aide: 'texte en gras', exemple: 'gras' },
  leger: { args: '', alias: ['light'], aide: 'texte fin', exemple: 'leger' },
  poids: { args: 'n', alias: ['weight'], aide: 'épaisseur du texte (100 à 900)', exemple: 'poids 600' },
  italique: { args: '', alias: ['italic'], aide: 'texte en italique', exemple: 'italique' },
  souligne: { args: '', alias: ['underline'], aide: 'texte souligné', exemple: 'souligne' },
  majuscules: { args: '', alias: ['uppercase', 'caps'], aide: 'texte en majuscules', exemple: 'majuscules' },
  interligne: { args: 'n', alias: ['line-height'], aide: 'hauteur de ligne (1.5 = une fois et demie)', exemple: 'interligne 1.6' },
  lettres: { args: 'n', alias: ['letter-spacing', 'tracking'], aide: 'espace entre les lettres', exemple: 'lettres 2' },
  aligne: { args: 'm', mots: ['gauche', 'centre', 'droite', 'justifie'], alias: ['align'], aide: 'alignement du texte', exemple: 'aligne centre' },
  centre: { args: '', alias: ['center', 'centered'], aide: 'centre le contenu', exemple: 'centre' },
  coins: { args: 'n', alias: ['radius', 'rounded'], aide: 'arrondi des coins', exemple: 'coins 12' },
  rond: { args: '', alias: ['round', 'pill'], aide: 'coins complètement ronds', exemple: 'rond' },
  ombre: { args: 'm?', mots: ['douce', 'moyenne', 'forte', 'aucune', 'interieure'], alias: ['shadow'], aide: 'ombre portée', exemple: 'ombre douce' },
  bordure: { args: 'n?c?', alias: ['border'], aide: 'bordure (épaisseur, couleur)', exemple: 'bordure 1 gris' },
  marge: { args: 'nnnn', alias: ['margin'], aide: 'espace autour (1 à 4 valeurs)', exemple: 'marge 24' },
  remplissage: { args: 'nnnn', alias: ['padding', 'interieur'], aide: 'espace intérieur (1 à 4 valeurs)', exemple: 'remplissage 32' },
  espace: { args: 'n', alias: ['gap', 'spacing'], aide: 'espace entre les enfants', exemple: 'espace 24' },
  largeur: { args: 'n', alias: ['width'], aide: 'largeur', exemple: 'largeur 320' },
  hauteur: { args: 'n', alias: ['height'], aide: 'hauteur', exemple: 'hauteur 400' },
  'max-largeur': { args: 'n', alias: ['max-width'], aide: 'largeur maximale', exemple: 'max-largeur 720' },
  'min-hauteur': { args: 'n', alias: ['min-height'], aide: 'hauteur minimale', exemple: 'min-hauteur 300' },
  'plein-ecran': { args: '', alias: ['fullscreen', 'full'], aide: 'occupe toute la hauteur de l\'écran', exemple: 'plein-ecran' },
  'pleine-largeur': { args: '', alias: ['full-width', 'bleed'], aide: 'occupe toute la largeur, sans marges', exemple: 'pleine-largeur' },
  opacite: { args: 'n', alias: ['opacity'], aide: 'opacité de 0 à 1', exemple: 'opacite 0.8' },
  flou: { args: 'n', alias: ['blur'], aide: 'flou', exemple: 'flou 8' },
  verre: { args: '', alias: ['glass'], aide: 'effet verre dépoli', exemple: 'verre' },
  degrade: { args: 'cc?c?n?', alias: ['gradient'], aide: 'fond en dégradé (2 ou 3 couleurs, angle)', exemple: 'degrade rose orange' },
  'texte-degrade': { args: 'cc?c?', alias: ['text-gradient'], aide: 'texte en dégradé', exemple: 'texte-degrade rose violet' },
  colonnes: { args: 'n', alias: ['columns', 'cols', 'colonne'], aide: 'nombre de colonnes', exemple: 'grille 3 colonnes' },
  direction: { args: 'm', mots: ['ligne', 'colonne'], alias: ['direction'], aide: 'sens des enfants', exemple: 'direction ligne' },
  cache: { args: '', alias: ['hidden', 'hide'], aide: 'cache l\'élément', exemple: 'mobile cache' },
  colle: { args: '', alias: ['sticky'], aide: 'reste collé en haut au défilement', exemple: 'colle' },
  devant: { args: '', alias: ['front'], aide: 'passe devant les autres éléments', exemple: 'devant' },
  curseur: { args: 'm', mots: ['main', 'fleche', 'texte', 'aucun'], alias: ['cursor'], aide: 'forme du curseur', exemple: 'curseur main' },
  survol: { args: '*', alias: ['hover'], aide: 'style quand la souris passe dessus', exemple: 'survol monte 4' },
  monte: { args: 'n', alias: ['lift'], aide: 'décale vers le haut', exemple: 'survol monte 4' },
  grossit: { args: 'n?', alias: ['grow', 'scale'], aide: 'agrandit (1.1 = +10 %)', exemple: 'survol grossit 1.05' },
  penche: { args: 'n', alias: ['tilt'], aide: 'incline (degrés)', exemple: 'penche -3' },
  fond_image: { args: 't', aide: '', exemple: '' },
  anime: { args: 'm', mots: ['fondu', 'monte', 'zoom', 'gauche', 'droite'], alias: ['animate'], aide: 'apparition simple', exemple: 'anime fondu' },
}

/** Options propres à certains éléments (en plus des styles). */
export const OPTIONS_ELEMENTS: Record<string, Record<string, SpecOption>> = {
  titre: { niveau: { args: 'n', alias: ['level'], aide: 'niveau du titre (1 à 6)', exemple: 'niveau 2' } },
  image: {
    texte: { args: 't', alias: ['alt'], aide: 'description pour l\'accessibilité', exemple: 'texte "Une canette"' },
    couvre: { args: '', alias: ['cover'], aide: 'remplit la zone en recadrant', exemple: 'couvre' },
  },
  video: {
    boucle: { args: '', alias: ['loop'], aide: 'rejoue en boucle', exemple: 'boucle' },
    muet: { args: '', alias: ['muted'], aide: 'sans le son', exemple: 'muet' },
    auto: { args: '', alias: ['autoplay'], aide: 'démarre seule (muette)', exemple: 'auto' },
    controles: { args: '', alias: ['controls'], aide: 'affiche les boutons', exemple: 'controles' },
    couvre: { args: '', alias: ['cover'], aide: 'remplit la zone', exemple: 'couvre' },
  },
  bouton: {
    vers: { args: 't', alias: ['to', 'href'], aide: 'emmène vers une page', exemple: 'vers "/boutique"' },
    contour: { args: '', alias: ['outline'], aide: 'bouton avec contour seul', exemple: 'contour' },
    discret: { args: '', alias: ['ghost', 'subtle'], aide: 'bouton discret', exemple: 'discret' },
    grand: { args: '', alias: ['large'], aide: 'grand bouton', exemple: 'grand' },
    petit: { args: '', alias: ['small'], aide: 'petit bouton', exemple: 'petit' },
    desactive: { args: 'e?', alias: ['disabled'], aide: 'désactivé (si la condition est vraie)', exemple: 'desactive panier.longueur == 0' },
  },
  lien: { nouvel: { args: '', alias: ['new-tab', 'blank'], aide: 'ouvre dans un nouvel onglet', exemple: 'nouvel' } },
  champ: {
    type: { args: 'm', mots: ['texte', 'email', 'nombre', 'motdepasse', 'date', 'tel', 'url', 'recherche'], alias: ['type'], aide: 'genre de champ', exemple: 'type email' },
    requis: { args: '', alias: ['required'], aide: 'obligatoire', exemple: 'requis' },
    etiquette: { args: 't', alias: ['label'], aide: 'texte au-dessus du champ', exemple: 'etiquette "Ton e-mail"' },
  },
  zone: {
    requis: { args: '', alias: ['required'], aide: 'obligatoire', exemple: 'requis' },
    etiquette: { args: 't', alias: ['label'], aide: 'texte au-dessus', exemple: 'etiquette "Message"' },
    lignes: { args: 'n', alias: ['rows'], aide: 'hauteur en lignes', exemple: 'lignes 5' },
  },
  choix: { etiquette: { args: 't', alias: ['label'], aide: 'texte au-dessus', exemple: 'etiquette "Taille"' } },
  section: {},
  seo: { image: { args: 't', alias: [], aide: 'image de partage (1200×630)', exemple: 'image "partage.jpg"' } },
  // ---- immersion ----
  objet: {
    position: { args: 'nnn?', alias: [], aide: 'position x y (z)', exemple: 'position 0 1 0' },
    rotation: { args: 'nnn?', alias: [], aide: 'rotation en degrés x y z', exemple: 'rotation 0 45 0' },
    taille: { args: 'n', alias: ['size', 'scale'], aide: 'taille de l\'objet (1 = normale)', exemple: 'taille 1.5' },
    hauteur: { args: 'n', alias: ['height'], aide: 'hauteur de la zone (objet seul)', exemple: 'hauteur 500' },
    secours: { args: 't', alias: ['fallback'], aide: 'image si l\'appareil ne peut pas afficher la 3D', exemple: 'secours "canette.png"' },
    ombres: { args: '', alias: ['shadows'], aide: 'l\'objet projette une ombre au sol', exemple: 'ombres' },
    texte: { args: 't', alias: ['alt'], aide: 'description pour l\'accessibilité et Google', exemple: 'texte "Canette Crush fraise"' },
  },
  scene: {
    hauteur: { args: 'n', alias: ['height'], aide: 'hauteur de la scène', exemple: 'hauteur 600' },
    fond: { args: 'e', alias: ['background'], aide: 'fond de la scène', exemple: 'fond nuit' },
    brouillard: { args: 'c?', alias: ['fog'], aide: 'brouillard de profondeur', exemple: 'brouillard' },
    sol: { args: 'c?', alias: ['ground', 'floor'], aide: 'ajoute un sol qui reçoit les ombres', exemple: 'sol' },
    particules: { args: 'm?n?', mots: ['etoiles', 'neige', 'bulles', 'poussiere', 'confettis'], alias: ['particles'], aide: 'particules d\'ambiance', exemple: 'particules etoiles' },
  },
  lumiere: {},
  camera: {
    distance: { args: 'n', alias: [], aide: 'recul de la caméra', exemple: 'distance 6' },
  },
  son: {
    boucle: { args: '', alias: ['loop'], aide: 'joue en boucle', exemple: 'boucle' },
    volume: { args: 'n', alias: [], aide: 'volume de 0 à 1', exemple: 'volume 0.4' },
  },
}
OPTIONS_ELEMENTS.personnage = { ...OPTIONS_ELEMENTS.objet, anime: { args: 't', alias: ['animation'], aide: 'animation jouée au départ', exemple: 'anime "attend"' } }
OPTIONS_ELEMENTS['sous-titre'] = OPTIONS_ELEMENTS.titre

// Réglages des mouvements
export const MOUVEMENTS: Record<string, SpecOption> = {
  tourne: { args: '*', aide: 'tourne sur lui-même : tourne, tourne 90/s, tourne au defilement, tourne x', exemple: 'tourne au defilement' },
  flotte: { args: '*', aide: 'flotte doucement : flotte, flotte 0.3', exemple: 'flotte' },
  saute: { args: '*', aide: 'saute (une fois en action, sinon régulièrement)', exemple: 'au clic -> saute' },
  pulse: { args: '*', aide: 'grossit et rétrécit en rythme', exemple: 'pulse' },
  balance: { args: '*', aide: 'se balance de gauche à droite', exemple: 'balance' },
  'suit-souris': { args: '*', aide: 'réagit à la souris : suit souris, doux', exemple: 'suit souris, doux' },
  'entre-depuis': { args: '*', aide: 'apparition : gauche, droite, haut, bas, fondu, zoom', exemple: 'entre depuis gauche' },
  parallaxe: { args: '*', aide: 'bouge plus ou moins vite que le défilement', exemple: 'parallaxe 0.3' },
  dit: { args: '*', aide: 'bulle de dialogue', exemple: 'dit "Salut !"' },
  joue: { args: '*', aide: 'joue une animation nommée', exemple: 'joue "danse"' },
}

export const MOTS_MOUVEMENT = new Set(['doux', 'rapide', 'lent', 'x', 'y', 'z', 'au', 'defilement', 'gauche', 'droite', 'haut', 'bas', 'fondu', 'zoom', 'inverse', 'boucle'])

export const LUMIERES = ['studio', 'douce', 'coucher-de-soleil', 'nuit', 'neon', 'jour', 'dramatique']
export const CAMERAS = ['fixe', 'suit-souris', 'vol', 'libre', 'orbite']
export const TRANSITIONS = ['fondu', 'glisse', 'zoom', 'rideau', 'aucune']

// ---------------- Éléments ----------------
export interface SpecElement {
  balise: string
  genre: 'conteneur' | 'texte' | 'media' | 'champ' | 'special' | 'immersion'
  positionnels: string // décrit ce qu'on attend
  aide: string
  exemple: string
}

export const ELEMENTS: Record<string, SpecElement> = {
  section: { balise: 'section', genre: 'conteneur', positionnels: '[nom]', aide: 'une partie de la page', exemple: 'section gouts' },
  entete: { balise: 'header', genre: 'conteneur', positionnels: '', aide: 'en-tête du site', exemple: 'entete' },
  pied: { balise: 'footer', genre: 'conteneur', positionnels: '', aide: 'pied de page', exemple: 'pied' },
  nav: { balise: 'nav', genre: 'conteneur', positionnels: '', aide: 'navigation', exemple: 'nav' },
  grille: { balise: 'div', genre: 'conteneur', positionnels: '', aide: 'grille de colonnes', exemple: 'grille 3 colonnes, espace 24' },
  colonne: { balise: 'div', genre: 'conteneur', positionnels: '', aide: 'empile ses enfants verticalement', exemple: 'colonne espace 12' },
  ligne: { balise: 'div', genre: 'conteneur', positionnels: '', aide: 'aligne ses enfants côte à côte', exemple: 'ligne espace 12' },
  boite: { balise: 'div', genre: 'conteneur', positionnels: '', aide: 'conteneur simple', exemple: 'boite remplissage 24' },
  carte: { balise: 'article', genre: 'conteneur', positionnels: '[titre] [image]', aide: 'carte (image + texte)', exemple: 'carte "Fraise" "fraise.png"' },
  titre: { balise: 'h1', genre: 'texte', positionnels: 'texte', aide: 'titre principal', exemple: 'titre "Bonjour", taille 64' },
  'sous-titre': { balise: 'h2', genre: 'texte', positionnels: 'texte', aide: 'titre secondaire', exemple: 'sous-titre "Nos goûts"' },
  texte: { balise: 'p', genre: 'texte', positionnels: 'texte', aide: 'paragraphe', exemple: 'texte "Bienvenue {nom}"' },
  image: { balise: 'img', genre: 'media', positionnels: 'source [description]', aide: 'image', exemple: 'image "photo.jpg", coins 16' },
  video: { balise: 'video', genre: 'media', positionnels: 'source', aide: 'vidéo', exemple: 'video "film.mp4", auto, boucle' },
  lien: { balise: 'a', genre: 'texte', positionnels: 'texte adresse', aide: 'lien', exemple: 'lien "Contact" "/contact"' },
  liens: { balise: 'nav', genre: 'special', positionnels: 'texte, texte…', aide: 'menu de liens', exemple: 'liens Accueil, Gouts, Boutique' },
  logo: { balise: 'a', genre: 'special', positionnels: 'image ou texte', aide: 'logo cliquable vers l\'accueil', exemple: 'logo "crush.svg"' },
  bouton: { balise: 'button', genre: 'texte', positionnels: 'texte', aide: 'bouton', exemple: 'bouton "Acheter" -> panier.ajoute canette' },
  formulaire: { balise: 'form', genre: 'conteneur', positionnels: '', aide: 'formulaire (-> action à l\'envoi)', exemple: 'formulaire -> envoie "/api", { email }' },
  champ: { balise: 'input', genre: 'champ', positionnels: 'etat [indication]', aide: 'champ de saisie lié à un état', exemple: 'champ email "Ton e-mail", type email' },
  zone: { balise: 'textarea', genre: 'champ', positionnels: 'etat [indication]', aide: 'zone de texte', exemple: 'zone message "Ton message"' },
  choix: { balise: 'select', genre: 'champ', positionnels: 'etat options…', aide: 'liste déroulante', exemple: 'choix taille "S", "M", "L"' },
  case: { balise: 'input', genre: 'champ', positionnels: 'etat texte', aide: 'case à cocher', exemple: 'case accepte "J\'accepte"' },
  liste: { balise: 'ul', genre: 'conteneur', positionnels: '', aide: 'liste à puces', exemple: 'liste' },
  element: { balise: 'li', genre: 'texte', positionnels: 'texte', aide: 'ligne d\'une liste', exemple: 'element "Livraison offerte"' },
  icone: { balise: 'span', genre: 'texte', positionnels: 'texte', aide: 'icône (emoji ou caractère)', exemple: 'icone "★"' },
  separateur: { balise: 'hr', genre: 'special', positionnels: '', aide: 'ligne de séparation', exemple: 'separateur' },
  espaceur: { balise: 'div', genre: 'special', positionnels: '[hauteur]', aide: 'espace vide', exemple: 'espaceur 48' },
  contenu: { balise: 'div', genre: 'special', positionnels: '', aide: 'dans un composant : là où va le contenu donné entre ses lignes', exemple: 'contenu' },
  scene: { balise: 'div', genre: 'immersion', positionnels: '', aide: 'zone immersive 2D ou 3D', exemple: 'scene' },
  objet: { balise: 'div', genre: 'immersion', positionnels: '[nom] source', aide: 'objet .glb, .gltf, .png, .svg, .json (Lottie)', exemple: 'objet canette "crush.glb"' },
  personnage: { balise: 'div', genre: 'immersion', positionnels: '[nom] source', aide: 'objet animé avec animations nommées', exemple: 'personnage "mascotte.glb"' },
  son: { balise: 'audio', genre: 'immersion', positionnels: 'source', aide: 'son ou musique, avec bouton muet', exemple: 'son "ambiance.mp3", boucle' },
}

/** Ces têtes règlent l'élément parent au lieu d'en créer un. */
export const REGLAGES = new Set(['style', 'mobile', 'tablette', 'ordinateur', 'seo', 'couleurs', 'police', 'polices', 'langue', 'favicon', 'lumiere', 'camera', 'transition'])
export const EVENEMENTS = new Set(['au-clic', 'au-survol', 'au-defilement', 'au-chargement'])

// Index des alias d'options
const ALIAS_STYLE = new Map<string, string>()
for (const [nom, s] of Object.entries(STYLES)) {
  ALIAS_STYLE.set(nom, nom)
  for (const a of s.alias ?? []) ALIAS_STYLE.set(a, nom)
}

/** Nom canonique d'une option de style (ou undefined). */
export function optionStyle(mot: string): string | undefined {
  const m = sansAccents(mot)
  return ALIAS_STYLE.get(m)
}

export function optionElement(tete: string, mot: string): string | undefined {
  const table = OPTIONS_ELEMENTS[tete]
  if (!table) return undefined
  const m = sansAccents(mot)
  for (const [nom, s] of Object.entries(table)) {
    if (nom === m || (s.alias ?? []).includes(m)) return nom
  }
  return undefined
}

export function specOption(tete: string, nom: string): SpecOption | undefined {
  return OPTIONS_ELEMENTS[tete]?.[nom] ?? STYLES[nom]
}

export function toutesOptions(tete: string): string[] {
  return [...Object.keys(OPTIONS_ELEMENTS[tete] ?? {}), ...Object.keys(STYLES).filter((s) => s !== 'fond_image')]
}
