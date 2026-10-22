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

## Known gaps (next passes)

1. Two drinks show "Paling Laku" at once — `v.pop` is set on more than one item
   in `settings/menu`. Data, not styling.
2. Emoji are still used as section icons in the cart modal (🍬 🌿 ➕ ✨).
3. `.card .n` reserves two lines so prices line up across the grid; names that
   fit one line sit in a taller box by design.
4. `@keyframes glow` is now unused — remove with the motion pass.
