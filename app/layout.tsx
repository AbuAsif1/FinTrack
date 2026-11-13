import type { Metadata } from 'next';
import { Inter, Space_Grotesk } from 'next/font/google';
import { Providers } from './providers';
import { ServiceWorkerRegistrar } from '@/components/ui/ServiceWorkerRegistrar';
import { OfflineNotice } from '@/components/ui/OfflineNotice';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'FinTrack BD',
  description: 'Personal finance for a salaried professional in Bangladesh',
  manifest: '/manifest.json',
  themeColor: '#3A5FCD',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable}`} suppressHydrationWarning>
      <body>
        <ServiceWorkerRegistrar />
        <OfflineNotice />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
