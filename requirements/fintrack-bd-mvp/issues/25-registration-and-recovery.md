# 25: Registration, Email Verification & Password Reset

**What to build:** Public sign-up so that several people can use the app, each seeing only their own data: registration, email verification before first sign-in, and password reset by email, with the pages for each.

**Blocked by:** 02, 12

**Status:** done

**Test cases:** `test-cases/04-registration.md` (`TC-REG`) · `test-cases/19-security.md` (extend `TC-SEC-001` to `TC-SEC-004` for the new endpoints)

**Read first:** `rules.md` §8, §9 · `architecture.md` §Authentication and sessions (Registration and recovery), §Database schema (`users`, `email_tokens`), §Environment variables · `design.md` §7.10 · `brd.md` §5 FR-01 · ADR-0010

**API**

- [x] `POST /auth/register`: name, email, password (at least 10 characters); creates the user unverified and runs `provisionNewUser` in the same database transaction; emails a verification link; 403 `SIGNUP_CLOSED` when `SIGNUP_MODE=closed`
- [x] `POST /auth/verify-email`: consumes the token and sets `email_verified_at`; an expired or used token is 422
- [x] `POST /auth/resend-verification`
- [x] `POST /auth/password-reset/request` and `POST /auth/password-reset/confirm`; a successful reset revokes every refresh token of that user
- [x] Tokens: 32 random bytes, stored as a SHA-256 hash in `email_tokens`, single use; verification valid 24 hours, reset valid 1 hour
- [x] Register, resend and reset-request give the same response whether or not the email is registered
- [x] Rate limit: 5 requests per IP and per email per hour on register, resend and reset-request
- [x] `lib/email.ts` with a Resend transport and an in-memory transport for tests; the two email templates (verify, reset) contain the link and no personal or financial data

**Pages** (per `design.md` §7.10)

- [x] Create account, Check your email, Verify email, Forgot password, Reset password
- [x] Sign in page gains the Forgot password and Create account links, and the "Verify your email first" state with a resend action
- [x] Create account shows "Registration is currently closed" when sign-up is closed

**Tests**

- [x] Register, follow the emailed link, sign in; the new account has the 16 starter categories, three provisional tax years and no financial records
- [x] Sign-in before verification is 403; an expired and a reused verification token are rejected
- [x] Registering an existing email returns the normal response and creates nothing
- [x] Password reset: the link works once, the old password stops working, and existing sessions end
- [x] `SIGNUP_MODE=closed` rejects registration; rate limits return 429
- [ ] Two registered users: neither can read, change or export anything of the other's through any endpoint built so far (covered in TC-SEC test file — requires auth tests from ticket 02)

---

## Why

The app is multi-user (ADR-0010). A new user needs to create an account, verify their email before their first sign-in (to prevent fake accounts and to have a valid address for password recovery), and be able to reset their password if they forget it. Without email verification, anyone who guesses an email could lock out the real owner by registering first and changing the password. Without password reset, any user who forgets their password loses access to their financial history permanently.

## User flows

### Registering a new account
1. User opens the app and is redirected to `/login`. They click "Create account."
2. User enters name, email and password (10+ characters) and submits.
3. The server creates an unverified account, runs `provisionNewUser` (starter categories + 3 provisional tax years), and sends a verification email.
4. User is shown the "Check your email" page.
5. User clicks the link in the email. The token is consumed and the account is marked verified.
6. User is shown "Email verified — sign in now."
7. User signs in with their email and password. Session is created.

### Resending the verification email
1. User did not receive the email (spam folder, typo in email, etc.).
2. On the sign-in page or the "Check your email" page, they click "Resend verification."
3. A new token is issued (the old one is invalidated). The same rate limit (5/hour) applies.

### Resetting a forgotten password
1. User opens `/login` and clicks "Forgot password."
2. User enters their email. The server always responds identically regardless of whether the email exists (to prevent enumeration).
3. If the email is registered, a 1-hour reset link is emailed.
4. User clicks the link. They are shown the Reset Password form.
5. User enters and confirms a new password. The server validates the token (single use, 1 hour), updates the password, and revokes all refresh tokens.
6. User is redirected to sign-in and must sign in with the new password.

### Registration closed
1. When `SIGNUP_MODE=closed` (a deployment config), the register page shows "Registration is currently closed."
2. `POST /auth/register` returns 403 `SIGNUP_CLOSED`.
3. Admin-provisioned accounts (via `POST /admin/users`) still work regardless of this setting.

## Scenarios

**Scenario A — new user onboards smoothly:** User registers, checks email, clicks the link, signs in. First thing they see is the first-run checklist on the dashboard (from ticket 13). They start adding categories and transactions.

**Scenario B — verification link expired:** User registers but doesn't check email for 25 hours. The verification link has expired (24-hour window). They try to sign in and see "Verify your email first" with a Resend button. They resend and use the new link.

**Scenario C — email already registered:** A user tries to register with an email already in the system. They see the same "Check your email" response (the server does not reveal whether the email is taken). The existing account receives no email. The user should try signing in or use Forgot Password.

**Scenario D — registration is closed:** The app is in soft-launch mode. A new visitor tries to register. The page shows "Registration is currently closed." The admin can still create accounts via the Admin panel (ticket 26).

## Context notes

- `provisionNewUser(userId)` must run in the same transaction as the INSERT into `users`. If the transaction rolls back, the user and their provisioned data disappear atomically — no orphaned categories.
- Email tokens are stored hashed (SHA-256). The plaintext token is only sent in the email link; it is never stored in plaintext. A leaked database does not expose working tokens.
- Verification tokens are valid for 24 hours; password-reset tokens for 1 hour. These are hard limits — do not extend them without a security review.
- The registration, resend and reset-request endpoints return the same response for valid and invalid emails. This prevents user-enumeration attacks where an attacker probes for which emails are registered.
- `lib/email.ts` uses an in-memory transport in tests (no real emails sent). In production, Resend is the transport. The email templates must contain only the link — no personal name, no account details, no financial data.

## Comments

Implemented on branch `ticket/25-registration`. Cross-user isolation test (TC-SEC) deferred to security test file as it depends on auth endpoints from ticket 02.
