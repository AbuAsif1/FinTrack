# p3-09: Shareable Loan Statement and Reminder Text

**Status:** needs-triage
**Phase:** 3
**Moved from:** Phase 2 §12
**Spec ref:** Phase 3 — Deferred features

---

## What to build

For a single Loan Person (someone the user has lent money to or borrowed from):

1. **A shareable statement** — a formatted image or PDF showing the history of amounts lent/borrowed and repayments, presented cleanly enough to send to the other person as a record.

2. **A bKash reminder message** — a pre-composed text message the user can copy and send via bKash (or WhatsApp/SMS) to remind a borrower that a repayment is due.

---

## Why

The loan ledger (MVP) is the user's private record. But when a user has lent money to a friend or family member, there is often a social need to share the record — either to agree on the balance or to send a polite reminder. Currently the user must manually copy amounts from the app and compose a message. This feature automates both: the statement provides a shareable document, and the reminder text is a ready-to-copy WhatsApp-style message in an appropriate format for Bangladeshi social norms around bKash.

---

## User flows

### Generating a loan statement
1. User opens the loan ledger and selects a Loan Person (e.g. "Reza Bhai").
2. On the person's detail page, they tap **Share Statement**.
3. A preview of the statement appears showing:
   - User's name (or a configurable label) and the other person's name
   - Relationship direction: "You lent to Reza Bhai" or "You borrowed from Reza Bhai"
   - A table of entries: date, description, amount lent/repaid, running balance
   - Final outstanding balance in bold
   - Date of statement generation
4. The user can choose **Download as PDF** or **Save as Image** (PNG).
5. The file is downloaded to the device and can be shared via WhatsApp, email, etc.

### Generating a bKash reminder message
1. On the Loan Person's detail page, they tap **Send Reminder**.
2. A modal shows a pre-composed message in Bangla and/or English, e.g.:
   > "Assalamu Alaikum Reza Bhai, আশা করি ভালো আছেন। আপনার কাছে আমার ৳15,000 টাকা পাওনা আছে (last payment due: 15 November 2026)। সুবিধামতো বিকাশ করলে ভালো হতো। ধন্যবাদ।"
3. The message auto-fills with:
   - The person's name (from the Loan Person record)
   - The outstanding balance
   - The last repayment due date (if set)
4. The user can edit the message in the text area.
5. **Copy** copies the message to the clipboard. The user pastes it into bKash, WhatsApp or SMS.
6. Optionally, **Send via WhatsApp** (a `wa.me` deep link) opens WhatsApp with the message pre-filled, if the user has a phone number on the Loan Person record.

---

## Scenarios

**Scenario A — overdue personal loan:** The user lent ৳50,000 to a colleague in June for 3 months. It's now October. They open the person's loan page, tap Send Reminder, copy the generated message, and send it via WhatsApp. The colleague sees the exact outstanding amount and due date.

**Scenario B — shared statement to settle a dispute:** A family member disputes the balance. The user generates a PDF statement showing every entry with dates. They send the PDF over email. The statement serves as an agreed-upon record.

**Scenario C — borrower receives a loan statement:** The user is on the borrowing side — they borrowed ৳20,000 from a friend. They generate a statement as confirmation of what they owe and share it proactively to maintain trust.

**Scenario D — no due date set:** The user has no repayment due date on a particular loan. The reminder message omits the due-date line and uses "আপনার সুবিধামতো" (at your convenience) instead.

---

## Impact areas

- New API routes:
  - `GET /loans/persons/:id/statement?format=pdf|image` — generates and returns the file
  - `GET /loans/persons/:id/reminder-text` — returns the pre-composed message string
- PDF/image generation: requires a server-side rendering library (e.g. Puppeteer with an HTML template, or a PDF library like PDFKit); choose the approach and confirm it fits the deployment environment
- Loan Person data model must have an optional `phone_number` field (for the WhatsApp deep link)
- Statement design: a clean, readable template — not the app's full UI, just the loan table, names, and balance. `design.md` will need this template defined.
- WhatsApp deep link: `https://wa.me/<number>?text=<encoded message>` — works without installing anything on the server
- File download on mobile PWA must be handled correctly (Content-Disposition header, download attribute)

---

## Decisions needed before build

- Statement format: image (PNG) only, PDF only, or both? Image is simpler (screenshot-like); PDF is more professional. Recommend offering both.
- Should the user's real name appear on the statement, or allow them to customise the label (e.g. their initials or nickname for privacy)? A configurable label is more flexible.
- Phone number on Loan Person: add it now for the WhatsApp link, or leave the link out until it is added? (Recommend: add phone number field in this ticket since it is needed for the feature.)
- Language of the reminder message: Bangla only, English only, or dual? The spec says "bKash reminder message" implying Bangla social context. Recommend a toggle or both languages in one message, with the user able to edit.
- Should the reminder send an in-app notification or be purely a copy-paste? (Copy-paste only — the app does not send SMS or bKash messages directly.)

---

## Blocked by

- Ticket 05 (Borrow/Loan Ledger API) — the loan person and entries data must be stable.
- Ticket 17 (Borrow/Loan UI) — the loan detail page is extended with these actions.

## Comments

<!-- Append discussion below this line -->
