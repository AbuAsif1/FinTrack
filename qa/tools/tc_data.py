# -*- coding: utf-8 -*-
"""Manual money-flow test cases for FinTrack BD. Data only; build_xlsx.py renders it."""

TCS = []


def S(*lines):
    return "\n".join(f"{i}. {l}" for i, l in enumerate(lines, 1))


def tc(id, module, option, title, pay, typ, pri, pre, steps, data, bank, dash, tax, other, note, reqs, auto="UI + API"):
    TCS.append(dict(id=id, module=module, option=option, title=title, pay=pay, typ=typ, pri=pri, pre=pre,
                    steps=steps, data=data, bank=bank, dash=dash, tax=tax, other=other, note=note,
                    reqs=reqs, auto=auto))


UNCH_TAX_B1 = "No change. FY2026-27 stays: Gross Income ৳80,000 · Taxable ৳53,333.33 · Gross Tax ৳0 · Tax Paid ৳0."
NOT_SPEND = "Spending tile does NOT change (not Spending). Not shown in the spending-by-category chart."
OPEN_EXP = "Open the Add Expenses form (Dashboard quick action or Transactions → Add)."

# =====================================================================================
# A. ADD EXPENSES — SPENDING CATEGORIES (routing NONE)
# =====================================================================================
M = "Add Expenses"
tc("MF-EXP-001", M, "Groceries (Spending)", "Spending paid in cash leaves In-Hand Cash and counts as spending", "Cash", "Positive", "P1",
   "Baseline B1.",
   S(OPEN_EXP, "Category: Groceries.", "Payment Method: Cash. Check the note: 'Paid from In-Hand Cash (৳5,000.00 available)'.",
     "Description: Meena Bazar. Amount: 1,500. Save.",
     "Open Bank & Wallet, Dashboard (This Month), Tax, Transactions and History and record every figure."),
   "Amount ৳1,500 · Groceries · Cash",
   "In-Hand Cash ৳5,000 → ৳3,500. BRAC Bank ৳1,80,000 (unchanged). bKash ৳20,000 (unchanged). Cash on Hand tile ৳3,500. Net Worth ৳2,05,000 → ৳2,03,500.",
   "Income ৳80,000 (unchanged). Spending ৳0 → ৳1,500. Net Savings ৳80,000 → ৳78,500. Savings Rate ≈ 98.1%. Remaining to spend ৳80,000 → ৳78,500. Discretionary cash stays ৳80,000 (In-Hand − Fixed Commitments; ad-hoc spending does not change it). Spending-by-category chart: Groceries ৳1,500.",
   UNCH_TAX_B1,
   "Transactions: new top row 'Meena Bazar · Groceries · Cash · ৳1,500.00', dated today. History (November): Spending ৳1,500.",
   "Spending = cash out and counted in budgets (architecture §Category routing, NONE).",
   "FR-04,FR-04-RT,US-25,US-27,T-03,T-06,DV-BAL,DV-SPEND,DV-NETSAV,DV-RATE,DV-RTS,DV-DISC,AR-CASH,FR-08,P2-22")

tc("MF-EXP-002", M, "Groceries (Spending)", "Spending paid by bank leaves the chosen bank account only", "Bank → BRAC Bank", "Positive", "P1",
   "Baseline B1.",
   S(OPEN_EXP, "Category: Groceries. Payment Method: Bank.",
     "Check that 'Which account are you paying from?' lists BRAC Bank and bKash with balances, and does NOT list BRAC DPS, Sanchaypatra, UPension, Life Insurance or Stocks.",
     "Choose BRAC Bank. Amount 1,500. Save.", "Check every screen."),
   "Amount ৳1,500 · Groceries · Bank (BRAC Bank)",
   "BRAC Bank ৳1,80,000 → ৳1,78,500. In-Hand Cash ৳5,000 (unchanged). Bank Balance tile ৳1,78,500. Net Worth ৳2,03,500.",
   "Same as MF-EXP-001: Spending ৳1,500 · Net Savings ৳78,500 · Remaining to spend ৳78,500.",
   UNCH_TAX_B1,
   "Transactions row shows a routing indicator naming BRAC Bank as the paying account.",
   "Only Payment Accounts (Bank, MFS, Cash) can pay Spending (ADR-0014).",
   "FR-04,FR-04-RT,US-31,T-06,DV-BAL,DV-BWT,DV-NW,AR-PAY,ADR-0014,P2-22")

tc("MF-EXP-003", M, "Dining (Spending)", "Spending paid from an MFS (bKash) account", "Bank → bKash (MFS)", "Positive", "P1",
   "Baseline B1.",
   S(OPEN_EXP, "Category: Dining. Payment Method: Bank. Account: bKash.", "Amount 850. Save."),
   "Amount ৳850 · Dining · bKash",
   "bKash ৳20,000 → ৳19,150. MFS Balance tile ৳19,150. BRAC Bank and Cash unchanged. Net Worth ৳2,04,150.",
   "Spending ৳850 · Net Savings ৳79,150 · Remaining to spend ৳79,150.",
   UNCH_TAX_B1, "Transactions: payment label shows bKash.",
   "In the form, MFS accounts are listed under Bank (p2-22).",
   "FR-04,US-27,DV-BAL,DV-BWT,AR-PAY,P2-22")

tc("MF-EXP-004", M, "All 9 spending categories", "Every spending category is cash-out, counted once, and adds up to total Spending", "Mixed", "Positive", "P1",
   "Baseline B1.",
   S(OPEN_EXP + " Add these one by one:",
     "Transport ৳300 Cash · Utility ৳1,200 BRAC · Rent ৳8,000 BRAC · Entertainment ৳600 bKash · Health ৳2,000 BRAC · Shopping ৳3,500 bKash · Other ৳250 Cash.",
     "After each save, confirm the category's chart slice grows by exactly that amount.",
     "When all are saved, check totals on every screen."),
   "7 entries totalling ৳15,850",
   "In-Hand Cash ৳4,450 (−৳550). BRAC Bank ৳1,68,800 (−৳11,200). bKash ৳15,900 (−৳4,100). Net Worth ৳1,89,150.",
   "Spending ৳15,850. Net Savings ৳64,150. Savings Rate ≈ 80.2%. Remaining to spend ৳64,150. Chart: 7 slices whose sum = ৳15,850.",
   UNCH_TAX_B1,
   "History (Nov): Spending ৳15,850 with the category breakdown above. Transactions: 7 rows, newest first.",
   "All starter spending categories share routing NONE. Check that none is mis-routed.",
   "FR-04,FR-04-RT,US-25,FR-08,US-74,DV-SPEND,DV-NETSAV,DV-RATE,DV-NW")

tc("MF-EXP-005", M, "Any spending category", "Bank chosen but no account picked: form blocks save", "Bank (no account)", "Negative", "P2",
   "Baseline B1.",
   S(OPEN_EXP, "Category: Dining. Payment Method: Bank. Leave the account empty.", "Amount 500. Save."),
   "৳500 · Dining · Bank, no account",
   "No balance changes.", "No change.", "No change.",
   "Message 'Choose the account you are paying from.' No transaction created.",
   "Every money movement must name the account it leaves (ADR-0014).",
   "AR-PAY,ADR-0014,P2-22", "UI")

tc("MF-EXP-006", M, "Any spending category", "Cash spending above the In-Hand Cash balance is refused", "Cash", "Negative", "P1",
   "Baseline B1 (In-Hand Cash ৳5,000).",
   S(OPEN_EXP, "Category: Shopping. Payment Method: Cash. Amount 6,000. Save."),
   "৳6,000 > ৳5,000 available",
   "In-Hand Cash stays ৳5,000. No other balance changes.", "Spending stays ৳0.", "No change.",
   "Error naming In-Hand Cash and the available balance. No transaction in the list.",
   "An account cannot pay more than its balance. Atomic: nothing is written.",
   "AR-CASH,BR-ATOMIC,US-36,DV-BAL")

tc("MF-EXP-007", M, "Any spending category", "Bank or MFS spending above the account balance is refused", "Bank → bKash", "Negative", "P1",
   "Baseline B1 (bKash ৳20,000).",
   S(OPEN_EXP, "Category: Shopping. Bank → bKash. Amount 25,000. Save."),
   "৳25,000 > ৳20,000",
   "bKash stays ৳20,000.", "No change.", "No change.", "Error 'Amount exceeds bKash balance…'. Nothing saved.",
   "", "AR-PAY,BR-ATOMIC,DV-BAL")

tc("MF-EXP-008", M, "Any spending category", "Spending exactly equal to the balance is allowed (boundary)", "Cash", "Edge", "P2",
   "Baseline B1.",
   S(OPEN_EXP, "Category: Transport. Cash. Amount 5,000.00. Save."),
   "৳5,000.00 = full cash balance",
   "In-Hand Cash ৳0.00 (not negative). Net Worth ৳2,00,000.", "Spending ৳5,000.", "No change.", "Saved successfully.",
   "Boundary: amount = balance.", "AR-CASH,DV-BAL")

tc("MF-EXP-009", M, "Any spending category", "Cash payment when the user has no In-Hand Cash account", "Cash", "Edge", "P2",
   "Baseline B1 but do NOT create the In-Hand Cash account.",
   S(OPEN_EXP, "Choose Cash. Check the note: 'Add an In-Hand Cash account on Bank & Wallet to track your cash balance.'",
     "Category: Dining, Amount 400. Save."),
   "৳400 · Cash · no cash account",
   "No account changes. Net Worth unchanged (cash spending is not tracked against any account).",
   "Spending ৳400 · Net Savings ৳79,600.", "No change.",
   "Transaction saved with payment Cash.",
   "BUSINESS QUESTION (F-17): money leaves the user but no balance drops. Confirm this is intended.",
   "AR-CASH,FR-04,DV-SPEND")

tc("MF-EXP-010", M, "Any spending category", "Amount validation and paisa precision", "Cash", "Negative", "P2",
   "Baseline B1.",
   S(OPEN_EXP, "Try Amount 0 → Save.", "Try a negative amount → Save.", "Try a blank amount → Save.", "Enter 99.50 (Groceries, Cash) → Save."),
   "0 / −100 / blank / 99.50",
   "Steps 2–4: no balance change. Step 5: In-Hand Cash ৳4,900.50 exactly.",
   "Step 5: Spending ৳99.50 exactly (no rounding).", "No change.",
   "Steps 2–4 rejected with a clear message. Step 5 is stored and shown as ৳99.50.",
   "Money is stored in integer paisa, so there must be zero rounding error (rules.md).",
   "FR-04,DV-BAL", "UI + API")

tc("MF-EXP-011", M, "Any spending category", "Lakh-size amount uses Bangladeshi number grouping everywhere", "Bank → BRAC Bank", "Positive", "P2",
   "Baseline B1.",
   S(OPEN_EXP, "Category: Shopping. Bank → BRAC Bank. Amount 1,25,000.75. Save.", "Check how the amount is written on every screen."),
   "৳1,25,000.75",
   "BRAC Bank ৳54,999.25. Every amount shown as ৳1,25,000.75 (never ৳125,000.75).",
   "Spending ৳1,25,000.75 · Net Savings −৳45,000.75 (negative, shown clearly) · Savings Rate negative.", "No change.",
   "Transactions, History and Dashboard all use the ৳ prefix, South Asian grouping and 2 decimals.",
   "Display rule: formatBDT on every money value.",
   "FR-04,DV-NETSAV,DV-RATE", "UI")

