// Ready-made components (Hero, Pricing, Contact…) and forms that send e-mails.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, rmSync, mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { build } from '../src/cli/project.js'
import { compile, setLanguage, BLOCKS } from '../src/core/index.js'
import { mailId } from '../src/runtime/mail.js'
import { MAIL_HANDLER, mailMap, devMailHandler } from '../src/cli/mail.js'

setLanguage('en')
const TMP = resolve('tests/.tmp/blocks')

// the data the examples of the blocks talk about
const DATA = `
let features = [{ icon: "🌸", title: "Fresh", text: "Cut this morning." }]
let steps = [{ title: "Choose", text: "A bouquet." }]
let plans = [{ name: "Solo", price: "9 CHF", per: "/ month", features: ["1 site"], featured: true }]
let reviews = [{ quote: "Gorgeous.", name: "Ana", role: "Vevey" }]
let people = [{ name: "Léa", role: "Florist", photo: "lea.jpg" }]
let faq = [{ q: "Do you deliver?", a: "Yes, every day." }]
`

test('every block compiles with the example of its documentation, and nothing to import', () => {
  for (const [name, b] of Object.entries(BLOCKS)) {
    const r = compile(`${DATA}\npage "/"\n  ${b.example.replace(/\s*\/\/.*$/, '')}\n`)
    assert.ok(r.ok, `${name}: ${r.errors.map((e) => e.message).join('; ')}`)
    assert.match(r.js, new RegExp(`function ${name}\\(`), name)
    assert.ok(b.source.includes(`component ${name} ${b.params}`), `${name}: params of the docs = params of the code`)
  }
})

