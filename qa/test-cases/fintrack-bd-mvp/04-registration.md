# Test cases: Registration, verification and password reset

Ticket 25. Read `README.md` in this folder first. Emails are read from the in-memory test transport.

## Suite classification

| Suite | Included case IDs |
|-------|------------------|
| **Smoke** | TC-REG-001, TC-REG-020 |
| **Happy Path** | Smoke + TC-REG-002, TC-REG-003, TC-REG-004, TC-REG-005, TC-REG-006, TC-REG-007, TC-REG-009, TC-REG-011, TC-REG-012, TC-REG-013 |
| **Full Regression** | All cases above plus TC-REG-008, TC-REG-010, TC-REG-014, TC-REG-015, TC-REG-016, TC-REG-017, TC-REG-018, TC-REG-019 |

> **Smoke** runs register (API) and the full E2E registration journey — proves the sign-up path and email verification work end to end. **Happy Path** covers every P1 registration and password-reset case. **Full Regression** adds P2 rate-limiting, token-security and UI cases.

---

| ID | Test case | Expected | Seam | P | Covers |
|---|---|---|---|---|---|
| TC-REG-001 | Register with a valid name, email and password | Success response; a verification email with a link is sent | API | P1 | FR-01 |
| TC-REG-002 | The new account's contents after verification | 16 starter categories, three provisional tax years, and no Transactions, income, loans, savings accounts, budgets or Fixed Expenses | API | P1 | FR-01 |
| TC-REG-003 | Register with a 9-character password, and with an invalid email | 422 with a field error each time | API | P1 | FR-01 |
| TC-REG-004 | Register with an email that already has an account | The same response as a new registration; no second account; no verification email to act on | API | P1 | rules §9 |
| TC-REG-005 | Open the verification link | The email is verified and sign-in works | API | P1 | FR-01 |
| TC-REG-006 | Open the same verification link again | 422 | API | P1 | architecture §Authentication |
| TC-REG-007 | Open a verification link 25 hours after it was sent | 422 | API | P1 | architecture §Authentication |
| TC-REG-008 | Resend verification for an unverified account, and for an unknown email | A new link for the first; the same response and no email for the second | API | P2 | rules §9 |
| TC-REG-009 | Register while `SIGNUP_MODE` is `closed` | 403 `SIGNUP_CLOSED`; no account | API | P1 | ADR-0010 |
| TC-REG-010 | Six registrations from one IP inside an hour | The sixth is 429 | API | P2 | architecture §Authentication |
| TC-REG-011 | Request a password reset for an existing email, and for an unknown one | A reset email for the first; the same response and no email for the second | API | P1 | rules §9 |
| TC-REG-012 | Confirm a reset with a new password | The new password signs in; the old one does not; every session ends | API | P1 | FR-01 |
| TC-REG-013 | Use a reset link twice, and use one 61 minutes after it was sent | 422 each time | API | P1 | architecture §Authentication |
| TC-REG-014 | A token copied from the database | It does not work as a link token, because only its hash is stored | API | P2 | architecture §Authentication |
| TC-REG-015 | The verification and reset email bodies | They contain the link and no financial data | API | P2 | ticket 25 |
| TC-REG-016 | Create account page with valid input | The "Check your email" screen appears with a Resend link button that is disabled for 60 seconds | UI | P2 | design §7.10 |
| TC-REG-017 | Create account page when sign-up is closed | "Registration is currently closed" and no form | UI | P2 | design §7.10 |
| TC-REG-018 | Sign in with an unverified email | "Verify your email first" with a Resend link button | UI | P2 | design §7.10 |
| TC-REG-019 | Forgot password with any email | The same confirmation message every time | UI | P2 | design §7.10 |
| TC-REG-020 | Register, follow the emailed link, sign in | The dashboard's first-run checklist is shown | E2E | P1 | FR-01 |
