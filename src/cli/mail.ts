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

/**
 * The same endpoint in PHP, for the hosts that only serve files (FTP: LWS, Infomaniak, OVH…): kaury build
 * writes it in dist/api/, and the .htaccess sends /api/kaury-mail to it. The key is never in the site:
 * it comes from the host (SetEnv KAURY_MAIL_KEY …), or from a file kaury-mail-key.txt put next to the
 * site's folder, where the web never reaches (on LWS: beside htdocs/).
 */
export function phpMailHandler(map: Record<string, string>): string {
  return `<?php
// Made by « kaury build » for the forms that send e-mails (form mail "…"). Do not edit: it is rewritten at each build.
$ADDRESSES = json_decode(${phpString(JSON.stringify(map))}, true);

function kaury_answer($status, $body) {
  http_response_code($status);
  header('Content-Type: application/json');
  echo json_encode($body);
  exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') kaury_answer(405, ['error' => 'POST only']);
$b = json_decode(file_get_contents('php://input'), true);
if (!is_array($b)) kaury_answer(400, ['error' => 'bad request']);
$to = isset($b['to']) && is_string($b['to']) && isset($ADDRESSES[$b['to']]) ? $ADDRESSES[$b['to']] : null;
if (!$to) kaury_answer(403, ['error' => 'unknown form']);
// sent faster than a person can type: a robot, thanked and ignored
if (isset($b['time']) && is_numeric($b['time']) && $b['time'] < 1500) kaury_answer(200, ['ok' => true]);
$fields = isset($b['fields']) && is_array($b['fields']) ? array_slice($b['fields'], 0, 30, true) : [];
$lines = [];
$size = 0;
foreach ($fields as $k => $v) {
  $value = mb_substr(is_scalar($v) ? (string) $v : '', 0, 5000);
  $size += mb_strlen($value);
  $lines[] = mb_substr((string) $k, 0, 60) . ': ' . $value;
}
if (!$lines || $size > 20000) kaury_answer(400, ['error' => 'empty or too long']);
$https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https');
$host = isset($_SERVER['HTTP_HOST']) ? preg_replace('/[^A-Za-z0-9.:-]/', '', $_SERVER['HTTP_HOST']) : 'site';
$page = isset($b['page']) && is_string($b['page']) ? mb_substr($b['page'], 0, 200) : '/';
$subject = isset($b['subject']) && is_string($b['subject']) && trim($b['subject']) !== '' ? $b['subject'] : 'New message from ' . $host;
$subject = mb_substr(preg_replace('/[\\r\\n]+/', ' ', $subject), 0, 150);
$email = trim((string) ($fields['email'] ?? ($fields['mail'] ?? '')));
$replyTo = preg_match('/^[^\\s@<>]+@[^\\s@<>]+\\.[^\\s@<>]+$/', $email) ? $email : null;
$text = implode("\\n\\n", $lines) . "\\n\\n— " . ($https ? 'https' : 'http') . '://' . $host . $page;

$key = getenv('KAURY_MAIL_KEY') ?: (isset($_SERVER['KAURY_MAIL_KEY']) ? $_SERVER['KAURY_MAIL_KEY'] : '');
foreach ([dirname(__DIR__, 2)] as $dir) {
  if (!$key && is_file($dir . '/kaury-mail-key.txt')) $key = trim((string) file_get_contents($dir . '/kaury-mail-key.txt'));
}
if (!$key) kaury_answer(503, ['error' => 'KAURY_MAIL_KEY is not set where the site is hosted (or kaury-mail-key.txt next to the site folder)']);
$from = getenv('KAURY_MAIL_FROM') ?: 'Kaury forms <onboarding@resend.dev>';
$api = getenv('KAURY_MAIL_API') ?: 'https://api.resend.com/emails';
$payload = ['from' => $from, 'to' => [$to], 'subject' => $subject, 'text' => $text];
if ($replyTo) $payload['reply_to'] = $replyTo;
$body = json_encode($payload);
$headers = "Authorization: Bearer " . $key . "\\r\\nContent-Type: application/json\\r\\n";
if (function_exists('curl_init')) {
  $c = curl_init($api);
  curl_setopt_array($c, [CURLOPT_POST => true, CURLOPT_POSTFIELDS => $body, CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 15,
    CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $key, 'Content-Type: application/json']]);
  $answer = curl_exec($c);
  $status = (int) curl_getinfo($c, CURLINFO_HTTP_CODE);
  curl_close($c);
} else {
  $answer = @file_get_contents($api, false, stream_context_create(['http' => ['method' => 'POST', 'header' => $headers, 'content' => $body, 'timeout' => 15, 'ignore_errors' => true]]));
  $status = isset($http_response_header[0]) && preg_match('/\\s(\\d{3})\\s/', $http_response_header[0], $m) ? (int) $m[1] : 0;
}
if ($status < 200 || $status >= 300) kaury_answer(502, ['error' => 'the mail service answered ' . $status . ': ' . mb_substr((string) $answer, 0, 300)]);
kaury_answer(200, ['ok' => true]);
`
}

const phpString = (s: string) => `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`

/** Writes the PHP endpoint into the built site (dist/api/kaury-mail.php). */
export function writePhpMail(out: string, map: Record<string, string>) {
  if (!Object.keys(map).length) return
  mkdirSync(join(out, 'api'), { recursive: true })
  writeFileSync(join(out, 'api', 'kaury-mail.php'), phpMailHandler(map))
}

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
