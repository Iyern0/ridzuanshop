# WORKLOG — MINUM MALAM SISWA

Append-only record of what happened, oldest first. **Never edit or delete a past
entry** — if one turns out to be wrong, add a `CORRECTION` entry pointing back at
it. `DRINKS-ORDER.md` holds what is true *now*; this file holds *what happened*.

**Gap, stated plainly:** this log opens 2026-10-16 11:06. Everything before it —
the 2026-10 security pass, the password removal, the events wipe — is not
reconstructed here. Those details are not recoverable from the files, so they are
left as a hole rather than filled with plausible numbers. See `DRINKS-ORDER.md`
for current state and `git log` for what changed.

---

### 2026-10-16 11:06 — Baseline committed (`837329b`)

**What happened:** Landed the silent-orders + payment-claim-notify + PDF-receipt work.
**Found / changed:** New-order notifications removed entirely — no FCM push and no
in-app chime. The seller is now told only when a customer claims payment. PDF
receipts accepted (`accept="image/*,application/pdf"`, whole file as base64,
client cap 480 KB because Firestore caps a document at 1 MiB and base64 inflates
by about a third).
**Artefacts:** `drinks-order.html`, `index.html`, `firestore.rules`, `sw.js`
**Status:** ✅ confirmed

### 2026-10-16 11:11 — Stepper verified per delivery method

**What happened:** Placed real orders and read the stepper DOM to confirm the two
step sets behave as designed.
**Found / changed:** Pickup (`KFCJRJ`, no=2) shows 3 pills
`Diterima › Dibuat › Sila ambil`; `processing` lights 1 (rank 0→1) because making
it is the whole job. `done` gives rank 2, `fin` set, all three pills lit, no `cur`
left running, status `Siap! Sila ambil 🍹` — never "Dalam perjalanan" or "Sampai".
COD (`T5HZ69`, no=1) shows 4 pills and `processing` lights 2.
**Artefacts:** `drinks-order.html`
**Status:** ✅ confirmed

### 2026-10-16 11:23 — Receipt block moved under the QR at checkout

**What happened:** The QR section used to *promise* a receipt upload later. It now
holds the real block.
**Found / changed:** `#qr-section` gets `claimBlockHtml('qr-')` injected in place of
the promise note; the done screen calls the same function with `''`. One function,
two placements, so the copies cannot drift. The order does not exist at checkout,
so the picked file is held in memory and written by `submitClaim()` the moment the
order is created — which is also the moment the seller is told. Staging is silent.
**Verified:** staging = 0 pushes. Staged proof plus order = exactly 1 push
(`Bayaran? Pesanan #003 - Blok Delima 5-4/2`). QR order with no proof = 0 pushes and
the fallback block appears on the done screen; submitting from the fallback = 1 push.
Server-side: `payments/W43ZBS` holds a 20,220-character
`data:application/pdf;base64,` document; order no=3, pay=qr.
**Artefacts:** `drinks-order.html`, `index.html`
**Status:** ✅ confirmed

### 2026-10-16 11:24 — Hole found: `sendWa()` had no delivery or payment guard

**What happened:** A test order (`L3VRVT`) was created as "ambil sendiri" for a
customer who had never chosen a delivery method. That was a real hole, not a test
artefact.
**Found / changed:** The `#checkout` button validated `isCod === null` and `!payM`;
`sendWa()` — the function that actually writes — did not, and `isCod ? 'cod' : 'pickup'`
silently treated null as pickup. Both guards added to `sendWa()`.
**Verified:** no delivery → refused (`⚠ Sila pilih cara penghantaran`); no payment →
refused (`⚠ Sila pilih cara bayar`); both set → order created normally (`Z482AG`).
**Artefacts:** `drinks-order.html`
**Status:** ✅ confirmed

### 2026-10-16 11:26 — Test data removed

**What happened:** Deleted the five test orders created while verifying the above,
and put the daily counter back.
**Found / changed:** Removed `T5HZ69`, `KFCJRJ`, `W43ZBS`, `L3VRVT`, `Z482AG` plus
their `tracking/` and `payments/` documents. `counters/2026-10-16` reset to 0.
Firestore returned to 21 orders and the 2 real receipts (`9RFMYB`, `L7YXU7`), which
were untouched throughout. `_test-resit.pdf` deleted.
**Artefacts:** —
**Status:** ✅ confirmed

### 2026-10-16 11:28 — Commit `ef4757b` (local only, not pushed)

