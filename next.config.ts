import type { NextConfig } from 'next';
import withPWA from 'next-pwa';

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
