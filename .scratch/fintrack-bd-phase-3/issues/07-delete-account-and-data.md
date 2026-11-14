# p3-07: Delete My Account and Data

**Status:** needs-triage
**Phase:** 3
**Moved from:** Phase 2 §2
**Spec ref:** Phase 3 — Deferred features

---

## What to build

A self-service "Delete my account" action that:

1. Presents a final offer to export all data before deletion.
2. Requires the user to type their email address to confirm.
3. Permanently removes the account and every record it owns from the database.
4. Is a recorded exception to the application-wide soft-delete rule.

---

## Why

The app holds sensitive financial data. Users need a credible way to leave — both for trust and for compliance with privacy norms (GDPR-equivalent expectations even in the absence of a formal obligation). The MVP admin delete (ticket 26) already shows the deletion logic; this gives the user control over their own exit. Without it, users who stop using the app have no way to know their data is gone.

---

## User flows

### Standard exit
1. User opens **Settings → Account → Danger zone**.
2. A "Delete my account and all data" button is shown in a visually distinct danger zone (red border or muted background, per `design.md` conventions).
3. Clicking it opens a modal with two steps.

**Step 1 — export offer:**
> "Before you go, would you like to download a copy of your data? This is your last chance — once your account is deleted nothing can be recovered."
- "Download my data" button triggers the same full-JSON export as the existing export feature, then returns to this modal.
- "Skip and continue" proceeds without downloading.

**Step 2 — typed confirmation:**
> "To permanently delete your account, type your email address below."
- Input field, placeholder shows the user's email.
- "Delete my account" button is disabled until the typed value matches the user's email exactly (case-insensitive).
- Submitting sends `DELETE /users/me`.

4. The server deletes the account and all owned rows in one transaction, invalidates all sessions, and returns 200.
5. The browser is redirected to the sign-in page with a toast: "Your account has been deleted."

### Cancelled attempt
- Closing the modal at any step cancels with no changes.

### Failure
- If the deletion request fails (network error, server error), the modal shows an error and the account is unchanged.

---

## Scenarios

**Scenario A — user leaving for good:** A user decides to stop using the app. They first export their data as JSON (they want a local backup), then type their email and confirm deletion. All their transactions, income records, loans, savings, and tax data are removed.

**Scenario B — test account cleanup:** A developer provisioned a test account for themselves. They skip the export (no data worth keeping) and confirm deletion.

**Scenario C — misclick:** A user accidentally clicks "Delete my account." They see the modal, do not type their email, and close it. Nothing changes.

---

## Impact areas

- New API route `DELETE /users/me`: must cascade-delete all user-owned rows across every table (same logic as admin `DELETE /admin/users/:id` but self-service)
- **Soft-delete exception:** this is the only place where user data is hard-deleted; the ADR for this exception must be written and stored in `.scratch/docs/adr/`
- Session invalidation: all refresh tokens for the user must be revoked on deletion
- The export feature (ticket 23) must be reachable from inside the deletion modal flow
- UI: Danger zone section in Settings page (may need a new settings sub-page or section)
- Idempotency: a repeated request after deletion should return 404 (account already gone), not an error

---

## Decisions needed before build

- Should deletion be instant or scheduled (e.g. 30-day grace period)? The spec says immediate; confirm with owner before implementing a grace period.
- Should an admin be able to cancel a user's deletion during a grace period? Not applicable if deletion is instant.
- How to handle accounts with outstanding loans (money owed or owing)? The app does not enforce settlement, but a warning may be appropriate ("You have active loans recorded").
- Write the ADR for the hard-delete exception before implementing.

---

## Blocked by

- Ticket 23 (Data Export) — the export offer in the flow depends on the export feature being available.

## Comments

<!-- Append discussion below this line -->