tc("MF-EXP-012", M, "Any spending category", "Back-dated expense falls in the month of its date", "Cash", "Positive", "P2",
   "Baseline B1. Today is in November 2026.",
   S(OPEN_EXP, "Look for a Date field (default today). Set the date to 31-Oct-2026.", "Category: Dining, Cash, Amount 700. Save.",
     "Check the Dashboard for This Month and Last Month."),
   "৳700 dated 31-Oct-2026",
   "In-Hand Cash ৳4,300.",
   "This Month (Nov) Spending ৳0. Last Month (Oct) Spending ৳700.", "No change.",
   "Transactions list shows the date 31-Oct-2026. History: in October.",
   "BUSINESS (US-26 'date default today' implies it can be edited). The current Add form appears to have no date field (F-05). Expected result is per business.",
   "US-26,FR-04,ADR-0007,FR-08", "UI")

tc("MF-EXP-013", M, "Groceries with a category budget", "Category budget fills up and notifies at the business thresholds", "Cash/Bank", "Positive", "P1",
   "Baseline B1. Budgets: Groceries monthly limit ৳5,000.",
   S(OPEN_EXP, "Groceries ৳3,000 (BRAC). Check the Groceries budget bar and notifications.", "Groceries ৳1,000 (Cash). Open the Dashboard, then check the bar and notifications.",
     "Groceries ৳1,100 (BRAC). Open the Dashboard, then check the bar and notifications.", "Add a DPS / Savings deposit ৳10,000 and confirm the Groceries budget does not move."),
   "Limit ৳5,000; spent ৳3,000 → ৳4,000 → ৳5,100",
   "BRAC ৳1,75,900 (then ৳1,65,900 after the DPS deposit). Cash ৳4,000. BRAC DPS +৳10,000 after step 5.",
   "Spending ৳5,100 (the DPS deposit is not added).", "No change (only DPS invested +৳10,000 after step 5).",
   "Budget bar: 60% green (no alert) → 80% amber with a 'Budget at 80%' alert → 102% red with a 'Budget exceeded' alert. Each alert shown once in the notification bell.",
   "Thresholds per BRD FR-10 (green <70%, amber 70–100%, red >100%) and FR-09 (alert at 80% and when exceeded). Docs disagree on thresholds (F-12).",
   "FR-10,FR-09,US-71,T-10,DV-SPEND")

tc("MF-EXP-014", M, "Spending vs overall monthly limit", "Overall monthly spending limit ring", "Mixed", "Positive", "P2",
   "Baseline B1. Dashboard → Set monthly spending limit ৳10,000.",
   S("Add Groceries ৳7,500 (BRAC). Check the ring.", "Add Dining ৳3,000 (bKash). Check the ring.",
     "Add a DPS / Savings deposit ৳10,000 into BRAC DPS. Check the ring again.", "Raise the limit to ৳20,000."),
   "Limit ৳10,000",
   "BRAC ৳1,62,500 · bKash ৳17,000 · BRAC DPS ৳10,000.",
   "Ring 75% amber → 105% red '৳10,500 of ৳10,000'. Step 4: still ৳10,500 (the DPS deposit is not Spending). Step 5: 52.5% green.",
   "No change apart from DPS invested.", "",
   "Ring: 0–74% green, 75–99% amber, 100%+ red (p2-04).", "P2-04,DV-SPEND")

tc("MF-EXP-015", M, "Any category", "Double-tap Save does not charge twice", "Bank → BRAC Bank", "Negative", "P1",
   "Baseline B1.",
   S(OPEN_EXP, "Groceries, BRAC, Amount 2,000.", "Tap Save twice quickly (or with a slow network)."),
   "৳2,000",
   "BRAC ৳1,78,000 (charged once).", "Spending ৳2,000 (not ৳4,000).", "No change.", "Exactly one transaction row.",
   "Idempotency key on each new entry.", "AR-IDEM,T-03,GAP-10")

tc("MF-EXP-016", M, "Archived category", "Archived category is hidden for new entries but its history still counts", "Cash", "Edge", "P3",
   "Baseline B1. Add Shopping ৳1,000 Cash, then archive Shopping in Settings → Categories.",
   S(OPEN_EXP, "Search the categories for Shopping.", "Check the Dashboard and Transactions."),
   "",
   "Cash stays ৳4,000.", "Spending still includes the archived Shopping ৳1,000.", "No change.",
   "Shopping is not offered. The old row remains in the list.", "", "T-03,FR-04", "UI")

tc("MF-EXP-017", M, "Utility / Rent (covered by a Fixed Expense)", "An ad-hoc bill in a category also used by a Fixed Expense template", "Bank → BRAC Bank", "Edge", "P2",
   "Baseline F1 (Home Internet template uses Utility; Mess Rent uses Rent).",
   S(OPEN_EXP, "Search the category list for Utility and Rent.",
     "Try to record a one-off gas bill: Utility ৳700 from BRAC (not the Home Internet bill)."),
   "৳700 gas bill",
   "BRAC −৳700 (৳1,79,300).",
   "Spending ৳700. Home Internet Fixed Expense stays PENDING (a different bill must not mark it paid).", "No change.",
   "Fixed Expenses: Home Internet Nov still Pending.",
   "FINDING F-11: the form hides categories that a Fixed Expense template uses, and saving a matching category can auto-mark the template paid. Business needs ad-hoc bills to remain possible.",
   "FR-04,FR-05,US-41,T-08")

# =====================================================================================
# B. DPS / SAVINGS (SAVINGS_DEPOSIT)
# =====================================================================================
tc("MF-EXP-020", M, "DPS / Savings", "DPS installment from the bank: transfer, not spending; DPS rebate goes up", "Bank → BRAC Bank", "Positive", "P1",
   "Baseline B1.",
   S(OPEN_EXP, "Category: DPS / Savings. Check the hint 'This will deposit into your savings account'.",
     "Savings Account: BRAC DPS. Payment Method: Bank → BRAC Bank.", "Amount 10,000. Save.", "Check every screen."),
   "৳10,000 · BRAC DPS · paid from BRAC Bank",
   "BRAC Bank ৳1,80,000 → ৳1,70,000. BRAC DPS ৳0 → ৳10,000. Bank Balance tile stays ৳1,80,000 (the DPS is counted under its parent). Net Worth stays ৳2,05,000.",
   "Spending stays ৳0. Net Savings stays ৳80,000. Remaining to spend ৳80,000 → ৳70,000 (cash out).",
   "FY2026-27 investments: DPS invested ৳10,000 / cap ৳1,20,000 / eligible ৳10,000. Rebate stays ৳0 because Gross Tax is ৳0 (for a rebate with a real effect see MF-EXP-028).",
   "Transactions: routing indicator 'Deposited into BRAC DPS'; not in the spending chart. BRAC DPS transaction history shows the deposit.",
   "DPS payment = Transfer (ADR-0006). The rebate bucket follows the account type (ADR-0015).",
   "FR-04-RT,US-32,FR-06,T-06,ADR-0006,ADR-0014,ADR-0015,DV-BAL,DV-BWT,DV-NW,DV-RTS,DV-REBATE,US-50")

tc("MF-EXP-021", M, "DPS / Savings", "DPS installment paid from bKash", "Bank → bKash", "Positive", "P1",
   "Baseline B1.",
   S(OPEN_EXP, "DPS / Savings → Savings Account: BRAC DPS → Bank → bKash. Amount 5,000. Save."),
   "৳5,000",
   "bKash ৳20,000 → ৳15,000. BRAC DPS ৳5,000. BRAC Bank unchanged ৳1,80,000. Bank Balance tile ৳1,85,000. MFS Balance tile ৳15,000. Net Worth ৳2,05,000.",
   "Spending ৳0. Remaining to spend ৳75,000.", "DPS invested ৳5,000.", "",
   "Any Payment Account can fund a DPS (TC-P2ACC-006).", "AR-PAY,ADR-0014,DV-BWT,P2-22")

tc("MF-EXP-022", M, "DPS / Savings", "DPS installment paid in cash", "Cash", "Positive", "P2",
   "Baseline B1.",
   S(OPEN_EXP, "DPS / Savings → BRAC DPS → Cash. Amount 2,000. Save."),
   "৳2,000",
   "In-Hand Cash ৳3,000. BRAC DPS ৳2,000. Bank Balance tile ৳1,82,000. Cash on Hand tile ৳3,000.",
   "Spending ৳0. Remaining to spend ৳78,000.", "DPS invested ৳2,000.", "", "", "AR-CASH,DV-BWT")

tc("MF-EXP-023", M, "DPS / Savings", "No savings account chosen: blocked", "Bank → BRAC Bank", "Negative", "P1",
   "Baseline B1.",
   S(OPEN_EXP, "DPS / Savings, leave Savings Account empty, Bank → BRAC, Amount 1,000. Save."),
   "", "No change.", "No change.", "No change.", "Validation error. Nothing saved.",
   "A DPS payment without a linked account is a validation error with nothing written (rules.md).", "FR-04-RT,BR-ATOMIC,US-32")

tc("MF-EXP-024", M, "DPS / Savings", "Depositing into the same account it is paid from is refused", "Bank → BRAC Bank", "Negative", "P2",
   "Baseline B1.",
   S(OPEN_EXP, "DPS / Savings → Savings Account: BRAC Bank → Bank → BRAC Bank. Amount 1,000. Save."),
   "", "No change.", "No change.", "No change.", "Error: the bank account and the savings account must be different.", "", "AR-PAY")

tc("MF-EXP-025", M, "DPS / Savings", "Deposit into a plain bank savings account does not earn a DPS rebate", "Bank → bKash", "Edge", "P2",
   "Baseline T1.",
   S(OPEN_EXP, "DPS / Savings → Savings Account: BRAC Bank (a normal bank account) → Bank → bKash. Amount 3,000. Save.", "Open the Tax page."),
   "৳3,000 bKash → BRAC Bank",
   "bKash ৳17,000. BRAC Bank ৳10,43,000. Net Worth unchanged.",
   "Spending unchanged.",
   "DPS invested stays ৳0. Rebate stays ৳0. Net Tax stays ৳26,500.",
   "", "The rebate bucket comes from the destination account type; a SAVINGS account feeds no bucket (ADR-0015).",
   "ADR-0015,DV-REBATE,FR-TAX-04")

tc("MF-EXP-026", M, "DPS / Savings", "DPS installment larger than the paying account's balance", "Bank → bKash", "Negative", "P1",
   "Baseline B1.",
   S(OPEN_EXP, "DPS / Savings → BRAC DPS → Bank → bKash. Amount 25,000. Save."),
   "৳25,000 > ৳20,000",
   "bKash ৳20,000 and BRAC DPS ৳0 (both unchanged).", "No change.", "DPS invested unchanged.",
   "INSUFFICIENT_BALANCE error. Neither side is written (atomic).", "", "BR-ATOMIC,US-36,AR-PAY")

