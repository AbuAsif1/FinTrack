# 16: Fixed Expenses UI

**What to build:** The Fixed Expenses screen: the monthly grid, this month's checklist, the Mark as Paid drawer with skip and reopen, and template management with the suggested defaults.

**Blocked by:** 08, 12

**Status:** done

**Test cases:** `test-cases/17-ui.md` §Fixed Expenses (`TC-UI-080` to `TC-UI-084`)

**Read first:** `design.md` §5.6, §7.4 · `brd.md` §5 FR-05

- [ ] Monthly grid per `design.md` §7.4: templates as rows, months as columns, a status cell for each, and totals; it scrolls horizontally inside its own container
- [ ] On mobile, this month's checklist comes first with overdue items at the top, and the grid sits behind a "Year view" toggle
- [ ] Mark as Paid drawer: actual amount (pre-filled with the standard amount), date, Confirm; Skip with an optional note; Reopen for a Skipped item
- [ ] A Paid cell links to its Transaction
- [ ] Manage templates: add, edit, deactivate; a DPS template requires a savings account
- [ ] Setup: `SUGGESTED_FIXED_EXPENSES` offered with checkboxes; the DPS ones ask for the account
- [ ] Month totals: Fixed Commitments, paid and pending
- [ ] Alert banners for due-soon and overdue items, using the component shared with ticket 13

---

## Why

Fixed Expenses are the most time-sensitive feature in the app — users need to know, at a glance, whether they have paid this month's bills. Missing a DPS payment affects the tax rebate. Missing rent creates a debt. The monthly grid gives a year-long compliance history at a glance, while the current-month checklist surfaces only what needs action today. The alert banners on this page (and the dashboard) are the primary nudge mechanism. The setup flow with suggested defaults lowers the activation barrier for new users.

## User flows

### First setup — accepting suggested defaults
1. New user opens Fixed Expenses for the first time. A setup card appears.
2. The app offers the 7 suggested defaults from `brd.md` FR-05 as checkboxes:
   - YouTube Premium ৳169 / month
   - BRAC Bank DPS ৳10,000 / month (requires selecting a savings account)
   - Standard Chartered DPS ৳20,000 / month (requires selecting a savings account)
   - Eastern Bank DPS ৳10,000 / month (requires selecting a savings account)
   - Mess Rent ৳8,000 / month
   - Home Internet ৳1,100 / month
   - Home Electricity ৳2,500 / month
3. User checks the ones that apply, selects the DPS accounts, and taps "Set up."
4. Templates are created. The monthly grid populates.

### Monthly current-month checklist (mobile-first view)
1. User opens Fixed Expenses. On mobile, the current-month checklist is shown first.
2. Overdue items appear at the top in red: "Mess Rent — Overdue 5 days — ৳8,000 | Mark Paid."
3. Due-soon items appear next in amber: "Home Internet — Due in 2 days — ৳1,100 | Mark Paid."
4. Pending items appear below: "YouTube Premium — Due on 15th — ৳169."
5. Paid items show at the bottom with a green checkmark and their payment date.

### Marking a Fixed Expense as paid
1. User taps "Mark Paid" on "Mess Rent."
2. The Mark as Paid drawer slides up: amount pre-filled ৳8,000, date pre-filled today.
3. User changes the amount to ৳8,200 (landlord asked for a slight increase this month). Taps Confirm.
4. The instance is marked PAID. The row in the grid turns green.

### Skipping an expense
1. User taps "Skip" on "Home Internet" (not needed this month — travelling).
2. A note field appears: "Travelling this month." Taps Skip.
3. Instance is marked SKIPPED. The monthly grid shows a grey "Skipped" cell.
4. Fixed Commitments on the dashboard excludes this skipped item.

### Year view (monthly grid)
1. User taps "Year view" (mobile) or sees the grid directly (desktop).
2. A scrollable horizontal table: templates as rows, months as columns.
3. Each cell shows a colour-coded status: Paid (green), Overdue (red), Due Soon (amber), Skipped (grey), Pending (grey), Future (muted).
4. A Paid cell is tappable — links to its Transaction detail.
5. Month totals row at the bottom: Fixed Commitments total, amount paid, amount pending.

### Managing templates
1. User opens "Manage templates" from the Fixed Expenses page.
2. Sees all active templates. Taps "Edit" on YouTube Premium.
3. Changes amount to ৳185 (price increase). Saves.
4. The change applies only to PENDING instances in the current and future months. Already PAID instances are unaffected.

## Scenarios

**Scenario A — DPS template payment updates savings balance:** User marks "BRAC DPS" as paid for November. The ৳10,000 transaction is created with routing SAVINGS_DEPOSIT, linked to the BRAC DPS account. The DPS account's balance increases. The DPS rebate progress bar on the Savings page updates.

**Scenario B — reopening a paid instance:** User realises they marked the wrong month's electricity as paid. They find the PAID cell in the grid → tap it → "Reopen." The linked transaction is soft-deleted. The cell reverts to PENDING. They can now mark the correct month.

**Scenario C — template deactivation:** User cancels their Netflix subscription. They tap "Deactivate" on the Netflix template. The template's end month is set to this month. No new instances are created from next month. The current month's instance remains and can still be paid or skipped.

**Scenario D — mobile checklist vs desktop grid:** On a 375px phone, the user sees the monthly checklist first with the alert banners. The "Year view" button reveals the horizontal grid. On a 1440px desktop, the grid and the current-month panel are side by side.

## Context notes

- Instances are generated by `ensureInstances` on the server when the instances endpoint is called. The UI does not generate instances.
- Alert banners on this page use the same shared component as the dashboard (ticket 13). Do not duplicate the alert component.
- A DPS template requires a `savings_account_id` to be set before it can be enabled. If no DPS account exists, the user must create one first (linked to ticket 04/14).
- The monthly grid scrolls horizontally within its own container — it must not cause the page to overflow horizontally.
- Future months show placeholder rows (derived from the template, not stored instances). These are not interactive — no Mark Paid, no Skip. Only current and past months have real instances.

## Comments
