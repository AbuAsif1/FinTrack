'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { Amount } from '@/components/ui/Amount';
import { MoneyInput } from '@/components/ui/MoneyInput';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { SUGGESTED_FIXED_EXPENSES } from '@fintrack/shared';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FixedExpenseTemplate {
  id: string;
  name: string;
  standard_amount_paisa: number;
  due_day: number;
  start_month: string;
  end_month: string | null;
  category: { id: string; name: string; routing_type: string };
  savings_account: { id: string; name: string } | null;
}

interface FixedExpenseInstance {
  id: string;
  fixed_expense_id: string;
  month: string;
  due_date: string;
  standard_amount_paisa: number;
  status: 'PENDING' | 'PAID' | 'SKIPPED' | 'DUE_SOON' | 'OVERDUE' | 'FUTURE';
  actual_amount_paisa: number | null;
  paid_date: string | null;
  transaction_id: string | null;
  note: string | null;
  template_name: string;
}

interface Category {
  id: string;
  name: string;
  routing_type: string;
}

interface SavingsAccount {
  id: string;
  name: string;
}

const STATUS_SYMBOL: Record<string, string> = {
  PAID: '✓',
  DUE_SOON: '⚠',
  OVERDUE: '✕',
  PENDING: '●',
  SKIPPED: '–',
  FUTURE: '○',
};

const STATUS_COLOR: Record<string, string> = {
  PAID: 'var(--ok)',
  DUE_SOON: 'var(--warn)',
  OVERDUE: 'var(--danger)',
  PENDING: 'var(--fg-secondary)',
  SKIPPED: 'var(--fg-muted)',
  FUTURE: 'var(--fg-muted)',
};

function getMonths(count = 6): string[] {
  const months: string[] = [];
  const now = new Date();
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return months;
}

function formatMonthShort(m: string) {
  const [y, mo] = m.split('-').map(Number);
  return new Date(y, mo - 1, 1).toLocaleDateString('en-BD', { month: 'short', year: '2-digit' });
}

// ---------------------------------------------------------------------------
// Mark as Paid Drawer
// ---------------------------------------------------------------------------

interface PayDrawerProps {
  instance: FixedExpenseInstance | null;
  onClose: () => void;
  onDone: () => void;
}

