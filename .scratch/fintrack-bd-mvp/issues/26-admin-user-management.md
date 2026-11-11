# 26: Admin User Management

**What to build:** The admin area for managing user accounts: list, create, update, deactivate for a period or until reactivated, reactivate, delete, account-help emails, a manual payment-date log and an action history. Admins manage accounts only and never see financial data.

**Blocked by:** 12, 25

**Status:** ready-for-agent

**Test cases:** `test-cases/05-admin.md` (`TC-ADM`) · `test-cases/19-security.md` (extend `TC-SEC-001` to `TC-SEC-004` for the new endpoints)

**Read first:** `rules.md` §3, §8, §9 · `architecture.md` §Authentication and sessions (Admin role and account status), §Database schema (`users`, `user_payments`, `admin_actions`), §API (Admin: users, Admin: payments, Admin: audit) · `design.md` §7.11 · `brd.md` §5 FR-14 · ADR-0011

**API**

- [ ] Every `/admin/*` route starts with `getAdminUser(req)`; a non-admin gets 403 `ADMIN_ONLY`
- [ ] `GET /admin/users`: search by name or email, filter by status and role, paginated; each row has name, email, role, status, registered date, last sign-in, last payment date and paid-until date
- [ ] `POST /admin/users`: name, email, role (`USER` or `ADMIN`); creates a verified, provisioned account with no password and emails a set-password link valid for 24 hours
- [ ] `GET /admin/users/:id` and `PATCH /admin/users/:id` (name, email, promote to admin); a duplicate email is 422
- [ ] `POST /admin/users/:id/deactivate` (`until` date or none, optional reason): revokes the user's refresh tokens; `POST /admin/users/:id/reactivate`
- [ ] `DELETE /admin/users/:id`: body must repeat the user's email; removes the user and every row they own in one database transaction
- [ ] `POST /admin/users/:id/resend-verification` and `POST /admin/users/:id/send-password-reset`
- [ ] Payments: `GET`, `POST`, `PATCH`, `DELETE` under `/admin/users/:id/payments` (date paid, amount, covers until, note)
- [ ] Guards on every write under `/admin/users/:id`, including payments and account-help emails: 409 `SELF_ACTION` when the target is the acting admin; 409 `ADMIN_PROTECTED` when the target is any other admin. Only `USER` accounts can be updated, deactivated or deleted.
- [ ] `pnpm user:set-role` script for the site owner, the only way to demote an admin
- [ ] Every admin write appends to `admin_actions`; `GET /admin/actions?user_id=` lists them
- [ ] No admin route queries a financial table, and no admin response contains financial data

**Pages** (per `design.md` §7.11)

- [ ] Users list with search, filters, status badges, lapsed paid-until highlighting, and stacked cards on mobile
- [ ] User detail: Account, Access, Payments, History and Danger zone sections
- [ ] Create user modal, Deactivate modal (until a date or until reactivated), Delete confirmation that requires typing the user's email
- [ ] The Users navigation entry appears only for admins
- [ ] An admin account, the admin's own included, opens read-only with the note from `design.md` §7.11; Make admin asks for confirmation

**Tests**

- [ ] A non-admin gets 403 on every admin route
- [ ] Create a user, follow the set-password link, sign in; the account has starter categories, three provisional tax years and no financial records
- [ ] Timed deactivation: sign-in is refused before the date and works after it; open-ended deactivation lasts until reactivated; existing sessions end on deactivation
- [ ] Delete removes the user and every row they own across all tables, leaves other users' data untouched, and fails without the matching email
- [ ] An admin can create an admin and promote a user to admin
- [ ] Every write aimed at the acting admin returns 409 `SELF_ACTION`, and every write aimed at another admin returns 409 `ADMIN_PROTECTED`: update, deactivate, delete, payments and account-help emails
- [ ] Payment log create, edit and delete; the list shows the latest paid-until date
- [ ] Each admin write produces one `admin_actions` row
- [ ] With financial data seeded for a user, no admin response for that user contains any of it

## Comments
