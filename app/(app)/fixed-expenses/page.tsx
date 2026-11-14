'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { Amount } from '@/components/ui/Amount';
import { MoneyInput } from '@/components/ui/MoneyInput';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { SUGGESTED_FIXED_EXPENSES } from '@fintrack/shared';
import { PageHeader } from '@/components/ui/PageHeader';
import { DatePicker } from '@/components/ui/DatePicker';

// ── Types ──────────────────────────────────────────────────────────────────

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

interface Category { id: string; name: string; routing_type: string; }
interface SavingsAccount { id: string; name: string; type: string; }

// A deposit fixed expense pays INTO a DPS-style account; regular SAVINGS accounts are the payer, not the destination
const isDepositTarget = (a: SavingsAccount) => a.type !== 'SAVINGS';

// ── Status config ──────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  PAID: '✓ Paid', DUE_SOON: '⚠ Due Soon', OVERDUE: '✕ Overdue',
  PENDING: '● Pending', SKIPPED: '— Skipped', FUTURE: '○ Future',
};
const STATUS_BADGE: Record<string, React.CSSProperties> = {
  PAID:    { background: 'var(--ok-bg)',      color: 'var(--ok)' },
  DUE_SOON:{ background: 'var(--warn-bg)',    color: 'var(--warn)' },
  OVERDUE: { background: 'var(--danger-bg)',  color: 'var(--danger)' },
  PENDING: { background: 'var(--neutral-bg)', color: 'var(--neutral)' },
  SKIPPED: { background: 'var(--bg-raised)',  color: 'var(--fg-muted)' },
  FUTURE:  { background: 'transparent',       color: 'var(--fg-muted)', border: '1px solid var(--border)' },
};
const STATUS_SORT: Record<string, number> = { OVERDUE: 0, DUE_SOON: 1, PENDING: 2, PAID: 3, SKIPPED: 4, FUTURE: 5 };

const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function fmt(paisa: number) {
  return '৳' + (paisa / 100).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
function currentYM(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function todayStr(): string { return new Date().toISOString().slice(0, 10); }

// ── StatusBadge ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  return (
    <span style={{
      ...STATUS_BADGE[status],
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      padding: '2px 8px', borderRadius: 999,
      font: 'var(--t-caption)', fontWeight: 600, whiteSpace: 'nowrap',
      minWidth: 90, flexShrink: 0,
    }}>
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

// ── Due-Soon Warning Banner ────────────────────────────────────────────────

function DueSoonBanner({ items, onDismiss }: { items: FixedExpenseInstance[]; onDismiss: () => void }) {
  const overdue = items.filter(i => i.status === 'OVERDUE');
  const dueSoon = items.filter(i => i.status === 'DUE_SOON');
  const isOverdue = overdue.length > 0;
  const color = isOverdue ? 'var(--danger)' : 'var(--warn)';
  const bg = isOverdue ? 'var(--danger-bg)' : 'var(--warn-bg)';
  const border = isOverdue ? 'var(--danger)' : 'var(--warn)';

  return (
    <div style={{
      marginBottom: 16, padding: '12px 16px',
      background: bg, border: `1px solid ${border}`,
      borderLeft: `4px solid ${color}`, borderRadius: 8,
      display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12,
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ font: 'var(--t-body)', fontWeight: 600, color, marginBottom: 4 }}>
          {overdue.length > 0 && `${overdue.length} overdue`}
          {overdue.length > 0 && dueSoon.length > 0 && ' · '}
          {dueSoon.length > 0 && `${dueSoon.length} due within 7 days`}
        </div>
        <div style={{ font: 'var(--t-caption)', color: 'var(--fg-secondary)' }}>
          {items.map(i => i.template_name).join(', ')}
        </div>
      </div>
      <button
        onClick={onDismiss}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color, fontSize: 16, padding: '0 4px', flexShrink: 0 }}
        aria-label="Dismiss for today"
      >
        ✕
      </button>
    </div>
  );
}

// ── PayDrawer ──────────────────────────────────────────────────────────────

