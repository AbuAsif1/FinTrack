'use client';

import { Sidebar } from '@/components/nav/Sidebar';
import { BottomTabBar } from '@/components/nav/BottomTabBar';
import { NotificationBell } from '@/components/ui/NotificationDrawer';
import { TransactionModal, type Category, type SavingsAccount, type LoanPerson, type FixedExpenseTemplate } from '@/components/ui/TransactionModal';
import { IncomeModal } from '@/components/ui/IncomeModal';
import type { SavingsAccount as IncomeSavingsAccount } from '@/components/ui/IncomeModal';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { tryRestoreSession } from '@/lib/api';
import api from '@/lib/api';
import Link from 'next/link';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
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
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Desktop sidebar — hidden on mobile via CSS */}
      <div className="sidebar-desktop" style={{ display: 'contents' }}>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon-32.png" alt="" width={28} height={28} style={{ borderRadius: 7 }} />
            <span style={{ font: '600 15px var(--font-space-grotesk, system-ui)', color: 'var(--fg-primary)' }}>
              FinTrack
            </span>
          </div>
          <NotificationBell unreadCount={unreadCount} onCountChange={setUnreadCount} />
        </header>

        {/* Desktop sticky top action bar */}
        <div className="app-topbar">
          <button onClick={openAddIncome} className="btn-secondary">+ Add Income</button>
          <Link href="/fixed-expenses?action=mark-paid" className="btn-secondary">✓ Mark Fixed Paid</Link>
          <button
            onClick={openAdd}
            className="btn-primary"
          >
            + Add Expenses
          </button>
          <NotificationBell unreadCount={unreadCount} onCountChange={setUnreadCount} />
        </div>

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
  );
}