**What happened:** Committed the receipt move and the write-path guard; bumped the
service worker.
**Found / changed:** `ef4757b`, 3 files, 516 insertions, 128 deletions.
`sw.js` `v5-20261016` → `v6-20261016`. Still local: the live site runs the old
build — `compare-live.js` reports `identical: false`, first difference at byte 640
(`frame-src blob:`), and the push is what turns the new behaviour on.
**Artefacts:** `drinks-order.html`, `index.html`, `sw.js`
**Status:** ✅ confirmed

### 2026-10-16 11:35 — Time section: English, and slots moved under the label

**What happened:** The "Masa Ambil" section was reworded to English and its slot row
moved up.
**Found / changed:** `#times` now sits first under `#time-label`, trading places with
the `#pickup-time` box. Order is label → slots → note → custom box → hint.
Wording: `⏰ When?`, `💬 Will chat when it's ready`, `e.g. 11:00 PM`,
`Choose when you want it`. This section's toasts too (`❌ Time not available`,
`⚠ Please choose a time`) and the empty custom-time fallback
(`(nyatakan masa)` → `(state a time)`).
**Artefacts:** `drinks-order.html`, `index.html`, `fb-admin-setup/n32-time-english.js`
**Status:** ✅ confirmed

### 2026-10-16 11:40 — Time label wording per delivery method

**What happened:** The label now reads differently for each delivery method.
**Found / changed:** COD → `⏰ When did you want it?`. Pickup → `⏰ When are you coming?`.
Nothing chosen yet → `⏰ When?`.
**Note:** "When did you want it?" is what was asked for, word for word. The
grammatical form is "When *do* you want it?" — flagged, not changed, because this is
the customer-facing copy and the choice belongs to the owner.
**Status:** ⚠️ provisional — awaiting a decision on the wording

### 2026-10-16 11:45 — Typography replaced: Bangers and Fredoka One out

**What happened:** Researched fonts online, then replaced both display faces and
lifted the type floor across the whole app.
**Found / changed:**
- Research (5 searches): Bangers/Fredoka One are the wrong register for this; Plus
  Jakarta Sans is the current recommendation for friendly digital products; Nunito
  is recommended specifically for body legibility and for small sizes. Deliveroo's
  own system uses a display face for headlines only, with 16px body and CTA, 14px
  caption, 12px badge. Guidance for phone content: never below 14px, badges 12px.
- Measured with canvas before choosing sizes: Bangers cap height is 0.76em against
  Plus Jakarta Sans at 0.68em, so the same pixel size reads about 12% smaller; Bangers
  is also about 25% narrower (it is condensed, PJS is not). Fredoka One is 0.74em and
  *wider* than PJS. This measurement reversed the first guess — the display sizes
  needed to go slightly **up**, not down.
- Both faces → Plus Jakarta Sans 800 for all display type. Nunito kept for body.
  The families are now named once, as `--fd` and `--fb` (45 and 21 uses). CSS
  variables also keep quotes out of inline styles, which live inside single-quoted
  JS strings.
- Display sizes scaled ×1.08 (45 rules) to hold the existing hierarchy.
- Hero `clamp(40px,12vw,64px)` → `clamp(30px,10vw,52px)` and tracking `2px` →
  `-0.5px`. Without this PJS's extra width wraps the title to two lines on narrow
  desktops.
- Floor lifted, 128 declarations: 9/10px → 11px, 11px → 12px, 12px → 13px,
  13px → 14px.
- `.inp` and `.a-search` → 16px. Below 16px iOS zooms the whole page when a field is
  focused, which mid-order is the difference between ordering and giving up.
**Verified:** `Plus Jakarta Sans 800` reports `loaded` and is really painting (canvas
width 1168 versus 1308 for the sans-serif fallback). Zero references to Bangers,
Fredoka One or `cursive` remain. No clipped text in menu cards, hero, or any of the
19 admin order rows; row heights 46–49px.
**Artefacts:** `drinks-order.html`, `index.html`, `fb-admin-setup/n33-typography.js`
**Status:** ✅ confirmed

### 2026-10-16 11:46 — CORRECTION to the typography pass: escaped quotes hid 6 declarations

**What happened:** The first typography pass reported clean, but 6 declarations still
named the old faces.
**Found / changed:** Inside JS strings the family was written
`font-family:\'Bangers\',cursive` — escaped quotes — so the quoted search pattern
walked straight past it. Fixed in `n34-font-escaped.js`. `var(--fd)` needs no quoting,
so this particular miss cannot happen again. Separately, `n33-typography.js` aborted on
its first run because its helper demanded a unique match for what should have been a
global replace; it exited before writing anything, so no partial edit landed.
**Artefacts:** `fb-admin-setup/n34-font-escaped.js`, `drinks-order.html`
**Status:** ✅ confirmed

