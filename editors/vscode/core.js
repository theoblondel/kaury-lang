var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/core/errors.ts
function detectLanguage() {
  const g2 = globalThis;
  const env = g2.process?.env?.KAURY_LANG;
  if (env === "fr" || env === "en") return env;
  try {
    const loc = g2.navigator?.language ?? Intl.DateTimeFormat().resolvedOptions().locale ?? "";
    if (String(loc).toLowerCase().startsWith("fr")) return "fr";
  } catch {
  }
  return "en";
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
var isLetter = (c) => /[\p{L}_$]/u.test(c);
var isDigit = (c) => c >= "0" && c <= "9";
var isWordChar = (c) => /[\p{L}\p{N}_$]/u.test(c);
function tokenize(source) {
  const tokens = [];
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const stack = [0];
  let depth = 0;
  const openers = [];
  const push = (t) => tokens.push(t);
  for (let li = 0; li < lines.length; li++) {
    const line = lines[li];
    const lineNo = li + 1;
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
      const top = stack[stack.length - 1];
      if (indent > top) {
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
      if (/^(js|javascript)\s*(\/\/.*)?$/.test(rest)) {
        push({ t: "word", v: "js", line: lineNo, column: indent + 1, end: indent + 3, spaceBefore: true });
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
      const op = OPS.find((o2) => line.startsWith(o2, i));
      if (op) {
        const tok = { t: "op", v: op, line: lineNo, column: col, end: col + op.length, spaceBefore: space };
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
          msg("interpolation \xAB { \xBB never closed in this text.", "insertion \xAB { \xBB jamais referm\xE9e dans ce texte."),
          msg("close it with \xAB } \xBB, or write \\{ for a real brace.", "ferme-la avec \xAB } \xBB, ou \xE9cris \\{ pour une vraie accolade.")
        );
      }
      const code = line.slice(i + 1, j);
      if (!code.trim()) {
        throw new KauryError(
          { line: lineNo, column: i + 1, length: 2 },
          msg("empty interpolation \xAB {} \xBB in a text.", "insertion vide \xAB {} \xBB dans un texte."),
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

// src/core/keywords.ts
var keywords_exports = {};
__export(keywords_exports, {
  RESERVED: () => RESERVED,
  aliasesOf: () => aliasesOf,
  allKeywords: () => allKeywords,
  canon: () => canon,
  canonValue: () => canonValue,
  isKeyword: () => isKeyword,
  stripAccents: () => stripAccents
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
  // « tant que »
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
  none: ["rien", "null", "nothing"],
  and: ["et"],
  or: ["ou"],
  not: ["non"],
  open: ["ouvre"],
  close: ["ferme"],
  toggle: ["bascule"],
  go: ["aller", "goto"],
  js: ["javascript"],
  // ---- web ----
  site: [],
  page: [],
  component: ["composant"],
  section: [],
  header: ["entete"],
  footer: ["pied"],
  nav: [],
  grid: ["grille"],
  column: ["colonne"],
  row: ["ligne"],
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
  textarea: ["zone"],
  select: ["choix"],
  checkbox: ["case"],
  list: ["liste"],
  item: ["element"],
  icon: ["icone"],
  divider: ["separateur"],
  spacer: ["espaceur"],
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
  inner: ["interieure"],
  center: ["centre"],
  justify: ["justifie"],
  pointer: ["main", "hand"],
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

// src/core/parser.ts
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
function parse(source) {
  return new Parser(tokenize(source)).program();
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
  constructor(tokens) {
    this.tokens = tokens;
  }
  tokens;
  i = 0;
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
  endOfLine(fix) {
    const t = this.peek();
    if (t.t === "newline") {
      this.next();
      return;
    }
    if (t.t === "eof" || t.t === "dedent") return;
    if (t.t === "op" && t.v === "=") {
      throw this.error(t, msg("\xAB = \xBB cannot be here.", "\xAB = \xBB ne peut pas \xEAtre ici."), msg("to compare two values, write \xAB == \xBB.", "pour comparer deux valeurs, \xE9cris \xAB == \xBB."));
    }
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
        throw this.error(
          t,
          msg("this line is indented but belongs to no block.", "cette ligne est indent\xE9e alors qu'elle n'appartient \xE0 aucun bloc."),
          msg("remove the spaces at the start of the line, or put it under a line that opens a block (page, if, for\u2026).", "retire les espaces au d\xE9but de la ligne, ou place-la sous une ligne qui ouvre un bloc (page, si, pour\u2026).")
        );
      }
      body.push(this.statement());
    }
    return body;
  }
  block(what) {
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
        throw this.error(this.peek(), msg("this line is indented too much.", "cette ligne est trop indent\xE9e."), msg("align it with the line above.", "aligne-la avec la ligne au-dessus."));
      }
      body.push(this.statement());
    }
    if (this.peek().t === "dedent") this.next();
    return body;
  }
  optionalBlock() {
    return this.peek().t === "indent" ? this.block(msg("this line", "cette ligne")) : [];
  }
  // ---------- statements ----------
  statement(inlineAction = false) {
    const t = this.peek();
    if (t.t === "word") {
      const c = canon(t.v);
      switch (c) {
        case "let":
        case "state":
          if (this.peek(1).t === "word") return this.declaration(c === "state");
          break;
        case "function":
          return this.functionDecl();
        case "if":
          return this.ifStmt();
        case "else":
          throw this.error(
            t,
            msg("\xAB else \xBB without an \xAB if \xBB right above.", "\xAB sinon \xBB sans \xAB si \xBB juste au-dessus."),
            msg("put \xAB else \xBB at the same level as its \xAB if \xBB, right after the \xAB if \xBB block.", "place \xAB sinon \xBB au m\xEAme niveau que son \xAB si \xBB, juste apr\xE8s le bloc du \xAB si \xBB.")
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
          if (raw.t !== "raw") throw this.error(t, msg("\xAB js \xBB must be alone on its line, with the JavaScript code indented below.", "\xAB js \xBB doit \xEAtre seul sur sa ligne, avec le code JavaScript indent\xE9 dessous."));
          this.next();
          this.endOfLine();
          return { k: "js", code: raw.v, pos: this.pos(t) };
        }
        case "component":
          return this.component();
        case "page":
          if (this.peek(1).t === "text") return this.page();
          break;
        case "site":
          if (!this.assignmentFollows()) return this.site();
          break;
      }
      if (this.isUiHead()) return this.command();
    }
    const e2 = this.expression(FREE);
    const op = this.peek();
    if (op.t === "op" && ASSIGN_OPS.has(op.v)) {
      if (e2.k !== "name" && e2.k !== "member" && e2.k !== "index") {
        throw this.error(
          op,
          msg("nothing can be stored on the left of this \xAB = \xBB.", "on ne peut rien ranger \xE0 gauche de ce \xAB = \xBB."),
          msg("the left of \xAB = \xBB must be a name: total = 3.", "\xE0 gauche d'un \xAB = \xBB, il faut un nom : total = 3.")
        );
      }
      this.next();
      const value = this.expression(FREE);
      this.endOfLine();
      return { k: "assign", target: e2, op: op.v, value, pos: this.pos(t) };
    }
    if (op.t === "op" && op.v === "->") {
      throw this.error(
        op,
        msg("\xAB -> \xBB must follow a UI element or a parameter.", "\xAB -> \xBB doit suivre un \xE9l\xE9ment d'interface ou un param\xE8tre."),
        msg('examples: button "Ok" -> count += 1   or   sum list, a -> a.price', 'exemples : bouton "Ok" -> compteur += 1   ou   somme liste, a -> a.prix')
      );
    }
    if (!inlineAction && (this.peek().t === "indent" || this.peek().t === "newline" && this.peek(1).t === "indent")) {
      const word = e2.k === "name" ? e2.name : e2.k === "call" && e2.fn.k === "name" ? e2.fn.name : void 0;
      const sug = word ? closest(word, [...UI_HEADS, "component", "function", "page", "site", "for", "if"]) : void 0;
      if (word && sug) {
        throw new KauryError(
          { ...e2.pos, length: word.length },
          msg(`${q(word)} is not a Kaury word.`, `${q(word)} n'est pas un mot de Kaury.`),
          msg(`did you mean ${q(sug)}?`, `tu voulais dire ${q(sug)} ?`)
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
  /** Is the next token an assignment (« site = 3 »)? */
  assignmentFollows() {
    const s = this.peek(1);
    return s.t === "op" && (ASSIGN_OPS.has(s.v) || (s.v === "." || s.v === "(" || s.v === "[") && !s.spaceBefore);
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
      throw this.error(this.peek(), msg(`\xAB = \xBB is missing after ${q(name.v)}.`, `il manque \xAB = \xBB apr\xE8s ${q(name.v)}.`), `${kw} ${name.v} = 0`);
    }
    this.next();
    const value = this.expression(FREE);
    this.endOfLine();
    return { k: "let", name: name.v, value, reactive, pos: this.pos(t) };
  }
  params(end) {
    const params = [];
    while (!end(this.peek())) {
      const p = this.peek();
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
    const params = this.params((j) => j.t === "newline" || j.t === "eof" || j.t === "word" && canon(j.v) === "then");
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
    this.endOfLine(msg("after the condition, start a new line (or write \xAB then \xBB for an action on the same line).", "apr\xE8s la condition, passe \xE0 la ligne (ou \xE9cris \xAB puis \xBB pour une action sur la m\xEAme ligne)."));
    return this.block(what);
  }
  ifStmt() {
    const t = this.next();
    const cond = this.condition();
    const then = this.ifBody("\xAB if \xBB");
    const elifs = [];
    let otherwise;
    while (this.isWord("else")) {
      const s = this.next();
      if (this.isWord("if")) {
        this.next();
        const c = this.condition();
        elifs.push({ cond: c, body: this.ifBody("\xAB else if \xBB"), pos: this.pos(s) });
      } else {
        otherwise = this.ifBody("\xAB else \xBB");
        break;
      }
    }
    return { k: "if", cond, then, elifs, else: otherwise, pos: this.pos(t) };
  }
  condition() {
    const e2 = this.expression(FREE);
    if (this.isOp("=")) {
      throw this.error(this.peek(), msg("\xAB = \xBB stores a value; it does not compare.", "\xAB = \xBB range une valeur ; il ne compare pas."), msg("to compare, write \xAB == \xBB.", "pour comparer, \xE9cris \xAB == \xBB."));
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
    const body = this.block("\xAB for \xBB");
    return { k: "for", variable: v.v, index, source, body, pos: this.pos(t) };
  }
  whileStmt() {
    const t = this.next();
    if (t.v === "tant") this.expectWord("que", "tant que vies > 0");
    const cond = this.condition();
    this.endOfLine();
    const body = this.block("\xAB while \xBB");
    return { k: "while", cond, body, pos: this.pos(t) };
  }
  tryStmt() {
    const t = this.next();
    this.endOfLine();
    const body = this.block("\xAB try \xBB");
    let variable;
    let handler;
    if (this.isWord("catch")) {
      this.next();
      if (this.peek().t === "word") variable = this.next().v;
      this.endOfLine();
      handler = this.block("\xAB catch \xBB");
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
    const params = this.params((j) => j.t === "newline" || j.t === "eof");
    this.endOfLine();
    const body = this.block(msg(`the component ${q(name.v)}`, `le composant ${q(name.v)}`));
    return { k: "component", name: name.v, params, body, pos: this.pos(t) };
  }
  page() {
    const t = this.next();
    const c = this.peek();
    if (!c.v.startsWith("/")) throw this.error(c, msg(`a page address starts with \xAB / \xBB: ${q(c.v)}.`, `l'adresse d'une page commence par \xAB / \xBB : ${q(c.v)}.`), `page "/${c.v}"`);
    const address = this.primary(FREE);
    let each;
    if (this.isWord("for")) {
      this.next();
      const v = this.expectName(msg("the page variable", "la variable de la page"), 'page "/blog/{post.slug}" for post in posts');
      this.expectWord("in", 'page "/blog/{post.slug}" for post in posts');
      each = { variable: v.v, source: this.expression(FREE) };
    } else if (address.parts.some((p) => typeof p !== "string")) {
      throw this.error(c, msg("an address with {\u2026} needs \xAB for \u2026 in \u2026 \xBB to know which pages to build.", "une adresse avec {\u2026} a besoin de \xAB for \u2026 in \u2026 \xBB pour savoir quelles pages construire."), 'page "/blog/{post.slug}" for post in posts');
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
    const body = this.optionalBlock();
    return { k: "site", name, body, pos: this.pos(t) };
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
        throw this.error(s, msg("\xAB on \xBB must be followed by click, hover, scroll or load.", "\xAB au \xBB doit \xEAtre suivi de clic, survol, defilement ou chargement."), "on click -> jump");
      }
    }
    const items = [];
    let action;
    let children = [];
    while (true) {
      const v = this.peek();
      if (v.t === "newline" || v.t === "eof" || v.t === "indent" || v.t === "dedent") break;
      if (v.t === "op" && v.v === "->") break;
      if (v.t === "op" && v.v === ",") {
        if (!items.length && !head.includes("-")) {
          throw this.error(v, msg("unexpected comma right after the head word.", "virgule inattendue juste apr\xE8s le mot de t\xEAte."), `${t.v} "content", option`);
        }
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
        action = this.block("\xAB -> \xBB");
      } else if (this.peek().t === "eof") {
        throw this.error(arrow, msg("\xAB -> \xBB must be followed by an action.", "\xAB -> \xBB doit \xEAtre suivi d'une action."), `${t.v} -> count += 1`);
      } else {
        action = [this.statement(true)];
        children = this.optionalBlock();
      }
    } else {
      this.endOfLine();
      children = this.optionalBlock();
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
      if (v.t === "op" && v.v === ")") throw this.error(v, msg("\xAB ) \xBB without \xAB ( \xBB.", "\xAB ) \xBB sans \xAB ( \xBB."));
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
    if (this.peek().t === "word" && this.isActionAhead()) return [this.statement()];
    return this.expression(FREE);
  }
  /** In a lambda, an assignment « -> total += 1 » is an action. Also UI motions (-> jump). */
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
          else if (!this.isOp(")")) throw this.error(this.peek(), msg("\xAB , \xBB or \xAB ) \xBB is missing in this call.", "il manque \xAB , \xBB ou \xAB ) \xBB dans cet appel."), "f(a, b)");
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
            else if (!this.isOp("]")) throw this.error(this.peek(), msg("\xAB , \xBB is missing between two list items.", "il manque \xAB , \xBB entre deux \xE9l\xE9ments de la liste."), "[1, 2, 3]");
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
              } else throw this.error(this.peek(), msg(`\xAB : \xBB is missing after the key ${q(k.v)}.`, `il manque \xAB : \xBB apr\xE8s la cl\xE9 ${q(k.v)}.`), '{ name: "Strawberry" }');
            }
            if (this.isOp(",")) this.next();
            else if (!this.isOp("}")) throw this.error(this.peek(), msg("\xAB , \xBB is missing between two properties.", "il manque \xAB , \xBB entre deux propri\xE9t\xE9s."), '{ name: "Strawberry", price: 4 }');
          }
          this.next();
          return { k: "object", props, pos: this.pos(t) };
        }
        if (t.v === "->") throw this.error(t, msg("\xAB -> \xBB without a parameter before it.", "\xAB -> \xBB sans param\xE8tre devant."), "x -> x * 2");
        break;
      }
    }
    throw this.error(
      t,
      msg(`I expected a value, but I see ${this.describe(t)}.`, `je m'attendais \xE0 une valeur, mais je vois ${this.describe(t)}.`),
      t.t === "indent" ? msg("this line may be indented too much.", "cette ligne est peut-\xEAtre trop indent\xE9e.") : msg('a number, a "text", a name, a [list] or an {object}.', 'un nombre, un "texte", un nom, une [liste] ou un {objet}.')
    );
  }
};

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
  allOptions: () => allOptions,
  elementOption: () => elementOption,
  knownColor: () => knownColor,
  optionSpec: () => optionSpec,
  styleOption: () => styleOption
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
  transparent: "transparent"
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
  nuit: "night"
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
  weight: o("n", ["poids"], "font weight (100 to 900)", "\xE9paisseur du texte (100 \xE0 900)", "weight 600"),
  italic: o("", ["italique"], "italic text", "texte en italique", "italic"),
  underline: o("", ["souligne"], "underlined text", "texte soulign\xE9", "underline"),
  uppercase: o("", ["majuscules", "caps"], "uppercase text", "texte en majuscules", "uppercase"),
  "line-height": o("n", ["interligne"], "line height (1.5 = one and a half)", "hauteur de ligne (1.5 = une fois et demie)", "line-height 1.6"),
  tracking: o("n", ["lettres", "letter-spacing"], "space between letters", "espace entre les lettres", "tracking 2"),
  align: o("m", ["aligne"], "text alignment", "alignement du texte", "align center", ["left", "center", "right", "justify"]),
  center: o("", ["centre", "centered"], "centers the content", "centre le contenu", "center"),
  radius: o("n", ["coins", "rounded"], "corner radius", "arrondi des coins", "radius 12"),
  round: o("", ["rond", "pill"], "fully round corners", "coins compl\xE8tement ronds", "round"),
  shadow: o("m?", ["ombre"], "drop shadow", "ombre port\xE9e", "shadow soft", ["soft", "medium", "strong", "none", "inner"]),
  border: o("n?c?", ["bordure"], "border (width, color)", "bordure (\xE9paisseur, couleur)", "border 1 gray"),
  margin: o("nnnn", ["marge"], "space around (1 to 4 values)", "espace autour (1 \xE0 4 valeurs)", "margin 24"),
  padding: o("nnnn", ["remplissage", "interieur"], "inner space (1 to 4 values)", "espace int\xE9rieur (1 \xE0 4 valeurs)", "padding 32"),
  gap: o("n", ["espace", "spacing"], "space between children", "espace entre les enfants", "gap 24"),
  width: o("n", ["largeur"], "width", "largeur", "width 320"),
  height: o("n", ["hauteur"], "height", "hauteur", "height 400"),
  "max-width": o("n", ["max-largeur"], "maximum width", "largeur maximale", "max-width 720"),
  "min-height": o("n", ["min-hauteur"], "minimum height", "hauteur minimale", "min-height 300"),
  fullscreen: o("", ["plein-ecran", "full"], "fills the whole screen height", "occupe toute la hauteur de l'\xE9cran", "fullscreen"),
  "full-width": o("", ["pleine-largeur", "bleed"], "fills the whole width, no margins", "occupe toute la largeur, sans marges", "full-width"),
  opacity: o("n", ["opacite"], "opacity from 0 to 1", "opacit\xE9 de 0 \xE0 1", "opacity 0.8"),
  blur: o("n", ["flou"], "blur", "flou", "blur 8"),
  glass: o("", ["verre"], "frosted glass effect", "effet verre d\xE9poli", "glass"),
  gradient: o("cc?c?n?", ["degrade"], "gradient background (2 or 3 colors, angle)", "fond en d\xE9grad\xE9 (2 ou 3 couleurs, angle)", "gradient pink orange"),
  "text-gradient": o("cc?c?", ["texte-degrade"], "gradient text", "texte en d\xE9grad\xE9", "text-gradient pink purple"),
  columns: o("n", ["colonnes", "colonne", "cols", "column"], "number of columns", "nombre de colonnes", "grid 3 columns"),
  direction: o("m", [], "direction of the children", "sens des enfants", "direction row", ["row", "column"]),
  hidden: o("", ["cache", "hide"], "hides the element", "cache l'\xE9l\xE9ment", "mobile hidden"),
  sticky: o("", ["colle"], "stays at the top while scrolling", "reste coll\xE9 en haut au d\xE9filement", "sticky"),
  front: o("", ["devant"], "goes in front of other elements", "passe devant les autres \xE9l\xE9ments", "front"),
  cursor: o("m", ["curseur"], "cursor shape", "forme du curseur", "cursor pointer", ["pointer", "arrow", "text", "none"]),
  hover: o("*", ["survol"], "style when the mouse is over it", "style quand la souris passe dessus", "hover lift 4"),
  lift: o("n", ["monte"], "moves up", "d\xE9cale vers le haut", "hover lift 4"),
  grow: o("n?", ["grossit", "scale"], "enlarges (1.1 = +10 %)", "agrandit (1.1 = +10 %)", "hover grow 1.05"),
  tilt: o("n", ["penche"], "tilts (degrees)", "incline (degr\xE9s)", "tilt -3"),
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
  link: { "new-tab": o("", ["nouvel", "blank"], "opens in a new tab", "ouvre dans un nouvel onglet", "new-tab") },
  field: {
    type: o("m", [], "kind of field", "genre de champ", "type email", ["text", "email", "number", "password", "date", "tel", "url", "search"]),
    required: o("", ["requis"], "mandatory", "obligatoire", "required"),
    label: o("t", ["etiquette"], "text above the field", "texte au-dessus du champ", 'label "Your email"')
  },
  textarea: {
    required: o("", ["requis"], "mandatory", "obligatoire", "required"),
    label: o("t", ["etiquette"], "text above", "texte au-dessus", 'label "Message"'),
    rows: o("n", ["lignes"], "height in lines", "hauteur en lignes", "rows 5")
  },
  select: { label: o("t", ["etiquette"], "text above", "texte au-dessus", 'label "Size"') },
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
    immediate: o("", ["immediat"], "starts the 3D without waiting for a first gesture", "d\xE9marre la 3D sans attendre un premier geste", "immediate")
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
  slot: e("div", "special", "inside a component: where the content given between its lines goes", "dans un composant : l\xE0 o\xF9 va le contenu donn\xE9 entre ses lignes", "slot"),
  scene: e("div", "immersion", "2D or 3D immersive area", "zone immersive 2D ou 3D", "scene"),
  object: e("div", "immersion", "object .glb, .gltf, .png, .svg, .json (Lottie)", "objet .glb, .gltf, .png, .svg, .json (Lottie)", 'object can "crush.glb"'),
  character: e("div", "immersion", "animated object with named animations", "objet anim\xE9 avec animations nomm\xE9es", 'character "mascot.glb"'),
  sound: e("audio", "immersion", "sound or music, with a mute button", "son ou musique, avec bouton muet", 'sound "ambient.mp3", loop')
};
var SETTINGS = /* @__PURE__ */ new Set(["style", "mobile", "tablet", "desktop", "seo", "colors", "font", "fonts", "lang", "favicon", "url", "light", "camera", "transition"]);
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
  const table = ELEMENT_OPTIONS[head];
  if (!table) return void 0;
  const w = stripAccents(word);
  for (const [name, s] of Object.entries(table)) {
    if (name === w || (s.aliases ?? []).includes(w)) return name;
  }
  return void 0;
}
function optionSpec(head, name) {
  return ELEMENT_OPTIONS[head]?.[name] ?? STYLES[name];
}
function allOptions(head) {
  return [...Object.keys(ELEMENT_OPTIONS[head] ?? {}), ...Object.keys(STYLES)];
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
  kauryMethod: () => kauryMethod
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
  "format-date": g("formatDate", "formats a date: format-date now()", []),
  shuffle: g("shuffle", "shuffles a list", ["melange"]),
  range: g("range", "list of numbers: range 1, 5", ["intervalle"]),
  every: g("every", "repeats an action: every 2s, -> count += 1", ["repete", "repeat"]),
  later: g("later", "delayed action: later 1s, -> close menu", ["plus-tard"]),
  persist: g("persist", 'keeps a state in the browser: persist "cart", cart', ["memorise"]),
  copy: g("copy", "copies a text to the clipboard", ["copie"]),
  confetti: g("confetti", "throws confetti on the screen", ["confettis"]),
  vibrate: g("vibrate", "makes the phone vibrate", ["vibre"]),
  "scroll-to": g("scrollTo", 'scrolls to a section: scroll-to "flavors"', ["defile"]),
  share: g("share", "opens the phone share sheet", ["partage"])
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
  /** Scope that receives implicit declarations (« x = 3 » without let/state). */
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
function check(program, options = {}) {
  const c = new Checker();
  c.module(program);
  for (const e2 of [...c.errors, ...c.warnings]) e2.file = options.file;
  return { errors: c.errors, warnings: c.warnings, info: c.info };
}
var NAMED_CONTAINERS = ["section", "box", "grid", "row", "column", "scene", "card", "form", "list", "header", "footer", "nav"];
var FIELD_HEADS = ["field", "textarea", "select", "checkbox"];
var CONTENT_HEADS = /* @__PURE__ */ new Set(["title", "subtitle", "text", "item", "icon", "button", "link", "image", "video", "card", "logo", "markdown"]);
var SITE_SETTINGS = ["colors", "font", "fonts", "lang", "favicon", "url", "seo", "style", "transition", "mobile", "tablet", "desktop", "sound"];
var Checker = class {
  errors = [];
  warnings = [];
  info = { pages: [], components: [], immersion: false, threeD: false, lottie: false, colors: {}, exports: [] };
  components = /* @__PURE__ */ new Set();
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
    for (const [name, b] of s.names) {
      if (!b.used && b.kind === "state" && !this.info.exports.includes(name) && b.pos) {
        this.warn(b.pos, msg(`the state ${q(name)} is never used.`, `l'\xE9tat ${q(name)} n'est jamais utilis\xE9.`), msg("remove it, or show it somewhere.", "supprime-le, ou affiche-le quelque part."));
      }
    }
  }
  readSiteColors(body) {
    for (const i of body) {
      if (i.k === "command" && i.head === "colors") {
        for (const it of i.items) {
          const [n, c] = it.atoms;
          if (n?.k === "name" && c?.k === "color") this.info.colors[n.name] = c.v;
          else if (n?.k === "name" && c?.k === "name" && knownColor(c.name)) this.info.colors[n.name] = `var(--k-${knownColor(c.name)})`;
          else this.err(it.pos, msg("each color is written \xAB name #code \xBB.", "chaque couleur s'\xE9crit \xAB nom #code \xBB."), "colors pink #FF4F8B, cream #FFF4E8");
        }
      }
    }
  }
  /** Declares ahead what a block defines (functions, components, imports) so it can be used before its line. */
  hoist(body, s) {
    for (const i of body) {
      switch (i.k) {
        case "function":
          this.declare(s, i.name, "function", i.pos);
          if (i.exported) this.info.exports.push(i.name);
          break;
        case "component":
          this.declare(s, i.name, "component", i.pos);
          this.components.add(i.name);
          this.info.components.push(i.name);
          if (i.exported) this.info.exports.push(i.name);
          break;
        case "import":
          for (const n of [i.default, i.all, ...(i.names ?? []).map((x) => x.alias ?? x.name)]) {
            if (n) {
              this.declare(s, n, new RegExp("^\\p{Lu}", "u").test(n) && i.source.endsWith(".kaury") ? "component" : "import", i.pos);
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
        msg(`to change its value, just write \xAB ${name} = \u2026 \xBB.`, `pour changer sa valeur, \xE9cris simplement \xAB ${name} = \u2026 \xBB.`)
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
        if (i.k === "if") {
          walk(i.then);
          i.elifs.forEach((x) => walk(x.body));
          if (i.else) walk(i.else);
        } else if (i.k === "for" || i.k === "while") walk(i.body);
        else if (i.k === "try") {
          walk(i.body);
          if (i.handler) walk(i.handler);
        } else if (i.k === "command" && host.isView()) {
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
        if (i.exported) this.info.exports.push(i.name);
        break;
      }
      case "assign": {
        this.expr(i.value, s);
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
                msg(`${q(i.target.name)} is declared with \xAB let \xBB: its value is fixed.`, `${q(i.target.name)} est d\xE9clar\xE9 avec \xAB soit \xBB : sa valeur est fixe.`),
                msg(`declare it with \xAB state ${i.target.name} = \u2026 \xBB to be able to change it.`, `d\xE9clare-le avec \xAB etat ${i.target.name} = \u2026 \xBB pour pouvoir le changer.`)
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
        this.block(i.then, s);
        for (const x of i.elifs) {
          this.expr(x.cond, s);
          this.block(x.body, s);
        }
        if (i.else) this.block(i.else, s);
        break;
      case "for": {
        this.expr(i.source, s);
        const b = new Scope("block", s);
        this.declare(b, i.variable, "loop", i.pos);
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
        break;
      case "return":
        if (i.value) this.expr(i.value, s);
        break;
      case "expr":
        this.expr(i.e, s);
        break;
      case "toggle":
        this.expr(i.target, s);
        if (i.target.k === "name" && i.target.binding) i.target.binding.mutated = true;
        break;
      case "go":
        this.expr(i.path, s);
        break;
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
          this.declare(pg, i.each.variable, "loop", i.pos).used = true;
          if (i.address) this.expr(i.address, pg);
        }
        this.hoist(i.body, pg);
        this.statements(i.body, pg);
        break;
      }
      case "site": {
        if (i.name) this.expr(i.name, s);
        for (const c of i.body) {
          if (c.k !== "command" || !SITE_SETTINGS.includes(c.head)) {
            this.err(
              c.pos,
              msg("\xAB site \xBB only holds settings: colors, font, lang, favicon, url, seo, style, transition.", "dans \xAB site \xBB, on ne met que des r\xE9glages : couleurs, police, langue, favicon, adresse, seo, style, transition."),
              msg('move this element into a page "/".', 'd\xE9place cet \xE9l\xE9ment dans une page "/".')
            );
            continue;
          }
          this.command(c, s, "site");
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
          if (b && (b.kind === "state" || b.kind === "derived" || b.kind === "prop")) yes = true;
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
    const sug = closest(name, [...s.all(), ...globalNames()]);
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
    const element = sug ? void 0 : closest(name, Object.keys(ELEMENTS));
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
      case "text":
        for (const m of e2.parts) if (typeof m !== "string") this.expr(m, s);
        return;
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
      case "member":
        this.expr(e2.object, s);
        return;
      case "index":
        this.expr(e2.object, s);
        this.expr(e2.index, s);
        return;
      case "call":
        this.expr(e2.fn, s);
        e2.args.forEach((x) => this.expr(x, s));
        if (e2.fn.k === "name" && e2.fn.binding?.kind === "component") {
          this.err(
            e2.pos,
            msg(`${q(e2.fn.name)} is a component: it is used at the start of a line, not like a function.`, `${q(e2.fn.name)} est un composant : il s'utilise en d\xE9but de ligne, pas comme une fonction.`),
            `${e2.fn.name} ${e2.args.length ? "\u2026" : ""}`.trim()
          );
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
        for (const n of e2.params) this.declare(l, n, "param", e2.pos);
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
          sug ? msg(`did you mean ${q(sug)}?`, `tu voulais dire ${q(sug)} ?`) : msg(`create it with \xAB component ${head} \u2026 \xBB or import it: import ${head} from "./${head.toLowerCase()}.kaury"`, `cr\xE9e-le avec \xAB composant ${head} \u2026 \xBB ou importe-le : importe ${head} de "./${head.toLowerCase()}.kaury"`)
        );
      } else b.used = true;
      const positional2 = [];
      for (const it of c.items) for (const a of it.atoms) {
        this.expr(a, s);
        positional2.push(a);
      }
      c.meaning = { kind: "component", positional: positional2, options: [] };
      this.children(c, s);
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
      let opt = word ? elementOption(optionHead, word) ?? (kind !== "motion" && kind !== "event" && kind !== "setting" ? styleOption(word) : void 0) : void 0;
      const firstContent = it === c.items[0] && CONTENT_HEADS.has(head);
      if (opt && word && a.length === 1 && s.find(word) && (firstContent || (optionSpec(optionHead, opt)?.args ?? "").replace(/\?/g, "").length > 0)) opt = void 0;
      if (opt) {
        const values = a.slice(1);
        values.forEach((x) => this.checkValue(x, s));
        if (opt === "hover") inHover = true;
        options.push({ name: inHover && opt !== "hover" ? `hover:${opt}` : opt, values, pos: it.pos });
        if (opt === "hover" && values.length) {
          const v0 = values[0];
          const sub = v0.k === "name" ? styleOption(v0.name) : void 0;
          if (!sub) this.err(it.pos, msg("\xAB hover \xBB must be followed by a style.", "\xAB survol \xBB doit \xEAtre suivi d'un style."), "hover lift 4   /   hover background pink");
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
      }
      if (kind !== "setting" && kind !== "motion" && a.length === 1 && (a0.k === "color" || word && !s.find(word) && (this.info.colors[word] || knownColor(word)))) {
        options.push({ name: inHover ? "hover:tint" : "tint", values: [a0], pos: it.pos });
        continue;
      }
      if (word && !s.find(word) && !kauryGlobal(word) && !JS_GLOBALS.has(word)) {
        if (NAMED_CONTAINERS.includes(head) && !positional.length && a.length === 1 && !objectName) {
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
        if (FIELD_HEADS.includes(head) && !positional.length) {
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
          const all = [...allOptions(optionHead), ...Object.keys(this.info.colors)];
          const sug = closest(word, all);
          const sugVar = closest(word, s.all());
          this.err(
            { ...it.pos, length: word.length },
            msg(`${q(word)} is neither an option of ${q(c.rawHead)} nor a known name.`, `${q(word)} n'est ni une option de ${q(c.rawHead)}, ni un nom connu.`),
            sug ? msg(`did you mean ${q(sug)}?`, `tu voulais dire ${q(sug)} ?`) : sugVar ? msg(`did you mean the variable ${q(sugVar)}?`, `tu voulais dire la variable ${q(sugVar)} ?`) : msg(`possible options: ${allOptions(optionHead).slice(0, 8).join(", ")}\u2026`, `options possibles : ${allOptions(optionHead).slice(0, 8).join(", ")}\u2026`)
          );
          continue;
        }
      }
      for (const x of a) {
        this.expr(x, s);
        positional.push(x);
      }
    }
    c.meaning = { kind, positional, options, objectName };
    this.checkCommand(c, parent);
    if (objectName && (head === "object" || head === "character")) {
      const b = this.declare(s.host(), objectName, "object", c.pos);
      b.used = true;
    }
    this.children(c, s);
  }
  checkValue(x, s) {
    if (x.k === "name" && !s.find(x.name) && !kauryGlobal(x.name) && !JS_GLOBALS.has(x.name)) return;
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
        msg(`${spec.example}   (if ${q(opt)} is your variable, write (${opt}))`, `${spec.example}   (si c'est ta variable ${q(opt)}, \xE9cris (${opt}))`)
      );
    } else if (values.length > max && spec.args !== "e") {
      this.err(
        pos,
        msg(`${q(opt)} takes at most ${max === 0 ? "no value" : max === 1 ? "one value" : `${max} values`}.`, `${q(opt)} prend au plus ${max === 0 ? "aucune valeur" : max === 1 ? "une valeur" : `${max} valeurs`}.`),
        msg(`separate the options with commas: ${spec.example}`, `s\xE9pare les options par des virgules : ${spec.example}`)
      );
    }
    const v0 = values[0];
    if (spec.words && v0?.k === "name" && !spec.words.includes(canonValue(v0.name))) {
      const sug = closest(v0.name, spec.words);
      this.err(
        pos,
        msg(`${q(opt)} does not accept ${q(v0.name)}.`, `${q(opt)} n'accepte pas ${q(v0.name)}.`),
        sug ? msg(`did you mean \xAB ${opt} ${sug} \xBB?`, `tu voulais dire \xAB ${opt} ${sug} \xBB ?`) : msg(`possible values: ${spec.words.join(", ")}`, `valeurs possibles : ${spec.words.join(", ")}`)
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
        break;
      case "link":
        if (!n) this.err(c.pos, msg("\xAB link \xBB needs a text and an address.", "\xAB lien \xBB a besoin d'un texte et d'une adresse."), 'link "Contact" "/contact"');
        break;
      case "object":
      case "character": {
        if (!n) this.err(c.pos, msg(`${q(c.rawHead)} needs its file.`, `${q(c.rawHead)} a besoin de son fichier.`), `${c.rawHead} can "crush.glb"`);
        const src = m.positional[0];
        if (src?.k === "text" && src.parts.length === 1 && typeof src.parts[0] === "string") {
          const f = src.parts[0].toLowerCase();
          if (/\.(glb|gltf)(\?|$)/.test(f)) this.info.threeD = true;
          else if (/\.(json|lottie)(\?|$)/.test(f)) this.info.lottie = true;
          else if (!/\.(png|jpe?g|webp|avif|gif|svg)(\?|$)/.test(f)) {
            this.err(
              src.pos,
              msg(`unknown file format for ${q(c.rawHead)}.`, `format de fichier non reconnu pour ${q(c.rawHead)}.`),
              msg("accepted formats: .glb, .gltf (3D), .png, .jpg, .webp, .svg (2D), .json (Lottie).", "formats accept\xE9s : .glb, .gltf (3D), .png, .jpg, .webp, .svg (2D), .json (Lottie).")
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
            sug ? msg(`did you mean \xAB light ${sug} \xBB?`, `tu voulais dire \xAB lumiere ${sug} \xBB ?`) : msg(`moods: ${LIGHTS.join(", ")}`, `ambiances : ${LIGHTS.join(", ")}`)
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
        if (!m.options.length && !m.positional.length) this.err(c.pos, msg("\xAB enters from \xBB expects a direction.", "\xAB entre depuis \xBB attend une direction."), "enters from left   (left, right, top, bottom, fade, zoom)");
        break;
      case "spin": {
        const v = m.positional[0];
        if (v && v.k === "name" && !v.binding) this.err(v.pos, msg("\xAB spin \xBB expects a speed.", "\xAB tourne \xBB attend une vitesse."), "spin 20/s  /  spin on scroll");
        break;
      }
    }
    if (m.kind === "event" && !c.action) {
      this.err(c.pos, msg(`${q(c.head.replace("-", " "))} must be followed by an action with \xAB -> \xBB.`, `${q(c.rawHead)} doit \xEAtre suivi d'une action avec \xAB -> \xBB.`), "on click -> jump");
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

// src/core/css.ts
function literal(e2, siteColors) {
  if (!e2) return void 0;
  switch (e2.k) {
    case "number":
      return e2.unit && e2.unit !== "px" ? `${e2.v}${e2.unit}` : e2.v;
    case "color":
      return e2.v;
    case "text":
      if (e2.parts.every((m) => typeof m === "string")) return e2.parts.join("");
      return void 0;
    case "name": {
      if (e2.binding && e2.binding.kind !== "kaury" && e2.binding.kind !== "js") return void 0;
      if (siteColors[e2.name]) return `var(--k-${e2.name})`;
      const c = knownColor(e2.name);
      if (c) return `var(--k-${c})`;
      return canon(e2.name) ?? canonValue(e2.name);
    }
    case "unary":
      if (e2.op === "-" && e2.e.k === "number") return -e2.e.v;
      return void 0;
    case "bool":
      return e2.v ? "true" : "false";
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
  let h = hex.replace("#", "");
  if (h.length === 3 || h.length === 4) h = h.split("").slice(0, 3).map((c) => c + c).join("");
  const lin = (c) => c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  const [r, g2, b] = [0, 2, 4].map((i) => lin(parseInt(h.slice(i, i + 2), 16) / 255));
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
  none: "none",
  inner: "inset 0 2px 8px rgba(0,0,0,.15)"
};
var TEXT_HEADS = /* @__PURE__ */ new Set(["title", "subtitle", "text", "link", "icon", "item", "links"]);
function declarations(head, opt, vals, siteColors) {
  const v0 = vals[0];
  switch (opt) {
    case "tint": {
      const c = String(v0);
      if (TEXT_HEADS.has(head)) return { decl: [["color", c]] };
      return { decl: [["background", c], ...autoContrast(c, siteColors)] };
    }
    case "background": {
      if (typeof v0 === "string" && /\.(png|jpe?g|webp|avif|gif|svg)$/i.test(v0)) {
        const u = /^(\/|[a-z][a-z0-9+.-]*:)/i.test(v0) ? v0 : "/" + v0.replace(/^\.\//, "");
        return { decl: [["background", `center/cover no-repeat url("${u}")`]] };
      }
      const c = v0 === void 0 ? "transparent" : String(v0);
      return { decl: [["background", c], ...autoContrast(c, siteColors)] };
    }
    case "color":
      return { decl: [["color", v0 === void 0 ? "inherit" : String(v0)]] };
    case "font":
      return { decl: [["font-family", `"${v0}", var(--k-font-fallback)`]] };
    case "size": {
      if (typeof v0 === "number" && (head === "title" || head === "subtitle") && v0 > 36) {
        return { decl: [["font-size", `clamp(${Math.round(v0 * 0.48)}px, ${(v0 / 13).toFixed(2)}vw, ${v0}px)`]] };
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
    case "underline":
      return { decl: [["text-decoration", "underline"]] };
    case "uppercase":
      return { decl: [["text-transform", "uppercase"], ["letter-spacing", ".06em"]] };
    case "line-height":
      return { decl: [["line-height", String(v0)]] };
    case "tracking":
      return { decl: [["letter-spacing", px(v0)]] };
    case "align":
      return { decl: [["text-align", String(v0 ?? "left")]] };
    case "center":
      return { decl: [["text-align", "center"], ["align-items", "center"], ["justify-content", "center"], ["margin-inline", "auto"]] };
    case "radius":
      return { decl: [["border-radius", px(v0)], ["overflow", "hidden"]] };
    case "round":
      return { decl: [["border-radius", "999px"]] };
    case "shadow":
      return { decl: [["box-shadow", SHADOWS[String(v0 ?? "soft")] ?? (typeof v0 === "number" ? `0 ${v0}px ${v0 * 3}px -${v0}px rgba(0,0,0,.25)` : SHADOWS.soft)]] };
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
      return { decl: [["gap", px(v0)]] };
    case "width":
      return { decl: [["width", px(v0)], ["max-width", "100%"]] };
    case "height":
      return { decl: [["height", px(v0)]] };
    case "max-width":
      return { decl: [["max-width", px(v0)], ["margin-inline", "auto"], ["width", "100%"]] };
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
      return { decl: [["--k-columns", String(v0)], ["grid-template-columns", `repeat(${v0}, minmax(0, 1fr))`]] };
    case "direction":
      return { decl: [["display", "flex"], ["flex-direction", v0 === "row" ? "row" : "column"]] };
    case "hidden":
      return { decl: [["display", "none"]] };
    case "sticky":
      return { decl: [["position", "sticky"], ["top", "0"], ["z-index", "50"]] };
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
  if (!hex) return [];
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
var SYSTEM_FONTS = /* @__PURE__ */ new Set(["system-ui", "serif", "sans-serif", "monospace", "Arial", "Helvetica", "Georgia", "Times New Roman"]);
function fontUrl(name) {
  if (SYSTEM_FONTS.has(name)) return void 0;
  if (FONTSHARE.has(name)) return `https://api.fontshare.com/v2/css?f[]=${name.toLowerCase().replace(/ /g, "-")}@300,400,500,600,700&display=swap`;
  return `https://fonts.googleapis.com/css2?family=${name.replace(/ /g, "+")}:wght@300;400;500;600;700;800&display=swap`;
}

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
  "immediate"
]);
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
  gap: "gap"
};
var PX_UNIT = /* @__PURE__ */ new Set(["size", "width", "height", "radius", "margin", "padding", "gap"]);
var TEXT_HEADS2 = /* @__PURE__ */ new Set(["title", "subtitle", "text", "link", "icon", "item"]);
var MEDIA = {
  mobile: "@media (max-width: 640px)",
  tablet: "@media (min-width: 641px) and (max-width: 1024px)",
  desktop: "@media (min-width: 1025px)"
};
var Generator = class {
  // inside a component or a loop: the same line makes many images
  constructor(info, file) {
    this.info = info;
    let h = 0;
    for (const c of file) h = h * 31 + c.charCodeAt(0) >>> 0;
    this.prefix = "k" + (h % 46656).toString(36);
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
  site = {};
  prefix;
  declared = /* @__PURE__ */ new Set();
  imagesInPage = 0;
  repeated = 0;
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
      this.statement(i, { view: false });
    }
    const loose = prog.filter((i) => i.k === "command");
    if (loose.length && !this.info.pages.some((p) => p.path === "/")) {
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
      site: this.site
    };
  }
  importStmt(i) {
    const parts = [];
    if (i.default) parts.push(jsName(i.default));
    if (i.names) parts.push(`{ ${i.names.map((n) => n.alias ? `${jsKey(n.name)} as ${jsName(n.alias)}` : jsName(n.name)).join(", ")} }`);
    if (i.all) parts.push(`* as ${jsName(i.all)}`);
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
          if (names[0]) this.css.push(`:root{--k-font:"${names[0]}", var(--k-font-fallback)}`);
          if (names[1]) this.css.push(`:root{--k-font-titles:"${names[1]}", var(--k-font-fallback)}`);
          break;
        }
        case "lang":
          props.push(`lang: ${this.ex(p0[0])}`);
          this.site.lang = String(literal(p0[0], {}) ?? "en");
          break;
        case "url":
          props.push(`url: ${this.ex(p0[0])}`);
          break;
        case "favicon":
          props.push(`favicon: ${this.exPath(p0[0])}`);
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
          if (o2.name === "color") this.css.push(`:root{--k-text:${v};--k-ink:${v}}`);
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
    const params = [...i.path.matchAll(/:([\p{L}_][\p{L}\p{N}_-]*)/gu)].map((m) => m[1]);
    this.imagesInPage = 0;
    const item = i.each ? `const ${jsName(i.each.variable)} = $route.item` : "";
    this.emit(`function ${fn}($route, $root) {`, i.pos);
    this.indent++;
    for (const p of params) this.emit(`const ${jsName(p)} = $route.params[${JSON.stringify(p)}]`);
    if (item) this.emit(item);
    const root = this.fresh("page");
    this.emit(`const ${root} = $k.h($root, "main", "k-page")`);
    let seo = "null";
    let transition = "null";
    let lang = "null";
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
      return true;
    });
    this.content(body, { view: true, parent: root, target: root, parentHead: "page" }, "page");
    this.emit(`return ${root}`);
    this.indent--;
    this.emit("}");
    const prelude = [...params.map((p) => `const ${jsName(p)} = $route.params[${JSON.stringify(p)}];`), item ? item + ";" : ""].join(" ");
    const each = i.each ? `, each: () => ${this.ex(i.each.source)}, pathOf: (${jsName(i.each.variable)}) => ${this.ex(i.address)}` : "";
    return `{ path: ${JSON.stringify(i.path)}${each}, render: ${fn}, seo: ($route) => { ${prelude} return ${seo} }, lang: ($route) => { ${prelude} return ${lang} }, transition: ${transition} }`;
  }
  /** Declares at the top of a scope the states/variables created by « x = … » without let/state. */
  implicitDeclarations(body, view) {
    const walk = (list) => {
      for (const i of list) {
        if (i.k === "assign" && i.declares && !this.declared.has(i.declares)) {
          this.declared.add(i.declares);
          const n = jsName(i.declares.name);
          if (i.declares.kind === "state") this.emit(`const ${n} = $k.state(null)`, i.pos);
          else this.emit(`let ${n}`, i.pos);
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
        else if (kind === "derived") this.emit(`${ex}const ${n} = $k.derived(() => ${this.ex(i.value)})`, i.pos);
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
    return this.ex(e2);
  }
  // ---------------------------------------------------------------- components
  component(i) {
    const ex = i.exported ? "export " : "";
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
    const tr = [];
    const trHover = [];
    let explicitColor = false;
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
      const { decl, transform } = declarations(head, name, vals, this.info.colors);
      if (name === "color") explicitColor = true;
      const into = isHover ? hover : normal;
      for (const [p, v] of decl) {
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
    const add = (s, decls) => {
      if (!decls.length) return;
      if (media && /^\.[\w-]+$/.test(s)) s = s + s;
      const rule = `${s}{${decls.join(";")}}`;
      this.css.push(media ? `${media}{${rule}}` : rule);
    };
    add(sel, dedupe(normal));
    if (hover.length) {
      add(sel, ["transition:transform .35s cubic-bezier(.2,.7,.2,1), box-shadow .35s, background .35s, color .35s, opacity .35s"]);
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
      const isColor = ["background", "fog", "ground"].includes(o2.name);
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
    const asy = bodyHasAwait(action) ? "async " : "";
    this.emit(`$k.on(${target}, ${JSON.stringify(type)}, ${asy}($event) => {`);
    this.indent++;
    this.localDeclarations(action);
    for (const a of action) this.statement(a, { view: false, target: ctx.target ?? target });
    this.indent--;
    this.emit("})");
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
      if (m.objectName) this.emit(`${n}.id = ${JSON.stringify(m.objectName)}`);
      this.styleClass(n, head, m.options, ["height", "background", "fog", "ground", "particles", "immediate"]);
      this.childrenOf(c, { ...ctx, parent: n, target: n, parentHead: head });
      this.emit(`$k.sceneReady(${n})`);
      return;
    }
    if (head === "sound") {
      this.emit(`const ${n} = $k.sound(${parent}, ${this.exPath(p[0])}, ${this.objectOptions(m.options)})`, c.pos);
      return;
    }
    let tag = {
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
    if (head === "title") {
      const lvl = opt("level")?.values[0];
      if (lvl?.k === "number") tag = `h${Math.min(6, Math.max(1, lvl.v))}`;
    }
    if (head === "button" && opt("to")) tag = "a";
    const classes = [`k-${head}`];
    if (m.objectName) classes.push(`k-${head}-${m.objectName}`);
    for (const v of ["outline", "ghost", "large", "small"]) if (opt(v)) classes.push(`k-${v}`);
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
    if (m.objectName) this.emit(`${n}.id = ${JSON.stringify(m.objectName)}`);
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
        this.image(n, p[0]);
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
        for (const x of p) {
          const a = this.fresh();
          this.emit(`const ${a} = $k.h(${n}, "a", "k-nav-link")`);
          if (x.k === "name" && !x.binding) {
            this.emit(`$k.setText(${a}, ${JSON.stringify(x.name.replace(/-/g, " "))})`);
            this.emit(`$k.autoLink(${a}, ${JSON.stringify(x.name)})`);
          } else if (x.k === "text") {
            this.text(a, x);
            this.emit(`$k.autoLink(${a}, ${JSON.stringify(String(literal(x, {}) ?? ""))})`);
          } else this.text(a, x);
        }
        if (p.length >= 3 && ["header", "section", "nav"].includes(ctx.parentHead ?? "")) this.emit(`$k.mobileMenu(${n})`);
        break;
      }
      case "logo": {
        this.emit(`${n}.setAttribute("href", "/"); ${n}.setAttribute("aria-label", ${JSON.stringify(this.site.name ? `${this.site.name} \u2014 home` : "Home")})`);
        const x = p[0];
        if (x && isImage(x)) {
          const i2 = this.fresh();
          this.emit(`const ${i2} = $k.h(${n}, "img", "k-logo-image")`);
          this.emit(`${i2}.alt = ${JSON.stringify(this.site.name ?? "Logo")}`);
          this.image(i2, x, true);
        } else if (x) this.text(n, x);
        break;
      }
      case "spacer":
        if (p[0]) this.emit(`${n}.style.height = $k.px(${this.ex(p[0])})`);
        break;
      case "slot":
        this.emit(`$k.slot(${n}, $p.$slot)`);
        break;
      case "markdown":
        if (p[0]) this.emit(`$k.markdown(${n}, () => ${this.ex(p[0])})`);
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
    this.styleClass(n, head, m.options, []);
    this.childrenOf(c, { ...ctx, parent: n, target: n, parentHead: head });
    if (c.action) {
      const ev = head === "form" ? "submit" : ["field", "textarea"].includes(head) ? "input" : ["select", "checkbox"].includes(head) ? "change" : "click";
      this.event(n, ev, c.action, { ...ctx, target: n });
    }
    if (head === "form") this.emit(`$k.form(${n})`);
  }
  image(n, src, eager = false) {
    let priority = 1;
    if (this.repeated) priority = 0;
    else if (!eager) {
      priority = this.imagesInPage === 0 ? 2 : this.imagesInPage < 3 ? 1 : 0;
      this.imagesInPage++;
    }
    const l = src.k === "text" ? literal(src, {}) : void 0;
    const value = typeof l === "string" ? JSON.stringify(assetPath(l)) : `() => ${this.ex(src)}`;
    this.emit(`$k.img(${n}, ${value}, ${priority})`);
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
      const types = { text: "text", email: "email", number: "number", password: "password", date: "date", tel: "tel", url: "url", search: "search" };
      const tv = type?.k === "name" ? types[canonValue(type.name)] ?? "text" : "text";
      if (c.head === "field") this.emit(`${n}.type = ${JSON.stringify(tv)}`);
      if (opt("rows")) this.emit(`${n}.rows = ${this.ex(opt("rows").values[0])}`);
      if (ref) this.emit(`$k.bind(${n}, () => ${ref}, ($v) => { ${ref} = $v }${tv === "number" ? ', "number"' : ""})`);
      if (!opt("label") && p[1]) this.attr(n, "aria-label", p[1]);
    } else if (c.head === "select") {
      const choices = p.slice(1);
      this.emit(`$k.options(${n}, () => [${choices.map((x) => x.k === "list" ? `...${this.ex(x)}` : x.k === "name" && x.binding ? `...$k.toList(${this.ex(x)})` : this.ex(x)).join(", ")}])`);
      if (ref) this.emit(`$k.bind(${n}, () => ${ref}, ($v) => { ${ref} = $v })`);
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
  text(n, e2) {
    if (!e2) return;
    const l = e2.k === "text" || e2.k === "number" ? literal(e2, {}) : void 0;
    if (l !== void 0) this.emit(`$k.setText(${n}, ${JSON.stringify(String(l))})`);
    else this.emit(`$k.text(${n}, () => ${this.ex(e2)})`);
  }
  attr(n, name, e2) {
    let l = e2.k === "text" ? literal(e2, {}) : void 0;
    if (l !== void 0 && (name === "src" || name === "poster")) l = assetPath(String(l));
    if (l !== void 0) this.emit(`${n}.setAttribute(${JSON.stringify(name)}, ${JSON.stringify(String(l))})`);
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
        return `{ ${e2.props.map((p) => p.spread ? `...${this.ex(p.value)}` : `${jsKey(p.key)}: ${this.ex(p.value)}`).join(", ")} }`;
      case "member": {
        const o2 = this.ex(e2.object);
        const m = kauryMethod(e2.prop);
        if (m && PROPERTIES.has(m)) return `$k.prop(${o2}, ${JSON.stringify(m)}, ${JSON.stringify(e2.prop)})`;
        if (/^[\p{L}_$][\p{L}\p{N}_$]*$/u.test(e2.prop)) return `${o2}${e2.optional ? "?." : "."}${e2.prop}`;
        return `${o2}${e2.optional ? "?." : ""}[${JSON.stringify(e2.prop)}]`;
      }
      case "index":
        return `${this.ex(e2.object)}[${this.ex(e2.index)}]`;
      case "call": {
        if (e2.fn.k === "member") {
          const m = kauryMethod(e2.fn.prop);
          if (m) return `$k.m(${this.ex(e2.fn.object)}, ${JSON.stringify(m)}, ${JSON.stringify(e2.fn.prop)}${e2.args.map((a) => ", " + this.ex(a)).join("")})`;
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
  for (const d of decls) seen.set(d.slice(0, d.indexOf(":")), d);
  return [...seen.values()];
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

// src/core/index.ts
function compile(source, options = {}) {
  const empty = { ok: false, js: "", css: "", errors: [], warnings: [], fonts: [], site: {}, map: [] };
  let ast;
  try {
    ast = parse(source);
  } catch (e2) {
    if (e2 instanceof KauryError) {
      e2.file = options.file;
      return { ...empty, errors: [e2] };
    }
    throw e2;
  }
  const { errors, warnings, info } = check(ast, { file: options.file });
  if (errors.length || options.checkOnly) return { ...empty, ok: !errors.length, errors, warnings, info, ast };
  const out = generate(ast, info, { file: options.file, runtime: options.runtime });
  return { ok: true, js: out.js, css: out.css, errors: [], warnings, info, ast, fonts: out.fonts, site: out.site, map: out.map };
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
