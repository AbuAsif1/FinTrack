# FinTrack BD — Design Specification

> **Owns:** every visual decision — tokens, typography, components, page layouts. Read before writing any React component, layout, chart or mobile interaction.
> Feature behaviour is in `brd.md`; terms are in `GLOSSARY.md`. Figures in wireframes are illustrative and may be abbreviated; the UI always shows two decimals, and the binding figures are the `AC-…` fixtures in `brd.md` §11.

**Version:** 1.1  
**Date:** 12 November 2026  
**Status:** Baseline for the MVP build  
**Covers:** Visual language, token system, component patterns, page-by-page layout specs

---

## Table of Contents

1. [Design Philosophy](#1-design-philosophy)
2. [Color Token System](#2-color-token-system)
3. [Typography](#3-typography)
4. [Spacing & Layout Grid](#4-spacing--layout-grid)
5. [Component Library](#5-component-library)
6. [Data Display Rules](#6-data-display-rules)
7. [Page Layouts](#7-page-layouts)
   - [7.1 Dashboard](#71-dashboard)
   - [7.2 Income Management](#72-income-management)
   - [7.3 Transactions & Spending](#73-transactions--spending)
   - [7.4 Fixed Recurring Expenses](#74-fixed-recurring-expenses)
   - [7.5 Savings & DPS](#75-savings--dps)
   - [7.6 Borrow-Loan Ledger](#76-borrow-loan-ledger)
   - [7.7 Tax Dashboard](#77-tax-dashboard)
   - [7.8 History & Analytics](#78-history--analytics)
   - [7.9 Settings and Data](#79-settings-and-data)
   - [7.10 Account Pages](#710-account-pages)
   - [7.11 Admin: Users](#711-admin-users)
8. [Navigation Shell](#8-navigation-shell)
9. [Responsive Behavior](#9-responsive-behavior)
10. [Motion & Interaction](#10-motion--interaction)
11. [Accessibility Rules](#11-accessibility-rules)
12. [Bangladesh-Specific Display Rules](#12-bangladesh-specific-display-rules)

---

## 1. Design Philosophy

FinTrack BD is a **trusted personal ledger**, not a consumer lifestyle app. The visual language draws from paper-ledger precision — structured, scannable, every figure in its column — combined with the density and wayfinding of professional finance tools. It never feels playful or decorative. It earns trust by being accurate and legible first.

**Three design principles:**

1. **Data before chrome.** Numbers are the product. Typography, spacing, and color exist to make the right number instantly findable in a table of fifty rows.
2. **State in form, not only in text.** Good → warning → critical states are encoded in shape (chip, stripe, border) so they read at a glance without reading the label.
3. **Local first.** Bangladesh-specific vocabulary (fiscal year, TDS, Sanchaypatra, bKash) is used exactly as the user knows it, with no translation into generic finance terms.

---

## 2. Color Token System

### Light Theme (default)

```
--bg-base:     #F7F8FC   /* page ground — cool-tinted off-white */
--bg-surface:  #FFFFFF   /* cards, panels */
--bg-raised:   #EEF0F8   /* hover, selected row, pill background */
--bg-sunken:   #E8EAF4   /* input fields, code blocks */

--border:      #D4D7E8   /* subtle dividers and card strokes */
--border-focus:#3A5FCD   /* keyboard focus ring */

--fg-primary:  #111827   /* body text, headings */
--fg-secondary:#4B5563   /* secondary labels, metadata */
--fg-muted:    #9CA3AF   /* placeholder, disabled text */

--accent:      #3A5FCD   /* primary brand blue — Bangladesh flag-inspired */
--accent-hover:#2D4FB8
--accent-fg:   #FFFFFF

/* Semantic — do not use for brand accent */
--ok:          #15803D   /* positive balance, on-time, surplus */
--ok-bg:       #DCFCE7
--warn:        #B45309   /* due-soon, 70–99% budget */
--warn-bg:     #FEF3C7
--danger:      #B91C1C   /* overdue, over-budget, negative balance */
--danger-bg:   #FEE2E2
--neutral:     #374151   /* settled / zero balance */
--neutral-bg:  #F3F4F6

--income:      #0369A1   /* income-type bars and labels */
--spending:    #9333EA   /* spending-type bars and labels */
--savings:     #15803D   /* savings-type bars and labels */
--tax:         #B45309   /* tax-type bars and labels */
```

### Dark Theme

```
--bg-base:     #0F1117
--bg-surface:  #1A1D27
--bg-raised:   #252835
--bg-sunken:   #0D0F18

--border:      #2E3148
--border-focus:#6B8CF5

--fg-primary:  #F1F3FC
--fg-secondary:#9BA3BC
--fg-muted:    #4B5363

--accent:      #6B8CF5
--accent-hover:#8AA3F7
--accent-fg:   #0F1117

--ok:          #4ADE80
--ok-bg:       #052E16
--warn:        #FCD34D
--warn-bg:     #2D1B00
--danger:      #F87171
--danger-bg:   #2D0000
--neutral:     #9CA3AF
--neutral-bg:  #1F2937

--income:      #38BDF8
--spending:    #C084FC
--savings:     #4ADE80
--tax:         #FCD34D
```

### Semantic Color Usage Guide

| Token       | Used for                                               |
|-------------|--------------------------------------------------------|
| `--ok`      | Positive loan balance (they owe me), paid on time, under-budget |
| `--warn`    | Fixed expense due ≤ 3 days, budget 70–99%, partial TDS |
| `--danger`  | Overdue, over-budget, negative net cash, deadline missed |
| `--neutral` | Settled loans, skipped/inactive items, zero balance    |
| `--accent`  | CTAs, active nav item, links, focus ring color         |

---

## 3. Typography

### Font Stack

```
Display headings:  'Space Grotesk', system-ui, sans-serif
Body / UI text:    'Inter', system-ui, sans-serif
Numeric data:      'Inter' with font-variant-numeric: tabular-nums
```

Both are loaded with `next/font/google` (Inter 400/500/600, Space Grotesk 500/600/700), so they are self-hosted and available offline.

### Type Scale

| Role         | Size    | Weight | Font           | Usage                             |
|--------------|---------|--------|----------------|-----------------------------------|
| `--t-page`   | 22px    | 700    | Space Grotesk  | Page title (H1)                   |
| `--t-section`| 16px    | 600    | Space Grotesk  | Section heading (H2)              |
| `--t-label`  | 11px    | 600    | Inter          | Card eyebrow / data label (caps)  |
| `--t-body`   | 14px    | 400    | Inter          | Running body text, table cells    |
| `--t-data`   | 20px    | 600    | Inter tabular  | Big-number tiles                  |
| `--t-data-sm`| 15px    | 500    | Inter tabular  | Table amounts, running balances   |
| `--t-caption`| 12px    | 400    | Inter          | Footnotes, timestamps, metadata   |

### Label convention

All uppercase labels (EYEBROW, COLUMN HEAD) use `letter-spacing: 0.06em` and `--fg-secondary` color. Never use all-caps for body text or amounts.

---

## 4. Spacing & Layout Grid

### Base unit: 4px

| Token      | Value | Use                             |
|------------|-------|---------------------------------|
| `--sp-1`   | 4px   | Icon padding, micro gap         |
| `--sp-2`   | 8px   | Label-to-value gap, badge pad   |
| `--sp-3`   | 12px  | Inner card padding (compact)    |
| `--sp-4`   | 16px  | Standard card padding, row gap  |
| `--sp-5`   | 20px  | Section inner padding           |
| `--sp-6`   | 24px  | Between cards, section gap      |
| `--sp-8`   | 32px  | Page section gap                |
| `--sp-12`  | 48px  | Above page title                |

### Content width

- **Max content width:** 1120px, centered
- **Side gutter:** `max(16px, env(safe-area-inset-left, 0px))` — both sides
- **Card border-radius:** 10px
- **Input border-radius:** 8px
- **Badge/chip border-radius:** 999px (pill)

### Grid

- Desktop (≥ 900px): 12-column grid, 24px gutter
- Tablet (600–899px): 8-column grid, 16px gutter
- Mobile (< 600px): 4-column, single-column stacking

### Standard card pattern

```
┌─ surface bg, 10px radius, 1px border (--border) ─────────────┐
│  padding: 20px 20px 16px                                       │
│  ┌── eyebrow label ──────────────────────────────────────────┐ │
│  │  LABEL TEXT   11px, --fg-secondary, 0.06em spacing        │ │
│  └───────────────────────────────────────────────────────────┘ │
│  primary value  20–24px Space Grotesk 600                      │
│  sub-value or change indicator  12px --fg-secondary            │
└───────────────────────────────────────────────────────────────┘
```

---

## 5. Component Library

### 5.1 Summary Tile (Big Number Card)

Used in Dashboard, Tax page, Borrow-Loan summary.

```
┌───────────────────────────────┐
│  EYEBROW LABEL          [icon]│
│                               │
│  ৳1,32,488.00                 │  ← --t-data, tabular-nums
│  ↑ ৳12,000 this month        │  ← --t-caption, --ok (up) or --danger (down)
└───────────────────────────────┘
```

- 4-column grid on desktop, 2×2 on tablet, 1-column stack on mobile
- Icon: 20px, --fg-muted, right-aligned to eyebrow

### 5.2 Status Badge / Chip

```
  ┌──────────────┐    ┌────────────┐    ┌──────────┐    ┌─────────┐
  │  ● Paid      │    │  ⚠ Due Soon│    │  ✕ Overdue│    │  ○ Pending│
  └──────────────┘    └────────────┘    └──────────┘    └─────────┘
   --ok / --ok-bg      --warn/bg         --danger/bg      --neutral/bg
```

Padding: 3px 10px. Font: 11px Inter 500. Border-radius: 999px.

### 5.3 Data Table Row

```
┌─────────────────────────────────────────────────────────────────────┐
│  Date     │  Description              │  Category    │  Amount       │
│  11 Nov   │  Upension DPS             │  💰 DPS      │  ৳10,000.00   │
│           │  bKash transfer           │              │  --fg-primary  │
└─────────────────────────────────────────────────────────────────────┘
```

- Row height: 44px minimum (mobile tap target)
- Hover: `background: --bg-raised`
- Amount column: right-aligned, tabular-nums
- Negative / outgoing amounts: --danger or prefixed `−`
- Positive / incoming amounts: --ok or prefixed `+`
- Alternating row shading: none (too noisy at density); use border-bottom only

### 5.4 Progress Bar

Used for budget tracking, TDS reconciliation, investment progress.

```
  GROCERIES   ৳2,340 / ৳3,500            67%
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  [████████████████████████░░░░░░░░░░░░] green
  [████████████████████████████████████] amber (70–99%)
  [████████████████████████████████████████] red + overflow (100%+)
```

- Track height: 6px, border-radius: 3px
- Track background: --bg-sunken
- Fill: transitions from --ok → --warn → --danger by percentage

### 5.5 Period Selector

Persistent control at the top of Dashboard and Analytics pages.

```
  ┌──────────────────────────────────────────────────────────────┐
  │  [ This Month ]  [ Last Month ]  [ This Tax Year ]  [ Custom ▾ ] │
  └──────────────────────────────────────────────────────────────┘
  Active tab: --accent text, 2px --accent underline
  Inactive: --fg-secondary
```

Options: This Month, Last Month, This Tax Year, Last Tax Year, Custom. The wireframes abbreviate the list.

On mobile: collapses to a dropdown `<select>`.

### 5.6 Alert Banner

Shown in Dashboard when fixed expenses are overdue or due soon.

```
┌──────────────────────────────────────────────────────────────────────┐
│  ⚠  Upension DPS is due in 2 days (Day 8) · ৳10,000       [Mark Paid]│
└──────────────────────────────────────────────────────────────────────┘
  --warn-bg background, --warn left border 4px, full-width
```

```
┌──────────────────────────────────────────────────────────────────────┐
│  ✕  Mess Rent is 3 days overdue (Day 15) · ৳8,722         [Mark Paid]│
└──────────────────────────────────────────────────────────────────────┘
  --danger-bg background, --danger left border 4px
```

### 5.7 Quick Action Bar

Fixed-bottom bar on mobile; inline group below hero on desktop.

```
  [ + Add Spending ]   [ + Add Income ]   [ ✓ Mark Fixed Paid ]
  primary CTA          secondary          ghost
```

- Primary CTA: `--accent` background, `--accent-fg` text, 10px radius
- Secondary: `--border` background, `--fg-primary` text
- Ghost: no background, `--accent` text

### 5.8 Empty State

```
       ┌────────────────────────────────────┐
       │                                    │
       │          [icon illustration]       │
       │                                    │
       │   No transactions this month.      │
       │   Add your first entry to start    │
       │   tracking.                        │
       │                                    │
       │        [ + Add Transaction ]       │
       └────────────────────────────────────┘
```

Icon: 48px, --fg-muted. Heading: --t-section. Body: --t-body --fg-secondary.

### 5.9 Form / Modal

```
┌─── Add Spending ───────────────────────────────────────────────────┐
│                                                                     │
│  Amount (৳)         Date                                            │
│  ┌────────────────┐ ┌────────────────┐                             │
│  │  10,000        │ │  2026-11-11    │                             │
│  └────────────────┘ └────────────────┘                             │
│                                                                     │
│  Description                                                        │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  Upension DPS installment                                      │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  Category               Payment Method                              │
│  ┌──────────────────┐   ┌──────────────────┐                       │
│  │  DPS / Savings ▾ │   │  Bank Transfer ▾ │                       │
│  └──────────────────┘   └──────────────────┘                       │
│                                                                     │
│  ┌── DPS routing notice ──────────────────────────────────────────┐│
│  │  🔵 This will add ৳10,000 to City Bank DPS.                    ││
│  │     Select savings account:  [ City Bank 10k DPS ▾ ]          ││
│  └────────────────────────────────────────────────────────────────┘│
│                                                                     │
│                            [ Cancel ]   [ Save Transaction ]        │
└─────────────────────────────────────────────────────────────────────┘
```

- Modal max-width: 560px, centered overlay
- Overlay: rgba(0,0,0,0.4)
- Routing notices: --accent-bg (10% tint), --accent left-border 3px

---

## 6. Data Display Rules

### 6.1 Currency

| Rule | Specification |
|------|---------------|
| Symbol | ৳ prefix, no space: `৳1,32,488.00` |
| Decimal places | Always 2: `৳500.00`, not `৳500` |
| Thousands separator | Comma: `৳10,000.00` |
| Negative amounts | Prefix `−` (minus sign U+2212), red: `−৳3,145.42` |
| Positive deltas | Prefix `+`, green: `+৳2,000.00` |
| Tabular alignment | `font-variant-numeric: tabular-nums`, right-aligned in tables |
| In-band zero | `৳0.00` in --fg-muted, never displayed as blank |

### 6.2 Dates

| Context | Format |
|---------|--------|
| Transaction row | `11 Nov` (day + 3-letter month) |
| Month headings | `November 2026` |
| Fiscal year | `FY2025-26` (always hyphenated two-digit suffix) |
| Due dates | `Due 14 Nov` with day remaining: `(2 days)` |
| Timestamps | `11 Nov 2026, 09:34` |

### 6.3 Percentages

| Rule | Specification |
|------|---------------|
| Savings rate | One decimal: `18.4%` |
| Tax slab rates | Whole numbers: `15%` |
| Budget utilization | No decimal: `67%` |
| Positive direction | Green / ok color |
| Negative direction | Danger color |

### 6.4 Chart Colors

| Series | Token |
|--------|-------|
| Income bars | `--income` |
| Spending bars | `--spending` |
| Savings line | `--savings` |
| Tax bars | `--tax` |
| DPS contribution | `--accent` |

Chart text (labels, ticks, legends) always uses `--fg-secondary`. Grid lines use `--border` at 50% opacity. No chart has a legend inside the plot area if it can go outside.

---

## 7. Page Layouts

### 7.1 Dashboard

**Purpose:** At-a-glance financial health for the selected period.

#### Desktop layout (≥ 900px)

```
┌── Sticky top nav ─────────────────────────────────────────────────┐
│  FinTrack BD       [🔔 2]       [Abu Asif ▾]                       │
└───────────────────────────────────────────────────────────────────┘

[Alert banners — danger/warn, full width, stacked if multiple]

┌── Period Selector ────────────────────────────────────────────────┐
│  [ This Month ]  [ Last Month ]  [ This Tax Year ]  [ Custom ▾ ]  │
└───────────────────────────────────────────────────────────────────┘

┌── Summary Tiles (4-column) ───────────────────────────────────────┐
│  IN-HAND INCOME       TOTAL SPENDING      NET SAVINGS   SAVINGS %  │
│  ৳68,000.00           ৳41,230.00          ৳26,770.00    39.4%      │
│  —                    ↑ ৳3,120 vs last    —             ↑ 2.1pp    │
└───────────────────────────────────────────────────────────────────┘

┌── Cash Flow Chart (8 col) ──────┐  ┌── Tax Snapshot (4 col) ──────┐
│  Income vs Spending, 6 months   │  │  TAX THIS YEAR               │
│  Grouped bar chart (Recharts)   │  │  Paid so far  ৳1,32,488      │
│  Income = --income              │  │  Est. remaining  ৳2,881.20   │
│  Spending = --spending          │  │  Suggested TDS  ৳411.60/mo  │
│  X-axis: Jun Jul Aug Sep Oct Nov│  │                               │
│  Y-axis: ৳0 to ৳80k, 20k steps │  │  [Go to Tax Dashboard →]      │
└─────────────────────────────────┘  └───────────────────────────────┘

┌── Fixed Expenses (6 col) ───────┐  ┌── Borrow-Loan Summary (6 col)─┐
│  UPCOMING THIS MONTH            │  │  LOANS                        │
│                                 │  │  People owe you               │
│  ✓ YouTube Premium  ৳160  Day 1 │  │  ৳11,039.50                   │
│  ⚠ Upension DPS ৳10k  Day 8    │  │                               │
│  ● City Bank 10k  ৳10k  Day 14  │  │  You owe                      │
│  ● City Bank 30k  ৳30k  Day 14  │  │  ৳3,145.42                    │
│  ● Mess Rent     ৳8,722 Day 15  │  │                               │
│  [View all →]                   │  │  [Go to Loans →]              │
└─────────────────────────────────┘  └───────────────────────────────┘

┌── Spending by Category (5 col) ─┐  ┌── Recent Transactions (7 col)─┐
│  Donut chart                    │  │  Date   Description   Amount   │
│  Centre: ৳41,230 Total          │  │  11 Nov  DPS 10k     −৳10,000 │
│  Legend below, right-aligned ৳  │  │  10 Nov  Groceries    −৳1,240 │
│                                 │  │  08 Nov  Mess Rent     −৳8,722 │
│                                 │  │  06 Nov  Dining         −৳450 │
│                                 │  │  ...                           │
│                                 │  │  [View all →]                  │
└─────────────────────────────────┘  └───────────────────────────────┘

┌── Cash This Month ────────────────────────────────────────────────┐
│  DISCRETIONARY CASH  ৳7,268    ← ৳68,000 in-hand − ৳60,732 fixed   │
│  REMAINING TO SPEND  ৳4,118    ← after ৳3,150 spent so far         │
│  Progress:  [████████████████████████████░░░░░░░░] 89% committed  │
└───────────────────────────────────────────────────────────────────┘

[Quick action bar: + Add Spending  |  + Add Income  |  ✓ Mark Fixed]
```

**Cash This Month panel:** Remaining to Spend is the larger figure (`--t-data`); it turns `--danger` when negative. Both figures carry an `estimated` chip (`--neutral`) until this month's salary is entered. The panel always describes the current calendar month, whatever the period selector shows.

**First run:** with no data, the tiles are replaced by a checklist card: Add this month's income · Add savings accounts · Set up Fixed Expenses · Import history.

#### Mobile stacking order

1. Alert banners
2. Period selector (dropdown)
3. Summary tiles (2×2 grid)
4. Quick actions (3 buttons, full-width stacked)
5. Cash This Month panel
6. Alert + upcoming fixed expenses
7. Cash flow chart (horizontal scroll if needed, min 320px)
8. Recent transactions
9. Tax snapshot card
10. Borrow-loan summary
11. Spending donut

---

### 7.2 Income Management

**Purpose:** Monthly income entry and year-to-date income timeline.

#### Desktop layout

```
┌── Page title ─────────────────────────────────────────────────────┐
│  Income                            [ + Add Income Entry ]          │
└───────────────────────────────────────────────────────────────────┘

┌── YTD Summary (4 tiles) ──────────────────────────────────────────┐
│  GROSS INCOME YTD    TDS YTD       IN-HAND YTD    MONTHS ENTERED  │
│  ৳11,25,000          ৳1,32,488     ৳9,92,512      7 / 12          │
└───────────────────────────────────────────────────────────────────┘

┌── Fiscal Year Selector ──────────────────────────────────────────┐
│  [ FY2025-26 ▾ ]                                                  │
└───────────────────────────────────────────────────────────────────┘

┌── Monthly Income Table ─────────────────────────────────────────────────────────────────────┐
│  Month      Salary       Bonus / PS     Cheer        TDS          In-Hand       Status       │
│  Jul 2025   ৳1,40,000    —              —            ৳16,000      ৳1,24,000     ✓ Entered    │
│  Aug 2025   ৳1,40,000    ৳70,000 (PS)   —            ৳28,500      ৳1,81,500     ✓ Entered    │
│  ...                                                                                          │
│  Nov 2025   ৳1,40,000    —              ৳5,000 Mithun ৳16,000     ৳1,29,000     ✓ Entered    │
│  Dec 2025   —            —              —            —            —             ○ Pending    │
│  ...                                                                                          │
│  Jun 2026   —            —              —            —            —             ○ Pending    │
│  ──────────────────────────────────────────────────────────────────────────────             │
│  TOTAL      ৳9,80,000    ৳1,40,000      ৳5,000       ৳1,32,488    ৳9,92,512                 │
└──────────────────────────────────────────────────────────────────────────────────────────────┘

[Clicking any row → expands inline detail / edit form]
[Clicking a Pending row → opens Add Income modal pre-filled with last month's salary]

┌── Holiday Support Log ─────────────────────────────────────────────┐
│  Date       Days   Rate Type      Amount                             │
│  20 Oct     1      Holiday Rate   ৳3,200                            │
│  [+ Add Holiday Support Entry]                                       │
└────────────────────────────────────────────────────────────────────┘
```

**Add Income modal fields:**
- Month (month picker)
- Income type (dropdown: Salary / Cheer / Profit Share / Eid Festival Bonus / Leave Encashment / Certification Reimbursement / Holiday Support / Other)
- Gross Amount (৳)
- TDS Deducted (৳) — validation: 0 ≤ TDS ≤ Gross
- In-Hand (read-only computed: Gross − TDS)
- Taxable (toggle; on by default, off for Certification Reimbursement)
- Employer (optional)
- Notes
- For Cheer: additional fields → Payer Name, Earned Period

---

### 7.3 Transactions & Spending

**Purpose:** Full ledger of all outgoing/incoming transactions with filter and search.

#### Desktop layout

```
┌── Page title + actions ───────────────────────────────────────────┐
│  Transactions                                   [ + Add Spending ] │
└───────────────────────────────────────────────────────────────────┘

┌── Filter Bar ─────────────────────────────────────────────────────┐
│  [🔍 Search descriptions...]  [Category ▾] [Method ▾] [Date ▾]   │
│  [Nov 1 – Nov 30 ×] [DPS ×]                     [Clear filters]   │
└───────────────────────────────────────────────────────────────────┘

┌── Active Filters Chips ───────────────────────────────────────────┐
│  Showing 23 transactions  · ৳41,230.00 total outgoing              │
└───────────────────────────────────────────────────────────────────┘

┌── Transaction Table ────────────────────────────────────────────────────────────────────────┐
│  ☐    Date      Description              Category        Method        Amount                │
│  ───────────────────────────────────────────────────────────────────────────────────────── │
│  ☐    11 Nov    Upension DPS             💰 DPS/Savings  Bank          −৳10,000.00           │
│       [routing] → City Bank Upension account                                                 │
│  ☐    10 Nov    Shajahan Rice & Veg      🛒 Groceries    bKash         −৳1,240.00            │
│  ☐    08 Nov    Mess Rent — November     🏠 Rent         Bank           −৳8,722.00          │
│  ☐    06 Nov    Dhanmondi Chinese        🍽 Dining       Cash           −৳450.00             │
│  ☐    04 Nov    Mithun — loan            🤝 Loan Given   bKash         −৳500.00              │
│       [routing] → Mithun ledger +৳500 (they owe me)                                         │
│  ───────────────────────────────────────────────────────────────────────────────────────── │
│  [Select all] [Delete selected]                     Showing 1–20 of 48  [ < 1 2 3 > ]       │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

**Routing indicator row:** Shown below any Transaction that is not plain Spending (savings, loan or tax). Indented 32px, --fg-muted, 12px. Money coming in (Loan Received, Savings Withdrawal) shows `+` in --ok.

**Scope:** this list shows Transactions only. Income is entered and listed on the Income page.

**Budget sidebar** (desktop right panel, 320px):

```
┌── Budget This Month ───────────────────────────────────────────┐
│  Groceries     ৳2,340 / ৳3,500  [████████████████░░░] 67%     │
│  Dining        ৳1,200 / ৳1,500  [████████████████████░] 80% ⚠ │
│  Transport     ৳800  / ৳1,000   [████████████████████░] 80% ⚠ │
│  Entertainment ৳2,100 / ৳2,000  [████████████████████!] 105% ✕│
│  [Manage budgets →]                                             │
└────────────────────────────────────────────────────────────────┘
```

---

### 7.4 Fixed Recurring Expenses

**Purpose:** Manage monthly commitments and mark them as paid.

#### Desktop layout

```
┌── Page title + actions ───────────────────────────────────────────┐
│  Fixed Expenses                        [ + Add Fixed Expense ]     │
└───────────────────────────────────────────────────────────────────┘

[Alert banners for overdue/due-soon items]

┌── Monthly Grid View ────────────────────────────────────────────────────────────────────────────┐
│  Expense              Std Amount  Due   │ Jul  │ Aug  │ Sep  │ Oct  │ Nov  │ Dec  │ ... │ TOTAL │
│  ────────────────────────────────────────────────────────────────────────────────────────────── │
│  YouTube Premium      ৳160        Day 1 │  ✓   │  ✓   │  ✓   │  ✓   │  ●   │  ○   │     │  ৳800 │
│  Upension DPS         ৳10,000     Day 8 │  ✓   │  ✓   │  ✓   │  ✓   │  ⚠   │  ○   │     │৳40k  │
│  City Bank DPS (10k)  ৳10,000     Day 14│  ✓   │  ✓   │  ✓   │  ✓   │  ●   │  ○   │     │৳40k  │
│  City Bank DPS (30k)  ৳30,000     Day 14│  ✓   │  ✓   │  ✓   │  ✓   │  ●   │  ○   │     │৳120k │
│  Mess Rent            ৳8,722      Day 15│  ✓   │  ✓   │  ✓   │  ✕   │  ●   │  ○   │     │৳34k  │
│  Home Internet        ৳500        Day 16│  ✓   │  ✓   │  ✓   │  ✓   │  ●   │  ○   │     │  ৳2k │
│  Home Electricity     ৳1,350      Day 27│  ✓   │  ✓   │  ✓   │  ✓   │  ○   │  ○   │     │  ৳5k │
│  ────────────────────────────────────────────────────────────────────────────────────────────── │
│  TOTAL COMMITMENTS    ৳60,732           │      │      │      │      │      │      │     │       │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘

Legend: ✓ = Paid  ⚠ = Due soon  ✕ = Overdue / Missed  ● = Pending  ○ = Future  – = Skipped

[Clicking a ● or ⚠ cell → Mark as Paid drawer]
```

**Mark as Paid drawer** (slides in from right on desktop, bottom sheet on mobile):

```
  Mark Upension DPS as Paid — November 2026
  Standard amount: ৳10,000
  Actual amount paid: [ ৳10,000 ] (editable)
  Date paid: [ 2026-11-08 ]
  [ Cancel ]   [ Confirm & Create Transaction ]
```

The drawer also offers **Skip this month** with an optional note. A Skipped cell can be reopened from the same drawer; a Paid cell links to its Transaction, and deleting that Transaction returns the cell to Pending.

---

### 7.5 Savings & DPS

**Purpose:** Balance overview of all savings accounts and DPS maturity tracking.

#### Desktop layout

```
┌── Page title + actions ───────────────────────────────────────────┐
│  Savings & DPS                              [ + Add Account ]      │
└───────────────────────────────────────────────────────────────────┘

┌── Summary Tiles (3-column) ───────────────────────────────────────┐
│  TOTAL SAVED ACROSS ACCOUNTS      YTD CONTRIBUTION    DPS ACCOUNTS │
│  ৳4,32,000.00                     ৳2,00,000           3 active     │
└───────────────────────────────────────────────────────────────────┘

┌── Account Cards (2-column grid) ──────────────────────────────────┐

│  ┌── City Bank DPS (10k) ─────────────────────────────────────┐  │
│  │  TYPE: DPS · City Bank · **** 4521                         │  │
│  │                                                             │  │
│  │  Balance  ৳80,000.00         Installment  ৳10,000/mo       │  │
│  │  Opened   Jul 2025           Matures      Jul 2033          │  │
│  │  Interest  —                 Projected    ৳9,60,000+int    │  │
│  │                                                             │  │
│  │  Deposited this FY:                                         │  │
│  │  [████████████████████████████████████████████] ৳80,000    │  │
│  │  Rebate cap is shared across all DPS accounts.            │  │
│  │  [View transactions]                                        │  │
│  └─────────────────────────────────────────────────────────────┘  │

│  ┌── City Bank DPS (30k) ─────────────────────────────────────┐  │
│  │  ... (same pattern) ...                                     │  │
│  └─────────────────────────────────────────────────────────────┘  │

└───────────────────────────────────────────────────────────────────┘
```

---

**DPS rebate progress:** one bar under the summary tiles for all DPS accounts combined, e.g. `DPS deposits this FY  ৳2,00,000 / ৳1,20,000 cap · cap reached`.

**Card actions:** View transactions · Withdraw · Add interest · Close account (only when the balance is ৳0.00). Withdraw and Add interest open the Add Transaction form with the matching category and this account pre-selected.

---

### 7.6 Borrow-Loan Ledger

**Purpose:** Per-person running balance; informal loan tracking.

#### Desktop layout

```
┌── Page title + actions ───────────────────────────────────────────┐
│  Borrow & Loans                              [ + Add Loan Entry ]  │
└───────────────────────────────────────────────────────────────────┘

┌── Summary Tiles (3-column) ───────────────────────────────────────┐
│  THEY OWE ME                 I OWE THEM              NET POSITION  │
│  ৳11,039.50 (2 people)       ৳3,145.42 (1 person)   +৳7,894.08   │
│  --ok text                   --danger text           --ok text     │
└───────────────────────────────────────────────────────────────────┘

┌── Person List (left panel 320px) ┐  ┌── Detail Panel (flex fill) ───┐
│  🟢 Mithun          +৳9,841.00  │  │  Mithun                       │
│  🟢 Amait           +৳1,198.50  │  │  BALANCE: +৳9,841.00 (they owe me) │
│  🔴 Sohel           −৳3,145.42  │  │                               │
│  ⚪ Anapo             ৳0.00     │  │  Date     Direction  Amount  Reason │
│  ⚪ Babu bhai         ৳0.00     │  │  10 Nov   Given      ৳500   Rickshaw │
│                                  │  │  05 Nov   Received  −৳200   Paid back │
│  [ + Add person ]               │  │  ...                          │
│                                  │  │  [Settle Up]  [Export CSV]   │
└──────────────────────────────────┘  └───────────────────────────────┘
```

**Balance color rules:**

| Running Balance | Pill color | Label |
|-----------------|------------|-------|
| Positive (> 0)  | --ok       | `Mithun owes you ৳9,841.00` |
| Negative (< 0)  | --danger   | `You owe Sohel ৳3,145.42` |
| Zero (= 0)      | --neutral  | `Settled` |

---

### 7.7 Tax Dashboard

**Purpose:** Annual tax calculation, TDS reconciliation, investment tracking.

**Notices on the Overview tab**

| Notice | When | Style |
|---|---|---|
| `Tax settings for FY2026-27 are provisional. [Review settings →]` | The year's settings are not confirmed | `--warn-bg`, links to Tax Year Settings (§7.9) |
| `File by 30 Sep to save ৳6,768.46` | From 1 July to the deadline, while the return is not marked filed | `--accent` tint |
| `Overpaid ৳X` in place of Remaining Tax | Tax Paid exceeds Net Tax Payable | `--ok` |
| `Filed on 15 Sep 2026 · figures locked` | The year is filed | `--neutral-bg` |

**Other tabs.** Forecast shows the same tiles and reconciliation for the projected full year, each labelled `Projected`. Compare Years shows three columns: this year under its own settings, this year's income under last year's settings, and last year's actual result. The Investments table's rebate column header shows the year's investment rate from its settings.

#### Desktop layout

```
┌── Page title + selector ──────────────────────────────────────────┐
│  Tax Dashboard             [ FY2025-26 ▾ ]    Data: 7/12 months   │
│                            [░░░░░░░░░░░░░░░░░░░░░░░░░░] 58%       │
└───────────────────────────────────────────────────────────────────┘

[   Tabs: Overview  |  Investments  |  Forecast  |  Compare Years   ]

── Overview Tab ────────────────────────────────────────────────────

┌── Three Tax Tiles (3-column) ─────────────────────────────────────┐
│  GROSS TAX                TOTAL REBATE              NET TAX PAYABLE│
│  ৳1,76,369.20             ৳41,000.00                ৳1,35,369.20   │
└───────────────────────────────────────────────────────────────────┘

┌── Taxable Income Breakdown (6 col) ──────┐  ┌── Slab Breakdown (6 col) ──────────────┐
│  Gross Annual Income    ৳20,06,846        │  │  TAXABLE INCOME: ৳15,06,846           │
│  − Exemption (1/3)      ৳5,00,000        │  │                                        │
│  = Taxable Income       ৳15,06,846       │  │  0%  First ৳3,75,000       ৳0          │
│                                          │  │  10% Next  ৳3,00,000      ৳30,000      │
│  Source breakdown:                       │  │  15% Next  ৳4,00,000      ৳60,000      │
│  Salary     ৳15,64,449                   │  │  20% Next  ৳4,31,846      ৳86,369.20   │
│  Profit Share ৳4,25,551                  │  │  25% —                    —            │
│  Cheer        ৳16,846                    │  │  Gross Tax               ৳1,76,369.20  │
└──────────────────────────────────────────┘  └────────────────────────────────────────┘

┌── TDS Reconciliation ─────────────────────────────────────────────┐
│  TAX SITUATION                                                      │
│                                                                     │
│  Net Tax Payable     ৳1,35,369.20                                   │
│  TDS Paid to Date    ৳1,32,488  [████████████████████████████░] 98% │
│  Remaining Tax        ৳2,881.20  ← --warn color (small but owed)    │
│                                                                      │
│  Salary months remaining: 7                                         │
│  Suggested monthly TDS: ৳411.60/mo                                   │
│                                                                      │
│  [+ Record Tax Payment]                                             │
└───────────────────────────────────────────────────────────────────┘

── Investments Tab ─────────────────────────────────────────────────

┌── Investment vs Rebate ───────────────────────────────────────────┐
│  Investment         Invested      Cap       Eligible   Rebate (10%)│
│  DPS                ৳8,00,000    ৳1,20,000  ৳1,20,000  ৳12,000    │
│  Sanchaypatra       ৳1,00,000    ৳5,00,000  ৳1,00,000  ৳10,000    │
│  Other              ৳1,90,000    no cap     ৳1,90,000  ৳19,000    │
│  ──────────────────────────────────────────────────────────────── │
│  Total Eligible     ৳4,10,000               ৳4,10,000  ৳41,000    │
│  Rebate applied: MIN(৳45,205 · 3%, ৳41,000 · 10%, ৳10L) = ৳41,000│
│                                                                     │
│  REQUIRED FOR MAX REBATE: Need ৳42,053.80 more investment         │
└───────────────────────────────────────────────────────────────────┘
```

---

### 7.8 History & Analytics

**Purpose:** Trend charts and downloadable summaries across months and fiscal years.

#### Desktop layout

```
┌── Page title + period selector ───────────────────────────────────┐
│  History & Analytics        [ This Tax Year ▾ ]  [Export CSV]     │
└───────────────────────────────────────────────────────────────────┘

[   Tabs: Monthly Summary  |  Income Trends  |  Spending Trends  |  Savings Rate  ]

── Monthly Summary Tab ─────────────────────────────────────────────

┌── Monthly Summary Table ──────────────────────────────────────────────────────────────────────┐
│  Month     In-Hand      Spending     Savings     TDS       Savings Rate   Fixed Compliance     │
│  Jul 2025  ৳1,24,000    ৳85,000      ৳39,000     ৳16,000   31.5%          6/7 ✓               │
│  Aug 2025  ৳1,81,500    ৳92,000      ৳89,500     ৳28,500   49.3%          7/7 ✓               │
│  ...                                                                                           │
│  TOTAL     ৳12,46,000   ৳6,02,000    ৳6,44,000   ৳1,32,488  —             —                   │
└───────────────────────────────────────────────────────────────────────────────────────────────┘

── Spending Trends Tab ─────────────────────────────────────────────

  ┌── Category Trends (last 12 months) ────────────────────────────────────────────────────────┐
  │  Grouped bar chart: each month shows bars for top 5 categories                              │
  │  X-axis: months   Y-axis: ৳0 – ৳50,000                                                    │
  │  Hover tooltip: exact amount per category per month                                         │
  └────────────────────────────────────────────────────────────────────────────────────────────┘

── Savings Rate Tab ────────────────────────────────────────────────

  ┌── Savings Rate Trend ───────────────────────────────────────────────────────────────────────┐
  │  Line chart, 12 months  X: months  Y: 0% – 60%                                             │
  │  Reference line: 20% target (--accent dashed)                                               │
  │  Area fill below line: --savings at 20% opacity                                             │
  │  Endpoint label: current month's %                                                          │
  └────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

### 7.9 Settings and Data

**Purpose:** Profile, appearance, categories, tax year settings, import and export.

Settings is one page of sections; Tax Year Settings, Import and Export each open their own page.

| Section | Contents |
|---|---|
| Profile | Name, email (read-only), Change password, Sign out |
| Appearance | Theme: Light / Dark / System |
| Categories | List with colour swatch and kind chip (Spending, Savings, Loan, Tax); add, rename, recolour, archive |
| Tax Year Settings | Fiscal Year dropdown and a status chip: `Provisional` (--warn) or `Confirmed` (--ok). Editable fields: slab table (width, rate), exemption fraction and cap, rebate rates and maximum, investment caps, Minimum Tax, Early Filing Rebate. Actions: Save · Confirm settings · Mark return filed / Reopen. A filed year is read-only. |
| Import | Three cards (Income, Transactions, Loan history), each with Download template and Upload CSV; below them, past imports with date, file name, row count and Undo |
| Export | Download all data (JSON); CSV exports, each with its period picker |

**Import preview** (shown after upload, before anything is saved):

```
┌── Import Transactions — expenses-2025.csv ────────────────────────┐
│  412 rows · 409 valid · 3 with errors · total ৳6,02,340.00         │
│                                                                    │
│  Row   Date        Description        Amount       Problem         │
│  17    2025-13-02  Groceries          ৳1,240.00    Invalid date    │
│  88    2025-09-14  DPS installment    ৳10,000.00   Unknown account │
│  ...                                                               │
│                                                                    │
│                          [ Cancel ]   [ Import 412 rows ]          │
└────────────────────────────────────────────────────────────────────┘
```

- Rows with errors are listed first on `--danger-bg`, each with its reason.
- The Import button is disabled while any row has an error.
- Rows already imported from an earlier upload are counted separately as `already imported`.

---

### 7.10 Account Pages

**Purpose:** Registration, email verification, sign-in and password recovery. These are the only pages shown without a session.

All five use one layout: a centred card (max-width 420px) on `--bg-base`, the FinTrack BD wordmark above it, no navigation shell.

| Page | Contents |
|---|---|
| Sign in (`/login`) | Email, password, Sign in button; links: Forgot password? · Create an account |
| Create account (`/register`) | Name, email, password (at least 10 characters, with a show/hide control), Create account button; link: Already have an account? |
| Check your email (after registering) | "We sent a link to *email*. Open it to verify your account." Resend link button, disabled for 60 seconds after each send |
| Verify email (`/verify-email`) | Success: "Email verified" with a Sign in button. Expired or used link: explanation with a Resend link button |
| Forgot password (`/forgot-password`) | Email, Send reset link; afterwards always the same message: "If that email has an account, a reset link is on its way." |
| Reset password (`/reset-password`) | New password, confirm, Save; expired link: explanation with a link back to Forgot password |

- Field errors appear under the field in `--danger`; a failed sign-in shows one message that does not say whether the email or the password was wrong.
- Signing in with an unverified email shows "Verify your email first" with a Resend link button.
- When sign-up is closed, Create account shows "Registration is currently closed" and no form.
- After the first sign-in the user lands on the dashboard's first-run checklist (§7.1).
- Signing in to a deactivated account shows "This account is deactivated until 30 Nov 2026" or "This account is deactivated. Contact the site admin."

---

### 7.11 Admin: Users

**Purpose:** User account management for admins. No financial data appears anywhere in this area.

Shown as "Users" under an ADMIN heading in the sidebar, and in the mobile More drawer, only when the signed-in user is an admin.

#### User list (`/admin/users`)

```
┌── Page title + actions ───────────────────────────────────────────┐
│  Users                                          [ + Create user ]  │
└───────────────────────────────────────────────────────────────────┘

┌── Filter Bar ─────────────────────────────────────────────────────┐
│  [🔍 Search name or email...]  [Status ▾]  [Role ▾]               │
└───────────────────────────────────────────────────────────────────┘

┌── Users Table ──────────────────────────────────────────────────────────────────────────────┐
│  Name / Email            Role    Status                  Registered   Last sign-in  Paid until │
│  Abu Asif                Admin   ● Active                11 Nov 2026  12 Nov 2026   —          │
│  asif@example.com                                                                              │
│  Mithun Roy              User    ● Active                14 Nov 2026  20 Nov 2026   31 Dec 2026│
│  Sohel Ahmed             User    ⚠ Deactivated until     15 Nov 2026  18 Nov 2026   30 Nov 2026│
│                                    30 Nov 2026                                      (lapsed)   │
│  New Person              User    ○ Unverified            21 Nov 2026  —             —          │
│                                                               Showing 1–20 of 34  [ < 1 2 > ] │
└───────────────────────────────────────────────────────────────────────────────────────────────┘
```

| Status | Badge |
|---|---|
| Active | `--ok` |
| Unverified | `--neutral` |
| Deactivated until a date | `--warn` |
| Deactivated until reactivated | `--danger` |

A "Paid until" date that has passed is shown in `--danger` with `(lapsed)`. On mobile each user is a stacked card: name, email, status badge, paid-until.

#### User detail (`/admin/users/[id]`)

| Section | Contents |
|---|---|
| Account | Name, email, Save; Make admin (with confirmation). Read-only: role, registered date, last sign-in, email verified date |
| Access | Status badge. Actions: Deactivate, Reactivate, Resend verification email, Send password-reset email |
| Payments | Table: date paid, amount, covers until, note; Add payment; edit and delete per row |
| History | Admin actions on this user: date, admin, action, detail |
| Danger zone | Delete user |

**Create user modal:** name, email, role. Helper text: "The user will get an email link to set their password."

**Deactivate modal:** choice of "Until a date" (date picker) or "Until I reactivate"; optional reason; Confirm.

**Delete confirmation:** explains that the account and all of its data are removed permanently; the admin types the user's email; the Delete button stays disabled until it matches.

- An admin account, your own included, opens read-only: every field and action is disabled, with the note "Admin accounts cannot be changed here." There is no Danger zone on an admin account.
- The Make admin confirmation says that an admin cannot be demoted or removed from inside the app.

---

## 8. Navigation Shell

### Desktop — Left sidebar (240px fixed)

```
┌── Sidebar ──────────────────────────────────────────────────────┐
│                                                                   │
│  FinTrack BD                                                      │
│  ─────────────────────────────────────────────────────────       │
│  🏠  Dashboard                           ← active: --accent bg   │
│  💵  Income                                                       │
│  💸  Transactions                                                 │
│  📋  Fixed Expenses          ⚠ 1         ← amber badge: due-soon │
│  🏦  Savings & DPS                                                │
│  🤝  Loans                                                        │
│  📊  Tax Dashboard                                                │
│  📈  History                                                      │
│  ─────────────────────────────────────────────────────────       │
│  ⚙   Settings                                                     │
│                                                                   │
│  [Abu Asif]                              FY2025-26               │
└───────────────────────────────────────────────────────────────── ┘
```

- Active item: `--accent` text, `--bg-raised` background, left border 3px `--accent`
- Badge on Fixed Expenses shows count of overdue or due-soon items
- FY indicator bottom-left in --fg-muted caption style

### Mobile — Bottom navigation (tab bar)

```
┌───────────────────────────────────────────────────────────────────┐
│  🏠        💸          ➕          📋          📊                  │
│  Home   Transactions  Add       Fixed       More                  │
│  (active)             (FAB)                 (drawer)              │
└───────────────────────────────────────────────────────────────────┘
```

- 5 tabs; "Add" is a 48px FAB button at center, elevated, `--accent` bg
- "More" opens a bottom drawer with the remaining navigation items: Income, Savings & DPS, Loans, Tax Dashboard, History, Budgets, Settings
- Badge: red dot on Fixed tab when any item is overdue

### Top bar (mobile only)

```
┌── Top bar ────────────────────────────────────────────────────────┐
│  ← [back]        Page Title                 🔔[2]                 │
└───────────────────────────────────────────────────────────────────┘
  height: 56px, sticky, background: --bg-surface, shadow on scroll
```

---

## 9. Responsive Behavior

| Breakpoint | Nav pattern | Card grid | Table behavior |
|------------|-------------|-----------|----------------|
| ≥ 900px (desktop) | Left sidebar 240px | Multi-column | Full table |
| 600–899px (tablet) | Collapsible sidebar (hamburger) | 2-column cards | Horizontal scroll |
| < 600px (mobile) | Bottom tab bar | Single column | Priority columns only* |

*Priority columns on mobile transactions table: Date, Description, Amount. Category and Method hidden by default; tap row to expand.

### Touch targets

- Minimum tap target: 44×44px
- Row tap area extends full width (not just the text)
- Form inputs: minimum height 44px
- Bottom nav icons: 48×48px hitbox

### No horizontal scroll

The page body never scrolls horizontally. Elements that may overflow:
- Data tables: wrapped in `overflow-x: auto` container
- Monthly grid (Fixed Expenses): same container treatment
- Charts: `max-width: 100%` with `overflow: hidden`

---

## 10. Motion & Interaction

### Principles

- Motion is functional: confirms an action, communicates state change, orients the user
- Duration: 150ms for microinteractions, 250ms for panel transitions
- Easing: `cubic-bezier(0.4, 0, 0.2, 1)` (material standard ease)
- Respect `prefers-reduced-motion: reduce` — all animations conditional

### Defined motions

| Interaction | Animation |
|-------------|-----------|
| Modal open | Fade in + translate Y: 12px → 0, 200ms ease-out |
| Modal close | Fade out + translate Y: 0 → 12px, 150ms ease-in |
| Alert banner appear | Max-height 0 → auto, 200ms |
| Row hover | Background color transition 100ms |
| Budget bar fill on load | Width 0% → actual%, 400ms, staggered |
| Tab switch | Underline slide left/right, 150ms |
| Number tile load | Count up from 0 to actual value, 600ms |
| Toast notification | Slide in from bottom-right, 200ms; auto-dismiss at 3s |
| Routing notice expand | Accordion open, 150ms |

---

## 11. Accessibility Rules

| Rule | Specification |
|------|---------------|
| Colour contrast | WCAG AA minimum: text on surface ≥ 4.5:1, large text ≥ 3:1 |
| Focus ring | 2px solid `--border-focus`, offset 2px — always visible |
| Form labels | Every input has an associated `<label>` or `aria-label` |
| Table headers | `<th scope="col">` / `<th scope="row">` on all data tables |
| Status badges | Never color-only; always include text (Paid / Due / Overdue) |
| Chart data | Tables or `<figcaption>` with the underlying data as text fallback |
| Semantic HTML | `<nav>`, `<main>`, `<aside>`, `<section>` with `aria-label` |
| Icon buttons | `aria-label` on every icon-only button |
| Currency | Screen readers read `৳1,32,488.00` as "1 lakh 32 thousand…" — acceptable; alt text not required |
| Keyboard nav | Tab order follows visual order; no keyboard trap in modals (Esc closes) |

---

## 12. Bangladesh-Specific Display Rules

### Currency display

```
Display format:   ৳1,32,488.00
Large amounts:    ৳20,06,846  (comma after every 2 digits beyond first 3: South Asian numbering)
                  NOT ৳2,006,846 (Western grouping)
Paisa suffix:     .00 always present; two decimal places
```

**South Asian number grouping** — the app uses the standard Bangladeshi convention:

```
1,000           = ৳1,000
10,000          = ৳10,000
1,00,000        = ৳1,00,000  (one lakh)
10,00,000       = ৳10,00,000 (ten lakh)
1,00,00,000     = ৳1,00,00,000 (one crore)
```

### Fiscal year references

- Always show as `FY2025-26`, never `2025/26` or `2025–26`
- Month labels in tax views: `Jul 2025` through `Jun 2026`
- Current fiscal year indicator visible in nav footer

### Payment method labels and icons

| Method | Icon | Display |
|--------|------|---------|
| Cash | 💵 | Cash |
| bKash | 🟣 | bKash |
| Bank Transfer | 🏦 | Bank |
| Card | 💳 | Card |

bKash uses its signature magenta (#E2136E) as an icon color accent. No external bKash logo assets needed; color dot + label is sufficient.

### Income type labels

| Internal key | Display label |
|---|---|
| `SALARY` | Salary |
| `CHEER` | Cheer / Incentive |
| `PROFIT_SHARE` | Profit Share (PS) |
| `EID_BONUS` | Eid Festival Bonus |
| `LEAVE_ENCASHMENT` | Leave Encashment |
| `CERTIFICATION` | Certification Reimbursement |
| `HOLIDAY_SUPPORT` | Holiday Support |
| `OTHER` | Other |

### NBR Tax vocabulary

Always use the exact terms from the BRD:

| Always use | Never substitute |
|---|---|
| TDS (Tax Deducted at Source) | Withholding tax |
| Taxable Income | Adjusted income |
| Rebate | Credit / deduction |
| Fiscal Year (FY2025-26) | Financial year / Tax year |
| DPS | Recurring deposit |
| Sanchaypatra | National savings certificate |

---

*End of design specification. See `.scratch/docs/brd.md` for feature requirements, `GLOSSARY.md` for domain terms, and `.scratch/docs/adr/` for decisions.*
