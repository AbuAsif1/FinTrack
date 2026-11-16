# p2-01: More Admin Tools

**Status:** done
**Phase:** 2
**Spec ref:** Phase 2 §1

---

## What to build

Extend the admin area beyond user management (MVP FR-14, ADR-0011) with three capabilities:

1. **Sign-up toggle** — open or close new registrations from the admin UI, replacing the current deployment-time environment variable.
2. **Shared defaults** — a set of default tax settings and starter categories that the admin maintains; new users receive a copy when their account is provisioned.
3. **Site health panel** — headline usage counts (total users, active users, registrations this month) visible to admins only.

Admins still never see any user's financial data.

---

## Why

The owner currently flips `ALLOW_REGISTRATION` in the server config to open or close the waitlist. During a soft launch they need to control this in real time — redeploying to change one flag is impractical. Similarly, every new account today starts with a fixed set of starter categories baked into the provisioning code; the owner wants to curate and update those defaults over time without a code change.

---

## User flows

### Sign-up toggle
1. Admin opens **Admin → Settings**.
2. A "New registrations" toggle shows the current state ("Open" / "Closed") with the date it last changed.
3. Admin flips the toggle; a confirmation dialog names the effect ("New visitors will see a 'Registration is closed' message").
4. Admin confirms. The change takes effect immediately — the registration page shows an appropriate message to anonymous visitors while the toggle is closed.

### Shared default categories
1. Admin opens **Admin → Defaults → Categories**.
2. Existing defaults are listed with name, colour, routing type and whether it is archived.
3. Admin can add, rename, recolour, archive or delete a default category.
4. Changes only affect new accounts provisioned after the change — existing users keep what they have.
5. When a new user is provisioned (via `POST /admin/users`), the provisioning code copies the current defaults instead of the hardcoded list.

### Shared default tax settings
1. Admin opens **Admin → Defaults → Tax**.
2. Fields match the per-user tax profile (residential status, age bracket, applicable year parameters).
3. These become the starting values for every new user's tax profile; the user can override them in their own Settings.

### Site health panel
1. Admin opens **Admin → Health**.
2. Sees: total registered users, users active in the last 30 days, new registrations this month, sign-up toggle state.
3. Numbers are read-only. No drill-down into individual users' financial activity.

---

## Scenarios

**Scenario A — controlled launch:** The owner opens sign-ups for a weekend event by toggling the switch on Friday and off on Sunday. The registration page shows "Registration is open" / "Registration is closed" accordingly.

**Scenario B — updated defaults for a new tax year:** The owner updates the default tax-year parameters in Admin → Defaults → Tax before creating accounts for new users at the start of the new fiscal year.

**Scenario C — adding a new starter category:** A common expense category the owner wants all new users to start with is added under Admin → Defaults → Categories; the next provisioned account receives it.

---

## Impact areas

- `users` table provisioning path (`POST /admin/users`) — must read defaults instead of hardcoded list
- New DB table or config rows for `default_categories` and `default_tax_settings`
- New admin API routes: `GET/PUT /admin/settings/registration`, `GET/PUT /admin/settings/defaults/categories`, `GET/PUT /admin/settings/defaults/tax`, `GET /admin/health`
- Registration route (`POST /auth/register`) must check the toggle before accepting
- `design.md` will need new Admin section wireframes
- Admins never see financial data — health counts must be aggregate only, no per-user breakdown

---

## Decisions needed before build

- Where to store the registration toggle: a `site_settings` key-value table or a typed row? (Recommend a typed `site_settings` table, easier to extend.)
- Should default-category changes apply to already-provisioned users who have not yet customised their categories? (Spec says no — new accounts only. Confirm with owner.)
- What counts as "active": any sign-in, or any financial record created?

---

## Blocked by

None (builds on the MVP admin foundation from ticket 26).

## Comments

<!-- Append discussion below this line -->
