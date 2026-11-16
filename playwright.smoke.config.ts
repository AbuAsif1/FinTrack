import { defineConfig, devices } from '@playwright/test';

/**
 * Smoke config — fast headless run, seeds DB via globalSetup.
 * Target: < 10 minutes total.
 * Usage:  pnpm test:smoke
 */
export default defineConfig({
  globalSetup:   './qa/automation/e2e/global-setup.ts',
  testDir:       './qa/automation/e2e',
  testMatch:     '**/smoke.spec.ts',
  fullyParallel: false,
  retries:       process.env.CI ? 1 : 0,
  workers:       1,
  timeout:       30_000,
  reporter: [['html', { open: 'never', outputFolder: 'qa/results/smoke/report' }], ['line']],
  outputDir: 'qa/results/smoke/artifacts',
  use: {
    baseURL:    process.env.APP_URL ?? 'http://localhost:3000',
    headless:   true,
    viewport:   { width: 1366, height: 768 },
    screenshot: 'only-on-failure',
    trace:      'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
