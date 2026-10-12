import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, rmSync, mkdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { build } from '../src/cli/project.js'
import { underFolder } from '../src/cli/folder.js'
import { withBase } from '../src/runtime/dom.js'
import { setLanguage } from '../src/core/index.js'

setLanguage('en')
const TMP = resolve('tests/.tmp')

// A site that lives in a folder of another site (dev.kaury.studio/showcase/lina/, user.github.io/project/):
// every address of its own starts with that folder, in the HTML that is served and in what the page writes later.

test('under a folder, the addresses of the site start with it; the others are left alone', () => {
  const html = '<html lang="en"><head><link rel="icon" href="/mark.svg"><link rel="preload" as="image" href="/_kaury/img/a-960.webp" imagesrcset="/_kaury/img/a-320.webp 320w, /_kaury/img/a-960.webp 960w"><style>.a{background:url("/_kaury/img/hall.webp")}.b{src:url(/_kaury/fonts/f.woff2)}</style><script type="module" src="/_kaury/site.js"></script></head><body><a href="/about">About</a><a href="#menu">Menu</a><a href="https://example.com/x">Out</a><a href="//cdn.example.com/y">Cdn</a><a href="mailto:a@b.ch">Mail</a><img src="/pic.jpg" srcset="/_kaury/img/pic-320.webp 320w, /_kaury/img/pic-640.webp 640w"><form action="/api/kaury-mail"></form><a href="/demo/already">Already</a></body></html>'
  const out = underFolder(html, '/demo/')
  assert.match(out, /<html lang="en" data-k-base="\/demo\/">/)
  assert.match(out, /href="\/demo\/mark\.svg"/)
  assert.match(out, /href="\/demo\/_kaury\/img\/a-960\.webp" imagesrcset="\/demo\/_kaury\/img\/a-320\.webp 320w, \/demo\/_kaury\/img\/a-960\.webp 960w"/)
  assert.match(out, /url\("\/demo\/_kaury\/img\/hall\.webp"\)/)
  assert.match(out, /url\(\/demo\/_kaury\/fonts\/f\.woff2\)/)
  assert.match(out, /src="\/demo\/_kaury\/site\.js"/)
  assert.match(out, /<a href="\/demo\/about">/)
  assert.match(out, /<img src="\/demo\/pic\.jpg" srcset="\/demo\/_kaury\/img\/pic-320\.webp 320w, \/demo\/_kaury\/img\/pic-640\.webp 640w">/)
  assert.match(out, /action="\/demo\/api\/kaury-mail"/)
  // what is not an address of the site
  assert.match(out, /<a href="#menu">/)
  assert.match(out, /<a href="https:\/\/example\.com\/x">/)
  assert.match(out, /<a href="\/\/cdn\.example\.com\/y">/)
  assert.match(out, /<a href="mailto:a@b\.ch">/)
  assert.match(out, /<a href="\/demo\/already">/, 'an address already in the folder is not moved twice')
})

test('what a page writes after it is displayed starts with the folder too', () => {
  const g = globalThis as any
  g.__kauryBase = '/demo/'
  try {
    assert.equal(withBase('/pic.jpg'), '/demo/pic.jpg')
    assert.equal(withBase('/demo/pic.jpg'), '/demo/pic.jpg')
    assert.equal(withBase('/'), '/demo/')
    assert.equal(withBase('#menu'), '#menu')
    assert.equal(withBase('https://example.com/x'), 'https://example.com/x')
    assert.equal(withBase('//cdn.example.com/y'), '//cdn.example.com/y')
    assert.equal(withBase('/_kaury/img/a-320.webp 320w, /_kaury/img/a-640.webp 640w', true), '/demo/_kaury/img/a-320.webp 320w, /demo/_kaury/img/a-640.webp 640w')
  } finally {
    delete g.__kauryBase
  }
  assert.equal(withBase('/pic.jpg'), '/pic.jpg', 'a site at the root changes nothing')
})

