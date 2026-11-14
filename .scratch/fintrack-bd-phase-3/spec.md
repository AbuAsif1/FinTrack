# FinTrack BD Phase 3 — Done

**Status:** done
**Created:** 2026-11-12
**Completed:** 2026-11-14

> **Owns:** the two Phase 3 deliverables that have been implemented. Everything else moved to Phase 4.
> Phase 2 backlog: `.scratch/fintrack-bd-phase-2/spec.md`. Phase 4 backlog: `.scratch/fintrack-bd-phase-4/spec.md`.

---

## Phase 3 deliverables (both done)

Phase 3 had two items to build. Both are implemented.

| # | Ticket | Status | Notes |
|---|--------|--------|-------|
| p3-07 | [Delete my account and data](issues/07-delete-account-and-data.md) | done | 2-step modal (export offer → email confirmation); `DELETE /api/v1/me`; ADR-0013 |
| p3-13 | [Restore from export + scheduled backups](issues/13-restore-from-export-and-scheduled-backups.md) | done | Restore from JSON export; `POST /api/v1/data/restore`; backup schedule + history; cron endpoint |

---

## Items moved to Phase 4

The following items were originally drafted as Phase 3 but moved to Phase 4 before any work started. They are not in `issues/` here — their tickets live in `.scratch/fintrack-bd-phase-4/issues/`.

| Former ref | Phase 4 ticket | Reason for move |
|---|---|---|
| p3-01 | p4-01 Subscription plans and pricing | Subscription not ready; owner decisions pending |
| p3-02 | p4-02 Automated payment via bKash or card | Depends on p4-01; gateway agreement needed |
| p3-03 | p4-03 Manual bank transfer payment | Depends on p4-01 |
| p3-04 | p4-04 Subscription access enforcement | Depends on p4-01 |
| p3-05 | p4-05 Subscription notifications and reminders | Depends on p4-01, p4-04 |
| p3-06 | p4-06 Migration of existing users | Depends on p4-01 through p4-05 |
| p3-08 | p4-07 Passkey / two-factor sign-in | Non-trivial auth infrastructure |
| p3-09 | p4-08 Shareable loan statement + reminder | PDF/image rendering decision needed |
| p3-10 | p4-09 Statement import with column mapping | Extension of import pipeline |
| p3-11 | p4-10 Automatic bank sync | No BD bank API available yet |
| p3-12 | p4-11 Receipt photos + document vault | File-storage ADR required first |

## Comments

<!-- Append discussion below this line -->
