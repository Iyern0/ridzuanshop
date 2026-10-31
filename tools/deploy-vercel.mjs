// Builds the folder that actually gets uploaded, so the host publishes the shop
// and nothing else. The repo root carries the build engine, the worklog and the
// design notes; GitHub Pages served all of them. This directory is the whole
// public site: the page, its mirror, the service worker, the icons and the
// payment QR.
//
//   node tools/deploy-vercel.mjs          # build ./deploy and report
//   npx vercel --prod --cwd deploy        # upload it
import { readFileSync, writeFileSync, mkdirSync, rmSync, copyFileSync, statSync, existsSync } from 'node:fs'
import { dirname, join, extname } from 'node:path'

const ROOT = join(import.meta.dirname, '..')
const OUT = join(ROOT, 'deploy')

const FILES = [
  'index.html',
  'drinks-order.html',   // the service worker's SHELL lists it; a 404 here breaks the offline fallback
  'sw.js',
  'manifest.json',
  'qr-duitnow.jpg',
  'icons/apple-touch-icon.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
]

// Two things have to be right or the deploy is a stale-cache trap: the page must
// not be cached by the CDN while its own build number changes, and the worker
// must be revalidated every time so a fix cannot hide behind a cached script.
const VERCEL = {
  headers: [
    { source: '/sw.js', headers: [{ key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' }] },
    { source: '/index.html', headers: [{ key: 'Cache-Control', value: 'no-cache, must-revalidate' }] },
    { source: '/drinks-order.html', headers: [{ key: 'Cache-Control', value: 'no-cache, must-revalidate' }] },
    { source: '/manifest.json', headers: [{ key: 'Cache-Control', value: 'no-cache' }] },
    { source: '/(icons|qr-duitnow\\.jpg)(.*)', headers: [{ key: 'Cache-Control', value: 'public, max-age=604800' }] },
    { source: '/(.*)', headers: [{ key: 'X-Content-Type-Options', value: 'nosniff' }, { key: 'Referrer-Policy', value: 'no-referrer-when-downgrade' }] },
  ],
}

const fail = (msg) => { console.error('✗ ' + msg); process.exit(1) }

// 1. every input must exist before anything is deleted
for (const f of FILES) if (!existsSync(join(ROOT, f))) fail('missing input: ' + f)

// 2. the page and its mirror must be the same bytes, or the shop shows one thing
//    and the offline copy another
const a = readFileSync(join(ROOT, 'index.html'))
const b = readFileSync(join(ROOT, 'drinks-order.html'))
if (!a.equals(b)) fail('index.html and drinks-order.html differ — run node tools/release.mjs --tag vNN first')

// 3. a deploy that would publish the build engine is worse than no deploy, so
//    the output is rebuilt from scratch every time
rmSync(OUT, { recursive: true, force: true })
mkdirSync(OUT, { recursive: true })
for (const f of FILES) {
  const dst = join(OUT, f)
  mkdirSync(dirname(dst), { recursive: true })
  copyFileSync(join(ROOT, f), dst)
}
writeFileSync(join(OUT, 'vercel.json'), JSON.stringify(VERCEL, null, 2) + '\n')

// 4. report what a visitor will actually be able to fetch
const build = (a.toString().match(/id="build-tag"[^>]*>(v\d+)</) || [])[1] || '?'
let total = 0
for (const f of [...FILES, 'vercel.json']) {
  const s = statSync(join(OUT, f)).size
  total += s
  console.log(String(s).padStart(8), f)
}
console.log('         -------')
console.log(String(total).padStart(8), 'bytes total')
console.log('build    ' + build)

// 5. nothing from the repo's own paperwork may have slipped in
for (const forbidden of ['tools/engine-source.html', 'WORKLOG.md', 'DRINKS-ORDER.md', 'relay/api/tg.js', 'n.json']) {
  if (existsSync(join(OUT, forbidden))) fail('published something private: ' + forbidden)
}
console.log('clean    no tools/, no WORKLOG, no DRINKS-ORDER, no relay source')
console.log('next     npx vercel --prod --cwd deploy --yes')
