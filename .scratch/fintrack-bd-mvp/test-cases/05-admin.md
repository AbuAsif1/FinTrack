# Test cases: Admin user management

Ticket 26. Read `README.md` in this folder first. "User" means an account with role `USER`; "admin" means role `ADMIN`.

| ID | Test case | Expected | Seam | P | Covers |
|---|---|---|---|---|---|
| TC-ADM-001 | A user calls each `/admin/*` route | 403 `ADMIN_ONLY` every time | API | P1 | FR-14 |
| TC-ADM-002 | An admin lists users | Each row has name, email, role, status, registered date, last sign-in, last payment date and paid-until date | API | P1 | FR-14 |
| TC-ADM-003 | List with a search term, a status filter and a role filter | Only matching accounts are returned, paginated | API | P2 | FR-14 |
| TC-ADM-004 | Status of an active, an unverified, a date-deactivated and an open-ended deactivated account | Active, Unverified, Deactivated until that date, Deactivated until reactivated | API | P1 | FR-14 |
| TC-ADM-005 | An admin creates a user | A verified account with no password and the starter set; a set-password email is sent | API | P1 | FR-14 |
| TC-ADM-006 | The created person follows the set-password link | They can sign in with the password they chose | API | P1 | FR-14 |
| TC-ADM-007 | An admin creates an account with role `ADMIN` | The new account is an admin | API | P1 | FR-14 |
| TC-ADM-008 | Create with an email that already exists | 422 | API | P2 | FR-14 |
| TC-ADM-009 | An admin updates a user's name and email | Saved; a duplicate email is 422 | API | P1 | FR-14 |
| TC-ADM-010 | An admin promotes a user to admin | The account is an admin | API | P1 | FR-14 |
| TC-ADM-011 | Deactivate a user until a date | Their sessions end at once; sign-in is refused before the date and works after it | API | P1 | FR-14 |
| TC-ADM-012 | Deactivate a user until reactivated, then reactivate | Sign-in is refused, then works again | API | P1 | FR-14 |
| TC-ADM-013 | A reactivated user's data | Everything they had is still there | API | P1 | FR-14 |
| TC-ADM-014 | Delete a user with a non-matching confirmation email | 422; nothing is deleted | API | P1 | FR-14 |
| TC-ADM-015 | Delete a user with the matching email | The account and every record it owned are gone; other users' data is untouched | API | P1 | FR-14, ADR-0011 |
| TC-ADM-016 | Delete, deactivate, update or demote another admin | 409 `ADMIN_PROTECTED` each time | API | P1 | FR-14 |
| TC-ADM-017 | Payment log or account-help email aimed at another admin | 409 `ADMIN_PROTECTED` | API | P1 | FR-14 |
| TC-ADM-018 | Any admin write aimed at the acting admin's own account | 409 `SELF_ACTION` | API | P1 | FR-14 |
| TC-ADM-019 | An admin opens another admin's detail | 200, read-only data | API | P2 | FR-14 |
| TC-ADM-020 | Resend verification and send password reset for a user | The matching email is sent | API | P2 | FR-14 |
| TC-ADM-021 | Add, edit and delete a payment for a user | The log reflects each change; the list shows the latest paid-on and paid-until dates | API | P1 | FR-14 |
| TC-ADM-022 | A user whose paid-until date is before today | Flagged as lapsed in the list; the account stays active | API | P2 | FR-14 |
| TC-ADM-023 | Each admin write | One history entry with the admin, the target and the action | API | P1 | FR-14 |
| TC-ADM-024 | History after the target user is deleted | The entries remain, showing the deleted user's email | API | P2 | FR-14 |
| TC-ADM-025 | Admin responses for a user who has Transactions, income, loans and savings | None of that data appears in any admin response | API | P1 | ADR-0011 |
| TC-ADM-026 | An admin uses the ordinary finance routes | Their own finances work like any user's | API | P2 | ADR-0011 |
| TC-ADM-027 | `pnpm user:set-role` on an admin | The account becomes a user | API | P2 | architecture §Authentication |
| TC-ADM-028 | Navigation for a user and for an admin | "Users" appears only for the admin | UI | P1 | design §7.11 |
| TC-ADM-029 | An admin opens an admin account, their own included | Every field and action is disabled, with the read-only note; no Danger zone | UI | P1 | design §7.11 |
| TC-ADM-030 | Delete confirmation for a user | Delete stays disabled until the typed email matches | UI | P1 | design §7.11 |
| TC-ADM-031 | Deactivate modal | Offers "Until a date" and "Until I reactivate", with an optional reason | UI | P2 | design §7.11 |
| TC-ADM-032 | A deactivated user tries to sign in | The message names the end date, or says to contact the site admin | UI | P2 | design §7.10 |
