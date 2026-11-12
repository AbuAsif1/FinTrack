'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/', label: 'Dashboard', icon: '🏠' },
  { href: '/income', label: 'Income', icon: '💵' },
  { href: '/transactions', label: 'Transactions', icon: '💸' },
  { href: '/fixed-expenses', label: 'Fixed Expenses', icon: '📋' },
  { href: '/savings', label: 'Savings & DPS', icon: '🏦' },
  { href: '/loans', label: 'Loans', icon: '🤝' },
  { href: '/tax', label: 'Tax Dashboard', icon: '📊' },
  { href: '/history', label: 'History', icon: '📈' },
];

const bottomItems = [
  { href: '/settings', label: 'Settings', icon: '⚙' },
];

export function Sidebar() {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  }

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
        padding: '24px 0',
        flexShrink: 0,
      }}
    >
      <div style={{ padding: '0 20px 20px', font: 'var(--t-section)', color: 'var(--fg-primary)' }}>
        FinTrack BD
      </div>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, flex: 1 }}>
        {navItems.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 20px',
                color: isActive(item.href) ? 'var(--accent)' : 'var(--fg-secondary)',
                background: isActive(item.href) ? 'var(--bg-raised)' : 'transparent',
                borderLeft: isActive(item.href) ? '3px solid var(--accent)' : '3px solid transparent',
                textDecoration: 'none',
                font: 'var(--t-body)',
                minHeight: 44,
              }}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          </li>
        ))}
      </ul>
      <ul style={{ listStyle: 'none', margin: 0, padding: '8px 0 0', borderTop: '1px solid var(--border)' }}>
        {bottomItems.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 20px',
                color: isActive(item.href) ? 'var(--accent)' : 'var(--fg-secondary)',
                textDecoration: 'none',
                font: 'var(--t-body)',
                minHeight: 44,
              }}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
