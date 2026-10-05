var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/noyau/erreurs.ts
var ErreurKaury = class extends Error {
  ligne;
  colonne;
  longueur;
  quoi;
  essaie;
  fichier;
  gravite;
  constructor(pos, quoi, essaie, gravite = "erreur") {
    super(quoi);
    this.ligne = pos.ligne;
    this.colonne = pos.colonne;
    this.longueur = Math.max(1, pos.longueur ?? 1);
    this.quoi = quoi;
    this.essaie = essaie;
    this.gravite = gravite;
  }
  /** Message complet avec l'extrait de code souligné. */
  formate(source) {
    const titre = this.gravite === "erreur" ? "Erreur" : "Attention";
    const ou = this.fichier ? `${this.fichier}, ligne ${this.ligne}` : `ligne ${this.ligne}`;
    let out = `${titre} ${ou} : ${this.quoi}`;
    if (source) {
      const lignes = source.split(/\r?\n/);
      const texte = lignes[this.ligne - 1];
      if (texte !== void 0) {
        const num = String(this.ligne);
        out += `
  ${num} | ${texte}`;
        out += `
  ${" ".repeat(num.length)} | ${" ".repeat(Math.max(0, this.colonne - 1))}${"^".repeat(this.longueur)}`;
      }
    }
    if (this.essaie) out += `
Essaie : ${this.essaie}`;
    return out;
  }
  versJSON() {
    return {
      gravite: this.gravite,
      fichier: this.fichier,
      ligne: this.ligne,
      colonne: this.colonne,
      longueur: this.longueur,
      message: this.quoi,
      essaie: this.essaie
    };
  }
};
var ErreursKaury = class extends Error {
  erreurs;
  source;
  constructor(erreurs, source) {
    super(erreurs.map((e) => e.formate(source)).join("\n\n"));
    this.erreurs = erreurs;
    this.source = source;
  }
};
function distance(a, b) {
  if (a === b) return 0;
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = new Array(n + 1);
  let cur = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    cur[0] = i;
    for (let j = 1; j <= n; j++) {
      const c = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + c);
    }
    ;
    [prev, cur] = [cur, prev];
  }
  return prev[n];
}
function proche(mot, candidats) {
  let best;
  let bestD = Infinity;
  const seuil = mot.length <= 3 ? 1 : mot.length <= 6 ? 2 : 3;
  for (const c of candidats) {
    const d = distance(mot.toLowerCase(), c.toLowerCase());
    if (d < bestD && d <= seuil) {
      bestD = d;
      best = c;
    }
  }
  return best;
}

// src/noyau/lecteur.ts
var UNITES = ["px", "rem", "em", "%", "vh", "vw", "svh", "dvh", "ms", "s", "deg", "fr", "x"];
var OPS = [
  "**=",
  "...",
  "->",
  "==",
  "!=",
  "<=",
  ">=",
  "+=",
  "-=",
  "*=",
  "/=",
  "..",
  "**",
  "?.",
  "??",
  "+",
  "-",
  "*",
  "/",
  "%",
  "<",
  ">",
  "=",
  ",",
  ".",
  ":",
  "(",
  ")",
  "[",
  "]",
  "{",
  "}",
  "?",
  "!",
  "|",
  "@"
];
var estLettre = (c) => /[\p{L}_$]/u.test(c);
var estChiffre = (c) => c >= "0" && c <= "9";
var estCarMot = (c) => /[\p{L}\p{N}_$]/u.test(c);
function lis(source) {
  const jetons = [];
  const lignes = source.replace(/\r\n?/g, "\n").split("\n");
  const pile = [0];
  let profondeur = 0;
  const ouvreurs = [];
  const pousse = (j) => jetons.push(j);
  for (let li = 0; li < lignes.length; li++) {
    const ligne = lignes[li];
    const numLigne = li + 1;
    let i = 0;
    if (profondeur === 0) {
      let indent = 0;
      while (i < ligne.length && (ligne[i] === " " || ligne[i] === "	")) {
        if (ligne[i] === "	") {
          throw new ErreurKaury(
            { ligne: numLigne, colonne: i + 1 },
            "une tabulation sert d'indentation.",
            "indente avec 2 espaces. Kaury n'accepte pas les tabulations."
          );
        }
        indent++;
        i++;
      }
      const reste = ligne.slice(i);
      if (reste === "" || reste.startsWith("//")) continue;
      const haut = pile[pile.length - 1];
      if (indent > haut) {
        pile.push(indent);
        pousse({ t: "indente", v: "", ligne: numLigne, colonne: 1, fin: indent + 1, espaceAvant: false });
      } else if (indent < haut) {
        while (pile.length && indent < pile[pile.length - 1]) {
          pile.pop();
          pousse({ t: "desindente", v: "", ligne: numLigne, colonne: 1, fin: 1, espaceAvant: false });
        }
        if (pile[pile.length - 1] !== indent) {
          throw new ErreurKaury(
            { ligne: numLigne, colonne: 1, longueur: indent || 1 },
            "cette ligne n'est align\xE9e sur aucun bloc au-dessus.",
            "aligne-la exactement sous la ligne dont elle fait partie (2 espaces par niveau)."
          );
        }
      }
      if (/^(js|javascript)\s*(\/\/.*)?$/.test(reste)) {
        pousse({ t: "mot", v: "js", ligne: numLigne, colonne: indent + 1, fin: indent + 3, espaceAvant: true });
        const brutes = [];
        let k = li + 1;
        let retrait = -1;
        while (k < lignes.length) {
          const l = lignes[k];
          const ind = l.length - l.trimStart().length;
          if (l.trim() !== "" && ind <= indent) break;
          if (l.trim() !== "" && (retrait < 0 || ind < retrait)) retrait = ind;
          brutes.push(l);
          k++;
        }
        while (brutes.length && brutes[brutes.length - 1].trim() === "") brutes.pop();
        const code = brutes.map((l) => l.slice(Math.max(0, retrait))).join("\n");
        pousse({ t: "brut", v: code, ligne: numLigne + 1, colonne: 1, fin: 1, espaceAvant: true });
        pousse({ t: "ligne", v: "", ligne: numLigne, colonne: 1, fin: 1, espaceAvant: false });
        li = li + brutes.length;
        continue;
      }
    } else {
      while (i < ligne.length && (ligne[i] === " " || ligne[i] === "	")) i++;
      if (i >= ligne.length || ligne.startsWith("//", i)) continue;
    }
    let espace = true;
    let aEuJeton = false;
    while (i < ligne.length) {
      const c = ligne[i];
      if (c === " " || c === "	") {
        espace = true;
        i++;
        continue;
      }
      if (c === "/" && ligne[i + 1] === "/") break;
      const col = i + 1;
      if (c === '"') {
        const { jeton, suite } = lisTexte(ligne, i, numLigne);
        jeton.espaceAvant = espace;
        pousse(jeton);
        i = suite;
        espace = false;
        aEuJeton = true;
        continue;
      }
      if (c === "#") {
        const m = /^#([0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![\p{L}\p{N}_])/u.exec(ligne.slice(i));
        if (!m) {
          throw new ErreurKaury(
            { ligne: numLigne, colonne: col },
            "couleur mal \xE9crite.",
            "une couleur s'\xE9crit avec 3 ou 6 chiffres hexad\xE9cimaux : #FF4F8B ou #F48."
          );
        }
        pousse({ t: "couleur", v: m[0], ligne: numLigne, colonne: col, fin: col + m[0].length, espaceAvant: espace });
        i += m[0].length;
        espace = false;
        aEuJeton = true;
        continue;
      }
      const negatifColle = c === "-" && espace && estChiffre(ligne[i + 1] ?? "") && dernierPermetUnaire(jetons, aEuJeton);
      if (estChiffre(c) || negatifColle) {
        let j = i + (negatifColle ? 1 : 0);
        while (j < ligne.length && (estChiffre(ligne[j]) || ligne[j] === "_")) j++;
        if (ligne[j] === "." && estChiffre(ligne[j + 1] ?? "")) {
          j++;
          while (j < ligne.length && estChiffre(ligne[j])) j++;
        }
        let v = ligne.slice(i, j).replace(/_/g, "");
        let unite;
        if (ligne.startsWith("/s", j) && !estCarMot(ligne[j + 2] ?? " ")) {
          unite = "/s";
          j += 2;
        } else {
          for (const u of UNITES) {
            if (ligne.startsWith(u, j) && !estCarMot(ligne[j + u.length] ?? " ")) {
              unite = u;
              j += u.length;
              break;
            }
          }
        }
        pousse({ t: "nombre", v, unite, ligne: numLigne, colonne: col, fin: j + 1, espaceAvant: espace });
        i = j;
        espace = false;
        aEuJeton = true;
        continue;
      }
      if (estLettre(c)) {
        let j = i + 1;
        while (j < ligne.length) {
          if (estCarMot(ligne[j])) {
            j++;
          } else if (ligne[j] === "-" && estLettre(ligne[j + 1] ?? "") && estCarMot(ligne[j - 1])) {
            j++;
          } else break;
        }
        pousse({ t: "mot", v: ligne.slice(i, j), ligne: numLigne, colonne: col, fin: j + 1, espaceAvant: espace });
        i = j;
        espace = false;
        aEuJeton = true;
        continue;
      }
      const op = OPS.find((o) => ligne.startsWith(o, i));
      if (op) {
        const j = { t: "op", v: op, ligne: numLigne, colonne: col, fin: col + op.length, espaceAvant: espace };
        if (op === "(" || op === "[" || op === "{") {
          profondeur++;
          ouvreurs.push(j);
        } else if (op === ")" || op === "]" || op === "}") {
          const o = ouvreurs.pop();
          const attendu = o ? { "(": ")", "[": "]", "{": "}" }[o.v] : void 0;
          if (!o || attendu !== op) {
            throw new ErreurKaury(
              { ligne: numLigne, colonne: col },
              o ? `\xAB ${op} \xBB ferme \xAB ${o.v} \xBB ouvert ligne ${o.ligne}, mais il faut \xAB ${attendu} \xBB.` : `\xAB ${op} \xBB ferme quelque chose qui n'a jamais \xE9t\xE9 ouvert.`,
              o ? `remplace \xAB ${op} \xBB par \xAB ${attendu} \xBB.` : `supprime ce \xAB ${op} \xBB.`
            );
          }
          profondeur--;
        }
        pousse(j);
        i += op.length;
        espace = false;
        aEuJeton = true;
        continue;
      }
      if (c === "'") {
        throw new ErreurKaury(
          { ligne: numLigne, colonne: col },
          "les textes s'\xE9crivent entre guillemets doubles.",
          `remplace '\u2026' par "\u2026". L'apostrophe reste utilisable dans un texte : "J'aime".`
        );
      }
      throw new ErreurKaury({ ligne: numLigne, colonne: col }, `caract\xE8re inattendu \xAB ${c} \xBB.`, 'supprime-le ou mets-le dans un texte "\u2026".');
    }
    if (profondeur === 0 && aEuJeton) {
      pousse({ t: "ligne", v: "", ligne: numLigne, colonne: ligne.length + 1, fin: ligne.length + 2, espaceAvant: false });
    }
  }
  if (ouvreurs.length) {
    const o = ouvreurs[ouvreurs.length - 1];
    throw new ErreurKaury(
      { ligne: o.ligne, colonne: o.colonne },
      `\xAB ${o.v} \xBB n'est jamais referm\xE9.`,
      `ajoute \xAB ${{ "(": ")", "[": "]", "{": "}" }[o.v]} \xBB \xE0 la fin.`
    );
  }
  const derniere = lignes.length;
  if (jetons.length && jetons[jetons.length - 1].t !== "ligne" && jetons[jetons.length - 1].t !== "desindente") {
    pousse({ t: "ligne", v: "", ligne: derniere, colonne: 1, fin: 1, espaceAvant: false });
  }
  while (pile.length > 1) {
    pile.pop();
    pousse({ t: "desindente", v: "", ligne: derniere, colonne: 1, fin: 1, espaceAvant: false });
  }
  pousse({ t: "fin", v: "", ligne: derniere + 1, colonne: 1, fin: 1, espaceAvant: false });
  return jetons;
}
function dernierPermetUnaire(jetons, aEuJeton) {
  if (!aEuJeton) return true;
  const d = jetons[jetons.length - 1];
  if (!d) return true;
  return d.t === "mot" || d.t === "op" || d.t === "nombre" || d.t === "texte";
}
function lisTexte(ligne, debut, numLigne) {
  const morceaux = [];
  let i = debut + 1;
  let courant = "";
  while (true) {
    if (i >= ligne.length) {
      throw new ErreurKaury(
        { ligne: numLigne, colonne: debut + 1 },
        "ce texte n'est jamais referm\xE9.",
        'ajoute un guillemet " \xE0 la fin du texte.'
      );
    }
    const c = ligne[i];
    if (c === "\\") {
      const n = ligne[i + 1];
      const map = { n: "\n", t: "	", '"': '"', "\\": "\\", "{": "{", "}": "}" };
      if (n === void 0 || !(n in map)) {
        throw new ErreurKaury(
          { ligne: numLigne, colonne: i + 1, longueur: 2 },
          `s\xE9quence \xAB \\${n ?? ""} \xBB inconnue dans un texte.`,
          'utilise \\n (retour \xE0 la ligne), \\" (guillemet), \\{ ou \\} (accolades), \\\\ (barre).'
        );
      }
      courant += map[n];
      i += 2;
      continue;
    }
    if (c === '"') {
      i++;
      break;
    }
    if (c === "{") {
      if (courant) morceaux.push({ texte: courant });
      courant = "";
      let p = 1;
      let j = i + 1;
      let dansTexte = false;
      while (j < ligne.length && p > 0) {
        const d = ligne[j];
        if (dansTexte) {
          if (d === "\\") j++;
          else if (d === '"') dansTexte = false;
        } else if (d === '"') dansTexte = true;
        else if (d === "{") p++;
        else if (d === "}") p--;
        if (p > 0) j++;
      }
      if (p > 0) {
        throw new ErreurKaury(
          { ligne: numLigne, colonne: i + 1 },
          "insertion \xAB { \xBB jamais referm\xE9e dans ce texte.",
          "ferme-la avec \xAB } \xBB, ou \xE9cris \\{ pour une vraie accolade."
        );
      }
      const code = ligne.slice(i + 1, j);
      if (!code.trim()) {
        throw new ErreurKaury(
          { ligne: numLigne, colonne: i + 1, longueur: 2 },
          "insertion vide \xAB {} \xBB dans un texte.",
          'mets un nom entre les accolades : "Bonjour {nom}".'
        );
      }
      morceaux.push({ code, ligne: numLigne, colonne: i + 2 });
      i = j + 1;
      continue;
    }
    courant += c;
    i++;
  }
  if (courant || !morceaux.length) morceaux.push({ texte: courant });
  const v = morceaux.map((m) => m.texte ?? `{${m.code}}`).join("");
  return {
    jeton: { t: "texte", v, morceaux, ligne: numLigne, colonne: debut + 1, fin: i + 1, espaceAvant: true },
    suite: i
  };
}

// src/noyau/mots.ts
var mots_exports = {};
__export(mots_exports, {
  MOTS_INSTRUCTION: () => MOTS_INSTRUCTION,
  MOTS_RESERVES: () => MOTS_RESERVES,
  aliasDe: () => aliasDe,
  canon: () => canon,
  estMot: () => estMot,
  sansAccents: () => sansAccents,
  tousLesMots: () => tousLesMots
});
function sansAccents(s) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}
var TABLE = {
  // ---- noyau ----
  soit: ["let", "const"],
  etat: ["state"],
  fonction: ["function", "fn"],
  puis: ["then"],
  si: ["if"],
  sinon: ["else"],
  alors: [],
  pour: ["for"],
  dans: ["in"],
  tant: ["while"],
  que: [],
  attends: ["await", "wait"],
  essaie: ["try"],
  erreur: ["catch"],
  importe: ["import"],
  de: ["from"],
  exporte: ["export"],
  retourne: ["return"],
  arrete: ["break"],
  continue: [],
  vrai: ["true"],
  faux: ["false"],
  rien: ["nothing", "null", "none"],
  et: ["and"],
  ou: ["or"],
  non: ["not"],
  ouvre: ["open"],
  ferme: ["close"],
  bascule: ["toggle"],
  aller: ["go", "goto", "navigate"],
  js: ["javascript"],
  // ---- web ----
  site: [],
  page: [],
  composant: ["component"],
  section: [],
  entete: ["header"],
  pied: ["footer"],
  nav: [],
  grille: ["grid"],
  colonne: ["column"],
  ligne: ["row"],
  boite: ["box"],
  carte: ["card"],
  titre: ["title", "heading"],
  "sous-titre": ["subtitle"],
  texte: ["text", "paragraph"],
  image: [],
  video: [],
  lien: ["link"],
  liens: ["links", "menu"],
  logo: [],
  bouton: ["button"],
  formulaire: ["form"],
  champ: ["field", "input"],
  zone: ["textarea"],
  choix: ["select", "choice"],
  case: ["checkbox"],
  liste: ["list"],
  element: ["item"],
  icone: ["icon"],
  separateur: ["divider"],
  espaceur: ["spacer"],
  contenu: ["children", "slot"],
  style: [],
  mobile: [],
  tablette: ["tablet"],
  ordinateur: ["desktop"],
  charge: ["fetch", "load"],
  envoie: ["send", "post"],
  seo: [],
  couleurs: ["colors"],
  police: ["font"],
  polices: ["fonts"],
  langue: ["lang", "language"],
  favicon: [],
  // ---- immersion ----
  scene: [],
  objet: ["object", "model"],
  personnage: ["character"],
  lumiere: ["light", "lighting"],
  camera: [],
  au: ["on"],
  defilement: ["scroll"],
  suit: ["follows", "follow"],
  souris: ["mouse"],
  entre: ["enters", "enter"],
  depuis: ["from-side"],
  tourne: ["spin", "rotate", "turn"],
  flotte: ["float"],
  saute: ["jump"],
  pulse: [],
  balance: ["sway"],
  clic: ["click"],
  survol: ["hover"],
  chargement: ["load-event", "mount"],
  dit: ["says", "say"],
  joue: ["play"],
  son: ["sound", "audio"],
  transition: [],
  parallaxe: ["parallax"]
};
var VERS_CANON = /* @__PURE__ */ new Map();
for (const [canon2, alias] of Object.entries(TABLE)) {
  VERS_CANON.set(canon2, canon2);
  for (const a of alias) if (!VERS_CANON.has(a)) VERS_CANON.set(a, canon2);
}
function canon(mot) {
  return VERS_CANON.get(sansAccents(mot));
}
function estMot(mot, attendu) {
  return canon(mot) === attendu;
}
function tousLesMots() {
  return Object.keys(TABLE);
}
function aliasDe(canonique) {
  return TABLE[canonique] ?? [];
}
var MOTS_INSTRUCTION = /* @__PURE__ */ new Set([
  "soit",
  "etat",
  "fonction",
  "si",
  "sinon",
  "pour",
  "tant",
  "essaie",
  "erreur",
  "importe",
  "exporte",
  "retourne",
  "arrete",
  "continue",
  "composant",
  "page",
  "site",
  "ouvre",
  "ferme",
  "bascule",
  "aller",
  "js"
]);
var MOTS_RESERVES = /* @__PURE__ */ new Set([
  "soit",
  "etat",
  "fonction",
  "puis",
  "si",
  "sinon",
  "alors",
  "pour",
  "dans",
  "tant",
  "attends",
  "essaie",
  "importe",
  "exporte",
  "retourne",
  "arrete",
  "vrai",
  "faux",
  "rien",
  "et",
  "ou",
  "non",
  "composant",
  "page"
]);

