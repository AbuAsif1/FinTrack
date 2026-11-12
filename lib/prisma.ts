import { PrismaClient } from '@prisma/client';

function createPrismaClient() {
  // Neon adapter (WebSocket) is only needed for edge/serverless runtimes.
  // In a standard Node.js process (local dev, Node-based deploy) Prisma connects
  // over TCP directly — works fine with Neon over sslmode=require.
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
