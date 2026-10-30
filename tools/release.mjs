#!/usr/bin/env node
// Release the storefront: one command, in the order that matters.
//
//   node tools/release.mjs --tag v56
//
// 1. mirror drinks-order.html onto index.html (GitHub Pages serves index.html;
//    the repo promises the two are byte-identical, and when they drift the
//    customers keep running last week's build while the source looks current)
// 2. bump the pasteable build marker in the page corner
// 3. bump the service worker cache name, or old shells never get evicted
// 4. verify what a fresh device would download, from the served files, not
//    from the working tree
//
// Exit code 0 only when every step and the verification passed.
import fs from 'node:fs';
import path from 'node:path';

const DIR = path.resolve(process.argv[1], '..', '..');
const PAGE = path.join(DIR, 'drinks-order.html');
const PREVIEW = path.join(DIR, 'experiments', 'CHAGEE-ORDER.html');
const INDEX = path.join(DIR, 'index.html');
const SW = path.join(DIR, 'sw.js');

const argTag = (() => {
  const i = process.argv.indexOf('--tag');
  return i > -1 ? process.argv[i + 1] : '';
})();
if (!argTag || !/^v\d+$/.test(argTag)) {
  console.error('usage: node tools/release.mjs --tag vNN');
  process.exit(2);
}
const tag = argTag;
const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');

let page = fs.readFileSync(PAGE, 'utf8');
let sw = fs.readFileSync(SW, 'utf8');

// 1. mirror
fs.writeFileSync(INDEX, page);
if (fs.readFileSync(INDEX, 'utf8') !== page) {
  console.error('mirror failed: index.html and drinks-order.html differ');
  process.exit(1);
}
console.log('mirror  drinks-order.html -> index.html (' + page.length + ' bytes)');

// 2. build marker
const marker = /(id="build-tag"[^>]*>)v\d+(<\/div>)/;
if (!marker.test(page)) {
  console.error('build marker not found in ' + PAGE);
  process.exit(1);
}
page = page.replace(marker, '$1' + tag + '$2');

// 2b. the payment QR is fetched by URL, so a phone that cached the old card keeps
//     showing it. Stamp the query string with the release number to bust that.
const qnum = tag.replace(/^v/, '');
const qrq = /qr-duitnow\.jpg\?v=\d+/g;
if (qrq.test(page)) {
  page = page.replace(/qr-duitnow\.jpg\?v=\d+/g, 'qr-duitnow.jpg?v=' + qnum);
  console.log('qr      ?v=' + qnum);
}
fs.writeFileSync(PAGE, page);
fs.writeFileSync(INDEX, page);
console.log('marker  ' + tag);

// The experiments/ copy is a separate file on Pages; if it keeps an older
// marker the page looks stale even though the root is current.
if (fs.existsSync(PREVIEW)) {
  const prev = fs.readFileSync(PREVIEW, 'utf8');
  if (!marker.test(prev)) {
    console.error('build marker not found in ' + PREVIEW);
    process.exit(1);
  }
  fs.writeFileSync(PREVIEW, prev.replace(marker, '$1' + tag + '$2'));
  console.log('preview ' + tag);
}

// 3. service worker
const vline = /const V = 'v\d+-\d+';/;
if (!vline.test(sw)) {
  console.error('V constant not found in ' + SW);
  process.exit(1);
}
sw = sw.replace(vline, "const V = '" + tag + '-' + date + "';");
sw = sw.replace(/\/\/ Current: v\d+/, '// Current: ' + tag);
fs.writeFileSync(SW, sw);
console.log('sw      ' + sw.match(/const V = '([^']+)'/)[1]);

// 4. verify the served shape: both files identical, marker and V agree
const served = fs.readFileSync(INDEX, 'utf8');
const servedSw = fs.readFileSync(SW, 'utf8');
const ok = {
  identical: served === page,
  markerSays: (served.match(/id="build-tag"[^>]*>v(\d+)</) || [])[1] === tag.slice(1),
  swSays: (servedSw.match(/const V = '([^']+)'/) || [])[1] === tag + '-' + date,
  swListsIndex: /'\.\/index\.html'/.test(servedSw) && /'\.\/drinks-order\.html'/.test(servedSw),
};
console.log('verify  ' + JSON.stringify(ok));
if (Object.values(ok).some(v => !v)) { console.error('verify failed'); process.exit(1); }
console.log('next    git add drinks-order.html index.html sw.js && commit && push');
