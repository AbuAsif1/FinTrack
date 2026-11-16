# 08: Fixed Expenses

**What to build:** Recurring monthly obligations with templates and monthly instances. Each month an instance is generated from the template as Pending; user marks it Paid or Skipped. DPS is modelled as a Transfer here (linking to savings accounts), not as Spending.

**Blocked by:** 03 (Transaction CRUD)

**Status:** ready-for-agent

- [ ] POST /fixed-expense-templates: create a template (name, standard_amount_paisa, due_day_of_month, category, is_active)
- [ ] GET /fixed-expense-templates: list all active templates
- [ ] POST /fixed-expense-instances: generate or manually create an instance for a template + calendar month
- [ ] PATCH /fixed-expense-instances/:id: mark as paid (actual_amount_paisa, paid_date) or skipped
- [ ] GET /fixed-expense-instances: list by calendar month with status (pending/paid/skipped)
- [ ] Monthly fixed commitments seed: DPS ৳50,000 (Transfer), rent, internet, electricity, YouTube
- [ ] Integration tests: create template, generate instance, mark paid; DPS instance links to savings transfer; list for a month shows correct statuses; total pending commitments = ~৳60,732
