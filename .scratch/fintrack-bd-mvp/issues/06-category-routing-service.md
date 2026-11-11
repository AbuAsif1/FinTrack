# 06: Category Routing Service

**What to build:** The atomic side-effect engine that fires when a transaction is created with a category that has a routing type. DPS payment → savings credit + rebate tracking; loan given/received → loan entry; Sanchaypatra → rebate. All side effects in one DB transaction (all-or-nothing).

**Blocked by:** 03 (Transaction CRUD), 04 (Savings Accounts), 05 (Borrow-Loan Ledger)

**Status:** ready-for-agent

- [ ] CategoryRoutingService: pure function that maps (transaction, category.routing_type) → list of side-effect operations
- [ ] Routing types: DPS_TRANSFER, SANCHAYPATRA_TRANSFER, LOAN_GIVEN, LOAN_RECEIVED, NONE
- [ ] DPS_TRANSFER: create transfer record linking transaction → savings account + mark as eligible rebate investment
- [ ] LOAN_GIVEN: create loan entry (direction: given) for the linked loan person
- [ ] LOAN_RECEIVED: create loan entry (direction: received) for the linked loan person
- [ ] SANCHAYPATRA_TRANSFER: create transfer + mark as eligible rebate investment
- [ ] All routing side effects execute inside the same Prisma transaction as the parent transaction create
- [ ] Integration tests: DPS transaction triggers savings balance update atomically; rolling back one side effect rolls back all; LOAN_GIVEN creates correct ledger entry
