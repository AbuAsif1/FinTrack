# ADR-0013: User Self-Deletion is a Hard Delete

**Status:** Accepted  
**Date:** 2026-11-14

## Context

The application-wide soft-delete rule (rules.md §3) requires that `transactions` and `income_entries` are never permanently deleted — they are soft-deleted with `is_deleted = TRUE`. ADR-0011 records one existing exception: an admin deleting a whole account removes every row that user owns.

A Phase 3 requirement (p3-07) adds self-service account deletion. Users who leave the app need a credible, complete erasure for trust and privacy-norm compliance (GDPR-equivalent expectations). A soft-delete would leave all financial records on the server indefinitely, defeating the purpose.

## Decision

`DELETE /api/v1/users/me` is a **hard delete**. It permanently removes the `users` row and, via `ON DELETE CASCADE`, every row the user owns across all tables — including `transactions` and `income_entries`. This is the second explicit exception to the soft-delete rule.

Conditions that make this acceptable:

1. **User-initiated and confirmed.** The user must type their own email address (case-insensitive) before the deletion proceeds. This is the same confirmation gate used by admin account deletion.
2. **Export offered first.** The UI presents a data export before the confirmation step, so the user has a path to retain their history.
3. **Irreversible by design.** The endpoint returns `200` (account gone) and the client redirects to the sign-in page. A repeated call returns `404` — the account no longer exists.
4. **All sessions invalidated.** Cascade deletion of `refresh_tokens` and `email_tokens` rows revokes all active sessions for the deleted account.

## Consequences

- Financial records for a self-deleted account are unrecoverable after the fact, by design.
- The admin audit log (`admin_actions`) does **not** receive an entry for self-deletion; it is for admin actions only. The deletion itself is proof enough.
- The existing admin-delete path (ADR-0011) is unchanged.
- Future features that need to record "this account was deleted" (e.g. a separate deletion audit log) must do so **before** calling `prisma.user.delete()`, since the cascade fires immediately.