test('blocks: only those used are added, a component of the site wins, styles are not doubled', () => {
  const r = compile(`${DATA}\npage "/"\n  Team people\n  Testimonials reviews\n`)
  assert.ok(r.ok)
  assert.doesNotMatch(r.js, /function Hero\(/)
  assert.equal(r.css.match(/\.ks-kb-muted\{/g)?.length, 1)
  const own = compile('component Hero x\n  text x\n\npage "/"\n  Hero "mine"\n')
  assert.ok(own.ok)
  assert.equal(own.js.match(/function Hero\(/g)?.length, 1)
  assert.doesNotMatch(own.css, /kb-hero/)
})

test('a component called with too few or too many values says what it takes', () => {
  const few = compile('page "/"\n  Pricing\n')
  assert.ok(!few.ok)
  assert.match(few.errors[0].message, /"Pricing" needs 1 value \(plans\), I see 0/)
  const many = compile('component Card name\n  text name\n\npage "/"\n  Card "a", "b"\n')
  assert.match(many.errors[0].message, /takes at most 1 value \(name\), I see 2/)
})

test('theme colors and fonts: accent, muted, ink, line, on-accent, font "titles"', () => {
  const r = compile('site "X"\n  colors pink #E93D82\n\npage "/"\n  text "a", color muted, background accent, font "titles"\n  box border 1 line\n')
  assert.ok(r.ok)
  assert.match(r.css, /color:var\(--k-muted\)/)
  assert.match(r.css, /background:var\(--k-accent\)/)
  assert.match(r.css, /font-family:var\(--k-font-titles\)/)
  assert.deepEqual(r.fonts, [])
})

test('form mail: the address stays out of the page, the endpoint only writes to the addresses of the site', async () => {
  rmSync(TMP, { recursive: true, force: true })
  mkdirSync(TMP, { recursive: true })
  writeFileSync(join(TMP, 'site.kaury'), [
    'page "/"',
    '  form mail "Hello@Bloom.ch", subject "New request" -> sent = true',
    '    field email "you@example.com", type email, required',
    '    button "Send"',
    '  Contact "team@bloom.ch"',
  ].join('\n'))
  const r = await build(join(TMP, 'site.kaury'), { out: join(TMP, 'dist') })
  assert.deepEqual(r.mails, { [mailId('hello@bloom.ch')]: 'hello@bloom.ch', [mailId('team@bloom.ch')]: 'team@bloom.ch' })
  assert.doesNotMatch(readFileSync(join(TMP, 'dist', 'index.html'), 'utf8'), /bloom\.ch/)
  for (const f of ['netlify/functions/kaury-mail.mjs', 'api/kaury-mail.mjs', 'functions/api/kaury-mail.js']) {
    assert.ok(existsSync(join(TMP, f)), f)
    assert.match(readFileSync(join(TMP, f), 'utf8'), /team@bloom\.ch/)
  }

  // the endpoint itself, with the mail service replaced
  const kauryMail = new Function(`${MAIL_HANDLER}\nreturn kauryMail`)()
  const map = mailMap(['hello@bloom.ch'])
  const sent: any[] = []
  const realFetch = globalThis.fetch
  globalThis.fetch = (async (_u: string, o: any) => {
    sent.push(JSON.parse(o.body))
    return new Response('{}')
  }) as any
  try {
    const ask = (b: unknown, env: Record<string, string> = { KAURY_MAIL_KEY: 're_x' }) =>
      kauryMail(new Request('https://bloom.ch/api/kaury-mail', { method: 'POST', body: JSON.stringify(b) }), env, map)
    const ok = await ask({ to: mailId('hello@bloom.ch'), subject: 'Hi\nBcc: x', fields: { email: 'ana@x.ch', message: 'Hello' }, page: '/', time: 4000 })
    assert.equal(ok.status, 200)
    assert.deepEqual(sent[0].to, ['hello@bloom.ch'])
    assert.equal(sent[0].reply_to, 'ana@x.ch')
    assert.equal(sent[0].subject, 'Hi Bcc: x')
    assert.equal((await ask({ to: mailId('someone@else.com'), fields: { a: 'b' }, time: 4000 })).status, 403)
    assert.equal((await ask({ to: mailId('hello@bloom.ch'), fields: { a: 'b' }, time: 200 })).status, 200)
    assert.equal(sent.length, 1, 'a robot is thanked, never forwarded')
    assert.equal((await ask({ to: mailId('hello@bloom.ch'), fields: { a: 'b' }, time: 4000 }, {})).status, 503)
  } finally {
    globalThis.fetch = realFetch
  }

  // kaury dev without a key: shows the e-mail instead of sending it
  const dev = devMailHandler({})
  const shown = await dev(JSON.stringify({ to: mailId('hello@bloom.ch'), fields: { message: 'Hi' } }), 'http://localhost:3000/api/kaury-mail', map)
  assert.deepEqual(shown.preview, { to: 'hello@bloom.ch', fields: { message: 'Hi' } })
})

test('kaury new: every template builds, the landing sends its form by e-mail', async () => {
  const { newSiteTemplate, TEMPLATES } = await import('../src/cli/template.js')
  for (const t of Object.keys(TEMPLATES)) {
    const dir = join(TMP, 'tpl-' + t)
    rmSync(dir, { recursive: true, force: true })
    for (const [path, content] of Object.entries(newSiteTemplate('demo', undefined, t))) {
      mkdirSync(join(dir, path, '..'), { recursive: true })
      writeFileSync(join(dir, path), content)
    }
    const r = await build(join(dir, 'site.kaury'), { out: join(dir, 'dist') })
    assert.ok(r.pages.includes('/'), t)
    if (t === 'landing') assert.deepEqual(Object.values(r.mails), ['hello@example.com'])
    if (t === 'blog') assert.ok(r.pages.includes('/hello-world'))
    const html = readFileSync(join(dir, 'dist', 'index.html'), 'utf8')
    assert.doesNotMatch(html, /function |=>/, `${t}: no code shown as text`)
  }
})

// PHP on the machine (XAMPP on Windows, php elsewhere): the endpoint of FTP hosts is run for real
const PHP = ['C:/xampp/php/php.exe', '/usr/bin/php', '/usr/local/bin/php', '/opt/homebrew/bin/php'].find((p) => existsSync(p))

test('form mail on an FTP host: the PHP endpoint in dist/api, the key outside the site', { skip: !PHP && 'PHP is not installed' }, async () => {
  const { spawn } = await import('node:child_process')
  const { createServer } = await import('node:http')
  const dir = join(TMP, 'php')
  rmSync(dir, { recursive: true, force: true })
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'site.kaury'), 'page "/"\n  Contact "hello@bloom.ch"\n')
  await build(join(dir, 'site.kaury'), { out: join(dir, 'www') })
  assert.match(readFileSync(join(dir, 'www', '.htaccess'), 'utf8'), /RewriteRule \^api\/kaury-mail\/\?\$ api\/kaury-mail\.php/)
  const got: any[] = []
  const mock = createServer((q, r) => {
    let b = ''
    q.on('data', (d) => (b += d))
    q.on('end', () => {
      got.push({ auth: q.headers.authorization, body: JSON.parse(b) })
      r.end('{"id":"x"}')
    })
  }).listen(3297)
  const php = spawn(PHP!, ['-S', '127.0.0.1:3296', '-t', join(dir, 'www')], { env: { ...process.env, KAURY_MAIL_API: 'http://127.0.0.1:3297/emails' } })
  try {
    await new Promise((r) => setTimeout(r, 900))
    const ask = (b: unknown) => fetch('http://127.0.0.1:3296/api/kaury-mail.php', { method: 'POST', body: JSON.stringify(b) })
    const id = mailId('hello@bloom.ch')
    assert.equal((await ask({ to: id, fields: { a: 'b' }, time: 4000 })).status, 503)
    writeFileSync(join(dir, 'kaury-mail-key.txt'), 're_test\n') // next to the site folder, never served
    assert.equal((await ask({ to: id, subject: 'Hi\nBcc: x', fields: { email: 'ana@x.ch', message: 'Hello' }, page: '/', time: 4000 })).status, 200)
    assert.equal((await ask({ to: mailId('someone@else.com'), fields: { a: 'b' }, time: 4000 })).status, 403)
    assert.equal((await ask({ to: id, fields: { a: 'b' }, time: 100 })).status, 200)
    assert.equal(got.length, 1)
    assert.equal(got[0].auth, 'Bearer re_test')
    assert.deepEqual(got[0].body.to, ['hello@bloom.ch'])
    assert.equal(got[0].body.subject, 'Hi Bcc: x')
    assert.equal(got[0].body.reply_to, 'ana@x.ch')
  } finally {
    php.kill()
    mock.close()
  }
})
