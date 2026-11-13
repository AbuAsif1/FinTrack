'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const mainTabs = [
  { href: '/', label: 'Home', icon: '🏠' },
  { href: '/transactions', label: 'Transactions', icon: '💸' },
  { href: '/fixed-expenses', label: 'Fixed', icon: '📋' },
];

const moreItems = [
  { href: '/income', label: 'Income', icon: '💵' },
  { href: '/savings', label: 'Bank & Savings', icon: '🏦' },
  { href: '/loans', label: 'Loans', icon: '🤝' },
  { href: '/tax', label: 'Tax Dashboard', icon: '📊' },
  { href: '/history', label: 'History', icon: '📈' },
  { href: '/settings', label: 'Settings', icon: '⚙' },
];

export function BottomTabBar() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  function isActive(href: string) {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  }

  return (
    <>
      <nav
        aria-label="Mobile navigation"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'var(--bg-surface)',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          height: 60,
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          zIndex: 100,
        }}
      >
        {mainTabs.slice(0, 2).map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              color: isActive(tab.href) ? 'var(--accent)' : 'var(--fg-muted)',
              textDecoration: 'none',
              font: 'var(--t-caption)',
              minHeight: 44,
            }}
          >
            <span style={{ fontSize: 20 }}>{tab.icon}</span>
            <span>{tab.label}</span>
          </Link>
        ))}

        {/* FAB — Add */}
        <button
          aria-label="Add"
          style={{
            width: 48, height: 48,
            background: 'var(--accent)',
            color: 'var(--accent-fg)',
            borderRadius: '50%',
            border: 'none',
            fontSize: 24,
            cursor: 'pointer',
            flexShrink: 0,
            margin: '0 8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          }}
        >
          ➕
        </button>

        {mainTabs.slice(2).map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              color: isActive(tab.href) ? 'var(--accent)' : 'var(--fg-muted)',
              textDecoration: 'none',
              font: 'var(--t-caption)',
              minHeight: 44,
            }}
          >
            <span style={{ fontSize: 20 }}>{tab.icon}</span>
            <span>{tab.label}</span>
          </Link>
        ))}

        <button
          onClick={() => setMoreOpen(true)}
          aria-label="More"
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--fg-muted)',
            font: 'var(--t-caption)',
            minHeight: 44,
          }}
        >
          <span style={{ fontSize: 20 }}>📊</span>
          <span>More</span>
        </button>
      </nav>

      {moreOpen && (
        <div
          role="dialog"
          aria-label="More navigation"
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
          }}
          onClick={() => setMoreOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--bg-surface)',
              borderRadius: '16px 16px 0 0',
              padding: '16px 0 32px',
            }}
          >
            <div style={{ width: 36, height: 4, background: 'var(--border)', borderRadius: 2, margin: '0 auto 16px' }} />
            {moreItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMoreOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '14px 20px',
                  color: 'var(--fg-primary)',
                  textDecoration: 'none',
                  font: 'var(--t-body)',
                  minHeight: 44,
                }}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
