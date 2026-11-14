'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { Amount } from '@/components/ui/Amount';
import { MoneyInput } from '@/components/ui/MoneyInput';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { DatePicker } from '@/components/ui/DatePicker';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Wallet {
  id: string;
  method: 'CASH' | 'BKASH' | 'BANK' | 'CARD';
  name: string;
  opening_balance_paisa: number;
  opening_balance_date: string;
  balance_paisa: number;
  is_enabled: boolean;
  is_derived?: boolean;
}

interface WalletTx {
  id: string;
  date: string;
  amount_paisa: number;
  description: string;
  type: string;
  category: { name: string };
}

const METHOD_LABELS: Record<string, string> = {
  CASH: 'Cash',
  BKASH: 'bKash',
  BANK: 'Bank Account',
  CARD: 'Card',
};

const METHOD_ICONS: Record<string, string> = {
  CASH: '💵',
  BKASH: '📱',
  BANK: '🏦',
  CARD: '💳',
};

// ---------------------------------------------------------------------------
// Set Wallet Modal
// ---------------------------------------------------------------------------

interface SetWalletModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  wallet: Wallet | null;
  method: string | null;
}

function SetWalletModal({ open, onClose, onSaved, wallet, method }: SetWalletModalProps) {
  const [name, setName] = useState('');
  const [openingBalancePaisa, setOpeningBalancePaisa] = useState<number | null>(0);
  const [openingDate, setOpeningDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (wallet) {
      setName(wallet.name);
      setOpeningBalancePaisa(wallet.opening_balance_paisa);
      setOpeningDate(wallet.opening_balance_date.slice(0, 10));
    } else {
      setName(method ? METHOD_LABELS[method] ?? method : '');
      setOpeningBalancePaisa(0);
      setOpeningDate(new Date().toISOString().slice(0, 10));
    }
    setError(null);
  }, [open, wallet, method]);

  async function handleSave() {
    if (!name.trim()) { setError('Name is required'); return; }
    if (!openingDate) { setError('Opening date is required'); return; }
    const m = wallet?.method ?? method;
    if (!m) return;

    setSaving(true);
    setError(null);
    try {
      await api.put(`/wallets/${m}`, {
        name,
        opening_balance_paisa: openingBalancePaisa ?? 0,
        opening_balance_date: openingDate,
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

  const displayMethod = wallet?.method ?? method ?? '';

  return (
    <Modal open={open} onClose={onClose} title={`${wallet ? 'Edit' : 'Set up'} ${METHOD_LABELS[displayMethod] ?? displayMethod} wallet`}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, font: 'var(--t-body)' }}>
          Name
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. BRAC Bank"
            style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-sunken)', color: 'var(--fg-primary)' }}
          />
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, font: 'var(--t-body)' }}>
          Opening balance date
          <DatePicker value={openingDate} onChange={setOpeningDate} />
        </label>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ font: 'var(--t-body)' }}>Opening balance</span>
          <MoneyInput value={openingBalancePaisa} onChange={setOpeningBalancePaisa} />
          <span style={{ font: 'var(--t-caption)', color: 'var(--fg-muted)' }}>
            Transactions before this date are excluded from the balance.
          </span>
        </div>

        {error && <div style={{ color: 'var(--danger)', font: 'var(--t-caption)' }}>{error}</div>}

        <button
          onClick={handleSave}
          disabled={saving}
          style={{ padding: '10px 20px', borderRadius: 8, background: 'var(--accent)', color: 'var(--accent-fg)', border: 'none', cursor: 'pointer', font: 'var(--t-body)', fontWeight: 600 }}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Transfer Modal
// ---------------------------------------------------------------------------

interface TransferModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  wallets: Wallet[];
}

