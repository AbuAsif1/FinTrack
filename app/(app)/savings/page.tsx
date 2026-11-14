'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { Amount } from '@/components/ui/Amount';
import { MoneyInput } from '@/components/ui/MoneyInput';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { SummaryTile } from '@/components/ui/SummaryTile';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { DatePicker } from '@/components/ui/DatePicker';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SavingsAccount {
  id: string;
  name: string;
  type: string;
  bank_name?: string | null;
  last_four?: string | null;
  opening_date: string;
  opening_balance_paisa: number;
  balance_paisa: number;
  closed_on?: string | null;
  // DPS fields
  monthly_installment_paisa?: number | null;
  maturity_date?: string | null;
  interest_rate_bps?: number | null;
  projected_principal_paisa?: number | null;
}

interface AccountsSummary {
  accounts: SavingsAccount[];
  total_saved_paisa: number;
  this_fy_deposits_paisa: number;
  dps_this_fy_paisa: number;
  dps_cap_paisa: number;
  active_dps_count: number;
}

interface SavingsTx {
  id: string;
  date: string;
  description: string;
  amount_paisa: number;
  category_name: string;
}

const ACCOUNT_TYPES = [
  { value: 'SAVINGS', label: 'Savings' },
  { value: 'DPS', label: 'DPS' },
  { value: 'FDR', label: 'FDR' },
  { value: 'SANCHAYPATRA', label: 'Sanchaypatra' },
];

// ---------------------------------------------------------------------------
// Add/Edit Account Modal
// ---------------------------------------------------------------------------

interface AccountModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editAccount?: SavingsAccount | null;
}

