# 09: Tax API

**What to build:** The tax endpoints that gather a Fiscal Year's settings, Income Entries, investments and Tax Payments, call the pure tax engine and return the full breakdown; plus the endpoints for editing a year's tax settings, confirming them, and marking a return filed.

**Blocked by:** 06, 07

**Status:** done

**Test cases:** `test-cases/12-tax-api.md` (`TC-TAX`) · `test-cases/19-security.md` (extend `TC-SEC-001` to `TC-SEC-004` for the new endpoints)

**Read first:** `rules.md` §7 · `architecture.md` §Tax engine, §Generated on read (`ensureTaxYear`), §Derived values (DPS total, Sanchaypatra total, Tax Paid), §API (Tax) · `brd.md` §6 (all) and §11 `AC-TAX-1`, `AC-TAX-6` · ADR-0008

- [ ] `GET /tax/summary?fiscal_year=`: loads the year's settings, Income Entries, derived DPS and Sanchaypatra totals, `tax_investments` and Tax Payments; calls `calculateTax`; returns the full `TaxResult` with `is_provisional` and the filing state. A filed year returns its stored snapshot.
- [ ] `GET /tax/forecast?fiscal_year=` using `forecastTax`
- [ ] `GET /tax/compare?fiscal_year=` as defined in `brd.md` FR-TAX-06
- [ ] `GET /tax-years`, `GET /tax-years/:fiscalYear`, `PUT /tax-years/:fiscalYear` (validated with the `TaxYearConfig` schema; a change clears `config_confirmed_at`), `POST /tax-years/:fiscalYear/confirm`
- [ ] `POST /tax-years/:fiscalYear/file` (`filed_on`; stores the `TaxResult` snapshot and locks the year) and `POST /tax-years/:fiscalYear/reopen`
- [ ] `GET /tax-investments/:fiscalYear` and `PUT /tax-investments/:fiscalYear` (stocks, insurance, others)
- [ ] `ensureTaxYear` creates a missing year as a provisional copy of the latest earlier year
- [ ] No tax rate, cap or threshold appears in this code; everything comes from `config_json`
- [ ] Tests: `AC-TAX-1` end to end from seeded Income Entries, DPS deposits, a Sanchaypatra deposit and `others_paisa`; `AC-TAX-6` through file and reopen; editing settings changes the result and marks the year provisional; a locked year rejects writes with 409 `TAX_YEAR_LOCKED`; a Tax Payment dated in September and assigned to the previous Fiscal Year counts for that year; a not-yet-existing year is created provisional

---

## Why

The tax calculation is the most complex feature of the app. The user is a salaried Bangladeshi professional subject to NBR income tax with rebates for DPS, Sanchaypatra, life insurance, and provident fund investments. Without a correct tax API, the tax dashboard cannot show the user their estimated liability, Suggested Monthly TDS, or whether they are on track to avoid a shortfall at year end. The API calls the pure tax engine (ticket 01) with data gathered from income entries, savings deposits, and direct investment inputs — keeping the engine free of I/O while making the data gathering centralised and testable.

## User flows

### Viewing the current fiscal year's tax summary
1. User opens the Tax Dashboard.
2. `GET /tax/summary?fiscal_year=2026-27` runs:
   - Loads the fiscal year's `config_json` (tax rates, caps, threshold).
   - Aggregates gross income and TDS from income entries.
   - Computes DPS total (from savings deposits), Sanchaypatra total (from savings deposits).
   - Loads `tax_investments` (stocks, insurance, others — user-entered).
   - Loads Tax Payments (actual taxes paid to NBR this year).
   - Calls `calculateTax(input)`. Returns the full `TaxResult`.
3. The UI renders: Taxable Income, Gross Tax, Rebate, Net Tax, TDS paid, Remaining Tax, Suggested Monthly TDS.
4. If `is_provisional = true`, a yellow banner says "Tax parameters not yet confirmed for this year."

### Forecasting tax for the full year
1. User opens the Tax Dashboard → Forecast tab.
2. `GET /tax/forecast?fiscal_year=2026-27` calls `forecastTax` which projects the remaining months' income as the same as the most recent month.
3. Shows: Projected Annual Income, Projected Net Tax, Suggested Monthly TDS for the remaining months.

### Editing tax settings
1. User opens Settings → Tax Year Settings.
2. Edits the tax-free threshold for FY2025-26 (following confirmation from the NBR notice).
3. `PUT /tax-years/2025-26` saves the new config and clears `config_confirmed_at`.
4. Immediately, the Tax Dashboard recalculates with the new settings.

### Filing the return
1. User files their tax return on 2026-09-15.
2. Opens Tax Dashboard → `POST /tax-years/2025-26/file` with `filed_on: 2026-09-15`.
3. The current `TaxResult` snapshot is stored. The year is locked. All income entry writes for FY2025-26 now return 409 `TAX_YEAR_LOCKED`.
4. The tax dashboard shows "Return filed on 2026-09-15 — Early Filing Rebate applied."

## Scenarios

**Scenario A — provisional year at the start of July:** On 1 July 2026, `ensureTaxYear` auto-creates FY2026-27 as a provisional copy of FY2025-26's config. The user sees `is_provisional = true`. They can start recording income. The tax calculation runs with provisional parameters.

**Scenario B — Tax Payment in the previous fiscal year:** User makes a tax payment in September 2026 and assigns it to FY2025-26 (`tax_fiscal_year: "2025-26"` on the transaction). `GET /tax/summary?fiscal_year=2025-26` includes this payment in Tax Paid. The remaining tax (or overpayment) updates accordingly.

**Scenario C — filing with early filing rebate:** User files on 2026-08-20 (before 30 September). `POST /tax-years/2025-26/file` stores the snapshot. If the Early Filing Rebate conditions are met (filed between 1 July and 30 September), the rebate is included in the stored snapshot and displayed.

**Scenario D — reopening a filed year:** User discovers an income entry error after filing. They reopen the year (`POST /tax-years/2025-26/reopen`). The lock is removed. They correct the entry. They re-file. The new snapshot overwrites the old one.

## Context notes

- No tax rate, cap, or threshold is hardcoded in this ticket's code. Everything comes from `config_json` on the `tax_years` row (ADR-0008). If a constant appears in a route handler, it is a bug.
- `is_provisional = true` means the config has not been confirmed by the user against the actual Finance Act. The tax result is correct given the stored config, but the config itself may need adjustment (see ticket 24).
- `ensureTaxYear(userId, fiscalYear)` creates a missing year as a provisional copy of the most recent earlier year. It runs on every request that accesses a tax year. It is idempotent.
- DPS total and Sanchaypatra total are derived from savings deposits (ticket 04), not from a stored column. The tax API must join through `savings_accounts` and `transactions` to compute these.
- The `TaxResult` snapshot stored on `file` is the definitive record. It must not be recomputed after locking. `GET /tax/summary` for a locked year returns the stored snapshot, not a fresh calculation.
- Compare Years (`GET /tax/compare`) shows three fiscal years side by side. It calls `calculateTax` or returns the stored snapshot for each year.

## Comments
