'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import { Amount } from '@/components/ui/Amount';
import { MoneyInput } from '@/components/ui/MoneyInput';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { SummaryTile } from '@/components/ui/SummaryTile';
import { SkeletonTableRows, SK } from '@/components/ui/Skeleton';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { IncomeModal, type IncomeEntry, type SavingsAccount } from '@/components/ui/IncomeModal';
import { DatePicker } from '@/components/ui/DatePicker';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MonthRow {
  month: string; // "2026-11"
  status: 'ENTERED' | 'PENDING';
  by_type: Record<string, number>;
  gross_paisa: number;
  tds_paisa: number;
  in_hand_paisa: number;
}

interface SummaryData {
  fiscal_year: string;
  months: MonthRow[];
  totals: { gross_paisa: number; tds_paisa: number; in_hand_paisa: number };
  salary_history: Array<{ month: string; gross_paisa: number }>;
  latest_salary: { month: string; gross_paisa: number; tds_paisa: number; employer_name: string | null } | null;
}

interface HolidayEntry {
  id: string;
  date: string;
  days: number;
  rate_type: string;
  rate_paisa: number;
  amount_paisa: number;
  note?: string | null;
}

const INCOME_TYPES = [
  { value: 'SALARY', label: 'Salary' },
  { value: 'CHEER', label: 'Cheer' },
  { value: 'PROFIT_SHARE', label: 'Profit Share' },
  { value: 'EID_BONUS', label: 'Eid Festival Bonus' },
  { value: 'LEAVE_ENCASHMENT', label: 'Leave Encashment' },
  { value: 'CERTIFICATION', label: 'Certification Reimbursement' },
  { value: 'HOLIDAY_SUPPORT', label: 'Holiday Support' },
  { value: 'OTHER', label: 'Other' },
];


function fiscalYears(): string[] {
  const now = new Date();
  const year = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
  const fys: string[] = [];
  for (let i = 0; i < 3; i++) {
    fys.push(`${year - i}-${String(year - i + 1).slice(2)}`);
  }
  return fys;
}

function currentFY(): string {
  const now = new Date();
  const year = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
  return `${year}-${String(year + 1).slice(2)}`;
}

function formatMonth(m: string) {
  const d = new Date(m + '-01');
  return d.toLocaleDateString('en-BD', { month: 'short', year: 'numeric' });
}

function dateInFY(dateStr: string, fy: string): boolean {
  const startYear = parseInt(fy.split('-')[0], 10);
  const start = new Date(Date.UTC(startYear, 6, 1));     // July 1 of start year
  const end   = new Date(Date.UTC(startYear + 1, 6, 1)); // July 1 of next year
  const d = new Date(dateStr);
  return d >= start && d < end;
}

// ---------------------------------------------------------------------------
// Holiday Support Modal
// ---------------------------------------------------------------------------

interface HolidayModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editEntry?: HolidayEntry | null;
  prefillRatePaisa?: number | null;
}

function HolidayModal({ open, onClose, onSaved, editEntry, prefillRatePaisa }: HolidayModalProps) {
  const [date, setDate] = useState('');
  const [days, setDays] = useState(1);
  const [ratePaisa, setRatePaisa] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editEntry) {
      setDate(editEntry.date.slice(0, 10));
      setDays(editEntry.days);
      setRatePaisa(editEntry.rate_paisa);
      setNote(editEntry.note ?? '');
    } else {
      setDate(new Date().toISOString().slice(0, 10));
      setDays(1);
      setRatePaisa(prefillRatePaisa ?? null);
      setNote('');
    }
    setError(null);
  }, [open, editEntry, prefillRatePaisa]);

  async function handleSave() {
    if (!date) { setError('Date is required'); return; }
    if (!ratePaisa && !prefillRatePaisa) { setError('Rate is required'); return; }

    setSaving(true);
    setError(null);
    try {
      if (editEntry) {
        await api.patch(`/holiday-support-entries/${editEntry.id}`, { date, days, rate_paisa: ratePaisa, note: note || null });
      } else {
        await api.post('/holiday-support-entries', { date, days, rate_type: 'DAILY', rate_paisa: ratePaisa, note: note || null });
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
    <Modal open={open} onClose={onClose} title={editEntry ? 'Edit Holiday Support Entry' : 'Add Holiday Support Entry'}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, font: 'var(--t-body)' }}>
          Date
          <DatePicker value={date} onChange={setDate} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, font: 'var(--t-body)' }}>
          Days
          <input
            type="number"
            min={1}
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-sunken)', color: 'var(--fg-primary)' }}
          />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, font: 'var(--t-body)' }}>
          Daily Rate (৳)
          <MoneyInput value={ratePaisa} onChange={setRatePaisa} id="rate-paisa" />
        </label>
        {ratePaisa != null && days > 0 && (
          <div style={{ font: 'var(--t-body)', color: 'var(--fg-secondary)' }}>
            Total: <Amount paisa={days * ratePaisa} />
          </div>
        )}
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, font: 'var(--t-body)' }}>
          Note (optional)
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-sunken)', color: 'var(--fg-primary)' }}
          />
        </label>
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
// Main Income Page
// ---------------------------------------------------------------------------

