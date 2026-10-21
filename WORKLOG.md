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

### 2026-10-16 12:21 — Two new requests grilled: custom time, and the stamp ask moved after payment

**What happened:** Two UI changes were asked for in quick succession, both under-specified,
so both were worked as decision trees — nine questions across three rounds — before any code
was written. Nothing is built yet.

**Found (facts, checked rather than assumed):**
- **The custom-time box already exists** (`#pickup-time`, placeholder "e.g. 11:00 PM"). It is
  only *hidden* for delivery orders. So the first request is "show it for delivery too", not
  "build an input", and the `#pickup-note`/`#time-pickup` display pair on line 1016 is what
  controls it.
- **The loyalty stamp counter is per-device localStorage** (`mms_loy`, via
  `getLoy`/`saveLoy`/`drawLoy`), incremented once per placed order at line 1120. It is not
  server-side, so "your progress" needs no lookup and cannot leak.
- **`orders` is create-only for the public and admin-only for update**, so a phone number
  collected *after* payment can never be attached to the order just placed. This constraint
  shaped the entire design of the second request.
- The label the owner quoted as "WHEN TO DELIVER?" **does not exist anywhere in the file**.
  The code says "⏰ When?" until a delivery method is chosen, then "When did you want it?"
  (COD) or "When are you coming?" (pickup).
- There is no existing popup to reuse for the stamp ask, but `autoAskNotify` already
  establishes the "asked once per device" pattern (`mms_notif_asked`), which the new prompt
  will mirror.

