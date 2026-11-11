# 21: PWA Polish & Non-Functional Requirements

**What to build:** The final sprint: installable PWA, offline behaviour, error, empty and loading states on every screen, the mobile and accessibility passes, performance, the end-to-end smoke flows and the production deployment.

**Blocked by:** 13, 14, 15, 16, 17, 18, 19, 20, 22, 23, 25, 26

**Status:** ready-for-agent

**Test cases:** `test-cases/18-non-functional.md` (`TC-NFR`)

**Read first:** `architecture.md` §Frontend (PWA, Offline), §Testing (smoke flows), §Deployment, §Performance targets · `design.md` §9, §10, §11 · `brd.md` §11 (all fixtures and non-functional requirements)

- [ ] Manifest: app name, 192 px and 512 px icons, `theme_color` #3A5FCD, `display: standalone`
- [ ] Service worker caches the app shell; an offline notice appears and submit buttons are disabled while offline
- [ ] Add to Home Screen prompt, deferred to a sensible moment
- [ ] An error boundary on each route with a retry action; Sentry enabled when `SENTRY_DSN` is set, with request data stripped
- [ ] Loading skeletons and empty states verified on every screen
- [ ] Mobile pass at 375 px and 390 px: no horizontal page scroll, no truncated buttons, 44 px tap targets
- [ ] Accessibility pass against `design.md` §11
- [ ] Lighthouse mobile performance at least 80; no layout shift when data loads; the performance targets in `architecture.md` met
- [ ] The five Playwright smoke flows in `architecture.md` §Testing, running in CI
- [ ] Production: Vercel project, Vercel–Neon integration, Resend sending domain, environment variables, migration and seed, `GET /health` green; a real registration email arrives and its link works
- [ ] `pnpm test:matrix` reports no `P1` case without a test, and CI fails when it does
- [ ] UAT checklist: every `AC-…` fixture in `brd.md` §11 verified in the deployed app, and every `Check` case in the test matrix recorded with its result

## Comments
