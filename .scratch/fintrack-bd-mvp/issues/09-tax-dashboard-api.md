# 09: Tax API

**What to build:** The tax endpoints that gather a Fiscal Year's settings, Income Entries, investments and Tax Payments, call the pure tax engine and return the full breakdown; plus the endpoints for editing a year's tax settings, confirming them, and marking a return filed.

**Blocked by:** 06, 07

**Status:** ready-for-agent

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

## Comments
