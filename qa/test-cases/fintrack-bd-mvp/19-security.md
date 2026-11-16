# Test cases: Security and data isolation

Every ticket that adds an endpoint. Read `README.md` in this folder first.

These cases grow with the API: each ticket that adds endpoints extends the tests for `TC-SEC-001` to `TC-SEC-003` to cover them. "User A" and "User B" are two registered users, each with data.

## Suite classification

| Suite | Included case IDs |
|-------|------------------|
| **Smoke** | TC-SEC-003 |
| **Happy Path** | Smoke + TC-SEC-001, TC-SEC-002, TC-SEC-004, TC-SEC-005, TC-SEC-006, TC-SEC-007 |
| **Full Regression** | All cases above plus TC-SEC-008 |

> **Smoke** proves every protected route returns 401 without a token. **Happy Path** covers P1 cross-user data isolation and injection cases. **Full Regression** adds the P2 HttpOnly cookie check.

---

| ID | Test case | Expected | Seam | P | Covers |
|---|---|---|---|---|---|
| TC-SEC-001 | User B reads, updates and deletes each of User A's records by id, for every resource | 404 every time; User A's data is unchanged | API | P1 | rules §9 |
| TC-SEC-002 | User B calls every list, summary, dashboard, analytics and export endpoint | Only User B's data is returned | API | P1 | rules §9 |
| TC-SEC-003 | Every route except `/auth/*` and `/health`, called with no token | 401 | API | P1 | rules §9 |
| TC-SEC-004 | User B creates a Transaction naming User A's category, savings account or Loan Person | Rejected; User A's data is unchanged | API | P1 | rules §9 |
| TC-SEC-005 | A search term containing SQL (`' OR 1=1 --`) | Treated as plain text; no extra rows are returned | API | P1 | architecture §Security |
| TC-SEC-006 | Any response that includes a user | It contains no password hash and no token | API | P1 | rules §9 |
| TC-SEC-007 | A description containing HTML and script tags, shown in the list | Rendered as text, not executed | UI | P1 | architecture §Security |
| TC-SEC-008 | The refresh cookie as seen by page scripts | Not readable from JavaScript | E2E | P2 | architecture §Authentication |
