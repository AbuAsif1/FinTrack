import { defineConfig, devices } from '@playwright/test';

/**
 * Full E2E Regression config — headless, full timeout, seeds DB via globalSetup.
 * Run nightly or before every release.
 * Usage:  pnpm test:regression
 */
export default defineConfig({
  globalSetup:   './e2e/global-setup.ts',
  testDir:       './e2e',
  testMatch:     '**/regression.spec.ts',
  fullyParallel: false,
  retries:       process.env.CI ? 2 : 0,
  workers:       1,
  timeout:       90_000,
  reporter:      [['html', { open: 'never' }], ['line']],
  use: {
    baseURL:    process.env.APP_URL ?? 'http://localhost:3000',
    headless:   true,
    viewport:   { width: 1366, height: 768 },
    screenshot: 'on',
    trace:      'on',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
