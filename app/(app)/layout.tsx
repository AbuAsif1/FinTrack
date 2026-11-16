'use client';

import { Sidebar } from '@/components/nav/Sidebar';
import { BottomTabBar } from '@/components/nav/BottomTabBar';
import { NotificationBell } from '@/components/ui/NotificationDrawer';
import { TransactionModal, type Category, type SavingsAccount, type LoanPerson, type FixedExpenseTemplate } from '@/components/ui/TransactionModal';
import { IncomeModal } from '@/components/ui/IncomeModal';
import type { SavingsAccount as IncomeSavingsAccount } from '@/components/ui/IncomeModal';
import { useEffect, useState, useCallback, useContext } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { tryRestoreSession } from '@/lib/api';
import api from '@/lib/api';
import Link from 'next/link';
import { useTheme } from '@/components/theme-provider';
import { PageDescriptionProvider, PageDescriptionContext } from '@/components/ui/PageDescriptionContext';
import { GlobalModalsContext } from '@/components/ui/GlobalModalsContext';

const PAGE_TITLE: Record<string, string> = {
  '/':               'Dashboard',
  '/income':         'Income',
  '/transactions':   'Transactions',
  '/budgets':        'Budgets',
  '/fixed-expenses': 'Fixed Expenses',
  '/savings':        'Bank & Wallet',
  '/loans':          'Loans',
  '/tax':            'Tax',
  '/history':        'History',
  '/settings':       'Settings',
  '/profile':        'My Profile',
};

