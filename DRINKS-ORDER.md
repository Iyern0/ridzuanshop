# MINUM MALAM SISWA — Drinks Order App

## What It Is
PWA web app for a student stall (10:30PM–2:00AM). Customers browse menu, order via WhatsApp. Vendor manages everything from an admin dashboard.

**Live:** https://iyern0.github.io/ridzuanshop/
**Repo:** Iyern0/ridzuanshop (GitHub Pages, auto-deploys on push)
**Working tree:** `c:\Users\kiifu\Desktop\MINUM MALAM SISWA\app\` (drinks-order.html + index.html, always identical)

---

## Architecture

- **Single HTML file** — `drinks-order.html` / `index.html`
- **Firebase Firestore** — ALL data stored here (no Gist, no token)
- **Firebase Auth (Email/Password)** — gates the admin dashboard
- **WhatsApp** — orders sent via wa.me deep link
- **Type** — Plus Jakarta Sans 800 for display, Nunito for body, named once as `--fd` / `--fb` in `:root`. No text below 11px; inputs are 16px so iOS does not zoom the page when a field is focused.
- **PWA** — manifest.json, icons, service worker (installable)

### Firestore Collections
| Collection | Public read | Public write | Notes |
|---|---|---|---|
| `orders/{id}` | ❌ | ✅ create only | Customers may submit one valid order. Only admin can read/update/delete. |
| `settings/menu` | ✅ | ❌ | Menu items array |
| `settings/config` | ✅ | ❌ | Add-ons, time slots, delivery methods, blocks |
| `settings/disabled` | ✅ | ❌ | Disabled menu items map |
| `settings/admin` | ❌ | ❌ | **Obsolete — delete this document.** Held a plaintext password. |

---

## 🔐 Security

### The threat that was closed
The original rules were `allow read, write: if true` on every path. Anyone who opened the
site URL could:
- read every customer's name and room number,
- delete order history,
- rewrite the admin password and lock out the owner.

The admin "password" (`admin123`) was stored in plaintext in Firestore and printed on screen
in the Settings tab, and the gate itself was "tap the title 5× in one second".

### What it is now

| Control | How |
|---|---|
| Admin access | Firebase Auth email/password. Session persists via `onAuthStateChanged`. |
| Order privacy | Only signed-in admin can read `orders`. |
| Order integrity | `validOrder()` in `firestore.rules` — fixed field set, length caps, `status` must be `baru`, `createdAt` must equal server time (no backdating). |
| Menu integrity | Public read, admin-only write. Nobody can silently alter prices. |
| XSS | Every interpolated name (`v.name`, `a.name`, `d.l`, block names) is passed through `esc()`. `esc()` also handles `null`. |
| Injection surface | CSP meta tag restricts scripts to `'self'` + `gstatic.com`; `object-src 'none'`, `base-uri 'self'`, `form-action 'none'`. |
| Double-submit | `_sending` flag + disabled button. Three rapid taps produce exactly one order. |
| Query cost | Order queries capped at `.limit(200)` — prevents unbounded reads / free-tier blowout. |
| Dead code | Removed the unreachable customer-facing order viewer (would have leaked all orders). |
| Accidental indexing | `<meta name="robots" content="noindex, nofollow">`. |

### Residual risk (honest)
Firestore rules cannot read the price list, so the client-supplied `total` is trusted.
Someone could forge the *amount* on an order. They still cannot forge that the order exists,
read real history, or alter an existing order. Payment is settled in person, so the worst case
is a bogus line in the admin queue. Closing this properly needs a trusted server (Cloud Function),
which costs money.

---

## ⚙️ Setup status — COMPLETE (2026-10-14)

All of the following is **done and verified against the live project**:

| Step | State |
|---|---|
| Email/Password sign-in enabled | ✅ enabled |
| Admin account created | ✅ `zjasneh5@gmail.com` (owner of the Firebase project) |
| `firestore.rules` published | ✅ deployed, compiled clean |
| `settings/admin` (old plaintext password) | ✅ unreadable via rules |

Admin credentials are in `C:\Users\kiifu\Desktop\fb-admin-setup\ADMIN-CREDENTIALS.txt`.
**Change that password** once you've saved it: Firebase Console → Authentication → Users.

### The account that matters
`minum-malam-siswa` is owned by **`zjasneh5@gmail.com`** — note the **5**.
If the console says *"project does not exist or you do not have permission"*, your
browser is signed into a different Google account. Use an incognito window and sign
in as `zjasneh5@gmail.com`.

### If you ever need to redo it
```powershell
cd C:\Users\kiifu\Desktop\fb-admin-setup
firebase login          # must be zjasneh5@gmail.com
node after-login.js     # enables the provider + (re)creates the admin user
```
Helper scripts in that folder:
`probe.js` (is Auth on? are orders private?), `verify-auth.js` (end-to-end auth check),
`inventory.js` / `show-menu.js` (read live data), `cleanup-tests.js` (remove test orders).

### Redeploying rules after an edit
```powershell
cd C:\Users\kiifu\Desktop\claude
firebase deploy --only firestore:rules --project minum-malam-siswa
```

---

## Files
| File | Purpose |
|---|---|
| `drinks-order.html` | Main app (edit this) |
| `index.html` | Copy of above (GitHub Pages serves this) |
| `firestore.rules` | **Security rules — paste into console** |
| `manifest.json` | PWA manifest |
| `sw.js` | Service worker — carries a `const V` cache version. Bump `V` on release; do not pin the value here, it goes stale |
| `firebase.json` | Firebase CLI config (rules target) |
| `qr-duitnow.jpg` | DuitNow QR shown on the payment step |
| `icons/icon-192.png` | PWA icon 192px |
| `icons/icon-512.png` | PWA icon 512px |
| `icons/apple-touch-icon.png` | iOS icon 180px |
| `gen_icons.py` | Icon generator (python PIL) |
| `DRINKS-ORDER.md` | This file — what is true **now** |
| `WORKLOG.md` | Append-only record of what **happened** (never edit a past entry) |

**Always edit drinks-order.html, then `cp drinks-order.html index.html`.**

> Note: `chk_firebase.js` and `chk_index.js` are stale snapshots from the pre-Firestore
> Gist era. They do not test the current app.

### Repository scope
The repo is **one app**, but the working directory is a general scratch area — emulator
screenshots, course PDFs, Arduino sketches, other side projects and a stray `.env` all
live in the same folder. `.gitignore` therefore runs a **whitelist**: `/*` ignores
everything at the root, then the app files are re-admitted one by one. Anything new
dropped in the folder is invisible to git by default, which is the intent.

Consequence worth knowing: a genuinely new app file (say `robots.txt`) is **silently
ignored** until someone adds a `!/` line for it. If a file "won't commit", that is why.

One tracked file is outside the app's scope and is a candidate for removal:
`transit-widget/DESIGN.md` (a different project's design doc, no longer edited here).

---

## Customer Flow
1. Browse menu (loaded from Firestore)
2. Tap item → customization modal (pemanis/level/add-ons)
3. Tap "Add to Cart"
4. Tap "Review Order" → cart panel opens
5. Select delivery: **COD** (block picker + room input) or **Ambil Sendiri**
6. Fill name, choose a time (**required** — a slot or one typed into the box; with neither, the order is refused and the box is pointed at), choose payment
7. QR Pay only → the receipt box sits **directly under the QR**: attach the proof, tap "Saya dah bayar" to stage it
8. "Hantar Pesanan" → order saved to Firestore + WhatsApp opens + the seller is alerted **only if** a payment claim rode along with it
9. On the done screen, once per device and only when no receipt is outstanding: the **stamp prompt** — the promotion explained, the customer's own progress, a number field, and "Tak berminat" at the bottom. The number goes to `members/{phone}`, readable only by the seller, and is kept on the device so the **next** order carries it (which is what keeps the Customers tab's totals working now the form does not ask).

**Nothing is pre-selected anywhere.** Delivery, payment, time and drink options all
start blank, so an order can never be placed on a default the customer never chose.
A refresh loses a staged receipt on purpose (it is held in memory, never in
`localStorage`), and the done screen offers the box again so nobody gets stuck.

**Cart survives a page refresh** (persisted in `localStorage` under `mms_cart`).

### Blocks (COD only)
Intan, Delima, Baiduri, Kristal A, Kristal B, Nilam, Zamrud
After selecting block → room number input appears → "Intan 3-2-1" format

---

## Admin Dashboard
| Entry point | Tap 🌙 MINUM MALAM SISWA title 5× within 1 second → email + password prompt. |
|---|---|
| Admin account | `zjasneh5@gmail.com` |
| Session | Remembered — the panel reopens on reload without re-entering the password |
| Sign out | Tap the title 5× again while inside the panel |
| Password change | Firebase Console → Authentication → Users (there is no in-app change) |

### Sidebar Tabs
| Tab | Function |
|---|---|
| **Pesanan** | Orders management (History + status filters) |
| **Minuman** | Menu items (add/edit/delete/reorder/enable-disable) |
| **Pemanis** | Add-ons grouped (Pemanis/Level/Extra) |
| **Masa** | Time slots |
| **Penghantaran** | Delivery methods + blocks |
| **Settings** | Signed-in account, sign out, reset all |

### Pesanan Tab
- **History view:** Hari Ini / Minggu Ini / Bulan Ini — order count + RM revenue
- **Status filters:** Baru (🔴) | Proses (🟡) | Siap (🟢)
- **Order rows:** colour rail, #number, name, block/Ambil sendiri, 📎 Resit (glows until opened), RM total, then status pills, 🗑 delete, ›
- **Detail panel:** tap a row → one card per drink, each add-on its own chip, with the line's own price; then butiran, receipt, WhatsApp the customer, delete
- **Bulk action:** "✅ Tandakan Semua Siap" on Baru/Proses views
- **Search:** name/room in the Siap and Semua views. Clicking the box also reveals a row of block chips, so a block is picked without typing; their counts are taken before the typed name is applied, so they hold still while one is typed.
- **Alerts:** nothing at all is sent when an order is placed. The seller is alerted (ntfy push + beep/vibrate in an open panel) **only** when a customer claims payment, because that is the moment money needs checking. The payload carries an order number and COD/Ambil sendiri and **nothing else** — no name, block, room, amount or items — because the topic name is the only credential a browser can hold and it ships in public source. That is also why the tap matters: it carries the order id, so it opens the dashboard and that order's receipt. A receipt you have not opened shows a glowing 📎 Resit pill, and the "N resit perlu semak" warning counts only unopened ones.
- **Coupons (buy five, one drink free):** a third payment method, `Kupon`. The seller mints the code when the fifth completed order is marked done; `coupons/{CODE}` holds `used`, `exp` and `ord` and nothing about the customer. The customer types the code at checkout, the app reads it from Firestore, the tap marks that line `PERCUMA`, and the code is burned in the same transaction that writes the order. **The coupon pays for the drink only — add-ons stay payable and are shown as what is still owed on that line.** Single use is a rule (`used: false -> true`, nothing else may change), `list` is denied, a coupon order must carry a live coupon code, and free orders never count toward the next five. 30-day expiry; the RM1 COD fee still applies, because it is delivery and not the drink.
- **Payment:** there is no paid button anywhere. Opening a receipt settles the flag — which is what the glow already meant — so the "belum bayar" count, the Resit tab line and the customer's own "Bayaran diterima" mark all clear themselves.
- **Age indicator:** "3 min lalu", "1 jam lalu"
- Shows the most recent **200** orders.

---

## Firebase Project
- **ID:** minum-malam-siswa
- **Account:** zulkifli (zjasneh5@gmail.com)
- **Plan:** Spark (free)
- **Location:** asia-southeast1 (Singapore)
- **Config keys:** Already in FIREBASE_CONFIG (AIzaSyCigQ...)

---

## Deployment
```bash
cd c:\Users\kiifu\Desktop\claude
# edit drinks-order.html
cp drinks-order.html index.html
# bump V in sw.js when shipping a release
git add drinks-order.html index.html sw.js && git commit -m "feat: ..." && git push origin main
```
GitHub Pages auto-deploys ~1 min after push.

> **Never use `git add -A` in this folder.** It also holds ~120 unrelated files
> (screenshots, course PDFs, other side projects, a stray `.env`). `.gitignore`
> now ignores everything at the root and re-admits only the app, so `-A` is
> safe *today* — but the explicit path list is the habit that stays safe if that
> whitelist is ever loosened. Verify with `git add -A --dry-run` before trusting it.

> Gotcha that bit us before: the service worker cache name was hardcoded `v1`, so the
> first shell it ever cached was pinned forever. `sw.js` now uses a version constant and
> skips all Firebase/googleapis/gstatic traffic. **Bump `V` on every release.**

---

## Bugs fixed in the 2026-10 security pass
1. Firestore rules were `allow read, write: if true` on every path — data leak + takeover.
2. Admin password stored in plaintext in Firestore and displayed in the Settings tab.
3. Tapping "Hantar ke WhatsApp" three times created three orders.
4. `inp-custom-block` was referenced by the delivery-toggle handler but absent from the DOM
   → `TypeError` every time a customer switched to pickup.
5. `sw.js` pinned cache `v1` forever; users could be served a stale menu with no recovery.
6. Order queries loaded the entire `orders` collection into the browser, unbounded.
7. Duplicate `exitAdmin()`; `getDb()` had an operator-precedence bug that worked by accident.
8. Menu/add-on/block names interpolated into `innerHTML` without escaping.
9. `viewport` had `user-scalable=no`, blocking pinch-zoom — bad for reading prices.
10. Dead code: an unreachable customer-facing order viewer that dumped all orders to the DOM.

---

## Still open / future work
- Offline menu viewing (service worker caches the shell but not Firestore data)
- Push notifications for new orders (FCM)
- Revenue analytics charts (daily/weekly/monthly breakdowns)
- Print receipt for cash orders
- Language is mixed on purpose for now: the time section is English, the rest of the
  customer flow is Malay. A full MS/EN toggle was attempted once and reverted; if it
  comes back it needs to be a real toggle, not a rewrite.
- Old order archival — `orders` grows forever; consider deleting settled orders monthly