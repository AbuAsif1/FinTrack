'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import api from '@/lib/api';

// Inline SVG icons — 20×20 viewBox, stroke-based
function IconDashboard({ color }: { color: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
    </svg>
  );
}
function IconIncome({ color }: { color: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" />
    </svg>
  );
}
function IconTransactions({ color }: { color: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <polyline points="7 23 3 19 7 15" /><path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
  );
}
function IconBudgets({ color }: { color: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a10 10 0 0 1 0 20" fill={color} fillOpacity="0.25" stroke="none" />
      <line x1="12" y1="2" x2="12" y2="22" /><line x1="2" y1="12" x2="22" y2="12" />
    </svg>
  );
}
function IconFixedExpenses({ color }: { color: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  );
}
function IconWallet({ color }: { color: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M16 12h2" strokeLinecap="round" />
      <circle cx="17" cy="12" r="1" fill={color} />
    </svg>
  );
}
function IconLoans({ color }: { color: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill={color} fillOpacity="0.3" />
    </svg>
  );
}
function IconTax({ color }: { color: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="9" y1="13" x2="15" y2="13" /><line x1="9" y1="17" x2="12" y2="17" />
    </svg>
  );
}
function IconHistory({ color }: { color: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="12 8 12 12 14 14" />
      <path d="M3.05 11a9 9 0 1 1 .5 4m-.5-4v-4l4 4" />
    </svg>
  );
}
function IconSettings({ color }: { color: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}
function IconUsers({ color }: { color: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

const navItems = [
  { href: '/',               label: 'Dashboard',      Icon: IconDashboard,     color: '#9CA3AF' },
  { href: '/income',         label: 'Income',          Icon: IconIncome,        color: '#10B981' },
  { href: '/transactions',   label: 'Transactions',    Icon: IconTransactions,  color: '#60A5FA' },
  { href: '/budgets',        label: 'Budgets',         Icon: IconBudgets,       color: '#A78BFA' },
  { href: '/fixed-expenses', label: 'Fixed Expenses',  Icon: IconFixedExpenses, color: '#F59E0B' },
  { href: '/savings',        label: 'Bank & Wallet',   Icon: IconWallet,        color: '#34D399' },
  { href: '/loans',          label: 'Loans',           Icon: IconLoans,         color: '#FBBF24' },
  { href: '/tax',            label: 'Tax',             Icon: IconTax,           color: '#F87171' },
  { href: '/history',        label: 'History',         Icon: IconHistory,       color: '#FB923C' },
];

const bottomItems = [
  { href: '/settings', label: 'Settings', Icon: IconSettings, color: '#9CA3AF' },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: () => api.get<{ id: string; role: string; name?: string }>('/me').then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });

  const [avatarSrc, setAvatarSrc] = useState<string | null>(null);
  useEffect(() => {
    if (!me?.id) return;
    try {
      const saved = localStorage.getItem(`fintrack_avatar_${me.id}`);
      setAvatarSrc(saved ?? null);
    } catch { /* storage blocked */ }
  }, [me?.id]);

  function isActive(href: string) {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  }

  return (
    <nav
      aria-label="Main navigation"
      style={{
        width: 240,
        background: 'var(--sidebar-bg, #191919)',
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
      <div style={{ padding: '20px 16px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
            <rect width="32" height="32" rx="8" fill="#299D91"/>
            {/* Upward financial trend mark */}
            <polyline points="3,24 8,17 13,20 20,11 29,7" stroke="rgba(255,255,255,0.28)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            <polyline points="24,7 29,7 29,12" stroke="rgba(255,255,255,0.28)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            <text x="16" y="21.5" textAnchor="middle" fontFamily="system-ui, sans-serif" fontWeight="800" fontSize="12" fill="#FFFFFF" letterSpacing="0.5">FT</text>
          </svg>
          <div>
            <div style={{ font: '600 15px var(--font-space-grotesk, system-ui)', color: '#FFFFFF', lineHeight: 1.2 }}>
              FinTrack
            </div>
            <div style={{ font: '400 11px var(--font-inter, system-ui)', color: 'var(--sidebar-fg, #999)', lineHeight: 1.2 }}>
              Personal finance
            </div>
          </div>
        </div>
      </div>

      {/* Nav items */}
      <ul style={{ listStyle: 'none', margin: 0, padding: '4px 0', flex: 1 }}>
        {navItems.map((item) => {
          const active = isActive(item.href);
          const iconColor = active ? '#fff' : item.color;
          return (
            <li key={item.href} style={{ marginBottom: 2, padding: '0 8px' }}>
              <Link
                href={item.href}
                style={{
                  display: 'flex',
                  width: '100%',
                  boxSizing: 'border-box',
                  alignItems: 'center',
                  gap: 10,
                  padding: '9px 12px',
                  borderRadius: 8,
                  color: active ? '#fff' : '#D1D5DB',
                  background: active ? '#299D91' : 'transparent',
                  textDecoration: 'none',
                  font: '400 13px var(--font-inter, system-ui)',
                  fontWeight: active ? 600 : 400,
                  transition: 'background 120ms, color 120ms',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                  <item.Icon color={iconColor} />
                </span>
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>

      {/* Divider */}
      <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '0 10px 8px' }} />

      {/* Bottom nav */}
      <div style={{ padding: '0 8px 8px' }}>
        {me?.role === 'ADMIN' && (
          <Link
            href="/admin/users"
            style={{
              display: 'flex', width: '100%', boxSizing: 'border-box',
              alignItems: 'center', gap: 10,
              padding: '9px 12px', borderRadius: 8, marginBottom: 2,
              color: isActive('/admin') ? '#fff' : '#D1D5DB',
              background: isActive('/admin') ? '#299D91' : 'transparent',
              textDecoration: 'none',
              font: `${isActive('/admin') ? 600 : 400} 13px var(--font-inter, system-ui)`,
              transition: 'background 120ms',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
              <IconUsers color={isActive('/admin') ? '#fff' : '#60A5FA'} />
            </span>
            <span>Users</span>
          </Link>
        )}
        {bottomItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'flex', width: '100%', boxSizing: 'border-box',
                alignItems: 'center', gap: 10,
                padding: '9px 12px', borderRadius: 8, marginBottom: 2,
                color: active ? '#fff' : '#D1D5DB',
                background: active ? '#299D91' : 'transparent',
                textDecoration: 'none',
                font: `${active ? 600 : 400} 13px var(--font-inter, system-ui)`,
                transition: 'background 120ms',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                <item.Icon color={active ? '#fff' : item.color} />
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>

      {/* User profile footer */}
      <div style={{ padding: '12px 16px 16px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <Link
          href="/profile"
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            textDecoration: 'none', borderRadius: 8, padding: '4px 0',
          }}
        >
          {avatarSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarSrc} alt={me?.name ?? 'Avatar'} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
          ) : (
            <div style={{
              width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
              background: '#299D91',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, color: '#fff', fontWeight: 700,
            }}>
              {me?.name ? me.name[0].toUpperCase() : 'U'}
            </div>
          )}
          <div style={{ minWidth: 0 }}>
            <div style={{ font: '500 13px var(--font-inter, system-ui)', color: '#FFFFFF', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {me?.name ?? 'My Account'}
            </div>
            <div style={{ font: '400 11px var(--font-inter, system-ui)', color: 'var(--sidebar-fg, #999)', lineHeight: 1.2 }}>
              View profile
            </div>
          </div>
        </Link>
      </div>
    </nav>
  );
}
