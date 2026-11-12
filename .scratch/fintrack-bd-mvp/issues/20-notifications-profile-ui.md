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

## Comments
