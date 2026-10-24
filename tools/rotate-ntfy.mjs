#!/usr/bin/env node
// Gives the seller's phone alert a new address.
//
// The topic this page posts to is public - it has to be, because a static page
// carries its own secrets in the source - so anyone who reads the page can read
// the alerts and post fake ones. There is no way to stop that without a server.
// Rotating is the lever that does exist: the old topic goes quiet, and whoever
// copied it is left shouting into nothing.
//
//   node tools/rotate-ntfy.mjs           # print a fresh topic, change nothing
//   node tools/rotate-ntfy.mjs --write   # write it into the page and print it
//
// After --write: open the ntfy app on the seller's phone, unsubscribe the old
// topic, subscribe the new one. Old alerts are never delivered to the new topic.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const file = path.join(import.meta.dirname, '..', 'drinks-order.html');
// index.html is the file GitHub Pages serves; a rotation that only writes the
// source would leave customers posting to a topic nobody listens on.
const mirror = path.join(import.meta.dirname, '..', 'index.html');
const src = fs.readFileSync(file, 'utf8');
const current = (src.match(/const NTFY_TOPIC='([^']+)'/) || [])[1];
if (!current) { console.error('No NTFY_TOPIC found in drinks-order.html'); process.exit(1); }

const next = crypto.randomBytes(24).toString('base64').replace(/[^A-Za-z0-9]/g, '').slice(0, 32);
console.log('current topic: ' + current);
console.log('new topic:     ' + next);

if (process.argv.includes('--write')) {
  const out = src.replace(`const NTFY_TOPIC='${current}'`, `const NTFY_TOPIC='${next}'`);
  fs.writeFileSync(file, out);
  fs.writeFileSync(mirror, out);
  console.log('\nWritten. Now on the seller\'s phone: unsubscribe the old topic in the ntfy app,');
  console.log('then subscribe to the new one. Until then every alert is silent.');
} else {
  console.log('\nNothing changed. Re-run with --write to apply, then re-subscribe the phone.');
}
