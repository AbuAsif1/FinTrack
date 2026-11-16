# -*- coding: utf-8 -*-
"""Builds qa/test-cases/FinTrack-BD_Test-Cases.xlsx from tc_data.py.

Usage (from the repo root):  python qa/tools/build_xlsx.py [output.xlsx]

Edit test cases in tc_data.py, then re-run. Results already recorded in the workbook
(Execution Status, Actual Result, Defect ID, Tested By / Date) are carried over by TC ID,
so regenerating never erases a test run. Close the workbook in Excel before running.
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from tc_data import TCS
from openpyxl import Workbook, load_workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.formatting.rule import CellIsRule, FormulaRule
from openpyxl.utils import get_column_letter

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "qa", "test-cases", "FinTrack-BD_Test-Cases.xlsx")

# ---------------------------------------------------------------- suites
SMOKE = {"MF-EXP-001", "MF-EXP-002", "MF-EXP-020", "MF-INC-001", "MF-EXP-085"}
AREAS = [  # (id prefix, first no, last no, sanity area)
    ("MF-EXP", 1, 19, "Spending"), ("MF-EXP", 120, 129, "Spending"),
    ("MF-EXP", 20, 49, "DPS & Investment"), ("MF-EXP", 50, 69, "Withdrawal & Interest"),
    ("MF-EXP", 70, 84, "Loans"), ("MF-EXP", 85, 94, "Tax Payment"),
    ("MF-EXP", 95, 109, "Fixed Expenses"), ("MF-EXP", 110, 119, "Transfer"),
    ("MF-INC", 1, 999, "Income"), ("MF-E2E", 1, 999, "End-to-End"),
]


def sanity_area(tid):
    pre, no = tid.rsplit("-", 1)
    for p, lo, hi, area in AREAS:
        if pre == p and lo <= int(no) <= hi:
            return area
    raise SystemExit(f"No sanity area for {tid}")


def suites(t):
    s = []
    if t["id"] in SMOKE: s.append("Smoke")
    if t["pri"] == "P1": s.append("Sanity")
    if (t["pri"] == "P1" and t["typ"] == "Positive") or t["module"] == "End-to-End": s.append("Happy Path")
    s.append("Regression")
    return ", ".join(s)


for t in TCS:
    t["suites"] = suites(t)
    t["area"] = sanity_area(t["id"])

# ---------------------------------------------------------------- keep recorded results
KEEP = ["Execution Status", "Actual Result", "Defect ID", "Tested By / Date"]
previous = {}
if os.path.exists(OUT):
    old = load_workbook(OUT)
    if "Test Cases" in old.sheetnames:
        ows = old["Test Cases"]
        hdr = [c.value for c in ows[1]]
        for row in ows.iter_rows(min_row=2, values_only=True):
            if row and row[0]:
                previous[row[0]] = {k: row[hdr.index(k)] for k in KEEP if k in hdr}

# ---------------------------------------------------------------- requirement catalog
REQ = [
 # id, source, section, summary
 ("FR-01", "BRD", "§5 FR-01", "All financial data scoped to the authenticated user; no cross-account access"),
 ("FR-02", "BRD", "§5 FR-02", "Dashboard: In-Hand Income, Spending, Net Savings, Savings Rate, tax snapshot, loan summary"),
 ("FR-03", "BRD", "§5 FR-03", "Income entry: types, gross, TDS, auto In-Hand, Cheer fields, salary recalculates tax, prefill"),
 ("FR-04", "BRD", "§5 FR-04", "Spending entry: amount, date (default today), description, category, payment method"),
 ("FR-04-RT", "BRD", "§5 FR-04 routing table", "Category routing side-effects: what each category deducts from and adds to"),
 ("FR-05", "BRD", "§5 FR-05", "Fixed Expenses: templates, monthly instances, Mark Paid with actual amount creates a linked transaction, banners"),
 ("FR-06", "BRD", "§5 FR-06", "Savings & DPS accounts; balance = opening + linked transactions (computed)"),
 ("FR-07", "BRD", "§5 FR-07", "Borrow-Loan ledger: per-person running balance, Given/Received, due dates, Settle Up"),
 ("FR-08", "BRD", "§5 FR-08", "History & analytics: monthly income, spending by category, savings, TDS"),
 ("FR-09", "BRD", "§5 FR-09", "Notifications: fixed expense due/overdue, loan due, budget 80% and exceeded"),
 ("FR-10", "BRD", "§5 FR-10", "Monthly category budgets; colour bands; Discretionary Cash"),
 ("FR-TAX-01", "BRD", "§6 FR-TAX-01", "Fiscal year July–June; income assigned to FY by date; locked years read-only"),
 ("FR-TAX-02", "BRD", "§6 FR-TAX-02", "Gross, Exemption = MIN(Gross/3, cap), Taxable = Gross − Exemption"),
 ("FR-TAX-03", "BRD", "§6 FR-TAX-03", "Tax slabs and parameters are data per fiscal year, not code"),
 ("FR-TAX-04", "BRD", "§6 FR-TAX-04", "Rebate = MIN(Taxable×3%, Eligible×rate, max); investment caps per bucket"),
 ("FR-TAX-05", "BRD", "§6 FR-TAX-05", "Remaining = Net Tax − Tax Paid; Suggested monthly TDS"),
 ("FR-TAX-06", "BRD", "§6 FR-TAX-06", "Tax dashboard UI: tiles, completeness, investments, forecast"),
 ("GAP-02", "BRD", "§9 Gap Analysis", "Instance stores the actual amount paid (variable DPS/bills)"),
 ("GAP-04", "BRD", "§9 Gap Analysis", "Cheer income with payer name"),
 ("GAP-05", "BRD", "§9 Gap Analysis", "Mid-year salary change uses actual monthly entries"),
 ("GAP-06", "BRD", "§9 Gap Analysis", "First-quarter (early) filing incentive"),
 ("GAP-07", "BRD", "§9 Gap Analysis", "Discretionary cash = in-hand − fixed commitments"),
 ("GAP-08", "BRD", "§9 Gap Analysis", "Holiday support rate versioning / log"),
 ("GAP-10", "BRD", "§9 Gap Analysis", "No duplicate entry on network retry (idempotent UUID)"),
 ("BR-TDS", "BRD", "§7 Business rules", "0 ≤ TDS ≤ Gross"),
 ("BR-SOFT", "BRD", "§7 Business rules", "Soft delete only; balances exclude deleted rows"),
 ("BR-ATOMIC", "BRD", "§7 Business rules", "All routing side-effects atomic (all-or-nothing)"),
 ("AC-LOAN-1", "BRD", "§11 Acceptance", "Loan balances: Mithun ৳9,841 · Amait ৳1,198.50 · Sohel −৳3,145.42"),
 ("US-07", "MVP spec", "User story 7", "Dashboard tiles for the selected period"),
 ("US-12", "MVP spec", "User story 12", "Discretionary Cash indicator"),
 ("US-13", "MVP spec", "User story 13", "Tax snapshot card: paid, remaining, suggested TDS"),
 ("US-14", "MVP spec", "User story 14", "Loan summary on dashboard"),
 ("US-16", "MVP spec", "User story 16", "Record monthly income: month, type, gross, TDS"),
 ("US-17", "MVP spec", "User story 17", "In-Hand computed as Gross − TDS, read-only"),
 ("US-18", "MVP spec", "User story 18", "TDS validated between 0 and gross"),
 ("US-19", "MVP spec", "User story 19", "Last month's salary pre-filled"),
 ("US-20", "MVP spec", "User story 20", "Cheer with payer and earned period"),
 ("US-21", "MVP spec", "User story 21", "Profit Share, Eid Bonus, Leave Encashment, Certification as separate types"),
 ("US-22", "MVP spec", "User story 22", "FY income table with Entered/Pending per month"),
 ("US-23", "MVP spec", "User story 23", "Holiday Support log"),
 ("US-25", "MVP spec", "User story 25", "Add spending entry"),
 ("US-26", "MVP spec", "User story 26", "Entry date defaults to today"),
 ("US-27", "MVP spec", "User story 27", "Payment methods"),
 ("US-29", "MVP spec", "User story 29", "Soft delete transactions"),
 ("US-30", "MVP spec", "User story 30", "Bulk delete"),
 ("US-31", "MVP spec", "User story 31", "Routing indicator under a transaction"),
 ("US-32", "MVP spec", "User story 32", "DPS / Savings credits account and rebate tracker"),
 ("US-33", "MVP spec", "User story 33", "Sanchaypatra credits rebate-eligible total"),
 ("US-34", "MVP spec", "User story 34", "Loan Given creates a Loan Entry"),
 ("US-35", "MVP spec", "User story 35", "Loan Received records the obligation"),
 ("US-36", "MVP spec", "User story 36", "Routing rolls back atomically on failure"),
 ("US-40", "MVP spec", "User story 40", "Mark Fixed Expense paid with actual amount"),
 ("US-41", "MVP spec", "User story 41", "Mark Paid creates a linked Transaction"),
 ("US-42", "MVP spec", "User story 42", "Amber banner when due within 3 days"),
 ("US-43", "MVP spec", "User story 43", "Red banner when overdue"),
 ("US-50", "MVP spec", "User story 50", "Progress toward the ৳1,20,000 DPS cap"),
 ("US-51", "MVP spec", "User story 51", "Loan summary banner"),
 ("US-52", "MVP spec", "User story 52", "Per-person card with running balance"),
 ("US-53", "MVP spec", "User story 53", "Green 'owes you' / red 'You owe' labels"),
 ("US-54", "MVP spec", "User story 54", "Loan entry fields incl. direction"),
 ("US-55", "MVP spec", "User story 55", "New name creates a ledger automatically"),
 ("US-56", "MVP spec", "User story 56", "Loan return due alert"),
 ("US-57", "MVP spec", "User story 57", "Settle Up"),
 ("US-59", "MVP spec", "User story 59", "FY selector and data-completeness bar"),
 ("US-60", "MVP spec", "User story 60", "Gross Tax, Rebate, Net Tax tiles"),
 ("US-61", "MVP spec", "User story 61", "Taxable income breakdown"),
 ("US-62", "MVP spec", "User story 62", "Slab breakdown"),
 ("US-63", "MVP spec", "User story 63", "TDS reconciliation and suggested monthly TDS"),
 ("US-64", "MVP spec", "User story 64", "Investment table with caps and eligible amounts"),
 ("US-65", "MVP spec", "User story 65", "Required investment for maximum rebate"),
 ("US-66", "MVP spec", "User story 66", "Forecast tab"),
 ("US-69", "MVP spec", "User story 69", "Early filing incentive"),
 ("US-71", "MVP spec", "User story 71", "Budget colour bands"),
 ("US-74", "MVP spec", "User story 74", "Monthly summary table"),
 ("T-03", "Ticket", "MVP 03 Transaction CRUD", "Create/edit/soft-delete transactions; idempotency"),
 ("T-04", "Ticket", "MVP 04 Savings Accounts", "Computed account balances"),
 ("T-05", "Ticket", "MVP 05 Borrow-Loan Ledger", "Running balance Σgiven − Σreceived"),
 ("T-06", "Ticket", "MVP 06 Category Routing", "Atomic routing side-effects"),
 ("T-07", "Ticket", "MVP 07 Income Management", "Income types, In-Hand, Cheer fields"),
 ("T-08", "Ticket", "MVP 08 Fixed Expenses", "Templates, instances, mark paid, DPS as transfer"),
 ("T-09", "Ticket", "MVP 09 Tax Dashboard API", "Tax summary, rebate from DPS/Sanchaypatra, suggested TDS"),
 ("T-10", "Ticket", "MVP 10 Budget & Notifications", "Budgets, over-budget notification, discretionary cash"),
 ("T-11", "Ticket", "MVP 11 Dashboard Aggregates", "Dashboard summary aggregates"),
 ("T-24", "Ticket", "MVP 24 Confirm tax parameters", "Open decisions: threshold, rebate rate/max, exemption scope, Cheer, early filing"),
 ("P2-04", "Ticket", "p2-04 Monthly spending limit", "Overall monthly limit ring"),
 ("P2-05", "Ticket", "p2-05 Wallet balances & net worth", "Account balances, transfers, Net Worth incl. loans"),
 ("P2-06", "Ticket", "p2-06 Savings goals", "Goal progress from a linked account"),
 ("P2-07", "Ticket", "p2-07 Quarterly/annual Fixed Expenses", "Non-monthly cadence, monthly equivalent"),
 ("P2-09", "Ticket", "p2-09 What-if tax planner", "Invest ৳X more → save ৳Y"),
 ("P2-10", "Ticket", "p2-10 Tax on savings interest & Sanchaypatra profit", "Gross taxable, TDS credited"),
 ("P2-11", "Ticket", "p2-11 Recurring income", "Salary proposal one-tap confirm"),
 ("P2-22", "Ticket", "p2-22 Account types & Bank & Wallet", "Payment accounts, parent accounts, income credit, totals"),
 ("ADR-0005", "ADR", "0005 Derived balances", "Balances and totals are derived, never stored"),
 ("ADR-0006", "ADR", "0006 Savings deposits are transfers", "DPS/Sanchaypatra deposits are not spending"),
 ("ADR-0007", "ADR", "0007 Two time axes", "Calendar month for spending; fiscal year for tax"),
 ("ADR-0008", "ADR", "0008 Tax rules are per-year data", "Tax parameters stored per FY"),
 ("ADR-0014", "ADR", "0014 Every balance is an account", "Every movement names the account it leaves and enters"),
 ("ADR-0015", "ADR", "0015 Investment kinds feed rebate buckets", "Rebate bucket by destination account type"),
 ("DV-BAL", "Architecture", "§Derived values: Account balance", "Opening + income (gross − TDS) ± each transaction side"),
 ("DV-BWT", "Architecture", "§Derived values: Bank & Wallet totals", "Bank / MFS (incl. child DPS/FDR) / Cash / Investments"),
 ("DV-NW", "Architecture", "§Derived values: Net Worth", "Σ all account balances"),
 ("DV-SPEND", "Architecture", "§Derived values: Total Spending", "Σ NONE transactions"),
 ("DV-INHAND", "Architecture", "§Derived values: In-Hand Income", "Σ (gross − TDS) for the month"),
 ("DV-NETSAV", "Architecture", "§Derived values: Net Savings", "In-Hand − Spending − Tax Payments"),
 ("DV-RATE", "Architecture", "§Derived values: Savings Rate", "Net Savings ÷ In-Hand; null when income is 0"),
 ("DV-FC", "Architecture", "§Derived values: Fixed Commitments", "Actual if Paid, standard if Pending, 0 if Skipped"),
 ("DV-DISC", "Architecture", "§Derived values: Discretionary Cash", "In-Hand − Fixed Commitments"),
 ("DV-RTS", "Architecture", "§Derived values: Remaining to Spend", "In-Hand + cash in − cash out − pending standard"),
 ("DV-EST", "Architecture", "§Derived values: Estimated income", "Use last salary when the month has none; flag it"),
 ("DV-REBATE", "Architecture", "§Derived values: Rebate investment by bucket", "Σ deposits by destination account type in FY"),
 ("DV-TAXPAID", "Architecture", "§Derived values: Tax Paid", "Σ TDS + Σ Tax Payments for the FY"),
 ("DV-LOAN", "Architecture", "§Derived values: Running Balance", "Σ GIVEN − Σ RECEIVED per person"),
 ("AR-PAY", "Architecture", "§Account rules: Payment Accounts", "Only Bank/MFS/Cash pay, receive income, send transfers"),
 ("AR-CASH", "Architecture", "§Account rules: In-Hand Cash", "Cash payments use In-Hand Cash from its opening date"),
 ("AR-WD", "Architecture", "§Account rules: Withdrawal", "DPS/FDR withdrawal with no named account credits the parent"),
 ("AR-IDEM", "rules.md", "§Idempotency", "Duplicate key returns the existing record; no double write"),
 ("RT-UPD", "Architecture", "§Category routing: Update", "Amount/date/links editable; category only within the same routing type"),
 ("RT-DEL", "Architecture", "§Category routing: Soft delete", "Totals follow; paid instance returns to Pending"),
]
REQ_IDS = [r[0] for r in REQ]

used = set()
for t in TCS:
    for r in t["reqs"].split(","):
        r = r.strip()
        used.add(r)
        if r not in REQ_IDS:
            raise SystemExit(f"{t['id']} references unknown requirement {r}")
uncovered = [r for r in REQ_IDS if r not in used]
if uncovered:
    raise SystemExit(f"Requirements with no test case: {uncovered}")

# ---------------------------------------------------------------- styles
FONT = "Arial"
f_base = Font(name=FONT, size=10)
f_bold = Font(name=FONT, size=10, bold=True)
f_head = Font(name=FONT, size=10, bold=True, color="FFFFFF")
f_title = Font(name=FONT, size=14, bold=True, color="1F4E4A")
fill_head = PatternFill("solid", fgColor="299D91")
fill_exp = PatternFill("solid", fgColor="E8F5F3")
fill_input = PatternFill("solid", fgColor="FFFF00")
fill_mod = {"Add Expenses": "FFFFFF", "Add Income": "F7F9FC", "End-to-End": "FFF8E6"}
thin = Side(style="thin", color="BFBFBF")
border = Border(left=thin, right=thin, top=thin, bottom=thin)
wrap = Alignment(wrap_text=True, vertical="top")
center = Alignment(wrap_text=True, vertical="top", horizontal="center")

wb = Workbook()

# ================================================================= Sheet 1: Test Cases
ws = wb.active
ws.title = "Test Cases"
cols = [
 ("TC ID", 12, "id"), ("Module", 12, "module"), ("Category / Income Type", 20, "option"), ("Scenario", 34, "title"),
 ("Payment / Account", 18, "pay"), ("Type", 10, "typ"), ("Priority", 8, "pri"),
 ("Suites", 18, "suites"), ("Sanity Area", 14, "area"), ("Preconditions", 30, "pre"),
 ("Test Steps", 55, "steps"), ("Test Data", 18, "data"),
 ("Expected – Bank & Wallet (accounts)", 42, "bank"), ("Expected – Dashboard", 42, "dash"),
 ("Expected – Tax page", 46, "tax"), ("Expected – Other screens", 36, "other"),
 ("Business Rule / Note", 38, "note"), ("Requirement IDs", 26, "reqs"), ("Automation Candidate", 12, "auto"),
 ("Execution Status", 12, None), ("Actual Result", 30, None), ("Defect ID", 11, None), ("Tested By / Date", 14, None),
 ("_ReqKey", 6, None),
]
for c, (h, w, _) in enumerate(cols, 1):
    cell = ws.cell(row=1, column=c, value=h)
    cell.font, cell.fill, cell.alignment, cell.border = f_head, fill_head, center, border
    ws.column_dimensions[get_column_letter(c)].width = w
ws.row_dimensions[1].height = 32

COLNO = {h: i for i, (h, _, _) in enumerate(cols, 1)}
L = {h: get_column_letter(i) for h, i in COLNO.items()}
STATUS_COL = COLNO["Execution Status"]
REQ_COL = COLNO["Requirement IDs"]
KEY_COL = COLNO["_ReqKey"]
exp_cols = {i for h, i in COLNO.items() if h.startswith("Expected")}
input_cols = {COLNO[h] for h in KEEP}
center_cols = {COLNO[h] for h in ("Type", "Priority", "Sanity Area", "Automation Candidate", "Execution Status")}
for i, t in enumerate(TCS, 2):
    prev = previous.get(t["id"], {})
    for c, (h, w, key) in enumerate(cols, 1):
        if key:
            v = t[key]
            if key == "reqs":
                v = ", ".join(x.strip() for x in v.split(","))
        elif h in KEEP:
            v = prev.get(h) or ("Not Run" if h == "Execution Status" else None)
        elif c == KEY_COL:
            v = f'=","&SUBSTITUTE({get_column_letter(REQ_COL)}{i}," ","")&","'
        else:
            v = None
        cell = ws.cell(row=i, column=c, value=v)
        cell.font = f_bold if c == 1 else f_base
        cell.alignment = center if c in center_cols else wrap
        cell.border = border
        if c in exp_cols:
            cell.fill = fill_exp
        elif c in input_cols:
            cell.fill = fill_input
        else:
            cell.fill = PatternFill("solid", fgColor=fill_mod[t["module"]])
LAST = len(TCS) + 1
ws.column_dimensions[get_column_letter(KEY_COL)].hidden = True
ws.freeze_panes = "E2"
ws.auto_filter.ref = f"A1:{get_column_letter(len(cols)-1)}{LAST}"

dv = DataValidation(type="list", formula1='"Not Run,Pass,Fail,Blocked,Not Applicable"', allow_blank=False)
ws.add_data_validation(dv)
dv.add(f"{L['Execution Status']}2:{L['Execution Status']}{LAST}")
sc = f"{L['Execution Status']}2:{L['Execution Status']}{LAST}"
ws.conditional_formatting.add(sc, CellIsRule(operator="equal", formula=['"Pass"'], fill=PatternFill("solid", fgColor="C6EFCE")))
ws.conditional_formatting.add(sc, CellIsRule(operator="equal", formula=['"Fail"'], fill=PatternFill("solid", fgColor="FFC7CE")))
ws.conditional_formatting.add(sc, CellIsRule(operator="equal", formula=['"Blocked"'], fill=PatternFill("solid", fgColor="FFEB9C")))
ws.conditional_formatting.add(f"{L['Priority']}2:{L['Priority']}{LAST}", CellIsRule(operator="equal", formula=['"P1"'], font=Font(name=FONT, size=10, bold=True, color="C00000")))

# ================================================================= Sheet 2: Traceability
tr = wb.create_sheet("Traceability Matrix")
th = [("Requirement ID", 13), ("Source", 12), ("Section / Ticket", 30), ("Requirement Summary", 55),
      ("Linked Test Cases", 48), ("# Test Cases", 10), ("# Passed", 9), ("# Failed", 9), ("# Blocked", 9), ("Coverage Status", 22)]
for c, (h, w) in enumerate(th, 1):
    cell = tr.cell(row=1, column=c, value=h)
    cell.font, cell.fill, cell.alignment, cell.border = f_head, fill_head, center, border
    tr.column_dimensions[get_column_letter(c)].width = w
tr.row_dimensions[1].height = 30
rng_key = f"'Test Cases'!${L['_ReqKey']}$2:${L['_ReqKey']}${LAST}"
rng_st = f"'Test Cases'!${L['Execution Status']}$2:${L['Execution Status']}${LAST}"
rng_suite = f"'Test Cases'!${L['Suites']}$2:${L['Suites']}${LAST}"
for i, (rid, src, sec, summ) in enumerate(REQ, 2):
    linked = ", ".join(t["id"] for t in TCS if rid in [x.strip() for x in t["reqs"].split(",")])
    vals = [rid, src, sec, summ, linked,
            f'=COUNTIF({rng_key},"*,"&A{i}&",*")',
            f'=COUNTIFS({rng_key},"*,"&A{i}&",*",{rng_st},"Pass")',
            f'=COUNTIFS({rng_key},"*,"&A{i}&",*",{rng_st},"Fail")',
            f'=COUNTIFS({rng_key},"*,"&A{i}&",*",{rng_st},"Blocked")',
            f'=IF(F{i}=0,"NOT COVERED",IF(H{i}>0,"Covered – has failures",IF(G{i}=F{i},"Covered – all passed","Covered – pending run")))']
    for c, v in enumerate(vals, 1):
        cell = tr.cell(row=i, column=c, value=v)
        cell.font = f_bold if c == 1 else f_base
        cell.alignment = center if c >= 6 else wrap
        cell.border = border
TLAST = len(REQ) + 1
tr.freeze_panes = "B2"
tr.auto_filter.ref = f"A1:J{TLAST}"
cs = f"J2:J{TLAST}"
tr.conditional_formatting.add(cs, FormulaRule(formula=[f'LEFT(J2,3)="NOT"'], fill=PatternFill("solid", fgColor="FFC7CE")))
tr.conditional_formatting.add(cs, FormulaRule(formula=[f'ISNUMBER(SEARCH("failures",J2))'], fill=PatternFill("solid", fgColor="FFC7CE")))
tr.conditional_formatting.add(cs, FormulaRule(formula=[f'ISNUMBER(SEARCH("all passed",J2))'], fill=PatternFill("solid", fgColor="C6EFCE")))

# ================================================================= Sheet 3: Baseline & Legend
bl = wb.create_sheet("Baseline & Legend")
bl.column_dimensions["A"].width = 26
bl.column_dimensions["B"].width = 110
r = 1
bl.cell(row=r, column=1, value="FinTrack BD — Money-Flow Manual Test Suite").font = f_title
r += 1
bl.cell(row=r, column=1, value="Scope: every Add Expenses option and every Add Income type, traced through Bank & Wallet, Dashboard, Tax, Budgets, Fixed Expenses, Loans, History and Notifications. Expected results follow the BUSINESS documents (BRD, MVP spec, tickets, ADRs, architecture §Derived values); where the code looked different, the test still expects the business rule and the gap is listed on 'Business Findings'.").alignment = wrap
bl.merge_cells(start_row=r, start_column=1, end_row=r, end_column=2)
bl.row_dimensions[r].height = 45
r += 2

def block(title, rows):
    global r
    c = bl.cell(row=r, column=1, value=title)
    c.font, c.fill = f_head, fill_head
    bl.cell(row=r, column=2).fill = fill_head
    r += 1
    for k, v in rows:
        a = bl.cell(row=r, column=1, value=k); a.font = f_bold; a.alignment = wrap; a.border = border
        b = bl.cell(row=r, column=2, value=v); b.font = f_base; b.alignment = wrap; b.border = border
        bl.row_dimensions[r].height = max(15, 15 * (1 + len(v) // 120 + v.count("\n")))
        r += 1
    r += 1

block("TEST DATE & FISCAL YEAR", [
 ("Test month", "Examples assume today is in NOVEMBER 2026 → Fiscal Year FY2026-27 (1 Jul 2026 – 30 Jun 2027). If you run in another month, shift the month names; the money arithmetic is unchanged."),
 ("Tax parameters used", "Seeded FY2026-27 settings: 0% on first ৳3,75,000; 10% next ৳3,00,000; 15% next ৳4,00,000; 20% next ৳5,00,000; 25% next ৳20,00,000; 30% remainder. Exemption = MIN(Gross ÷ 3, ৳5,00,000). Rebate = MIN(3% × Taxable, 10% × Eligible investment, ৳10,00,000, Gross Tax). Caps: DPS ৳1,20,000, Sanchaypatra ৳5,00,000, Stocks ৳5,00,000; Insurance, UPension, Others no cap. Minimum tax ৳5,000. Early filing 5% (max ৳25,000) if filed 1 Jul–30 Sep. These are NOT final: ticket 24 is open (threshold ৳4,00,000? rebate rate 15%? max ৳7,50,000?). If Settings change, re-derive the expected tax."),
 ("Fresh user", "Run each case on a fresh test user unless the precondition says it continues from another case."),
])
block("BASELINE B0 — accounts only (Bank & Wallet → Add account, opening date 01-Jul-2026)", [
 ("BRAC Bank", "Type Bank account (SAVINGS) · last four 4521 · opening ৳1,00,000"),
 ("bKash", "Type MFS · mobile 01712345678 · opening ৳20,000"),
 ("In-Hand Cash", "Type Cash · opening ৳5,000 (only one cash account allowed)"),
 ("BRAC DPS", "Type DPS · Parent account BRAC Bank · opening ৳0 · monthly installment ৳10,000 · maturity 30-Jun-2031"),
 ("Sanchaypatra", "Type Investment · Kind Sanchaypatra · opening ৳0"),
 ("UPension", "Type Investment · Kind Universal Pension · opening ৳0"),
 ("Life Insurance", "Type Investment · Kind Insurance · opening ৳0"),
 ("Stocks", "Type Investment · Kind Stocks · opening ৳0"),
 ("Totals to verify", "Bank Balance ৳1,00,000 · MFS Balance ৳20,000 · Cash on Hand ৳5,000 · Investments ৳0 · Net Worth ৳1,25,000"),
])
block("BASELINE B1 — expense baseline = B0 + one salary", [
 ("Income", "Add Income → Salary · November 2026 · In-Hand ৳80,000 · TDS ৳0 · Received into BRAC Bank"),
 ("Bank & Wallet", "BRAC Bank ৳1,80,000 · bKash ৳20,000 · In-Hand Cash ৳5,000 · DPS ৳0 · Bank Balance ৳1,80,000 · Net Worth ৳2,05,000"),
 ("Dashboard (This Month)", "Income ৳80,000 · Spending ৳0 · Net Savings ৳80,000 · Savings Rate 100% · Discretionary cash ৳80,000 · Remaining to spend ৳80,000"),
 ("Tax FY2026-27", "Gross ৳80,000 · Exemption ৳26,666.67 · Taxable ৳53,333.33 · Gross Tax ৳0 · Tax Paid ৳0"),
])
block("BASELINE T1 — tax baseline = B0 + four salaries (no November salary)", [
 ("Income", "Salary for July, August, September and October 2026, each In-Hand ৳2,35,000 + TDS ৳5,000 (Gross ৳2,40,000), received into BRAC Bank"),
 ("Bank & Wallet", "BRAC Bank ৳10,40,000 · Net Worth ৳10,65,000"),
 ("Tax FY2026-27", "Gross ৳9,60,000 · Exemption ৳3,20,000 · Taxable ৳6,40,000 · Slab 10% on ৳2,65,000 → Gross Tax ৳26,500 · Rebate ৳0 · Net Tax ৳26,500 · TDS ৳20,000 · Tax Paid ৳20,000 · Remaining ৳6,500 · Suggested monthly TDS ৳812.50 (8 months Nov–Jun) · 3%-of-taxable rebate ceiling ৳19,200 · Further investment for max rebate ৳1,92,000"),
 ("Dashboard (Nov)", "Income ৳0; Discretionary cash and Remaining to spend use October's ৳2,35,000 marked 'estimated'"),
])
block("BASELINE F1 — fixed-expense baseline = B1 + three templates (start November 2026)", [
 ("Mess Rent", "৳8,722 · due day 15 · category Rent · monthly"),
 ("BRAC DPS Installment", "৳10,000 · due day 14 · category DPS / Savings · linked account BRAC DPS"),
 ("Home Internet", "৳500 · due day 16 · category Utility · monthly"),
 ("Dashboard (Nov)", "Fixed commitments ৳19,222 (all Pending) · Discretionary cash ৳60,778 · Remaining to spend ৳60,778"),
])
block("TEST SUITES (column 'Suites'; filter it to build a run)", [
 ("Smoke", "Every build / deploy — 'is it testable?'. 5 core money paths: spend cash (MF-EXP-001), spend bank (MF-EXP-002), DPS (MF-EXP-020), salary (MF-INC-001), tax payment (MF-EXP-085). Automated smoke also covers login, page loads, health and security."),
 ("Sanity", "After a fix or small change — run only the P1 cases of the affected 'Sanity Area' (Spending, DPS & Investment, Withdrawal & Interest, Loans, Tax Payment, Fixed Expenses, Transfer, Income, End-to-End)."),
 ("Happy Path", "Before every release — all positive P1 cases (one per category and income type) plus both End-to-End journeys."),
 ("Regression", "Before a major release — every case in this workbook plus the automated API, unit and e2e regression suites."),
])
block("HOW TO USE THE TEST CASES SHEET", [
 ("Expected columns (green)", "Four columns state where money must appear: Bank & Wallet (every account touched), Dashboard tiles, Tax page lines, Other screens. A case passes only if ALL four match. HTTP success alone is not a pass."),
 ("Yellow columns = fill in", "Execution Status (drop-down: Not Run / Pass / Fail / Blocked / Not Applicable), Actual Result, Defect ID, Tested By / Date. Only edit the yellow cells; Traceability counts update automatically."),
 ("Example of a filled row", "Execution Status: Fail · Actual Result: 'BRAC dropped to ৳1,78,500 but Net Worth tile still ৳2,05,000' · Defect ID: BUG-123 · Tested By / Date: A. Asif 16-Nov-2026"),
 ("Priority", "P1 = core money path, run every release · P2 = important variant · P3 = edge/UI detail"),
 ("Type", "Positive / Negative / Edge / Security"),
 ("Automation Candidate", "UI + API = automate as a Playwright journey plus an API assertion; UI = UI-only check"),
])

# summary formulas
c = bl.cell(row=r, column=1, value="EXECUTION SUMMARY (live)"); c.font, c.fill = f_head, fill_head; bl.cell(row=r, column=2).fill = fill_head
r += 1
rng_mod = f"'Test Cases'!${L['Module']}$2:${L['Module']}${LAST}"
summary = [
 ("Total test cases", f"=COUNTA('Test Cases'!$A$2:$A${LAST})"),
 ("  Add Expenses", f'=COUNTIF({rng_mod},"Add Expenses")'),
 ("  Add Income", f'=COUNTIF({rng_mod},"Add Income")'),
 ("  End-to-End", f'=COUNTIF({rng_mod},"End-to-End")'),
 ("P1 cases", f"=COUNTIF('Test Cases'!${L['Priority']}$2:${L['Priority']}${LAST},\"P1\")"),
 ("Smoke suite", f'=COUNTIF({rng_suite},"*Smoke*")'),
 ("Sanity suite (all areas)", f'=COUNTIF({rng_suite},"*Sanity*")'),
 ("Happy Path suite", f'=COUNTIF({rng_suite},"*Happy Path*")'),
 ("Regression suite", f'=COUNTIF({rng_suite},"*Regression*")'),
 ("Passed", f'=COUNTIF({rng_st},"Pass")'),
 ("Failed", f'=COUNTIF({rng_st},"Fail")'),
 ("Blocked", f'=COUNTIF({rng_st},"Blocked")'),
 ("Not Run", f'=COUNTIF({rng_st},"Not Run")'),
 ("Requirements traced", f"=COUNTA('Traceability Matrix'!$A$2:$A${TLAST})"),
 ("Requirements not covered", f"=COUNTIF('Traceability Matrix'!$J$2:$J${TLAST},\"NOT COVERED\")"),
]
for k, f in summary:
    a = bl.cell(row=r, column=1, value=k); a.font = f_bold; a.border = border
    b = bl.cell(row=r, column=2, value=f); b.font = f_base; b.border = border; b.alignment = Alignment(horizontal="left")
    b.number_format = "0"
    r += 1

# ================================================================= Sheet 4: Business Findings
FINDINGS = [
 ("F-01", "Add Expenses · Savings Interest", "Interest is credited to a named account (architecture routing table: SAVINGS_INTEREST requires savings_account_id).", "The form shows the Savings Account picker for deposit/withdrawal only (isSavings excludes SAVINGS_INTEREST), so the entry is sent without an account and the API rejects it.", "High", "MF-EXP-060, MF-EXP-061", "Show the account picker for Savings Interest."),
 ("F-02", "Add Expenses · Savings Withdrawal", "A withdrawal is cash IN; money moves from one account to another (ADR-0014).", "No receiving account is asked. Only DPS/FDR fall back to the parent; a withdrawal from a bank or Sanchaypatra credits nothing, so Net Worth drops.", "High", "MF-EXP-053, MF-EXP-054", "Ask 'Which account receives the money?' for withdrawals."),
 ("F-03", "Add Expenses · Loans", "Direction is explicit and first-person (GAP-03, US-54).", "The form shows a Direction select (I gave / I received), but it is not sent; only the category decides the direction.", "High", "MF-EXP-076", "Remove the field or derive the category from it; never allow a contradiction."),
 ("F-04", "Add Expenses · Tax Payment", "The user may choose the previous Fiscal Year (architecture §Category routing).", "The form says 'recorded against the current Fiscal Year' with no choice.", "Medium", "MF-EXP-087", "Add an FY selector (current / previous)."),
 ("F-05", "Add Expenses · Date", "Date defaults to today and can be changed (FR-04, US-26).", "The Add form has no date field (only Edit shows one); back-dated purchases are impossible.", "Medium", "MF-EXP-012", "Add a date field defaulting to today."),
 ("F-06", "Edit transaction · Account", "Amount, date and links may change on update (architecture §Update).", "Edit mode hides the paying-account picker; a wrong account cannot be corrected.", "Medium", "MF-EXP-126", "Allow changing the paying/receiving account on edit."),
 ("F-07", "Net Worth definition", "p2-05: Net Worth = wallets + savings + money lent − money borrowed.", "architecture.md / ADR-0014: Net Worth = Σ account balances only (loans excluded). The docs disagree.", "Medium", "MF-EXP-070, MF-EXP-073, MF-E2E-001", "Owner to decide; update the doc that loses."),
 ("F-08", "Add Income · Salary form", "Bonuses and allowances are separate income types for the YTD breakdown (FR-03, US-21).", "The Salary form adds Bonus and Other Allowances into one SALARY entry.", "Low", "MF-INC-006", "Save the bonus as its own entry/type, or remove the fields."),
 ("F-09", "Interest — two entry paths", "One fact, one entry.", "Interest can be entered as Add Expenses → Savings Interest (balance only, no tax) and as Add Income → Bank Savings Interest (balance + tax). Doing both doubles the balance.", "Medium", "MF-EXP-062, MF-INC-018", "Pick one path; remove or redirect the other."),
 ("F-10", "Holiday Support", "Holiday-rate earnings are logged (US-23) and are income (FR-03 list).", "The Holiday Support worksheet and the 'Holiday Support' income type appear independent; it is unclear whether the log reaches tax.", "Medium", "MF-INC-017", "Confirm the log creates (or must be matched by) one Income Entry."),
 ("F-11", "Add Expenses · hidden categories", "A user can always record any spending (FR-04).", "Categories used by a Fixed Expense template are hidden from the category list, and a matching entry auto-marks the pending instance paid.", "Medium", "MF-EXP-017", "Keep categories visible; only auto-link when the user picks the Fixed Expense."),
 ("F-12", "Budget thresholds", "BRD FR-10: green <70%, amber 70–100%, red >100%; FR-09 alert at 80%.", "p2-04 ring uses 0–74 / 75–99 / 100+. Three different sets of numbers.", "Low", "MF-EXP-013, MF-EXP-014", "Owner to fix one set of thresholds."),
 ("F-13", "Loan acceptance figures", "AC-LOAN-1: Mithun ৳9,841, Amait ৳1,198.50, Sohel −৳3,145.42.", "project-overview.md says 'Total borrow-loan balance ৳13,894.08'; these balances net to ৳7,894.08.", "Low", "MF-EXP-075", "Correct project-overview.md."),
 ("F-14", "Tax parameters", "Ticket 24 is open: tax-free threshold (৳3,75,000 vs ৳4,00,000), rebate rate (10% vs 15%), rebate max (৳10L vs ৳7.5L), exemption scope (salary only?), Cheer/Certification taxability, early filing.", "Seeded values follow the owner's spreadsheet.", "High", "MF-EXP-028..042, MF-INC-002..025, MF-E2E-002", "Confirm ticket 24; then re-derive the expected tax in this workbook."),
 ("F-15", "DPS / Sanchaypatra encashment", "—", "Withdrawing from a DPS or Sanchaypatra in the same FY does not reduce the rebate investment.", "Question", "MF-EXP-050, MF-EXP-054", "Confirm the NBR rule."),
 ("F-16", "Late Fixed Expense payment", "Spending uses the calendar month of the transaction (ADR-0007).", "Paying October's bill in November counts the spending in November.", "Question", "MF-EXP-098", "Confirm with the owner."),
 ("F-17", "Cash with no In-Hand Cash account", "Every movement names an account (ADR-0014).", "A Cash expense with no cash account is saved and counted as spending, but no balance drops.", "Question", "MF-EXP-009", "Require a cash account, or accept and document."),
 ("F-18", "Income not into an account", "Income credits its receiving account (ADR-0014).", "'Not into one of my accounts' counts In-Hand income with no balance tracked.", "Question", "MF-INC-020", "Confirm intended use."),
 ("F-19", "Settle Up", "Settle Up creates one settlement transaction (FR-07).", "Not verified whether Settle Up names the account that pays or receives.", "Question", "MF-EXP-079", "Settle Up should ask for the account."),
 ("F-21", "Dashboard tax card", "FR-02: tax snapshot 'Tax paid so far ৳X' = tax actually paid; it must equal Tax → Total Paid (TDS + Tax Payments).", "CONFIRMED by automation (MF-EXP-085): the card uses forecastTax (12-month projection). With 4 months of TDS ৳5,000 + ৳5,000 advance, Tax page Total Paid = ৳25,000 but the card's 'Paid so far' = ৳65,000 (12 × ৳5,000 projected + ৳5,000). Remaining shows ৳3,26,250 vs ৳1,500 on the Tax page.", "High", "MF-EXP-085", "Use actual Tax Paid for 'Paid so far'; label any projected figure as projected."),
 ("F-20", "Tax acceptance figure", "MVP spec: Net Tax ৳1,35,369; project-overview: ৳1,35,225.", "Ticket 24 item 9 explains a ৳144.20 gap.", "Low", "—", "Close with ticket 24."),
]
fs = wb.create_sheet("Business Findings")
fh = [("ID", 7), ("Area", 26), ("Business rule (source)", 45), ("What the app appears to do (from code reading — verify in UI)", 55), ("Severity", 10), ("Related TCs", 22), ("Recommendation / Question", 40)]
for c, (h, w) in enumerate(fh, 1):
    cell = fs.cell(row=1, column=c, value=h)
    cell.font, cell.fill, cell.alignment, cell.border = f_head, fill_head, center, border
    fs.column_dimensions[get_column_letter(c)].width = w
for i, row in enumerate(FINDINGS, 2):
    for c, v in enumerate(row, 1):
        cell = fs.cell(row=i, column=c, value=v)
        cell.font = f_bold if c == 1 else f_base
        cell.alignment = center if c in (1, 5) else wrap
        cell.border = border
fs.freeze_panes = "B2"
fs.conditional_formatting.add(f"E2:E{len(FINDINGS)+1}", CellIsRule(operator="equal", formula=['"High"'], fill=PatternFill("solid", fgColor="FFC7CE")))

wb.calculation.fullCalcOnLoad = True  # Excel recomputes the traceability counts when the file opens
wb.save(OUT)

# Machine-readable suite map for the Playwright money-flow tests (qa/automation/e2e/money-flow/support/cases.ts).
import json
suites_path = os.path.join(os.path.dirname(OUT), "suites.json")
with open(suites_path, "w", encoding="utf-8", newline="\n") as fh:
    json.dump({t["id"]: {"title": t["title"], "priority": t["pri"], "area": t["area"],
                         "suites": [s.strip() for s in t["suites"].split(",")]} for t in TCS},
              fh, ensure_ascii=False, indent=1)
    fh.write("\n")
print("wrote", suites_path)
print("saved", OUT, "| TCs", len(TCS), "| reqs", len(REQ), "| findings", len(FINDINGS))
