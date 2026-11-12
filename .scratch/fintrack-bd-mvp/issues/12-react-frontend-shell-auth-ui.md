# 12: Frontend Shell & Auth UI

**What to build:** The app shell every screen plugs into: providers, API client, session handling, login page, navigation, theme, design tokens and the shared UI primitives.

**Blocked by:** 02

**Status:** done

**Test cases:** `test-cases/17-ui.md` §Shell (`TC-UI-001` to `TC-UI-008`) · `test-cases/19-security.md` (`TC-SEC-007`, `TC-SEC-008`)

**Read first:** `rules.md` §10 · `architecture.md` §Frontend, §Authentication and sessions (Client flow, `middleware.ts`) · `design.md` §2, §3, §4, §5, §7.10, §8, §9

- [ ] `app/layout.tsx` with the TanStack Query provider and theme provider; Server Components render the static shell and all data is fetched in Client Components
- [ ] `lib/api.ts`: Axios instance with the Bearer header and one refresh-and-retry on 401; the access token is kept in memory
- [ ] On load, `POST /auth/refresh` restores the session; failure routes to `/login`
- [ ] `middleware.ts` redirects requests for app pages that have no refresh cookie to `/login`; the public account pages are exempt
- [ ] Shared account-page layout from `design.md` §7.10 (centred card, no navigation shell)
- [ ] Sign in page per `design.md` §7.10: email and password form with an error state; attempts a silent refresh before showing the form. The Create account and Forgot password pages are ticket 25.
- [ ] Navigation per `design.md` §8: left sidebar on desktop; on mobile a bottom tab bar (Home, Transactions, Add, Fixed, More) with the remaining sections in the More drawer; top bar with page title and notification bell
- [ ] A route stub for every page listed in `architecture.md` §Frontend
- [ ] Design tokens as CSS custom properties for light and dark; theme choice (Light / Dark / System) stored in `localStorage`; fonts through `next/font`
- [ ] Shared primitives from `design.md` §5: Summary Tile, Status Badge, Progress Bar, Alert Banner, Empty State, Modal and bottom sheet, `Amount` (renders `formatBDT`, right-aligned, tabular numerals) and `MoneyInput` (uses `parseBDT`)
- [ ] PWA manifest and the `next-pwa` service worker stub
- [ ] Tests: `MoneyInput` turns "50000" and "1198.50" into Paisa and rejects three decimals; `Amount` renders the `AC-FMT-1` values; an unauthenticated visit lands on `/login`

## Comments