function TransferModal({ open, onClose, onSaved, wallets }: TransferModalProps) {
  const [fromMethod, setFromMethod] = useState('');
  const [toMethod, setToMethod] = useState('');
  const [amountPaisa, setAmountPaisa] = useState<number | null>(null);
  const [date, setDate] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFromMethod(wallets[0]?.method ?? '');
    setToMethod('');
    setAmountPaisa(null);
    setDate(new Date().toISOString().slice(0, 10));
    setNote('');
    setError(null);
  }, [open, wallets]);

  async function handleSave() {
    if (!fromMethod || !toMethod) { setError('Select both wallets'); return; }
    if (fromMethod === toMethod) { setError('Cannot transfer to the same wallet'); return; }
    if (!amountPaisa || amountPaisa <= 0) { setError('Enter a positive amount'); return; }
    if (!date) { setError('Date is required'); return; }

    setSaving(true);
    setError(null);
    try {
      await api.post('/wallets/transfers', {
        from_method: fromMethod,
        to_method: toMethod,
        amount_paisa: amountPaisa,
        date,
        note: note || null,
        idempotency_key: `transfer-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      });
      onSaved();
      onClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg ?? 'Failed to transfer');
    } finally {
      setSaving(false);
    }
  }

  const selectStyle = {
    padding: '8px 12px',
    borderRadius: 6,
    border: '1px solid var(--border)',
    background: 'var(--bg-sunken)',
    color: 'var(--fg-primary)',
    font: 'var(--t-body)',
  };

  return (
    <Modal open={open} onClose={onClose} title="Transfer Between Wallets">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, font: 'var(--t-body)' }}>
          From
          <select value={fromMethod} onChange={(e) => setFromMethod(e.target.value)} style={selectStyle}>
            <option value="">Select wallet</option>
            {wallets.map((w) => (
              <option key={w.method} value={w.method}>{METHOD_ICONS[w.method]} {w.name}</option>
            ))}
          </select>
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, font: 'var(--t-body)' }}>
          To
          <select value={toMethod} onChange={(e) => setToMethod(e.target.value)} style={selectStyle}>
            <option value="">Select wallet</option>
            {wallets.filter((w) => w.method !== fromMethod).map((w) => (
              <option key={w.method} value={w.method}>{METHOD_ICONS[w.method]} {w.name}</option>
            ))}
          </select>
        </label>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ font: 'var(--t-body)' }}>Amount</span>
          <MoneyInput value={amountPaisa} onChange={setAmountPaisa} />
        </div>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, font: 'var(--t-body)' }}>
          Date
          <DatePicker value={date} onChange={setDate} />
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, font: 'var(--t-body)' }}>
          Note (optional)
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. bKash top-up"
            style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-sunken)', color: 'var(--fg-primary)' }}
          />
        </label>

        {error && <div style={{ color: 'var(--danger)', font: 'var(--t-caption)' }}>{error}</div>}

        <button
          onClick={handleSave}
          disabled={saving}
          style={{ padding: '10px 20px', borderRadius: 8, background: 'var(--accent)', color: 'var(--accent-fg)', border: 'none', cursor: 'pointer', font: 'var(--t-body)', fontWeight: 600 }}
        >
          {saving ? 'Transferring…' : 'Transfer'}
        </button>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Wallet Card
// ---------------------------------------------------------------------------

interface WalletCardProps {
  wallet: Wallet;
  onEdit: () => void;
  onViewTxs: () => void;
}

function WalletCard({ wallet, onEdit, onViewTxs }: WalletCardProps) {
  const isNegative = wallet.balance_paisa < 0;
  const hasOpening = wallet.opening_balance_paisa > 0;
  const isDerived = wallet.is_derived === true;

  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderRadius: 10,
      padding: 20,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20 }}>{METHOD_ICONS[wallet.method] ?? '💰'}</span>
          <div>
            <div style={{ font: 'var(--t-body)', fontWeight: 600 }}>{wallet.name}</div>
            <div style={{ font: 'var(--t-caption)', color: 'var(--fg-muted)' }}>{METHOD_LABELS[wallet.method]}</div>
          </div>
        </div>
        {!isDerived && (
          <button
            onClick={onEdit}
            style={{ font: 'var(--t-caption)', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px' }}
          >
            Edit
          </button>
        )}
      </div>

      <div style={{ marginBottom: 8 }}>
        <div style={{ font: 'var(--t-caption)', color: 'var(--fg-secondary)', marginBottom: 2 }}>Current balance</div>
        <div style={{
          font: 'var(--t-data)',
          color: isNegative ? 'var(--danger)' : 'var(--fg-primary)',
        }}>
          {isNegative && '−'}<Amount paisa={Math.abs(wallet.balance_paisa)} />
        </div>
        {isNegative && !hasOpening && !isDerived && (
          <div style={{ font: 'var(--t-caption)', color: 'var(--warn)', marginTop: 4 }}>
            Opening balance not set — balance may be inaccurate
          </div>
        )}
      </div>

      {!isDerived && hasOpening && (
        <div style={{ font: 'var(--t-caption)', color: 'var(--fg-muted)' }}>
          Opening <Amount paisa={wallet.opening_balance_paisa} /> on {wallet.opening_balance_date.slice(0, 10)}
        </div>
      )}

      {isDerived && (
        <div style={{ font: 'var(--t-caption)', color: 'var(--fg-muted)', marginBottom: 4 }}>
          Auto-computed from your bank accounts
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, marginTop: 12, alignItems: 'center' }}>
        <button
          onClick={onViewTxs}
          style={{ font: 'var(--t-caption)', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          View transactions →
        </button>
        {isDerived && (
          <a
            href="/savings"
            style={{ font: 'var(--t-caption)', color: 'var(--fg-muted)', textDecoration: 'none' }}
          >
            Manage accounts →
          </a>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Transactions drawer
// ---------------------------------------------------------------------------

interface TxDrawerProps {
  wallet: Wallet | null;
  txs: WalletTx[];
  onClose: () => void;
}

function TxDrawer({ wallet, txs, onClose }: TxDrawerProps) {
  if (!wallet) return null;
  return (
    <div
      role="dialog"
      aria-label={`${wallet.name} transactions`}
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.4)', display: 'flex', justifyContent: 'flex-end' }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 400,
          background: 'var(--bg-surface)',
          height: '100%',
          overflowY: 'auto',
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ font: '600 16px var(--font-space-grotesk, system-ui)', color: 'var(--fg-primary)' }}>
              {METHOD_ICONS[wallet.method]} {wallet.name}
            </div>
            <div style={{ font: 'var(--t-caption)', color: 'var(--fg-muted)' }}>Recent transactions</div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--fg-muted)', padding: '4px 8px' }}
          >
            ×
          </button>
        </div>

        {txs.length === 0 ? (
          <div style={{ font: 'var(--t-body)', color: 'var(--fg-muted)', textAlign: 'center', padding: '32px 0' }}>
            No transactions found.
          </div>
        ) : (
          txs.map((tx, i) => (
            <div key={tx.id} style={{
              paddingBottom: 10,
              borderBottom: i < txs.length - 1 ? '1px solid var(--border)' : 'none',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
            }}>
              <div>
                <div style={{ font: 'var(--t-body)', fontWeight: 500 }}>{tx.description}</div>
                <div style={{ font: 'var(--t-caption)', color: 'var(--fg-muted)', marginTop: 2 }}>
                  {tx.date.slice(0, 10)} · {tx.category?.name}
                </div>
              </div>
              <div style={{ font: 'var(--t-data-sm)', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                <Amount paisa={tx.amount_paisa} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Unconfigured method row
// ---------------------------------------------------------------------------

// BANK is excluded — it is always auto-derived from SavingsAccount(SAVINGS) rows
const ALL_METHODS = ['CASH', 'BKASH', 'CARD'] as const;

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function WalletsPage() {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [netWorthPaisa, setNetWorthPaisa] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const [editModal, setEditModal] = useState<{ wallet: Wallet | null; method: string | null } | null>(null);
  const [showTransfer, setShowTransfer] = useState(false);

  const [txDrawer, setTxDrawer] = useState<Wallet | null>(null);
  const [txs, setTxs] = useState<WalletTx[]>([]);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get<{ wallets: Wallet[]; net_worth_paisa: number }>('/wallets');
      setWallets(data.wallets);
      setNetWorthPaisa(data.net_worth_paisa);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function openTxs(wallet: Wallet) {
    setTxDrawer(wallet);
    try {
      const { data } = await api.get<{ transactions: WalletTx[] }>(`/wallets/${wallet.method}/transactions`);
      setTxs(data.transactions);
    } catch {
      setTxs([]);
    }
  }

  const configuredMethods = new Set(wallets.map((w) => w.method));
  const unconfigured = ALL_METHODS.filter((m) => !configuredMethods.has(m));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <PageHeader
        eyebrow="Know your balances"
        title="Wallets"
        description="Track cash, bKash, and bank balances with a running net worth."
      />

      {/* Net worth summary */}
      {netWorthPaisa != null && (
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ font: 'var(--t-label)', color: 'var(--fg-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Net Worth (wallets)
            </div>
            <div style={{
              font: 'var(--t-data)',
              marginTop: 4,
              color: netWorthPaisa >= 0 ? 'var(--ok)' : 'var(--danger)',
            }}>
              {netWorthPaisa < 0 && '−'}<Amount paisa={Math.abs(netWorthPaisa)} />
            </div>
          </div>
          {wallets.length >= 2 && (
            <button
              onClick={() => setShowTransfer(true)}
              style={{ padding: '8px 16px', borderRadius: 8, background: 'var(--accent)', color: 'var(--accent-fg)', border: 'none', cursor: 'pointer', font: 'var(--t-body)', fontWeight: 500 }}
            >
              Transfer →
            </button>
          )}
        </div>
      )}

      {/* Configured wallets */}
      {loading ? (
        <div style={{ color: 'var(--fg-muted)', font: 'var(--t-body)' }}>Loading…</div>
      ) : (
        <>
          {wallets.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
              {wallets.map((w) => (
                <WalletCard
                  key={w.method}
                  wallet={w}
                  onEdit={() => setEditModal({ wallet: w, method: null })}
                  onViewTxs={() => openTxs(w)}
                />
              ))}
            </div>
          )}

          {/* Unconfigured methods */}
          {unconfigured.length > 0 && (
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 20 }}>
              <div style={{ font: 'var(--t-label)', color: 'var(--fg-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
                Set up a wallet
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {unconfigured.map((m) => (
                  <button
                    key={m}
                    onClick={() => setEditModal({ wallet: null, method: m })}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '8px 16px',
                      borderRadius: 8,
                      border: '1px dashed var(--border)',
                      background: 'var(--bg-sunken)',
                      color: 'var(--fg-secondary)',
                      cursor: 'pointer',
                      font: 'var(--t-body)',
                    }}
                  >
                    <span>{METHOD_ICONS[m]}</span>
                    <span>{METHOD_LABELS[m]}</span>
                    <span style={{ color: 'var(--accent)', fontWeight: 600 }}>+</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Modals */}
      {editModal && (
        <SetWalletModal
          open={!!editModal}
          onClose={() => setEditModal(null)}
          onSaved={() => { load(); setEditModal(null); }}
          wallet={editModal.wallet}
          method={editModal.method}
        />
      )}

      {showTransfer && (
        <TransferModal
          open={showTransfer}
          onClose={() => setShowTransfer(false)}
          onSaved={() => { load(); setShowTransfer(false); }}
          wallets={wallets}
        />
      )}

      <TxDrawer
        wallet={txDrawer}
        txs={txs}
        onClose={() => setTxDrawer(null)}
      />
    </div>
  );
}
