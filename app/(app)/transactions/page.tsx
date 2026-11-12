'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import api from '@/lib/api';

// ── Types ──────────────────────────────────────────────────────────────────

interface Category {
  id: string;
  name: string;
  colorHex: string;
  routing_type: string;
  savings_account?: { id: string; name: string } | null;
}

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

interface SavingsAccount {
  id: string;
  name: string;
  account_number?: string;
}

interface LoanPerson {
  id: string;
  name: string;
}

interface TransactionForm {
  amount_paisa: string;
  date: string;
  description: string;
  category_id: string;
  payment_method: string;
  savings_account_id: string;
  loan_person_name: string;
  loan_direction: string;
  loan_reason: string;
  loan_return_due_date: string;
  idempotency_key: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function fmt(paisa: number) {
  return '৳' + (paisa / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function genKey() {
  return crypto.randomUUID();
}

const PAYMENT_METHODS = ['CASH', 'BANK', 'BKASH', 'NAGAD', 'ROCKET', 'CARD'];

// ── Add / Edit Modal ───────────────────────────────────────────────────────

function TransactionModal({
  categories,
  savingsAccounts,
  loanPersons,
  editing,
  onClose,
  onSaved,
}: {
  categories: Category[];
  savingsAccounts: SavingsAccount[];
  loanPersons: LoanPerson[];
  editing: Transaction | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!editing;
  const [form, setForm] = useState<TransactionForm>(() => ({
    amount_paisa: editing ? String(editing.amount_paisa / 100) : '',
    date: editing ? editing.date.slice(0, 10) : todayIso(),
    description: editing?.description ?? '',
    category_id: editing?.category_id ?? '',
    payment_method: editing?.payment_method ?? 'CASH',
    savings_account_id: editing?.routing?.savings_account?.id ?? '',
    loan_person_name: editing?.routing?.loan_person?.name ?? '',
    loan_direction: editing?.routing?.direction ?? 'GIVEN',
    loan_reason: '',
    loan_return_due_date: editing?.routing?.return_due_date?.slice(0, 10) ?? '',
    idempotency_key: genKey(),
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const selectedCat = categories.find((c) => c.id === form.category_id);
  const routingType = selectedCat?.routing_type ?? 'NONE';
  const isSavings = routingType === 'SAVINGS_DEPOSIT' || routingType === 'SAVINGS_WITHDRAWAL';
  const isLoan = routingType === 'LOAN_GIVEN' || routingType === 'LOAN_RECEIVED';
  const isTax = routingType === 'TAX';

  const set = (k: keyof TransactionForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');

    const amountPaisa = Math.round(parseFloat(form.amount_paisa) * 100);
    if (isNaN(amountPaisa) || amountPaisa <= 0) {
      setError('Enter a valid amount.');
      setSaving(false);
      return;
    }

    const body: Record<string, unknown> = {
      amount_paisa: amountPaisa,
      date: form.date,
      description: form.description,
      category_id: form.category_id,
      payment_method: form.payment_method,
      idempotency_key: form.idempotency_key,
    };
    if (isSavings && form.savings_account_id) body.savings_account_id = form.savings_account_id;
    if (isLoan) {
      body.loan_person_name = form.loan_person_name;
      if (form.loan_reason) body.reason = form.loan_reason;
      if (form.loan_return_due_date) body.return_due_date = form.loan_return_due_date;
    }

    try {
      if (isEdit) {
        await api.patch(`/transactions/${editing!.id}`, body);
      } else {
        await api.post('/transactions', body);
      }
      onSaved();
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 409) { onSaved(); return; }
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to save transaction.';
      setError(msg);
      setSaving(false);
    }
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: 'var(--bg-surface)', borderRadius: 12, padding: 28,
        width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}>
        <h2 style={{ font: 'var(--t-section)', marginBottom: 20 }}>
          {isEdit ? 'Edit Transaction' : 'Add Spending'}
        </h2>

        <form onSubmit={submit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <label>
              <div style={{ font: 'var(--t-label)', marginBottom: 4 }}>Amount (৳)</div>
              <input
                type="number" step="0.01" min="0.01" required
                value={form.amount_paisa} onChange={set('amount_paisa')}
                style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 6, font: 'var(--t-body)', background: 'var(--bg-sunken)', boxSizing: 'border-box' }}
              />
            </label>
            <label>
              <div style={{ font: 'var(--t-label)', marginBottom: 4 }}>Date</div>
              <input
                type="date" required
                value={form.date} onChange={set('date')}
                style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 6, font: 'var(--t-body)', background: 'var(--bg-sunken)', boxSizing: 'border-box' }}
              />
            </label>
          </div>

          <label style={{ display: 'block', marginBottom: 12 }}>
            <div style={{ font: 'var(--t-label)', marginBottom: 4 }}>Description</div>
            <input
              type="text" required
              value={form.description} onChange={set('description')}
              style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 6, font: 'var(--t-body)', background: 'var(--bg-sunken)', boxSizing: 'border-box' }}
            />
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <label>
              <div style={{ font: 'var(--t-label)', marginBottom: 4 }}>Category</div>
              <select
                required value={form.category_id} onChange={set('category_id')}
                style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 6, font: 'var(--t-body)', background: 'var(--bg-sunken)', boxSizing: 'border-box' }}
              >
                <option value="">Select category…</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </label>
            <label>
              <div style={{ font: 'var(--t-label)', marginBottom: 4 }}>Payment Method</div>
              <select
                value={form.payment_method} onChange={set('payment_method')}
                style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 6, font: 'var(--t-body)', background: 'var(--bg-sunken)', boxSizing: 'border-box' }}
              >
                {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </label>
          </div>

          {/* Routing notice */}
          {isSavings && (
            <div style={{ background: 'rgba(58,95,205,0.08)', borderLeft: '3px solid var(--accent)', borderRadius: 6, padding: '10px 14px', marginBottom: 12 }}>
              <div style={{ font: 'var(--t-caption)', color: 'var(--accent)', marginBottom: 6 }}>
                🔵 This will {routingType === 'SAVINGS_DEPOSIT' ? 'deposit into' : 'withdraw from'} your savings account.
              </div>
              <label>
                <div style={{ font: 'var(--t-label)', marginBottom: 4 }}>Savings Account</div>
                <select
                  required value={form.savings_account_id} onChange={set('savings_account_id')}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 6, font: 'var(--t-body)', background: 'var(--bg-sunken)', boxSizing: 'border-box' }}
                >
                  <option value="">Select account…</option>
                  {savingsAccounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </label>
            </div>
          )}

          {isLoan && (
            <div style={{ background: 'rgba(58,95,205,0.08)', borderLeft: '3px solid var(--accent)', borderRadius: 6, padding: '10px 14px', marginBottom: 12 }}>
              <div style={{ font: 'var(--t-caption)', color: 'var(--accent)', marginBottom: 8 }}>
                🤝 This will update the loan ledger.
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 8 }}>
                <label>
                  <div style={{ font: 'var(--t-label)', marginBottom: 4 }}>Person</div>
                  <input
                    type="text" required placeholder="Name (creates person if new)"
                    value={form.loan_person_name} onChange={set('loan_person_name')}
                    list="loan-persons-list"
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 6, font: 'var(--t-body)', background: 'var(--bg-sunken)', boxSizing: 'border-box' }}
                  />
                  <datalist id="loan-persons-list">
                    {loanPersons.map((p) => <option key={p.id} value={p.name} />)}
                  </datalist>
                </label>
                <label>
                  <div style={{ font: 'var(--t-label)', marginBottom: 4 }}>Direction</div>
                  <select
                    value={form.loan_direction} onChange={set('loan_direction')}
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 6, font: 'var(--t-body)', background: 'var(--bg-sunken)', boxSizing: 'border-box' }}
                  >
                    <option value="GIVEN">I gave</option>
                    <option value="RECEIVED">I received</option>
                  </select>
                </label>
              </div>
              <label style={{ display: 'block', marginBottom: 8 }}>
                <div style={{ font: 'var(--t-label)', marginBottom: 4 }}>Reason (optional)</div>
                <input
                  type="text" value={form.loan_reason} onChange={set('loan_reason')}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 6, font: 'var(--t-body)', background: 'var(--bg-sunken)', boxSizing: 'border-box' }}
                />
              </label>
              <label style={{ display: 'block' }}>
                <div style={{ font: 'var(--t-label)', marginBottom: 4 }}>Return due date (optional)</div>
                <input
                  type="date" value={form.loan_return_due_date} onChange={set('loan_return_due_date')}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 6, font: 'var(--t-body)', background: 'var(--bg-sunken)', boxSizing: 'border-box' }}
                />
              </label>
            </div>
          )}

          {isTax && (
            <div style={{ background: 'rgba(58,95,205,0.08)', borderLeft: '3px solid var(--accent)', borderRadius: 6, padding: '10px 14px', marginBottom: 12 }}>
              <div style={{ font: 'var(--t-caption)', color: 'var(--accent)' }}>
                📋 This transaction will be recorded against the current Fiscal Year.
              </div>
            </div>
          )}

          {error && (
            <div style={{ color: 'var(--danger)', font: 'var(--t-caption)', marginBottom: 10 }}>{error}</div>
          )}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" onClick={onClose} style={{ padding: '8px 20px', border: '1px solid var(--border)', borderRadius: 6, background: 'transparent', cursor: 'pointer', font: 'var(--t-body)' }}>
              Cancel
            </button>
            <button
              type="submit" disabled={saving}
              style={{ padding: '8px 20px', background: 'var(--accent)', color: 'var(--accent-fg)', border: 'none', borderRadius: 6, cursor: saving ? 'not-allowed' : 'pointer', font: 'var(--t-body)', opacity: saving ? 0.7 : 1 }}
            >
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Save Transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Delete Confirmation ────────────────────────────────────────────────────

