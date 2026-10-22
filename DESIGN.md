# DESIGN.md — MINUM MALAM SISWA

What the storefront looks like, and why. This is the **current state** file for
visual decisions; `WORKLOG.md` holds the history of how it got here.

Scope: the customer-facing pages. Two shells exist:

| Shell | Status |
|---|---|
| `index.html` = `drinks-order.html` | **The live storefront.** Everything down to "Build marker" describes it. |
| `design-v2.html` | **A candidate**, served at `/design-v2.html`, not linked from the storefront and not the PWA shell. See "Design v2" at the bottom. |

The admin screens inside both files are internal and deliberately lag behind.

## Direction — warm lamplight, not default dark mode

The stall runs 10:30PM–2:00AM. The look should read as a warm light over a dark
counter, not as a generic dark-mode app.

That single idea drives the two choices a viewer notices first:

| Was | Now | Why |
|---|---|---|
| Neutral black `#131010` background | Warm charcoal `#12100E` | Neutral black is what every generated UI defaults to; warm reads as lamplight |
| Mint glow behind the title, 3px mint slab under the hero | No glow, 1px hairline | Glow text and thick accent bars are decoration that fights the content |

Mint `#00D4AA` is kept for **action and state** (primary buttons, open status,
filled loyalty stamps), not for decoration. Gold `#FFB347` owns **price and
emphasis**. Red `#FF6B6B` owns **closed / sold out / destructive**. WhatsApp
green `#25D366` appears only on WhatsApp actions.

## Tokens

Defined once in `:root` at the top of the stylesheet. Use these instead of new
hexes; when a screen needs a different value, add a token rather than a literal.

```
colour   --bg --surface --surface2 --line --line2
         --ink --ink-dim --muted
         --mint --gold --red --wa
type     --t-hero --t-h2 --t-name --t-price --t-sub --t-meta
shape    --r-card --r-pill
layout   --gutter (16px) --tap (44px)
motion   --sp --eo --eio   (defined in the motion block)
```

`--tap: 44px` is the minimum touch target and is applied to the coupon button,
the cart button and the panel close button.

## Applied so far

- **Hero** — gradient from `#1B1713` to `#12100E` (light from above), hairline
  divider, balanced text wrap, `env(safe-area-inset-top)` padding for notched
  phones.
- **Status bar** — one line at 12.5px with the dot aligned to the first line;
  it previously wrapped and centred the dot between two lines.
- **Loyalty bar** — 26px stamps, count at 19px, coupon button given a real 44px
  target.
- **Menu cards** — 1px border, 16px radius, every drink emoji sits in the same
  56px medallion so the grid reads as objects on a shelf. `:hover` only fires
  where a pointer exists (`@media (hover:hover)`); on touch it used to stick
  after a tap.
- **Badges** — moved from floating outside the card (`top:-5px;right:-5px`) to a
  corner tag hugging the top-right, so they no longer collide with the emoji.
- **Cart bar** — 1px top border instead of a 3px mint slab, safe-area bottom
  padding, 44px button.

## Motion rules (pass 2)

Audited against the motion checklist with Jakub-led weighting (production polish)
and Emil's restraint, since this is a shopping flow used repeatedly on a phone.

| Rule | Why |
|---|---|
| Nothing loops forever on a customer screen | A cushion of pulsing dots and halos is the signature of generated UI, and it spends frames on a screen left open for ten minutes |
| Animate once, when the state changes | A sweep when a delivery status lands carries information; the same sweep on repeat does not |
| Two exceptions, both documented in code | The status dot's slow opacity breath (live open/closed indicator) and nothing else |
| Four durations only: `--d-1` 120ms → `--d-4` 320ms | There were 17 ad-hoc durations for ~20 animations |
| Static content does not animate in | The section heading and status bar used to fade in on mount; text should be there when the eye arrives |
| Entrances get `--eo`, press feedback gets `--sp` | Overshoot belongs on a tap, not on a drawer or a modal |
| Hover changes a value, it does not perform | The gradient sweep on primary buttons became a `brightness()` lift plus a `scale(.985)` on press |
| `prefers-reduced-motion` caps iteration count, not just duration | A `0.001ms` infinite loop still loops |

Measured on the rendered page: **0** infinite animations, **0** animations or
transitions over 320ms.

## Funnel (pass 3)

The order path is menu → drink options → basket → delivery/payment → WhatsApp.
Four changes, all aimed at taps removed and dead ends closed:

| Change | Before | After |
|---|---|---|
| Drink options | Sweetener and level both unselected; `confirmCust` rejected the add with a toast until a sweetener was picked | `defaultAdds()` was written but never called — now preselected, so "Add to cart" works on the first tap |
| Empty basket | "🧺 Belum ada pesanan" and nothing else, while the delivery method, name field, time picker and a disabled Review Order button stayed on screen | State plus a "Lihat menu" button; every form section hides via `.panel.is-empty` |
| Repeat order | Rebuilding the same basket by hand | "↻ Ulang pesanan lepas" re-adds the last order, matched by drink **name** rather than the positional cart key, skipping items that are gone or sold out and saying which |
| No time slots | An empty row | A sentence saying no slots are free and to type a time or use "bila siap" |

Validation was already good — inline `toast()` plus field `highlight()`, no
`alert()`. It was left alone.

