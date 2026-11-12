import type { NextConfig } from 'next';

// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment
const withPWA = require('next-pwa');

const pwaConfig = withPWA({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
});

const nextConfig: NextConfig = {
  transpilePackages: ['@fintrack/shared', '@fintrack/tax-engine'],
};

export default pwaConfig(nextConfig);
