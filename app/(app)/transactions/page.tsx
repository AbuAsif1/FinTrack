'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { PageHeader } from '@/components/ui/PageHeader';
import { TransactionModal } from '@/components/ui/TransactionModal';
import type { Category, SavingsAccount, LoanPerson, EditingTransaction } from '@/components/ui/TransactionModal';

// ── Types ──────────────────────────────────────────────────────────────────

interface Transaction {
  id: string;
  amount_paisa: number;
  date: string;
  description: string;
  category_id: string;
  category: Category;
  payment_method: string;
  routing?: {
    type: string;
    savings_account?: { id: string; name: string };
    loan_person?: { id: string; name: string };
    direction?: string;
    return_due_date?: string;
    fiscal_year?: string;
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────

function fmt(paisa: number) {
  return '৳' + (paisa / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

const PAYMENT_METHODS = ['CASH', 'BANK', 'BKASH', 'NAGAD', 'ROCKET', 'CARD'];


// ── Impact lines helper ────────────────────────────────────────────────────

function impactLines(tx: Transaction): string[] {
  const lines: string[] = ['• Transaction history will be updated.'];
  const r = tx.routing;
  if (!r || r.type === 'NONE') return lines;
  if (r.type === 'SAVINGS_DEPOSIT' || r.type === 'SAVINGS_WITHDRAWAL') {
    lines.push(`• Savings balance for "${r.savings_account?.name ?? 'linked account'}" will be recalculated.`);
  }
  if (r.type === 'LOAN_GIVEN' || r.type === 'LOAN_RECEIVED') {
    lines.push(`• Loan ledger for "${r.loan_person?.name ?? 'linked person'}" will be recalculated.`);
  }
  if (r.type === 'TAX') {
    lines.push(`• Tax investment records for ${r.fiscal_year ?? 'current FY'} will be updated.`);
  }
  return lines;
}

// ── Impact Confirm Modal ───────────────────────────────────────────────────

function ImpactConfirmModal({
  title,
  description,
  lines,
  confirmLabel,
  confirmDanger,
  onConfirm,
  onCancel,
}: {
  title: string;
  description: string;
  lines: string[];
  confirmLabel: string;
  confirmDanger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [busy, setBusy] = useState(false);

  async function handle() {
    setBusy(true);
    await onConfirm();
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 400 }}>
      <div style={{ background: 'var(--bg-surface)', borderRadius: 12, padding: 28, maxWidth: 440, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.35)' }}>
        <h3 style={{ font: 'var(--t-section)', marginBottom: 8 }}>{title}</h3>
        <p style={{ font: 'var(--t-body)', color: 'var(--fg-secondary)', marginBottom: 16 }}>{description}</p>
        <div style={{ background: 'var(--bg-raised)', borderRadius: 8, padding: '12px 16px', marginBottom: 20 }}>
          <div style={{ font: 'var(--t-label)', color: 'var(--fg-secondary)', marginBottom: 8 }}>WHAT WILL BE AFFECTED</div>
          {lines.map((l, i) => (
            <div key={i} style={{ font: 'var(--t-body)', color: 'var(--fg-primary)', marginBottom: 4 }}>{l}</div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel} disabled={busy}
            style={{ padding: '8px 20px', border: '1px solid var(--border)', borderRadius: 6, background: 'transparent', cursor: 'pointer', font: 'var(--t-body)' }}
          >
            Cancel
          </button>
          <button
            onClick={handle} disabled={busy}
            style={{ padding: '8px 20px', background: confirmDanger ? 'var(--danger)' : 'var(--accent)', color: '#fff', border: 'none', borderRadius: 6, cursor: busy ? 'not-allowed' : 'pointer', font: 'var(--t-body)', opacity: busy ? 0.7 : 1 }}
          >
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Bulk Delete Confirmation ───────────────────────────────────────────────

function BulkDeleteConfirm({
  ids,
  onCancel,
  onDeleted,
}: {
  ids: string[];
  onCancel: () => void;
  onDeleted: () => void;
}) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    if (ids.length === 1) {
      await api.delete(`/transactions/${ids[0]}`).catch(() => {});
    } else {
      await api.post('/transactions/bulk-delete', { ids }).catch(() => {});
    }
    onDeleted();
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300 }}>
      <div style={{ background: 'var(--bg-surface)', borderRadius: 12, padding: 24, maxWidth: 400, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <h3 style={{ font: 'var(--t-section)', marginBottom: 12 }}>Delete {ids.length} Transactions?</h3>
        <p style={{ font: 'var(--t-body)', color: 'var(--fg-secondary)', marginBottom: 20 }}>
          This cannot be undone. All linked loan entries and savings balances will also be reversed.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={{ padding: '8px 16px', border: '1px solid var(--border)', borderRadius: 6, background: 'transparent', cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleDelete} disabled={deleting} style={{ padding: '8px 16px', background: 'var(--danger)', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
            {deleting ? 'Deleting…' : `Delete ${ids.length}`}
          </button>
        </div>
      </div>
    </div>
  );
}


// ── Routing Indicator Row ──────────────────────────────────────────────────

function RoutingRow({ routing }: { routing: Transaction['routing'] }) {
  if (!routing || routing.type === 'NONE') return null;

  let text = '';
  let color = 'var(--fg-muted)';

  if (routing.type === 'SAVINGS_DEPOSIT' && routing.savings_account) {
    text = `→ Deposited to ${routing.savings_account.name}`;
  } else if (routing.type === 'SAVINGS_WITHDRAWAL' && routing.savings_account) {
    text = `→ Withdrawn from ${routing.savings_account.name}`;
    color = 'var(--ok)';
  } else if ((routing.type === 'LOAN_GIVEN' || routing.type === 'LOAN_RECEIVED') && routing.loan_person) {
    const dir = routing.direction === 'GIVEN' ? `They owe me` : `I owe them`;
    text = `→ ${routing.loan_person.name} ledger · ${dir}`;
    color = routing.direction === 'RECEIVED' ? 'var(--ok)' : 'var(--fg-muted)';
  } else if (routing.type === 'TAX') {
    text = `→ Recorded in ${routing.fiscal_year ?? 'current'} fiscal year`;
  }

  if (!text) return null;

  return (
    <div style={{ paddingLeft: 32, fontSize: 12, color, lineHeight: '20px' }}>{text}</div>
  );
}

// ── Budget Sidebar ─────────────────────────────────────────────────────────

interface BudgetItem {
  category_id: string;
  category_name: string;
  monthly_limit_paisa: number;
  spent_paisa: number;
  pct: number;
  state: 'ok' | 'warn' | 'over';
}

function BudgetSidebar({ onManage }: { onManage?: () => void }) {
  const [budgets, setBudgets] = useState<BudgetItem[]>([]);

  useEffect(() => {
    api.get('/budgets').then(({ data }) => setBudgets(Array.isArray(data) ? data : [])).catch(() => {});
  }, []);

  if (budgets.length === 0) {
    return (
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 16 }}>
        <div style={{ font: 'var(--t-label)', color: 'var(--fg-secondary)', marginBottom: 12 }}>BUDGET THIS MONTH</div>
        <div style={{ font: 'var(--t-body)', color: 'var(--fg-muted)', marginBottom: 12 }}>No budgets set yet.</div>
        <button onClick={onManage} style={{ font: 'var(--t-caption)', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          Manage budgets →
        </button>
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 16 }}>
      <div style={{ font: 'var(--t-label)', color: 'var(--fg-secondary)', marginBottom: 12 }}>BUDGET THIS MONTH</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {budgets.map((b) => {
          const color = b.state === 'over' ? 'var(--danger)' : b.state === 'warn' ? 'var(--warn)' : 'var(--ok)';
          const icon = b.state === 'over' ? '✕' : b.state === 'warn' ? '⚠' : '';
          const fillPct = Math.min(b.pct, 100);
          return (
            <div key={b.category_id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ font: 'var(--t-caption)', color: 'var(--fg-primary)' }}>{b.category_name}</span>
                <span style={{ font: 'var(--t-caption)', color }}>{b.pct}% {icon}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ font: 'var(--t-caption)', color: 'var(--fg-muted)', fontSize: 11 }}>
                  {fmt(b.spent_paisa)} / {fmt(b.monthly_limit_paisa)}
                </span>
              </div>
              <div style={{ height: 6, background: 'var(--bg-sunken)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${fillPct}%`, background: color, borderRadius: 3, transition: 'width 0.3s' }} />
              </div>
            </div>
          );
        })}
      </div>
      <button onClick={onManage} style={{ font: 'var(--t-caption)', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 14 }}>
        Manage budgets →
      </button>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [savingsAccounts, setSavingsAccounts] = useState<SavingsAccount[]>([]);
  const [loanPersons, setLoanPersons] = useState<LoanPerson[]>([]);
  const [fixedExpenses, setFixedExpenses] = useState<{ id: string; name: string; standard_amount_paisa: number; due_day: number }[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterMethod, setFilterMethod] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(25);

  // Selection
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Modals
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [deleteIds, setDeleteIds] = useState<string[] | null>(null);
  const router = useRouter();

  // Impact confirmation state
  const [removeConfirm, setRemoveConfirm] = useState<Transaction | null>(null);
  const [editConfirmPending, setEditConfirmPending] = useState<{
    proceed: () => Promise<void>;
    cancel: () => void;
    tx: Transaction;
  } | null>(null);

  // Row action popup (⚡ button)
  const [actionOpen, setActionOpen] = useState<string | null>(null);
  const [actionPos, setActionPos] = useState<{ top: number; right: number }>({ top: 0, right: 0 });
  const actionPopupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!actionOpen) return;
    function close(e: MouseEvent) {
      if (actionPopupRef.current && !actionPopupRef.current.contains(e.target as Node)) {
        setActionOpen(null);
      }
    }
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [actionOpen]);

  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', String(pageSize));
    if (search) params.set('search', search);
    if (filterCategory) params.set('category_id', filterCategory);
    if (filterMethod) params.set('payment_method', filterMethod);
    if (filterFrom) params.set('from', filterFrom);
    if (filterTo) params.set('to', filterTo);

    const { data } = await api.get(`/transactions?${params}`).catch(() => ({ data: null }));
    if (!data) { setLoading(false); return; }
    setTransactions(Array.isArray(data) ? data : (data.data ?? data.transactions ?? []));
    if (data.total != null) setTotal(data.total);
    setLoading(false);
  }, [page, pageSize, search, filterCategory, filterMethod, filterFrom, filterTo]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    // Load each independently so one failure doesn't block the others
    api.get('/categories').then(({ data }) => setCategories(Array.isArray(data) ? data : [])).catch(() => {});
    api.get('/savings-accounts').then(({ data }) => setSavingsAccounts(Array.isArray(data) ? data : (data?.accounts ?? []))).catch(() => {});
    api.get('/loan-persons').then(({ data }) => setLoanPersons(Array.isArray(data) ? data : [])).catch(() => {});
    api.get('/fixed-expenses').then(({ data }) => setFixedExpenses(Array.isArray(data) ? data : [])).catch(() => {});
  }, []);

  function clearFilters() {
    setSearch(''); setFilterCategory(''); setFilterMethod(''); setFilterFrom(''); setFilterTo('');
    setPage(1);
  }

  const hasFilters = search || filterCategory || filterMethod || filterFrom || filterTo;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const toggleSelect = (id: string) => setSelected((s) => {
    const n = new Set(s);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });
  const selectAll = () => setSelected(new Set(transactions.map((t) => t.id)));
  const clearSelect = () => setSelected(new Set());

  return (
    <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
      {/* Main content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <PageHeader
          eyebrow="Every entry, one clear view"
          title="Transactions"
          description="Search, filter, categorise and tag your records."
          actions={
            !isOnline ? (
              <span style={{ font: 'var(--t-caption)', color: 'var(--warn)', background: 'var(--warn-bg)', padding: '4px 10px', borderRadius: 999 }}>
                Offline
              </span>
            ) : undefined
          }
        />

        {/* Filter Bar */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px', marginBottom: 12 }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              type="search" placeholder="🔍 Search descriptions…"
              value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              style={{ flex: '1 1 180px', padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 6, font: 'var(--t-body)', background: 'var(--bg-sunken)' }}
            />
            <select
              value={filterCategory} onChange={(e) => { setFilterCategory(e.target.value); setPage(1); }}
              style={{ flex: '0 0 auto', padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 6, font: 'var(--t-body)', background: 'var(--bg-sunken)' }}
            >
              <option value="">All Categories</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select
              value={filterMethod} onChange={(e) => { setFilterMethod(e.target.value); setPage(1); }}
              style={{ flex: '0 0 auto', padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 6, font: 'var(--t-body)', background: 'var(--bg-sunken)' }}
            >
              <option value="">All Methods</option>
              {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            <input
              type="date" value={filterFrom} onChange={(e) => { setFilterFrom(e.target.value); setPage(1); }}
              style={{ flex: '0 0 auto', padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 6, font: 'var(--t-body)', background: 'var(--bg-sunken)' }}
            />
            <input
              type="date" value={filterTo} onChange={(e) => { setFilterTo(e.target.value); setPage(1); }}
              style={{ flex: '0 0 auto', padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 6, font: 'var(--t-body)', background: 'var(--bg-sunken)' }}
            />
            {hasFilters && (
              <button onClick={clearFilters} style={{ padding: '7px 12px', border: '1px solid var(--border)', borderRadius: 6, background: 'transparent', cursor: 'pointer', font: 'var(--t-caption)', color: 'var(--fg-secondary)' }}>
                Clear filters
              </button>
            )}
          </div>

          {/* Active filter chips */}
          {hasFilters && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
              {search && <Chip label={`"${search}"`} onRemove={() => setSearch('')} />}
              {filterCategory && <Chip label={categories.find((c) => c.id === filterCategory)?.name ?? filterCategory} onRemove={() => setFilterCategory('')} />}
              {filterMethod && <Chip label={filterMethod} onRemove={() => setFilterMethod('')} />}
              {filterFrom && <Chip label={`From ${filterFrom}`} onRemove={() => setFilterFrom('')} />}
              {filterTo && <Chip label={`To ${filterTo}`} onRemove={() => setFilterTo('')} />}
            </div>
          )}
        </div>

        {/* Summary */}
        <div style={{ font: 'var(--t-caption)', color: 'var(--fg-secondary)', marginBottom: 10, padding: '0 2px' }}>
          Showing {transactions.length} of {total} transactions
        </div>

        {/* Bulk actions */}
        {selected.size > 0 && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10, background: 'var(--bg-raised)', padding: '8px 12px', borderRadius: 8 }}>
            <span style={{ font: 'var(--t-caption)', color: 'var(--fg-secondary)' }}>{selected.size} selected</span>
            <button onClick={clearSelect} style={{ font: 'var(--t-caption)', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }}>Deselect all</button>
            <button
              onClick={() => setDeleteIds([...selected])}
              style={{ padding: '5px 12px', background: 'var(--danger)', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', font: 'var(--t-caption)' }}
            >
              Delete selected
            </button>
          </div>
        )}

        {/* Table */}
        <div className="table-scroll" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10 }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--fg-muted)', font: 'var(--t-body)' }}>Loading…</div>
          ) : transactions.length === 0 ? (
            <div style={{ padding: 60, textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
              <div style={{ font: 'var(--t-section)', marginBottom: 8 }}>No transactions yet</div>
              <div style={{ font: 'var(--t-body)', color: 'var(--fg-secondary)', marginBottom: 20 }}>Add your first entry to start tracking.</div>
              <button
                disabled={!isOnline}
                onClick={() => { setEditing(null); setShowModal(true); }}
                style={{ padding: '10px 20px', background: 'var(--accent)', color: 'var(--accent-fg)', border: 'none', borderRadius: 8, cursor: 'pointer', opacity: isOnline ? 1 : 0.5 }}
              >
                + Add Expenses
              </button>
            </div>
          ) : (
            <>
              {/* Table Header */}
              <div style={{ display: 'grid', gridTemplateColumns: '36px 90px 1fr 160px 90px 180px 56px', gap: 0, borderBottom: '2px solid var(--border)', padding: '10px 16px', background: 'var(--bg-raised)', minWidth: 620 }}>
                <div>
                  <input type="checkbox" checked={selected.size === transactions.length && transactions.length > 0} onChange={() => selected.size === transactions.length ? clearSelect() : selectAll()} />
                </div>
                <div style={{ font: 'var(--t-label)', color: 'var(--fg-secondary)' }}>DATE</div>
                <div style={{ font: 'var(--t-label)', color: 'var(--fg-secondary)' }}>DESCRIPTION</div>
                <div style={{ font: 'var(--t-label)', color: 'var(--fg-secondary)' }}>CATEGORY</div>
                <div style={{ font: 'var(--t-label)', color: 'var(--fg-secondary)' }}>METHOD</div>
                <div style={{ font: 'var(--t-label)', color: 'var(--fg-secondary)', textAlign: 'right' }}>AMOUNT</div>
                <div style={{ font: 'var(--t-label)', color: 'var(--fg-secondary)', textAlign: 'center' }}>ACTION</div>
              </div>

              {/* Rows */}
              {transactions.map((tx) => (
                <div key={tx.id}>
                  <div
                    style={{ display: 'grid', gridTemplateColumns: '36px 90px 1fr 160px 90px 180px 56px', gap: 0, padding: '12px 16px', borderBottom: '1px solid var(--border)', minWidth: 620 }}
                  >
                    <div>
                      <input type="checkbox" checked={selected.has(tx.id)} onChange={() => toggleSelect(tx.id)} />
                    </div>
                    <div style={{ font: 'var(--t-body)', color: 'var(--fg-secondary)' }}>{fmtDate(tx.date)}</div>
                    <div style={{ font: 'var(--t-body)', color: 'var(--fg-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.description}</div>
                    {(() => {
                      const cat = tx.category?.name ? tx.category : categories.find(c => c.id === tx.category_id);
                      const catColor = cat?.colorHex ?? (cat as any)?.color_hex ?? '#D1D5DB';
                      return (
                        <div style={{ font: 'var(--t-body)', color: 'var(--fg-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: catColor, marginRight: 6 }} />
                          {cat?.name ?? '—'}
                        </div>
                      );
                    })()}
                    <div style={{ font: 'var(--t-body)', color: 'var(--fg-secondary)' }}>{tx.payment_method}</div>
                    <div style={{ font: 'var(--t-data)', color: 'var(--danger)', textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                      −{fmt(tx.amount_paisa)}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                          setActionPos({ top: rect.bottom + 6, right: window.innerWidth - rect.right });
                          setActionOpen((prev) => prev === tx.id ? null : tx.id);
                        }}
                        style={{
                          background: actionOpen === tx.id ? 'var(--accent)' : 'none',
                          border: '1px solid var(--border)',
                          borderRadius: 6,
                          cursor: 'pointer',
                          color: actionOpen === tx.id ? 'var(--accent-fg)' : 'var(--fg-muted)',
                          fontSize: 14,
                          padding: '3px 7px',
                          lineHeight: 1,
                          transition: 'background 100ms',
                        }}
                        title="Actions"
                      >
                        ⚡
                      </button>
                    </div>
                  </div>
                  <RoutingRow routing={tx.routing} />
                </div>
              ))}

              {/* Pagination */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '12px 16px', borderTop: '1px solid var(--border)', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ font: 'var(--t-caption)', color: 'var(--fg-secondary)' }}>Rows per page:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                    style={{ padding: '4px 8px', border: '1px solid var(--border)', borderRadius: 6, font: 'var(--t-caption)', background: 'var(--bg-sunken)', color: 'var(--fg-primary)', cursor: 'pointer' }}
                  >
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={75}>75</option>
                    <option value={100}>100</option>
                  </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: '5px 10px', border: '1px solid var(--border)', borderRadius: 6, background: 'transparent', cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.4 : 1 }}>‹</button>
                  <span style={{ font: 'var(--t-caption)', color: 'var(--fg-secondary)' }}>{page} / {totalPages}</span>
                  <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ padding: '5px 10px', border: '1px solid var(--border)', borderRadius: 6, background: 'transparent', cursor: page === totalPages ? 'not-allowed' : 'pointer', opacity: page === totalPages ? 0.4 : 1 }}>›</button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Budget sidebar — hidden on mobile */}
      <div style={{ width: 320, flexShrink: 0 }} className="hidden-mobile">
        <BudgetSidebar onManage={() => router.push('/budgets')} />
      </div>

      {/* Modals */}
      {showModal && (
        <TransactionModal
          categories={categories}
          savingsAccounts={savingsAccounts}
          loanPersons={loanPersons}
          fixedExpenses={fixedExpenses}
          editing={editing as EditingTransaction | null}
          onClose={() => { setShowModal(false); setEditing(null); }}
          onSaved={() => {
            setShowModal(false); setEditing(null); load();
            api.get('/savings-accounts').then(({ data }) => setSavingsAccounts(Array.isArray(data) ? data : (data?.accounts ?? []))).catch(() => {});
          }}
          onRequestConfirm={editing ? (proceed, cancel) => {
            setEditConfirmPending({ proceed, cancel, tx: editing });
          } : undefined}
        />
      )}

      {/* Edit impact confirmation (appears on top of the edit modal) */}
      {editConfirmPending && (
        <ImpactConfirmModal
          title="Confirm Edit"
          description="Saving this change will update the transaction and all linked records."
          lines={impactLines(editConfirmPending.tx)}
          confirmLabel="Confirm & Save"
          onConfirm={async () => {
            const { proceed } = editConfirmPending;
            setEditConfirmPending(null);
            await proceed();
          }}
          onCancel={() => {
            editConfirmPending.cancel();
            setEditConfirmPending(null);
          }}
        />
      )}

      {/* Remove impact confirmation (single row) */}
      {removeConfirm && (
        <ImpactConfirmModal
          title="Remove Transaction?"
          description="This cannot be undone. All linked records will be reversed."
          lines={impactLines(removeConfirm)}
          confirmLabel="Remove"
          confirmDanger
          onConfirm={async () => {
            await api.delete(`/transactions/${removeConfirm.id}`).catch(() => {});
            setRemoveConfirm(null);
            load();
          }}
          onCancel={() => setRemoveConfirm(null)}
        />
      )}

      {/* Bulk delete (no routing detail available) */}
      {deleteIds && (
        <BulkDeleteConfirm
          ids={deleteIds}
          onCancel={() => setDeleteIds(null)}
          onDeleted={() => { setDeleteIds(null); setSelected(new Set()); load(); }}
        />
      )}

      {/* ⚡ Action popup */}
      {actionOpen && (
        <div
          ref={actionPopupRef}
          style={{
            position: 'fixed',
            top: actionPos.top,
            right: actionPos.right,
            zIndex: 300,
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            boxShadow: '0 6px 24px rgba(0,0,0,0.18)',
            overflow: 'hidden',
            minWidth: 130,
          }}
        >
          <button
            onClick={() => {
              const tx = transactions.find((t) => t.id === actionOpen);
              if (tx) { setEditing(tx); setShowModal(true); }
              setActionOpen(null);
            }}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              width: '100%', padding: '10px 16px',
              background: 'none', border: 'none', cursor: 'pointer',
              font: 'var(--t-body)', color: 'var(--fg-primary)',
              textAlign: 'left',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-raised)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
          >
            <span style={{ fontSize: 14 }}>✏️</span> Edit
          </button>
          <div style={{ height: 1, background: 'var(--border)', margin: '0 8px' }} />
          <button
            onClick={() => {
              const tx = transactions.find((t) => t.id === actionOpen);
              if (tx) setRemoveConfirm(tx);
              setActionOpen(null);
            }}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              width: '100%', padding: '10px 16px',
              background: 'none', border: 'none', cursor: 'pointer',
              font: 'var(--t-body)', color: 'var(--danger)',
              textAlign: 'left',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-raised)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
          >
            <span style={{ fontSize: 14 }}>🗑️</span> Remove
          </button>
        </div>
      )}
    </div>
  );
}

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 999, padding: '2px 10px', font: 'var(--t-caption)', color: 'var(--fg-secondary)' }}>
      {label}
      <button onClick={onRemove} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--fg-muted)', fontSize: 14, lineHeight: 1 }}>×</button>
    </span>
  );
}


