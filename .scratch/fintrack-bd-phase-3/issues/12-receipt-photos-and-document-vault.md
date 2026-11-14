# p3-12: Receipt Photos and Document Vault

**Status:** needs-triage
**Phase:** 3
**Moved from:** Phase 2 §16
**Spec ref:** Phase 3 — Deferred features

---

## What to build

Two related storage features:

1. **Receipt attachment on a Transaction** — the user can attach one or more photos of a receipt (or any image) to any transaction. The attachment is viewable from the transaction detail view.

2. **Document vault** — a dedicated area for storing important financial documents: salary certificates, TDS challans, DPS passbooks (photos), Sanchaypatra certificates, insurance documents, and any other supporting document needed for tax filing or financial reference.

---

## Why

The tax filing checklist (p2-09) refers to documents the user must collect and submit. Currently those documents exist only as physical papers or in email. A document vault inside the app means the user has everything in one place: their transaction history, their tax calculation, and the supporting documents. For the owner, who files taxes and has DPS, Sanchaypatra and salary income, keeping document photos alongside the financial records they relate to is a natural extension of the app's purpose.

**Why deferred to Phase 3:** File storage requires a decision about where files are stored (self-hosted object storage vs. a third-party service like AWS S3 or Cloudflare R2) and a privacy decision about whether to trust a third party with documents as sensitive as a salary certificate or TDS challan.

---

## User flows

### Attaching a receipt to a transaction
1. User opens the Add or Edit Transaction modal.
2. At the bottom of the form, a "Receipt" section shows an "Attach photo" button.
3. Clicking it opens the device's file picker or camera (on mobile, the OS offers the choice).
4. User selects or takes a photo.
5. A thumbnail preview of the attachment appears in the form.
6. User saves the transaction. The attachment is uploaded and linked to the transaction.
7. In the transaction list, rows with attachments show a small paperclip icon.
8. Tapping the transaction shows the receipt thumbnail; tapping the thumbnail opens the full image.

### Removing a receipt attachment
1. In the Edit Transaction modal, the user taps the attachment thumbnail and selects "Remove."
2. The file is marked for deletion and removed when the transaction is saved.

### Document vault
1. User opens **Documents** (new page in the navigation).
2. The vault shows documents organised by category:
   - Salary certificates
   - TDS challans
   - DPS / savings documents
   - Sanchaypatra certificates
   - Insurance
   - Other
3. User taps "Upload document" in a category.
4. A modal asks for: document name (e.g. "Salary Certificate FY 2025–26"), optional year/fiscal year tag, and the file (image or PDF).
5. The document appears in the vault with its name, category, and upload date.
6. Tapping a document opens a preview (image) or download (PDF).

### Linking a document to the tax filing checklist
1. On the tax filing checklist (from p2-09), checklist items can optionally link to a vault document.
2. "Salary certificate — Upload or select from vault." User picks an existing document or uploads a new one.
3. The checklist item shows a link icon indicating the document is attached.

---

## Scenarios

**Scenario A — restaurant receipt:** A user pays ৳3,200 for a business dinner. They photograph the receipt at the table using the app's camera shortcut and attach it to the transaction. The receipt is viewable later when they need to justify the expense.

**Scenario B — tax filing season:** The user opens the Documents page in September. They see their salary certificate (uploaded in January), TDS challan from their bank (uploaded in August), and two DPS photos. They work through the filing checklist with documents already in hand.

**Scenario C — no storage configured yet:** The admin has not set up file storage. The attachment button is hidden or shows "Document storage not available." The app works fully without it; documents are simply not available.

**Scenario D — large PDF salary certificate:** The user's employer sends a salary certificate as a multi-page PDF. They upload it to the vault. The app stores it; preview shows the first page as a thumbnail, and "Download PDF" is offered for the full file.

---

## Impact areas

- **File storage decision required first** — this ticket cannot be designed without choosing the storage provider and privacy approach. Options: self-hosted MinIO/Cloudflare R2 (keeps data off third-party clouds), AWS S3 with server-side encryption, or no cloud (files stored on the same server as the app). Write an ADR before implementing.
- New DB table: `attachments` (id, user_id, entity_type, entity_id, file_key, file_name, mime_type, size_bytes, created_at) — `entity_type` / `entity_id` supports both Transaction receipts and vault documents
- New DB table: `vault_documents` (id, user_id, name, category, fiscal_year, attachment_id, created_at)
- New API routes: `POST /uploads` (returns a presigned URL or server-upload endpoint), `DELETE /uploads/:key`, `GET /vault-documents`, `POST/PATCH/DELETE /vault-documents/:id`
- Files are user-scoped — no cross-user access; presigned URLs must expire
- File type restrictions: images (JPEG, PNG, WebP) and PDF only; maximum size per file (recommend 10 MB)
- Mobile: the transaction form must trigger the camera or file picker natively on mobile browsers
- Transaction list and detail UI must show attachment indicators

---

## Decisions needed before build

1. **Storage provider and privacy decision** (gating decision — write an ADR):
   - Option A: third-party object storage (AWS S3, Cloudflare R2) — simpler ops, but salary certificates and TDS challans are stored with a third party
   - Option B: self-hosted object storage (MinIO on the same VPS) — private, more ops work
   - Option C: defer and store files encoded in the database (not recommended at scale)
2. File size limits and total storage per user (if the deployment has limited storage).
3. Should vault documents be included in the full data export (p3-13)? (Yes — documents are part of the user's data and should be exportable as a zip.)
4. OCR of receipts (extracting amount and date automatically) is explicitly out of scope (`brd.md` §3 — "receipt OCR: not planned").

---

## Blocked by

- Ticket 03 (Transaction CRUD) — the transaction data model must be stable.
- Ticket 15 (Transactions & Budget UI) — the transaction form is extended with the attachment field.
- **Storage provider decision** — this ticket is blocked on the ADR being written and approved.

## Comments

<!-- Append discussion below this line -->
