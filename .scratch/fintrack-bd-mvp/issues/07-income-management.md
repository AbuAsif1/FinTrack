# 07: Income Management

**What to build:** The Income Entry API (salary, Profit Share, bonuses, Cheer, Holiday Support, TDS) and the Holiday Support log. Income Entries are the source for In-Hand Income and for the tax engine.

**Blocked by:** 02

**Status:** done

**Test cases:** `test-cases/10-income.md` (`TC-INC`) · `test-cases/19-security.md` (extend `TC-SEC-001` to `TC-SEC-004` for the new endpoints)

**Read first:** `rules.md` §2, §3, §6 · `architecture.md` §Database schema (`income_entries`, `holiday_support_entries`), §API (Income, Holiday Support) · `brd.md` §5 FR-03 and §11 `AC-TAX-2`

- [ ] `POST /income-entries`: month, income type, gross, TDS, taxable flag (default by type), employer name, comment and `idempotency_key`; Cheer adds payer name and earned period
- [ ] `fiscal_year` is set from the month on every write; TDS outside 0 to gross is 422
- [ ] `GET /income-entries` by `fiscal_year` or `month`, with In-Hand Income computed on read
- [ ] `PATCH /income-entries/:id` and `DELETE /income-entries/:id` (soft delete); a write to a locked Fiscal Year is 409 `TAX_YEAR_LOCKED`
- [ ] `GET /income-entries/summary?fiscal_year=`: twelve month rows from July to June with per-type amounts, TDS, In-Hand Income and Entered or Pending; year totals; the salary history timeline; the latest Salary entry for pre-fill
- [ ] Holiday Support log endpoints: `rate_paisa` pre-filled from the latest entry of the same rate type and stored on the entry; `amount_paisa` is days × rate; the month's total is returned for pre-filling a Holiday Support Income Entry
- [ ] Tests: In-Hand Income calculation; `AC-TAX-2`; June and July entries fall in different Fiscal Years; Certification Reimbursement defaults to not taxable; a duplicate key returns the original; a later Holiday Support rate leaves earlier entries' amounts unchanged; a locked year rejects writes

---

## Why

Income is the starting point for every financial calculation in the app. The dashboard's "In-Hand Income" (gross minus TDS) tells the user how much actually landed in their pocket. The tax engine uses gross income and TDS to calculate the annual tax liability. Without income entries, the dashboard is empty and the tax calculation cannot run. The Holiday Support log handles the owner's specific employer workflow where additional pay (holiday bonuses, Eid support) is calculated per-day based on a base daily rate — common in Bangladeshi corporate employment.

## User flows

### Recording monthly salary
1. User opens Income → "Add Income."
2. Type: Salary. Month: November 2026. Gross: ৳85,000. TDS: ৳11,040.
3. The form computes In-Hand Income (read-only): ৳85,000 − ৳11,040 = ৳73,960.
4. Taxable toggle: on (default for Salary).
5. User saves. The row appears in the November row of the year-to-date table.

### Recording a Cheer payment
1. Type: Cheer. Month: November 2026. Gross: ৳5,000. TDS: ৳0.
2. Additional fields appear: Payer name ("Sadiq Bhai"), Earned period (October 2026).
3. Saves. This is taxable (default for Cheer).

### Recording Holiday Support from the log
1. User opens the Holiday Support log on the Income page.
2. The last rate entries are pre-filled (e.g. ৳1,500/day for Eid days, ৳750/day for other holidays).
3. User records 2 Eid days and 1 holiday: total 3 days × various rates = ৳3,750.
4. Taps "Create Holiday Support Income Entry." The month's total (৳3,750) pre-fills the Income modal.
5. User confirms and saves. A Holiday Support income entry is created.

### Editing or deleting income
1. User spots an error: salary entered as ৳85,000 should be ৳87,000 (increment took effect this month).
2. Taps the row in the year-to-date table → Edit. Changes the gross.
3. TDS and In-Hand Income recalculate. Saves.
4. The tax calculation for the fiscal year updates on next load (derived on read, never stored).

## Scenarios

**Scenario A — fiscal year boundary:** User records their June 2026 salary in July 2026 (forgot to enter it at month end). The June entry falls in FY2025-26. The July salary falls in FY2026-27. `fiscal_year` is set by the server from the month field, not the entry date.

**Scenario B — Certification Reimbursement exempt:** User's employer reimburses a training certification (৳12,000). They record it as "Certification Reimbursement." The taxable toggle defaults to OFF (not taxable). The gross does not appear in Taxable Income in the tax calculation.

**Scenario C — TDS above gross rejected:** User accidentally enters TDS ৳15,000 on a gross of ৳10,000. The API returns 422. The form disables Save with an inline error.

**Scenario D — locked fiscal year:** User tries to edit a June 2025 income entry after they have filed their FY2024-25 tax return and the year is locked. The API returns 409 `TAX_YEAR_LOCKED`. The edit form shows a "This fiscal year is locked" message.

## Context notes

- `fiscal_year` is derived from `month` on every write using `fiscalYear(month)`. The user never sets it directly.
- In-Hand Income = gross − TDS. This is computed on read in the API, never stored.
- The `taxable` flag defaults by income type: Salary → true, Certification Reimbursement → false. The user can override it. The tax engine ignores entries where `taxable = false`.
- Holiday Support rate entries store the rate; the amount for each entry is days × rate. The rate on a new entry is pre-filled from the most recent entry of the same rate type. Changing the rate on a past entry does NOT retroactively change older entries' amounts.
- TDS outside the range [0, gross] is 422. Zero TDS is valid (some income types have no withholding tax).
- A write to a locked fiscal year is 409 `TAX_YEAR_LOCKED`. Check the `locked_at` field on `tax_years` before writing.

## Comments
