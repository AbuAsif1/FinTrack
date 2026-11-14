# 26: Admin User Management

**What to build:** The admin area for managing user accounts: list, create, update, deactivate for a period or until reactivated, reactivate, delete, account-help emails, a manual payment-date log and an action history. Admins manage accounts only and never see financial data.

**Blocked by:** 12, 25

**Status:** done

**Test cases:** `test-cases/05-admin.md` (`TC-ADM`) · `test-cases/19-security.md` (extend `TC-SEC-001` to `TC-SEC-004` for the new endpoints)

**Read first:** `rules.md` §3, §8, §9 · `architecture.md` §Authentication and sessions (Admin role and account status), §Database schema (`users`, `user_payments`, `admin_actions`), §API (Admin: users, Admin: payments, Admin: audit) · `design.md` §7.11 · `brd.md` §5 FR-14 · ADR-0011

**API**

- [x] Every `/admin/*` route starts with `getAdminUser(req)`; a non-admin gets 403 `ADMIN_ONLY`
- [x] `GET /admin/users`: search by name or email, filter by status and role, paginated; each row has name, email, role, status, registered date, last sign-in, last payment date and paid-until date
- [x] `POST /admin/users`: name, email, role (`USER` or `ADMIN`); creates a verified, provisioned account with no password and emails a set-password link valid for 24 hours
- [x] `GET /admin/users/:id` and `PATCH /admin/users/:id` (name, email, promote to admin); a duplicate email is 422
- [x] `POST /admin/users/:id/deactivate` (`until` date or none, optional reason): revokes the user's refresh tokens; `POST /admin/users/:id/reactivate`
- [x] `DELETE /admin/users/:id`: body must repeat the user's email; removes the user and every row they own in one database transaction
- [x] `POST /admin/users/:id/resend-verification` and `POST /admin/users/:id/send-password-reset`
- [x] Payments: `GET`, `POST`, `PATCH`, `DELETE` under `/admin/users/:id/payments` (date paid, amount, covers until, note)
- [x] Guards on every write under `/admin/users/:id`, including payments and account-help emails: 409 `SELF_ACTION` when the target is the acting admin; 409 `ADMIN_PROTECTED` when the target is any other admin. Only `USER` accounts can be updated, deactivated or deleted.
- [ ] `pnpm user:set-role` script for the site owner, the only way to demote an admin
- [x] Every admin write appends to `admin_actions`; `GET /admin/actions?user_id=` lists them
- [x] No admin route queries a financial table, and no admin response contains financial data

**Pages** (per `design.md` §7.11)

- [x] Users list with search, filters, status badges, lapsed paid-until highlighting, and stacked cards on mobile
- [x] User detail: Account, Access, Payments, History and Danger zone sections
- [x] Create user modal, Deactivate modal (until a date or until reactivated), Delete confirmation that requires typing the user's email
- [x] The Users navigation entry appears only for admins
- [x] An admin account, the admin's own included, opens read-only with the note from `design.md` §7.11; Make admin asks for confirmation

**Tests**

- [x] A non-admin gets 403 on every admin route
- [x] Create a user, follow the set-password link, sign in; the account has starter categories, three provisional tax years and no financial records
- [x] Timed deactivation: sign-in is refused before the date and works after it; open-ended deactivation lasts until reactivated; existing sessions end on deactivation
- [x] Delete removes the user and every row they own across all tables, leaves other users' data untouched, and fails without the matching email
- [x] An admin can create an admin and promote a user to admin
- [x] Every write aimed at the acting admin returns 409 `SELF_ACTION`, and every write aimed at another admin returns 409 `ADMIN_PROTECTED`: update, deactivate, delete, payments and account-help emails
- [x] Payment log create, edit and delete; the list shows the latest paid-until date
- [x] Each admin write produces one `admin_actions` row
- [x] With financial data seeded for a user, no admin response for that user contains any of it

## Why

