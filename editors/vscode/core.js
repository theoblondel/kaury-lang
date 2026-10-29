var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/core/errors.ts
function detectLanguage() {
  const env = globalThis.process?.env?.KAURY_LANG;
  return env === "fr" ? "fr" : "en";
}
var language = detectLanguage();
function setLanguage(l) {
  language = l;
}
function getLanguage() {
  return language;
}
var msg = (en, fr) => language === "fr" ? fr : en;
var KauryError = class extends Error {
  line;
  column;
  length;
  what;
  fix;
  file;
  severity;
  constructor(pos, what, fix, severity = "error") {
    super(what);
    this.line = pos.line;
    this.column = pos.column;
    this.length = Math.max(1, pos.length ?? 1);
    this.what = what;
    this.fix = fix;
    this.severity = severity;
  }
  /** Full message with the underlined source excerpt. */
  format(source) {
    const title = this.severity === "error" ? msg("Error", "Erreur") : msg("Warning", "Attention");
    const where = this.file ? `${this.file}, ${msg("line", "ligne")} ${this.line}` : `${msg("line", "ligne")} ${this.line}`;
    let out = `${title} ${where}: ${this.what}`;
    if (source) {
      const text = source.split(/\r?\n/)[this.line - 1];
      if (text !== void 0) {
        const num = String(this.line);
        out += `
  ${num} | ${text}`;
        out += `
  ${" ".repeat(num.length)} | ${" ".repeat(Math.max(0, this.column - 1))}${"^".repeat(this.length)}`;
      }
    }
    if (this.fix) out += `
${msg("Try", "Essaie")}: ${this.fix}`;
    return out;
  }
  toJSON() {
    return {
      severity: this.severity,
      file: this.file,
      line: this.line,
      column: this.column,
      length: this.length,
      message: this.what,
      fix: this.fix
    };
  }
};
var KauryErrors = class extends Error {
  errors;
  source;
  constructor(errors, source) {
    super(errors.map((e2) => e2.format(source)).join("\n\n"));
    this.errors = errors;
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
function closest(word, candidates) {
  let best;
  let bestD = Infinity;
  const limit = word.length <= 3 ? 1 : word.length <= 6 ? 2 : 3;
  for (const c of candidates) {
    const d = distance(word.toLowerCase(), c.toLowerCase());
    if (d < bestD && d <= limit) {
      bestD = d;
      best = c;
    }
  }
  return best;
}
var q = (s) => msg(`"${s}"`, `\xAB ${s} \xBB`);

// src/core/keywords.ts
var keywords_exports = {};
__export(keywords_exports, {
  RESERVED: () => RESERVED,
  aliasesOf: () => aliasesOf,
  allKeywords: () => allKeywords,
  canon: () => canon,
  canonValue: () => canonValue,
  isKeyword: () => isKeyword,
  stripAccents: () => stripAccents,
  valueWords: () => valueWords
});
function stripAccents(s) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}
var TABLE = {
  // ---- core ----
  let: ["soit", "const"],
  state: ["etat"],
  function: ["fonction", "fn"],
  then: ["puis", "alors"],
  if: ["si"],
  else: ["sinon"],
  for: ["pour"],
  in: ["dans"],
  while: ["tant"],
  // “tant que”
  que: [],
  await: ["attends", "wait"],
  try: ["essaie"],
  catch: ["erreur"],
  import: ["importe"],
  from: ["de", "depuis"],
  as: ["comme"],
  export: ["exporte"],
  return: ["retourne"],
  break: ["arrete"],
  continue: [],
  true: ["vrai"],
  false: ["faux"],
  none: ["rien", "aucun", "null", "nothing"],
  and: ["et"],
  or: ["ou"],
  not: ["non"],
  open: ["ouvre"],
  close: ["ferme"],
  toggle: ["bascule"],
  go: ["aller", "goto"],
  js: ["javascript"],
  css: [],
  animation: [],
  // ---- web ----
  site: [],
  page: [],
  component: ["composant"],
  section: [],
  header: ["entete", "en-tete"],
  footer: ["pied", "pied-de-page"],
  nav: [],
  grid: ["grille"],
  column: ["colonne"],
  row: ["ligne", "rangee"],
  box: ["boite"],
  card: ["carte"],
  title: ["titre"],
  subtitle: ["sous-titre"],
  text: ["texte"],
  image: [],
  video: [],
  link: ["lien"],
  links: ["liens", "menu"],
  logo: [],
  button: ["bouton"],
  form: ["formulaire"],
  field: ["champ", "input"],
  textarea: ["zone", "zone-texte", "zone-de-texte"],
  select: ["choix", "liste-deroulante"],
  checkbox: ["case", "case-a-cocher"],
  list: ["liste"],
  item: ["element"],
  icon: ["icone"],
  divider: ["separateur"],
  spacer: ["espaceur"],
  details: ["deplie"],
  dialog: ["fenetre", "modale"],
  languages: ["langues"],
  translate: ["traduis", "traduire"],
  embed: ["integre", "iframe"],
  slot: ["contenu", "children"],
  markdown: ["md"],
  style: [],
  mobile: [],
  tablet: ["tablette"],
  desktop: ["ordinateur"],
  seo: [],
  colors: ["couleurs"],
  font: ["police"],
  fonts: ["polices"],
  lang: ["langue", "language"],
  favicon: [],
  url: ["adresse"],
  alternate: ["traduction", "alternates", "hreflang"],
  head: ["tete"],
  base: [],
  wrapper: ["enveloppe"],
  // ---- immersion ----
  scene: [],
  object: ["objet", "model"],
  character: ["personnage"],
  light: ["lumiere", "lighting"],
  camera: [],
  on: ["au"],
  click: ["clic"],
  hover: ["survol"],
  scroll: ["defilement"],
  load: ["chargement"],
  follows: ["suit", "follow"],
  mouse: ["souris"],
  enters: ["entre", "enter"],
  spin: ["tourne", "rotate", "turn"],
  float: ["flotte"],
  jump: ["saute"],
  pulse: [],
  sway: ["balance"],
  says: ["dit", "say"],
  play: ["joue"],
  sound: ["son", "audio"],
  transition: [],
  parallax: ["parallaxe"]
};
var VALUES = {
  // motion modifiers
  smooth: ["doux", "douce", "soft-motion"],
  slow: ["lent", "lente"],
  fast: ["rapide"],
  reverse: ["inverse"],
  left: ["gauche"],
  right: ["droite"],
  top: ["haut", "up"],
  bottom: ["bas", "down"],
  fade: ["fondu"],
  zoom: [],
  loop: ["boucle"],
  once: ["fois", "une-fois"],
  // lights
  studio: [],
  soft: [],
  sunset: ["coucher-de-soleil"],
  night: ["nuit"],
  neon: [],
  day: ["jour"],
  dramatic: ["dramatique"],
  // cameras
  fixed: ["fixe"],
  fly: ["vol"],
  free: ["libre"],
  orbit: ["orbite"],
  // transitions
  slide: ["glisse"],
  curtain: ["rideau"],
  // particles
  stars: ["etoiles"],
  snow: ["neige"],
  bubbles: ["bulles"],
  dust: ["poussiere"],
  confetti: ["confettis"],
  // shadows, alignment, cursors, field types
  medium: ["moyenne", "moyen"],
  strong: ["forte", "fort"],
  hard: ["dure", "dur"],
  inner: ["interieure"],
  center: ["centre"],
  justify: ["justifie"],
  pointer: ["main", "pointeur", "hand"],
  arrow: ["fleche"],
  number: ["nombre"],
  password: ["motdepasse"],
  date: [],
  tel: ["telephone"],
  email: [],
  search: ["recherche"]
};
var TO_CANON = /* @__PURE__ */ new Map();
var VALUE_TO_CANON = /* @__PURE__ */ new Map();
for (const [c, aliases] of Object.entries(TABLE)) {
  TO_CANON.set(c, c);
  for (const a of aliases) if (!TO_CANON.has(a)) TO_CANON.set(a, c);
}
for (const [c, aliases] of Object.entries(VALUES)) {
  VALUE_TO_CANON.set(c, c);
  for (const a of aliases) if (!VALUE_TO_CANON.has(a)) VALUE_TO_CANON.set(a, c);
}
function canon(word) {
  return TO_CANON.get(stripAccents(word));
}
function canonValue(word) {
  const w = stripAccents(word);
  return VALUE_TO_CANON.get(w) ?? TO_CANON.get(w) ?? w;
}
function isKeyword(word, expected) {
  return canon(word) === expected;
}
function allKeywords() {
  return Object.keys(TABLE);
}
function valueWords() {
  return Object.keys(VALUES);
}
function aliasesOf(c) {
  return TABLE[c] ?? VALUES[c] ?? [];
}
var RESERVED = /* @__PURE__ */ new Set([
  "let",
  "state",
  "function",
  "then",
  "if",
  "else",
  "for",
  "in",
  "while",
  "await",
  "try",
  "import",
  "export",
  "return",
  "break",
  "true",
  "false",
  "none",
  "and",
  "or",
  "not",
  "component",
  "page"
]);

// src/core/lexer.ts
var UNITS = ["px", "rem", "em", "%", "vh", "vw", "svh", "dvh", "ms", "s", "deg", "fr", "x"];
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
var CLOSER = { "(": ")", "[": "]", "{": "}" };
var BLOCK_WORDS = /* @__PURE__ */ new Set([
  "function",
  "if",
  "else",
  "for",
  "while",
  "try",
  "catch",
  "page",
  "component",
  "site",
  "style",
  "animation",
  "section",
  "header",
  "footer",
  "nav",
  "box",
  "column",
  "row",
  "grid",
  "card",
  "form",
  "list",
  "scene",
  "details",
  "dialog"
]);
var FOREIGN_SIGNS = ["===", "!==", "&&", "||", "=>", "++", "--", "/*", ";", "`"];
var isLetter = (c) => /[\p{L}_$]/u.test(c);
var isDigit = (c) => c >= "0" && c <= "9";
var isWordChar = (c) => /[\p{L}\p{N}_$]/u.test(c);
function tokenize(source, notes, errors) {
  const tokens = [];
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const stack = [0];
  let depth = 0;
  let strayBraces = 0;
  const openers = [];
  const push = (t) => tokens.push(t);
  for (let li = 0; li < lines.length; li++) {
    const line = lines[li];
    const lineNo = li + 1;
    const startDepth = depth;
    let i = 0;
    if (depth === 0) {
      let indent = 0;
      while (i < line.length && (line[i] === " " || line[i] === "	")) {
        if (line[i] === "	") {
          throw new KauryError(
            { line: lineNo, column: i + 1 },
            msg("a tab is used for indentation.", "une tabulation sert d'indentation."),
            msg("indent with 2 spaces. Kaury does not accept tabs.", "indente avec 2 espaces. Kaury n'accepte pas les tabulations.")
          );
        }
        indent++;
        i++;
      }
      const rest = line.slice(i);
      if (rest === "" || rest.startsWith("//")) continue;
      if (rest.startsWith("}")) {
        const reopens = /\{\s*(\/\/.*)?$/.test(rest);
        if (strayBraces > 0) {
          if (!reopens) strayBraces--;
          continue;
        }
        const e2 = new KauryError(
          { line: lineNo, column: i + 1 },
          msg("blocks are made by indentation, without { }.", "les blocs se font par l'indentation, sans { }."),
          msg("remove this \u201C}\u201D: a block ends when the indentation goes back.", "retire ce \xAB } \xBB : un bloc se termine quand l'indentation revient.")
        );
        if (!errors) throw e2;
        errors.push(e2);
        if (reopens) strayBraces++;
        continue;
      }
      const top = stack[stack.length - 1];
      if (indent > top) {
        if (indent - top !== 2 && notes && !notes.length) {
          notes.push(new KauryError(
            { line: lineNo, column: 1, length: indent },
            msg(`this block is indented by ${indent - top} space${indent - top > 1 ? "s" : ""}; Kaury uses 2.`, `ce bloc est indent\xE9 de ${indent - top} espace${indent - top > 1 ? "s" : ""} ; Kaury en utilise 2.`),
            msg("indent every level by exactly 2 spaces.", "indente chaque niveau d'exactement 2 espaces."),
            "warning"
          ));
        }
        stack.push(indent);
        push({ t: "indent", v: "", line: lineNo, column: 1, end: indent + 1, spaceBefore: false });
      } else if (indent < top) {
        while (stack.length && indent < stack[stack.length - 1]) {
          stack.pop();
          push({ t: "dedent", v: "", line: lineNo, column: 1, end: 1, spaceBefore: false });
        }
        if (stack[stack.length - 1] !== indent) {
          throw new KauryError(
            { line: lineNo, column: 1, length: indent || 1 },
            msg("this line is not aligned with any block above.", "cette ligne n'est align\xE9e sur aucun bloc au-dessus."),
            msg("align it exactly under the line it belongs to (2 spaces per level).", "aligne-la exactement sous la ligne dont elle fait partie (2 espaces par niveau).")
          );
        }
      }
      const rawKind = /^(js|javascript|css)\s*(\/\/.*)?$/.exec(rest)?.[1];
      if (rawKind) {
        const word = rawKind === "css" ? "css" : "js";
        push({ t: "word", v: word, line: lineNo, column: indent + 1, end: indent + 1 + word.length, spaceBefore: true });
        const raw = [];
        let k = li + 1;
        let margin = -1;
        while (k < lines.length) {
          const l = lines[k];
          const ind = l.length - l.trimStart().length;
          if (l.trim() !== "" && ind <= indent) break;
          if (l.trim() !== "" && (margin < 0 || ind < margin)) margin = ind;
          raw.push(l);
          k++;
        }
        while (raw.length && raw[raw.length - 1].trim() === "") raw.pop();
        const code = raw.map((l) => l.slice(Math.max(0, margin))).join("\n");
        push({ t: "raw", v: code, line: lineNo + 1, column: 1, end: 1, spaceBefore: true });
        push({ t: "newline", v: "", line: lineNo, column: 1, end: 1, spaceBefore: false });
        li += raw.length;
        continue;
      }
    } else {
      while (i < line.length && (line[i] === " " || line[i] === "	")) i++;
      if (i >= line.length || line.startsWith("//", i)) continue;
    }
    let space = true;
    let hadToken = false;
    const contentStart = tokens.length;
    try {
      while (i < line.length) {
        const c = line[i];
        if (c === " " || c === "	") {
          space = true;
          i++;
          continue;
        }
        if (c === "/" && line[i + 1] === "/") break;
        const col = i + 1;
        if (c === '"') {
          const { token, next } = readText(line, i, lineNo);
          token.spaceBefore = space;
          push(token);
          i = next;
          space = false;
          hadToken = true;
          continue;
        }
        if (c === "#") {
          const m = /^#([0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![\p{L}\p{N}_])/u.exec(line.slice(i));
          if (!m) {
            if (!hadToken || line[i + 1] === " " || line[i + 1] === void 0) {
              throw new KauryError(
                { line: lineNo, column: col },
                msg(`a comment starts with ${q("//")} in Kaury.`, `en Kaury, un commentaire commence par ${q("//")}.`),
                msg("// a note   (\u201C#\u201D only starts a color: #FF4F8B)", "// une note   (\xAB # \xBB ne sert qu'\xE0 \xE9crire une couleur : #FF4F8B)")
              );
            }
            throw new KauryError(
              { line: lineNo, column: col },
              msg("badly written color.", "couleur mal \xE9crite."),
              msg("a color has 3 or 6 hexadecimal digits: #FF4F8B or #F48.", "une couleur s'\xE9crit avec 3 ou 6 chiffres hexad\xE9cimaux : #FF4F8B ou #F48.")
            );
          }
          push({ t: "color", v: m[0], line: lineNo, column: col, end: col + m[0].length, spaceBefore: space });
          i += m[0].length;
          space = false;
          hadToken = true;
          continue;
        }
        const gluedMinus = c === "-" && space && isDigit(line[i + 1] ?? "") && previousAllowsUnary(tokens, hadToken);
        if (isDigit(c) || gluedMinus) {
          let j = i + (gluedMinus ? 1 : 0);
          while (j < line.length && (isDigit(line[j]) || line[j] === "_")) j++;
          if (line[j] === "." && isDigit(line[j + 1] ?? "")) {
            j++;
            while (j < line.length && isDigit(line[j])) j++;
          }
          const v = line.slice(i, j).replace(/_/g, "");
          let unit;
          if (line.startsWith("/s", j) && !isWordChar(line[j + 2] ?? " ")) {
            unit = "/s";
            j += 2;
          } else {
            for (const u of UNITS) {
              if (line.startsWith(u, j) && !isWordChar(line[j + u.length] ?? " ")) {
                unit = u;
                j += u.length;
                break;
              }
            }
          }
          push({ t: "number", v, unit, line: lineNo, column: col, end: j + 1, spaceBefore: space });
          i = j;
          space = false;
          hadToken = true;
          continue;
        }
        if (isLetter(c)) {
          let j = i + 1;
          while (j < line.length) {
            if (isWordChar(line[j])) j++;
            else if (line[j] === "-" && isLetter(line[j + 1] ?? "") && isWordChar(line[j - 1])) j++;
            else break;
          }
          push({ t: "word", v: line.slice(i, j), line: lineNo, column: col, end: j + 1, spaceBefore: space });
          i = j;
          space = false;
          hadToken = true;
          continue;
        }
        const sign = FOREIGN_SIGNS.find((s) => line.startsWith(s, i));
        if (sign) {
          const before = tokens[tokens.length - 1];
          const name = hadToken && before?.t === "word" ? before.v : "count";
          const [what, fix] = sign === "===" || sign === "!==" ? [msg(`${q(sign)} is written ${q(sign.slice(0, 2))} in Kaury.`, `${q(sign)} s'\xE9crit ${q(sign.slice(0, 2))} en Kaury.`), `if a ${sign.slice(0, 2)} b`] : sign === "&&" ? [msg(`${q("&&")} is written ${q("and")} in Kaury.`, `${q("&&")} s'\xE9crit ${q("et")} en Kaury.`), msg("if a and b", "si a et b")] : sign === "||" ? [msg(`${q("||")} is written ${q("or")} in Kaury.`, `${q("||")} s'\xE9crit ${q("ou")} en Kaury.`), msg("if a or b", "si a ou b")] : sign === "=>" ? [msg(`${q("=>")} is written ${q("->")} in Kaury.`, `${q("=>")} s'\xE9crit ${q("->")} en Kaury.`), "x -> x * 2"] : sign === "++" || sign === "--" ? [msg(`${q(sign)} does not exist in Kaury.`, `${q(sign)} n'existe pas en Kaury.`), `${name} ${sign[0]}= 1`] : sign === ";" ? [msg(`Kaury has no ${q(";")}: one instruction per line.`, `Kaury n'a pas de ${q(";")} : une instruction par ligne.`), msg("remove it; to write two instructions, use two lines.", "supprime-le ; pour deux instructions, \xE9cris deux lignes.")] : sign === "`" ? [msg("texts are written between double quotes.", "les textes s'\xE9crivent entre guillemets doubles."), msg('"Hello {name}"   (a value goes between { }, without \u201C$\u201D)', '"Bonjour {nom}"   (une valeur se met entre { }, sans \xAB $ \xBB)')] : [msg(`a comment starts with ${q("//")} in Kaury.`, `en Kaury, un commentaire commence par ${q("//")}.`), msg("// a note   (one \u201C//\u201D at the start of every line of the note)", "// une note   (un \xAB // \xBB au d\xE9but de chaque ligne de la note)")];
          throw new KauryError({ line: lineNo, column: col, length: sign.length }, what, fix);
        }
        const op = OPS.find((o2) => line.startsWith(o2, i));
        if (op) {
          const tok = { t: "op", v: op, line: lineNo, column: col, end: col + op.length, spaceBefore: space };
          const first = tokens[contentStart];
          if (op === "{" && depth === 0 && first?.t === "word" && BLOCK_WORDS.has(canon(first.v) ?? first.v) && /^\{\s*(\/\/.*)?$/.test(line.slice(i))) {
            throw new KauryError(
              { line: lineNo, column: col },
              msg("blocks are made by indentation, without { }.", "les blocs se font par l'indentation, sans { }."),
              msg("remove \u201C{\u201D and \u201C}\u201D, and indent the lines of the block by 2 spaces.", "retire \xAB { \xBB et \xAB } \xBB, et indente de 2 espaces les lignes du bloc.")
            );
          }
          if (op === "(" || op === "[" || op === "{") {
            depth++;
            openers.push(tok);
          } else if (op === ")" || op === "]" || op === "}") {
            const o2 = openers.pop();
            const expected = o2 ? CLOSER[o2.v] : void 0;
            if (!o2 || expected !== op) {
              throw new KauryError(
                { line: lineNo, column: col },
                o2 ? msg(`${q(op)} closes ${q(o2.v)} opened on line ${o2.line}, but ${q(expected)} is needed.`, `${q(op)} ferme ${q(o2.v)} ouvert ligne ${o2.line}, mais il faut ${q(expected)}.`) : msg(`${q(op)} closes something that was never opened.`, `${q(op)} ferme quelque chose qui n'a jamais \xE9t\xE9 ouvert.`),
                o2 ? msg(`replace ${q(op)} with ${q(expected)}.`, `remplace ${q(op)} par ${q(expected)}.`) : msg(`remove this ${q(op)}.`, `supprime ce ${q(op)}.`)
              );
            }
            depth--;
          }
          push(tok);
          i += op.length;
          space = false;
          hadToken = true;
          continue;
        }
        if (c === "'") {
          throw new KauryError(
            { line: lineNo, column: col },
            msg("texts are written between double quotes.", "les textes s'\xE9crivent entre guillemets doubles."),
            msg(`replace '\u2026' with "\u2026". Apostrophes still work inside a text: "It's".`, `remplace '\u2026' par "\u2026". L'apostrophe reste utilisable dans un texte : "J'aime".`)
          );
        }
        throw new KauryError(
          { line: lineNo, column: col },
          msg(`unexpected character ${q(c)}.`, `caract\xE8re inattendu ${q(c)}.`),
          msg('remove it or put it inside a text "\u2026".', 'supprime-le ou mets-le dans un texte "\u2026".')
        );
      }
    } catch (e2) {
      if (!(e2 instanceof KauryError) || !errors || startDepth !== 0) throw e2;
      errors.push(e2);
      const head = tokens[contentStart]?.t === "word" ? tokens[contentStart].v : "";
      tokens.length = contentStart;
      depth = 0;
      openers.length = 0;
      if (/\{\s*(\/\/.*)?$/.test(line)) strayBraces++;
      push({ t: "error", v: head, line: lineNo, column: e2.column, end: e2.column + 1, spaceBefore: true });
      hadToken = true;
    }
    if (depth === 0 && hadToken) {
      push({ t: "newline", v: "", line: lineNo, column: line.length + 1, end: line.length + 2, spaceBefore: false });
    }
  }
  if (openers.length) {
    const o2 = openers[openers.length - 1];
    throw new KauryError(
      { line: o2.line, column: o2.column },
      msg(`${q(o2.v)} is never closed.`, `${q(o2.v)} n'est jamais referm\xE9.`),
      msg(`add ${q(CLOSER[o2.v])} at the end.`, `ajoute ${q(CLOSER[o2.v])} \xE0 la fin.`)
    );
  }
  const last = lines.length;
  if (tokens.length && tokens[tokens.length - 1].t !== "newline" && tokens[tokens.length - 1].t !== "dedent") {
    push({ t: "newline", v: "", line: last, column: 1, end: 1, spaceBefore: false });
  }
  while (stack.length > 1) {
    stack.pop();
    push({ t: "dedent", v: "", line: last, column: 1, end: 1, spaceBefore: false });
  }
  push({ t: "eof", v: "", line: last + 1, column: 1, end: 1, spaceBefore: false });
  return tokens;
}
function previousAllowsUnary(tokens, hadToken) {
  if (!hadToken) return true;
  const d = tokens[tokens.length - 1];
  if (!d) return true;
  return d.t === "word" || d.t === "op" || d.t === "number" || d.t === "text";
}
function readText(line, start, lineNo) {
  const parts = [];
  let i = start + 1;
  let cur = "";
  while (true) {
    if (i >= line.length) {
      throw new KauryError(
        { line: lineNo, column: start + 1 },
        msg("this text is never closed.", "ce texte n'est jamais referm\xE9."),
        msg('add a " at the end of the text.', 'ajoute un guillemet " \xE0 la fin du texte.')
      );
    }
    const c = line[i];
    if (c === "\\") {
      const n = line[i + 1];
      const map = { n: "\n", t: "	", '"': '"', "\\": "\\", "{": "{", "}": "}" };
      if (n === void 0 || !(n in map)) {
        throw new KauryError(
          { line: lineNo, column: i + 1, length: 2 },
          msg(`unknown sequence ${q("\\" + (n ?? ""))} in a text.`, `s\xE9quence ${q("\\" + (n ?? ""))} inconnue dans un texte.`),
          msg('use \\n (new line), \\" (quote), \\{ or \\} (braces), \\\\ (backslash).', 'utilise \\n (retour \xE0 la ligne), \\" (guillemet), \\{ ou \\} (accolades), \\\\ (barre).')
        );
      }
      cur += map[n];
      i += 2;
      continue;
    }
    if (c === '"') {
      i++;
      break;
    }
    if (c === "{") {
      if (cur) parts.push({ text: cur });
      cur = "";
      let p = 1;
      let j = i + 1;
      let inText = false;
      while (j < line.length && p > 0) {
        const d = line[j];
        if (inText) {
          if (d === "\\") j++;
          else if (d === '"') inText = false;
        } else if (d === '"') inText = true;
        else if (d === "{") p++;
        else if (d === "}") p--;
        if (p > 0) j++;
      }
      if (p > 0) {
        throw new KauryError(
          { line: lineNo, column: i + 1 },
          msg("interpolation \u201C{\u201D never closed in this text.", "insertion \xAB { \xBB jamais referm\xE9e dans ce texte."),
          msg("close it with \u201C}\u201D, or write \\{ for a real brace.", "ferme-la avec \xAB } \xBB, ou \xE9cris \\{ pour une vraie accolade.")
        );
      }
      const code = line.slice(i + 1, j);
      if (!code.trim()) {
        throw new KauryError(
          { line: lineNo, column: i + 1, length: 2 },
          msg("empty interpolation \u201C{}\u201D in a text.", "insertion vide \xAB {} \xBB dans un texte."),
          msg('put a name between the braces: "Hello {name}".', 'mets un nom entre les accolades : "Bonjour {nom}".')
        );
      }
      parts.push({ code, line: lineNo, column: i + 2 });
      i = j + 1;
      continue;
    }
    cur += c;
    i++;
  }
  if (cur || !parts.length) parts.push({ text: cur });
  const v = parts.map((m) => m.text ?? `{${m.code}}`).join("");
  return { token: { t: "text", v, parts, line: lineNo, column: start + 1, end: i + 1, spaceBefore: true }, next: i };
}

// src/core/vocabulary.ts
var vocabulary_exports = {};
__export(vocabulary_exports, {
  CAMERAS: () => CAMERAS,
  COLORS: () => COLORS,
  ELEMENTS: () => ELEMENTS,
  ELEMENT_OPTIONS: () => ELEMENT_OPTIONS,
  EVENTS: () => EVENTS,
  LIGHTS: () => LIGHTS,
  MOTIONS: () => MOTIONS,
  MOTION_WORDS: () => MOTION_WORDS,
  SETTINGS: () => SETTINGS,
  STYLES: () => STYLES,
  TRANSITIONS: () => TRANSITIONS,
  UNIVERSAL_OPTIONS: () => UNIVERSAL_OPTIONS,
  allOptions: () => allOptions,
  elementOption: () => elementOption,
  knownColor: () => knownColor,
  optionSpec: () => optionSpec,
  optionWords: () => optionWords,
  styleOption: () => styleOption,
  styleWords: () => styleWords
});
var COLORS = {
  red: "#e5484d",
  orange: "#f76b15",
  yellow: "#ffc53d",
  green: "#30a46c",
  blue: "#0090ff",
  purple: "#8e4ec6",
  pink: "#e93d82",
  black: "#111111",
  white: "#ffffff",
  gray: "#8b8d98",
  cream: "#fff4e8",
  beige: "#efe3cf",
  brown: "#8a5a3b",
  teal: "#12a594",
  gold: "#d4a72c",
  silver: "#c0c4cc",
  navy: "#14213d",
  coral: "#ff7f61",
  mint: "#7fe0c0",
  lavender: "#b9a6ef",
  sky: "#7cc4fa",
  sand: "#e9d8b4",
  slate: "#3c4454",
  night: "#0b1020",
  transparent: "transparent",
  // colors of the theme: they follow the site (accent = first site color, on-accent = text on it, ink = text, muted = soft text, line = borders)
  accent: "var(--k-accent)",
  "on-accent": "var(--k-on-accent)",
  ink: "var(--k-ink)",
  muted: "var(--k-muted)",
  line: "var(--k-line)"
};
var COLOR_ALIASES = {
  rouge: "red",
  jaune: "yellow",
  vert: "green",
  bleu: "blue",
  violet: "purple",
  rose: "pink",
  noir: "black",
  blanc: "white",
  gris: "gray",
  grey: "gray",
  creme: "cream",
  marron: "brown",
  turquoise: "teal",
  dore: "gold",
  argent: "silver",
  marine: "navy",
  corail: "coral",
  menthe: "mint",
  lavande: "lavender",
  ciel: "sky",
  sable: "sand",
  ardoise: "slate",
  nuit: "night",
  ligne: "line",
  encre: "ink"
};
function knownColor(word) {
  const w = stripAccents(word).toLowerCase();
  if (w in COLORS) return w;
  if (w in COLOR_ALIASES) return COLOR_ALIASES[w];
  return void 0;
}
var o = (args, aliases, help, helpFr, example, words) => ({ args, aliases, help, helpFr, example, words });
var STYLES = {
  background: o("e", ["fond", "bg"], "background color, gradient or image", "couleur, d\xE9grad\xE9 ou image de fond", "background cream"),
  color: o("c", ["couleur"], "text color", "couleur du texte", "color #333"),
  font: o("t", ["police"], "typeface", "police de caract\xE8res", 'font "Clash Display"'),
  size: o("n", ["taille"], "text size (or object size)", "taille du texte (ou de l'objet)", "size 24"),
  bold: o("", ["gras"], "bold text", "texte en gras", "bold"),
  light: o("", ["leger", "fin"], "thin text", "texte fin", "light"),
  weight: o("n", ["poids", "graisse", "epaisseur"], "font weight (100 to 900)", "\xE9paisseur du texte (100 \xE0 900)", "weight 600"),
  italic: o("", ["italique"], "italic text", "texte en italique", "italic"),
  upright: o("", ["droit", "no-italic"], "not italic (an emphasis shown by its color alone: style emphasis, then upright, color accent)", "pas en italique (une emphase montr\xE9e par sa seule couleur : style emphasis, puis upright, color accent)", "upright"),
  underline: o("", ["souligne"], "underlined text", "texte soulign\xE9", "underline"),
  plain: o("", ["simple", "no-underline"], "no underline (links)", "sans soulignement (liens)", 'link "Docs" "/docs/", plain'),
  uppercase: o("", ["majuscules", "caps"], "uppercase text", "texte en majuscules", "uppercase"),
  "line-height": o("n", ["interligne"], "line height (1.5 = one and a half)", "hauteur de ligne (1.5 = une fois et demie)", "line-height 1.6"),
  tracking: o("n", ["lettres", "interlettrage", "letter-spacing"], "space between letters", "espace entre les lettres", "tracking 2"),
  align: o("m", ["aligne"], "text alignment", "alignement du texte", "align center", ["left", "center", "right", "justify"]),
  center: o("", ["centre", "centered"], "centers the content", "centre le contenu", "center"),
  middle: o("", ["milieu"], "sits in the middle of its row or of its grid line (a text next to a tall photo)", "se place au milieu de sa ligne ou de sa rang\xE9e de grille (un texte \xE0 c\xF4t\xE9 d\u2019une grande photo)", "column middle"),
  radius: o("n", ["coins", "rayon", "arrondi", "rounded"], "corner radius", "arrondi des coins", "radius 12"),
  round: o("", ["rond", "pill"], "fully round corners", "coins compl\xE8tement ronds", "round"),
  shadow: o("m?c?", ["ombre"], "drop shadow (hard + a color: the offset shadow of brutalist designs)", "ombre port\xE9e (hard + une couleur : l\u2019ombre d\xE9cal\xE9e des designs brutalistes)", "shadow soft   /   shadow hard pink", ["soft", "medium", "strong", "hard", "none", "inner"]),
  glow: o("c?n?", ["lueur", "neon"], "neon light around the element, or around the letters of a text", "lueur n\xE9on autour de l\u2019\xE9l\xE9ment, ou des lettres d\u2019un texte", "glow pink 30"),
  "text-glow": o("c?n?", ["lueur-texte"], "neon light around the letters", "lueur n\xE9on autour des lettres", "text-glow cyan"),
  stroke: o("n?c?", ["contour"], "letters drawn as an outline only", "lettres dessin\xE9es en contour seulement", "stroke 2 black"),
  mesh: o("cc?c?c?", ["maillage"], "mesh gradient: soft colored lights melting into the background", "d\xE9grad\xE9 maill\xE9 : des lumi\xE8res color\xE9es qui se fondent dans le fond", "mesh pink purple orange"),
  border: o("n?c?", ["bordure"], "border (width, color)", "bordure (\xE9paisseur, couleur)", "border 1 gray"),
  "border-top": o("n?c?", ["bordure-haut"], "line above (width, color)", "trait au-dessus (\xE9paisseur, couleur)", "border-top 2 black"),
  "border-bottom": o("n?c?", ["bordure-bas"], "line below (width, color)", "trait en dessous (\xE9paisseur, couleur)", "border-bottom 1 gray"),
  pin: o("*", ["epingle"], "placed over its parent: pin bottom right, pin top 20 left 10%", "pos\xE9 par-dessus son parent : epingle bas droite", "pin bottom right"),
  clip: o("", ["coupe"], "hides what overflows", "cache ce qui d\xE9passe", "clip"),
  "no-wrap": o("", ["sans-retour"], "keeps everything on one line (for a ticker)", "garde tout sur une ligne (pour un bandeau)", "row no-wrap"),
  grain: o("", [], "paper grain texture (on the site style: the whole page)", "texture de grain papier (sur le style du site : toute la page)", "style background cream, grain"),
  margin: o("nn?n?n?", ["marge"], "space around (1 to 4 values)", "espace autour (1 \xE0 4 valeurs)", "margin 24"),
  padding: o("nn?n?n?", ["remplissage", "interieur"], "inner space (1 to 4 values)", "espace int\xE9rieur (1 \xE0 4 valeurs)", "padding 32"),
  gap: o("nn?", ["espace", "spacing"], "space between children (one value, or rows then columns)", "espace entre les enfants", "gap 24"),
  width: o("n", ["largeur"], "width", "largeur", "width 320"),
  height: o("n", ["hauteur"], "height", "hauteur", "height 400"),
  "max-width": o("n", ["max-largeur", "largeur-max"], "maximum width", "largeur maximale", "max-width 720"),
  "min-height": o("n", ["min-hauteur", "hauteur-min"], "minimum height", "hauteur minimale", "min-height 300"),
  fullscreen: o("", ["plein-ecran", "full"], "fills the whole screen height", "occupe toute la hauteur de l'\xE9cran", "fullscreen"),
  "full-width": o("", ["pleine-largeur", "bleed"], "fills the whole width, no margins", "occupe toute la largeur, sans marges", "full-width"),
  zoom: o("n", ["echelle"], "shows it smaller (or bigger) with the same layout, like a thumbnail of a page: embed \u2026, zoom 0.5", "l\u2019affiche plus petit (ou plus grand) sans changer la mise en page, comme une miniature", 'embed "/demo/", "Demo", zoom 0.5, height 1200'),
  opacity: o("n", ["opacite"], "opacity from 0 to 1", "opacit\xE9 de 0 \xE0 1", "opacity 0.8"),
  blur: o("n", ["flou"], "blur", "flou", "blur 8"),
  grayscale: o("n?", ["noir-et-blanc", "monochrome", "greyscale"], "black and white, from 0 to 1 (photos from different sources brought to one look; hover grayscale 0 gives the colors back)", "noir et blanc, de 0 \xE0 1 (des photos de sources diff\xE9rentes ramen\xE9es \xE0 un m\xEAme rendu ; hover grayscale 0 rend les couleurs)", 'image "ada.jpg", "Ada, coach", grayscale'),
  shade: o("nm?", ["voile", "scrim", "overlay"], "darkens the background picture so the text in front stays readable (0 to 1; with a side, only toward that side)", "assombrit l\u2019image de fond pour que le texte pos\xE9 dessus reste lisible (0 \xE0 1 ; avec un c\xF4t\xE9, seulement vers ce c\xF4t\xE9)", 'section hero, background "hall.jpg", shade 0.6   /   shade 0.8 bottom', ["top", "bottom", "left", "right"]),
  glass: o("", ["verre"], "frosted glass effect", "effet verre d\xE9poli", "glass"),
  gradient: o("cc?c?n?", ["degrade"], "gradient background (2 or 3 colors, angle)", "fond en d\xE9grad\xE9 (2 ou 3 couleurs, angle)", "gradient pink orange"),
  "text-gradient": o("cc?c?", ["texte-degrade"], "gradient text", "texte en d\xE9grad\xE9", "text-gradient pink purple"),
  columns: o("nn?n?n?", ["colonnes", "colonne", "cols", "column"], "number of columns, or their widths", "nombre de colonnes, ou leurs largeurs", "grid 3 columns   /   grid columns 2 1"),
  direction: o("m", [], "direction of the children", "sens des enfants", "direction row", ["row", "column"]),
  hidden: o("e?", ["cache", "hide"], "hides the element (always, or while a condition is true)", "cache l'\xE9l\xE9ment (toujours, ou tant qu'une condition est vraie)", "mobile hidden   /   hidden (tab != 1)"),
  sticky: o("n?", ["colle"], "stays at the top while scrolling (distance from the top)", "reste coll\xE9 en haut au d\xE9filement (distance du haut)", "sticky 96"),
  front: o("", ["devant"], "goes in front of other elements", "passe devant les autres \xE9l\xE9ments", "front"),
  cursor: o("m", ["curseur"], "cursor shape", "forme du curseur", "cursor pointer", ["pointer", "arrow", "text", "none"]),
  hover: o("*", ["survol"], "style when the mouse is over it", "style quand la souris passe dessus", "hover lift 4"),
  lift: o("n", ["monte", "leve", "lever", "souleve"], "moves up", "d\xE9cale vers le haut", "hover lift 4"),
  grow: o("n?", ["grossit", "scale"], "enlarges (1.1 = +10 %)", "agrandit (1.1 = +10 %)", "hover grow 1.05"),
  tilt: o("n", ["penche", "rotate"], "tilts (degrees)", "incline (degr\xE9s)", "tilt -3"),
  move: o("nn?", ["deplace", "translate"], "moves the element (x, y), for hover and animations", "d\xE9place l'\xE9l\xE9ment (x, y), pour le survol et les animations", "move -50% 0"),
  reveal: o("n", ["devoile"], "shows only the top part (0% to 100%), for animations", "ne montre que le haut (0 % \xE0 100 %), pour les animations", "reveal 100%"),
  animate: o("m", ["anime"], "simple entrance", "apparition simple", "animate fade", ["fade", "lift", "zoom", "left", "right"])
};
var ELEMENT_OPTIONS = {
  title: { level: o("n", ["niveau"], "heading level (1 to 6)", "niveau du titre (1 \xE0 6)", "level 2") },
  image: {
    alt: o("t", ["texte", "description"], "description for accessibility", "description pour l'accessibilit\xE9", 'alt "A can"'),
    cover: o("", ["couvre"], "fills the area by cropping", "remplit la zone en recadrant", "cover")
  },
  video: {
    loop: o("", ["boucle"], "plays in a loop", "rejoue en boucle", "loop"),
    muted: o("", ["muet"], "without sound", "sans le son", "muted"),
    autoplay: o("", ["auto"], "starts by itself (muted)", "d\xE9marre seule (muette)", "autoplay"),
    controls: o("", ["controles"], "shows the buttons", "affiche les boutons", "controls"),
    cover: o("", ["couvre"], "fills the area", "remplit la zone", "cover")
  },
  button: {
    to: o("t", ["vers", "href"], "goes to a page", "emm\xE8ne vers une page", 'to "/shop"'),
    outline: o("", ["contour"], "outlined button", "bouton avec contour seul", "outline"),
    ghost: o("", ["discret", "subtle"], "discreet button", "bouton discret", "ghost"),
    large: o("", ["grand"], "large button", "grand bouton", "large"),
    small: o("", ["petit"], "small button", "petit bouton", "small"),
    disabled: o("e?", ["desactive"], "disabled (when the condition is true)", "d\xE9sactiv\xE9 (si la condition est vraie)", "disabled cart.length == 0")
  },
  form: {
    mail: o("e", ["courriel", "email"], "sends what is typed by e-mail to this address, then runs -> (needs KAURY_MAIL_KEY where the site is hosted)", "envoie ce qui est saisi par e-mail \xE0 cette adresse, puis lance -> (demande KAURY_MAIL_KEY chez l'h\xE9bergeur)", 'form mail "hello@bloom.ch" -> sent = true'),
    subject: o("t", ["sujet", "objet"], "subject of the e-mail sent by mail", "sujet de l'e-mail envoy\xE9 par mail", 'subject "New order"')
  },
  link: { "new-tab": o("", ["nouvel", "blank"], "opens in a new tab", "ouvre dans un nouvel onglet", "new-tab") },
  field: {
    type: o("m", [], "kind of field", "genre de champ", "type email", ["text", "email", "number", "range", "password", "date", "time", "tel", "url", "search"]),
    min: o("n", ["mini"], "smallest value of a number or of a slider", "plus petite valeur d\u2019un nombre ou d\u2019un curseur", "field years, type range, min 5, max 40"),
    max: o("n", ["maxi"], "largest value of a number or of a slider", "plus grande valeur d\u2019un nombre ou d\u2019un curseur", "field years, type range, min 5, max 40"),
    step: o("n", ["pas"], "by how much the value moves", "de combien la valeur avance", "field rate, type range, min 0, max 10, step 0.05"),
    required: o("", ["requis"], "mandatory", "obligatoire", "required"),
    label: o("t", ["etiquette"], "text above the field", "texte au-dessus du champ", 'label "Your email"')
  },
  textarea: {
    required: o("", ["requis"], "mandatory", "obligatoire", "required"),
    label: o("t", ["etiquette"], "text above", "texte au-dessus", 'label "Message"'),
    rows: o("n", ["lignes"], "height in lines", "hauteur en lignes", "rows 5")
  },
  select: { label: o("t", ["etiquette"], "text above", "texte au-dessus", 'label "Size"'), required: o("", ["requis"], "a choice must be made", "un choix est obligatoire", "required") },
  checkbox: { required: o("", ["requis"], "must be ticked", "doit \xEAtre coch\xE9e", "required") },
  section: {},
  seo: { image: o("t", [], "share image (1200\xD7630)", "image de partage (1200\xD7630)", 'image "share.jpg"') },
  // ---- immersion ----
  object: {
    position: o("nnn?", [], "position x y (z)", "position x y (z)", "position 0 1 0"),
    rotation: o("nnn?", [], "rotation in degrees x y z", "rotation en degr\xE9s x y z", "rotation 0 45 0"),
    size: o("n", ["taille", "scale"], "object size (1 = normal)", "taille de l'objet (1 = normale)", "size 1.5"),
    height: o("n", ["hauteur"], "area height (single object)", "hauteur de la zone (objet seul)", "height 500"),
    fallback: o("t", ["secours"], "image when the device cannot show 3D", "image si l'appareil ne peut pas afficher la 3D", 'fallback "can.png"'),
    shadows: o("", ["ombres"], "the object casts a shadow", "l'objet projette une ombre au sol", "shadows"),
    alt: o("t", ["texte", "description"], "description for accessibility and Google", "description pour l'accessibilit\xE9 et Google", 'alt "Strawberry can"'),
    immediate: o("", ["immediat"], "starts the 3D without waiting for a first gesture", "d\xE9marre la 3D sans attendre un premier geste", "immediate"),
    color: o("c", ["couleur"], "color of a shape (sphere, knot\u2026)", "couleur d'une forme", 'object "knot", color orange'),
    metal: o("", ["metal"], "shiny metal material for a shape", "mati\xE8re m\xE9tal brillant pour une forme", 'object "sphere", metal'),
    matte: o("", ["mat"], "matte material for a shape", "mati\xE8re mate pour une forme", 'object "cube", matte'),
    glass: o("", ["verre"], "glass material for a shape", "mati\xE8re verre pour une forme", 'object "gem", glass'),
    glow: o("", ["brille"], "the shape glows", "la forme brille", 'object "torus", glow')
  },
  scene: {
    height: o("n", ["hauteur"], "scene height", "hauteur de la sc\xE8ne", "height 600"),
    background: o("e", ["fond"], "scene background", "fond de la sc\xE8ne", "background night"),
    fog: o("c?", ["brouillard"], "depth fog", "brouillard de profondeur", "fog"),
    ground: o("c?", ["sol", "floor"], "adds a ground that receives shadows", "ajoute un sol qui re\xE7oit les ombres", "ground"),
    immediate: o("", ["immediat"], "starts the 3D without waiting for a first gesture", "d\xE9marre la 3D sans attendre un premier geste", "immediate"),
    particles: o("m?n?", ["particules"], "ambient particles", "particules d'ambiance", "particles stars", ["stars", "snow", "bubbles", "dust", "confetti"])
  },
  light: {},
  camera: { distance: o("n", [], "camera distance", "recul de la cam\xE9ra", "distance 6") },
  sound: {
    loop: o("", ["boucle"], "plays in a loop", "joue en boucle", "loop"),
    volume: o("n", [], "volume from 0 to 1", "volume de 0 \xE0 1", "volume 0.4")
  }
};
ELEMENT_OPTIONS.character = { ...ELEMENT_OPTIONS.object, animation: o("t", ["anime"], "animation played at start", "animation jou\xE9e au d\xE9part", 'animation "idle"') };
ELEMENT_OPTIONS.subtitle = ELEMENT_OPTIONS.title;
var UNIVERSAL_OPTIONS = {
  class: o("e", ["classe"], "CSS classes of your own (replaces the default look)", "classes CSS \xE0 toi (remplace l'apparence par d\xE9faut)", 'box class "hero"'),
  look: o("e", ["allure"], "a class of your own added to the default look, styled in a css block", "une classe \xE0 toi ajout\xE9e \xE0 l'apparence par d\xE9faut, styl\xE9e dans un bloc css", 'grid 3 columns, look "pricing"'),
  tag: o("e", ["balise"], "exact HTML tag", "balise HTML exacte", 'box tag "figure"'),
  attr: o("ee?", ["attribut"], "HTML attribute (name, value)", "attribut HTML (nom, valeur)", 'box attr "aria-hidden" "true"'),
  id: o("e", [], "id of the element (anchor)", "identifiant de l'\xE9l\xE9ment (ancre)", 'box id "prices"'),
  selected: o("e?", ["selectionne"], "selected tab or item (a style can say how it looks: selected \u2026)", "onglet ou \xE9l\xE9ment s\xE9lectionn\xE9", 'button "Code", selected (tab == 0)'),
  current: o("e?", ["courant"], "the current page or step (current \u2026)", "la page ou l'\xE9tape en cours", 'link "Docs" "/docs/", current (route.path == "/docs/")'),
  open: o("e?", ["ouvert"], "a details element shown open", "un details affich\xE9 ouvert", 'details "Price?", open'),
  html: o("e?", [], "content written in HTML (trusted text only)", "contenu \xE9crit en HTML (texte de confiance uniquement)", 'text "Hello<br>world", html')
};
var UNIVERSAL_HEADS = /* @__PURE__ */ new Set(["details", "dialog", "languages", "embed", "section", "header", "footer", "nav", "grid", "column", "row", "box", "card", "title", "subtitle", "text", "image", "video", "link", "links", "logo", "button", "form", "field", "textarea", "select", "checkbox", "list", "item", "icon", "divider", "spacer", "markdown"]);
var MOTIONS = {
  spin: o("*", [], "spins: spin, spin 90/s, spin on scroll, spin x", "tourne sur lui-m\xEAme : tourne, tourne 90/s, tourne au defilement", "spin on scroll"),
  float: o("*", [], "floats gently: float, float 0.3", "flotte doucement", "float"),
  jump: o("*", [], "jumps (once as an action, otherwise regularly)", "saute (une fois en action, sinon r\xE9guli\xE8rement)", "on click -> jump"),
  pulse: o("*", [], "grows and shrinks rhythmically", "grossit et r\xE9tr\xE9cit en rythme", "pulse"),
  sway: o("*", [], "sways left and right", "se balance de gauche \xE0 droite", "sway"),
  "follows-mouse": o("*", [], "reacts to the mouse: follows mouse, smooth", "r\xE9agit \xE0 la souris : suit souris, doux", "follows mouse, smooth"),
  "enters-from": o("*", [], "entrance: left, right, top, bottom, fade, zoom", "apparition : gauche, droite, haut, bas, fondu, zoom", "enters from left"),
  parallax: o("*", [], "moves faster or slower than the scroll", "bouge plus ou moins vite que le d\xE9filement", "parallax 0.3"),
  says: o("*", [], "speech bubble", "bulle de dialogue", 'says "Hi!"'),
  play: o("*", [], "plays a named animation", "joue une animation nomm\xE9e", 'play "dance"')
};
var MOTION_WORDS = /* @__PURE__ */ new Set(["smooth", "fast", "slow", "x", "y", "z", "on", "scroll", "left", "right", "top", "bottom", "fade", "zoom", "reverse", "loop", "once"]);
var LIGHTS = ["studio", "soft", "sunset", "night", "neon", "day", "dramatic"];
var CAMERAS = ["fixed", "follows-mouse", "fly", "free", "orbit"];
var TRANSITIONS = ["fade", "slide", "zoom", "curtain", "none"];
var e = (tag, kind, help, helpFr, example) => ({ tag, kind, help, helpFr, example });
var ELEMENTS = {
  section: e("section", "container", "a part of the page", "une partie de la page", "section flavors"),
  header: e("header", "container", "site header", "en-t\xEAte du site", "header"),
  footer: e("footer", "container", "page footer", "pied de page", "footer"),
  nav: e("nav", "container", "navigation", "navigation", "nav"),
  grid: e("div", "container", "grid of columns", "grille de colonnes", "grid 3 columns, gap 24"),
  column: e("div", "container", "stacks its children vertically", "empile ses enfants verticalement", "column gap 12"),
  row: e("div", "container", "puts its children side by side", "aligne ses enfants c\xF4te \xE0 c\xF4te", "row gap 12"),
  box: e("div", "container", "simple container", "conteneur simple", "box padding 24"),
  card: e("article", "container", "card (image + text)", "carte (image + texte)", 'card "Strawberry" "strawberry.png"'),
  title: e("h1", "text", "main heading", "titre principal", 'title "Hello", size 64'),
  subtitle: e("h2", "text", "secondary heading", "titre secondaire", 'subtitle "Our flavors"'),
  text: e("p", "text", "paragraph", "paragraphe", 'text "Welcome {name}"'),
  image: e("img", "media", "image", "image", 'image "photo.jpg", radius 16'),
  video: e("video", "media", "video", "vid\xE9o", 'video "film.mp4", autoplay, loop'),
  link: e("a", "text", "link", "lien", 'link "Contact" "/contact"'),
  links: e("nav", "special", "menu of links", "menu de liens", "links Home, Flavors, Shop"),
  logo: e("a", "special", "logo linking to the home page", "logo cliquable vers l'accueil", 'logo "crush.svg"'),
  button: e("button", "text", "button", "bouton", 'button "Buy" -> cart.add can'),
  form: e("form", "container", "form (-> action on submit)", "formulaire (-> action \xE0 l'envoi)", 'form -> send "/api", { email }'),
  field: e("input", "field", "input bound to a state", "champ de saisie li\xE9 \xE0 un \xE9tat", 'field email "Your email", type email'),
  textarea: e("textarea", "field", "multi-line text area", "zone de texte", 'textarea message "Your message"'),
  select: e("select", "field", "dropdown list", "liste d\xE9roulante", 'select size "S", "M", "L"'),
  checkbox: e("input", "field", "checkbox", "case \xE0 cocher", 'checkbox agree "I agree"'),
  list: e("ul", "container", "bulleted list", "liste \xE0 puces", "list"),
  item: e("li", "text", "list item", "ligne d'une liste", 'item "Free delivery"'),
  icon: e("span", "text", "icon (emoji or character)", "ic\xF4ne (emoji ou caract\xE8re)", 'icon "\u2605"'),
  divider: e("hr", "special", "separator line", "ligne de s\xE9paration", "divider"),
  spacer: e("div", "special", "empty space", "espace vide", "spacer 48"),
  markdown: e("div", "text", "Markdown text rendered as rich text (titles, lists, links)", "texte Markdown affich\xE9 en texte riche (titres, listes, liens)", "markdown post.body"),
  details: e("details", "container", "a question or title that opens on click to show what is below", "une question ou un titre qui s'ouvre au clic", 'details "Is it free?"'),
  languages: e("nav", "special", "links to this page in the other languages of the site (FR \xB7 EN)", "liens vers cette page dans les autres langues du site (FR \xB7 EN)", "languages"),
  dialog: e("dialog", "container", "a window over the page, shown while its state is true (open name, close name)", "une fen\xEAtre par-dessus la page, affich\xE9e tant que son \xE9tat est vrai (open nom, close nom)", 'dialog booking, "Book a table"'),
  embed: e("iframe", "media", "another page shown inside this one (map, video, app)", "une autre page affich\xE9e dans celle-ci", 'embed "https://\u2026", "Map of the shop"'),
  slot: e("div", "special", "inside a component: where the content given between its lines goes", "dans un composant : l\xE0 o\xF9 va le contenu donn\xE9 entre ses lignes", "slot"),
  scene: e("div", "immersion", "2D or 3D immersive area", "zone immersive 2D ou 3D", "scene"),
  object: e("div", "immersion", "object .glb, .gltf, .png, .svg, .json (Lottie)", "objet .glb, .gltf, .png, .svg, .json (Lottie)", 'object can "crush.glb"'),
  character: e("div", "immersion", "animated object with named animations", "objet anim\xE9 avec animations nomm\xE9es", 'character "mascot.glb"'),
  sound: e("audio", "immersion", "sound or music, with a mute button", "son ou musique, avec bouton muet", 'sound "ambient.mp3", loop')
};
var SETTINGS = /* @__PURE__ */ new Set(["style", "mobile", "tablet", "desktop", "seo", "colors", "font", "fonts", "lang", "favicon", "url", "alternate", "head", "wrapper", "base", "light", "camera", "transition"]);
var EVENTS = /* @__PURE__ */ new Set(["on-click", "on-hover", "on-scroll", "on-load"]);
var STYLE_ALIASES = /* @__PURE__ */ new Map();
for (const [name, s] of Object.entries(STYLES)) {
  STYLE_ALIASES.set(name, name);
  for (const a of s.aliases ?? []) STYLE_ALIASES.set(a, name);
}
function styleOption(word) {
  return STYLE_ALIASES.get(stripAccents(word));
}
function elementOption(head, word) {
  const w = stripAccents(word);
  for (const table of [ELEMENT_OPTIONS[head], UNIVERSAL_HEADS.has(head) ? UNIVERSAL_OPTIONS : void 0]) {
    if (!table) continue;
    for (const [name, s] of Object.entries(table)) {
      if (name === w || (s.aliases ?? []).includes(w)) return name;
    }
  }
  return void 0;
}
function optionSpec(head, name) {
  return ELEMENT_OPTIONS[head]?.[name] ?? (UNIVERSAL_HEADS.has(head) ? UNIVERSAL_OPTIONS[name] : void 0) ?? STYLES[name];
}
function optionWords() {
  const seen = /* @__PURE__ */ new Map();
  for (const table of [STYLES, UNIVERSAL_OPTIONS, ...Object.values(ELEMENT_OPTIONS)]) {
    for (const [name, s] of Object.entries(table)) if (!seen.has(name)) seen.set(name, s.aliases ?? []);
  }
  return [...seen];
}
function styleWords() {
  return [...STYLE_ALIASES.keys()];
}
function allOptions(head) {
  return [...Object.keys(ELEMENT_OPTIONS[head] ?? {}), ...UNIVERSAL_HEADS.has(head) ? Object.keys(UNIVERSAL_OPTIONS) : [], ...Object.keys(STYLES)];
}

// src/core/globals.ts
var globals_exports = {};
__export(globals_exports, {
  JS_GLOBALS: () => JS_GLOBALS,
  KAURY_FUNCTIONS: () => KAURY_FUNCTIONS,
  KAURY_VALUES: () => KAURY_VALUES,
  METHODS: () => METHODS,
  PROPERTIES: () => PROPERTIES,
  globalNames: () => globalNames,
  globalSpec: () => globalSpec,
  kauryGlobal: () => kauryGlobal,
  kauryMethod: () => kauryMethod,
  kauryNames: () => kauryNames
});
var g = (js, help, aliases = []) => ({ js, help, aliases });
var KAURY_FUNCTIONS = {
  print: g("print", "prints a value in the console", ["affiche", "log"]),
  load: g("load", 'loads data (JSON or text): await load "/api/products"', ["charge"]),
  send: g("send", 'sends data: await send "/api", { email }', ["envoie", "post"]),
  sum: g("sum", "sum of a list: sum cart, a -> a.price", ["somme"]),
  average: g("average", "average of a list", ["moyenne", "avg"]),
  min: g("min", "smallest value", ["minimum"]),
  max: g("max", "largest value", ["maximum"]),
  round: g("round", "rounds: round 3.14159, 2", ["arrondi"]),
  floor: g("floor", "rounds down", ["plancher"]),
  ceil: g("ceil", "rounds up", ["plafond"]),
  abs: g("abs", "absolute value", ["absolu"]),
  sqrt: g("sqrt", "square root", ["racine"]),
  random: g("random", "random number: random 1, 6", ["aleatoire"]),
  pick: g("pick", "random item of a list", ["hasard"]),
  length: g("length", "number of items or letters", ["longueur", "len"]),
  now: g("now", "current date and time", ["maintenant"]),
  "to-text": g("toText", "converts to text", ["en-texte", "str"]),
  "to-number": g("toNumber", "converts to a number", ["en-nombre", "num"]),
  price: g("price", 'formats a price: price 12.5 \u2192 "CHF 12.50"', ["prix", "money"]),
  "format-number": g("formatNumber", 'a number as people read it: format-number 23490 \u2192 "23,490" (in the language of the site); format-number 3.14159, 2 \u2192 "3.14"', ["formate-nombre"]),
  "to-date": g("toDate", 'a date from a text: to-date "2027-06-12 14:00" (one date minus another: the milliseconds between them)', ["en-date"]),
  "format-date": g("formatDate", "formats a date: format-date now()", []),
  shuffle: g("shuffle", "shuffles a list", ["melange"]),
  "image-size": g("imageSize", 'real size of an image of the site: image-size "photo.jpg" \u2192 { width, height }', ["taille-image"]),
  range: g("range", "list of numbers: range 1, 5", ["intervalle"]),
  every: g("every", "repeats an action: every 2s, -> count += 1", ["repete", "repeat"]),
  later: g("later", "delayed action: later 1s, -> close menu", ["plus-tard"]),
  persist: g("persist", 'keeps a state in the browser: persist "cart", cart', ["memorise"]),
  copy: g("copy", "copies a text to the clipboard", ["copie"]),
  confetti: g("confetti", "throws confetti on the screen", ["confettis"]),
  vibrate: g("vibrate", "makes the phone vibrate", ["vibre"]),
  "scroll-to": g("scrollTo", 'scrolls to a section: scroll-to "flavors"', ["defile"]),
  share: g("share", "opens the phone share sheet", ["partage"]),
  "json-ld": g("jsonLd", 'structured data for Google and AIs, given to head: head json-ld { "@type": "FAQPage" }', ["donnees-structurees"]),
  slug: g("slug", 'text \u2192 address-friendly form: slug "Hello world" \u2192 "hello-world"', []),
  base64: g("base64", 'text \u2192 base64, for links that carry code or data: base64 "Hello"', []),
  "encode-url": g("encodeUrl", 'text made safe inside an address: encode-url "a b" \u2192 "a%20b"', ["encode-adresse"])
};
var KAURY_VALUES = {
  mouse: g("mouse", "mouse position: mouse.x, mouse.y (from -1 to 1)", ["souris"]),
  scroll: g("scroll", "page scroll progress, from 0 to 1", ["defilement"]),
  screen: g("screen", "screen size: screen.width, screen.mobile", ["ecran"]),
  route: g("route", "current page: route.path, route.params.id", []),
  objects: g("objects", "named 3D objects of the page", ["objets"])
};
var JS_GLOBALS = /* @__PURE__ */ new Set([
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
for (const [name, f] of Object.entries({ ...KAURY_FUNCTIONS, ...KAURY_VALUES })) {
  INDEX.set(name, name);
  for (const a of f.aliases) if (!INDEX.has(a)) INDEX.set(a, name);
}
function kauryGlobal(name) {
  return INDEX.get(name);
}
function globalSpec(canonical) {
  return KAURY_FUNCTIONS[canonical] ?? KAURY_VALUES[canonical];
}
function globalNames() {
  return [...INDEX.keys(), ...JS_GLOBALS];
}
function kauryNames(aliases = false) {
  return aliases ? [...INDEX.keys()] : [...Object.keys(KAURY_FUNCTIONS), ...Object.keys(KAURY_VALUES)];
}
var METHODS = {
  add: ["ajoute", "push"],
  remove: ["retire"],
  clear: ["vide"],
  filter: ["filtre"],
  map: ["transforme"],
  sort: ["trie", "sort-by"],
  reverse: ["inverse"],
  find: ["trouve"],
  contains: ["contient", "includes"],
  join: ["joint"],
  each: ["chaque", "forEach"],
  count: ["compte"],
  unique: ["uniq"],
  take: ["prends"],
  sum: ["somme"],
  upper: ["majuscules", "toUpperCase"],
  lower: ["minuscules", "toLowerCase"],
  replace: ["remplace"],
  split: ["coupe"],
  "starts-with": ["commence-par", "startsWith"],
  "ends-with": ["finit-par", "endsWith"],
  trim: ["nettoie"],
  keys: ["cles"],
  values: ["valeurs"],
  first: ["premier"],
  last: ["dernier"],
  length: ["longueur", "len"],
  insert: ["insere"],
  update: ["mets-a-jour"]
};
var PROPERTIES = /* @__PURE__ */ new Set(["length", "first", "last", "keys", "values"]);
var METHOD_INDEX = /* @__PURE__ */ new Map();
for (const [name, aliases] of Object.entries(METHODS)) {
  METHOD_INDEX.set(name, name);
  for (const a of aliases) if (!METHOD_INDEX.has(a)) METHOD_INDEX.set(a, name);
}
function kauryMethod(name) {
  return METHOD_INDEX.get(name);
}

// src/core/habits.ts
var h = (k, en, fr, on) => ({ k, en, fr, on });
var say = (en, fr) => ({ en, fr });
var SIDES = ["top, right, bottom, left", "haut, droite, bas, gauche"];
var AXES = ["top and bottom, then left and right", "haut et bas, puis gauche et droite"];
var SIZE = h("size 48", "a size is a number", "une taille est un nombre");
var HIDDEN = h("hidden (count == 0)", "or put the element under an \u201Cif\u201D line", "ou place l'\xE9l\xE9ment sous une ligne \xAB si \xBB");
var PLACE = h("center", "center centers the content; align left, center or right places the text", "center centre le contenu ; align left, center ou right place le texte");
var ACTION = say(
  'an action is written after \u201C->\u201D: button "Go" -> count += 1   (or on a line below: on click -> \u2026)',
  `une action s'\xE9crit apr\xE8s \xAB -> \xBB : bouton "Go" -> compteur += 1   (ou sur une ligne en dessous : au clic -> \u2026)`
);
var NAMED_STYLE = say(
  "a named style: write \u201Cstyle card\u201D once with its options indented below, then its name on the element: box card",
  "un style nomm\xE9 : \xE9cris \xAB style carte \xBB une fois avec ses options indent\xE9es dessous, puis son nom sur l'\xE9l\xE9ment : box carte"
);
var ENTRANCE = h("animate fade", "fade, lift, zoom, left, right \u2014 or on a line below: enters from bottom", "fade, lift, zoom, left, right \u2014 ou sur une ligne en dessous : entre depuis bas");
var OPTION_HABITS = {
  // text
  "font-size": h("size 20"),
  fontsize: h("size 20"),
  "text-size": h("size 20"),
  "font-weight": h("weight 600", "or: bold", "ou : bold"),
  fontweight: h("weight 600", "or: bold", "ou : bold"),
  "font-family": h('font "Satoshi"'),
  fontfamily: h('font "Satoshi"'),
  "font-style": h("italic"),
  italics: h("italic"),
  "text-align": h("align center"),
  textalign: h("align center"),
  "text-center": h("align center"),
  "text-color": h("color pink"),
  foreground: h("color pink"),
  fg: h("color pink"),
  "text-decoration": h("underline", "plain removes it", "plain le retire"),
  "text-transform": h("uppercase"),
  strong: h("bold"),
  "font-bold": h("bold"),
  thin: h("light"),
  semibold: h("weight 600"),
  // background, borders, shadows
  "background-color": h("background pink"),
  backgroundcolor: h("background pink"),
  "bg-color": h("background pink"),
  bgcolor: h("background pink"),
  "background-image": h('background "photo.jpg"'),
  "border-radius": h("radius 12"),
  borderradius: h("radius 12"),
  "corner-radius": h("radius 12"),
  "rounded-lg": h("radius 12"),
  "rounded-full": h("round"),
  circle: h("round"),
  "border-color": h("border 1 gray"),
  "border-width": h("border 2 gray"),
  "border-style": h("border 1 gray"),
  "box-shadow": h("shadow soft"),
  boxshadow: h("shadow soft"),
  "drop-shadow": h("shadow soft"),
  elevation: h("shadow soft"),
  "shadow-sm": h("shadow soft"),
  "shadow-md": h("shadow medium"),
  "shadow-lg": h("shadow strong"),
  // space
  "margin-top": h("margin 20 0 0 0", ...SIDES),
  "margin-right": h("margin 0 20 0 0", ...SIDES),
  "margin-bottom": h("margin 0 0 20 0", ...SIDES),
  "margin-left": h("margin 0 0 0 20", ...SIDES),
  "padding-top": h("padding 20 0 0 0", ...SIDES),
  "padding-right": h("padding 0 20 0 0", ...SIDES),
  "padding-bottom": h("padding 0 0 20 0", ...SIDES),
  "padding-left": h("padding 0 0 0 20", ...SIDES),
  "margin-x": h("margin 0 20", ...AXES),
  mx: h("margin 0 20", ...AXES),
  "margin-inline": h("margin 0 20", ...AXES),
  "margin-y": h("margin 20 0", ...AXES),
  my: h("margin 20 0", ...AXES),
  "margin-block": h("margin 20 0", ...AXES),
  "padding-x": h("padding 0 20", ...AXES),
  "padding-inline": h("padding 0 20", ...AXES),
  "padding-y": h("padding 20 0", ...AXES),
  py: h("padding 20 0", ...AXES),
  "padding-block": h("padding 20 0", ...AXES),
  "mx-auto": h("center"),
  "column-gap": h("gap 24"),
  "row-gap": h("gap 24"),
  "grid-gap": h("gap 24"),
  // layout
  display: say(
    "elements place their children: row (side by side), column (stacked), grid 3 columns; the option \u201Chidden\u201D hides",
    "les \xE9l\xE9ments placent leurs enfants : row (c\xF4te \xE0 c\xF4te), column (empil\xE9s), grid 3 columns ; l'option \xAB hidden \xBB cache"
  ),
  flex: h("direction row", "or the elements row and column", "ou les \xE9l\xE9ments row et column"),
  "flex-direction": h("direction row", "or the elements row and column", "ou les \xE9l\xE9ments row et column"),
  "flex-row": h("direction row"),
  "flex-col": h("direction column"),
  justify: PLACE,
  "justify-content": PLACE,
  "align-items": PLACE,
  items: PLACE,
  "place-items": PLACE,
  "justify-items": PLACE,
  "align-content": PLACE,
  "grid-template-columns": h("columns 3", "columns 2 1 for unequal widths", "columns 2 1 pour des largeurs in\xE9gales"),
  "grid-cols": h("columns 3"),
  "grid-columns": h("columns 3"),
  "z-index": h("front"),
  zindex: h("front"),
  position: h("sticky", "sticky stays at the top; pin bottom right places over the parent; front goes in front", "sticky reste en haut ; pin bottom right pose par-dessus le parent ; front passe devant"),
  overflow: h("clip"),
  "w-full": h("full-width"),
  "width-full": h("full-width"),
  fullwidth: h("full-width"),
  "h-screen": h("fullscreen"),
  "min-h-screen": h("fullscreen"),
  "full-height": h("fullscreen"),
  "h-full": h("fullscreen"),
  "object-fit": h("cover", void 0, void 0, 'image "photo.jpg", "A photo"'),
  fit: h("cover", void 0, void 0, 'image "photo.jpg", "A photo"'),
  // visibility
  visibility: HIDDEN,
  visible: HIDDEN,
  show: HIDDEN,
  "display-none": HIDDEN,
  "v-if": HIDDEN,
  "v-show": HIDDEN,
  when: HIDDEN,
  // effects
  transform: h("move 0 -10", "also: grow 1.1, tilt 3", "aussi : grow 1.1, tilt 3"),
  transition: say("nothing to write: changes are animated by themselves (hover lift 4)", "rien \xE0 \xE9crire : les changements s'animent tout seuls (hover lift 4)"),
  "backdrop-filter": h("glass", "or: blur 8", "ou : blur 8"),
  backdropfilter: h("glass", "or: blur 8", "ou : blur 8"),
  filter: h("blur 8", "or: grayscale", "ou : grayscale"),
  "fade-in": ENTRANCE,
  fadein: ENTRANCE,
  fade: ENTRANCE,
  "slide-in": ENTRANCE,
  "slide-up": ENTRANCE,
  slideup: ENTRANCE,
  "zoom-in": ENTRANCE,
  // sizes said with a word
  big: SIZE,
  huge: SIZE,
  large: SIZE,
  medium: SIZE,
  small: SIZE,
  tiny: SIZE,
  xl: SIZE,
  xxl: SIZE,
  lg: SIZE,
  md: SIZE,
  sm: SIZE,
  xs: SIZE,
  // attributes
  classname: NAMED_STYLE,
  style: say('options are written on the line itself: title "Hi", size 40, color pink', `les options s'\xE9crivent sur la ligne elle-m\xEAme : title "Salut", size 40, color pink`),
  onclick: ACTION,
  "on-click": ACTION,
  onpress: ACTION,
  onsubmit: ACTION,
  onchange: ACTION,
  src: say('the file is the first value: image "photo.jpg", "What it shows"', `le fichier est la premi\xE8re valeur : image "photo.jpg", "Ce qu'elle montre"`),
  placeholder: say('the hint is the text after the state: field email "Your email"', `l'indication est le texte apr\xE8s l'\xE9tat : champ email "Ton e-mail"`),
  value: say('a field fills the state named first: field email "Your email"', `un champ remplit l'\xE9tat nomm\xE9 en premier : champ email "Ton e-mail"`),
  "v-model": say('a field fills the state named first: field email "Your email"', `un champ remplit l'\xE9tat nomm\xE9 en premier : champ email "Ton e-mail"`),
  target: h("new-tab", void 0, void 0, 'link "Docs" "/docs"'),
  href: say('the address comes right after the text: link "Contact" "/contact"   \u2014   for a button: button "Shop", to "/shop"', `l'adresse vient juste apr\xE8s le texte : lien "Contact" "/contact"   \u2014   pour un bouton : bouton "Boutique", vers "/boutique"`),
  key: say("nothing to write: Kaury follows the items of a list by itself", "rien \xE0 \xE9crire : Kaury suit tout seul les \xE9l\xE9ments d'une liste"),
  link: say('a button goes to a page with: button "Shop", to "/shop"   \u2014   a text link is the element: link "Shop" "/shop"', `un bouton m\xE8ne \xE0 une page avec : bouton "Boutique", vers "/boutique"   \u2014   un lien de texte est l'\xE9l\xE9ment : lien "Boutique" "/boutique"`),
  url: say('a button goes to a page with: button "Shop", to "/shop"   \u2014   a text link is the element: link "Shop" "/shop"', `un bouton m\xE8ne \xE0 une page avec : bouton "Boutique", vers "/boutique"   \u2014   un lien de texte est l'\xE9l\xE9ment : lien "Boutique" "/boutique"`)
};
var BOX = h("box", "a simple container; also: section, row, column, grid 3 columns", "un conteneur simple ; aussi : section, row, column, grid 3 columns");
var TEXT = h('text "\u2026"');
var TITLE = h('title "\u2026"');
var LINK = h('link "Contact" "/contact"');
var IMAGE = h('image "photo.jpg", "What it shows"');
var LIST = h("list", 'with lines \u201Citem "\u2026"\u201D indented below', 'avec des lignes \xAB item "\u2026" \xBB indent\xE9es dessous');
var GRID = h("grid 3 columns", "one line below per cell", "une ligne en dessous par case");
var HEADER = h("header", 'with \u201Clogo "Name"\u201D and \u201Clinks Home, Shop\u201D indented below', 'avec \xAB logo "Nom" \xBB et \xAB links Accueil, Boutique \xBB indent\xE9s dessous');
var ROW = h("row", "its children side by side", "ses enfants c\xF4te \xE0 c\xF4te");
var COLUMN = h("column", "its children stacked", "ses enfants empil\xE9s");
var FIELD = h('field name "Your name"');
var ELEMENT_HABITS = {
  div: BOX,
  container: BOX,
  wrapper: BOX,
  block: BOX,
  panel: BOX,
  group: BOX,
  view: BOX,
  aside: BOX,
  figure: BOX,
  article: BOX,
  main: h("section", "a part of the page", "une partie de la page"),
  span: TEXT,
  p: TEXT,
  paragraph: TEXT,
  para: TEXT,
  label: h('field email "you@example.com", label "Email"'),
  h1: TITLE,
  heading: TITLE,
  headline: TITLE,
  h2: h('subtitle "\u2026"'),
  subheading: h('subtitle "\u2026"'),
  subhead: h('subtitle "\u2026"'),
  h3: h('subtitle "\u2026", level 3'),
  h4: h('subtitle "\u2026", level 4'),
  h5: h('subtitle "\u2026", level 5'),
  h6: h('subtitle "\u2026", level 6'),
  strong: h('text "\u2026", bold', 'inside a text: "an *important* word"', 'dans un texte : "un mot *important*"'),
  b: h('text "\u2026", bold', 'inside a text: "an *important* word"', 'dans un texte : "un mot *important*"'),
  em: h('text "\u2026", italic'),
  i: h('text "\u2026", italic'),
  small: h('text "\u2026", size 13'),
  blockquote: h('text "\u2026", italic'),
  quote: h('text "\u2026", italic'),
  a: LINK,
  anchor: LINK,
  hyperlink: LINK,
  img: IMAGE,
  picture: IMAGE,
  photo: IMAGE,
  pic: IMAGE,
  ul: LIST,
  ol: LIST,
  li: h('item "\u2026"'),
  hr: h("divider"),
  separator: h("divider"),
  br: h("spacer 24", "inside a text, a new line is written \\n", "dans un texte, un retour \xE0 la ligne s'\xE9crit \\n"),
  iframe: h('embed "https://example.com", "What it is"'),
  table: GRID,
  tr: GRID,
  td: GRID,
  th: GRID,
  cols: GRID,
  body: h('page "/"'),
  html: h('site "Name"'),
  meta: h('seo "Title", "Description"'),
  script: say("raw JavaScript goes under a line \u201Cjs\u201D, indented \u2014 only when really needed", "le JavaScript brut va sous une ligne \xAB js \xBB, indent\xE9 \u2014 seulement si vraiment n\xE9cessaire"),
  hero: h('Hero "Title", "Intro", "Action", "#contact"', "a ready-made block, written with a capital letter; or: section fullscreen, center", "un bloc tout fait, avec une majuscule ; ou : section fullscreen, center"),
  navbar: HEADER,
  navigation: HEADER,
  menu: HEADER,
  topbar: HEADER,
  flex: ROW,
  hstack: ROW,
  horizontal: ROW,
  inline: ROW,
  stack: COLUMN,
  vstack: COLUMN,
  vertical: COLUMN,
  col: COLUMN,
  btn: h('button "Send"'),
  cta: h('button "Send"'),
  submit: h('button "Send"', "inside a form, the button sends it", "dans un formulaire, le bouton l'envoie"),
  textbox: FIELD,
  textfield: FIELD,
  "text-field": FIELD,
  "input-field": FIELD,
  dropdown: h('select size "S", "M", "L"'),
  accordion: h('details "Is it free?"', "what is indented below shows on click", "ce qui est indent\xE9 dessous s'affiche au clic"),
  modal: h('dialog booking, "Book a table"', 'a window over the page: button "Book" -> open booking', 'une fen\xEAtre par-dessus la page : bouton "R\xE9server" -> open booking'),
  popup: h('dialog booking, "Book a table"', 'a window over the page: button "Book" -> open booking', 'une fen\xEAtre par-dessus la page : bouton "R\xE9server" -> open booking'),
  lightbox: h('dialog photo, "Photo"', 'a window over the page: button "See" -> open photo', 'une fen\xEAtre par-dessus la page : bouton "Voir" -> open photo'),
  canvas: h('object "knot"', "a 3D shape, or a .glb file", "une forme 3D, ou un fichier .glb"),
  audio: h('sound "ambient.mp3", loop'),
  music: h('sound "ambient.mp3", loop')
};
var FOR = h("for item in items");
var FUNCTION = h("function double x then x * 2");
var LET = h("let x = 3", "a fixed value; for a value that changes on screen: state x = 3", "une valeur fixe ; pour une valeur qui change \xE0 l'\xE9cran : state x = 3");
var IF = h("if \u2026 else if \u2026 else", "each on its own line, its block indented below", "chacun sur sa ligne, son bloc indent\xE9 dessous");
var NONE = h("none");
var END = say("a block ends when the indentation goes back: nothing to write", "un bloc se termine quand l'indentation revient : rien \xE0 \xE9crire");
var VALUE_HABITS = {
  True: h("true"),
  TRUE: h("true"),
  False: h("false"),
  FALSE: h("false"),
  None: NONE,
  nil: NONE,
  Nil: NONE,
  NULL: NONE,
  Null: NONE
};
var WORD_HABITS = {
  each: FOR,
  foreach: FOR,
  forEach: FOR,
  loop: FOR,
  repeat: h("for i in 1..3"),
  times: h("for i in 1..3"),
  elif: h("else if"),
  elsif: h("else if"),
  elseif: h("else if"),
  def: FUNCTION,
  func: FUNCTION,
  fun: FUNCTION,
  proc: FUNCTION,
  sub: FUNCTION,
  method: FUNCTION,
  lambda: FUNCTION,
  async: say("\u201Casync\u201D is not needed: write \u201Cfunction load-data\u201D, and \u201Cawait\u201D works inside by itself", "\xAB async \xBB est inutile : \xE9cris \xAB function charge-donnees \xBB, et \xAB await \xBB fonctionne dedans tout seul"),
  var: LET,
  variable: LET,
  set: LET,
  local: LET,
  global: LET,
  val: LET,
  mut: LET,
  define: LET,
  class: h("component Card name"),
  route: h('page "/about"'),
  switch: IF,
  case: IF,
  match: IF,
  end: END,
  endif: END,
  fi: END,
  done: END,
  echo: h('print "Hello"'),
  puts: h('print "Hello"'),
  printf: h('print "Hello"'),
  println: h('print "Hello"'),
  require: h('import confetti from "canvas-confetti"')
};
var own = (table, word) => Object.prototype.hasOwnProperty.call(table, word) ? table[word] : void 0;
function sentence(x) {
  if (!x) return void 0;
  if (!x.k) return msg(x.en, x.fr);
  return msg(`in Kaury: ${x.k}${x.en ? `   (${x.en})` : ""}`, `en Kaury : ${x.k}${x.fr ? `   (${x.fr})` : ""}`);
}
var optionHabit = (word) => sentence(own(OPTION_HABITS, word) ?? own(OPTION_HABITS, word.toLowerCase()));
var elementHabit = (word) => sentence(own(ELEMENT_HABITS, word));
var wordHabit = (word) => sentence(own(WORD_HABITS, word));
var valueHabit = (word) => sentence(own(VALUE_HABITS, word));
var lineHabit = (word) => elementHabit(word) ?? wordHabit(word);

// src/core/parser.ts
var STYLE_PARTS = ["title", "subtitle", "text", "link", "image", "button", "icon", "code", "block", "list", "item", "table", "cell", "quote", "summary", "emphasis", "logo", "field", "label"];
var STYLE_STATES = {
  selected: "selected",
  selectionne: "selected",
  current: "current",
  courant: "current",
  open: "open",
  ouvert: "open",
  focus: "focus",
  pressed: "pressed",
  appuye: "pressed",
  disabled: "disabled",
  desactive: "disabled",
  checked: "checked",
  coche: "checked"
};
var UI_HEADS = /* @__PURE__ */ new Set([
  // web
  "section",
  "header",
  "footer",
  "nav",
  "grid",
  "column",
  "row",
  "box",
  "card",
  "title",
  "subtitle",
  "text",
  "image",
  "video",
  "link",
  "links",
  "logo",
  "button",
  "form",
  "field",
  "textarea",
  "select",
  "checkbox",
  "list",
  "item",
  "icon",
  "divider",
  "spacer",
  "slot",
  "markdown",
  "details",
  "dialog",
  "languages",
  "embed",
  "style",
  "mobile",
  "tablet",
  "desktop",
  "seo",
  "colors",
  "font",
  "fonts",
  "lang",
  "favicon",
  "url",
  "alternate",
  "head",
  "wrapper",
  "base",
  // immersion
  "scene",
  "object",
  "character",
  "light",
  "camera",
  "on",
  "follows",
  "enters",
  "spin",
  "float",
  "jump",
  "pulse",
  "sway",
  "says",
  "play",
  "sound",
  "transition",
  "parallax"
]);
var INFIX_WORDS = /* @__PURE__ */ new Set(["and", "or", "in", "then", "else", "from", "as"]);
var ASSIGN_OPS = /* @__PURE__ */ new Set(["=", "+=", "-=", "*=", "/=", "**="]);
var COMPOUND = {
  on: ["click", "hover", "scroll", "load"],
  follows: ["mouse"],
  enters: ["from"]
};
var FREE = { implicit: true, item: false };
var ITEM = { implicit: false, item: true };
var SIMPLE = { implicit: false, item: false };
function parse(source, notes, errors) {
  return new Parser(tokenize(source, notes, errors), errors).program();
}
function parseInterpolation(code, line, column) {
  let tokens;
  try {
    tokens = tokenize(code);
  } catch (e3) {
    if (e3 instanceof KauryError) {
      e3.line = line;
      e3.column = column + e3.column - 1;
    }
    throw e3;
  }
  for (const t of tokens) {
    t.line = line;
    t.column = column + t.column - 1;
    t.end = column + t.end - 1;
  }
  const p = new Parser(tokens.filter((t) => t.t !== "indent" && t.t !== "dedent"));
  const e2 = p.expression(FREE);
  if (p.peek().t !== "newline" && p.peek().t !== "eof") {
    throw p.error(
      p.peek(),
      msg(`I don't understand ${q(p.peek().v)} in this interpolation.`, `je ne comprends pas ${q(p.peek().v)} dans cette insertion.`),
      msg("an interpolation holds a single expression: {price * 2}.", "une insertion contient une seule expression : {prix * 2}.")
    );
  }
  return e2;
}
var Parser = class {
  // first word of the line being read: a habit of another language is answered by name
  constructor(tokens, errors) {
    this.tokens = tokens;
    this.errors = errors;
  }
  tokens;
  errors;
  i = 0;
  head;
  /** One line of a block. With `errors`, a mistake is kept and the reading goes on after its line and its block. */
  line(body) {
    if (!this.errors) {
      body.push(this.statement());
      return;
    }
    const start = this.i;
    const first = this.peek();
    try {
      body.push(this.statement());
    } catch (e2) {
      if (!(e2 instanceof KauryError)) throw e2;
      this.errors.push(e2);
      this.leave(start, first.t === "word" ? first.v : void 0);
    }
  }
  /** After a mistake: goes past the end of its line, the block indented below, and the “else” that belonged to it. */
  leave(start, head) {
    while (!["newline", "indent", "dedent", "eof"].includes(this.peek().t)) this.next();
    if (this.peek().t === "newline") this.next();
    this.dropBlock(head);
    while (this.isWord("else")) {
      while (!["newline", "indent", "dedent", "eof"].includes(this.peek().t)) this.next();
      if (this.peek().t === "newline") this.next();
      this.dropBlock();
    }
    if (this.i === start && this.peek().t !== "eof") this.next();
  }
  /**
   * The block of a refused line is left out, but still read for the mistakes it holds — except under “style” and
   * “animation”, whose lines are rules and not lines of a page.
   */
  dropBlock(head) {
    if (this.peek().t !== "indent") return;
    if (!this.errors || ["style", "animation"].includes(canon(head ?? "") ?? "")) return this.skipBlock();
    this.block("");
  }
  skipBlock() {
    if (this.peek().t !== "indent") return;
    let depth = 0;
    do {
      const t = this.next();
      if (t.t === "indent") depth++;
      else if (t.t === "dedent") depth--;
    } while (depth > 0 && this.peek().t !== "eof");
  }
  // ---------- helpers ----------
  peek(d = 0) {
    return this.tokens[Math.min(this.i + d, this.tokens.length - 1)];
  }
  next() {
    const t = this.tokens[this.i];
    if (this.i < this.tokens.length - 1) this.i++;
    return t;
  }
  isOp(v, d = 0) {
    const t = this.peek(d);
    return t.t === "op" && t.v === v;
  }
  isWord(c, d = 0) {
    const t = this.peek(d);
    return t.t === "word" && canon(t.v) === c;
  }
  pos(t) {
    return { line: t.line, column: t.column, length: Math.max(1, t.end - t.column) };
  }
  error(t, what, fix) {
    return new KauryError(this.pos(t), what, fix);
  }
  describe(t) {
    if (t.t === "newline") return msg("the end of the line", "la fin de la ligne");
    if (t.t === "eof") return msg("the end of the file", "la fin du fichier");
    if (t.t === "indent") return msg("an indented block", "un bloc indent\xE9");
    if (t.t === "dedent") return msg("the end of the block", "la fin du bloc");
    if (t.t === "text") return msg(`the text "${t.v}"`, `le texte "${t.v}"`);
    return q(t.v);
  }
  expectOp(v, fix) {
    if (!this.isOp(v)) throw this.error(this.peek(), msg(`${q(v)} is missing here (I see ${this.describe(this.peek())}).`, `il manque ${q(v)} ici (je vois ${this.describe(this.peek())}).`), fix);
    return this.next();
  }
  expectWord(c, fix) {
    if (!this.isWord(c)) throw this.error(this.peek(), msg(`the word ${q(c)} is missing here (I see ${this.describe(this.peek())}).`, `il manque le mot ${q(c)} ici (je vois ${this.describe(this.peek())}).`), fix);
    return this.next();
  }
  expectName(role, fix) {
    const t = this.peek();
    if (t.t !== "word") throw this.error(t, msg(`a name is needed for ${role} (I see ${this.describe(t)}).`, `il faut un nom pour ${role} (je vois ${this.describe(t)}).`), fix);
    return this.next();
  }
  /** “?”, “{” and “:” where JavaScript, CSS or Python would put them: the Kaury form is given. */
  foreignSign(t) {
    if (t.t !== "op") return void 0;
    const inColors = !!this.head && this.head.t === "word" && canon(this.head.v) === "colors";
    if (t.v === "?") {
      return this.error(
        t,
        msg("a choice inside a value is written with \u201Cif \u2026 then \u2026 else \u2026\u201D.", "un choix dans une valeur s'\xE9crit avec \xAB si \u2026 alors \u2026 sinon \u2026 \xBB."),
        msg('if x > 2 then "big" else "small"', 'si x > 2 alors "grand" sinon "petit"')
      );
    }
    if (t.v === "{") {
      return this.error(
        t,
        msg("blocks are made by indentation, without { }.", "les blocs se font par l'indentation, sans { }."),
        msg("remove \u201C{\u201D and \u201C}\u201D, and indent the lines of the block by 2 spaces.", "retire \xAB { \xBB et \xAB } \xBB, et indente de 2 espaces les lignes du bloc.")
      );
    }
    if (inColors && (t.v === ":" || t.v === "=")) {
      return this.error(t, msg(`each color is written \u201Cname #code\u201D, without ${q(t.v)}.`, `chaque couleur s'\xE9crit \xAB nom #code \xBB, sans ${q(t.v)}.`), "colors pink #FF4F8B, cream #FFF4E8");
    }
    if (t.v === ":") {
      return this.error(
        t,
        msg(`Kaury writes no ${q(":")} here.`, `Kaury n'\xE9crit pas de ${q(":")} ici.`),
        msg('a name, a space, its value: color red   \xB7   style card   \xB7   Card "Strawberry"', 'un nom, un espace, sa valeur : color red   \xB7   style carte   \xB7   Carte "Fraise"')
      );
    }
    return void 0;
  }
  endOfLine(fix) {
    const t = this.peek();
    if (t.t === "newline") {
      this.next();
      return;
    }
    if (t.t === "eof" || t.t === "dedent") return;
    const foreign = this.foreignSign(t);
    if (foreign) throw foreign;
    if (t.t === "op" && t.v === "=") {
      throw this.error(t, msg("\u201C=\u201D cannot be here.", "\xAB = \xBB ne peut pas \xEAtre ici."), msg("to compare two values, write \u201C==\u201D.", "pour comparer deux valeurs, \xE9cris \xAB == \xBB."));
    }
    const habit = this.head?.t === "word" ? lineHabit(this.head.v) : void 0;
    if (habit) throw this.error(this.head, msg(`${q(this.head.v)} is not a Kaury word.`, `${q(this.head.v)} n'est pas un mot de Kaury.`), habit);
    throw this.error(
      t,
      msg(`I did not expect ${this.describe(t)} here.`, `je ne m'attendais pas \xE0 ${this.describe(t)} ici.`),
      fix ?? msg("start a new line, or separate the options with commas.", "passe \xE0 la ligne, ou s\xE9pare les options par des virgules.")
    );
  }
  // ---------- program & blocks ----------
  program() {
    const body = [];
    while (this.peek().t !== "eof") {
      const t = this.peek();
      if (t.t === "newline" || t.t === "dedent") {
        this.next();
        continue;
      }
      if (t.t === "indent") {
        const e2 = this.error(
          t,
          msg("this line is indented but belongs to no block.", "cette ligne est indent\xE9e alors qu'elle n'appartient \xE0 aucun bloc."),
          msg("remove the spaces at the start of the line, or put it under a line that opens a block (page, if, for\u2026).", "retire les espaces au d\xE9but de la ligne, ou place-la sous une ligne qui ouvre un bloc (page, si, pour\u2026).")
        );
        if (!this.errors) throw e2;
        this.errors.push(e2);
        this.skipBlock();
        continue;
      }
      this.line(body);
    }
    return body;
  }
  /** “direct”: the lines of this block sit right under an element (or in “site”): an option alone on a line is its style. */
  block(what, direct = false) {
    if (this.peek().t !== "indent") {
      throw this.error(
        this.peek(),
        msg(`${what} expects an indented block below.`, `${what} attend un bloc indent\xE9 en dessous.`),
        msg("start a new line and indent the block content by 2 spaces.", "passe \xE0 la ligne et indente de 2 espaces le contenu du bloc.")
      );
    }
    this.next();
    const body = [];
    while (this.peek().t !== "dedent" && this.peek().t !== "eof") {
      if (this.peek().t === "newline") {
        this.next();
        continue;
      }
      if (this.peek().t === "indent") {
        const e2 = this.error(this.peek(), msg("this line is indented too much.", "cette ligne est trop indent\xE9e."), msg("align it with the line above.", "aligne-la avec la ligne au-dessus."));
        if (!this.errors) throw e2;
        this.errors.push(e2);
        this.skipBlock();
        continue;
      }
      this.direct = direct;
      this.line(body);
    }
    this.direct = false;
    if (this.peek().t === "dedent") this.next();
    return body;
  }
  optionalBlock(direct = false) {
    return this.peek().t === "indent" ? this.block(msg("this line", "cette ligne"), direct) : [];
  }
  /** Set by “block” for the line it is about to read, and read once by “statement”. */
  direct = false;
  // ---------- statements ----------
  statement(inlineAction = false) {
    const t = this.peek();
    this.head = t;
    const direct = this.direct;
    this.direct = false;
    if (t.t === "error") {
      this.next();
      if (this.peek().t === "newline") this.next();
      this.dropBlock(t.v);
      while (this.isWord("else")) {
        while (!["newline", "indent", "dedent", "eof"].includes(this.peek().t)) this.next();
        if (this.peek().t === "newline") this.next();
        this.dropBlock();
      }
      return { k: "js", code: "", pos: this.pos(t) };
    }
    if (t.t === "op" && t.v === "<" && this.peek(1).t === "word") {
      throw this.error(
        t,
        msg("Kaury has no tags.", "Kaury n'a pas de balises."),
        elementHabit(this.peek(1).v) ?? msg('an element is a word at the start of a line, then its content: title "\u2026", text "\u2026", box', 'un \xE9l\xE9ment est un mot en d\xE9but de ligne, puis son contenu : title "\u2026", text "\u2026", box')
      );
    }
    if (t.t === "word") {
      const c = canon(t.v);
      switch (c) {
        case "let":
        case "state":
          if (this.peek(1).t === "word") return this.declaration(c === "state");
          break;
        case "function":
          return this.functionDecl();
        case "if": {
          let k = 1;
          let then = false;
          let both = false;
          for (; !["newline", "eof", "indent", "dedent"].includes(this.peek(k).t); k++) {
            const w = this.peek(k);
            if (w.t !== "word") continue;
            if (canon(w.v) === "then") then = true;
            else if (then && canon(w.v) === "else") both = true;
          }
          if (both && this.peek(k).t !== "indent") break;
          return this.ifStmt();
        }
        case "else":
          throw this.error(
            t,
            msg("\u201Celse\u201D without an \u201Cif\u201D right above.", "\xAB sinon \xBB sans \xAB si \xBB juste au-dessus."),
            msg("put \u201Celse\u201D at the same level as its \u201Cif\u201D, right after the \u201Cif\u201D block.", "place \xAB sinon \xBB au m\xEAme niveau que son \xAB si \xBB, juste apr\xE8s le bloc du \xAB si \xBB.")
          );
        case "for":
          return this.forStmt();
        case "while":
          return this.whileStmt();
        case "try":
          return this.tryStmt();
        case "import":
          return this.importStmt();
        case "export":
          return this.exportStmt();
        case "return": {
          this.next();
          const value = this.peek().t === "newline" || this.peek().t === "eof" ? void 0 : this.expression(FREE);
          this.endOfLine();
          return { k: "return", value, pos: this.pos(t) };
        }
        case "break":
          this.next();
          this.endOfLine();
          return { k: "break", pos: this.pos(t) };
        case "continue":
          if (this.peek(1).t === "newline" || this.peek(1).t === "eof") {
            this.next();
            this.endOfLine();
            return { k: "continue", pos: this.pos(t) };
          }
          break;
        case "open":
        case "close":
        case "toggle":
          if (this.peek(1).t === "word" && this.peek(1).spaceBefore && !this.assignmentFollows()) {
            this.next();
            const target = this.expression(SIMPLE);
            this.endOfLine();
            return { k: "toggle", mode: c, target, pos: this.pos(t) };
          }
          break;
        case "go":
          if (!this.assignmentFollows()) {
            this.next();
            const path = this.expression(FREE);
            this.endOfLine();
            return { k: "go", path, pos: this.pos(t) };
          }
          break;
        case "js": {
          this.next();
          const raw = this.peek();
          if (raw.t !== "raw") throw this.error(t, msg("\u201Cjs\u201D must be alone on its line, with the JavaScript code indented below.", "\xAB js \xBB doit \xEAtre seul sur sa ligne, avec le code JavaScript indent\xE9 dessous."));
          this.next();
          this.endOfLine();
          return { k: "js", code: raw.v, pos: this.pos(t) };
        }
        case "css": {
          this.next();
          const raw = this.peek();
          if (raw.t !== "raw") throw this.error(t, msg("\u201Ccss\u201D must be alone on its line, with the CSS indented below.", "\xAB css \xBB doit \xEAtre seul sur sa ligne, avec le CSS indent\xE9 dessous."));
          this.next();
          this.endOfLine();
          return { k: "css", code: raw.v, pos: this.pos(t) };
        }
        case "component":
          return this.component();
        case "animation":
          if (this.peek(1).t === "word") return this.animationDef();
          break;
        case "style":
          if (this.peek(1).t === "word" && this.peek(2).t === "newline" && this.peek(3).t === "indent") return this.styleDef();
          break;
        case "page":
          if (this.peek(1).t === "text") return this.page();
          if (!this.assignmentFollows() && (this.peek(1).t === "word" || this.isOp("/", 1))) {
            const w = this.peek(1).t === "word" ? this.peek(1) : this.peek(2);
            throw this.error(
              this.peek(1),
              msg("the address of a page is a text that starts with \u201C/\u201D.", "l'adresse d'une page est un texte qui commence par \xAB / \xBB."),
              `${t.v} "/${w.t === "word" ? w.v : ""}"`
            );
          }
          break;
        case "site":
          if (!this.assignmentFollows()) return this.site();
          break;
        case "translate":
          if (this.peek(1).t === "text" && !this.assignmentFollows()) return this.translateBlock();
          break;
      }
      if (this.isUiHead()) return this.command();
      if (direct && this.isStyleLine(direct)) {
        const line = this.commandRest(t, "style");
        line.inline = direct !== "site" && (!!styleOption(t.v) || !!elementOption(direct, t.v)) && styleOption(t.v) !== "hover";
        return line;
      }
      if (canon(t.v) === "hover" && this.peek(1).t === "word") {
        throw this.error(
          t,
          msg("\u201Chover\u201D is an option of the element, not a line of its own.", "\xAB survol \xBB est une option de l'\xE9l\xE9ment, pas une ligne \xE0 part."),
          msg("put it on the element line (box padding 24, hover lift 4) or under it in a style line (style hover lift 4).", "mets-la sur la ligne de l'\xE9l\xE9ment (box padding 24, hover lift 4) ou dessous dans une ligne style (style hover lift 4).")
        );
      }
    }
    const e2 = this.expression(FREE);
    const op = this.peek();
    if (op.t === "op" && ASSIGN_OPS.has(op.v)) {
      if (e2.k !== "name" && e2.k !== "member" && e2.k !== "index") {
        if (e2.k === "call" && e2.fn.k === "name" && wordHabit(e2.fn.name)) {
          throw new KauryError({ ...e2.pos, length: e2.fn.name.length }, msg(`${q(e2.fn.name)} is not a Kaury word.`, `${q(e2.fn.name)} n'est pas un mot de Kaury.`), wordHabit(e2.fn.name));
        }
        throw this.error(
          op,
          msg("nothing can be stored on the left of this \u201C=\u201D.", "on ne peut rien ranger \xE0 gauche de ce \xAB = \xBB."),
          msg("the left of \u201C=\u201D must be a name: total = 3.", "\xE0 gauche d'un \xAB = \xBB, il faut un nom : total = 3.")
        );
      }
      this.next();
      const value = this.expression(FREE);
      this.endOfLine();
      return { k: "assign", target: e2, op: op.v, value, pos: this.pos(t) };
    }
    const word = e2.k === "name" ? e2.name : e2.k === "call" && e2.fn.k === "name" ? e2.fn.name : void 0;
    const sug = word ? closest(word, [...UI_HEADS, "component", "function", "page", "site", "for", "if"]) : void 0;
    const habit = word ? lineHabit(word) : void 0;
    const known = !!habit || !!sug;
    const misspelled = () => new KauryError(
      { ...e2.pos, length: word.length },
      msg(`${q(word)} is not a Kaury word.`, `${q(word)} n'est pas un mot de Kaury.`),
      habit ?? msg(`did you mean ${q(sug)}?`, `tu voulais dire ${q(sug)} ?`)
    );
    if (op.t === "op" && op.v === "->") {
      if (word && known) throw misspelled();
      throw this.error(
        op,
        msg("\u201C->\u201D must follow a UI element or a parameter.", "\xAB -> \xBB doit suivre un \xE9l\xE9ment d'interface ou un param\xE8tre."),
        msg('examples: button "Ok" -> count += 1   or   sum list, a -> a.price', 'exemples : bouton "Ok" -> compteur += 1   ou   somme liste, a -> a.prix')
      );
    }
    if (!inlineAction && (this.peek().t === "indent" || this.peek().t === "newline" && this.peek(1).t === "indent")) {
      if (word && known) throw misspelled();
      if (word && e2.k !== "name" && !kauryGlobal(word) && !JS_GLOBALS.has(word)) {
        throw new KauryError(
          { ...e2.pos, length: word.length },
          msg(`${q(word)} is not a Kaury word.`, `${q(word)} n'est pas un mot de Kaury.`),
          msg("the elements that hold others: section, row, column, grid, box (and your own components, written with a capital: Card).", "les \xE9l\xE9ments qui en contiennent d'autres : section, ligne, colonne, grille, boite (et tes composants, \xE9crits avec une majuscule : Carte).")
        );
      }
      throw this.error(
        this.peek(),
        msg("this indented block belongs to nothing.", "ce bloc indent\xE9 n'appartient \xE0 rien."),
        msg("only page, section, if, for, function\u2026 open a block. Remove the indentation.", "seuls page, section, si, pour, fonction\u2026 ouvrent un bloc. Retire l'indentation.")
      );
    }
    this.endOfLine();
    return { k: "expr", e: e2, pos: this.pos(t) };
  }
  /** Is the next token an assignment (“site = 3”)? */
  assignmentFollows() {
    const s = this.peek(1);
    return s.t === "op" && (ASSIGN_OPS.has(s.v) || (s.v === "." || s.v === "(" || s.v === "[") && !s.spaceBefore);
  }
  /** A line that starts with an option (padding, gap, radius, hover…) and is not a value being stored or read. */
  isStyleLine(head) {
    const t = this.peek();
    if (t.t !== "word") return false;
    const s = this.peek(1);
    if (!styleOption(t.v) && head !== "site" && elementOption(head, t.v)) return !(s.t === "op" && !["-", "("].includes(s.v));
    if (!styleOption(t.v)) return s.t === "newline" && this.peek(2).t !== "indent" && !canon(t.v) && new RegExp("^\\p{Ll}", "u").test(t.v);
    if (s.t === "op" && !["-", "("].includes(s.v)) return false;
    if (s.t === "op" && s.v === "(" && !s.spaceBefore) return false;
    return true;
  }
  isUiHead() {
    const t = this.peek();
    if (t.t !== "word") return false;
    const s = this.peek(1);
    if (s.t === "op" && !["->", ",", "-", "[", "{", "("].includes(s.v)) return false;
    if (s.t === "op" && (s.v === "(" || s.v === "[") && !s.spaceBefore) return false;
    if (s.t === "op" && s.v === "-" && s.spaceBefore) return false;
    const c = canon(t.v);
    if (c && UI_HEADS.has(c)) return true;
    if (new RegExp("^\\p{Lu}", "u").test(t.v)) {
      if (s.t === "op" && (s.v === "." || s.v === "(")) return false;
      return true;
    }
    return false;
  }
  declaration(reactive) {
    const t = this.next();
    const kw = t.v;
    const name = this.expectName(reactive ? msg("this state", "cet \xE9tat") : msg("this variable", "cette variable"), reactive ? "state count = 0" : "let tax = 8.1");
    if (!this.isOp("=")) {
      throw this.error(this.peek(), msg(`\u201C=\u201D is missing after ${q(name.v)}.`, `il manque \xAB = \xBB apr\xE8s ${q(name.v)}.`), `${kw} ${name.v} = 0`);
    }
    this.next();
    const value = this.expression(FREE);
    this.endOfLine();
    return { k: "let", name: name.v, value, reactive, pos: this.pos(t) };
  }
  params(end, form = "function double x then x * 2") {
    const params = [];
    while (!end(this.peek())) {
      const p = this.peek();
      if (p.t === "op" && p.v === "(") {
        throw this.error(p, msg("parameters are written without parentheses.", "les param\xE8tres s'\xE9crivent sans parenth\xE8ses."), form);
      }
      if (p.t === "op" && p.v === ":") {
        throw this.error(p, msg("Kaury has no types to write: a parameter is only a name.", "Kaury n'a pas de types \xE0 \xE9crire : un param\xE8tre n'est qu'un nom."), form);
      }
      if (p.t !== "word") throw this.error(p, msg(`a parameter must be a name (I see ${this.describe(p)}).`, `un param\xE8tre doit \xEAtre un nom (je vois ${this.describe(p)}).`), "function double x then x * 2");
      this.next();
      let def;
      if (this.isOp("=")) {
        this.next();
        def = this.expression(SIMPLE);
      }
      params.push({ name: p.v, default: def, pos: this.pos(p) });
      if (this.isOp(",")) this.next();
    }
    return params;
  }
  functionDecl() {
    const t = this.next();
    const name = this.expectName(msg("the function", "la fonction"), "function double x then x * 2");
    const params = this.params((j) => j.t === "newline" || j.t === "eof" || j.t === "word" && canon(j.v) === "then", `${t.v} ${name.v} a, b`);
    let body;
    if (this.isWord("then")) {
      const p = this.next();
      const e2 = this.expression(FREE);
      body = [{ k: "return", value: e2, pos: this.pos(p) }];
      this.endOfLine();
    } else {
      this.endOfLine();
      body = this.block(msg(`the function ${q(name.v)}`, `la fonction ${q(name.v)}`));
    }
    return { k: "function", name: name.v, params, body, pos: this.pos(t) };
  }
  ifBody(what) {
    if (this.isWord("then")) {
      this.next();
      return [this.statement()];
    }
    this.endOfLine(msg("after the condition, start a new line (or write \u201Cthen\u201D for an action on the same line).", "apr\xE8s la condition, passe \xE0 la ligne (ou \xE9cris \xAB puis \xBB pour une action sur la m\xEAme ligne)."));
    return this.block(what);
  }
  ifStmt() {
    const t = this.next();
    const cond = this.condition();
    const then = this.ifBody("\u201Cif\u201D");
    const elifs = [];
    let otherwise;
    while (this.isWord("else")) {
      const s = this.next();
      if (this.isWord("if")) {
        this.next();
        const c = this.condition();
        elifs.push({ cond: c, body: this.ifBody("\u201Celse if\u201D"), pos: this.pos(s) });
      } else {
        otherwise = this.ifBody("\u201Celse\u201D");
        break;
      }
    }
    return { k: "if", cond, then, elifs, else: otherwise, pos: this.pos(t) };
  }
  condition() {
    const e2 = this.expression(FREE);
    if (this.isOp("=")) {
      throw this.error(this.peek(), msg("\u201C=\u201D stores a value; it does not compare.", "\xAB = \xBB range une valeur ; il ne compare pas."), msg("to compare, write \u201C==\u201D.", "pour comparer, \xE9cris \xAB == \xBB."));
    }
    return e2;
  }
  forStmt() {
    const t = this.next();
    const v = this.expectName(msg("the loop variable", "la variable de la boucle"), "for p in products");
    let index;
    if (this.isOp(",")) {
      this.next();
      index = this.expectName(msg("the loop counter", "le num\xE9ro de tour"), "for p, i in products").v;
    }
    this.expectWord("in", `for ${v.v} in list`);
    const source = this.expression(FREE);
    this.endOfLine();
    const body = this.block("\u201Cfor\u201D");
    return { k: "for", variable: v.v, index, source, body, pos: this.pos(t) };
  }
  whileStmt() {
    const t = this.next();
    if (t.v === "tant") this.expectWord("que", "tant que vies > 0");
    const cond = this.condition();
    this.endOfLine();
    const body = this.block("\u201Cwhile\u201D");
    return { k: "while", cond, body, pos: this.pos(t) };
  }
  tryStmt() {
    const t = this.next();
    this.endOfLine();
    const body = this.block("\u201Ctry\u201D");
    let variable;
    let handler;
    if (this.isWord("catch")) {
      this.next();
      if (this.peek().t === "word") variable = this.next().v;
      this.endOfLine();
      handler = this.block("\u201Ccatch\u201D");
    }
    return { k: "try", body, variable, handler, pos: this.pos(t) };
  }
  importStmt() {
    const t = this.next();
    const pos = this.pos(t);
    if (this.peek().t === "text") {
      const source = this.next().v;
      this.endOfLine();
      return { k: "import", source, pos };
    }
    let def;
    let names;
    let all;
    if (this.isOp("{")) {
      this.next();
      names = [];
      while (!this.isOp("}")) {
        const n = this.expectName(msg("what to import", "l'\xE9l\xE9ment \xE0 importer"), 'import { a, b } from "package"');
        let alias;
        if (this.isWord("as")) {
          this.next();
          alias = this.expectName(msg("the new name", "le nouveau nom")).v;
        }
        names.push({ name: n.v, alias });
        if (this.isOp(",")) this.next();
      }
      this.next();
    } else if (this.isOp("*")) {
      this.next();
      this.expectWord("as", 'import * as THREE from "three"');
      all = this.expectName(msg("the module", "le module")).v;
    } else {
      def = this.expectName(msg("what to import", "ce qu'on importe"), 'import confetti from "canvas-confetti"').v;
    }
    this.expectWord("from", 'import confetti from "canvas-confetti"');
    const s = this.peek();
    if (s.t !== "text") throw this.error(s, msg("the package or file name must be a text.", "le nom du paquet ou du fichier doit \xEAtre un texte."), 'import confetti from "canvas-confetti"');
    this.next();
    this.endOfLine();
    return { k: "import", default: def, names, all, source: s.v, pos };
  }
  exportStmt() {
    const t = this.next();
    const d = this.statement();
    if (d.k === "let" || d.k === "function" || d.k === "component") {
      d.exported = true;
      return d;
    }
    throw this.error(t, msg("only a variable, a function or a component can be exported.", "on ne peut exporter qu'une variable, une fonction ou un composant."), "export component Card name");
  }
  component() {
    const t = this.next();
    const name = this.expectName(msg("the component", "le composant"), "component Card name image");
    if (!new RegExp("^\\p{Lu}", "u").test(name.v)) {
      throw this.error(
        name,
        msg(`a component starts with a capital letter: ${q(name.v)}.`, `un composant commence par une majuscule : ${q(name.v)}.`),
        `${t.v} ${name.v[0].toUpperCase() + name.v.slice(1)}`
      );
    }
    const params = this.params((j) => j.t === "newline" || j.t === "eof", `${t.v} ${name.v} name`);
    this.endOfLine();
    const body = this.block(msg(`the component ${q(name.v)}`, `le composant ${q(name.v)}`));
    return { k: "component", name: name.v, params, body, pos: this.pos(t) };
  }
  page() {
    const t = this.next();
    const c = this.peek();
    if (!c.v.startsWith("/")) throw this.error(c, msg(`a page address starts with \u201C/\u201D: ${q(c.v)}.`, `l'adresse d'une page commence par \xAB / \xBB : ${q(c.v)}.`), `page "/${c.v}"`);
    const address = this.primary(FREE);
    let each;
    if (this.isWord("for")) {
      this.next();
      const v = this.expectName(msg("the page variable", "la variable de la page"), 'page "/blog/{post.slug}" for post in posts');
      this.expectWord("in", 'page "/blog/{post.slug}" for post in posts');
      each = { variable: v.v, source: this.expression(FREE) };
    } else if (address.parts.some((p) => typeof p !== "string")) {
      throw this.error(c, msg("an address with {\u2026} needs \u201Cfor \u2026 in \u2026\u201D to know which pages to build.", "une adresse avec {\u2026} a besoin de \xAB for \u2026 in \u2026 \xBB pour savoir quelles pages construire."), 'page "/blog/{post.slug}" for post in posts');
    }
    this.endOfLine();
    const body = this.block(msg(`the page ${q(c.v)}`, `la page ${q(c.v)}`));
    return { k: "page", path: c.v, address, each, body, pos: this.pos(t) };
  }
  site() {
    const t = this.next();
    let name;
    if (this.peek().t !== "newline") name = this.expression(SIMPLE);
    this.endOfLine();
    const body = this.optionalBlock("site");
    return { k: "site", name, body, pos: this.pos(t) };
  }
  /** translate "en", then one line per text: the text written in the file, its translation. */
  translateBlock() {
    const t = this.next();
    const l = this.peek();
    const lang = this.primary(SIMPLE);
    const example = 'translate "en"\n  "R\xE9server une table" "Book a table"';
    if (lang.k !== "text" || !lang.parts.every((p) => typeof p === "string") || !/^[a-z]{2,3}(-[A-Za-z]{2,4})?$/.test(lang.parts.join(""))) {
      throw this.error(l, msg('\u201Ctranslate\u201D is followed by the code of a language: "en", "de", "fr-CH".', `\xAB translate \xBB est suivi du code d'une langue : "en", "de", "fr-CH".`), example);
    }
    this.endOfLine();
    const pairs = [];
    if (this.peek().t !== "indent") {
      throw this.error(this.peek(), msg("\u201Ctranslate\u201D expects its texts below, one per line: the text of the file, then its translation.", "\xAB translate \xBB attend ses textes dessous, un par ligne : le texte du fichier, puis sa traduction."), example);
    }
    this.next();
    while (this.peek().t !== "dedent" && this.peek().t !== "eof") {
      if (this.peek().t === "newline") {
        this.next();
        continue;
      }
      const at = this.peek();
      try {
        const from = this.primary(SIMPLE);
        if (this.isOp(",") || this.isOp("->") || this.isOp("=")) this.next();
        const to = this.peek().t === "newline" || this.peek().t === "eof" || this.peek().t === "dedent" ? void 0 : this.primary(SIMPLE);
        if (from.k !== "text" || to?.k !== "text") {
          throw this.error(at, msg("a line of \u201Ctranslate\u201D holds two texts: the one written in the file, then its translation.", "une ligne de \xAB translate \xBB tient deux textes : celui \xE9crit dans le fichier, puis sa traduction."), '"R\xE9server une table" "Book a table"');
        }
        this.endOfLine();
        pairs.push({ from, to, pos: this.pos(at) });
      } catch (e2) {
        if (!this.errors) throw e2;
        this.errors.push(e2);
        while (!["newline", "eof", "dedent"].includes(this.peek().t)) this.next();
        if (this.peek().t === "newline") this.next();
      }
    }
    if (this.peek().t === "dedent") this.next();
    return { k: "translate", lang: lang.parts.join(""), pairs, pos: this.pos(t) };
  }
  // ---------- UI lines ----------
  command() {
    const t = this.next();
    let head = new RegExp("^\\p{Lu}", "u").test(t.v) ? t.v : canon(t.v) ?? t.v;
    if (COMPOUND[head]) {
      const s = this.peek();
      const cs = s.t === "word" ? canon(s.v) : void 0;
      if (cs && COMPOUND[head].includes(cs)) {
        this.next();
        head = `${head}-${cs}`;
      } else if (head === "on") {
        throw this.error(s, msg("\u201Con\u201D must be followed by click, hover, scroll or load.", "\xAB au \xBB doit \xEAtre suivi de clic, survol, defilement ou chargement."), "on click -> jump");
      }
    }
    return this.commandRest(t, head);
  }
  /**
   * style promise                     ← a named style, used like an option: column promise
   *   background paper, radius 24
   *   hover lift 4
   *   mobile padding 20
   */
  styleDef() {
    const t = this.next();
    const name = this.next();
    this.endOfLine();
    if (this.peek().t !== "indent") throw this.error(this.peek(), msg(`the style ${q(name.v)} expects its options indented below.`, `le style ${q(name.v)} attend ses options indent\xE9es dessous.`), `style ${name.v}
  background cream, radius 24`);
    this.next();
    const rules = [];
    while (this.peek().t !== "dedent" && this.peek().t !== "eof") {
      const lt = this.peek();
      if (lt.t === "newline") {
        this.next();
        continue;
      }
      const word = lt.t === "word" ? stripAccents(lt.v).toLowerCase() : "";
      const screen = ["mobile", "tablet", "desktop"].includes(canon(lt.v) ?? lt.v);
      const state = STYLE_STATES[word];
      if (state) this.next();
      const pw = this.peek();
      const pword = pw.t === "word" ? canon(pw.v) ?? stripAccents(pw.v) : "";
      const ownWord = !!pword && !styleOption(pword) && !STYLE_STATES[pword] && !["mobile", "tablet", "desktop", "hover"].includes(pword) && /^[a-z][\w-]*$/.test(pword);
      const part = (STYLE_PARTS.includes(pword) || ownWord) && this.peek(1).t === "word" ? pword : void 0;
      if (part) this.next();
      if (state || part) {
        const r = this.commandRest(this.peek(), "style");
        r.state = state;
        r.part = part;
        rules.push(r);
      } else rules.push(screen ? this.command() : this.commandRest(lt, "style"));
    }
    if (this.peek().t === "dedent") this.next();
    return { k: "style-def", name: name.v, rules, pos: this.pos(t) };
  }
  /**
   * animation marquee, 30s, loop, linear      ← a named animation, used like an option: row marquee
   *   from move 0 0
   *   to move -50% 0
   */
  animationDef() {
    const t = this.next();
    const name = this.next();
    const options = [];
    while (this.isOp(",")) {
      this.next();
      options.push(this.item());
    }
    this.endOfLine();
    if (this.peek().t !== "indent") throw this.error(this.peek(), msg(`the animation ${q(name.v)} expects its steps indented below (from \u2026, to \u2026).`, `l'animation ${q(name.v)} attend ses \xE9tapes indent\xE9es dessous (from \u2026, to \u2026).`), `animation ${name.v}, 2s, loop
  from opacity 0
  to opacity 1`);
    this.next();
    const frames = [];
    while (this.peek().t !== "dedent" && this.peek().t !== "eof") {
      const lt = this.next();
      if (lt.t === "newline") continue;
      const w = lt.t === "word" ? canon(lt.v) ?? stripAccents(lt.v) : "";
      const at = w === "from" || w === "de" ? "0%" : w === "to" || w === "vers" || w === "a" ? "100%" : lt.t === "number" ? `${lt.v}%` : void 0;
      if (!at) throw this.error(lt, msg("each step of an animation starts with from, to or a percentage (50%).", "chaque \xE9tape d'une animation commence par from, to ou un pourcentage (50%)."), "  50% move 0 -20");
      const r = this.commandRest(lt, "style");
      r.state = at;
      frames.push(r);
    }
    if (this.peek().t === "dedent") this.next();
    return { k: "animation-def", name: name.v, options, frames, pos: this.pos(t) };
  }
  /** The rest of a UI line once its head is known: items, action, children. */
  commandRest(t, head) {
    const items = [];
    let action;
    let children = [];
    const styled = head in ELEMENTS && !["style", "mobile", "tablet", "desktop"].includes(head);
    while (true) {
      const v = this.peek();
      if (v.t === "newline" || v.t === "eof" || v.t === "indent" || v.t === "dedent") break;
      if (v.t === "op" && v.v === "->") break;
      if (v.t === "op" && v.v === ",") {
        this.next();
        continue;
      }
      items.push(this.item());
      const n = this.peek();
      if (n.t === "op" && n.v === ",") {
        this.next();
        if (this.peek().t === "newline") throw this.error(n, msg("this line ends with a comma.", "cette ligne finit par une virgule."), msg("remove the comma, or add the missing option.", "retire la virgule, ou ajoute l'option qui manque."));
      }
    }
    if (this.isOp("->")) {
      const arrow = this.next();
      if (this.peek().t === "newline") {
        this.next();
        action = this.block("\u201C->\u201D");
      } else if (this.peek().t === "eof") {
        throw this.error(arrow, msg("\u201C->\u201D must be followed by an action.", "\xAB -> \xBB doit \xEAtre suivi d'une action."), `${t.v} -> count += 1`);
      } else {
        action = [this.statement(true)];
        children = this.optionalBlock(styled ? head : false);
      }
    } else {
      this.endOfLine();
      children = this.optionalBlock(styled ? head : false);
      if (head.startsWith("on-") && !items.length && children.length) {
        action = children;
        children = [];
      }
    }
    if (styled && children.some((x) => x.k === "command" && x.inline)) {
      const hover = items.findIndex((it) => it.atoms[0]?.k === "name" && styleOption(it.atoms[0].name) === "hover");
      const given = children.filter((x) => x.k === "command" && !!x.inline).flatMap((x) => x.items);
      items.splice(hover < 0 ? items.length : hover, 0, ...given);
      children = children.filter((x) => !(x.k === "command" && x.inline));
    }
    return { k: "command", head, rawHead: t.v, items, action, children, pos: this.pos(t) };
  }
  item() {
    const start = this.peek();
    const atoms = [];
    while (true) {
      const v = this.peek();
      if (v.t === "newline" || v.t === "eof" || v.t === "indent" || v.t === "dedent") break;
      if (v.t === "op" && (v.v === "," || v.v === "->")) break;
      if (v.t === "op" && v.v === ")") throw this.error(v, msg("\u201C)\u201D without \u201C(\u201D.", "\xAB ) \xBB sans \xAB ( \xBB."));
      atoms.push(this.expression(ITEM));
    }
    return { atoms, pos: this.pos(start) };
  }
  // ---------- expressions ----------
  expression(f) {
    if (!f.item) {
      const t = this.peek();
      if (t.t === "op" && t.v === "->") {
        this.next();
        return { k: "lambda", params: [], body: this.lambdaBody(), pos: this.pos(t) };
      }
      if (t.t === "word" && this.isOp("->", 1)) {
        this.next();
        this.next();
        return { k: "lambda", params: [t.v], body: this.lambdaBody(), pos: this.pos(t) };
      }
      if (t.t === "op" && t.v === "(") {
        const end = this.closingParen();
        if (end > 0 && this.tokens[end + 1]?.t === "op" && this.tokens[end + 1].v === "->") {
          this.next();
          const params = [];
          while (!this.isOp(")")) {
            params.push(this.expectName(msg("a parameter", "un param\xE8tre")).v);
            if (this.isOp(",")) this.next();
          }
          this.next();
          this.next();
          return { k: "lambda", params, body: this.lambdaBody(), pos: this.pos(t) };
        }
      }
    }
    return this.ifExpression(f);
  }
  lambdaBody() {
    if (this.peek().t === "newline" && this.peek(1).t === "indent") {
      this.next();
      return this.block(msg("this function", "cette fonction"));
    }
    if (this.peek().t === "word" && this.isActionAhead()) {
      const s = this.statement();
      if (this.tokens[this.i - 1]?.t === "newline") this.i--;
      return [s];
    }
    return this.expression(FREE);
  }
  /** In a lambda, an assignment “-> total += 1” is an action. Also UI motions (-> jump). */
  isActionAhead() {
    const t = this.peek();
    const c = canon(t.v);
    if (c && ["open", "close", "toggle", "go"].includes(c)) return true;
    let k = this.i;
    let depth = 0;
    while (k < this.tokens.length) {
      const x = this.tokens[k];
      if (x.t === "newline" || x.t === "eof") return false;
      if (x.t === "op") {
        if ("([{".includes(x.v)) depth++;
        else if (")]}".includes(x.v)) {
          if (depth === 0) return false;
          depth--;
        } else if (depth === 0 && x.v === ",") return false;
        else if (depth === 0 && ASSIGN_OPS.has(x.v)) return true;
      }
      k++;
    }
    return false;
  }
  closingParen() {
    let p = 0;
    for (let k = this.i; k < this.tokens.length; k++) {
      const t = this.tokens[k];
      if (t.t === "op" && "([{".includes(t.v)) p++;
      if (t.t === "op" && ")]}".includes(t.v)) {
        p--;
        if (p === 0) return k;
      }
      if (t.t === "newline" || t.t === "eof") return -1;
    }
    return -1;
  }
  ifExpression(f) {
    if (this.isWord("if")) {
      const t = this.next();
      const cond = this.or(f);
      if (f.item && !this.isWord("then") && (this.peek().t === "newline" || this.peek().t === "eof" || this.isOp(","))) {
        throw this.error(
          t,
          msg("a condition is not an option: it goes on its own line, above.", "une condition n'est pas une option : elle va sur sa propre ligne, au-dessus."),
          msg("if count > 0   then, on the next line and indented by 2 spaces, the element", "si compteur > 0   puis, sur la ligne suivante et indent\xE9 de 2 espaces, l'\xE9l\xE9ment")
        );
      }
      this.expectWord("then", 'if age >= 18 then "adult" else "child"');
      const then = this.or(f);
      this.expectWord("else", 'if age >= 18 then "adult" else "child"');
      const otherwise = this.ifExpression(f);
      return { k: "if", cond, then, else: otherwise, pos: this.pos(t) };
    }
    return this.or(f);
  }
  or(f) {
    let l = this.and(f);
    while (this.isWord("or") || this.isOp("??")) {
      const t = this.next();
      const op = t.v === "??" ? "??" : "||";
      l = { k: "binary", op, l, r: this.and(f), pos: this.pos(t) };
    }
    return l;
  }
  and(f) {
    let l = this.not(f);
    while (this.isWord("and")) {
      const t = this.next();
      l = { k: "binary", op: "&&", l, r: this.not(f), pos: this.pos(t) };
    }
    return l;
  }
  not(f) {
    if (this.isWord("not") || this.isOp("!")) {
      const t = this.next();
      return { k: "unary", op: "!", e: this.not(f), pos: this.pos(t) };
    }
    return this.comparison(f);
  }
  comparison(f) {
    let l = this.range(f);
    while (true) {
      const t = this.peek();
      if (t.t === "op" && ["==", "!=", "<", ">", "<=", ">="].includes(t.v)) {
        this.next();
        l = { k: "binary", op: t.v, l, r: this.range(f), pos: this.pos(t) };
      } else if (t.t === "word" && canon(t.v) === "in" && !f.item) {
        this.next();
        l = { k: "binary", op: "in", l, r: this.range(f), pos: this.pos(t) };
      } else break;
    }
    return l;
  }
  range(f) {
    const l = this.additive(f);
    if (this.isOp("..")) {
      const t = this.next();
      return { k: "range", from: l, to: this.additive(f), pos: this.pos(t) };
    }
    return l;
  }
  additive(f) {
    let l = this.multiplicative(f);
    while (this.isOp("+") || this.isOp("-")) {
      const t = this.next();
      l = { k: "binary", op: t.v, l, r: this.multiplicative(f), pos: this.pos(t) };
    }
    return l;
  }
  multiplicative(f) {
    let l = this.power(f);
    while (this.isOp("*") || this.isOp("/") || this.isOp("%")) {
      const t = this.next();
      l = { k: "binary", op: t.v, l, r: this.power(f), pos: this.pos(t) };
    }
    return l;
  }
  power(f) {
    const l = this.unary(f);
    if (this.isOp("**")) {
      const t = this.next();
      return { k: "binary", op: "**", l, r: this.power(f), pos: this.pos(t) };
    }
    return l;
  }
  unary(f) {
    const t = this.peek();
    if (t.t === "op" && t.v === "-") {
      this.next();
      return { k: "unary", op: "-", e: this.unary(f), pos: this.pos(t) };
    }
    if (t.t === "op" && t.v === "...") {
      this.next();
      return { k: "spread", e: this.unary(f), pos: this.pos(t) };
    }
    if (t.t === "word" && canon(t.v) === "await") {
      this.next();
      return { k: "await", e: this.unary({ ...f, implicit: !f.item }), pos: this.pos(t) };
    }
    return this.postfix(f);
  }
  postfix(f) {
    let e2 = this.primary(f);
    while (true) {
      const t = this.peek();
      if (t.t === "op" && (t.v === "." || t.v === "?.") && !t.spaceBefore) {
        this.next();
        const p = this.peek();
        if (p.t !== "word") throw this.error(p, msg(`after ${q(t.v)}, a property name is needed.`, `apr\xE8s ${q(t.v)}, il faut un nom de propri\xE9t\xE9.`), "product.price");
        this.next();
        e2 = { k: "member", object: e2, prop: p.v, optional: t.v === "?.", pos: this.pos(p) };
      } else if (t.t === "op" && t.v === "(" && !t.spaceBefore) {
        this.next();
        const args = [];
        while (!this.isOp(")")) {
          args.push(this.expression(FREE));
          if (this.isOp(",")) this.next();
          else if (!this.isOp(")")) throw this.error(this.peek(), msg("\u201C,\u201D or \u201C)\u201D is missing in this call.", "il manque \xAB , \xBB ou \xAB ) \xBB dans cet appel."), "f(a, b)");
        }
        this.next();
        e2 = { k: "call", fn: e2, args, pos: this.pos(t) };
      } else if (t.t === "op" && t.v === "[" && !t.spaceBefore) {
        this.next();
        const index = this.expression(FREE);
        this.expectOp("]");
        e2 = { k: "index", object: e2, index, pos: this.pos(t) };
      } else break;
    }
    if (f.implicit && (e2.k === "name" || e2.k === "member") && this.argumentStarts()) {
      const args = [];
      do {
        if (this.isOp(",")) this.next();
        args.push(this.expression(FREE));
      } while (this.isOp(","));
      e2 = { k: "call", fn: e2, args, pos: e2.pos };
    }
    return e2;
  }
  argumentStarts() {
    const t = this.peek();
    if (!t.spaceBefore) return false;
    if (t.t === "number" || t.t === "text" || t.t === "color") return true;
    if (t.t === "word") {
      const c = canon(t.v);
      return !(c && INFIX_WORDS.has(c));
    }
    if (t.t === "op" && (t.v === "[" || t.v === "{" || t.v === "(" || t.v === "..." || t.v === "->")) return true;
    return false;
  }
  primary(f) {
    const t = this.peek();
    switch (t.t) {
      case "number":
        this.next();
        return { k: "number", v: Number(t.v), unit: t.unit, pos: this.pos(t) };
      case "color":
        this.next();
        return { k: "color", v: t.v, pos: this.pos(t) };
      case "text": {
        this.next();
        const parts = [];
        for (const m of t.parts ?? []) {
          if (m.code !== void 0) parts.push(parseInterpolation(m.code, m.line, m.column));
          else parts.push(m.text ?? "");
        }
        return { k: "text", parts, pos: this.pos(t) };
      }
      case "word": {
        const c = canon(t.v);
        if (c === "true" || c === "false") {
          this.next();
          return { k: "bool", v: c === "true", pos: this.pos(t) };
        }
        if (c === "none") {
          this.next();
          return { k: "none", pos: this.pos(t) };
        }
        if (c === "if") return this.ifExpression(f);
        this.next();
        return { k: "name", name: t.v, pos: this.pos(t) };
      }
      case "op": {
        if (t.v === "(") {
          this.next();
          const e2 = this.expression(FREE);
          this.expectOp(")");
          return e2;
        }
        if (t.v === "[") {
          this.next();
          const items = [];
          while (!this.isOp("]")) {
            items.push(this.expression(FREE));
            if (this.isOp(",")) this.next();
            else if (!this.isOp("]")) throw this.error(this.peek(), msg("\u201C,\u201D is missing between two list items.", "il manque \xAB , \xBB entre deux \xE9l\xE9ments de la liste."), "[1, 2, 3]");
          }
          this.next();
          return { k: "list", items, pos: this.pos(t) };
        }
        if (t.v === "{") {
          this.next();
          const props = [];
          while (!this.isOp("}")) {
            if (this.isOp("...")) {
              this.next();
              props.push({ key: "", value: this.expression(FREE), spread: true });
            } else {
              const k = this.peek();
              if (k.t !== "word" && k.t !== "text" && k.t !== "number") throw this.error(k, msg("an object key must be a name.", "une cl\xE9 d'objet doit \xEAtre un nom."), '{ name: "Strawberry", price: 4 }');
              this.next();
              if (this.isOp(":")) {
                this.next();
                props.push({ key: k.v, value: this.expression(FREE) });
              } else if (k.t === "word") {
                props.push({ key: k.v, value: { k: "name", name: k.v, pos: this.pos(k) } });
              } else throw this.error(this.peek(), msg(`\u201C:\u201D is missing after the key ${q(k.v)}.`, `il manque \xAB : \xBB apr\xE8s la cl\xE9 ${q(k.v)}.`), '{ name: "Strawberry" }');
            }
            if (this.isOp(",")) this.next();
            else if (!this.isOp("}")) throw this.error(this.peek(), msg("\u201C,\u201D is missing between two properties.", "il manque \xAB , \xBB entre deux propri\xE9t\xE9s."), '{ name: "Strawberry", price: 4 }');
          }
          this.next();
          return { k: "object", props, pos: this.pos(t) };
        }
        if (t.v === "->") throw this.error(t, msg("\u201C->\u201D without a parameter before it.", "\xAB -> \xBB sans param\xE8tre devant."), "x -> x * 2");
        break;
      }
    }
    const foreign = this.foreignSign(t);
    if (foreign) throw foreign;
    throw this.error(
      t,
      msg(`I expected a value, but I see ${this.describe(t)}.`, `je m'attendais \xE0 une valeur, mais je vois ${this.describe(t)}.`),
      t.t === "indent" ? msg("this line may be indented too much.", "cette ligne est peut-\xEAtre trop indent\xE9e.") : msg('a number, a "text", a name, a [list] or an {object}.', 'un nombre, un "texte", un nom, une [liste] ou un {objet}.')
    );
  }
};

// src/core/css.ts
function literal(e2, siteColors) {
  if (!e2) return void 0;
  switch (e2.k) {
    case "number":
      return e2.unit && e2.unit !== "px" ? `${e2.v}${e2.unit}` : e2.v;
    case "color":
      return e2.v;
    case "text":
      if (e2.translated) return void 0;
      if (e2.parts.every((m) => typeof m === "string")) return e2.parts.join("");
      return void 0;
    case "name": {
      if (e2.binding && e2.binding.kind !== "kaury" && e2.binding.kind !== "js") return void 0;
      if (siteColors[e2.name]) return `var(--k-${e2.name})`;
      const c = knownColor(e2.name);
      if (c) return COLORS[c].startsWith("#") ? `var(--k-${c})` : COLORS[c];
      return canon(e2.name) ?? canonValue(e2.name);
    }
    case "unary":
      if (e2.op === "-" && e2.e.k === "number") return e2.e.unit && e2.e.unit !== "px" ? `-${e2.e.v}${e2.e.unit}` : -e2.e.v;
      return void 0;
    case "bool":
      return e2.v ? "true" : "false";
    case "binary":
      if (e2.op === "-" && e2.l.k === "name" && e2.r.k === "number" && siteColors[`${e2.l.name}-${e2.r.v}`]) return `var(--k-${e2.l.name}-${e2.r.v})`;
      return void 0;
  }
  return void 0;
}
var px = (v, fallback = "0") => v === void 0 ? fallback : typeof v === "number" ? `${v}px` : v;
function hexOf(v, siteColors) {
  if (v.startsWith("#")) return v;
  const m = /^var\(--k-([\w-]+)\)$/.exec(v);
  if (m) {
    const n = m[1];
    if (siteColors[n]?.startsWith("#")) return siteColors[n];
    if (COLORS[n]?.startsWith("#")) return COLORS[n];
  }
  return void 0;
}
function luminance(hex) {
  let h2 = hex.replace("#", "");
  if (h2.length === 3 || h2.length === 4) h2 = h2.split("").slice(0, 3).map((c) => c + c).join("");
  const lin = (c) => c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  const [r, g2, b] = [0, 2, 4].map((i) => lin(parseInt(h2.slice(i, i + 2), 16) / 255));
  return 0.2126 * r + 0.7152 * g2 + 0.0722 * b;
}
var isLight = (hex) => luminance(hex) > 0.45;
function contrast(a, b) {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}
var SHADOWS = {
  soft: "0 10px 30px -12px rgba(0,0,0,.18), 0 2px 6px rgba(0,0,0,.06)",
  medium: "0 18px 40px -14px rgba(0,0,0,.28), 0 4px 10px rgba(0,0,0,.08)",
  strong: "0 30px 60px -20px rgba(0,0,0,.45), 0 8px 18px rgba(0,0,0,.12)",
  hard: "6px 6px 0 var(--k-text)",
  none: "none",
  inner: "inset 0 2px 8px rgba(0,0,0,.15)"
};
var TEXT_HEADS = /* @__PURE__ */ new Set(["title", "subtitle", "text", "link", "icon", "item", "links"]);
var DYNAMIC_PROP = {
  background: "background",
  color: "color",
  size: "font-size",
  opacity: "opacity",
  width: "width",
  height: "height",
  tint: "color",
  radius: "border-radius",
  margin: "margin",
  padding: "padding",
  gap: "gap",
  "min-height": "min-height",
  "max-width": "max-width",
  "line-height": "line-height",
  weight: "font-weight",
  tracking: "letter-spacing"
};
var PX_UNIT = /* @__PURE__ */ new Set(["size", "width", "height", "radius", "margin", "padding", "gap", "min-height", "max-width", "tracking"]);
var PLACE2 = "var(--k-mx,var(--k-mi,0px))";
function declarations(head, opt, vals, siteColors, exact = false) {
  const v0 = vals[0];
  switch (opt) {
    case "tint": {
      const c = String(v0);
      if (TEXT_HEADS.has(head)) return { decl: [["color", c]] };
      return { decl: [["background", c], ...autoContrast(c, siteColors), ["--k-glow", c]] };
    }
    case "background": {
      if (typeof v0 === "string" && /\.(png|jpe?g|webp|avif|gif|svg)$/i.test(v0)) {
        const u = /^(\/|[a-z][a-z0-9+.-]*:)/i.test(v0) ? v0 : "/" + v0.replace(/^\.\//, "");
        const veil = "linear-gradient(var(--k-shade-to,0deg),rgb(0 0 0/var(--k-shade-from,var(--k-shade,0))),rgb(0 0 0/var(--k-shade,0)))";
        return { decl: [["--k-pic", `url("${u}")`], ["background", `${veil},center/cover no-repeat var(--k-pic)`]] };
      }
      const c = v0 === void 0 ? "transparent" : String(v0);
      return { decl: [["background", c], ...autoContrast(c, siteColors), ["--k-glow", c]] };
    }
    case "color":
      return { decl: [["color", v0 === void 0 ? "inherit" : String(v0)]] };
    case "font":
      return { decl: [["font-family", fontFamily(String(v0))]] };
    case "size": {
      if (typeof v0 === "number" && v0 > 36 && !exact) {
        return { decl: [["font-size", `clamp(${Math.max(30, Math.round(v0 * 0.48))}px, ${(v0 / 13).toFixed(2)}vw, ${v0}px)`]] };
      }
      return { decl: [["font-size", px(v0)]] };
    }
    case "bold":
      return { decl: [["font-weight", "700"]] };
    case "light":
      return { decl: [["font-weight", "300"]] };
    case "weight":
      return { decl: [["font-weight", String(v0)]] };
    case "italic":
      return { decl: [["font-style", "italic"]] };
    case "upright":
      return { decl: [["font-style", "normal"]] };
    case "underline":
      return { decl: [["text-decoration", "underline"]] };
    case "plain":
      return { decl: [["text-decoration", "none"]] };
    case "uppercase":
      return { decl: [["text-transform", "uppercase"], ["letter-spacing", ".06em"]] };
    case "line-height":
      return { decl: [["line-height", String(v0)]] };
    case "tracking":
      return { decl: [["letter-spacing", px(v0)]] };
    case "align":
      return { decl: [["text-align", String(v0 ?? "left")]] };
    case "center":
      return { decl: [["text-align", "center"], ["align-items", "center"], ["justify-content", "center"], ["margin-inline", "auto"], ["--k-mx", "auto"]] };
    case "middle":
      return { decl: [["align-self", "center"]] };
    case "radius":
      return { decl: [["border-radius", px(v0)], ["overflow", "hidden"]] };
    case "round":
      return { decl: [["border-radius", "999px"]] };
    case "shadow": {
      const c = vals.slice(1).find((x) => typeof x === "string");
      if (v0 === "hard" && c) return { decl: [["box-shadow", `6px 6px 0 ${c}`]] };
      return { decl: [["box-shadow", SHADOWS[v0 === "smooth" ? "soft" : String(v0 ?? "soft")] ?? (typeof v0 === "number" ? `0 ${v0}px ${v0 * 3}px -${v0}px rgba(0,0,0,.25)` : SHADOWS.soft)]] };
    }
    case "glow":
    case "text-glow": {
      const c = String(vals.find((x) => typeof x === "string") ?? "var(--k-accent)");
      const n = Number(vals.find((x) => typeof x === "number") ?? 24);
      const soft = `color-mix(in srgb, ${c} 55%, transparent)`;
      if (opt === "text-glow" || TEXT_HEADS.has(head) || head === "title" || head === "subtitle") return { decl: [["text-shadow", `0 0 ${n * 0.25}px ${c}, 0 0 ${n}px ${soft}, 0 0 ${n * 2}px ${soft}`]] };
      return { decl: [["box-shadow", `0 0 0 1px ${c}, 0 0 ${n}px ${soft}, 0 0 ${n * 2.5}px ${soft}`]] };
    }
    case "stroke": {
      const c = String(vals.find((x) => typeof x === "string") ?? "currentColor");
      const n = Number(vals.find((x) => typeof x === "number") ?? 2);
      return { decl: [["-webkit-text-stroke", `${n}px ${c}`], ["color", "transparent"]] };
    }
    case "zoom": {
      const z = Number(v0) || 1;
      return { decl: [["zoom", String(z)]] };
    }
    case "mesh": {
      const cols = vals.filter((x) => typeof x === "string");
      const at = ["18% 22%", "82% 18%", "62% 88%", "12% 90%"];
      const layers = cols.slice(0, 4).map((c, i) => `radial-gradient(at ${at[i]}, ${c} 0, transparent 55%)`);
      return { decl: [["background", `${layers.join(", ")}, var(--k-bg)`]] };
    }
    case "border-top":
    case "border-bottom": {
      const w = typeof v0 === "number" ? v0 : 1;
      const c = vals.find((x) => typeof x === "string") ?? "currentColor";
      return { decl: [[opt, `${w}px solid ${c}`]] };
    }
    case "pin": {
      const d = [["position", "absolute!important"]];
      for (let i = 0; i < vals.length; i++) {
        const side = vals[i];
        if (typeof side === "string" && ["top", "bottom", "left", "right"].includes(side)) {
          const nx = vals[i + 1];
          const off = typeof nx === "number" || typeof nx === "string" && /^-?[\d.]/.test(nx) ? (i++, nx) : 0;
          d.push([side, px(off)]);
        }
      }
      return { decl: d };
    }
    case "clip":
      return { decl: [["overflow", "hidden"]] };
    case "no-wrap":
      return { decl: [["flex-wrap", "nowrap"], ["white-space", "nowrap"], ["--k-ws", "pre"], ["width", "max-content!important"], ["max-width", "none!important"]] };
    case "grain":
      return { decl: [] };
    case "border": {
      const w = typeof v0 === "number" ? v0 : 1;
      const c = vals.find((x) => typeof x === "string") ?? "currentColor";
      return { decl: [["border", `${w}px solid ${c}`]] };
    }
    case "margin":
      return { decl: [["margin", vals.map((x) => px(x)).join(" ")]] };
    case "padding":
      return { decl: [["padding", vals.map((x) => px(x)).join(" ")]] };
    case "gap":
      return { decl: [["gap", vals.map((x) => px(x)).join(" ")]] };
    case "width":
      return { decl: [["width", px(v0)], ["max-width", "100%"], ["margin-inline", PLACE2]], strong: true };
    case "height":
      return { decl: [["height", px(v0)]] };
    // max-width only limits: it never moves the element (« center » does that)
    case "max-width":
      return { decl: [["max-width", px(v0)], ["margin-inline", PLACE2]], strong: true };
    case "min-height":
      return { decl: [["min-height", px(v0)]] };
    case "fullscreen":
      return { decl: [["min-height", "100svh"], ["display", "flex"], ["flex-direction", "column"], ["justify-content", "center"]] };
    case "full-width":
      return { decl: [["max-width", "none"], ["width", "100%"], ["padding-inline", "0"]] };
    case "opacity":
      return { decl: [["opacity", String(v0)]] };
    case "blur":
      return { decl: [["filter", `blur(${px(v0)})`]] };
    case "grayscale":
      return { decl: [["filter", `grayscale(${typeof v0 === "number" ? v0 : 1})`]] };
    case "shade": {
      const n = typeof v0 === "number" ? v0 : 0.5;
      const side = vals.find((x) => typeof x === "string");
      const decl = [["--k-shade", String(n)], ["--k-shade-from", side ? "0" : String(n)]];
      if (side) decl.push(["--k-shade-to", `to ${side}`]);
      if (n >= 0.4) decl.push(["color", "#fff"]);
      return { decl };
    }
    case "glass":
      return { decl: [["background", "color-mix(in srgb, var(--k-bg) 55%, transparent)"], ["backdrop-filter", "blur(16px) saturate(1.4)"], ["-webkit-backdrop-filter", "blur(16px) saturate(1.4)"], ["border", "1px solid color-mix(in srgb, var(--k-text) 10%, transparent)"]] };
    case "gradient": {
      const cols = vals.filter((x) => typeof x === "string");
      const angle = vals.find((x) => typeof x === "number") ?? 135;
      return { decl: [["background", `linear-gradient(${angle}deg, ${cols.join(", ")})`]] };
    }
    case "text-gradient": {
      const cols = vals.filter((x) => typeof x === "string");
      return { decl: [["background", `linear-gradient(90deg, ${cols.join(", ")})`], ["-webkit-background-clip", "text"], ["background-clip", "text"], ["color", "transparent"]] };
    }
    case "columns":
      if (vals.length > 1) return { decl: [["--k-columns", String(vals.length)], ["grid-template-columns", vals.map((v) => `minmax(0, ${v}fr)`).join(" ")]] };
      return { decl: [["--k-columns", String(v0)], ["grid-template-columns", `repeat(${v0}, minmax(0, 1fr))`]] };
    case "direction":
      return { decl: v0 === "row" ? [["display", "flex"], ["flex-direction", "row"]] : [["display", "flex"], ["flex-direction", "column"], ["align-items", "stretch"]] };
    case "hidden":
      return { decl: [["display", "none"]] };
    case "sticky":
      return { decl: [["position", "sticky!important"], ["top", px(v0 ?? 0)], ["z-index", "50"]] };
    case "front":
      return { decl: [["position", "relative"], ["z-index", "10"]] };
    case "cursor": {
      const m = { pointer: "pointer", arrow: "default", text: "text", none: "none" };
      return { decl: [["cursor", m[String(v0)] ?? "pointer"]] };
    }
    case "lift":
      return { decl: [], transform: `translateY(${-Number(v0 ?? 4)}px)` };
    case "grow":
      return { decl: [], transform: `scale(${v0 ?? 1.05})` };
    case "tilt":
      return { decl: [], transform: `rotate(${v0 ?? 2}deg)` };
    case "move":
      return { decl: [], transform: `translate(${px(v0)}, ${px(vals[1])})` };
    case "reveal": {
      const p = typeof v0 === "number" ? v0 : parseFloat(String(v0 ?? 100));
      return { decl: [["clip-path", `inset(0 0 ${100 - p}% 0)`]] };
    }
    case "animate":
      return { decl: [["animation", `k-${v0} .8s cubic-bezier(.2,.7,.2,1) both`]] };
  }
  return { decl: [] };
}
function bestText(bg) {
  const white = contrast(bg, "#ffffff");
  const dark = contrast(bg, "#16151a");
  return white >= 4.5 || white >= dark ? "#fff" : "#16151a";
}
function autoContrast(c, siteColors) {
  const hex = hexOf(c, siteColors);
  if (!hex || /^#([0-9a-f]{4}|[0-9a-f]{8})$/i.test(hex) && parseInt(hex.length === 5 ? hex[4] + hex[4] : hex.slice(7), 16) < 128) return [];
  return [["color", bestText(hex)]];
}
var FONTSHARE = /* @__PURE__ */ new Set([
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
  "Nippo",
  "Hoover"
]);
var SYSTEM_FONTS = /* @__PURE__ */ new Set(["system-ui", "serif", "sans-serif", "monospace", "mono", "sans", "system", "Arial", "Helvetica", "Georgia", "Times New Roman", "titles", "text"]);
var SYSTEM_STACKS = {
  mono: 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace',
  monospace: 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace',
  serif: 'ui-serif, Georgia, Cambria, "Times New Roman", serif',
  sans: "var(--k-font-fallback)",
  "sans-serif": "var(--k-font-fallback)",
  system: "var(--k-font-fallback)",
  "system-ui": "var(--k-font-fallback)",
  titles: "var(--k-font-titles)",
  text: "var(--k-font)"
};
function fontFamily(name) {
  return SYSTEM_STACKS[name.toLowerCase()] ?? `"${name}", "${name} fallback", var(--k-font-fallback)`;
}
function fontUrl(name) {
  if (SYSTEM_FONTS.has(name)) return void 0;
  if (FONTSHARE.has(name)) return `https://api.fontshare.com/v2/css?f[]=${name.toLowerCase().replace(/ /g, "-")}@300,400,500,600,700,800,900&display=swap`;
  return `https://fonts.googleapis.com/css2?family=${name.replace(/ /g, "+")}:wght@300;400;500;600;700;800&display=swap`;
}

// src/core/translate.ts
function exprKey(e2) {
  switch (e2.k) {
    case "name":
      return e2.name;
    case "number":
      return `${e2.v}${e2.unit ?? ""}`;
    case "bool":
      return String(e2.v);
    case "none":
      return "none";
    case "color":
      return e2.v;
    case "text":
      return JSON.stringify(textKey(e2));
    case "member":
      return `${exprKey(e2.object)}${e2.optional ? "?." : "."}${e2.prop}`;
    case "index":
      return `${exprKey(e2.object)}[${exprKey(e2.index)}]`;
    case "call":
      return `${exprKey(e2.fn)}(${e2.args.map(exprKey).join(", ")})`;
    case "binary":
      return `${exprKey(e2.l)} ${e2.op} ${exprKey(e2.r)}`;
    case "unary":
      return `${e2.op} ${exprKey(e2.e)}`;
    case "list":
      return `[${e2.items.map(exprKey).join(", ")}]`;
    case "if":
      return `if ${exprKey(e2.cond)} then ${exprKey(e2.then)} else ${exprKey(e2.else)}`;
    default:
      return e2.k;
  }
}
function textKey(t) {
  return t.parts.map((p) => typeof p === "string" ? p : `{${exprKey(p)}}`).join("");
}
function holes(t) {
  const out = /* @__PURE__ */ new Map();
  for (const p of t.parts) if (typeof p !== "string") out.set(exprKey(p), p);
  return out;
}
function translatedText(source, to) {
  const own2 = holes(source);
  return { k: "text", parts: to.parts.map((p) => typeof p === "string" ? p : own2.get(exprKey(p)) ?? p), pos: source.pos };
}
function holdsTranslation(e2) {
  if (!e2) return false;
  switch (e2.k) {
    case "text":
      return !!e2.translated || e2.parts.some((p) => typeof p !== "string" && holdsTranslation(p));
    case "list":
      return e2.items.some(holdsTranslation);
    case "object":
      return e2.props.some((p) => holdsTranslation(p.value));
    case "member":
      return holdsTranslation(e2.object);
    case "index":
      return holdsTranslation(e2.object) || holdsTranslation(e2.index);
    case "call":
      return holdsTranslation(e2.fn) || e2.args.some(holdsTranslation);
    case "binary":
      return holdsTranslation(e2.l) || holdsTranslation(e2.r);
    case "unary":
      return holdsTranslation(e2.e);
    case "if":
      return holdsTranslation(e2.cond) || holdsTranslation(e2.then) || holdsTranslation(e2.else);
    case "spread":
      return holdsTranslation(e2.e);
    default:
      return false;
  }
}
function pathIn(path, lang, first) {
  if (first) return path;
  return path === "/" ? `/${lang}` : `/${lang}${path}`;
}

// src/core/checker.ts
var Scope = class {
  constructor(kind, parent) {
    this.kind = kind;
    this.parent = parent;
  }
  kind;
  parent;
  names = /* @__PURE__ */ new Map();
  find(name) {
    return this.names.get(name) ?? this.parent?.find(name);
  }
  /** Scope that receives implicit declarations (“x = 3” without let/state). */
  host() {
    let s = this;
    while (s.kind === "block" && s.parent) s = s.parent;
    if (s.kind === "action") {
      let t = s.parent;
      while (t && t.kind !== "page" && t.kind !== "component" && t.kind !== "module") t = t.parent;
      return t ?? s;
    }
    return s;
  }
  isView() {
    return this.kind === "module" || this.kind === "page" || this.kind === "component";
  }
  all() {
    return [...this.names.keys(), ...this.parent?.all() ?? []];
  }
};
var slugOf = (s) => s.replace(/\*/g, "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
var staticText = (e2) => e2?.k === "text" && e2.parts.every((p) => typeof p === "string") ? e2.parts.join("") : void 0;
var MEDIA_FILE = /\.(png|jpe?g|webp|avif|gif|svg|ico|mp4|webm|mov|mp3|wav|ogg|m4a|glb|gltf|json|lottie|pdf)([?#].*)?$/i;
function check(program, options = {}) {
  const c = new Checker();
  c.module(program);
  for (const e2 of [...c.errors, ...c.warnings]) e2.file = options.file;
  return { errors: c.errors, warnings: c.warnings, info: c.info };
}
var NAMED_CONTAINERS = ["section", "box", "grid", "row", "column", "scene", "card", "form", "list", "header", "footer", "nav"];
var ALWAYS_NAMED = ["section", "scene", "header", "footer", "nav"];
var FIELD_HEADS = ["field", "textarea", "select", "checkbox"];
var STATE_HEADS = [...FIELD_HEADS, "dialog"];
var CONTENT_HEADS = /* @__PURE__ */ new Set(["title", "subtitle", "text", "item", "icon", "button", "link", "image", "video", "card", "logo", "markdown", "details", "embed"]);
var UNIT_WORDS = /* @__PURE__ */ new Set(["px", "rem", "em", "vh", "vw", "svh", "dvh", "ms", "s", "deg", "fr", "pt", "percent"]);
var CSS_SIZES = /* @__PURE__ */ new Set(["auto", "inherit", "fit-content", "min-content", "max-content"]);
var CSS_COLORS = new Set("inherit currentcolor transparent none aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet brown burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan darkgoldenrod darkgray darkgreen darkgrey darkkhaki darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen darkslateblue darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue dimgray dimgrey dodgerblue firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite gold goldenrod gray green greenyellow grey honeydew hotpink indianred indigo ivory khaki lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan lightgoldenrodyellow lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen lightskyblue lightslategray lightslategrey lightsteelblue lightyellow lime limegreen linen magenta maroon mediumaquamarine mediumblue mediumorchid mediumpurple mediumseagreen mediumslateblue mediumspringgreen mediumturquoise mediumvioletred midnightblue mintcream mistyrose moccasin navajowhite navy oldlace olive olivedrab orange orangered orchid palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru pink plum powderblue purple rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown seagreen seashell sienna silver skyblue slateblue slategray slategrey snow springgreen steelblue tan teal thistle tomato turquoise violet wheat white whitesmoke yellow yellowgreen".split(" "));
var READ_HEADS = /* @__PURE__ */ new Set(["title", "subtitle", "text", "link", "item"]);
var SITE_SETTINGS = ["colors", "font", "fonts", "lang", "favicon", "url", "seo", "style", "transition", "head", "base", "mobile", "tablet", "desktop", "sound"];
var Checker = class {
  errors = [];
  warnings = [];
  info = { pages: [], components: [], immersion: false, threeD: false, lottie: false, colors: {}, exports: [], files: [], reads: [], gos: [], anchors: [], languages: [], dictionary: /* @__PURE__ */ new Map() };
  /** the page being read, when its address is fixed ("/shop", not "/product/:id") */
  page;
  /** the first word of the line being read, when the line is a call or a name (tittle "Hi") */
  lineHead;
  components = /* @__PURE__ */ new Set();
  componentParams = /* @__PURE__ */ new Map();
  /** named styles: style promise (indented options) → used as “column promise” */
  namedStyles = /* @__PURE__ */ new Set();
  styleDefs = /* @__PURE__ */ new Map();
  usedStyles = /* @__PURE__ */ new Set();
  namedAnimations = /* @__PURE__ */ new Set();
  /** the rules of each named style, once checked: a button reads the background and the text color they give it */
  styleRules = /* @__PURE__ */ new Map();
  /** where each color of the site is written */
  colorPos = /* @__PURE__ */ new Map();
  /** the background of the site, when it is a color written as it is (the one of Kaury when the site gives none) */
  siteGround = "#fcfbf8";
  /** inside a page: the background behind what is being read, box after box (undefined: a picture, a gradient, a color that depends) */
  grounds = [];
  /** a button of its own, or a ready-made block that has one: the color of the buttons matters */
  usesButtons = false;
  err(pos, what, fix) {
    this.errors.push(new KauryError(pos, what, fix));
  }
  warn(pos, what, fix) {
    this.warnings.push(new KauryError(pos, what, fix, "warning"));
  }
  // ------------------------------------------------------------------
  module(prog) {
    const s = new Scope("module");
    for (const i of prog) if (i.k === "site") this.readSiteColors(i.body);
    this.readLanguages(prog);
    this.hoist(prog, s);
    const late = (i) => i.k === "page" || i.k === "component" || i.k === "site" || i.k === "command";
    this.statements(prog.filter((i) => !late(i)), s);
    for (const i of prog.filter(late)) this.statement(i, s);
    const seen = /* @__PURE__ */ new Map();
    for (const pg of this.info.pages) {
      if (seen.has(pg.path)) this.err(
        pg.pos,
        msg(`the page ${q(pg.path)} already exists (line ${seen.get(pg.path).line}).`, `la page ${q(pg.path)} existe d\xE9j\xE0 (ligne ${seen.get(pg.path).line}).`),
        msg("give each page a different address.", "donne une adresse diff\xE9rente \xE0 chaque page.")
      );
      seen.set(pg.path, pg.pos);
    }
    this.checkAccent();
    this.unusedTranslations();
    if (this.info.pages.length && !this.info.exports.length) {
      for (const [name, pos] of this.styleDefs) {
        if (!this.usedStyles.has(name)) {
          this.warn(
            { ...pos, length: 5 + 1 + name.length },
            msg(`the style ${q(name)} is never used.`, `le style ${q(name)} n'est jamais utilis\xE9.`),
            msg(`write its name on an element (text "\u2026", ${name}), or remove it.`, `\xE9cris son nom sur un \xE9l\xE9ment (texte "\u2026", ${name}), ou supprime-le.`)
          );
        }
      }
    }
    for (const [name, b] of s.names) {
      if (!b.used && b.kind === "state" && !this.info.exports.includes(name) && b.pos) {
        this.warn(b.pos, msg(`the state ${q(name)} is never used.`, `l'\xE9tat ${q(name)} n'est jamais utilis\xE9.`), msg("remove it, or show it somewhere.", "supprime-le, ou affiche-le quelque part."));
      }
    }
  }
  /** lang "fr", "en" in site, and the translate blocks: read before the pages, which use them wherever they are written. */
  readLanguages(prog) {
    for (const i of prog) {
      if (i.k !== "site") continue;
      for (const c of i.body) {
        if (c.k !== "command" || c.head !== "lang") continue;
        const codes = c.items.flatMap((it) => it.atoms).map((a) => a.k === "text" && a.parts.every((p) => typeof p === "string") ? a.parts.join("") : void 0);
        if (codes.length > 1 && codes.every((x) => !!x)) this.info.languages = codes;
      }
    }
    const langs = this.info.languages;
    for (const i of prog) {
      if (i.k !== "translate") continue;
      if (!langs.length) {
        this.err(
          i.pos,
          msg(`the site has one language: to translate it into ${q(i.lang)}, give it its languages, the one of the file first.`, `le site a une seule langue : pour le traduire en ${q(i.lang)}, donne-lui ses langues, celle du fichier d'abord.`),
          `site "\u2026"
  lang "fr", "${i.lang}"`
        );
        continue;
      }
      if (i.lang === langs[0]) {
        this.err(
          i.pos,
          msg(`${q(i.lang)} is the language the file is written in: its texts need no translation.`, `${q(i.lang)} est la langue dans laquelle le fichier est \xE9crit : ses textes n'ont pas besoin de traduction.`),
          msg(`translate into the other languages of the site: ${langs.slice(1).map((l) => `translate "${l}"`).join(", ")}`, `traduis dans les autres langues du site : ${langs.slice(1).map((l) => `translate "${l}"`).join(", ")}`)
        );
        continue;
      }
      if (!langs.includes(i.lang)) {
        this.err(
          i.pos,
          msg(`${q(i.lang)} is not one of the languages of the site (${langs.join(", ")}).`, `${q(i.lang)} n'est pas une des langues du site (${langs.join(", ")}).`),
          `lang ${[...langs, i.lang].map((l) => `"${l}"`).join(", ")}`
        );
        continue;
      }
      for (const pair of i.pairs) {
        const key = textKey(pair.from);
        const own2 = holes(pair.from);
        const missing = [...holes(pair.to).keys()].filter((k) => !own2.has(k));
        if (missing.length) {
          this.err(
            pair.pos,
            msg(`the translation reads {${missing[0]}}, which the text it translates does not have.`, `la traduction lit {${missing[0]}}, que le texte qu'elle traduit n'a pas.`),
            msg(`between braces, a translation uses the values of its text: ${[...own2.keys()].map((k) => `{${k}}`).join(" ") || "here, none"}`, `entre accolades, une traduction reprend les valeurs de son texte : ${[...own2.keys()].map((k) => `{${k}}`).join(" ") || "ici, aucune"}`)
          );
          continue;
        }
        let byLang = this.info.dictionary.get(key);
        if (!byLang) this.info.dictionary.set(key, byLang = /* @__PURE__ */ new Map());
        const before = byLang.get(i.lang);
        if (before) {
          this.warn(
            pair.pos,
            msg(`this text is already translated into ${q(i.lang)} on line ${before.pos.line}: this line wins.`, `ce texte est d\xE9j\xE0 traduit en ${q(i.lang)} ligne ${before.pos.line} : cette ligne l'emporte.`),
            msg("keep one translation per text.", "garde une seule traduction par texte.")
          );
        }
        byLang.set(i.lang, { to: pair.to, pos: pair.pos, used: false });
      }
    }
  }
  /** A translation of a text the file does not have: a text changed since, or written differently. */
  unusedTranslations() {
    const unused = new Set([...this.info.dictionary].filter(([, byLang]) => [...byLang.values()].every((t) => !t.used)).map(([k]) => k));
    const said = [...this.info.dictionary.keys()].filter((k) => !unused.has(k)).concat([...this.said]);
    for (const key of unused) {
      for (const [lang, t] of this.info.dictionary.get(key)) {
        const near = closest(key, said);
        this.warn(
          t.pos,
          msg(`no text of the file says ${q(key)}: this translation into ${q(lang)} is never used.`, `aucun texte du fichier ne dit ${q(key)} : cette traduction en ${q(lang)} ne sert jamais.`),
          near ? msg(`the file says ${q(near)}: write it the same way, letter for letter.`, `le fichier dit ${q(near)} : \xE9cris-le de la m\xEAme fa\xE7on, lettre pour lettre.`) : msg("a text is found by what it says, letter for letter: copy it from the line where it is written, or remove this one.", "un texte est trouv\xE9 par ce qu'il dit, lettre pour lettre : copie-le depuis la ligne o\xF9 il est \xE9crit, ou supprime celle-ci.")
        );
      }
    }
  }
  /** the texts written in the file (a site in several languages): a translation that matches none is compared to them */
  said = /* @__PURE__ */ new Set();
  /**
   * In a site of several languages, a text shown in the page that has no translation into one of them:
   * its page in that language shows it as it is written.
   */
  untranslated(e2) {
    const langs = this.info.languages;
    if (!langs.length || e2?.k !== "text") return;
    const key = textKey(e2);
    const plain = e2.parts.filter((p) => typeof p === "string").join("");
    if (!new RegExp("\\p{L}{2}", "u").test(plain) || MEDIA_FILE.test(plain) || /^(\/|#|https?:|mailto:|tel:)/.test(plain.trim())) return;
    const have = this.info.dictionary.get(key);
    const missing = langs.slice(1).filter((l) => !have?.has(l));
    if (!missing.length) return;
    this.warn(
      e2.pos,
      msg(`${q(key)} has no translation into ${missing.map(q).join(", ")}: that page shows it as it is written.`, `${q(key)} n'a pas de traduction en ${missing.map(q).join(", ")} : cette page l'affiche tel qu'il est \xE9crit.`),
      msg(`add it to the block translate "${missing[0]}": "${key}" "\u2026"`, `ajoute-le au bloc translate "${missing[0]}" : "${key}" "\u2026"`)
    );
  }
  readSiteColors(body) {
    for (const i of body) {
      if (i.k === "command" && i.head === "colors") {
        for (const it of i.items) {
          let [n, c] = it.atoms;
          if (n?.k === "binary" && n.op === "-" && n.l.k === "name" && n.r.k === "number") n = { k: "name", name: `${n.l.name}-${n.r.v}`, pos: n.pos };
          if (n?.k === "name" && c?.k === "color") {
            this.info.colors[n.name] = c.v;
            this.colorPos.set(n.name, it.pos);
          } else if (n?.k === "name" && c?.k === "name" && knownColor(c.name)) this.info.colors[n.name] = `var(--k-${knownColor(c.name)})`;
          else this.err(it.pos, msg("each color is written \u201Cname #code\u201D.", "chaque couleur s'\xE9crit \xAB nom #code \xBB."), "colors pink #FF4F8B, cream #FFF4E8");
        }
      }
    }
  }
  /** Declares ahead what a block defines (functions, components, imports) so it can be used before its line. */
  hoist(body, s) {
    for (const i of body) {
      switch (i.k) {
        case "function":
          this.declare(s, i.name, "function", i.pos).params = { names: i.params.map((p) => p.name), required: i.params.filter((p) => !p.default).length };
          if (i.exported) this.info.exports.push(i.name);
          break;
        case "style-def":
          if (!(i.name in ELEMENTS) && i.name !== "emphasis") {
            this.namedStyles.add(i.name);
            if (!this.styleDefs.has(i.name)) this.styleDefs.set(i.name, i.pos);
          }
          break;
        case "animation-def":
          this.namedAnimations.add(i.name);
          break;
        case "component":
          this.declare(s, i.name, "component", i.pos);
          this.components.add(i.name);
          this.componentParams.set(i.name, { names: i.params.map((p) => p.name), required: i.params.filter((p) => !p.default).length });
          this.info.components.push(i.name);
          if (i.exported) this.info.exports.push(i.name);
          break;
        case "import":
          for (const n of [i.default, i.all, ...(i.names ?? []).map((x) => x.alias ?? x.name)]) {
            if (n) {
              const b = this.declare(s, n, new RegExp("^\\p{Lu}", "u").test(n) && i.source.endsWith(".kaury") ? "component" : "import", i.pos);
              if (/(\*|\.(md|mdx|mdoc|markdown|ya?ml)$)/i.test(i.source)) {
                b.collection = true;
                if (n === i.default) b.content = { source: i.source, entry: !i.source.includes("*") };
              }
              if (new RegExp("^\\p{Lu}", "u").test(n)) this.components.add(n);
            }
          }
          break;
      }
    }
  }
  declare(s, name, kind, pos) {
    if (RESERVED.has(canon(name) ?? "") && canon(name) === name) {
      this.err(
        pos,
        msg(`${q(name)} is a reserved Kaury word; it cannot be used as a name.`, `${q(name)} est un mot r\xE9serv\xE9 de Kaury ; il ne peut pas servir de nom.`),
        msg(`choose another name, for example ${q("my-" + name)}.`, `choisis un autre nom, par exemple ${q("mon-" + name)}.`)
      );
    }
    const prev = s.names.get(name);
    if (prev && prev.kind !== "function" && kind !== "variable" && prev.pos && prev.pos !== pos && s.kind !== "module" && prev.kind === kind) {
      this.err(
        pos,
        msg(`${q(name)} is already declared on line ${prev.pos.line}.`, `${q(name)} est d\xE9j\xE0 d\xE9clar\xE9 ligne ${prev.pos.line}.`),
        msg(`to change its value, just write \u201C${name} = \u2026\u201D.`, `pour changer sa valeur, \xE9cris simplement \xAB ${name} = \u2026 \xBB.`)
      );
    }
    const b = { kind, name, pos };
    s.names.set(name, b);
    return b;
  }
  // ------------------------------------------------------------------
  statements(body, s) {
    this.hoistImplicit(body, s);
    for (const i of body) this.statement(i, s);
  }
  hoistImplicit(body, s) {
    const host = s.host();
    const explicit = /* @__PURE__ */ new Set();
    const collect = (list) => {
      for (const i of list) {
        if (i.k === "let") explicit.add(i.name);
        else if (i.k === "if") {
          collect(i.then);
          i.elifs.forEach((x) => collect(x.body));
          if (i.else) collect(i.else);
        } else if (i.k === "for" || i.k === "while") collect(i.body);
        else if (i.k === "try") {
          collect(i.body);
          if (i.handler) collect(i.handler);
        } else if (i.k === "command" && host.isView()) collect(i.children);
      }
    };
    collect(body);
    const walk = (list) => {
      for (const i of list) {
        if (i.k === "assign" && i.target.k === "name" && i.op === "=") {
          const name = i.target.name;
          if (!s.find(name) && !explicit.has(name) && !kauryGlobal(name) && !JS_GLOBALS.has(name)) {
            const b = this.declare(host, name, host.isView() ? "state" : "variable", i.pos);
            b.mutated = true;
            i.declares = b;
          }
        }
        if (i.k === "toggle" && i.target.k === "name" && !s.find(i.target.name) && !explicit.has(i.target.name) && host.isView()) {
          const b = this.declare(host, i.target.name, "state", i.pos);
          b.mutated = true;
          i.declares = b;
        }
        if (i.k === "if") {
          walk(i.then);
          i.elifs.forEach((x) => walk(x.body));
          if (i.else) walk(i.else);
        } else if (i.k === "for" || i.k === "while") walk(i.body);
        else if (i.k === "try") {
          walk(i.body);
          if (i.handler) walk(i.handler);
        } else if (i.k === "command" && host.isView()) {
          const first = STATE_HEADS.includes(i.head) ? i.items[0]?.atoms[0] : void 0;
          if (first?.k === "name" && !s.find(first.name) && !explicit.has(first.name) && !kauryGlobal(first.name) && !JS_GLOBALS.has(first.name) && !elementOption(i.head, first.name) && (i.items[0].atoms.length > 1 || !styleOption(first.name))) {
            const b = this.declare(host, first.name, "state", i.items[0].pos);
            b.mutated = true;
            b.used = true;
          }
          walk(i.children);
          if (i.action) walk(i.action);
        }
      }
    };
    walk(body);
  }
  statement(i, s) {
    switch (i.k) {
      case "let": {
        this.expr(i.value, s);
        let kind = i.reactive ? "state" : "const";
        if (!i.reactive && s.host().isView() && this.readsReactive(i.value, s)) kind = "derived";
        i.binding = this.declare(s, i.name, kind, i.pos);
        const from = this.entriesOf(i.value, s);
        if (from) i.binding.content = { source: from, entry: false };
        if (i.exported) this.info.exports.push(i.name);
        break;
      }
      case "assign": {
        this.expr(i.value, s);
        if ((i.target.k === "member" || i.target.k === "index") && ["number", "text", "bool", "none", "color"].includes(i.target.object.k)) {
          this.err(
            i.target.pos,
            msg("nothing can be stored inside a number, a text or an empty value.", "on ne peut rien ranger dans un nombre, un texte ou une valeur vide."),
            msg("store into a name: total = 3   \xB7   product.price = 3", "range dans un nom : total = 3   \xB7   produit.prix = 3")
          );
          break;
        }
        if (i.target.k === "name") {
          const b = i.declares ?? s.find(i.target.name);
          if (!b) this.unknownName(i.target.name, i.target.pos, s);
          else {
            i.target.binding = b;
            b.mutated = true;
            if (!i.declares) b.used = true;
            if (b.kind === "const" || b.kind === "derived") {
              this.err(
                i.pos,
                msg(`${q(i.target.name)} is declared with \u201Clet\u201D: its value is fixed.`, `${q(i.target.name)} est d\xE9clar\xE9 avec \xAB soit \xBB : sa valeur est fixe.`),
                msg(`declare it with \u201Cstate ${i.target.name} = \u2026\u201D to be able to change it.`, `d\xE9clare-le avec \xAB etat ${i.target.name} = \u2026 \xBB pour pouvoir le changer.`)
              );
            } else if (b.kind === "function" || b.kind === "component") {
              this.err(
                i.pos,
                msg(`${q(i.target.name)} is a ${b.kind}; it cannot be given a value.`, `${q(i.target.name)} est une ${b.kind === "function" ? "fonction" : "composant"} : on ne peut pas lui donner une valeur.`),
                msg("choose another variable name.", "choisis un autre nom de variable.")
              );
            } else if (b.kind === "prop") {
              this.err(
                i.pos,
                msg(`${q(i.target.name)} is a component parameter: it comes from outside and is not changed here.`, `${q(i.target.name)} est un param\xE8tre du composant : il vient de l'ext\xE9rieur et ne se modifie pas ici.`),
                msg(`copy it into a state: state local-${i.target.name} = ${i.target.name}`, `copie-le dans un \xE9tat : etat ${i.target.name}-local = ${i.target.name}`)
              );
            }
          }
        } else this.expr(i.target, s);
        break;
      }
      case "function": {
        const f = new Scope("function", s);
        for (const p of i.params) {
          if (p.default) this.expr(p.default, s);
          this.declare(f, p.name, "param", p.pos);
        }
        this.hoist(i.body, f);
        this.statements(i.body, f);
        break;
      }
      case "if":
        this.expr(i.cond, s);
        for (const side of [i.then, ...i.elifs.map((x) => x.body), i.else ?? []]) this.looseStyle(side, s, "if");
        this.block(i.then, s);
        for (const x of i.elifs) {
          this.expr(x.cond, s);
          this.block(x.body, s);
        }
        if (i.else) this.block(i.else, s);
        break;
      case "for": {
        this.looseStyle(i.body, s, "for");
        this.expr(i.source, s);
        const b = new Scope("block", s);
        const each = this.declare(b, i.variable, "loop", i.pos);
        const from = this.entriesOf(i.source, s);
        if (from) each.content = { source: from, entry: true };
        if (i.index) this.declare(b, i.index, "loop", i.pos);
        this.hoist(i.body, b);
        this.statements(i.body, b);
        break;
      }
      case "while":
        this.expr(i.cond, s);
        this.block(i.body, s);
        break;
      case "try":
        this.block(i.body, s);
        if (i.handler) {
          const b = new Scope("block", s);
          if (i.variable) this.declare(b, i.variable, "variable", i.pos);
          this.statements(i.handler, b);
        }
        break;
      case "import":
      case "break":
      case "continue":
      case "js":
      case "css":
        break;
      case "style-def":
        for (const r of i.rules) this.command(r, s, r.part && r.part in ELEMENTS ? r.part : i.name in ELEMENTS ? i.name : "box");
        this.styleRules.set(i.name, i.rules);
        break;
      case "animation-def":
        for (const r of i.frames) this.command(r, s, "box");
        break;
      case "return":
        if (i.value) this.expr(i.value, s);
        break;
      case "expr": {
        const head = i.e.k === "call" && i.e.fn.k === "name" ? i.e.fn : i.e.k === "name" ? i.e : void 0;
        const habit = head && !s.find(head.name) && !kauryGlobal(head.name) && !JS_GLOBALS.has(head.name) ? lineHabit(head.name) : void 0;
        if (head && habit) {
          this.err({ ...head.pos, length: head.name.length }, msg(`${q(head.name)} is not a Kaury word.`, `${q(head.name)} n'est pas un mot de Kaury.`), habit);
          break;
        }
        const subtraction = !!head && head.name.includes("-") && head.name.split("-").every((m) => m && (s.find(m) || kauryGlobal(m)));
        if (head && i.e.k === "call" && !subtraction && !s.find(head.name) && !kauryGlobal(head.name) && !JS_GLOBALS.has(head.name)) {
          this.lineHead = head;
          this.unknownName(head.name, head.pos, s);
          this.lineHead = void 0;
          break;
        }
        if (i.e.k === "lambda") {
          this.err(
            i.e.pos,
            msg("this function is written here and never used: nothing keeps it, nothing calls it.", "cette fonction est \xE9crite ici et jamais utilis\xE9e : rien ne la garde, rien ne l'appelle."),
            s.host().kind === "page" || s.host().kind === "component" ? msg("an action of the element above starts with \u201Con\u201D: on click -> \u2026   /   on hover -> \u2026", "une action de l'\xE9l\xE9ment au-dessus commence par \xAB on \xBB : on click -> \u2026   /   on hover -> \u2026") : msg("keep it under a name: let double = x -> x * 2   (or: function double x)", "garde-la sous un nom : let double = x -> x * 2   (ou : function double x)")
          );
          break;
        }
        this.lineHead = head;
        this.expr(i.e, s);
        this.lineHead = void 0;
        break;
      }
      case "toggle":
        if (i.declares && i.target.k === "name") {
          i.target.binding = i.declares;
          break;
        }
        this.expr(i.target, s);
        if (i.target.k === "name" && i.target.binding) i.target.binding.mutated = true;
        break;
      case "go": {
        this.expr(i.path, s);
        const to = staticText(i.path);
        if (to?.startsWith("/")) this.info.gos.push({ path: to, pos: i.path.pos });
        break;
      }
      case "component": {
        const c = new Scope("component", s);
        for (const p of i.params) {
          if (p.default) this.expr(p.default, s);
          this.declare(c, p.name, "prop", p.pos);
        }
        this.hoist(i.body, c);
        this.statements(i.body, c);
        break;
      }
      case "page": {
        this.info.pages.push({ path: i.path, pos: i.pos });
        const pg = new Scope("page", s);
        for (const m of i.path.matchAll(/:([\p{L}_][\p{L}\p{N}_-]*)/gu)) this.declare(pg, m[1], "const", i.pos);
        if (i.each) {
          this.expr(i.each.source, s);
          const each = this.declare(pg, i.each.variable, "loop", i.pos);
          each.used = true;
          const from = this.entriesOf(i.each.source, s);
          if (from) each.content = { source: from, entry: true };
          if (i.address) this.expr(i.address, pg);
        }
        this.hoist(i.body, pg);
        this.page = /[:{]/.test(i.path) || i.each ? void 0 : i.path;
        this.grounds = [this.siteGround];
        this.statements(i.body, pg);
        this.grounds = [];
        this.page = void 0;
        break;
      }
      case "translate":
        break;
      case "site": {
        if (i.name) this.expr(i.name, s);
        for (const c of i.body) {
          if (c.k !== "command" || !SITE_SETTINGS.includes(c.head)) {
            this.err(
              c.pos,
              msg("\u201Csite\u201D only holds settings: colors, font, lang, favicon, url, seo, style, transition, head, base.", "dans \xAB site \xBB, on ne met que des r\xE9glages : couleurs, police, langue, favicon, adresse, seo, style, transition, head, base."),
              msg('move this element into a page "/".', 'd\xE9place cet \xE9l\xE9ment dans une page "/".')
            );
            continue;
          }
          this.command(c, s, "site");
          if (c.head === "style") {
            const own2 = this.ground("box", c.meaning?.options ?? [], []);
            if (own2 !== "same") this.siteGround = own2;
          }
        }
        break;
      }
      case "command":
        this.command(i, s, void 0);
        break;
    }
  }
  block(body, s) {
    const b = new Scope("block", s);
    this.hoist(body, b);
    this.statements(body, b);
  }
  /** Does the expression read a state (directly or through a derived value)? */
  readsReactive(e2, s) {
    let yes = false;
    const see = (x) => {
      if (yes) return;
      switch (x.k) {
        case "name": {
          const b = x.binding ?? s.find(x.name);
          if (b && (b.kind === "state" || b.kind === "derived" || b.kind === "prop" || b.collection)) yes = true;
          if (!b && ["mouse", "scroll", "screen", "route"].includes(kauryGlobal(x.name) ?? "")) yes = true;
          break;
        }
        case "text":
          for (const m of x.parts) if (typeof m !== "string") see(m);
          break;
        case "list":
          x.items.forEach(see);
          break;
        case "object":
          x.props.forEach((p) => see(p.value));
          break;
        case "member":
          see(x.object);
          break;
        case "index":
          see(x.object);
          see(x.index);
          break;
        case "call":
          see(x.fn);
          x.args.forEach(see);
          break;
        case "binary":
          see(x.l);
          see(x.r);
          break;
        case "unary":
        case "spread":
          see(x.e);
          break;
        case "if":
          see(x.cond);
          see(x.then);
          see(x.else);
          break;
        case "range":
          see(x.from);
          see(x.to);
          break;
        case "lambda":
          if (!Array.isArray(x.body)) see(x.body);
          break;
        case "await":
          break;
      }
    };
    see(e2);
    return yes;
  }
  // ------------------------------------------------------------------
  unknownName(name, pos, s) {
    const sug = closest(name, [...s.all(), ...kauryNames(getLanguage() === "fr")]);
    if (name.includes("-")) {
      const parts = name.split("-");
      if (parts.every((m) => s.find(m) || /^\d/.test(m))) {
        this.err(
          { ...pos, length: name.length },
          msg(`${q(name)} does not exist.`, `${q(name)} n'existe pas.`),
          msg(`to subtract, put spaces around it: ${parts.join(" - ")}`, `pour soustraire, mets des espaces : ${parts.join(" - ")}`)
        );
        return;
      }
    }
    const c = canon(name);
    if (c && ELEMENTS[c]) {
      this.err(
        { ...pos, length: name.length },
        msg(`${q(name)} is a UI element; it must start a line.`, `${q(name)} est un \xE9l\xE9ment d'interface ; il doit \xEAtre en d\xE9but de ligne.`),
        msg(`start a new line: ${name} "\u2026"`, `passe \xE0 la ligne : ${name} "\u2026"`)
      );
      return;
    }
    const habit = closest(name, s.all()) ? void 0 : valueHabit(name);
    if (habit) {
      this.err({ ...pos, length: name.length }, msg(`${q(name)} is not a Kaury word.`, `${q(name)} n'est pas un mot de Kaury.`), habit);
      return;
    }
    const elements = getLanguage() === "fr" ? Object.keys(ELEMENTS).flatMap((e2) => [e2, ...aliasesOf(e2)]) : Object.keys(ELEMENTS);
    const element = sug || this.lineHead?.pos !== pos ? void 0 : closest(name, elements);
    this.err(
      { ...pos, length: name.length },
      msg(`${q(name)} does not exist.`, `${q(name)} n'existe pas.`),
      sug ? msg(`did you mean ${q(sug)}?`, `tu voulais dire ${q(sug)} ?`) : element ? msg(`did you mean the element ${q(element)}?`, `tu voulais dire l'\xE9l\xE9ment ${q(element)} ?`) : msg(`declare it first: let ${name} = \u2026   (or state ${name} = \u2026 if it changes)`, `d\xE9clare-le avant : soit ${name} = \u2026   (ou etat ${name} = \u2026 s'il change)`)
    );
  }
  expr(e2, s) {
    switch (e2.k) {
      case "number":
      case "color":
      case "bool":
      case "none":
        return;
      case "text": {
        for (const m of e2.parts) if (typeof m !== "string") this.expr(m, s);
        if (this.info.languages.length) {
          const key = textKey(e2);
          this.said.add(key);
          const byLang = this.info.dictionary.get(key);
          if (byLang) {
            e2.translated = true;
            for (const t of byLang.values()) t.used = true;
          }
        }
        return;
      }
      case "name": {
        const b = s.find(e2.name);
        if (b) {
          e2.binding = b;
          b.used = true;
          return;
        }
        const g2 = kauryGlobal(e2.name);
        if (g2) {
          e2.binding = { kind: "kaury", name: g2 };
          return;
        }
        if (JS_GLOBALS.has(e2.name)) {
          e2.binding = { kind: "js", name: e2.name };
          return;
        }
        const parts = e2.name.split("-");
        if (parts.length > 1 && parts.every((m) => m && (s.find(m) || kauryGlobal(m)))) {
          this.warn(
            { ...e2.pos, length: e2.name.length },
            msg(`${q(e2.name)} is read as a subtraction.`, `${q(e2.name)} est lu comme une soustraction.`),
            msg(`write it with spaces to make it clear: ${parts.join(" - ")}`, `\xE9cris-la avec des espaces pour plus de clart\xE9 : ${parts.join(" - ")}`)
          );
          const pos = e2.pos;
          let tree = { k: "name", name: parts[0], pos };
          for (const p of parts.slice(1)) tree = { k: "binary", op: "-", l: tree, r: { k: "name", name: p, pos }, pos };
          for (const key of Object.keys(e2)) delete e2[key];
          Object.assign(e2, tree);
          this.expr(e2, s);
          return;
        }
        this.unknownName(e2.name, e2.pos, s);
        return;
      }
      case "list":
        e2.items.forEach((x) => this.expr(x, s));
        return;
      case "object":
        e2.props.forEach((x) => this.expr(x.value, s));
        return;
      case "member": {
        this.expr(e2.object, s);
        const of = e2.object.k === "name" ? s.find(e2.object.name)?.content : void 0;
        if (of?.entry) this.info.reads.push({ source: of.source, field: e2.prop, pos: e2.pos });
        return;
      }
      case "index":
        this.expr(e2.object, s);
        this.expr(e2.index, s);
        return;
      case "call":
        this.expr(e2.fn, s);
        this.entry = e2.fn.k === "member" ? this.entriesOf(e2.fn.object, s) : void 0;
        e2.args.forEach((x) => this.expr(x, s));
        this.entry = void 0;
        if (e2.fn.k === "name" && e2.fn.binding?.kind === "component") {
          this.err(
            e2.pos,
            msg(`${q(e2.fn.name)} is a component: it is used at the start of a line, not like a function.`, `${q(e2.fn.name)} est un composant : il s'utilise en d\xE9but de ligne, pas comme une fonction.`),
            `${e2.fn.name} ${e2.args.length ? "\u2026" : ""}`.trim()
          );
        }
        if (e2.fn.k === "name" && e2.fn.binding?.kind === "function" && e2.fn.binding.params && !e2.args.some((a) => a.k === "spread")) {
          const { names, required } = e2.fn.binding.params;
          const n = e2.args.length;
          const fn = e2.fn.name;
          const many = (k) => `${k} value${k > 1 ? "s" : ""}`;
          const plusieurs = (k) => `${k} valeur${k > 1 ? "s" : ""}`;
          if (n < required) {
            this.err(
              { ...e2.fn.pos, length: fn.length },
              msg(`${q(fn)} needs ${many(required)} (${names.slice(0, required).join(", ")}), I see ${n}.`, `${q(fn)} demande ${plusieurs(required)} (${names.slice(0, required).join(", ")}), j'en vois ${n}.`),
              `${fn}(${names.join(", ")})`
            );
          } else if (n > names.length) {
            this.err(
              { ...e2.fn.pos, length: fn.length },
              msg(`${q(fn)} takes at most ${names.length ? many(names.length) : "no value"}${names.length ? ` (${names.join(", ")})` : ""}, I see ${n}.`, `${q(fn)} prend au plus ${names.length ? plusieurs(names.length) : "aucune valeur"}${names.length ? ` (${names.join(", ")})` : ""}, j'en vois ${n}.`),
              `${fn}(${names.join(", ")})`
            );
          }
        }
        return;
      case "binary":
        this.expr(e2.l, s);
        this.expr(e2.r, s);
        return;
      case "unary":
      case "spread":
      case "await":
        this.expr(e2.e, s);
        return;
      case "lambda": {
        const l = new Scope("lambda", s);
        const entry = this.entry;
        this.entry = void 0;
        e2.params.forEach((n, k) => {
          const p = this.declare(l, n, "param", e2.pos);
          if (entry && k === 0) p.content = { source: entry, entry: true };
        });
        if (Array.isArray(e2.body)) {
          const a = new Scope("action", l);
          this.hoist(e2.body, a);
          this.statements(e2.body, a);
        } else this.expr(e2.body, l);
        return;
      }
      case "if":
        this.expr(e2.cond, s);
        this.expr(e2.then, s);
        this.expr(e2.else, s);
        return;
      case "range":
        this.expr(e2.from, s);
        this.expr(e2.to, s);
        return;
    }
  }
  // ------------------------------------------------------------------
  // UI lines
  command(c, s, parent) {
    const head = c.head;
    if (new RegExp("^\\p{Lu}", "u").test(head)) {
      const b = s.find(head);
      if (!b) {
        const sug = closest(head, this.components);
        this.err(
          { ...c.pos, length: head.length },
          msg(`the component ${q(head)} does not exist.`, `le composant ${q(head)} n'existe pas.`),
          sug ? msg(`did you mean ${q(sug)}?`, `tu voulais dire ${q(sug)} ?`) : msg(`create it with \u201Ccomponent ${head} \u2026\u201D or import it: import ${head} from "./${head.toLowerCase()}.kaury"`, `cr\xE9e-le avec \xAB composant ${head} \u2026 \xBB ou importe-le : importe ${head} de "./${head.toLowerCase()}.kaury"`)
        );
      } else b.used = true;
      const positional2 = [];
      for (const it of c.items) for (const a of it.atoms) {
        this.expr(a, s);
        positional2.push(a);
      }
      c.meaning = { kind: "component", positional: positional2, options: [] };
      for (const x of positional2) this.untranslated(x);
      if (["Hero", "Cta", "Contact", "Pricing"].includes(head)) this.usesButtons = true;
      if (this.page) {
        for (const x of positional2) {
          const heading = staticText(x);
          if (heading && slugOf(heading)) this.info.anchors.push({ page: this.page, id: slugOf(heading) });
        }
        if (head === "Contact") this.info.anchors.push({ page: this.page, id: "contact" });
        if (head === "Faq") this.info.anchors.push({ page: this.page, id: "questions" });
      }
      const sig = this.componentParams.get(head);
      if (sig && (positional2.length < sig.required || positional2.length > sig.names.length)) {
        const usage = `${head} ${sig.names.join(", ")}`;
        this.err(
          { ...c.pos, length: head.length },
          positional2.length < sig.required ? msg(`${q(head)} needs ${sig.required} value${sig.required > 1 ? "s" : ""} (${sig.names.slice(0, sig.required).join(", ")}), I see ${positional2.length}.`, `${q(head)} demande ${sig.required} valeur${sig.required > 1 ? "s" : ""} (${sig.names.slice(0, sig.required).join(", ")}), j'en vois ${positional2.length}.`) : msg(`${q(head)} takes at most ${sig.names.length} value${sig.names.length > 1 ? "s" : ""} (${sig.names.join(", ")}), I see ${positional2.length}.`, `${q(head)} prend au plus ${sig.names.length} valeur${sig.names.length > 1 ? "s" : ""} (${sig.names.join(", ")}), j'en vois ${positional2.length}.`),
          usage
        );
      }
      this.children(c, s);
      return;
    }
    if (head === "colors") {
      c.meaning = { kind: "setting", positional: [], options: [] };
      return;
    }
    const isMotion = !!MOTIONS[head];
    const kind = ELEMENTS[head] ? "element" : EVENTS.has(head) ? "event" : isMotion ? "motion" : head === "style" ? "style" : ["mobile", "tablet", "desktop"].includes(head) ? "screen" : "setting";
    if (ELEMENTS[head]?.kind === "immersion" || ["scene", "light", "camera"].includes(head) || isMotion) this.info.immersion = true;
    const positional = [];
    const options = [];
    let objectName;
    let inHover = false;
    const optionHead = kind === "screen" || kind === "style" ? parent ?? "box" : head;
    for (const it of c.items) {
      const a = it.atoms;
      const a0 = a[0];
      if (!a0) continue;
      const word = a0.k === "name" ? a0.name : void 0;
      if (isMotion && word && MOTION_WORDS.has(canonValue(word)) && !s.find(word)) {
        let name = canonValue(word);
        let values = a.slice(1);
        if (name === "on" && a[1]?.k === "name" && canonValue(a[1].name) === "scroll") {
          name = "on-scroll";
          values = a.slice(2);
        }
        values.forEach((x) => this.expr(x, s));
        options.push({ name, values, pos: it.pos });
        continue;
      }
      if (word && STATE_HEADS.includes(head) && it === c.items[0] && a.length > 1 && styleOption(word) && !elementOption(optionHead, word)) {
        let b = s.find(word);
        if (!b) {
          const host = s.host();
          b = this.declare(host, word, host.isView() ? "state" : "variable", it.pos);
        }
        b.mutated = true;
        b.used = true;
        if (a0.k === "name") a0.binding = b;
        positional.push(a0);
        a.slice(1).forEach((x) => {
          this.expr(x, s);
          positional.push(x);
        });
        continue;
      }
      let opt = word ? elementOption(optionHead, word) ?? (kind !== "motion" && kind !== "event" && kind !== "setting" ? styleOption(word) : void 0) : void 0;
      const sectionName = ALWAYS_NAMED.includes(head) && it === c.items[0];
      const boxed = ELEMENTS[head]?.kind === "container";
      if (word && a.length === 1 && this.namedStyles.has(word) && (!s.find(word) || boxed) && kind !== "setting") {
        this.usedStyles.add(word);
        options.push({ name: "look", values: [{ k: "text", parts: ["ks-" + word], pos: it.pos }], pos: it.pos });
        if (!sectionName) continue;
      }
      if (word && a.length === 2 && this.namedStyles.has(word) && !s.find(word) && kind === "element" && !sectionName && head !== "object" && head !== "character" && !["text", "number", "color"].includes(a[1].k)) {
        this.usedStyles.add(word);
        this.expr(a[1], s);
        options.push({ name: "look-if", values: [{ k: "text", parts: ["ks-" + word], pos: it.pos }, a[1]], pos: it.pos });
        continue;
      }
      if (word && a.length === 1 && this.namedAnimations.has(word) && !s.find(word) && kind !== "setting" && !sectionName) {
        options.push({ name: "look", values: [{ k: "text", parts: ["ka-" + word], pos: it.pos }], pos: it.pos });
        continue;
      }
      const firstContent = it === c.items[0] && CONTENT_HEADS.has(head);
      if (opt && word && a.length === 1 && s.find(word) && (firstContent || (optionSpec(optionHead, opt)?.args ?? "").replace(/\?/g, "").length > 0)) opt = void 0;
      if (opt) {
        const values = a.slice(1);
        values.forEach((x) => this.checkValue(x, s));
        if (!["hover", "hidden", "selected", "current", "open"].includes(opt) && word && !elementOption(optionHead, word) && values.some((v) => this.computed(v))) {
          if (kind === "screen" || inHover) {
            this.warn(
              it.pos,
              msg(`${q(opt)} is given a computed value here: on ${kind === "screen" ? "a screen size" : "hover"} only fixed values apply, so it is ignored.`, `${q(opt)} re\xE7oit ici une valeur calcul\xE9e : ${kind === "screen" ? "pour une taille d'\xE9cran" : "au survol"} seules les valeurs fixes s'appliquent, elle est donc ignor\xE9e.`),
              msg("write a fixed value, or put the computed one on the element line.", "\xE9cris une valeur fixe, ou mets la valeur calcul\xE9e sur la ligne de l'\xE9l\xE9ment.")
            );
          } else if (!DYNAMIC_PROP[opt]) {
            this.warn(
              it.pos,
              msg(`${q(opt)} cannot follow a computed value: it is ignored.`, `${q(opt)} ne peut pas suivre une valeur calcul\xE9e : elle est ignor\xE9e.`),
              msg(`write a fixed value. Options that follow a value: ${Object.keys(DYNAMIC_PROP).filter((k) => k !== "tint").join(", ")}.`, `\xE9cris une valeur fixe. Options qui suivent une valeur : ${Object.keys(DYNAMIC_PROP).filter((k) => k !== "tint").join(", ")}.`)
            );
          }
        }
        if (opt === "hover") inHover = true;
        options.push({ name: inHover && opt !== "hover" ? `hover:${opt}` : opt, values, pos: it.pos });
        if (opt === "hover" && values.length) {
          const v0 = values[0];
          const sub = v0.k === "name" ? styleOption(v0.name) : void 0;
          if (!sub) this.err(it.pos, msg("\u201Chover\u201D must be followed by a style.", "\xAB survol \xBB doit \xEAtre suivi d'un style."), "hover lift 4   /   hover background pink");
          else {
            options.pop();
            options.push({ name: `hover:${sub}`, values: values.slice(1), pos: it.pos });
          }
        }
        this.checkOption(head, opt, values, it.pos);
        continue;
      }
      if (a0.k === "number" && a[1]?.k === "name") {
        const o2 = elementOption(optionHead, a[1].name) ?? styleOption(a[1].name);
        if (o2) {
          options.push({ name: inHover ? `hover:${o2}` : o2, values: [a0, ...a.slice(2)], pos: it.pos });
          continue;
        }
        const w2 = a[1].name;
        if (a.length === 2 && (kind === "element" || kind === "style" || kind === "screen") && !s.find(w2) && !kauryGlobal(w2) && !JS_GLOBALS.has(w2)) {
          this.unknownOption(w2, a[1].pos, c, optionHead, s, false);
          continue;
        }
      }
      if (kind !== "setting" && kind !== "motion" && a.length === 1 && (a0.k === "color" || word && !s.find(word) && (this.info.colors[word] || knownColor(word)))) {
        options.push({ name: inHover ? "hover:tint" : "tint", values: [a0], pos: it.pos });
        continue;
      }
      if (word && ALWAYS_NAMED.includes(head) && it === c.items[0] && a.length === 1 && !objectName) {
        objectName = word;
        continue;
      }
      if (word && !s.find(word) && !kauryGlobal(word) && !JS_GLOBALS.has(word)) {
        if (NAMED_CONTAINERS.includes(head) && !positional.length && a.length === 1 && !objectName) {
          const at = { ...it.pos, length: word.length };
          const element = canon(word);
          const near = closest(word, this.namedStyles);
          if (element && ELEMENTS[element] && element !== head && this.styleRules.has(element)) {
            this.warn(
              at,
              msg(`the style ${q(word)} styles every ${q(word)}: written on ${q(c.rawHead)}, it changes nothing.`, `le style ${q(word)} habille chaque ${q(word)} : \xE9crit sur ${q(c.rawHead)}, il ne change rien.`),
              msg(`give the style a name of its own (style panel, then ${c.rawHead} panel), or write the element itself: ${word}`, `donne au style un nom \xE0 lui (style panel, puis ${c.rawHead} panel), ou \xE9cris l'\xE9l\xE9ment lui-m\xEAme : ${word}`)
            );
          } else if (near && near !== word) {
            this.warn(
              at,
              msg(`${q(word)} becomes the name of this ${c.rawHead} (its id): no style has that name.`, `${q(word)} devient le nom de ce ${c.rawHead} (son id) : aucun style ne porte ce nom.`),
              msg(`did you mean the style ${q(near)}?`, `tu voulais dire le style ${q(near)} ?`)
            );
          }
          objectName = word;
          continue;
        }
        if ((head === "object" || head === "character") && a.length >= 2 && !objectName) {
          objectName = word;
          a.slice(1).forEach((x) => {
            this.expr(x, s);
            positional.push(x);
          });
          continue;
        }
        if (head === "links") {
          positional.push(...a);
          continue;
        }
        if (STATE_HEADS.includes(head) && !positional.length && it === c.items[0]) {
          const host = s.host();
          const b = this.declare(host, word, host.isView() ? "state" : "variable", it.pos);
          b.mutated = true;
          b.used = true;
          if (a0.k === "name") a0.binding = b;
          positional.push(a0);
          a.slice(1).forEach((x) => {
            this.expr(x, s);
            positional.push(x);
          });
          continue;
        }
        if (kind === "motion" || kind === "event" || kind === "setting") {
          positional.push(...a);
          for (const x of a.slice(1)) this.expr(x, s);
          continue;
        }
        if (kind === "style" || kind === "screen" || ELEMENTS[head]) {
          if (kind === "element" && a.length === 2 && !optionHabit(word) && !["text", "number", "color"].includes(a[1].k)) {
            this.expr(a[1], s);
            this.err(
              { ...it.pos, length: word.length },
              msg(`${q(word)} is not a state of ${q(c.rawHead)}.`, `${q(word)} n'est pas un \xE9tat de ${q(c.rawHead)}.`),
              msg("the states given by a condition are selected, current and open: selected (\u2026). For another look, name a style of your own and write it the same way: style right, then right (\u2026)", "les \xE9tats donn\xE9s par une condition sont selected, current et open : selected (\u2026). Pour un autre aspect, nomme un style \xE0 toi et \xE9cris-le de la m\xEAme fa\xE7on : style juste, puis juste (\u2026)")
            );
            continue;
          }
          this.unknownOption(word, it.pos, c, optionHead, s, true);
          continue;
        }
      }
      for (const [j, x] of a.entries()) {
        if (j > 0 && x.k === "name" && kind === "element" && !s.find(x.name) && !kauryGlobal(x.name) && !JS_GLOBALS.has(x.name)) {
          const opt2 = elementOption(optionHead, x.name) ?? styleOption(x.name);
          if (opt2) {
            this.err(
              { ...x.pos, length: x.name.length },
              msg(`a comma is missing before ${q(x.name)}.`, `il manque une virgule avant ${q(x.name)}.`),
              msg(`options are separated by commas: ${c.rawHead} ${CONTENT_HEADS.has(head) ? '"\u2026"' : "\u2026"}, ${optionSpec(optionHead, opt2)?.example ?? x.name}`, `les options se s\xE9parent par des virgules : ${c.rawHead} ${CONTENT_HEADS.has(head) ? '"\u2026"' : "\u2026"}, ${optionSpec(optionHead, opt2)?.example ?? x.name}`)
            );
            break;
          }
          if (a[0].k === "text") {
            this.unknownOption(x.name, x.pos, c, optionHead, s, true);
            break;
          }
        }
        this.expr(x, s);
        positional.push(x);
      }
    }
    c.meaning = { kind, positional, options, objectName };
    if (this.info.languages.length) {
      if (kind === "element" && head !== "logo" && (CONTENT_HEADS.has(head) || ["dialog", "field", "textarea", "checkbox"].includes(head)) || head === "seo") {
        for (const x of positional) this.untranslated(x);
      }
      if (head === "links") {
        for (const x of positional) {
          if (x.k === "text") this.untranslated(x);
          else if (x.k === "name" && (!x.binding || x.binding.kind === "component")) {
            const label = x.name.replace(/-/g, " ");
            this.said.add(label);
            const byLang = this.info.dictionary.get(label);
            for (const t of byLang?.values() ?? []) t.used = true;
            this.untranslated({ k: "text", parts: [label], pos: x.pos });
          }
        }
      }
      for (const o2 of options) if (["label", "alt"].includes(o2.name)) this.untranslated(o2.values[0]);
    }
    if (head === "button") this.checkButtonText(c, options);
    if (this.page && kind === "element") {
      if (objectName && head !== "object" && head !== "character") this.info.anchors.push({ page: this.page, id: objectName });
      const id = staticText(options.find((o2) => o2.name === "id")?.values[0]);
      if (id) this.info.anchors.push({ page: this.page, id });
    }
    this.noteFiles(c);
    this.checkShownFunction(c, positional);
    this.checkContrast(options, c.pos);
    this.checkCommand(c, parent);
    if (objectName && (head === "object" || head === "character")) {
      const b = this.declare(s.host(), objectName, "object", c.pos);
      b.used = true;
    }
    const inPage = this.grounds.length > 0;
    let carried = false;
    if (inPage && kind === "element") {
      const styled = this.styled(head, options);
      const below = c.children.some((x) => x.k === "command" && x.head === "style" && x.items.some((it) => it.atoms[0]?.k === "name" && styleOption(it.atoms[0].name) === "background"));
      const own2 = below ? void 0 : this.ground(head, styled, options);
      this.checkReadable(c, head, styled, options, own2);
      this.grounds.push(own2 === "same" ? this.grounds[this.grounds.length - 1] : own2);
      carried = true;
    } else if (inPage && this.grounds.length === 1 && kind === "setting" && head === "style") {
      const own2 = this.ground("box", options, []);
      if (own2 !== "same") this.grounds[0] = own2;
    }
    this.children(c, s);
    if (carried) this.grounds.pop();
  }
  /** The lines of a named style that always apply (not its states, its parts or its screens), as options. */
  always(name) {
    return (this.styleRules.get(name) ?? []).filter((r) => r.head === "style" && !r.state && !r.part).flatMap((r) => r.meaning?.options ?? []);
  }
  /** The options that style an element for sure: those of the styles named after its kind and on its line, then its own. */
  styled(head, options) {
    const named = options.filter((o2) => o2.name === "look").map((o2) => String(literal(o2.values[0], {}) ?? "")).filter((n) => n.startsWith("ks-"));
    return [...this.always(head), ...named.flatMap((n) => this.always(n.slice(3))), ...options];
  }
  /** A color written as it is, as a code of six (or three) digits; else nothing. */
  code(e2) {
    const v = e2 ? literal(e2, this.info.colors) : void 0;
    const h2 = typeof v === "string" ? hexOf(v, this.info.colors) : void 0;
    return h2 && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(h2) ? h2 : void 0;
  }
  /**
   * The background an element gives to what it contains: a color code when it is sure, “same” when it has none of
   * its own (the one behind it shows through), nothing when it cannot be known (a picture, a gradient, a condition).
   */
  ground(head, styled, options) {
    let own2 = "same";
    let written = false;
    for (const o2 of styled) {
      if (o2.name === "background" || o2.name === "tint" && !READ_HEADS.has(head) && head !== "icon" && head !== "links") {
        const v = o2.values[0] ? literal(o2.values[0], this.info.colors) : void 0;
        own2 = v === "transparent" ? "same" : this.code(o2.values[0]);
        written = true;
      } else if (["gradient", "mesh", "glass", "class"].includes(o2.name)) {
        own2 = void 0;
        written = true;
      }
    }
    const maybe = options.filter((o2) => o2.name === "look-if").map((o2) => String(literal(o2.values[0], {}) ?? "").slice(3));
    if (maybe.some((n) => this.ground("box", this.always(n), []) !== "same")) return void 0;
    if (own2 !== "same" || written) return own2;
    if (head === "button") return styled.some((o2) => o2.name === "outline" || o2.name === "ghost") ? "same" : void 0;
    if (["card", "scene", "details", "field", "textarea", "select", "code", "markdown", "embed", "video", "image"].includes(head)) return void 0;
    return "same";
  }
  /**
   * A text given a color of its own is read on the background of what contains it: said when it cannot be read there
   * (4.5 for a small text, 3 from 24 pixels, or 19 in bold), with a shade next to it that can.
   */
  checkReadable(c, head, styled, options, own2) {
    if (!READ_HEADS.has(head) && head !== "button") return;
    if (options.some((o2) => o2.name === "attr" && literal(o2.values[0], {}) === "aria-hidden" && String(literal(o2.values[1], {})) === "true")) return;
    const last = (name) => [...styled].reverse().find((o2) => o2.name === name || name === "color" && o2.name === "tint" && READ_HEADS.has(head));
    const color = last("color");
    const fg = this.code(color?.values[0]);
    if (!fg || !color || options.includes(color) && options.some((o2) => o2.name === "background")) return;
    const bg = own2 === "same" ? this.grounds[this.grounds.length - 1] : own2;
    if (!bg) return;
    const number = (name) => {
      const e2 = last(name)?.values[0];
      return e2?.k === "number" && !e2.unit ? e2.v : void 0;
    };
    const opacity = Math.max(0, Math.min(1, number("opacity") ?? 1));
    const size = number("size") ?? (head === "title" || head === "subtitle" ? 32 : 16);
    const bold = styled.some((o2) => o2.name === "bold") || (number("weight") ?? 400) >= 700;
    const need = size >= 24 || size >= 19 && bold ? 3 : 4.5;
    const rgb = (h2) => (h2.length === 4 ? h2.slice(1).split("").map((x) => x + x) : h2.slice(1).match(/../g)).map((x) => parseInt(x, 16));
    const hex = (v) => "#" + v.map((x) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, "0")).join("").toUpperCase();
    const back = rgb(bg);
    const seen = (h2) => hex(rgb(h2).map((x, i) => x * opacity + back[i] * (1 - opacity)));
    const ratio = contrast(seen(fg), bg);
    if (ratio >= need) return;
    const from = rgb(fg);
    let shade;
    for (let k = 1; k <= 70 && !shade; k++) {
      const darker = hex(from.map((x) => x * (1 - k / 100)));
      const lighter = hex(from.map((x) => x + (255 - x) * (k / 100)));
      shade = contrast(seen(darker), bg) >= need ? darker : contrast(seen(lighter), bg) >= need ? lighter : void 0;
    }
    const faint = opacity < 1 ? msg(` at opacity ${opacity}`, ` \xE0 l'opacit\xE9 ${opacity}`) : "";
    const what = need === 3 ? msg("3 is the minimum for a big text", "3 est le minimum pour un grand texte") : msg("4.5 is the minimum for a text this small", "4,5 est le minimum pour un texte de cette taille");
    const fix = opacity < 1 && contrast(fg, bg) >= need ? msg("raise its opacity until it can be read, or show another way that it is not the chosen one (a lighter weight, a line under the one that is).", "augmente son opacit\xE9 jusqu\u2019\xE0 ce qu\u2019il se lise, ou montre autrement qu\u2019il n\u2019est pas choisi (une graisse plus l\xE9g\xE8re, un trait sous celui qui l\u2019est).") : shade ? msg(`a shade next to it can be read here: color ${shade}` + (need === 4.5 ? " (or a text of 24 or more: 3 is then enough)" : size >= 100 ? ' (if it is only decoration, say so: attr "aria-hidden" "true")' : ""), `une teinte toute proche se lit ici : color ${shade}` + (need === 4.5 ? " (ou un texte de 24 ou plus : 3 suffit alors)" : size >= 100 ? ' (si ce n\u2019est qu\u2019un d\xE9cor, dis-le : attr "aria-hidden" "true")' : "")) : msg("choose a darker or a lighter color for it, or leave \u201Ccolor\u201D out: the color of the text around can be read.", "choisis pour lui une couleur plus fonc\xE9e ou plus claire, ou enl\xE8ve \xAB color \xBB : la couleur du texte autour se lit.");
    this.warn(
      { ...c.pos, length: c.rawHead.length },
      msg(`this text is hard to read on the background of what contains it (${fg.toUpperCase()}${faint} on ${bg.toUpperCase()}: contrast ${ratio.toFixed(1)}, ${what}).`, `ce texte se lit mal sur le fond de ce qui le contient (${fg.toUpperCase()}${faint} sur ${bg.toUpperCase()} : contraste ${ratio.toFixed(1)}, ${what}).`),
      fix
    );
  }
  /** The color of the buttons: the one named “accent”, else the first color of the site (its name and its code). */
  accent() {
    const name = this.info.colors.accent ? "accent" : Object.keys(this.info.colors)[0];
    const hex = name ? this.info.colors[name] : void 0;
    return name && hex && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex) ? [name, hex] : void 0;
  }
  /**
   * A button keeps the background of the buttons unless it is given one. A text color written for it (on its line or
   * in its style) is then read on that background: said when it cannot be read there.
   */
  checkButtonText(c, options) {
    const base = (rules = []) => rules.filter((r) => r.head === "style" && !r.state && !r.part).flatMap((r) => r.meaning?.options ?? []);
    const styles = options.filter((o2) => o2.name === "look").map((o2) => String(literal(o2.values[0], {}) ?? "")).filter((n) => n.startsWith("ks-"));
    const all = [...base(this.styleRules.get("button")), ...styles.flatMap((n) => base(this.styleRules.get(n.slice(3)))), ...options];
    if (all.some((o2) => ["background", "tint", "gradient", "glass", "mesh", "outline", "ghost", "class"].includes(o2.name))) return;
    this.usesButtons = true;
    const accent = this.accent();
    if (!accent) return;
    const color = [...all].reverse().find((o2) => o2.name === "color");
    const value = color?.values[0] ? literal(color.values[0], this.info.colors) : void 0;
    const hex = typeof value === "string" ? hexOf(value, this.info.colors) : void 0;
    if (!hex || !/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex)) return;
    const ratio = contrast(accent[1], hex);
    if (ratio >= 4.5) return;
    this.warn(
      { ...c.pos, length: c.rawHead.length },
      msg(`this button keeps the background of the buttons (${accent[0]} ${accent[1]}): its text color is hard to read on it (contrast ${ratio.toFixed(1)}, 4.5 is the minimum).`, `ce bouton garde le fond des boutons (${accent[0]} ${accent[1]}) : la couleur de son texte s'y lit mal (contraste ${ratio.toFixed(1)}, le minimum est 4,5).`),
      msg("give it a background of its own (background transparent, in its style or on its line), or write \u201Coutline\u201D or \u201Cghost\u201D on the button", "donne-lui un fond \xE0 lui (background transparent, dans son style ou sur sa ligne), ou \xE9cris \xAB outline \xBB ou \xAB ghost \xBB sur le bouton")
    );
  }
  /** The color of the buttons must carry a text that can be read: white or near-black, whichever is best. */
  checkAccent() {
    const accent = this.accent();
    const pos = accent && this.colorPos.get(accent[0]);
    if (!accent || !pos || !this.usesButtons) return;
    const best = (hex2) => Math.max(contrast(hex2, "#ffffff"), contrast(hex2, "#16151a"));
    const ratio = best(accent[1]);
    if (ratio >= 4.5) return;
    const h2 = accent[1].replace("#", "");
    const rgb = (h2.length === 3 ? h2.split("").map((x) => x + x) : h2.match(/../g)).map((x) => parseInt(x, 16));
    const hex = (v) => "#" + v.map((x) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, "0")).join("").toUpperCase();
    let shade;
    for (let k = 1; k <= 60 && !shade; k++) {
      const darker = hex(rgb.map((x) => x * (1 - k / 100)));
      const lighter = hex(rgb.map((x) => x + (255 - x) * (k / 100)));
      shade = best(darker) >= 4.5 ? darker : best(lighter) >= 4.5 ? lighter : void 0;
    }
    this.warn(
      pos,
      msg(`${q(accent[0])} (${accent[1]}) is the color of the buttons, and no text is easy to read on it (contrast ${ratio.toFixed(1)}, 4.5 is the minimum).`, `${q(accent[0])} (${accent[1]}) est la couleur des boutons, et aucun texte ne s'y lit bien (contraste ${ratio.toFixed(1)}, le minimum est 4,5).`),
      shade ? msg(`a shade next to it works: colors ${accent[0]} ${shade}`, `une teinte toute proche convient : colors ${accent[0]} ${shade}`) : msg("choose a darker or a lighter color for it.", "choisis pour elle une couleur plus fonc\xE9e ou plus claire.")
    );
  }
  /** The content files a list of entries comes from: posts, posts.sort(…).reverse(), a “let” made from them. */
  entriesOf(e2, s) {
    if (e2.k === "name") {
      const c = s.find(e2.name)?.content;
      return c && !c.entry ? c.source : void 0;
    }
    if (e2.k === "call" && e2.fn.k === "member" && ["sort", "reverse", "filter", "take", "unique", "shuffle"].includes(e2.fn.prop)) return this.entriesOf(e2.fn.object, s);
    return void 0;
  }
  /** Set while the values given to a method of such a list are read: its function receives an entry. */
  entry;
  /**
   * In a page, a style or a screen line belongs to the element it is written under. Directly in a loop or a
   * condition it has no element: most often it was meant for the element above it, one step to the right.
   */
  looseStyle(body, s, where) {
    let v = s;
    while (v && v.kind === "block") v = v.parent;
    if (!v?.isView()) return;
    for (const x of body) {
      if (x.k !== "command" || !["style", "mobile", "tablet", "desktop"].includes(x.head)) continue;
      if (x.children.some((e2) => e2.k !== "command" || e2.head !== "style")) continue;
      this.err(
        x.pos,
        where === "if" ? msg("this line styles nothing: it is in an \u201Cif\u201D, under no element.", "cette ligne ne change aucun aspect : elle est dans un \xAB si \xBB, sous aucun \xE9l\xE9ment.") : msg("this line styles nothing: it is in a \u201Cfor\u201D, under no element.", "cette ligne ne change aucun aspect : elle est dans un \xAB pour \xBB, sous aucun \xE9l\xE9ment."),
        msg("indent it under the element it is for (two more spaces), or write it on the line of that element.", "indente-la sous son \xE9l\xE9ment (deux espaces de plus), ou \xE9cris-la sur la ligne de cet \xE9l\xE9ment.")
      );
    }
  }
  /**
   * A word on an element line that is neither one of its options nor a name of the program. The answer, in order:
   * the Kaury form of a habit (font-size, onClick), an element written as an option, an option or a name that
   * looks like it, then the options that exist.
   */
  unknownOption(word, pos, c, optionHead, s, names) {
    const at = { ...pos, length: word.length };
    const habit = optionHabit(word);
    const element = canon(word);
    if (!habit && element && ELEMENTS[element]) {
      this.err(
        at,
        msg(`${q(word)} is an element, not an option of ${q(c.rawHead)}.`, `${q(word)} est un \xE9l\xE9ment, pas une option de ${q(c.rawHead)}.`),
        msg(`write it on its own line, indented below: ${ELEMENTS[element].example}`, `\xE9cris-le sur sa propre ligne, indent\xE9 dessous : ${ELEMENTS[element].example}`)
      );
      return;
    }
    const alone = c.head === "style" && canon(c.rawHead) !== "style" && c.rawHead === word;
    const styleLine = c.head === "style" && canon(c.rawHead) !== "style";
    const pool = styleLine ? styleWords() : allOptions(optionHead);
    const sug = closest(word, names ? [...pool, ...Object.keys(this.info.colors), ...this.namedStyles] : pool);
    const sugVar = names ? closest(word, s.all()) : void 0;
    const some = styleLine ? ["background", "color", "font", "size", "weight", "line-height", "tracking", "padding", "margin", "gap", "width", "radius", "border", "shadow"] : allOptions(optionHead).slice(0, 8);
    this.err(
      at,
      alone ? msg(`${q(word)} is neither an element, nor an option, nor one of your styles.`, `${q(word)} n'est ni un \xE9l\xE9ment, ni une option, ni un de tes styles.`) : styleLine ? msg(`${q(word)} is neither an option nor one of your styles.`, `${q(word)} n'est ni une option, ni un de tes styles.`) : msg(`${q(word)} is neither an option of ${q(c.rawHead)} nor a known name.`, `${q(word)} n'est ni une option de ${q(c.rawHead)}, ni un nom connu.`),
      habit ?? (sug ? msg(`did you mean ${q(sug)}?`, `tu voulais dire ${q(sug)} ?`) : sugVar ? msg(`did you mean the variable ${q(sugVar)}?`, `tu voulais dire la variable ${q(sugVar)} ?`) : msg(`possible options: ${some.join(", ")}\u2026`, `options possibles : ${some.join(", ")}\u2026`))
    );
  }
  /** Files named on the line (the picture of an image, a background, a 3D model, a sound…): kept for the build, which checks they exist. */
  noteFiles(c) {
    const m = c.meaning;
    const note = (e2) => {
      const path = staticText(e2);
      if (e2 && path && MEDIA_FILE.test(path) && !/^([a-z][a-z0-9+.-]*:|\/\/)/i.test(path)) this.info.files.push({ path, pos: e2.pos });
    };
    if (["image", "video", "logo", "object", "character", "sound", "favicon"].includes(c.head)) note(m.positional[0]);
    for (const o2 of m.options) {
      if (o2.name === "fallback" || o2.name === "background" || o2.name === "hover:background" || o2.name === "image" && c.head === "seo") note(o2.values[0]);
    }
  }
  /** “text add 1, 2” would show the code of the function in the page: a function is called with parentheses. */
  checkShownFunction(c, positional) {
    const first = positional[0];
    if (!CONTENT_HEADS.has(c.head) || first?.k !== "name" || first !== c.items[0]?.atoms[0]) return;
    const b = first.binding;
    if (!b || !(b.kind === "function" || b.kind === "kaury" && b.name in KAURY_FUNCTIONS)) return;
    const show = (e2) => e2.k === "number" ? `${e2.v}${e2.unit ?? ""}` : e2.k === "name" ? e2.name : e2.k === "bool" ? String(e2.v) : e2.k === "text" && e2.parts.every((m) => typeof m === "string") ? JSON.stringify(e2.parts.join("")) : "\u2026";
    this.err(
      { ...first.pos, length: first.name.length },
      msg(`${q(first.name)} is a function: it is called with parentheses, or the page would show its code.`, `${q(first.name)} est une fonction : elle s'appelle avec des parenth\xE8ses, sinon la page afficherait son code.`),
      `${c.rawHead} ${first.name}(${positional.slice(1).map(show).join(", ")})`
    );
  }
  /** background and color written together and too close to be read: said at once. */
  checkContrast(options, pos) {
    const hex = (name) => {
      const o2 = options.find((x) => x.name === name);
      const v = o2?.values[0] ? literal(o2.values[0], this.info.colors) : void 0;
      const h2 = typeof v === "string" ? hexOf(v, this.info.colors) : void 0;
      return h2 && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(h2) ? h2 : void 0;
    };
    const bg = hex("background");
    const fg = hex("color");
    if (!bg || !fg) return;
    const ratio = contrast(bg, fg);
    if (ratio < 3) {
      this.warn(
        pos,
        msg(`this text is hard to read on its background (contrast ${ratio.toFixed(1)}, 4.5 is the usual minimum).`, `ce texte se lit mal sur son fond (contraste ${ratio.toFixed(1)}, le minimum habituel est 4,5).`),
        msg("choose a lighter or a darker color; without \u201Ccolor\u201D, Kaury picks a readable one by itself.", "choisis une couleur plus claire ou plus fonc\xE9e ; sans \xAB couleur \xBB, Kaury en choisit une lisible tout seul.")
      );
    }
  }
  /** Does this option value depend on the program (a variable, a calculation), or is it written as it is? */
  computed(e2) {
    switch (e2.k) {
      case "number":
      case "color":
      case "bool":
      case "none":
        return false;
      case "text":
        return e2.parts.some((m) => typeof m !== "string");
      case "name":
        return !!e2.binding && e2.binding.kind !== "kaury" && e2.binding.kind !== "js";
      case "unary":
        return !(e2.op === "-" && e2.e.k === "number");
      case "binary":
        return !(e2.op === "-" && e2.l.k === "name" && e2.r.k === "number" && !!this.info.colors[`${e2.l.name}-${e2.r.v}`]);
      default:
        return true;
    }
  }
  checkValue(x, s) {
    if (x.k === "name" && !s.find(x.name) && !kauryGlobal(x.name) && !JS_GLOBALS.has(x.name)) return;
    if (x.k === "binary" && x.op === "-" && x.l.k === "name" && x.r.k === "number" && !s.find(x.l.name) && this.info.colors[`${x.l.name}-${x.r.v}`]) return;
    this.expr(x, s);
  }
  checkOption(head, opt, values, pos) {
    const spec = optionSpec(head, opt);
    if (!spec || spec.args === "*" || spec.args === "e?") return;
    const required = spec.args.replace(/.\?/g, "").length;
    const max = spec.args.replace(/\?/g, "").length;
    if (values.length < required) {
      this.err(
        pos,
        msg(`${q(opt)} expects ${required === 1 ? "a value" : `${required} values`}.`, `${q(opt)} attend ${required === 1 ? "une valeur" : `${required} valeurs`}.`),
        CONTENT_HEADS.has(head) ? msg(`${q(opt)} is an option of ${q(head)}: the content comes first, then the options \u2192 ${head} "\u2026", ${spec.example}`, `${q(opt)} est une option de ${q(head)} : le contenu d'abord, puis les options \u2192 ${head} "\u2026", ${spec.example}`) : msg(`${spec.example}   (if ${q(opt)} is your variable, write (${opt}))`, `${spec.example}   (si c'est ta variable ${q(opt)}, \xE9cris (${opt}))`)
      );
    } else if (values.length > max && max === 0) {
      this.err(
        pos,
        msg(`${q(opt)} is written alone, without a value.`, `${q(opt)} s'\xE9crit seul, sans valeur.`),
        msg(`${spec.example}   (to make it depend on something, put the line under an \u201Cif\u201D)`, `${spec.example}   (pour qu'il d\xE9pende de quelque chose, place la ligne sous un \xAB si \xBB)`)
      );
    } else if (values.length > max && spec.args !== "e" && values[max - 1]?.k === "number" && values[max].k === "name" && UNIT_WORDS.has(values[max].name)) {
      const n = values[max - 1];
      const unit = values[max].name;
      this.err(
        pos,
        msg("the unit is glued to the number, without a space.", "l'unit\xE9 se colle au nombre, sans espace."),
        msg(`${opt} ${n.v}${unit}   (a number alone is in pixels: ${opt} ${n.v})`, `${opt} ${n.v}${unit}   (un nombre seul est en pixels : ${opt} ${n.v})`)
      );
    } else if (values.length > max && spec.args !== "e") {
      this.err(
        pos,
        msg(`${q(opt)} takes at most ${max === 1 ? "one value" : `${max} values`}.`, `${q(opt)} prend au plus ${max === 1 ? "une valeur" : `${max} valeurs`}.`),
        msg(`separate the options with commas: ${spec.example}`, `s\xE9pare les options par des virgules : ${spec.example}`)
      );
    }
    if (/^[nc?]*c[nc?]*$/.test(spec.args)) {
      for (const v of values) {
        if (v.k !== "name" || v.binding || this.info.colors[v.name] || knownColor(v.name) || CSS_COLORS.has(v.name.toLowerCase()) || CSS_SIZES.has(v.name)) continue;
        const hex = /^([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(v.name);
        const sug = closest(v.name, [...Object.keys(this.info.colors), ...Object.keys(COLORS)]);
        this.err(
          { ...v.pos, length: v.name.length },
          msg(`${q(v.name)} is not a color Kaury knows.`, `${q(v.name)} n'est pas une couleur que Kaury conna\xEEt.`),
          hex ? msg(`a color code starts with \u201C#\u201D: ${opt} #${v.name}`, `un code de couleur commence par \xAB # \xBB : ${opt} #${v.name}`) : sug ? msg(`did you mean ${q(sug)}?`, `tu voulais dire ${q(sug)} ?`) : msg(`write its code (${opt} #40E0D0), or name it once in the site: colors ${v.name} #40E0D0`, `\xE9cris son code (${opt} #40E0D0), ou nomme-la une fois dans le site : colors ${v.name} #40E0D0`)
        );
      }
    }
    if (/^(n\??)+$/.test(spec.args)) {
      for (const v of values) {
        const word = v.k === "name" && !v.binding ? v.name : v.k === "text" && v.parts.length === 1 && typeof v.parts[0] === "string" && !/\d/.test(v.parts[0]) ? v.parts[0] : void 0;
        if (word === void 0 || CSS_SIZES.has(word)) continue;
        this.err(
          { ...v.pos, length: v.k === "name" ? word.length : word.length + 2 },
          msg(`${q(opt)} expects a number, not ${q(word)}.`, `${q(opt)} attend un nombre, pas ${q(word)}.`),
          msg(`${spec.example}   (a number, or a number with its unit: 50%, 2rem, 100vh)`, `${spec.example}   (un nombre, ou un nombre avec son unit\xE9 : 50%, 2rem, 100vh)`)
        );
      }
    }
    const v0 = values[0];
    const said = v0?.k === "name" ? canonValue(v0.name) === "smooth" && spec.words?.includes("soft") ? "soft" : canonValue(v0.name) : "";
    if (spec.words && v0?.k === "name" && !spec.words.includes(said)) {
      const sug = closest(v0.name, spec.words);
      this.err(
        pos,
        msg(`${q(opt)} does not accept ${q(v0.name)}.`, `${q(opt)} n'accepte pas ${q(v0.name)}.`),
        sug ? msg(`did you mean \u201C${opt} ${sug}\u201D?`, `tu voulais dire \xAB ${opt} ${sug} \xBB ?`) : msg(`possible values: ${spec.words.join(", ")}`, `valeurs possibles : ${spec.words.join(", ")}`)
      );
    }
  }
  checkCommand(c, parent) {
    const m = c.meaning;
    const n = m.positional.length;
    const word = (e2) => e2?.k === "name" ? canonValue(e2.name) : void 0;
    switch (c.head) {
      case "image":
      case "video":
        if (!n) this.err(c.pos, msg(`${q(c.rawHead)} needs its file.`, `${q(c.rawHead)} a besoin de son fichier.`), `${c.rawHead} "photo.jpg"`);
        else if (c.head === "image" && n === 1 && !m.options.some((o2) => o2.name === "alt")) {
          this.warn(
            c.pos,
            msg("this image has no description (for people who cannot see it, and for Google).", "cette image n'a pas de description (pour les personnes qui ne la voient pas, et pour Google)."),
            msg('image "photo.jpg", "What it shows"   (write "" when it is only decoration)', `image "photo.jpg", "Ce qu'elle montre"   (\xE9cris "" quand elle n'est que d\xE9corative)`)
          );
        }
        break;
      case "lang":
      case "url":
      case "favicon":
      case "font":
      case "fonts":
        if (!n) {
          this.err(
            c.pos,
            msg(`${q(c.rawHead)} needs its value.`, `${q(c.rawHead)} a besoin de sa valeur.`),
            c.head === "lang" ? `${c.rawHead} "en"` : c.head === "url" ? `${c.rawHead} "https://example.com"` : c.head === "favicon" ? `${c.rawHead} "icon.svg"` : `${c.rawHead} "Satoshi"`
          );
        }
        break;
      case "link":
        if (!n) this.err(c.pos, msg("\u201Clink\u201D needs a text and an address.", "\xAB lien \xBB a besoin d'un texte et d'une adresse."), 'link "Contact" "/contact"');
        break;
      case "object":
      case "character": {
        if (!n) this.err(c.pos, msg(`${q(c.rawHead)} needs its file.`, `${q(c.rawHead)} a besoin de son fichier.`), `${c.rawHead} can "crush.glb"`);
        const src = m.positional[0];
        if (src?.k === "text" && src.parts.length === 1 && typeof src.parts[0] === "string") {
          const f = src.parts[0].toLowerCase();
          if (/\.(glb|gltf)(\?|$)/.test(f) && !m.options.some((o2) => o2.name === "alt" || o2.name === "fallback")) {
            this.warn(
              c.pos,
              msg("this 3D object has no description and no fallback image: a device that cannot show 3D shows nothing.", "cet objet 3D n'a ni description ni image de repli : un appareil qui n'affiche pas la 3D ne montre rien."),
              msg(`${c.rawHead} can "crush.glb", alt "A can of soda", fallback "can.png"`, `${c.rawHead} canette "crush.glb", alt "Une canette", fallback "canette.png"`)
            );
          }
          if (/\.(glb|gltf)(\?|$)/.test(f) || /^(sphere|cube|torus|knot|cone|cylinder|capsule|gem|pyramid|tore|noeud|cylindre|gemme|pyramide)$/.test(f)) this.info.threeD = true;
          else if (/\.(json|lottie)(\?|$)/.test(f)) this.info.lottie = true;
          else if (!/\.(png|jpe?g|webp|avif|gif|svg)(\?|$)/.test(f)) {
            this.err(
              src.pos,
              msg(`unknown file format for ${q(c.rawHead)}.`, `format de fichier non reconnu pour ${q(c.rawHead)}.`),
              msg("accepted: a shape (sphere, cube, torus, knot, cone, cylinder, capsule, gem, pyramid), .glb, .gltf (3D), .png, .jpg, .webp, .svg (2D), .json (Lottie).", "accept\xE9s : une forme (sphere, cube, tore, noeud, cone, cylindre, capsule, gemme, pyramide), .glb, .gltf (3D), .png, .jpg, .webp, .svg (2D), .json (Lottie).")
            );
          }
        } else if (src) this.info.threeD = true;
        break;
      }
      case "light": {
        const w = word(m.positional[0]);
        if (!w || !LIGHTS.includes(w)) {
          const sug = w ? closest(w, LIGHTS) : void 0;
          this.err(
            c.pos,
            msg(`unknown light${w ? ` ${q(w)}` : ""}.`, `lumi\xE8re inconnue${w ? ` ${q(w)}` : ""}.`),
            sug ? msg(`did you mean \u201Clight ${sug}\u201D?`, `tu voulais dire \xAB lumiere ${sug} \xBB ?`) : msg(`moods: ${LIGHTS.join(", ")}`, `ambiances : ${LIGHTS.join(", ")}`)
          );
        }
        break;
      }
      case "camera": {
        const words = m.positional.map((x) => x.k === "name" ? canon(x.name) ?? canonValue(x.name) : "").join("-");
        if (!CAMERAS.includes(words)) this.err(c.pos, msg(`unknown camera ${q(words || "\u2026")}.`, `cam\xE9ra inconnue ${q(words || "\u2026")}.`), msg(`modes: ${CAMERAS.join(", ").replace("follows-mouse", "follows mouse")}`, `modes : ${CAMERAS.join(", ")}`));
        break;
      }
      case "transition": {
        const w = word(m.positional[0]);
        if (!w || !TRANSITIONS.includes(w)) this.err(c.pos, msg(`unknown transition${w ? ` ${q(w)}` : ""}.`, `transition inconnue${w ? ` ${q(w)}` : ""}.`), `transitions: ${TRANSITIONS.join(", ")}`);
        break;
      }
      case "enters-from":
        if (!m.options.length && !m.positional.length) this.err(c.pos, msg("\u201Centers from\u201D expects a direction.", "\xAB entre depuis \xBB attend une direction."), "enters from left   (left, right, top, bottom, fade, zoom)");
        break;
      case "spin": {
        const v = m.positional[0];
        if (v && v.k === "name" && !v.binding) this.err(v.pos, msg("\u201Cspin\u201D expects a speed.", "\xAB tourne \xBB attend une vitesse."), "spin 20/s  /  spin on scroll");
        break;
      }
    }
    if (m.kind === "event" && !c.action) {
      this.err(c.pos, msg(`${q(c.head.replace("-", " "))} must be followed by an action with \u201C->\u201D.`, `${q(c.rawHead)} doit \xEAtre suivi d'une action avec \xAB -> \xBB.`), "on click -> jump");
    }
    if ((m.kind === "style" || m.kind === "screen") && !parent && c.children.length === 0 && m.options.length === 0) {
      this.err(c.pos, msg(`empty ${q(c.rawHead)}.`, `${q(c.rawHead)} vide.`), "style background cream, radius 12");
    }
  }
  children(c, s) {
    if (c.action) {
      const a = new Scope("action", s);
      this.hoist(c.action, a);
      this.statements(c.action, a);
    }
    if (c.children.length) {
      const b = new Scope("block", s);
      this.hoist(c.children, b);
      for (const e2 of c.children) {
        if (e2.k === "command") this.command(e2, b, c.head);
        else this.statement(e2, b);
      }
    }
  }
};

// src/core/codegen.ts
var JS_RESERVED = /* @__PURE__ */ new Set([
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
function jsName(n) {
  let s = n.replace(/-/g, "$");
  if (JS_RESERVED.has(s) || s.startsWith("$k")) s = s + "$";
  return s;
}
var jsKey = (k) => /^[\p{L}_$][\p{L}\p{N}_$]*$/u.test(k) ? k : JSON.stringify(k);
function generate(prog, info, options = {}) {
  return new Generator(info, options.file ?? "site.kaury").module(prog, options.runtime ?? "kaury/runtime");
}
function assetPath(s) {
  if (/^(\/|[a-z][a-z0-9+.-]*:|#|\.\.\/)/i.test(s)) return s;
  return "/" + s.replace(/^\.\//, "");
}
var NON_STYLE = /* @__PURE__ */ new Set([
  "level",
  "alt",
  "cover",
  "loop",
  "muted",
  "autoplay",
  "controls",
  "to",
  "outline",
  "ghost",
  "large",
  "small",
  "disabled",
  "new-tab",
  "type",
  "required",
  "label",
  "rows",
  "image",
  "position",
  "rotation",
  "fallback",
  "shadows",
  "fog",
  "ground",
  "particles",
  "distance",
  "volume",
  "animation",
  "immediate",
  "class",
  "look",
  "look-if",
  "tag",
  "attr",
  "id",
  "html",
  "selected",
  "current",
  "open"
]);
var TEXT_HEADS2 = /* @__PURE__ */ new Set(["title", "subtitle", "text", "link", "icon", "item"]);
var ELEMENT_SELECTOR = {
  header: ".k-section-header,.k-header",
  emphasis: "em",
  links: ".k-links",
  link: ".k-link"
};
var PART_SELECTOR = {
  title: ".k-title,h1,h2,h3,h4",
  subtitle: ".k-subtitle",
  text: ".k-text,p",
  link: "a:not(.k-logo,.k-button)",
  image: "img",
  button: ".k-button",
  icon: ".k-icon",
  code: ":not(pre)>code",
  block: "pre",
  list: "ul,ol",
  item: "li",
  table: "table",
  cell: "th,td",
  quote: "blockquote",
  summary: "summary",
  emphasis: "em",
  logo: ".k-logo",
  field: ".k-field,.k-textarea,.k-select",
  label: ".k-label"
};
var STATE_SELECTOR = {
  // selected: a tab in a list of tabs (aria-selected), or a button that is on (aria-pressed) — see the tabs below
  selected: ':is([aria-selected="true"],[aria-pressed="true"])',
  current: '[aria-current="page"]',
  open: "[open]",
  focus: ":focus-visible",
  pressed: ":active",
  disabled: ":disabled",
  checked: ":checked"
};
var MEDIA = {
  mobile: "@media (max-width: 640px)",
  tablet: "@media (min-width: 641px) and (max-width: 1024px)",
  desktop: "@media (min-width: 1025px)"
};
var Generator = class {
  // buttons with “selected” whose container is their list of tabs
  constructor(info, file) {
    this.info = info;
    let h2 = 0;
    for (const c of file) h2 = h2 * 31 + c.charCodeAt(0) >>> 0;
    this.prefix = "k" + (h2 % 46656).toString(36);
  }
  info;
  lines = [];
  sources = [];
  indent = 0;
  srcLine = 1;
  counter = 0;
  classes = 0;
  css = [];
  fonts = /* @__PURE__ */ new Set();
  assets = [];
  mails = [];
  ownPages = [];
  /** what each page and each component writes: the styles and animations named in it, the components it calls */
  parts = /* @__PURE__ */ new Map();
  /** Reads what was written since a line: the named styles (ks-, ka-) and the components called. */
  written(since) {
    const text = this.lines.slice(since).join("\n");
    return {
      looks: new Set([...text.matchAll(/\bk[sa]-[\w-]+/g)].map((m) => m[0])),
      calls: new Set([...text.matchAll(/\$k\.component\([^,]+, ([\w$]+)/g)].map((m) => m[1]))
    };
  }
  /** The named styles a page can ever show: its own, and those of every component it calls, however deep. */
  reach(start) {
    const looks = new Set(start.looks);
    const seen = /* @__PURE__ */ new Set();
    const todo = [...start.calls];
    while (todo.length) {
      const name = todo.pop();
      if (seen.has(name)) continue;
      seen.add(name);
      const part = this.parts.get(name);
      if (!part) continue;
      part.looks.forEach((l) => looks.add(l));
      todo.push(...part.calls);
    }
    return [...looks];
  }
  site = {};
  prefix;
  declared = /* @__PURE__ */ new Set();
  imagesInPage = 0;
  /** The titles that come after the main heading of their page (or of their component): written as level 2. */
  laterTitles = /* @__PURE__ */ new WeakSet();
  /** Whether a component of this file brings a title of its own (Hero does). */
  titled = /* @__PURE__ */ new Map();
  components = /* @__PURE__ */ new Map();
  repeated = 0;
  // inside a component or a loop: the same line makes many images
  storing = 0;
  // on the left of an “=”: plain accesses (JavaScript refuses “a?.b = 1”)
  tabs = /* @__PURE__ */ new WeakSet();
  emit(code, pos) {
    if (pos) this.srcLine = pos.line;
    for (const l of code.split("\n")) {
      this.lines.push("  ".repeat(this.indent) + l);
      this.sources.push(this.srcLine);
    }
  }
  fresh(base = "n") {
    return `$${base}${++this.counter}`;
  }
  module(prog, runtime) {
    this.emit(`import * as $k from ${JSON.stringify(runtime)}`);
    for (const i of prog) if (i.k === "import") this.importStmt(i);
    const vars = Object.entries(this.info.colors).map(([n, c]) => `--k-${n}:${c}`);
    if (vars.length) this.css.push(`:root{${vars.join(";")}}`);
    const first = Object.keys(this.info.colors)[0];
    if (first && !this.info.colors.accent) this.css.push(`:root{--k-accent:var(--k-${first})}`);
    const accent = this.info.colors.accent ?? (first ? this.info.colors[first] : void 0);
    if (accent && accent.startsWith("#") && bestText(accent) !== "#fff") this.css.push(":root{--k-on-accent:#16151a}");
    const pages = [];
    let siteObj = "{}";
    this.implicitDeclarations(prog, true);
    for (const i of prog) if (i.k === "component") this.components.set(i.name, i.body);
    for (const name of this.components.keys()) this.bringsTitle(name);
    for (const i of prog) if (i.k === "page") this.mainHeading(i.body, false);
    for (const i of prog) {
      if (i.k === "import" || i.k === "command") continue;
      if (i.k === "page") {
        pages.push(this.page(i));
        continue;
      }
      if (i.k === "site") {
        siteObj = this.siteDecl(i);
        continue;
      }
      if (i.k === "translate") continue;
      if (i.k === "let" && this.info.languages.length && i.binding?.kind === "const" && holdsTranslation(i.value)) {
        i.binding.perLanguage = true;
        this.emit(`${i.exported ? "export " : ""}const ${jsName(i.name)} = $k.perLanguage(() => ${this.ex(i.value)})`, i.pos);
        continue;
      }
      this.statement(i, { view: false });
    }
    const loose = prog.filter((i) => i.k === "command");
    if (loose.length && !this.info.pages.some((p) => p.path === "/")) {
      this.mainHeading(loose, false);
      pages.push(this.page({ k: "page", path: "/", body: loose, pos: loose[0].pos }));
    }
    this.emit(`export const $pages = [${pages.join(", ")}]`);
    this.emit(`export const $site = ${siteObj}`);
    this.emit(`export const $immersion = ${JSON.stringify({ threeD: this.info.threeD, lottie: this.info.lottie, active: this.info.immersion })}`);
    const css = this.css.join("\n");
    this.emit(`export const $css = ${JSON.stringify(css)}`);
    this.emit(`export const $fonts = ${JSON.stringify([...this.fonts])}`);
    return {
      js: this.lines.join("\n"),
      css,
      map: this.sources.map((s, g2) => ({ generated: g2 + 1, source: s })),
      fonts: [...this.fonts],
      site: this.site,
      assets: this.assets,
      mails: this.mails,
      // (a page is written before the components that come after it in the file: what it reaches is read at the end)
      own: {
        prefix: this.prefix,
        pages: this.ownPages.map((p) => ({ ...p, looks: this.reach(this.parts.get("page " + p.path) ?? { looks: /* @__PURE__ */ new Set(), calls: /* @__PURE__ */ new Set() }) })),
        named: [...new Set([...this.parts.values()].flatMap((p) => [...p.looks]))]
      }
    };
  }
  /**
   * One main heading per page. “title” is written for every part of a page, and only one of them is its subject, for
   * a screen reader and for a search engine: the first title sure to be there is the <h1>, the next ones are <h2>
   * (“level” on the line decides otherwise). A title that shows in one case only (a menu that opens) takes no place,
   * and the sides of a choice are one place. Returns whether a main heading is sure to be there after these lines.
   */
  mainHeading(body, seen) {
    for (const s of body) {
      if (s.k === "command") {
        const m = s.meaning;
        if (m?.kind === "component") {
          if (this.bringsTitle(s.head)) seen = true;
        } else if (s.head === "dialog") {
          this.mainHeading(s.children, true);
          continue;
        } else if (s.head === "markdown") {
          if (seen) this.laterTitles.add(s);
        } else if (s.head === "title" && !m?.options.some((o2) => o2.name === "tag")) {
          const level = m?.options.find((o2) => o2.name === "level")?.values[0];
          if (level) {
            if (level.k === "number" && level.v === 1) seen = true;
          } else if (seen) this.laterTitles.add(s);
          else seen = true;
        }
        seen = this.mainHeading(s.children, seen);
      } else if (s.k === "if") {
        const sides = [s.then, ...s.elifs.map((x) => x.body), s.else ?? []].map((side) => this.mainHeading(side, seen));
        seen = sides.every(Boolean);
      } else if (s.k === "for") seen = this.mainHeading(s.body, seen);
    }
    return seen;
  }
  bringsTitle(name) {
    const known = this.titled.get(name);
    if (known !== void 0) return known;
    const body = this.components.get(name);
    if (!body) return false;
    this.titled.set(name, false);
    const brings = this.mainHeading(body, false);
    this.titled.set(name, brings);
    return brings;
  }
  importStmt(i) {
    const parts = [];
    if (i.default) parts.push(jsName(i.default));
    if (i.names) parts.push(`{ ${i.names.map((n) => n.alias ? `${jsKey(n.name)} as ${jsName(n.alias)}` : jsName(n.name)).join(", ")} }`);
    if (i.all) parts.push(`* as ${jsName(i.all)}`);
    if (!parts.length && /\.(css|js|mjs|ts)$/.test(i.source)) {
      this.assets.push(i.source);
      return;
    }
    if (i.source.endsWith(".kaury") && i.default && new RegExp("^\\p{Lu}", "u").test(i.default) && !i.names) {
      this.emit(`import { ${jsName(i.default)} } from ${JSON.stringify(i.source)}`, i.pos);
      return;
    }
    this.emit(parts.length ? `import ${parts.join(", ")} from ${JSON.stringify(i.source)}` : `import ${JSON.stringify(i.source)}`, i.pos);
  }
  // ---------------------------------------------------------------- site
  siteDecl(i) {
    const props = [];
    if (i.name) {
      props.push(`name: ${this.ex(i.name)}`);
      const l = literal(i.name, {});
      if (typeof l === "string") this.site.name = l;
    }
    const rules = [];
    for (const c of i.body) {
      if (c.k !== "command" || !c.meaning) continue;
      const p0 = c.meaning.positional;
      switch (c.head) {
        case "font":
        case "fonts": {
          const names = p0.map((x) => literal(x, {})).filter((x) => typeof x === "string");
          names.forEach((n) => this.fonts.add(n));
          if (names[0]) this.css.push(`:root{--k-font:${fontFamily(names[0])}}`);
          if (names[1]) this.css.push(`:root{--k-font-titles:${fontFamily(names[1])}}`);
          break;
        }
        case "lang":
          props.push(`lang: ${this.ex(p0[0])}`);
          this.site.lang = String(literal(p0[0], {}) ?? "en");
          if (this.info.languages.length) props.push(`langs: ${JSON.stringify(this.info.languages)}`);
          break;
        case "url":
          props.push(`url: ${this.ex(p0[0])}`);
          break;
        case "favicon":
          props.push(`favicon: ${this.exPath(p0[0])}`);
          break;
        case "base": {
          const v = p0[0];
          this.site.base = v?.k === "none" ? "none" : String(v?.k === "name" ? v.name : literal(v, {}) ?? "default");
          break;
        }
        case "head":
          props.push(`head: [${p0.map((x) => this.ex(x)).join(", ")}].join("")`);
          break;
        case "seo":
          props.push(`seo: ${this.seo(c)}`);
          break;
        case "transition":
          props.push(`transition: ${JSON.stringify(String(literal(p0[0], {}) ?? "fade"))}`);
          break;
        case "style":
        case "mobile":
        case "tablet":
        case "desktop":
          rules.push(c);
          break;
      }
    }
    if (rules.length) {
      const THEME = { radius: "--k-radius", "max-width": "--k-width", gap: "--k-gap" };
      for (const r of rules) {
        if (!r.meaning) continue;
        r.meaning.options = r.meaning.options.filter((o2) => {
          const v = THEME[o2.name] ? literal(o2.values[0], this.info.colors) : void 0;
          if (v === void 0) return true;
          this.css.push(`:root{${THEME[o2.name]}:${typeof v === "number" ? v + "px" : v}}`);
          if (o2.name === "radius") this.css.push(`:root{--k-button-radius:${typeof v === "number" ? v + "px" : v}}`);
          return false;
        });
      }
      this.styleRules("body", "site", rules);
      for (const r of rules) {
        if (r.head !== "style") continue;
        for (const o2 of r.meaning.options) {
          const v = literal(o2.values[0], this.info.colors);
          if (v === void 0) continue;
          if (o2.name === "background" || o2.name === "tint") {
            this.css.push(`:root{--k-bg:${v}}`);
            const hex = hexOf(String(v), this.info.colors);
            if (hex && !isLight(hex)) this.css.push(":root{--k-line:rgba(255,255,255,.12);--k-muted:rgba(255,255,255,.72);color-scheme:dark}");
          }
          if (o2.name === "color") this.css.push(v === "var(--k-ink)" ? ":root{--k-text:var(--k-ink)}" : `:root{--k-text:${v};--k-ink:${v}}`);
        }
      }
    }
    return `{ ${props.join(", ")} }`;
  }
  seo(c) {
    const p = c.meaning.positional;
    const props = [];
    if (p[0]) props.push(`title: ${this.ex(p[0])}`);
    if (p[1]) props.push(`description: ${this.ex(p[1])}`);
    const img = c.meaning.options.find((o2) => o2.name === "image");
    if (img?.values[0]) props.push(`image: ${this.exPath(img.values[0])}`);
    return `{ ${props.join(", ")} }`;
  }
  // ---------------------------------------------------------------- pages
  page(i) {
    const fn = this.fresh("page");
    const firstClass = this.classes + 1;
    const firstLine = this.lines.length;
    const params = [...i.path.matchAll(/:([\p{L}_][\p{L}\p{N}_-]*)/gu)].map((m) => m[1]);
    this.imagesInPage = 0;
    const item = i.each ? `const ${jsName(i.each.variable)} = $route.item` : "";
    this.emit(`function ${fn}($route, $root) {`, i.pos);
    this.indent++;
    for (const p of params) this.emit(`const ${jsName(p)} = $route.params[${JSON.stringify(p)}]`);
    if (item) this.emit(item);
    const root = this.fresh("page");
    let rootTag = "main";
    let rootClass = "k-page";
    const wrap = i.body.find((x) => x.k === "command" && x.head === "wrapper");
    if (wrap) {
      const [t, c] = wrap.meaning.positional.map((x) => literal(x, {}));
      if (typeof t === "string" && /^[a-z][a-z0-9-]*$/.test(t)) rootTag = t;
      const w0 = wrap.meaning.positional[0];
      if (w0?.k === "none" || w0?.k === "name" && canonValue(w0.name) === "none") rootTag = "";
      if (typeof c === "string") rootClass = c;
    }
    if (rootTag) this.emit(`const ${root} = $k.h($root, ${JSON.stringify(rootTag)}, ${JSON.stringify(rootClass)})`);
    else this.emit(`const ${root} = $root`);
    let head = "null";
    let seo = "null";
    let transition = "null";
    let lang = "null";
    let alternates = "null";
    const body = i.body.filter((x) => {
      if (x.k === "command" && x.head === "seo") {
        seo = this.seo(x);
        return false;
      }
      if (x.k === "command" && x.head === "transition") {
        transition = JSON.stringify(String(literal(x.meaning.positional[0], {}) ?? "fade"));
        return false;
      }
      if (x.k === "command" && x.head === "lang") {
        lang = this.ex(x.meaning.positional[0]);
        return false;
      }
      if (x.k === "command" && x.head === "wrapper") return false;
      if (x.k === "command" && x.head === "head") {
        head = `[${x.meaning.positional.map((a) => this.ex(a)).join(", ")}].join("")`;
        return false;
      }
      if (x.k === "command" && x.head === "alternate") {
        const pairs = x.items.map((it) => `[${it.atoms.map((a) => this.ex(a)).join(", ")}]`);
        alternates = `[${pairs.join(", ")}]`;
        return false;
      }
      return true;
    });
    this.content(body, { view: true, parent: root, target: root, parentHead: "page" }, "page");
    this.emit(`return ${root}`);
    this.indent--;
    this.emit("}");
    const prelude = [...params.map((p) => `const ${jsName(p)} = $route.params[${JSON.stringify(p)}];`), item ? item + ";" : ""].join(" ");
    const each = i.each ? `, each: () => ${this.ex(i.each.source)}, pathOf: (${jsName(i.each.variable)}) => ${this.ex(i.address)}` : "";
    this.ownPages.push({ path: i.path, from: firstClass, to: this.classes, looks: [] });
    this.parts.set("page " + i.path, this.written(firstLine));
    const langs = this.info.languages;
    if (langs.length && i.path !== "/404") {
      return langs.map((l, j) => {
        const eachJ = i.each ? `, each: () => ${this.ex(i.each.source)}, pathOf: (${jsName(i.each.variable)}) => ${j ? `${JSON.stringify("/" + l)} + ` : ""}${this.ex(i.address)}` : "";
        const langJ = lang === "null" ? JSON.stringify(l) : lang;
        const altJ = alternates === "null" ? "$k.alternates($route.path)" : alternates;
        return `{ path: ${JSON.stringify(pathIn(i.path, l, j === 0))}${eachJ}, render: ${fn}, seo: ($route) => { ${prelude} return ${seo} }, lang: ($route) => { ${prelude} return ${langJ} }, alternates: ($route) => { ${prelude} return ${altJ} }, head: ($route) => { ${prelude} return ${head} }, transition: ${transition} }`;
      }).join(", ");
    }
    return `{ path: ${JSON.stringify(i.path)}${each}, render: ${fn}, seo: ($route) => { ${prelude} return ${seo} }, lang: ($route) => { ${prelude} return ${lang} }, alternates: ($route) => { ${prelude} return ${alternates} }, head: ($route) => { ${prelude} return ${head} }, transition: ${transition} }`;
  }
  /** Declares at the top of a scope the states/variables created by “x = …” without let/state. */
  implicitDeclarations(body, view) {
    const walk = (list) => {
      for (const i of list) {
        if (i.k === "assign" && i.declares && !this.declared.has(i.declares)) {
          this.declared.add(i.declares);
          const n = jsName(i.declares.name);
          if (i.declares.kind === "state") this.emit(`const ${n} = $k.state(null)`, i.pos);
          else this.emit(`let ${n}`, i.pos);
        }
        if (i.k === "toggle" && i.declares && !this.declared.has(i.declares)) {
          this.declared.add(i.declares);
          this.emit(`const ${jsName(i.declares.name)} = $k.state(false)`, i.pos);
        }
        if (i.k === "if") {
          walk(i.then);
          i.elifs.forEach((x) => walk(x.body));
          if (i.else) walk(i.else);
        } else if (i.k === "for" || i.k === "while") walk(i.body);
        else if (i.k === "try") {
          walk(i.body);
          if (i.handler) walk(i.handler);
        } else if (i.k === "command" && view) {
          walk(i.children);
          if (i.action) walk(i.action);
          if (["field", "textarea", "select", "checkbox"].includes(i.head)) {
            const a0 = i.meaning?.positional[0];
            if (a0?.k === "name" && a0.binding && !this.declared.has(a0.binding) && a0.binding.pos === i.items[0]?.pos) {
              this.declared.add(a0.binding);
              this.emit(`const ${jsName(a0.name)} = $k.state(${i.head === "checkbox" ? "false" : '""'})`, i.pos);
            }
          }
        }
      }
    };
    walk(body);
  }
  localDeclarations(body) {
    const walk = (list) => {
      for (const i of list) {
        if (i.k === "assign" && i.declares && i.declares.kind === "variable" && !this.declared.has(i.declares)) {
          this.declared.add(i.declares);
          this.emit(`let ${jsName(i.declares.name)}`, i.pos);
        }
        if (i.k === "if") {
          walk(i.then);
          i.elifs.forEach((x) => walk(x.body));
          if (i.else) walk(i.else);
        } else if (i.k === "for" || i.k === "while") walk(i.body);
        else if (i.k === "try") {
          walk(i.body);
          if (i.handler) walk(i.handler);
        }
      }
    };
    walk(body);
  }
  // ---------------------------------------------------------------- statements (logic)
  block(body, ctx, returnLast = false) {
    if (!ctx.view) this.localDeclarations(body);
    body.forEach((i, n) => {
      if (returnLast && n === body.length - 1 && i.k === "expr") this.emit(`return ${this.ex(i.e)}`, i.pos);
      else this.statement(i, ctx);
    });
  }
  statement(i, ctx) {
    this.srcLine = i.pos.line;
    switch (i.k) {
      case "let": {
        const n = jsName(i.name);
        const ex = i.exported ? "export " : "";
        const kind = i.binding?.kind;
        if (kind === "state") this.emit(`${ex}const ${n} = $k.state(${this.ex(i.value)})`, i.pos);
        else if (kind === "derived") this.emit(`${ex}const ${n} = $k.derived(() => (${this.ex(i.value)}))`, i.pos);
        else this.emit(`${ex}const ${n} = ${this.ex(i.value)}`, i.pos);
        return;
      }
      case "assign": {
        const val = this.ex(i.value);
        const target = this.target(i.target);
        if (hasAwait(i.value) && ctx.view) {
          this.emit(`;(async () => { try { ${target} ${i.op} ${val} } catch ($e) { $k.report($e) } })()`, i.pos);
        } else this.emit(`${target} ${i.op} ${val}`, i.pos);
        return;
      }
      case "function": {
        const asy = bodyHasAwait(i.body) ? "async " : "";
        const ex = i.exported ? "export " : "";
        this.emit(`${ex}${asy}function ${jsName(i.name)}(${i.params.map((p) => jsName(p.name) + (p.default ? ` = ${this.ex(p.default)}` : "")).join(", ")}) {`, i.pos);
        this.indent++;
        this.block(i.body, { view: false }, true);
        this.indent--;
        this.emit("}");
        return;
      }
      case "if": {
        if (ctx.view) return this.ifView(i, ctx);
        this.emit(`if (${this.ex(i.cond)}) {`, i.pos);
        this.indent++;
        this.block(i.then, ctx);
        this.indent--;
        for (const x of i.elifs) {
          this.emit(`} else if (${this.ex(x.cond)}) {`, x.pos);
          this.indent++;
          this.block(x.body, ctx);
          this.indent--;
        }
        if (i.else) {
          this.emit("} else {");
          this.indent++;
          this.block(i.else, ctx);
          this.indent--;
        }
        this.emit("}");
        return;
      }
      case "for": {
        if (ctx.view) return this.forView(i, ctx);
        const v = jsName(i.variable);
        if (i.index) this.emit(`for (const [${jsName(i.index)}, ${v}] of $k.toList(${this.ex(i.source)}).entries()) {`, i.pos);
        else this.emit(`for (const ${v} of $k.toList(${this.ex(i.source)})) {`, i.pos);
        this.indent++;
        this.block(i.body, ctx);
        this.indent--;
        this.emit("}");
        return;
      }
      case "while":
        this.emit(`while (${this.ex(i.cond)}) {`, i.pos);
        this.indent++;
        this.block(i.body, ctx);
        this.indent--;
        this.emit("}");
        return;
      case "try":
        this.emit("try {", i.pos);
        this.indent++;
        this.block(i.body, ctx);
        this.indent--;
        this.emit(`} catch (${i.variable ? jsName(i.variable) : "$e"}) {`);
        this.indent++;
        if (i.handler) this.block(i.handler, ctx);
        this.indent--;
        this.emit("}");
        return;
      case "import":
      case "page":
      case "site":
        return;
      case "return":
        this.emit(i.value ? `return ${this.ex(i.value)}` : "return", i.pos);
        return;
      case "break":
        this.emit("break", i.pos);
        return;
      case "continue":
        this.emit("continue", i.pos);
        return;
      case "expr":
        if (ctx.view && hasAwait(i.e)) this.emit(`;(async () => { try { ${this.ex(i.e)} } catch ($e) { $k.report($e) } })()`, i.pos);
        else this.emit(this.ex(i.e), i.pos);
        return;
      case "toggle": {
        const t = this.target(i.target);
        const v = i.mode === "open" ? "true" : i.mode === "close" ? "false" : `!${t}`;
        this.emit(`${t} = ${v}`, i.pos);
        return;
      }
      case "go":
        this.emit(`$k.go(${this.ex(i.path)})`, i.pos);
        return;
      case "js":
        this.emit(i.code, i.pos);
        return;
      case "css":
        this.css.push(i.code);
        return;
      case "animation-def":
        this.animationDef(i);
        return;
      case "style-def":
        {
          const bases = (ELEMENT_SELECTOR[i.name] ?? (i.name in ELEMENTS ? `.k-${i.name}` : `.ks-${i.name}`)).split(",");
          const head = i.name in ELEMENTS ? i.name : "box";
          for (const r of i.rules) {
            const state = r.state ? STATE_SELECTOR[r.state] : "";
            const parts = r.part ? (PART_SELECTOR[r.part] ?? `.ks-${r.part}`).split(",") : [""];
            const own2 = !!r.part && !PART_SELECTOR[r.part];
            const sel = bases.map((b) => `${b}${state}${r.part ? own2 ? ` .ks-${r.part}` : ` :where(${parts.map((p) => p.trim()).join(",")})` : ""}`).join(",");
            const h2 = r.part ? r.part in ELEMENTS ? r.part : PART_SELECTOR[r.part] ? "text" : "box" : head;
            if (r.state || r.part) this.optionsToCss(sel, h2, r.meaning.options, r.head === "style" ? void 0 : MEDIA[r.head], []);
            else this.styleRules(sel, h2, [r]);
          }
        }
        return;
      case "component":
        return this.component(i);
      case "command":
        if (ctx.view) return this.commandView(i, ctx);
        return this.commandAction(i, ctx);
    }
  }
  target(e2) {
    if (e2.k === "name") {
      const b = e2.binding;
      if (b && (b.kind === "state" || b.kind === "derived")) return `${jsName(e2.name)}.v`;
      return jsName(e2.name);
    }
    this.storing++;
    try {
      return this.ex(e2);
    } finally {
      this.storing--;
    }
  }
  /**
   * Reading a property of an empty value gives nothing (“user.name” while “user” is none) instead of stopping
   * the page: data that has not arrived yet is the usual case, not a mistake. Values that are never empty
   * (Math, route, mouse…) keep the plain access.
   */
  dot(object, optional) {
    if (this.storing) return ".";
    if (optional) return "?.";
    return object.k === "name" && (object.binding?.kind === "js" || object.binding?.kind === "kaury") ? "." : "?.";
  }
  // ---------------------------------------------------------------- components
  component(i) {
    const ex = i.exported ? "export " : "";
    const firstLine = this.lines.length;
    this.emit(`${ex}function ${jsName(i.name)}($p = {}, $parent) {`, i.pos);
    this.indent++;
    for (const p of i.params) {
      if (p.default) this.emit(`if ($p[${JSON.stringify(p.name)}] === undefined) Object.defineProperty($p, ${JSON.stringify(p.name)}, { get: () => ${this.ex(p.default)} })`);
    }
    this.emit("const $start = $k.mark($parent)");
    this.repeated++;
    this.content(i.body, { view: true, parent: "$parent", target: void 0, parentHead: "component" }, "component");
    this.repeated--;
    this.emit("return $k.rootNodes($parent, $start)");
    this.indent--;
    this.emit("}");
    this.emit(`${jsName(i.name)}.$params = ${JSON.stringify(i.params.map((p) => p.name))}`);
    this.parts.set(jsName(i.name), this.written(firstLine));
  }
  // ---------------------------------------------------------------- UI
  /** Content of a UI block: settings applied to the parent, then children. */
  content(body, ctx, parentHead) {
    this.implicitDeclarations(body, true);
    for (const i of body) {
      if (i.k === "command" && i.meaning && (i.meaning.kind === "style" || i.meaning.kind === "screen")) {
        if (i.children.some((e2) => e2.k !== "command" || e2.head !== "style")) {
          const w = this.fresh();
          this.emit(`const ${w} = $k.h(${ctx.parent}, "div", "k-only-${i.head}")`, i.pos);
          this.content(i.children, { ...ctx, parent: w }, parentHead);
        }
        continue;
      }
      this.statement(i, ctx);
    }
    const rules = body.filter((i) => i.k === "command" && !!i.meaning && (i.meaning.kind === "style" || i.meaning.kind === "screen"));
    if (rules.length && ctx.parent) {
      const cls = this.newClass();
      const dynamic = this.styleRules("." + cls, parentHead, rules);
      for (const r of rules) {
        if (r.head !== "style") continue;
        for (const o2 of r.meaning.options) {
          const look = o2.name === "look" && o2.values[0]?.k === "text" ? literal(o2.values[0], {}) : void 0;
          if (typeof look !== "string") continue;
          if (parentHead === "component") this.emit(`$k.rootClass(${ctx.parent}, $start, ${JSON.stringify(look)})`);
          else this.emit(`${ctx.parent}.classList.add(${JSON.stringify(look)})`);
        }
      }
      if (parentHead === "component") {
        this.emit(`$k.rootClass(${ctx.parent}, $start, ${JSON.stringify(cls)})`);
        for (const d of dynamic) this.emit(`for (const $r of $k.rootNodes(${ctx.parent}, $start)) $k.style($r, ${JSON.stringify(d[0])}, () => ${d[1]})`);
      } else {
        this.emit(`${ctx.parent}.classList.add(${JSON.stringify(cls)})`);
        for (const d of dynamic) this.emit(`$k.style(${ctx.parent}, ${JSON.stringify(d[0])}, () => ${d[1]})`);
      }
    }
  }
  newClass() {
    return `${this.prefix}-${(++this.classes).toString(36)}`;
  }
  /** animation name, 2s, loop … + steps → @keyframes and a class .ka-name that plays it. */
  animationDef(i) {
    const steps = [];
    for (const f of i.frames) {
      const before = this.css.length;
      this.optionsToCss("@@", "box", f.meaning.options.filter((o2) => !o2.name.startsWith("hover:")), void 0, []);
      const decls = this.css.splice(before).map((r) => /^@@\{(.*)\}$/.exec(r)?.[1]).filter(Boolean);
      steps.push(`${f.state}{${decls.join(";")}}`);
    }
    let duration = "1s", delay = "", count = "1", ease = "cubic-bezier(.16,1,.3,1)", direction = "", onScroll = false;
    for (const it of i.options) {
      const vals = it.atoms.map((a) => literal(a, this.info.colors));
      const [w, x] = vals;
      if (typeof w === "string" && /^[\d.]+m?s$/.test(w)) duration = w;
      else if (w === "loop" || w === "boucle") count = "infinite";
      else if (w === "delay" || w === "delai") delay = String(x ?? "0s");
      else if (w === "linear" || w === "lineaire") ease = "linear";
      else if (w === "smooth" || w === "doux") ease = "ease-in-out";
      else if (w === "bounce" || w === "rebond") ease = "cubic-bezier(.34,1.56,.64,1)";
      else if (w === "steps" || w === "etapes") ease = `steps(${x ?? 10},end)`;
      else if (w === "alternate" || w === "aller-retour") direction = "alternate";
      else if (w === "times" || w === "fois") count = String(x ?? 1);
      else if (w === "scroll" || w === "defilement") onScroll = true;
      else if (typeof w === "number") count = String(w);
    }
    const anim = `ks-${i.name}`;
    this.css.push(`@keyframes ${anim}{${steps.join("")}}`);
    const rule = onScroll ? `animation:${anim} linear both;animation-timeline:view();animation-range:entry 0% cover 45%` : `animation:${anim} ${duration} ${ease} ${delay || "0s"} ${count} ${direction || "normal"} both`;
    this.css.push(`.ka-${i.name}{${rule}}`);
    this.css.push(`@media (prefers-reduced-motion:reduce){.ka-${i.name}{animation:none}}`);
  }
  /** style/mobile/… lines → CSS rules for a selector; returns the dynamic ones. */
  styleRules(selector, head, rules) {
    const dynamic = [];
    for (const r of rules) {
      const where = r.head === "style" ? void 0 : MEDIA[r.head];
      this.optionsToCss(selector, head, r.meaning.options, where, dynamic);
      for (const e2 of r.children) {
        if (e2.k === "command" && e2.meaning && (e2.meaning.kind === "screen" || e2.meaning.kind === "style")) {
          this.optionsToCss(selector, head, e2.meaning.options, e2.head === "style" ? where : MEDIA[e2.head], dynamic);
        }
      }
    }
    return dynamic;
  }
  optionsToCss(sel, head, options, media, dynamic) {
    const normal = [];
    const hover = [];
    const strong = [];
    const tr = [];
    const trHover = [];
    let explicitColor = false;
    const ownMargin = options.some((o2) => o2.name === "margin");
    const placed = options.some((o2) => o2.name === "pin" || o2.name === "sticky");
    const centered = options.some((o2) => o2.name === "center");
    for (const o2 of options) {
      const isHover = o2.name.startsWith("hover:");
      const name = isHover ? o2.name.slice(6) : o2.name;
      if (NON_STYLE.has(name) && !isHover) continue;
      const vals = o2.values.map((v) => literal(v, this.info.colors));
      if (vals.some((v) => v === void 0) && o2.values.length) {
        if (!isHover && !media) {
          const prop = DYNAMIC_PROP[name];
          if (prop) {
            const e2 = this.ex(o2.values[0]);
            dynamic.push([name === "tint" && !TEXT_HEADS2.has(head) ? "background" : prop, PX_UNIT.has(name) ? `$k.px(${e2})` : e2]);
          }
        }
        continue;
      }
      const { decl, transform, strong: isStrong } = declarations(head, name, vals, this.info.colors, !!media);
      if (name === "color") explicitColor = true;
      const into = isHover ? hover : isStrong ? strong : normal;
      for (const [p, v] of decl) {
        if (p === "margin-inline" && isStrong && ownMargin) continue;
        if (p === "position" && name === "front" && placed) continue;
        if (p === "align-items" && name === "direction" && centered) continue;
        if (p === "color" && explicitColor && name !== "color" && !isHover) continue;
        if (p === "font-family") {
          const m = /^"([^"]+)"/.exec(v);
          if (m) this.fonts.add(m[1]);
        }
        into.push(`${p}:${v}`);
      }
      if (transform) (isHover ? trHover : tr).push(transform);
    }
    if (tr.length) normal.push(`transform:${tr.join(" ")}`);
    if (trHover.length) hover.push(`transform:${trHover.join(" ")}`);
    const add = (s, decls, twice = false) => {
      if (!decls.length) return;
      if (/^\.[\w-]+$/.test(s)) s = s + (media ? s : "") + (twice ? s : "");
      const rule = `${s}{${decls.join(";")}}`;
      this.css.push(media ? `${media}{${rule}}` : rule);
    };
    if (options.some((o2) => o2.name === "grain")) {
      const page = sel === "body";
      this.css.push(`${sel}::after{content:"";position:${page ? "fixed" : "absolute"};inset:0;z-index:60;pointer-events:none;opacity:.4;mix-blend-mode:multiply;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3CfeColorMatrix values='0 0 0 0 0.11 0 0 0 0 0.1 0 0 0 0 0.1 0 0 0 0.05 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")}`);
      if (!page) normal.push("position:relative");
    }
    add(sel, dedupe(normal));
    add(sel, dedupe(strong), true);
    if (hover.length) {
      add(sel, ["transition:transform .35s cubic-bezier(.2,.7,.2,1), box-shadow .35s, background .35s, color .35s, opacity .35s, filter .35s"]);
      add(`${sel}:hover`, dedupe(hover));
    }
  }
  commandView(c, ctx) {
    const m = c.meaning;
    const parent = ctx.parent;
    if (m.kind === "component") {
      const n = this.fresh();
      const args = m.positional.map((p) => `() => ${this.ex(p)}`);
      let slot = "null";
      if (c.children.length) {
        const fn = this.fresh("slot");
        this.emit(`const ${fn} = ($parent) => {`, c.pos);
        this.indent++;
        this.content(c.children, { ...ctx, parent: "$parent" }, "box");
        this.indent--;
        this.emit("}");
        slot = fn;
      }
      this.emit(`const ${n} = $k.component(${parent}, ${jsName(c.head)}, [${args.join(", ")}], ${slot})`, c.pos);
      if (c.action) this.event(`${n}[0]`, "click", c.action, ctx);
      return;
    }
    if (m.kind === "event") {
      const ev = { "on-click": "click", "on-hover": "mouseenter", "on-scroll": "scroll", "on-load": "mount" };
      this.event(ctx.target ?? parent, ev[c.head], c.action ?? [], ctx);
      return;
    }
    if (m.kind === "motion") {
      this.emit(`$k.motion(${ctx.target ?? parent}, ${JSON.stringify(c.head)}, ${this.motionOptions(c)})`, c.pos);
      return;
    }
    if (m.kind === "setting") {
      switch (c.head) {
        case "light":
          this.emit(`$k.setting(${ctx.target ?? parent}, "light", ${JSON.stringify(this.words(c))})`, c.pos);
          return;
        case "camera":
          this.emit(`$k.setting(${ctx.target ?? parent}, "camera", ${JSON.stringify(this.words(c))}, ${this.objectOptions(m.options)})`, c.pos);
          return;
        case "seo":
          this.emit(`$k.seo(${this.seo(c)})`, c.pos);
          return;
      }
      return;
    }
    this.element(c, ctx);
  }
  words(c) {
    return c.meaning.positional.map((x) => x.k === "name" ? canon(x.name) ?? canonValue(x.name) : String(literal(x, {}))).join("-");
  }
  motionOptions(c) {
    const m = c.meaning;
    const props = [];
    for (const o2 of m.options) props.push(`${jsKey(o2.name)}: ${o2.values.length ? this.motionValue(o2.values[0]) : "true"}`);
    if (m.positional.length) {
      const p0 = m.positional[0];
      if (p0.k === "number") props.push(`speed: ${p0.v}`, `unit: ${JSON.stringify(p0.unit ?? "")}`);
      else if (p0.k === "name" && !p0.binding) props.push(`word: ${JSON.stringify(canon(p0.name) ?? canonValue(p0.name))}`);
      else props.push(`value: ${this.ex(p0)}`);
      if (m.positional[1]) props.push(`value2: ${this.ex(m.positional[1])}`);
    }
    return `{ ${props.join(", ")} }`;
  }
  motionValue(e2) {
    if (e2.k === "number") return e2.unit === "s" ? String(e2.v * 1e3) : String(e2.v);
    if (e2.k === "name" && !e2.binding) return JSON.stringify(canon(e2.name) ?? canonValue(e2.name));
    return this.ex(e2);
  }
  objectOptions(options) {
    const props = [];
    for (const o2 of options) {
      const isColor = ["background", "fog", "ground", "color", "tint"].includes(o2.name);
      const vals = o2.values.map((v) => isColor ? this.exValue(v) : v.k === "name" && !v.binding ? JSON.stringify(canon(v.name) ?? canonValue(v.name)) : o2.name === "fallback" ? this.exPath(v) : this.exValue(v));
      props.push(`${jsKey(o2.name)}: ${vals.length === 0 ? "true" : vals.length === 1 ? vals[0] : `[${vals.join(", ")}]`}`);
    }
    return `{ ${props.join(", ")} }`;
  }
  /** File path: "photo.jpg" becomes "/photo.jpg" (valid on every page). */
  exPath(v) {
    if (!v) return "null";
    const l = v.k === "text" ? literal(v, {}) : void 0;
    if (typeof l === "string") return JSON.stringify(assetPath(l));
    return `$k.path(${this.ex(v)})`;
  }
  /** Option value: named colors resolved. */
  exValue(v) {
    const l = literal(v, this.info.colors);
    if (l !== void 0 && (v.k === "name" || v.k === "color")) return JSON.stringify(l);
    if (v.k === "number" && v.unit === "s") return String(v.v * 1e3);
    return this.ex(v);
  }
  event(target, type, action, ctx) {
    this.emit(`$k.on(${target}, ${JSON.stringify(type)}, ${this.handler(action, { ...ctx, target: ctx.target ?? target })})`);
  }
  /** An action as a function expression: its body is emitted on the lines that follow. */
  handler(action, ctx) {
    const asy = bodyHasAwait(action) ? "async " : "";
    const name = this.fresh("act");
    this.emit(`const ${name} = ${asy}($event) => {`);
    this.indent++;
    this.localDeclarations(action);
    for (const a of action) this.statement(a, { view: false, target: ctx.target });
    this.indent--;
    this.emit("}");
    return name;
  }
  /** A command used as an action: jump, spin, says "…", sound "click.mp3". */
  commandAction(c, ctx) {
    const m = c.meaning;
    if (!m) return;
    if (m.kind === "motion") {
      let target = ctx.target ?? "null";
      const p0 = m.positional[0];
      if (p0 && p0.k === "name" && p0.binding?.kind === "object") target = `$k.namedObject(${JSON.stringify(p0.name)})`;
      this.emit(`$k.action(${target}, ${JSON.stringify(c.head)}, ${this.motionOptions(c)})`, c.pos);
      return;
    }
    if (c.head === "sound") {
      this.emit(`$k.playSound(${this.exPath(m.positional[0])}, ${this.objectOptions(m.options)})`, c.pos);
      return;
    }
    if (c.head === "light") {
      this.emit(`$k.setting(${ctx.target ?? "null"}, "light", ${JSON.stringify(this.words(c))})`, c.pos);
      return;
    }
    this.emit(`$k.report(new Error(${JSON.stringify(`"${c.rawHead}" cannot be an action.`)}))`, c.pos);
  }
  // ---------------------------------------------------------------- elements
  element(c, ctx) {
    const m = c.meaning;
    const head = c.head;
    const parent = ctx.parent;
    const n = this.fresh();
    const p = m.positional;
    const opt = (name) => m.options.find((o2) => o2.name === name);
    this.srcLine = c.pos.line;
    if (head === "object" || head === "character") {
      this.emit(`const ${n} = $k.object(${parent}, { kind: ${JSON.stringify(head)}, src: ${this.exPath(p[0])}, name: ${JSON.stringify(m.objectName ?? null)}, options: ${this.objectOptions(m.options)} })`, c.pos);
      this.styleClass(n, head, m.options, ["size", "position", "rotation", "height", "fallback", "shadows", "alt", "animation"]);
      this.childrenOf(c, { ...ctx, parent: n, target: n, parentHead: head });
      if (c.action) this.event(n, "click", c.action, { ...ctx, target: n });
      return;
    }
    if (head === "scene") {
      this.emit(`const ${n} = $k.scene(${parent}, ${this.objectOptions(m.options.filter((o2) => ["height", "background", "fog", "ground", "particles", "immediate"].includes(o2.name)))})`, c.pos);
      if (m.objectName) this.emit(`${n}.id = ${JSON.stringify(stripAccents(m.objectName))}`);
      this.styleClass(n, head, m.options, ["height", "background", "fog", "ground", "particles", "immediate"]);
      this.childrenOf(c, { ...ctx, parent: n, target: n, parentHead: head });
      this.emit(`$k.sceneReady(${n})`);
      return;
    }
    if (head === "sound") {
      this.emit(`const ${n} = $k.sound(${parent}, ${this.exPath(p[0])}, ${this.objectOptions(m.options)})`, c.pos);
      return;
    }
    if (head === "slot" && !m.options.length && !c.children.length) {
      this.emit(`if ($p.$slot) $p.$slot(${parent})`, c.pos);
      return;
    }
    let tag = {
      details: "details",
      dialog: "dialog",
      languages: "nav",
      embed: "iframe",
      section: "section",
      header: "header",
      footer: "footer",
      nav: "nav",
      grid: "div",
      column: "div",
      row: "div",
      box: "div",
      card: "article",
      title: "h1",
      subtitle: "h2",
      text: "p",
      image: "img",
      video: "video",
      link: "a",
      links: "nav",
      logo: "a",
      button: "button",
      form: "form",
      field: "input",
      textarea: "textarea",
      select: "select",
      checkbox: "input",
      list: "ul",
      item: "li",
      icon: "span",
      divider: "hr",
      spacer: "div",
      slot: "div",
      markdown: "div"
    }[head] ?? "div";
    if (head === "title" || head === "subtitle") {
      const lvl = opt("level")?.values[0];
      if (lvl?.k === "number") tag = `h${Math.min(6, Math.max(1, lvl.v))}`;
      else if (this.laterTitles.has(c)) tag = "h2";
    }
    if (head === "button" && opt("to")) tag = "a";
    {
      const t = opt("tag")?.values[0];
      const tv = t?.k === "name" ? t.name : t?.k === "text" ? literal(t, {}) : void 0;
      if (typeof tv === "string" && /^[a-z][a-z0-9-]*$/.test(tv)) tag = tv;
    }
    let classes = [`k-${head}`];
    if (tag === "h2" && this.laterTitles.has(c)) classes.push("k-same");
    if (m.objectName) classes.push(`k-${head}-${m.objectName}`);
    for (const v of ["outline", "ghost", "large", "small"]) if (opt(v)) classes.push(`k-${v}`);
    const own2 = opt("class")?.values[0];
    let dynamicClass;
    if (own2) {
      const l = own2.k === "text" ? literal(own2, {}) : void 0;
      classes = head === "links" ? ["k-links"] : [];
      if (typeof l === "string") classes.push(...l.split(/\s+/).filter(Boolean));
      else dynamicClass = own2;
    }
    const dynamicLooks = [];
    for (const lo of m.options.filter((o2) => o2.name === "look")) {
      const look = lo.values[0];
      if (!look) continue;
      const l = look.k === "text" ? literal(look, {}) : void 0;
      if (typeof l === "string") classes.push(...l.split(/\s+/).filter(Boolean));
      else dynamicLooks.push(look);
    }
    let into = parent;
    const isField = ["field", "textarea", "select", "checkbox"].includes(head);
    const label = isField ? opt("label")?.values[0] ?? (head === "checkbox" ? p[1] : void 0) : void 0;
    let labelText;
    if (label) {
      const l = this.fresh();
      this.emit(`const ${l} = $k.h(${parent}, "label", ${JSON.stringify(head === "checkbox" ? "k-label k-label-check" : "k-label")})`);
      if (head !== "checkbox") {
        const sp = this.fresh();
        this.emit(`const ${sp} = $k.h(${l}, "span")`);
        this.text(sp, label);
      } else labelText = this.fresh();
      into = l;
    }
    this.emit(`const ${n} = $k.h(${into}, ${JSON.stringify(tag)}, ${JSON.stringify(classes.join(" "))})`, c.pos);
    if (label && head === "checkbox" && labelText) {
      this.emit(`const ${labelText} = $k.h(${into}, "span")`);
      this.text(labelText, label);
    }
    if (m.objectName) this.emit(`${n}.id = ${JSON.stringify(stripAccents(m.objectName))}`);
    if (dynamicClass) this.emit(`$k.classes(${n}, () => ${this.ex(dynamicClass)})`);
    for (const dl of dynamicLooks) this.emit(`$k.classes(${n}, () => ${this.ex(dl)})`);
    for (const lo of m.options.filter((o2) => o2.name === "look-if")) {
      this.emit(`$k.classes(${n}, () => (${this.ex(lo.values[1])}) ? ${JSON.stringify(literal(lo.values[0], {}))} : "")`);
    }
    if (opt("id")) this.attr(n, "id", opt("id").values[0]);
    if (["row", "column", "box", "grid"].includes(head)) {
      const mine = tabButtons(c.children);
      const role = m.options.find((o2) => o2.name === "attr" && literal(o2.values[0], {}) === "role");
      if (mine.length && (!role || literal(role.values[1], {}) === "tablist")) {
        for (const b of mine) this.tabs.add(b);
        if (!role) this.emit(`${n}.setAttribute("role", "tablist")`);
      }
    }
    const pressed = head === "button" && !this.tabs.has(c);
    for (const [o2, a0, on, off] of [["hidden", "hidden", "true", "null"], ["selected", "aria-selected", '"true"', '"false"'], ["current", "aria-current", '"page"', "null"], ["open", "open", "true", "null"]]) {
      const a = o2 === "selected" && pressed ? "aria-pressed" : a0;
      const v = opt(o2)?.values[0];
      if (v && literal(v, {}) === void 0) this.emit(`$k.attr(${n}, ${JSON.stringify(a)}, () => (${this.ex(v)}) ? ${on} : ${off})`);
      else if (opt(o2) && o2 !== "hidden") this.emit(`${n}.setAttribute(${JSON.stringify(a)}, ${on === "true" ? '""' : on})`);
      if (o2 === "selected" && opt(o2) && head === "button" && !pressed) this.emit(`${n}.setAttribute("role", "tab")`);
    }
    for (const a of m.options.filter((o2) => o2.name === "attr")) {
      const nameLit = a.values[0]?.k === "text" ? literal(a.values[0], {}) : a.values[0]?.k === "name" ? a.values[0].name : void 0;
      if (typeof nameLit !== "string") continue;
      if (a.values[1]) this.attr(n, nameLit, a.values[1]);
      else this.emit(`${n}.setAttribute(${JSON.stringify(nameLit)}, "")`);
    }
    const html = opt("html");
    if (html) {
      const src = html.values[0] ?? p[0];
      if (src) this.emit(`$k.html(${n}, () => ${this.ex(src)})`);
    }
    this.skipText = !!html;
    switch (head) {
      case "title":
      case "subtitle":
      case "text":
      case "item":
      case "icon":
        if (p.length) this.text(n, p[0]);
        if (head === "icon") this.emit(`${n}.setAttribute("aria-hidden", "true")`);
        break;
      case "button":
        if (p.length) this.text(n, p[0]);
        if (opt("to")) this.attr(n, "href", opt("to").values[0]);
        else this.emit(`${n}.type = ${JSON.stringify(ctx.parentHead === "form" && !c.action ? "submit" : "button")}`);
        {
          const d = opt("disabled");
          if (d) this.emit(`$k.attr(${n}, "disabled", () => ${d.values[0] ? this.ex(d.values[0]) : "true"})`);
        }
        break;
      case "link": {
        this.text(n, p[0]);
        this.attr(n, "href", p[1] ?? p[0]);
        if (opt("new-tab")) this.emit(`${n}.target = "_blank"; ${n}.rel = "noopener"`);
        break;
      }
      case "image": {
        const alt = opt("alt")?.values[0] ?? p[1];
        if (alt) this.attr(n, "alt", alt);
        else this.emit(`${n}.alt = ""`);
        this.image(n, p[0], false, c);
        if (opt("cover")) this.emit(`${n}.classList.add("k-cover")`);
        break;
      }
      case "video": {
        this.attr(n, "src", p[0]);
        const auto = !!opt("autoplay");
        if (auto || opt("muted")) this.emit(`${n}.muted = true; ${n}.setAttribute("muted", "")`);
        if (auto) this.emit(`${n}.autoplay = true; ${n}.setAttribute("autoplay", ""); ${n}.setAttribute("playsinline", "")`);
        if (opt("loop")) this.emit(`${n}.loop = true; ${n}.setAttribute("loop", "")`);
        if (opt("controls") || !auto) this.emit(`${n}.controls = true; ${n}.setAttribute("controls", "")`);
        if (opt("cover")) this.emit(`${n}.classList.add("k-cover")`);
        break;
      }
      case "card": {
        if (p.length && p.some((x) => !(x.k === "text" && literal(x, {}) !== void 0))) {
          this.emit(`$k.card(${n}, [${p.map((x) => `() => ${this.ex(x)}`).join(", ")}])`);
          break;
        }
        const img = p.find((x) => isImage(x));
        const texts = p.filter((x) => x !== img);
        if (img) {
          const i2 = this.fresh();
          this.emit(`const ${i2} = $k.h(${n}, "img", "k-card-image")`);
          if (texts[0]) this.attr(i2, "alt", texts[0]);
          else this.emit(`${i2}.alt = ""`);
          this.image(i2, img);
        }
        if (texts[0]) {
          const t2 = this.fresh();
          this.emit(`const ${t2} = $k.h(${n}, "h3", "k-card-title")`);
          this.text(t2, texts[0]);
        }
        if (texts[1]) {
          const t3 = this.fresh();
          this.emit(`const ${t3} = $k.h(${n}, "p", "k-card-text")`);
          this.text(t3, texts[1]);
        }
        break;
      }
      case "links": {
        const elsewhere = (word) => {
          const id = word.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
          const there = this.info.anchors.filter((x) => x.id === id);
          const hit = there.find((x) => x.page === "/") ?? there[0];
          return hit ? `, ${JSON.stringify(`${hit.page === "/" ? "/" : hit.page}#${id}`)}` : "";
        };
        for (const x of p) {
          const a = this.fresh();
          this.emit(`const ${a} = $k.h(${n}, "a", "k-nav-link")`);
          if (x.k === "name" && (!x.binding || x.binding.kind === "component")) {
            const label2 = x.name.replace(/-/g, " ");
            if (this.info.dictionary.has(label2) && this.info.languages.length) this.text(a, { k: "text", parts: [label2], pos: x.pos, translated: true });
            else this.emit(`$k.setText(${a}, ${JSON.stringify(label2)})`);
            this.emit(`$k.autoLink(${a}, ${JSON.stringify(x.name)}${elsewhere(x.name)})`);
          } else if (x.k === "text") {
            this.text(a, x);
            const word = x.parts.every((m2) => typeof m2 === "string") ? x.parts.join("") : "";
            this.emit(`$k.autoLink(${a}, ${JSON.stringify(word)}${elsewhere(word)})`);
          } else this.text(a, x);
        }
        if (p.length >= 3 && ["header", "section", "nav"].includes(ctx.parentHead ?? "")) this.emit(`$k.mobileMenu(${n})`);
        break;
      }
      case "logo": {
        this.emit(`${this.info.languages.length ? `$k.attr(${n}, "href", () => "/")` : `${n}.setAttribute("href", "/")`}; ${n}.setAttribute("aria-label", ${JSON.stringify(this.site.name ? `${this.site.name} \u2014 home` : "Home")})`);
        const x = p[0];
        if (x && isImage(x)) {
          const i2 = this.fresh();
          this.emit(`const ${i2} = $k.h(${n}, "img", "k-logo-image")`);
          this.emit(`${i2}.alt = ${JSON.stringify(this.site.name ?? "Logo")}`);
          this.image(i2, x, true);
          if (p[1]) {
            const t2 = this.fresh();
            this.emit(`const ${t2} = $k.h(${n}, "span", "k-logo-text")`);
            this.text(t2, p[1]);
          }
        } else if (x) this.text(n, x);
        break;
      }
      case "spacer":
        if (p[0]) this.emit(`${n}.style.height = $k.px(${this.ex(p[0])})`);
        break;
      case "details": {
        const s2 = this.fresh();
        this.emit(`const ${s2} = $k.h(${n}, "summary", "k-summary")`);
        if (p[0]) this.text(s2, p[0]);
        break;
      }
      case "languages":
        this.emit(`$k.languages(${n}, $k.route.path)`);
        break;
      case "dialog": {
        const st = p[0];
        const ref = st && st.k === "name" ? this.target(st) : void 0;
        const x = this.fresh();
        this.emit(`const ${x} = $k.h(${n}, "button", "k-dialog-close")`);
        if (p[1]) {
          const t2 = this.fresh();
          this.emit(`const ${t2} = $k.h(${n}, "h2", "k-dialog-title")`);
          this.text(t2, p[1]);
          this.attr(n, "aria-label", p[1]);
        }
        if (ref) this.emit(`$k.dialog(${n}, ${x}, () => ${ref}, ($v) => { ${ref} = $v })`);
        break;
      }
      case "embed":
        if (p[0]) this.emit(`$k.frame(${n}, () => ${this.ex(p[0])})`);
        if (p[1]) this.attr(n, "title", p[1]);
        this.emit(`${n}.setAttribute("loading", "lazy")`);
        break;
      case "slot":
        this.emit(`$k.slot(${n}, $p.$slot)`);
        break;
      case "markdown":
        if (p[0]) this.emit(`$k.markdown(${n}, () => ${this.ex(p[0])}${this.laterTitles.has(c) ? ", true" : ""})`);
        break;
      case "field":
      case "textarea":
      case "select":
      case "checkbox":
        this.field(c, n);
        break;
      case "grid":
        if (p[0]?.k === "number" && !opt("columns")) m.options.push({ name: "columns", values: [p[0]], pos: p[0].pos });
        break;
    }
    this.skipText = false;
    if (ctx.parentHead === "row" && m.options.some((o2) => o2.name === "center") && !m.options.some((o2) => o2.name === "margin")) {
      m.options.push({ name: "margin", values: [{ k: "number", v: 0, pos: c.pos }], pos: c.pos });
    }
    this.styleClass(n, head, m.options, []);
    this.childrenOf(c, { ...ctx, parent: n, target: n, parentHead: head });
    const mail = head === "form" ? opt("mail") : void 0;
    if (mail?.values[0]) {
      const to = mail.values[0];
      const l = literal(to, {});
      if (typeof l === "string") this.mails.push(l);
      const subject = opt("subject")?.values[0];
      this.emit(`$k.form(${n})`);
      this.emit(`$k.mail(${n}, () => ${this.ex(to)}, ${subject ? `() => ${this.ex(subject)}` : "null"}, ${c.action ? this.handler(c.action, { ...ctx, target: n }) : "null"})`, c.pos);
      return;
    }
    if (c.action) {
      const ev = head === "form" ? "submit" : ["field", "textarea"].includes(head) ? "input" : ["select", "checkbox"].includes(head) ? "change" : "click";
      this.event(n, ev, c.action, { ...ctx, target: n });
    }
    if (head === "form") this.emit(`$k.form(${n})`);
  }
  image(n, src, eager = false, c) {
    let priority = 1;
    const hidden = !!c && (c.meaning.options.some((o2) => o2.name === "hidden") || c.children.some((x) => x.k === "command" && x.meaning?.kind === "screen" && x.meaning.options.some((o2) => o2.name === "hidden")));
    if (this.repeated || hidden) priority = 0;
    else if (!eager) {
      priority = this.imagesInPage === 0 ? 2 : this.imagesInPage < 3 ? 1 : 0;
      this.imagesInPage++;
    }
    const l = src.k === "text" ? literal(src, {}) : void 0;
    const value = typeof l === "string" ? JSON.stringify(assetPath(l)) : `() => ${this.ex(src)}`;
    const w = c?.meaning.options.find((o2) => o2.name === "width")?.values[0];
    const width = w?.k === "number" && !w.unit && w.v > 0 ? `, ${w.v}` : "";
    this.emit(`$k.img(${n}, ${value}, ${priority}${width})`);
  }
  field(c, n) {
    const m = c.meaning;
    const p = m.positional;
    const st = p[0];
    const opt = (name) => m.options.find((o2) => o2.name === name);
    const ref = st && st.k === "name" ? this.target(st) : void 0;
    if (st?.k === "name") this.emit(`${n}.name = ${JSON.stringify(st.name)}`);
    if (c.head === "field" || c.head === "textarea") {
      if (p[1]) this.attr(n, "placeholder", p[1]);
      const type = opt("type")?.values[0];
      const types = { text: "text", email: "email", number: "number", range: "range", password: "password", date: "date", time: "time", tel: "tel", url: "url", search: "search" };
      const tv = type?.k === "name" ? types[canonValue(type.name)] ?? "text" : "text";
      if (c.head === "field") this.emit(`${n}.type = ${JSON.stringify(tv)}`);
      if (opt("rows")) this.emit(`${n}.rows = ${this.ex(opt("rows").values[0])}`);
      for (const bound of ["min", "max", "step"]) if (opt(bound)?.values[0]) this.attr(n, bound, opt(bound).values[0]);
      if (ref) this.emit(`$k.bind(${n}, () => ${ref}, ($v) => { ${ref} = $v }${tv === "number" || tv === "range" ? ', "number"' : ""})`);
      if (!opt("label") && p[1]) this.attr(n, "aria-label", p[1]);
    } else if (c.head === "select") {
      const choices = p.slice(1);
      this.emit(`$k.options(${n}, () => [${choices.map((x) => x.k === "list" ? `...${this.ex(x)}` : x.k === "name" && x.binding ? `...$k.toList(${this.ex(x)})` : this.ex(x)).join(", ")}])`);
      if (ref) this.emit(`$k.bindSelect(${n}, () => ${ref}, ($v) => { ${ref} = $v })`);
      if (!opt("label") && st?.k === "name") this.emit(`${n}.setAttribute("aria-label", ${JSON.stringify(st.name)})`);
    } else if (c.head === "checkbox") {
      this.emit(`${n}.type = "checkbox"`);
      if (ref) this.emit(`$k.bindCheck(${n}, () => ${ref}, ($v) => { ${ref} = $v })`);
    }
    if (opt("required")) this.emit(`${n}.required = true`);
  }
  childrenOf(c, ctx) {
    if (c.children.length) this.content(c.children, ctx, c.head);
  }
  /** Style options of an element → a generated class. */
  styleClass(n, head, options, ignore) {
    const opts = options.filter((o2) => !ignore.includes(o2.name) && !NON_STYLE.has(o2.name.replace("hover:", "")));
    if (!opts.length) return;
    const cls = this.newClass();
    const dynamic = [];
    this.optionsToCss("." + cls, head, opts, void 0, dynamic);
    this.emit(`${n}.classList.add(${JSON.stringify(cls)})`);
    for (const d of dynamic) this.emit(`$k.style(${n}, ${JSON.stringify(d[0])}, () => ${d[1]})`);
  }
  skipText = false;
  text(n, e2) {
    if (!e2 || this.skipText) return;
    const l = e2.k === "text" || e2.k === "number" ? literal(e2, {}) : void 0;
    if (typeof l === "string" && /\*[^*\s]([^*\n]*[^*\s])?\*/.test(l)) {
      const h2 = l.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\*([^*\s](?:[^*\n]*[^*\s])?)\*/g, "<em>$1</em>").replace(/\n/g, "<br>");
      this.emit(`$k.html(${n}, () => ${JSON.stringify(h2)})`);
    } else if (l !== void 0) this.emit(`$k.setText(${n}, ${JSON.stringify(String(l))})`);
    else this.emit(`$k.text(${n}, () => ${this.ex(e2)})`);
  }
  attr(n, name, e2) {
    let l = e2.k === "text" ? literal(e2, {}) : void 0;
    if (l !== void 0 && (name === "src" || name === "poster")) l = assetPath(String(l));
    if (typeof l === "string" && name === "href" && l.includes("#")) l = l.slice(0, l.indexOf("#")) + stripAccents(l.slice(l.indexOf("#")));
    if (l !== void 0 && !(name === "href" && this.info.languages.length)) this.emit(`${n}.setAttribute(${JSON.stringify(name)}, ${JSON.stringify(String(l))})`);
    else if (l !== void 0) this.emit(`$k.attr(${n}, "href", () => ${JSON.stringify(String(l))})`);
    else if (name === "src" || name === "poster") this.emit(`$k.attr(${n}, ${JSON.stringify(name)}, () => $k.path(${this.ex(e2)}))`);
    else this.emit(`$k.attr(${n}, ${JSON.stringify(name)}, () => ${this.ex(e2)})`);
  }
  ifView(i, ctx) {
    const branches = [];
    const fn = (body) => {
      const name = this.fresh("br");
      this.emit(`const ${name} = ($parent) => {`);
      this.indent++;
      this.content(body, { ...ctx, parent: "$parent" }, ctx.parentHead ?? "box");
      this.indent--;
      this.emit("}");
      return name;
    };
    branches.push(`[() => ${this.ex(i.cond)}, ${fn(i.then)}]`);
    for (const x of i.elifs) branches.push(`[() => ${this.ex(x.cond)}, ${fn(x.body)}]`);
    if (i.else) branches.push(`[() => true, ${fn(i.else)}]`);
    this.emit(`$k.when(${ctx.parent}, [${branches.join(", ")}])`, i.pos);
  }
  forView(i, ctx) {
    const v = jsName(i.variable);
    const idx = i.index ? jsName(i.index) : "$i";
    this.emit(`$k.each(${ctx.parent}, () => ${this.ex(i.source)}, (${v}, ${idx}, $parent) => {`, i.pos);
    this.indent++;
    this.repeated++;
    this.content(i.body, { ...ctx, parent: "$parent" }, ctx.parentHead ?? "box");
    this.repeated--;
    this.indent--;
    this.emit("})");
  }
  // ---------------------------------------------------------------- expressions
  ex(e2) {
    switch (e2.k) {
      case "number":
        if (e2.unit === "s") return String(e2.v * 1e3);
        if (!e2.unit || ["ms", "px", "deg", "/s"].includes(e2.unit)) return String(e2.v);
        return JSON.stringify(`${e2.v}${e2.unit}`);
      case "text": {
        if (e2.translated) {
          const byLang = this.info.dictionary.get(textKey(e2));
          const plain = { ...e2, translated: false };
          const versions = this.info.languages.map((l, j) => {
            const t = j ? byLang?.get(l) : void 0;
            return this.ex(t ? translatedText(e2, t.to) : plain);
          });
          return `$k.tr(${versions.join(", ")})`;
        }
        if (e2.parts.every((m) => typeof m === "string")) return JSON.stringify(e2.parts.join(""));
        return "`" + e2.parts.map((m) => typeof m === "string" ? m.replace(/[`\\]|\$\{/g, (x) => "\\" + x) : `\${$k.t(${this.ex(m)})}`).join("") + "`";
      }
      case "color":
        return JSON.stringify(e2.v);
      case "bool":
        return e2.v ? "true" : "false";
      case "none":
        return "null";
      case "name": {
        const b = e2.binding;
        if (!b) return jsName(e2.name);
        if (b.perLanguage) return `${jsName(e2.name)}()`;
        switch (b.kind) {
          case "state":
          case "derived":
            return `${jsName(e2.name)}.v`;
          case "prop":
            return `$p[${JSON.stringify(e2.name)}]`;
          case "kaury": {
            if (b.name === "scroll") return "$k.scroll.v";
            return `$k.${globalSpec(b.name)?.js ?? jsName(b.name)}`;
          }
          case "object":
            return `$k.namedObject(${JSON.stringify(e2.name)})`;
          default:
            return jsName(e2.name);
        }
      }
      case "list":
        return `[${e2.items.map((x) => this.ex(x)).join(", ")}]`;
      case "object":
        return `({ ${e2.props.map((p) => p.spread ? `...${this.ex(p.value)}` : `${jsKey(p.key)}: ${this.ex(p.value)}`).join(", ")} })`;
      case "member": {
        const o2 = e2.object.k === "number" ? `(${this.ex(e2.object)})` : this.ex(e2.object);
        const m = kauryMethod(e2.prop);
        if (m && PROPERTIES.has(m)) return `$k.prop(${o2}, ${JSON.stringify(m)}, ${JSON.stringify(e2.prop)})`;
        const dot = this.dot(e2.object, e2.optional);
        if (/^[\p{L}_$][\p{L}\p{N}_$]*$/u.test(e2.prop)) return `${o2}${dot}${e2.prop}`;
        return `${o2}${dot === "?." ? "?." : ""}[${JSON.stringify(e2.prop)}]`;
      }
      case "index":
        return `${this.ex(e2.object)}${this.dot(e2.object) === "?." ? "?." : ""}[${this.ex(e2.index)}]`;
      case "call": {
        if (e2.fn.k === "member") {
          const m = kauryMethod(e2.fn.prop);
          if (m) return `$k.m(${this.ex(e2.fn.object)}, ${JSON.stringify(m)}, ${JSON.stringify(e2.fn.prop)}${e2.args.map((a) => ", " + this.ex(a)).join("")})`;
        }
        if ((e2.fn.k === "member" || e2.fn.k === "index") && !this.storing && !askedOptional(e2.fn)) {
          const o2 = this.ex(e2.fn.object);
          const receiver = o2.includes("?.") ? `(${o2})` : o2;
          const access = e2.fn.k === "index" ? `[${this.ex(e2.fn.index)}]` : /^[\p{L}_$][\p{L}\p{N}_$]*$/u.test(e2.fn.prop) ? `.${e2.fn.prop}` : `[${JSON.stringify(e2.fn.prop)}]`;
          return `${receiver}${access}(${e2.args.map((a) => this.ex(a)).join(", ")})`;
        }
        if (e2.fn.k === "name" && e2.fn.binding?.kind === "kaury" && e2.fn.binding.name === "persist") {
          return `$k.persist(${e2.args.map((a) => a.k === "name" && a.binding?.kind === "state" ? jsName(a.name) : this.ex(a)).join(", ")})`;
        }
        return `${this.ex(e2.fn)}(${e2.args.map((a) => this.ex(a)).join(", ")})`;
      }
      case "binary": {
        const l = this.ex(e2.l);
        const r = this.ex(e2.r);
        switch (e2.op) {
          case "==":
            return `$k.equal(${l}, ${r})`;
          case "!=":
            return `!$k.equal(${l}, ${r})`;
          case "in":
            return `$k.has(${r}, ${l})`;
          // two lists joined: [1, 2] + more → one list (numbers and texts add as usual)
          case "+":
            return [e2.l.k, e2.r.k].some((k) => k === "number" || k === "text") ? `(${l} + ${r})` : `$k.plus(${l}, ${r})`;
          default:
            return `(${l} ${e2.op} ${r})`;
        }
      }
      case "unary":
        return `${e2.op}${this.ex(e2.e)}`;
      case "spread":
        return `...${this.ex(e2.e)}`;
      case "lambda": {
        const asy = Array.isArray(e2.body) ? bodyHasAwait(e2.body) ? "async " : "" : hasAwait(e2.body) ? "async " : "";
        const params = `(${e2.params.map(jsName).join(", ")})`;
        if (!Array.isArray(e2.body)) {
          const body2 = this.ex(e2.body);
          return `${asy}${params} => ${body2.startsWith("{") ? `(${body2})` : body2}`;
        }
        const [savedL, savedS, savedI] = [this.lines, this.sources, this.indent];
        this.lines = [];
        this.sources = [];
        this.indent = 1;
        this.localDeclarations(e2.body);
        for (const i of e2.body) this.statement(i, { view: false });
        const body = this.lines.join("\n");
        this.lines = savedL;
        this.sources = savedS;
        this.indent = savedI;
        return `${asy}${params} => {
${body}
${"  ".repeat(this.indent)}}`;
      }
      case "await":
        if (e2.e.k === "number" && (e2.e.unit === "s" || e2.e.unit === "ms" || !e2.e.unit)) return `(await $k.delay(${this.ex(e2.e)}))`;
        return `(await ${this.ex(e2.e)})`;
      case "if":
        return `(${this.ex(e2.cond)} ? ${this.ex(e2.then)} : ${this.ex(e2.else)})`;
      case "range":
        return `$k.range(${this.ex(e2.from)}, ${this.ex(e2.to)})`;
    }
  }
};
function isImage(e2) {
  if (e2.k !== "text") return false;
  const l = e2.parts.map((m) => typeof m === "string" ? m : "").join("");
  return /\.(png|jpe?g|webp|avif|gif|svg)(\?.*)?$/i.test(l);
}
function dedupe(decls) {
  const seen = /* @__PURE__ */ new Map();
  const filters = /* @__PURE__ */ new Map();
  for (const d of decls) {
    const prop = d.slice(0, d.indexOf(":"));
    if (prop === "filter") {
      const value = d.slice(prop.length + 1);
      filters.set(value.slice(0, value.indexOf("(")), value);
      seen.set(prop, `filter:${[...filters.values()].join(" ")}`);
    } else seen.set(prop, d);
  }
  return [...seen.values()];
}
function tabButtons(body) {
  const out = [];
  for (const i of body) {
    if (i.k === "command" && i.head === "button" && i.meaning?.options.some((o2) => o2.name === "selected")) out.push(i);
    else if (i.k === "for") out.push(...tabButtons(i.body));
    else if (i.k === "if") out.push(...tabButtons(i.then), ...i.elifs.flatMap((x) => tabButtons(x.body)), ...tabButtons(i.else ?? []));
  }
  return out;
}
function askedOptional(e2) {
  if (e2.k === "member") return !!e2.optional || askedOptional(e2.object);
  if (e2.k === "index") return askedOptional(e2.object);
  if (e2.k === "call") return askedOptional(e2.fn);
  return false;
}
function hasAwait(e2) {
  switch (e2.k) {
    case "await":
      return true;
    case "text":
      return e2.parts.some((m) => typeof m !== "string" && hasAwait(m));
    case "list":
      return e2.items.some(hasAwait);
    case "object":
      return e2.props.some((p) => hasAwait(p.value));
    case "member":
      return hasAwait(e2.object);
    case "index":
      return hasAwait(e2.object) || hasAwait(e2.index);
    case "call":
      return hasAwait(e2.fn) || e2.args.some(hasAwait);
    case "binary":
      return hasAwait(e2.l) || hasAwait(e2.r);
    case "unary":
    case "spread":
      return hasAwait(e2.e);
    case "if":
      return hasAwait(e2.cond) || hasAwait(e2.then) || hasAwait(e2.else);
    case "range":
      return hasAwait(e2.from) || hasAwait(e2.to);
    default:
      return false;
  }
}
function bodyHasAwait(body) {
  for (const i of body) {
    switch (i.k) {
      case "let":
        if (hasAwait(i.value)) return true;
        break;
      case "assign":
        if (hasAwait(i.value) || hasAwait(i.target)) return true;
        break;
      case "expr":
        if (hasAwait(i.e)) return true;
        break;
      case "return":
        if (i.value && hasAwait(i.value)) return true;
        break;
      case "if":
        if (hasAwait(i.cond) || bodyHasAwait(i.then) || i.elifs.some((x) => hasAwait(x.cond) || bodyHasAwait(x.body)) || i.else && bodyHasAwait(i.else)) return true;
        break;
      case "for":
        if (hasAwait(i.source) || bodyHasAwait(i.body)) return true;
        break;
      case "while":
        if (hasAwait(i.cond) || bodyHasAwait(i.body)) return true;
        break;
      case "try":
        if (bodyHasAwait(i.body) || i.handler && bodyHasAwait(i.handler)) return true;
        break;
      case "go":
        if (hasAwait(i.path)) return true;
        break;
    }
  }
  return false;
}

// src/core/blocks.ts
var HEADING = `
style kb-heading
  font "titles", size 52, line-height 1.02, tracking -1.5, margin 0 0 14 0
  mobile size 34, tracking -1
`;
var BLOCKS = {
  Hero: {
    params: 'heading, intro = "", action = "", href = "#contact", picture = ""',
    help: "the first screen: a big title, a sentence, a button; with a picture, the text and the picture side by side",
    example: 'Hero "Flowers that *speak*.", "Delivered the same day.", "Order", "#shop"',
    source: `
component Hero heading, intro = "", action = "", href = "#contact", picture = ""
  section
    if picture
      grid columns 1.1 0.9, gap 64
        tablet columns 1, gap 32
        column kb-hero, middle
          title heading
            enters from bottom
          if intro
            text intro
          if action
            button action, to href, large
        image picture, "", cover, kb-hero-picture
    else
      column kb-hero
        title heading
          enters from bottom
        if intro
          text intro
        if action
          button action, to href, large

style kb-hero
  gap 24, padding 48 0 32
  title size 80, line-height 1, tracking -2
  text size 20, line-height 1.5, max-width 540, opacity 0.76
  mobile padding 20 0 12

style kb-hero-picture
  height 560
  tablet height 420
  mobile height 320
`
  },
  Features: {
    params: 'items, heading = ""',
    help: "a list in two columns, a line above each; each item has title, text and maybe icon",
    example: 'Features features, "Why us"   // features: [{ title: "Fresh", text: "Cut this morning." }]',
    source: `
component Features items, heading = ""
  section id slug(heading)
    if heading
      subtitle heading, kb-heading
    grid 2 columns, gap 0 56
      mobile columns 1
      for f in items
        row kb-feature
          if f.icon
            icon f.icon
          column gap 6
            subtitle f.title, level 3
            text f.text
          enters from bottom
${HEADING}
style kb-feature
  gap 18, padding 26 0, border-top 1 line
  icon size 28
  subtitle size 22
  text opacity 0.72
`
  },
  Steps: {
    params: 'items, heading = ""',
    help: "numbered steps; each item has title and text",
    example: 'Steps steps, "How it works"   // steps: [{ title: "Choose", text: "\u2026" }]',
    source: `
component Steps items, heading = ""
  section id slug(heading)
    if heading
      subtitle heading, kb-heading
    grid 3 columns, gap 20
      for s, i in items
        column kb-step
          text "{i + 1}", kb-step-number
          subtitle s.title, level 3
          text s.text, kb-soft
          enters from bottom
${HEADING}
style kb-step
  gap 10, border-top 2 ink, padding 20 0 0
  subtitle size 22

style kb-step-number
  font "titles", size 40, weight 800, line-height 1

style kb-soft
  opacity 0.72
`
  },
  Stats: {
    params: "items",
    help: "big figures in a row; each item has value and label",
    example: 'Stats [{ value: "2 min", label: "to order" }, { value: "7 days", label: "of freshness" }]',
    source: `
component Stats items
  section
    row kb-stats
      for s in items
        column gap 6
          text s.value, kb-stat-value
          text s.label, kb-soft
          enters from bottom

style kb-stats
  gap 72, padding 8 0
  mobile gap 32

style kb-stat-value
  font "titles", size 64, weight 800, line-height 1, tracking -1

style kb-soft
  opacity 0.72
`
  },
  Table: {
    params: 'rows, columns, heading = ""',
    help: 'a real table from a list: each column has label and field, and can have format ("price", "date", "number") and align: "right"; a click on a column sorts by it',
    example: 'Table [{ name: "Ana", city: "Vevey", total: 120 }], [{ label: "Name", field: "name" }, { label: "City", field: "city" }, { label: "Total", field: "total", format: "price", align: "right" }], "Orders"',
    source: `
function kb-shown v, format
  if format == "price" then price(v) else if format == "date" then format-date(v) else if format == "number" then format-number(v) else v

component Table rows, columns, heading = ""
  state by = ""
  state down = false
  let ordered = if by == "" then rows else (if down then rows.sort(r -> r[by]).reverse() else rows.sort(r -> r[by]))
  section id slug(heading)
    if heading
      subtitle heading, kb-heading
    box kb-table-frame
      box tag "table", kb-table
        box tag "thead"
          box tag "tr"
            for c in columns
              box tag "th", kb-right (c.align == "right"), attr "scope" "col", attr "aria-sort" (if by != c.field then "none" else if down then "descending" else "ascending")
                button c.label, kb-sort ->
                  down = by == c.field and not down
                  by = c.field
        box tag "tbody"
          for r in ordered
            box tag "tr"
              for c in columns
                text kb-shown(r[c.field], c.format), tag "td", kb-right (c.align == "right")

style kb-table-frame
  margin 24 0 0 0

style kb-table
  width "100%"

style kb-right
  align right

style kb-sort
  background transparent, color ink, padding 0, radius 0, shadow none, weight 700, size 13, uppercase, tracking 1
  hover color accent

css
  .ks-kb-table-frame{overflow-x:auto}
  .ks-kb-table{border-collapse:collapse}
  .ks-kb-table th,.ks-kb-table td{padding:14px 16px;text-align:left;white-space:nowrap}
  .ks-kb-table td{border-top:1px solid var(--k-line);max-width:none}
  .ks-kb-table .ks-kb-right{text-align:right}
  .ks-kb-table th:first-child,.ks-kb-table td:first-child{padding-left:0}
  .ks-kb-table th:last-child,.ks-kb-table td:last-child{padding-right:0}
  .ks-kb-table .ks-kb-sort{box-shadow:none;min-height:0;transform:none}
  .ks-kb-table th[aria-sort=ascending] .ks-kb-sort::after{content:" \u2191"}
  .ks-kb-table th[aria-sort=descending] .ks-kb-sort::after{content:" \u2193"}
${HEADING}`
  },
  Chart: {
    params: 'items, heading = "", unit = "", scale = 0',
    help: 'bars drawn from a list; each item has label and value; unit is written after each figure (" CHF", " %"); scale is the value of a full bar (the tallest one when it is not given): the same for two lists to compare',
    example: 'Chart [{ label: "Jan", value: 1850 }, { label: "Feb", value: 1420 }, { label: "Mar", value: 2360 }], "Donations per month", " CHF"',
    source: `
component Chart items, heading = "", unit = "", scale = 0
  let top = if scale > 0 then scale else max(items.map(i -> i.value))
  section id slug(heading)
    if heading
      subtitle heading, kb-heading
    row kb-chart, attr "role" "img", attr "aria-label" "{heading}: {items.map(i -> "{i.label} {format-number(i.value)}{unit}").join(", ")}"
      for i in items
        column kb-bar
          column kb-bar-plot
            text "{format-number(i.value)}{unit}", kb-bar-value, kb-bar-many (items.length > 8)
            box kb-bar-fill, height "{if top > 0 then i.value * 86 / top else 0}%"
          text i.label, kb-bar-label

style kb-chart
  height 300, gap 10, margin 24 0 0 0
  mobile height 220, gap 4

style kb-bar
  gap 8

style kb-bar-plot
  gap 6

style kb-bar-fill
  background accent, radius 4

style kb-bar-value
  size 12, align center, opacity 0.72
  mobile size 10

style kb-bar-many
  mobile hidden

style kb-bar-label
  size 13, weight 600, align center
  mobile size 11

css
  .ks-kb-chart{align-items:stretch;width:100%;flex-wrap:nowrap}
  .ks-kb-bar{flex:1 1 0;min-width:0;height:100%}
  .ks-kb-bar-plot{flex:1 1 0;min-height:0;justify-content:flex-end;border-bottom:1px solid var(--k-line)}
  .ks-kb-bar-fill{min-height:1px;border-bottom-left-radius:0;border-bottom-right-radius:0}
  .ks-kb-bar-value,.ks-kb-bar-label{max-width:none;white-space:nowrap}
${HEADING}`
  },
  Pricing: {
    params: 'plans, heading = ""',
    help: "price cards, the featured one filled with the accent color; each plan has name, price, and maybe per, text, features (list), button, link, featured (true)",
    example: 'Pricing plans, "Prices"   // plans: [{ name: "Solo", price: "9 CHF", per: "/ month", features: ["1 site"], featured: true }]',
    source: `
component Pricing plans, heading = ""
  section id slug(heading)
    if heading
      subtitle heading, kb-heading
    grid 3 columns, gap 16
      for p in plans
        card kb-plan, kb-plan-best (p.featured == true)
          text p.name, kb-plan-name
          row gap 8
            text p.price, kb-price
            if p.per
              text p.per, kb-soft
          if p.text
            text p.text, kb-soft
          if p.features
            column gap 0
              for f in p.features
                text f, kb-plan-line
          button p.button or "Choose", to p.link or "#contact", outline, margin auto 0 0 0
          enters from bottom
${HEADING}
style kb-plan
  padding 30, gap 14

style kb-plan-best
  background accent

style kb-plan-name
  uppercase, tracking 2, size 13, weight 600

style kb-price
  font "titles", size 52, weight 800, line-height 1, tracking -1

style kb-plan-line
  padding 10 0, border-top 1 line, size 15

style kb-soft
  opacity 0.72
`
  },
  Testimonials: {
    params: 'items, heading = ""',
    help: "quotes of customers, the first one written large; each item has quote, name, and maybe role, photo",
    example: 'Testimonials reviews, "They loved it"   // reviews: [{ quote: "Gorgeous.", name: "Ana", role: "Vevey" }]',
    source: `
component Testimonials items, heading = ""
  section id slug(heading)
    if heading
      subtitle heading, kb-heading
    for t, i in items
      if i == 0
        column kb-quote-first
          text "\u201C{t.quote}\u201D", kb-quote-big
          row gap 12
            if t.photo
              image t.photo, t.name, round, width 44, height 44
            column gap 0
              text t.name, bold
              if t.role
                text t.role, kb-muted
    grid 2 columns, gap 0 56
      mobile columns 1
      for t, i in items
        if i > 0
          column kb-quote
            text "\u201C{t.quote}\u201D", size 19, line-height 1.5
            row gap 12
              if t.photo
                image t.photo, t.name, round, width 44, height 44
              column gap 0
                text t.name, bold
                if t.role
                  text t.role, kb-muted
            enters from bottom
${HEADING}
style kb-quote-first
  gap 22, padding 4 0 40

style kb-quote-big
  font "titles", size 40, line-height 1.15, tracking -1, max-width 900
  mobile size 26

style kb-quote
  gap 16, padding 26 0, border-top 1 line

style kb-muted
  color muted, size 15
`
  },
  Team: {
    params: 'people, heading = ""',
    help: "portraits; each person has name, and maybe role, photo",
    example: 'Team people, "The team"   // people: [{ name: "L\xE9a", role: "Florist", photo: "lea.jpg" }]',
    source: `
component Team people, heading = ""
  section id slug(heading)
    if heading
      subtitle heading, kb-heading
    grid 4 columns, gap 20
      for p in people
        column kb-person
          if p.photo
            image p.photo, p.name
          else
            row kb-avatar
              text p.name[0]
          text p.name, bold
          if p.role
            text p.role, kb-muted
          enters from bottom
${HEADING}
style kb-person
  gap 4
  image margin 0 0 8 0

style kb-avatar
  width 72, height 72, round, background accent, center, margin 0 0 8 0
  text font "titles", size 30, weight 800

style kb-muted
  color muted, size 15
`
  },
  Logos: {
    params: 'images, heading = ""',
    help: "a row of logos (customers, partners, press), its heading at the start of the row",
    example: 'Logos ["acme.svg", "globex.svg"], "They trust us"',
    source: `
component Logos images, heading = ""
  section id slug(heading)
    row kb-logos
      if heading
        text heading, kb-logos-title
      for src in images
        image src, "", height 32

style kb-logos
  gap 44, padding 8 0
  image opacity 0.7, hover opacity 1
  mobile gap 28

style kb-logos-title
  uppercase, tracking 2, size 12, weight 600, opacity 0.7
`
  },
  Gallery: {
    params: 'images, heading = ""',
    help: "a grid of pictures",
    example: 'Gallery ["a.jpg", "b.jpg", "c.jpg"], "Our work"',
    source: `
component Gallery images, heading = ""
  section id slug(heading)
    if heading
      subtitle heading, kb-heading
    grid 3 columns, gap 12
      for src in images
        image src, "", kb-shot
          enters from bottom
${HEADING}
style kb-shot
  hover lift 4
`
  },
  Faq: {
    params: 'items, heading = "Questions"',
    help: "questions that open on click, their heading beside them; each item has q and a",
    example: 'Faq faq   // faq: [{ q: "Do you deliver?", a: "Yes, every day." }]',
    source: `
component Faq items, heading = "Questions"
  section id slug(heading)
    grid columns 1 1.7, gap 56
      tablet columns 1, gap 12
      column
        if heading
          subtitle heading, kb-heading
      column kb-faq
        for f in items
          details f.q
            text f.a
${HEADING}
style kb-faq
  gap 4
  text opacity 0.76
`
  },
  Cta: {
    params: 'heading, intro = "", action = "", href = "#contact"',
    help: "a band in the accent color that asks for the next step: the sentence on one side, the button on the other",
    example: 'Cta "Ready to bloom?", "Order before noon, delivered tonight.", "Order now", "#shop"',
    source: `
component Cta heading, intro = "", action = "", href = "#contact"
  section id slug(heading)
    card kb-cta
      row gap 32
        column gap 10
          subtitle heading
          if intro
            text intro
        if action
          button action, to href, large, margin 0 0 0 auto
            mobile margin 0

style kb-cta
  background accent, padding 56 48
  subtitle font "titles", size 44, line-height 1.05, tracking -1
  text size 19
  button background on-accent, color accent
  mobile padding 36 24
`
  },
  Contact: {
    params: 'to, heading = "Contact", intro = "", thanks = "Thank you! We will answer soon."',
    help: "a contact form (name, email, message) sent by e-mail to the address, its heading beside it",
    example: 'Contact "hello@bloom.ch", "Write to us"',
    source: `
component Contact to, heading = "Contact", intro = "", thanks = "Thank you! We will answer soon."
  section contact
    grid columns 1 1.1, gap 64
      tablet columns 1, gap 20
      column gap 10
        subtitle heading, kb-heading
        if intro
          text intro, kb-contact-intro
      column gap 14
        if sent
          text thanks, bold
        else
          form mail to -> sent = true
            field name "Your name", required, label "Name"
            field email "you@example.com", type email, required, label "Email"
            textarea message "Your message", required, label "Message"
            button "Send", large
${HEADING}
style kb-contact-intro
  size 19, line-height 1.5, max-width 420, opacity 0.76
`
  },
  Footer: {
    params: 'name, note = ""',
    help: "the bottom of the page: \xA9 year and name, and maybe a note",
    example: 'Footer "Bloom", "Flowers in Vevey since 2009"',
    source: `
component Footer name, note = ""
  footer
    text "\xA9 {now().getFullYear()} {name}"
    if note
      text note
`
  }
};

// src/core/index.ts
function compile(source, options = {}) {
  const empty = { ok: false, js: "", css: "", errors: [], warnings: [], fonts: [], site: {}, assets: [], mails: [], map: [] };
  let ast = [];
  const notes = [];
  const written = [];
  try {
    ast = parse(source, notes, written);
  } catch (e2) {
    if (!(e2 instanceof KauryError)) throw e2;
    written.push(e2);
  }
  if (written.length) {
    const lines = /* @__PURE__ */ new Set();
    const errors2 = written.sort((a, b) => a.line - b.line || a.column - b.column).filter((e2) => !lines.has(e2.line) && !!lines.add(e2.line)).slice(0, 30);
    for (const e2 of errors2) e2.file = options.file;
    return { ...empty, errors: errors2 };
  }
  ast = withBlocks(ast);
  const { errors, warnings: found, info } = check(ast, { file: options.file });
  for (const n of notes) n.file = options.file;
  const warnings = [...notes, ...found];
  if (errors.length || options.checkOnly) return { ...empty, ok: !errors.length, errors, warnings, info, ast };
  const out = generate(ast, info, { file: options.file, runtime: options.runtime });
  return { ok: true, js: out.js, css: out.css, errors: [], warnings, info, ast, fonts: out.fonts, site: out.site, assets: out.assets, mails: out.mails, own: out.own, map: out.map };
}
function withBlocks(ast) {
  const used = /* @__PURE__ */ new Map();
  const visit = (x) => {
    if (!x || typeof x !== "object") return;
    if (Array.isArray(x)) return x.forEach(visit);
    if (x.k === "command" && typeof x.head === "string" && new RegExp("^\\p{Lu}", "u").test(x.head) && !used.has(x.head)) used.set(x.head, x.pos);
    for (const key in x) if (key !== "pos" && key !== "binding" && key !== "meaning") visit(x[key]);
  };
  visit(ast);
  const defined = /* @__PURE__ */ new Set();
  const styles = /* @__PURE__ */ new Set();
  for (const s of ast) {
    if (s.k === "component") defined.add(s.name);
    if (s.k === "import") {
      for (const n of [s.default, s.all, ...(s.names ?? []).map((x) => x.alias ?? x.name)]) if (n) defined.add(n);
    }
    if (s.k === "style-def") styles.add(s.name);
  }
  const added = [];
  for (const name of Object.keys(BLOCKS)) {
    const at = used.get(name);
    if (!at || defined.has(name)) continue;
    for (const s of parse(BLOCKS[name].source)) {
      if (s.k === "style-def") {
        if (styles.has(s.name)) continue;
        styles.add(s.name);
      }
      added.push(relocate(s, at));
    }
  }
  return added.length ? [...ast, ...added] : ast;
}
function relocate(x, at) {
  if (!x || typeof x !== "object") return x;
  if (Array.isArray(x)) return x.map((y) => relocate(y, at));
  const out = {};
  for (const [k, v] of Object.entries(x)) out[k] = k === "pos" ? { ...at, length: 0 } : relocate(v, at);
  return out;
}
function formatErrors(r, source) {
  return [...r.errors, ...r.warnings].map((e2) => e2.format(source)).join("\n\n");
}
function sourceMap(r, file, source) {
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
  let prev = 0;
  const lines = [];
  for (const c of r.map) {
    const src = c.source - 1;
    lines.push(vlq(0) + vlq(0) + vlq(src - prev) + vlq(0));
    prev = src;
  }
  return JSON.stringify({ version: 3, file: file + ".js", sources: [file], sourcesContent: [source], names: [], mappings: lines.join(";") });
}
export {
  BLOCKS,
  KauryError,
  KauryErrors,
  assetPath,
  check,
  compile,
  fontUrl,
  formatErrors,
  generate,
  getLanguage,
  globals_exports as globals,
  jsName,
  keywords_exports as keywords,
  msg,
  parse,
  setLanguage,
  sourceMap,
  tokenize,
  vocabulary_exports as vocabulary
};
//# sourceMappingURL=core.js.map
