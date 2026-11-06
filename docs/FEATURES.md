# FEATURES — everything the app does, as a rebuild checklist

Plain list of behaviours, screen by screen. Tick a box only when the new design **does the
thing**, not when the screen merely exists. No code names here on purpose — this is the
list you build against.

---

## A. Customer — Utama (home)

- [ ] Shows the shop hours and whether it is open right now (open / closing soon / closed).
- [ ] Shows the five-stamp loyalty card and how many stamps the customer has.
- [ ] Shows a coupon button with a badge when a free drink is waiting.
- [ ] Shows a clipboard button that opens the order history.
- [ ] Lists drinks from the shop’s menu, grouped by category.
- [ ] Each drink card shows name and price, plus a tag when it is a best seller, the cheapest, or sold out.
- [ ] Sold-out or disabled drinks are visibly disabled and cannot be ordered.
- [ ] A search field filters drinks by name as you type.
- [ ] Tapping a drink opens the options sheet.
- [ ] A “who we are” strip shows the shop’s own note.
- [ ] A floating basket bar shows item count + total and opens the basket; it is hidden while the basket is empty.

## B. Customer — drink options sheet

- [ ] Shows drink name, price and picture.
- [ ] Lets the customer pick sweetness / milk / level options, each with its own price.
- [ ] Lets the customer pick extras (Extra Kaw, Extra Susu, Extra Gula…) with a price each.
- [ ] Option labels never break in the middle of a word.
- [ ] Quantity stepper.
- [ ] Price updates live as options or quantity change.
- [ ] “Add to basket” adds the chosen quantity as separate drinks.
- [ ] Identical drinks merge into one line instead of duplicating.
- [ ] Closing without adding leaves the basket untouched.

## C. Customer — Bakul (basket, step 1 of 3)

- [ ] One row per drink: picture, name, its chosen options, quantity stepper, line price, remove.
- [ ] Reducing quantity to zero removes the row.
- [ ] Removing everything closes the sheet.
- [ ] Subtotal, delivery fee line, coupon discount line, and the final total.
- [ ] Totals sit directly above the action button, not lost under the list.
- [ ] “Continue” is disabled while the basket is empty.
- [ ] The basket survives closing the tab or refreshing.

## D. Customer — Butiran (details, step 2 of 3)

- [ ] Asks for name, WhatsApp number, block and room the first time; remembers them afterwards.
- [ ] Lets the customer change those details later.
- [ ] Delivery choice: COD (+RM1) or collect yourself. **Nothing is chosen for them.**
- [ ] Choosing COD shows the block list and a room field.
- [ ] Choosing collect-yourself hides block and room.
- [ ] Time choice: the shop’s delivery time chips.
- [ ] COD customers see only the shop’s time slots; collect-yourself customers may also type a custom time.
- [ ] A blank time becomes “as soon as possible (~15–30 min)”.
- [ ] Missing name, phone, block or time blocks the next step, says which one, and points at it.
- [ ] Phone number must look like a real number (9+ digits).

## E. Customer — Bayar (payment, step 3 of 3)

- [ ] Three ways to pay, none pre-selected: **cash**, **QR pay**, **coupon**.
- [ ] QR pay shows the shop’s DuitNow QR picture, a download button, and a box to attach the payment screenshot.
- [ ] Coupon lets the customer paste a code and checks it is real, unused and not expired.
- [ ] A valid coupon makes the **most expensive drink free** — add-ons are still paid.
- [ ] A coupon-only basket defaults to collect-yourself; COD is offered as a paid upgrade.
- [ ] Optional note to the seller.
- [ ] A summary line: number of drinks · delivery fee · payment method.
- [ ] One send button with the total on it.
- [ ] Sending is impossible without drinks, delivery, and payment chosen.
- [ ] Repeated taps cannot create two orders.
- [ ] If the shop has redeployed while this tab was open, the page refuses to send and reloads instead (basket is kept).
- [ ] If saving fails, the customer is told plainly and given a way to send the order by WhatsApp instead.

## F. Customer — ticket after ordering

- [ ] Says clearly whether the order reached the shop, or did not, and why.
- [ ] Shows the order number and the order code.
- [ ] Shows what was ordered, delivery, time, payment method and total.
- [ ] Shows the live status, and updates as the shop changes it.
- [ ] Still asks for the payment screenshot if it is owed.
- [ ] Offers “order again” which empties the basket but keeps the customer’s details.
- [ ] Never shows the seller’s alert status — that is not the customer’s business.

## G. Customer — status while waiting

- [ ] A bar at the top shows the order number and status, with a link to the ticket.
- [ ] A floating button shows the same.
- [ ] Both disappear once the order is finished or cancelled.
- [ ] Both tell the truth even if the customer closed the app before the shop finished the order.
- [ ] A status change that happened while the app was closed is announced when it reopens (sound + vibration + message).

## H. Customer — Kupon (wallet)

- [ ] Lists the customer’s coupon codes.
- [ ] Shows how many days are left and the real end date for each.
- [ ] Warns in colour when a code is close to expiring.
- [ ] Copy a code with one tap.
- [ ] Use a code directly from the wallet.
- [ ] Expired codes are removed, and the message says “expired”, not “already used”.
- [ ] Used codes are removed, with the correct reason.
- [ ] Order history panel: every order this device placed — number, status, date, and its code.
- [ ] History rows can copy the code.
- [ ] A history row can restore that order’s coupon back into the wallet, if it has one.
- [ ] No free-text “type any code” box (it allowed claiming other people’s codes).
- [ ] A newly earned coupon appears by itself, with a toast that opens the wallet.