tc("MF-EXP-027", M, "DPS / Savings", "Closed savings account is not offered", "—", "Negative", "P3",
   "Baseline B1 plus a second DPS 'Old DPS' (parent BRAC, balance ৳0) that has been closed on Bank & Wallet.",
   S(OPEN_EXP, "DPS / Savings: open the Savings Account dropdown."),
   "", "No change.", "No change.", "No change.", "'Old DPS' is not listed.", "", "FR-06,T-04", "UI")

tc("MF-EXP-028", M, "DPS / Savings (tax effect)", "DPS installment lowers tax through the investment rebate", "Bank → BRAC Bank", "Positive", "P1",
   "Baseline T1 (Gross Tax ৳26,500, TDS ৳20,000, Remaining ৳6,500).",
   S(OPEN_EXP, "DPS / Savings → BRAC DPS → Bank → BRAC Bank. Amount 10,000. Save.", "Open Tax (FY2026-27) and record every line."),
   "৳10,000",
   "BRAC Bank ৳10,40,000 → ৳10,30,000. BRAC DPS ৳10,000. Net Worth unchanged ৳10,65,000.",
   "Spending unchanged. Dashboard tax card: Remaining ৳5,500 · Suggested TDS/mo ৳687.50.",
   "DPS invested ৳10,000 · eligible ৳10,000 · Total Eligible ৳10,000. Rebate = MIN(3% × ৳6,40,000 = ৳19,200; 10% × ৳10,000 = ৳1,000; ৳10,00,000) = ৳1,000. Net Tax ৳26,500 → ৳25,500. Tax Paid ৳20,000. Remaining ৳5,500. Suggested monthly TDS ৳5,500 ÷ 8 = ৳687.50. Further investment for max rebate ৳1,82,000.",
   "", "Rates come from the seeded FY2026-27 tax year (10% investment rate, 3% income rate, ৳10L max). Open questions in ticket 24.",
   "FR-TAX-04,FR-TAX-05,US-32,US-60,US-63,US-64,US-65,US-13,DV-REBATE,T-09,T-24,FR-02")

tc("MF-EXP-029", M, "DPS / Savings (tax effect)", "DPS above the ৳1,20,000 cap: only ৳1,20,000 counts for the rebate", "Bank → BRAC Bank", "Edge", "P1",
   "Baseline T1.",
   S(OPEN_EXP, "DPS / Savings → BRAC DPS → Bank → BRAC Bank. Amount 1,50,000. Save.", "Open Tax."),
   "৳1,50,000",
   "BRAC Bank ৳8,90,000. BRAC DPS ৳1,50,000 (the full amount; the cap is for tax only).",
   "Spending unchanged.",
   "DPS invested ৳1,50,000 / cap ৳1,20,000 / eligible ৳1,20,000. Rebate ৳12,000. Net Tax ৳14,500. Tax Paid ৳20,000 → 'Overpaid (refundable)' ৳5,500. Suggested TDS ৳0. Further investment ৳72,000.",
   "", "BRD FR-TAX-04: MIN(DPS, ৳1,20,000).", "FR-TAX-04,US-50,US-64,DV-REBATE,FR-TAX-05")

# =====================================================================================
# C. INVESTMENT (Special option) and the legacy category
# =====================================================================================
tc("MF-EXP-035", M, "Investment → Sanchaypatra", "Sanchaypatra purchase: transfer into an Investment account, adds to the Sanchaypatra rebate", "Bank → BRAC Bank", "Positive", "P1",
   "Baseline T1.",
   S(OPEN_EXP, "Category: Investment (Special group).", "Select investment: Sanchaypatra (Sanchaypatra) · Payment Method Bank → BRAC Bank.", "Amount 50,000. Save.", "Check Bank & Wallet, Dashboard and Tax."),
   "৳50,000",
   "BRAC Bank ৳9,90,000. Sanchaypatra ৳50,000. Investments tile ৳50,000. Bank Balance tile ৳9,90,000. Net Worth unchanged ৳10,65,000.",
   "Spending unchanged (Transfer).",
   "Sanchaypatra invested ৳50,000 / cap ৳5,00,000 / eligible ৳50,000. Rebate ৳5,000. Net Tax ৳21,500. Remaining ৳1,500. Suggested TDS ৳187.50. Further investment ৳1,42,000. 'Investment records this year' lists the ৳50,000 Sanchaypatra entry.",
   "", "", "FR-04-RT,US-33,ADR-0015,DV-REBATE,DV-BWT,FR-TAX-04,P2-22")

tc("MF-EXP-036", M, "Investment → Universal Pension", "UPension installment feeds the Universal Pension bucket", "Bank → BRAC Bank", "Positive", "P1",
   "Baseline T1.",
   S(OPEN_EXP, "Investment → UPension → Bank → BRAC Bank. Amount 30,000. Save."),
   "৳30,000",
   "BRAC Bank ৳10,10,000. UPension ৳30,000. Investments tile ৳30,000.", "Spending unchanged.",
   "Universal Pension Scheme invested ৳30,000 (no cap). DPS stays ৳0. Rebate ৳3,000. Net Tax ৳23,500. Remaining ৳3,500. Suggested TDS ৳437.50.",
   "", "", "ADR-0015,DV-REBATE,FR-TAX-04")

tc("MF-EXP-037", M, "Investment → Insurance", "Insurance premium paid from bKash", "Bank → bKash", "Positive", "P1",
   "Baseline T1.",
   S(OPEN_EXP, "Investment → Life Insurance → Bank → bKash. Amount 3,000. Save."),
   "৳3,000",
   "bKash ৳17,000. Life Insurance ৳3,000. Investments tile ৳3,000. Net Worth unchanged (Insurance counts in Net Worth).",
   "Spending unchanged.", "Insurance invested ৳3,000 (no cap). Rebate ৳300. Net Tax ৳26,200. Remaining ৳6,200. Suggested TDS ৳775.00.",
   "", "TC-P2ACC-020.", "ADR-0015,DV-REBATE,DV-NW")

tc("MF-EXP-038", M, "Investment → Stocks", "Stocks above the ৳5,00,000 cap, and the rebate limited by 3% of taxable income", "Bank → BRAC Bank", "Edge", "P1",
   "Baseline T1.",
   S(OPEN_EXP, "Investment → Stocks → Bank → BRAC Bank. Amount 6,00,000. Save."),
   "৳6,00,000",
   "BRAC Bank ৳4,40,000. Stocks ৳6,00,000.", "Spending unchanged.",
   "Stocks invested ৳6,00,000 / cap ৳5,00,000 / eligible ৳5,00,000. Investment candidate ৳50,000, but the 3%-of-taxable candidate is ৳19,200, so Rebate = ৳19,200. Net Tax ৳7,300 (above Minimum tax ৳5,000). Overpaid ৳12,700. Suggested TDS ৳0. Further investment ৳0.",
   "", "Rebate = MIN of the three candidates (FR-TAX-04).", "FR-TAX-04,US-64,US-65,DV-REBATE")

tc("MF-EXP-039", M, "Investment (all kinds)", "Several investment kinds add up to one Total Eligible", "Mixed", "Positive", "P1",
   "Baseline T1.",
   S("Add, in any order: DPS / Savings ৳10,000 → BRAC DPS (from BRAC); Investment → Sanchaypatra ৳50,000 (from BRAC); Investment → UPension ৳30,000 (from BRAC); Investment → Life Insurance ৳3,000 (from bKash).", "Open Tax."),
   "Total ৳93,000",
   "BRAC Bank ৳9,50,000. bKash ৳17,000. DPS ৳10,000. Investments tile ৳83,000. Net Worth unchanged.",
   "Spending unchanged.",
   "Eligible: DPS ৳10,000 + Sanchaypatra ৳50,000 + UPension ৳30,000 + Insurance ৳3,000 = ৳93,000. Rebate ৳9,300. Net Tax ৳17,200. Overpaid ৳2,800. Further investment ৳99,000.",
   "", "", "FR-TAX-04,DV-REBATE,ADR-0015,US-64")

tc("MF-EXP-040", M, "DPS / Savings into a UPension account", "Category says DPS but the account is UPension: counted once, in the UPension bucket", "Bank → BRAC Bank", "Edge", "P2",
   "Baseline T1.",
   S(OPEN_EXP, "Category: DPS / Savings → Savings Account: UPension → Bank → BRAC Bank. Amount 5,000. Save.",
     "Also check that 'Investment (Sanchaypatra)' is not offered as a plain category (it lives under Investment)."),
   "৳5,000",
   "BRAC ৳10,35,000. UPension ৳5,000.", "Spending unchanged.",
   "Universal Pension invested ৳5,000. DPS invested ৳0 (no double counting). Rebate ৳500.",
   "", "TC-P2ACC-018.", "ADR-0015,DV-REBATE")

tc("MF-EXP-041", M, "Investment", "Investment without choosing which investment", "Bank → BRAC Bank", "Negative", "P2",
   "Baseline B1.",
   S(OPEN_EXP, "Investment, leave 'Select investment…' empty, Amount 1,000. Save.", "Choose Sanchaypatra but Bank with no account. Save."),
   "", "No change.", "No change.", "No change.",
   "Errors 'Choose which investment you are paying into.' and 'Choose the account you are paying from.'", "", "AR-PAY", "UI")

tc("MF-EXP-042", M, "Investment", "Changing the rebate rate in Tax Year Settings re-prices the rebate (data-driven tax rules)", "—", "Positive", "P2",
   "Baseline T1 plus MF-EXP-028 done (DPS ৳10,000).",
   S("Tax → Settings for FY2026-27: change Investment rate from 10% to 15%. Save.", "Check the rebate.", "Restore 10%."),
   "",
   "No change.", "Tax card follows the tax page.",
   "With 15%: Rebate ৳1,500 and Net Tax ৳25,000. After restoring 10%: Rebate ৳1,000 again.",
   "", "Ticket 24 item 1 (10% vs 15%) is still open. Rates are data, not code (ADR-0008).",
   "FR-TAX-03,T-24,FR-TAX-04,ADR-0008")

tc("MF-EXP-043", M, "DPS / Savings + Savings Goal", "A savings goal linked to the DPS moves with the deposit", "Bank → BRAC Bank", "Positive", "P3",
   "Baseline B1. Savings goal 'Emergency fund' linked to BRAC DPS, target ৳1,00,000.",
   S("Add DPS / Savings ৳10,000 → BRAC DPS from BRAC.", "Open the goal."),
   "৳10,000",
   "BRAC DPS ৳10,000.", "Spending unchanged.", "DPS invested ৳10,000.",
   "Goal shows 10% (৳90,000 to go). Deleting the deposit returns it to 0%.", "", "P2-06")

