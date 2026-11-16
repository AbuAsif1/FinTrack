'use client';

/**
 * New-month salary proposal (p2-11, F-31): "Your salary was ৳X last month. Confirm for <month>?"
 *   Confirm    — records the same salary for this month (same TDS, employer and receiving account)
 *   Edit first — opens Add Income, pre-filled with last month's salary
 *   Skip       — hides the card for this month on this device
 * Shown only when this month has no salary yet and an earlier salary exists (the API decides).
 */
import { useCallback, useEffect, useState } from 'react';
import api from '@/lib/api';
import { formatBDT, todayInDhaka } from '@fintrack/shared';
import { useGlobalModals } from '@/components/ui/GlobalModalsContext';

type Proposal = {
  has_proposal: boolean;
  last_salary?: { gross_paisa: number; tds_paisa: number; employer_name: string | null; month: string };
};

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function SalaryProposalCard({ onConfirmed }: { onConfirmed: () => void }) {
  const { openAddIncome } = useGlobalModals();
  const thisMonth = todayInDhaka().slice(0, 7);
  const skipKey = `salary-proposal-skipped:${thisMonth}`;
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    if (typeof window !== 'undefined' && window.localStorage.getItem(skipKey)) { setProposal(null); return; }
    api.get<Proposal>('/income-entries/salary-proposal').then(({ data }) => setProposal(data)).catch(() => setProposal(null));
  }, [skipKey]);

  useEffect(() => { load(); }, [load]);

  if (!proposal?.has_proposal || !proposal.last_salary) return null;
  const last = proposal.last_salary;
  const inHand = last.gross_paisa - last.tds_paisa;
  const [y, m] = thisMonth.split('-').map(Number);

  async function confirm() {
    setBusy(true); setError('');
    try {
      await api.post('/income-entries/salary-proposal/confirm', {});
      setProposal(null);
      onConfirmed();
    } catch (err) {
      setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Could not record the salary.');
    } finally { setBusy(false); }
  }

  function skip() {
    window.localStorage.setItem(skipKey, '1');
    setProposal(null);
  }

  return (
    <section aria-label="Salary proposal" style={{
      background: 'var(--bg-surface)', border: '1px solid var(--accent)', borderRadius: 12,
      padding: '14px 18px', marginBottom: 20, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12,
    }}>
      <div style={{ flex: 1, minWidth: 240 }}>
        <div style={{ font: 'var(--t-body)', fontWeight: 600 }}>It&apos;s a new month.</div>
        <div style={{ font: 'var(--t-body)', color: 'var(--fg-secondary)' }}>
          Your salary was {formatBDT(inHand)} In-Hand last month
          {last.tds_paisa > 0 && <> (gross {formatBDT(last.gross_paisa)}, TDS {formatBDT(last.tds_paisa)})</>}.
          {' '}Confirm for {MONTHS[m - 1]} {y}?
        </div>
        {error && <div style={{ color: 'var(--danger)', font: 'var(--t-caption)', marginTop: 4 }}>{error}</div>}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" onClick={confirm} disabled={busy} className="btn-primary" style={{ fontSize: 13, padding: '6px 14px' }}>
          {busy ? 'Saving…' : 'Confirm'}
        </button>
        <button type="button" onClick={() => openAddIncome()} disabled={busy} className="btn-secondary" style={{ fontSize: 13, padding: '6px 14px' }}>
          Edit first
        </button>
        <button type="button" onClick={skip} disabled={busy} style={{ fontSize: 13, padding: '6px 14px', background: 'transparent', border: 'none', color: 'var(--fg-muted)', cursor: 'pointer' }}>
          Skip
        </button>
      </div>
    </section>
  );
}