test('kaury build with a base: a site with pictures, a state and two pages works from its folder', async () => {
  const sharp = (await import('sharp')).default
  const dir = join(TMP, 'folder')
  rmSync(dir, { recursive: true, force: true })
  mkdirSync(join(dir, 'public'), { recursive: true })
  await sharp({ create: { width: 1400, height: 900, channels: 3, background: '#445566' } }).jpeg().toFile(join(dir, 'public', 'pic.jpg'))
  await sharp({ create: { width: 1800, height: 1200, channels: 3, background: '#223344' } }).jpeg().toFile(join(dir, 'public', 'hall.jpg'))
  writeFileSync(join(dir, 'site.kaury'), [
    'site "Folder"', '  lang "en"', '', 'state likes = 0', '',
    'page "/"', '  seo "Home", "A page."',
    '  section hero, background "hall.jpg", shade 0.6', '    title "Strong"',
    '  section', '    image "pic.jpg", "A picture"', '    link "About" "/about"', '    button "I like it ({likes})" -> likes += 1', '',
    'page "/about"', '  seo "About", "The other page."', '  section', '    title "About"', '    link "Home" "/"', '',
  ].join('\n'))
  const r = await build(join(dir, 'site.kaury'), { out: join(dir, 'dist'), base: '/demo/' })
  const html = readFileSync(join(r.dir, 'index.html'), 'utf8')
  assert.match(html, /<html [^>]*data-k-base="\/demo\/"/)
  assert.match(html, /<script type="module" src="\/demo\/_kaury\/[^"]+\.js">/)
  assert.match(html, /<img [^>]*src="\/demo\/pic\.jpg"[^>]*srcset="\/demo\/_kaury\/img\/pic-320-/)
  assert.match(html, /--k-pic:url\(["']?\/demo\/_kaury\/img\/hall-/)
  assert.match(html, /<a [^>]*href="\/demo\/about"/)
  assert.doesNotMatch(html, /(href|src)="\/(?!demo\/|\/)[^"]/, 'no address of the site is left at the root')
  const about = readFileSync(join(r.dir, 'about', 'index.html'), 'utf8')
  assert.match(about, /<a [^>]*href="\/demo\/"/)
})

test('a site shown inside a page of the same site wakes with a gesture made on that page', async () => {
  // a preview in a frame: its 3D waited for a gesture inside the frame, so it looked empty until the mouse came over it
  const { gestureTargets } = await import('../src/runtime/motion.js')
  const top: any = { location: { origin: 'https://dev.kaury.studio' } }
  top.parent = top
  assert.deepEqual(gestureTargets(top), [top], 'a page of its own listens to itself')
  const frame: any = { location: { origin: 'https://dev.kaury.studio' }, parent: top }
  assert.deepEqual(gestureTargets(frame), [frame, top], 'a frame of the same site listens to the page around it too')
  const foreign: any = { location: { origin: 'https://dev.kaury.studio' }, parent: { get location(): any { throw new Error('cross-origin') } } }
  assert.deepEqual(gestureTargets(foreign), [foreign], 'inside another site, it only listens to itself')
})

test('under a folder, a shape that Kaury draws itself stays a shape, and a frame still finds its page', () => {
  // “object "gem"” is no file: moved under the folder, it was fetched as one and the object never appeared
  const html = '<html lang="en"><body><div class="k-object k-3d" data-src="/gem"></div><div class="k-object k-3d" data-src="/can.glb"></div><iframe data-src="/play/"></iframe></body></html>'
  const out = underFolder(html, '/demo/')
  assert.match(out, /data-src="\/gem"/)
  assert.match(out, /data-src="\/demo\/can\.glb"/)
  assert.match(out, /<iframe data-src="\/demo\/play\/">/)
})

test('in a site served from a folder, the page asks for a shape by its name and for a model by its file', async () => {
  const { objectSource } = await import('../src/runtime/motion.js')
  const g = globalThis as any
  g.__kauryBase = '/demo/'
  try {
    assert.equal(objectSource('/gem'), '/gem')
    assert.equal(objectSource('knot'), 'knot')
    assert.equal(objectSource('/can.glb'), '/demo/can.glb')
    assert.equal(objectSource('/star.svg'), '/demo/star.svg')
  } finally {
    delete g.__kauryBase
  }
})