# =====================================================================================
# D. SAVINGS WITHDRAWAL
# =====================================================================================
tc("MF-EXP-050", M, "Savings Withdrawal (DPS)", "Encashing a DPS returns the money to its parent bank account", "—", "Positive", "P1",
   "Baseline B1, then DPS / Savings ৳30,000 → BRAC DPS from BRAC (BRAC ৳1,50,000, DPS ৳30,000).",
   S(OPEN_EXP, "Category: Savings Withdrawal. Savings Account: BRAC DPS. Amount 30,000. Save."),
   "৳30,000",
   "BRAC DPS ৳30,000 → ৳0. BRAC Bank ৳1,50,000 → ৳1,80,000. Bank Balance tile stays ৳1,80,000. Net Worth stays ৳2,05,000.",
   "Spending stays ৳0. Income tile stays ৳80,000 (a withdrawal is not income). Remaining to spend ৳50,000 → ৳80,000 (cash in).",
   "Gross Income unchanged. DPS invested this FY stays ৳30,000.",
   "DPS history shows the withdrawal.",
   "AR-WD: a withdrawal with no named receiving account credits the DPS/FDR parent. BUSINESS QUESTION F-15: should encashing in the same FY reduce the DPS rebate?",
   "AR-WD,ADR-0014,FR-04-RT,DV-BAL,DV-RTS,P2-22")

tc("MF-EXP-051", M, "Savings Withdrawal (DPS)", "Partial withdrawal", "—", "Positive", "P2",
   "Same as MF-EXP-050 precondition.",
   S(OPEN_EXP, "Savings Withdrawal → BRAC DPS → Amount 10,000. Save."),
   "৳10,000", "BRAC DPS ৳20,000. BRAC Bank ৳1,60,000. Net Worth unchanged.", "Remaining to spend ৳60,000.", "No change.", "", "", "AR-WD,DV-BAL")

tc("MF-EXP-052", M, "Savings Withdrawal", "Withdrawal above the account balance", "—", "Negative", "P1",
   "Same as MF-EXP-050 precondition.",
   S(OPEN_EXP, "Savings Withdrawal → BRAC DPS → Amount 40,000. Save."),
   "৳40,000 > ৳30,000", "No change.", "No change.", "No change.", "Error 'Withdrawal exceeds the account balance'.",
   "", "FR-04-RT,BR-ATOMIC")

tc("MF-EXP-053", M, "Savings Withdrawal (bank account)", "Withdrawal from a normal bank account must land somewhere", "—", "Positive", "P1",
   "Baseline B1.",
   S(OPEN_EXP, "Savings Withdrawal → Savings Account: BRAC Bank → Amount 5,000.", "Look for 'Which account receives the money?' and choose In-Hand Cash. Save."),
   "৳5,000 BRAC → cash",
   "BRAC Bank ৳1,75,000. In-Hand Cash ৳10,000. Net Worth unchanged ৳2,05,000.",
   "Spending unchanged. Remaining to spend +৳5,000.", "No change.", "",
   "FINDING F-02: the form offers no receiving account for a withdrawal, so the money may drop out of Net Worth. The expected result here is per business: money moves, it does not vanish.",
   "FR-04-RT,ADR-0014,DV-NW,DV-BAL")

tc("MF-EXP-054", M, "Savings Withdrawal (Sanchaypatra maturity)", "Sanchaypatra encashment is received into a bank account", "—", "Positive", "P2",
   "Baseline T1 plus MF-EXP-035 (Sanchaypatra ৳50,000).",
   S(OPEN_EXP, "Savings Withdrawal → Sanchaypatra → Amount 50,000 → receive into BRAC Bank. Save."),
   "৳50,000",
   "Sanchaypatra ৳0. BRAC Bank +৳50,000. Investments tile ৳0. Net Worth unchanged.",
   "Not Spending, not Income.", "Sanchaypatra invested this FY: confirm with the owner whether encashment reverses it (F-15).",
   "", "Same gap as F-02: Sanchaypatra has no parent account.", "FR-04-RT,ADR-0014,DV-NW")

# =====================================================================================
# E. SAVINGS INTEREST (category)
# =====================================================================================
tc("MF-EXP-060", M, "Savings Interest", "Interest credited to a named account: balance up, not spending", "—", "Positive", "P1",
   "Baseline B1.",
   S(OPEN_EXP, "Category: Savings Interest.", "Check that the form asks which account receives the interest; choose BRAC Bank.", "Amount 1,250. Save."),
   "৳1,250",
   "BRAC Bank ৳1,81,250. Net Worth ৳2,06,250.",
   "Spending unchanged. Remaining to spend unchanged (interest is neither cash in nor cash out).",
   "No change. Interest that should be TAXED is entered through Add Income → Bank Savings Interest (MF-INC-018).",
   "",
   "FINDING F-01: the form shows a Savings Account picker for deposit and withdrawal only, not for interest, so this entry may fail with 'savings_account_id is required'.",
   "FR-04-RT,DV-BAL,DV-RTS")

tc("MF-EXP-061", M, "Savings Interest", "Interest credited to a DPS", "—", "Positive", "P2",
   "Baseline B1 plus BRAC DPS ৳10,000.",
   S(OPEN_EXP, "Savings Interest → BRAC DPS → Amount 500. Save."),
   "৳500", "BRAC DPS ৳10,500. Bank Balance tile +৳500. Net Worth +৳500.", "No change.",
   "DPS invested stays ৳10,000 (interest is not an investment).", "", "", "DV-BAL,DV-REBATE")

tc("MF-EXP-062", M, "Savings Interest vs Income", "The same interest entered in both places is not double-counted", "—", "Edge", "P2",
   "Baseline B1.",
   S("Record bank interest ৳9,000 (net) with Add Income → Bank Savings Interest into BRAC Bank.", "Record the same interest with Add Expenses → Savings Interest → BRAC Bank ৳9,000."),
   "",
   "Business expectation: BRAC Bank rises once (৳1,89,000), and the app warns or guides the user to a single path.",
   "", "Gross Income includes the interest once.", "",
   "FINDING F-09: two paths record interest. Only the Income path reaches tax. Confirm the intended single path.",
   "FR-04-RT,P2-10,DV-BAL")

# =====================================================================================
# F. LOANS
# =====================================================================================
tc("MF-EXP-070", M, "Loan Given", "Lending cash to a new person creates their ledger", "Cash", "Positive", "P1",
   "Baseline B1. No loan persons.",
   S(OPEN_EXP, "Category: Loan Given. Person: type 'Mithun' (new). Reason: Hospital bill. Payment Method: Cash. Amount 5,000. Save.",
     "Open Loans, Dashboard, Bank & Wallet."),
   "৳5,000 to Mithun",
   "In-Hand Cash ৳5,000 → ৳0. Net Worth (accounts) ৳2,00,000. Business p2-05 expects Net Worth to include the ৳5,000 receivable (= ৳2,05,000); see F-07.",
   "Spending stays ৳0. Net Savings stays ৳80,000. Remaining to spend ৳75,000. Loan card: People owe you ৳5,000 · You owe ৳0.",
   "No change.",
   "Loans: new card 'Mithun owes you ৳5,000' in green, with one GIVEN entry and the reason. The Loans summary matches the dashboard.",
   "Loan Given = cash out, not spending, and creates a Loan Entry (FR-04 routing table).",
   "FR-04-RT,FR-07,US-34,US-53,US-55,US-14,T-05,T-06,DV-LOAN,DV-RTS,DV-NW,P2-05")

tc("MF-EXP-071", M, "Loan Given", "Lending again to an existing person (name typed in different case)", "Bank → bKash", "Positive", "P1",
   "MF-EXP-070 done (Mithun +৳5,000).",
   S(OPEN_EXP, "Loan Given → Person: 'mithun' (lower case) → Bank → bKash → Amount 4,000. Save."),
   "৳4,000",
   "bKash ৳16,000.", "People owe you ৳9,000.", "No change.",
   "Loans: still ONE Mithun card, balance ৳9,000, two GIVEN entries with a running balance after each.",
   "Person names match case-insensitively.", "FR-07,US-52,US-55,DV-LOAN,AR-PAY")

tc("MF-EXP-072", M, "Loan Given", "A return due date triggers due-soon and overdue alerts", "Cash", "Positive", "P2",
   "Baseline B1.",
   S(OPEN_EXP, "Loan Given → 'Babu bhai' → Cash ৳1,000 → Return due date = today + 2 days. Save.", "Check notifications and the Dashboard.", "(Later, or with a test clock) check again after the due date."),
   "৳1,000",
   "Cash ৳4,000.", "Alert 'Loan return due soon' (within 3 days); later 'overdue'.", "No change.",
   "Babu bhai's card shows the due date.", "", "FR-07,FR-09,US-56", "UI")

tc("MF-EXP-073", M, "Loan Received", "Borrowing into the bank: account up, 'You owe' in red, not income", "Bank → BRAC Bank", "Positive", "P1",
   "Baseline B1.",
   S(OPEN_EXP, "Category: Loan Received. Check the account label reads 'Which account receives the money?'.",
     "Person 'Sohel' (new) → Bank → BRAC Bank → Amount 3,145.42. Save."),
   "৳3,145.42 from Sohel",
   "BRAC Bank ৳1,83,145.42. Net Worth (accounts) ৳2,08,145.42; per p2-05 the liability offsets it (F-07).",
   "Income tile stays ৳80,000 (borrowed money is not income). Spending ৳0. Remaining to spend ৳83,145.42. Loan card: You owe ৳3,145.42.",
   "Gross Income unchanged.",
   "Loans: 'You owe Sohel ৳3,145.42' in red.", "", "FR-04-RT,FR-07,US-35,US-53,DV-LOAN,DV-RTS,AC-LOAN-1")

tc("MF-EXP-074", M, "Loan Received (repayment)", "Being repaid in full brings the person to zero", "Cash", "Positive", "P1",
   "MF-EXP-071 done (Mithun owes ৳9,000; Cash ৳0).",
   S(OPEN_EXP, "Loan Received → Mithun → Cash → Amount 9,000. Save."),
   "৳9,000",
   "In-Hand Cash ৳0 → ৳9,000.", "People owe you ৳0.", "No change.", "Mithun ৳0, shown neutral (neither green nor red).",
   "", "FR-07,DV-LOAN,AR-CASH")

tc("MF-EXP-075", M, "Loan Given + Loan Received", "Real-data loan balances (AC-LOAN-1) entered via Add Expenses", "Mixed", "Positive", "P1",
   "Baseline B1.",
   S("Loan Given → Mithun ৳9,841 (BRAC).", "Loan Given → Amait ৳1,198.50 (bKash).", "Loan Received → Sohel ৳3,145.42 (BRAC).", "Open Loans and Dashboard."),
   "",
   "BRAC ৳1,73,304.42. bKash ৳18,801.50.",
   "People owe you ৳11,039.50 · You owe ৳3,145.42.",
   "No change.",
   "Mithun ৳9,841 green · Amait ৳1,198.50 green · Sohel −৳3,145.42 red 'You owe Sohel ৳3,145.42'. Net ৳7,894.08.",
   "project-overview.md states a 'total borrow-loan balance ৳13,894.08', which does not equal these balances (F-13).",
   "AC-LOAN-1,FR-07,US-51,US-53,T-05,DV-LOAN")

