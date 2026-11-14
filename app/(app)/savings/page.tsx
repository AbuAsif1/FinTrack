'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { Amount } from '@/components/ui/Amount';
import { MoneyInput } from '@/components/ui/MoneyInput';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DatePicker } from '@/components/ui/DatePicker';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Account {
  id: string;
  name: string;
  type: string;
  bank_name?: string | null;
  last_four?: string | null;
  parent_account_id?: string | null;
  opening_date: string;
  opening_balance_paisa: number;
  balance_paisa: number;
  closed_on?: string | null;
  monthly_installment_paisa?: number | null;
  maturity_date?: string | null;
  interest_rate_bps?: number | null;
}

interface Totals {
  bank_paisa: number;
  mfs_paisa: number;
  cash_paisa: number;
  investment_paisa: number;
  net_worth_paisa: number;
}

interface AccountTx {
  id: string;
  date: string;
  description: string;
  amount_paisa: number;
  category_name: string;
}

const INVESTMENT_GROUP = '__INVESTMENT__';

const TYPE_OPTIONS = [
  { value: 'SAVINGS', label: 'Bank savings account' },
  { value: 'MFS', label: 'MFS account (bKash, Nagad…)' },
  { value: 'DPS', label: 'DPS' },
  { value: 'FDR', label: 'FDR' },
  { value: INVESTMENT_GROUP, label: 'Investment' },
  { value: 'CASH', label: 'In-Hand Cash' },
];

// Investment kinds match the Tax page's rebate investment types
const INVESTMENT_KINDS = [
  { value: 'SANCHAYPATRA', label: 'Sanchaypatra' },
  { value: 'UNIVERSAL_PENSION', label: 'Universal Pension (UPension)' },
  { value: 'STOCKS', label: 'Stocks' },
  { value: 'INSURANCE', label: 'Insurance' },
  { value: 'INVESTMENT', label: 'Others' },
];
const INVESTMENT_TYPES = INVESTMENT_KINDS.map((k) => k.value);

const TYPE_LABEL: Record<string, string> = {
  SAVINGS: 'Bank savings', MFS: 'MFS', DPS: 'DPS', FDR: 'FDR', CASH: 'In-Hand Cash',
  SANCHAYPATRA: 'Sanchaypatra', UNIVERSAL_PENSION: 'UPension', STOCKS: 'Stocks', INSURANCE: 'Insurance', INVESTMENT: 'Other investment',
};

const PARENT_TYPES = ['SAVINGS', 'MFS'];
const CHILD_TYPES = ['DPS', 'FDR'];
const PAYMENT_TYPES = ['SAVINGS', 'MFS', 'CASH'];

const inputStyle: React.CSSProperties = {
  padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)',
  background: 'var(--bg-sunken)', color: 'var(--fg-primary)', font: 'var(--t-body)', minHeight: 40,
};
const labelStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4, font: 'var(--t-body)' };
const quietButton: React.CSSProperties = {
  minHeight: 44, padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)',
  background: 'transparent', color: 'var(--fg-primary)', cursor: 'pointer', font: 'var(--t-body)',
};
const primaryButton: React.CSSProperties = {
  minHeight: 44, padding: '8px 16px', borderRadius: 6, border: 'none',
  background: 'var(--accent)', color: 'var(--accent-fg, #fff)', cursor: 'pointer', font: 'var(--t-body)',
};

