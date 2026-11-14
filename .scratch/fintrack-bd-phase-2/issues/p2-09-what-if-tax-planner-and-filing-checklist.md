# p2-09: What-If Tax Planner and Filing Checklist

**Status:** done
**Phase:** 2
**Spec ref:** Phase 2 §9

---

## What to build

Two additions to the Tax Dashboard:

1. **What-if tax planner** — an interactive calculator: "If I invest ৳X more in tax-exempt instruments, I save ৳Y in tax." The user adjusts an investment slider or input and sees their estimated tax liability update in real time.

2. **Filing checklist** — a step-by-step checklist for the Bangladeshi income-tax return filing process, including:
   - Documents needed (TIN certificate, bank statements, salary certificate, TDS challans, etc.)
   - The **30 September early-filing rebate** deadline (confirmed per ticket 24)
   - Late-filing surcharge rules (pending ticket 24 — see below)

---

## Why

The Tax Dashboard (MVP) tells the user what their tax liability is based on what they have already done. This feature extends it forward in time: "what can I still do before the year ends to reduce my tax?" The BD tax system gives real incentives for investments in DPS, Sanchaypatra, life insurance premiums and provident funds — the what-if planner makes these actionable. The filing checklist prevents the common mistake of missing a document or deadline during filing season.

---

## User flows

### What-if tax planner
1. User is on **Tax Dashboard** for the current fiscal year.
2. A "Tax planner" panel (collapsible or separate tab) shows their current estimated tax and remaining investment allowance.
3. The panel has an input (or slider): **"Additional investment allowance to claim"** — the amount the user is considering investing before the year ends.
4. As the user changes the value (live input, no submit needed), the panel recalculates:
   - New estimated investment rebate
   - New estimated net tax payable
   - Tax saved = current estimate − new estimate
   - Shows: "If you invest ৳50,000 more, you save ৳7,500 in tax."
5. A note shows the remaining investment allowance ceiling (the maximum they could still claim for the year).
6. A "How to invest" note lists the eligible instruments: DPS, Sanchaypatra, life insurance premium, provident fund contributions.

### Filing checklist
1. User opens **Tax Dashboard → Filing Checklist** (a tab or section).
2. The checklist is populated for the selected fiscal year with:
   - Mandatory items (applicable to all):
     - [ ] Download TIN certificate
     - [ ] Collect salary certificate from employer
     - [ ] Collect bank statements for all accounts
     - [ ] Collect TDS challans (if any tax was deducted at source)
     - [ ] Collect investment proof documents (DPS passbook, Sanchaypatra certificate, insurance receipt)
   - Deadline items (shown with colour-coded urgency):
     - [ ] File by 30 September for the early-filing rebate (green → amber → red as date approaches)
     - [ ] Late-filing surcharge applies after 30 September (details from ticket 24)
3. Each item has a checkbox (local state — the checklist tracks the user's progress).
4. User can check off items as they collect documents.
5. The checklist resets for each new fiscal year.

---

## Scenarios

**Scenario A — year-end investment decision:** A user checks the tax planner in August. They have used ৳40,000 of their investment allowance. The planner shows the ceiling is ৳1,00,000. They see that investing ৳60,000 more in DPS before the fiscal year ends would save ৳9,000 in tax. They open their bank app and set up a new DPS.

**Scenario B — filing season reminder:** It is September 1st. The user opens the Tax Dashboard and sees the filing checklist highlighted: "30 September early-filing rebate deadline — 29 days away." They work through the checklist and check off items as documents arrive.

**Scenario C — over the investment ceiling:** A user tries to plan an investment that exceeds the remaining ceiling. The planner shows: "You have already reached the maximum investment rebate ceiling. Additional investments will not reduce your tax further."

**Scenario D — late filer:** A user checks the checklist in October. The deadline row shows in red with the late-filing surcharge amount. The checklist still helps them file correctly despite the delay.

---

## Impact areas

- Tax calculation engine (from `brd.md` §6) must be callable with a hypothetical additional investment amount — currently it is called with actual data only
- The what-if calculation must not write any data — it is read-only and ephemeral
- New API endpoint: `GET /tax/planner?year=&additional_investment=` — returns recalculated tax figures
- Filing checklist state: stored per user per fiscal year (new table `filing_checklist_items` or as JSONB in `tax_years`)
- Late-filing surcharge rules: **blocked on ticket 24** (the PwC report referenced there must be confirmed before implementing surcharge amounts in the checklist)
- Design: a collapsible panel or second tab on the Tax Dashboard page

---

## Decisions needed before build

- **Ticket 24 must be resolved first** for the late-filing surcharge rules. The checklist can be built without the surcharge details, but surcharge amounts must not be shown until confirmed.
- Should the what-if planner be a live-updating input or a form with a Calculate button? (Live update is better UX but requires debouncing the API call; the calculation is cheap so live update is preferred.)
- Should checklist state persist server-side (survives logout) or client-side only? (Server-side is safer for a financial app — a user should be able to continue their checklist from a different device.)
- Should the checklist items be configurable per year (since rules may change), or static? (Recommend a data-driven list keyed by fiscal year, editable in a future admin tool.)

---

## Blocked by

- Ticket 09 (Tax Dashboard API) — the tax calculation engine must be stable.
- Ticket 18 (Tax Dashboard UI) — the new features extend the existing Tax UI.
- **Ticket 24 (Confirm Tax Parameters)** — late-filing surcharge rules must be confirmed before implementing them.

## Comments

<!-- Append discussion below this line -->
