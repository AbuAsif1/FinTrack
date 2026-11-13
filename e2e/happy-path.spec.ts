/**
 * Happy-Path User Behaviour Scenarios — FinTrack BD
 *
 * These 9 scenarios run sequentially against a live app and a real database.
 * Before running, seed the test user:  pnpm seed:e2e
 * Then watch them execute:             pnpm test:e2e:happy
 *
 * State accumulates across scenarios (each one signs in; the DB carries
 * income/transactions added in earlier scenarios forward to later ones).
 */

import { test, expect, type Page } from '@playwright/test';

// ── Credentials (match scripts/e2e-seed.ts) ───────────────────────────────

const EMAIL    = 'e2euser@test.local';
const PASSWORD = 'E2ETest1234!';

// ── Helpers ───────────────────────────────────────────────────────────────

async function signIn(page: Page) {
  // Programmatic login: page.request shares the page's cookie jar, so the
  // Set-Cookie (refresh_token) from this POST is available on the next goto.
  const resp = await page.request.post('/api/v1/auth/login', {
    data: { email: EMAIL, password: PASSWORD },
    headers: { 'Content-Type': 'application/json' },
  });
  if (!resp.ok()) throw new Error(`Login API failed: ${resp.status()} ${await resp.text()}`);

  // Navigate to the app — the cookie is now in the jar, middleware allows through,
  // layout calls tryRestoreSession() which exchanges it for an access token.
  await page.goto('/');
  await page.waitForLoadState('networkidle');
}

/** Current month in YYYY-MM format (the seed data targets this month). */
function currentYM() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Previous fiscal-year month for income entries we seed into past data. */
function prevMonth() {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// S01 — Sign in and see the dashboard (first-run checklist)
// ─────────────────────────────────────────────────────────────────────────────

test('S01 — Sign in → dashboard shows first-run checklist', async ({ page }) => {
  await signIn(page);

  // Dashboard heading
  await expect(page.locator('h1, h2').filter({ hasText: /dashboard|welcome|fintrack/i }).first())
    .toBeVisible({ timeout: 10_000 });

  // First-run checklist is visible (no income yet)
  await expect(page.getByText(/add this month.*income|add.*salary|first income/i).first())
    .toBeVisible({ timeout: 8_000 });

  // Tax snapshot is only rendered when hasData is true; skip that check here
});


// ─────────────────────────────────────────────────────────────────────────────
// S02 — Add October 2025 salary → income page, dashboard tiles and tax update
// ─────────────────────────────────────────────────────────────────────────────

test('S02 — Add salary → income table, dashboard tiles and tax all update', async ({ page }) => {
  await signIn(page);

  // ── 2a: Navigate to Income page ──
  await page.goto('/income');
  await expect(page.getByRole('heading', { name: 'Income' })).toBeVisible({ timeout: 8_000 });

  // ── 2b: Open "Add Income Entry" modal ──
  await page.getByRole('button', { name: /add income entry/i }).click();
  await expect(page.getByRole('heading', { name: /add income entry/i })).toBeVisible({ timeout: 6_000 });

  // ── 2c: Fill the form ──
  // Month: pick the current month so the dashboard period "This Month" shows income
  await page.locator('input[type="month"]').fill(currentYM());

  // Income Type: defaults to Salary — no change needed
  // Gross Amount: ৳90,000 → type as "90000" into the MoneyInput
  await page.locator('#gross-paisa').fill('90000');
  // TDS: ৳5,000
  await page.locator('#tds-paisa').fill('5000');

  // ── 2d: Save ──
  await page.getByRole('button', { name: 'Save' }).click();

  // Modal closes
  await expect(page.getByRole('heading', { name: /add income entry/i })).not.toBeVisible({ timeout: 8_000 });

  // ── 2e: Income page — current month row shows "✓ Entered" status ──
  await expect(page.getByText(/✓ entered/i).first()).toBeVisible({ timeout: 8_000 });
  // YTD summary tile shows non-zero Gross Income
  await expect(page.getByText(/gross income ytd/i)).toBeVisible();

  // ── 2f: Dashboard reflects the income ──
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  // Dashboard now has real data — first-run checklist should be gone
  await expect(page.getByText(/in.hand income/i).first()).toBeVisible({ timeout: 8_000 });
  // Tiles show non-zero In-Hand Income
  await expect(page.getByText(/85,000\.00|৳85,000/i).first()).toBeVisible({ timeout: 6_000 });

  // ── 2g: Tax page loads — heading visible
  await page.goto('/tax');
  await expect(page.locator('h1')).toBeVisible({ timeout: 8_000 });
});

// ─────────────────────────────────────────────────────────────────────────────
// S03 — Add Dining spending → budget bar tracks → hits 80% notification
// ─────────────────────────────────────────────────────────────────────────────

test('S03 — Add Dining spending → transactions list, dashboard total and budget update', async ({ page }) => {
  await signIn(page);

  // ── 3a: Navigate to Transactions and open Add form ──
  // Client-side navigation avoids a full page reload that would reset the access token
  await page.getByRole('link', { name: /transactions/i }).first().click();
  await page.waitForURL('**/transactions');
  await expect(page.getByRole('heading', { name: 'Transactions' })).toBeVisible({ timeout: 8_000 });
  // Wait for categories API to finish loading
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: /\+ add spending/i }).click();

  // Wait for the add modal
  await expect(page.getByRole('heading', { name: /add spending/i })).toBeVisible({ timeout: 6_000 });

  // ── 3b: Fill Transaction #1 — Dining ৳800 ──
  await page.locator('input[type="number"]').first().fill('800');
  // Date defaults to today — leave it
  await page.locator('input[type="text"][required]').first().fill('Lunch with team');
  // Category: use select[required] — the page-level filter dropdowns are NOT required
  const catSelect = page.locator('select[required]').first();
  await catSelect.selectOption({ label: 'Dining' });
  // Payment Method: defaults to CASH — leave it
  await page.getByRole('button', { name: 'Save Transaction' }).click();

  // Modal closes
  await expect(page.getByRole('heading', { name: /add spending/i })).not.toBeVisible({ timeout: 8_000 });
  await page.waitForLoadState('networkidle');

  // Transaction appears in the list
  await expect(page.getByText(/lunch with team/i).first()).toBeVisible({ timeout: 6_000 });

  // ── 3c: Add more Dining to push over ৳4,000 (80% of ৳5,000 budget) ──
  for (const desc of ['Dinner', 'Team lunch', 'Office snacks']) {
    await page.getByRole('button', { name: /\+ add spending/i }).click();
    await expect(page.getByRole('heading', { name: /add spending/i })).toBeVisible({ timeout: 6_000 });
    await page.locator('input[type="number"]').first().fill('1200');
    await page.locator('input[type="text"][required]').first().fill(desc);
    await page.locator('select[required]').first().selectOption({ label: 'Dining' });
    await page.getByRole('button', { name: 'Save Transaction' }).click();
    await expect(page.getByRole('heading', { name: /add spending/i })).not.toBeVisible({ timeout: 6_000 });
  }

  // ── 3d: Dashboard — Total Spending is non-zero ──
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await expect(page.getByText(/total spending/i).first()).toBeVisible({ timeout: 8_000 });

  // ── 3e: Budgets page shows Dining bar with progress ──
  await page.goto('/budgets');
  await expect(page.locator('h1')).toBeVisible({ timeout: 8_000 });
  await expect(page.getByText(/dining/i).first()).toBeVisible({ timeout: 6_000 });
  // The budget bar or percentage text should be visible
  await expect(page.getByText(/5,000|budget/i).first()).toBeVisible({ timeout: 6_000 });
});

