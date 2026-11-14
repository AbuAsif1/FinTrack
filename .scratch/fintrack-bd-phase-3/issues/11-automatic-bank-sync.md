# p3-11: Automatic Bank Sync

**Status:** needs-triage
**Phase:** 3
**Moved from:** Phase 2 §14
**Spec ref:** Phase 3 — Deferred features

---

## What to build

Automatic pulling of balances and transactions from connected bank accounts — the user connects their bank once and the app keeps their data current without manual import or entry.

This is the owner's original long-term vision ("later") for the app.

---

## Why

Manual import (even the improved version in p3-10) still requires the user to remember to export and upload a file. Automatic sync removes this friction entirely — the app stays up-to-date as transactions happen. For a daily-use financial tracker this is the gold standard of data freshness.

**Why deferred to Phase 3:** This ticket has two hard dependencies neither of which exists yet:
1. The column-mapping import from p3-10 must be in place (bank sync is conceptually an automated version of statement import).
2. A Bangladeshi bank or financial data aggregator must offer an API. As of the spec date, no general-purpose open banking API exists for Bangladeshi retail banks. This ticket is a placeholder; it cannot be built until an API is available.

---

## User flows

### Connecting a bank (future)
1. User opens **Accounts → Connect Bank**.
2. Selects their bank from a list of supported institutions.
3. The app redirects to the bank's OAuth or aggregator consent page.
4. User authenticates and grants read-only access.
5. The app receives credentials/tokens and stores them securely.
6. The initial sync runs: last 90 days of transactions are fetched and imported using the mapping and categorisation rules from p3-10.

### Ongoing sync
1. The app runs a daily sync job for each connected bank account.
2. New transactions are imported, duplicates are skipped (idempotency keys derived the same way as p3-10).
3. The user sees a "Last synced: 2 hours ago" indicator on the account card.
4. Transactions requiring categorisation land in the Needs review queue (from p3-10).

### Disconnecting a bank
1. User opens **Accounts → [Bank Name] → Disconnect**.
2. The app revokes the stored credentials.
3. Already-imported transactions remain. No future sync occurs.

---

## Scenarios

**Scenario A — set and forget:** Once connected, the user opens the app each morning and their previous day's transactions are already there. They spend 2 minutes reviewing and confirming categories, not 15 minutes entering data.

**Scenario B — sync failure:** The bank API is down. The user sees "Last sync: 3 days ago — sync failed. Click to retry or import manually." The app falls back to the manual import flow from p3-10.

---

## Impact areas

- Depends entirely on p3-10 (column-mapping import and categorisation rules) — sync is automated import, not a separate pipeline
- New DB table: `bank_connections` (user_id, institution_id, encrypted_credentials, last_synced_at, status)
- Credentials must be encrypted at rest (the most sensitive data the app would hold)
- A sync worker/job must be built (daily cron from Phase 2 p2-18, or a background job queue)
- The specific API protocol depends on the aggregator chosen — this cannot be designed until an API exists

---

## Decisions needed before build

- **Which aggregator or bank API?** This is the gating dependency. The ticket cannot proceed without identifying a partner. Potential options to investigate: MFS aggregators (bKash API for merchants), BEFTN/NPSB data, or a third-party screen-scraping aggregator if no official API exists. Assign a research sub-task before writing any code.
- Security model for stored bank credentials: use an external secret store (AWS Secrets Manager, HashiCorp Vault) rather than the app database. Confirm deployment environment.
- Regulatory and compliance requirements for storing bank access credentials in Bangladesh.

---

## Blocked by

- **p3-10** (Statement Import with Column Mapping) — the import pipeline and categorisation rules must be in place.
- **External dependency:** a Bangladeshi bank or aggregator API must become available. This ticket is not schedulable until that dependency is met.

## Comments

<!-- Append discussion below this line -->
