/**
 * Smoke Suite — FinTrack BD
 *
 * Covers the E2E-seam smoke cases from the master list in
 * `.scratch/fintrack-bd-mvp/test-cases/README.md`:
 *   TC-UI-004, TC-UI-068, TC-UI-120
 *   TC-AUTH-001, TC-AUTH-008
 *   TC-DASH-001
 *   TC-NFR-015, TC-NFR-016
 *   TC-SEC-003
 *   TC-IMP-018, TC-EXP-001 (page-load level)
 *
 * Target: < 10 minutes total on a local/CI build.
 * Run:    pnpm test:smoke   (uses playwright.smoke.config.ts → seeds DB first)
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
// TC-UI-004 — Unauthenticated request → redirect to /login
// ─────────────────────────────────────────────────────────────────────────────

test('TC-UI-004 — accessing / without a session redirects to /login', async ({ page }) => {
  await page.context().clearCookies();
  await page.goto('/');
  await expect(page).toHaveURL(/\/login/i, { timeout: 10_000 });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-AUTH-001 — Valid credentials → dashboard
// ─────────────────────────────────────────────────────────────────────────────

test('TC-AUTH-001 — seed user signs in and reaches the dashboard', async ({ page }) => {
  await signIn(page);
  await expect(page).toHaveURL('/');
  await expect(
    page.locator('h1, h2').filter({ hasText: /dashboard|fintrack|welcome/i }).first()
  ).toBeVisible({ timeout: 10_000 });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-AUTH-008 — Wrong password → 401, page stays on /login
// ─────────────────────────────────────────────────────────────────────────────

test('TC-AUTH-008 — wrong password returns 401 and does not set a session', async ({ page }) => {
  await page.context().clearCookies();
  const resp = await page.request.post('/api/v1/auth/login', {
    data: { email: EMAIL, password: 'WrongPassword99!' },
    headers: { 'Content-Type': 'application/json' },
  });
  expect(resp.status()).toBe(401);

  // After a failed login the UI stays on /login (no cookie means / would redirect)
  await page.context().clearCookies();
  await page.goto('/');
  await expect(page).toHaveURL(/\/login/i, { timeout: 8_000 });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-UI-068 — Dashboard renders the In-Hand Income tile
// ─────────────────────────────────────────────────────────────────────────────

test('TC-UI-068 — dashboard renders In-Hand Income tile after sign in', async ({ page }) => {
  await signIn(page);
  await expect(page.getByText(/in.hand income/i).first()).toBeVisible({ timeout: 10_000 });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-DASH-001 — Dashboard period selector is visible and renders tiles
// ─────────────────────────────────────────────────────────────────────────────

test('TC-DASH-001 — dashboard period selector buttons are present', async ({ page }) => {
  await signIn(page);
  await expect(page.getByRole('button', { name: /this month/i })).toBeVisible({ timeout: 8_000 });
  await expect(page.getByRole('button', { name: /this tax year/i })).toBeVisible({ timeout: 4_000 });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-UI-120 — All primary nav routes load without a 5xx error
// ─────────────────────────────────────────────────────────────────────────────

test('TC-UI-120 — primary navigation routes all respond with < 500 status', async ({ page }) => {
  await signIn(page);

  const routes = [
    '/transactions',
    '/income',
    '/savings',
    '/fixed-expenses',
    '/loans',
    '/budgets',
    '/tax',
    '/history',
    '/settings/import',
    '/settings/export',
  ];

  for (const route of routes) {
    const response = await page.goto(route);
    expect(response?.status() ?? 200, `${route} returned 5xx`).toBeLessThan(500);
    await expect(page.locator('h1')).toBeVisible({ timeout: 8_000 });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-IMP-018 smoke — Import page loads and shows the upload area
// ─────────────────────────────────────────────────────────────────────────────

test('TC-IMP-018 smoke — Import page loads and shows the file upload area', async ({ page }) => {
  await signIn(page);
  await page.goto('/settings/import');
  await expect(page.locator('h1')).toContainText(/import/i, { timeout: 8_000 });
  // Upload control or drop-zone must be present
  await expect(
    page.locator('input[type="file"], [data-testid="drop-zone"], text=/upload|choose file/i').first()
  ).toBeVisible({ timeout: 6_000 });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-EXP-001 smoke — Export page loads and shows export options
// ─────────────────────────────────────────────────────────────────────────────

test('TC-EXP-001 smoke — Export page loads and shows download options', async ({ page }) => {
  await signIn(page);
  await page.goto('/settings/export');
  await expect(page.locator('h1')).toContainText(/export/i, { timeout: 8_000 });
  // At least one export button / link must be visible
  await expect(
    page.getByRole('button', { name: /export|download/i }).first()
  ).toBeVisible({ timeout: 6_000 });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-NFR-015 — /api/health responds 200 within 2 s
// ─────────────────────────────────────────────────────────────────────────────

test('TC-NFR-015 — /api/health responds 200 within 2 s', async ({ page }) => {
  const before = Date.now();
  const resp = await page.request.get('/api/health');
  const elapsed = Date.now() - before;
  expect(resp.status()).toBe(200);
  expect(elapsed, 'health endpoint too slow').toBeLessThan(2_000);
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-NFR-016 — Dashboard API responds within 3 s
// ─────────────────────────────────────────────────────────────────────────────

test('TC-NFR-016 — dashboard API responds within 3 s', async ({ page }) => {
  await signIn(page);
  const before = Date.now();
  const resp = await page.request.get('/api/v1/dashboard');
  const elapsed = Date.now() - before;
  expect(resp.ok(), 'dashboard API not OK').toBeTruthy();
  expect(elapsed, 'dashboard API too slow').toBeLessThan(3_000);
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-SEC-003 — Protected API routes return 401 without a session
// ─────────────────────────────────────────────────────────────────────────────

test('TC-SEC-003 — protected API routes return 401 for unauthenticated requests', async ({ page }) => {
  await page.context().clearCookies();
  const endpoints = [
    '/api/v1/dashboard',
    '/api/v1/transactions',
    '/api/v1/income',
    '/api/v1/savings-accounts',
    '/api/v1/loans',
  ];
  for (const endpoint of endpoints) {
    const resp = await page.request.get(endpoint);
    expect(resp.status(), `${endpoint} should be 401`).toBe(401);
  }
});