// src/noyau/analyseur.ts
var TETES_INTERFACE = /* @__PURE__ */ new Set([
  // web
  "section",
  "entete",
  "pied",
  "nav",
  "grille",
  "colonne",
  "ligne",
  "boite",
  "carte",
  "titre",
  "sous-titre",
  "texte",
  "image",
  "video",
  "lien",
  "liens",
  "logo",
  "bouton",
  "formulaire",
  "champ",
  "zone",
  "choix",
  "case",
  "liste",
  "element",
  "icone",
  "separateur",
  "espaceur",
  "contenu",
  "style",
  "mobile",
  "tablette",
  "ordinateur",
  "seo",
  "couleurs",
  "police",
  "polices",
  "langue",
  "favicon",
  // immersion
  "scene",
  "objet",
  "personnage",
  "lumiere",
  "camera",
  "au",
  "suit",
  "entre",
  "tourne",
  "flotte",
  "saute",
  "pulse",
  "balance",
  "dit",
  "joue",
  "son",
  "transition",
  "parallaxe"
]);
var MOTS_INFIXES = /* @__PURE__ */ new Set(["et", "ou", "dans", "puis", "alors", "sinon", "de", "comme"]);
var OPS_AFFECTATION = /* @__PURE__ */ new Set(["=", "+=", "-=", "*=", "/=", "**="]);
var LIBRE = { implicite: true, item: false };
var ITEM = { implicite: false, item: true };
var SIMPLE = { implicite: false, item: false };
function analyse(source) {
  const jetons = lis(source);
  return new Analyseur(jetons).programme();
}
function analyseExpressionDans(code, ligne, colonne) {
  let jetons;
  try {
    jetons = lis(code);
  } catch (e2) {
    if (e2 instanceof ErreurKaury) {
      e2.ligne = ligne;
      e2.colonne = colonne + e2.colonne - 1;
    }
    throw e2;
  }
  for (const j of jetons) {
    j.ligne = ligne;
    j.colonne = colonne + j.colonne - 1;
    j.fin = colonne + j.fin - 1;
  }
  const a = new Analyseur(jetons.filter((j) => j.t !== "indente" && j.t !== "desindente"));
  const e = a.expression(LIBRE);
  if (a.voit().t !== "ligne" && a.voit().t !== "fin") {
    throw a.erreur(a.voit(), `je ne comprends pas \xAB ${a.voit().v} \xBB dans cette insertion.`, "une insertion contient une seule expression : {prix * 2}.");
  }
  return e;
}
var Analyseur = class {
  constructor(j) {
    this.j = j;
  }
  j;
  i = 0;
  // ---------- outils ----------
  voit(d = 0) {
    return this.j[Math.min(this.i + d, this.j.length - 1)];
  }
  avance() {
    const t = this.j[this.i];
    if (this.i < this.j.length - 1) this.i++;
    return t;
  }
  estOp(v, d = 0) {
    const t = this.voit(d);
    return t.t === "op" && t.v === v;
  }
  estMot(c, d = 0) {
    const t = this.voit(d);
    return t.t === "mot" && canon(t.v) === c;
  }
  pos(t) {
    return { ligne: t.ligne, colonne: t.colonne, longueur: Math.max(1, t.fin - t.colonne) };
  }
  erreur(t, quoi, essaie) {
    return new ErreurKaury(this.pos(t), quoi, essaie);
  }
  decrit(t) {
    if (t.t === "ligne") return "la fin de la ligne";
    if (t.t === "fin") return "la fin du fichier";
    if (t.t === "indente") return "un bloc indent\xE9";
    if (t.t === "desindente") return "la fin du bloc";
    if (t.t === "texte") return `le texte "${t.v}"`;
    return `\xAB ${t.v} \xBB`;
  }
  attendsOp(v, essaie) {
    if (!this.estOp(v)) throw this.erreur(this.voit(), `il manque \xAB ${v} \xBB ici (je vois ${this.decrit(this.voit())}).`, essaie);
    return this.avance();
  }
  attendsMotCle(c, essaie) {
    if (!this.estMot(c)) throw this.erreur(this.voit(), `il manque le mot \xAB ${c} \xBB ici (je vois ${this.decrit(this.voit())}).`, essaie);
    return this.avance();
  }
  attendsNom(role, essaie) {
    const t = this.voit();
    if (t.t !== "mot") throw this.erreur(t, `il faut un nom pour ${role} (je vois ${this.decrit(t)}).`, essaie);
    return this.avance();
  }
  finDeLigne(essaie) {
    const t = this.voit();
    if (t.t === "ligne") {
      this.avance();
      return;
    }
    if (t.t === "fin" || t.t === "desindente") return;
    if (t.t === "op" && t.v === "=") {
      throw this.erreur(t, "\xAB = \xBB ne peut pas \xEAtre ici.", "pour comparer deux valeurs, \xE9cris \xAB == \xBB.");
    }
    throw this.erreur(t, `je ne m'attendais pas \xE0 ${this.decrit(t)} ici.`, essaie ?? "passe \xE0 la ligne, ou s\xE9pare les options par des virgules.");
  }
  // ---------- programme & blocs ----------
  programme() {
    const corps = [];
    while (this.voit().t !== "fin") {
      if (this.voit().t === "ligne") {
        this.avance();
        continue;
      }
      if (this.voit().t === "indente") {
        throw this.erreur(
          this.voit(),
          "cette ligne est indent\xE9e alors qu'elle n'appartient \xE0 aucun bloc.",
          "retire les espaces au d\xE9but de la ligne, ou place-la sous une ligne qui ouvre un bloc (page, si, pour\u2026)."
        );
      }
      if (this.voit().t === "desindente") {
        this.avance();
        continue;
      }
      corps.push(this.instruction());
    }
    return corps;
  }
  bloc(quoi) {
    if (this.voit().t !== "indente") {
      throw this.erreur(
        this.voit(),
        `${quoi} attend un bloc indent\xE9 en dessous.`,
        "passe \xE0 la ligne et indente de 2 espaces le contenu du bloc."
      );
    }
    this.avance();
    const corps = [];
    while (this.voit().t !== "desindente" && this.voit().t !== "fin") {
      if (this.voit().t === "ligne") {
        this.avance();
        continue;
      }
      if (this.voit().t === "indente") {
        throw this.erreur(this.voit(), "cette ligne est trop indent\xE9e.", "aligne-la avec la ligne au-dessus.");
      }
      corps.push(this.instruction());
    }
    if (this.voit().t === "desindente") this.avance();
    return corps;
  }
  blocOptionnel() {
    return this.voit().t === "indente" ? this.bloc("cette ligne") : [];
  }
  // ---------- instructions ----------
  instruction() {
    const t = this.voit();
    if (t.t === "mot") {
      const c = canon(t.v);
      switch (c) {
        case "soit":
        case "etat":
          return this.declaration(c === "etat");
        case "fonction":
          return this.fonction();
        case "si":
          return this.si();
        case "sinon":
          throw this.erreur(t, "\xAB sinon \xBB sans \xAB si \xBB juste au-dessus.", "place \xAB sinon \xBB au m\xEAme niveau que son \xAB si \xBB, juste apr\xE8s le bloc du \xAB si \xBB.");
        case "pour":
          return this.pour();
        case "tant":
          if (this.estMot("que", 1)) return this.tantQue();
          break;
        case "essaie":
          return this.essaie();
        case "importe":
          return this.importe();
        case "exporte":
          return this.exporte();
        case "retourne": {
          this.avance();
          const valeur = this.voit().t === "ligne" || this.voit().t === "fin" ? void 0 : this.expression(LIBRE);
          this.finDeLigne();
          return { k: "retourne", valeur, pos: this.pos(t) };
        }
        case "arrete":
          this.avance();
          this.finDeLigne();
          return { k: "arrete", pos: this.pos(t) };
        case "continue":
          if (this.voit(1).t === "ligne" || this.voit(1).t === "fin") {
            this.avance();
            this.finDeLigne();
            return { k: "continue", pos: this.pos(t) };
          }
          break;
        case "ouvre":
        case "ferme":
        case "bascule":
          if (this.voit(1).t === "mot" && this.voit(1).espaceAvant && !this.estAffectationApres()) {
            this.avance();
            const cible = this.expression(SIMPLE);
            this.finDeLigne();
            return { k: "bascule", mode: c, cible, pos: this.pos(t) };
          }
          break;
        case "aller":
          if (!this.estAffectationApres()) {
            this.avance();
            const chemin = this.expression(LIBRE);
            this.finDeLigne();
            return { k: "aller", chemin, pos: this.pos(t) };
          }
          break;
        case "js": {
          this.avance();
          const brut = this.voit();
          if (brut.t !== "brut") throw this.erreur(t, "\xAB js \xBB doit \xEAtre seul sur sa ligne, avec le code JavaScript indent\xE9 dessous.");
          this.avance();
          this.finDeLigne();
          return { k: "js", code: brut.v, pos: this.pos(t) };
        }
        case "composant":
          return this.composant();
        case "page":
          return this.page();
        case "site":
          if (!this.estAffectationApres()) return this.site();
          break;
      }
      if (this.estTeteInterface()) return this.commande();
    }
    const e = this.expression(LIBRE);
    const op = this.voit();
    if (op.t === "op" && OPS_AFFECTATION.has(op.v)) {
      if (e.k !== "nom" && e.k !== "membre" && e.k !== "index") {
        throw this.erreur(op, "on ne peut rien ranger \xE0 gauche de ce \xAB = \xBB.", "\xE0 gauche d'un \xAB = \xBB, il faut un nom : total = 3.");
      }
      this.avance();
      const valeur = this.expression(LIBRE);
      this.finDeLigne();
      return { k: "affecte", cible: e, op: op.v, valeur, pos: this.pos(t) };
    }
    if (op.t === "op" && op.v === "->") {
      throw this.erreur(
        op,
        "\xAB -> \xBB doit suivre un \xE9l\xE9ment d'interface ou un param\xE8tre.",
        'exemples : bouton "Ok" -> compteur += 1   ou   somme liste, a -> a.prix'
      );
    }
    if (this.voit().t === "indente") {
      throw this.erreur(
        this.voit(),
        "ce bloc indent\xE9 n'appartient \xE0 rien.",
        "seuls page, section, si, pour, fonction\u2026 ouvrent un bloc. Retire l'indentation."
      );
    }
    this.finDeLigne();
    return { k: "expr", e, pos: this.pos(t) };
  }
  /** Le jeton suivant est-il une affectation (« site = 3 ») ? */
  estAffectationApres() {
    const s = this.voit(1);
    return s.t === "op" && (OPS_AFFECTATION.has(s.v) || (s.v === "." || s.v === "(" || s.v === "[") && !s.espaceAvant);
  }
  estTeteInterface() {
    const t = this.voit();
    if (t.t !== "mot") return false;
    const s = this.voit(1);
    if (s.t === "op" && !["->", ",", "-", "[", "{", "("].includes(s.v)) return false;
    if (s.t === "op" && (s.v === "(" || s.v === "[") && !s.espaceAvant) return false;
    if (s.t === "op" && s.v === "-" && s.espaceAvant) return false;
    const c = canon(t.v);
    if (c && TETES_INTERFACE.has(c)) return true;
    if (new RegExp("^\\p{Lu}", "u").test(t.v)) {
      if (s.t === "op" && (s.v === "." || s.v === "(")) return false;
      return true;
    }
    return false;
  }
  declaration(reactif) {
    const t = this.avance();
    const nom = this.attendsNom(reactif ? "cet \xE9tat" : "cette variable", reactif ? "etat compteur = 0" : "soit tva = 8.1");
    if (!this.estOp("=")) {
      throw this.erreur(this.voit(), `il manque \xAB = \xBB apr\xE8s \xAB ${nom.v} \xBB.`, `${reactif ? "etat" : "soit"} ${nom.v} = 0`);
    }
    this.avance();
    const valeur = this.expressionOuBlocObjet();
    this.finDeLigne();
    return { k: "soit", nom: nom.v, valeur, reactif, pos: this.pos(t) };
  }
  /** Après « = » : une expression, ou un objet écrit en bloc indenté (clé valeur par ligne). */
  expressionOuBlocObjet() {
    return this.expression(LIBRE);
  }
  params(fin) {
    const params = [];
    while (!fin(this.voit())) {
      const p = this.voit();
      if (p.t !== "mot") throw this.erreur(p, `un param\xE8tre doit \xEAtre un nom (je vois ${this.decrit(p)}).`, "fonction double x puis x * 2");
      this.avance();
      let defaut;
      if (this.estOp("=")) {
        this.avance();
        defaut = this.expression(SIMPLE);
      }
      params.push({ nom: p.v, defaut, pos: this.pos(p) });
      if (this.estOp(",")) this.avance();
    }
    return params;
  }
  fonction() {
    const t = this.avance();
    const nom = this.attendsNom("la fonction", "fonction double x puis x * 2");
    const params = this.params((j) => j.t === "ligne" || j.t === "fin" || j.t === "mot" && canon(j.v) === "puis");
    let corps;
    if (this.estMot("puis")) {
      const p = this.avance();
      const e = this.expression(LIBRE);
      corps = [{ k: "retourne", valeur: e, pos: this.pos(p) }];
      this.finDeLigne();
    } else {
      this.finDeLigne();
      corps = this.bloc(`la fonction \xAB ${nom.v} \xBB`);
    }
    return { k: "fonction", nom: nom.v, params, corps, pos: this.pos(t) };
  }
  corpsSi(quoi) {
    if (this.estMot("puis")) {
      this.avance();
      return [this.instruction()];
    }
    this.finDeLigne(`apr\xE8s la condition, passe \xE0 la ligne (ou \xE9cris \xAB puis \xBB pour une action sur la m\xEAme ligne).`);
    return this.bloc(quoi);
  }
  si() {
    const t = this.avance();
    const cond = this.condition();
    const alors = this.corpsSi("\xAB si \xBB");
    const sinonSi = [];
    let sinon;
    while (this.estMot("sinon")) {
      const s = this.avance();
      if (this.estMot("si")) {
        this.avance();
        const c = this.condition();
        sinonSi.push({ cond: c, corps: this.corpsSi("\xAB sinon si \xBB"), pos: this.pos(s) });
      } else {
        sinon = this.corpsSi("\xAB sinon \xBB");
        break;
      }
    }
    return { k: "si", cond, alors, sinonSi, sinon, pos: this.pos(t) };
  }
  condition() {
    const e = this.expression(LIBRE);
    if (this.estOp("=")) {
      throw this.erreur(this.voit(), "\xAB = \xBB range une valeur ; il ne compare pas.", "pour comparer, \xE9cris \xAB == \xBB.");
    }
    return e;
  }
  pour() {
    const t = this.avance();
    const v = this.attendsNom("la variable de la boucle", "pour p dans produits");
    let index;
    if (this.estOp(",")) {
      this.avance();
      index = this.attendsNom("le num\xE9ro de tour", "pour p, i dans produits").v;
    }
    this.attendsMotCle("dans", `pour ${v.v} dans liste`);
    const source = this.expression(LIBRE);
    this.finDeLigne();
    const corps = this.bloc("\xAB pour \xBB");
    return { k: "pour", variable: v.v, index, source, corps, pos: this.pos(t) };
  }
  tantQue() {
    const t = this.avance();
    this.avance();
    const cond = this.condition();
    this.finDeLigne();
    const corps = this.bloc("\xAB tant que \xBB");
    return { k: "tantque", cond, corps, pos: this.pos(t) };
  }
  essaie() {
    const t = this.avance();
    this.finDeLigne();
    const corps = this.bloc("\xAB essaie \xBB");
    let variable;
    let erreur;
    if (this.estMot("erreur")) {
      this.avance();
      if (this.voit().t === "mot") variable = this.avance().v;
      this.finDeLigne();
      erreur = this.bloc("\xAB erreur \xBB");
    }
    return { k: "essaie", corps, variable, erreur, pos: this.pos(t) };
  }
  importe() {
    const t = this.avance();
    const pos = this.pos(t);
    if (this.voit().t === "texte") {
      const source = this.avance().v;
      this.finDeLigne();
      return { k: "importe", source, pos };
    }
    let defaut;
    let noms;
    let tout;
    if (this.estOp("{")) {
      this.avance();
      noms = [];
      while (!this.estOp("}")) {
        const n = this.attendsNom("l'\xE9l\xE9ment \xE0 importer", 'importe { a, b } de "paquet"');
        let alias;
        if (this.estMot("comme")) {
          this.avance();
          alias = this.attendsNom("le nouveau nom").v;
        }
        noms.push({ nom: n.v, alias });
        if (this.estOp(",")) this.avance();
      }
      this.avance();
    } else if (this.estOp("*")) {
      this.avance();
      this.attendsMotCle("comme", 'importe * comme THREE de "three"');
      tout = this.attendsNom("le module").v;
    } else {
      defaut = this.attendsNom("ce qu'on importe", 'importe confetti de "canvas-confetti"').v;
    }
    this.attendsMotCle("de", 'importe confetti de "canvas-confetti"');
    const s = this.voit();
    if (s.t !== "texte") throw this.erreur(s, "le nom du paquet ou du fichier doit \xEAtre un texte.", 'importe confetti de "canvas-confetti"');
    this.avance();
    this.finDeLigne();
    return { k: "importe", defaut, noms, tout, source: s.v, pos };
  }
  exporte() {
    const t = this.avance();
    const d = this.instruction();
    if (d.k === "soit" || d.k === "fonction" || d.k === "composant") {
      d.exporte = true;
      return d;
    }
    throw this.erreur(t, "on ne peut exporter qu'une variable, une fonction ou un composant.", "exporte composant Carte nom");
  }
  composant() {
    const t = this.avance();
    const nom = this.attendsNom("le composant", "composant Carte nom image");
    if (!new RegExp("^\\p{Lu}", "u").test(nom.v)) {
      throw this.erreur(
        nom,
        `un composant commence par une majuscule : \xAB ${nom.v} \xBB.`,
        `composant ${nom.v[0].toUpperCase() + nom.v.slice(1)}`
      );
    }
    const params = this.params((j) => j.t === "ligne" || j.t === "fin");
    this.finDeLigne();
    const corps = this.bloc(`le composant \xAB ${nom.v} \xBB`);
    return { k: "composant", nom: nom.v, params, corps, pos: this.pos(t) };
  }
  page() {
    const t = this.avance();
    const c = this.voit();
    if (c.t !== "texte") throw this.erreur(c, "une page a besoin de son adresse entre guillemets.", 'page "/"   ou   page "/boutique"');
    this.avance();
    if (!c.v.startsWith("/")) throw this.erreur(c, `l'adresse d'une page commence par \xAB / \xBB : \xAB ${c.v} \xBB.`, `page "/${c.v}"`);
    this.finDeLigne();
    const corps = this.bloc(`la page \xAB ${c.v} \xBB`);
    return { k: "page", chemin: c.v, corps, pos: this.pos(t) };
  }
  site() {
    const t = this.avance();
    let nom;
    if (this.voit().t !== "ligne") nom = this.expression(SIMPLE);
    this.finDeLigne();
    const corps = this.blocOptionnel();
    return { k: "site", nom, corps, pos: this.pos(t) };
  }
  // ---------- lignes d'interface ----------
  commande() {
    const t = this.avance();
    let tete = canon(t.v) ?? t.v;
    if (new RegExp("^\\p{Lu}", "u").test(t.v)) tete = t.v;
    const composes = {
      au: ["clic", "survol", "defilement", "chargement"],
      suit: ["souris"],
      entre: ["depuis"]
    };
    if (composes[tete]) {
      const s = this.voit();
      const cs = s.t === "mot" ? canon(s.v) : void 0;
      if (cs && composes[tete].includes(cs)) {
        this.avance();
        tete = `${tete}-${cs}`;
      } else if (tete === "au") {
        throw this.erreur(s, `\xAB au \xBB doit \xEAtre suivi de clic, survol, defilement ou chargement.`, "au clic -> saute");
      }
    }
    const items = [];
    let action;
    let enfants = [];
    while (true) {
      const v = this.voit();
      if (v.t === "ligne" || v.t === "fin" || v.t === "indente" || v.t === "desindente") break;
      if (v.t === "op" && v.v === "->") break;
      if (v.t === "op" && v.v === ",") {
        if (!items.length && !tete.includes("-")) throw this.erreur(v, "virgule inattendue juste apr\xE8s le mot de t\xEAte.", `${t.v} "contenu", option`);
        this.avance();
        continue;
      }
      items.push(this.item());
      const n = this.voit();
      if (n.t === "op" && n.v === ",") {
        this.avance();
        if (this.voit().t === "ligne") throw this.erreur(n, "cette ligne finit par une virgule.", "retire la virgule, ou ajoute l'option qui manque.");
      }
    }
    if (this.estOp("->")) {
      const fleche = this.avance();
      if (this.voit().t === "ligne") {
        this.avance();
        action = this.bloc("\xAB -> \xBB");
      } else if (this.voit().t === "fin") {
        throw this.erreur(fleche, "\xAB -> \xBB doit \xEAtre suivi d'une action.", `${t.v} -> compteur += 1`);
      } else {
        action = [this.instruction()];
        enfants = this.blocOptionnel();
      }
    } else {
      this.finDeLigne();
      enfants = this.blocOptionnel();
    }
    return { k: "commande", tete, teteBrute: t.v, items, action, enfants, pos: this.pos(t) };
  }
  item() {
    const debut = this.voit();
    const atomes = [];
    while (true) {
      const v = this.voit();
      if (v.t === "ligne" || v.t === "fin" || v.t === "indente" || v.t === "desindente") break;
      if (v.t === "op" && (v.v === "," || v.v === "->")) break;
      if (v.t === "op" && v.v === ")") throw this.erreur(v, "\xAB ) \xBB sans \xAB ( \xBB.");
      atomes.push(this.expression(ITEM));
    }
    return { atomes, pos: this.pos(debut) };
  }
  // ---------- expressions ----------
  expression(f) {
    if (!f.item) {
      const t = this.voit();
      if (t.t === "op" && t.v === "->") {
        this.avance();
        return { k: "lambda", params: [], corps: this.corpsLambda(), pos: this.pos(t) };
      }
      if (t.t === "mot" && this.estOp("->", 1)) {
        this.avance();
        this.avance();
        return { k: "lambda", params: [t.v], corps: this.corpsLambda(), pos: this.pos(t) };
      }
      if (t.t === "op" && t.v === "(") {
        const fin = this.parentheseFermante();
        if (fin > 0 && this.j[fin + 1]?.t === "op" && this.j[fin + 1].v === "->") {
          this.avance();
          const params = [];
          while (!this.estOp(")")) {
            params.push(this.attendsNom("un param\xE8tre").v);
            if (this.estOp(",")) this.avance();
          }
          this.avance();
          this.avance();
          return { k: "lambda", params, corps: this.corpsLambda(), pos: this.pos(t) };
        }
      }
    }
    return this.siExpression(f);
  }
  corpsLambda() {
    if (this.voit().t === "ligne" && this.voit(1).t === "indente") {
      this.avance();
      return this.bloc("cette fonction");
    }
    if (this.voit().t === "mot" && this.estTeteAction()) {
      return [this.instruction()];
    }
    return this.expression(LIBRE);
  }
  /** Dans une lambda, une affectation « -> total += 1 » est une action. */
  estTeteAction() {
    let k = this.i;
    let prof = 0;
    while (k < this.j.length) {
      const t = this.j[k];
      if (t.t === "ligne" || t.t === "fin") return false;
      if (t.t === "op") {
        if ("([{".includes(t.v)) prof++;
        else if (")]}".includes(t.v)) {
          if (prof === 0) return false;
          prof--;
        } else if (prof === 0 && t.v === ",") return false;
        else if (prof === 0 && OPS_AFFECTATION.has(t.v)) return true;
      }
      k++;
    }
    return false;
  }
  parentheseFermante() {
    let p = 0;
    for (let k = this.i; k < this.j.length; k++) {
      const t = this.j[k];
      if (t.t === "op" && "([{".includes(t.v)) p++;
      if (t.t === "op" && ")]}".includes(t.v)) {
        p--;
        if (p === 0) return k;
      }
      if (t.t === "ligne" || t.t === "fin") return -1;
    }
    return -1;
  }
  siExpression(f) {
    if (this.estMot("si")) {
      const t = this.avance();
      const cond = this.ou(f);
      this.attendsMotCle("alors", 'si age >= 18 alors "adulte" sinon "enfant"');
      const alors = this.ou(f);
      this.attendsMotCle("sinon", 'si age >= 18 alors "adulte" sinon "enfant"');
      const sinon = this.siExpression(f);
      return { k: "si", cond, alors, sinon, pos: this.pos(t) };
    }
    return this.ou(f);
  }
  ou(f) {
    let g = this.et(f);
    while (this.estMot("ou") || this.estOp("??")) {
      const t = this.avance();
      const op = t.v === "??" ? "??" : "||";
      g = { k: "binaire", op, g, d: this.et(f), pos: this.pos(t) };
    }
    return g;
  }
  et(f) {
    let g = this.non(f);
    while (this.estMot("et")) {
      const t = this.avance();
      g = { k: "binaire", op: "&&", g, d: this.non(f), pos: this.pos(t) };
    }
    return g;
  }
  non(f) {
    if (this.estMot("non") || this.estOp("!")) {
      const t = this.avance();
      return { k: "unaire", op: "!", e: this.non(f), pos: this.pos(t) };
    }
    return this.comparaison(f);
  }
  comparaison(f) {
    let g = this.intervalle(f);
    while (true) {
      const t = this.voit();
      if (t.t === "op" && ["==", "!=", "<", ">", "<=", ">="].includes(t.v)) {
        this.avance();
        g = { k: "binaire", op: t.v, g, d: this.intervalle(f), pos: this.pos(t) };
      } else if (t.t === "mot" && canon(t.v) === "dans" && !f.item && this.dansEstOperateur()) {
        this.avance();
        g = { k: "binaire", op: "dans", g, d: this.intervalle(f), pos: this.pos(t) };
      } else break;
    }
    return g;
  }
  dansEstOperateur() {
    return true;
  }
  intervalle(f) {
    const g = this.additif(f);
    if (this.estOp("..")) {
      const t = this.avance();
      return { k: "intervalle", de: g, a: this.additif(f), pos: this.pos(t) };
    }
    return g;
  }
  additif(f) {
    let g = this.multiplicatif(f);
    while (this.estOp("+") || this.estOp("-")) {
      const t = this.avance();
      g = { k: "binaire", op: t.v, g, d: this.multiplicatif(f), pos: this.pos(t) };
    }
    return g;
  }
  multiplicatif(f) {
    let g = this.puissance(f);
    while (this.estOp("*") || this.estOp("/") || this.estOp("%")) {
      const t = this.avance();
      g = { k: "binaire", op: t.v, g, d: this.puissance(f), pos: this.pos(t) };
    }
    return g;
  }
  puissance(f) {
    const g = this.unaire(f);
    if (this.estOp("**")) {
      const t = this.avance();
      return { k: "binaire", op: "**", g, d: this.puissance(f), pos: this.pos(t) };
    }
    return g;
  }
  unaire(f) {
    const t = this.voit();
    if (t.t === "op" && t.v === "-") {
      this.avance();
      return { k: "unaire", op: "-", e: this.unaire(f), pos: this.pos(t) };
    }
    if (t.t === "op" && t.v === "...") {
      this.avance();
      return { k: "etale", e: this.unaire(f), pos: this.pos(t) };
    }
    if (t.t === "mot" && canon(t.v) === "attends") {
      this.avance();
      return { k: "attends", e: this.unaire({ ...f, implicite: !f.item }), pos: this.pos(t) };
    }
    return this.postfixe(f);
  }
  postfixe(f) {
    let e = this.primaire(f);
    while (true) {
      const t = this.voit();
      if (t.t === "op" && (t.v === "." || t.v === "?.") && !t.espaceAvant) {
        this.avance();
        const p = this.voit();
        if (p.t !== "mot") throw this.erreur(p, `apr\xE8s \xAB ${t.v} \xBB, il faut un nom de propri\xE9t\xE9.`, "produit.prix");
        this.avance();
        e = { k: "membre", objet: e, prop: p.v, optionnel: t.v === "?.", pos: this.pos(p) };
      } else if (t.t === "op" && t.v === "(" && !t.espaceAvant) {
        this.avance();
        const args = [];
        while (!this.estOp(")")) {
          args.push(this.expression(LIBRE));
          if (this.estOp(",")) this.avance();
          else if (!this.estOp(")")) throw this.erreur(this.voit(), "il manque \xAB , \xBB ou \xAB ) \xBB dans cet appel.", "f(a, b)");
        }
        this.avance();
        e = { k: "appel", fn: e, args, pos: this.pos(t) };
      } else if (t.t === "op" && t.v === "[" && !t.espaceAvant) {
        this.avance();
        const index = this.expression(LIBRE);
        this.attendsOp("]");
        e = { k: "index", objet: e, index, pos: this.pos(t) };
      } else break;
    }
    if (f.implicite && (e.k === "nom" || e.k === "membre") && this.debutArgument()) {
      const args = [];
      do {
        if (this.estOp(",")) this.avance();
        args.push(this.expression(LIBRE));
      } while (this.estOp(","));
      e = { k: "appel", fn: e, args, pos: e.pos };
    }
    return e;
  }
  debutArgument() {
    const t = this.voit();
    if (!t.espaceAvant) return false;
    if (t.t === "nombre" || t.t === "texte" || t.t === "couleur") return true;
    if (t.t === "mot") {
      const c = canon(t.v);
      if (c && MOTS_INFIXES.has(c)) return false;
      return true;
    }
    if (t.t === "op" && (t.v === "[" || t.v === "{" || t.v === "(" || t.v === "...")) return true;
    if (t.t === "op" && t.v === "->") return true;
    return false;
  }
  primaire(f) {
    const t = this.voit();
    switch (t.t) {
      case "nombre":
        this.avance();
        return { k: "nombre", v: Number(t.v), unite: t.unite, pos: this.pos(t) };
      case "couleur":
        this.avance();
        return { k: "couleur", v: t.v, pos: this.pos(t) };
      case "texte": {
        this.avance();
        const morceaux = [];
        for (const m of t.morceaux ?? []) {
          if (m.code !== void 0) morceaux.push(analyseExpressionDans(m.code, m.ligne, m.colonne));
          else morceaux.push(m.texte ?? "");
        }
        return { k: "texte", morceaux, pos: this.pos(t) };
      }
      case "mot": {
        const c = canon(t.v);
        if (c === "vrai" || c === "faux") {
          this.avance();
          return { k: "bool", v: c === "vrai", pos: this.pos(t) };
        }
        if (c === "rien") {
          this.avance();
          return { k: "rien", pos: this.pos(t) };
        }
        if (c === "si") return this.siExpression(f);
        this.avance();
        return { k: "nom", nom: t.v, pos: this.pos(t) };
      }
      case "op": {
        if (t.v === "(") {
          this.avance();
          const e = this.expression(LIBRE);
          this.attendsOp(")");
          return e;
        }
        if (t.v === "[") {
          this.avance();
          const elements = [];
          while (!this.estOp("]")) {
            elements.push(this.expression(LIBRE));
            if (this.estOp(",")) this.avance();
            else if (!this.estOp("]")) throw this.erreur(this.voit(), "il manque \xAB , \xBB entre deux \xE9l\xE9ments de la liste.", "[1, 2, 3]");
          }
          this.avance();
          return { k: "liste", elements, pos: this.pos(t) };
        }
        if (t.v === "{") {
          this.avance();
          const props = [];
          while (!this.estOp("}")) {
            if (this.estOp("...")) {
              const s = this.avance();
              props.push({ cle: "", valeur: this.expression(LIBRE), etale: true });
              void s;
            } else {
              const k = this.voit();
              if (k.t !== "mot" && k.t !== "texte" && k.t !== "nombre") throw this.erreur(k, "une cl\xE9 d'objet doit \xEAtre un nom.", '{ nom: "Fraise", prix: 4 }');
              this.avance();
              if (this.estOp(":")) {
                this.avance();
                props.push({ cle: k.v, valeur: this.expression(LIBRE) });
              } else if (k.t === "mot") {
                props.push({ cle: k.v, valeur: { k: "nom", nom: k.v, pos: this.pos(k) } });
              } else throw this.erreur(this.voit(), `il manque \xAB : \xBB apr\xE8s la cl\xE9 \xAB ${k.v} \xBB.`, '{ nom: "Fraise" }');
            }
            if (this.estOp(",")) this.avance();
            else if (!this.estOp("}")) throw this.erreur(this.voit(), "il manque \xAB , \xBB entre deux propri\xE9t\xE9s.", '{ nom: "Fraise", prix: 4 }');
          }
          this.avance();
          return { k: "objet", props, pos: this.pos(t) };
        }
        if (t.v === "->") {
          throw this.erreur(t, "\xAB -> \xBB sans param\xE8tre devant.", "x -> x * 2");
        }
        break;
      }
    }
    throw this.erreur(
      t,
      `je m'attendais \xE0 une valeur, mais je vois ${this.decrit(t)}.`,
      t.t === "indente" ? "cette ligne est peut-\xEAtre trop indent\xE9e." : 'un nombre, un "texte", un nom, une [liste] ou un {objet}.'
    );
  }
};

