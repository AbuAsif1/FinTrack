import { PrismaClient } from '@prisma/client';

function createPrismaClient() {
  const url = process.env.DATABASE_URL ?? '';
  if (url && new URL(url).hostname.endsWith('neon.tech')) {
    // Use @prisma/adapter-neon for Neon hosted PostgreSQL
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Pool, neonConfig } = require('@neondatabase/serverless');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PrismaNeon } = require('@prisma/adapter-neon');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ws = require('ws');
    neonConfig.webSocketConstructor = ws;
    return new PrismaClient({ adapter: new PrismaNeon(new Pool({ connectionString: url })) });
  }
  return new PrismaClient();
}

// Use a global singleton in development to avoid exhausting connection pool across hot reloads
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma: PrismaClient =
  global.__prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}
