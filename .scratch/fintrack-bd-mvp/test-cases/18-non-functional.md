# Test cases: Non-functional

Ticket 21. Read `README.md` in this folder first. `Check` cases are measured or inspected and recorded in the UAT checklist.

| ID | Test case | Expected | Seam | P | Covers |
|---|---|---|---|---|---|
| TC-NFR-001 | The web app manifest | Name, 192 px and 512 px icons, `theme_color` #3A5FCD, `display: standalone` | Check | P1 | architecture §Frontend |
| TC-NFR-002 | Install from Chrome on Android | The app installs and opens without browser chrome | Check | P1 | brd §11 |
| TC-NFR-003 | Open the app offline after one visit | The shell loads with an offline notice | E2E | P2 | architecture §Frontend |
| TC-NFR-004 | Every page at 375 px and 390 px | No horizontal page scroll; no truncated buttons | Check | P1 | brd §11 |
| TC-NFR-005 | Interactive controls on mobile | Each is at least 44 by 44 px | Check | P2 | brd §11 |
| TC-NFR-006 | Text and status colours in light and dark themes | WCAG AA contrast; every status also has a text label | Check | P2 | design §11 |
| TC-NFR-007 | Every page using only the keyboard | Each action is reachable; focus is always visible | Check | P2 | design §11 |
| TC-NFR-008 | Lighthouse mobile run on the dashboard | Performance score of 80 or more; no layout shift when data loads | Check | P2 | ticket 21 |
| TC-NFR-009 | Transaction create round trip | Under 500 ms, warm | Check | P1 | architecture §Performance targets |
| TC-NFR-010 | First request after the database has slept | Under 5 seconds, with skeleton screens shown | Check | P2 | architecture §Performance targets |
| TC-NFR-011 | A route throws while rendering | A friendly error card with a retry action; the rest of the app keeps working | UI | P2 | ticket 21 |
| TC-NFR-012 | An error report sent to Sentry | It contains no request body, amounts or descriptions | API | P1 | rules §9 |
| TC-NFR-013 | Server logs after creating a Transaction | They hold the route and status and no amount or description | API | P1 | rules §9 |
| TC-NFR-014 | Every list and card while loading and when empty | A skeleton while loading; an empty state when there is no data | Check | P2 | ticket 21 |
| TC-NFR-015 | The five smoke flows in CI | All pass against the built app | E2E | P1 | architecture §Testing |
| TC-NFR-016 | Production after deployment | `GET /health` is 200; a real registration email arrives and its link works | Check | P1 | ticket 21 |
| TC-NFR-017 | `pnpm test:matrix` | No `P1` case in this folder is without a test | Check | P1 | test-cases README |
