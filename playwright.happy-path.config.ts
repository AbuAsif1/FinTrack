import { defineConfig, devices } from '@playwright/test';

/**
 * Headed, slowed-down Playwright config for watching the happy-path scenarios.
 * Usage: pnpm test:e2e:happy
 */
export default defineConfig({
  globalSetup:    './e2e/global-setup.ts',
  testDir:        './e2e',
  testMatch:      '**/happy-path.spec.ts',
  fullyParallel:  false,
  retries:        0,
  workers:        1,
  timeout:        90_000,
  reporter:       [['html', { open: 'never' }], ['line']],
  use: {
    baseURL:       process.env.APP_URL ?? 'http://localhost:3000',
    headless:      false,
    launchOptions: { slowMo: 600 },
    viewport:      { width: 1366, height: 768 },
    screenshot:    'on',
    trace:         'on',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
