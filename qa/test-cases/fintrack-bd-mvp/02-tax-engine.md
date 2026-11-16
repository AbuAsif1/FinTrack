# Test cases: Tax engine

Ticket 01. Read `README.md` in this folder first. Every case calls `calculateTax` or `forecastTax` directly with the settings passed in; "FY2025-26 settings" and "FY2024-25 settings" are the seeded values in `brd.md` §6 FR-TAX-03.

## Suite classification

| Suite | Included case IDs |
|-------|------------------|
| **Smoke** | TC-TAXE-001 |
| **Happy Path** | Smoke + TC-TAXE-002, TC-TAXE-003, TC-TAXE-004, TC-TAXE-006, TC-TAXE-007, TC-TAXE-008, TC-TAXE-009, TC-TAXE-010, TC-TAXE-011, TC-TAXE-012, TC-TAXE-013, TC-TAXE-014, TC-TAXE-018, TC-TAXE-019, TC-TAXE-020, TC-TAXE-021, TC-TAXE-022, TC-TAXE-024, TC-TAXE-027 |
| **Full Regression** | All cases above plus TC-TAXE-005, TC-TAXE-015, TC-TAXE-016, TC-TAXE-017, TC-TAXE-023, TC-TAXE-025, TC-TAXE-026, TC-TAXE-028 |

> **Smoke** runs the full `AC-TAX-1` calculation — if it passes, the engine is fundamentally correct. **Happy Path** covers every P1 engine case. **Full Regression** adds P2/P3 rebate-cap, early-filing, forecast and edge-case scenarios.

---

| ID | Test case | Expected | Seam | P | Covers |
|---|---|---|---|---|---|
| TC-TAXE-001 | The `AC-TAX-1` inputs | Every figure in the `AC-TAX-1` table, to the Paisa | Engine | P1 | AC-TAX-1 |
| TC-TAXE-002 | Slab breakdown for `AC-TAX-1` | ৳0 · ৳30,000 · ৳60,000 · ৳86,369.20, with ৳4,31,846 in the 20% slab | Engine | P1 | AC-TAX-1 |
| TC-TAXE-003 | DPS invested ৳8,00,000 against a ৳1,20,000 cap | Eligible DPS is ৳1,20,000 | Engine | P1 | FR-TAX-02 |
| TC-TAXE-004 | `AC-TAX-1` with eligible investment of ৳10,00,000 | Rebate ৳45,205.38, limited by the income rate | Engine | P1 | FR-TAX-02 |
| TC-TAXE-005 | `AC-TAX-1` with the rebate maximum set to ৳10,000 | Rebate ৳10,000.00 | Engine | P2 | FR-TAX-02 |
| TC-TAXE-006 | Gross Tax smaller than every rebate candidate | Rebate equals Gross Tax; tax after rebate is not negative | Engine | P1 | FR-TAX-02 |
| TC-TAXE-007 | Nine Salary entries of ৳1,22,700 and three of ৳1,53,383 | Salary Gross Income ৳15,64,449.00 | Engine | P1 | AC-TAX-2 |
| TC-TAXE-008 | `AC-TAX-1` with TDS ৳1,40,000 and three salary months remaining | Remaining Tax −৳4,630.80; Suggested Monthly TDS ৳0.00 | Engine | P1 | AC-TAX-3 |
| TC-TAXE-009 | Gross Income ৳20,06,846 under FY2024-25 settings | Exemption ৳4,50,000; Taxable ৳15,56,846; Gross Tax ৳1,61,369.20 | Engine | P1 | AC-TAX-4 |
| TC-TAXE-010 | Gross Income ৳6,00,000, FY2025-26 settings, no investments | Taxable ৳4,00,000; Gross Tax ৳2,500; Net Tax Payable ৳5,000 | Engine | P1 | AC-TAX-5 |
| TC-TAXE-011 | Gross Income ৳5,62,500 (Taxable Income exactly ৳3,75,000) | Gross Tax ৳0.00; Net Tax Payable ৳0.00; Minimum Tax not applied | Engine | P1 | FR-TAX-02 |
| TC-TAXE-012 | Taxable Income just above the threshold with tax below ৳5,000 | Net Tax Payable ৳5,000.00; `minimum_tax_applied` true | Engine | P1 | FR-TAX-02 |
| TC-TAXE-013 | `AC-TAX-1` filed on 2026-09-15 | Early Filing Rebate ৳6,768.46; Net ৳1,28,600.74; Remaining −৳3,887.26 | Engine | P1 | AC-TAX-6 |
| TC-TAXE-014 | `AC-TAX-1` filed on 2026-10-01 | No Early Filing Rebate; figures as `AC-TAX-1` | Engine | P1 | AC-TAX-6 |
| TC-TAXE-015 | Tax after rebate of ৳6,00,000, filed in the window | Early Filing Rebate ৳25,000.00 (the maximum) | Engine | P2 | FR-TAX-02 |
| TC-TAXE-016 | FY2024-25 settings (no early-filing rule), filed in September | Early Filing Rebate ৳0.00 | Engine | P2 | FR-TAX-03 |
| TC-TAXE-017 | Not yet filed, inside the window | Applied rebate ৳0.00; the potential rebate is reported separately | Engine | P2 | FR-TAX-02 |
| TC-TAXE-018 | One entry flagged not taxable among taxable ones | It is left out of Gross Income | Engine | P1 | FR-03 |
| TC-TAXE-019 | TDS ৳1,00,000 and Tax Payments ৳20,000 | Tax Paid ৳1,20,000.00 | Engine | P1 | FR-TAX-02 |
| TC-TAXE-020 | `asOf` 2026-02-10 with Salary entered for July to January | Five remaining salary months; Suggested Monthly TDS is Remaining Tax ÷ 5, rounded half-up | Engine | P1 | FR-TAX-02 |
| TC-TAXE-021 | `asOf` after the Fiscal Year has ended | Zero remaining salary months; Suggested Monthly TDS is null | Engine | P1 | FR-TAX-02 |
| TC-TAXE-022 | `AC-TAX-1` | Further investment for maximum rebate ৳42,053.80 | Engine | P1 | AC-TAX-1 |
| TC-TAXE-023 | Eligible investment already above what the maximum rebate needs | Further investment ৳0.00 | Engine | P2 | FR-TAX-02 |
| TC-TAXE-024 | `forecastTax` with Salary of ৳1,22,700 for July to September, `asOf` in October | Projected Gross Income ৳14,72,400 (twelve months); result marked as a projection | Engine | P1 | FR-TAX-05 |
| TC-TAXE-025 | `forecastTax` when a Profit Share entry exists | Profit Share is counted once and not projected into later months | Engine | P2 | FR-TAX-05 |
| TC-TAXE-026 | No Income Entries | Every figure is zero; Minimum Tax not applied | Engine | P2 | FR-TAX-02 |
| TC-TAXE-027 | The same input passed twice, at different real times | Identical results | Engine | P1 | rules §7 |
| TC-TAXE-028 | Entries in seven distinct months | `months_entered` is 7 | Engine | P3 | FR-TAX-07 |
