# 24: Confirm tax parameters against NBR rules

**What to decide:** The seeded tax settings follow your tax spreadsheet. Published summaries disagree with it in the places below. Confirm each value from the enacted Finance Act, NBR, or your tax adviser. Then either correct it in the app (Settings → Tax Year Settings) or ask an agent to update the seed and `brd.md` §6 FR-TAX-03.

**Blocked by:** None. It blocks nothing, because every value is editable in the app.

**Status:** ready-for-human

**Read first:** `brd.md` §6 FR-TAX-03 and §11 `AC-TAX-1` · ADR-0008

## Questions

- [ ] **1. Rebate investment rate for FY2025-26.** Seeded 10% (your spreadsheet). KPMG's June 2025 summary says 15% of actual investment. Later commentary says the Finance Act 2026 cut the rate to 10%, but not from which year. At 15%, `AC-TAX-1` would have a rebate of ৳45,205.38 and net tax of ৳1,31,163.82, so TDS of ৳1,32,488 would be an overpayment of ৳1,324.18.
- [ ] **2. Rebate maximum.** Seeded ৳10,00,000 for all years. Commentary on the Finance Act 2026 gives ৳7,50,000.
- [ ] **3. Tax-free threshold for FY2025-26 and FY2026-27.** Seeded ৳3,75,000 (your spreadsheet and the KPMG summary). PwC's tax summary, reviewed 31 July 2026, gives ৳4,00,000 for "FY 2025/26 and FY 2026/27". At ৳4,00,000, gross tax in `AC-TAX-1` would be ৳1,71,369.20, which is ৳5,000 lower.
- [ ] **4. Salary exemption cap.** Seeded ৳4,50,000 for FY2024-25 and ৳5,00,000 from FY2025-26. No source read during the review confirmed either figure.
- [ ] **5. What counts as taxable salary income.** Is Cheer from a colleague taxable? Is Certification Reimbursement exempt? Does the one-third exemption apply to all income or only to salary from the employer? The app applies it to all taxable Income Entries, as your spreadsheet does.
- [ ] **6. Minimum Tax for FY2024-25.** Seeded ৳5,000. The KPMG summary gives ৳5,000 for Dhaka and Chattogram city corporations, ৳4,000 for other city corporations and ৳3,000 elsewhere.
- [ ] **7. Early Filing Rebate.** Seeded from FY2025-26 as 5% of tax after rebate, maximum ৳25,000, for a return filed between 1 July and 30 September (PwC). Confirm the first year it applies and what the 5% is taken from.
- [ ] **8. Investment caps.** Seeded DPS ৳1,20,000, Sanchaypatra ৳5,00,000, stocks ৳5,00,000. PwC notes that a ৳5,00,000 cap on mutual funds and unit certificates has been removed.
- [ ] **9. Spreadsheet reconciliation.** Your sheet shows net tax ৳1,35,225 and remaining ৳2,737 for FY2025-26. The documented formula with the documented inputs gives ৳1,35,369.20 and ৳2,881.20. The ৳144.20 gap equals 10% of ৳1,442, so check whether the sheet's eligible investment is ৳4,11,442 rather than ৳4,10,000. If it is, record the exact inputs here so `AC-TAX-1` can be updated.

## Why

The app's tax calculations are only as accurate as its seeded parameters. The owner's personal spreadsheet is the primary source, but several parameters differ from published KPMG and PwC summaries. Getting these wrong means the owner sees an incorrect tax liability and either over-pays TDS or is surprised at filing time. This ticket exists because the seed values cannot be verified programmatically — they require the owner to check the enacted Finance Act, NBR circulars, or their tax adviser, then confirm or correct each one. Because all parameters are editable in Settings → Tax Year Settings, an incorrect seed can be fixed without a code change, but an ADR and/or correction to `brd.md §6` should follow once the correct values are confirmed.

---

## User flows

### Owner verifies a parameter
1. Owner reads the question list in this ticket (or the equivalent in `brd.md §6`).
2. Owner locates the original source (Finance Act PDF, NBR circular, adviser note).
3. Owner compares the seeded value against the confirmed source.
4. If correct: tick the checkbox and note the confirming source in the Comments section.
5. If wrong: open **Settings → Tax Year Settings** in the app and update the value there. Then ask an agent to update the seed migration and `brd.md §6` with the corrected figure and the source.

### Updating a seeded parameter via agent
1. Owner posts the confirmed value and source in the ticket's Comments section.
2. Owner asks the agent to update the seed for the affected fiscal year(s).
3. Agent updates the Prisma seed, `brd.md §6`, and `AC-TAX-1` fixtures if the acceptance figures change.
4. Owner re-runs the test suite to confirm `AC-TAX-1` still passes with the corrected parameters.

---

## Scenarios

**Scenario A — rebate rate confirmed at 10%:** Owner checks the Finance Act 2026 and confirms the investment rebate rate dropped from 15% to 10% effective FY2025-26. The seeded value is correct. Tick the checkbox; no code change needed.

**Scenario B — tax-free threshold raised:** PwC says ৳4,00,000 for FY2025-26 and FY2026-27. Owner's adviser confirms this. The seeded ৳3,75,000 is wrong. Owner updates Settings → Tax Year Settings for both years. Owner asks agent to correct the seed. Agent updates `brd.md §6`, the seed, and `AC-TAX-1`'s expected figures.

**Scenario C — salary exemption cap unknown:** No source confirms the ৳4,50,000 / ৳5,00,000 caps seeded in the app. Owner asks their CA; CA provides the confirmed figure with an NBR citation. Owner posts the citation in Comments. Agent updates the seed.

**Scenario D — spreadsheet reconciliation:** The ৳144.20 gap between the spreadsheet and the formula hints that the eligible investment input differs by ৳1,442. Owner checks their original spreadsheet and confirms the eligible investment was ৳4,11,442, not ৳4,10,000. Owner posts the confirmed inputs; agent updates `AC-TAX-1` to use ৳4,11,442, and the acceptance test figures align with the spreadsheet.

---

## Context notes

- This ticket has no code deliverable — its output is confirmed checkbox values, notes in Comments, and (if corrections are needed) separate agent requests to update the seed and `brd.md §6`.
- None of the other tickets are blocked by this one; every tax parameter is editable in-app without a code change.
- If `AC-TAX-1` fixtures change, the agent updating the seed must also update the acceptance test expected values in `brd.md §11`.
- The same parameters feed the what-if tax planner (Phase 2 p2-09), so confirming them now avoids rework when that feature is built.

## Sources

- KPMG, Salient features of Finance Ordinance 2025: https://assets.kpmg.com/content/dam/kpmg/bd/pdf/TaxUpdate/Salient_features_of_Finance_Ordinance_June_2025.pdf
- PwC Tax Summaries, Bangladesh, taxes on personal income: https://taxsummaries.pwc.com/bangladesh/individual/taxes-on-personal-income
- PwC Tax Summaries, Bangladesh, tax administration: https://taxsummaries.pwc.com/bangladesh/individual/tax-administration
- PwC, Finance Act 2026 key amendments (could not be opened during the review): https://www.pwc.com/bd/en/assets/pdfs/budget/finance-act-2026-key-amendments.pdf

## Comments