// src/noyau/vocabulaire.ts
var vocabulaire_exports = {};
__export(vocabulaire_exports, {
  CAMERAS: () => CAMERAS,
  COULEURS: () => COULEURS,
  ELEMENTS: () => ELEMENTS,
  EVENEMENTS: () => EVENEMENTS,
  LUMIERES: () => LUMIERES,
  MOTS_MOUVEMENT: () => MOTS_MOUVEMENT,
  MOUVEMENTS: () => MOUVEMENTS,
  OPTIONS_ELEMENTS: () => OPTIONS_ELEMENTS,
  REGLAGES: () => REGLAGES,
  STYLES: () => STYLES,
  TRANSITIONS: () => TRANSITIONS,
  couleurConnue: () => couleurConnue,
  optionElement: () => optionElement,
  optionStyle: () => optionStyle,
  specOption: () => specOption,
  toutesOptions: () => toutesOptions
});
var COULEURS = {
  rouge: "#e5484d",
  orange: "#f76b15",
  jaune: "#ffc53d",
  vert: "#30a46c",
  bleu: "#0090ff",
  violet: "#8e4ec6",
  rose: "#e93d82",
  noir: "#111111",
  blanc: "#ffffff",
  gris: "#8b8d98",
  creme: "#fff4e8",
  beige: "#efe3cf",
  marron: "#8a5a3b",
  turquoise: "#12a594",
  or: "#d4a72c",
  argent: "#c0c4cc",
  marine: "#14213d",
  corail: "#ff7f61",
  menthe: "#7fe0c0",
  lavande: "#b9a6ef",
  ciel: "#7cc4fa",
  sable: "#e9d8b4",
  ardoise: "#3c4454",
  nuit: "#0b1020",
  transparent: "transparent"
};
var COULEURS_EN = {
  red: "rouge",
  yellow: "jaune",
  green: "vert",
  blue: "bleu",
  purple: "violet",
  pink: "rose",
  black: "noir",
  white: "blanc",
  grey: "gris",
  gray: "gris",
  cream: "creme",
  brown: "marron",
  teal: "turquoise",
  gold: "or",
  silver: "argent",
  navy: "marine",
  coral: "corail",
  mint: "menthe",
  lavender: "lavande",
  sky: "ciel",
  sand: "sable",
  slate: "ardoise",
  night: "nuit"
};
function couleurConnue(mot) {
  const m = sansAccents(mot).toLowerCase();
  if (m in COULEURS) return m;
  if (m in COULEURS_EN) return COULEURS_EN[m];
  return void 0;
}
var STYLES = {
  fond: { args: "e", alias: ["background", "bg"], aide: "couleur, d\xE9grad\xE9 ou image de fond", exemple: "fond creme" },
  couleur: { args: "c", alias: ["color"], aide: "couleur du texte", exemple: "couleur #333" },
  police: { args: "t", alias: ["font"], aide: "police de caract\xE8res", exemple: 'police "Clash Display"' },
  taille: { args: "n", alias: ["size"], aide: "taille du texte (ou de l'objet)", exemple: "taille 24" },
  gras: { args: "", alias: ["bold"], aide: "texte en gras", exemple: "gras" },
  leger: { args: "", alias: ["light"], aide: "texte fin", exemple: "leger" },
  poids: { args: "n", alias: ["weight"], aide: "\xE9paisseur du texte (100 \xE0 900)", exemple: "poids 600" },
  italique: { args: "", alias: ["italic"], aide: "texte en italique", exemple: "italique" },
  souligne: { args: "", alias: ["underline"], aide: "texte soulign\xE9", exemple: "souligne" },
  majuscules: { args: "", alias: ["uppercase", "caps"], aide: "texte en majuscules", exemple: "majuscules" },
  interligne: { args: "n", alias: ["line-height"], aide: "hauteur de ligne (1.5 = une fois et demie)", exemple: "interligne 1.6" },
  lettres: { args: "n", alias: ["letter-spacing", "tracking"], aide: "espace entre les lettres", exemple: "lettres 2" },
  aligne: { args: "m", mots: ["gauche", "centre", "droite", "justifie"], alias: ["align"], aide: "alignement du texte", exemple: "aligne centre" },
  centre: { args: "", alias: ["center", "centered"], aide: "centre le contenu", exemple: "centre" },
  coins: { args: "n", alias: ["radius", "rounded"], aide: "arrondi des coins", exemple: "coins 12" },
  rond: { args: "", alias: ["round", "pill"], aide: "coins compl\xE8tement ronds", exemple: "rond" },
  ombre: { args: "m?", mots: ["douce", "moyenne", "forte", "aucune", "interieure"], alias: ["shadow"], aide: "ombre port\xE9e", exemple: "ombre douce" },
  bordure: { args: "n?c?", alias: ["border"], aide: "bordure (\xE9paisseur, couleur)", exemple: "bordure 1 gris" },
  marge: { args: "nnnn", alias: ["margin"], aide: "espace autour (1 \xE0 4 valeurs)", exemple: "marge 24" },
  remplissage: { args: "nnnn", alias: ["padding", "interieur"], aide: "espace int\xE9rieur (1 \xE0 4 valeurs)", exemple: "remplissage 32" },
  espace: { args: "n", alias: ["gap", "spacing"], aide: "espace entre les enfants", exemple: "espace 24" },
  largeur: { args: "n", alias: ["width"], aide: "largeur", exemple: "largeur 320" },
  hauteur: { args: "n", alias: ["height"], aide: "hauteur", exemple: "hauteur 400" },
  "max-largeur": { args: "n", alias: ["max-width"], aide: "largeur maximale", exemple: "max-largeur 720" },
  "min-hauteur": { args: "n", alias: ["min-height"], aide: "hauteur minimale", exemple: "min-hauteur 300" },
  "plein-ecran": { args: "", alias: ["fullscreen", "full"], aide: "occupe toute la hauteur de l'\xE9cran", exemple: "plein-ecran" },
  "pleine-largeur": { args: "", alias: ["full-width", "bleed"], aide: "occupe toute la largeur, sans marges", exemple: "pleine-largeur" },
  opacite: { args: "n", alias: ["opacity"], aide: "opacit\xE9 de 0 \xE0 1", exemple: "opacite 0.8" },
  flou: { args: "n", alias: ["blur"], aide: "flou", exemple: "flou 8" },
  verre: { args: "", alias: ["glass"], aide: "effet verre d\xE9poli", exemple: "verre" },
  degrade: { args: "cc?c?n?", alias: ["gradient"], aide: "fond en d\xE9grad\xE9 (2 ou 3 couleurs, angle)", exemple: "degrade rose orange" },
  "texte-degrade": { args: "cc?c?", alias: ["text-gradient"], aide: "texte en d\xE9grad\xE9", exemple: "texte-degrade rose violet" },
  colonnes: { args: "n", alias: ["columns", "cols", "colonne"], aide: "nombre de colonnes", exemple: "grille 3 colonnes" },
  direction: { args: "m", mots: ["ligne", "colonne"], alias: ["direction"], aide: "sens des enfants", exemple: "direction ligne" },
  cache: { args: "", alias: ["hidden", "hide"], aide: "cache l'\xE9l\xE9ment", exemple: "mobile cache" },
  colle: { args: "", alias: ["sticky"], aide: "reste coll\xE9 en haut au d\xE9filement", exemple: "colle" },
  devant: { args: "", alias: ["front"], aide: "passe devant les autres \xE9l\xE9ments", exemple: "devant" },
  curseur: { args: "m", mots: ["main", "fleche", "texte", "aucun"], alias: ["cursor"], aide: "forme du curseur", exemple: "curseur main" },
  survol: { args: "*", alias: ["hover"], aide: "style quand la souris passe dessus", exemple: "survol monte 4" },
  monte: { args: "n", alias: ["lift"], aide: "d\xE9cale vers le haut", exemple: "survol monte 4" },
  grossit: { args: "n?", alias: ["grow", "scale"], aide: "agrandit (1.1 = +10 %)", exemple: "survol grossit 1.05" },
  penche: { args: "n", alias: ["tilt"], aide: "incline (degr\xE9s)", exemple: "penche -3" },
  fond_image: { args: "t", aide: "", exemple: "" },
  anime: { args: "m", mots: ["fondu", "monte", "zoom", "gauche", "droite"], alias: ["animate"], aide: "apparition simple", exemple: "anime fondu" }
};
var OPTIONS_ELEMENTS = {
  titre: { niveau: { args: "n", alias: ["level"], aide: "niveau du titre (1 \xE0 6)", exemple: "niveau 2" } },
  image: {
    texte: { args: "t", alias: ["alt"], aide: "description pour l'accessibilit\xE9", exemple: 'texte "Une canette"' },
    couvre: { args: "", alias: ["cover"], aide: "remplit la zone en recadrant", exemple: "couvre" }
  },
  video: {
    boucle: { args: "", alias: ["loop"], aide: "rejoue en boucle", exemple: "boucle" },
    muet: { args: "", alias: ["muted"], aide: "sans le son", exemple: "muet" },
    auto: { args: "", alias: ["autoplay"], aide: "d\xE9marre seule (muette)", exemple: "auto" },
    controles: { args: "", alias: ["controls"], aide: "affiche les boutons", exemple: "controles" },
    couvre: { args: "", alias: ["cover"], aide: "remplit la zone", exemple: "couvre" }
  },
  bouton: {
    vers: { args: "t", alias: ["to", "href"], aide: "emm\xE8ne vers une page", exemple: 'vers "/boutique"' },
    contour: { args: "", alias: ["outline"], aide: "bouton avec contour seul", exemple: "contour" },
    discret: { args: "", alias: ["ghost", "subtle"], aide: "bouton discret", exemple: "discret" },
    grand: { args: "", alias: ["large"], aide: "grand bouton", exemple: "grand" },
    petit: { args: "", alias: ["small"], aide: "petit bouton", exemple: "petit" },
    desactive: { args: "e?", alias: ["disabled"], aide: "d\xE9sactiv\xE9 (si la condition est vraie)", exemple: "desactive panier.longueur == 0" }
  },
  lien: { nouvel: { args: "", alias: ["new-tab", "blank"], aide: "ouvre dans un nouvel onglet", exemple: "nouvel" } },
  champ: {
    type: { args: "m", mots: ["texte", "email", "nombre", "motdepasse", "date", "tel", "url", "recherche"], alias: ["type"], aide: "genre de champ", exemple: "type email" },
    requis: { args: "", alias: ["required"], aide: "obligatoire", exemple: "requis" },
    etiquette: { args: "t", alias: ["label"], aide: "texte au-dessus du champ", exemple: 'etiquette "Ton e-mail"' }
  },
  zone: {
    requis: { args: "", alias: ["required"], aide: "obligatoire", exemple: "requis" },
    etiquette: { args: "t", alias: ["label"], aide: "texte au-dessus", exemple: 'etiquette "Message"' },
    lignes: { args: "n", alias: ["rows"], aide: "hauteur en lignes", exemple: "lignes 5" }
  },
  choix: { etiquette: { args: "t", alias: ["label"], aide: "texte au-dessus", exemple: 'etiquette "Taille"' } },
  section: {},
  seo: { image: { args: "t", alias: [], aide: "image de partage (1200\xD7630)", exemple: 'image "partage.jpg"' } },
  // ---- immersion ----
  objet: {
    position: { args: "nnn?", alias: [], aide: "position x y (z)", exemple: "position 0 1 0" },
    rotation: { args: "nnn?", alias: [], aide: "rotation en degr\xE9s x y z", exemple: "rotation 0 45 0" },
    taille: { args: "n", alias: ["size", "scale"], aide: "taille de l'objet (1 = normale)", exemple: "taille 1.5" },
    hauteur: { args: "n", alias: ["height"], aide: "hauteur de la zone (objet seul)", exemple: "hauteur 500" },
    secours: { args: "t", alias: ["fallback"], aide: "image si l'appareil ne peut pas afficher la 3D", exemple: 'secours "canette.png"' },
    ombres: { args: "", alias: ["shadows"], aide: "l'objet projette une ombre au sol", exemple: "ombres" },
    texte: { args: "t", alias: ["alt"], aide: "description pour l'accessibilit\xE9 et Google", exemple: 'texte "Canette Crush fraise"' }
  },
  scene: {
    hauteur: { args: "n", alias: ["height"], aide: "hauteur de la sc\xE8ne", exemple: "hauteur 600" },
    fond: { args: "e", alias: ["background"], aide: "fond de la sc\xE8ne", exemple: "fond nuit" },
    brouillard: { args: "c?", alias: ["fog"], aide: "brouillard de profondeur", exemple: "brouillard" },
    sol: { args: "c?", alias: ["ground", "floor"], aide: "ajoute un sol qui re\xE7oit les ombres", exemple: "sol" },
    particules: { args: "m?n?", mots: ["etoiles", "neige", "bulles", "poussiere", "confettis"], alias: ["particles"], aide: "particules d'ambiance", exemple: "particules etoiles" }
  },
  lumiere: {},
  camera: {
    distance: { args: "n", alias: [], aide: "recul de la cam\xE9ra", exemple: "distance 6" }
  },
  son: {
    boucle: { args: "", alias: ["loop"], aide: "joue en boucle", exemple: "boucle" },
    volume: { args: "n", alias: [], aide: "volume de 0 \xE0 1", exemple: "volume 0.4" }
  }
};
OPTIONS_ELEMENTS.personnage = { ...OPTIONS_ELEMENTS.objet, anime: { args: "t", alias: ["animation"], aide: "animation jou\xE9e au d\xE9part", exemple: 'anime "attend"' } };
OPTIONS_ELEMENTS["sous-titre"] = OPTIONS_ELEMENTS.titre;
var MOUVEMENTS = {
  tourne: { args: "*", aide: "tourne sur lui-m\xEAme : tourne, tourne 90/s, tourne au defilement, tourne x", exemple: "tourne au defilement" },
  flotte: { args: "*", aide: "flotte doucement : flotte, flotte 0.3", exemple: "flotte" },
  saute: { args: "*", aide: "saute (une fois en action, sinon r\xE9guli\xE8rement)", exemple: "au clic -> saute" },
  pulse: { args: "*", aide: "grossit et r\xE9tr\xE9cit en rythme", exemple: "pulse" },
  balance: { args: "*", aide: "se balance de gauche \xE0 droite", exemple: "balance" },
  "suit-souris": { args: "*", aide: "r\xE9agit \xE0 la souris : suit souris, doux", exemple: "suit souris, doux" },
  "entre-depuis": { args: "*", aide: "apparition : gauche, droite, haut, bas, fondu, zoom", exemple: "entre depuis gauche" },
  parallaxe: { args: "*", aide: "bouge plus ou moins vite que le d\xE9filement", exemple: "parallaxe 0.3" },
  dit: { args: "*", aide: "bulle de dialogue", exemple: 'dit "Salut !"' },
  joue: { args: "*", aide: "joue une animation nomm\xE9e", exemple: 'joue "danse"' }
};
var MOTS_MOUVEMENT = /* @__PURE__ */ new Set(["doux", "rapide", "lent", "x", "y", "z", "au", "defilement", "gauche", "droite", "haut", "bas", "fondu", "zoom", "inverse", "boucle"]);
var LUMIERES = ["studio", "douce", "coucher-de-soleil", "nuit", "neon", "jour", "dramatique"];
var CAMERAS = ["fixe", "suit-souris", "vol", "libre", "orbite"];
var TRANSITIONS = ["fondu", "glisse", "zoom", "rideau", "aucune"];
var ELEMENTS = {
  section: { balise: "section", genre: "conteneur", positionnels: "[nom]", aide: "une partie de la page", exemple: "section gouts" },
  entete: { balise: "header", genre: "conteneur", positionnels: "", aide: "en-t\xEAte du site", exemple: "entete" },
  pied: { balise: "footer", genre: "conteneur", positionnels: "", aide: "pied de page", exemple: "pied" },
  nav: { balise: "nav", genre: "conteneur", positionnels: "", aide: "navigation", exemple: "nav" },
  grille: { balise: "div", genre: "conteneur", positionnels: "", aide: "grille de colonnes", exemple: "grille 3 colonnes, espace 24" },
  colonne: { balise: "div", genre: "conteneur", positionnels: "", aide: "empile ses enfants verticalement", exemple: "colonne espace 12" },
  ligne: { balise: "div", genre: "conteneur", positionnels: "", aide: "aligne ses enfants c\xF4te \xE0 c\xF4te", exemple: "ligne espace 12" },
  boite: { balise: "div", genre: "conteneur", positionnels: "", aide: "conteneur simple", exemple: "boite remplissage 24" },
  carte: { balise: "article", genre: "conteneur", positionnels: "[titre] [image]", aide: "carte (image + texte)", exemple: 'carte "Fraise" "fraise.png"' },
  titre: { balise: "h1", genre: "texte", positionnels: "texte", aide: "titre principal", exemple: 'titre "Bonjour", taille 64' },
  "sous-titre": { balise: "h2", genre: "texte", positionnels: "texte", aide: "titre secondaire", exemple: 'sous-titre "Nos go\xFBts"' },
  texte: { balise: "p", genre: "texte", positionnels: "texte", aide: "paragraphe", exemple: 'texte "Bienvenue {nom}"' },
  image: { balise: "img", genre: "media", positionnels: "source [description]", aide: "image", exemple: 'image "photo.jpg", coins 16' },
  video: { balise: "video", genre: "media", positionnels: "source", aide: "vid\xE9o", exemple: 'video "film.mp4", auto, boucle' },
  lien: { balise: "a", genre: "texte", positionnels: "texte adresse", aide: "lien", exemple: 'lien "Contact" "/contact"' },
  liens: { balise: "nav", genre: "special", positionnels: "texte, texte\u2026", aide: "menu de liens", exemple: "liens Accueil, Gouts, Boutique" },
  logo: { balise: "a", genre: "special", positionnels: "image ou texte", aide: "logo cliquable vers l'accueil", exemple: 'logo "crush.svg"' },
  bouton: { balise: "button", genre: "texte", positionnels: "texte", aide: "bouton", exemple: 'bouton "Acheter" -> panier.ajoute canette' },
  formulaire: { balise: "form", genre: "conteneur", positionnels: "", aide: "formulaire (-> action \xE0 l'envoi)", exemple: 'formulaire -> envoie "/api", { email }' },
  champ: { balise: "input", genre: "champ", positionnels: "etat [indication]", aide: "champ de saisie li\xE9 \xE0 un \xE9tat", exemple: 'champ email "Ton e-mail", type email' },
  zone: { balise: "textarea", genre: "champ", positionnels: "etat [indication]", aide: "zone de texte", exemple: 'zone message "Ton message"' },
  choix: { balise: "select", genre: "champ", positionnels: "etat options\u2026", aide: "liste d\xE9roulante", exemple: 'choix taille "S", "M", "L"' },
  case: { balise: "input", genre: "champ", positionnels: "etat texte", aide: "case \xE0 cocher", exemple: `case accepte "J'accepte"` },
  liste: { balise: "ul", genre: "conteneur", positionnels: "", aide: "liste \xE0 puces", exemple: "liste" },
  element: { balise: "li", genre: "texte", positionnels: "texte", aide: "ligne d'une liste", exemple: 'element "Livraison offerte"' },
  icone: { balise: "span", genre: "texte", positionnels: "texte", aide: "ic\xF4ne (emoji ou caract\xE8re)", exemple: 'icone "\u2605"' },
  separateur: { balise: "hr", genre: "special", positionnels: "", aide: "ligne de s\xE9paration", exemple: "separateur" },
  espaceur: { balise: "div", genre: "special", positionnels: "[hauteur]", aide: "espace vide", exemple: "espaceur 48" },
  contenu: { balise: "div", genre: "special", positionnels: "", aide: "dans un composant : l\xE0 o\xF9 va le contenu donn\xE9 entre ses lignes", exemple: "contenu" },
  scene: { balise: "div", genre: "immersion", positionnels: "", aide: "zone immersive 2D ou 3D", exemple: "scene" },
  objet: { balise: "div", genre: "immersion", positionnels: "[nom] source", aide: "objet .glb, .gltf, .png, .svg, .json (Lottie)", exemple: 'objet canette "crush.glb"' },
  personnage: { balise: "div", genre: "immersion", positionnels: "[nom] source", aide: "objet anim\xE9 avec animations nomm\xE9es", exemple: 'personnage "mascotte.glb"' },
  son: { balise: "audio", genre: "immersion", positionnels: "source", aide: "son ou musique, avec bouton muet", exemple: 'son "ambiance.mp3", boucle' }
};
var REGLAGES = /* @__PURE__ */ new Set(["style", "mobile", "tablette", "ordinateur", "seo", "couleurs", "police", "polices", "langue", "favicon", "lumiere", "camera", "transition"]);
var EVENEMENTS = /* @__PURE__ */ new Set(["au-clic", "au-survol", "au-defilement", "au-chargement"]);
var ALIAS_STYLE = /* @__PURE__ */ new Map();
for (const [nom, s] of Object.entries(STYLES)) {
  ALIAS_STYLE.set(nom, nom);
  for (const a of s.alias ?? []) ALIAS_STYLE.set(a, nom);
}
function optionStyle(mot) {
  const m = sansAccents(mot);
  return ALIAS_STYLE.get(m);
}
function optionElement(tete, mot) {
  const table = OPTIONS_ELEMENTS[tete];
  if (!table) return void 0;
  const m = sansAccents(mot);
  for (const [nom, s] of Object.entries(table)) {
    if (nom === m || (s.alias ?? []).includes(m)) return nom;
  }
  return void 0;
}
function specOption(tete, nom) {
  return OPTIONS_ELEMENTS[tete]?.[nom] ?? STYLES[nom];
}
function toutesOptions(tete) {
  return [...Object.keys(OPTIONS_ELEMENTS[tete] ?? {}), ...Object.keys(STYLES).filter((s) => s !== "fond_image")];
}

