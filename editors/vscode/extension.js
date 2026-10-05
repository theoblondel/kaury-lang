// Kaury VS Code extension: errors underlined while typing, completion, hover help.
const vscode = require('vscode')

let core = null
async function loadCore() {
  if (!core) core = await import('./core.js') // copy of dist/core.js (npm run prepare)
  return core
}

function activate(context) {
  const diagnostics = vscode.languages.createDiagnosticCollection('kaury')
  context.subscriptions.push(diagnostics)
  const timers = new Map()

  const check = async (doc) => {
    if (doc.languageId !== 'kaury') return
    const k = await loadCore()
    const lang = vscode.env.language?.startsWith('fr') ? 'fr' : 'en'
    k.setLanguage(lang)
    const r = k.compile(doc.getText(), { file: doc.fileName, checkOnly: true })
    diagnostics.set(doc.uri, [...r.errors, ...r.warnings].map((e) => {
      const start = new vscode.Position(Math.max(0, e.line - 1), Math.max(0, e.column - 1))
      const d = new vscode.Diagnostic(new vscode.Range(start, start.translate(0, e.length || 1)),
        e.fix ? `${e.what}\n${lang === 'fr' ? 'Essaie' : 'Try'}: ${e.fix}` : e.what,
        e.severity === 'error' ? vscode.DiagnosticSeverity.Error : vscode.DiagnosticSeverity.Warning)
      d.source = 'kaury'
      return d
    }))
  }
  const schedule = (doc) => {
    clearTimeout(timers.get(doc.uri.toString()))
    timers.set(doc.uri.toString(), setTimeout(() => check(doc), 250))
  }
  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument(check),
    vscode.workspace.onDidChangeTextDocument((e) => schedule(e.document)),
    vscode.workspace.onDidCloseTextDocument((d) => diagnostics.delete(d.uri)),
  )
  vscode.workspace.textDocuments.forEach(check)

  // completion: elements, style options, motions, colors, keywords
  context.subscriptions.push(vscode.languages.registerCompletionItemProvider('kaury', {
    async provideCompletionItems() {
      const k = await loadCore()
      const v = k.vocabulary
      const fr = vscode.env.language?.startsWith('fr')
      const items = []
      const add = (name, kind, spec) => {
        const it = new vscode.CompletionItem(name, kind)
        if (spec) {
          it.detail = fr ? spec.helpFr : spec.help
          it.documentation = new vscode.MarkdownString('`' + spec.example + '`')
        }
        items.push(it)
      }
      for (const [name, s] of Object.entries(v.ELEMENTS)) add(name, vscode.CompletionItemKind.Class, s)
      for (const [name, s] of Object.entries(v.STYLES)) add(name, vscode.CompletionItemKind.Property, s)
      for (const [name, s] of Object.entries(v.MOTIONS)) add(name.replace('-', ' '), vscode.CompletionItemKind.Event, s)
      for (const c of Object.keys(v.COLORS)) add(c, vscode.CompletionItemKind.Color)
      for (const w of k.keywords.allKeywords()) add(w, vscode.CompletionItemKind.Keyword)
      return items
    },
  }))

  // hover: help on elements, options and motions
  context.subscriptions.push(vscode.languages.registerHoverProvider('kaury', {
    async provideHover(doc, pos) {
      const range = doc.getWordRangeAtPosition(pos, /[\p{L}_][\p{L}\p{N}_-]*/u)
      if (!range) return
      const word = doc.getText(range)
      const k = await loadCore()
      const v = k.vocabulary
      const name = k.keywords.canon(word) ?? v.styleOption(word) ?? word
      const s = v.ELEMENTS[name] ?? v.STYLES[name] ?? v.MOTIONS[name]
      if (!s) return
      const fr = vscode.env.language?.startsWith('fr')
      return new vscode.Hover(new vscode.MarkdownString(`**${name}** — ${fr ? s.helpFr : s.help}\n\n\`${s.example}\``))
    },
  }))
}

module.exports = { activate, deactivate() {} }