tc("MF-EXP-076", M, "Loan Given with Direction 'I received'", "The Direction field cannot contradict the category", "Cash", "Negative", "P1",
   "Baseline B1.",
   S(OPEN_EXP, "Category: Loan Given. Person 'Rana'. Direction: 'I received'. Cash ৳1,000. Save."),
   "",
   "Business expectation: the form prevents contradictory input, or the entry follows ONE clear direction that is shown before saving. Cash must move in that same direction.",
   "", "No change.", "Rana's card direction matches the cash movement.",
   "FINDING F-03: the form shows a Direction field, but only the category decides the direction saved.",
   "FR-07,US-54,FR-04-RT", "UI")

tc("MF-EXP-077", M, "Loan Given", "Lending more than the account balance", "Bank → bKash", "Negative", "P2",
   "Baseline B1.",
   S(OPEN_EXP, "Loan Given → 'Rana' → Bank → bKash → ৳25,000. Save."),
   "", "bKash ৳20,000 (unchanged).", "No change.", "No change.", "Error. No Loan Person 'Rana' is created (atomic).",
   "", "BR-ATOMIC,US-36,AR-PAY")

tc("MF-EXP-078", M, "Loan Given / Received", "Person name is required", "Cash", "Negative", "P3",
   "Baseline B1.", S(OPEN_EXP, "Loan Given with an empty Person. Save."), "", "No change.", "No change.", "No change.", "Validation error.", "", "FR-07,US-54", "UI")

tc("MF-EXP-079", M, "Loan (Settle Up)", "Settle Up moves the money into an account", "—", "Positive", "P2",
   "MF-EXP-070 done (Mithun owes ৳5,000, Cash ৳0).",
   S("Loans → Mithun → Settle Up.", "Choose where the money is received (e.g. In-Hand Cash). Confirm."),
   "",
   "In-Hand Cash +৳5,000 (business expectation: settling is real money arriving).",
   "People owe you ৳0.", "No change.", "A RECEIVED settlement entry; Mithun ৳0.",
   "BUSINESS: the BRD says Settle Up creates a settlement transaction; confirm it names an account (F-19).",
   "FR-07,US-57,DV-LOAN,DV-BAL")

# =====================================================================================
# G. TAX PAYMENT
# =====================================================================================
tc("MF-EXP-085", M, "Tax Payment", "Paying advance tax from the bank reduces Remaining tax, not Net Tax", "Bank → BRAC Bank", "Positive", "P1",
   "Baseline T1.",
   S(OPEN_EXP, "Category: Tax Payment. Check the note 'recorded against the current Fiscal Year'.", "Bank → BRAC Bank → Amount 5,000. Save.", "Open Tax."),
   "৳5,000",
   "BRAC Bank ৳10,35,000. Net Worth ৳10,60,000.",
   "Spending unchanged. Dashboard tax card: Paid so far ৳25,000 · Remaining ৳1,500 · Suggested TDS/mo ৳187.50.",
   "Advance / self-assessment tax ৳5,000. TDS deducted from salary ৳20,000. Total Paid ৳25,000. Net Tax stays ৳26,500. Remaining ৳1,500. Suggested monthly TDS ৳187.50.",
   "", "Tax Paid = Σ TDS + Σ Tax Payment for that FY. The dashboard card must show the same Paid so far (F-21: it shows a 12-month projection).",
   "FR-04-RT,FR-TAX-05,US-63,US-13,T-06,T-09,DV-TAXPAID,FR-02")

tc("MF-EXP-086", M, "Tax Payment", "Tax payment lowers Net Savings but is not Spending", "Cash", "Positive", "P1",
   "Baseline B1.",
   S(OPEN_EXP, "Tax Payment → Cash → Amount 2,000. Save.", "Check Dashboard and Tax."),
   "৳2,000",
   "In-Hand Cash ৳3,000.",
   "Spending stays ৳0. Net Savings ৳80,000 → ৳78,000 (Income − Spending − Tax Payments). Savings Rate 97.5%. Remaining to spend ৳78,000.",
   "FY2026-27 Total Paid ৳2,000. Net Tax ৳0 → 'Overpaid (refundable)' ৳2,000.",
   "", "", "DV-NETSAV,DV-RATE,DV-TAXPAID,DV-RTS,FR-04-RT")

tc("MF-EXP-087", M, "Tax Payment (previous FY)", "Paying last year's tax (FY2025-26) in November 2026", "Bank → BRAC Bank", "Positive", "P2",
   "Baseline B1.",
   S(OPEN_EXP, "Tax Payment: look for a Fiscal Year choice offering 2026-27 (current) and 2025-26 (previous).", "Choose 2025-26 → Bank → BRAC → ৳4,000. Save.", "Open Tax for each year."),
   "৳4,000 for FY2025-26",
   "BRAC ৳1,76,000.", "Spending unchanged. Net Savings for November −৳4,000 (dated in November).",
   "FY2025-26 Total Paid +৳4,000. FY2026-27 unchanged.", "",
   "FINDING F-04: architecture says the user may choose the previous FY, but the form says 'current Fiscal Year' only.",
   "FR-04-RT,DV-TAXPAID,FR-TAX-01,ADR-0007")

tc("MF-EXP-088", M, "Tax Payment", "Tax payment larger than the paying account", "Bank → bKash", "Negative", "P3",
   "Baseline B1.", S(OPEN_EXP, "Tax Payment → Bank → bKash → ৳25,000. Save."), "", "No change.", "No change.", "No change.", "Insufficient balance error.", "", "AR-PAY,BR-ATOMIC")

# =====================================================================================
# H. FIXED EXPENSES via Add Expenses and Mark Paid
# =====================================================================================
tc("MF-EXP-095", M, "Fixed Expenses → Mess Rent", "Paying a monthly fixed bill from Add Expenses", "Bank → BRAC Bank", "Positive", "P1",
   "Baseline F1 (Nov: Mess Rent ৳8,722, BRAC DPS ৳10,000, Home Internet ৳500 all Pending; Discretionary ৳60,778; Remaining to spend ৳60,778).",
   S(OPEN_EXP, "Category: Fixed Expenses (Special). Select fixed expense: Mess Rent. Paying for Month: November 2026.", "Amount 8,722. Bank → BRAC Bank. Save.", "Open Fixed Expenses, Dashboard, Bank & Wallet."),
   "৳8,722",
   "BRAC Bank ৳1,71,278.",
   "Spending ৳8,722. Net Savings ৳71,278. Fixed commitments still ৳19,222. Discretionary cash still ৳60,778. Remaining to spend still ৳60,778 (the pending ৳8,722 became actual). Due/overdue banner for Mess Rent disappears.",
   "No change.",
   "Fixed Expenses → November: Mess Rent = Paid, actual ৳8,722, paid date today, linked transaction.",
   "Mark Paid creates the linked transaction (US-41).",
   "FR-05,US-40,US-41,T-08,DV-FC,DV-DISC,DV-RTS,GAP-07,US-12")

tc("MF-EXP-096", M, "Fixed Expenses → Home Internet", "Actual amount differs from the standard amount", "Bank → bKash", "Positive", "P1",
   "Baseline F1.",
   S(OPEN_EXP, "Fixed Expenses → Home Internet → November 2026 → Amount 650 → Bank → bKash. Save."),
   "Standard ৳500, paid ৳650",
   "bKash ৳19,350.",
   "Spending ৳650. Fixed commitments ৳19,372 (actual ৳650 replaces standard ৳500). Discretionary cash ৳60,628. Remaining to spend ৳60,628.",
   "No change.", "Home Internet Nov: Paid ৳650.", "GAP-02: the instance stores the actual amount.",
   "FR-05,US-40,GAP-02,DV-FC,DV-DISC,DV-RTS")

tc("MF-EXP-097", M, "Fixed Expenses → DPS installment", "DPS Fixed Expense: transfer to DPS, not spending, adds to the rebate", "Bank → BRAC Bank", "Positive", "P1",
   "Baseline F1.",
   S(OPEN_EXP, "Fixed Expenses → BRAC DPS Installment → November 2026 → Amount 10,000 → Bank → BRAC Bank. Save."),
   "৳10,000",
   "BRAC Bank ৳1,70,000. BRAC DPS ৳10,000. Bank Balance tile ৳1,80,000. Net Worth unchanged.",
   "Spending stays ৳0. Net Savings stays ৳80,000. Remaining to spend stays ৳60,778.",
   "DPS invested ৳10,000.", "Fixed Expenses: DPS Nov = Paid.",
   "BRD desired outcome: 'Mark DPS as paid → deducts from cash, adds to savings, updates tax rebate'.",
   "FR-05,US-32,US-41,ADR-0006,DV-REBATE,DV-BAL,T-08")

tc("MF-EXP-098", M, "Fixed Expenses (previous month)", "Paying October's rent late, in November", "Bank → BRAC Bank", "Edge", "P2",
   "Baseline F1 with templates started in October 2026; October Mess Rent Pending.",
   S(OPEN_EXP, "Fixed Expenses → Mess Rent → Paying for Month: October 2026 → ৳8,722 → BRAC. Save."),
   "",
   "BRAC −৳8,722.",
   "October instance Paid; November instance still Pending. The ৳8,722 spending is dated today (November).",
   "No change.", "",
   "BUSINESS QUESTION F-16: should late payment count as spending in October (the bill month) or November (the payment date)?",
   "FR-05,ADR-0007,DV-SPEND")

tc("MF-EXP-099", M, "Fixed Expenses", "Paying the same month twice is refused", "Bank → BRAC Bank", "Negative", "P1",
   "MF-EXP-095 done.", S(OPEN_EXP, "Fixed Expenses → Mess Rent → November 2026 → ৳8,722 → BRAC. Save."),
   "", "BRAC unchanged.", "No change.", "No change.", "Error 'Mess Rent is already paid for 2026-11'.", "", "FR-05,BR-ATOMIC")

tc("MF-EXP-100", M, "Fixed Expenses page → Mark Paid", "Mark Paid from the Fixed Expenses page asks which account pays", "Bank → BRAC Bank", "Positive", "P1",
   "Baseline F1.",
   S("Fixed Expenses → November → BRAC DPS Installment → Mark Paid.", "Check that the drawer asks which account pays; choose BRAC Bank; actual ৳10,000. Confirm."),
   "",
   "BRAC ৳1,70,000. BRAC DPS ৳10,000 (both sides move).", "Same as MF-EXP-097.", "DPS invested ৳10,000.", "Instance Paid with a linked transaction.",
   "TC-P2ACC-016: earlier the DPS rose with no bank going down.", "FR-05,US-40,US-41,P2-22,DV-BAL")

tc("MF-EXP-101", M, "Fixed Expenses → Skip", "Skipping a month frees the commitment without moving money", "—", "Positive", "P2",
   "Baseline F1.",
   S("Fixed Expenses → November → Mess Rent → Skip (note: 'away this month')."),
   "",
   "No balance changes.",
   "Fixed commitments ৳10,500. Discretionary cash ৳69,500. Remaining to spend ৳69,500.",
   "No change.", "Mess Rent Nov = Skipped with the note; Reopen sets it back to Pending.",
   "Skipped counts as 0 in Fixed Commitments.", "FR-05,DV-FC,DV-DISC,DV-RTS")

