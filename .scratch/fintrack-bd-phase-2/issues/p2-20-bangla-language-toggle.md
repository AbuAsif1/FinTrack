# p2-20: Bangla Language Toggle

**Status:** needs-triage
**Phase:** 2
**Spec ref:** Phase 2 §20

---

## What to build

A UI language toggle between English and Bangla. All user-facing text in the app — labels, button text, error messages, tooltips, page titles, notifications — must be externalised into a string catalogue so they can be swapped at runtime. Bangla numerals (০১২৩৪৫৬৭৮৯) are an optional second toggle, since some users prefer English digits even in a Bangla UI.

---

## Why

The target user is Bangladeshi. Bangla is their primary language. While the owner is comfortable with English, many potential users are more comfortable in Bangla. A Bangla UI significantly broadens the accessible audience. The app's domain — salaries, taxes, DPS, Sanchaypatra, bKash — is entirely Bangladeshi; Bangla names for these concepts are more natural and familiar.

**Why deferred from MVP:** Every string in the codebase must be externalised before translation can work. This is a cross-cutting change that touches every component and every error message. It was deferred from the MVP to avoid slowing down feature development; the right time is after the feature set stabilises.

---

## User flows

### Switching to Bangla
1. User opens **Settings → Language**.
2. Options: English / বাংলা (Bangla).
3. User selects বাংলা.
4. The page reloads (or updates in place) with all UI text in Bangla.
5. The selection is saved to the user's profile and persists across devices.

### Enabling Bangla numerals
1. After switching to Bangla, an additional option appears: "Numerals: English (1234) / Bangla (১২৩৪)."
2. User selects Bangla numerals. All amounts, counts, dates and page numbers switch to Bangla digits.
3. This setting is independent — a user can have Bangla UI text with English numerals (common preference among educated users) or both Bangla.

### Returning to English
1. User opens Settings → Language and selects English.
2. All text reverts to English. Numeral setting reverts to English digits.

### Language persistence across devices
1. The language preference is stored server-side in the user's profile.
2. Signing in on a new device immediately shows the preferred language.

---

## Scenarios

**Scenario A — Bangla-primary user:** A family member of the owner who speaks Bangla fluently but reads English less confidently sets the app to Bangla. All navigation labels, form placeholders, button text and error messages appear in Bangla. The app feels native.

**Scenario B — Bangla text, English numbers:** A user switches to Bangla UI but keeps English numerals because they are accustomed to English digits for financial amounts. They see "মোট ব্যয়: 15,230 টাকা" instead of "মোট ব্যয়: ১৫,২৩০ টাকা."

**Scenario C — missing translation:** A new feature is added after the initial Bangla translation is complete, and its strings are not yet translated. The app falls back to the English string for those items and logs a missing-translation warning in development. The UI does not break.

**Scenario D — shared device:** Two users share a device. Each has their own account and language preference. Each sees their own language when signed in (preference is per-account, not per-device).

---

## Impact areas

- **Full string externalisation required before this ticket** — every hardcoded English string in every component, API error message, email template, and notification must be moved to a locale file (e.g. `locales/en.json`, `locales/bn.json`). This is the dominant effort in this ticket; it touches every file.
- Internationalisation (i18n) library: Next.js has built-in i18n routing, or use a library like `next-intl` or `react-i18next`. Choose one approach and standardise it across the app.
- Bangla numeral formatting: a utility function `formatBanglaDigits(n)` that maps each ASCII digit to its Bangla Unicode equivalent; apply wherever numbers are displayed in Bangla numeral mode.
- Currency formatting: ৳ symbol position and comma placement for lakh/crore notation (e.g. ৳1,00,000 not ৳100,000) is already in the app for English; confirm it is preserved correctly for Bangla.
- Font: the current font may not support Bangla characters well. A Bangla-compatible web font (e.g. Noto Sans Bengali, Hind Siliguri) must be added.
- Date formatting: Bangla uses the same Gregorian calendar but month names in Bangla differ (জানুয়ারি, ফেব্রুয়ারি, etc.); update date formatters.
- RTL is not needed — Bangla is LTR, same direction as English.
- Language preference field: new column on `users` (`preferred_language`: `en` | `bn`, `preferred_numerals`: `en` | `bn`).
- API error messages must also be internationalised (returned in the user's preferred language) or handled client-side (translate error codes, not messages).

---

## Decisions needed before build

- i18n library: choose one framework-level approach before starting. Recommend `next-intl` for a Next.js App Router project. Confirm and write an ADR.
- Who will produce the Bangla translations? This requires a fluent Bangla writer who understands financial terminology. The developer cannot self-translate. Confirm resourcing before starting.
- Should API error messages be translated server-side or client-side? (Recommend client-side — translate the error `code` using the locale file, not the error `message`. This keeps translations out of the API and centralises them in the front end.)
- Bangla numeral default: on or off when the user switches to Bangla? (Recommend: off by default — many users prefer English digits — but offer the toggle prominently.)
- Scope of this ticket: only the core app UI, or also emails, PDFs (export, loan statements), and push notification text? (Recommend: start with the app UI only. Emails and push notifications in a follow-up.)

---

## Blocked by

- No hard technical blockers, but this ticket should not start until the feature set is stable (all Phase 2 features built or at least specified), because string externalisation is a whole-codebase change and re-touching every component again after adding more features is wasteful.

## Comments

<!-- Append discussion below this line -->