## Build marker (v49)

A fixed `v49` pill sits at the bottom-left of the storefront (`#build-tag`). It
exists because a service-worker cache makes "is this the new build?" impossible
to answer by looking, and the owner was told a change had shipped while seeing
none of it.

The number is **baked into the HTML**, not read from `sw.js` at runtime — that
is the whole mechanism. A stale cached shell shows the old number; a shell older
than the marker shows nothing. Read live from the worker it would lie in exactly
the case it is meant to detect.

| Property | Value | Why |
|---|---|---|
| `pointer-events` | `none` | Must never swallow a tap. Confirmed with `elementFromPoint`. |
| `z-index` | `150` | Under `#cart-bar`'s `200`, so an open cart covers it instead of clipping it in half. |
| bottom | `calc(8px + env(safe-area-inset-bottom))` | Clears the iPhone home indicator. |
| size / opacity | 10px, `0.55` | A diagnostic, not decoration. |
| count | exactly one, in the storefront footer layer | Not on admin screens — they have their own version drift to deal with. |

**Bump it in the same commit as `sw.js` `V`.** Two numbers that can disagree are
worse than none.

## Design v2 — the unlit room (candidate shell)

`design-v2.html` is a second customer shell built beside the live one, because the
three passes above changed the surface and the owner still read the result as the
same site. It is **not the storefront** until the owner says so: `index.html` keeps
serving v1, the service worker precache does not include v2, and nothing links to it.

**The idea, in one sentence:** the drinks become the lit objects in an unlit room.
Every decision below follows from that sentence, which is why there are no cards,
no frames and no coloured bands — a frame around a lit object is what a shop window
is, and a shop window is not a table at 1AM.

| Layer | Choice | Why |
|---|---|---|
| Ground | one colour, `#0A0A0B`; no gradients, no section borders | A room has one floor. Bands and boxes were what made v1 read as an app. |
| Display type | Instrument Serif, roman + italic, one size (`--t-hero` clamp 56→120px) | The wordmark is the poster: three stacked lines, the italic as the only emphasis. |
| UI type | Inter Tight 400/500, prices set in the serif | Two faces, five sizes. |
| Accent | bronze `#C08D62`; warm ink `#D9C7AE`; red `#C0654E` for sold out | Mint and gold were re-pointed here, including inside the admin CSS, so the admin screens sit in the same room. WhatsApp green `#25D366` survives: it is the mark, not decoration. |
| Menu | one column of glasses drawn in code (`glassArt(name)`), price in serif, name at one size, a one-line note under each | A printed menu, not a wall of tiles. A new drink in the admin panel gets its own glass with no design work. |
| Wide screen | ≥940px becomes `menu | 306px facts rail` | The rail carries the shop's real terms (hours, COD RM1 / free pickup, payment, 5+1). It exists because removing the cards left the right half empty — the failure the direction sheet warns about. |
| Footer | the shop's own line at 24px, left-aligned to the column | v1's centred footer with a heart emoji read as a template. |

**Why the type is not Boska.** The dealt direction named Boska from fontshare; this
page's CSP allows `fonts.googleapis.com` / `fonts.gstatic.com` only, so the face was
redrawn rather than the CSP widened.

**Motion.** The wordmark reveals once through a clip-path mask, `--d-4` 320ms, three
lines staggered 0 / 80 / 160ms. It was 620ms, which broke the 320ms budget above and
read as a slow load rather than as type arriving. The status dot keeps v1's single
documented infinite breath, and only while the shop is open.

**Build marker in v2.** Same `v49` number, two places: the fixed bottom-left pill
now fades out 5.6s after load (`buildFade`, `--d-4`), and the number is also printed
in the footer. Reason: at 390px the pill sat permanently on top of the Indocafe
glass, which looks like a bug rather than a diagnostic. Under
`prefers-reduced-motion` the pill is not rendered at all and the footer is the only
place to read it.

**Known gaps of v2** (kept here so they are not rediscovered):

1. **The drink notes are hardcoded copy**, not Firestore data — the owner has not
   approved the wording, and an admin edit to a drink name leaves its note stale.
2. **The legacy v1 layer is still in the file.** v2 overrides rather than deletes,
   so the old gradients, hairlines, shadows and emoji still exist in CSS and in the
   admin markup. The design lint gate therefore still fails on them; that is
   expected, not a regression.
3. **Only the customer surface is v2.** The admin screens inherit the palette
   because the hexes were re-pointed, but their layout, cards and two looping glows
   are untouched.
4. **No service worker adoption.** Putting v2 live means copying it over
   `drinks-order.html` + `index.html` and bumping `V`; until that happens the PWA
   shell keeps serving v1.

## Known gaps (v1, next passes)

1. Two drinks show "Paling Laku" at once — `v.pop` is set on more than one item
   in `settings/menu`. Data, not styling.
2. Emoji are still used as section icons in the cart modal (🍬 🌿 ➕ ✨).
3. `.card .n` reserves two lines so prices line up across the grid; names that
   fit one line sit in a taller box by design.
4. **Admin screens still carry two looping glows** (`.o-clam.unseen` clamGlow,
   `.a-receipt` recPulse). Left alone deliberately: internal screens, out of
   scope for the storefront passes, and they do flag that something needs
   attention. Fix them if the admin views ever get their own pass.