tc("MF-EXP-102", M, "Fixed Expenses", "Deleting the payment returns the instance to Pending", "—", "Positive", "P1",
   "MF-EXP-095 done.",
   S("Transactions → delete the Mess Rent ৳8,722 transaction."),
   "",
   "BRAC back to ৳1,80,000.", "Spending ৳0. Remaining to spend ৳60,778.", "No change.", "Mess Rent Nov = Pending again (in the same action).",
   "", "RT-DEL,BR-SOFT,FR-05,US-29")

tc("MF-EXP-103", M, "Fixed Expenses", "Due-soon (amber) and overdue (red) banners", "—", "Positive", "P2",
   "Baseline F1 with today = 13 November (Mess Rent due 15th), then a day after the 15th.",
   S("Open the Dashboard on 13 Nov.", "Open it again on 16 Nov without paying.", "Pay Mess Rent."),
   "",
   "", "13 Nov: amber banner for Mess Rent. 16 Nov: red overdue banner. After paying: banner gone.", "", "Notifications listed in the bell.",
   "", "FR-05,FR-09,US-42,US-43", "UI")

tc("MF-EXP-104", M, "Fixed Expenses (annual)", "Annual Fixed Expense shown as a monthly equivalent", "—", "Positive", "P3",
   "Baseline B1. Fixed Expense 'Car Insurance' ৳36,000, Annual, due June.",
   S("Open Fixed Expenses and the Dashboard in November.", "In June, pay it from BRAC."),
   "",
   "June: BRAC −৳36,000.",
   "Committed shows the ৳3,000/month equivalent (p2-07). In June: Spending +৳36,000.", "No change.", "", "", "P2-07,FR-05,DV-FC")

# =====================================================================================
# I. TRANSFER
# =====================================================================================
tc("MF-EXP-110", M, "Transfer between accounts", "Bank to cash withdrawal (ATM)", "From BRAC → To In-Hand Cash", "Positive", "P1",
   "Baseline B1.",
   S(OPEN_EXP, "Category: Transfer between accounts. From BRAC Bank → To In-Hand Cash → ৳10,000. Save."),
   "৳10,000",
   "BRAC ৳1,70,000. In-Hand Cash ৳15,000. Net Worth unchanged ৳2,05,000.",
   "Spending, Income, Net Savings and Remaining to spend all unchanged.", "No change.",
   "Neither side appears as spending or income.", "Transfers move money between Payment Accounts only.",
   "ADR-0014,P2-22,P2-05,DV-NW")

tc("MF-EXP-111", M, "Transfer between accounts", "Bank to bKash top-up", "From BRAC → To bKash", "Positive", "P2",
   "Baseline B1.", S(OPEN_EXP, "Transfer: BRAC Bank → bKash ৳5,000. Save."), "",
   "BRAC ৳1,75,000. bKash ৳25,000. MFS tile ৳25,000.", "No change.", "No change.", "", "", "P2-22,DV-BWT")

tc("MF-EXP-112", M, "Transfer between accounts", "Invalid transfers", "—", "Negative", "P2",
   "Baseline B1.",
   S(OPEN_EXP, "Transfer: from and to both BRAC Bank. Save.", "Transfer bKash → BRAC ৳30,000 (more than ৳20,000). Save.", "Check that BRAC DPS / Sanchaypatra are not offered as 'From'."),
   "", "No change.", "No change.", "No change.", "Step 2: 'Source and destination must be different.' Step 3: insufficient balance error. Step 4: not listed.",
   "", "AR-PAY,ADR-0014", "UI")

# =====================================================================================
# J. EDIT / DELETE / CROSS-CUTTING (expenses)
# =====================================================================================
tc("MF-EXP-120", M, "Edit spending", "Editing the amount re-flows every screen", "Cash", "Positive", "P1",
   "MF-EXP-001 done; Groceries budget ৳5,000.",
   S("Transactions → edit Meena Bazar → Amount 2,000 → confirm."),
   "৳1,500 → ৳2,000",
   "In-Hand Cash ৳3,000.", "Spending ৳2,000. Net Savings ৳78,000.", "No change.", "Groceries budget ৳2,000 (40%). History Nov ৳2,000.",
   "", "RT-UPD,T-03,DV-SPEND,FR-10")

tc("MF-EXP-121", M, "Edit category", "Category may change only within the same type", "—", "Negative", "P2",
   "MF-EXP-001 done.",
   S("Edit the Groceries row → change category to Dining → save.", "Edit again → try to change to DPS / Savings or Loan Given."),
   "",
   "No balance change.", "The chart moves ৳1,500 from Groceries to Dining.", "No change.", "Step 2 blocked: 'Cannot change to a different routing type' (delete and re-enter).",
   "", "RT-UPD")

tc("MF-EXP-122", M, "Delete spending", "Deleting reverses every figure (soft delete)", "Cash", "Positive", "P1",
   "MF-EXP-004 done.",
   S("Transactions → delete the Rent ৳8,000 row.", "Check every screen."),
   "",
   "BRAC ৳1,76,800 (+৳8,000).", "Spending ৳7,850. Net Savings ৳72,150.", "No change.",
   "Row gone from the list and history; the audit trail is kept (soft delete).", "", "RT-DEL,BR-SOFT,US-29,T-03,ADR-0005")

tc("MF-EXP-123", M, "Delete DPS deposit", "Deleting a DPS deposit reverses the account and the tax rebate", "—", "Positive", "P1",
   "MF-EXP-028 done (T1 + DPS ৳10,000).",
   S("Transactions → delete the DPS ৳10,000 row.", "Open Bank & Wallet and Tax."),
   "",
   "BRAC ৳10,40,000. BRAC DPS ৳0.", "No change.", "DPS invested ৳0. Rebate ৳0. Net Tax ৳26,500. Remaining ৳6,500.", "",
   "", "RT-DEL,DV-REBATE,DV-BAL,BR-SOFT")

tc("MF-EXP-124", M, "Delete loan / tax entry", "Deleting loan and tax entries reverses ledgers and Tax Paid", "—", "Positive", "P1",
   "MF-EXP-070 and MF-EXP-085 done.",
   S("Delete the Loan Given ৳5,000 (Mithun).", "Delete the Tax Payment ৳5,000."),
   "",
   "Cash +৳5,000. BRAC +৳5,000.", "People owe you ৳0.", "Total Paid back to ৳20,000. Remaining ৳6,500.", "Mithun ৳0.",
   "", "RT-DEL,DV-LOAN,DV-TAXPAID,BR-SOFT")

tc("MF-EXP-125", M, "Bulk delete", "Bulk delete of mixed entries", "—", "Positive", "P2",
   "MF-EXP-004 done.", S("Transactions → select Transport, Utility and Other → Delete selected."), "",
   "Cash ৳5,000 (+৳550). BRAC ৳1,70,000 (+৳1,200).", "Spending ৳14,100.", "No change.", "3 rows removed.", "", "US-30,BR-SOFT")

tc("MF-EXP-126", M, "Edit paying account", "Correcting the wrong paying account on an existing expense", "Bank", "Edge", "P2",
   "MF-EXP-002 done (paid from BRAC by mistake).",
   S("Transactions → edit the row → change the paying account to bKash → save."),
   "",
   "Business expectation: BRAC back to ৳1,80,000; bKash ৳18,500.", "Spending unchanged ৳1,500.", "No change.", "",
   "FINDING F-06: edit mode hides the account picker, so a wrong account cannot be fixed without delete and re-enter.",
   "RT-UPD,FR-04", "UI")

tc("MF-EXP-127", M, "All categories", "Another user never sees this user's money", "—", "Security", "P1",
   "MF-EXP-004 done for user A. Fresh user B.",
   S("Log in as user B. Open Dashboard, Bank & Wallet, Transactions, Loans and Tax."),
   "", "B sees none of A's accounts.", "B's tiles are ৳0.", "B has no FY figures from A.", "B has no transactions or loan persons.",
   "", "FR-01,T-03")

# =====================================================================================
# K. ADD INCOME
# =====================================================================================
M = "Add Income"
OPEN_INC = "Open Income → Add Income."

tc("MF-INC-001", M, "Salary", "Monthly salary into the bank: account, dashboard and tax all update", "Received into BRAC Bank", "Positive", "P1",
   "Baseline B0 (B1 accounts, no income).",
   S(OPEN_INC, "Choose Salary. Year & Month: November 2026.", "In-Hand Salary 1,00,000 · TDS Amount 10,000 · Employer: ACME Ltd.",
     "Check the summary box: Gross ৳1,10,000 − TDS ৳10,000 = In-Hand ৳1,00,000.", "Received into: BRAC Bank. Taxable income: checked. Save.",
     "Open Bank & Wallet, Dashboard, Tax, Income and History."),
   "In-Hand ৳1,00,000 · TDS ৳10,000 · Gross ৳1,10,000",
   "BRAC Bank ৳1,00,000 → ৳2,00,000 (+ In-Hand, NOT gross). Net Worth ৳1,25,000 → ৳2,25,000.",
   "Income ৳1,00,000 (In-Hand). Net Savings ৳1,00,000. Savings Rate 100%. Discretionary cash ৳1,00,000. Remaining to spend ৳1,00,000.",
   "FY2026-27: Gross Income ৳1,10,000 (gross, not in-hand). Exemption ৳36,666.67. Taxable ৳73,333.33. Gross Tax ৳0. TDS deducted from salary ৳10,000. Total Paid ৳10,000. Overpaid ৳10,000.",
   "Income page: November = Entered; YTD Salary ৳1,10,000. History (Nov): Income ৳1,00,000, TDS ৳10,000.",
   "Income credits the account with gross − TDS (ADR-0014). Dashboard uses In-Hand; Tax uses Gross.",
   "FR-03,US-16,US-17,US-22,T-07,ADR-0014,DV-BAL,DV-INHAND,DV-NETSAV,DV-RATE,DV-DISC,DV-TAXPAID,FR-TAX-02,FR-08,P2-22")

tc("MF-INC-002", M, "Salary (tax effect)", "Adding November's salary recalculates the whole-year tax", "Received into BRAC Bank", "Positive", "P1",
   "Baseline T1 (Jul–Oct salaries; Gross Tax ৳26,500; Remaining ৳6,500).",
   S(OPEN_INC, "Salary · November 2026 · In-Hand 2,35,000 · TDS 5,000 · Received into BRAC Bank. Save.", "Open Tax and Dashboard."),
   "Gross ৳2,40,000",
   "BRAC Bank ৳10,40,000 → ৳12,75,000.",
   "Nov Income ৳2,35,000. The 'estimated income' label disappears. Tax card: Paid so far ৳25,000 · Remaining ৳23,750 · Suggested TDS/mo ৳3,392.86.",
   "Gross ৳9,60,000 → ৳12,00,000. Exemption ৳4,00,000. Taxable ৳8,00,000. Slabs: 0% on ৳3,75,000; 10% on ৳3,00,000 = ৳30,000; 15% on ৳1,25,000 = ৳18,750. Gross Tax ৳48,750. TDS ৳25,000. Remaining ৳23,750. Suggested monthly TDS ৳23,750 ÷ 7 = ৳3,392.86. Months entered 5. Further investment for max rebate ৳2,40,000.",
   "Income page: Nov Entered.", "BRD: submitting salary recalculates cumulative taxable income and projected tax.",
   "FR-03,FR-TAX-02,FR-TAX-05,US-61,US-62,US-63,US-59,T-07,T-09,DV-EST,FR-02")

