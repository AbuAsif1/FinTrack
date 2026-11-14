# 02: Authentication

**What to build:** A working login/logout flow with JWT access tokens and HTTP-only refresh cookies. An agent picking up ticket 03 or later must be able to call the API as an authenticated user in tests.

**Blocked by:** 01 (Monorepo & Core Foundation)

**Status:** ready-for-agent

- [ ] `app/api/auth/login/route.ts` POST: validates credentials, returns 15-min JWT + sets HTTP-only refresh cookie (30 days)
- [ ] `app/api/auth/refresh/route.ts` POST: exchanges valid refresh cookie for a new access token
- [ ] `app/api/auth/logout/route.ts` POST: clears the refresh cookie
- [ ] `lib/auth.ts`: `getAuthUser(req: Request)` — extracts and verifies Bearer JWT; throws 401 if missing/expired; used by every protected route handler
- [ ] Single-user seed: one pre-created user account for V1
- [ ] Integration tests against real Neon test DB: login happy path, wrong password → 401, expired token → 401, refresh flow
- [ ] DB scaffolded for multi-user later: users table has id, email, password_hash columns
