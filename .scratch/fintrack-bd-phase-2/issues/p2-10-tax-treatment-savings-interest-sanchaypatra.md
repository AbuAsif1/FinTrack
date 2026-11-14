# p2-10: Tax Treatment of Savings Interest and Sanchaypatra Profit

**Status:** needs-triage
**Phase:** 2
**Spec ref:** Phase 2 §10

---

## What to build

Correct tax handling for two income streams that have tax deducted at source (TDS) in Bangladesh:

1. **Bank savings interest** — TDS is deducted by the bank before the interest is credited. The user needs to record both the gross interest and the TDS amount, and have the gross interest included in their total income while the TDS amount reduces their final tax payable.

2. **Sanchaypatra profit** — same treatment: the government deducts a percentage at source. The user records the net amount received and the TDS, and the system handles the gross-up and tax credit correctly.

Both are currently absent from the tax calculation. Users who have savings accounts or Sanchaypatra instruments see an incomplete tax picture.

---

## Why

Bangladeshi tax rules require a taxpayer to declare the gross amount of bank interest and Sanchaypatra profit (before TDS), and then claim the TDS as a tax credit — reducing the final amount they owe to NBR. If the app ignores these income streams, it underestimates total income and misses a tax credit, giving an inaccurate tax liability figure. For the app's target user (salaried, with savings accounts and possibly Sanchaypatra), this is a material omission.

---

## User flows

### Recording bank interest with TDS
1. User receives bank interest credit. Their bank statement shows: Gross interest ৳10,000 — TDS ৳1,500 — Net credited ৳8,500.
2. User opens **Income → Add income** (or directly on the savings account page).
3. Source: "Bank savings interest."
4. Fields:
   - **Gross interest** (৳10,000) — required
   - **TDS deducted** (৳1,500) — required; the form calculates and shows the net: ৳8,500
   - **Bank account** — which savings account this relates to
   - **Date** — the credit date
5. User saves. The record stores both gross and TDS amounts.

### Recording Sanchaypatra profit
1. User receives a Sanchaypatra profit payment. The certificate or bank credit shows: Gross profit ৳50,000 — TDS ৳5,000 — Net paid ৳45,000.
2. User opens **Savings Accounts → [Sanchaypatra record] → Record profit received**.
3. Same fields as bank interest: gross profit, TDS, date.
4. Saves.

### Effect on the Tax Dashboard
- **Total income**: gross bank interest and gross Sanchaypatra profit are included in the total taxable income figure (before exemptions and rebates).
- **Tax payable calculation**: TDS amounts are summed and shown as "Tax already paid (TDS on interest/profit)." This reduces the final tax payable.
- The Tax Dashboard shows: Gross tax on income − TDS paid = **Net tax payable to NBR**.
- The user can see clearly: "You have already paid ৳6,500 in TDS on savings income. Your remaining tax payable is ৳X."

### Tax Dashboard breakdown
- A new line item in the Tax Dashboard income section: "Savings interest & Sanchaypatra profit: ৳60,000 (gross)"
- A new line in the deductions/credits section: "TDS on savings income: ৳6,500"

---

## Scenarios

**Scenario A — savings account holder:** A user has ৳5,00,000 in a Standard Chartered savings account earning 4% per year. At year end, the bank credits ৳20,000 interest but deducts ৳3,000 TDS. The user records this. Their taxable income rises by ৳20,000; their tax payable falls by ৳3,000. The Tax Dashboard shows the net effect correctly.

**Scenario B — Sanchaypatra investor:** A user holds ৳10,00,000 in 5-year Sanchaypatra. Each November, a profit instalment arrives: ৳77,500 gross, ৳7,750 TDS, ৳69,750 net. The user records this on the Sanchaypatra savings account page. The tax calculation includes ৳77,500 as income and ৳7,750 as TDS credit.

**Scenario C — multiple accounts:** A user has two savings accounts (BRAC Bank and Standard Chartered) and one Sanchaypatra. They record interest/profit for each. The Tax Dashboard shows the aggregate correctly.

**Scenario D — TDS rate changes:** If the NBR changes the TDS rate for a new fiscal year, the user enters the actual amounts from their bank/certificate, so the calculation remains correct regardless of the rate — the user enters what was actually deducted, not what the system calculates.

---

## Impact areas

- New income sub-type: `SAVINGS_INTEREST` and `SANCHAYPATRA_PROFIT` (or a generalised `TDS_INCOME` type)
- New DB fields: `gross_amount_paisa`, `tds_amount_paisa` on interest/profit income records (or a new `savings_income` table)
- Tax calculation engine (`brd.md` §6) must include gross savings income in total income and sum TDS as a credit
- The tax year parameters (`brd.md` §6, ticket 24) may need TDS rate reference values (for validation/display, not calculation — user-entered amounts are authoritative)
- Income API and Income UI must support recording these new income types with gross + TDS fields
- Tax Dashboard UI must show the new income and TDS credit lines
- Existing income records for Sanchaypatra profit (if any users have recorded them as plain income) may need migration or re-entry

---

## Decisions needed before build

- Should bank interest and Sanchaypatra profit be recorded as a special type of income entry, or as a separate section on the savings account / Sanchaypatra record page? (Recommend: linked to the savings account record — it makes the connection explicit and avoids confusion with salary income.)
- Confirm the exact BD tax rule for savings interest inclusion and TDS credit treatment with `brd.md` §6 and ticket 24.
- How to handle DPS maturity interest — is it taxed the same way as savings interest? (DPS maturity income is a separate question; include only if confirmed in `brd.md` §6.)

---

## Blocked by

- Ticket 07 (Income Management API) — the income data model must be stable.
- Ticket 09 (Tax Dashboard API) — the tax calculation engine must support the new income and TDS credit lines.
- **Ticket 24 (Confirm Tax Parameters)** — the specific TDS rules must be confirmed before coding the tax treatment.

## Comments

<!-- Append discussion below this line -->