function getPageTitle(pathname: string): string {
  if (PAGE_TITLE[pathname]) return PAGE_TITLE[pathname];
  for (const [prefix, title] of Object.entries(PAGE_TITLE)) {
    if (prefix !== '/' && pathname.startsWith(prefix)) return title;
  }
  return 'FinTrack';
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const isDark = theme === 'dark' || (theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  function toggle() {
    setTheme(isDark ? 'light' : 'dark');
  }

  return (
    <button
      onClick={toggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Light mode' : 'Dark mode'}
      style={{
        background: 'var(--bg-raised)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: '5px 10px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        font: '500 12px var(--font-inter, system-ui)',
        color: 'var(--fg-secondary)',
      }}
    >
      {isDark ? (
        <>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          </svg>
          Light
        </>
      ) : (
        <>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
          Dark
        </>
      )}
    </button>
  );
}

function TopBar({ pathname, openAddIncome, openAdd, unreadCount, onCountChange }: {
  pathname: string;
  openAddIncome: () => void;
  openAdd: () => void;
  unreadCount: number;
  onCountChange: (n: number) => void;
}) {
  const { description } = useContext(PageDescriptionContext);
  return (
    <div className="app-topbar">
      {/* Page title + inline description */}
      <div style={{ marginRight: 'auto', display: 'flex', alignItems: 'baseline', gap: 10, minWidth: 0, overflow: 'hidden' }}>
        <span style={{ font: '600 18px var(--font-space-grotesk, system-ui)', color: 'var(--fg-primary)', flexShrink: 0 }}>
          {getPageTitle(pathname)}
        </span>
        {description && (
          <span style={{ font: 'var(--t-caption)', color: 'var(--fg-muted)', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {description}
          </span>
        )}
      </div>
      {/* Search bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: 'var(--bg-raised)', border: '1px solid var(--border)',
        borderRadius: 8, padding: '6px 14px', minWidth: 180,
      }}>
        <span style={{ color: 'var(--fg-muted)', fontSize: 13 }}>🔍</span>
        <span style={{ font: 'var(--t-body)', color: 'var(--fg-muted)', fontSize: 13 }}>Search…</span>
      </div>
      {/* Action buttons */}
      <button onClick={openAddIncome} className="btn-secondary" style={{ fontSize: 12, padding: '6px 12px' }}>+ Add Income</button>
      <button onClick={openAdd} className="btn-primary" style={{ fontSize: 12, padding: '6px 12px' }}>+ Add Expenses</button>
      <ThemeToggle />
      <NotificationBell unreadCount={unreadCount} onCountChange={onCountChange} />
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Global add expenses modal
  const [showAdd, setShowAdd] = useState(false);
  const [modalCategories, setModalCategories] = useState<Category[]>([]);
  const [modalAccounts, setModalAccounts] = useState<SavingsAccount[]>([]);
  const [modalPersons, setModalPersons] = useState<LoanPerson[]>([]);
  const [modalFixedExpenses, setModalFixedExpenses] = useState<FixedExpenseTemplate[]>([]);
  const [modalDataLoaded, setModalDataLoaded] = useState(false);

  // Global add income modal
  const [showAddIncome, setShowAddIncome] = useState(false);
  const [incomeAccounts, setIncomeAccounts] = useState<IncomeSavingsAccount[]>([]);
  const [incomeDataLoaded, setIncomeDataLoaded] = useState(false);

  const openAdd = useCallback(async () => {
    setShowAdd(true);
    if (!modalDataLoaded) {
      await Promise.all([
        api.get('/categories').then(({ data }) => setModalCategories(Array.isArray(data) ? data : [])).catch(() => {}),
        api.get('/savings-accounts').then(({ data }) => {
          const list = Array.isArray(data) ? data : (data?.accounts ?? []);
          setModalAccounts(list);
        }).catch(() => {}),
        api.get('/loan-persons').then(({ data }) => setModalPersons(Array.isArray(data) ? data : [])).catch(() => {}),
        api.get('/fixed-expenses').then(({ data }) => setModalFixedExpenses(Array.isArray(data) ? data : [])).catch(() => {}),
      ]);
      setModalDataLoaded(true);
    }
  }, [modalDataLoaded]);

  const openAddIncome = useCallback(async () => {
    setShowAddIncome(true);
    if (!incomeDataLoaded) {
      api.get('/savings-accounts').then(({ data }) => {
        const list = Array.isArray(data) ? data : (data?.accounts ?? []);
        setIncomeAccounts(list);
      }).catch(() => {});
      setIncomeDataLoaded(true);
    }
  }, [incomeDataLoaded]);

  useEffect(() => {
    tryRestoreSession().then((ok) => {
      if (!ok) {
        router.replace('/login');
      } else {
        setReady(true);
        api.get<{ unread_notification_count: number }>('/dashboard/summary').then(({ data }) => {
          setUnreadCount(data.unread_notification_count ?? 0);
        }).catch(() => { /* ignore */ });
      }
    });
  }, [router]);

  if (!ready) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <span style={{ color: 'var(--fg-muted)', font: 'var(--t-body)' }}>Loading…</span>
      </div>
    );
  }

  return (
    <PageDescriptionProvider>
    <GlobalModalsContext.Provider value={{ openAdd, openAddIncome }}>
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Desktop sidebar — hidden on mobile via CSS (.sidebar-desktop sets display:contents, media query overrides to none) */}
      <div className="sidebar-desktop">
        <Sidebar />
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        {/* Mobile-only top bar — uses bottom-nav-mobile class so it hides on desktop with the same CSS rule */}
        <header
          className="bottom-nav-mobile"
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 50,
            background: 'var(--bg-surface)',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 16px',
            height: 52,
          }}
        >
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
            <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
              <rect width="32" height="32" rx="8" fill="#299D91"/>
              <polyline points="3,24 8,17 13,20 20,11 29,7" stroke="rgba(255,255,255,0.28)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
              <polyline points="24,7 29,7 29,12" stroke="rgba(255,255,255,0.28)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
              <text x="16" y="21.5" textAnchor="middle" fontFamily="system-ui, sans-serif" fontWeight="800" fontSize="12" fill="#FFFFFF" letterSpacing="0.5">FT</text>
            </svg>
            <span style={{ font: '600 15px var(--font-space-grotesk, system-ui)', color: 'var(--fg-primary)' }}>
              FinTrack
            </span>
          </Link>
          <NotificationBell unreadCount={unreadCount} onCountChange={setUnreadCount} />
        </header>

        {/* Desktop sticky top action bar */}
        <TopBar pathname={pathname} openAddIncome={openAddIncome} openAdd={openAdd} unreadCount={unreadCount} onCountChange={setUnreadCount} />

        <main className="main-content">
          {children}
        </main>
      </div>

      {/* Mobile bottom bar */}
      <div className="bottom-nav-mobile">
        <BottomTabBar />
      </div>

      {/* Global add income modal */}
      {showAddIncome && (
        <IncomeModal
          open={showAddIncome}
          onClose={() => setShowAddIncome(false)}
          onSaved={() => setShowAddIncome(false)}
          savingsAccounts={incomeAccounts}
        />
      )}

      {/* Global add expenses modal */}
      {showAdd && (
        <TransactionModal
          categories={modalCategories}
          savingsAccounts={modalAccounts}
          loanPersons={modalPersons}
          fixedExpenses={modalFixedExpenses}
          editing={null}
          onClose={() => setShowAdd(false)}
          onSaved={() => {
            setShowAdd(false);
            // Refresh accounts so balances stay accurate after a transfer
            api.get('/savings-accounts').then(({ data }) => {
              const list = Array.isArray(data) ? data : (data?.accounts ?? []);
              setModalAccounts(list);
            }).catch(() => {});
          }}
        />
      )}
    </div>
    </GlobalModalsContext.Provider>
    </PageDescriptionProvider>
  );
}