**Decisions (the owner's):**
1. The custom-time box shows for **both** modes — a COD customer currently has no way to name
   a time at all, which was the real gap.
2. The new prompt **replaces** the "Choose when you want it" hint rather than stacking on it.
3. The unset label becomes "⏰ When to deliver?".
4. The stamp popup appears on the **done screen, once per device**, flagged the instant they
   either give a number or tap "not interested".
5. The number goes to a new **admin-read-only `members/{phone}`** collection holding number,
   name and date. This needs a rules publish to work; until then the write is refused
   harmlessly and the number is still saved on the device, so the customer sees nothing break.
6. The popup only shows when **no receipt is outstanding** on the done screen, because that
   upload is the one thing on that screen the customer has to finish.
7. **A time is now required** — the `'(state a time)'` placeholder is retired, and the
   "⚠ Please choose a time" warning finally fires for pickup too.
8. Popup copy in **Malay**, matching the done screen and the stamp text it replaces.

**Note:** the progress the popup shows is and will remain the device's own count. A
server-readable stamp lookup is rejected because Firestore cannot scope a read to "your own"
row without a login, so any public lookup keyed by phone number could be enumerated to
discover who the customers are.

**Status:** ⚠️ provisional — awaiting the owner's go before building

### 2026-10-16 12:24 — Ninth decision: the number rides on the next order

**What happened:** While planning the implementation, reading the admin code showed a
consequence the earlier decisions had not accounted for.

**Found / changed:** `admCustomers` (line 1741) builds its list **from the phone stored on
each order** — it aggregates order count, spend and last-order date per number. Doing the
number collection after payment means orders stop carrying a phone, so that tab would have
gone dark for every new customer: numbers would still arrive once the rules publish, but with
no order history attached, because `members/{phone}` holds only number, name and date.

**Decision:** The number saved on the device by the popup is also carried silently onto that
customer's **next order**, exactly as the form does today. Their first order carries no
number, every order after it does, so the Customers tab keeps its totals. No rules change is
needed for this — `phone` is already an allowed optional field on an order. The popup's copy
will say plainly that the number is remembered for next time, so nothing is hidden from the
customer.

**Status:** ⚠️ provisional — awaiting the owner's go before building

### 2026-10-16 12:26 — Block chips under the order search, and a search that can actually be typed

**What happened:** Clicking the order-list search box now reveals a row of block chips, so the
list can be narrowed to one block without typing anything. Typing a name still works — which
it did not before.

**Found (a real bug, in the way of the request):** `admDoSearch` rebuilt the panel from
`pg.innerHTML` on every keystroke, which discards the input element and with it the caret.
Measured it directly: after one dispatched input event, `sameNode: false`, `stillFocused:
false`. The value survived (it is re-rendered from `_admSearch`) but the second key went to
the page body, so a name search was one character long per click.

**Changed:**
- `blockOf(o)` recovers a block from an order. **There is no block field on an order** — the
  block list is glued onto the room string at checkout (`selBlock` + `' '` + `roomIn`, line
  1045), so the configured names are matched as prefixes, longest winning, with a fallback to
  everything before the trailing room number for a free-typed block.
- `blockBarHtml(pool)` renders the chips. Counts come from a captured `blockPool` — the list
  *before* the text search is applied — so the numbers hold still while a name is typed,
  instead of collapsing toward zero. Ordering follows `BLOCKS` order, not the order the
  orders happen to arrive in. An active block is always offered back even at zero, or
  narrowing to a block whose orders had all finished would leave no chip to clear it with.
- Chips carry an **index** into `_blkNames`, never the block name, so a name with an
  apostrophe in it cannot break out of the handler attribute.
- Closing is a document-level `mousedown` (capture) that ignores clicks inside the search box
  or the chip row. Hiding on `blur` would have swallowed the tap that chose the block, since
  blur fires first. An active block holds the row open, because hiding it would leave the list
  narrowed with nothing on screen explaining why.
- `admDoSearch` now re-renders from `_admOrdersCache` instead of tearing down and rebuilding
  the Firestore listener on every keystroke.
- `admRefocusSearch(pg,had)` puts the caret back at both `pg.innerHTML` exits, with the
  focus state captured *before* the rebuild.
- The empty state distinguishes "no orders" from "nothing matches this filter".

**Verified (real clicks, live):** bar hidden before the click, `flex` after. Chips read
`Semua 19 · Intan 9 · Delima 2 · Kristal B 1 · Zamrud 2` against 19 rows. Derivation checked
per order: `Kristal B 11 -> Kristal B` (longest match, not `Kristal A`), `Zamrud 4-1/1 ->
Zamrud`, `Intan sdsd -> Intan`, `Delima 11 -> Delima`. Picking Zamrud gave 2 rows; picking
Intan gave 9. Typing `zul` with Intan active gave 2 rows and, critically,
`focusKept: true`, `valueAccumulated: true`, caret at end. Clicking outside with a block
active left the row open; clearing with Semua restored 19 rows and the next outside click hid
it.

**Note:** the chips only exist on the Siap and Semua views, because the search box itself only
exists there.

**Artefacts:** `drinks-order.html`, `index.html`, `fb-admin-setup/n36-block-chips.js`
**Status:** ✅ confirmed

### 2026-10-16 12:29 — The "(nyatakan masa)" order, and two rows leave the detail panel

**What happened:** The owner opened an order and found the time reading "(nyatakan masa)",
asked what it was, and asked for two more rows to be deleted from the order detail panel.

**Found — the placeholder is real data, in two orders:** The pickup path stored the literal
text as the order's `time` whenever the customer chose no slot and typed nothing:
`selTime = document.getElementById('pickup-time').value.trim() || '(nyatakan masa)'`. It was
later changed to English, `'(state a time)'`, but the two orders written before that keep the
Malay string. Counted from the live listener: `3B9UL8` (#001, 2026-10-16 03:32) and `8VATBJ`
(#011, 2026-10-15 09:34), both pickup, out of 22 orders. **The panel was not lying** — it was
printing the stored value faithfully; the value itself was never a time. This is exactly the
gap decision Q8 covers, and Q8 is still parked.

**Changed:**
- `noTime(t)` treats empty and the two known placeholders as "no time", and it is applied in
  the `Masa` row, which now reads "Tiada masa dinyatakan" in amber. The stored value is left
  alone — it is real order history, and the fix is to stop rendering it as a time, not to
  rewrite the document.
- `fmtTimeLabel` uses the same test, so the customer's own done screen stops displaying the
  placeholder too.
- The `Kod` row is gone from the detail panel.
- The `💰 Tanda sudah dibayar` button is gone from the detail panel, along with its `.d-paid`
  styles and `admTogglePaid`, which had no other caller and no other writer.

**Verified (real clicks, live):** opened `#001` and read the panel back — grid rows are now
`Masa: Tiada masa dinyatakan` (colour `rgb(255,179,71)`), `Bayar`, `Hantar`, `Nama`,
`WhatsApp`; `hasKodRow: false`; `hasPaidButton: false`; `typeof admTogglePaid === 'undefined'`.
Remaining buttons: ✕, Baru/Proses/Siap, 📤 WhatsApp pelanggan, 🗑 Padam.

**Consequence, stated plainly:** nothing in the code can set `paid` any more, so three things
that read it are now frozen — the amber "N belum bayar" warning on the order list, the
"Belum ditanda bayar" line in the Resit tab, and the customer's own "✓ Bayaran diterima" mark
on the done screen. The first will keep climbing and cannot be cleared from the UI. Raised
with the owner rather than deciding it here.

**Artefacts:** `drinks-order.html`, `index.html`, `fb-admin-setup/n37-detail-tidy.js`
**Status:** ⚠️ provisional — the three edits are confirmed; the fate of the `paid` flag is open

### 2026-10-16 12:31 — Opening a receipt settles the paid flag (decision Q11)

**What happened:** Removing the paid button left the `paid` flag with no writer, so three
things that read it were frozen. The owner chose: opening a receipt is the payment check, so
opening one settles the flag.
**Found / changed:** `admSettlePaid(id)` writes `{paid:true,paidAt}` to `orders/{id}` and
`tracking/{id}` — the same pair the deleted toggle wrote. Called from `admViewClaim`, right
after `markClaimSeen`, so the glow and the flag settle on the same gesture. Quiet on failure:
this is a side effect of opening something, and opening it must not fail because a background
write did.
**Verified server-side, not through the UI:** `orders/6B89AE.paid = true` and
`tracking/6B89AE.paid = true` read back over REST. The UI could not be trusted here, because
the function sets `o.paid` locally first so the count agrees without waiting for the round
trip — that optimistic flag would have hidden a failed write. The real receipt `9RFMYB` was
left `UNSEEN` throughout.
**Artefacts:** `drinks-order.html`, `index.html`, `fb-admin-setup/n38-settle-paid.js`
**Status:** ✅ confirmed

### 2026-10-16 12:33 — A time is now required, and nothing can store a placeholder again

**What happened:** The owner asked for the root cause of the `(nyatakan masa)` orders: the
customer must be prompted for a time, and no order goes through without one.
**Found / changed:** The pickup path was writing a sentence into the time field whenever a
customer chose no slot and typed nothing — `|| '(nyatakan masa)'`, later `|| '(state a time)'`.
That fallback is gone, so an empty box means no time was chosen rather than a time called
"(state a time)". The custom box is now a real answer for **both** delivery methods and is
never hidden, the unset label reads "⏰ When to deliver?", and the old "Choose when you want
it" hint gives way to the prompt from decision Q1/Q2 in amber: "Order for later? 👇" for COD,
"Coming later? 👇" for pickup. Two consistency fixes fell out of it: picking a slot clears a
typed time, and typing a time unlights the chosen slot, because a slot and a typed time are
two answers to one question. The gate exists in `#checkout` **and** in `sendWa`, the second
being the last thing before anything is written — a gate in one place and not the other is
exactly how an order got stored with a sentence for a time. The refusal calls
`highlight('pickup-time', …)`, which focuses the box as well as glowing it red, so being
refused puts the caret where the answer goes.
**Verified (real clicks, live):** T1, no time → confirm modal never opened, toast "⚠ Please
choose a time first", box outlined `rgba(255,107,107,0.4)`. T2, modal open with the time
blanked behind its back → the write path refused too (`_sending: false`, no done screen). T3,
time typed as `2:15AM` → order `6B89AE` created, stored `time = 2:15AM`. Then read back over
REST: the orders collection held **exactly one** new document, so neither refusal wrote
anything. Counter went 1 → 2 as expected.
**Artefacts:** `drinks-order.html`, `index.html`, `fb-admin-setup/n39-time-required.js`
**Status:** ✅ confirmed

### 2026-10-16 12:35 — The item list stopped being a wall of text

**What happened:** The owner asked for the `Minuman` block in the order detail panel to be
legible at a glance: "not in simple 1 liner like this".
**Found / changed:** It was rendering `1× Extrajoss Mangga Normal (100%), No Sugar/Condensed
Milk, Kaw` — the add-ons joined into a comma run. Now one card per drink: a teal quantity
badge, the drink name at 16px Plus Jakarta 800 with its emoji, **each add-on its own pill
chip**, and the line's own price. That last one earns its place: the order that prompted the
complaint totals RM3.00 from a RM2.50 drink, and nothing on screen explained the missing 50
sen until the line price showed it. `drinkEmoji()` is new and the checkout's inline
emoji chain now calls it, so the panel and the customer's receipt agree. Also confirmed the
paid button stays gone from the panel.
**Verified (real clicks, live):** grid columns measured `34px 278px 56px`, radius 12px,
padding 11px 13px; badge `1×` on `rgba(0,212,170,0.12)`; name `Plus Jakarta Sans 800 16px`;
three chips all `border-radius: 999px` reading `Normal (100%)`, `No Sugar/Condensed Milk`,
`Kaw`; line price `RM3.00`.
**Note:** the customer's own done screen still joins add-ons with commas (line 1260), and the
WhatsApp text still does (lines 1144, 1390). Left alone — the complaint was about the seller's
panel, and the customer is looking at drinks they chose themselves.
**Artefacts:** `drinks-order.html`, `index.html`, `fb-admin-setup/n40-item-cards.js`
**Status:** ✅ confirmed

### 2026-10-16 12:36 — Test data removed

**What happened:** The time-enforcement test left one order, one tracking row and one receipt
in the live project.
**Changed:** Deleted `orders/6B89AE`, `tracking/6B89AE`, `payments/6B89AE`, and reset
`counters/2026-10-16` from 2 back to **1** (today's one real order is `3B9UL8` / #001). Read
back: 22 orders, 2 receipts (both real), counter `n=1`. Browser-side test keys `mms_last`,
`mms_cart`, `mms_seen_claims` and `mms_cust` (which held the literal name "TESTTIME") were
cleared. `mms_loy` on this browser still carries one extra stamp from the test order — cosmetic,
device-local, and left rather than guessed at.
**Artefacts:** `fb-admin-setup/cleanup-test.js`, `fb-admin-setup/claim-test.js`
**Status:** ✅ confirmed

### 2026-10-16 12:48 — The stamp prompt moves to after the order (B)

**What happened:** Built the approved design: the WhatsApp number leaves the order form and is
asked for on the done screen, with the promotion explained properly.
**Found / changed:** `saveCustomer` used to write `ph` from the form field; it now carries
`prev.ph` forward, and `sendWa` reads the number from `mms_cust` instead. That is decision Q10:
the prompt saves the number on the device and the *next* order sends it, which is what keeps
`admCustomers`' per-number order counts, spend and last-order date working now that the form no
longer asks. The prompt appears once per device (`mms_stamp_ask` in localStorage), gated on a
single shared definition of "a receipt is outstanding" — `claimPending(o)`, now also used by
`paintClaim`, so the two cannot disagree. The number goes to `members/{digits}` = phone + name +
date, and the rules block for it is written into `firestore.rules` and **not deployed**.
**Verified (real orders, live):** the field is gone (`#inp-phone` absent). A real cash order
(`C6X3AL`) produced the prompt reading "⭐⭐ 2 minuman setakat ini · 3 lagi untuk minuman
percuma" with Simpan / Tak berminat. `123` was refused with "⚠ Nombor tidak sah" and the prompt
stayed open; a real number saved, closed it, set the flag, and wrote `mms_cust.ph`, with
**no error surfaced** — which matters, because the `members` write IS being refused by the
undeployed rules. All three gates held: a QR order with no receipt attached → no prompt; the
same order with the receipt attached → prompt; "Tak berminat" → flag set and a second call does
nothing. Then the decisive one, read back over REST: order two (`LQLLYV`) carried
`phone = 0123456789`, so the number collected after order one rode on order two. `members` is
0 docs, confirming the refusal is real and harmless.
**Artefacts:** `drinks-order.html`, `index.html`, `firestore.rules`,
`fb-admin-setup/n41-stamp-prompt.js`, `n42-members-rules.js`
**Status:** ✅ confirmed — the `members` half stays inert until the rules are published

### 2026-10-16 12:50 — The notification is thin, and its tap lands on the order (C)

**What happened:** Built the approved rebuild: trim what the alert carries, and make it point
at the thing it is about.
**Found / changed:** The title drops the room entirely — it is now `💰 #003 — COD, bayaran
perlu semak` or `🏪 Ambil sendiri`, derived from whether the order has a room, which is the same
convention the rules enforce. No name, no block, no room, no amount, no items. `Click` carries
`?admin=1&order=<id>` and `Icon` points at the live `icons/icon-192.png`, verified reachable
earlier. The topic rotated; the new value is in the source and is deliberately **not** copied
into this log, so a credential lives in one place rather than two.
**Verified without buzzing the phone:** `window.fetch` was intercepted for the duration of two
`notifyOwnerClaim` calls, so the requests were captured and never sent. Titles came back
`💰 #003 — COD, bayaran perlu semak` and `💰 #004 — Ambil sendiri, bayaran perlu semak`; body
`Pelanggan dah tekan "Saya dah bayar". Tekan untuk buka resit.`; `Priority: urgent`;
`Tags: money_with_wings`; `Click` and `Icon` both correct; URL the new topic. The deep link was
then driven for real: with no session it tidied the address bar, kept `_pendingAdminOrder`, and
raised the login prompt; signing in opened the dashboard **and** order `#012 aiyo`'s detail.
**CORRECTION — my first version of this was wrong.** `admOpenPending` retried on a 250 ms timer
waiting for the orders to arrive, and it raced the login: the id was consumed, the cache filled
a moment later, and the detail never opened. Replaced with `admFulfilPending`, called from the
end of `_admRenderOrders` — the render is the moment the orders are actually in hand, so there
is nothing to race. With a guard so an unreachable id (a deleted order) stops instead of
looping. Re-verified after the change: the same deep link now lands on the detail.
**Note:** with a session already live, the deep link enters the dashboard without asking for the
password. That is exactly what the 🔧 button already does and grants nothing it does not — but
it is a deliberate departure from "a remembered session must never open the dashboard by
itself", so it is written down here rather than left implicit.
**Artefacts:** `drinks-order.html`, `index.html`, `fb-admin-setup/n43-ntfy-rebuild.js`,
`n44-pending-render.js`
**Status:** ✅ confirmed

### 2026-10-16 12:53 — Test orders removed, and a note about 9RFMYB

**What happened:** The B verification left two orders behind.
**Changed:** Deleted `orders/`, `tracking/` and `payments/` for `C6X3AL` and `LQLLYV`, and reset
`counters/2026-10-16` from 3 back to **1**. Read back: 22 orders, 2 receipts (`9RFMYB`,
`L7YXU7`), `members` 0, counter `n=1`. Browser test keys cleared, and `mms_loy` set back to 0
because its only movement on this browser came from my test orders.
**A thing worth flagging rather than glossing:** `9RFMYB` is marked `paid: true` with
`paidAt = 2026-10-16T03:24:39Z` — 11:24 local, which is **before** the manual button was removed
(12:29) and before `admSettlePaid` existed (12:31). So it was set through the old button, either
by the owner or during a pre-checkpoint test session; the record does not say which, and this
entry will not invent one. This session's testing did not touch it: `9RFMYB` stayed `UNSEEN`
through every check, and opening an order's *detail* does not settle payment — only opening its
receipt does.
**Artefacts:** `fb-admin-setup/cleanup-bc.js`, `check-members.js`, `check-9rfmyb.js`
**Status:** ⚠️ provisional — the paidAt origin is not recoverable from the records

### 2026-10-16 12:56 — PUSHED to GitHub Pages, and the live build verified

**What happened:** The owner asked for the push. Nine commits went out and GitHub Pages went
live with the new build in **under a minute**.
**Before pushing (checked, not assumed):** `origin` is `https://Iyern0@github.com/Iyern0/ridzuanshop.git`,
so the right repo; there is **no `.github/workflows`**, so nothing auto-deploys — which means
`firestore.rules` pushes as source and the LIVE rules are untouched; `index.html` hashes equal to
`drinks-order.html`; and the only files in the diff are the six intended ones, so the owner's
unrelated work (`transit-widget/DESIGN.md` and the untracked files) stayed out.
**Release prep:** `sw.js` cache bumped `v6-20261016` → `v7-20261016`, because the shell
precaches `index.html` and `drinks-order.html` and the file's own comment says to bump on
release. `DRINKS-ORDER.md` updated for the required time, the block chips, the stamp prompt and
its `members` record, the trimmed alert, and payment settling itself.
**Push:** `8b8192f..d12dd4c  main -> main`. Fetching the live site: attempt 1 was still the old
build (157,468 bytes, old topic present); attempt 2, ~30 s later, was the new one
(186,440 bytes, new topic present, old topic gone).
**Verified live:** 17 of 17 marker checks pass — both time gates, "When to deliver?", "Order for
later?", the block chips and the search-focus fix, the stamp prompt, the `members` write,
`admSettlePaid`, the item cards and line price, `drinkEmoji`, `noTime`, the deep-link handler,
the alert carrying no room, the `Icon` and `Click` headers, the old topic absent, the QR download
pill, and the phone field gone. Live `sw.js` reads `v7-20261016`.
**Consequence the owner needs to act on, now:** the live site posts claim alerts to the **new**
topic, and the old topic receives nothing any more. Until the new topic is subscribed on the
phone, a payment claim is silent. The old topic subscription should stay until the phone has the
new one, then be removed.
**Still inert by design:** the `members` write is refused because the rules are not published.
Harmless — the number is still kept on the customer's device and still rides their next order, so
the Customers tab keeps working. Publishing the rules needs no further site push.
**Artefacts:** `drinks-order.html`, `index.html`, `sw.js`, `DRINKS-ORDER.md`, `WORKLOG.md`
**Status:** ✅ confirmed — live URL `https://iyern0.github.io/ridzuanshop/`

### 2026-10-16 15:06 — The prompt returns each order, one receipt ask, a calmer price

**Gap in this log:** nothing was recorded between 12:56 and 15:06 because the session sat idle
for about two hours. Two orders arrived in that window — `HUW5BA` at 13:05 and `WV39VJ` at
15:01 — and both are the **owner's own test orders on the live site**, not mine. Recorded rather
than reconstructed. I briefly read `WV39VJ`'s timestamp as being two hours in the future before
checking: the machine's clock and Google's `Date` header agree exactly (07:06 UTC), so the clock
was never wrong and the gap was real.

**1. The stamp prompt now asks on every order, until a number is given.**
Giving a number sets `mms_stamp_ask='1'` and is the end of it — the stamps simply accumulate.
Declining writes the *order code* to `mms_stamp_skip`, so the same order never asks twice but the
**next** order does, because being asked is the only way to earn a stamp. Previously one
"Tak berminat" lost the promotion permanently, which is what the owner spotted.
**Verified by driving `maybeAskStamp`, the app's own function:** order A → prompt shown;
decline → `mms_stamp_skip='AAA111'` and the accepted flag left null; same order again → nothing;
a different order → **prompt shown**; save a number → accepted flag set; a further order →
nothing. And a QR order with a receipt still outstanding → nothing, so that gate survives.

**2. The receipt is asked for once.** It was asked twice — under the QR at checkout and again on
the done screen — so the customer was told to attach a proof before they had even placed the
order. Removed: the `#qr-claim-slot` div, the IIFE that injected a second block into it,
`stagedProof` and its comment, the `atCheckout` branch in `sendClaim`, and the claim that fired
from `sendWa`. The order now always goes up with `_claim:false` and the done screen is the single
ask. **This reverses an earlier explicit decision** to put the block under the QR; the alert
behaviour is unchanged, still exactly one per claim.
**Verified:** `#claim-panel` count in the whole DOM is **1**; the QR section contains only the QR
box, the caption and the download link (`qrAsksForReceipt: false`); the done-screen block renders
visible with its "Saya dah bayar" button, and an empty tap is still refused with
"📎 Pilih resit dahulu" without closing the panel.

**3. The menu card price is calmer.** `.card .p` went 26px → 19px. At 26px it was shouting over
the drink name at 15px. Verified by probing the computed style of a throwaway `.card`.

**Also:** `sw.js` cache bumped `v7-20261016` → `v8-20261016`.

**No stray writes:** the synthetic checks created no documents — `orders/DDD444` and
`tracking/DDD444` are both absent, read back over REST. `members` is still 0 (rules unpublished),
receipts still 2.

**Live evidence the pushed build works, from the owner's own test orders:** `HUW5BA` carried
`phone=0108280063`, a number the order form never asked for, so the prompt's next-order carry
works in production; `WV39VJ` carried `time=11:30PM`, a real time, so the required-time gate
works live. No order today carries a placeholder.

**State:** committed locally. **Not pushed** — awaiting the owner's go.

**Artefacts:** `drinks-order.html`, `index.html`, `sw.js`, `fb-admin-setup/n46-three-fixes.js`
**Status:** ✅ confirmed locally · ⚠️ live site still carries the double receipt ask

### 2026-10-16 15:15 — The receipt returns to checkout, and a returning customer is recognised

**What happened:** The owner clarified the receipt placement — it should be asked for while the
order is being filled in, not afterwards — and asked for three things around a customer who has
ordered before.

**This change REVERSES the one made at 15:06**, which had moved the ask to the done screen. That
entry stands as written; this is the correction. The resulting flow, stated once so the next
reader is not left guessing: **the customer attaches the proof under the QR at checkout, it rides
up with the order, and placing the order is the moment the seller is told. Nothing asks
afterwards.**

**Restored, verbatim from the version verified earlier today:** the `#qr-claim-slot` div, the IIFE
that injects the block into it, `stagedProof` and its comment, `claimPicked`'s staging line,
`sendWa`'s `proof`/`submitClaim` pair, the checkout cleanup after an order, and `sendClaim`'s
`atCheckout` branch.
**Removed:** the done screen's `claimBlockHtml('')` and `paintClaim`'s panel line. The
"⏳ Menunggu penjual semak" waiting state (`#claim-state`) stays — it is information, not an ask.

**A returning customer is now recognised.** When a name is remembered the `#name-section` field is
hidden (the value stays in the hidden input, so the order still carries it), and the note reads
`✓ ZULKIFLI · Intan 1-1` instead of the generic line. `clearCustomer` ("Bukan anda?") brings the
field back. Choice of COD now confirms it out loud:
`📌 Disimpan sebagai ZULKIFLI · Intan 1-1`.

**Verified end to end, for real:**
- Seeded a returning customer before boot: name field `display:none`, hidden input still
  `ZULKIFLI`, note reading `✓ ZULKIFLI · Intan 1-1`, block `Intan` restored and its button
  active, room `1-1` restored.
- Choosing COD → toast `📌 Disimpan sebagai ZULKIFLI · Intan 1-1`, block section revealed.
- Checkout: `#qr-claim-slot` present, QR section children are the image, the caption, the download
  link and the slot; `#qr-claim-panel` present and visible with its "Saya dah bayar" button.
- Done screen: `#done #claim-panel` count is **0**, and `#claim-state` shows for a claim.
- **The full flow:** a synthetic 3 KB PDF staged through the real branch (`stagedProof` 4028 chars
  of `data:application/pdf;base64,`, toast "✓ Resit sedia - tekan Hantar Pesanan", and **no
  notification at staging**), then the order placed — exactly **one** notification,
  `💰 #005 — COD, bayaran perlu semak`, on the new topic. The order carried `_claim:true` and the
  done screen showed the waiting state.

**Found while cleaning up:** today's live orders are `#1 3B9UL8` (03:32), `#2 HUW5BA` (13:05),
`#3 WV39VJ` (15:01), `#4 HL89NR` (15:13) and my test `#5 MX37A2` (15:14). **`HL89NR` is the
owner's own order and carries a receipt** — they tested the flow on the live site and it worked.
Deleted only `MX37A2` (`orders`/`tracking`/`payments`) and set `counters/2026-10-16` to **4**, the
highest surviving order number. Receipts now: `9RFMYB`, `HL89NR`, `L7YXU7`.

**State:** committed locally. **Not pushed** — the live site still has the double ask (its build
predates both this change and the one it reverses).

**Artefacts:** `drinks-order.html`, `index.html`, `fb-admin-setup/n47-checkout-receipt-back.js`,
`cleanup-mx37a2.js`
**Status:** ✅ confirmed locally

### 2026-10-16 15:17 — PUSHED: the checkout receipt and the returning customer are live

**What happened:** The owner asked for the push. Three commits went out and Pages served the new
build inside 90 seconds.
**Push:** `d12dd4c..4ebaeef  main -> main`. Live site flipped on attempt 3 of the poll
(186,440 → 187,784 bytes). Live `sw.js` reads `v8-20261016`.
**Verified live — 15 of 15 markers:** the receipt block is at checkout again and the done screen
no longer asks; the staged proof and the claim-on-dispatch are back; `sendClaim`'s checkout branch
is back; the menu price is 19px; the prompt returns per order (`mms_stamp_skip`, `stampSkipped`)
and accepting is permanent (`stampAccepted`); the name field can be hidden and the note names the
customer; "Disimpan sebagai" is present; the time is still required; the block chips survive; the
new ntfy topic is in and the old one is gone.
**Pre-push checks:** only the four intended files in the diff, `index.html` hash-equal to
`drinks-order.html`, and the untracked files (`transit-widget/DESIGN.md`, `.agents/`, `.claude/`,
`CLAUDE.md` and others) left untouched, so the owner's other work did not ride along.
**For the customer to see any of it:** the service worker cache name changed, so an already-open
tab keeps running the old JavaScript until it is reloaded. Nothing to do for anyone arriving
fresh.
**Still open after this push:**
- The `members` rules are still unpublished, so stamp numbers are saved on the customer's device
  and ride their next order, but no member records reach the seller.
- The receipt's "(wajib)" label is still not enforced. It matters more now that there is no
  done-screen fallback: a QR customer who skips the receipt at checkout has no way to attach one
  afterwards, so that order arrives unpaid and unproofed with no alert.
- The Firebase Auth password for `zjasneh5@gmail.com` is unchanged.

**Artefacts:** `drinks-order.html`, `index.html`, `sw.js`, `WORKLOG.md`
**Status:** ✅ confirmed — live URL `https://iyern0.github.io/ridzuanshop/`

### 2026-10-16 15:23 — CORRECTION: every seller alert had been failing silently since 12:56

**What the owner reported:** "i didnt receive a notification when i make an order."

**What was actually wrong — and it was mine.** The alert's `Title` contained a `💰` emoji. A
header value must be ISO-8859-1, and an emoji is not, so constructing the request **throws**:

```
new Headers({'Title':'💰 #003 — COD, bayaran perlu semak'})
  -> TypeError: Failed to construct 'Headers': String contains non ISO-8859-1 code point.
```

`notifyOwnerClaim` wraps everything in `try{...}catch(e){}`, so that throw was swallowed: nothing
in the console, nothing on the topic, no evidence anywhere. **Every payment alert since the ntfy
rebuild at 12:56 was dropped**, including the claim for the owner's own order `HL89NR` at 15:13.
The old payload never had this problem because its title was pure ASCII
(`Bayaran? Pesanan #003 - Blok Delima 5-4/2`).

**How it was found, in order, because the order matters:** the owner reported no notification;
`HL89NR` had a receipt, so an alert was expected. Polling ntfy's own cache showed the **new topic
had never received a single message** while the old one still held four from before the rebuild —
so the message was never *posted*, which ruled out the phone, the subscription and the topics
themselves. The live build was then checked and was fully intact: CSP allows `ntfy.sh`, the topic
string is right, `submitClaim` still calls `notifyOwnerClaim`. CORS was suspected next and ruled
out by preflight (`access-control-allow-headers: *`). Only then was the header value itself
tested — and it threw.

**Fixed:** `asciiHeader()` strips anything outside printable ASCII, the title is written ASCII in
the first place (`#003 COD - bayaran perlu semak`), and the visual comes from `Tags`
(`money_with_wings` renders as a money emoji on the phone, and is ASCII by definition). Header
values are ASCII; the body stays UTF-8, since only headers are restricted. **The catches now
`console.warn` instead of swallowing** — that silence is the part that made this invisible.

**Verified for real, not intercepted:** `notifyOwnerClaim({no:999,…})` from the browser built
`#999 COD - bayaran perlu semak`, constructed the headers without throwing, and the fetch did not
reject. Polling the topic afterwards showed the message arrived:
`2026-10-16T07:22:51Z  "#999 COD - bayaran perlu semak"`. **The new topic now has its first
message, and it is the first proof that the browser's send path works at all.**

**Why the earlier verification missed it — worth remembering.** At 12:50 the payload was checked
by intercepting `window.fetch` and inspecting the captured headers. Interception **bypasses the
Headers construction**, so the exact thing that was failing was the one thing that check could
not see. A captured request is not a sent request. The lesson: when the claim is "this reaches
the phone", the evidence has to come from the far end — poll the topic, or watch the phone —
never from a stub that stands in for the network.

**Artefacts:** `drinks-order.html`, `index.html`, `sw.js`, `fb-admin-setup/n48-notification-ascii.js`,
`poll-ntfy.js`, `check-cors.js`
**Status:** ✅ confirmed — send proven end to end; the phone side depends on the owner being
subscribed to the new topic

### 2026-10-16 15:25 — The fix proven on the deployed build, not just locally

**What happened:** The corrected alert code was pushed (`4ebaeef..62ad3ac`), Pages flipped on
attempt 3 (187,784 → 188,868 bytes), and the live build was checked: 8 of 8 markers pass —
`asciiHeader` present, the title built ASCII, no emoji left in any header, the catches warning,
and the receipt-at-checkout, claim-on-dispatch, returning-customer and 19px price behaviour all
still intact. Live `sw.js` reads `v9-20261016`.
**Then the send itself was proven from the far end, on the live origin.** A tab was navigated to
`https://iyern0.github.io/ridzuanshop/`, and `notifyOwnerClaim({no:998})` was called there — so
the real CSP, the real origin and the real deployed file were in play, not a local copy. The
fetch did not reject, and polling the topic showed it arrived:
`2026-10-16T07:24:57Z  "#998 COD - bayaran perlu semak"`. The new topic now holds two messages,
both test sends, and between them they prove the browser's send path end to end.
**Deliberately done this way** because the earlier verification for this same feature used an
intercepted `fetch`, which bypasses header construction and therefore could not see the failure
it was supposed to catch. Checking from the receiving end is the only thing that would have
caught it, so that is what this one does.
**Still open:** whether the owner's phone is subscribed to the new topic. The topic having the
message proves the sending side; a test labelled `#999` and `#998` should have buzzed, and if
neither did, the subscription is the remaining step. The `members` rules are also still
unpublished.

**Artefacts:** `drinks-order.html`, `index.html`, `sw.js`, `WORKLOG.md`, `fb-admin-setup/poll-ntfy.js`
**Status:** ✅ confirmed on the live deployment

### 2026-10-16 15:38 — The idle lock locks the screen, not the account

**What happened:** The owner asked that tapping a notification open the order directly, without
filling anything in. Checking first showed the deep link already does exactly that when a session
is live — the thing in the way was the 15-minute idle lock calling `signOut()`, which destroyed
the session, so the link had nothing to use.
**The constraint, stated rather than worked around:** admin rights cannot be carried in the
notification link. The alert sits on an ntfy topic whose name is in the page's public source, so
any key in that link is a published key. That path needs a private channel first (self-hosted
ntfy or a relay) — the option already declined as costing money or a server.
**Decisions (the owner's):** the lock keeps the session; and the notification opens in the
**installed app**, which is the best case — one storage area, so one login covers the link.
**Changed:** `lockAdmin` no longer signs out; it closes the dashboard and says so. Signing out
stays deliberate and lives in Settings (`admSignOutNow`) — exactly one `signOut()` remains in the
file. The hero title tap now reopens the dashboard without a password when a session exists,
instead of always raising the login form.
**Verified by driving it:** signed in, then `lockAdmin()` — panel hidden, `admin` false, but
`adminUser()` still `zjasneh5@gmail.com`, so the session survived and the Admin button stayed.
Five taps on the title reopened the dashboard with the login modal at `display:none`.
**A testing lesson worth keeping:** the first run of that check looked like a failure and was not.
The tab had been left on the **live site** from the earlier send test, so it was running the
deployed build (which correctly still signs out, that fix not being pushed yet). A
`location.href` navigation had silently not taken; `browser.navigate` did. Check `location.origin`
before believing a local verification.
**Artefacts:** `drinks-order.html`, `index.html`, `sw.js`, `fb-admin-setup/n49-lock-not-logout.js`
**Status:** ✅ confirmed locally

### 2026-10-16 15:47 — The alert becomes a docket, with nobody's identity in it

**What happened:** The owner asked for an alert that reads like a real business receiving an
order, rather than "bayaran perlu semak" alone.
**Decision (the owner's):** order facts only — which order, how it arrives, how many drinks, the
total. No name, no block, no room. Still fired **only** on a payment claim, not on the order.
**Built:** the title is now `Pesanan #007 - COD - RM8.50` and the body
`Bayaran perlu semak - 3 minuman. Pelanggan dah tekan "Saya dah bayar". Tekan untuk buka resit.`
`submitClaim` gained an `info` argument, and both call sites pass the count and the total.
**Verified:** the payload built by the real function is all-ASCII (so the emoji failure cannot
recur) and, although a room was passed in deliberately, it appears nowhere in either field.
Fetch did not reject, and the topic was polled to confirm it actually arrived — checking the
receiving end rather than an intercepted request, which is what missed the last bug.
**Why it is not richer than this:** the alert travels on an ntfy topic named in the page's public
source. A customer's name and address in it would be readable by anyone who views source, and
sendable as fakes. The private-channel version that would make a full docket safe needs a server
(self-hosted ntfy or a Cloud Function on Blaze), which the owner declined on cost.

**Artefacts:** `drinks-order.html`, `index.html`, `sw.js`, `fb-admin-setup/n50-alert-docket.js`
**Status:** ✅ confirmed

### 2026-10-16 15:52 — On a phone the sidebar and the filter bar fold away

**What happened:** The owner reported that on mobile the order list is too small to read, and
asked for the filter bar and the sidebar to show only when tapped again.
**Found:** the admin had **no mobile rules at all**. `.adm-side` is a 220px flex child of the
panel, so on a ~380px phone it left roughly 160px for the orders, and `.a-bar` cost another two
rows on top.
**Changed:** below 760px the sidebar comes out of the flow entirely (`position:fixed`,
`translateX(-100%)`) and becomes a drawer with a backdrop — `flex-shrink:0` alone would not have
helped, since the point is to stop it reserving width. A ☰ button in the header opens it, the
header title (`📥 Pesanan`, now with a ▾) toggles the filter bar, and `_barFold` starts null so
the default follows the screen width rather than being decided once at load and then wrong after
a rotation. `admApplyFold()` is re-applied at the end of every orders render, because `.a-bar` is
rebuilt from innerHTML each time.
**Verified:** at 1120px the burger is `display:none`, the sidebar still `position:static`, and
`admFolded()` is false, so the desktop layout is untouched; the drawer opens and closes and the
backdrop stays hidden above the breakpoint. The narrow layout itself could **not** be verified
here — no viewport emulation is available — so that needs the owner's phone or a narrowed window.
**Artefacts:** `drinks-order.html`, `index.html`, `fb-admin-setup/n51-mobile-admin.js`
**Status:** ⚠️ provisional — desktop unaffected and the toggles work; the phone layout is unverified

### 2026-10-16 16:00 — Four mobile changes logged, and a CORRECTION on the rules

**Catching up four entries that were shipped without being written up.** All four are pushed and
live; this is the record, not new work.

1. **The drawer had no way out (`7cb9318`, v14).** `admCloseSide` was defined in the same edit
   that created the drawer and never called, so picking a tab switched the section *behind* an
   open drawer with no working exit. It now closes on a tab, on an ✕ added to the drawer's
   header, on the backdrop, and on Escape. The drawer is also `min(252px,80vw)` so it reads as a
   drawer rather than the whole screen.
2. **The nav was ragged (`dfea1a6`, v15).** The icons are variable-width emoji, so every label
   started at a different x. They now share a 22px centred column: measured all 9 labels at
   exactly `x = 41`, where before no two matched.
3. **A legacy rule made the nav a wrapping grid (`0af6f50`, v16).** Line 327 —
   `.adm-side nav{display:flex;overflow-x:auto;…}` — is a leftover from a mobile design that no
   longer exists. Inside the drawer it wrapped items two or three to a row, with Analitis and
   Menu & Tetapan in oversized boxes. An unconditional column rule at the end of the stylesheet
   beats it wherever it lives. Measured after: one distinct x, `flex-direction:column`, y
   increasing evenly.
4. **Bigger rows (`625b9db`, v17).** 58px targets, 16px labels, a 28px icon column, and the
   toggle and subnav brought up to match. The whole nav is 609px inside an 827px drawer, so it
   fits with nothing to scroll.

**CORRECTION — the `members` rules were never unpublished.** Several entries in this log say the
`members` rules are "still unpublished" and that member records cannot reach the seller yet:
the push entry at 15:17, the alert-docket entry at 15:47, the drawer entries above, and my answers
to the owner each time I listed what was outstanding. **That was wrong.** Reading the deployed
ruleset over the Firestore Rules API shows `match /members/{phone}` present in the live release
`cloud.firestore` (ruleset `e82e4d00-2d6d-4030-8093-802d601003dd`), and a block-by-block
comparison of the repository file against the live source shows **nothing to add and nothing that
would be lost** — so there was also no reason to deploy. The owner had already published them.

**And the write path was proven while checking:** a test save through the stamp prompt created
`members/0188888888` with `phone`, `name` and `at`, read back over REST, then deleted;
`members` is back to 0 docs.
**A real gap found by that test, worth keeping:** the first attempt was **silently refused**
because the rules require a name of 2+ characters and `mms_cust` had been cleared, leaving it
empty. In the real flow the name is always there — `saveCustomer()` runs when an order is
accepted — so this only bites a device whose memory was wiped. The customer is still told
"✓ Nombor disimpan" in that case, which is a small lie. Left alone for now; noted rather than
guessed at.

**Artefacts:** `WORKLOG.md`, `fb-admin-setup/rules-preflight.js`, `check-members-write.js`
**Status:** ✅ confirmed — and the "rules unpublished" line in earlier entries is withdrawn

---

### 2026-10-19 18:55 — Bug pass, found by reading rather than by report

**What happened:** No bug report came in. The app was read end to end and checked three ways:
the inline script syntax-checked with `node --check`, every `getElementById` reference
cross-checked against the markup's `id`s, and the static document parsed for tag balance.
Nine defects were found and fixed. Nothing the customer sees in the normal order path changed
behaviour except where a defect was in that path.

**Found / changed:**
1. `admViewClaim()` — a missing `+` before `'</div>'`. ASI made it legal, so it never threw;
   it silently dropped the receipt viewer's closing tag and left `.cv-box` to be closed by the
   parser. **The one real markup bug in the file.**
2. The orders `onSnapshot` rendered into `#adm-pg` regardless of which tab owned that node, so
   any order update repainted the orders list over the Resit, Pelanggan or Analitis screen.
   Fixed on both ends: the listener is dropped when leaving those tabs, and the callback now
   updates `_admOrdersCache` and returns without touching the DOM unless it owns the tab.
3. `drawStatus()` set a new 30-second timer on every call without clearing the old one. Each
   call left another permanent polling loop behind.
4. `admDelBlock()` read `BLOCKS[i]` **after** splicing, so it cleaned the wrong name out of
   `disBlocks` — the deleted block stayed disabled, and its successor was silently disabled.
5. `admDelDI()` allowed deleting the last delivery method, which leaves no way to choose one and
   blocks checkout for every customer. Now refuses, matching the block guard.
6. The menu editor called `admEditMI(i)` / `admDelMI(i)` / `admMoveMI(i,±1)` with the item index
   only, and all three hard-coded `MENU[0]`. With a second category present, editing an item in
   it edited the same index in the first. The category index is passed through now.
7. `drawBlocks()` put the block name into an `onclick` attribute unescaped — a block named
   `O'Brien` broke the handler. It passes the index now, the same fix `blockBarHtml` already used.
8. Disabled reorder arrows emitted a second `style` attribute (`disabled style="opacity:0.3"`),
   which browsers discard; the arrows never dimmed.
9. `highlight()` dereferenced a possibly-missing element; `#adm-search` was matched but the
   input's class is `.a-search`; `item.name` was interpolated unescaped in the cart and the
   checkout summary, against the escaping rule the file states for itself; `v.price.toFixed()`
   assumed a number; and two stray `</div>` sat at the end of the body.

Also declared `_admOrdersCache`, which had been written as an implicit global — harmless only
while the script stays sloppy-mode.

**Not changed, deliberately:** `syncTimeButton()` and the `inp-custom-block` / `inp-phone`
lookups point at elements that no longer exist. Every one is guarded, so they are dead code, not
defects. Removing them is a separate job from fixing what is broken.
`#settings/admin` is still listed as "delete this document" — not touched, it needs the console.

**Artefacts:** `drinks-order.html`, `index.html`, `sw.js` (cache `v19` → `v20-20261019`)
**Status:** ⚠️ syntax, markup balance and reference checks pass; **not yet exercised in a
browser** — the fixes need one pass on the live order flow and the admin dashboard before this
entry is marked confirmed.

---

### 2026-10-20 02:37 — Bug pass by driving the app, not by reading it

**What happened:** A second hunt over the order flow and the admin code, this time with every
candidate checked in a browser against the live Firestore project rather than read back. Twenty
defects fixed. The two a customer would have hit first were a spurious order notification and a
sugar option recorded as its opposite.

**Found / changed:**
1. **A fresh tracker compared its first snapshot with the previous order's last status.** Placing
   a second order after the first had been marked made or on its way beeped, lit the stepper and
   pushed a notification about an order nothing had happened to. Proven with a stub: `_lastSt` set
   to `done`, `trackOrder('HL89NR')` on an order at `baru`, and both `fireNotify` and `alertDone`
   fired. `trackOrder` now clears `_lastSt`; the same test records nothing.
2. **The live config holds two add-ons under one id** (`no_sugar_condensed_milk`). Tapping "No
   Sugar/Condensed Milk" lit it and "Change to Sugar" together, the two cancelled each other, and
   the order recorded "Change to Sugar" — the opposite instruction. Config is normalised on the
   first read and on every realtime update (`normAdds`, `applyCfg`); the later duplicate is given
   `no_sugar_condensed_milk_2` and now records its own name. The add-on form refuses to create
   another duplicate.
3. Out-of-stock options gave no feedback at all when tapped — `togC` returned before it had the
   add-on, so it had nothing to name. Now "❌ Cheese habis".
4. "Activate all" cleared every disabled list except the blocks, and never redrew the grid.
5. The block toggle interpolated a raw block name into an `onclick`; a name with an apostrophe
   broke its own button. It passes the index now, the way the other lists already do.
6. The add-on form kept the last edited group, so the next new add-on was filed under it.
   `admAddons` resets it, as `admMenu` already did for the category.
7. Checkout refused the payment choice before the name, block, room and time above it, so the
   message pointed at the wrong part of the form. Measured after the fix: delivery → block → room
   → time → pay.
8. The review showed the block but not the room number — the last chance to catch a wrong room
   read "👤 TEST Intan" for an order the seller receives as "Intan 7". Now "👤 TEST Intan 7".
9. A QR order with no receipt was accepted with no mention of it. Still accepted — refusing would
   block a customer mid-service — but the review now says the seller cannot verify the payment.
10. The status bar said "Sedang dibuat..." for an order not yet confirmed, contradicting the
    stepper under it. `admStatusText` now has a word for `baru`, which also corrects the seller's
    WhatsApp message.
11. The stamp prompt claimed the number was saved when the write had been refused for having no
    name of two characters to send.
12. A time slot and a block name both reached an `onclick` attribute unescaped.
13. `toast()` rendered its message as HTML while carrying names from config and from the
    customer's own field. No caller passes markup, so it renders text now.
14. A missing space in "(Gambar kelihatan kosong) -Cuba gambar lain".
15. `initConfig`'s realtime snapshot skipped the normalisation the first load did, and never
    redrew the block grid.

**Verified in the browser:** the duplicate-id repair (one selection, correct name), the
out-of-stock toast, the gate order, the review's room and receipt warning, Masa Ambil still hiding
the slots and carrying `Bila siap`, the status wording, and `toast` refusing to render markup.
Console clean across all of it. **Not exercised:** the admin-only paths — the orders list, the
receipt viewer, the editors and analytics — because testing them needs an admin session, and the
password is not something this session handles.

**Artefacts:** `drinks-order.html`, `index.html`, `sw.js` (`v21` → `v22-20261020`); commit
`6ba4a19`
**Status:** ✅ confirmed, except the admin-only paths above, which are covered by reading only.

---

### 2026-10-20 02:51 — Site moved out of the shared scratch folder
**What happened:** The repo, its tooling, the design iterations and the review packet now sit
under `C:\Users\kiifu\Desktop\MINUM MALAM SISWA\`, instead of sharing `Desktop\claude` with
unrelated work (exam PDFs, emulator screenshots, three other widget projects).
**Found / changed:** `app\` is the git repo — 15 tracked files, `.git` intact, remote unchanged,
`git log` unchanged, and `drinks-order.html` still byte-identical to `index.html` at 206,917
bytes. `tools\` is the old `fb-admin-setup`; 126 files were retargeted from `Desktop\claude` to
`Desktop\MINUM MALAM SISWA\app` (134 path references). `archive\` holds `design-v2`,
`design-v3`, `drinks-corpus`, `drinks-out`, `graphify-out`, the `.bak` and experiment copies and
the QR data. `review\` is the review packet. 75.5 MB in total. The local server on port 8899 was
stopped before the move so it would not hold the old directory open. `design-v3` refused to move
— a process holds the directory — so it was copied byte-for-byte (8 files) and the locked
original left behind in `Desktop\claude` for deletion after a reboot. `tools\ADMIN-CREDENTIALS.txt`
and `tools\creds.js` moved with the tooling; they are still plaintext admin credentials and are
flagged in the new `README.md`.
**Artefacts:** `Desktop\MINUM MALAM SISWA\{app,tools,archive,review}`, `README.md`,
`tools\retarget-paths.js`; `DRINKS-ORDER.md` working-tree path updated
**Status:** ✅ confirmed — `git status` in `app\` reports only the pre-existing modification to
`transit-widget/DESIGN.md`, which belongs to the other project.

### 2026-10-21 12:08 — The verifier was stale, not the code; 21/21 pass
**What happened:** `verify-n60.js` reported one failure — "review warns a QR order has no
receipt" — which would have read as a regression. The feature is present in the checkout line.
The assertion expected the literal characters `·` and `⚠`, but that line was later rewritten
with `\u00B7` / `\u26A0` escapes so the source holds no non-ASCII bytes, and the regex could
never match again.
**Found / changed:** The assertion now matches the shape rather than the glyphs. Re-run:
21 of 21 checks pass and both inline script blocks parse (138,059 and 73 chars). The oversized
PDF guard — the 21st defect carried in the handover as "next move" — was already present in
`claimPicked` and committed as `9c97de4` (`fix: refuse oversized PDF at pick time instead of
ticking green`), so there was nothing left to apply.
**Artefacts:** `tools\verify-n60.js`
**Status:** ✅ confirmed for the 21 known fixes. This is not proof that no unknown defect exists:
the 4-seat review panel has still not run against the packet, and the admin-only screens have
only ever been checked by reading.

### 2026-10-21 12:27 — Coupon payment method: buy five, one drink free
**What happened:** A third payment method, `Kupon`. The seller mints a coupon when a
customer's fifth **completed** order is marked done; the customer types the eight-character
code at checkout and taps which drink is free.
**Found / changed:**
- **Rules.** New `coupons/{code}`: `get` open (the code is the credential), `list` and
  `create`/`delete` seller-only, and `update` narrowed to `used: false -> true` with only
  `used`/`usedAt`/`ord` changing, so single use is enforced by the server rather than by the
  page. New `milestones/{key}`, seller-only in every direction. Published over the Rules API:
  the firebase CLI is not installed on this machine, so `tools/deploy-rules.js` creates a
  ruleset and repoints the `cloud.firestore` release, and `rules-preflight.js` confirms local
  and live differ in nothing.
- **Proof from an unauthenticated client** (a customer's browser): consume a code once → 200,
  consume the same code again → 403, write a stray field → 403; `coupons` list → 403;
  `milestones` list → 403; `orders` list → 403; `members` get → 403; `tracking` get → 200,
  unchanged.
- **Customer.** `#coupon-section` opens under the payment row when Kupon is chosen.
  `couponCheck()` reads the coupon document from Firestore — nothing is kept in localStorage
  and no validity is guessed locally. Missing, too short, already used and expired each get
  their own sentence. In the review every line is tappable while a coupon is active; the
  tapped line is struck and marked `PERCUMA`, `#confirm-free` shows `-RMx`, and the total is
  net of it. The burst happens in the same transaction that writes the order, so a code
  already spent fails at the write instead of after it.
- **Seller.** `maybeMintCoupon(orderId)` runs when an order is marked `done`: it counts that
  phone's completed, non-free orders, and on every fifth mints `coupons/{code}` plus
  `milestones/{phone}_{n}` in one batch, so a double tap cannot mint twice. The code is shown
  in a modal for the seller to pass on.
- **Decisions taken:** five completed orders, any size; one drink of the customer's choosing;
  30-day expiry; the RM1 COD fee still applies to a free drink, because it is delivery and not
  the drink; the count is derived from `orders` rather than a stored counter, so it cannot
  drift. A coupon order sets `free`, and free orders never count toward the next five.
- **Verified in a browser** against the live project with two fixture coupons: two drinks at
  RM2.50 → review RM5.00 → tap the second line → `-RM2.50`, total RM2.50, `PERCUMA` rendered,
  zero console errors. Missing, short and already-used codes each refused with the right
  sentence. Both fixtures deleted afterwards; an anonymous read of each returns 404.
- **Not exercised:** placing an actual coupon order, because that writes a real order into the
  live project. The burn is covered by the rule proof above and by the transaction wiring, not
  by an end-to-end run. The seller's mint path needs an admin session and is covered by reading
  plus the rules proof.
**Artefacts:** `drinks-order.html`, `index.html`, `firestore.rules`, `sw.js`
(`v24` → `v25-20261021`); `tools/deploy-rules.js`, `tools/token.js`, `tools/probe-coupons.js`,
`tools/fixture-coupon.js`, `tools/verify-coupon.js`
**Status:** ✅ confirmed for everything reachable without a seller session.

### 2026-10-21 12:52 — The review panel was right: coupon orders were impossible
**What happened:** Three of the four review seats independently found that the published `validOrder()` rejects `payment:'coupon'`, so every coupon order would have been refused by Firestore. Fixed, rules re-published, and this time an order was actually placed end to end.
**Found / changed:**
- **The criticals.** The payment enum was `['cash','qr']`; the closed key list omitted `coupon`/`free`/`freeItem`; `total > 0` rejected a fully-covered RM0 pickup order; and the public burn rule ignored `exp`, so an expired code could be spent.
- **`validOrder()` now anchors the order to the coupon.** For a coupon order it requires an eight-character code naming a coupon document that exists, is unused and is unexpired. Proven with two crafted writes from the page, each with a valid `createdAt` and only the coupon wrong: missing code → `permission-denied`, already-used code → `permission-denied`.
- **Burn rule** now also demands `exp > request.time`, `usedAt is timestamp`, and `ord` a string of exactly six characters.
- **App.** The discount is recomputed from the cart at send time (`_prices`) instead of trusting the review array, so changing the cart cannot discount a phantom line, and a missing line refuses the order instead of burning a coupon for RM0. `subtotal` stays pre-discount. A coupon with no expiry is refused. Switching payment method disarms the code. A picked free drink can be tapped again to unpick. Minting moved into one `runTransaction`, so a colliding code cannot overwrite a spent coupon and a double tap cannot mint twice, and it fires only after the status write resolves rather than on a timer.
- **End to end against production**, in the browser: fixture coupon → one drink → review RM2.50 → free line −RM2.50 → total RM0.00 → order `YS95G4` stored with `payment=coupon, subtotal=2.5, total=0, free=2.5, coupon=E2EORDR1, freeItem="Extrajoss Mangga"`, and the coupon burned with `ord=YS95G4`. Both deleted afterwards; an anonymous read of the coupon returns 404 and of the order 403 (not readable).
- **Documented limit**, in the rules comment: rules cannot prove that the burn happened in the same commit, so a crafted coupon order carrying a live code without burning it would pass. The seller sees the code on the order, and a coupon left unused is the audit trail.
- **Verifiers:** `verify-coupon.js` all green, `verify-n60.js` still 21/21.
**Artefacts:** `drinks-order.html`, `index.html`, `firestore.rules`, `sw.js` (`v25` → `v26-20261021`); `tools/e2e-coupon.js`, `tools/verify-coupon.js`
**Status:** ✅ confirmed end to end.

### 2026-10-21 13:00 — A coupon pays for the drink, not for its add-ons
**What happened:** The second review round found one fresh critical — a coupon order could pass `validOrder()` with a `free` amount and **no coupon code** at all, because the guard used `hasAny(['coupon','free'])`. Closed it, and changed the coupon so add-ons are never free.
**Found / changed:**
- **The critical.** `validOrder()` now requires `hasAll(['coupon'])` whenever `payment == 'coupon'`, plus `hasAll(['coupon','free'])` for the amount, so a bare discount cannot buy a drink. Proven with three crafted writes from the page, each with a valid `createdAt`: coupon payment with `free` and no code → `permission-denied`; cash carrying a coupon field → `permission-denied`; coupon payment with no `free` → `permission-denied`.
- **Cash and QR orders may not carry `coupon`/`free`/`freeItem`** at all, and the burn timestamp is bounded to within a minute of the request rather than any timestamp at all.
- **Add-ons are never free.** The coupon discounts the picked drink's base price only. The review strikes the drink price, prints `PERCUMA`, and shows the add-on as `+RMx` still owed on that line; the total is exactly the add-ons. `_revBase`/`_revAdd` carry the split, and `sendWa` recomputes from `_bases` so the discount cannot drift from the cart.
- **A real bug the add-on test caught:** `_revLabel.push` called `.join()` on a string that was already joined, so a cart containing an add-on threw `TypeError: al.join is not a function` and the review never rendered. It had passed every earlier test because those carts had no add-ons. Removed; the review render is now exercised with add-ons.
- **Other round-two fixes:** the free-item label is rebuilt from the cart at send; minting aborts rather than overwrite a colliding code and clears `code` on every transaction attempt; a phone whose digits strip to nothing still gets its own milestone key; the client and the rule now agree on the expiry boundary.
- **End to end with an add-on**, against production: drink RM2.50 + Extra Kaw RM0.50 → review RM3.00 → pick the line → `-RM2.50`, total **RM0.50** → order `ZXATM5` stored as `subtotal=3, free=2.5, total=0.5, coupon=ADDON123, freeItem="Extrajoss Mangga + Extra Kaw"`, coupon burned `ord=ZXATM5`. Deleted afterwards. The no-add-on case was re-proven earlier with `T8X65F` (total RM0).
- **Verifiers:** `verify-coupon.js` 61 checks green, `verify-n60.js` 21/21.
**Artefacts:** `drinks-order.html`, `index.html`, `firestore.rules`, `sw.js` (`v27-20261021`); `tools/verify-coupon.js`, `tools/e2e-coupon.js`
**Status:** ✅ confirmed end to end, with and without add-ons.

### 2026-10-21 13:32 — "I can't order anymore": a saved cart that outlived the menu
**What happened:** Orders were refused with no visible reason. The cause was a cart persisted in localStorage holding item ids that no longer resolve against the live menu: `draw()` skipped them, so the review rendered **zero rows** while the checkout gate counted cart *instances*, opened an empty review, and wrote an order with no items.
**Found / changed:**
- Reproduced the symptom exactly: a cart of `{c0v0, c9v9}` renders 0 rows, `#confirm-total` reads `RM0.00`, and the send either stalls or writes an empty order.
- `pruneCart()` drops any id that does not resolve to a real category/item. It runs in `draw()` once the menu is known, and again at the top of the checkout handler, so a cart saved under an older menu heals itself on the next load instead of blocking every order.
- `sendWa` refuses an order whose `ordMap` came out empty, with *"Bakul tidak sah - pilih minuman semula"*, and clears the cart. An empty order can no longer be written.
- Verified: mixed cart `{c0v0, c9v9}` → pruned to `{c0v0}`; fully stale cart → `{}`; a valid cart then ordered normally (`BV9TWB`, RM2.50, *"Pesanan dihantar!"*), and that test order was deleted afterwards.
- Also checked the phone layout while there: three payment buttons at 90 px each inside a 287 px row, no horizontal overflow, the coupon block hidden until Kupon is tapped, and the code input at 16 px so iOS does not zoom.
- `sw.js` bumped `v27` → `v28-20261021`.
**Artefacts:** `drinks-order.html`, `index.html`, `sw.js`; `tools/cleanup-test-orders.js`
**Status:** ✅ confirmed — the stale-cart path is fixed and a normal order still goes through.

### 2026-10-21 13:55 — A coupon drink is collected, or delivered for RM1
**What happened:** A coupon now covers the drink only, so a cart holding nothing but that drink defaults to **Ambil Sendiri**; COD is offered as an explicit **+RM1** upgrade the customer has to accept. A cart that also holds a paid drink keeps both options, with the usual RM1.
**Found / changed:**
- `couponOnly()` is true when the payment is a coupon, the code is valid, and the cart holds exactly one drink — the free one. `cartInstances()` counts instances, not lines.
- `drawDel()` labels COD as `COD +RM1` for that cart and prints one sentence explaining it; every other cart renders exactly as before.
- Choosing a delivery type records the acceptance: `codFreeUp = (type === 'cod')` while the cart is coupon-only. The checkout gate then downgrades an unaccepted COD (`isCod = false`) rather than trusting stale state.
- A validated coupon preselects Ambil Sendiri when nothing else is chosen yet, and `upCart()` now redraws the delivery row so the label follows the cart.
- **Verified in the browser against a fixture coupon:**
  - coupon only, pickup → review RM2.50, pick the drink → **RM0.00**
  - coupon only, COD accepted → **RM1.00**, delivery line reads `COD (+RM1)`
  - coupon + a second paid drink, COD → RM6.00, pick the free drink → **RM3.50**
  - no coupon, COD → RM3.50 (unchanged)
  - and the gate was tested with `isCod` forced true and no acceptance: it downgraded to pickup and the review stayed at **RM0.00**.
- `sw.js` `v29` → `v30-20261021`; `verify-coupon.js` all green, `verify-n60.js` 21/21; the fixture coupon was deleted afterwards.
**Artefacts:** `drinks-order.html`, `index.html`, `sw.js`, `tools/verify-coupon.js`
**Status:** ✅ confirmed in the browser, four cases with their totals.

### 2026-10-21 14:12 — COD takes a slot, and the loyalty count is finally visible
**What happened:** Two changes. COD no longer offers a custom time box at all — the slot list is the time. And the five-order loyalty count, which already only moved when the seller marked an order Siap, now shows its progress.
**Found / changed:**
- **COD time.** `#time-more` ("Order for later? 👇") and `#time-pickup` (its input) are hidden when COD is chosen; `#times` is the only time control. The chosen delivery also resets `selTime`, so a value typed into the custom box before switching cannot ride into a COD order. Pickup still shows the custom box, as before.
  - Verified: COD → `time-more none`, `time-pickup none`, `times flex`, `selTime ""`; pickup → `time-more block`, `time-pickup block`, `times none`, and the typed value is picked up.
- **Loyalty visibility.** The count was already `status === 'done'` and non-free only — an order does not count when placed, only when marked Siap. What was missing was any sign of it:
  - after each delivery, a toast reads *"Kad setia: n/5"*; every fifth goes to the coupon modal, now headed *"Kupon · kad setia n/5"*;
  - the order detail carries a **Kad setia** row, filled by `loadLoyalty()` from the same query the mint uses, so the two can never disagree;
  - bulk *"Tandakan semua Siap"* now counts every order it closes, silently, instead of skipping them;
  - an order with no phone number says so — *"Kad setia dikira ikut nombor pelanggan"* — instead of silently counting nothing.
- `sw.js` `v30` → `v31-20261021`; `verify-coupon.js` all green, `verify-n60.js` 21/21.
**Artefacts:** `drinks-order.html`, `index.html`, `sw.js`, `tools/verify-coupon.js`, `DRINKS-ORDER.md`
**Status:** ✅ confirmed for the COD time behaviour in the browser; the loyalty display is read-verified (it needs a seller session to click through).

### 2026-10-21 14:40 — The coupon reaches the customer, and picks the dearest drink
**What happened:** The minted code never reached the customer — it existed only in a modal on the seller's screen. Now the mint also writes it onto that order's tracking document, which the customer already reads by its own code, and the homepage shows it in an animated banner with one-tap copy. The coupon also chooses the most expensive drink by itself, discounting that drink's **base** price only.
**Found / changed:**
- **Delivery of the code.** `maybeMintCoupon` writes `coupon` and `couponExp` onto `tracking/{orderCode}` after it commits. The customer's device reads that document (`loadMyCoupons()`), caches it in `mms_coupons`, and `drawCpnBar()` renders it.
- **Rules widened for that, and closed elsewhere:** `tracking` changes from `allow read: if true` to `allow get: if true; allow list: if false;`. Nothing listed tracking, and leaving list open would have handed out every coupon code in the collection. Probed: `tracking/HL89NR` → 200, `tracking` (list) → 403.
- **The banner.** A gradient card above the loyalty bar, `cpnShine` animation, code in 26px with letter-spacing, one tap copies to the clipboard with a toast, and *"Guna sekarang"* fills the code, checks it, and scrolls to the payment row. A spent code removes itself from the wallet.
- **Automatic choice.** `#checkout` picks the line with the highest **base** price before rendering; `sendWa` recomputes the same choice from `_bases`, so the review and the order cannot disagree. The tap-to-pick handler is gone, and rows no longer look tappable.
- **Verified in the browser**, matching the examples given:
  - one drink RM2.50 with a RM1 add-on → free **−RM2.50**, total **RM1.00**
  - RM2.50 (+RM1 add-on) and RM3.50 → the RM3.50 drink is chosen, free **−RM3.50**, total **RM3.50**
  - two plain drinks RM2.50 and RM3.50 → total **RM2.50**
  - the banner renders with `cpnShine`, copies on tap, and *Guna* fills the code and validates it; tapping a review row no longer moves the free drink.
- `sw.js` `v31` → `v32-20261021`; `verify-coupon.js` all green, `verify-n60.js` 21/21; the fixture coupon was deleted.
**Artefacts:** `drinks-order.html`, `index.html`, `firestore.rules`, `sw.js`, `tools/verify-coupon.js`
**Status:** ✅ confirmed in the browser; the mint-to-tracking write is read-verified (it needs a seller session to click through).

### 2026-10-21 15:05 — The banner becomes a glowing ticket in the loyalty bar
**What happened:** The wide coupon banner was rejected on sight. It is replaced by a ticket icon sitting in the loyalty bar beside the stamp count: tap it and a small card pops out of the icon — *"You have 2 coupons"* — with a copy and a use button per code.
**Found / changed:**
- The banner element, its CSS and `cpnCopyTap()` are gone. In their place: `.cpn-wrap` / `.cpn-btn` (42px, teal ring, `cpnPulse` glow, amber count badge) and `.cpn-pop` — a dark card with a pointed tail, teal hairline, soft outer glow, `cpnPopIn` 170ms from the icon.
- Inline SVG ticket rather than an emoji: the emoji rendered as a box glyph in the first screenshot, which is exactly the kind of thing a screenshot catches and a DOM check does not.
- Interaction: tap the ticket opens the bubble, tap anywhere else closes it, `Salin` copies (clipboard API with a toast fallback), `Guna` closes the bubble, fills the code, validates it and scrolls to the payment row.
- Two layout faults were fixed after looking at real screenshots: the ticket was anchored to the bar's right edge and got clipped by the page's horizontal overflow, so it is now inline in the bar inside its own `position:relative` wrapper, with the bubble anchored to that. Measured after: `scrollWidth - innerWidth = -15`, button and bubble both inside the viewport.
- Verified: badge shows `2`, bubble reads *"You have 2 coupons"*, `Salin` copies `TICKET99`, outside tap closes (`display:none`), reopening works, `Guna` fills the field and the coupon validates (`cpnOk true`).
- `sw.js` `v32` → `v33-20261021`; `verify-coupon.js` all green, `verify-n60.js` 21/21; the fixture coupon was deleted.
**Artefacts:** `drinks-order.html`, `index.html`, `sw.js`, `tools/verify-coupon.js`
**Status:** ✅ confirmed in the browser, with screenshots before and after the layout fix.

### 2026-10-21 15:30 — A coupon is single-use everywhere, and a finished order disappears
**What happened:** Two complaints. A coupon could appear usable when it had already been spent (by this phone or by whoever it was shared with), and the customer's "Pesanan saya" button and status bar kept showing after the order was delivered.
**Found / changed:**
- **The wallet verifies.** `verifyWallet()` reads every cached code from `coupons/{CODE}` and drops anything `used`, missing or expired; it runs on boot and again whenever the bubble opens. Tested with three fixtures — one live, one live, one already burned anonymously in the way another person's phone would burn it: the spent one left the wallet and the badge went from 3 to 2.
- **A failed coupon order names the reason.** After the order transaction fails, the app reads the coupon: spent or missing → *"Kupon ini sudah digunakan"* and the code is removed; otherwise *"Kupon tidak dapat digunakan - cuba lagi"*. Before, this was a silent failure.
- **Single use re-proved from an unauthenticated client:** consume → 200, consume again → 403, write a stray field → 403. The earlier probe had started failing because it sent a nine-character `ord` and the rule requires exactly six — the rule was right and the fixture was wrong; the probe now sends six.
- **A delivered order stops haunting the customer.** `paintMyBar()` hides itself when the effective status is `done`, `showMyOrderBtn()` hides the button, and `trackOrder` persists `_st:'done'` so a reload stays quiet. Verified: `baru` → button `inline-flex`, bar on; `done` → button `none`, bar off.
- **The burn is auditable, because rules cannot prove it.** A coupon order's detail now shows whether its coupon is `used` **and** `ord` equals that order id — teal when it matches, red *"Jangan lepaskan minuman percuma"* when it does not. That is the only way to catch a crafted order that carried a live code without burning it.
- `sw.js` `v33` → `v34-20261021`; `verify-coupon.js` all green, `verify-n60.js` 21/21; all fixtures deleted.
**Artefacts:** `drinks-order.html`, `index.html`, `sw.js`, `tools/verify-coupon.js`, `tools/fixture-coupon.js`
**Status:** ✅ confirmed in the browser for the wallet and the finished order; the admin audit is read-verified.

### 2026-10-21 15:55 — The green tick on the first drink was an admin control
**What happened:** The user reported Extrajoss Mangga being "automatically selected" on the menu card. It was not a selection: the card rendered the admin's availability toggle, a green ✓ in the top-left corner, because the owner is signed in and the card template switched to `admin-mode` for anyone with a session.
**Found / changed:**
- Confirmed by reading the DOM: `<button class="card-toggle on" onclick="...togDis('c0v0')">` inside `class="card"`, which is Extrajoss because it is the first item.
- The same control exists in the admin panel's menu editor (`admTogDis`, `.a-row`), so the card no longer renders it at all, and `(admin?' admin-mode':'')` is gone from the card template.
- Verified: `.card-toggle` count 0, `.card.admin-mode` count 0, and still 0 after forcing `admin = true` and redrawing — the owner's session can no longer put a tick on the customer menu.
- `sw.js` `v34` → `v35-20261021`; `verify-coupon.js` all green, `verify-n60.js` 21/21.
**Artefacts:** `drinks-order.html`, `index.html`, `sw.js`
**Status:** ✅ confirmed in the browser with the admin flag forced on.

## Withdrawn results

- **"The `members` rules are unpublished."** Repeated in the log and in several answers to the
  owner between 12:56 and 16:00. Withdrawn at 16:00: the deployed ruleset already contained
  `match /members/{phone}`, verified over the Firestore Rules API, and a block-by-block
  comparison showed the repository file and the live source differed in nothing. The owner had
  already published them. Replaced by the entry at 16:00, which also proves the write path with a
  real insert and delete.
- **"The alert payload was verified."** Recorded at 12:50 as proof that the notification worked,
  on the strength of an intercepted `fetch` whose captured headers were inspected. Withdrawn at
  15:23: interception bypasses the Headers construction that was actually failing, so the check
  could not have caught it. Replaced by the poll-the-topic verification at 15:23, and the rule
  that follow-up checks read from the receiving end.
- **"The cart counter label lags after Pesan lagi."** Reported on 2026-10-19 as a cosmetic
  bug that made the button look half-done. Withdrawn 2026-10-20: `#cart-count` does keep its last
  text, but `#cart-bar` loses its `.show` class and is `display:none`, so the stale label is never
  on screen. The reading came from `textContent` on a hidden element instead of checking whether
  it was visible — the same mistake as measuring `getComputedStyle` on a child of a hidden parent.
  Nothing to fix.

Nothing withdrawn yet. When something is, list it here with the reason and a pointer
to whatever replaced it, so a wrong number can never be picked up and re-used.

### 2026-10-20 03:00 ? 21st defect fixed: oversized PDF no longer ticks green
**What happened:** claimPicked now refuses a PDF larger than PDF_MAX_BYTES (480000 bytes) at pick time ? clears the input, shows a red error, skips the green checkmark ? instead of ticking green and failing later in readProof. Normal files still tick green; un-pick still clears stagedProof. readProof/sendClaim oversized path untouched.
**Found / changed:** claimPicked in drinks-order.html and index.html (byte-identical). sw.js V bumped to v23-20261020.
**Artefacts:** app/drinks-order.html, app/index.html, app/sw.js
**Status:** ? confirmed ? 4-seat review panel (mimo, ds4, ultra, longcat) all PASS, no findings

### 2026-10-20 04:05 ? QR orders now require a receipt, and the alert follows the claim
**What happened:** A QR Pay order can no longer be reviewed or sent without a staged receipt. Added the same gate in the checkout button and in sendWa: payM==='qr' && !stagedProof refuses with 'Hantar resit dahulu'. Because a QR order now always carries a proof, submitClaim always runs on dispatch and 
otifyOwnerClaim fires ? closing the QR path that previously reached the seller with no alert.
**Found / changed:** checkout click handler + sendWa in drinks-order.html and index.html (byte-identical). sw.js V bumped to v24-20261020.
**Artefacts:** app/drinks-order.html, app/index.html, app/sw.js
**Status:** ?? provisional ? one review seat PASS (ultra); other three seats rate-limited, user waived re-review
