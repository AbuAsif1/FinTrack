# 02: Authentication

**What to build:** Sign-in for verified users: short-lived access tokens, a rotating refresh cookie, and the `getAuthUser` check every later route uses. After this ticket, tests for any later ticket can call the API as an authenticated user. Registration and password recovery are ticket 25.

**Blocked by:** 01

**Status:** in-progress

**Test cases:** `test-cases/03-auth.md` (`TC-AUTH`) · `test-cases/19-security.md` (extend `TC-SEC-001` to `TC-SEC-004` for the new endpoints)

**Read first:** `rules.md` §8, §9 · `architecture.md` §Authentication and sessions, §Database schema (`users`, `refresh_tokens`, `auth_rate_limits`) · ADR-0010, ADR-0011

- [ ] `POST /auth/login`: verifies the password (bcrypt), returns a 15-minute access token and sets the refresh cookie with the attributes in `architecture.md`; an unverified email is 403 `EMAIL_NOT_VERIFIED`; a deactivated account is 403 `ACCOUNT_DEACTIVATED` unless its `deactivated_until` date has passed, in which case the deactivation is cleared; a successful login sets `last_login_at`
- [ ] `POST /auth/refresh`: rotates the refresh token and returns a new access token; presenting a revoked token revokes all of the user's tokens
- [ ] `POST /auth/logout`: revokes the token and clears the cookie
- [ ] `POST /auth/change-password`: requires the current password; revokes the user's other sessions
- [ ] `GET /me` and `PATCH /me` (name)
- [ ] `lib/auth.ts`: `getAuthUser(req)` verifies the Bearer token and throws `AuthError(401)`; `getAdminUser(req)` adds the role check and throws 403 `ADMIN_ONLY`
- [ ] `GET /me` returns `role`
- [ ] Login rate limit in `auth_rate_limits`: 10 failures per IP and per email in 15 minutes, then 429
- [ ] Origin check on `/auth/refresh` and `/auth/logout`
- [ ] `pnpm user:create` (creates a verified, provisioned user) and `pnpm user:reset-password` scripts
- [ ] Tests: login happy path; wrong password is 401; unverified email is 403; a deactivated account is 403 and a timed deactivation ends after its date; expired or malformed access token is 401; refresh rotates the token; reusing a rotated token ends the session; the rate limit returns 429; a second user cannot read the first user's `/me`

## Comments
