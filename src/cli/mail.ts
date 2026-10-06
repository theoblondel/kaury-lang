// The endpoint behind « form mail "…" »: one small function, written for each host that runs functions
// (Netlify, Vercel, Cloudflare Pages), and run by « kaury dev » itself.
// It sends through Resend (resend.com, free tier): the host only needs KAURY_MAIL_KEY.

import { mkdirSync, writeFileSync, existsSync, readFileSync, rmSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { mailId } from '../runtime/mail.js'

/** Plain JavaScript, copied as is into the files of each host: it must stay self-contained. */
export const MAIL_HANDLER = `async function kauryMail(request, env, addresses) {
  const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
  if (request.method !== 'POST') return json(405, { error: 'POST only' })
  let b
  try { b = await request.json() } catch { return json(400, { error: 'bad request' }) }
  const to = b && addresses[b.to]
  if (!to) return json(403, { error: 'unknown form' })
  // sent faster than a person can type: a robot, thanked and ignored
  if (typeof b.time === 'number' && b.time < 1500) return json(200, { ok: true })
  const fields = b.fields && typeof b.fields === 'object' ? b.fields : {}
  const lines = []
  let size = 0
  for (const [k, v] of Object.entries(fields).slice(0, 30)) {
    const value = String(v).slice(0, 5000)
    size += value.length
    lines.push(String(k).slice(0, 60) + ': ' + value)
  }
  if (!lines.length || size > 20000) return json(400, { error: 'empty or too long' })
  const url = new URL(request.url)
  const page = typeof b.page === 'string' ? b.page.slice(0, 200) : '/'
  const subject = (typeof b.subject === 'string' && b.subject.trim() ? b.subject : 'New message from ' + url.host).replace(/[\\r\\n]+/g, ' ').slice(0, 150)
  const email = String(fields.email || fields.mail || '').trim()
  const replyTo = /^[^\\s@<>]+@[^\\s@<>]+\\.[^\\s@<>]+$/.test(email) ? email : undefined
  const text = lines.join('\\n\\n') + '\\n\\n— ' + url.origin + page
  const key = env.KAURY_MAIL_KEY
  if (!key) return json(503, { error: 'KAURY_MAIL_KEY is not set where the site is hosted' })
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: env.KAURY_MAIL_FROM || 'Kaury forms <onboarding@resend.dev>', to: [to], subject, text, reply_to: replyTo }),
  })
  if (!r.ok) return json(502, { error: 'the mail service answered ' + r.status + ': ' + (await r.text()).slice(0, 300) })
  return json(200, { ok: true })
}`

/** id → address, for every address the site writes to. */
export function mailMap(addresses: Iterable<string>): Record<string, string> {
  const map: Record<string, string> = {}
  for (const a of addresses) {
    const clean = a.trim().toLowerCase()
    if (/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(clean)) map[mailId(clean)] = clean
  }
  return map
}

const HEAD = '// Made by « kaury build » for the forms that send e-mails (form mail "…"). Do not edit: it is rewritten at each build.\n'
const FILES = {
  netlify: 'netlify/functions/kaury-mail.mjs',
  vercel: 'api/kaury-mail.mjs',
  cloudflare: 'functions/api/kaury-mail.js',
}

/** Writes the endpoint for each host next to the site (or removes it when no form sends mail any more). */
export function writeMailFunctions(siteDir: string, map: Record<string, string>): string[] {
  const written: string[] = []
  for (const [host, file] of Object.entries(FILES)) {
    const path = join(siteDir, file)
    if (!Object.keys(map).length) {
      if (existsSync(path) && readFileSync(path, 'utf8').startsWith(HEAD)) rmSync(path)
      continue
    }
    const addresses = `const ADDRESSES = ${JSON.stringify(map)}\n`
    const glue =
      host === 'netlify' ? `export default (request) => kauryMail(request, process.env, ADDRESSES)\nexport const config = { path: '/api/kaury-mail' }\n`
      : host === 'vercel' ? `export function POST(request) {\n  return kauryMail(request, process.env, ADDRESSES)\n}\n`
      : `export const onRequestPost = ({ request, env }) => kauryMail(request, env, ADDRESSES)\n`
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, `${HEAD}${addresses}\n${MAIL_HANDLER}\n\n${glue}`)
    written.push(file)
  }
  return written
}

/** The same endpoint inside « kaury dev »: sends for real when KAURY_MAIL_KEY is set, otherwise shows the e-mail. */
export function devMailHandler(env: Record<string, string | undefined>) {
  const kauryMail = new Function(`${MAIL_HANDLER}\nreturn kauryMail`)() as (r: Request, env: Record<string, unknown>, a: Record<string, string>) => Promise<Response>
  return async (body: string, url: string, map: Record<string, string>): Promise<{ status: number; body: string; preview?: { to: string; fields: Record<string, string> } }> => {
    const request = new Request(url, { method: 'POST', body, headers: { 'content-type': 'application/json' } })
    if (env.KAURY_MAIL_KEY) {
      const r = await kauryMail(request, env, map)
      return { status: r.status, body: await r.text() }
    }
    let b: any
    try {
      b = JSON.parse(body)
    } catch {
      return { status: 400, body: '{"error":"bad request"}' }
    }
    const to = map[b?.to]
    if (!to) return { status: 403, body: '{"error":"unknown form"}' }
    return { status: 200, body: '{"ok":true}', preview: { to, fields: b.fields ?? {} } }
  }
}

/** KEY=value lines of a .env file (never required). */
export function readEnvFile(dir: string): Record<string, string> {
  const f = join(dir, '.env')
  if (!existsSync(f)) return {}
  const out: Record<string, string> = {}
  for (const line of readFileSync(f, 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line)
    if (m) out[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2')
  }
  return out
}
