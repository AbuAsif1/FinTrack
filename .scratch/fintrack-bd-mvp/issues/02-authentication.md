# 02: Authentication

**What to build:** Sign-in for verified users: short-lived access tokens, a rotating refresh cookie, and the `getAuthUser` check every later route uses. After this ticket, tests for any later ticket can call the API as an authenticated user. Registration and password recovery are ticket 25.

**Blocked by:** 01

**Status:** done

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

---

## Why

Every API endpoint after ticket 01 is behind `getAuthUser(req)`. Without a working sign-in flow and a rotating refresh token, no agent can run authenticated requests in tests or development. The refresh cookie enables a persistent session in a PWA — the user stays signed in across browser restarts without storing the access token in localStorage (which would be an XSS risk). The rate limit on login prevents credential-stuffing on an app that holds sensitive financial data.

## User flows

### Signing in
1. User opens the app. `middleware.ts` checks for the refresh cookie; finding none, it redirects to `/login`.
2. User enters email and password. The form calls `POST /auth/login`.
3. If credentials are correct and the email is verified: a 15-minute access token is returned in the JSON body, and an `HttpOnly` refresh cookie is set.
4. The app stores the access token in memory (`lib/api.ts`). All subsequent API calls carry it as `Authorization: Bearer <token>`.
5. When the token expires (401 on any request), `lib/api.ts` calls `POST /auth/refresh` once and retries the failed request.

### Staying signed in across page reloads
1. On every page load, the app calls `POST /auth/refresh` before showing any content.
2. If the refresh cookie is valid, a new access token is returned and the session continues silently.
3. If the cookie is missing or the token is revoked, the user is redirected to `/login`.

### Signing out
1. User clicks Sign Out. The app calls `POST /auth/logout`.
2. The server revokes the refresh token and clears the cookie.
3. The app clears the in-memory access token and redirects to `/login`.

### Changing password
1. User opens Settings → Change Password.
2. Enters current password and new password (10+ characters).
3. `POST /auth/change-password` verifies the current password, updates it, and revokes all other sessions.
4. The user stays signed in on this device; all other devices are logged out.

## Scenarios

**Scenario A — forgotten device:** A user signed in on a shared work computer and forgot to sign out. They change their password from home. All sessions (including the work computer) are invalidated. The work computer's next API call gets a 401 and the user is redirected to sign-in.

**Scenario B — deactivated account:** An admin deactivates a user until 1 January 2027. The user tries to sign in. They get 403 `ACCOUNT_DEACTIVATED`. After 1 January 2027, the deactivation is auto-cleared and sign-in succeeds.

**Scenario C — stolen refresh token:** An attacker presents a rotated (old) refresh token. The server detects it has already been used and revokes all of the user's refresh tokens, ending every active session. The user must sign in again.

**Scenario D — rate limit:** A bot fires 11 failed login attempts in 15 minutes for the same email. The 11th attempt returns 429. The user trying to log in from a different device also gets 429 for that email until the window resets.

## Context notes

- The access token lives in memory only — never localStorage. The refresh cookie is `HttpOnly` and `Secure` (ADR-0010). Any change that moves the access token to localStorage is a security regression.
- `getAuthUser(req)` is the single entry point for all authenticated routes. Never check the token manually in a route; always call `getAuthUser`.
- `getAdminUser(req)` calls `getAuthUser` first, then checks the role. Use this for all `/admin/*` routes.
- Refresh token rotation: each `POST /auth/refresh` issues a new token and revokes the old one. A client that calls refresh twice with the same token (network race) will have one success and one failure (which triggers revocation). The client must handle 401 on refresh by redirecting to `/login`.
- Deactivation with `deactivated_until` in the past auto-clears on the next sign-in attempt — no cron needed (ADR-0009).

## Comments