// src/noyau/globaux.ts
var globaux_exports = {};
__export(globaux_exports, {
  FONCTIONS_KAURY: () => FONCTIONS_KAURY,
  GLOBAUX_JS: () => GLOBAUX_JS,
  METHODES: () => METHODES,
  PROPRIETES: () => PROPRIETES,
  VALEURS_KAURY: () => VALEURS_KAURY,
  globalKaury: () => globalKaury,
  methodeKaury: () => methodeKaury,
  nomsGlobaux: () => nomsGlobaux
});
var FONCTIONS_KAURY = {
  affiche: { js: "affiche", aide: "affiche une valeur dans la console", alias: ["print", "log"] },
  charge: { js: "charge", aide: 'r\xE9cup\xE8re des donn\xE9es (JSON ou texte) : attends charge "/api/produits"', alias: ["fetch", "load"] },
  envoie: { js: "envoie", aide: 'envoie des donn\xE9es : attends envoie "/api", { email }', alias: ["send", "post"] },
  somme: { js: "somme", aide: "somme d'une liste : somme panier, a -> a.prix", alias: ["sum"] },
  moyenne: { js: "moyenne", aide: "moyenne d'une liste", alias: ["average", "avg"] },
  minimum: { js: "minimum", aide: "plus petite valeur", alias: ["min"] },
  maximum: { js: "maximum", aide: "plus grande valeur", alias: ["max"] },
  arrondi: { js: "arrondi", aide: "arrondit : arrondi 3.14159, 2", alias: ["round"] },
  plancher: { js: "plancher", aide: "arrondi vers le bas", alias: ["floor"] },
  plafond: { js: "plafond", aide: "arrondi vers le haut", alias: ["ceil"] },
  absolu: { js: "absolu", aide: "valeur absolue", alias: ["abs"] },
  racine: { js: "racineCarree", aide: "racine carr\xE9e", alias: ["sqrt"] },
  aleatoire: { js: "aleatoire", aide: "nombre au hasard : aleatoire 1, 6", alias: ["random"] },
  hasard: { js: "hasard", aide: "\xE9l\xE9ment au hasard d'une liste", alias: ["pick"] },
  longueur: { js: "longueur", aide: "nombre d'\xE9l\xE9ments ou de lettres", alias: ["length", "len"] },
  maintenant: { js: "maintenant", aide: "date et heure actuelles", alias: ["now"] },
  "en-texte": { js: "enTexte", aide: "convertit en texte", alias: ["to-text", "str"] },
  "en-nombre": { js: "enNombre", aide: "convertit en nombre", alias: ["to-number", "num"] },
  prix: { js: "prix", aide: "formate un prix : prix 12.5 \u2192 \xAB 12.50 CHF \xBB", alias: ["price", "money"] },
  "format-date": { js: "formatDate", aide: "formate une date : format-date maintenant()", alias: ["format-date-fr"] },
  melange: { js: "melange", aide: "m\xE9lange une liste", alias: ["shuffle"] },
  intervalle: { js: "intervalle", aide: "liste de nombres : intervalle 1, 5", alias: ["range"] },
  repete: { js: "repete", aide: "r\xE9p\xE8te une action : repete 2s, -> compteur += 1", alias: ["every", "repeat"] },
  "plus-tard": { js: "plusTard", aide: "action diff\xE9r\xE9e : plus-tard 1s, -> ferme menu", alias: ["later"] },
  memorise: { js: "memorise", aide: 'garde un \xE9tat dans le navigateur : memorise "panier", panier', alias: ["persist"] },
  copie: { js: "copie", aide: "copie un texte dans le presse-papiers", alias: ["copy"] },
  confettis: { js: "confettis", aide: "lance des confettis \xE0 l'\xE9cran", alias: ["confetti"] },
  vibre: { js: "vibre", aide: "fait vibrer le t\xE9l\xE9phone", alias: ["vibrate"] },
  defile: { js: "defile", aide: 'fait d\xE9filer vers une section : defile "gouts"', alias: ["scroll-to"] },
  partage: { js: "partage", aide: "ouvre le partage du t\xE9l\xE9phone", alias: ["share"] }
};
var VALEURS_KAURY = {
  souris: { js: "souris", aide: "position de la souris : souris.x, souris.y (de -1 \xE0 1)", alias: ["mouse"] },
  defilement: { js: "defilement", aide: "progression du d\xE9filement de la page, de 0 \xE0 1", alias: ["scroll"] },
  ecran: { js: "ecran", aide: "taille de l'\xE9cran : ecran.largeur, ecran.mobile", alias: ["screen"] },
  route: { js: "route", aide: "page actuelle : route.chemin, route.params.id", alias: [] },
  objets: { js: "objets", aide: "objets 3D nomm\xE9s de la page", alias: [] }
};
var GLOBAUX_JS = /* @__PURE__ */ new Set([
  "Math",
  "JSON",
  "console",
  "window",
  "document",
  "fetch",
  "setTimeout",
  "setInterval",
  "clearTimeout",
  "clearInterval",
  "Date",
  "Promise",
  "localStorage",
  "sessionStorage",
  "navigator",
  "location",
  "history",
  "Object",
  "Array",
  "String",
  "Number",
  "Boolean",
  "Symbol",
  "Map",
  "Set",
  "WeakMap",
  "WeakSet",
  "Error",
  "Intl",
  "URL",
  "URLSearchParams",
  "requestAnimationFrame",
  "cancelAnimationFrame",
  "alert",
  "confirm",
  "prompt",
  "parseInt",
  "parseFloat",
  "isNaN",
  "isFinite",
  "globalThis",
  "structuredClone",
  "crypto",
  "performance",
  "Audio",
  "Image",
  "HTMLElement",
  "CustomEvent",
  "Event",
  "FormData",
  "Blob",
  "File",
  "Response",
  "Request",
  "Headers",
  "AbortController",
  "encodeURIComponent",
  "decodeURIComponent",
  "queueMicrotask",
  "matchMedia",
  "getComputedStyle",
  "IntersectionObserver",
  "ResizeObserver",
  "MutationObserver",
  "process",
  "Infinity",
  "NaN",
  "undefined",
  "BigInt",
  "RegExp",
  "Reflect",
  "Proxy",
  "TextEncoder",
  "TextDecoder",
  "WebSocket",
  "Worker",
  "EventSource",
  "atob",
  "btoa",
  "Notification",
  "speechSynthesis",
  "SpeechSynthesisUtterance"
]);
var INDEX = /* @__PURE__ */ new Map();
for (const [nom, f] of Object.entries({ ...FONCTIONS_KAURY, ...VALEURS_KAURY })) {
  INDEX.set(nom, nom);
  for (const a of f.alias ?? []) if (!INDEX.has(a)) INDEX.set(a, nom);
}
function globalKaury(nom) {
  return INDEX.get(nom);
}
function nomsGlobaux() {
  return [...INDEX.keys(), ...GLOBAUX_JS];
}
var METHODES = {
  ajoute: ["add", "push"],
  retire: ["remove"],
  vide: ["clear"],
  filtre: ["filter"],
  transforme: ["map"],
  trie: ["sort", "sort-by"],
  inverse: ["reverse"],
  trouve: ["find"],
  contient: ["includes", "contains"],
  joint: ["join"],
  chaque: ["each", "forEach"],
  compte: ["count"],
  unique: ["uniq"],
  prends: ["take"],
  somme: ["sum"],
  majuscules: ["upper", "toUpperCase"],
  minuscules: ["lower", "toLowerCase"],
  remplace: ["replace"],
  coupe: ["split"],
  "commence-par": ["starts-with", "startsWith"],
  "finit-par": ["ends-with", "endsWith"],
  nettoie: ["trim"],
  cles: ["keys"],
  valeurs: ["values"],
  premier: ["first"],
  dernier: ["last"],
  longueur: ["length", "len"],
  insere: ["insert"],
  "mets-a-jour": ["update"]
};
var PROPRIETES = /* @__PURE__ */ new Set(["longueur", "premier", "dernier", "cles", "valeurs", "vide-t-il"]);
var INDEX_METHODES = /* @__PURE__ */ new Map();
for (const [nom, alias] of Object.entries(METHODES)) {
  INDEX_METHODES.set(nom, nom);
  for (const a of alias) if (!INDEX_METHODES.has(a)) INDEX_METHODES.set(a, nom);
}
function methodeKaury(nom) {
  return INDEX_METHODES.get(nom);
}

