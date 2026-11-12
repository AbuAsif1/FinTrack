'use client';

import { Sidebar } from '@/components/nav/Sidebar';
import { BottomTabBar } from '@/components/nav/BottomTabBar';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { tryRestoreSession } from '@/lib/api';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    tryRestoreSession().then((ok) => {
      if (!ok) {
        router.replace('/login');
      } else {
        setReady(true);
      }
    });
  }, [router]);

  if (!ready) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <span style={{ color: 'var(--fg-muted)' }}>Loading…</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Desktop sidebar — hidden on mobile */}
      <div className="sidebar-desktop" style={{ display: 'contents' }}>
        <Sidebar />
      </div>

      <main style={{ flex: 1, padding: '24px', paddingBottom: '80px', maxWidth: 1120, minHeight: '100vh' }}>
        {children}
      </main>

      {/* Mobile bottom bar — hidden on desktop */}
      <div className="bottom-nav-mobile">
        <BottomTabBar />
      </div>
    </div>
  );
}
