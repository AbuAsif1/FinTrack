# 08: Fixed Expenses

**What to build:** Fixed Expense templates and their monthly instances. Instances are created on read, marked Paid (which creates the Transaction), skipped or reopened. A DPS template pays into a savings account as a Transfer.

**Blocked by:** 06

**Status:** done

**Test cases:** `test-cases/11-fixed-expenses.md` (`TC-FIX`) · `test-cases/19-security.md` (extend `TC-SEC-001` to `TC-SEC-004` for the new endpoints)

**Read first:** `rules.md` §5 · `architecture.md` §Generated on read (`ensureInstances`), §Database schema (`fixed_expenses`, `fixed_expense_instances`), §Derived values (Fixed Commitments), §API (Fixed Expenses) · `brd.md` §5 FR-05 and §11 `AC-FIXED-1` · ADR-0009

- [ ] `GET /fixed-expenses`, `POST /fixed-expenses`, `PATCH /fixed-expenses/:id` (deactivating sets `end_month`); a template whose category routes to `SAVINGS_DEPOSIT` requires `savings_account_id`
- [ ] `ensureInstances(userId, month)` with every rule in `architecture.md` §Generated on read
- [ ] `GET /fixed-expense-instances?from=&to=`: stored instances for the current and past months, template-derived placeholders for future months, each with a display status (paid, due soon, overdue, pending, skipped, future)
- [ ] `POST /fixed-expense-instances/:id/pay`: actual amount and paid date; creates the Transaction through `CategoryRoutingService` and marks the instance `PAID` in one database transaction; an already-paid instance is 409 with the existing Transaction
- [ ] `POST /fixed-expense-instances/:id/skip` (optional note) and `POST /fixed-expense-instances/:id/reopen`
- [ ] Soft-deleting the paying Transaction returns the instance to `PENDING`
- [ ] `SUGGESTED_FIXED_EXPENSES` constant in `@fintrack/shared`: the seven defaults in `brd.md` FR-05 with name, amount, due day and category (YouTube Premium → Entertainment; the three DPS → DPS / Savings; Mess Rent → Rent; Home Internet and Home Electricity → Utility)
- [ ] Tests: `AC-FIXED-1`; due day 31 in a 30-day month and in February; a template created after its due day starts next month; paying a DPS instance raises the savings balance; paying twice is 409; a standard-amount change reaches only a `PENDING` current instance; deleting the Transaction un-pays the instance; a deactivated template creates no instance next month

---

## Why

Fixed expenses are the user's committed monthly outflows — rent, DPS installments, internet, electricity, subscriptions. Unlike ad-hoc spending, they are expected every month on a specific day. The app tracks them as templates (what should happen) and instances (what did happen this month). This gives the user an "am I on track this month?" view — overdue items alert, paid items are linked to their Transaction, skipped items explain why money wasn't spent. DPS instances are special: paying one also creates a savings deposit that updates the DPS account balance and feeds the tax rebate.

## User flows

### Setting up a fixed expense template
1. User opens Fixed Expenses → "Add template."
2. Name: "Mess Rent," amount: ৳8,000, due day: 5, category: "Rent" (routing NONE).
3. No end month set (ongoing). Saves.
4. The template appears in the monthly grid. This month's instance is generated the first time the instances endpoint is called (instances are created on read by `ensureInstances`).

### Setting up a DPS template
1. User adds "BRAC Bank DPS" template, amount ৳10,000, due day 10, category "DPS / Savings" (routing SAVINGS_DEPOSIT).
2. Required: selects which savings account (the BRAC DPS account from ticket 04).
3. Saves. Each month on day 10, an instance is generated.

### Paying a fixed expense
1. User opens Fixed Expenses. The current-month panel shows due and overdue items.
2. Taps "Mark as Paid" on "Mess Rent."
3. A drawer opens: actual amount (pre-filled ৳8,000), date (pre-filled today). User confirms.
4. `POST /fixed-expense-instances/:id/pay` creates the Transaction (via CategoryRoutingService) and marks the instance PAID atomically.
5. The cell in the monthly grid turns green (Paid).
6. For a DPS instance: the payment also increases the DPS account's balance (the Transaction has routing type SAVINGS_DEPOSIT).

### Skipping a fixed expense
1. The internet was not paid this month because the user is travelling.
2. User taps "Skip" on the Home Internet instance. Enters note: "Travelling — no service."
3. The instance is marked SKIPPED. The monthly grid shows a grey "Skipped" badge.
4. The dashboard's Fixed Commitments total excludes skipped items.

### Reopening a paid instance
1. User realises they marked the wrong month's instance as paid.
2. They find the paid instance in the grid → "Reopen."
3. The Transaction created by the payment is soft-deleted. The instance returns to PENDING.

## Scenarios

**Scenario A — due day 31 in February:** "BRAC Bank DPS" has due day 31. In February (28 days), the instance is due on the 28th. The `ensureInstances` logic shifts the due day to the last day of the month when the month is shorter.

**Scenario B — template created after due day:** User creates a "Home Electricity" template on the 20th, with due day 15. The current month's due day has passed. `ensureInstances` creates the first instance for next month, not the current month.

**Scenario C — paying twice:** User taps "Mark as Paid" on a PENDING instance. Before the response arrives, the network drops. They tap again. The second call returns 409 (already paid) with the existing Transaction. No double entry.

**Scenario D — deactivating a template:** User no longer pays the YouTube Premium subscription (cancelled). They deactivate the template from the Manage Templates screen. `PATCH /fixed-expenses/:id` sets `end_month` to the current month. No new instances are generated from next month onward.

## Context notes

- Instances are generated on read by `ensureInstances(userId, month)`, not by a cron job (ADR-0009). Every call to the instances list endpoint and the dashboard endpoint calls this function. It is idempotent — calling it twice creates no duplicates.
- The `SUGGESTED_FIXED_EXPENSES` constant in `@fintrack/shared` lists the seven defaults from `brd.md` FR-05. When a user first sets up Fixed Expenses, the UI offers these as checkboxes. The DPS ones require selecting a savings account before they can be enabled.
- Paying a Fixed Expense creates a Transaction through CategoryRoutingService. For DPS templates, the Transaction has routing type SAVINGS_DEPOSIT and updates the linked savings account balance.
- Soft-deleting the paying Transaction returns the instance to PENDING (enforced in CategoryRoutingService, ticket 06). The two operations happen in the same database transaction.
- Display statuses: PAID (green), DUE SOON (amber, within 3 days), OVERDUE (red, past due day), PENDING (grey), SKIPPED (grey with note), FUTURE (muted, not yet due in the current month).

## Comments