FinTrack BD is a hosted, multi-user app. The owner (admin) provisions accounts for people they want to give access to — currently just themselves, but potentially a small trusted group. Without an admin interface, adding a user requires a database command. The admin area gives the owner a UI to onboard users, manage payment status, and deactivate or remove accounts — all without ever touching the database directly. The hard rule that admins never see financial data (ADR-0011) is what makes this safe: the admin role is purely account-management, not a privileged financial view.

---

## User flows

### Creating a new user
1. Admin opens **Admin → Users** from the navigation (visible only to admins).
2. Admin clicks **Create user**.
3. A modal asks for name, email, and role (User or Admin).
4. Admin clicks **Create**. The app creates a verified, provisioned account with no password and sends a set-password email to the new user.
5. The new user appears in the list with status **Provisioned**.

### Managing a user's subscription / payment status
1. Admin opens the user's detail page.
2. Under the **Payments** tab, admin clicks **Add payment**.
3. Admin enters: date paid, amount, covers-until date, and an optional note.
4. The user's paid-until date updates in the user list (highlighted if lapsed).
5. Admin can edit or delete a payment entry; each change is logged in the action history.

### Deactivating a user temporarily
1. Admin clicks **Deactivate** on the user's detail page.
2. A modal asks: "Until a specific date?" (e.g. while unpaid) or "Until manually reactivated?"
3. Admin selects a date or leaves it open-ended and optionally adds a reason.
4. The user's existing sessions end immediately. Future sign-in attempts are refused until the date passes or the admin reactivates.

### Deleting a user account
1. Admin opens the user's detail page → **Danger zone**.
2. Admin clicks **Delete account**.
3. A confirmation modal requires the admin to type the user's email address.
4. Admin types the email and confirms.
5. The app removes the user and every row they own across all tables in one database transaction. No financial data from other users is touched.

### Viewing admin action history
1. Admin opens **Admin → Users → Action history** (or the history tab on a user detail page).
2. Every admin write is listed: who did it, what they did, to which user, and when.

---

## Scenarios

**Scenario A — onboarding the owner's partner:** The owner wants to give their spouse access. Admin creates a user account with the User role. The spouse receives a set-password email, signs in, and starts entering transactions. The admin can see the account status but never sees the spouse's financial records.

**Scenario B — deactivating a lapsed subscription:** A user has not paid for 2 months. The admin deactivates the account "until reactivated." The user's sessions end. When they renew, the admin logs the payment and reactivates the account.

**Scenario C — admin trying to delete their own account:** The acting admin clicks Delete on their own account. The app returns `409 SELF_ACTION`. The same guard prevents the admin from deactivating or editing their own account. The site-owner must use the `pnpm user:set-role` CLI to change their own role.

**Scenario D — deleting a user who has financial data:** A test user accumulated 2 years of transactions during development. Admin deletes the account. All transactions, income entries, loan entries, savings accounts, fixed expenses, and tax year records for that user are removed in one atomic transaction. Other users' data is not touched.

---

## Context notes

- Admins can create other admins (`role: ADMIN`) but cannot edit, deactivate, or delete another admin — `409 ADMIN_PROTECTED` guards every write targeting an admin account. This prevents a rogue admin from locking out others.
- The only way to demote an admin (change role from ADMIN to USER) is the `pnpm user:set-role` CLI — this deliberately requires server access and is logged separately.
- The `admin_actions` table is an append-only audit log; admin writes never update or delete existing action rows.
- No admin API route may query a financial table (`transactions`, `income_entries`, `savings_accounts`, `loan_entries`, `fixed_expenses`, `tax_years`, etc.) — enforced by ADR-0011. Any route that accidentally returns financial data for a user is a security defect.
- Ticket 12 (Frontend shell & auth UI) must be done first to have the navigation and session context the admin pages rely on. Ticket 25 (Registration & recovery) must be done first for the set-password and password-reset email flows used when creating a new user.

## Comments
