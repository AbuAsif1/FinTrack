# 20: Notifications, Profile & Settings UI

**What to build:** The notification drawer and the Settings page: profile, password, theme, category management, and the entry points to Tax Year Settings, Import and Export.

**Blocked by:** 10, 12

**Status:** done

**Test cases:** `test-cases/17-ui.md` §Notifications and Settings (`TC-UI-160` to `TC-UI-163`)

**Read first:** `design.md` §7.9, §8 · `brd.md` §5 FR-09, FR-13 · `architecture.md` §Generated on read (`refreshNotifications`)

- [x] Notification drawer opened from the bell: unread first; each notification type rendered with a link to its Fixed Expense, Loan Entry, budget category or tax settings
- [x] Mark one as read, mark all as read; unread count badge; "You're all caught up" empty state
- [x] Settings page with the sections in `design.md` §7.9: Profile (name, email, change password, sign out), Appearance (Light / Dark / System), Categories (add, rename, recolour, archive), and links to Tax Year Settings, Import and Export
- [x] Change password form with the current-password check and its error states (linked via /settings/change-password)
- [x] A category's kind is shown as a chip and cannot be edited once the category has been used (routing_type !== NONE shows Read-only)

---

## Why

The notification drawer and Settings page are the app's housekeeping layer. Without them, the user cannot act on overdue alerts, cannot change their profile or password, cannot manage their custom categories, and has no path to the Tax Year Settings, Import or Export features. The Settings page organises all these secondary actions in one place so the main navigation stays clean. The notification drawer handles the alert backlog — the user processes notifications at their own pace, not in real time.

## User flows

### Opening and processing the notification drawer
1. User taps the bell icon in the top bar. The unread count badge shows "3."
2. The drawer opens, sliding from the right (desktop) or bottom (mobile).
3. Unread notifications at the top, in bold:
   - "Home Electricity due in 2 days — ৳2,500" → links to Fixed Expenses
   - "Mess Rent overdue — ৳8,000" → links to Fixed Expenses
   - "Food & Dining budget over limit — 108%" → links to Budgets
4. User taps "Mess Rent overdue." The drawer closes and the Fixed Expenses page opens.
5. User pays Mess Rent. Returns to the notification drawer. The "Mess Rent overdue" notification now shows as resolved (greyed out / strikethrough).

### Mark all as read
1. User taps "Mark all as read" at the top of the drawer.
2. All unread notifications become read. The badge on the bell clears to 0.
3. The notifications remain visible (they are not hidden, just marked read).

### Changing display name
1. User opens Settings → Profile.
2. Taps on their name. An inline edit field appears. User types the new name.
3. `PATCH /me` updates the name. The top bar shows the new name immediately.

### Changing password
1. User opens Settings → Security → Change Password.
2. Enters current password, new password (10+ characters), confirm new password.
3. Saves. `POST /auth/change-password` succeeds. The user is informed "Password changed — your other devices have been signed out."

### Managing categories
1. User opens Settings → Categories.
2. Sees all categories with name, colour chip, routing type chip, and archive status.
3. Taps "Add category." Enters name "Fuel," colour (picker), and routing type (NONE for spending).
4. Saves. The new category is available in the Add Transaction form.
5. Taps edit on "Old subscription." Changes the name to "Streaming Services." Saves.
6. A category that has been used (routing_type ≠ NONE, or any transactions exist) shows the routing type as read-only.

## Scenarios

**Scenario A — notification badge on page load:** User returns to the app after 3 days. The bell shows "5" unread. Opening the drawer shows all 5, ordered by recency. 2 Fixed Expense overdue alerts, 1 budget alert, 2 loan overdue alerts.

**Scenario B — "You're all caught up":** User clears all 5 notifications (marks all read and all resolved). The drawer shows the empty state: "You're all caught up" with a subtle illustration. The bell badge shows 0.

**Scenario C — category routing type locked:** User added "BRAC DPS" category, used it in several DPS transactions. Now tries to change its routing type from SAVINGS_DEPOSIT to NONE. The routing type field shows "Savings Deposit" as a read-only chip with a tooltip: "Routing type cannot be changed once a transaction uses this category."

**Scenario D — accessing Tax Year Settings from Settings:** User opens Settings. Under "Tax" section, they see "Tax Year Settings." Taps it. Navigates to `/settings/tax-years` where they can edit, confirm, and file each fiscal year's tax parameters.

## Context notes

- Each notification type links to a specific page (Fixed Expenses for due/overdue items, Budgets for over-limit, Loans for overdue returns). The link target must be correct per notification type — do not link all notifications to the dashboard.
- Resolved notifications (the alert condition is no longer true — e.g. the Fixed Expense was paid) have `resolved_at` set by `refreshNotifications`. Show them in a dimmed/resolved state for 7 days, then exclude them from the response.
- The Settings page has these sections: Profile, Appearance, Categories, Links to Tax Year Settings / Import / Export. Admin users also see a link to the Admin panel.
- Category management: the routing type is immutable once any transaction uses the category (enforced by the API). The UI must show this restriction clearly — not a confusing error after the user tries to save.
- Password change must call `POST /auth/change-password` with the current password. The error state for "wrong current password" (401) must be shown as an inline form error, not a toast.

## Comments
