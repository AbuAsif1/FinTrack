# Test cases: Sign-in and sessions

Ticket 02. Read `README.md` in this folder first.

## Suite classification

| Suite | Included case IDs |
|-------|------------------|
| **Smoke** | TC-AUTH-001, TC-AUTH-008 |
| **Happy Path** | Smoke + TC-AUTH-002, TC-AUTH-003, TC-AUTH-004, TC-AUTH-005, TC-AUTH-006, TC-AUTH-007, TC-AUTH-010, TC-AUTH-011, TC-AUTH-012, TC-AUTH-013, TC-AUTH-014, TC-AUTH-015, TC-AUTH-016, TC-AUTH-017, TC-AUTH-019 |
| **Full Regression** | All cases above plus TC-AUTH-009, TC-AUTH-018, TC-AUTH-020, TC-AUTH-021 |

> **Smoke** confirms sign-in succeeds and unauthed routes return 401 — if these fail the app is completely unusable. **Happy Path** covers every P1 session and password-change case. **Full Regression** adds P2 token-lifetime, IP-rate-limit and CLI-tool cases.

---

| ID | Test case | Expected | Seam | P | Covers |
|---|---|---|---|---|---|
| TC-AUTH-001 | Login with a verified user's correct password | 200 with an access token; refresh cookie set `HttpOnly; Secure; SameSite=Strict; Path=/` for 30 days | API | P1 | FR-01 |
| TC-AUTH-002 | Login with a wrong password | 401 | API | P1 | FR-01 |
| TC-AUTH-003 | Login with an unknown email | 401 with the same body as a wrong password | API | P1 | rules §9 |
| TC-AUTH-004 | Login before the email is verified | 403 `EMAIL_NOT_VERIFIED` | API | P1 | FR-01 |
| TC-AUTH-005 | Login to an account deactivated until reactivated | 403 `ACCOUNT_DEACTIVATED` | API | P1 | FR-14 |
| TC-AUTH-006 | Login to an account deactivated until a future date | 403 `ACCOUNT_DEACTIVATED` | API | P1 | FR-14 |
| TC-AUTH-007 | Login to an account whose deactivation date has passed | 200; the account is active again | API | P1 | FR-14 |
| TC-AUTH-008 | A protected route with no token, a malformed token, and an expired token | 401 each time | API | P1 | rules §9 |
| TC-AUTH-009 | The access token's lifetime | It expires 15 minutes after issue | API | P2 | architecture §Authentication |
| TC-AUTH-010 | Refresh with a valid cookie | A new access token and a new cookie; the old refresh token no longer works | API | P1 | architecture §Authentication |
| TC-AUTH-011 | Refresh with an already-rotated token | 401; every session of that user ends | API | P1 | architecture §Authentication |
| TC-AUTH-012 | Refresh 30 days after the last one | 401 | API | P1 | FR-01 |
| TC-AUTH-013 | Refresh or logout with an `Origin` header from another site | Rejected | API | P1 | architecture §Authentication |
| TC-AUTH-014 | Logout | The cookie is cleared and the refresh token no longer works | API | P1 | FR-01 |
| TC-AUTH-015 | Change password with the correct current password | The new password signs in; the old one does not; other sessions end | API | P1 | FR-01 |
| TC-AUTH-016 | Change password with a wrong current password | 422; the password is unchanged | API | P1 | FR-01 |
| TC-AUTH-017 | Eleven failed logins for one email inside 15 minutes | The eleventh is 429 | API | P1 | architecture §Authentication |
| TC-AUTH-018 | Eleven failed logins from one IP across different emails | The eleventh is 429 | API | P2 | architecture §Authentication |
| TC-AUTH-019 | `GET /me`, then `PATCH /me` with a new name | Name, email and role are returned; the new name is saved | API | P1 | FR-01 |
| TC-AUTH-020 | A successful login | `last_login_at` shown to an admin is updated | API | P2 | FR-14 |
| TC-AUTH-021 | `pnpm user:create`, then `pnpm user:reset-password` | The user can sign in; after the reset only the new password works | API | P2 | architecture §Authentication |
