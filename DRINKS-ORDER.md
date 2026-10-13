# MINUM MALAM SISWA — Drinks Order App

## What It Is
PWA web app for a student stall (10:30PM–2:00AM). Customers browse menu, order via WhatsApp. Vendor manages everything from an admin dashboard.

**Live:** https://iyern0.github.io/ridzuanshop/
**Repo:** Iyern0/ridzuanshop (GitHub Pages, auto-deploys on push)
**Working tree:** `c:\Users\kiifu\Desktop\claude\` (drinks-order.html + index.html, always identical)

---

## Architecture

- **Single HTML file** — `drinks-order.html` / `index.html`
- **Firebase Firestore** — ALL data stored here (no Gist, no token)
- **Firebase Auth (Email/Password)** — gates the admin dashboard
- **WhatsApp** — orders sent via wa.me deep link
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

## ⚙️ Setup (do these before deploying)

**1. Enable Email/Password sign-in**
Firebase Console → Authentication → Sign-in method → **Email/Password** → Enable.
Without this, admin login fails with `auth/operation-not-allowed`.

**2. Create the admin account**
Authentication → Users → Add user. Use a real inbox so you can reset the password.
Disable "Email enumeration" and turn OFF self sign-up under Settings → Authorised domains.

**3. Publish the rules**
Firestore Database → Rules → paste **`firestore.rules`** → Publish.
Until this is done, your data is still world-readable.

**4. Delete the obsolete document**
Firestore → `settings` → `admin` → delete. It contains the old plaintext password.

**5. Add your admin domain**
Authentication → Settings → Authorised domains → add `iyern0.github.io`.

---

## Files
| File | Purpose |
|---|---|
| `drinks-order.html` | Main app (edit this) |
| `index.html` | Copy of above (GitHub Pages serves this) |
| `firestore.rules` | **Security rules — paste into console** |
| `manifest.json` | PWA manifest |
| `sw.js` | Service worker (cache version `v3-20261013` — bump on release) |
| `icons/icon-192.png` | PWA icon 192px |
| `icons/icon-512.png` | PWA icon 512px |
| `icons/apple-touch-icon.png` | iOS icon 180px |
| `gen_icons.py` | Icon generator (python PIL) |

**Always edit drinks-order.html, then `cp drinks-order.html index.html`.**

> Note: `chk_firebase.js` and `chk_index.js` are stale snapshots from the pre-Firestore
> Gist era. They do not test the current app.

---

## Customer Flow
1. Browse menu (loaded from Firestore)
2. Tap item → customization modal (pemanis/level/add-ons)
3. Tap "Add to Cart"
4. Tap "Review Order" → cart panel opens
5. Select delivery: **COD** (block picker + room input) or **Ambil Sendiri**
6. Fill name, select time slot, payment
7. Confirm → opens WhatsApp with order message → Firestore saves order

**Cart survives a page refresh** (persisted in `localStorage` under `mms_cart`).

### Blocks (COD only)
Intan, Delima, Baiduri, Kristal A, Kristal B, Nilam, Zamrud
After selecting block → room number input appears → "Intan 3-2-1" format

---

## Admin Dashboard
**Enter:** Tap 🌙 MINUM MALAM SISWA title 5× within 1 second → email + password prompt.
**Again while inside:** tap 5× to sign out.

Auth session is remembered — once signed in, the panel opens on reload without re-entering
the password. Password changes are done in the Firebase console, not in the app.

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
- **Order cards:** #number, name, block box (COD), items (no prices), time/payment, status buttons, 📤 WhatsApp notify, ✕ delete
- **Bulk action:** "✅ Tandakan Semua Siap" on Baru/Proses views
- **Search:** Search by name/room in Siap section only
- **Sound:** Beep + vibrate when new order arrives (admin panel open)
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
git add -A && git commit -m "feat: ..." && git push origin main
```
GitHub Pages auto-deploys ~1 min after push.

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
- Language toggle (MS/EN) — previously attempted, reverted
- Old order archival — `orders` grows forever; consider deleting settled orders monthly