# p2-19: Offline Entry Queue

**Status:** needs-triage
**Phase:** 2
**Spec ref:** Phase 2 §19

---

## What to build

Queue any transaction or income entry made while the user is offline, then submit the queued entries automatically when the connection returns. The user gets immediate visual confirmation that the entry was accepted into the queue, and the data is never lost due to a network failure. Idempotency keys (already implemented in the MVP) make retries safe.

---

## Why

The app is a PWA and runs on mobile. Bangladeshi mobile users frequently face intermittent connectivity — on the metro, in a lift, in rural areas. The current behaviour when offline is: "Submit is disabled with a notice; a failed submit keeps the form's contents" (ticket 15). This is acceptable for the MVP but means the user cannot complete an entry while offline — they must remember to do it later. An offline queue makes the app usable in the moment, regardless of connectivity.

---

## User flows

### Submitting an entry while offline
1. User is on the Add Transaction form. The connection is lost (or was never there).
2. The form shows: "You're offline. This entry will be saved and submitted when you're back online."
3. User fills in the form and taps Save.
4. The entry is saved to the browser's IndexedDB queue. The form closes normally.
5. A badge or indicator on the transaction list (or a system banner) shows: "1 entry pending sync."

### Automatic sync on reconnection
1. The service worker detects the connection is restored (the browser fires an `online` event).
2. The service worker processes the queue in order, submitting each pending entry to the API.
3. Each successful submission removes the entry from the queue.
4. If a submission fails (non-network error, e.g. 422 validation), the entry is marked as failed and the user is notified.

### Viewing the queue
1. User opens the transaction list (or a small "Pending" indicator in the header).
2. Pending entries are shown at the top of the list in a distinct "Pending" state (muted or italic).
3. Successfully synced entries become normal transaction rows.

### Handling a failed sync
1. An entry fails to sync (e.g. the category was deleted while the user was offline).
2. The user sees: "1 entry failed to sync — tap to review."
3. They open the failed entry, see the validation error (e.g. "Category no longer exists"), edit and resubmit, or delete the queued entry.

### Multiple offline entries
1. The user makes 5 entries while on the metro with no connectivity.
2. When the train reaches a station with signal, all 5 are submitted in order.
3. All 5 appear in the transaction list simultaneously.

---

## Scenarios

**Scenario A — metro purchase:** A user pays ৳120 for a train ticket. They open the app, fill in the transaction (Cash, Travel), and save. No internet. The entry queues. Five minutes later, still on the train, the connection returns and the entry silently syncs.

**Scenario B — remote area:** A user is visiting family in a rural area for a week with poor connectivity. They record all their expenses daily into the app. Each time there is momentary signal (at the market, near a tower), the queue syncs. They return home with a complete record.

**Scenario C — sync conflict:** The user queued a transaction using category "Dining Out." While offline, the user (from another device) deleted that category. When the queue tries to sync, the submission fails. The user sees the failed entry, selects a replacement category, and resubmits.

**Scenario D — app restarted while offline:** The user queues 3 entries, closes the browser tab, and opens it again later (still offline). The queue is still there (IndexedDB persists across page loads). When the connection returns, all 3 sync.

---

## Impact areas

- **Service worker** (from p2-18 — the same service worker that handles push notifications must also handle the offline queue): background sync API (`SyncManager.register`) or a manual `online` event listener
- **IndexedDB** as the client-side queue store — no server changes needed for the queue storage itself
- Each queued entry must carry its full payload and the `idempotency_key` generated when the form was opened (already implemented in the MVP form)
- API: no changes needed — the same POST endpoints accept the queued payloads when connectivity returns
- Transaction list UI: a "Pending sync" row state (new visual treatment)
- The sync must process entries in submission order (a user may enter a Fixed Expense payment before the transaction that prompted it; order matters for the routing logic)
- Error handling: validation errors (4xx) must surface to the user; network errors (no response) must be retried silently

---

## Decisions needed before build

- Background sync strategy: use the Background Sync API (`SyncManager`) where supported, with a fallback to the `online` event listener for browsers that do not support it (iOS Safari, some older Android). The `online` event is reliable enough for the fallback.
- Retry limit: how many times to retry a network-failed entry before marking it as "failed permanently"? Recommend: infinite retries on network error, one attempt on validation error.
- Should the offline queue work for all entry types (transactions, income, loan entries) or only transactions initially? (Recommend: transactions first; extend to income and loans in a follow-up.)
- Should the pending-entries count appear in the tab title or PWA badge? (Nice to have — out of scope for the initial implementation but note the hook for it.)

---

## Blocked by

- Ticket 03 (Transaction CRUD) and ticket 15 (Transactions & Budget UI) — the transaction entry flow must be stable.
- **p2-18** (Push Notifications and Daily Scheduler) — the same service worker must exist. If p2-18 is not built first, the service worker for this ticket must be designed to accommodate the push notification functionality later (do not create two separate service workers).

## Comments

<!-- Append discussion below this line -->
