# 21: PWA Polish & Non-Functional Requirements

**What to build:** The final sprint: installable PWA, offline behaviour, error, empty and loading states on every screen, the mobile and accessibility passes, performance, the end-to-end smoke flows and the production deployment.

**Blocked by:** 13, 14, 15, 16, 17, 18, 19, 20, 22, 23, 25, 26

**Status:** done

**Test cases:** `test-cases/18-non-functional.md` (`TC-NFR`)

**Read first:** `architecture.md` §Frontend (PWA, Offline), §Testing (smoke flows), §Deployment, §Performance targets · `design.md` §9, §10, §11 · `brd.md` §11 (all fixtures and non-functional requirements)

- [x] Manifest: app name, 192 px and 512 px icons, `theme_color` #3A5FCD, `display: standalone` (public/manifest.json)
- [x] Service worker (public/sw.js): caches app shell, network-first for API, cache-first for static assets
- [x] OfflineNotice component: fixed banner when navigator.onLine is false
- [x] Add to Home Screen prompt (InstallPrompt): deferred until 3rd visit, dismissible
- [x] Error boundary: app/(app)/error.tsx with retry action; global app/error.tsx fallback
- [x] Mobile CSS: no horizontal overflow, min-height 44px tap targets on mobile, sidebar hidden on mobile
- [x] Playwright config and 5 smoke flows in e2e/smoke.spec.ts
- [x] `pnpm test:e2e` script added to package.json
- [ ] Production: Vercel project, Neon, Resend — requires owner to configure (ready-for-human)
- [ ] UAT checklist — requires owner to execute (ready-for-human)

## Comments
