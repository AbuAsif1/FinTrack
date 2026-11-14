// Global test setup
import '@testing-library/jest-dom';
import { config } from 'dotenv';
import { resolve } from 'path';

// Vitest does not load .env.local (a Next.js convention). Load it explicitly
// so DATABASE_URL and other Next.js-only vars are available in tests.
config({ path: resolve(process.cwd(), '.env.local') });

// Fallback values in case .env.local is absent (CI environments use real env vars).
process.env.JWT_SECRET ??= 'test-jwt-secret-at-least-32-chars-long';
process.env.APP_URL ??= 'http://localhost:3000';
