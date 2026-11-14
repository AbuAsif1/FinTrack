# p3-13: Restore from Export and Scheduled Backups

**Status:** needs-triage
**Phase:** 3
**Moved from:** Phase 2 §17
**Spec ref:** Phase 3 — Deferred features

---

## What to build

1. **Restore from export** — a user can restore their account from a full JSON export file (produced by ticket 23). This is the disaster-recovery path: if data is accidentally deleted or corrupted, the user has a way back.

2. **Scheduled automatic backups** — the app automatically generates and delivers a full JSON export on a schedule (weekly or monthly), without the user needing to trigger it manually. The delivery method could be a downloadable link, an email, or storage in the document vault (p3-12).

---

## Why

The manual export (ticket 23) exists, but only helps if the user remembers to run it before something goes wrong. Scheduled backups make data safety automatic — the user does not have to think about it. The restore feature closes the loop: a backup is only valuable if the user can actually use it to recover. Together, these give a user peace of mind that their financial history is safe even if they lose access to the device or the server has a failure.

---

## User flows

### Restoring from a JSON export
1. User opens **Settings → Data → Restore from backup**.
2. A warning is shown: "Restoring will merge the backup's records into your current account. Existing records are not deleted. Duplicate entries are skipped using their idempotency keys."
3. User uploads the JSON export file.
4. The app validates the file format (must match the full export schema from ticket 23).
5. A preview shows: N transactions, M income records, K loans, etc. that will be restored.
6. User clicks "Restore." The app imports the records using the same idempotency-key logic as the existing import — duplicates are silently skipped, new records are created.
7. A summary shows: "Restored 234 records. 15 duplicates skipped."
8. The user is returned to the Dashboard.

### Enabling scheduled backups
1. User opens **Settings → Data → Automatic backups**.
2. Options: Weekly (every Sunday) / Monthly (1st of the month) / Off.
3. User selects Weekly.
4. Delivery options:
   - **Download link by email** — the app emails a download link (valid for 7 days) on the schedule.
   - **Save to document vault** — the backup file is stored in p3-12's vault, under a "Backups" category.
5. User confirms. The first backup runs the next scheduled day.

### Downloading a past scheduled backup
1. User opens **Settings → Data → Automatic backups → History**.
2. A list of past backup runs: date, record count, status (Completed / Failed), and a Download link.
3. User clicks Download. The file saves to the device.

---

## Scenarios

**Scenario A — accidental bulk delete:** A user accidentally deletes 3 months of transactions using the bulk-delete feature. They notice immediately. They download the weekly backup from the History list (from last Sunday) and restore it. The deleted transactions reappear. 1 week of re-entry at most.

**Scenario B — new device setup:** A user gets a new phone. They sign in and find their data is intact (it's server-side). No restore needed. But if the user is on a self-hosted instance and the server fails, they can restore from the most recent emailed backup.

**Scenario C — moving between instances:** A user moves from one hosted instance to another. They export from the old instance, create a new account on the new instance, and use Restore to populate their data.

**Scenario D — backup email not received:** The backup job failed silently. The user opens backup history and sees "Failed — 2026-11-01." They trigger a manual export (ticket 23) and report the failure.

---

## Impact areas

- Restore API: `POST /data/restore` — parses the full JSON export and writes records through the same service layer as normal creation (CategoryRoutingService, etc.), using idempotency keys to skip duplicates
- The JSON export format (ticket 23) must be stable and versioned; the restore endpoint must reject files from an incompatible format version
- Scheduled backup job: a cron entry (from Phase 2 p2-18's daily scheduler) that generates exports and delivers them
- Email delivery: the app must already be able to send emails (confirmed from MVP auth flows); a new backup-delivery email template is needed
- Document vault integration (p3-12): backup files stored in the vault use the same `attachments` table
- Backup history: new DB table `backup_runs` (user_id, run_at, record_count, delivery_method, status, error_message)
- The restore operation must be idempotent — running it twice produces the same result as running it once

---

## Decisions needed before build

- Restore strategy: merge (add missing records, keep existing ones) vs. replace (clear all current data, then restore)? **Merge is safer** (no data loss if the user has added new records since the backup). Replace is more faithful to "disaster recovery." The spec implies merge via idempotency keys. Confirm with owner.
- If the restore file is from a different user's account (e.g. the user accidentally uploads the wrong file), how should the app handle it? Validate that the user_id in the export matches the current user, or warn and allow import without user_id enforcement?
- Backup storage for the email-link option: where are backup files stored temporarily? Must be a secure, expiring download link (not a permanent public URL).
- Should document vault attachments (from p3-12) be included in the JSON export and restore? (Recommend: include metadata, with file download links. Full file content in JSON is impractical for large attachments.)

---

## Blocked by

- Ticket 23 (Data Export) — the JSON export format is the input to the restore feature.
- **Phase 2 p2-18** (Push Notifications and Daily Scheduler) — the cron job for scheduled backups requires the scheduler from p2-18.
- **p3-12** (Document Vault) — if backups are delivered to the vault, p3-12 must be built first (optional delivery method).

## Comments

<!-- Append discussion below this line -->
