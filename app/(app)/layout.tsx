'use client';

import { Sidebar } from '@/components/nav/Sidebar';
import { BottomTabBar } from '@/components/nav/BottomTabBar';
import { NotificationBell } from '@/components/ui/NotificationDrawer';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { tryRestoreSession } from '@/lib/api';
import api from '@/lib/api';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    tryRestoreSession().then((ok) => {
      if (!ok) {
        router.replace('/login');
      } else {
        setReady(true);
        // Fetch initial unread count
        api.get<{ unread_notification_count: number }>('/dashboard/summary').then(({ data }) => {
          setUnreadCount(data.unread_notification_count ?? 0);
        }).catch(() => { /* ignore */ });
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
    <div style={{ display: 'flex', minHeight: '100vh', flexDirection: 'column' }}>
      {/* Top bar with bell */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        padding: '0 24px',
        height: 52,
        gap: 8,
      }}>
        <NotificationBell unreadCount={unreadCount} onCountChange={setUnreadCount} />
      </header>

      <div style={{ display: 'flex', flex: 1 }}>
        {/* Desktop sidebar — hidden on mobile */}
        <div className="sidebar-desktop" style={{ display: 'contents' }}>
          <Sidebar />
        </div>

        <main style={{ flex: 1, padding: '24px', paddingBottom: '80px', maxWidth: 1120, minHeight: 'calc(100vh - 52px)' }}>
          {children}
        </main>
      </div>

      {/* Mobile bottom bar — hidden on desktop */}
      <div className="bottom-nav-mobile">
        <BottomTabBar />
      </div>
    </div>
  );
}