function PayDrawer({ instance, onClose, onDone }: { instance: FixedExpenseInstance | null; onClose: () => void; onDone: () => void }) {
  const [amountPaisa, setAmountPaisa] = useState<number | null>(instance?.standard_amount_paisa ?? null);
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
    setSkipNote(''); setError(null); setMode('pay');
  }, [instance]);

  async function handlePay() {
    if (!instance) return;
    setSaving(true); setError(null);
    try {
      await api.post(`/fixed-expense-instances/${instance.id}/pay`, {
        actual_amount_paisa: amountPaisa, paid_date: paidDate, payment_method: paymentMethod,
      });
      onDone(); onClose();
    } catch (err: unknown) {
      setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed');
    } finally { setSaving(false); }
  }

  async function handleSkip() {
    if (!instance) return;
    setSaving(true); setError(null);
    try {
      await api.post(`/fixed-expense-instances/${instance.id}/skip`, { note: skipNote || null });
      onDone(); onClose();
    } catch (err: unknown) {
      setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed');
    } finally { setSaving(false); }
  }

  async function handleReopen() {
    if (!instance) return;
    setSaving(true); setError(null);
    try {
      await api.post(`/fixed-expense-instances/${instance.id}/reopen`, {});
      onDone(); onClose();
    } catch (err: unknown) {
      setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed');
    } finally { setSaving(false); }
  }

  if (!instance) return null;
  const isSkipped = instance.status === 'SKIPPED';
  const isPaid = instance.status === 'PAID';

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-end', background: 'rgba(0,0,0,0.4)' }} onClick={onClose}>
      <div style={{ width: '100%', maxWidth: 480, margin: '0 auto', background: 'var(--bg-surface)', borderRadius: '12px 12px 0 0', padding: 24 }} onClick={e => e.stopPropagation()}>
        <h2 style={{ font: 'var(--t-section)', marginBottom: 4 }}>{instance.template_name}</h2>
        <div style={{ font: 'var(--t-caption)', color: 'var(--fg-secondary)', marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
          <StatusBadge status={instance.status} />
          <span>{instance.month} · Standard: <Amount paisa={instance.standard_amount_paisa} /></span>
        </div>

        {isPaid ? (
          <>
            <div style={{ font: 'var(--t-body)', color: 'var(--fg-secondary)', marginBottom: 16 }}>
              Paid <Amount paisa={instance.actual_amount_paisa ?? instance.standard_amount_paisa} /> on {instance.paid_date ?? '—'}
            </div>
          </>
        ) : isSkipped ? (
          <>
            <div style={{ font: 'var(--t-body)', color: 'var(--fg-secondary)', marginBottom: 16 }}>Note: {instance.note ?? '—'}</div>
            {error && <div style={{ color: 'var(--danger)', font: 'var(--t-caption)', marginBottom: 8 }}>{error}</div>}
            <button type="button" onClick={handleReopen} disabled={saving} style={{ width: '100%', padding: 10, borderRadius: 6, border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', font: 'var(--t-body)' }}>
              Reopen (set to Pending)
            </button>
          </>
        ) : (
          <>
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
                  <DatePicker value={paidDate} onChange={setPaidDate} />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4, font: 'var(--t-body)' }}>
                  Payment Method
                  <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-sunken)', color: 'var(--fg-primary)' }}>
                    <option value="BANK">Bank</option>
                    <option value="BKASH">bKash</option>
                    <option value="CASH">Cash</option>
                    <option value="CARD">Card</option>
                  </select>
                </label>
                {error && <div style={{ color: 'var(--danger)', font: 'var(--t-caption)' }}>{error}</div>}
                <button type="button" onClick={handlePay} disabled={saving} style={{ padding: 10, borderRadius: 6, border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', font: 'var(--t-body)' }}>
                  {saving ? 'Confirming…' : 'Confirm & Create Transaction'}
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4, font: 'var(--t-body)' }}>
                  Note (optional)
                  <input type="text" value={skipNote} onChange={e => setSkipNote(e.target.value)} placeholder="Why are you skipping?" style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-sunken)', color: 'var(--fg-primary)' }} />
                </label>
                {error && <div style={{ color: 'var(--danger)', font: 'var(--t-caption)' }}>{error}</div>}
                <button type="button" onClick={handleSkip} disabled={saving} style={{ padding: 10, borderRadius: 6, border: 'none', background: 'var(--warn)', color: '#fff', cursor: 'pointer', font: 'var(--t-body)' }}>
                  {saving ? 'Skipping…' : 'Skip this month'}
                </button>
              </div>
            )}
          </>
        )}
        <button type="button" onClick={onClose} style={{ width: '100%', marginTop: 12, padding: 8, borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', font: 'var(--t-body)' }}>Close</button>
      </div>
    </div>
  );
}