### 2026-10-16 11:52 — State file brought back in line

**What happened:** `DRINKS-ORDER.md` had drifted from the code in several places.
**Found / changed:** `sw.js` was listed as `v3-20261013`, actually `v6-20261016`. The
Pesanan tab still claimed "Beep + vibrate when new order arrives" — that path was
removed hours earlier; the note now says the seller hears nothing for a new order and
is alerted only for a payment claim. Customer Flow now records that the receipt box
lives under the QR at checkout, that nothing is pre-selected anywhere, and that a
staged receipt lives in memory only. Added the typography rule (Plus Jakarta Sans 800
/ Nunito via `--fd` and `--fb`, 11px floor, 16px inputs) and rewrote the language line
to say the current mix is deliberate rather than "reverted".
**Artefacts:** `DRINKS-ORDER.md`
**Status:** ✅ confirmed

### 2026-10-16 11:56 — A receipt you have not opened now glows

**What happened:** In the order list, a receipt that has never been opened shows a
glowing 📎 Resit pill until it is opened.
**Found / changed:** Reading state is per device, in `localStorage` under
`mms_seen_claims`, not in Firestore — it is not order data, and the rules would refuse
the write. `clamCls(id)` decides the class at render; `markClaimSeen(id)` is called from
`admViewClaim()` and strips `.unseen` from every element carrying `data-claim="<id>"`
so the glow dies the moment the receipt opens, without waiting for a re-render.
Reduced-motion keeps a steady glow rather than removing the signal.
**Verified:** pill on `9RFMYB` read `unseen: true`, `animation: clamGlow 1.9s`, live
box-shadow. Real click opened the claim view (image), the class came off, and
`localStorage` became `{"9RFMYB":1792123161401}`. Switch to the Resit tab, back to
Pesanan, re-render all 19 rows — still no glow, so it persisted. Clearing the store and
re-rendering brought the glow back.
**Note:** seen state is per device. A receipt checked on the phone will glow again on a
second screen that has never opened it. That is the honest reading of "have I looked at
this", but it is a decision worth knowing about.
**Artefacts:** `drinks-order.html`, `index.html`, `fb-admin-setup/n35-glow-and-paid.js`
**Status:** ✅ confirmed

### 2026-10-16 11:58 — The paid toggle leaves the order list

**What happened:** The "Bayar / Belum bayar" button was removed from every order row.
**Found / changed:** It still exists in the order detail panel (`#adm-detail .d-paid`),
which is where a payment decision belongs — `admTogglePaid` is unchanged. The row's
`.o-paid` styles and their phone overrides were dead afterwards and were deleted. The
`.o-paid` button used to hold the right edge with `margin-left:auto`; that moved to
`.o-del`, so the delete bin stays at the far right instead of landing one stray tap away
from the status pills.
**Verified:** `o-paid` occurrences in the file: 0. `d-paid` still present. 19 rows
render, delete button measured 31px from the container's right edge, every row reads
`#number name location 📎Resit RMx.xx [Baru Proses Siap] 🗑 ›`.
**Artefacts:** `drinks-order.html`, `index.html`
**Status:** ✅ confirmed

### 2026-10-16 12:01 — "resit perlu semak" now counts only unchecked receipts

**What happened:** After the glow landed, two signals on the same screen disagreed: the
warning counted every receipt that existed, so it would keep saying "1 resit perlu semak"
after the receipt had been opened.
**Found / changed:** Split the count. `nReceipt` (all receipts) still drives the 📎 Resit
filter pill, because that is a filter and should show everything. The new `nUnseen`
(unopened only) drives the amber "N resit perlu semak" warning.
**Verified:** with `9RFMYB` marked seen, `unseenPills: 0`, `warn: null`, and the filter
pill still reading `📎 Resit 1`. After clearing the store and re-rendering, the pill
glowed again and the warning returned as `📎 1 resit perlu semak`.
**Note:** this was not asked for. It was done because leaving both counters would have
contradicted the request that the UI show what has not been checked yet. Reverse it in
one line if the warning was meant to count receipts, not checkups.
**Artefacts:** `drinks-order.html`, `index.html`
**Status:** ⚠️ provisional — the user has not seen this change yet