tc("MF-INC-003", M, "Salary", "Last month's salary is pre-filled", "—", "Positive", "P2",
   "Baseline T1.", S(OPEN_INC, "Choose Salary and look at the fields before typing."), "",
   "", "", "", "In-Hand ৳2,35,000 and TDS ৳5,000 pre-filled from October; editable.", "", "US-19,FR-03", "UI")

tc("MF-INC-004", M, "Salary", "Salary needs a receiving account", "—", "Negative", "P2",
   "Baseline B0.", S(OPEN_INC, "Salary · Nov · In-Hand 50,000 · Received into: blank. Save."), "",
   "No change.", "No change.", "No change.", "Blocked: account required for salary.", "", "P2-22,ADR-0014", "UI")

tc("MF-INC-005", M, "Salary", "Allowed receiving accounts", "bKash / In-Hand Cash", "Positive", "P2",
   "Baseline B0.",
   S(OPEN_INC, "Open 'Received into': check BRAC Bank, bKash and In-Hand Cash are listed; BRAC DPS and investments are not.", "Save a salary of In-Hand ৳20,000 into bKash."),
   "", "bKash ৳40,000.", "Income ৳20,000.", "Gross +৳20,000.", "", "Only Payment Accounts receive income.", "AR-PAY,P2-22")

tc("MF-INC-006", M, "Salary with Bonus and Allowances", "Bonus typed inside the salary form", "Received into BRAC Bank", "Edge", "P2",
   "Baseline T1.",
   S(OPEN_INC, "Salary · Nov · In-Hand 2,35,000 · TDS 5,000 · Bonus 20,000 · Other Allowances 5,000 · BRAC. Save.", "Open the Income YTD breakdown and Tax."),
   "",
   "BRAC +৳2,60,000.",
   "Nov Income ৳2,60,000.",
   "Gross +৳2,65,000 (৳12,25,000 total).",
   "Business expectation: the YTD table shows the bonus as its own component (e.g. Eid Festival Bonus), not merged into Salary.",
   "FINDING F-08: the form saves one Salary entry with gross = in-hand + bonus + allowances + TDS.",
   "FR-03,US-21")

tc("MF-INC-007", M, "Salary (mid-year raise)", "A pay rise uses actual months, not an annualised figure", "Received into BRAC Bank", "Positive", "P1",
   "Baseline T1 (Jul–Oct gross ৳2,40,000 each).",
   S(OPEN_INC, "Salary · Nov · In-Hand 2,90,000 · TDS 10,000 · BRAC. Save.", "Open Tax (Overview and Forecast)."),
   "Nov gross ৳3,00,000",
   "BRAC ৳13,30,000.", "Nov Income ৳2,90,000.",
   "Gross = actual sum ৳12,60,000 (NOT ৳3,00,000 × 12). Exemption ৳4,20,000. Taxable ৳8,40,000. Gross Tax ৳54,750. TDS ৳30,000. Remaining ৳24,750. Suggested TDS ৳3,535.71. The Forecast tab is labelled as a projection.",
   "", "GAP-05.", "GAP-05,FR-TAX-02,US-66,FR-TAX-06")

tc("MF-INC-008", M, "Any income type", "TDS validation", "—", "Negative", "P2",
   "Baseline B0.",
   S(OPEN_INC, "Salary with TDS −1,000. Save.", "Salary with In-Hand 0 and TDS 0. Save."),
   "", "No change.", "No change.", "No change.", "'TDS cannot be negative' / 'Amount is required'.",
   "0 ≤ TDS ≤ Gross (gross = in-hand + TDS by design).", "BR-TDS,US-18")

tc("MF-INC-009", M, "Salary (fiscal year boundary)", "June income belongs to the previous fiscal year", "Received into BRAC Bank", "Edge", "P1",
   "Baseline B0, but set BRAC Bank's opening date to 01-Jun-2026.",
   S(OPEN_INC, "Salary · June 2026 · In-Hand 50,000 · TDS 0 · BRAC. Save.", "Salary · July 2026 · In-Hand 60,000 · TDS 0 · BRAC. Save.", "Open Tax for FY2025-26 and FY2026-27, and Dashboard for June and July."),
   "",
   "BRAC ৳2,10,000.", "June Income ৳50,000; July Income ৳60,000 (calendar months).",
   "FY2025-26 Gross includes ৳50,000. FY2026-27 Gross includes ৳60,000.", "",
   "1 July → new FY; 30 June → old FY.", "FR-TAX-01,ADR-0007")

tc("MF-INC-010", M, "Salary (two entries in a month)", "Arrears or a second salary in the same month", "Received into BRAC Bank", "Edge", "P3",
   "MF-INC-001 done.", S(OPEN_INC, "Salary · November 2026 · In-Hand 10,000 (arrears) · TDS 0 · BRAC. Save."), "",
   "BRAC ৳2,10,000.", "Nov Income ৳1,10,000.", "Gross ৳1,20,000.", "Both entries listed for November.", "", "FR-03,DV-INHAND")

tc("MF-INC-011", M, "Cheer", "Cheer from a colleague, with payer and earned period", "Received into bKash", "Positive", "P1",
   "Baseline T1.",
   S(OPEN_INC, "Other income → Income Type: Cheer · Amount Received 20,000 · TDS 0 · Payer Name: Rakib · Earned Period: Q3 2026 · Received into bKash · Taxable: checked. Save."),
   "৳20,000",
   "bKash ৳40,000.", "Nov Income ৳20,000.",
   "Gross ৳9,80,000. Exemption ৳3,26,666.67. Taxable ৳6,53,333.33. Gross Tax ৳27,833.33. Remaining ৳7,833.33. Suggested TDS ৳979.17.",
   "Income list shows payer Rakib and earned period Q3 2026.", "Whether Cheer is taxable is open in ticket 24 item 5.",
   "FR-03,US-20,GAP-04,T-07,T-24,FR-TAX-02")

tc("MF-INC-012", M, "Profit Share", "Profit share with TDS", "Received into BRAC Bank", "Positive", "P1",
   "Baseline T1.",
   S(OPEN_INC, "Income Type: Profit Share · Amount Received 45,000 · TDS 5,000 · BRAC. Save."),
   "Gross ৳50,000",
   "BRAC +৳45,000.", "Nov Income ৳45,000.",
   "Gross ৳10,10,000. Exemption ৳3,36,666.67. Taxable ৳6,73,333.33. Gross Tax ৳29,833.33. TDS ৳25,000. Remaining ৳4,833.33. Suggested TDS ৳604.17.",
   "", "", "FR-03,US-21,FR-TAX-02,DV-TAXPAID")

tc("MF-INC-013", M, "Eid Festival Bonus", "Festival bonus moves tax into the 15% slab", "Received into BRAC Bank", "Positive", "P1",
   "Baseline T1.",
   S(OPEN_INC, "Income Type: Eid Festival Bonus · Amount Received 1,20,000 · TDS 0 · BRAC. Save."),
   "৳1,20,000",
   "BRAC +৳1,20,000.", "Nov Income ৳1,20,000.",
   "Gross ৳10,80,000. Exemption ৳3,60,000. Taxable ৳7,20,000. Slabs: 10% × ৳3,00,000 = ৳30,000; 15% × ৳45,000 = ৳6,750. Gross Tax ৳36,750. Remaining ৳16,750. Suggested TDS ৳2,093.75.",
   "", "", "FR-03,US-21,US-62,FR-TAX-02")

tc("MF-INC-014", M, "Leave Encashment", "Leave encashment with TDS", "Received into BRAC Bank", "Positive", "P2",
   "Baseline T1.",
   S(OPEN_INC, "Income Type: Leave Encashment · Amount Received 27,000 · TDS 3,000 · BRAC. Save."),
   "Gross ৳30,000",
   "BRAC +৳27,000.", "Nov Income ৳27,000.",
   "Gross ৳9,90,000. Exemption ৳3,30,000. Taxable ৳6,60,000. Gross Tax ৳28,500. TDS ৳23,000. Remaining ৳5,500. Suggested TDS ৳687.50.",
   "", "", "FR-03,US-21")

tc("MF-INC-015", M, "Certification Reimbursement", "Defaults to NOT taxable: money in, no tax change", "Received into BRAC Bank", "Positive", "P1",
   "Baseline T1.",
   S(OPEN_INC, "Income Type: Certification Reimbursement. Check that 'Taxable income' is unchecked by default.", "Amount 15,000 · TDS 0 · BRAC. Save."),
   "৳15,000",
   "BRAC +৳15,000.", "Nov Income ৳15,000 (In-Hand still counts).",
   "No change: Gross ৳9,60,000 · Gross Tax ৳26,500.", "",
   "Exempt by default; confirm the rule (ticket 24 item 5).", "FR-03,US-21,T-24,FR-TAX-02")

tc("MF-INC-016", M, "Certification Reimbursement (taxable on)", "The user can mark it taxable", "Received into BRAC Bank", "Edge", "P3",
   "Baseline T1.", S(OPEN_INC, "Certification Reimbursement · 15,000 · tick 'Taxable income' · BRAC. Save."), "",
   "BRAC +৳15,000.", "Nov Income ৳15,000.", "Gross ৳9,75,000. Taxable ৳6,50,000. Gross Tax ৳27,500.", "", "", "FR-03,FR-TAX-02")

tc("MF-INC-017", M, "Holiday Support", "Holiday support income reaches tax exactly once", "Received into BRAC Bank", "Positive", "P2",
   "Baseline T1.",
   S("Income → Holiday Support log: 2 days at the Holiday rate (enter a rate that gives ৳8,000). Check the computed amount.", "If the log does not create income, add Income Type: Holiday Support ৳8,000 → BRAC.", "Open Income and Tax."),
   "৳8,000",
   "BRAC +৳8,000 (once).", "Nov Income ৳8,000.",
   "Gross ৳9,68,000. Exemption ৳3,22,666.67. Taxable ৳6,45,333.33. Gross Tax ৳27,033.33. Suggested TDS ৳879.17.",
   "Holiday support counted once (not zero, not twice).",
   "FINDING F-10: confirm how the Holiday Support worksheet and the Holiday Support income type relate.",
   "FR-03,US-23,GAP-08")