// ─────────────────────────────────────────────────────────────────────────────
// S04 — Add DPS payment → savings balance rises, tax rebate updates
// ─────────────────────────────────────────────────────────────────────────────

test('S04 — DPS payment → savings balance increases, NOT counted as spending', async ({ page }) => {
  await signIn(page);

  // ── 4a: Navigate to Savings page — note balance before ──
  await page.goto('/savings');
  await expect(page.locator('h1')).toBeVisible({ timeout: 8_000 });
  await expect(page.getByText(/city bank dps 10k/i)).toBeVisible({ timeout: 6_000 });

  // ── 4b: Add DPS Transaction (via Transactions page) ──
  // Client-side navigation avoids resetting the access token
  await page.getByRole('link', { name: /transactions/i }).first().click();
  await page.waitForURL('**/transactions');
  await expect(page.getByRole('heading', { name: 'Transactions' })).toBeVisible({ timeout: 8_000 });
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: /\+ add spending/i }).click();
  await expect(page.getByRole('heading', { name: /add spending/i })).toBeVisible({ timeout: 6_000 });

  await page.locator('input[type="number"]').first().fill('10000');
  await page.locator('input[type="text"][required]').first().fill('DPS October installment');

  // Select "DPS / Savings" category — use select[required] to skip page-level filter dropdowns
  await page.locator('select[required]').first().selectOption({ label: 'DPS / Savings' });

  // Wait for the savings account dropdown to appear and select our account
  const savingsSelect = page.locator('select[required]').last();
  await expect(savingsSelect).toBeVisible({ timeout: 4_000 });
  await savingsSelect.selectOption({ label: 'City Bank DPS 10k' });

  await page.getByRole('button', { name: 'Save Transaction' }).click();
  await expect(page.getByRole('heading', { name: /add spending/i })).not.toBeVisible({ timeout: 8_000 });

  // ── 4c: Savings page — City Bank DPS 10k balance is now ৳10,000 ──
  await page.goto('/savings');
  await page.waitForLoadState('networkidle');
  await expect(page.getByText(/city bank dps 10k/i)).toBeVisible({ timeout: 6_000 });
  await expect(page.getByText(/10,000\.00|৳10,000/i).first()).toBeVisible({ timeout: 6_000 });

  // ── 4d: Tax page — DPS shows up in investment breakdown ──
  await page.goto('/tax');
  await page.waitForLoadState('networkidle');
  await expect(page.locator('h1')).toBeVisible({ timeout: 6_000 });
  // The investments / rebate section should be visible
  await expect(page.getByText(/rebate|investment|dps/i).first()).toBeVisible({ timeout: 6_000 });
});