function DeleteConfirm({
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
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60 }}>
      <div style={{ background: 'var(--bg-surface)', borderRadius: 12, padding: 24, maxWidth: 400, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <h3 style={{ font: 'var(--t-section)', marginBottom: 12 }}>Delete {ids.length === 1 ? 'Transaction' : `${ids.length} Transactions`}?</h3>
        <p style={{ font: 'var(--t-body)', color: 'var(--fg-secondary)', marginBottom: 20 }}>
          This cannot be undone. Any linked loan entries or savings balance changes will also be reversed.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={{ padding: '8px 16px', border: '1px solid var(--border)', borderRadius: 6, background: 'transparent', cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleDelete} disabled={deleting} style={{ padding: '8px 16px', background: 'var(--danger)', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
            {deleting ? 'Deleting…' : 'Delete'}
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

function BudgetSidebar({ onManage }: { onManage: () => void }) {
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
  const PAGE_SIZE = 20;

  // Selection
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Modals
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [deleteIds, setDeleteIds] = useState<string[] | null>(null);
  const [showBudgets, setShowBudgets] = useState(false);

  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', String(PAGE_SIZE));
    if (search) params.set('search', search);
    if (filterCategory) params.set('category_id', filterCategory);
    if (filterMethod) params.set('payment_method', filterMethod);
    if (filterFrom) params.set('from', filterFrom);
    if (filterTo) params.set('to', filterTo);

    const { data } = await api.get(`/transactions?${params}`).catch(() => ({ data: null }));
    if (!data) { setLoading(false); return; }
    setTransactions(Array.isArray(data) ? data : data.transactions ?? []);
    if (data.total != null) setTotal(data.total);
    setLoading(false);
  }, [page, search, filterCategory, filterMethod, filterFrom, filterTo]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    Promise.all([
      api.get('/categories').then(({ data }) => data),
      api.get('/savings-accounts').then(({ data }) => data),
      api.get('/loan-persons').then(({ data }) => data),
    ]).then(([cats, accs, persons]) => {
      setCategories(Array.isArray(cats) ? cats : []);
      setSavingsAccounts(Array.isArray(accs) ? accs : (accs?.accounts ?? []));
      setLoanPersons(Array.isArray(persons) ? persons : []);
    }).catch(() => {});
  }, []);

  function clearFilters() {
    setSearch(''); setFilterCategory(''); setFilterMethod(''); setFilterFrom(''); setFilterTo('');
    setPage(1);
  }

  const hasFilters = search || filterCategory || filterMethod || filterFrom || filterTo;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const toggleSelect = (id: string) => setSelected((s) => {
    const n = new Set(s);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });
  const selectAll = () => setSelected(new Set(transactions.map((t) => t.id)));
  const clearSelect = () => setSelected(new Set());

  if (showBudgets) return <BudgetsPage onBack={() => setShowBudgets(false)} />;

  return (
    <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
      {/* Main content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h1 style={{ font: 'var(--t-page)', margin: 0 }}>Transactions</h1>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {!isOnline && (
              <span style={{ font: 'var(--t-caption)', color: 'var(--warn)', background: 'var(--warn-bg)', padding: '4px 10px', borderRadius: 999 }}>
                Offline — submitting disabled
              </span>
            )}
            <button
              disabled={!isOnline}
              onClick={() => { setEditing(null); setShowModal(true); }}
              style={{ padding: '8px 16px', background: 'var(--accent)', color: 'var(--accent-fg)', border: 'none', borderRadius: 8, cursor: isOnline ? 'pointer' : 'not-allowed', font: 'var(--t-body)', opacity: isOnline ? 1 : 0.5 }}
            >
              + Add Spending
            </button>
          </div>
        </div>

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
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
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
                style={{ padding: '10px 20px', background: 'var(--accent)', color: 'var(--accent-fg)', border: 'none', borderRadius: 8, cursor: 'pointer' }}
              >
                + Add Transaction
              </button>
            </div>
          ) : (
            <>
              {/* Table Header */}
              <div style={{ display: 'grid', gridTemplateColumns: '36px 90px 1fr 160px 100px 120px 44px', gap: 0, borderBottom: '2px solid var(--border)', padding: '10px 16px', background: 'var(--bg-raised)' }}>
                <div>
                  <input type="checkbox" checked={selected.size === transactions.length && transactions.length > 0} onChange={() => selected.size === transactions.length ? clearSelect() : selectAll()} />
                </div>
                <div style={{ font: 'var(--t-label)', color: 'var(--fg-secondary)' }}>DATE</div>
                <div style={{ font: 'var(--t-label)', color: 'var(--fg-secondary)' }}>DESCRIPTION</div>
                <div style={{ font: 'var(--t-label)', color: 'var(--fg-secondary)' }}>CATEGORY</div>
                <div style={{ font: 'var(--t-label)', color: 'var(--fg-secondary)' }}>METHOD</div>
                <div style={{ font: 'var(--t-label)', color: 'var(--fg-secondary)', textAlign: 'right' }}>AMOUNT</div>
                <div />
              </div>

              {/* Rows */}
              {transactions.map((tx) => (
                <div key={tx.id}>
                  <div
                    style={{ display: 'grid', gridTemplateColumns: '36px 90px 1fr 160px 100px 120px 44px', gap: 0, padding: '12px 16px', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                    onClick={() => { setEditing(tx); setShowModal(true); }}
                  >
                    <div onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={selected.has(tx.id)} onChange={() => toggleSelect(tx.id)} />
                    </div>
                    <div style={{ font: 'var(--t-body)', color: 'var(--fg-secondary)' }}>{fmtDate(tx.date)}</div>
                    <div style={{ font: 'var(--t-body)', color: 'var(--fg-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.description}</div>
                    <div style={{ font: 'var(--t-body)', color: 'var(--fg-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: tx.category?.colorHex ?? '#888', marginRight: 6 }} />
                      {tx.category?.name ?? '—'}
                    </div>
                    <div style={{ font: 'var(--t-body)', color: 'var(--fg-secondary)' }}>{tx.payment_method}</div>
                    <div style={{ font: 'var(--t-data)', color: 'var(--danger)', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      −{fmt(tx.amount_paisa)}
                    </div>
                    <div onClick={(e) => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <button
                        onClick={() => setDeleteIds([tx.id])}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-muted)', fontSize: 16, padding: 4, lineHeight: 1 }}
                        title="Delete"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                  <RoutingRow routing={tx.routing} />
                </div>
              ))}

              {/* Pagination */}
              {totalPages > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: '5px 10px', border: '1px solid var(--border)', borderRadius: 6, background: 'transparent', cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.4 : 1 }}>‹</button>
                  <span style={{ font: 'var(--t-caption)', color: 'var(--fg-secondary)' }}>{page} / {totalPages}</span>
                  <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ padding: '5px 10px', border: '1px solid var(--border)', borderRadius: 6, background: 'transparent', cursor: page === totalPages ? 'not-allowed' : 'pointer', opacity: page === totalPages ? 0.4 : 1 }}>›</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Budget sidebar — hidden on mobile */}
      <div style={{ width: 320, flexShrink: 0 }} className="hidden-mobile">
        <BudgetSidebar onManage={() => setShowBudgets(true)} />
      </div>

      {/* Modals */}
      {showModal && (
        <TransactionModal
          categories={categories}
          savingsAccounts={savingsAccounts}
          loanPersons={loanPersons}
          editing={editing}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); load(); }}
        />
      )}

      {deleteIds && (
        <DeleteConfirm
          ids={deleteIds}
          onCancel={() => setDeleteIds(null)}
          onDeleted={() => { setDeleteIds(null); setSelected(new Set()); load(); }}
        />
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

// ── Budgets Page ───────────────────────────────────────────────────────────

function BudgetsPage({ onBack }: { onBack: () => void }) {
  const [budgets, setBudgets] = useState<BudgetItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<{ categoryId: string; current: number | null } | null>(null);
  const [limitInput, setLimitInput] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: b }, { data: c }] = await Promise.all([
      api.get('/budgets'),
      api.get('/categories'),
    ]);
    setBudgets(Array.isArray(b) ? b : []);
    const cats = Array.isArray(c) ? c : [];
    setCategories(cats.filter((cat: Category) => cat.routing_type === 'NONE'));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function saveBudget() {
    if (!editing) return;
    setSaving(true);
    const paisa = Math.round(parseFloat(limitInput) * 100);
    if (isNaN(paisa) || paisa <= 0) { setSaving(false); return; }
    await api.put(`/budgets/${editing.categoryId}`, { monthly_limit_paisa: paisa }).catch(() => {});
    setSaving(false);
    setEditing(null);
    load();
  }

  async function removeBudget(categoryId: string) {
    await api.delete(`/budgets/${categoryId}`).catch(() => {});
    load();
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', font: 'var(--t-body)' }}>← Back</button>
        <h1 style={{ font: 'var(--t-page)', margin: 0 }}>Budgets</h1>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--fg-muted)' }}>Loading…</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {categories.map((cat) => {
            const b = budgets.find((x) => x.category_id === cat.id);
            const isEditing = editing?.categoryId === cat.id;
            const color = !b ? 'var(--fg-muted)' : b.state === 'over' ? 'var(--danger)' : b.state === 'warn' ? 'var(--warn)' : 'var(--ok)';

            return (
              <div key={cat.id} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: b ? 10 : 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: cat.colorHex }} />
                    <span style={{ font: 'var(--t-body)', fontWeight: 600 }}>{cat.name}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {b && (
                      <button onClick={() => removeBudget(cat.id)} style={{ font: 'var(--t-caption)', color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer' }}>
                        Remove
                      </button>
                    )}
                    <button
                      onClick={() => { setEditing({ categoryId: cat.id, current: b?.monthly_limit_paisa ?? null }); setLimitInput(b ? String(b.monthly_limit_paisa / 100) : ''); }}
                      style={{ font: 'var(--t-caption)', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      {b ? 'Edit' : 'Set limit'}
                    </button>
                  </div>
                </div>

                {b && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ font: 'var(--t-caption)', color: 'var(--fg-secondary)' }}>{fmt(b.spent_paisa)} / {fmt(b.monthly_limit_paisa)}</span>
                      <span style={{ font: 'var(--t-caption)', color }}>{b.pct}%</span>
                    </div>
                    <div style={{ height: 8, background: 'var(--bg-sunken)', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.min(b.pct, 100)}%`, background: color, borderRadius: 4, transition: 'width 0.3s' }} />
                    </div>
                  </>
                )}

                {isEditing && (
                  <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      type="number" min="0.01" step="0.01" placeholder="Monthly limit (৳)"
                      value={limitInput} onChange={(e) => setLimitInput(e.target.value)}
                      style={{ flex: 1, padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 6, font: 'var(--t-body)', background: 'var(--bg-sunken)' }}
                    />
                    <button onClick={saveBudget} disabled={saving} style={{ padding: '7px 14px', background: 'var(--accent)', color: 'var(--accent-fg)', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
                      {saving ? '…' : 'Save'}
                    </button>
                    <button onClick={() => setEditing(null)} style={{ padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 6, background: 'transparent', cursor: 'pointer' }}>Cancel</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
