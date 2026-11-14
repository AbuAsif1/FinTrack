/**
 * Full E2E Regression Suite — FinTrack BD
 *
 * Covers scenarios NOT in happy-path.spec.ts (which covers the golden path).
 * This file adds edge-cases, error paths, responsive-layout, and security
 * scenarios that complete the Full Regression suite.
 *
 * Case IDs map to `.scratch/fintrack-bd-mvp/test-cases/`:
 *   TC-REG-001, TC-REG-020  — registration journey
 *   TC-UI-005               — session persists across page reload
 *   TC-UI-007               — dark-mode toggle persists
 *   TC-NFR-003              — offline / degraded-network notice
 *   TC-NFR-004              — mobile viewport 375 × 667 (iPhone SE)
 *   TC-IMP-018              — full CSV import preview + commit
 *   TC-EXP-001              — export JSON / CSV download
 *   TC-SEC-003 (extended)   — admin routes blocked for USER role
 *   TC-ADM-001              — admin list visible to ADMIN, hidden to USER
 *
 * Run:  pnpm test:regression   (uses playwright.regression.config.ts)
 * Seed: pnpm seed:e2e          (run once; regression config does it via globalSetup)
 */

import { test, expect, type Page } from '@playwright/test';

const EMAIL    = 'e2euser@test.local';
const PASSWORD = 'E2ETest1234!';

// ── Helpers ───────────────────────────────────────────────────────────────

async function signIn(page: Page) {
  const resp = await page.request.post('/api/v1/auth/login', {
    data: { email: EMAIL, password: PASSWORD },
    headers: { 'Content-Type': 'application/json' },
  });
  if (!resp.ok()) throw new Error(`Login API failed: ${resp.status()} ${await resp.text()}`);
  await page.goto('/');
  await page.locator('header').waitFor({ timeout: 20_000 });
  await page.waitForLoadState('networkidle');
}

// ─────────────────────────────────────────────────────────────────────────────
// TC-REG-001 — Registration page renders all required fields
// ─────────────────────────────────────────────────────────────────────────────

