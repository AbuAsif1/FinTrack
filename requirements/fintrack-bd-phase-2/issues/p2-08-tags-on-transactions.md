# p2-08: Tags on Transactions

**Status:** done
**Phase:** 2
**Spec ref:** Phase 2 §8

---

## What to build

User-defined text labels (tags) that can be attached to any Transaction. Tags cut across categories — a single tag like "Eid" can mark transactions across Food, Clothing, Travel and Gifts categories. Tags are usable as a filter on the Transactions list and in reports.

---

## Why

The category system organises spending by what it is (food, transport, utilities). But sometimes the user wants to slice by why or when — "how much did I spend on the Eid trip?" or "what did I spend on this home renovation project?" A tag is the natural tool for this cross-category grouping. Without tags, the user must manually scan and add up transactions from multiple categories.

---

## User flows

### Creating tags
1. Tags are created implicitly when the user types a new tag name in the tag field on the Transaction form.
2. There is no separate "manage tags" screen for creation; tags exist as long as at least one transaction uses them.
3. A "Manage tags" section in Settings allows renaming or merging tags, and deleting tags that are no longer used.

### Adding tags to a transaction
1. User opens the Add or Edit Transaction modal.
2. Below the category field is a **Tags** field — a multi-select input showing the user's existing tags as suggestions.
3. User types "Eid" — if "Eid" exists, it appears as a suggestion; if not, "Create tag 'Eid'" is shown.
4. User selects one or more tags (e.g. "Eid", "Family").
5. The tags are saved with the transaction.
6. In the transaction list, each row shows its tags as small chips.

### Filtering by tag
1. User opens the Transactions list.
2. The filter bar includes a **Tag** filter (multi-select, same tag picker).
3. User selects "Eid." The list shows only transactions tagged with "Eid."
4. Multiple tags selected → shows transactions tagged with any of the selected tags (OR logic).
5. The active filter chip bar shows "Tag: Eid ×" so the user can remove it.

### Viewing totals by tag
1. In History / Analytics, a "By tag" breakdown shows each tag with total amount and transaction count for the selected period.
2. Clicking a tag name opens a filtered transaction list for that tag.

### Renaming and merging tags
1. Settings → Tags shows all tags with transaction counts.
2. User clicks a tag name to rename it; all transactions using the old name are updated.
3. "Merge into…" lets the user combine two tags (e.g. "Eid 2024" and "Eid 2025" → "Eid"); all transactions tagged with either old name receive the new name.

---

## Scenarios

**Scenario A — Eid spending:** A user tags 12 transactions across Food, Clothing, Travel and Gifts with "Eid." After Eid they filter by "Eid" and see the total: ৳18,500 spent across all categories. They share a screenshot of this with their spouse.

**Scenario B — home renovation:** A user starts a home renovation and creates a tag "Renovation 2026." Over 3 months they tag 40 transactions (tiles, labour, paint, appliances). At the end they filter by "Renovation 2026" to see the full project cost.

**Scenario C — no tags used:** A user who does not use tags sees no tags field cluttering their transaction form (the field is present but empty and unobtrusive). The filter bar's tag filter has no options until they add one.

**Scenario D — bulk tagging:** A user wants to retroactively tag 15 past transactions with "Eid." They select them in bulk on the Transactions list and use "Add tag" in the bulk-action menu.

---

## Impact areas

- New DB tables: `tags` (id, user_id, name, created_at) and `transaction_tags` (transaction_id, tag_id) join table
- `GET /transactions` filter must accept `tag_ids[]` parameter
- Transaction CRUD API (`POST`, `PATCH /transactions/:id`) must accept and validate a `tag_ids` array
- New API routes: `GET/POST /tags`, `PATCH/DELETE /tags/:id`, `POST /tags/:id/merge`
- Transaction list UI: tag chips on each row, tag filter in filter bar
- Transaction form UI: tag multi-select input with autocomplete and "create new" option
- Analytics/History page: "By tag" breakdown section
- Bulk-action support on the Transactions list (p2-21 also mentions bulk actions; coordinate)
- Tags are user-scoped — no cross-user tag sharing

---

## Decisions needed before build

- Maximum tags per transaction? (Recommend no hard limit, but cap autocomplete results at 10 for usability.)
- Case sensitivity: "Eid" and "eid" — same tag or different? (Recommend case-insensitive storage, display as entered.)
- Should tags work on Income transactions too, or only Spending? (Recommend all transaction types — a user may want to tag a freelance income payment with a project tag.)
- Should the "By tag" breakdown appear on the existing Analytics page or as a new view?

---

## Blocked by

- Ticket 03 (Transaction CRUD) — the transaction data model must be stable.
- Ticket 15 (Transactions & Budget UI) — the transaction form and list are the entry points for tags.

## Comments

<!-- Append discussion below this line -->
