# Test cases: Dashboard and analytics

Ticket 11. Read `README.md` in this folder first. "Today" is set by the test clock.

## Suite classification

| Suite | Included case IDs |
|-------|------------------|
| **Smoke** | TC-DASH-001 |
| **Happy Path** | Smoke + TC-DASH-002, TC-DASH-003, TC-DASH-004, TC-DASH-006, TC-DASH-007, TC-DASH-008, TC-DASH-009, TC-DASH-012, TC-DASH-014, TC-DASH-015, TC-DASH-016, TC-DASH-017, TC-DASH-018, TC-DASH-019, TC-DASH-022 |
| **Full Regression** | All cases above plus TC-DASH-005, TC-DASH-010, TC-DASH-011, TC-DASH-013, TC-DASH-020, TC-DASH-021 |

> **Smoke** runs the `AC-CASH-1` month fixture — proves all cash-panel derived values are correct. **Happy Path** covers every P1 period, income-estimation, category breakdown and generated-on-read case. **Full Regression** adds P2 null-savings-rate, period-arithmetic, change-indicators, compliance and trend cases.

---

| ID | Test case | Expected | Seam | P | Covers |
|---|---|---|---|---|---|
| TC-DASH-001 | The `AC-CASH-1` month | Fixed Commitments ৳60,732; Discretionary Cash ৳79,268; Remaining to Spend ৳79,768 | API | P1 | AC-CASH-1 |
| TC-DASH-002 | Period tiles for the `AC-CASH-1` month | Total Spending ৳3,160; Net Savings ৳1,36,840; Savings Rate 97.7% | API | P1 | AC-CASH-1 |
| TC-DASH-003 | A month with a deposit, a loan given and a Tax Payment but no Spending | Total Spending ৳0.00 | API | P1 | ADR-0006 |
| TC-DASH-004 | A Tax Payment in the period | Net Savings falls by it; Total Spending does not rise | API | P1 | architecture §Derived values |
| TC-DASH-005 | A period with no income | Savings Rate is null | API | P2 | architecture §Derived values |
| TC-DASH-006 | A Savings Interest entry this month | Remaining to Spend is unchanged | API | P1 | architecture §Category routing |
| TC-DASH-007 | The current month has no Salary entry but last month has one | Cash figures use last month's In-Hand salary; `income_is_estimated` is true | API | P1 | FR-02 |
| TC-DASH-008 | This month's Salary is entered | `income_is_estimated` is false | API | P1 | FR-02 |
| TC-DASH-009 | Request last month as the period | The cash panel still describes the current month | API | P1 | FR-02 |
| TC-DASH-010 | Period "This Tax Year" on 12 November 2026 | Figures cover 1 July 2026 to 30 June 2027 | API | P2 | FR-02 |
| TC-DASH-011 | Tile change indicators with and without data in the previous period | The difference from the previous equal-length period; null when that period has no data | API | P2 | FR-02 |
| TC-DASH-012 | Spending by category | The parts add up to Total Spending | API | P1 | FR-02 |
| TC-DASH-013 | Six-month series | Six months of In-Hand Income and Total Spending, oldest first | API | P2 | FR-02 |
| TC-DASH-014 | Fixed Expense panel | The current month's instances with their display status | API | P1 | FR-02 |
| TC-DASH-015 | Recent Transactions | The ten newest, with deleted ones left out | API | P1 | FR-02 |
| TC-DASH-016 | Loan summary on the dashboard | The same figures as the loans summary | API | P1 | FR-02 |
| TC-DASH-017 | Tax snapshot | Tax Paid, forecast Remaining Tax, Suggested Monthly TDS and `is_provisional` for the current Fiscal Year | API | P1 | FR-02 |
| TC-DASH-018 | Open the dashboard in a new month | That month's Fixed Expense instances exist and the unread count is current | API | P1 | ADR-0009 |
| TC-DASH-019 | Monthly analytics for three months | Per month: In-Hand Income, Total Spending, Net Savings, TDS, Savings Rate | API | P1 | FR-08 |
| TC-DASH-020 | Fixed Expense compliance for a month with an on-time, a late, a skipped and an unpaid instance | One of each | API | P2 | FR-08 |
| TC-DASH-021 | Category trend for 12 months; income trend for a Fiscal Year | Monthly totals per category; monthly totals per income type | API | P2 | FR-08 |
| TC-DASH-022 | Summary with 500 Transactions | Under 2 seconds, warm | Check | P1 | architecture §Performance targets |