function errorMessage(err: unknown, fallback: string) {
  return (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? fallback;
}

function monthYear(date: string) {
  return new Date(date).toLocaleDateString('en-BD', { month: 'short', year: 'numeric' });
}

// ---------------------------------------------------------------------------
// Add / Edit Account
// ---------------------------------------------------------------------------

function AccountModal({ open, onClose, onSaved, editAccount, accounts }: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editAccount: Account | null;
  accounts: Account[];
}) {
  const [name, setName] = useState('');
  const [type, setType] = useState('SAVINGS');
  const [parentId, setParentId] = useState('');
  const [bankName, setBankName] = useState('');
  const [lastFour, setLastFour] = useState('');
  const [openingDate, setOpeningDate] = useState('');
  const [openingBalancePaisa, setOpeningBalancePaisa] = useState<number | null>(0);
  const [installmentPaisa, setInstallmentPaisa] = useState<number | null>(null);
  const [maturityDate, setMaturityDate] = useState('');
  const [interestRatePct, setInterestRatePct] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const parents = accounts.filter((a) => PARENT_TYPES.includes(a.type) && !a.closed_on);
  const hasCash = accounts.some((a) => a.type === 'CASH' && !a.closed_on);
  const typeOptions = TYPE_OPTIONS.filter((t) => t.value !== 'CASH' || !hasCash);

  useEffect(() => {
    if (!open) return;
    setName(editAccount?.name ?? '');
    setType(editAccount?.type ?? 'SAVINGS');
    setParentId(editAccount?.parent_account_id ?? '');
    setBankName(editAccount?.bank_name ?? '');
    setLastFour(editAccount?.last_four ?? '');
    setOpeningDate(editAccount?.opening_date.slice(0, 10) ?? new Date().toISOString().slice(0, 10));
    setOpeningBalancePaisa(editAccount?.opening_balance_paisa ?? 0);
    setInstallmentPaisa(editAccount?.monthly_installment_paisa ?? null);
    setMaturityDate(editAccount?.maturity_date?.slice(0, 10) ?? '');
    setInterestRatePct(editAccount?.interest_rate_bps != null ? String(editAccount.interest_rate_bps / 100) : '');
    setError(null);
  }, [open, editAccount]);

  const isChild = CHILD_TYPES.includes(type);
  const isCash = type === 'CASH';
  const isInvestment = INVESTMENT_TYPES.includes(type);
  const hasTerm = isChild || isInvestment;
  const hasInstallment = type === 'DPS' || isInvestment;
  const parent = parents.find((p) => p.id === parentId);

  function chooseParent(id: string) {
    setParentId(id);
    const p = parents.find((a) => a.id === id);
    if (p && !bankName) setBankName(p.bank_name ?? '');
  }

  async function handleSave() {
    if (!name.trim()) { setError('Enter an account name.'); return; }
    if (isChild && !parentId) { setError('Choose the bank or MFS account this sits under.'); return; }
    if (!isCash && !bankName.trim()) { setError(type === 'MFS' ? 'Enter the provider, for example bKash.' : 'Enter the bank or issuer name.'); return; }
    if (!openingDate) { setError('Choose the opening date.'); return; }
    if (lastFour && !/^\d{4}$/.test(lastFour)) { setError('Last 4 digits must be exactly 4 digits.'); return; }

    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        name: name.trim(),
        bank_name: isCash ? 'In-Hand' : bankName.trim(),
        last_four: lastFour || null,
        monthly_installment_paisa: hasInstallment ? installmentPaisa : null,
        maturity_date: hasTerm && maturityDate ? maturityDate : null,
        interest_rate_bps: interestRatePct ? Math.round(Number(interestRatePct) * 100) : null,
        ...(isChild ? { parent_account_id: parentId } : {}),
      };
      if (editAccount) {
        await api.patch(`/savings-accounts/${editAccount.id}`, payload);
      } else {
        await api.post('/savings-accounts', {
          ...payload, type, opening_date: openingDate, opening_balance_paisa: openingBalancePaisa ?? 0,
        });
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(errorMessage(err, 'Could not save the account.'));
    } finally {
      setSaving(false);
    }
  }

  const title = editAccount
    ? (isChild && !editAccount.parent_account_id ? 'Link to parent account' : 'Edit account')
    : 'Add account';

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {!editAccount && (
          <label style={labelStyle}>
            Account type
            <select
              value={isInvestment ? INVESTMENT_GROUP : type}
              onChange={(e) => setType(e.target.value === INVESTMENT_GROUP ? 'SANCHAYPATRA' : e.target.value)}
              style={inputStyle}
            >
              {typeOptions.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </label>
        )}

        {!editAccount && isInvestment && (
          <label style={labelStyle}>
            Kind of investment
            <select value={type} onChange={(e) => setType(e.target.value)} style={inputStyle}>
              {INVESTMENT_KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
            </select>
            <span style={{ font: 'var(--t-caption)', color: 'var(--fg-muted)' }}>
              Payments into it count toward this kind&apos;s Tax Rebate on the Tax page.
            </span>
          </label>
        )}

        {editAccount && isInvestment && (
          <div style={{ font: 'var(--t-caption)', color: 'var(--fg-muted)' }}>Investment: {TYPE_LABEL[type]}</div>
        )}

        {isChild && (
          <label style={labelStyle}>
            Sits under
            {parents.length === 0 ? (
              <span style={{ font: 'var(--t-caption)', color: 'var(--warn)' }}>
                Add a bank savings or MFS account first. A {type} must sit under one.
              </span>
            ) : (
              <select value={parentId} onChange={(e) => chooseParent(e.target.value)} style={inputStyle}>
                <option value="">Choose a bank or MFS account…</option>
                {parents.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            )}
            {parent && (
              <span style={{ font: 'var(--t-caption)', color: 'var(--fg-muted)' }}>
                Its balance counts toward {parent.name}&apos;s total, and withdrawals go back into {parent.name}.
              </span>
            )}
          </label>
        )}

        <label style={labelStyle}>
          Account name
          <input
            type="text" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle}
            placeholder={isCash ? 'In-Hand Cash' : type === 'MFS' ? 'e.g. bKash personal' : type === 'DPS' ? 'e.g. BRAC DPS 5k' : type === 'UNIVERSAL_PENSION' ? 'e.g. UPension Progoti' : isInvestment ? 'e.g. 5-year Sanchaypatra' : 'e.g. BRAC Savings'}
          />
        </label>

        {!isCash && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
            <label style={labelStyle}>
              {type === 'MFS' ? 'Provider' : isInvestment ? 'Issuer' : 'Bank name'}
              <input
                type="text" value={bankName} onChange={(e) => setBankName(e.target.value)} style={inputStyle}
                placeholder={type === 'MFS' ? 'bKash' : 'BRAC Bank'}
              />
            </label>
            <label style={labelStyle}>
              Last 4 digits
              <input type="text" inputMode="numeric" value={lastFour} onChange={(e) => setLastFour(e.target.value)} maxLength={4} placeholder="1234" style={inputStyle} />
            </label>
          </div>
        )}

        {!editAccount && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
            <label style={labelStyle}>
              {isCash ? 'Counted on' : 'Opening date'}
              <DatePicker value={openingDate} onChange={setOpeningDate} />
            </label>
            <label style={labelStyle}>
              {isCash ? 'Cash in hand (৳)' : 'Opening balance (৳)'}
              <MoneyInput value={openingBalancePaisa} onChange={setOpeningBalancePaisa} id="opening-bal" />
            </label>
          </div>
        )}

        {hasInstallment && (
          <label style={labelStyle}>
            Monthly installment (৳){isInvestment ? ' — optional' : ''}
            <MoneyInput value={installmentPaisa} onChange={setInstallmentPaisa} id="monthly-install" />
          </label>
        )}

        {hasTerm && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
            <label style={labelStyle}>
              Maturity date
              <DatePicker value={maturityDate} onChange={setMaturityDate} />
            </label>
            <label style={labelStyle}>
              Interest rate (%)
              <input type="number" step="0.1" value={interestRatePct} onChange={(e) => setInterestRatePct(e.target.value)} placeholder="e.g. 7.5" style={inputStyle} />
            </label>
          </div>
        )}

        {error && <div role="alert" style={{ color: 'var(--danger)', font: 'var(--t-caption)' }}>{error}</div>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button type="button" onClick={onClose} style={quietButton}>Cancel</button>
          <button type="button" onClick={handleSave} disabled={saving} style={{ ...primaryButton, opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Saving…' : editAccount ? 'Save changes' : 'Add account'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Withdraw / Add interest
// ---------------------------------------------------------------------------

function QuickActionModal({ open, onClose, onSaved, account, action, accounts }: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  account: Account | null;
  action: 'WITHDRAW' | 'INTEREST' | null;
  accounts: Account[];
}) {
  const [amountPaisa, setAmountPaisa] = useState<number | null>(null);
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [receivingId, setReceivingId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const receivers = accounts.filter((a) => PAYMENT_TYPES.includes(a.type) && !a.closed_on && a.id !== account?.id);
  const isChild = !!account && CHILD_TYPES.includes(account.type);

  useEffect(() => {
    if (!open) return;
    setAmountPaisa(null);
    setDate(new Date().toISOString().slice(0, 10));
    setDescription(action === 'WITHDRAW' ? `Withdrawal from ${account?.name ?? ''}` : `Interest on ${account?.name ?? ''}`);
    setReceivingId(account?.parent_account_id ?? '');
    setError(null);
  }, [open, action, account]);

  async function handleSave() {
    if (!amountPaisa || amountPaisa <= 0) { setError('Enter an amount above ৳0.'); return; }
    if (!account || !action) return;
    if (action === 'WITHDRAW' && isChild && !receivingId) { setError('Choose where the money goes.'); return; }

    setSaving(true);
    setError(null);
    try {
      const { data: cats } = await api.get<Array<{ id: string; routing_type: string }>>('/categories');
      const routingType = action === 'WITHDRAW' ? 'SAVINGS_WITHDRAWAL' : 'SAVINGS_INTEREST';
      const cat = cats.find((c) => c.routing_type === routingType);
      if (!cat) { setError('Add a category for this first: none is set up as a savings withdrawal or interest.'); return; }

      await api.post('/transactions', {
        amount_paisa: amountPaisa,
        date,
        description,
        category_id: cat.id,
        payment_method: 'BANK',
        savings_account_id: account.id,
        ...(action === 'WITHDRAW' && receivingId ? { bank_account_id: receivingId } : {}),
        idempotency_key: crypto.randomUUID(),
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(errorMessage(err, 'Could not save.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={action === 'WITHDRAW' ? `Withdraw from ${account?.name ?? ''}` : `Add interest to ${account?.name ?? ''}`}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {action === 'WITHDRAW' && (
          <label style={labelStyle}>
            Money goes into
            <select value={receivingId} onChange={(e) => setReceivingId(e.target.value)} style={inputStyle}>
              {!isChild && <option value="">Not into one of my accounts</option>}
              {isChild && !receivingId && <option value="">Choose an account…</option>}
              {receivers.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </label>
        )}
        <label style={labelStyle}>
          Date
          <DatePicker value={date} onChange={setDate} />
        </label>
        <label style={labelStyle}>
          Amount (৳)
          <MoneyInput value={amountPaisa} onChange={setAmountPaisa} id="quick-amount" />
        </label>
        <label style={labelStyle}>
          Description
          <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} style={inputStyle} />
        </label>
        {error && <div role="alert" style={{ color: 'var(--danger)', font: 'var(--t-caption)' }}>{error}</div>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button type="button" onClick={onClose} style={quietButton}>Cancel</button>
          <button type="button" onClick={handleSave} disabled={saving} style={{ ...primaryButton, opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Saving…' : action === 'WITHDRAW' ? 'Withdraw' : 'Add interest'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Transfer between Payment Accounts
// ---------------------------------------------------------------------------

function TransferModal({ open, onClose, onSaved, from, accounts }: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  from: Account | null;
  accounts: Account[];
}) {
  const [toId, setToId] = useState('');
  const [amountPaisa, setAmountPaisa] = useState<number | null>(null);
  const [date, setDate] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const targets = accounts.filter((a) => !a.closed_on && a.id !== from?.id && (PAYMENT_TYPES.includes(a.type) || CHILD_TYPES.includes(a.type)));

  useEffect(() => {
    if (!open) return;
    setToId('');
    setAmountPaisa(null);
    setDate(new Date().toISOString().slice(0, 10));
    setNote('');
    setError(null);
  }, [open]);

  async function handleSave() {
    if (!from) return;
    if (!toId) { setError('Choose the account the money goes into.'); return; }
    if (!amountPaisa || amountPaisa <= 0) { setError('Enter an amount above ৳0.'); return; }
    setSaving(true);
    setError(null);
    try {
      await api.post('/savings-accounts/transfer', {
        from_account_id: from.id, to_account_id: toId, amount_paisa: amountPaisa, date, description: note || undefined,
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(errorMessage(err, 'Could not transfer.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`Transfer from ${from?.name ?? ''}`}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ font: 'var(--t-caption)', color: 'var(--fg-muted)' }}>
          Available: <Amount paisa={from?.balance_paisa ?? 0} />
        </div>
        <label style={labelStyle}>
          To
          <select value={toId} onChange={(e) => setToId(e.target.value)} style={inputStyle}>
            <option value="">Choose an account…</option>
            {targets.map((t) => <option key={t.id} value={t.id}>{t.name} ({TYPE_LABEL[t.type]})</option>)}
          </select>
        </label>
        <label style={labelStyle}>
          Amount (৳)
          <MoneyInput value={amountPaisa} onChange={setAmountPaisa} id="transfer-amount" />
        </label>
        <label style={labelStyle}>
          Date
          <DatePicker value={date} onChange={setDate} />
        </label>
        <label style={labelStyle}>
          Note (optional)
          <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. ATM withdrawal" style={inputStyle} />
        </label>
        {error && <div role="alert" style={{ color: 'var(--danger)', font: 'var(--t-caption)' }}>{error}</div>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button type="button" onClick={onClose} style={quietButton}>Cancel</button>
          <button type="button" onClick={handleSave} disabled={saving} style={{ ...primaryButton, opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Transferring…' : 'Transfer'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Transaction history drawer
// ---------------------------------------------------------------------------

function AccountDetail({ account, onClose }: { account: Account | null; onClose: () => void }) {
  const [txs, setTxs] = useState<AccountTx[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!account) return;
    setLoading(true);
    api.get<{ transactions: AccountTx[] }>(`/savings-accounts/${account.id}/transactions`)
      .then(({ data }) => setTxs(data.transactions))
      .finally(() => setLoading(false));
  }, [account]);

  if (!account) return null;

  return (
    <div
      role="dialog" aria-label={`${account.name} transactions`}
      style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end', background: 'rgba(0,0,0,0.4)' }}
      onClick={onClose}
    >
      <div
        style={{ width: '100%', maxWidth: 480, maxHeight: '80vh', background: 'var(--bg-surface)', borderRadius: '12px 12px 0 0', overflow: 'auto', padding: 20 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ font: 'var(--t-section)', margin: 0 }}>{account.name}</h2>
          <button type="button" onClick={onClose} aria-label="Close" style={{ ...quietButton, border: 'none', minWidth: 44, color: 'var(--fg-muted)' }}>×</button>
        </div>
        <div style={{ font: 'var(--t-data)', marginBottom: 16 }}><Amount paisa={account.balance_paisa} /></div>
        {loading ? (
          <div style={{ color: 'var(--fg-muted)' }}>Loading…</div>
        ) : txs.length === 0 ? (
          <div style={{ color: 'var(--fg-muted)', font: 'var(--t-body)' }}>No transactions yet.</div>
        ) : (
          txs.map((tx) => (
            <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <div>
                <div style={{ font: 'var(--t-body)' }}>{tx.description}</div>
                <div style={{ font: 'var(--t-caption)', color: 'var(--fg-muted)' }}>{tx.category_name}, {tx.date.slice(0, 10)}</div>
              </div>
              <div style={{ font: 'var(--t-body)', fontWeight: 600, fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}><Amount paisa={tx.amount_paisa} /></div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Account rows
// ---------------------------------------------------------------------------

type Actions = {
  onHistory: (a: Account) => void;
  onEdit: (a: Account) => void;
  onWithdraw: (a: Account) => void;
  onInterest: (a: Account) => void;
  onTransfer: (a: Account) => void;
  onCloseAccount: (a: Account) => void;
};

function AccountActions({ account, actions, hasChildren }: { account: Account; actions: Actions; hasChildren?: boolean }) {
  const closed = !!account.closed_on;
  const isPayment = PAYMENT_TYPES.includes(account.type);
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      <button type="button" onClick={() => actions.onHistory(account)} style={quietButton}>Transactions</button>
      {!closed && isPayment && <button type="button" onClick={() => actions.onTransfer(account)} style={quietButton}>Transfer</button>}
      {!closed && !isPayment && <button type="button" onClick={() => actions.onWithdraw(account)} style={quietButton}>Withdraw</button>}
      {!closed && account.type !== 'CASH' && <button type="button" onClick={() => actions.onInterest(account)} style={quietButton}>Add interest</button>}
      {!closed && <button type="button" onClick={() => actions.onEdit(account)} style={quietButton}>Edit</button>}
      {!closed && account.balance_paisa === 0 && !hasChildren && (
        <button type="button" onClick={() => actions.onCloseAccount(account)} style={{ ...quietButton, borderColor: 'var(--warn)', color: 'var(--warn)' }}>Close account</button>
      )}
    </div>
  );
}

function AccountLine({ account, nested }: { account: Account; nested?: boolean }) {
  const details = [
    nested || INVESTMENT_TYPES.includes(account.type) ? TYPE_LABEL[account.type] : null,
    !nested && account.type !== 'CASH' ? account.bank_name : null,
    account.last_four ? `ending ${account.last_four}` : null,
  ].filter(Boolean).join(', ');

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 16, flexWrap: 'wrap' }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ font: nested ? 'var(--t-body)' : 'var(--t-section)', fontWeight: nested ? 600 : undefined, color: account.closed_on ? 'var(--fg-muted)' : 'var(--fg-primary)' }}>
          {account.name}
        </div>
        <div style={{ font: 'var(--t-caption)', color: 'var(--fg-secondary)', marginTop: 2 }}>
          {details}
          {(account.type === 'DPS' || INVESTMENT_TYPES.includes(account.type)) && account.monthly_installment_paisa != null && (
            <>{details ? ', ' : ''}<Amount paisa={account.monthly_installment_paisa} /> a month</>
          )}
          {account.maturity_date && <>{', '}matures {monthYear(account.maturity_date)}</>}
          {account.closed_on && <>{', '}closed {monthYear(account.closed_on)}</>}
        </div>
      </div>
      <div style={{ font: nested ? 'var(--t-body)' : 'var(--t-data)', fontWeight: 600, fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>
        <Amount paisa={account.balance_paisa} />
      </div>
    </div>
  );
}

function ParentCard({ account, childAccounts, actions }: { account: Account; childAccounts: Account[]; actions: Actions }) {
  const openChildren = childAccounts.filter((c) => !c.closed_on);
  return (
    <section style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 20 }}>
      <AccountLine account={account} />
      <div style={{ marginTop: 12 }}>
        <AccountActions account={account} actions={actions} hasChildren={openChildren.length > 0} />
      </div>
      {childAccounts.length > 0 && (
        <div style={{ marginTop: 16, borderLeft: '2px solid var(--savings)', paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {childAccounts.map((c) => (
            <div key={c.id}>
              <AccountLine account={c} nested />
              <div style={{ marginTop: 8 }}><AccountActions account={c} actions={actions} /></div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function SimpleCard({ account, actions, prompt }: { account: Account; actions: Actions; prompt?: React.ReactNode }) {
  return (
    <section style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 20 }}>
      <AccountLine account={account} />
      {prompt}
      <div style={{ marginTop: 12 }}><AccountActions account={account} actions={actions} /></div>
    </section>
  );
}

function GroupHeading({ children }: { children: React.ReactNode }) {
  return <h2 style={{ font: 'var(--t-section)', margin: '28px 0 12px' }}>{children}</h2>;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function BankAndWalletPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editAccount, setEditAccount] = useState<Account | null>(null);
  const [historyAccount, setHistoryAccount] = useState<Account | null>(null);
  const [quick, setQuick] = useState<{ account: Account; action: 'WITHDRAW' | 'INTEREST' } | null>(null);
  const [transferFrom, setTransferFrom] = useState<Account | null>(null);
  const [closeConfirm, setCloseConfirm] = useState<Account | null>(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get<{ accounts: Account[]; totals: Totals }>('/savings-accounts');
      setAccounts(data.accounts ?? []);
      setTotals(data.totals);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function closeAccount(account: Account) {
    setCloseConfirm(account);
  }

  async function confirmClose(account: Account) {
    setCloseConfirm(null);
    try {
      await api.patch(`/savings-accounts/${account.id}`, { closed_on: new Date().toISOString().slice(0, 10) });
    } catch (err) {
      alert(errorMessage(err, 'Could not close the account.'));
    }
    load();
  }

  const actions: Actions = {
    onHistory: setHistoryAccount,
    onEdit: (a) => { setEditAccount(a); setModalOpen(true); },
    onWithdraw: (a) => setQuick({ account: a, action: 'WITHDRAW' }),
    onInterest: (a) => setQuick({ account: a, action: 'INTEREST' }),
    onTransfer: setTransferFrom,
    onCloseAccount: closeAccount,
  };

  const childrenOf = (id: string) => accounts.filter((a) => a.parent_account_id === id);
  const banks = accounts.filter((a) => a.type === 'SAVINGS');
  const mfs = accounts.filter((a) => a.type === 'MFS');
  const investments = accounts.filter((a) => INVESTMENT_TYPES.includes(a.type));
  const cash = accounts.filter((a) => a.type === 'CASH');
  const unlinked = accounts.filter((a) => CHILD_TYPES.includes(a.type) && !a.parent_account_id);

  const addButton = (
    <button type="button" onClick={() => { setEditAccount(null); setModalOpen(true); }} style={primaryButton}>
      + Add account
    </button>
  );

  return (
    <div>
      <PageHeader
        eyebrow="Where your money is"
        title="Bank & Wallet"
        description="Bank, MFS and cash balances, with each DPS and FDR shown under the account it belongs to."
        actions={addButton}
      />

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Hero banner skeleton */}
          <SkeletonCard height={110} />
          {/* Account cards skeleton */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
            {[0, 1, 2, 3].map((i) => <SkeletonCard key={i} height={130} />)}
          </div>
        </div>
      ) : accounts.length === 0 ? (
        <EmptyState
          icon="🏦"
          heading="No accounts yet"
          body="Add your bank account first. Then add your bKash or other MFS account, your In-Hand Cash, and any DPS or FDR under the account that pays for it."
          action={addButton}
        />
      ) : (
        <>
          {totals && (
            <div style={{
              background: 'linear-gradient(135deg, #2D5BE3 0%, #1A2340 100%)',
              borderRadius: 16, padding: '24px 28px', marginBottom: 8,
              display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap',
            }}>
              <div style={{ flex: '1 1 180px', minWidth: 180 }}>
                <div style={{ color: 'rgba(148,196,255,0.85)', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
                  Net Worth
                </div>
                <div style={{ color: totals.net_worth_paisa < 0 ? '#FCA5A5' : '#FFFFFF', font: '700 30px var(--font-space-grotesk, system-ui)', lineHeight: 1.1 }}>
                  {totals.net_worth_paisa < 0 && <span style={{ fontSize: 20, marginRight: 2, opacity: 0.8 }}>−</span>}
                  <Amount paisa={Math.abs(totals.net_worth_paisa)} />
                </div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 6 }}>All accounts combined</div>
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {([
                  { label: 'Bank', value: <Amount paisa={totals.bank_paisa} />, accent: '#93C5FD' },
                  { label: 'MFS', value: <Amount paisa={totals.mfs_paisa} />, accent: '#86EFAC' },
                  { label: 'Cash', value: <Amount paisa={totals.cash_paisa} />, accent: '#FCD34D' },
                  { label: 'Investments', value: <Amount paisa={totals.investment_paisa} />, accent: '#C4B5FD' },
                ] as Array<{ label: string; value: JSX.Element; accent: string }>).map((kpi) => (
                  <div key={kpi.label} style={{ background: 'rgba(255,255,255,0.09)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 10, padding: '10px 14px', minWidth: 110 }}>
                    <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 5 }}>
                      {kpi.label}
                    </div>
                    <div style={{ color: kpi.accent, font: '700 14px var(--font-space-grotesk, system-ui)', fontVariantNumeric: 'tabular-nums' }}>
                      {kpi.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {unlinked.length > 0 && (
            <>
              <GroupHeading>Needs a parent account</GroupHeading>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
                {unlinked.map((a) => (
                  <SimpleCard
                    key={a.id} account={a} actions={actions}
                    prompt={
                      <div style={{ marginTop: 12, padding: '10px 12px', borderRadius: 8, background: 'var(--bg-sunken)', font: 'var(--t-caption)', color: 'var(--fg-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                        <span>Counted in Net Worth only until you choose the account it sits under.</span>
                        <button type="button" onClick={() => actions.onEdit(a)} style={primaryButton}>Link to parent account</button>
                      </div>
                    }
                  />
                ))}
              </div>
            </>
          )}

          {banks.length > 0 && (
            <>
              <GroupHeading>Bank accounts</GroupHeading>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
                {banks.map((a) => <ParentCard key={a.id} account={a} childAccounts={childrenOf(a.id)} actions={actions} />)}
              </div>
            </>
          )}

          {mfs.length > 0 && (
            <>
              <GroupHeading>MFS accounts</GroupHeading>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
                {mfs.map((a) => <ParentCard key={a.id} account={a} childAccounts={childrenOf(a.id)} actions={actions} />)}
              </div>
            </>
          )}

          {investments.length > 0 && (
            <>
              <GroupHeading>Investments</GroupHeading>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
                {investments.map((a) => <SimpleCard key={a.id} account={a} actions={actions} />)}
              </div>
            </>
          )}

          {cash.length > 0 && (
            <>
              <GroupHeading>In-Hand Cash</GroupHeading>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
                {cash.map((a) => <SimpleCard key={a.id} account={a} actions={actions} />)}
              </div>
            </>
          )}
        </>
      )}

      <AccountModal open={modalOpen} onClose={() => setModalOpen(false)} onSaved={load} editAccount={editAccount} accounts={accounts} />
      <AccountDetail account={historyAccount} onClose={() => setHistoryAccount(null)} />
      <QuickActionModal
        open={!!quick} onClose={() => setQuick(null)} onSaved={load}
        account={quick?.account ?? null} action={quick?.action ?? null} accounts={accounts}
      />
      <TransferModal open={!!transferFrom} onClose={() => setTransferFrom(null)} onSaved={load} from={transferFrom} accounts={accounts} />
      <ConfirmDialog
        open={!!closeConfirm}
        title={`Close "${closeConfirm?.name}"?`}
        message="You won't be able to add new entries to a closed account. Existing history is kept."
        confirmLabel="Close Account"
        variant="warn"
        onConfirm={() => closeConfirm && confirmClose(closeConfirm)}
        onCancel={() => setCloseConfirm(null)}
      />
    </div>
  );
}
