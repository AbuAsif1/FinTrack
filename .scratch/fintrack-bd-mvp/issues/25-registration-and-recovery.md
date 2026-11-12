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

## Comments

Implemented on branch `ticket/25-registration`. Cross-user isolation test (TC-SEC) deferred to security test file as it depends on auth endpoints from ticket 02.