export default function IncomePage() {
  const searchParams = useSearchParams();
  const [selectedFY, setSelectedFY] = useState(currentFY());
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [holidayEntries, setHolidayEntries] = useState<HolidayEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<IncomeEntry | null>(null);
  const [prefillMonth, setPrefillMonth] = useState<string>('');
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);
  const [monthEntries, setMonthEntries] = useState<IncomeEntry[]>([]);
  const [holidayModalOpen, setHolidayModalOpen] = useState(false);
  const [editHoliday, setEditHoliday] = useState<HolidayEntry | null>(null);
  const [latestHolidayRate, setLatestHolidayRate] = useState<number | null>(null);
  const [savingsAccounts, setSavingsAccounts] = useState<SavingsAccount[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; type: 'entry' | 'holiday' } | null>(null);

  const loadSummary = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<SummaryData>(`/income-entries/summary?fiscal_year=${selectedFY}`);
      setSummary(data);
    } finally {
      setLoading(false);
    }
  }, [selectedFY]);

  const loadHolidayEntries = useCallback(async () => {
    const { data } = await api.get<{ entries: HolidayEntry[] }>('/holiday-support-entries');
    setHolidayEntries(data.entries);
    if (data.entries.length > 0) {
      setLatestHolidayRate(data.entries[0].rate_paisa);
    }
  }, []);

  useEffect(() => {
    loadSummary();
    loadHolidayEntries();
    api.get('/savings-accounts').then(({ data }) => {
      setSavingsAccounts(Array.isArray(data) ? data : (data?.accounts ?? []));
    }).catch(() => {});
  }, [loadSummary, loadHolidayEntries]);

  // Auto-open modal when navigated with ?action=add
  useEffect(() => {
    if (searchParams.get('action') === 'add') {
      setEditEntry(null);
      setPrefillMonth('');
      setModalOpen(true);
    }
  }, [searchParams]);

  async function loadMonthEntries(month: string) {
    if (expandedMonth === month) {
      setExpandedMonth(null);
      setMonthEntries([]);
      return;
    }
    const { data } = await api.get<IncomeEntry[]>(`/income-entries?month=${month}`);
    setMonthEntries(data);
    setExpandedMonth(month);
  }

  async function deleteEntry(id: string) {
    await api.delete(`/income-entries/${id}`);
    await loadSummary();
    if (expandedMonth) {
      const { data } = await api.get<IncomeEntry[]>(`/income-entries?month=${expandedMonth}`);
      setMonthEntries(data);
      if (data.length === 0) setExpandedMonth(null);
    }
  }

  async function deleteHoliday(id: string) {
    await api.delete(`/holiday-support-entries/${id}`);
    loadHolidayEntries();
  }

  function openAddModal() {
    setEditEntry(null);
    setPrefillMonth('');
    setModalOpen(true);
  }

  function openPendingRow(month: string) {
    setEditEntry(null);
    setPrefillMonth(month);
    setModalOpen(true);
  }

  const fys = fiscalYears();
  const enteredCount = summary?.months.filter((r) => r.status === 'ENTERED').length ?? 0;
  const filteredHolidayEntries = holidayEntries.filter((e) => dateInFY(e.date, selectedFY));

  return (
    <div>
      <PageHeader
        eyebrow="Salary, bonus and more"
        title="Income"
        description="Track every source of income by month and fiscal year."
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, alignItems: 'center', marginBottom: 24 }}>
        {/* KPI tiles */}
        <div className="r-tiles" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
          {summary ? (
            <>
              <SummaryTile label="Gross Income" paisa={summary.totals.gross_paisa} variant="income" subtitle={`FY${selectedFY} YTD`} />
              <SummaryTile label="TDS Deducted" paisa={summary.totals.tds_paisa} variant="tax" subtitle="Tax at source" />
              <SummaryTile label="In-Hand" paisa={summary.totals.in_hand_paisa} variant="savings" subtitle="Gross − TDS" />
              <SummaryTile label="Months Entered" paisa={0} valueOverride={`${enteredCount} / 12`} variant="neutral" subtitle={`FY${selectedFY}`} />
            </>
          ) : (
            [0,1,2,3].map((i) => <div key={i} style={{ height: 90, borderRadius: 12, background: 'var(--bg-raised)', border: '1px solid var(--border)' }} />)
          )}
        </div>
        {/* FY selector + Add Income — plain stacked, no card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <select
            value={selectedFY}
            onChange={(e) => setSelectedFY(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-sunken)', color: 'var(--fg-primary)', font: 'var(--t-body)', cursor: 'pointer' }}
          >
            {fys.map((fy) => <option key={fy} value={fy}>FY{fy}</option>)}
          </select>
          <button type="button" onClick={openAddModal} className="btn-primary">
            + Add Income
          </button>
        </div>
      </div>

      {/* Monthly Table */}
      <div className="table-scroll" style={{ background: 'var(--bg-surface)', borderRadius: 12, boxShadow: '0 1px 6px rgba(0,0,0,0.06)', marginBottom: 32 }}>
      <div style={{ minWidth: 700 }}>
        {/* Header */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1fr 1.1fr 88px 72px', borderBottom: '2px solid var(--border)', padding: '10px 16px', background: 'var(--bg-raised)' }}>
          {(['MONTH', 'IN-HAND', 'TDS', 'BONUS & OTHER', 'GROSS', 'STATUS', 'ACTION'] as const).map((h, i) => (
            <div key={h} style={{ font: 'var(--t-label)', color: 'var(--fg-secondary)', textAlign: i >= 1 && i <= 4 ? 'right' : i >= 5 ? 'center' : 'left' }}>{h}</div>
          ))}
        </div>

        {loading ? (
          <SkeletonTableRows rows={6} cols={SK.income} />
        ) : summary?.months.length === 0 ? (
          <div style={{ padding: '40px 16px', textAlign: 'center' }}>
            <EmptyState heading="No income entries" body="Add your first income entry to start tracking." />
          </div>
        ) : (
          <>
            {summary?.months.map((row) => {
              const bonusOther = Object.entries(row.by_type).filter(([t]) => t !== 'SALARY').reduce((s, [, v]) => s + v, 0);
              const isExpanded = expandedMonth === row.month;
              return (
                <div key={row.month}>
                  {/* Month row */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1fr 1.1fr 88px 72px', padding: '13px 16px', borderBottom: isExpanded ? 'none' : '1px solid var(--border)', background: isExpanded ? 'var(--bg-sunken)' : undefined, alignItems: 'center', transition: 'background 0.15s' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <span style={{ font: 'var(--t-body)', fontWeight: 600, color: 'var(--fg-primary)' }}>{formatMonth(row.month)}</span>
                    </div>
                    <div style={{ font: 'var(--t-body)', fontWeight: 600, textAlign: 'right', color: 'var(--ok)' }}>
                      {row.in_hand_paisa > 0 ? <Amount paisa={row.in_hand_paisa} /> : <span style={{ color: 'var(--fg-muted)' }}>—</span>}
                    </div>
                    <div style={{ font: 'var(--t-caption)', color: 'var(--fg-secondary)', textAlign: 'right' }}>
                      {row.tds_paisa > 0 ? <Amount paisa={row.tds_paisa} /> : '—'}
                    </div>
                    <div style={{ font: 'var(--t-caption)', color: 'var(--fg-secondary)', textAlign: 'right' }}>
                      {bonusOther > 0 ? <Amount paisa={bonusOther} /> : '—'}
                    </div>
                    <div style={{ font: 'var(--t-body)', fontWeight: 700, textAlign: 'right' }}>
                      {row.gross_paisa > 0 ? <Amount paisa={row.gross_paisa} /> : <span style={{ color: 'var(--fg-muted)' }}>—</span>}
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      {row.status === 'ENTERED' ? (
                        <span style={{ display: 'inline-block', background: 'rgba(34,197,94,0.1)', color: 'var(--ok)', font: 'var(--t-label)', padding: '3px 10px', borderRadius: 20, whiteSpace: 'nowrap' }}>✓ Entered</span>
                      ) : (
                        <span style={{ display: 'inline-block', background: 'var(--bg-raised)', color: 'var(--fg-muted)', font: 'var(--t-label)', padding: '3px 10px', borderRadius: 20, border: '1px solid var(--border)', whiteSpace: 'nowrap' }}>Pending</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      {row.status === 'ENTERED' ? (
                        <>
                          <button
                            type="button"
                            onClick={() => loadMonthEntries(row.month)}
                            title={isExpanded ? 'Hide details' : 'Show details'}
                            style={{ width: 30, height: 30, borderRadius: 6, border: `1px solid ${isExpanded ? 'var(--accent)' : 'var(--border)'}`, background: isExpanded ? 'var(--accent)' : 'var(--bg-raised)', color: isExpanded ? '#fff' : 'var(--fg-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s', flexShrink: 0 }}
                          >
                            {isExpanded ? (
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15" /></svg>
                            ) : (
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => { setEditEntry(null); setPrefillMonth(row.month); setModalOpen(true); }}
                            title="Add entry for this month"
                            style={{ width: 30, height: 30, borderRadius: 6, border: '1px solid var(--accent)', background: 'transparent', color: 'var(--accent)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openPendingRow(row.month)}
                          title="Enter income for this month"
                          style={{ width: 30, height: 30, borderRadius: 6, border: '1px solid var(--accent)', background: 'transparent', color: 'var(--accent)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Sliding details drawer */}
                  <div style={{ overflow: 'hidden', maxHeight: isExpanded ? 800 : 0, transition: 'max-height 0.3s cubic-bezier(0.4,0,0.2,1)' }}>
                    <div style={{ background: 'var(--bg-surface)', borderLeft: '3px solid var(--accent)', borderBottom: '2px solid var(--border)', padding: '14px 24px 20px', boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.04)' }}>
                      {/* Drawer label */}
                      <div style={{ marginBottom: 12 }}>
                        <span style={{ font: 'var(--t-label)', color: 'var(--accent)', letterSpacing: '0.04em' }}>
                          ↳ BREAKDOWN · {formatMonth(row.month).toUpperCase()}
                        </span>
                      </div>

                      {/* Drawer table — inset from the outer table edges */}
                      <div className="table-scroll" style={{ borderRadius: 8, border: '1px solid var(--border)', overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 540 }}>
                          <thead>
                            <tr style={{ background: 'var(--bg-raised)' }}>
                              {['TYPE', 'SOURCE / EMPLOYER', 'GROSS', 'TDS', 'IN-HAND', 'ACCOUNT', 'NOTES', 'ACTIONS'].map((h, hi) => (
                                <th key={h} style={{ padding: '8px 12px', textAlign: hi >= 2 && hi <= 4 ? 'right' : hi === 5 || hi === 7 ? 'center' : 'left', font: 'var(--t-label)', color: 'var(--fg-secondary)', fontWeight: 600, whiteSpace: 'nowrap', borderBottom: '1px solid var(--border)' }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {monthEntries.map((e) => {
                              const acct = savingsAccounts.find((a) => a.id === e.savings_account_id);
                              return (
                                <tr key={e.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                  <td style={{ padding: '10px 12px', font: 'var(--t-body)', whiteSpace: 'nowrap' }}>
                                    {INCOME_TYPES.find((t) => t.value === e.income_type)?.label ?? e.income_type}
                                  </td>
                                  <td style={{ padding: '10px 12px', font: 'var(--t-body)', color: 'var(--fg-secondary)', maxWidth: 160 }}>
                                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      {e.employer_name ?? e.payer_name ?? <span style={{ color: 'var(--fg-muted)' }}>—</span>}
                                    </div>
                                    {e.earned_period && <div style={{ font: 'var(--t-caption)', color: 'var(--fg-muted)' }}>{e.earned_period}</div>}
                                  </td>
                                  <td style={{ padding: '10px 12px', textAlign: 'right', font: 'var(--t-body)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                                    <Amount paisa={e.gross_paisa} />
                                  </td>
                                  <td style={{ padding: '10px 12px', textAlign: 'right', font: 'var(--t-body)', color: 'var(--danger)', whiteSpace: 'nowrap' }}>
                                    {e.tds_paisa > 0 ? <Amount paisa={e.tds_paisa} /> : <span style={{ color: 'var(--fg-muted)' }}>—</span>}
                                  </td>
                                  <td style={{ padding: '10px 12px', textAlign: 'right', font: 'var(--t-body)', fontWeight: 600, color: 'var(--ok)', whiteSpace: 'nowrap' }}>
                                    <Amount paisa={e.in_hand_paisa} />
                                  </td>
                                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                    {acct ? (
                                      <span style={{ display: 'inline-block', background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 6, padding: '2px 8px', font: 'var(--t-caption)', whiteSpace: 'nowrap' }}>
                                        {acct.name}
                                      </span>
                                    ) : <span style={{ color: 'var(--fg-muted)' }}>—</span>}
                                  </td>
                                  <td style={{ padding: '10px 12px', font: 'var(--t-caption)', color: 'var(--fg-muted)', maxWidth: 140 }}>
                                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      {e.notes || '—'}
                                    </div>
                                  </td>
                                  <td style={{ padding: '10px 12px' }}>
                                    <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                                      <button type="button" onClick={() => { setEditEntry(e); setModalOpen(true); }} style={{ padding: '4px 10px', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--bg-raised)', cursor: 'pointer', font: 'var(--t-caption)', color: 'var(--fg-primary)', whiteSpace: 'nowrap' }}>Edit</button>
                                      <button type="button" onClick={() => setDeleteConfirm({ id: e.id, type: 'entry' })} style={{ padding: '4px 10px', borderRadius: 4, border: '1px solid var(--danger)', background: 'transparent', cursor: 'pointer', font: 'var(--t-caption)', color: 'var(--danger)', whiteSpace: 'nowrap' }}>Delete</button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Total row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1fr 1.1fr 88px 72px', padding: '10px 16px', borderTop: '2px solid var(--border)', background: 'var(--bg-raised)' }}>
              <div style={{ font: 'var(--t-label)', fontWeight: 700, color: 'var(--fg-secondary)' }}>TOTAL</div>
              <div style={{ font: 'var(--t-body)', fontWeight: 700, textAlign: 'right', color: 'var(--ok)' }}>{summary?.totals.in_hand_paisa ? <Amount paisa={summary.totals.in_hand_paisa} /> : '—'}</div>
              <div style={{ font: 'var(--t-body)', textAlign: 'right', color: 'var(--fg-secondary)' }}>{summary?.totals.tds_paisa ? <Amount paisa={summary.totals.tds_paisa} /> : '—'}</div>
              <div />
              <div style={{ font: 'var(--t-body)', fontWeight: 700, textAlign: 'right' }}>{summary?.totals.gross_paisa ? <Amount paisa={summary.totals.gross_paisa} /> : '—'}</div>
              <div /><div />
            </div>
          </>
        )}
      </div>
      </div>

      {/* Holiday Support Log */}
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 style={{ font: 'var(--t-section)', margin: 0 }}>Holiday Support Log — FY{selectedFY}</h2>
          <button
            type="button"
            onClick={() => { setEditHoliday(null); setHolidayModalOpen(true); }}
            style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid var(--accent)', background: 'transparent', cursor: 'pointer', font: 'var(--t-caption)', color: 'var(--accent)' }}
          >
            + Add Holiday Support Entry
          </button>
        </div>
        {filteredHolidayEntries.length === 0 ? (
          <EmptyState heading={`No holiday support entries for FY${selectedFY}`} body="Track your holiday support payments here." />
        ) : (
          <div className="table-scroll" style={{ background: 'var(--bg-surface)', borderRadius: 12, boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 500, tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: '30%' }} />
                <col style={{ width: '10%' }} />
                <col style={{ width: '20%' }} />
                <col style={{ width: '20%' }} />
                <col style={{ width: '20%' }} />
              </colgroup>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-sunken)' }}>
                  <th style={{ padding: '10px 16px', textAlign: 'left', font: 'var(--t-label)', color: 'var(--fg-secondary)' }}>Date</th>
                  <th style={{ padding: '10px 16px', textAlign: 'center', font: 'var(--t-label)', color: 'var(--fg-secondary)' }}>Days</th>
                  <th style={{ padding: '10px 16px', textAlign: 'right', font: 'var(--t-label)', color: 'var(--fg-secondary)' }}>Rate</th>
                  <th style={{ padding: '10px 16px', textAlign: 'right', font: 'var(--t-label)', color: 'var(--fg-secondary)' }}>Amount</th>
                  <th style={{ padding: '10px 16px', textAlign: 'center', font: 'var(--t-label)', color: 'var(--fg-secondary)' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredHolidayEntries.map((e) => (
                  <tr key={e.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 16px', font: 'var(--t-body)' }}>{new Date(e.date).toLocaleDateString('en-BD', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                    <td style={{ padding: '10px 16px', textAlign: 'center', font: 'var(--t-body)' }}>{e.days}</td>
                    <td style={{ padding: '10px 16px', textAlign: 'right', font: 'var(--t-body)', color: 'var(--fg-secondary)' }}><Amount paisa={e.rate_paisa} /></td>
                    <td style={{ padding: '10px 16px', textAlign: 'right', font: 'var(--t-body)', fontWeight: 600 }}><Amount paisa={e.amount_paisa} /></td>
                    <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                        <button type="button" onClick={() => { setEditHoliday(e); setHolidayModalOpen(true); }} title="Edit" style={{ width: 30, height: 30, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-raised)', color: 'var(--fg-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button type="button" onClick={() => setDeleteConfirm({ id: e.id, type: 'holiday' })} title="Delete" style={{ width: 30, height: 30, borderRadius: 6, border: '1px solid var(--danger)', background: 'transparent', color: 'var(--danger)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Income Modal */}
      <IncomeModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={() => {
          loadSummary();
          api.get('/savings-accounts').then(({ data }) => {
            setSavingsAccounts(Array.isArray(data) ? data : (data?.accounts ?? []));
          }).catch(() => {});
          if (expandedMonth) { api.get<IncomeEntry[]>(`/income-entries?month=${expandedMonth}`).then(({ data }) => setMonthEntries(data)); }
        }}
        editEntry={editEntry}
        prefillFromLatestSalary={!editEntry ? summary?.latest_salary : undefined}
        prefillMonth={prefillMonth}
        savingsAccounts={savingsAccounts}
      />

      {/* Holiday Modal */}
      <HolidayModal
        open={holidayModalOpen}
        onClose={() => setHolidayModalOpen(false)}
        onSaved={loadHolidayEntries}
        editEntry={editHoliday}
        prefillRatePaisa={!editHoliday ? latestHolidayRate : undefined}
      />

      <ConfirmDialog
        open={!!deleteConfirm}
        title="Delete entry?"
        message="This entry will be permanently removed and your totals will be recalculated."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => {
          if (!deleteConfirm) return;
          if (deleteConfirm.type === 'entry') deleteEntry(deleteConfirm.id);
          else deleteHoliday(deleteConfirm.id);
          setDeleteConfirm(null);
        }}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
}
