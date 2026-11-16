# p2-21: Interface Polish

**Status:** done
**Phase:** 2
**Spec ref:** Phase 2 §21

---

## What to build

A collection of UI improvement items that do not belong to a single feature but make the app feel finished, accessible and consistent. These can be tackled individually or batched; each sub-item is independently shippable.

---

## Why

The MVP delivers working features. This ticket addresses the gap between "working" and "polished." Each item came from the owner's review of the wireframes and early builds: things that look slightly wrong, accessibility gaps, or small interactions that feel incomplete. Collectively they determine whether the app feels like a professional product or a prototype.

---

## Sub-items

### A. Inline category change in the Transactions list

**Current behaviour:** To change a transaction's category, the user must open the edit modal.

**Target behaviour:** A single click on the category chip in the Transactions list opens an inline dropdown that lets the user pick a new category and saves immediately — no modal required.

**User flow:** User scans the transaction list, notices a miscategorised row, clicks its category chip, selects the correct category from the dropdown, and the row updates in place.

**Impact:** Transaction list row component; a lightweight PATCH call on category change; must respect routing-type constraints (a category cannot be changed to a different routing type if the transaction has routing data attached).

---

### B. Selected period remembered across devices

**Current behaviour:** The period selector (this month / last month / custom range) resets on each page load.

**Target behaviour:** The last-selected period is saved to the user's profile and restored on sign-in from any device. Additionally, three preset options are added: "Last 3 months", "Last 6 months", "All time."

**User flow:** User selects "Last 3 months" on their laptop. They sign in on their phone the next day and see the same period pre-selected.

**Impact:** New user preference field (`preferred_period`); period selector component; period restoration on page load; "Last 3 months" etc. must be computed as a date range relative to today (not stored as fixed dates).

---

### C. Change indicator only when previous period has real data

**Current behaviour:** The dashboard shows period-over-period change percentages even when the previous period has no data, producing meaningless "∞%" or "0%" indicators.

**Target behaviour:** A change indicator (e.g. "↑ 12% vs last month") is shown only when the previous period has at least one transaction.

**User flow:** A new user in their first month sees no change indicators (there is no previous period to compare). After two months of data, the indicators appear.

**Impact:** Dashboard aggregate API must return a flag (`has_prior_period_data`) alongside the change percentage; dashboard UI suppresses the indicator when the flag is false.

---

### D. Minimum text size 12 px

**Current behaviour:** Labels and badges render at 11 px in some places (noted in the spec).

**Target behaviour:** No visible text in the app is smaller than 12 px. WCAG AA requires 12 px as a practical lower bound for body text.

**User flow:** Users on mobile no longer need to squint at category badges or small labels.

**Impact:** Audit all `text-xs` / `text-[11px]` usages and raise them to `text-xs` (12 px minimum). Primarily a CSS/Tailwind change across multiple components.

---

### E. Vector icons in place of emoji

**Current behaviour:** Wireframes used emoji as placeholder icons (e.g. 🏦 💰 📊).

**Target behaviour:** Replace emoji with vector SVG icons from a consistent icon set (e.g. Lucide, Heroicons, or the icon set already chosen in `design.md`).

**User flow:** The app looks consistent across OS and browser — emoji render differently on Android vs. iOS vs. Windows. Vector icons are uniform.

**Impact:** Identify all emoji used as icons in the UI; replace each with the appropriate SVG icon. Confirm the target icon set in `design.md` before starting.

---

### F. Dialogs keep focus, close on Escape, disable submit while saving

**Current behaviour:** Modals and dialogs do not trap keyboard focus (users can tab outside), do not close on Escape, and may allow duplicate submits while a save is in progress.

**Target behaviour:**
- When a dialog opens, focus moves to the first focusable element inside it.
- Tabbing inside the dialog cycles within the dialog (focus trap).
- Pressing Escape closes the dialog (cancels the action if no save is in progress).
- The submit button is disabled from the moment the user clicks it until the server responds (prevents double-submit). A loading spinner is shown.

**User flow:** A keyboard user can fully operate any dialog without reaching outside it; pressing Escape is a reliable dismiss gesture; a slow connection does not result in duplicate transactions.

**Impact:** A reusable `<Dialog>` or `<Modal>` component with these behaviours built in. All existing modals (Add Transaction, Edit Income, Deactivate User, etc.) must be migrated to this component.

---

### G. Screen-size testing at 768 px and 1440 px

**Current behaviour:** UI testing has focused on 375 px (iPhone SE) and 390 px (iPhone 14) widths.

**Target behaviour:** The app is verified to look and function correctly at:
- 375 px (mobile, existing)
- 390 px (mobile, existing)
- 768 px (tablet / small laptop)
- 1440 px (desktop)

**User flow:** A user on an iPad or a 14-inch laptop sees a layout that uses the extra space sensibly — not a stretched-out mobile layout.

**Impact:** A visual review (not automated tests) at each breakpoint. Identify and fix layout issues: tables that overflow, sidebars that are too narrow, font sizes that are too small on desktop.

---

### H. "Coming up" list extended to loan returns and DPS maturity dates

**Current behaviour:** The dashboard's "Coming up" panel (upcoming Fixed Expense payments, budget-notification items) does not include loan return due dates or DPS maturity dates.

**Target behaviour:** The "Coming up" list includes (within the next 30 days or configurable window):
- Fixed Expense payments due
- Loan returns due (from the borrow/lend ledger)
- DPS or savings account maturity dates

**User flow:** A user opening the app Monday morning sees: "Car Insurance due in 3 days — ৳36,000" and "DPS at BRAC Bank matures in 7 days — ৳1,20,000" and "Reza Bhai's loan return due in 10 days — ৳15,000" all in one place.

**Impact:** Dashboard aggregate API must include upcoming loan return dates and savings account maturity dates; dashboard UI renders these new row types.

---

### I. Due-soon banner colour

**Current behaviour:** The design spec (`design.md`) uses amber for the "due soon" banner. The owner's original plan stated light blue.

**Target behaviour:** Resolve the conflict: choose one colour and apply it consistently to the due-soon banner across Fixed Expenses, the dashboard upcoming list, and any notifications.

**Decision required:** Owner must confirm: amber (warning connotation, more visible) or light blue (neutral reminder connotation). Once decided, update `design.md` and apply the chosen colour everywhere.

**Impact:** A one-line CSS change once the decision is made; the value is in resolving the ambiguity.

---

## Recommended sequencing

| Priority | Sub-item | Effort |
|---|---|---|
| High | F — dialog accessibility | Medium |
| High | D — minimum text size | Small |
| High | H — coming-up list extensions | Small |
| Medium | A — inline category change | Small |
| Medium | C — change indicator guard | Small |
| Medium | B — period remembered | Small |
| Medium | E — vector icons | Medium |
| Low | G — screen-size testing | Varies |
| Low | I — banner colour decision | Tiny |

---

## Blocked by

- Sub-item H is blocked on ticket 05 (Loans) and ticket 04 (Savings Accounts) being stable.
- Sub-item A is blocked on ticket 15 (Transactions & Budget UI).
- Sub-item F should be done before or alongside any new modal features.
- Sub-item I requires a decision from the owner before implementation.

## Comments

<!-- Append discussion below this line -->