function PayDrawer({ instance, onClose, onDone }: PayDrawerProps) {
  const [amountPaisa, setAmountPaisa] = useState<number | null>(null);
  const [paidDate, setPaidDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('BANK');
  const [mode, setMode] = useState<'pay' | 'skip'>('pay');
  const [skipNote, setSkipNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!instance) return;
    setAmountPaisa(instance.standard_amount_paisa);
    setPaidDate(new Date().toISOString().slice(0, 10));
    setSkipNote('');
    setError(null);
    setMode('pay');
  }, [instance]);

  async function handlePay() {
    if (!instance) return;
    setSaving(true);
    setError(null);
    try {
      await api.post(`/fixed-expense-instances/${instance.id}/pay`, {
        actual_amount_paisa: amountPaisa,
        paid_date: paidDate,
        payment_method: paymentMethod,
      });
      onDone();
      onClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg ?? 'Failed to mark as paid');
    } finally {
      setSaving(false);
    }
  }

  async function handleSkip() {
    if (!instance) return;
    setSaving(true);
    setError(null);
    try {
      await api.post(`/fixed-expense-instances/${instance.id}/skip`, { note: skipNote || null });
      onDone();
      onClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg ?? 'Failed to skip');
    } finally {
      setSaving(false);
    }
  }

  async function handleReopen() {
    if (!instance) return;
    setSaving(true);
    setError(null);
    try {
      await api.post(`/fixed-expense-instances/${instance.id}/reopen`, {});
      onDone();
      onClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg ?? 'Failed to reopen');
    } finally {
      setSaving(false);
    }
  }

  if (!instance) return null;

  const isSkipped = instance.status === 'SKIPPED';

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-end', background: 'rgba(0,0,0,0.4)' }}
      onClick={onClose}
    >
      <div
        style={{ width: '100%', maxWidth: 480, margin: '0 auto', background: 'var(--bg-surface)', borderRadius: '12px 12px 0 0', padding: 24 }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ font: 'var(--t-section)', marginBottom: 4 }}>
          {isSkipped ? 'Skipped Item' : `Mark ${instance.template_name} as Paid`}
        </h2>
        <div style={{ font: 'var(--t-caption)', color: 'var(--fg-secondary)', marginBottom: 16 }}>
          {instance.month} · Standard: <Amount paisa={instance.standard_amount_paisa} />
        </div>

        {isSkipped ? (
          <>
            <div style={{ font: 'var(--t-body)', color: 'var(--fg-secondary)', marginBottom: 16 }}>Note: {instance.note ?? '—'}</div>
            {error && <div style={{ color: 'var(--danger)', font: 'var(--t-caption)', marginBottom: 8 }}>{error}</div>}
            <button type="button" onClick={handleReopen} disabled={saving} style={{ width: '100%', padding: '10px', borderRadius: 6, border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', font: 'var(--t-body)' }}>
              Reopen (set to Pending)
            </button>
          </>
        ) : (
          <>
            {/* Tabs */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <button type="button" onClick={() => setMode('pay')} style={{ flex: 1, padding: 8, borderRadius: 6, border: `2px solid ${mode === 'pay' ? 'var(--accent)' : 'var(--border)'}`, background: 'transparent', cursor: 'pointer', font: 'var(--t-body)', color: mode === 'pay' ? 'var(--accent)' : 'var(--fg-primary)' }}>Mark Paid</button>
              <button type="button" onClick={() => setMode('skip')} style={{ flex: 1, padding: 8, borderRadius: 6, border: `2px solid ${mode === 'skip' ? 'var(--warn)' : 'var(--border)'}`, background: 'transparent', cursor: 'pointer', font: 'var(--t-body)', color: mode === 'skip' ? 'var(--warn)' : 'var(--fg-primary)' }}>Skip</button>
            </div>

            {mode === 'pay' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4, font: 'var(--t-body)' }}>
                  Actual Amount (৳)
                  <MoneyInput value={amountPaisa} onChange={setAmountPaisa} id="pay-amount" />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4, font: 'var(--t-body)' }}>
                  Date Paid
                  <input type="date" value={paidDate} onChange={(e) => setPaidDate(e.target.value)} style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-sunken)', color: 'var(--fg-primary)' }} />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4, font: 'var(--t-body)' }}>
                  Payment Method
                  <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-sunken)', color: 'var(--fg-primary)' }}>
                    <option value="BANK">Bank</option>
                    <option value="BKASH">bKash</option>
                    <option value="CASH">Cash</option>
                    <option value="CARD">Card</option>
                  </select>
                </label>
                {error && <div style={{ color: 'var(--danger)', font: 'var(--t-caption)' }}>{error}</div>}
                <button type="button" onClick={handlePay} disabled={saving} style={{ padding: '10px', borderRadius: 6, border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', font: 'var(--t-body)' }}>
                  {saving ? 'Confirming…' : 'Confirm & Create Transaction'}
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4, font: 'var(--t-body)' }}>
                  Note (optional)
                  <input type="text" value={skipNote} onChange={(e) => setSkipNote(e.target.value)} placeholder="Why are you skipping?" style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-sunken)', color: 'var(--fg-primary)' }} />
                </label>
                {error && <div style={{ color: 'var(--danger)', font: 'var(--t-caption)' }}>{error}</div>}
                <button type="button" onClick={handleSkip} disabled={saving} style={{ padding: '10px', borderRadius: 6, border: 'none', background: 'var(--warn)', color: '#fff', cursor: 'pointer', font: 'var(--t-body)' }}>
                  {saving ? 'Skipping…' : 'Skip this month'}
                </button>
              </div>
            )}
          </>
        )}
        <button type="button" onClick={onClose} style={{ width: '100%', marginTop: 12, padding: 8, borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', font: 'var(--t-body)' }}>Cancel</button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Setup Modal (suggested defaults)
// ---------------------------------------------------------------------------

interface SetupModalProps {
  open: boolean;
  onClose: () => void;
  onDone: () => void;
  categories: Category[];
  savingsAccounts: SavingsAccount[];
}

function SetupModal({ open, onClose, onDone, categories, savingsAccounts }: SetupModalProps) {
  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const [dpsAccounts, setDpsAccounts] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setSelected({});
    setDpsAccounts({});
    setError(null);
  }, [open]);

  function findCategory(hint: string) {
    const h = hint.toLowerCase();
    return categories.find((c) => c.name.toLowerCase().includes(h) || c.routing_type.toLowerCase() === h.replace('none', '').replace('savings_deposit', 'savings_deposit'));
  }

  async function handleCreate() {
    setSaving(true);
    setError(null);
    try {
      for (const [idx, checked] of Object.entries(selected)) {
        if (!checked) continue;
        const item = SUGGESTED_FIXED_EXPENSES[Number(idx)];
        const cat = findCategory(item.routing_type_hint === 'SAVINGS_DEPOSIT' ? 'savings' : item.category_name);
        if (!cat) continue;

        await api.post('/fixed-expenses', {
          name: item.name,
          standard_amount_paisa: item.standard_amount_paisa,
          due_day: item.due_day,
          category_id: cat.id,
          savings_account_id: item.routing_type_hint === 'SAVINGS_DEPOSIT' ? (dpsAccounts[Number(idx)] || null) : null,
        });
      }
      onDone();
      onClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg ?? 'Failed to create');
    } finally {
      setSaving(false);
    }
  }

  const anySelected = Object.values(selected).some(Boolean);

  return (
    <Modal open={open} onClose={onClose} title="Set Up Suggested Fixed Expenses">
      <p style={{ font: 'var(--t-body)', color: 'var(--fg-secondary)', marginBottom: 16 }}>
        Select the expenses you want to track. DPS items require a savings account.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 320, overflowY: 'auto', marginBottom: 16 }}>
        {SUGGESTED_FIXED_EXPENSES.map((item, idx) => (
          <div key={idx} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: selected[idx] ? 'var(--bg-sunken)' : 'transparent' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={!!selected[idx]}
                onChange={(e) => setSelected((p) => ({ ...p, [idx]: e.target.checked }))}
                style={{ width: 16, height: 16, flexShrink: 0 }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ font: 'var(--t-body)' }}>{item.name}</div>
                <div style={{ font: 'var(--t-caption)', color: 'var(--fg-secondary)' }}>
                  <Amount paisa={item.standard_amount_paisa} /> · Day {item.due_day} · {item.category_name}
                </div>
              </div>
            </label>
            {selected[idx] && item.routing_type_hint === 'SAVINGS_DEPOSIT' && (
              <div style={{ marginTop: 8, paddingLeft: 26 }}>
                <label style={{ font: 'var(--t-caption)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  Savings Account
                  <select
                    value={dpsAccounts[idx] ?? ''}
                    onChange={(e) => setDpsAccounts((p) => ({ ...p, [idx]: e.target.value }))}
                    style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-sunken)', color: 'var(--fg-primary)' }}
                  >
                    <option value="">Select account…</option>
                    {savingsAccounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </label>
              </div>
            )}
          </div>
        ))}
      </div>
      {error && <div style={{ color: 'var(--danger)', font: 'var(--t-caption)', marginBottom: 8 }}>{error}</div>}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button type="button" onClick={onClose} style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer' }}>Cancel</button>
        <button type="button" onClick={handleCreate} disabled={!anySelected || saving} style={{ padding: '8px 16px', borderRadius: 6, border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', opacity: !anySelected || saving ? 0.6 : 1 }}>
          {saving ? 'Creating…' : 'Create Selected'}
        </button>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Template Modal (add/edit)
// ---------------------------------------------------------------------------

interface TemplateModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  edit?: FixedExpenseTemplate | null;
  categories: Category[];
  savingsAccounts: SavingsAccount[];
}

function TemplateModal({ open, onClose, onSaved, edit, categories, savingsAccounts }: TemplateModalProps) {
  const [name, setName] = useState('');
  const [standardAmountPaisa, setStandardAmountPaisa] = useState<number | null>(null);
  const [dueDay, setDueDay] = useState(1);
  const [categoryId, setCategoryId] = useState('');
  const [savingsAccountId, setSavingsAccountId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (edit) {
      setName(edit.name);
      setStandardAmountPaisa(edit.standard_amount_paisa);
      setDueDay(edit.due_day);
      setCategoryId(edit.category.id);
      setSavingsAccountId(edit.savings_account?.id ?? '');
    } else {
      setName('');
      setStandardAmountPaisa(null);
      setDueDay(1);
      setCategoryId('');
      setSavingsAccountId('');
    }
    setError(null);
  }, [open, edit]);

  const selectedCat = categories.find((c) => c.id === categoryId);
  const needsSavingsAccount = selectedCat?.routing_type === 'SAVINGS_DEPOSIT';

  async function handleSave() {
    if (!name.trim() || !standardAmountPaisa || !categoryId) { setError('All required fields must be filled'); return; }
    if (needsSavingsAccount && !savingsAccountId) { setError('A savings account is required for DPS category'); return; }

    setSaving(true);
    setError(null);
    try {
      if (edit) {
        await api.patch(`/fixed-expenses/${edit.id}`, {
          name,
          standard_amount_paisa: standardAmountPaisa,
          due_day: dueDay,
          savings_account_id: savingsAccountId || null,
        });
      } else {
        await api.post('/fixed-expenses', {
          name,
          standard_amount_paisa: standardAmountPaisa,
          due_day: dueDay,
          category_id: categoryId,
          savings_account_id: savingsAccountId || null,
        });
      }
      onSaved();
      onClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg ?? 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={edit ? 'Edit Fixed Expense' : 'Add Fixed Expense'}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, font: 'var(--t-body)' }}>
          Name
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Mess Rent" style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-sunken)', color: 'var(--fg-primary)' }} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, font: 'var(--t-body)' }}>
          Standard Amount (৳)
          <MoneyInput value={standardAmountPaisa} onChange={setStandardAmountPaisa} id="template-amount" />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, font: 'var(--t-body)' }}>
          Due Day of Month
          <input type="number" min={1} max={31} value={dueDay} onChange={(e) => setDueDay(Number(e.target.value))} style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-sunken)', color: 'var(--fg-primary)' }} />
        </label>
        {!edit && (
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, font: 'var(--t-body)' }}>
            Category
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-sunken)', color: 'var(--fg-primary)' }}>
              <option value="">Select category…</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
        )}
        {needsSavingsAccount && (
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, font: 'var(--t-body)' }}>
            Savings Account (required for DPS)
            <select value={savingsAccountId} onChange={(e) => setSavingsAccountId(e.target.value)} style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-sunken)', color: 'var(--fg-primary)' }}>
              <option value="">Select account…</option>
              {savingsAccounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </label>
        )}
        {error && <div style={{ color: 'var(--danger)', font: 'var(--t-caption)' }}>{error}</div>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button type="button" onClick={onClose} style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer' }}>Cancel</button>
          <button type="button" onClick={handleSave} disabled={saving} style={{ padding: '8px 16px', borderRadius: 6, border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function FixedExpensesPage() {
  const [templates, setTemplates] = useState<FixedExpenseTemplate[]>([]);
  const [instances, setInstances] = useState<FixedExpenseInstance[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [savingsAccounts, setSavingsAccounts] = useState<SavingsAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeDrawer, setActiveDrawer] = useState<FixedExpenseInstance | null>(null);
  const [setupOpen, setSetupOpen] = useState(false);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [editTemplate, setEditTemplate] = useState<FixedExpenseTemplate | null>(null);
  const [showYearView, setShowYearView] = useState(false);

  const months = getMonths(6);
  const currentMonth = months[months.length - 1];

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const from = months[0];
      const to = months[months.length - 1];
      const [tmplRes, instRes, catRes, savRes] = await Promise.all([
        api.get<FixedExpenseTemplate[]>('/fixed-expenses'),
        api.get<FixedExpenseInstance[]>(`/fixed-expense-instances?from=${from}&to=${to}`),
        api.get<Category[]>('/categories'),
        api.get<{ accounts: SavingsAccount[] }>('/savings-accounts'),
      ]);
      setTemplates(tmplRes.data);
      setInstances(instRes.data);
      setCategories(catRes.data);
      setSavingsAccounts(savRes.data.accounts);
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  function getInstance(templateId: string, month: string) {
    return instances.find((i) => i.fixed_expense_id === templateId && i.month === month);
  }

  // Current month instances, overdue at top
  const currentInstances = instances
    .filter((i) => i.month === currentMonth)
    .sort((a, b) => {
      const order: Record<string, number> = { OVERDUE: 0, DUE_SOON: 1, PENDING: 2, PAID: 3, SKIPPED: 4, FUTURE: 5 };
      return (order[a.status] ?? 5) - (order[b.status] ?? 5);
    });

  // Overdue and due-soon alerts
  const alerts = currentInstances.filter((i) => i.status === 'OVERDUE' || i.status === 'DUE_SOON');

  // Month totals
  const monthTotals = months.map((m) => {
    const monthInsts = instances.filter((i) => i.month === m);
    const paid = monthInsts.filter((i) => i.status === 'PAID').reduce((s, i) => s + (i.actual_amount_paisa ?? i.standard_amount_paisa), 0);
    const pending = monthInsts.filter((i) => ['PENDING', 'DUE_SOON', 'OVERDUE'].includes(i.status)).reduce((s, i) => s + i.standard_amount_paisa, 0);
    return { month: m, paid, pending, total: paid + pending };
  });

  async function handleDeactivate(tmpl: FixedExpenseTemplate) {
    if (!confirm(`Deactivate "${tmpl.name}"? No new instances will be created.`)) return;
    await api.patch(`/fixed-expenses/${tmpl.id}`, { deactivate: true });
    load();
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ font: 'var(--t-page)', margin: 0 }}>Fixed Expenses</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          {templates.length === 0 && (
            <button type="button" onClick={() => setSetupOpen(true)} style={{ padding: '8px 14px', borderRadius: 6, border: '1px solid var(--accent)', background: 'transparent', cursor: 'pointer', font: 'var(--t-body)', color: 'var(--accent)' }}>
              Set up defaults
            </button>
          )}
          <button type="button" onClick={() => { setEditTemplate(null); setTemplateModalOpen(true); }} style={{ padding: '8px 16px', borderRadius: 6, border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', font: 'var(--t-body)' }}>
            + Add Fixed Expense
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ color: 'var(--fg-muted)' }}>Loading…</div>
      ) : templates.length === 0 ? (
        <EmptyState
          icon="📋"
          heading="No fixed expenses yet"
          body="Add recurring expenses like rent, DPS installments, or subscriptions."
          action={
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={() => setSetupOpen(true)} style={{ padding: '10px 20px', borderRadius: 6, border: '1px solid var(--accent)', background: 'transparent', cursor: 'pointer', font: 'var(--t-body)', color: 'var(--accent)' }}>Set up defaults</button>
              <button type="button" onClick={() => { setEditTemplate(null); setTemplateModalOpen(true); }} style={{ padding: '10px 20px', borderRadius: 6, border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', font: 'var(--t-body)' }}>+ Add manually</button>
            </div>
          }
        />
      ) : (
        <>
          {/* Alert banners */}
          {alerts.length > 0 && (
            <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {alerts.map((inst) => (
                <div
                  key={inst.id}
                  style={{
                    padding: '10px 16px',
                    borderRadius: 8,
                    borderLeft: `4px solid ${inst.status === 'OVERDUE' ? 'var(--danger)' : 'var(--warn)'}`,
                    background: inst.status === 'OVERDUE' ? 'rgba(var(--danger-rgb, 220,53,69), 0.08)' : 'rgba(var(--warn-rgb, 255,165,0), 0.08)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ font: 'var(--t-body)' }}>
                    {inst.status === 'OVERDUE' ? '✕ Overdue:' : '⚠ Due soon:'} {inst.template_name} · <Amount paisa={inst.standard_amount_paisa} />
                  </span>
                  <button type="button" onClick={() => setActiveDrawer(inst)} style={{ padding: '4px 12px', borderRadius: 6, border: `1px solid ${inst.status === 'OVERDUE' ? 'var(--danger)' : 'var(--warn)'}`, background: 'transparent', cursor: 'pointer', font: 'var(--t-caption)' }}>
                    Mark Paid
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Mobile: checklist + year-view toggle */}
          <div style={{ marginBottom: 16 }}>
            <button type="button" onClick={() => setShowYearView((v) => !v)} style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid var(--border)', background: showYearView ? 'var(--accent)' : 'transparent', color: showYearView ? '#fff' : 'var(--fg-primary)', cursor: 'pointer', font: 'var(--t-body)' }}>
              {showYearView ? 'Show Checklist' : 'Year View'}
            </button>
          </div>

          {!showYearView ? (
            /* Monthly checklist */
            <div style={{ background: 'var(--bg-surface)', borderRadius: 10, border: '1px solid var(--border)', overflow: 'hidden', marginBottom: 24 }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', font: 'var(--t-label)', color: 'var(--fg-secondary)', textTransform: 'uppercase' }}>
                This Month — {formatMonthShort(currentMonth)}
              </div>
              {currentInstances.length === 0 ? (
                <div style={{ padding: 24, font: 'var(--t-body)', color: 'var(--fg-muted)' }}>No items for this month.</div>
              ) : (
                currentInstances.map((inst) => (
                  <div key={inst.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--border)', cursor: ['PENDING', 'DUE_SOON', 'OVERDUE', 'SKIPPED'].includes(inst.status) ? 'pointer' : 'default' }} onClick={() => { if (['PENDING', 'DUE_SOON', 'OVERDUE', 'SKIPPED'].includes(inst.status)) setActiveDrawer(inst); }}>
                    <div>
                      <span style={{ marginRight: 8, color: STATUS_COLOR[inst.status], fontWeight: 700 }}>{STATUS_SYMBOL[inst.status]}</span>
                      <span style={{ font: 'var(--t-body)' }}>{inst.template_name}</span>
                      <span style={{ font: 'var(--t-caption)', color: 'var(--fg-muted)', marginLeft: 8 }}>Day {new Date(inst.due_date).getDate()}</span>
                    </div>
                    <span style={{ font: 'var(--t-body)' }}>
                      <Amount paisa={inst.actual_amount_paisa ?? inst.standard_amount_paisa} />
                    </span>
                  </div>
                ))
              )}
              {/* Month totals */}
              <div style={{ padding: '10px 16px', background: 'var(--bg-sunken)', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ font: 'var(--t-label)', color: 'var(--fg-secondary)' }}>FIXED COMMITMENTS</span>
                <span style={{ font: 'var(--t-body)', fontWeight: 700 }}>
                  <Amount paisa={monthTotals[monthTotals.length - 1]?.total ?? 0} />
                </span>
              </div>
            </div>
          ) : (
            /* Year grid */
            <div style={{ overflowX: 'auto', marginBottom: 24 }}>
              <table style={{ borderCollapse: 'collapse', minWidth: 700, width: '100%' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)', background: 'var(--bg-sunken)' }}>
                    <th style={{ padding: '10px 16px', textAlign: 'left', font: 'var(--t-label)', color: 'var(--fg-secondary)', minWidth: 160 }}>Expense</th>
                    {months.map((m) => (
                      <th key={m} style={{ padding: '10px 12px', textAlign: 'center', font: 'var(--t-label)', color: 'var(--fg-secondary)', minWidth: 72 }}>{formatMonthShort(m)}</th>
                    ))}
                    <th style={{ padding: '10px 12px', textAlign: 'right', font: 'var(--t-label)', color: 'var(--fg-secondary)' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {templates.map((tmpl) => (
                    <tr key={tmpl.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '10px 16px', font: 'var(--t-body)' }}>
                        <div>{tmpl.name}</div>
                        <div style={{ font: 'var(--t-caption)', color: 'var(--fg-muted)' }}><Amount paisa={tmpl.standard_amount_paisa} /> · Day {tmpl.due_day}</div>
                        {tmpl.end_month && <div style={{ font: 'var(--t-caption)', color: 'var(--warn)' }}>Deactivated {tmpl.end_month}</div>}
                      </td>
                      {months.map((m) => {
                        const inst = getInstance(tmpl.id, m);
                        const status = inst?.status ?? 'FUTURE';
                        const clickable = inst && ['PENDING', 'DUE_SOON', 'OVERDUE', 'SKIPPED'].includes(status);
                        return (
                          <td
                            key={m}
                            style={{ padding: '10px 12px', textAlign: 'center', cursor: clickable ? 'pointer' : 'default' }}
                            title={inst ? `${status}${inst.actual_amount_paisa != null ? ` · ৳${(inst.actual_amount_paisa / 100).toFixed(0)}` : ''}` : 'Future'}
                            onClick={() => { if (clickable && inst) setActiveDrawer(inst); }}
                          >
                            <span style={{ color: STATUS_COLOR[status], fontSize: 16 }}>{STATUS_SYMBOL[status]}</span>
                          </td>
                        );
                      })}
                      <td style={{ padding: '10px 12px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button type="button" onClick={() => { setEditTemplate(tmpl); setTemplateModalOpen(true); }} style={{ padding: '4px 10px', borderRadius: 4, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', font: 'var(--t-caption)', marginRight: 6 }}>Edit</button>
                        {!tmpl.end_month && (
                          <button type="button" onClick={() => handleDeactivate(tmpl)} style={{ padding: '4px 10px', borderRadius: 4, border: '1px solid var(--warn)', background: 'transparent', cursor: 'pointer', font: 'var(--t-caption)', color: 'var(--warn)' }}>Deactivate</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: '2px solid var(--border)', background: 'var(--bg-sunken)' }}>
                    <td style={{ padding: '10px 16px', font: 'var(--t-label)', fontWeight: 700 }}>TOTAL COMMITMENTS</td>
                    {monthTotals.map((mt) => (
                      <td key={mt.month} style={{ padding: '10px 12px', textAlign: 'center', font: 'var(--t-body)' }}>
                        <Amount paisa={mt.total} />
                      </td>
                    ))}
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* Legend */}
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', font: 'var(--t-caption)', color: 'var(--fg-secondary)', marginBottom: 16 }}>
            {Object.entries(STATUS_SYMBOL).map(([status, sym]) => (
              <span key={status}><span style={{ color: STATUS_COLOR[status] }}>{sym}</span> {status.replace('_', ' ')}</span>
            ))}
          </div>
        </>
      )}

      {/* Mark as Paid / Skip drawer */}
      {activeDrawer && (
        <PayDrawer instance={activeDrawer} onClose={() => setActiveDrawer(null)} onDone={load} />
      )}

      {/* Setup modal */}
      <SetupModal
        open={setupOpen}
        onClose={() => setSetupOpen(false)}
        onDone={load}
        categories={categories}
        savingsAccounts={savingsAccounts}
      />

      {/* Template modal */}
      <TemplateModal
        open={templateModalOpen}
        onClose={() => setTemplateModalOpen(false)}
        onSaved={load}
        edit={editTemplate}
        categories={categories}
        savingsAccounts={savingsAccounts}
      />
    </div>
  );
}
