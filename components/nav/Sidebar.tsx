'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

const navItems = [
  { href: '/', label: 'Dashboard', icon: '⌂' },
  { href: '/income', label: 'Income', icon: '↑' },
  { href: '/transactions', label: 'Transactions', icon: '⇄' },
  { href: '/budgets', label: 'Budgets', icon: '◧' },
  { href: '/fixed-expenses', label: 'Fixed Expenses', icon: '◉' },
  { href: '/savings', label: 'Savings & DPS', icon: '◈' },
  { href: '/loans', label: 'Loans', icon: '⟺' },
  { href: '/tax', label: 'Tax Dashboard', icon: '◎' },
  { href: '/history', label: 'History', icon: '▦' },
];

const bottomItems = [
  { href: '/settings', label: 'Settings', icon: '◌' },
];

function currentFY(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed
  const fyStart = month >= 6 ? year : year - 1;
  return `FY${fyStart}-${String(fyStart + 1).slice(2)}`;
}

export function Sidebar() {
  const pathname = usePathname();
  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: () => api.get<{ id: string; role: string; name?: string }>('/me').then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });

  function isActive(href: string) {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  }

  const fy = currentFY();

  return (
    <nav
      aria-label="Main navigation"
      style={{
        width: 240,
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border)',
        height: '100vh',
        position: 'sticky',
        top: 0,
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        overflowY: 'auto',
      }}
    >
      {/* Brand */}
      <div style={{ padding: '20px 20px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <div style={{
            width: 32,
            height: 32,
            background: 'var(--accent)',
            color: 'var(--accent-fg)',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: 15,
            fontFamily: 'var(--font-space-grotesk, system-ui)',
            flexShrink: 0,
          }}>
            F
          </div>
          <div>
            <div style={{
              font: '600 15px var(--font-space-grotesk, system-ui)',
              color: 'var(--fg-primary)',
              lineHeight: 1.2,
            }}>
              FinTrack
            </div>
            <div style={{
              font: 'var(--t-caption)',
              color: 'var(--fg-muted)',
              lineHeight: 1.2,
            }}>
              Personal finance
            </div>
          </div>
        </div>
      </div>

      {/* Nav items */}
      <ul style={{ listStyle: 'none', margin: 0, padding: '4px 8px', flex: 1 }}>
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                style={{
                  display: 'flex',
                  width: '100%',
                  justifyContent: 'flex-start',
                  alignItems: 'center',
                  gap: 10,
                  padding: '9px 12px',
                  borderRadius: 8,
                  color: active ? 'var(--accent)' : 'var(--fg-secondary)',
                  background: active ? 'rgba(99,102,241,0.1)' : 'transparent',
                  textDecoration: 'none',
                  font: 'var(--t-body)',
                  fontWeight: active ? 600 : 400,
                  transition: 'background 100ms, color 100ms',
                  marginBottom: 2,
                  boxSizing: 'border-box',
                }}
              >
                <span style={{
                  width: 18,
                  textAlign: 'center',
                  fontSize: 15,
                  lineHeight: 1,
                  flexShrink: 0,
                  color: active ? 'var(--accent)' : 'var(--fg-muted)',
                }}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>

      {/* Bottom section */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8 }}>
        {me?.role === 'ADMIN' && (
          <Link
            href="/admin/users"
            style={{
              display: 'flex',
              width: '100%',
              justifyContent: 'flex-start',
              alignItems: 'center',
              gap: 10,
              padding: '9px 12px',
              borderRadius: 8,
              color: isActive('/admin') ? 'var(--accent)' : 'var(--fg-secondary)',
              background: isActive('/admin') ? 'rgba(99,102,241,0.1)' : 'transparent',
              textDecoration: 'none',
              font: 'var(--t-body)',
              fontWeight: isActive('/admin') ? 600 : 400,
              marginBottom: 2,
              boxSizing: 'border-box',
            }}
          >
            <span style={{ width: 18, textAlign: 'center', fontSize: 15, flexShrink: 0 }}>👥</span>
            <span>Users</span>
          </Link>
        )}
        {bottomItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            style={{
              display: 'flex',
              width: '100%',
              justifyContent: 'flex-start',
              alignItems: 'center',
              gap: 10,
              padding: '9px 12px',
              borderRadius: 8,
              color: isActive(item.href) ? 'var(--accent)' : 'var(--fg-secondary)',
              background: isActive(item.href) ? 'rgba(99,102,241,0.1)' : 'transparent',
              textDecoration: 'none',
              font: 'var(--t-body)',
              fontWeight: isActive(item.href) ? 600 : 400,
              marginBottom: 2,
              boxSizing: 'border-box',
            }}
          >
            <span style={{ width: 18, textAlign: 'center', fontSize: 15, flexShrink: 0 }}>
              {item.icon}
            </span>
            <span>{item.label}</span>
          </Link>
        ))}
      </div>

      {/* Footer: FY indicator + privacy note */}
      <div style={{
        padding: '12px 20px 16px',
        borderTop: '1px solid var(--border)',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          marginBottom: 6,
        }}>
          <span style={{
            width: 6, height: 6,
            background: 'var(--ok)',
            borderRadius: '50%',
            flexShrink: 0,
          }} />
          <span style={{ font: 'var(--t-caption)', color: 'var(--fg-muted)', fontWeight: 500 }}>
            {fy}
          </span>
        </div>
        <p style={{
          margin: 0,
          font: 'var(--t-caption)',
          color: 'var(--fg-muted)',
          lineHeight: 1.4,
          fontSize: 11,
        }}>
          🔒 Private by design
          <br />
          Your records stay in your account only.
        </p>
      </div>
    </nav>
  );
}