// src/noyau/verificateur.ts
var Portee = class {
  constructor(genre, parent) {
    this.genre = genre;
    this.parent = parent;
  }
  genre;
  parent;
  noms = /* @__PURE__ */ new Map();
  cherche(nom) {
    return this.noms.get(nom) ?? this.parent?.cherche(nom);
  }
  /** Portée qui reçoit les déclarations implicites (« x = 3 » sans soit). */
  hote() {
    let p = this;
    while (p.genre === "bloc" && p.parent) p = p.parent;
    if (p.genre === "action") {
      let q = p.parent;
      while (q && q.genre !== "page" && q.genre !== "composant" && q.genre !== "module") q = q.parent;
      return q ?? p;
    }
    return p;
  }
  estVue() {
    return this.genre === "module" || this.genre === "page" || this.genre === "composant";
  }
  tous() {
    return [...this.noms.keys(), ...this.parent?.tous() ?? []];
  }
};
function verifie(programme, options = {}) {
  const v = new Verificateur();
  v.fichier = options.fichier;
  v.module(programme);
  for (const e of [...v.erreurs, ...v.avertissements]) e.fichier = options.fichier;
  return { erreurs: v.erreurs, avertissements: v.avertissements, infos: v.infos };
}
var Verificateur = class {
  fichier;
  erreurs = [];
  avertissements = [];
  infos = { pages: [], composants: [], immersion: false, troisD: false, lottie: false, couleurs: {}, exports: [] };
  composants = /* @__PURE__ */ new Set();
  err(pos, quoi, essaie) {
    this.erreurs.push(new ErreurKaury(pos, quoi, essaie));
  }
  attention(pos, quoi, essaie) {
    this.avertissements.push(new ErreurKaury(pos, quoi, essaie, "avertissement"));
  }
  // ------------------------------------------------------------------
  module(prog) {
    const p = new Portee("module");
    for (const i of prog) if (i.k === "site") this.lisCouleursSite(i.corps);
    this.hisse(prog, p);
    const tardif = (i) => i.k === "page" || i.k === "composant" || i.k === "site" || i.k === "commande";
    this.instructions(prog.filter((i) => !tardif(i)), p);
    for (const i of prog.filter(tardif)) this.instruction(i, p);
    const vues = /* @__PURE__ */ new Map();
    for (const pg of this.infos.pages) {
      if (vues.has(pg.chemin)) this.err(pg.pos, `la page \xAB ${pg.chemin} \xBB existe d\xE9j\xE0 (ligne ${vues.get(pg.chemin).ligne}).`, "donne une adresse diff\xE9rente \xE0 chaque page.");
      vues.set(pg.chemin, pg.pos);
    }
    for (const [nom, l] of p.noms) {
      if (!l.utilise && l.genre === "etat" && !this.infos.exports.includes(nom) && l.pos) {
        this.attention(l.pos, `l'\xE9tat \xAB ${nom} \xBB n'est jamais utilis\xE9.`, "supprime-le, ou affiche-le quelque part.");
      }
    }
  }
  lisCouleursSite(corps) {
    for (const i of corps) {
      if (i.k === "commande" && i.tete === "couleurs") {
        for (const it of i.items) {
          const [n, c] = it.atomes;
          if (n?.k === "nom" && c?.k === "couleur") this.infos.couleurs[n.nom] = c.v;
          else if (n?.k === "nom" && c?.k === "nom" && couleurConnue(c.nom)) this.infos.couleurs[n.nom] = `var(--k-${couleurConnue(c.nom)})`;
          else this.err(it.pos, "chaque couleur s'\xE9crit \xAB nom #code \xBB.", "couleurs rose #FF4F8B, creme #FFF4E8");
        }
      }
    }
  }
  /** Déclare d'avance ce qu'un bloc définit (fonctions, composants, états…) pour l'utiliser avant sa ligne. */
  hisse(corps, p) {
    for (const i of corps) {
      switch (i.k) {
        case "fonction":
          this.declare(p, i.nom, "fonction", i.pos);
          if (i.exporte) this.infos.exports.push(i.nom);
          break;
        case "composant":
          this.declare(p, i.nom, "composant", i.pos);
          this.composants.add(i.nom);
          this.infos.composants.push(i.nom);
          if (i.exporte) this.infos.exports.push(i.nom);
          break;
        case "importe":
          for (const n of [i.defaut, i.tout, ...(i.noms ?? []).map((x) => x.alias ?? x.nom)]) {
            if (n) {
              this.declare(p, n, new RegExp("^\\p{Lu}", "u").test(n) && i.source.endsWith(".kaury") ? "composant" : "import", i.pos);
              if (new RegExp("^\\p{Lu}", "u").test(n)) this.composants.add(n);
            }
          }
          break;
      }
    }
  }
  declare(p, nom, genre, pos) {
    if (MOTS_RESERVES.has(canon(nom) ?? "") && canon(nom) === nom) {
      this.err(pos, `\xAB ${nom} \xBB est un mot r\xE9serv\xE9 de Kaury ; il ne peut pas servir de nom.`, `choisis un autre nom, par exemple \xAB mon-${nom} \xBB.`);
    }
    const deja = p.noms.get(nom);
    if (deja && deja.genre !== "fonction" && genre !== "variable" && deja.pos && deja.pos !== pos && p.genre !== "module") {
      if (deja.genre === genre) {
        this.err(pos, `\xAB ${nom} \xBB est d\xE9j\xE0 d\xE9clar\xE9 ligne ${deja.pos.ligne}.`, `pour changer sa valeur, \xE9cris simplement \xAB ${nom} = \u2026 \xBB.`);
      }
    }
    const l = { genre, nom, pos };
    p.noms.set(nom, l);
    return l;
  }
  // ------------------------------------------------------------------
  instructions(corps, p) {
    this.hisseImplicites(corps, p);
    for (const i of corps) this.instruction(i, p);
  }
  hisseImplicites(corps, p) {
    const hote = p.hote();
    const explicites = /* @__PURE__ */ new Set();
    const cherche = (liste) => {
      for (const i of liste) {
        if (i.k === "soit") explicites.add(i.nom);
        else if (i.k === "si") {
          cherche(i.alors);
          i.sinonSi.forEach((x) => cherche(x.corps));
          if (i.sinon) cherche(i.sinon);
        } else if (i.k === "pour" || i.k === "tantque") cherche(i.corps);
        else if (i.k === "essaie") {
          cherche(i.corps);
          if (i.erreur) cherche(i.erreur);
        } else if (i.k === "commande" && hote.estVue()) cherche(i.enfants);
      }
    };
    cherche(corps);
    const parcours = (liste, dansAction) => {
      for (const i of liste) {
        if (i.k === "affecte" && i.cible.k === "nom" && i.op === "=") {
          const nom = i.cible.nom;
          if (!p.cherche(nom) && !explicites.has(nom) && !globalKaury(nom) && !GLOBAUX_JS.has(nom)) {
            const vue = hote.estVue();
            const l = this.declare(hote, nom, vue ? "etat" : "variable", i.pos);
            l.modifie = true;
            i.declare = l;
            void dansAction;
          }
        }
        if (i.k === "si") {
          parcours(i.alors, dansAction);
          for (const s of i.sinonSi) parcours(s.corps, dansAction);
          if (i.sinon) parcours(i.sinon, dansAction);
        } else if (i.k === "pour" || i.k === "tantque") parcours(i.corps, dansAction);
        else if (i.k === "essaie") {
          parcours(i.corps, dansAction);
          if (i.erreur) parcours(i.erreur, dansAction);
        } else if (i.k === "commande" && hote.estVue()) {
          parcours(i.enfants, dansAction);
          if (i.action) parcours(i.action, true);
        }
      }
    };
    parcours(corps, false);
  }
  instruction(i, p) {
    switch (i.k) {
      case "soit": {
        this.expr(i.valeur, p);
        let genre = i.reactif ? "etat" : "fixe";
        if (!i.reactif && p.hote().estVue() && this.litDuReactif(i.valeur, p)) genre = "derive";
        if (i.reactif && !p.hote().estVue() && p.genre !== "bloc") {
        }
        const l = this.declare(p, i.nom, genre, i.pos);
        i.liaison = l;
        if (i.exporte) this.infos.exports.push(i.nom);
        break;
      }
      case "affecte": {
        this.expr(i.valeur, p);
        if (i.cible.k === "nom") {
          const l = i.declare ?? p.cherche(i.cible.nom);
          if (!l) {
            this.nomInconnu(i.cible.nom, i.cible.pos, p);
          } else {
            i.cible.liaison = l;
            l.modifie = true;
            if (!i.declare) l.utilise = true;
            if (l.genre === "fixe" || l.genre === "derive") {
              this.err(
                i.pos,
                `\xAB ${i.cible.nom} \xBB est d\xE9clar\xE9 avec \xAB soit \xBB : sa valeur est fixe.`,
                `d\xE9clare-le avec \xAB etat ${i.cible.nom} = \u2026 \xBB pour pouvoir le changer.`
              );
            } else if (l.genre === "fonction" || l.genre === "composant") {
              this.err(i.pos, `\xAB ${i.cible.nom} \xBB est une ${l.genre}, on ne peut pas lui donner une valeur.`, "choisis un autre nom de variable.");
            } else if (l.genre === "prop") {
              this.err(
                i.pos,
                `\xAB ${i.cible.nom} \xBB est un param\xE8tre du composant : il vient de l'ext\xE9rieur et ne se modifie pas ici.`,
                `copie-le dans un \xE9tat : etat ${i.cible.nom}-local = ${i.cible.nom}`
              );
            }
          }
        } else this.expr(i.cible, p);
        break;
      }
      case "fonction": {
        const f = new Portee("fonction", p);
        for (const prm of i.params) {
          if (prm.defaut) this.expr(prm.defaut, p);
          this.declare(f, prm.nom, "param", prm.pos);
        }
        this.hisse(i.corps, f);
        this.instructions(i.corps, f);
        break;
      }
      case "si": {
        this.expr(i.cond, p);
        this.bloc(i.alors, p);
        for (const s of i.sinonSi) {
          this.expr(s.cond, p);
          this.bloc(s.corps, p);
        }
        if (i.sinon) this.bloc(i.sinon, p);
        break;
      }
      case "pour": {
        this.expr(i.source, p);
        const b = new Portee("bloc", p);
        this.declare(b, i.variable, "boucle", i.pos);
        if (i.index) this.declare(b, i.index, "boucle", i.pos);
        this.hisse(i.corps, b);
        this.instructions(i.corps, b);
        break;
      }
      case "tantque":
        this.expr(i.cond, p);
        this.bloc(i.corps, p);
        break;
      case "essaie": {
        this.bloc(i.corps, p);
        if (i.erreur) {
          const b = new Portee("bloc", p);
          if (i.variable) this.declare(b, i.variable, "variable", i.pos);
          this.instructions(i.erreur, b);
        }
        break;
      }
      case "importe":
        break;
      case "retourne":
        if (i.valeur) this.expr(i.valeur, p);
        break;
      case "arrete":
      case "continue":
        break;
      case "expr":
        this.expr(i.e, p);
        break;
      case "bascule": {
        this.expr(i.cible, p);
        if (i.cible.k === "nom" && i.cible.liaison) i.cible.liaison.modifie = true;
        break;
      }
      case "aller":
        this.expr(i.chemin, p);
        break;
      case "js":
        break;
      case "composant": {
        const c = new Portee("composant", p);
        for (const prm of i.params) {
          if (prm.defaut) this.expr(prm.defaut, p);
          this.declare(c, prm.nom, "prop", prm.pos);
        }
        this.hisse(i.corps, c);
        this.instructions(i.corps, c);
        break;
      }
      case "page": {
        this.infos.pages.push({ chemin: i.chemin, pos: i.pos });
        const pg = new Portee("page", p);
        for (const m of i.chemin.matchAll(/:([\p{L}_][\p{L}\p{N}_-]*)/gu)) this.declare(pg, m[1], "fixe", i.pos);
        this.hisse(i.corps, pg);
        this.instructions(i.corps, pg);
        break;
      }
      case "site": {
        if (i.nom) this.expr(i.nom, p);
        for (const c of i.corps) {
          if (c.k !== "commande" || !["couleurs", "police", "polices", "langue", "favicon", "seo", "style", "transition", "mobile", "tablette", "ordinateur", "son"].includes(c.tete)) {
            this.err(
              c.pos,
              "dans \xAB site \xBB, on ne met que des r\xE9glages : couleurs, police, langue, favicon, seo, style, transition.",
              'd\xE9place cet \xE9l\xE9ment dans une page "/".'
            );
            continue;
          }
          this.commande(c, p, "site");
        }
        break;
      }
      case "commande":
        this.commande(i, p, void 0);
        break;
    }
  }
  bloc(corps, p) {
    const b = new Portee("bloc", p);
    this.hisse(corps, b);
    this.instructions(corps, b);
  }
  /** L'expression lit-elle un état (directement ou via un dérivé) ? */
  litDuReactif(e, p) {
    let oui = false;
    const voit = (x) => {
      if (oui) return;
      switch (x.k) {
        case "nom": {
          const l = x.liaison ?? p.cherche(x.nom);
          if (l && (l.genre === "etat" || l.genre === "derive" || l.genre === "prop")) oui = true;
          if (!l && ["souris", "defilement", "ecran", "route"].includes(globalKaury(x.nom) ?? "")) oui = true;
          break;
        }
        case "texte":
          for (const m of x.morceaux) if (typeof m !== "string") voit(m);
          break;
        case "liste":
          x.elements.forEach(voit);
          break;
        case "objet":
          x.props.forEach((pp) => voit(pp.valeur));
          break;
        case "membre":
          voit(x.objet);
          break;
        case "index":
          voit(x.objet);
          voit(x.index);
          break;
        case "appel":
          voit(x.fn);
          x.args.forEach(voit);
          break;
        case "binaire":
          voit(x.g);
          voit(x.d);
          break;
        case "unaire":
        case "etale":
          voit(x.e);
          break;
        case "si":
          voit(x.cond);
          voit(x.alors);
          voit(x.sinon);
          break;
        case "intervalle":
          voit(x.de);
          voit(x.a);
          break;
        case "lambda":
          if (!Array.isArray(x.corps)) voit(x.corps);
          break;
        case "attends":
          break;
      }
    };
    voit(e);
    return oui;
  }
  // ------------------------------------------------------------------
  nomInconnu(nom, pos, p) {
    const candidats = [...p.tous(), ...nomsGlobaux()];
    const s = proche(nom, candidats);
    if (nom.includes("-")) {
      const morceaux = nom.split("-");
      if (morceaux.every((m) => p.cherche(m) || /^\d/.test(m))) {
        this.err({ ...pos, longueur: nom.length }, `\xAB ${nom} \xBB n'existe pas.`, `pour soustraire, mets des espaces : ${morceaux.join(" - ")}`);
        return;
      }
    }
    const c = canon(nom);
    if (c && ELEMENTS[c]) {
      this.err({ ...pos, longueur: nom.length }, `\xAB ${nom} \xBB est un \xE9l\xE9ment d'interface ; il doit \xEAtre en d\xE9but de ligne.`, `passe \xE0 la ligne : ${nom} "\u2026"`);
      return;
    }
    this.err(
      { ...pos, longueur: nom.length },
      `\xAB ${nom} \xBB n'existe pas.`,
      s ? `tu voulais dire \xAB ${s} \xBB ?` : `d\xE9clare-le avant : soit ${nom} = \u2026   (ou etat ${nom} = \u2026 s'il change)`
    );
  }
  expr(e, p) {
    switch (e.k) {
      case "nombre":
      case "couleur":
      case "bool":
      case "rien":
        return;
      case "texte":
        for (const m of e.morceaux) if (typeof m !== "string") this.expr(m, p);
        return;
      case "nom": {
        const l = p.cherche(e.nom);
        if (l) {
          e.liaison = l;
          l.utilise = true;
          return;
        }
        const g = globalKaury(e.nom);
        if (g) {
          e.liaison = { genre: "kaury", nom: g };
          return;
        }
        if (GLOBAUX_JS.has(e.nom)) {
          e.liaison = { genre: "js", nom: e.nom };
          return;
        }
        this.nomInconnu(e.nom, e.pos, p);
        return;
      }
      case "liste":
        e.elements.forEach((x) => this.expr(x, p));
        return;
      case "objet":
        e.props.forEach((x) => this.expr(x.valeur, p));
        return;
      case "membre":
        this.expr(e.objet, p);
        return;
      case "index":
        this.expr(e.objet, p);
        this.expr(e.index, p);
        return;
      case "appel":
        this.expr(e.fn, p);
        e.args.forEach((x) => this.expr(x, p));
        if (e.fn.k === "nom" && e.fn.liaison?.genre === "composant") {
          this.err(e.pos, `\xAB ${e.fn.nom} \xBB est un composant : il s'utilise en d\xE9but de ligne, pas comme une fonction.`, `${e.fn.nom} ${e.args.length ? "\u2026" : ""}`.trim());
        }
        return;
      case "binaire":
        this.expr(e.g, p);
        this.expr(e.d, p);
        return;
      case "unaire":
      case "etale":
      case "attends":
        this.expr(e.e, p);
        return;
      case "lambda": {
        const l = new Portee("lambda", p);
        for (const n of e.params) this.declare(l, n, "param", e.pos);
        if (Array.isArray(e.corps)) {
          const a = new Portee("action", l);
          this.hisse(e.corps, a);
          this.instructions(e.corps, a);
        } else this.expr(e.corps, l);
        return;
      }
      case "si":
        this.expr(e.cond, p);
        this.expr(e.alors, p);
        this.expr(e.sinon, p);
        return;
      case "intervalle":
        this.expr(e.de, p);
        this.expr(e.a, p);
        return;
    }
  }
  // ------------------------------------------------------------------
  // Lignes d'interface
  commande(c, p, parent) {
    const tete = c.tete;
    const estComposant = new RegExp("^\\p{Lu}", "u").test(tete);
    if (estComposant) {
      const l = p.cherche(tete);
      if (!l) {
        const s = proche(tete, this.composants);
        this.err(
          { ...c.pos, longueur: tete.length },
          `le composant \xAB ${tete} \xBB n'existe pas.`,
          s ? `tu voulais dire \xAB ${s} \xBB ?` : `cr\xE9e-le avec \xAB composant ${tete} \u2026 \xBB ou importe-le : importe ${tete} de "./${tete.toLowerCase()}.kaury"`
        );
      } else l.utilise = true;
      const positionnels2 = [];
      for (const it of c.items) for (const a of it.atomes) {
        this.expr(a, p);
        positionnels2.push(a);
      }
      c.sens = { genre: "composant", positionnels: positionnels2, options: [] };
      this.enfants(c, p);
      return;
    }
    const estMouvement = !!MOUVEMENTS[tete];
    const genre = ELEMENTS[tete] ? "element" : EVENEMENTS.has(tete) ? "evenement" : estMouvement ? "mouvement" : tete === "style" ? "style" : ["mobile", "tablette", "ordinateur"].includes(tete) ? "reactif-ecran" : "reglage";
    if (ELEMENTS[tete]?.genre === "immersion" || ["scene", "lumiere", "camera"].includes(tete) || estMouvement) this.infos.immersion = true;
    const positionnels = [];
    const options = [];
    let nomObjet;
    let dansSurvol = false;
    const teteOptions = genre === "reactif-ecran" || genre === "style" ? parent ?? "boite" : tete;
    for (const it of c.items) {
      const a = it.atomes;
      const a0 = a[0];
      if (!a0) continue;
      const mot = a0.k === "nom" ? a0.nom : void 0;
      if (estMouvement && mot && (MOTS_MOUVEMENT.has(canon(mot) ?? mot) || MOTS_MOUVEMENT.has(mot))) {
        let nom = canon(mot) ?? mot;
        let valeurs = a.slice(1);
        if (nom === "au" && a[1]?.k === "nom" && canon(a[1].nom) === "defilement") {
          nom = "au-defilement";
          valeurs = a.slice(2);
        }
        valeurs.forEach((x) => this.expr(x, p));
        options.push({ nom, valeurs, pos: it.pos });
        continue;
      }
      let opt = mot ? optionElement(teteOptions, mot) ?? (genre !== "mouvement" && genre !== "evenement" ? optionStyle(mot) : void 0) : void 0;
      if (opt && mot && a.length === 1 && p.cherche(mot) && (specOption(teteOptions, opt)?.args ?? "").replace(/\?/g, "").length > 0) opt = void 0;
      if (opt) {
        const valeurs = a.slice(1);
        valeurs.forEach((x) => this.verifieValeur(x, p));
        if (opt === "survol") dansSurvol = true;
        options.push({ nom: dansSurvol && opt !== "survol" ? `survol:${opt}` : opt, valeurs, pos: it.pos });
        if (opt === "survol" && valeurs.length) {
          const v0 = valeurs[0];
          const sous = v0.k === "nom" ? optionStyle(v0.nom) : void 0;
          if (!sous) this.err(it.pos, "\xAB survol \xBB doit \xEAtre suivi d'un style.", "survol monte 4   ou   survol fond rose");
          else {
            options.pop();
            options.push({ nom: `survol:${sous}`, valeurs: valeurs.slice(1), pos: it.pos });
          }
        }
        this.valideOption(tete, opt, valeurs, it.pos);
        continue;
      }
      if (a0.k === "nombre" && a[1]?.k === "nom") {
        const o2 = optionElement(teteOptions, a[1].nom) ?? optionStyle(a[1].nom);
        if (o2) {
          options.push({ nom: dansSurvol ? `survol:${o2}` : o2, valeurs: [a0, ...a.slice(2)], pos: it.pos });
          continue;
        }
      }
      if (a.length === 1 && (a0.k === "couleur" || mot && !p.cherche(mot) && (this.infos.couleurs[mot] || couleurConnue(mot)))) {
        options.push({ nom: dansSurvol ? "survol:teinte" : "teinte", valeurs: [a0], pos: it.pos });
        continue;
      }
      if (mot && !p.cherche(mot) && !globalKaury(mot) && !GLOBAUX_JS.has(mot)) {
        if (["section", "boite", "grille", "ligne", "colonne", "scene", "carte", "formulaire", "liste"].includes(tete) && !positionnels.length && a.length === 1 && !nomObjet) {
          nomObjet = mot;
          continue;
        }
        if ((tete === "objet" || tete === "personnage") && a.length >= 2 && !nomObjet) {
          nomObjet = mot;
          a.slice(1).forEach((x) => {
            this.expr(x, p);
            positionnels.push(x);
          });
          continue;
        }
        if (tete === "liens") {
          positionnels.push(...a);
          continue;
        }
        if (["champ", "zone", "choix", "case"].includes(tete) && !positionnels.length) {
          const hote = p.hote();
          const l = this.declare(hote, mot, hote.estVue() ? "etat" : "variable", it.pos);
          l.modifie = true;
          l.utilise = true;
          if (a0.k === "nom") a0.liaison = l;
          positionnels.push(a0);
          a.slice(1).forEach((x) => {
            this.expr(x, p);
            positionnels.push(x);
          });
          continue;
        }
        if (genre === "mouvement" || genre === "evenement" || genre === "reglage") {
          positionnels.push(...a);
          for (const x of a.slice(1)) this.expr(x, p);
          continue;
        }
        if (genre === "style" || genre === "reactif-ecran" || ELEMENTS[tete]) {
          const toutes = [...toutesOptions(teteOptions), ...Object.keys(this.infos.couleurs)];
          const s = proche(mot, toutes);
          const sv = proche(mot, p.tous());
          this.err(
            { ...it.pos, longueur: mot.length },
            `\xAB ${mot} \xBB n'est ni une option de \xAB ${c.teteBrute} \xBB, ni un nom connu.`,
            s ? `tu voulais dire \xAB ${s} \xBB ?` : sv ? `tu voulais dire la variable \xAB ${sv} \xBB ?` : `options possibles : ${toutesOptions(teteOptions).slice(0, 8).join(", ")}\u2026`
          );
          continue;
        }
      }
      for (const x of a) {
        this.expr(x, p);
        positionnels.push(x);
      }
    }
    c.sens = { genre, positionnels, options, nomObjet };
    this.valideCommande(c, p, parent);
    if (nomObjet && (tete === "objet" || tete === "personnage")) {
      const l = this.declare(p.hote(), nomObjet, "objet", c.pos);
      l.utilise = true;
    }
    this.enfants(c, p);
  }
  verifieValeur(x, p) {
    if (x.k === "nom" && !p.cherche(x.nom) && !globalKaury(x.nom) && !GLOBAUX_JS.has(x.nom)) return;
    this.expr(x, p);
  }
  valideOption(tete, opt, valeurs, pos) {
    const s = specOption(tete, opt);
    if (!s || s.args === "*" || s.args === "e?") return;
    const requis = s.args.replace(/.\?/g, "").length;
    const max = s.args.replace(/\?/g, "").length;
    if (valeurs.length < requis) {
      this.err(pos, `\xAB ${opt} \xBB attend ${requis === 1 ? "une valeur" : `${requis} valeurs`}.`, `${s.exemple}   (si c'est ta variable \xAB ${opt} \xBB, \xE9cris (${opt}))`);
    } else if (valeurs.length > max && s.args !== "e") {
      this.err(pos, `\xAB ${opt} \xBB prend au plus ${max === 0 ? "aucune valeur" : max === 1 ? "une valeur" : `${max} valeurs`}.`, `s\xE9pare les options par des virgules : ${s.exemple}`);
    }
    if (s.mots && valeurs[0]?.k === "nom" && !s.mots.includes(canon(valeurs[0].nom) ?? valeurs[0].nom)) {
      const w = valeurs[0].nom;
      const sug = proche(w, s.mots);
      this.err(pos, `\xAB ${opt} \xBB n'accepte pas \xAB ${w} \xBB.`, sug ? `tu voulais dire \xAB ${opt} ${sug} \xBB ?` : `valeurs possibles : ${s.mots.join(", ")}`);
    }
  }
  valideCommande(c, p, parent) {
    const s = c.sens;
    const n = s.positionnels.length;
    switch (c.tete) {
      case "image":
      case "video":
        if (!n) this.err(c.pos, `\xAB ${c.teteBrute} \xBB a besoin de son fichier.`, `${c.teteBrute} "photo.jpg"`);
        break;
      case "lien":
        if (!n) this.err(c.pos, "\xAB lien \xBB a besoin d'un texte et d'une adresse.", 'lien "Contact" "/contact"');
        break;
      case "objet":
      case "personnage": {
        if (!n) this.err(c.pos, `\xAB ${c.teteBrute} \xBB a besoin de son fichier.`, `${c.teteBrute} canette "crush.glb"`);
        const src = s.positionnels[0];
        if (src?.k === "texte" && src.morceaux.length === 1 && typeof src.morceaux[0] === "string") {
          const f = src.morceaux[0].toLowerCase();
          if (/\.(glb|gltf)(\?|$)/.test(f)) this.infos.troisD = true;
          else if (/\.(json|lottie)(\?|$)/.test(f)) this.infos.lottie = true;
          else if (!/\.(png|jpe?g|webp|avif|gif|svg)(\?|$)/.test(f)) {
            this.err(src.pos, `format de fichier non reconnu pour \xAB ${c.teteBrute} \xBB.`, "formats accept\xE9s : .glb, .gltf (3D), .png, .jpg, .webp, .svg (2D), .json (Lottie).");
          }
        } else if (src) this.infos.troisD = true;
        break;
      }
      case "lumiere": {
        const m = s.positionnels[0];
        const nom = m?.k === "nom" ? m.nom : void 0;
        if (!nom || !LUMIERES.includes(nom)) {
          const sug = nom ? proche(nom, LUMIERES) : void 0;
          this.err(c.pos, `lumi\xE8re inconnue${nom ? ` \xAB ${nom} \xBB` : ""}.`, sug ? `tu voulais dire \xAB lumiere ${sug} \xBB ?` : `ambiances : ${LUMIERES.join(", ")}`);
        }
        break;
      }
      case "camera": {
        const mots = s.positionnels.map((m) => m.k === "nom" ? canon(m.nom) ?? m.nom : "").join("-");
        if (!CAMERAS.includes(mots)) this.err(c.pos, `cam\xE9ra inconnue \xAB ${mots || "\u2026"} \xBB.`, `modes : ${CAMERAS.join(", ").replace("suit-souris", "suit souris")}`);
        break;
      }
      case "transition": {
        const m = s.positionnels[0];
        const nom = m?.k === "nom" ? m.nom : void 0;
        if (!nom || !TRANSITIONS.includes(nom)) this.err(c.pos, `transition inconnue${nom ? ` \xAB ${nom} \xBB` : ""}.`, `transitions : ${TRANSITIONS.join(", ")}`);
        break;
      }
      case "entre-depuis": {
        if (!s.options.length) this.err(c.pos, "\xAB entre depuis \xBB attend une direction.", "entre depuis gauche   (gauche, droite, haut, bas, fondu, zoom)");
        break;
      }
      case "tourne": {
        const v = s.positionnels[0];
        if (v && v.k === "nom" && !v.liaison) {
          this.err(v.pos, `\xAB tourne \xBB attend une vitesse.`, "tourne 20/s  ou  tourne au defilement");
        }
        break;
      }
    }
    if (s.genre === "evenement" && !c.action) {
      this.err(c.pos, `\xAB ${c.teteBrute.replace("-", " ")} \xBB doit \xEAtre suivi d'une action avec \xAB -> \xBB.`, "au clic -> saute");
    }
    if ((s.genre === "style" || s.genre === "reactif-ecran") && !parent && c.enfants.length === 0 && s.options.length === 0) {
      this.err(c.pos, `\xAB ${c.teteBrute} \xBB vide.`, "style fond creme, coins 12");
    }
    if (c.action && s.genre === "element" && !["bouton", "formulaire", "lien", "objet", "personnage", "carte", "image", "boite", "icone", "texte", "titre", "section", "champ", "case", "choix", "zone", "ligne", "colonne", "grille", "logo", "element"].includes(c.tete)) {
      this.attention(c.pos, `une action \xAB -> \xBB sur \xAB ${c.teteBrute} \xBB se d\xE9clenche au clic.`);
    }
  }
  enfants(c, p) {
    if (c.action) {
      const a = new Portee("action", p);
      this.hisse(c.action, a);
      this.instructions(c.action, a);
    }
    if (c.enfants.length) {
      const b = new Portee("bloc", p);
      this.hisse(c.enfants, b);
      for (const e of c.enfants) {
        if (e.k === "commande") this.commande(e, b, c.tete);
        else this.instruction(e, b);
      }
    }
  }
};

