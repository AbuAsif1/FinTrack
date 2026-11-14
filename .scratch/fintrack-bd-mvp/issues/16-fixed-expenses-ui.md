# 16: Fixed Expenses UI

**What to build:** The fixed expenses screen showing this month's checklist of recurring obligations, with quick mark-as-paid action. Overdue items surface prominently.

**Blocked by:** 08 (Fixed Expenses), 12 (React Frontend Shell)

**Status:** ready-for-agent

- [ ] Fixed expenses list: checklist layout showing each obligation with due date, amount, status (pending/paid/skipped)
- [ ] Overdue items (past due day, still pending) shown at top with warning color
- [ ] Quick-pay action: tap "Mark Paid" → confirms actual amount (pre-filled with standard amount) + date
- [ ] Skip action: marks instance as skipped with optional note
- [ ] Month navigation: view past months' checklists
- [ ] Manage templates: add/edit/deactivate recurring expense templates
- [ ] DPS entry in list links to savings account balance for context
- [ ] Monthly total: sum of standard amounts for active templates; paid vs pending breakdown
- [ ] Dashboard banner integration: pending fixed expenses count shown on dashboard (this UI provides the template, ticket 13 uses it)
