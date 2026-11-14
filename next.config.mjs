import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const withPWA = require('next-pwa');

const pwaConfig = withPWA({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@fintrack/shared', '@fintrack/tax-engine'],
  // Neon serverless & its ws dependency are only needed in edge/serverless runtimes.
  // Exclude them from the Node.js server bundle to prevent uncaughtException crashes.
  experimental: {
    serverComponentsExternalPackages: ['@neondatabase/serverless', '@prisma/adapter-neon'],
  },
  async redirects() {
    return [{ source: '/wallets', destination: '/savings', permanent: true }];
  },
};

export default pwaConfig(nextConfig);
