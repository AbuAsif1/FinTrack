'use client';

import { useState } from 'react';
import api from '@/lib/api';

export interface Category {
  id: string;
  name: string;
  colorHex: string;
  routing_type: string;
}

export interface SavingsAccount {
  id: string;
  name: string;
  type: string;
  balance_paisa: number;
}

export interface LoanPerson {
  id: string;
  name: string;
}

export interface FixedExpenseTemplate {
  id: string;
  name: string;
  standard_amount_paisa: number;
  due_day: number;
  category_id?: string;
  category?: { id: string; name: string; routing_type: string };
}

export interface EditingTransaction {
  id: string;
  amount_paisa: number;
  date: string;
  description: string;
  category_id: string;
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

interface Form {
  amount_paisa: string;
  date: string;
  description: string;
  category_id: string;      // may be '__FIXED_EXPENSE__' as a UI placeholder
  payment_method: string;
  savings_account_id: string;
  loan_person_name: string;
  loan_direction: string;
  loan_reason: string;
  loan_return_due_date: string;
  transfer_from_id: string;
  transfer_to_id: string;
  idempotency_key: string;
  fixed_expense_id: string;
}

const PAYMENT_METHODS = ['CASH', 'BANK', 'BKASH', 'NAGAD', 'ROCKET', 'CARD'];

function fmt(paisa: number) {
  return '৳' + (paisa / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function TransactionModal({
  categories,
  savingsAccounts,
  loanPersons,
  fixedExpenses = [],
  editing,
  onClose,
  onSaved,
  onRequestConfirm,
}: {
  categories: Category[];
  savingsAccounts: SavingsAccount[];
  loanPersons: LoanPerson[];
  fixedExpenses?: FixedExpenseTemplate[];
  editing: EditingTransaction | null;
  onClose: () => void;
  onSaved: () => void;
  onRequestConfirm?: (proceed: () => Promise<void>, cancel: () => void) => void;
}) {
  const isEdit = !!editing;
  const [form, setForm] = useState<Form>(() => ({
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
    transfer_from_id: '',
    transfer_to_id: '',
    idempotency_key: crypto.randomUUID(),
    fixed_expense_id: '',
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isTransfer = form.category_id === '__TRANSFER__';
  const isFixedExpenseMode = form.category_id === '__FIXED_EXPENSE__';

  // For routing type detection: use the template's category when in fixed-expense mode
  const selectedFixedTemplate = fixedExpenses.find((t) => t.id === form.fixed_expense_id);
  const effectiveCategoryId = isFixedExpenseMode
    ? (selectedFixedTemplate?.category?.id ?? selectedFixedTemplate?.category_id ?? '')
    : form.category_id;
  const selectedCat = categories.find((c) => c.id === effectiveCategoryId);
  const routingType = selectedCat?.routing_type ?? 'NONE';
  const isSavings = routingType === 'SAVINGS_DEPOSIT' || routingType === 'SAVINGS_WITHDRAWAL';
  const isLoan = routingType === 'LOAN_GIVEN' || routingType === 'LOAN_RECEIVED';
  const isTax = routingType === 'TAX';
  const savingsOnly = savingsAccounts.filter((a) => a.type === 'SAVINGS');

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 10px', border: '1px solid var(--border)',
    borderRadius: 6, font: 'var(--t-body)', background: 'var(--bg-sunken)', boxSizing: 'border-box',
  };

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const val = e.target.value;
    setForm((f) => {
      const next = { ...f, [k]: val };
      if (k === 'payment_method' && val !== 'BANK') next.savings_account_id = '';
      if (k === 'category_id') {
        next.transfer_from_id = '';
        next.transfer_to_id = '';
        next.savings_account_id = '';
        next.fixed_expense_id = '';
      }
      return next;
    });
  };

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

    if (isFixedExpenseMode && fixedExpenses.length > 0 && !selectedFixedTemplate) {
      setError('Please select which fixed expense this payment is for.');
      setSaving(false);
      return;
    }
    // If no templates loaded but fixed expense mode selected, block save with guidance
    if (isFixedExpenseMode && fixedExpenses.length === 0) {
      setError('No fixed expenses found. Add them on the Fixed Expenses page first, or choose a different category.');
      setSaving(false);
      return;
    }

    if (isTransfer && (!form.transfer_from_id || !form.transfer_to_id)) {
      setError('Select both source and destination accounts.');
      setSaving(false);
      return;
    }
    if (isTransfer && form.transfer_from_id === form.transfer_to_id) {
      setError('Source and destination must be different.');
      setSaving(false);
      return;
    }

    const doSave = async () => {
      try {
        if (isTransfer) {
          await api.post('/savings-accounts/transfer', {
            from_account_id: form.transfer_from_id,
            to_account_id: form.transfer_to_id,
            amount_paisa: amountPaisa,
            date: form.date,
            description: form.description || undefined,
          });
        } else {
          // Use the template's real category_id when in fixed-expense mode; fall back to empty (will error server-side) if none selected
          const categoryIdToSend = isFixedExpenseMode && effectiveCategoryId ? effectiveCategoryId : form.category_id;
          const body: Record<string, unknown> = {
            amount_paisa: amountPaisa,
            date: form.date,
            description: form.description,
            category_id: categoryIdToSend,
            payment_method: form.payment_method,
            idempotency_key: form.idempotency_key,
          };
          if (isSavings && form.savings_account_id) body.savings_account_id = form.savings_account_id;
          if (!isSavings && !isLoan && !isTax && form.payment_method === 'BANK' && form.savings_account_id) {
            body.savings_account_id = form.savings_account_id;
          }
          if (isLoan) {
            body.loan_person_name = form.loan_person_name;
            if (form.loan_reason) body.reason = form.loan_reason;
            if (form.loan_return_due_date) body.return_due_date = form.loan_return_due_date;
          }
          if (isEdit) {
            await api.patch(`/transactions/${editing!.id}`, body);
          } else {
            await api.post('/transactions', body);
          }
        }
        onSaved();
      } catch (err: unknown) {
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status === 409) { onSaved(); return; }
        const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to save.';
        setError(msg);
        setSaving(false);
      }
    };

    if (isEdit && onRequestConfirm) {
      onRequestConfirm(doSave, () => setSaving(false));
      return;
    }

    await doSave();
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background: 'var(--bg-surface)', borderRadius: 12, padding: 28, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <h2 style={{ font: 'var(--t-section)', marginBottom: 20 }}>
          {isEdit ? 'Edit Transaction' : 'Add Expenses'}
        </h2>

        <form onSubmit={submit}>
          {/* Amount + Date */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <label>
              <div style={{ font: 'var(--t-label)', marginBottom: 4 }}>Amount (৳)</div>
              <input type="number" step="0.01" min="0.01" required value={form.amount_paisa} onChange={set('amount_paisa')} style={inputStyle} />
            </label>
            <label>
              <div style={{ font: 'var(--t-label)', marginBottom: 4 }}>Date</div>
              <input type="date" required value={form.date} onChange={set('date')} style={inputStyle} />
            </label>
          </div>

          {/* Description */}
          <label style={{ display: 'block', marginBottom: 12 }}>
            <div style={{ font: 'var(--t-label)', marginBottom: 4 }}>Description</div>
            <input
              type="text"
              required={!isTransfer}
              placeholder={isTransfer ? 'Optional note' : ''}
              value={form.description}
              onChange={set('description')}
              style={inputStyle}
            />
          </label>

          {/* Category + Payment Method */}
          <div style={{ display: 'grid', gridTemplateColumns: isTransfer ? '1fr' : '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <label>
              <div style={{ font: 'var(--t-label)', marginBottom: 4 }}>Category</div>
              <select required value={form.category_id} onChange={set('category_id')} style={inputStyle}>
                <option value="">Select category…</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
                {!isEdit && (
                  <option value="__FIXED_EXPENSE__">📋 Fixed Expenses</option>
                )}
                {!isEdit && savingsOnly.length >= 2 && (
                  <option value="__TRANSFER__">⇄ Transfer between accounts</option>
                )}
              </select>
            </label>
            {!isTransfer && (
              <label>
                <div style={{ font: 'var(--t-label)', marginBottom: 4 }}>Payment Method</div>
                <select value={form.payment_method} onChange={set('payment_method')} style={inputStyle}>
                  {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </label>
            )}
          </div>

          {/* Fixed Expense mode: template picker */}
          {isFixedExpenseMode && (
            <div style={{ background: 'rgba(99,102,241,0.07)', borderLeft: '3px solid var(--accent)', borderRadius: 6, padding: '12px 14px', marginBottom: 12 }}>
              <div style={{ font: 'var(--t-caption)', color: 'var(--accent)', marginBottom: 8, fontWeight: 600 }}>
                📋 Which fixed expense is this payment for?
              </div>
              {fixedExpenses.length === 0 ? (
                <div style={{ font: 'var(--t-caption)', color: 'var(--fg-muted)', padding: '8px 0' }}>
                  No fixed expenses set up yet. Add them on the <strong>Fixed Expenses</strong> page first.
                </div>
              ) : (
                <select
                  required
                  value={form.fixed_expense_id}
                  onChange={(e) => {
                    const id = e.target.value;
                    const tmpl = fixedExpenses.find((t) => t.id === id);
                    setForm((f) => ({
                      ...f,
                      fixed_expense_id: id,
                      ...(tmpl ? {
                        amount_paisa: String(tmpl.standard_amount_paisa / 100),
                        description: tmpl.name,
                      } : {}),
                    }));
                  }}
                  style={inputStyle}
                >
                  <option value="">Select fixed expense…</option>
                  {fixedExpenses.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                      {t.category ? ` · ${t.category.name}` : ''}
                      {` · ৳${(t.standard_amount_paisa / 100).toLocaleString('en-IN', { minimumFractionDigits: 0 })}`}
                      {` · due day ${t.due_day}`}
                    </option>
                  ))}
                </select>
              )}
              {selectedFixedTemplate && (
                <div style={{ font: 'var(--t-caption)', color: 'var(--fg-muted)', marginTop: 6 }}>
                  Amount and description pre-filled. Adjust above if the actual amount differs.
                </div>
              )}
              {selectedFixedTemplate?.category && (
                <div style={{ font: 'var(--t-caption)', color: 'var(--fg-secondary)', marginTop: 4 }}>
                  Category: <strong>{selectedFixedTemplate.category.name}</strong> (from template)
                </div>
              )}
            </div>
          )}

          {/* Transfer: from / to */}
          {isTransfer && (
            <div style={{ background: 'rgba(58,95,205,0.08)', borderLeft: '3px solid var(--accent)', borderRadius: 6, padding: '10px 14px', marginBottom: 12 }}>
              <div style={{ font: 'var(--t-caption)', color: 'var(--accent)', marginBottom: 10 }}>
                ⇄ Moves money between your savings accounts. Both balances update instantly.
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <label>
                  <div style={{ font: 'var(--t-label)', marginBottom: 4 }}>From account</div>
                  <select required value={form.transfer_from_id} onChange={set('transfer_from_id')} style={inputStyle}>
                    <option value="">Select…</option>
                    {savingsOnly.map((a) => (
                      <option key={a.id} value={a.id}>{a.name} · {fmt(a.balance_paisa)}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <div style={{ font: 'var(--t-label)', marginBottom: 4 }}>To account</div>
                  <select required value={form.transfer_to_id} onChange={set('transfer_to_id')} style={inputStyle}>
                    <option value="">Select…</option>
                    {savingsOnly.filter((a) => a.id !== form.transfer_from_id).map((a) => (
                      <option key={a.id} value={a.id}>{a.name} · {fmt(a.balance_paisa)}</option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          )}

          {/* Bank account deduction */}
          {!isTransfer && !isFixedExpenseMode && form.payment_method === 'BANK' && !isSavings && !isLoan && !isTax && savingsOnly.length > 0 && (
            <div style={{ background: 'rgba(21,128,61,0.08)', borderLeft: '3px solid var(--ok)', borderRadius: 6, padding: '10px 14px', marginBottom: 12 }}>
              <div style={{ font: 'var(--t-caption)', color: 'var(--ok)', marginBottom: 6 }}>
                🏦 Deduct from bank account (optional)
              </div>
              <select value={form.savings_account_id} onChange={set('savings_account_id')} style={inputStyle}>
                <option value="">— Don't deduct from account —</option>
                {savingsOnly.map((a) => (
                  <option key={a.id} value={a.id}>{a.name} · {fmt(a.balance_paisa)}</option>
                ))}
              </select>
            </div>
          )}

          {/* Savings routing */}
          {!isTransfer && isSavings && (
            <div style={{ background: 'rgba(58,95,205,0.08)', borderLeft: '3px solid var(--accent)', borderRadius: 6, padding: '10px 14px', marginBottom: 12 }}>
              <div style={{ font: 'var(--t-caption)', color: 'var(--accent)', marginBottom: 6 }}>
                🔵 This will {routingType === 'SAVINGS_DEPOSIT' ? 'deposit into' : 'withdraw from'} your savings account.
              </div>
              <label>
                <div style={{ font: 'var(--t-label)', marginBottom: 4 }}>Savings Account</div>
                <select required value={form.savings_account_id} onChange={set('savings_account_id')} style={inputStyle}>
                  <option value="">Select account…</option>
                  {savingsAccounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </label>
            </div>
          )}

          {/* Loan routing */}
          {!isTransfer && isLoan && (
            <div style={{ background: 'rgba(58,95,205,0.08)', borderLeft: '3px solid var(--accent)', borderRadius: 6, padding: '10px 14px', marginBottom: 12 }}>
              <div style={{ font: 'var(--t-caption)', color: 'var(--accent)', marginBottom: 8 }}>🤝 This will update the loan ledger.</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 8 }}>
                <label>
                  <div style={{ font: 'var(--t-label)', marginBottom: 4 }}>Person</div>
                  <input type="text" required placeholder="Name" value={form.loan_person_name} onChange={set('loan_person_name')} list="loan-persons-list" style={inputStyle} />
                  <datalist id="loan-persons-list">
                    {loanPersons.map((p) => <option key={p.id} value={p.name} />)}
                  </datalist>
                </label>
                <label>
                  <div style={{ font: 'var(--t-label)', marginBottom: 4 }}>Direction</div>
                  <select value={form.loan_direction} onChange={set('loan_direction')} style={inputStyle}>
                    <option value="GIVEN">I gave</option>
                    <option value="RECEIVED">I received</option>
                  </select>
                </label>
              </div>
              <label style={{ display: 'block', marginBottom: 8 }}>
                <div style={{ font: 'var(--t-label)', marginBottom: 4 }}>Reason (optional)</div>
                <input type="text" value={form.loan_reason} onChange={set('loan_reason')} style={inputStyle} />
              </label>
              <label style={{ display: 'block' }}>
                <div style={{ font: 'var(--t-label)', marginBottom: 4 }}>Return due date (optional)</div>
                <input type="date" value={form.loan_return_due_date} onChange={set('loan_return_due_date')} style={inputStyle} />
              </label>
            </div>
          )}

          {/* Tax routing */}
          {!isTransfer && isTax && (
            <div style={{ background: 'rgba(58,95,205,0.08)', borderLeft: '3px solid var(--accent)', borderRadius: 6, padding: '10px 14px', marginBottom: 12 }}>
              <div style={{ font: 'var(--t-caption)', color: 'var(--accent)' }}>
                📋 This transaction will be recorded against the current Fiscal Year.
              </div>
            </div>
          )}

          {error && <div style={{ color: 'var(--danger)', font: 'var(--t-caption)', marginBottom: 10 }}>{error}</div>}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <button
              type="button" onClick={onClose}
              style={{ padding: '8px 20px', border: '1px solid var(--border)', borderRadius: 6, background: 'transparent', cursor: 'pointer', font: 'var(--t-body)' }}
            >
              Cancel
            </button>
            <button
              type="submit" disabled={saving}
              style={{ padding: '8px 20px', background: 'var(--accent)', color: 'var(--accent-fg)', border: 'none', borderRadius: 6, cursor: saving ? 'not-allowed' : 'pointer', font: 'var(--t-body)', opacity: saving ? 0.7 : 1 }}
            >
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : isTransfer ? 'Transfer' : 'Save Transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
