import { defineConfig, devices } from '@playwright/test';

/**
 * Money-flow journeys from qa/test-cases/FinTrack-BD_Test-Cases.xlsx.
 *
 * Suites are tags (from the workbook's Suites column):
 *   pnpm test:mf:smoke | test:mf:sanity | test:mf:happy | test:mf:regression
 *   one area:  pnpm test:mf --grep @area-loans
 *
 * Serial or parallel — your choice per run. Every test creates its own user, so both are safe:
 *   pnpm test:mf:smoke                  one worker (default; easiest on the shared Neon DB)
 *   pnpm test:mf:smoke --workers=4      four tests at a time
 *   MF_WORKERS=4 pnpm test:mf:regression
 *
 * Do not run the Vitest API suite (pnpm test / test:api) at the same time against the same
 * database: its cleanup deletes every non-seed user, including these tests' users.
 */
export default defineConfig({
  testDir: './qa/automation/e2e/money-flow',
  testMatch: '**/*.spec.ts',
  globalSetup: './qa/automation/e2e/money-flow/support/global-setup.ts',
  fullyParallel: true,
  workers: Number(process.env.MF_WORKERS ?? 1),
  retries: process.env.CI ? 1 : 0,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  reporter: [['html', { open: 'never', outputFolder: 'qa/results/money-flow/report' }], ['list']],
  outputDir: 'qa/results/money-flow/artifacts',
  use: {
    baseURL: process.env.APP_URL ?? 'http://localhost:3000',
    headless: true,
    viewport: { width: 1440, height: 900 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: process.env.APP_URL ? undefined : {
    command: 'pnpm dev',
    url: 'http://localhost:3000/api/v1/health',
    reuseExistingServer: true,
    timeout: 180_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
