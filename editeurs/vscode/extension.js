// Extension VS Code de Kaury : erreurs soulignées pendant qu'on écrit, complétion, aide au survol.
const vscode = require('vscode')

let noyau = null
async function chargeNoyau() {
  if (!noyau) noyau = await import('./noyau.js') // copie de dist/noyau.js (npm run prepare)
  return noyau
}

function activate(context) {
  const diagnostics = vscode.languages.createDiagnosticCollection('kaury')
  context.subscriptions.push(diagnostics)
  const timers = new Map()

  const verifie = async (doc) => {
    if (doc.languageId !== 'kaury') return
    const n = await chargeNoyau()
    const r = n.compile(doc.getText(), { fichier: doc.fileName, verifieSeulement: true })
    const liste = [...r.erreurs, ...r.avertissements].map((e) => {
      const debut = new vscode.Position(Math.max(0, e.ligne - 1), Math.max(0, e.colonne - 1))
      const fin = debut.translate(0, e.longueur || 1)
      const d = new vscode.Diagnostic(new vscode.Range(debut, fin), e.essaie ? `${e.quoi}\nEssaie : ${e.essaie}` : e.quoi,
        e.gravite === 'erreur' ? vscode.DiagnosticSeverity.Error : vscode.DiagnosticSeverity.Warning)
      d.source = 'kaury'
      return d
    })
    diagnostics.set(doc.uri, liste)
  }
  const planifie = (doc) => {
    clearTimeout(timers.get(doc.uri.toString()))
    timers.set(doc.uri.toString(), setTimeout(() => verifie(doc), 250))
  }
  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument(verifie),
    vscode.workspace.onDidChangeTextDocument((e) => planifie(e.document)),
    vscode.workspace.onDidCloseTextDocument((d) => diagnostics.delete(d.uri)),
  )
  vscode.workspace.textDocuments.forEach(verifie)

  // complétion : mots-clés, éléments, options de style, couleurs
  context.subscriptions.push(vscode.languages.registerCompletionItemProvider('kaury', {
    async provideCompletionItems() {
      const n = await chargeNoyau()
      const v = n.vocabulaire
      const items = []
      for (const [nom, e] of Object.entries(v.ELEMENTS)) {
        const it = new vscode.CompletionItem(nom, vscode.CompletionItemKind.Class)
        it.detail = e.aide
        it.documentation = new vscode.MarkdownString('`' + e.exemple + '`')
        items.push(it)
      }
      for (const [nom, s] of Object.entries(v.STYLES)) {
        if (!s.aide) continue
        const it = new vscode.CompletionItem(nom, vscode.CompletionItemKind.Property)
        it.detail = s.aide
        it.documentation = new vscode.MarkdownString('`' + s.exemple + '`')
        items.push(it)
      }
      for (const [nom, s] of Object.entries(v.MOUVEMENTS)) {
        const it = new vscode.CompletionItem(nom.replace('-', ' '), vscode.CompletionItemKind.Event)
        it.detail = s.aide
        items.push(it)
      }
      for (const c of Object.keys(v.COULEURS)) items.push(new vscode.CompletionItem(c, vscode.CompletionItemKind.Color))
      for (const m of n.mots.tousLesMots()) items.push(new vscode.CompletionItem(m, vscode.CompletionItemKind.Keyword))
      return items
    },
  }))

  // survol : aide sur les éléments et options
  context.subscriptions.push(vscode.languages.registerHoverProvider('kaury', {
    async provideHover(doc, pos) {
      const r = doc.getWordRangeAtPosition(pos, /[\p{L}_][\p{L}\p{N}_-]*/u)
      if (!r) return
      const mot = doc.getText(r)
      const v = (await chargeNoyau()).vocabulaire
      const e = v.ELEMENTS[mot] ?? v.STYLES[mot] ?? v.MOUVEMENTS[mot]
      if (!e?.aide) return
      return new vscode.Hover(new vscode.MarkdownString(`**${mot}** — ${e.aide}\n\n\`${e.exemple}\``))
    },
  }))
}

module.exports = { activate, deactivate() {} }
