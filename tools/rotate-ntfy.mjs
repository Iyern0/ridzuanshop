#!/usr/bin/env node
// Gives the seller's phone alert a new address.
//
// The topic this page posts to is public - it has to be, because a static page
// carries its own secrets in the source - so anyone who reads the page can read
// the alerts and post fake ones. There is no way to stop that without a server.
// Rotating is the lever that does exist: the old topic goes quiet, and whoever
// copied it is left shouting into nothing.
//
// Since v62 the live topic lives in Firestore (settings/notify) and is rotated
// from Settings -> Notifikasi -> Tukar topik, with no deploy at all. What this
// script still does is re-point the Bootstrap constant for a fresh deployment,
// or seed a new project. Rotating the seller's feed with it is pointless: the
// page overwrites the bootstrap with the stored topic at startup.
//
//   node tools/rotate-ntfy.mjs           # print a fresh topic, change nothing
//   node tools/rotate-ntfy.mjs --write   # write it into the page and print it
//
// After --write: only a deployment whose settings/notify doc is still empty
// will use it. To move the seller's phone, use the panel button.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const file = path.join(import.meta.dirname, '..', 'drinks-order.html');
// index.html is the file GitHub Pages serves; a rotation that only writes the
// source would leave customers posting to a topic nobody listens on.
const mirror = path.join(import.meta.dirname, '..', 'index.html');
const src = fs.readFileSync(file, 'utf8');
const current = (src.match(/const NTFY_BOOT='([^']+)'/) || [])[1];
if (!current) { console.error('No NTFY_BOOT found in drinks-order.html'); process.exit(1); }

const next = crypto.randomBytes(24).toString('base64').replace(/[^A-Za-z0-9]/g, '').slice(0, 32);
console.log('current topic: ' + current);
console.log('new topic:     ' + next);

if (process.argv.includes('--write')) {
  const out = src.replace(`const NTFY_BOOT='${current}'`, `const NTFY_BOOT='${next}'`);
  fs.writeFileSync(file, out);
  fs.writeFileSync(mirror, out);
  console.log('\nWritten as the bootstrap only. A deployment whose settings/notify is empty');
  console.log('will adopt it on first load; any live install keeps its stored topic.');
} else {
  console.log('\nNothing changed. To move the seller\'s phone, use Settings -> Notifikasi -> Tukar topik.');
}