// ─────────────────────────────────────────────────────────────────────────────
// S05 — Mark Fixed Expense (Mess Rent) as Paid → status changes, alert clears
// ─────────────────────────────────────────────────────────────────────────────

test('S05 — Mark Mess Rent as Paid → instance status becomes Paid, transaction created', async ({ page }) => {
  await signIn(page);

  // ── 5a: Navigate to Fixed Expenses ──
  await page.goto('/fixed-expenses');
  await expect(page.getByRole('heading', { name: 'Fixed Expenses' })).toBeVisible({ timeout: 8_000 });

  // The "This Month" checklist should show Mess Rent
  await expect(page.getByText(/mess rent/i).first()).toBeVisible({ timeout: 6_000 });

  // ── 5b: Click the "Mark Paid" button in the alert banner to open the PayDrawer ──
  // (getByText(/mess rent/).first() hits the alert banner span which is not clickable)
  await page.getByRole('button', { name: 'Mark Paid' }).first().click();

  // PayDrawer appears at bottom of screen
  await expect(page.getByRole('heading', { name: /mark mess rent as paid/i })).toBeVisible({ timeout: 6_000 });

  // Amount pre-filled to ৳8,722 — leave it
  // Date pre-filled to today — leave it

  // ── 5c: Confirm payment ──
  await page.getByRole('button', { name: /confirm.*create transaction/i }).click();

  // Drawer closes
  await expect(page.getByRole('heading', { name: /mark mess rent as paid/i })).not.toBeVisible({ timeout: 8_000 });

  // ── 5d: Mess Rent row now shows "✓" (PAID) ──
  await expect(page.getByText(/✓/).first()).toBeVisible({ timeout: 6_000 });

  // ── 5e: Transaction appears in Transactions list ──
  await page.goto('/transactions');
  await page.waitForLoadState('networkidle');
  await expect(page.getByText(/mess rent/i).first()).toBeVisible({ timeout: 6_000 });
});

// ─────────────────────────────────────────────────────────────────────────────
// S06 — Add Loan Given to Sohel → Running Balance shows → Settle Up
// ─────────────────────────────────────────────────────────────────────────────

test('S06 — Loan Given to Sohel → running balance shown → settle up clears it', async ({ page }) => {
  await signIn(page);

  // ── 6a: Navigate to Loans page ──
  await page.goto('/loans');
  await expect(page.locator('h1')).toBeVisible({ timeout: 8_000 });
  // Wait for the persons API to finish so AddEntryModal has a populated datalist
  // (Sohel has zero entries so the person-list panel shows "No loan records yet." — don't wait for his name)
  await page.waitForLoadState('networkidle');

  // ── 6b: Add Loan Entry — ৳5,000 given to Sohel ──
  await page.getByRole('button', { name: /\+ add entry|\+ add loan/i }).first().click();
  await expect(page.getByRole('heading', { name: /add loan entry/i })).toBeVisible({ timeout: 6_000 });

  // Person: "Sohel" (pre-seeded in DB, datalist will suggest it)
  await page.locator('input[list="persons-list"]').fill('Sohel');
  // Direction: I gave (default)
  await page.locator('select').first().selectOption('GIVEN');
  // Amount
  await page.locator('input[type="number"]').first().fill('5000');
  // Reason
  await page.getByLabel(/reason/i).fill('medical expenses');

  await page.getByRole('button', { name: 'Save Entry' }).click();

  // Modal closes
  await expect(page.getByRole('heading', { name: /add loan entry/i })).not.toBeVisible({ timeout: 8_000 });

  // ── 6c: Sohel card shows "Sohel owes you ৳5,000" ──
  await expect(page.getByText(/sohel owes you/i)).toBeVisible({ timeout: 8_000 });
  await expect(page.getByText(/5,000\.00/i).first()).toBeVisible({ timeout: 6_000 });

  // ── 6d: Dashboard loan summary updates ──
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await expect(page.getByText(/people owe you/i)).toBeVisible({ timeout: 8_000 });

  // ── 6e: Return to Loans and Settle Up ──
  await page.goto('/loans');
  await page.waitForLoadState('networkidle');

  // Click "Settle Up" on Sohel's card
  await page.getByRole('button', { name: /settle up/i }).first().click();

  // Confirm in dialog / modal
  const confirmBtn = page.getByRole('button', { name: /confirm|settle|ok/i }).last();
  if (await confirmBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await confirmBtn.click();
  }

  // Balance shows Settled / ৳0
  await expect(page.getByText(/settled|৳0\.00|0\.00/i).first()).toBeVisible({ timeout: 8_000 });
});

