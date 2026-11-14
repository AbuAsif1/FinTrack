# Test cases: Account types, Parent Accounts and the Bank & Wallet page

Phase 2 ticket p2-22. Read this README first.

## Suite classification

| Suite | Included case IDs |
|-------|------------------|
| **Smoke** | TC-P2ACC-003, TC-P2ACC-007, TC-P2ACC-012 |
| **Happy Path** | Smoke + TC-P2ACC-001, TC-P2ACC-002, TC-P2ACC-005, TC-P2ACC-006, TC-P2ACC-008, TC-P2ACC-010, TC-P2ACC-011, TC-P2ACC-013, TC-P2ACC-016, TC-P2ACC-017, TC-P2ACC-018, TC-P2ACC-019, TC-P2ACC-020, TC-P2ACC-021 |
| **Full Regression** | All cases above plus TC-P2ACC-004, TC-P2ACC-009, TC-P2ACC-014, TC-P2ACC-015 |

> Smoke covers the three money paths a user hits daily: paying an expense from an account, receiving income into an account, and reading the totals.

Every case asserts the balance of **each** account the entry touches, read back through `GET /api/v1/savings-accounts`, not only the status code of the write.

---

| ID | Test case | Expected | Seam | P | Covers |
|---|---|---|---|---|---|
| TC-P2ACC-001 | Create DPS and FDR accounts: without `parent_account_id`; with a Savings parent; with an MFS parent; with a DPS as parent | 422 / 201 / 201 / 422. A created child returns its `parent_account_id` | API | P1 | Parent Account rule |
| TC-P2ACC-002 | Create Sanchaypatra or Investment with a `parent_account_id`; create a Savings account with a parent | 422 for both: only DPS and FDR take a parent | API | P1 | Parent Account rule |
| TC-P2ACC-003 | Spending ৳1,500 paid by `BANK` from an MFS account opened at ৳10,000 | 201; MFS balance ৳8,500 | API | P1 | Payment Account |
| TC-P2ACC-004 | Spending paid by `BANK` with a DPS account as the source | 422 `ACCOUNT_NOT_PAYABLE`; DPS balance unchanged; no transaction written | API | P2 | Payment Account |
| TC-P2ACC-005 | In-Hand Cash opened at ৳2,000; Spending ৳300 paid by `CASH` with no account id | Cash balance ৳1,700 | API | P1 | In-Hand Cash |
| TC-P2ACC-006 | DPS (parent BRAC Savings ৳50,000) installment ৳5,000 paid from a bKash MFS account at ৳20,000 | bKash ৳15,000; DPS ৳5,000; BRAC unchanged ৳50,000 | API | P1 | Funding Account |
| TC-P2ACC-007 | Income gross ৳80,000, TDS ৳8,000 received into BRAC Savings at ৳10,000 | BRAC ৳82,000 | API | P1 | Income credit |
| TC-P2ACC-008 | Income with a DPS as the receiving account | 422 `ACCOUNT_NOT_PAYABLE`; nothing written | API | P1 | Income credit |
| TC-P2ACC-009 | Soft-delete the income from TC-P2ACC-007 | BRAC back to ৳10,000 | API | P2 | Soft delete |
| TC-P2ACC-010 | From BRAC ৳50,000: Loan given ৳4,000 by `BANK`; Loan received ৳1,000 by `BANK`; Tax Payment ৳2,000 by `BANK` | BRAC ৳45,000 | API | P1 | Loans and tax move money |
| TC-P2ACC-011 | DPS at ৳30,000 under BRAC ৳10,000; Savings Withdrawal ৳30,000 from the DPS | DPS ৳0; BRAC ৳40,000 | API | P1 | Withdrawal returns to parent |
| TC-P2ACC-012 | Totals: BRAC ৳10,000 + its DPS ৳5,000; bKash ৳2,000 + its DPS ৳1,000; Cash ৳500; Sanchaypatra ৳20,000; then ৳1,000 Spending from BRAC | `totals`: bank ৳14,000, mfs ৳3,000, cash ৳500, investment ৳20,000, net_worth ৳37,500; dashboard `net_worth_paisa` equals 3750000 | API | P1 | Bank & Wallet totals |
| TC-P2ACC-013 | Transfer ৳1,000 BRAC → In-Hand Cash; then a transfer out of a DPS | BRAC −৳1,000, Cash +৳1,000; DPS transfer 422 `ACCOUNT_NOT_PAYABLE` | API | P1 | Transfer |
| TC-P2ACC-014 | A second In-Hand Cash account | 409 `CASH_ACCOUNT_EXISTS` | API | P2 | In-Hand Cash |
| TC-P2ACC-016 | Mark Paid on a ৳5,000 DPS Fixed Expense instance, paying from BRAC ৳50,000 | BRAC ৳45,000; DPS ৳5,000 | API | P1 | Fixed Expense payment |
| TC-P2ACC-017 | Create a UPension (`UNIVERSAL_PENSION`) with a ৳5,000 monthly installment; Stocks and Insurance accounts; a UPension with a parent | 201 with `monthly_installment_paisa` 500000 / 201 / 422 | API | P1 | Investment kinds |
| TC-P2ACC-018 | BRAC ৳50,000 pays a ৳5,000 UPension installment using a category named "DPS / Savings" | BRAC ৳45,000; UPension ৳5,000; tax `universal_pension` invested 500000, `dps` 0 | API | P1 | Rebate bucket by account type |
| TC-P2ACC-019 | Sanchaypatra ৳20,000, UPension ৳5,000, Insurance ৳3,000 and BRAC ৳10,000 | `investment_paisa` 2800000; `net_worth_paisa` 3800000 | API | P1 | Investment total |
| TC-P2ACC-020 | Add Expenses → Investment: bKash ৳20,000 pays a ৳3,000 Insurance premium | bKash ৳17,000; Insurance ৳3,000; tax `insurance` invested 300000; listed by `GET /investments` | API | P1 | Investment payment |
| TC-P2ACC-021 | Tax page Overview with UPension and Insurance in the result | both rows shown; no Edit button, no number inputs | UI | P1 | Read-only investments |
| TC-P2ACC-015 | Link an existing parentless DPS to BRAC via PATCH | 200; `parent_account_id` set; totals move the DPS balance from net worth only into bank | API | P2 | Linking legacy accounts |