// ── SetupModal ─────────────────────────────────────────────────────────────

function SetupModal({ open, onClose, onDone, categories, savingsAccounts, existingNames }: { open: boolean; onClose: () => void; onDone: () => void; categories: Category[]; savingsAccounts: SavingsAccount[]; existingNames: string[] }) {
  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const [dpsAccounts, setDpsAccounts] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { if (!open) return; setSelected({}); setDpsAccounts({}); setError(null); }, [open]);

  // Items not yet set up by the user
  const availableItems = SUGGESTED_FIXED_EXPENSES
    .map((item, idx) => ({ item, idx }))
    .filter(({ item }) => !existingNames.includes(item.name.toLowerCase()));

  function findCategory(hint: string) {
    const h = hint.toLowerCase();
    return categories.find(c => c.name.toLowerCase().includes(h) || c.routing_type.toLowerCase() === h.replace('none', '').replace('savings_deposit', 'savings_deposit'));
  }

  async function handleCreate() {
    setSaving(true); setError(null);
    try {
      for (const [idx, checked] of Object.entries(selected)) {
        if (!checked) continue;
        const item = SUGGESTED_FIXED_EXPENSES[Number(idx)];
        const cat = findCategory(item.routing_type_hint === 'SAVINGS_DEPOSIT' ? 'savings' : item.category_name);
        if (!cat) continue;
        await api.post('/fixed-expenses', {
          name: item.name, standard_amount_paisa: item.standard_amount_paisa, due_day: item.due_day,
          category_id: cat.id, savings_account_id: item.routing_type_hint === 'SAVINGS_DEPOSIT' ? (dpsAccounts[Number(idx)] || null) : null,
        });
      }
      onDone(); onClose();
    } catch (err: unknown) {
      setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to create');
    } finally { setSaving(false); }
  }

  const anySelected = Object.values(selected).some(Boolean);

  return (
    <Modal open={open} onClose={onClose} title="Set Up Suggested Fixed Expenses">
      <p style={{ font: 'var(--t-body)', color: 'var(--fg-secondary)', marginBottom: 16 }}>
        Select expenses to add. Already-added items are hidden.
        {availableItems.length === 0 && ' All suggested expenses are already set up.'}
      </p>
      {availableItems.length === 0 ? (
        <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--fg-muted)', font: 'var(--t-body)' }}>
          Nothing left to add from the suggested list.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 320, overflowY: 'auto', marginBottom: 16 }}>
          {availableItems.map(({ item, idx }) => (
            <div key={idx} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: selected[idx] ? 'var(--bg-sunken)' : 'transparent' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <input type="checkbox" checked={!!selected[idx]} onChange={e => setSelected(p => ({ ...p, [idx]: e.target.checked }))} style={{ width: 16, height: 16, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ font: 'var(--t-body)' }}>{item.name}</div>
                  <div style={{ font: 'var(--t-caption)', color: 'var(--fg-secondary)' }}><Amount paisa={item.standard_amount_paisa} /> · Day {item.due_day} · {item.category_name}</div>
                </div>
              </label>
              {selected[idx] && item.routing_type_hint === 'SAVINGS_DEPOSIT' && (
                <div style={{ marginTop: 8, paddingLeft: 26 }}>
                  <label style={{ font: 'var(--t-caption)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    Deposit into (DPS account)
                    <select value={dpsAccounts[idx] ?? ''} onChange={e => setDpsAccounts(p => ({ ...p, [idx]: e.target.value }))} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-sunken)', color: 'var(--fg-primary)' }}>
                      <option value="">Select DPS account…</option>
                      {savingsAccounts.filter(isDepositTarget).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </label>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

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

// ── TemplateModal ──────────────────────────────────────────────────────────

function TemplateModal({ open, onClose, onSaved, edit, categories, savingsAccounts }: { open: boolean; onClose: () => void; onSaved: () => void; edit?: FixedExpenseTemplate | null; categories: Category[]; savingsAccounts: SavingsAccount[] }) {
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
      setName(edit.name); setStandardAmountPaisa(edit.standard_amount_paisa); setDueDay(edit.due_day);
      setCategoryId(edit.category.id);
      const linked = savingsAccounts.find(a => a.id === edit.savings_account?.id);
      setSavingsAccountId(linked && isDepositTarget(linked) ? linked.id : '');
    } else {
      setName(''); setStandardAmountPaisa(null); setDueDay(1); setCategoryId(''); setSavingsAccountId('');
    }
    setError(null);
  }, [open, edit, savingsAccounts]);

  const selectedCat = categories.find(c => c.id === categoryId);
  const needsSavingsAccount = selectedCat?.routing_type === 'SAVINGS_DEPOSIT';

  async function handleSave() {
    if (!name.trim() || !standardAmountPaisa || !categoryId) { setError('All required fields must be filled'); return; }
    if (needsSavingsAccount && !savingsAccountId) { setError('A savings account is required for DPS category'); return; }
    setSaving(true); setError(null);
    try {
      if (edit) {
        await api.patch(`/fixed-expenses/${edit.id}`, { name, standard_amount_paisa: standardAmountPaisa, due_day: dueDay, savings_account_id: savingsAccountId || null });
      } else {
        await api.post('/fixed-expenses', { name, standard_amount_paisa: standardAmountPaisa, due_day: dueDay, category_id: categoryId, savings_account_id: savingsAccountId || null });
      }
      onSaved(); onClose();
    } catch (err: unknown) {
      setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to save');
    } finally { setSaving(false); }
  }

  return (
    <Modal open={open} onClose={onClose} title={edit ? 'Edit Fixed Expense' : 'Add Fixed Expense'}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, font: 'var(--t-body)' }}>
          Name
          <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Mess Rent" style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-sunken)', color: 'var(--fg-primary)' }} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, font: 'var(--t-body)' }}>
          Standard Amount (৳)
          <MoneyInput value={standardAmountPaisa} onChange={setStandardAmountPaisa} id="template-amount" />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, font: 'var(--t-body)' }}>
          Due Day of Month
          <input type="number" min={1} max={31} value={dueDay} onChange={e => setDueDay(Number(e.target.value))} style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-sunken)', color: 'var(--fg-primary)' }} />
        </label>
        {!edit && (
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, font: 'var(--t-body)' }}>
            Category
            <select value={categoryId} onChange={e => setCategoryId(e.target.value)} style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-sunken)', color: 'var(--fg-primary)' }}>
              <option value="">Select category…</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
        )}
        {needsSavingsAccount && (
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, font: 'var(--t-body)' }}>
            Deposit into (DPS account)
            <select value={savingsAccountId} onChange={e => setSavingsAccountId(e.target.value)} style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-sunken)', color: 'var(--fg-primary)' }}>
              <option value="">Select DPS account…</option>
              {savingsAccounts.filter(isDepositTarget).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <span style={{ font: 'var(--t-caption)', color: 'var(--fg-muted)' }}>
              The account that receives the installment. Choose the paying bank when you record each payment.
            </span>
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

// ── Main Page ──────────────────────────────────────────────────────────────

export default function FixedExpensesPage() {
  const [templates, setTemplates] = useState<FixedExpenseTemplate[]>([]);
  const [currentInstances, setCurrentInstances] = useState<FixedExpenseInstance[]>([]);
  const [yearInstances, setYearInstances] = useState<FixedExpenseInstance[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [savingsAccounts, setSavingsAccounts] = useState<SavingsAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [yearLoading, setYearLoading] = useState(false);
  const [activeDrawer, setActiveDrawer] = useState<FixedExpenseInstance | null>(null);
  const [setupOpen, setSetupOpen] = useState(false);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [editTemplate, setEditTemplate] = useState<FixedExpenseTemplate | null>(null);
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const currentMonth = currentYM();
  const today = todayStr();
  const BANNER_KEY = `fe_banner_dismissed_${today}`;

  // Deduplicate templates by name — keeps only the first occurrence per name
  const uniqueTemplates = templates.filter(
    (t, i) => templates.findIndex(t2 => t2.name.toLowerCase() === t.name.toLowerCase()) === i
  );

  // Check banner dismissal from localStorage
  useEffect(() => {
    try { setBannerDismissed(localStorage.getItem(BANNER_KEY) === '1'); } catch { /* ignore */ }
  }, [BANNER_KEY]);

  function dismissBanner() {
    try { localStorage.setItem(BANNER_KEY, '1'); } catch { /* ignore */ }
    setBannerDismissed(true);
  }

  // ── Load current month data ──
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [tmplRes, instRes, catRes, savRes] = await Promise.all([
        api.get<FixedExpenseTemplate[]>('/fixed-expenses'),
        api.get<FixedExpenseInstance[]>(`/fixed-expense-instances?from=${currentMonth}&to=${currentMonth}`),
        api.get<Category[]>('/categories'),
        api.get<{ accounts: SavingsAccount[] }>('/savings-accounts'),
      ]);
      setTemplates(tmplRes.data);
      const insts: FixedExpenseInstance[] = Array.isArray(instRes.data) ? instRes.data : [];
      setCurrentInstances(insts.sort((a, b) => (STATUS_SORT[a.status] ?? 5) - (STATUS_SORT[b.status] ?? 5)));
      setCategories(catRes.data);
      setSavingsAccounts(savRes.data.accounts);
    } finally { setLoading(false); }
  }, [currentMonth]);

  useEffect(() => { load(); }, [load]);

  // ── Load year data ──
  const loadYear = useCallback(async (year: number) => {
    setYearLoading(true);
    try {
      const from = `${year}-01`;
      const to = `${year}-12`;
      const { data } = await api.get<FixedExpenseInstance[]>(`/fixed-expense-instances?from=${from}&to=${to}`);
      setYearInstances(Array.isArray(data) ? data : []);
    } finally { setYearLoading(false); }
  }, []);

  useEffect(() => { loadYear(selectedYear); }, [loadYear, selectedYear]);

  function reloadAll() { load(); loadYear(selectedYear); }

  // ── Helpers ──
  function getYearInstance(templateId: string, monthIdx: number): FixedExpenseInstance | undefined {
    const m = `${selectedYear}-${String(monthIdx + 1).padStart(2, '0')}`;
    return yearInstances.find(i => i.fixed_expense_id === templateId && i.month === m);
  }

  async function handleDelete(tmpl: FixedExpenseTemplate) {
    if (!confirm(`Delete "${tmpl.name}"? All instances will be removed. Paid transactions are kept.`)) return;
    await api.delete(`/fixed-expenses/${tmpl.id}`).catch(() => {});
    reloadAll();
  }

  // Banner: DUE_SOON + OVERDUE items this month
  const alertInstances = currentInstances.filter(i => i.status === 'DUE_SOON' || i.status === 'OVERDUE');
  const showBanner = alertInstances.length > 0 && !bannerDismissed;

  // Month totals
  const currentTotal = currentInstances.reduce((s, i) => s + (i.actual_amount_paisa ?? i.standard_amount_paisa), 0);
  const currentPaid = currentInstances.filter(i => i.status === 'PAID').reduce((s, i) => s + (i.actual_amount_paisa ?? i.standard_amount_paisa), 0);
  const currentPending = currentInstances.filter(i => ['PENDING', 'DUE_SOON', 'OVERDUE'].includes(i.status)).reduce((s, i) => s + i.standard_amount_paisa, 0);

  // Year month totals
  const yearMonths = Array.from({ length: 12 }, (_, i) => i);
  function yearMonthTotal(monthIdx: number): number {
    return yearInstances
      .filter(i => i.month === `${selectedYear}-${String(monthIdx + 1).padStart(2, '0')}`)
      .reduce((s, i) => s + (i.actual_amount_paisa ?? i.standard_amount_paisa), 0);
  }

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  return (
    <div>
      <PageHeader
        eyebrow="Monthly commitments"
        title="Fixed Expenses"
        description="Track recurring payments, mark them paid, and review yearly history."
      />

      {loading ? (
        <div style={{ color: 'var(--fg-muted)', padding: 40, textAlign: 'center' }}>Loading…</div>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* ── Warning banner ── */}
          {showBanner && <DueSoonBanner items={alertInstances} onDismiss={dismissBanner} />}

          {/* ── Top action bar ── */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" onClick={() => { setEditTemplate(null); setTemplateModalOpen(true); }} className="btn-primary" style={{ fontSize: 13 }}>
              + Add Fixed Expense
            </button>
            <button type="button" onClick={() => setSetupOpen(true)} className="btn-secondary" style={{ fontSize: 13 }}>
              Set up defaults
            </button>
          </div>

          {/* ═══════════════════════════════════════════════════════════════
              PANEL 1 — Current Month
          ═══════════════════════════════════════════════════════════════ */}
          <section>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h2 style={{ font: 'var(--t-section)', margin: 0 }}>
                This Month
                <span style={{ font: 'var(--t-caption)', color: 'var(--fg-muted)', marginLeft: 8, fontWeight: 400 }}>
                  {new Date(currentMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </span>
              </h2>
            </div>

            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
              {currentInstances.length === 0 ? (
                <div style={{ padding: 24, font: 'var(--t-body)', color: 'var(--fg-muted)', textAlign: 'center' }}>No items for this month.</div>
              ) : (
                currentInstances.map((inst, idx) => {
                  const tmpl = templates.find(t => t.id === inst.fixed_expense_id);
                  const clickable = ['PENDING', 'DUE_SOON', 'OVERDUE', 'SKIPPED'].includes(inst.status);
                  return (
                    <div
                      key={inst.id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                        borderBottom: idx < currentInstances.length - 1 ? '1px solid var(--border)' : 'none',
                        cursor: clickable ? 'pointer' : 'default',
                        background: clickable ? 'transparent' : undefined,
                      }}
                      onClick={() => { if (clickable) setActiveDrawer(inst); }}
                    >
                      {/* Status badge */}
                      <StatusBadge status={inst.status} />

                      {/* Name + due day */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ font: 'var(--t-body)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={inst.template_name}>{inst.template_name}</div>
                        <div style={{ font: 'var(--t-caption)', color: 'var(--fg-muted)' }}>Due day {new Date(inst.due_date).getDate()}</div>
                      </div>

                      {/* Amount */}
                      <div style={{ font: 'var(--t-body)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {inst.status === 'PAID' && inst.actual_amount_paisa != null
                          ? <Amount paisa={inst.actual_amount_paisa} />
                          : <Amount paisa={inst.standard_amount_paisa} />
                        }
                      </div>

                      {/* Template actions */}
                      {tmpl && (
                        <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => { setEditTemplate(tmpl); setTemplateModalOpen(true); }}
                            style={{ padding: '4px 8px', borderRadius: 5, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', color: 'var(--fg-secondary)', display: 'flex', alignItems: 'center' }}
                            title="Edit"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M21.731 2.269a2.625 2.625 0 00-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 000-3.712zM19.513 8.199l-3.712-3.712-12.15 12.15a5.25 5.25 0 00-1.32 2.214l-.8 2.685a.75.75 0 00.933.933l2.685-.8a5.25 5.25 0 002.214-1.32L19.513 8.2z"/></svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(tmpl)}
                            style={{ padding: '4px 8px', borderRadius: 5, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', color: 'var(--danger)', display: 'flex', alignItems: 'center' }}
                            title="Delete"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path fillRule="evenodd" d="M16.5 4.478v.227a48.816 48.816 0 013.878.512.75.75 0 11-.256 1.478l-.209-.035-1.005 13.07a3 3 0 01-2.991 2.77H8.084a3 3 0 01-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 01-.256-1.478A48.567 48.567 0 017.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 013.369 0c1.603.051 2.815 1.387 2.815 2.951zm-6.136-1.452a51.196 51.196 0 013.273 0C14.39 3.05 15 3.684 15 4.478v.113a49.488 49.488 0 00-6 0v-.113c0-.794.609-1.428 1.364-1.452zm-.355 5.945a.75.75 0 10-1.5.058l.347 9a.75.75 0 101.499-.058l-.346-9zm5.48.058a.75.75 0 10-1.498-.058l-.347 9a.75.75 0 001.5.058l.345-9z" clipRule="evenodd"/></svg>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}

              {/* Summary row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: 'var(--border)', borderTop: '1px solid var(--border)' }}>
                {[
                  { label: 'Total Paid', value: currentPaid, color: 'var(--ok)' },
                  { label: 'Pending', value: currentPending, color: 'var(--warn)' },
                  { label: 'Monthly Total', value: currentTotal, color: 'var(--fg-primary)' },
                ].map(item => (
                  <div key={item.label} style={{ padding: '10px 16px', background: 'var(--bg-sunken)', textAlign: 'center' }}>
                    <div style={{ font: 'var(--t-caption)', color: 'var(--fg-secondary)', marginBottom: 2 }}>{item.label}</div>
                    <div style={{ font: 'var(--t-body)', fontWeight: 700, color: item.color }}>{fmt(item.value)}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ═══════════════════════════════════════════════════════════════
              PANEL 2 — Yearly View
          ═══════════════════════════════════════════════════════════════ */}
          <section>
            {/* Year selector */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h2 style={{ font: 'var(--t-section)', margin: 0 }}>Yearly Overview</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  onClick={() => setSelectedYear(y => y - 1)}
                  style={{ padding: '5px 11px', border: '1px solid var(--border)', borderRadius: 6, background: 'transparent', cursor: 'pointer', font: 'var(--t-body)', color: 'var(--fg-secondary)' }}
                >‹</button>
                <span style={{ font: '600 15px var(--font-space-grotesk, system-ui)', minWidth: 44, textAlign: 'center' }}>{selectedYear}</span>
                <button
                  onClick={() => setSelectedYear(y => y + 1)}
                  disabled={selectedYear >= new Date().getFullYear()}
                  style={{ padding: '5px 11px', border: '1px solid var(--border)', borderRadius: 6, background: 'transparent', cursor: selectedYear >= new Date().getFullYear() ? 'not-allowed' : 'pointer', opacity: selectedYear >= new Date().getFullYear() ? 0.3 : 1, font: 'var(--t-body)', color: 'var(--fg-secondary)' }}
                >›</button>
              </div>
            </div>

            {yearLoading ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--fg-muted)' }}>Loading year data…</div>
            ) : (
              <div className="table-scroll" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10 }}>
                <table style={{ borderCollapse: 'collapse', minWidth: 900, width: '100%' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-sunken)', borderBottom: '2px solid var(--border)' }}>
                      <th style={{ padding: '10px 16px', textAlign: 'left', font: 'var(--t-label)', color: 'var(--fg-secondary)', minWidth: 180, position: 'sticky', left: 0, background: 'var(--bg-sunken)' }}>
                        Fixed Expense
                      </th>
                      {MONTH_SHORT.map((m, i) => (
                        <th key={i} style={{
                          padding: '10px 8px', textAlign: 'center', font: 'var(--t-label)', color: 'var(--fg-secondary)', minWidth: 72,
                          background: `${selectedYear}-${String(i + 1).padStart(2, '0')}` === currentMonth ? 'rgba(99,102,241,0.06)' : undefined,
                        }}>
                          {m}
                        </th>
                      ))}
                      <th style={{ padding: '10px 12px', textAlign: 'right', font: 'var(--t-label)', color: 'var(--fg-secondary)', minWidth: 80 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {uniqueTemplates.map((tmpl, tIdx) => (
                      <tr key={tmpl.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        {/* Template info */}
                        <td style={{ padding: '10px 16px', position: 'sticky', left: 0, background: 'var(--bg-surface)', borderRight: '1px solid var(--border)' }}>
                          <div style={{ font: 'var(--t-body)', fontWeight: 500 }}>{tmpl.name}</div>
                          <div style={{ font: 'var(--t-caption)', color: 'var(--fg-muted)' }}>{fmt(tmpl.standard_amount_paisa)} · Day {tmpl.due_day}</div>
                          {tmpl.end_month && <div style={{ font: 'var(--t-caption)', color: 'var(--warn)' }}>Inactive from {tmpl.end_month}</div>}
                        </td>

                        {/* One cell per month */}
                        {yearMonths.map((monthIdx) => {
                          const inst = getYearInstance(tmpl.id, monthIdx);
                          const status = inst?.status ?? 'FUTURE';
                          const isCurrentCol = `${selectedYear}-${String(monthIdx + 1).padStart(2, '0')}` === currentMonth;
                          const clickable = inst && ['PENDING', 'DUE_SOON', 'OVERDUE', 'SKIPPED'].includes(status);
                          const amount = inst ? (inst.actual_amount_paisa ?? inst.standard_amount_paisa) : tmpl.standard_amount_paisa;

                          return (
                            <td
                              key={monthIdx}
                              style={{
                                padding: '8px 6px', textAlign: 'center', cursor: clickable ? 'pointer' : 'default',
                                background: isCurrentCol ? 'rgba(99,102,241,0.04)' : undefined,
                              }}
                              onClick={() => { if (clickable && inst) setActiveDrawer(inst); }}
                            >
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                                <span style={{
                                  fontSize: 13, fontWeight: 700,
                                  color: status === 'PAID' ? 'var(--ok)' : status === 'DUE_SOON' ? 'var(--warn)' : status === 'OVERDUE' ? 'var(--danger)' : status === 'SKIPPED' ? 'var(--fg-muted)' : 'var(--fg-muted)',
                                }}>
                                  {status === 'PAID' ? '✓' : status === 'DUE_SOON' ? '⚠' : status === 'OVERDUE' ? '✕' : status === 'SKIPPED' ? '—' : status === 'PENDING' ? '●' : '○'}
                                </span>
                                {inst && (
                                  <span style={{ font: 'var(--t-caption)', color: 'var(--fg-secondary)', fontSize: 10 }}>
                                    {fmt(amount)}
                                  </span>
                                )}
                              </div>
                            </td>
                          );
                        })}

                        {/* Row actions */}
                        <td style={{ padding: '8px 12px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                            <button type="button" onClick={() => { setEditTemplate(tmpl); setTemplateModalOpen(true); }} style={{ padding: '4px 8px', borderRadius: 5, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', color: 'var(--fg-secondary)', display: 'flex', alignItems: 'center' }} title="Edit">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M21.731 2.269a2.625 2.625 0 00-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 000-3.712zM19.513 8.199l-3.712-3.712-12.15 12.15a5.25 5.25 0 00-1.32 2.214l-.8 2.685a.75.75 0 00.933.933l2.685-.8a5.25 5.25 0 002.214-1.32L19.513 8.2z"/></svg>
                            </button>
                            <button type="button" onClick={() => handleDelete(tmpl)} style={{ padding: '4px 8px', borderRadius: 5, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', color: 'var(--danger)', display: 'flex', alignItems: 'center' }} title="Delete">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path fillRule="evenodd" d="M16.5 4.478v.227a48.816 48.816 0 013.878.512.75.75 0 11-.256 1.478l-.209-.035-1.005 13.07a3 3 0 01-2.991 2.77H8.084a3 3 0 01-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 01-.256-1.478A48.567 48.567 0 017.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 013.369 0c1.603.051 2.815 1.387 2.815 2.951zm-6.136-1.452a51.196 51.196 0 013.273 0C14.39 3.05 15 3.684 15 4.478v.113a49.488 49.488 0 00-6 0v-.113c0-.794.609-1.428 1.364-1.452zm-.355 5.945a.75.75 0 10-1.5.058l.347 9a.75.75 0 101.499-.058l-.346-9zm5.48.058a.75.75 0 10-1.498-.058l-.347 9a.75.75 0 001.5.058l.345-9z" clipRule="evenodd"/></svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>

                  {/* Totals footer */}
                  <tfoot>
                    <tr style={{ borderTop: '2px solid var(--border)', background: 'var(--bg-sunken)' }}>
                      <td style={{ padding: '10px 16px', font: 'var(--t-label)', fontWeight: 700, color: 'var(--fg-secondary)', position: 'sticky', left: 0, background: 'var(--bg-sunken)', borderRight: '1px solid var(--border)' }}>
                        MONTHLY TOTAL
                      </td>
                      {yearMonths.map(monthIdx => {
                        const total = yearMonthTotal(monthIdx);
                        const isCurrentCol = `${selectedYear}-${String(monthIdx + 1).padStart(2, '0')}` === currentMonth;
                        return (
                          <td key={monthIdx} style={{ padding: '10px 6px', textAlign: 'center', font: 'var(--t-body)', fontWeight: 700, background: isCurrentCol ? 'rgba(99,102,241,0.04)' : undefined }}>
                            {total > 0 ? fmt(total) : <span style={{ color: 'var(--fg-muted)' }}>—</span>}
                          </td>
                        );
                      })}
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {/* Legend */}
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', font: 'var(--t-caption)', color: 'var(--fg-secondary)', marginTop: 10 }}>
              {[['✓','PAID','var(--ok)'],['⚠','DUE_SOON','var(--warn)'],['✕','OVERDUE','var(--danger)'],['●','PENDING','var(--fg-secondary)'],['—','SKIPPED','var(--fg-muted)'],['○','FUTURE','var(--fg-muted)']].map(([sym, label, color]) => (
                <span key={label as string}><span style={{ color: color as string }}>{sym}</span> {(label as string).replace('_', ' ')}</span>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* Modals & Drawers */}
      {activeDrawer && <PayDrawer instance={activeDrawer} onClose={() => setActiveDrawer(null)} onDone={reloadAll} />}
      <SetupModal open={setupOpen} onClose={() => setSetupOpen(false)} onDone={reloadAll} categories={categories} savingsAccounts={savingsAccounts} existingNames={templates.map(t => t.name.toLowerCase())} />
      <TemplateModal open={templateModalOpen} onClose={() => setTemplateModalOpen(false)} onSaved={reloadAll} edit={editTemplate} categories={categories} savingsAccounts={savingsAccounts} />
    </div>
  );
}
