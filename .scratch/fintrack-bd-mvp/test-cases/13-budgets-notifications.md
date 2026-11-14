# Test cases: Budgets and notifications

Ticket 10. Read `README.md` in this folder first. "Today" is set by the test clock.

## Budgets

## Suite classification

| Suite | Included case IDs |
|-------|------------------|
| **Smoke** | TC-NOTIF-001 |
| **Happy Path** | Smoke + TC-BUD-001, TC-BUD-002, TC-BUD-003, TC-BUD-004, TC-BUD-007, TC-NOTIF-002, TC-NOTIF-003, TC-NOTIF-004, TC-NOTIF-005, TC-NOTIF-006, TC-NOTIF-007, TC-NOTIF-008, TC-NOTIF-009, TC-NOTIF-010 |
| **Full Regression** | All cases above plus TC-BUD-005, TC-BUD-006, TC-NOTIF-011 |

> **Smoke** proves the due-soon notification is generated for an instance due in 3 days. **Happy Path** covers every P1 budget-state transition and notification type. **Full Regression** adds P2 rollover-absence and ordering cases.

---

| ID | Test case | Expected | Seam | P | Covers |
|---|---|---|---|---|---|
| TC-BUD-001 | Set a ৳3,500 limit on Groceries | The month's budget shows limit, spent, remaining and percentage | API | P1 | FR-10 |
| TC-BUD-002 | Set a limit on "DPS / Savings" | 422; only Spending categories take a budget | API | P1 | FR-10 |
| TC-BUD-003 | Spending at 69%, 70%, 100% and 101% of the limit | States `ok`, `warn`, `warn`, `over` | API | P1 | FR-10 |
| TC-BUD-004 | Change the limit this month | Last month still shows the old limit | API | P1 | GAP-19 |
| TC-BUD-005 | Remove the budget this month | No budget from this month on; last month still shows its limit | API | P2 | FR-10 |
| TC-BUD-006 | Underspend last month | This month's limit is unchanged; nothing rolls over | API | P2 | FR-10 |
| TC-BUD-007 | A deleted Transaction, and a Transaction in another category | Neither counts toward the category's spent amount | API | P1 | rules §3 |

## Notifications

| ID | Test case | Expected | Seam | P | Covers |
|---|---|---|---|---|---|
| TC-NOTIF-001 | A Pending instance due in 3 days, and one due in 4 days | A due-soon notification for the first only | API | P1 | FR-09 |
| TC-NOTIF-002 | A Pending instance past its due date | An overdue notification | API | P1 | FR-09 |
| TC-NOTIF-003 | Mark that overdue instance Paid | The notification is resolved and leaves the unread count | API | P1 | FR-09 |
| TC-NOTIF-004 | A Given entry with a return due date in 2 days while the person still owes | A loan-return-due-soon notification | API | P1 | FR-09 |
| TC-NOTIF-005 | The same entry after its date passes | A loan-return-overdue notification | API | P1 | FR-09 |
| TC-NOTIF-006 | The person is settled up before the due date | No loan notification | API | P1 | architecture §Generated on read |
| TC-NOTIF-007 | Category spending reaches 80% of its limit, then exceeds it | A budget-at-80% notification, then a budget-exceeded notification, each once for the month | API | P1 | FR-09 |
| TC-NOTIF-008 | The current Fiscal Year's tax settings are unconfirmed, then confirmed | A provisional-settings notification, then resolved | API | P2 | FR-09 |
| TC-NOTIF-009 | Open the notification list twice in a row | No duplicate notifications | API | P1 | ADR-0009 |
| TC-NOTIF-010 | Mark one notification read; mark all read | The unread count falls by one; then to zero | API | P1 | FR-09 |
| TC-NOTIF-011 | Notification list order | Unread first, then newest first | API | P3 | FR-09 |