tc("MF-INC-018", M, "Bank Savings Interest", "Bank interest: gross is taxable, TDS is a tax credit, account gets the net", "Received into BRAC Bank", "Positive", "P1",
   "Baseline T1.",
   S(OPEN_INC, "Income Type: Bank Savings Interest · Amount Received 9,000 · TDS 1,000 · Received into BRAC Bank. Save.", "Open Tax."),
   "Gross ৳10,000 · TDS ৳1,000 · Net ৳9,000",
   "BRAC ৳10,49,000 (+ net ৳9,000).", "Nov Income ৳9,000.",
   "Gross ৳9,70,000. Exemption ৳3,23,333.33. Taxable ৳6,46,666.67. Gross Tax ৳27,166.67. TDS ৳21,000. Remaining ৳6,166.67. Suggested TDS ৳770.83. p2-10: an income line for savings interest and a TDS-on-savings-income line are shown.",
   "",
   "p2-10 Scenario A. BUSINESS QUESTION (ticket 24 item 5): under NBR the one-third exemption may apply to salary only; if so, taxable interest is the full ৳10,000.",
   "P2-10,FR-TAX-02,FR-TAX-05,T-24,DV-TAXPAID")

tc("MF-INC-019", M, "Sanchaypatra Profit", "Sanchaypatra profit: taxed gross, TDS credited, principal untouched", "Received into BRAC Bank", "Positive", "P1",
   "Baseline T1 plus Sanchaypatra ৳50,000 (MF-EXP-035).",
   S(OPEN_INC, "Income Type: Sanchaypatra Profit · Amount Received 69,750 · TDS 7,750 · BRAC. Save."),
   "Gross ৳77,500 · TDS ৳7,750",
   "BRAC +৳69,750. Sanchaypatra stays ৳50,000 (profit is not principal).", "Nov Income ৳69,750.",
   "Gross ৳10,37,500. Exemption ৳3,45,833.33. Taxable ৳6,91,666.67. Slabs: 10% × ৳3,00,000 = ৳30,000; 15% × ৳16,666.67 = ৳2,500. Gross Tax ৳32,500. Rebate ৳5,000 (from the ৳50,000 Sanchaypatra). Net Tax ৳27,500. TDS ৳27,750. Overpaid ৳250.",
   "", "p2-10 Scenario B.", "P2-10,FR-TAX-02,FR-TAX-04,DV-TAXPAID")

tc("MF-INC-020", M, "Other", "Income not received into any account", "Not into one of my accounts", "Edge", "P2",
   "Baseline B0.",
   S(OPEN_INC, "Income Type: Other · Amount Received 10,000 · TDS 0 · Received into: 'Not into one of my accounts'. Save."),
   "",
   "No account changes. Net Worth unchanged.", "Income ৳10,000 (counted as In-Hand).", "Gross +৳10,000.", "",
   "BUSINESS QUESTION F-18: In-Hand income rises with no money tracked anywhere. Confirm.", "FR-03,DV-INHAND")

tc("MF-INC-021", M, "Edit income", "Editing a salary re-flows the account, dashboard and tax", "BRAC Bank", "Positive", "P1",
   "MF-INC-001 done.",
   S("Income → edit November Salary → In-Hand 1,20,000, TDS 10,000. Save."),
   "",
   "BRAC ৳2,20,000.", "Income ৳1,20,000.", "Gross ৳1,30,000. TDS ৳10,000.", "", "", "RT-UPD,FR-03,DV-BAL")

tc("MF-INC-022", M, "Delete income", "Deleting a salary removes it everywhere", "BRAC Bank", "Positive", "P1",
   "MF-INC-001 done.", S("Income → delete November Salary."), "",
   "BRAC back to ৳1,00,000.", "Income ৳0. Savings Rate shown as '—' (no income).", "Gross ৳0. TDS ৳0.", "November back to Pending.",
   "TC-P2ACC-009.", "BR-SOFT,RT-DEL,DV-RATE,US-22")

tc("MF-INC-023", M, "Any income type", "Filed (locked) fiscal year refuses new income", "—", "Negative", "P3",
   "FY2025-26 marked Filed (locked).", S(OPEN_INC, "Salary · May 2026 · ৳10,000. Save."), "",
   "No change.", "No change.", "FY2025-26 unchanged.", "Error: the year is locked.", "", "FR-TAX-01,T-09")

tc("MF-INC-024", M, "Salary proposal", "One-tap salary confirmation flows like a manual entry", "BRAC Bank", "Positive", "P2",
   "Baseline T1 (October salary exists); it is a new month with no November salary.",
   S("Dashboard/Income: find the proposal card 'Your salary was ৳2,35,000 last month. Confirm for November 2026?'", "Confirm."),
   "",
   "BRAC +৳2,35,000 (same receiving account as last month).", "Same as MF-INC-002.", "Same as MF-INC-002.", "The card disappears and does not reappear this month.",
   "", "P2-11,US-19")

tc("MF-INC-025", M, "Early filing rebate", "Filing by 30 September earns the 5% early-filing rebate", "—", "Positive", "P2",
   "Baseline B0 plus Salary June 2026 (FY2025-26) In-Hand ৳12,00,000, TDS 0 (one entry only to reach the taxable band).",
   S("Tax → FY2025-26: note Net Tax.", "Mark the return Filed on 15-Sep-2026.", "Re-open, set the filed date to 05-Oct-2026."),
   "",
   "", "",
   "Before filing: Gross ৳12,00,000 · Taxable ৳8,00,000 · Gross Tax ৳48,750 · Net Tax ৳48,750. Filed 15-Sep: Early filing rebate ৳2,437.50 → Net Tax ৳46,312.50. Filed 05-Oct: no early filing rebate.",
   "", "GAP-06 / US-69. Ticket 24 item 7 (first year and base) is open.", "GAP-06,US-69,T-24,FR-TAX-04")

tc("MF-INC-026", M, "Estimated income", "Without this month's salary, cash figures use last month's and say so", "—", "Positive", "P2",
   "Baseline T1 (no November salary).",
   S("Open the Dashboard for November."),
   "", "", "Income ৳0. Discretionary cash and Remaining to spend use October's ৳2,35,000 and are labelled as estimated.", "", "",
   "", "DV-EST,DV-DISC,DV-RTS,FR-10")

tc("MF-INC-027", M, "Salary", "Tax data-completeness bar", "—", "Positive", "P3",
   "Baseline T1.", S("Open Tax FY2026-27: note the completeness bar.", "Run MF-INC-002."), "",
   "", "", "4 of 12 months → 5 of 12 months.", "", "", "US-59,FR-TAX-06", "UI")

# =====================================================================================
# L. END-TO-END
# =====================================================================================
M = "End-to-End"
tc("MF-E2E-001", M, "Full month (all routing types)", "One realistic November: every screen must reconcile", "Mixed", "Positive", "P1",
   "Baseline B0 plus F1 templates (Mess Rent ৳8,722, BRAC DPS ৳10,000, Home Internet ৳500).",
   S("Add Income: Salary Nov In-Hand 1,50,000 · TDS 10,000 → BRAC.",
     "Transfer BRAC → In-Hand Cash ৳10,000.",
     "Groceries ৳3,200 Cash.",
     "Fixed Expenses → Mess Rent Nov ৳8,722 from BRAC.",
     "Fixed Expenses → BRAC DPS Installment Nov ৳10,000 from BRAC.",
     "Fixed Expenses → Home Internet Nov ৳500 from bKash.",
     "Dining ৳1,250 bKash.",
     "Loan Given → Mithun ৳5,000 bKash.",
     "Loan Received → Sohel ৳2,000 Cash.",
     "Investment → Sanchaypatra ৳20,000 from BRAC.",
     "Tax Payment ৳3,000 from BRAC.",
     "Check every screen against the expected columns."),
   "11 entries",
   "BRAC Bank ৳1,98,278 · BRAC DPS ৳10,000 · Bank Balance tile ৳2,08,278 · bKash ৳13,250 · In-Hand Cash ৳13,800 · Sanchaypatra ৳20,000 · Net Worth (accounts) ৳2,55,328 (check: ৳1,25,000 + ৳1,50,000 − ৳13,672 spending − ৳5,000 lent + ৳2,000 borrowed − ৳3,000 tax). With loans (p2-05): ৳2,58,328.",
   "Income ৳1,50,000 · Spending ৳13,672 (Groceries ৳3,200, Rent ৳8,722, Utility ৳500, Dining ৳1,250) · Net Savings ৳1,33,328 · Savings Rate ≈ 88.9% · Fixed commitments ৳19,222 · Discretionary cash ৳1,30,778 · Remaining to spend ৳1,00,328 · People owe you ৳5,000 · You owe ৳2,000.",
   "FY2026-27: Gross ৳1,60,000 · Exemption ৳53,333.33 · Taxable ৳1,06,666.67 · Gross Tax ৳0 · DPS ৳10,000 + Sanchaypatra ৳20,000 = eligible ৳30,000 · Rebate ৳0 (no tax to rebate) · TDS ৳10,000 + advance ৳3,000 = Total Paid ৳13,000 · Overpaid ৳13,000.",
   "Fixed Expenses Nov: all 3 Paid. Loans: Mithun +৳5,000 green, Sohel −৳2,000 red. History Nov: Income ৳1,50,000 · Spending ৳13,672 · TDS ৳10,000. Transactions: 11 rows; the transfer is not in spending.",
   "The master reconciliation case. Run it after any change to routing.",
   "FR-02,FR-04-RT,FR-05,FR-07,FR-08,US-07,US-74,DV-BAL,DV-BWT,DV-NW,DV-SPEND,DV-NETSAV,DV-RATE,DV-FC,DV-DISC,DV-RTS,DV-TAXPAID,DV-LOAN,DV-INHAND,ADR-0006,ADR-0014,T-11,P2-05")

tc("MF-E2E-002", M, "Fiscal-year tax journey", "Salary + DPS + Sanchaypatra + advance tax over the year", "Mixed", "Positive", "P1",
   "Baseline T1.",
   S("Add Income: Salary Nov In-Hand 2,35,000 · TDS 5,000 → BRAC.", "Fixed Expenses/DPS: BRAC DPS ৳10,000 from BRAC.", "Investment → Sanchaypatra ৳50,000 from BRAC.", "Tax Payment ৳10,000 from BRAC.", "Open Tax (Overview and Planner) and the Dashboard tax card."),
   "",
   "BRAC ৳12,05,000 · BRAC DPS ৳10,000 · Sanchaypatra ৳50,000.",
   "Tax card: Paid so far ৳35,000 · Remaining ৳7,750 · Suggested TDS/mo ৳1,107.14.",
   "Gross ৳12,00,000 · Taxable ৳8,00,000 · Gross Tax ৳48,750 · Eligible ৳60,000 · Rebate MIN(৳24,000, ৳6,000, ৳10L) = ৳6,000 · Net Tax ৳42,750 · TDS ৳25,000 + advance ৳10,000 = ৳35,000 · Remaining ৳7,750 · Suggested ৳7,750 ÷ 7 = ৳1,107.14 · Further investment ৳1,80,000. What-if planner: +৳50,000 investment → Rebate ৳11,000 → 'you save ৳5,000'.",
   "", "", "FR-TAX-02,FR-TAX-04,FR-TAX-05,FR-TAX-06,US-13,US-60,US-63,US-65,P2-09,T-09,DV-REBATE,DV-TAXPAID,FR-02")