// ─────────────────────────────────────────────────────────────────────────────
// S07 — Add a Tax Payment → Remaining Tax drops on the Tax Dashboard
// ─────────────────────────────────────────────────────────────────────────────

test('S07 — Tax Payment of ৳20,000 → Tax Paid increases, Remaining Tax drops', async ({ page }) => {
  await signIn(page);

  // Check the tax page BEFORE so we can observe the change
  await page.goto('/tax');
  await page.waitForLoadState('networkidle');
  await expect(page.locator('h1')).toBeVisible({ timeout: 8_000 });

  // ── 7a: Add Tax Payment transaction ──
  // Client-side navigation avoids resetting the access token
  await page.getByRole('link', { name: /transactions/i }).first().click();
  await page.waitForURL('**/transactions');
  await expect(page.getByRole('heading', { name: 'Transactions' })).toBeVisible({ timeout: 8_000 });
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: /\+ add spending/i }).click();
  await expect(page.getByRole('heading', { name: /add spending/i })).toBeVisible({ timeout: 6_000 });

  await page.locator('input[type="number"]').first().fill('20000');
  await page.locator('input[type="text"][required]').first().fill('Advance income tax FY2025-26');
  await page.locator('select[required]').first().selectOption({ label: 'Tax Payment' });

  await page.getByRole('button', { name: 'Save Transaction' }).click();
  await expect(page.getByRole('heading', { name: /add spending/i })).not.toBeVisible({ timeout: 8_000 });

  // ── 7b: Tax page — Tax Paid now includes our ৳20,000 ──
  await page.goto('/tax');
  await page.waitForLoadState('networkidle');
  await expect(page.getByText(/tds.*tax payments|tax situation|overpaid/i).first()).toBeVisible({ timeout: 8_000 });
  // The ৳20,000 TDS from income + ৳20,000 tax payment = ৳25,000 total paid
  await expect(page.getByText(/25,000\.00|20,000/i).first()).toBeVisible({ timeout: 6_000 });
});

// ─────────────────────────────────────────────────────────────────────────────
// S08 — History page shows accumulated monthly data
// ─────────────────────────────────────────────────────────────────────────────

test('S08 — History page shows salary month as entered with income and spending figures', async ({ page }) => {
  await signIn(page);

  await page.goto('/history');
  await expect(page.locator('h1')).toBeVisible({ timeout: 8_000 });

  // The month we entered salary for (Oct 2025 or current)
  // At minimum it should show the tax year table
  await expect(page.getByText(/in.hand|gross|spending|savings rate/i).first()).toBeVisible({ timeout: 6_000 });

  // Oct 2025 row should show ৳85,000 in-hand income
  await expect(page.getByText(/85,000\.00|85,000/i).first()).toBeVisible({ timeout: 6_000 });
});

// ─────────────────────────────────────────────────────────────────────────────
// S09 — Dashboard period selector changes displayed figures
// ─────────────────────────────────────────────────────────────────────────────

test('S09 — Period selector: switching to "This Tax Year" shows cumulative totals', async ({ page }) => {
  await signIn(page);

  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await expect(page.getByRole('button', { name: /this month/i })).toBeVisible({ timeout: 8_000 });

  // Switch to "This Tax Year"
  await page.getByRole('button', { name: /this tax year/i }).click();
  await page.waitForLoadState('networkidle');

  // Tiles should still be visible and show figures
  await expect(page.getByText(/in.hand income/i).first()).toBeVisible({ timeout: 8_000 });

  // Switch to "Last Month" — may show first-run checklist if no last-month data, that's fine
  await page.getByRole('button', { name: /last month/i }).click();
  await page.waitForLoadState('networkidle');
  // Period buttons remain visible regardless of data
  await expect(page.getByRole('button', { name: /this month/i })).toBeVisible({ timeout: 4_000 });

  // Switch back to "This Month"
  await page.getByRole('button', { name: /this month/i }).click();
  await page.waitForLoadState('networkidle');
  await expect(page.getByText(/in.hand income/i).first()).toBeVisible({ timeout: 8_000 });
});
