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

---

## Withdrawn results

Nothing withdrawn yet. When something is, list it here with the reason and a pointer
to whatever replaced it, so a wrong number can never be picked up and re-used.
