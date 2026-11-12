import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      '@fintrack/shared': path.resolve(__dirname, 'packages/shared/src/index.ts'),
      '@fintrack/tax-engine': path.resolve(__dirname, 'packages/tax-engine/src/index.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    // DB-backed API tests all call truncateAll() in beforeEach against a shared Neon DB.
    // Running files concurrently causes workers to truncate each other's data mid-test.
    fileParallelism: false,
    // Remote Neon DB round-trips take longer than the 5s default.
    testTimeout: 30000,
    hookTimeout: 30000,
    environmentMatchGlobs: [
      ['components/**/*.test.tsx', 'jsdom'],
    ],
    setupFiles: ['./tests/setup.ts'],
    include: [
      'packages/*/src/**/*.test.ts',
      'tests/api/**/*.test.ts',
      'components/**/*.test.tsx',
    ],
    coverage: {
      provider: 'v8',
      include: ['packages/*/src/**'],
      exclude: ['packages/*/src/**/*.test.ts'],
      thresholds: {
        // 100% branch coverage gate for tax-engine specifically enforced in CI
        // using: vitest run --project tax-engine --coverage
      },
    },
  },
});