// src/noyau/css.ts
function litteral(e, couleursSite) {
  if (!e) return void 0;
  switch (e.k) {
    case "nombre":
      return e.unite && e.unite !== "px" ? `${e.v}${e.unite}` : e.v;
    case "couleur":
      return e.v;
    case "texte":
      if (e.morceaux.every((m) => typeof m === "string")) return e.morceaux.join("");
      return void 0;
    case "nom":
      if (e.liaison && e.liaison.genre !== "kaury" && e.liaison.genre !== "js") return void 0;
      if (couleursSite[e.nom]) return `var(--k-${e.nom})`;
      {
        const c = couleurConnue(e.nom);
        if (c) return `var(--k-${c})`;
      }
      return canon(e.nom) ?? sansAccents(e.nom);
    case "unaire":
      if (e.op === "-" && e.e.k === "nombre") return -e.e.v;
      return void 0;
    case "bool":
      return e.v ? "vrai" : "faux";
  }
  return void 0;
}
var px = (v, defaut = "0") => v === void 0 ? defaut : typeof v === "number" ? `${v}px` : v;
function couleurCss(v) {
  if (v === void 0) return void 0;
  return String(v);
}
function hexDe(v, couleursSite) {
  if (v.startsWith("#")) return v;
  const m = /^var\(--k-([\w-]+)\)$/.exec(v);
  if (m) {
    const n = m[1];
    if (couleursSite[n]?.startsWith("#")) return couleursSite[n];
    if (COULEURS[n]?.startsWith("#")) return COULEURS[n];
  }
  return void 0;
}
function clair(hex) {
  let h = hex.replace("#", "");
  if (h.length === 3 || h.length === 4) h = h.split("").slice(0, 3).map((c) => c + c).join("");
  const r = parseInt(h.slice(0, 2), 16) / 255, g = parseInt(h.slice(2, 4), 16) / 255, b = parseInt(h.slice(4, 6), 16) / 255;
  const lin = (c) => c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  const L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return L > 0.45;
}
var OMBRES = {
  douce: "0 10px 30px -12px rgba(0,0,0,.18), 0 2px 6px rgba(0,0,0,.06)",
  moyenne: "0 18px 40px -14px rgba(0,0,0,.28), 0 4px 10px rgba(0,0,0,.08)",
  forte: "0 30px 60px -20px rgba(0,0,0,.45), 0 8px 18px rgba(0,0,0,.12)",
  aucune: "none",
  interieure: "inset 0 2px 8px rgba(0,0,0,.15)"
};
var TEXTES = /* @__PURE__ */ new Set(["titre", "sous-titre", "texte", "lien", "icone", "element", "liens"]);
function declarations(tete, opt, vals, couleursSite) {
  const v0 = vals[0];
  switch (opt) {
    case "teinte": {
      const c = couleurCss(v0);
      if (TEXTES.has(tete)) return { decl: [["color", c]] };
      return { decl: [["background", c], ...contraste(c, couleursSite)] };
    }
    case "fond": {
      if (typeof v0 === "string" && /\.(png|jpe?g|webp|avif|gif|svg)$/i.test(v0)) {
        const u = /^(\/|[a-z][a-z0-9+.-]*:)/i.test(v0) ? v0 : "/" + v0.replace(/^\.\//, "");
        return { decl: [["background", `center/cover no-repeat url("${u}")`]] };
      }
      const c = couleurCss(v0) ?? "transparent";
      return { decl: [["background", c], ...contraste(c, couleursSite)] };
    }
    case "couleur":
      return { decl: [["color", couleurCss(v0) ?? "inherit"]] };
    case "police":
      return { decl: [["font-family", `"${v0}", var(--k-police-secours)`]] };
    case "taille": {
      if (typeof v0 === "number" && (tete === "titre" || tete === "sous-titre") && v0 > 36) {
        return { decl: [["font-size", `clamp(${Math.round(v0 * 0.48)}px, ${(v0 / 13).toFixed(2)}vw, ${v0}px)`]] };
      }
      return { decl: [["font-size", px(v0)]] };
    }
    case "gras":
      return { decl: [["font-weight", "700"]] };
    case "leger":
      return { decl: [["font-weight", "300"]] };
    case "poids":
      return { decl: [["font-weight", String(v0)]] };
    case "italique":
      return { decl: [["font-style", "italic"]] };
    case "souligne":
      return { decl: [["text-decoration", "underline"]] };
    case "majuscules":
      return { decl: [["text-transform", "uppercase"], ["letter-spacing", ".06em"]] };
    case "interligne":
      return { decl: [["line-height", String(v0)]] };
    case "lettres":
      return { decl: [["letter-spacing", px(v0)]] };
    case "aligne": {
      const m = { gauche: "left", centre: "center", droite: "right", justifie: "justify" };
      return { decl: [["text-align", m[String(v0)] ?? "left"]] };
    }
    case "centre":
      return { decl: [["text-align", "center"], ["align-items", "center"], ["justify-content", "center"], ["margin-inline", "auto"]] };
    case "coins":
      return { decl: [["border-radius", px(v0)], ["overflow", "hidden"]] };
    case "rond":
      return { decl: [["border-radius", "999px"]] };
    case "ombre":
      return { decl: [["box-shadow", OMBRES[String(v0 ?? "douce")] ?? (typeof v0 === "number" ? `0 ${v0}px ${Number(v0) * 3}px -${v0}px rgba(0,0,0,.25)` : OMBRES.douce)]] };
    case "bordure": {
      const ep = typeof v0 === "number" ? v0 : 1;
      const coul = vals.find((x) => typeof x === "string") ?? "currentColor";
      return { decl: [["border", `${ep}px solid ${coul}`]] };
    }
    case "marge":
      return { decl: [["margin", vals.map((x) => px(x)).join(" ")]] };
    case "remplissage":
      return { decl: [["padding", vals.map((x) => px(x)).join(" ")]] };
    case "espace":
      return { decl: [["gap", px(v0)]] };
    case "largeur":
      return { decl: [["width", px(v0)], ["max-width", "100%"]] };
    case "hauteur":
      return { decl: [["height", px(v0)]] };
    case "max-largeur":
      return { decl: [["max-width", px(v0)], ["margin-inline", "auto"], ["width", "100%"]] };
    case "min-hauteur":
      return { decl: [["min-height", px(v0)]] };
    case "plein-ecran":
      return { decl: [["min-height", "100svh"], ["display", "flex"], ["flex-direction", "column"], ["justify-content", "center"]] };
    case "pleine-largeur":
      return { decl: [["max-width", "none"], ["width", "100%"], ["padding-inline", "0"]] };
    case "opacite":
      return { decl: [["opacity", String(v0)]] };
    case "flou":
      return { decl: [["filter", `blur(${px(v0)})`]] };
    case "verre":
      return { decl: [["background", "color-mix(in srgb, var(--k-fond) 55%, transparent)"], ["backdrop-filter", "blur(16px) saturate(1.4)"], ["-webkit-backdrop-filter", "blur(16px) saturate(1.4)"], ["border", "1px solid color-mix(in srgb, var(--k-texte) 10%, transparent)"]] };
    case "degrade": {
      const coul = vals.filter((x) => typeof x === "string");
      const angle = vals.find((x) => typeof x === "number") ?? 135;
      return { decl: [["background", `linear-gradient(${angle}deg, ${coul.join(", ")})`]] };
    }
    case "texte-degrade": {
      const coul = vals.filter((x) => typeof x === "string");
      return { decl: [["background", `linear-gradient(90deg, ${coul.join(", ")})`], ["-webkit-background-clip", "text"], ["background-clip", "text"], ["color", "transparent"]] };
    }
    case "colonnes":
      return { decl: [["--k-colonnes", String(v0)], ["grid-template-columns", `repeat(${v0}, minmax(0, 1fr))`]] };
    case "direction":
      return { decl: [["display", "flex"], ["flex-direction", v0 === "ligne" ? "row" : "column"]] };
    case "cache":
      return { decl: [["display", "none"]] };
    case "colle":
      return { decl: [["position", "sticky"], ["top", "0"], ["z-index", "50"]] };
    case "devant":
      return { decl: [["position", "relative"], ["z-index", "10"]] };
    case "curseur": {
      const m = { main: "pointer", fleche: "default", texte: "text", aucun: "none" };
      return { decl: [["cursor", m[String(v0)] ?? "pointer"]] };
    }
    case "monte":
      return { decl: [], transform: `translateY(${-Number(v0 ?? 4)}px)` };
    case "grossit":
      return { decl: [], transform: `scale(${v0 ?? 1.05})` };
    case "penche":
      return { decl: [], transform: `rotate(${v0 ?? 2}deg)` };
    case "anime":
      return { decl: [["animation", `k-${v0} .8s cubic-bezier(.2,.7,.2,1) both`]] };
  }
  return { decl: [] };
}
function contraste(c, couleursSite) {
  const hex = hexDe(c, couleursSite);
  if (!hex) return [];
  return [["color", clair(hex) ? "var(--k-encre, #111)" : "#fff"]];
}
var POLICES_FONTSHARE = /* @__PURE__ */ new Set([
  "Clash Display",
  "Clash Grotesk",
  "Satoshi",
  "General Sans",
  "Cabinet Grotesk",
  "Switzer",
  "Zodiak",
  "Erode",
  "Gambetta",
  "Supreme",
  "Chillax",
  "Panchang",
  "Boska",
  "Sentient",
  "Ranade",
  "Tanker",
  "Author",
  "Bespoke Serif",
  "Excon",
  "Melodrama",
  "Pally",
  "Synonym",
  "Telma",
  "Rowan",
  "Khand",
  "Plus Jakarta Sans",
  "Nippo",
  "Hoover"
]);
var POLICES_SYSTEME = /* @__PURE__ */ new Set(["system-ui", "serif", "sans-serif", "monospace", "Arial", "Helvetica", "Georgia", "Times New Roman"]);
function lienPolice(nom) {
  if (POLICES_SYSTEME.has(nom)) return void 0;
  if (POLICES_FONTSHARE.has(nom)) {
    return `https://api.fontshare.com/v2/css?f[]=${nom.toLowerCase().replace(/ /g, "-")}@300,400,500,600,700&display=swap`;
  }
  return `https://fonts.googleapis.com/css2?family=${nom.replace(/ /g, "+")}:wght@300;400;500;600;700;800&display=swap`;
}

// src/noyau/traducteur.ts
var RESERVES_JS = /* @__PURE__ */ new Set([
  "break",
  "case",
  "catch",
  "class",
  "const",
  "continue",
  "debugger",
  "default",
  "delete",
  "do",
  "else",
  "enum",
  "export",
  "extends",
  "false",
  "finally",
  "for",
  "function",
  "if",
  "import",
  "in",
  "instanceof",
  "new",
  "null",
  "return",
  "super",
  "switch",
  "this",
  "throw",
  "true",
  "try",
  "typeof",
  "var",
  "void",
  "while",
  "with",
  "yield",
  "let",
  "static",
  "implements",
  "interface",
  "package",
  "private",
  "protected",
  "public",
  "await",
  "arguments",
  "eval"
]);
function jsNom(n) {
  let s = n.replace(/-/g, "$");
  if (RESERVES_JS.has(s) || s.startsWith("$k")) s = s + "$";
  return s;
}
var cleJs = (k) => /^[\p{L}_$][\p{L}\p{N}_$]*$/u.test(k) ? k : JSON.stringify(k);
function traduit(prog, infos, options = {}) {
  const t = new Traducteur(infos, options.fichier ?? "site.kaury");
  return t.module(prog, options.runtime ?? "kaury/runtime");
}
var Traducteur = class {
  constructor(infos, fichier) {
    this.infos = infos;
    let h = 0;
    for (const c of fichier) h = h * 31 + c.charCodeAt(0) >>> 0;
    this.prefixe = "k" + (h % 46656).toString(36);
  }
  infos;
  lignes = [];
  sources = [];
  retrait = 0;
  ligneSource = 1;
  compteur = 0;
  classes = 0;
  css = [];
  polices = /* @__PURE__ */ new Set();
  site = {};
  prefixe;
  ecris(code, pos) {
    if (pos) this.ligneSource = pos.ligne;
    for (const l of code.split("\n")) {
      this.lignes.push("  ".repeat(this.retrait) + l);
      this.sources.push(this.ligneSource);
    }
  }
  nouveau(base = "n") {
    return `$${base}${++this.compteur}`;
  }
  module(prog, runtime) {
    this.ecris(`import * as $k from ${JSON.stringify(runtime)}`);
    for (const i of prog) if (i.k === "importe") this.importe(i);
    const vars = Object.entries(this.infos.couleurs).map(([n, c]) => `--k-${n}:${c}`);
    if (vars.length) this.css.push(`:root{${vars.join(";")}}`);
    const premiere = Object.keys(this.infos.couleurs)[0];
    if (premiere && !this.infos.couleurs.accent) this.css.push(`:root{--k-accent:var(--k-${premiere})}`);
    const pages = [];
    let siteObj = "{}";
    this.declarationsImplicites(prog, true);
    for (const i of prog) {
      if (i.k === "importe") continue;
      if (i.k === "page") {
        pages.push(this.page(i));
        continue;
      }
      if (i.k === "site") {
        siteObj = this.siteDecl(i);
        continue;
      }
      if (i.k === "commande") {
        continue;
      }
      this.instruction(i, { vue: false });
    }
    const libres = prog.filter((i) => i.k === "commande");
    if (libres.length && !this.infos.pages.some((p) => p.chemin === "/")) {
      pages.push(this.page({ k: "page", chemin: "/", corps: libres, pos: libres[0].pos }));
    }
    this.ecris(`export const $pages = [${pages.join(", ")}]`);
    this.ecris(`export const $site = ${siteObj}`);
    this.ecris(`export const $immersion = ${JSON.stringify({ troisD: this.infos.troisD, lottie: this.infos.lottie, actif: this.infos.immersion })}`);
    const css = this.css.join("\n");
    this.ecris(`export const $css = ${JSON.stringify(css)}`);
    this.ecris(`export const $polices = ${JSON.stringify([...this.polices])}`);
    return {
      js: this.lignes.join("\n"),
      css,
      carte: this.sources.map((s, g) => ({ genere: g + 1, source: s })),
      polices: [...this.polices],
      site: this.site
    };
  }
  importe(i) {
    let src = i.source;
    const parts = [];
    if (i.defaut) parts.push(jsNom(i.defaut));
    if (i.noms) parts.push(`{ ${i.noms.map((n) => n.alias ? `${cleJs(n.nom)} as ${jsNom(n.alias)}` : jsNom(n.nom)).join(", ")} }`);
    if (i.tout) parts.push(`* as ${jsNom(i.tout)}`);
    if (src.endsWith(".kaury") && i.defaut && new RegExp("^\\p{Lu}", "u").test(i.defaut) && !i.noms) {
      this.ecris(`import { ${jsNom(i.defaut)} } from ${JSON.stringify(src)}`, i.pos);
      return;
    }
    this.ecris(parts.length ? `import ${parts.join(", ")} from ${JSON.stringify(src)}` : `import ${JSON.stringify(src)}`, i.pos);
  }
  // ---------------------------------------------------------------- site
  siteDecl(i) {
    const props = [];
    if (i.nom) {
      props.push(`nom: ${this.ex(i.nom)}`);
      const l = litteral(i.nom, {});
      if (typeof l === "string") this.site.nom = l;
    }
    const regles = [];
    for (const c of i.corps) {
      if (c.k !== "commande" || !c.sens) continue;
      const p0 = c.sens.positionnels;
      switch (c.tete) {
        case "police":
        case "polices": {
          const noms = p0.map((x) => litteral(x, {})).filter((x) => typeof x === "string");
          noms.forEach((n) => this.polices.add(n));
          if (noms[0]) this.css.push(`:root{--k-police:"${noms[0]}", var(--k-police-secours)}`);
          if (noms[1]) this.css.push(`:root{--k-police-titres:"${noms[1]}", var(--k-police-secours)}`);
          break;
        }
        case "langue":
          props.push(`langue: ${this.ex(p0[0])}`);
          this.site.langue = String(litteral(p0[0], {}) ?? "fr");
          break;
        case "favicon":
          props.push(`favicon: ${this.ex(p0[0])}`);
          break;
        case "seo":
          props.push(`seo: ${this.seo(c)}`);
          break;
        case "transition":
          props.push(`transition: ${JSON.stringify(String(litteral(p0[0], {}) ?? "fondu"))}`);
          break;
        case "son":
          props.push(`son: ${this.ex(p0[0])}`);
          break;
        case "style":
        case "mobile":
        case "tablette":
        case "ordinateur":
          regles.push(c);
          break;
      }
    }
    if (regles.length) {
      this.reglesStyle("body", "site", regles, true);
      for (const r of regles) {
        if (r.tete !== "style") continue;
        for (const o of r.sens.options) {
          const v = litteral(o.valeurs[0], this.infos.couleurs);
          if (v === void 0) continue;
          if (o.nom === "fond" || o.nom === "teinte") {
            this.css.push(`:root{--k-fond:${v}}`);
            const hex = hexDe(String(v), this.infos.couleurs);
            if (hex && !clair(hex)) this.css.push(`:root{--k-ligne:rgba(255,255,255,.12);--k-doux:rgba(255,255,255,.62)}`);
          }
          if (o.nom === "couleur") this.css.push(`:root{--k-texte:${v};--k-encre:${v}}`);
        }
      }
    }
    return `{ ${props.join(", ")} }`;
  }
  seo(c) {
    const p = c.sens.positionnels;
    const props = [];
    if (p[0]) props.push(`titre: ${this.ex(p[0])}`);
    if (p[1]) props.push(`description: ${this.ex(p[1])}`);
    const img = c.sens.options.find((o) => o.nom === "image");
    if (img?.valeurs[0]) props.push(`image: ${this.ex(img.valeurs[0])}`);
    return `{ ${props.join(", ")} }`;
  }
  // ---------------------------------------------------------------- pages
  page(i) {
    const fn = this.nouveau("page");
    const params = [...i.chemin.matchAll(/:([\p{L}_][\p{L}\p{N}_-]*)/gu)].map((m) => m[1]);
    this.ecris(`function ${fn}($route) {`, i.pos);
    this.retrait++;
    for (const p of params) this.ecris(`const ${jsNom(p)} = $route.params[${JSON.stringify(p)}]`);
    const racine = this.nouveau("page");
    this.ecris(`const ${racine} = $k.h("main", "k-page")`);
    let seo = "null";
    const corps = i.corps.filter((x) => {
      if (x.k === "commande" && x.tete === "seo") {
        seo = this.seo(x);
        return false;
      }
      return true;
    });
    let transition = "null";
    const corps2 = corps.filter((x) => {
      if (x.k === "commande" && x.tete === "transition") {
        transition = JSON.stringify(String(litteral(x.sens.positionnels[0], {}) ?? "fondu"));
        return false;
      }
      return true;
    });
    this.contenu(corps2, { vue: true, parent: racine, cible: racine, teteParent: "page" }, "page");
    this.ecris(`return ${racine}`);
    this.retrait--;
    this.ecris("}");
    return `{ chemin: ${JSON.stringify(i.chemin)}, rendu: ${fn}, seo: ${seo}, transition: ${transition} }`;
  }
  /** Déclare en tête de portée les états/variables créés par « x = … » sans soit/etat. */
  dejaDeclares = /* @__PURE__ */ new Set();
  declarationsImplicites(corps, vue) {
    const vues = this.dejaDeclares;
    const parcours = (liste) => {
      for (const i of liste) {
        if (i.k === "affecte" && i.declare && !vues.has(i.declare)) {
          vues.add(i.declare);
          const n = jsNom(i.declare.nom);
          if (i.declare.genre === "etat") this.ecris(`const ${n} = $k.etat(null)`, i.pos);
          else this.ecris(`let ${n}`, i.pos);
        }
        if (i.k === "si") {
          parcours(i.alors);
          i.sinonSi.forEach((s) => parcours(s.corps));
          if (i.sinon) parcours(i.sinon);
        } else if (i.k === "pour" || i.k === "tantque") parcours(i.corps);
        else if (i.k === "essaie") {
          parcours(i.corps);
          if (i.erreur) parcours(i.erreur);
        } else if (i.k === "commande" && vue) {
          parcours(i.enfants);
          if (i.action) parcours(i.action);
          if (["champ", "zone", "choix", "case"].includes(i.tete)) {
            const a0 = i.sens?.positionnels[0];
            if (a0?.k === "nom" && a0.liaison && !vues.has(a0.liaison) && a0.liaison.pos === i.items[0]?.pos) {
              vues.add(a0.liaison);
              this.ecris(`const ${jsNom(a0.nom)} = $k.etat(${i.tete === "case" ? "false" : '""'})`, i.pos);
            }
          }
        }
      }
    };
    parcours(corps);
  }
  // ---------------------------------------------------------------- instructions (logique)
  bloc(corps, ctx, retourneDernier = false) {
    this.declarationsImplicitesLocales(corps, ctx);
    corps.forEach((i, n) => {
      if (retourneDernier && n === corps.length - 1 && i.k === "expr") {
        this.ecris(`return ${this.ex(i.e)}`, i.pos);
      } else this.instruction(i, ctx);
    });
  }
  declarationsImplicitesLocales(corps, ctx) {
    if (ctx.vue) return;
    const vues = this.dejaDeclares;
    const parcours = (liste) => {
      for (const i of liste) {
        if (i.k === "affecte" && i.declare && i.declare.genre === "variable" && !vues.has(i.declare)) {
          vues.add(i.declare);
          this.ecris(`let ${jsNom(i.declare.nom)}`, i.pos);
        }
        if (i.k === "si") {
          parcours(i.alors);
          i.sinonSi.forEach((s) => parcours(s.corps));
          if (i.sinon) parcours(i.sinon);
        } else if (i.k === "pour" || i.k === "tantque") parcours(i.corps);
        else if (i.k === "essaie") {
          parcours(i.corps);
          if (i.erreur) parcours(i.erreur);
        }
      }
    };
    parcours(corps);
  }
  instruction(i, ctx) {
    this.ligneSource = i.pos.ligne;
    switch (i.k) {
      case "soit": {
        const n = jsNom(i.nom);
        const ex = i.exporte ? "export " : "";
        const g = i.liaison?.genre;
        if (g === "etat") this.ecris(`${ex}const ${n} = $k.etat(${this.ex(i.valeur)})`, i.pos);
        else if (g === "derive") this.ecris(`${ex}const ${n} = $k.derive(() => ${this.ex(i.valeur)})`, i.pos);
        else this.ecris(`${ex}const ${n} = ${this.ex(i.valeur)}`, i.pos);
        return;
      }
      case "affecte": {
        const val = this.ex(i.valeur);
        const cible = this.cible(i.cible);
        if (contientAttends(i.valeur) && ctx.vue) {
          this.ecris(`;(async () => { try { ${cible} ${i.op} ${val} } catch ($e) { $k.signale($e) } })()`, i.pos);
        } else this.ecris(`${cible} ${i.op} ${val}`, i.pos);
        return;
      }
      case "fonction": {
        const asy = contientAttendsCorps(i.corps) ? "async " : "";
        const ex = i.exporte ? "export " : "";
        this.ecris(`${ex}${asy}function ${jsNom(i.nom)}(${i.params.map((p) => jsNom(p.nom) + (p.defaut ? ` = ${this.ex(p.defaut)}` : "")).join(", ")}) {`, i.pos);
        this.retrait++;
        this.bloc(i.corps, { vue: false }, true);
        this.retrait--;
        this.ecris("}");
        return;
      }
      case "si": {
        if (ctx.vue) return this.siVue(i, ctx);
        this.ecris(`if (${this.ex(i.cond)}) {`, i.pos);
        this.retrait++;
        this.bloc(i.alors, ctx);
        this.retrait--;
        for (const s of i.sinonSi) {
          this.ecris(`} else if (${this.ex(s.cond)}) {`, s.pos);
          this.retrait++;
          this.bloc(s.corps, ctx);
          this.retrait--;
        }
        if (i.sinon) {
          this.ecris("} else {");
          this.retrait++;
          this.bloc(i.sinon, ctx);
          this.retrait--;
        }
        this.ecris("}");
        return;
      }
      case "pour": {
        if (ctx.vue) return this.pourVue(i, ctx);
        const v = jsNom(i.variable);
        if (i.index) {
          this.ecris(`for (const [${jsNom(i.index)}, ${v}] of $k.enListe(${this.ex(i.source)}).entries()) {`, i.pos);
        } else this.ecris(`for (const ${v} of $k.enListe(${this.ex(i.source)})) {`, i.pos);
        this.retrait++;
        this.bloc(i.corps, ctx);
        this.retrait--;
        this.ecris("}");
        return;
      }
      case "tantque":
        this.ecris(`while (${this.ex(i.cond)}) {`, i.pos);
        this.retrait++;
        this.bloc(i.corps, ctx);
        this.retrait--;
        this.ecris("}");
        return;
      case "essaie":
        this.ecris("try {", i.pos);
        this.retrait++;
        this.bloc(i.corps, ctx);
        this.retrait--;
        this.ecris(`} catch (${i.variable ? jsNom(i.variable) : "$e"}) {`);
        this.retrait++;
        if (i.erreur) this.bloc(i.erreur, ctx);
        this.retrait--;
        this.ecris("}");
        return;
      case "importe":
        return;
      case "retourne":
        this.ecris(i.valeur ? `return ${this.ex(i.valeur)}` : "return", i.pos);
        return;
      case "arrete":
        this.ecris("break", i.pos);
        return;
      case "continue":
        this.ecris("continue", i.pos);
        return;
      case "expr":
        if (ctx.vue && contientAttends(i.e)) {
          this.ecris(`;(async () => { try { ${this.ex(i.e)} } catch ($e) { $k.signale($e) } })()`, i.pos);
        } else this.ecris(this.ex(i.e), i.pos);
        return;
      case "bascule": {
        const c = this.cible(i.cible);
        const v = i.mode === "ouvre" ? "true" : i.mode === "ferme" ? "false" : `!${c}`;
        this.ecris(`${c} = ${v}`, i.pos);
        return;
      }
      case "aller":
        this.ecris(`$k.aller(${this.ex(i.chemin)})`, i.pos);
        return;
      case "js":
        this.ecris(i.code, i.pos);
        return;
      case "composant":
        return this.composant(i);
      case "page":
        return;
      case "site":
        return;
      case "commande":
        if (ctx.vue) return this.commandeVue(i, ctx);
        return this.commandeAction(i, ctx);
    }
  }
  cible(e) {
    if (e.k === "nom") {
      const l = e.liaison;
      if (l && (l.genre === "etat" || l.genre === "derive")) return `${jsNom(e.nom)}.v`;
      return jsNom(e.nom);
    }
    return this.ex(e);
  }
  // ---------------------------------------------------------------- composants
  composant(i) {
    const ex = i.exporte ? "export " : "";
    this.ecris(`${ex}function ${jsNom(i.nom)}($p = {}) {`, i.pos);
    this.retrait++;
    for (const p of i.params) {
      if (p.defaut) this.ecris(`if ($p[${JSON.stringify(p.nom)}] === undefined) Object.defineProperty($p, ${JSON.stringify(p.nom)}, { get: () => ${this.ex(p.defaut)} })`);
    }
    const frag = this.nouveau("c");
    this.ecris(`const ${frag} = $k.fragment()`);
    this.contenu(i.corps, { vue: true, parent: frag, cible: void 0, teteParent: "composant" }, "composant");
    this.ecris(`return $k.unique(${frag})`);
    this.retrait--;
    this.ecris("}");
    this.ecris(`${jsNom(i.nom)}.$params = ${JSON.stringify(i.params.map((p) => p.nom))}`);
  }
  // ---------------------------------------------------------------- interface
  /** Contenu d'un bloc d'interface : réglages appliqués au parent, puis enfants. */
  contenu(corps, ctx, teteParent) {
    this.declarationsImplicites(corps, true);
    for (const i of corps) {
      if (i.k === "commande" && i.sens && (i.sens.genre === "style" || i.sens.genre === "reactif-ecran")) {
        if (i.enfants.some((e) => e.k !== "commande" || !["style"].includes(e.tete))) {
          const w = this.nouveau();
          this.ecris(`const ${w} = $k.h("div", "k-seul-${i.tete}")`, i.pos);
          this.ecris(`${ctx.parent}.append(${w})`);
          this.contenu(i.enfants, { ...ctx, parent: w }, teteParent);
        }
        continue;
      }
      this.instruction(i, ctx);
    }
    const regles = corps.filter((i) => i.k === "commande" && !!i.sens && (i.sens.genre === "style" || i.sens.genre === "reactif-ecran"));
    if (regles.length && ctx.parent) {
      const cls = this.nouvelleClasse();
      const { dynamique } = this.reglesStyle("." + cls, teteParent, regles, false);
      this.ecris(`${ctx.parent}.classList?.add(${JSON.stringify(cls)})`);
      if (teteParent === "composant") this.ecris(`$k.classeRacine(${ctx.parent}, ${JSON.stringify(cls)})`);
      for (const d of dynamique) this.ecris(`$k.style(${ctx.parent}, ${JSON.stringify(d[0])}, () => ${d[1]})`);
    }
  }
  nouvelleClasse() {
    return `${this.prefixe}-${(++this.classes).toString(36)}`;
  }
  /** Transforme des lignes style/mobile/… en règles CSS pour un sélecteur. */
  reglesStyle(selecteur, tete, regles, _site) {
    const dynamique = [];
    const media = {
      mobile: "@media (max-width: 640px)",
      tablette: "@media (max-width: 1024px)",
      ordinateur: "@media (min-width: 1025px)"
    };
    for (const r of regles) {
      const ou = r.tete === "style" ? void 0 : media[r.tete];
      this.optionsVersCss(selecteur, tete, r.sens.options, ou, dynamique);
      for (const e of r.enfants) {
        if (e.k === "commande" && e.sens && (e.sens.genre === "reactif-ecran" || e.sens.genre === "style")) {
          this.optionsVersCss(selecteur, tete, e.sens.options, e.tete === "style" ? ou : media[e.tete], dynamique);
        }
      }
    }
    return { dynamique, statique: true };
  }
  /** Écrit les règles CSS des options ; renvoie les options dynamiques (qui dépendent du programme). */
  optionsVersCss(sel, tete, options, media, dynamique) {
    const normal = [];
    const survol = [];
    const tr = [];
    const trSurvol = [];
    let aCouleurTexte = false;
    for (const o of options) {
      const survolOpt = o.nom.startsWith("survol:");
      const nom = survolOpt ? o.nom.slice(7) : o.nom;
      if (OPTIONS_NON_STYLE.has(nom) && !survolOpt) continue;
      const vals = o.valeurs.map((v) => litteral(v, this.infos.couleurs));
      if (vals.some((v) => v === void 0) && o.valeurs.length) {
        if (!survolOpt && !media) {
          const prop = PROP_DYNAMIQUE[nom];
          if (prop) {
            const e = this.ex(o.valeurs[0]);
            dynamique.push([prop, UNITE_PX.has(nom) ? `$k.px(${e})` : nom === "teinte" && TEXTE_TETES.has(tete) ? e : e]);
            if (nom === "teinte" && !TEXTE_TETES.has(tete)) dynamique[dynamique.length - 1][0] = "background";
          }
        }
        continue;
      }
      const { decl, transform } = declarations(tete, nom, vals, this.infos.couleurs);
      if (nom === "couleur") aCouleurTexte = true;
      const cible = survolOpt ? survol : normal;
      for (const [p, v] of decl) {
        if (p === "color" && aCouleurTexte && nom !== "couleur" && !survolOpt) continue;
        if (p === "font-family") {
          const m = /^"([^"]+)"/.exec(v);
          if (m) this.polices.add(m[1]);
        }
        cible.push(`${p}:${v}`);
      }
      if (transform) (survolOpt ? trSurvol : tr).push(transform);
    }
    if (tr.length) normal.push(`transform:${tr.join(" ")}`);
    if (trSurvol.length) survol.push(`transform:${trSurvol.join(" ")}`);
    const ajoute = (s, decls) => {
      if (!decls.length) return;
      if (media && /^\.[\w-]+$/.test(s)) s = s + s;
      const regle = `${s}{${decls.join(";")}}`;
      this.css.push(media ? `${media}{${regle}}` : regle);
    };
    ajoute(sel, dedoublonne(normal));
    if (survol.length) {
      ajoute(sel, ["transition:transform .35s cubic-bezier(.2,.7,.2,1), box-shadow .35s, background .35s, color .35s, opacity .35s"]);
      ajoute(`${sel}:hover`, dedoublonne(survol));
    }
  }
  commandeVue(c, ctx) {
    const s = c.sens;
    const parent = ctx.parent;
    if (s.genre === "composant") {
      const props = [];
      const n = this.nouveau();
      const args = s.positionnels.map((p) => `() => ${this.ex(p)}`);
      let enfants = "null";
      if (c.enfants.length) {
        const fn = this.nouveau("slot");
        this.ecris(`const ${fn} = ($parent) => {`, c.pos);
        this.retrait++;
        this.contenu(c.enfants, { ...ctx, parent: "$parent" }, "boite");
        this.retrait--;
        this.ecris("}");
        enfants = fn;
      }
      this.ecris(`const ${n} = $k.composant(${jsNom(c.tete)}, [${args.join(", ")}], ${enfants}${props.length ? ", {" + props.join(", ") + "}" : ""})`, c.pos);
      this.ecris(`${parent}.append(${n})`);
      if (c.action) this.evenement(n, "click", c.action, ctx);
      return;
    }
    if (s.genre === "evenement") {
      const ev = { "au-clic": "click", "au-survol": "mouseenter", "au-defilement": "scroll", "au-chargement": "mount" };
      this.evenement(ctx.cible ?? parent, ev[c.tete], c.action ?? [], ctx);
      return;
    }
    if (s.genre === "mouvement") {
      this.ecris(`$k.mouvement(${ctx.cible ?? parent}, ${JSON.stringify(c.tete)}, ${this.optionsMouvement(c)})`, c.pos);
      return;
    }
    if (s.genre === "reglage") {
      switch (c.tete) {
        case "lumiere":
          this.ecris(`$k.reglage(${ctx.cible ?? parent}, "lumiere", ${JSON.stringify(this.mots(c))})`, c.pos);
          return;
        case "camera":
          this.ecris(`$k.reglage(${ctx.cible ?? parent}, "camera", ${JSON.stringify(this.mots(c))}, ${this.optionsObjet(c.sens.options)})`, c.pos);
          return;
        case "seo":
          this.ecris(`$k.seo(${this.seo(c)})`, c.pos);
          return;
        case "transition":
          return;
        default:
          return;
      }
    }
    this.element(c, ctx);
  }
  mots(c) {
    return c.sens.positionnels.map((m) => m.k === "nom" ? canon(m.nom) ?? sansAccents(m.nom) : String(litteral(m, {}))).join("-");
  }
  optionsMouvement(c) {
    const s = c.sens;
    const props = [];
    for (const o of s.options) {
      props.push(`${cleJs(o.nom)}: ${o.valeurs.length ? this.valeurMouvement(o.valeurs[0]) : "true"}`);
    }
    if (s.positionnels.length) {
      const p0 = s.positionnels[0];
      if (p0.k === "nombre") props.push(`vitesse: ${p0.v}`, `unite: ${JSON.stringify(p0.unite ?? "")}`);
      else if (p0.k === "nom" && !p0.liaison) props.push(`mot: ${JSON.stringify(canon(p0.nom) ?? sansAccents(p0.nom))}`);
      else props.push(`valeur: ${this.ex(p0)}`);
      if (s.positionnels[1]) props.push(`valeur2: ${this.ex(s.positionnels[1])}`);
    }
    return `{ ${props.join(", ")} }`;
  }
  valeurMouvement(e) {
    if (e.k === "nombre") return e.unite === "s" ? String(e.v * 1e3) : String(e.v);
    if (e.k === "nom" && !e.liaison) return JSON.stringify(canon(e.nom) ?? sansAccents(e.nom));
    return this.ex(e);
  }
  optionsObjet(options) {
    const props = [];
    for (const o of options) {
      const vals = o.valeurs.map((v) => v.k === "nom" && !v.liaison ? JSON.stringify(canon(v.nom) ?? sansAccents(v.nom)) : o.nom === "secours" ? this.exChemin(v) : this.exVal(v));
      props.push(`${cleJs(o.nom)}: ${vals.length === 0 ? "true" : vals.length === 1 ? vals[0] : `[${vals.join(", ")}]`}`);
    }
    return `{ ${props.join(", ")} }`;
  }
  /** Valeur d'option : couleurs nommées résolues. */
  /** Chemin de fichier : « photo.jpg » devient « /photo.jpg » (valable sur toutes les pages). */
  exChemin(v) {
    if (!v) return "null";
    const l = v.k === "texte" ? litteral(v, {}) : void 0;
    if (typeof l === "string") return JSON.stringify(cheminAsset(l));
    return `$k.chemin(${this.ex(v)})`;
  }
  exVal(v) {
    const l = litteral(v, this.infos.couleurs);
    if (l !== void 0 && (v.k === "nom" || v.k === "couleur")) return JSON.stringify(l);
    if (v.k === "nombre" && v.unite === "s") return String(v.v * 1e3);
    return this.ex(v);
  }
  evenement(cible, type, action, ctx) {
    const asy = contientAttendsCorps(action) ? "async " : "";
    this.ecris(`$k.sur(${cible}, ${JSON.stringify(type)}, ${asy}($evt) => {`);
    this.retrait++;
    this.declarationsImplicitesLocales(action, { vue: false });
    for (const a of action) this.instruction(a, { vue: false, cible: ctx.cible ?? cible });
    this.retrait--;
    this.ecris("})");
  }
  /** Une commande utilisée comme action : saute, tourne, dit "…", son "clic.mp3". */
  commandeAction(c, ctx) {
    const s = c.sens;
    if (!s) return;
    if (s.genre === "mouvement") {
      let cible = ctx.cible ?? "null";
      const p0 = s.positionnels[0];
      if (p0 && p0.k === "nom" && p0.liaison?.genre === "objet") cible = `$k.objetNomme(${JSON.stringify(p0.nom)})`;
      this.ecris(`$k.action(${cible}, ${JSON.stringify(c.tete)}, ${this.optionsMouvement(c)})`, c.pos);
      return;
    }
    if (c.tete === "son") {
      this.ecris(`$k.joueSon(${this.ex(s.positionnels[0])}, ${this.optionsObjet(s.options)})`, c.pos);
      return;
    }
    if (c.tete === "lumiere") {
      this.ecris(`$k.reglage(${ctx.cible ?? "null"}, "lumiere", ${JSON.stringify(this.mots(c))})`, c.pos);
      return;
    }
    this.ecris(`$k.signale(new Error(${JSON.stringify(`\xAB ${c.teteBrute} \xBB ne peut pas \xEAtre une action.`)}))`, c.pos);
  }
  // ---------------------------------------------------------------- éléments
  element(c, ctx) {
    const s = c.sens;
    const tete = c.tete;
    const spec = ELEMENTS[tete];
    const parent = ctx.parent;
    const n = this.nouveau();
    const p = s.positionnels;
    const opt = (nom) => s.options.find((o) => o.nom === nom);
    this.ligneSource = c.pos.ligne;
    if (tete === "objet" || tete === "personnage") {
      this.ecris(`const ${n} = $k.objet(${parent}, { genre: ${JSON.stringify(tete)}, src: ${this.exChemin(p[0])}, nom: ${JSON.stringify(s.nomObjet ?? null)}, options: ${this.optionsObjet(s.options)} })`, c.pos);
      this.classeStyle(n, tete, s.options, ["taille", "position", "rotation", "hauteur", "secours", "ombres", "texte", "anime"]);
      this.enfantsElement(c, { ...ctx, parent: n, cible: n, teteParent: tete });
      if (c.action) this.evenement(n, "click", c.action, { ...ctx, cible: n });
      return;
    }
    if (tete === "scene") {
      this.ecris(`const ${n} = $k.scene(${parent}, ${this.optionsObjet(s.options.filter((o) => ["hauteur", "fond", "brouillard", "sol", "particules"].includes(o.nom)))})`, c.pos);
      if (s.nomObjet) this.ecris(`${n}.id = ${JSON.stringify(s.nomObjet)}`);
      this.classeStyle(n, tete, s.options, ["hauteur", "fond", "brouillard", "sol", "particules"]);
      this.enfantsElement(c, { ...ctx, parent: n, cible: n, teteParent: tete });
      this.ecris(`$k.scenePrete(${n})`);
      return;
    }
    if (tete === "son") {
      this.ecris(`const ${n} = $k.son(${parent}, ${this.exChemin(p[0])}, ${this.optionsObjet(s.options)})`, c.pos);
      return;
    }
    let balise = spec?.balise ?? "div";
    if (tete === "titre") {
      const niv = opt("niveau")?.valeurs[0];
      if (niv?.k === "nombre") balise = `h${Math.min(6, Math.max(1, niv.v))}`;
    }
    if (tete === "bouton" && opt("vers")) balise = "a";
    const classes = [`k-${tete}`];
    if (tete === "section" && s.nomObjet) classes.push(`k-section-${s.nomObjet}`);
    for (const v of ["contour", "discret", "grand", "petit"]) if (opt(v)) classes.push(`k-${v}`);
    this.ecris(`const ${n} = $k.h(${JSON.stringify(balise)}, ${JSON.stringify(classes.join(" "))})`, c.pos);
    if (s.nomObjet) this.ecris(`${n}.id = ${JSON.stringify(s.nomObjet)}`);
    switch (tete) {
      case "titre":
      case "sous-titre":
      case "texte":
      case "element":
      case "icone":
        if (p.length) this.texte(n, p);
        break;
      case "bouton":
        if (p.length) this.texte(n, p.slice(0, 1));
        if (opt("vers")) this.attr(n, "href", opt("vers").valeurs[0]);
        else this.ecris(`${n}.type = ${JSON.stringify(this.dansFormulaire(ctx) && !c.action ? "submit" : "button")}`);
        {
          const d = opt("desactive");
          if (d) this.ecris(`$k.attr(${n}, "disabled", () => ${d.valeurs[0] ? this.ex(d.valeurs[0]) : "true"})`);
        }
        break;
      case "lien": {
        const texte = p[0];
        const href = p[1] ?? p[0];
        this.texte(n, [texte]);
        this.attr(n, "href", href);
        if (opt("nouvel")) this.ecris(`${n}.target = "_blank"; ${n}.rel = "noopener"`);
        break;
      }
      case "image": {
        this.attr(n, "src", p[0]);
        const alt = opt("texte")?.valeurs[0] ?? p[1];
        if (alt) this.attr(n, "alt", alt);
        else this.ecris(`${n}.alt = ""`);
        this.ecris(`${n}.loading = "lazy"; ${n}.decoding = "async"`);
        if (opt("couvre")) this.ecris(`${n}.classList.add("k-couvre")`);
        break;
      }
      case "video": {
        this.attr(n, "src", p[0]);
        const auto = !!opt("auto");
        if (auto || opt("muet")) this.ecris(`${n}.muted = true; ${n}.setAttribute("muted", "")`);
        if (auto) this.ecris(`${n}.autoplay = true; ${n}.setAttribute("autoplay", ""); ${n}.setAttribute("playsinline", "")`);
        if (opt("boucle")) this.ecris(`${n}.loop = true; ${n}.setAttribute("loop", "")`);
        if (opt("controles") || !auto) this.ecris(`${n}.controls = true; ${n}.setAttribute("controls", "")`);
        if (opt("couvre")) this.ecris(`${n}.classList.add("k-couvre")`);
        break;
      }
      case "carte": {
        if (p.length && p.some((x) => !(x.k === "texte" && litteral(x, {}) !== void 0))) {
          this.ecris(`$k.carte(${n}, [${p.map((x) => `() => ${this.ex(x)}`).join(", ")}])`);
          break;
        }
        const img = p.find((x) => estImage(x));
        const titres = p.filter((x) => x !== img);
        if (img) {
          const i2 = this.nouveau();
          this.ecris(`const ${i2} = $k.h("img", "k-carte-image")`);
          this.attr(i2, "src", img);
          if (titres[0]) this.attr(i2, "alt", titres[0]);
          this.ecris(`${i2}.loading = "lazy"; ${n}.append(${i2})`);
        }
        if (titres[0]) {
          const t2 = this.nouveau();
          this.ecris(`const ${t2} = $k.h("h3", "k-carte-titre")`);
          this.texte(t2, [titres[0]]);
          this.ecris(`${n}.append(${t2})`);
        }
        if (titres[1]) {
          const t3 = this.nouveau();
          this.ecris(`const ${t3} = $k.h("p", "k-carte-texte")`);
          this.texte(t3, [titres[1]]);
          this.ecris(`${n}.append(${t3})`);
        }
        break;
      }
      case "liens": {
        for (const x of p) {
          const a = this.nouveau();
          this.ecris(`const ${a} = $k.h("a", "k-lien-nav")`);
          if (x.k === "nom" && !x.liaison) {
            const libelle = x.nom.replace(/-/g, " ");
            this.ecris(`${a}.textContent = ${JSON.stringify(libelle)}`);
            this.ecris(`$k.lienAuto(${a}, ${JSON.stringify(x.nom)})`);
          } else if (x.k === "texte") {
            const l = litteral(x, {});
            this.texte(a, [x]);
            this.ecris(`$k.lienAuto(${a}, ${JSON.stringify(String(l ?? ""))})`);
          } else {
            this.texte(a, [x]);
          }
          this.ecris(`${n}.append(${a})`);
        }
        break;
      }
      case "logo": {
        this.ecris(`${n}.href = "/"; ${n}.setAttribute("aria-label", "Accueil")`);
        const x = p[0];
        if (x && estImage(x)) {
          const i2 = this.nouveau();
          this.ecris(`const ${i2} = $k.h("img", "k-logo-image")`);
          this.attr(i2, "src", x);
          this.ecris(`${i2}.alt = document.title || "Logo"; ${n}.append(${i2})`);
        } else if (x) this.texte(n, [x]);
        break;
      }
      case "separateur":
        break;
      case "contenu":
        this.ecris(`$k.contenu(${n}, $p.$enfants)`);
        break;
      case "espaceur":
        if (p[0]) this.ecris(`${n}.style.height = $k.px(${this.ex(p[0])})`);
        break;
      case "champ":
      case "zone":
      case "choix":
      case "case":
        this.champ(c, n);
        break;
      case "grille": {
        if (p[0]?.k === "nombre" && !opt("colonnes")) {
          s.options.push({ nom: "colonnes", valeurs: [p[0]], pos: p[0].pos });
        }
        break;
      }
    }
    this.classeStyle(n, tete, s.options, []);
    this.enfantsElement(c, { ...ctx, parent: n, cible: n, teteParent: tete });
    if (c.action) {
      const ev = tete === "formulaire" ? "submit" : ["champ", "zone"].includes(tete) ? "input" : ["choix", "case"].includes(tete) ? "change" : "click";
      this.evenement(n, ev, c.action, { ...ctx, cible: n });
    }
    if (tete === "formulaire") this.ecris(`$k.formulaire(${n})`);
    const final = ["champ", "zone", "choix", "case"].includes(tete) && (opt("etiquette") || tete === "case") ? `$k.etiquette(${n})` : n;
    this.ecris(`${parent}.append(${final})`);
  }
  dansFormulaire(ctx) {
    return ctx.teteParent === "formulaire";
  }
  champ(c, n) {
    const s = c.sens;
    const p = s.positionnels;
    const etat = p[0];
    const opt = (nom) => s.options.find((o) => o.nom === nom);
    const ref = etat && etat.k === "nom" ? this.cible(etat) : void 0;
    if (etat?.k === "nom") this.ecris(`${n}.name = ${JSON.stringify(etat.nom)}`);
    if (c.tete === "champ" || c.tete === "zone") {
      if (p[1]) this.attr(n, "placeholder", p[1]);
      const type = opt("type")?.valeurs[0];
      const types = { texte: "text", email: "email", nombre: "number", motdepasse: "password", date: "date", tel: "tel", url: "url", recherche: "search" };
      if (c.tete === "champ") this.ecris(`${n}.type = ${JSON.stringify(type?.k === "nom" ? types[type.nom] ?? "text" : "text")}`);
      if (opt("lignes")) this.ecris(`${n}.rows = ${this.ex(opt("lignes").valeurs[0])}`);
      if (ref) this.ecris(`$k.lie(${n}, () => ${ref}, ($v) => { ${ref} = $v }${type?.k === "nom" && type.nom === "nombre" ? ', "nombre"' : ""})`);
    } else if (c.tete === "choix") {
      const choix = p.slice(1);
      this.ecris(`$k.options(${n}, () => [${choix.map((x) => x.k === "liste" ? `...${this.ex(x)}` : x.k === "nom" && x.liaison ? `...$k.enListe(${this.ex(x)})` : this.ex(x)).join(", ")}])`);
      if (ref) this.ecris(`$k.lie(${n}, () => ${ref}, ($v) => { ${ref} = $v })`);
    } else if (c.tete === "case") {
      this.ecris(`${n}.type = "checkbox"`);
      if (p[1]) this.ecris(`${n}.dataset.etiquette = ${this.ex(p[1])}`);
      if (ref) this.ecris(`$k.lieCase(${n}, () => ${ref}, ($v) => { ${ref} = $v })`);
    }
    if (opt("requis")) this.ecris(`${n}.required = true`);
    const et = opt("etiquette")?.valeurs[0];
    if (et) this.ecris(`${n}.dataset.etiquette = ${this.ex(et)}`);
  }
  enfantsElement(c, ctx) {
    if (!c.enfants.length) return;
    this.contenu(c.enfants, ctx, c.tete);
  }
  /** Applique les options de style d'un élément via une classe générée. */
  classeStyle(n, tete, options, ignore) {
    const opts = options.filter((o) => !ignore.includes(o.nom) && !OPTIONS_NON_STYLE.has(o.nom.replace("survol:", "")));
    if (!opts.length) return;
    const cls = this.nouvelleClasse();
    const dynamique = [];
    this.optionsVersCss("." + cls, tete, opts, void 0, dynamique);
    this.ecris(`${n}.classList.add(${JSON.stringify(cls)})`);
    for (const d of dynamique) this.ecris(`$k.style(${n}, ${JSON.stringify(d[0])}, () => ${d[1]})`);
  }
  texte(n, morceaux) {
    const e = morceaux[0];
    if (!e) return;
    const l = e.k === "texte" || e.k === "nombre" ? litteral(e, {}) : void 0;
    if (l !== void 0) this.ecris(`${n}.textContent = ${JSON.stringify(String(l))}`);
    else this.ecris(`$k.texte(${n}, () => ${this.ex(e)})`);
  }
  attr(n, nom, e) {
    let l = e.k === "texte" ? litteral(e, {}) : void 0;
    if (l !== void 0 && (nom === "src" || nom === "poster")) l = cheminAsset(String(l));
    if (l !== void 0) this.ecris(`${n}.setAttribute(${JSON.stringify(nom)}, ${JSON.stringify(String(l))})`);
    else if (nom === "src" || nom === "poster") this.ecris(`$k.attr(${n}, ${JSON.stringify(nom)}, () => $k.chemin(${this.ex(e)}))`);
    else this.ecris(`$k.attr(${n}, ${JSON.stringify(nom)}, () => ${this.ex(e)})`);
  }
  siVue(i, ctx) {
    const branches = [];
    const fn = (corps) => {
      const nom = this.nouveau("br");
      this.ecris(`const ${nom} = ($parent) => {`);
      this.retrait++;
      this.contenu(corps, { ...ctx, parent: "$parent" }, ctx.teteParent ?? "boite");
      this.retrait--;
      this.ecris("}");
      return nom;
    };
    branches.push(`[() => ${this.ex(i.cond)}, ${fn(i.alors)}]`);
    for (const s of i.sinonSi) branches.push(`[() => ${this.ex(s.cond)}, ${fn(s.corps)}]`);
    if (i.sinon) branches.push(`[() => true, ${fn(i.sinon)}]`);
    this.ecris(`$k.si(${ctx.parent}, [${branches.join(", ")}])`, i.pos);
  }
  pourVue(i, ctx) {
    const v = jsNom(i.variable);
    const idx = i.index ? jsNom(i.index) : "$i";
    this.ecris(`$k.pour(${ctx.parent}, () => ${this.ex(i.source)}, (${v}, ${idx}, $parent) => {`, i.pos);
    this.retrait++;
    this.contenu(i.corps, { ...ctx, parent: "$parent" }, ctx.teteParent ?? "boite");
    this.retrait--;
    this.ecris("})");
  }
  // ---------------------------------------------------------------- expressions
  ex(e) {
    switch (e.k) {
      case "nombre":
        if (e.unite === "s") return String(e.v * 1e3);
        if (e.unite === "ms" || e.unite === "px" || e.unite === "deg" || !e.unite) return String(e.v);
        if (e.unite === "/s") return String(e.v);
        return JSON.stringify(`${e.v}${e.unite}`);
      case "texte": {
        if (e.morceaux.every((m) => typeof m === "string")) return JSON.stringify(e.morceaux.join(""));
        return "`" + e.morceaux.map((m) => typeof m === "string" ? m.replace(/[`\\]|\$\{/g, (x) => "\\" + x) : `\${$k.t(${this.ex(m)})}`).join("") + "`";
      }
      case "couleur":
        return JSON.stringify(e.v);
      case "bool":
        return e.v ? "true" : "false";
      case "rien":
        return "null";
      case "nom": {
        const l = e.liaison;
        if (!l) return jsNom(e.nom);
        switch (l.genre) {
          case "etat":
          case "derive":
            return `${jsNom(e.nom)}.v`;
          case "prop":
            return `$p[${JSON.stringify(e.nom)}]`;
          case "kaury": {
            const f = FONCTIONS_KAURY[l.nom] ?? VALEURS_KAURY[l.nom];
            if (l.nom === "defilement") return "$k.defilement.v";
            return `$k.${f?.js ?? jsNom(l.nom)}`;
          }
          case "objet":
            return `$k.objetNomme(${JSON.stringify(e.nom)})`;
          default:
            return jsNom(e.nom);
        }
      }
      case "liste":
        return `[${e.elements.map((x) => this.ex(x)).join(", ")}]`;
      case "objet":
        return `{ ${e.props.map((p) => p.etale ? `...${this.ex(p.valeur)}` : `${cleJs(p.cle)}: ${this.ex(p.valeur)}`).join(", ")} }`;
      case "membre": {
        const o = this.ex(e.objet);
        const m = methodeKaury(e.prop);
        if (m && PROPRIETES.has(m)) return `$k.prop(${o}, ${JSON.stringify(m)}, ${JSON.stringify(e.prop)})`;
        if (/^[\p{L}_$][\p{L}\p{N}_$]*$/u.test(e.prop)) return `${o}${e.optionnel ? "?." : "."}${e.prop}`;
        return `${o}${e.optionnel ? "?." : ""}[${JSON.stringify(e.prop)}]`;
      }
      case "index":
        return `${this.ex(e.objet)}[${this.ex(e.index)}]`;
      case "appel": {
        if (e.fn.k === "membre") {
          const m = methodeKaury(e.fn.prop);
          if (m) return `$k.m(${this.ex(e.fn.objet)}, ${JSON.stringify(m)}, ${JSON.stringify(e.fn.prop)}${e.args.map((a) => ", " + this.ex(a)).join("")})`;
        }
        if (e.fn.k === "nom" && e.fn.liaison?.genre === "kaury" && e.fn.liaison.nom === "memorise") {
          return `$k.memorise(${e.args.map((a) => a.k === "nom" && a.liaison?.genre === "etat" ? jsNom(a.nom) : this.ex(a)).join(", ")})`;
        }
        return `${this.ex(e.fn)}(${e.args.map((a) => this.ex(a)).join(", ")})`;
      }
      case "binaire": {
        const g = this.ex(e.g);
        const d = this.ex(e.d);
        switch (e.op) {
          case "==":
            return `$k.egal(${g}, ${d})`;
          case "!=":
            return `!$k.egal(${g}, ${d})`;
          case "dans":
            return `$k.dans(${g}, ${d})`;
          default:
            return `(${g} ${e.op} ${d})`;
        }
      }
      case "unaire":
        return `${e.op}${this.ex(e.e)}`;
      case "etale":
        return `...${this.ex(e.e)}`;
      case "lambda": {
        const asy = Array.isArray(e.corps) ? contientAttendsCorps(e.corps) ? "async " : "" : contientAttends(e.corps) ? "async " : "";
        const params = `(${e.params.map(jsNom).join(", ")})`;
        if (!Array.isArray(e.corps)) {
          const corps2 = this.ex(e.corps);
          return `${asy}${params} => ${corps2.startsWith("{") ? `(${corps2})` : corps2}`;
        }
        const sauve = this.lignes;
        const sauveS = this.sources;
        const sauveR = this.retrait;
        this.lignes = [];
        this.sources = [];
        this.retrait = 1;
        this.declarationsImplicitesLocales(e.corps, { vue: false });
        for (const i of e.corps) this.instruction(i, { vue: false });
        const corps = this.lignes.join("\n");
        const srcs = this.sources;
        this.lignes = sauve;
        this.sources = sauveS;
        this.retrait = sauveR;
        void srcs;
        return `${asy}${params} => {
${corps}
${"  ".repeat(this.retrait)}}`;
      }
      case "attends":
        if (e.e.k === "nombre" && (e.e.unite === "s" || e.e.unite === "ms" || !e.e.unite)) return `(await $k.delai(${this.ex(e.e)}))`;
        return `(await ${this.ex(e.e)})`;
      case "si":
        return `(${this.ex(e.cond)} ? ${this.ex(e.alors)} : ${this.ex(e.sinon)})`;
      case "intervalle":
        return `$k.intervalle(${this.ex(e.de)}, ${this.ex(e.a)})`;
    }
  }
};
var OPTIONS_NON_STYLE = /* @__PURE__ */ new Set([
  "niveau",
  "texte",
  "couvre",
  "boucle",
  "muet",
  "auto",
  "controles",
  "vers",
  "contour",
  "discret",
  "grand",
  "petit",
  "desactive",
  "nouvel",
  "type",
  "requis",
  "etiquette",
  "lignes",
  "image",
  "position",
  "rotation",
  "secours",
  "ombres",
  "brouillard",
  "sol",
  "particules",
  "distance",
  "volume"
]);
var PROP_DYNAMIQUE = {
  fond: "background",
  couleur: "color",
  taille: "font-size",
  opacite: "opacity",
  largeur: "width",
  hauteur: "height",
  teinte: "color",
  coins: "border-radius",
  marge: "margin",
  remplissage: "padding",
  espace: "gap",
  flou: "filter"
};
var UNITE_PX = /* @__PURE__ */ new Set(["taille", "largeur", "hauteur", "coins", "marge", "remplissage", "espace"]);
var TEXTE_TETES = /* @__PURE__ */ new Set(["titre", "sous-titre", "texte", "lien", "icone", "element"]);
function cheminAsset(s) {
  if (/^(\/|[a-z][a-z0-9+.-]*:|#|\.\.\/)/i.test(s)) return s;
  return "/" + s.replace(/^\.\//, "");
}
function estImage(e) {
  if (e.k !== "texte") return false;
  const l = e.morceaux.map((m) => typeof m === "string" ? m : "").join("");
  return /\.(png|jpe?g|webp|avif|gif|svg)(\?.*)?$/i.test(l);
}
function dedoublonne(decls) {
  const vues = /* @__PURE__ */ new Map();
  for (const d of decls) vues.set(d.slice(0, d.indexOf(":")), d);
  return [...vues.values()];
}
function contientAttends(e) {
  switch (e.k) {
    case "attends":
      return true;
    case "texte":
      return e.morceaux.some((m) => typeof m !== "string" && contientAttends(m));
    case "liste":
      return e.elements.some(contientAttends);
    case "objet":
      return e.props.some((p) => contientAttends(p.valeur));
    case "membre":
      return contientAttends(e.objet);
    case "index":
      return contientAttends(e.objet) || contientAttends(e.index);
    case "appel":
      return contientAttends(e.fn) || e.args.some(contientAttends);
    case "binaire":
      return contientAttends(e.g) || contientAttends(e.d);
    case "unaire":
    case "etale":
      return contientAttends(e.e);
    case "si":
      return contientAttends(e.cond) || contientAttends(e.alors) || contientAttends(e.sinon);
    case "intervalle":
      return contientAttends(e.de) || contientAttends(e.a);
    default:
      return false;
  }
}
function contientAttendsCorps(corps) {
  for (const i of corps) {
    switch (i.k) {
      case "soit":
        if (contientAttends(i.valeur)) return true;
        break;
      case "affecte":
        if (contientAttends(i.valeur) || contientAttends(i.cible)) return true;
        break;
      case "expr":
        if (contientAttends(i.e)) return true;
        break;
      case "retourne":
        if (i.valeur && contientAttends(i.valeur)) return true;
        break;
      case "si":
        if (contientAttends(i.cond) || contientAttendsCorps(i.alors) || i.sinonSi.some((s) => contientAttends(s.cond) || contientAttendsCorps(s.corps)) || i.sinon && contientAttendsCorps(i.sinon)) return true;
        break;
      case "pour":
        if (contientAttends(i.source) || contientAttendsCorps(i.corps)) return true;
        break;
      case "tantque":
        if (contientAttends(i.cond) || contientAttendsCorps(i.corps)) return true;
        break;
      case "essaie":
        if (contientAttendsCorps(i.corps) || i.erreur && contientAttendsCorps(i.erreur)) return true;
        break;
      case "aller":
        if (contientAttends(i.chemin)) return true;
        break;
    }
  }
  return false;
}

// src/noyau/index.ts
function compile(source, options = {}) {
  const vide = { ok: false, js: "", css: "", erreurs: [], avertissements: [], polices: [], site: {}, carte: [] };
  let arbre;
  try {
    arbre = analyse(source);
  } catch (e) {
    if (e instanceof ErreurKaury) {
      e.fichier = options.fichier;
      return { ...vide, erreurs: [e] };
    }
    throw e;
  }
  const { erreurs, avertissements, infos } = verifie(arbre, { fichier: options.fichier });
  if (erreurs.length || options.verifieSeulement) {
    return { ...vide, ok: !erreurs.length, erreurs, avertissements, infos, arbre };
  }
  const s = traduit(arbre, infos, { fichier: options.fichier, runtime: options.runtime });
  return { ok: true, js: s.js, css: s.css, erreurs: [], avertissements, infos, arbre, polices: s.polices, site: s.site, carte: s.carte };
}
function formateErreurs(r, source) {
  return [...r.erreurs, ...r.avertissements].map((e) => e.formate(source)).join("\n\n");
}
function carteSource(r, fichier, source) {
  const vlq = (n) => {
    let v = n < 0 ? -n << 1 | 1 : n << 1;
    let s = "";
    do {
      let d = v & 31;
      v >>>= 5;
      if (v) d |= 32;
      s += "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"[d];
    } while (v);
    return s;
  };
  let prec = 0;
  const lignes = [];
  for (const c of r.carte) {
    const src = c.source - 1;
    lignes.push(vlq(0) + vlq(0) + vlq(src - prec) + vlq(0));
    prec = src;
  }
  return JSON.stringify({ version: 3, file: fichier + ".js", sources: [fichier], sourcesContent: [source], names: [], mappings: lignes.join(";") });
}
export {
  ErreurKaury,
  ErreursKaury,
  analyse,
  carteSource,
  compile,
  formateErreurs,
  globaux_exports as globaux,
  jsNom,
  lienPolice,
  lis,
  mots_exports as mots,
  traduit,
  verifie,
  vocabulaire_exports as vocabulaire
};
//# sourceMappingURL=noyau.js.map
