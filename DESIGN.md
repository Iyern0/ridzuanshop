# DESIGN.md — MINUM MALAM SISWA

What the storefront looks like, and why. This is the **current state** file for
visual decisions; `WORKLOG.md` holds the history of how it got here.

Scope: the customer-facing page (`index.html` = `drinks-order.html`, one file).
The admin screens inside the same file are internal and deliberately lag behind.

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

## Known gaps (next passes)

1. Two drinks show "Paling Laku" at once — `v.pop` is set on more than one item
   in `settings/menu`. Data, not styling.
2. Emoji are still used as section icons in the cart modal (🍬 🌿 ➕ ✨).
3. `.card .n` reserves two lines so prices line up across the grid; names that
   fit one line sit in a taller box by design.
4. **Admin screens still carry two looping glows** (`.o-clam.unseen` clamGlow,
   `.a-receipt` recPulse). Left alone deliberately: internal screens, out of
   scope for the storefront passes, and they do flag that something needs
   attention. Fix them if the admin views ever get their own pass.
