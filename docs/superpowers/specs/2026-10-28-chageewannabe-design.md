# CHAGEEWANNABE — an experimental storefront, CHAGEE's composition in our skin

**Status:** approved by the owner on 2026-10-28 (scope: order a drink end-to-end, fake data; skin: their layout, our charcoal palette).

**Where it lives:** `app/experiments/CHAGEEWANNABE.html`. One file, same shape as `drinks-order.html` (inline CSS + one script, no build step). Not linked from the shop, `noindex`, never deployed as the storefront.

**What it is for.** The owner wants to know whether CHAGEE's *structure* — choose mode, choose store with a queue estimate, browse a category rail, customise a drink in a sheet, confirm in a cart, then get an order code — serves a night-drink stall better than the current single-scroll form. The palette stays ours; only the composition is borrowed.

**Brand boundary.** Their name, floral mark and blue-porcelain photography are theirs, not ours. This file uses our own drinks, our own drawn art and our own wordmark. It is a study of a flow, not a counterfeit.

## Screens

1. **Home** — full-bleed art hero with the wordmark, then two large mode cards: *Ambil sendiri* and *COD delivery*. Mode is chosen before anything else, the way their app does it.
2. **Stores** (pickup only) — store cards with a live-looking queue line (`Menunggu ±N minit`), a distance, and an *PESAN SEKARANG* button. Delivery skips this screen to the address field.
3. **Menu** — sticky left category rail (Teh · Kopi · Susu · Istimewa), product rows with drawn cup art, name, one-line description and price.
4. **Drink sheet** — the heart of it: large cup, name, description, then chip rows `Saiz` (R/L), `Gula` (0/25/50/100), `Ais` (Panas/Sejuk/Sedikit ais), `Topping` (multi). Sticky footer: quantity stepper + *Tambah · RM x*.
5. **Cart** — one line per configured drink with its options spelled out, edit and remove, coupon field (8 characters, faked), total, *Buat pesanan*.
6. **Placed** — 6-character order code in the same alphabet as the live app (`ABCDEFGHJKLMNPQRSTUVWXYZ23456789`), queue estimate, status timeline `baru → dibayar → siap`, and *Simpan kod ini*.
7. **Pesanan** tab — orders this device placed, from `localStorage`.
8. **Kupon** tab — the coupon wallet, empty state drawn honestly.

## Data

A `MENU` array and `STORES` array in the file, shaped like `settings/menu` and a store record so a later Firestore swap is a data-source change rather than a rewrite. Cart and orders live in `localStorage` under `cw_cart` and `cw_orders`.

## Tokens

Reuse the shop's: `--bg #12100E`, `--surface #1B1713`, `--ink #F2EFE9`, `--muted #9A9385`, mint `#00D4AA`, gold `#FFB347`; fonts Plus Jakarta Sans (display) and Nunito (body). CHAGEE's composition with our lamplight, not their cream.

## Interaction rules

- Every tap target ≥ 44px; the sheet is dismissible by tapping the scrim or the drag handle row.
- The cart badge is a count, never a dot.
- Prices are computed, never hard-coded per screen: `base + size + toppings`.
- Empty states say what to do next, not "no data".

## Non-goals this pass

No login, no Firestore, no payment proof upload, no admin, no real queue, no delivery radius logic, no coupon minting. The file must not touch `settings/`, `orders/` or any live collection.

## Verification

Local server + headless Edge: place one drink with toppings end-to-end, reload and confirm the cart and the order survived, remove a line and confirm the total recomputes, and open every tab once with zero console errors. Screenshot each screen at 390px and 430px.