### 2026-10-16 12:08 — The notification channel grilled; decisions taken, nothing built

**What happened:** Worked the notification question as a decision tree in two rounds
(seven questions), after loading the grilling skill, because "fix the notification" had
several readings that would lead to different work. Facts below were checked, not
assumed.

**Found / changed (facts):**
- **The live site already carries the current ntfy topic in its source.** Fetched
  `https://iyern0.github.io/ridzuanshop/` — 157,468 bytes, status 200, contains `ntfy`
  and the exact topic string. So the topic has been scrape-able since at least
  `8b8192f` (2026-10-15 17:17), which is the last pushed commit. The leak is live, not
  hypothetical.
- ntfy's own documentation: *"Because there is no sign-up, the topic is essentially a
  password, so pick something that's not easily guessable."* A password printed in a
  public page is not a password — but it also is not fixable without a server, because
  the poster is the customer's browser.
- ntfy supports `Click`, `Icon` (JPEG/PNG only), `Attach`, `Actions` (up to 3),
  `Markdown`. **`Attach` is a trap here** — it would upload the customer's receipt to
  ntfy.sh, a third party. Rejected without asking.
- `icons/icon-192.png` is live, `image/png`, 11,447 bytes, so the `Icon` header has a
  valid target.
- **A remembered admin session is already password-free.** `#admin-btn` (line 576) calls
  `enterAdmin()`, which only checks `adminUser()`. The deliberate comment at line 1882
  only stops the panel opening *by itself* on load. So `?admin=1` grants no authority the
  🔧 button does not already give, and no password prompt is being skipped that would
  otherwise have appeared.
- A claim fires exactly one notification from one place (`submitClaim`), and both UI
  routes converge there; after success the fallback block becomes the waiting state, so
  a second claim is not reachable through the UI.

**Decisions (the owner's):**
1. Delivery is fine — the job is making the notification better, not fixing delivery.
2. Payload gets trimmed: order number and delivery mode only. No name, no block/room, no
   amount, no items.
3. The tap gets a deep link that opens the login prompt and then that exact order.
4. The topic rotates now, with the phone subscribed to old and new at once so there is no
   silent window; the old one is removed from the app after the push.

**Left as residual risk, stated not hidden:** anyone holding the topic can still buzz the
phone with fake notifications. The trimmed payload means a fake cannot claim a customer,
an amount, or items, and can at worst open the dashboard on a random order id. Removing
that ability needs a server (Blaze plan) or self-hosted ntfy; trim + rotate was chosen
instead.

**Not yet started.** Every piece of this is local until a push, and the live site keeps
the old topic and the leaky title until then.

**Artefacts:** `WORKLOG.md`
**Status:** ⚠️ provisional — design agreed in conversation, no code written

### 2026-10-16 12:14 — The QR at checkout gets a download link

**What happened:** Under "Scan untuk bayar" in the QR section there is now a small pill that
downloads the DuitNow QR image, for a customer who wants the QR in their banking app.
**Found / changed:** `<a href="qr-duitnow.jpg" download="duitnow-qr.jpg">` — a same-origin
file plus the `download` attribute, so no JS is involved. It sits as a sibling directly
between the caption div and `#qr-claim-slot`. Amber (`#FFB347` text, 12% amber fill, 38%
amber border, pill radius) so it is obvious on the dark background without competing with
the solid teal "Saya dah bayar" button underneath, which is the action that actually
matters. 12px font — the badge/caption floor the typography pass settled on.
**Verified:** document order inside `#qr-section` reads QR image → "Scan untuk bayar" →
the new link → `#qr-claim-slot`. The link's rect sits below the caption and above the
claim panel. Box 121x31px; text 95px + 24px padding + 2px border fits with no overflow
(`scrollWidth === clientWidth === 119`). Target resolves 200 / image/jpeg / 90,881 bytes.
Arrow wrote as U+2B07 (raw bytes `e2 ac 87`) — checked at byte level because this file has
been lossy with emoji before.
**Note:** the QR block lives inside `#panel`, which is `position:fixed` and translated
`matrix(1,0,0,1,420,0)` — off to the right — so a plain viewport screenshot renders the top
of the page instead. Element screenshots by ref do work. Worth remembering next time a
screenshot "doesn't show the change".
**Artefacts:** `drinks-order.html`, `index.html`
**Status:** ✅ confirmed

---

## Withdrawn results

Nothing withdrawn yet. When something is, list it here with the reason and a pointer
to whatever replaced it, so a wrong number can never be picked up and re-used.