## I. Customer — notification card

- [ ] Offered after ordering, as a card that explains why it is useful.
- [ ] One allow button, one “not now”.
- [ ] Never shown twice for the same order.
- [ ] If notifications are already blocked, the card explains how to turn them back on and offers a “check again” button.
- [ ] Never blocks ordering.

## J. Customer — Saya (account)

- [ ] Shows and edits name, phone, block and room.
- [ ] Shows the customer’s own order count and loyalty standing.

---

## K. Shop rules that must survive the redesign

- [ ] Prices come from the shop’s menu, and the seller can change them without a developer.
- [ ] Delivery fee is configured, not hardcoded (COD default RM1).
- [ ] Free-drink rules: one free drink per five **completed** orders; a free order does not count toward the next five.
- [ ] A coupon is single-use, and cannot be reused by tapping twice.
- [ ] A coupon code is private to the customer; the shop cannot list all codes.
- [ ] Coupons live 60 days, and that limit is shown to the customer.
- [ ] A cancelled/deleted order stops counting toward stamps and sales.
- [ ] The order code is what identifies an order everywhere (status, receipt, coupon, stamps).
- [ ] Order numbering is per day, assigned by the database, never random.

---

## L. Seller — Pesanan (orders)

- [ ] Filter by status: new, in progress, ready, all, deleted.
- [ ] See each order at a glance: number, customer, block or pickup, total, status, and a receipt attached or not.
- [ ] A receipt that has not been opened glows, and a counter says how many are waiting.
- [ ] Opening a receipt clears the glow and the counter immediately.
- [ ] Opening a receipt marks the order as paid.
- [ ] Open one order: one card per drink, its add-ons, its own price, the customer’s details.
- [ ] Change status; each change can message the customer on WhatsApp with a ready-written line.
- [ ] Only a real change sends a message (no duplicate messages).
- [ ] Mark everything as ready in one tap.
- [ ] Search by name or room, and filter by block with tappable block chips.
- [ ] Delete an order (recoverable).
- [ ] Restore a deleted order.
- [ ] Delete an order permanently, with a warning that it also deletes its status row and its receipt, and that sales numbers will drop.
- [ ] See how old each order is (“3 min ago”).

## M. Seller — other admin tabs

- [ ] **Pelanggan:** customers gathered from orders — count, spend, last order; delete stored phone numbers on request.
- [ ] **Resit:** every payment screenshot in one place, opened big, with a jump to its order.
- [ ] **Kupon:** mint a code, see which are used/expired, jump to the order.
- [ ] **Analitis:** counts and revenue for tonight / 7 days / 30 days / all, with reset.
- [ ] **Jualan:** how many of each drink sold, revenue, average, best seller, share bars, drinks that never sold shown at zero, deleted orders excluded, date ranges.
- [ ] **Minuman:** add, edit, delete, reorder, and switch menu items on/off.
- [ ] **Pemanis:** add-on groups and prices.
- [ ] **Masa:** delivery time slots.
- [ ] **Penghantaran:** delivery methods with fees, block list, disabled blocks.
- [ ] **Settings:** signed-in account; trusted devices (list, remove — removing signs that device out); notification topic (copy, share, test, rotate); opening hours; “who we are”; export; reset; the running version and a “check for latest version” button; the last alert attempt and its result.

## N. Seller — alerts

- [ ] A push for every new order: number, delivery type, total, how many drinks, payment method in words.
- [ ] A second push when a customer says they have paid.
- [ ] At most one push per order per phone (no duplicates after refresh or retry).
- [ ] Any number of phones can receive them, and a second phone can subscribe in a minute.
- [ ] The topic can be rotated when it leaks, which silences the old one.
- [ ] Telegram is a best-effort second copy.
- [ ] Alerts never appear on the customer’s screen.

## O. App behaviour

- [ ] Installable on a phone (icon, name, standalone window).
- [ ] The page tells you which version is running.
- [ ] The page updates itself when a newer version is live, and only then.
- [ ] An open tab never gets stuck on an old version without asking.
- [ ] The menu looks right on a phone and on desktop.
- [ ] Text is readable everywhere (no tiny labels, enough contrast).
- [ ] Only the shop is public: no admin code, no notes, no receipts are reachable by guessing a URL.

---

## P. Not built yet — do not let the new design claim these

- [ ] Offline browsing of the menu.
- [ ] Customer login / history across phones.
- [ ] Coupon locked to a phone number.
- [ ] “Made with version X” stamp on each order.
- [ ] Charts beyond the analysis tiles.
- [ ] Printed receipt.
- [ ] Language switch.

---

## Q. Suggested order to rebuild

1. Shell, tabs, colours, typography.
2. Menu list → drink options → basket.
3. Details step (name, phone, block, time) with nothing pre-selected.
4. Payment step (three methods, QR panel, coupon, screenshot).
5. Ticket + status bar + floating button.
6. Coupon wallet + order history.
7. Admin: orders, receipts, then the rest.
8. Alerts, version chain, polish.
