# Admins manage user accounts and never see financial data

Status: accepted (2026-11-12).

With public registration someone must be able to create, correct, deactivate and remove accounts, so the MVP has an `ADMIN` role limited to user management: account details, status, registration and sign-in dates, and a manual log of each user's payment dates. Admin endpoints live under `/api/v1/admin/` and return account data only; they never read Transactions, income, loans, savings, budgets, tax data or exports. Keeping finances out of reach of the admin is what lets other people trust the app with them, and it costs only that support must be done from an export the user chooses to share.

## Consequences

- An admin is also an ordinary user with their own private finances; the seeded owner account is the first admin.
- Deleting a user account permanently removes all of that user's rows. This is the one exception to the soft-delete rule.
- An admin can create another admin but cannot act on any admin account, their own included. Admin accounts are never deleted from the app; only the site owner can demote or remove one, with a script. This keeps one admin from locking out or impersonating another.
- Sign-up control stays a deployment setting, and shared default tax settings stay in Phase 2.
- The payment-date log is manual. A subscription feature is a Phase 3 candidate and would build on it.
