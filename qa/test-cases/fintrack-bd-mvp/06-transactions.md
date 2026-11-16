# Test cases: Transactions and categories

Ticket 03. Read `README.md` in this folder first.

## Suite classification

| Suite | Included case IDs |
|-------|------------------|
| **Smoke** | TC-TXN-001, TC-TXN-007 |
| **Happy Path** | Smoke + TC-TXN-002, TC-TXN-004, TC-TXN-005, TC-TXN-006, TC-TXN-008, TC-TXN-010, TC-TXN-011, TC-TXN-012, TC-TXN-013, TC-TXN-014, TC-TXN-017, TC-TXN-020 |
| **Full Regression** | All cases above plus TC-TXN-003, TC-TXN-009, TC-TXN-015, TC-TXN-016, TC-TXN-018, TC-TXN-019 |

> **Smoke** proves a Transaction can be created and listed — the core money-entry path. **Happy Path** covers every P1 CRUD, idempotency, date and category case. **Full Regression** adds P2 filtering, soft-delete export, bulk delete and naming edge cases.

---

| ID | Test case | Expected | Seam | P | Covers |
|---|---|---|---|---|---|
| TC-TXN-001 | Create a Transaction in a Spending category | 201; `type` is `NONE`; `amount_paisa` is an integer | API | P1 | FR-04 |
| TC-TXN-002 | Create with an amount of 0, a negative amount, and a decimal amount | 422 each time, with the field named in `fields` | API | P1 | rules §1, §8 |
| TC-TXN-003 | Create with a missing category, and with an archived category | 422 each time | API | P2 | FR-04 |
| TC-TXN-004 | Create twice with the same `idempotency_key` | The second is 409 `DUPLICATE` returning the first record; only one exists | API | P1 | rules §6 |
| TC-TXN-005 | Two users create with the same `idempotency_key` | Both succeed | API | P2 | rules §6 |
| TC-TXN-006 | Create dated `2026-07-01` | It is returned as `2026-07-01` | API | P1 | ADR-0004 |
| TC-TXN-007 | List Transactions | Newest first, paginated | API | P1 | FR-04 |
| TC-TXN-008 | Filter by date range, by category, by payment method and by type | Only matching Transactions each time | API | P1 | FR-04 |
| TC-TXN-009 | Filter by amount range, and search by a word in the description | Only matching Transactions each time | API | P2 | FR-04 |
| TC-TXN-010 | Get one by id | The Transaction | API | P1 | FR-04 |
| TC-TXN-011 | Update amount, date, description and payment method | The saved values are returned | API | P1 | FR-04 |
| TC-TXN-012 | Change to another Spending category | Saved | API | P1 | FR-04 |
| TC-TXN-013 | Change to a category of a different kind | 422; nothing changes | API | P1 | rules §5 |
| TC-TXN-014 | Delete a Transaction | It no longer appears in the list or in any total | API | P1 | rules §3 |
| TC-TXN-015 | A deleted Transaction in the full export | Present and flagged as deleted | API | P2 | rules §3 |
| TC-TXN-016 | Bulk delete three Transactions | All three are gone from the list | API | P2 | FR-04 |
| TC-TXN-017 | List categories for a new account | The 16 starter categories with their kinds | API | P1 | FR-04 |
| TC-TXN-018 | Add, rename, recolour and archive a category | Each change is saved; an archived category is not offered for new Transactions | API | P2 | FR-04 |
| TC-TXN-019 | Add a category whose name differs only by case from an existing one | 422 | API | P2 | architecture §Database schema |
| TC-TXN-020 | Change the kind of a category that has a Transaction | 422 | API | P1 | FR-04 |
