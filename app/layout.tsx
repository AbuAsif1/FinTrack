import type { Metadata, Viewport } from 'next';
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
  title: 'FinTrack',
  description: 'Personal finance for salaried professionals in Bangladesh',
  manifest: '/manifest.json',
  icons: {
    icon: '/icon',
    apple: '/icon-192.png',
  },
};

// Next.js 14: themeColor belongs in the viewport export, not metadata
// ("Unsupported metadata themeColor … Please move it to viewport export instead").
export const viewport: Viewport = {
  themeColor: '#299D91',
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