function AccountModal({ open, onClose, onSaved, editAccount }: AccountModalProps) {
  const [name, setName] = useState('');
  const [accountType, setAccountType] = useState('SAVINGS');
  const [bankName, setBankName] = useState('');
  const [lastFour, setLastFour] = useState('');
  const [openingDate, setOpeningDate] = useState('');
  const [openingBalancePaisa, setOpeningBalancePaisa] = useState<number | null>(0);
  const [monthlyInstallmentPaisa, setMonthlyInstallmentPaisa] = useState<number | null>(null);
  const [maturityDate, setMaturityDate] = useState('');
  const [interestRatePct, setInterestRatePct] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editAccount) {
      setName(editAccount.name);
      setAccountType(editAccount.type);
      setBankName(editAccount.bank_name ?? '');
      setLastFour(editAccount.last_four ?? '');
      setOpeningDate(editAccount.opening_date.slice(0, 10));
      setOpeningBalancePaisa(editAccount.opening_balance_paisa);
      setMonthlyInstallmentPaisa(editAccount.monthly_installment_paisa ?? null);
      setMaturityDate(editAccount.maturity_date?.slice(0, 10) ?? '');
      setInterestRatePct(editAccount.interest_rate_bps != null ? String(editAccount.interest_rate_bps / 100) : '');
    } else {
      setName('');
      setAccountType('SAVINGS');
      setBankName('');
      setLastFour('');
      setOpeningDate(new Date().toISOString().slice(0, 10));
      setOpeningBalancePaisa(0);
      setMonthlyInstallmentPaisa(null);
      setMaturityDate('');
      setInterestRatePct('');
    }
    setError(null);
  }, [open, editAccount]);

  async function handleSave() {
    if (!name.trim()) { setError('Name is required'); return; }
    if (!openingDate) { setError('Opening date is required'); return; }
    if (lastFour && !/^\d{4}$/.test(lastFour)) { setError('Last four digits must be exactly 4 digits'); return; }

    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        name,
        type: accountType,
        bank_name: bankName || null,
        last_four: lastFour || null,
        opening_date: openingDate,
        opening_balance_paisa: openingBalancePaisa ?? 0,
        monthly_installment_paisa: monthlyInstallmentPaisa,
        maturity_date: maturityDate || null,
        interest_rate_bps: interestRatePct ? Math.round(Number(interestRatePct) * 100) : null,
      };
      if (editAccount) {
        await api.patch(`/savings-accounts/${editAccount.id}`, payload);
      } else {
        await api.post('/savings-accounts', payload);
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

  const isDps = accountType === 'DPS';

  return (
    <Modal open={open} onClose={onClose} title={editAccount ? 'Edit Savings Account' : 'Add Savings Account'}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, font: 'var(--t-body)' }}>
          Account Name
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. City Bank DPS (10k)"
            style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-sunken)', color: 'var(--fg-primary)' }}
          />
        </label>

        {!editAccount && (
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, font: 'var(--t-body)' }}>
            Account Type
            <select
              value={accountType}
              onChange={(e) => setAccountType(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-sunken)', color: 'var(--fg-primary)' }}
            >
              {ACCOUNT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </label>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, font: 'var(--t-body)' }}>
            Bank Name
            <input
              type="text"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              placeholder="e.g. City Bank"
              style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-sunken)', color: 'var(--fg-primary)' }}
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, font: 'var(--t-body)' }}>
            Last 4 Digits
            <input
              type="text"
              value={lastFour}
              onChange={(e) => setLastFour(e.target.value)}
              maxLength={4}
              placeholder="1234"
              style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-sunken)', color: 'var(--fg-primary)' }}
            />
          </label>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, font: 'var(--t-body)' }}>
            Opening Date
            <DatePicker value={openingDate} onChange={setOpeningDate} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, font: 'var(--t-body)' }}>
            Opening Balance (৳)
            <MoneyInput value={openingBalancePaisa} onChange={setOpeningBalancePaisa} id="opening-bal" />
          </label>
        </div>

        {/* DPS-specific fields */}
        {isDps && (
          <>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, font: 'var(--t-body)' }}>
              Monthly Installment (৳)
              <MoneyInput value={monthlyInstallmentPaisa} onChange={setMonthlyInstallmentPaisa} id="monthly-install" />
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4, font: 'var(--t-body)' }}>
                Maturity Date
                <DatePicker value={maturityDate} onChange={setMaturityDate} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4, font: 'var(--t-body)' }}>
                Interest Rate (%)
                <input
                  type="number"
                  step="0.1"
                  value={interestRatePct}
                  onChange={(e) => setInterestRatePct(e.target.value)}
                  placeholder="e.g. 7.5"
                  style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-sunken)', color: 'var(--fg-primary)' }}
                />
              </label>
            </div>
          </>
        )}

        {error && <div style={{ color: 'var(--danger)', font: 'var(--t-caption)' }}>{error}</div>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button type="button" onClick={onClose} style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--fg-primary)', cursor: 'pointer' }}>Cancel</button>
          <button type="button" onClick={handleSave} disabled={saving} style={{ padding: '8px 16px', borderRadius: 6, border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Account Detail Drawer (transaction history)
// ---------------------------------------------------------------------------

interface AccountDetailProps {
  account: SavingsAccount | null;
  onClose: () => void;
  onEdit: (account: SavingsAccount) => void;
}

function AccountDetail({ account, onClose, onEdit }: AccountDetailProps) {
  const [txs, setTxs] = useState<SavingsTx[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!account) return;
    setLoading(true);
    api.get<{ transactions: SavingsTx[] }>(`/savings-accounts/${account.id}/transactions`)
      .then(({ data }) => setTxs(data.transactions))
      .finally(() => setLoading(false));
  }, [account]);

  if (!account) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end',
      background: 'rgba(0,0,0,0.4)',
    }} onClick={onClose}>
      <div
        style={{ width: '100%', maxWidth: 480, maxHeight: '80vh', background: 'var(--bg-surface)', borderRadius: '12px 12px 0 0', overflow: 'auto', padding: 20 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ font: 'var(--t-section)', margin: 0 }}>{account.name}</h2>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', font: 'var(--t-body)', color: 'var(--fg-muted)' }}>✕</button>
        </div>

        <div style={{ marginBottom: 12 }}>
          <span style={{ font: 'var(--t-label)', color: 'var(--fg-secondary)' }}>CURRENT BALANCE</span>
          <div style={{ font: 'var(--t-data)' }}><Amount paisa={account.balance_paisa} /></div>
        </div>

        {account.type === 'DPS' && account.monthly_installment_paisa != null && (
          <div style={{ marginBottom: 12, padding: '10px 12px', background: 'var(--bg-sunken)', borderRadius: 8 }}>
            <span style={{ font: 'var(--t-label)', color: 'var(--fg-secondary)' }}>INSTALLMENT</span>
            <div style={{ font: 'var(--t-body)', fontWeight: 600 }}><Amount paisa={account.monthly_installment_paisa} />/mo</div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button type="button" onClick={() => onEdit(account)} style={{ flex: 1, padding: '8px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', font: 'var(--t-body)' }}>Edit Account</button>
        </div>

        <h3 style={{ font: 'var(--t-label)', color: 'var(--fg-secondary)', marginBottom: 8 }}>TRANSACTIONS</h3>
        {loading ? (
          <div style={{ color: 'var(--fg-muted)' }}>Loading…</div>
        ) : txs.length === 0 ? (
          <div style={{ color: 'var(--fg-muted)', font: 'var(--t-body)' }}>No transactions yet.</div>
        ) : (
          <div>
            {txs.map((tx) => (
              <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <div>
                  <div style={{ font: 'var(--t-body)' }}>{tx.description}</div>
                  <div style={{ font: 'var(--t-caption)', color: 'var(--fg-muted)' }}>{tx.category_name} · {tx.date.slice(0, 10)}</div>
                </div>
                <div style={{ font: 'var(--t-body)', fontWeight: 600 }}><Amount paisa={tx.amount_paisa} /></div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Quick Action Modal (Withdraw / Add Interest)
// ---------------------------------------------------------------------------

interface QuickActionModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  account: SavingsAccount | null;
  action: 'WITHDRAW' | 'INTEREST' | null;
}

function QuickActionModal({ open, onClose, onSaved, account, action }: QuickActionModalProps) {
  const [amountPaisa, setAmountPaisa] = useState<number | null>(null);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setAmountPaisa(null);
    setDate(new Date().toISOString().slice(0, 10));
    setDescription(action === 'WITHDRAW' ? 'Savings withdrawal' : 'Savings interest');
    setError(null);
  }, [open, action]);

  const title = action === 'WITHDRAW' ? 'Withdraw from Savings' : 'Add Savings Interest';

  async function handleSave() {
    if (!amountPaisa || amountPaisa <= 0) { setError('Enter a valid amount'); return; }
    if (!account) return;

    setSaving(true);
    setError(null);
    try {
      // Look up the category for the action type
      const { data: cats } = await api.get<Array<{ id: string; routing_type: string }>>('/categories');
      const routingType = action === 'WITHDRAW' ? 'SAVINGS_WITHDRAWAL' : 'SAVINGS_INTEREST';
      const cat = cats.find((c) => c.routing_type === routingType);
      if (!cat) { setError('No category found for this action type'); setSaving(false); return; }

      await api.post('/transactions', {
        amount_paisa: amountPaisa,
        date,
        description,
        category_id: cat.id,
        payment_method: 'BANK',
        savings_account_id: account.id,
        idempotency_key: `savings-${action}-${account.id}-${Date.now()}`,
      });
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
    <Modal open={open} onClose={onClose} title={title}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ font: 'var(--t-body)', color: 'var(--fg-secondary)' }}>Account: {account?.name}</div>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, font: 'var(--t-body)' }}>
          Date
          <DatePicker value={date} onChange={setDate} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, font: 'var(--t-body)' }}>
          Amount (৳)
          <MoneyInput value={amountPaisa} onChange={setAmountPaisa} id="quick-amount" />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, font: 'var(--t-body)' }}>
          Description
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-sunken)', color: 'var(--fg-primary)' }}
          />
        </label>
        {error && <div style={{ color: 'var(--danger)', font: 'var(--t-caption)' }}>{error}</div>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button type="button" onClick={onClose} style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--fg-primary)', cursor: 'pointer' }}>Cancel</button>
          <button type="button" onClick={handleSave} disabled={saving} style={{ padding: '8px 16px', borderRadius: 6, border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Saving…' : 'Confirm'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Account Card
// ---------------------------------------------------------------------------

interface AccountCardProps {
  account: SavingsAccount;
  dpsCap: number;
  dpsThisFY: number;
  onViewDetails: (a: SavingsAccount) => void;
  onEdit: (a: SavingsAccount) => void;
  onWithdraw: (a: SavingsAccount) => void;
  onAddInterest: (a: SavingsAccount) => void;
  onClose: (a: SavingsAccount) => void;
}

function AccountCard({ account, dpsCap, dpsThisFY, onViewDetails, onEdit, onWithdraw, onAddInterest, onClose }: AccountCardProps) {
  const isDps = account.type === 'DPS';

  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <div style={{ font: 'var(--t-section)', marginBottom: 2 }}>{account.name}</div>
          <div style={{ font: 'var(--t-caption)', color: 'var(--fg-secondary)' }}>
            {account.type}{account.bank_name ? ` · ${account.bank_name}` : ''}{account.last_four ? ` · **** ${account.last_four}` : ''}
          </div>
        </div>
        <button
          type="button"
          onClick={() => onEdit(account)}
          style={{ padding: '4px 10px', borderRadius: 4, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', font: 'var(--t-caption)' }}
        >Edit</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: isDps ? 12 : 0 }}>
        <div>
          <div style={{ font: 'var(--t-label)', color: 'var(--fg-secondary)' }}>BALANCE</div>
          <div style={{ font: 'var(--t-body)', fontWeight: 600 }}><Amount paisa={account.balance_paisa} /></div>
        </div>
        {isDps && account.monthly_installment_paisa != null && (
          <div>
            <div style={{ font: 'var(--t-label)', color: 'var(--fg-secondary)' }}>INSTALLMENT</div>
            <div style={{ font: 'var(--t-body)' }}><Amount paisa={account.monthly_installment_paisa} />/mo</div>
          </div>
        )}
        <div>
          <div style={{ font: 'var(--t-label)', color: 'var(--fg-secondary)' }}>OPENED</div>
          <div style={{ font: 'var(--t-body)' }}>{new Date(account.opening_date).toLocaleDateString('en-BD', { month: 'short', year: 'numeric' })}</div>
        </div>
        {isDps && account.maturity_date && (
          <div>
            <div style={{ font: 'var(--t-label)', color: 'var(--fg-secondary)' }}>MATURES</div>
            <div style={{ font: 'var(--t-body)' }}>{new Date(account.maturity_date).toLocaleDateString('en-BD', { month: 'short', year: 'numeric' })}</div>
          </div>
        )}
        {isDps && account.projected_principal_paisa != null && (
          <div>
            <div style={{ font: 'var(--t-label)', color: 'var(--fg-secondary)' }}>PROJECTED</div>
            <div style={{ font: 'var(--t-body)' }}><Amount paisa={account.projected_principal_paisa} /></div>
          </div>
        )}
      </div>

      {isDps && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ font: 'var(--t-caption)', color: 'var(--fg-secondary)', marginBottom: 4 }}>
            Deposited this FY — shared cap: <Amount paisa={dpsCap} />
          </div>
          <ProgressBar
            value={dpsThisFY}
            max={dpsCap > 0 ? dpsCap : dpsThisFY + 1}
            aria-label="DPS FY contribution"
          />
          <div style={{ font: 'var(--t-caption)', color: 'var(--fg-muted)', marginTop: 2 }}>
            <Amount paisa={dpsThisFY} /> {dpsThisFY >= dpsCap ? '· cap reached' : `/ ${(dpsCap / 100).toFixed(2)} cap`}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => onViewDetails(account)}
          style={{ flex: 1, padding: '8px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', font: 'var(--t-body)', minWidth: 120 }}
        >
          View transactions
        </button>
        {!account.closed_on && (
          <>
            <button
              type="button"
              onClick={() => onWithdraw(account)}
              style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', font: 'var(--t-body)' }}
            >
              Withdraw
            </button>
            <button
              type="button"
              onClick={() => onAddInterest(account)}
              style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', font: 'var(--t-body)' }}
            >
              Add interest
            </button>
            {account.balance_paisa === 0 && (
              <button
                type="button"
                onClick={() => onClose(account)}
                style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid var(--warn)', background: 'transparent', cursor: 'pointer', font: 'var(--t-body)', color: 'var(--warn)' }}
              >
                Close account
              </button>
            )}
          </>
        )}
        {account.closed_on && (
          <span style={{ font: 'var(--t-caption)', color: 'var(--fg-muted)', alignSelf: 'center' }}>
            Closed {new Date(account.closed_on).toLocaleDateString('en-BD', { month: 'short', year: 'numeric' })}
          </span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Savings Page
// ---------------------------------------------------------------------------

export default function SavingsPage() {
  const [data, setData] = useState<AccountsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editAccount, setEditAccount] = useState<SavingsAccount | null>(null);
  const [detailAccount, setDetailAccount] = useState<SavingsAccount | null>(null);
  const [quickActionAccount, setQuickActionAccount] = useState<SavingsAccount | null>(null);
  const [quickAction, setQuickAction] = useState<'WITHDRAW' | 'INTEREST' | null>(null);
  const [quickActionOpen, setQuickActionOpen] = useState(false);

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const { data: res } = await api.get<{ accounts: SavingsAccount[]; totals: { total_saved_paisa: number; this_fy_deposits_paisa: number; dps_this_fy_paisa: number; dps_cap_paisa: number } }>('/savings-accounts');
      const totals = res.totals ?? {};
      setData({
        accounts: res.accounts ?? [],
        total_saved_paisa: totals.total_saved_paisa ?? 0,
        this_fy_deposits_paisa: totals.this_fy_deposits_paisa ?? 0,
        dps_this_fy_paisa: totals.dps_this_fy_paisa ?? 0,
        dps_cap_paisa: totals.dps_cap_paisa ?? 0,
        active_dps_count: (res.accounts ?? []).filter((a) => a.type === 'DPS' && !a.closed_on).length,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAccounts(); }, [loadAccounts]);

  async function closeAccount(account: SavingsAccount) {
    if (!confirm(`Close "${account.name}"? This cannot be undone.`)) return;
    await api.patch(`/savings-accounts/${account.id}`, { closed_on: new Date().toISOString().slice(0, 10) });
    loadAccounts();
  }

  function openWithdraw(account: SavingsAccount) {
    setQuickActionAccount(account);
    setQuickAction('WITHDRAW');
    setQuickActionOpen(true);
  }

  function openAddInterest(account: SavingsAccount) {
    setQuickActionAccount(account);
    setQuickAction('INTEREST');
    setQuickActionOpen(true);
  }

  const activeDps = data?.accounts.filter((a) => a.type === 'DPS' && !a.closed_on) ?? [];

  return (
    <div>
      <PageHeader
        eyebrow="Accounts, DPS and deposits"
        title="Bank & Savings"
        description="Balance overview and maturity tracking across all your accounts."
        actions={
          <button
            type="button"
            onClick={() => { setEditAccount(null); setModalOpen(true); }}
            style={{ padding: '8px 16px', borderRadius: 6, border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', font: 'var(--t-body)' }}
          >
            + Add Account
          </button>
        }
      />

      {loading ? (
        <div style={{ color: 'var(--fg-muted)', padding: '24px 0' }}>Loading…</div>
      ) : !data || data.accounts.length === 0 ? (
        <EmptyState
          icon="💰"
          heading="No savings accounts yet"
          body="Add your first savings account to track DPS, FDR, or regular savings."
          action={
            <button
              type="button"
              onClick={() => { setEditAccount(null); setModalOpen(true); }}
              style={{ padding: '10px 20px', borderRadius: 6, border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', font: 'var(--t-body)' }}
            >
              + Add Account
            </button>
          }
        />
      ) : (
        <>
          {/* Summary Tiles */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 24 }}>
            <SummaryTile label="Total Saved" paisa={data.total_saved_paisa} />
            <SummaryTile label="YTD Contribution" paisa={data.this_fy_deposits_paisa} />
            <div style={{ background: 'var(--bg-surface)', borderRadius: 10, border: '1px solid var(--border)', padding: '20px 20px 16px' }}>
              <span style={{ font: 'var(--t-label)', color: 'var(--fg-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>DPS Accounts</span>
              <div style={{ font: 'var(--t-data)', marginTop: 8 }}>{activeDps.length} active</div>
            </div>
          </div>

          {/* DPS Rebate Progress */}
          {activeDps.length > 0 && data.dps_cap_paisa > 0 && (
            <div style={{ marginBottom: 24, background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ font: 'var(--t-label)', color: 'var(--fg-secondary)' }}>DPS DEPOSITS THIS FY</span>
                <span style={{ font: 'var(--t-caption)', color: 'var(--fg-secondary)' }}>
                  cap: <Amount paisa={data.dps_cap_paisa} />
                  {data.dps_this_fy_paisa >= data.dps_cap_paisa && <span style={{ color: 'var(--ok)', marginLeft: 6 }}>✓ cap reached</span>}
                </span>
              </div>
              <ProgressBar value={data.dps_this_fy_paisa} max={data.dps_cap_paisa} aria-label="DPS rebate progress" />
              <div style={{ font: 'var(--t-caption)', color: 'var(--fg-secondary)', marginTop: 4 }}>
                <Amount paisa={data.dps_this_fy_paisa} /> / <Amount paisa={data.dps_cap_paisa} />
              </div>
            </div>
          )}

          {/* Account Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {data.accounts.map((account) => (
              <AccountCard
                key={account.id}
                account={account}
                dpsCap={data.dps_cap_paisa}
                dpsThisFY={data.dps_this_fy_paisa}
                onViewDetails={setDetailAccount}
                onEdit={(a) => { setEditAccount(a); setModalOpen(true); }}
                onWithdraw={openWithdraw}
                onAddInterest={openAddInterest}
                onClose={closeAccount}
              />
            ))}
          </div>
        </>
      )}

      {/* Add/Edit Account Modal */}
      <AccountModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={loadAccounts}
        editAccount={editAccount}
      />

      {/* Account Detail Drawer */}
      <AccountDetail
        account={detailAccount}
        onClose={() => setDetailAccount(null)}
        onEdit={(a) => { setDetailAccount(null); setEditAccount(a); setModalOpen(true); }}
      />

      {/* Quick Action Modal */}
      <QuickActionModal
        open={quickActionOpen}
        onClose={() => setQuickActionOpen(false)}
        onSaved={loadAccounts}
        account={quickActionAccount}
        action={quickAction}
      />
    </div>
  );
}
