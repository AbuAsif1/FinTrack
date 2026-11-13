'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import { Amount } from '@/components/ui/Amount';
import { MoneyInput } from '@/components/ui/MoneyInput';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { SummaryTile } from '@/components/ui/SummaryTile';
import { PageHeader } from '@/components/ui/PageHeader';
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

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 24 }}>
        <PageHeader
          eyebrow="Salary, bonus and more"
          title="Income"
          description="Track every source of income by month and fiscal year."
        />
        <button
          type="button"
          onClick={openAddModal}
          className="btn-primary"
          style={{ flexShrink: 0, marginTop: 4 }}
        >
          + Add Income
        </button>
      </div>

      {/* YTD Summary Tiles */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 24 }}>
          <SummaryTile label="Gross Income YTD" paisa={summary.totals.gross_paisa} />
          <SummaryTile label="TDS YTD" paisa={summary.totals.tds_paisa} />
          <SummaryTile label="In-Hand YTD" paisa={summary.totals.in_hand_paisa} />
          <div style={{ background: 'var(--bg-surface)', borderRadius: 10, border: '1px solid var(--border)', padding: '20px 20px 16px' }}>
            <span style={{ font: 'var(--t-label)', color: 'var(--fg-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Months Entered</span>
            <div style={{ font: 'var(--t-data)', marginTop: 8 }}>{enteredCount} / 12</div>
          </div>
        </div>
      )}

      {/* FY Selector */}
      <div style={{ marginBottom: 20 }}>
        <select
          value={selectedFY}
          onChange={(e) => setSelectedFY(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-sunken)', color: 'var(--fg-primary)', font: 'var(--t-body)' }}
        >
          {fys.map((fy) => <option key={fy} value={fy}>FY{fy}</option>)}
        </select>
      </div>

      {/* Monthly Table */}
      {loading ? (
        <div style={{ color: 'var(--fg-muted)', padding: '24px 0' }}>Loading…</div>
      ) : summary?.months.length === 0 ? (
        <EmptyState heading="No income entries" body="Add your first income entry to start tracking." />
      ) : (
        <div className="table-scroll" style={{ background: 'var(--bg-surface)', borderRadius: 10, border: '1px solid var(--border)', marginBottom: 32 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 540 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-sunken)' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', font: 'var(--t-label)', color: 'var(--fg-secondary)' }}>Month</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', font: 'var(--t-label)', color: 'var(--fg-secondary)' }}>Salary</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', font: 'var(--t-label)', color: 'var(--fg-secondary)' }}>Bonus / PS</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', font: 'var(--t-label)', color: 'var(--fg-secondary)' }}>TDS</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', font: 'var(--t-label)', color: 'var(--fg-secondary)' }}>In-Hand</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', font: 'var(--t-label)', color: 'var(--fg-secondary)' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {summary?.months.map((row) => (
                <>
                  <tr
                    key={row.month}
                    onClick={() => row.status === 'ENTERED' ? loadMonthEntries(row.month) : openPendingRow(row.month)}
                    style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer', background: expandedMonth === row.month ? 'var(--bg-sunken)' : undefined }}
                  >
                    <td style={{ padding: '12px 16px', font: 'var(--t-body)' }}>{formatMonth(row.month)}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', font: 'var(--t-body)' }}>
                      {row.by_type['SALARY'] ? <Amount paisa={row.by_type['SALARY']} /> : '—'}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', font: 'var(--t-body)' }}>
                      {(row.by_type['PROFIT_SHARE'] ?? 0) + (row.by_type['EID_BONUS'] ?? 0) > 0
                        ? <Amount paisa={(row.by_type['PROFIT_SHARE'] ?? 0) + (row.by_type['EID_BONUS'] ?? 0)} />
                        : '—'}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', font: 'var(--t-body)', color: 'var(--fg-secondary)' }}>
                      {row.tds_paisa > 0 ? <Amount paisa={row.tds_paisa} /> : '—'}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', font: 'var(--t-body)', fontWeight: 600 }}>
                      {row.in_hand_paisa > 0 ? <Amount paisa={row.in_hand_paisa} /> : '—'}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      {row.status === 'ENTERED' ? (
                        <span style={{ color: 'var(--ok)', font: 'var(--t-label)' }}>✓ Entered</span>
                      ) : (
                        <span style={{ color: 'var(--fg-muted)', font: 'var(--t-label)' }}>○ Pending</span>
                      )}
                    </td>
                  </tr>
                  {/* Inline expand */}
                  {expandedMonth === row.month && (
                    <tr key={`${row.month}-detail`}>
                      <td colSpan={6} style={{ padding: '8px 24px 16px', background: 'var(--bg-sunken)' }}>
                        {monthEntries.map((e) => (
                          <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                            <div>
                              <span style={{ font: 'var(--t-body)', color: 'var(--fg-primary)' }}>
                                {INCOME_TYPES.find((t) => t.value === e.income_type)?.label ?? e.income_type}
                              </span>
                              {e.employer_name && <span style={{ font: 'var(--t-caption)', color: 'var(--fg-muted)', marginLeft: 8 }}>{e.employer_name}</span>}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                              <span style={{ font: 'var(--t-body)' }}><Amount paisa={e.gross_paisa} /></span>
                              <button
                                type="button"
                                onClick={(ev) => { ev.stopPropagation(); setEditEntry(e); setModalOpen(true); }}
                                style={{ padding: '4px 10px', borderRadius: 4, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', font: 'var(--t-caption)' }}
                              >Edit</button>
                              <button
                                type="button"
                                onClick={(ev) => { ev.stopPropagation(); if (confirm('Delete this entry?')) deleteEntry(e.id); }}
                                style={{ padding: '4px 10px', borderRadius: 4, border: '1px solid var(--danger)', background: 'transparent', cursor: 'pointer', font: 'var(--t-caption)', color: 'var(--danger)' }}
                              >Delete</button>
                            </div>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={(ev) => { ev.stopPropagation(); setEditEntry(null); setPrefillMonth(row.month); setModalOpen(true); }}
                          style={{ marginTop: 8, padding: '6px 12px', borderRadius: 6, border: '1px solid var(--accent)', background: 'transparent', cursor: 'pointer', font: 'var(--t-caption)', color: 'var(--accent)' }}
                        >+ Add entry for {formatMonth(row.month)}</button>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '2px solid var(--border)', background: 'var(--bg-sunken)' }}>
                <td style={{ padding: '12px 16px', font: 'var(--t-label)', fontWeight: 700 }}>TOTAL</td>
                <td style={{ padding: '12px 16px', textAlign: 'right', font: 'var(--t-body)', fontWeight: 700 }}>
                  {summary?.totals.gross_paisa ? <Amount paisa={summary.totals.gross_paisa} /> : '—'}
                </td>
                <td />
                <td style={{ padding: '12px 16px', textAlign: 'right', font: 'var(--t-body)' }}>
                  {summary?.totals.tds_paisa ? <Amount paisa={summary.totals.tds_paisa} /> : '—'}
                </td>
                <td style={{ padding: '12px 16px', textAlign: 'right', font: 'var(--t-body)', fontWeight: 700 }}>
                  {summary?.totals.in_hand_paisa ? <Amount paisa={summary.totals.in_hand_paisa} /> : '—'}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Salary History */}
      {summary?.salary_history && summary.salary_history.length > 1 && (
        <section style={{ marginBottom: 32 }}>
          <h2 style={{ font: 'var(--t-section)', marginBottom: 12 }}>Salary History</h2>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {summary.salary_history.map((h) => (
              <div key={h.month} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px' }}>
                <div style={{ font: 'var(--t-caption)', color: 'var(--fg-secondary)' }}>{formatMonth(h.month + '-01')}</div>
                <div style={{ font: 'var(--t-body)', fontWeight: 600 }}><Amount paisa={h.gross_paisa} /></div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Holiday Support Log */}
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 style={{ font: 'var(--t-section)', margin: 0 }}>Holiday Support Log</h2>
          <button
            type="button"
            onClick={() => { setEditHoliday(null); setHolidayModalOpen(true); }}
            style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid var(--accent)', background: 'transparent', cursor: 'pointer', font: 'var(--t-caption)', color: 'var(--accent)' }}
          >
            + Add Holiday Support Entry
          </button>
        </div>
        {holidayEntries.length === 0 ? (
          <EmptyState heading="No holiday support entries" body="Track your holiday support payments here." />
        ) : (
          <div className="table-scroll" style={{ background: 'var(--bg-surface)', borderRadius: 10, border: '1px solid var(--border)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 500 }}>
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
                {holidayEntries.map((e) => (
                  <tr key={e.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 16px', font: 'var(--t-body)' }}>{new Date(e.date).toLocaleDateString('en-BD', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                    <td style={{ padding: '10px 16px', textAlign: 'center', font: 'var(--t-body)' }}>{e.days}</td>
                    <td style={{ padding: '10px 16px', textAlign: 'right', font: 'var(--t-body)', color: 'var(--fg-secondary)' }}><Amount paisa={e.rate_paisa} /></td>
                    <td style={{ padding: '10px 16px', textAlign: 'right', font: 'var(--t-body)', fontWeight: 600 }}><Amount paisa={e.amount_paisa} /></td>
                    <td style={{ padding: '10px 16px', textAlign: 'center', display: 'flex', gap: 6, justifyContent: 'center' }}>
                      <button type="button" onClick={() => { setEditHoliday(e); setHolidayModalOpen(true); }} style={{ padding: '4px 10px', borderRadius: 4, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', font: 'var(--t-caption)' }}>Edit</button>
                      <button type="button" onClick={() => { if (confirm('Delete this entry?')) deleteHoliday(e.id); }} style={{ padding: '4px 10px', borderRadius: 4, border: '1px solid var(--danger)', background: 'transparent', cursor: 'pointer', font: 'var(--t-caption)', color: 'var(--danger)' }}>Delete</button>
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
        onSaved={() => { loadSummary(); if (expandedMonth) { api.get<IncomeEntry[]>(`/income-entries?month=${expandedMonth}`).then(({ data }) => setMonthEntries(data)); } }}
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
    </div>
  );
}