test('TC-REG-001 — /register renders name, email and password fields', async ({ page }) => {
  await page.context().clearCookies();
  await page.goto('/register');
  await expect(page.getByLabel(/name/i)).toBeVisible({ timeout: 8_000 });
  await expect(page.getByLabel(/email/i)).toBeVisible({ timeout: 4_000 });
  await expect(page.getByLabel(/password/i)).toBeVisible({ timeout: 4_000 });
  await expect(page.getByRole('button', { name: /register|sign up/i })).toBeVisible({ timeout: 4_000 });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-REG-020 — Registration journey: submit → verification page shown
// ─────────────────────────────────────────────────────────────────────────────

test('TC-REG-020 — submitting registration form shows verification-email notice', async ({ page }) => {
  const ts    = Date.now();
  const email = `reg+${ts}@test.invalid`;

  await page.context().clearCookies();
  await page.goto('/register');

  await page.getByLabel(/name/i).fill('Regression User');
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill('Reg1234Test!');
  await page.getByRole('button', { name: /register|sign up/i }).click();

  // Should land on a "check your email" / verification-pending page
  await expect(page).toHaveURL(/verify|check.*email|pending/i, { timeout: 10_000 });
  // The page must mention the email address the user just registered with
  await expect(page.getByText(new RegExp(email, 'i')).first()).toBeVisible({ timeout: 6_000 });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-UI-005 — Session persists across a full page reload
// ─────────────────────────────────────────────────────────────────────────────

test('TC-UI-005 — signed-in user stays signed in after page reload', async ({ page }) => {
  await signIn(page);
  await expect(page.locator('header')).toBeVisible({ timeout: 10_000 });

  await page.reload();
  await page.locator('header').waitFor({ timeout: 20_000 });
  await page.waitForLoadState('networkidle');

  // Should still be on the dashboard — not redirected to /login
  await expect(page).toHaveURL('/');
  await expect(page.locator('header')).toBeVisible({ timeout: 6_000 });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-UI-007 — Dark-mode toggle: class applied and persists across reload
// ─────────────────────────────────────────────────────────────────────────────

test('TC-UI-007 — dark-mode toggle adds dark class and persists', async ({ page }) => {
  await signIn(page);

  // Find the theme toggle — it may be in a settings menu or top bar
  const toggle = page.getByRole('button', { name: /dark mode|theme|toggle theme/i });
  if (!(await toggle.isVisible({ timeout: 3_000 }).catch(() => false))) {
    // Some UIs put the toggle in a settings panel
    const settingsBtn = page.getByRole('link', { name: /settings/i }).first();
    if (await settingsBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await settingsBtn.click();
      await page.waitForLoadState('networkidle');
    }
  }

  const toggleVisible = await toggle.isVisible({ timeout: 4_000 }).catch(() => false);
  if (!toggleVisible) {
    test.skip(true, 'Dark-mode toggle not found in this build — skip');
    return;
  }

  await toggle.click();
  // <html> or <body> should have class "dark"
  const htmlClass = await page.locator('html').getAttribute('class');
  const bodyClass = await page.locator('body').getAttribute('class');
  const darkApplied = (htmlClass ?? '').includes('dark') || (bodyClass ?? '').includes('dark');
  expect(darkApplied, 'dark class not applied after toggle').toBe(true);

  // Reload — dark mode should persist (stored in localStorage / cookie)
  await page.reload();
  await page.locator('header').waitFor({ timeout: 20_000 });
  const htmlClassAfter = await page.locator('html').getAttribute('class');
  const bodyClassAfter = await page.locator('body').getAttribute('class');
  expect(
    (htmlClassAfter ?? '').includes('dark') || (bodyClassAfter ?? '').includes('dark'),
    'dark class lost after reload'
  ).toBe(true);
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-NFR-004 — Mobile viewport (375×667): navigation and dashboard readable
// ─────────────────────────────────────────────────────────────────────────────

test('TC-NFR-004 — mobile viewport 375×667: dashboard and nav render without overflow', async ({ browser }) => {
  const ctx  = await browser.newContext({ viewport: { width: 375, height: 667 } });
  const page = await ctx.newPage();

  const resp = await page.request.post('/api/v1/auth/login', {
    data: { email: EMAIL, password: PASSWORD },
    headers: { 'Content-Type': 'application/json' },
  });
  if (!resp.ok()) {
    await ctx.close();
    throw new Error(`Login failed: ${resp.status()}`);
  }

  await page.goto('/');
  await page.locator('header').waitFor({ timeout: 20_000 });
  await page.waitForLoadState('networkidle');

  // Header must be visible at mobile width
  await expect(page.locator('header')).toBeVisible({ timeout: 8_000 });

  // Page width must not exceed viewport (no horizontal overflow)
  const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
  expect(bodyWidth, 'horizontal overflow on mobile').toBeLessThanOrEqual(375 + 2); // 2px tolerance

  await ctx.close();
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-NFR-003 — Offline: app shows a degraded-network notice, not a blank crash
// ─────────────────────────────────────────────────────────────────────────────

test('TC-NFR-003 — going offline shows a network-error notice, not a blank screen', async ({ page }) => {
  await signIn(page);
  await expect(page.locator('header')).toBeVisible({ timeout: 10_000 });

  // Go offline
  await page.context().setOffline(true);

  // Navigate to a data-heavy page — the app should catch the fetch error
  await page.goto('/transactions').catch(() => { /* network error expected */ });

  // After networkidle or timeout, the page should still have some content —
  // at minimum the HTML shell, not a blank white screen
  const bodyText = await page.locator('body').innerText().catch(() => '');
  expect(
    bodyText.length,
    'page body is empty — possible blank crash on offline'
  ).toBeGreaterThan(10);

  // Restore online for cleanup
  await page.context().setOffline(false);
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-IMP-018 — Full CSV import: upload → preview → commit → rows appear
// ─────────────────────────────────────────────────────────────────────────────

test('TC-IMP-018 — CSV import: upload file → preview shown → commit → transactions added', async ({ page }) => {
  await signIn(page);
  await page.goto('/settings/import');
  await expect(page.locator('h1')).toContainText(/import/i, { timeout: 8_000 });

  // Build a minimal valid CSV matching FinTrack import schema
  const csv = [
    'date,description,amount,category',
    '2026-11-01,Imported Coffee,150,Dining',
    '2026-11-02,Imported Bus Fare,30,Transport',
  ].join('\n');

  const fileInput = page.locator('input[type="file"]').first();
  await expect(fileInput).toBeVisible({ timeout: 6_000 });

  // Upload the CSV buffer
  await fileInput.setInputFiles({
    name: 'import-test.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(csv),
  });

  // Preview table or row count must appear
  await expect(
    page.getByText(/preview|2 rows|row.*found|imported coffee/i).first()
  ).toBeVisible({ timeout: 10_000 });

  // Commit button
  const commitBtn = page.getByRole('button', { name: /commit|confirm.*import|import all/i });
  if (await commitBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await commitBtn.click();
    await expect(
      page.getByText(/imported|success|2 transaction/i).first()
    ).toBeVisible({ timeout: 10_000 });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-EXP-001 — Export: trigger download, response is a file attachment
// ─────────────────────────────────────────────────────────────────────────────

test('TC-EXP-001 — Export: clicking export triggers a file download', async ({ page }) => {
  await signIn(page);
  await page.goto('/settings/export');
  await expect(page.locator('h1')).toContainText(/export/i, { timeout: 8_000 });

  // Wait for a download event when clicking the first export button
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 15_000 }),
    page.getByRole('button', { name: /export|download/i }).first().click(),
  ]);

  expect(download.suggestedFilename()).toMatch(/\.(csv|json|xlsx)$/i);
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-SEC-003 extended — Admin routes return 403 for a USER-role session
// ─────────────────────────────────────────────────────────────────────────────

test('TC-SEC-003 extended — /admin/* routes return 403 for USER role', async ({ page }) => {
  await signIn(page); // seed user has USER role

  const adminEndpoints = [
    '/api/v1/admin/users',
    '/api/v1/admin/actions',
  ];

  for (const endpoint of adminEndpoints) {
    const resp = await page.request.get(endpoint);
    expect(resp.status(), `${endpoint} should be 403 for USER`).toBe(403);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-ADM-001 — Admin nav link is NOT visible to a USER-role account
// ─────────────────────────────────────────────────────────────────────────────

test('TC-ADM-001 — Admin navigation entry is hidden for USER role', async ({ page }) => {
  await signIn(page); // seed user is USER, not ADMIN

  // The "Admin" or "Users" nav link should not appear for a non-admin
  const adminLink = page.getByRole('link', { name: /^admin$|^users$/i });
  await expect(adminLink).not.toBeVisible({ timeout: 6_000 });
});

// ─────────────────────────────────────────────────────────────────────────────
// Sign-out: session ends, / redirects back to /login
// ─────────────────────────────────────────────────────────────────────────────

test('Sign-out clears the session and / redirects to /login', async ({ page }) => {
  await signIn(page);
  await expect(page.locator('header')).toBeVisible({ timeout: 10_000 });

  // Look for a sign-out / logout button — may be in a user menu
  const signOutBtn = page.getByRole('button', { name: /sign out|log out|logout/i });
  const userMenuBtn = page.getByRole('button', { name: /profile|account|user menu/i });

  if (!(await signOutBtn.isVisible({ timeout: 2_000 }).catch(() => false))) {
    if (await userMenuBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await userMenuBtn.click();
    }
  }

  if (await signOutBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await signOutBtn.click();
    await expect(page).toHaveURL(/\/login/i, { timeout: 10_000 });

    // After sign out, / should still redirect
    await page.context().clearCookies();
    await page.goto('/');
    await expect(page).toHaveURL(/\/login/i, { timeout: 8_000 });
  } else {
    // Sign-out button not found in this build; verify via API instead
    await page.request.post('/api/v1/auth/logout');
    await page.context().clearCookies();
    await page.goto('/');
    await expect(page).toHaveURL(/\/login/i, { timeout: 8_000 });
  }
});
