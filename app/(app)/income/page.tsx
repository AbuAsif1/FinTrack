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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface IncomeEntry {
  id: string;
  month: string; // e.g. "2026-11-01"
  income_type: string;
  gross_paisa: number;
  tds_paisa: number;
  in_hand_paisa: number;
  is_taxable: boolean;
  payer_name?: string | null;
  earned_period?: string | null;
  employer_name?: string | null;
  notes?: string | null;
  fiscal_year: string;
}

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

const OTHER_INCOME_TYPES = INCOME_TYPES.filter((t) => t.value !== 'SALARY');

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
// Add/Edit Income Modal — two-mode form (Salary vs Other)
// ---------------------------------------------------------------------------

const inputStyle: React.CSSProperties = {
  padding: '8px 12px', borderRadius: 6,
  border: '1px solid var(--border)',
  background: 'var(--bg-sunken)',
  color: 'var(--fg-primary)',
};

function FieldLabel({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4, font: 'var(--t-body)' }}>
      {label}
      {children}
    </label>
  );
}

function GrossSummaryBox({ grossPaisa, tdsPaisa }: { grossPaisa: number; tdsPaisa: number }) {
  const inHand = grossPaisa - tdsPaisa;
  return (
    <div style={{
      marginTop: 4, padding: '12px 16px', borderRadius: 8,
      background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.2)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ font: 'var(--t-caption)', color: 'var(--fg-secondary)' }}>Gross Total</span>
        <span style={{ font: 'var(--t-body)', fontWeight: 700, color: 'var(--accent)' }}>
          ৳{(grossPaisa / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </span>
      </div>
      {tdsPaisa > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ font: 'var(--t-caption)', color: 'var(--fg-secondary)' }}>− TDS</span>
          <span style={{ font: 'var(--t-body)', color: 'var(--danger)' }}>
            ৳{(tdsPaisa / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 6, borderTop: '1px solid rgba(99,102,241,0.2)' }}>
        <span style={{ font: 'var(--t-caption)', color: 'var(--fg-secondary)', fontWeight: 600 }}>In-Hand</span>
        <span style={{ font: 'var(--t-body)', fontWeight: 700, color: 'var(--ok)' }}>
          ৳{(Math.max(0, inHand) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </span>
      </div>
    </div>
  );
}

interface IncomeModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editEntry?: IncomeEntry | null;
  prefillFromLatestSalary?: SummaryData['latest_salary'];
  prefillMonth?: string;
}

function IncomeModal({ open, onClose, onSaved, editEntry, prefillFromLatestSalary, prefillMonth }: IncomeModalProps) {
  // Category switch
  const [category, setCategory] = useState<'SALARY' | 'OTHER'>('SALARY');

  // Common
  const [month, setMonth] = useState('');
  const [tdsPaisa, setTdsPaisa] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [isTaxable, setIsTaxable] = useState(true);
  const [employerName, setEmployerName] = useState('');

  // Salary-specific breakdown
  const [actualPaisa, setActualPaisa] = useState<number | null>(null);   // basic/actual salary received
  const [bonusPaisa, setBonusPaisa] = useState<number | null>(null);
  const [otherPaisa, setOtherPaisa] = useState<number | null>(null);

  // Other-income specific
  const [incomeType, setIncomeType] = useState('CHEER');
  const [amountPaisa, setAmountPaisa] = useState<number | null>(null);
  const [payerName, setPayerName] = useState('');
  const [earnedPeriod, setEarnedPeriod] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Derived gross
  const salaryGross = (actualPaisa ?? 0) + (bonusPaisa ?? 0) + (otherPaisa ?? 0);
  const otherGross = amountPaisa ?? 0;
  const gross = category === 'SALARY' ? salaryGross : otherGross;
  const tds = tdsPaisa ?? 0;
  const tdsExceedsGross = tds > gross && gross > 0;

  useEffect(() => {
    if (!open) return;
    if (editEntry) {
      const isSal = editEntry.income_type === 'SALARY';
      setCategory(isSal ? 'SALARY' : 'OTHER');
      setMonth(editEntry.month.slice(0, 7));
      setTdsPaisa(editEntry.tds_paisa || null);
      setIsTaxable(editEntry.is_taxable);
      setEmployerName(editEntry.employer_name ?? '');
      setNotes(editEntry.notes ?? '');
      setPayerName(editEntry.payer_name ?? '');
      setEarnedPeriod(editEntry.earned_period ?? '');
      if (isSal) {
        setActualPaisa(editEntry.gross_paisa);
        setBonusPaisa(null);
        setOtherPaisa(null);
      } else {
        setIncomeType(editEntry.income_type);
        setAmountPaisa(editEntry.gross_paisa);
        setActualPaisa(null);
        setBonusPaisa(null);
        setOtherPaisa(null);
      }
    } else if (prefillFromLatestSalary) {
      setCategory('SALARY');
      setMonth(prefillMonth ?? '');
      setActualPaisa(prefillFromLatestSalary.gross_paisa);
      setBonusPaisa(null);
      setOtherPaisa(null);
      setTdsPaisa(prefillFromLatestSalary.tds_paisa || null);
      setIsTaxable(true);
      setEmployerName(prefillFromLatestSalary.employer_name ?? '');
      setNotes(''); setPayerName(''); setEarnedPeriod(''); setAmountPaisa(null);
    } else {
      setCategory('SALARY');
      setMonth(prefillMonth ?? '');
      setActualPaisa(null); setBonusPaisa(null); setOtherPaisa(null);
      setTdsPaisa(null); setIsTaxable(true); setEmployerName('');
      setNotes(''); setPayerName(''); setEarnedPeriod(''); setAmountPaisa(null);
      setIncomeType('CHEER');
    }
    setError(null);
  }, [open, editEntry, prefillFromLatestSalary, prefillMonth]);

  useEffect(() => {
    if (!editEntry) setIsTaxable(incomeType !== 'CERTIFICATION');
  }, [incomeType, editEntry]);

  async function handleSave() {
    if (!month) { setError('Month is required'); return; }
    if (gross === 0) { setError('Amount is required'); return; }
    if (tdsExceedsGross) { setError('TDS cannot exceed gross amount'); return; }
    if (tds < 0) { setError('TDS cannot be negative'); return; }

    const finalIncomeType = category === 'SALARY' ? 'SALARY' : incomeType;
    setSaving(true); setError(null);
    try {
      if (editEntry) {
        await api.patch(`/income-entries/${editEntry.id}`, {
          gross_paisa: gross,
          tds_paisa: tds,
          is_taxable: isTaxable,
          employer_name: employerName || null,
          payer_name: finalIncomeType === 'CHEER' ? (payerName || null) : null,
          earned_period: finalIncomeType === 'CHEER' ? (earnedPeriod || null) : null,
          notes: notes || null,
        });
      } else {
        await api.post('/income-entries', {
          month,
          income_type: finalIncomeType,
          gross_paisa: gross,
          tds_paisa: tds,
          is_taxable: isTaxable,
          employer_name: employerName || null,
          payer_name: finalIncomeType === 'CHEER' ? (payerName || null) : null,
          earned_period: finalIncomeType === 'CHEER' ? (earnedPeriod || null) : null,
          notes: notes || null,
          idempotency_key: `${month}-${finalIncomeType}-${Date.now()}`,
        });
      }
      onSaved(); onClose();
    } catch (err: unknown) {
      setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to save');
    } finally { setSaving(false); }
  }

  const isSalary = category === 'SALARY';

  return (
    <Modal open={open} onClose={onClose} title={editEntry ? 'Edit Income Entry' : 'Add Income'}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxHeight: '80vh', overflowY: 'auto', paddingRight: 2 }}>

        {/* ── Category toggle (Salary / Other) ── */}
        {!editEntry && (
          <div>
            <div style={{ font: 'var(--t-body)', marginBottom: 6 }}>Category</div>
            <div style={{ display: 'flex', borderRadius: 8, border: '1px solid var(--border)', overflow: 'hidden' }}>
              {(['SALARY', 'OTHER'] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  style={{
                    flex: 1, padding: '9px 0', border: 'none', cursor: 'pointer',
                    font: 'var(--t-body)', fontWeight: category === cat ? 700 : 400,
                    background: category === cat ? 'var(--accent)' : 'var(--bg-sunken)',
                    color: category === cat ? '#fff' : 'var(--fg-secondary)',
                    transition: 'background 0.15s',
                  }}
                >
                  {cat === 'SALARY' ? '💼 Salary' : '💰 Other Income'}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Month ── */}
        <FieldLabel label="Year & Month">
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            disabled={!!editEntry}
            style={inputStyle}
          />
        </FieldLabel>

        {/* ── SALARY MODE ── */}
        {isSalary ? (
          <>
            <FieldLabel label="Actual Amount Received (৳)">
              <MoneyInput value={actualPaisa} onChange={setActualPaisa} id="actual-paisa" />
              <span style={{ font: 'var(--t-caption)', color: 'var(--fg-muted)' }}>Basic salary / net credited amount</span>
            </FieldLabel>

            <FieldLabel label="TDS Amount (৳)">
              <MoneyInput value={tdsPaisa} onChange={setTdsPaisa} id="tds-paisa-salary" />
              <span style={{ font: 'var(--t-caption)', color: 'var(--fg-muted)' }}>Tax deducted at source</span>
            </FieldLabel>

            <FieldLabel label="Bonus (৳) — optional">
              <MoneyInput value={bonusPaisa} onChange={setBonusPaisa} id="bonus-paisa" />
            </FieldLabel>

            <FieldLabel label="Other Allowances (৳) — optional">
              <MoneyInput value={otherPaisa} onChange={setOtherPaisa} id="other-paisa" />
              <span style={{ font: 'var(--t-caption)', color: 'var(--fg-muted)' }}>e.g. medical, travel, festival allowance</span>
            </FieldLabel>

            <FieldLabel label="Employer (optional)">
              <input type="text" value={employerName} onChange={(e) => setEmployerName(e.target.value)} placeholder="Company name" style={inputStyle} />
            </FieldLabel>
          </>
        ) : (
          /* ── OTHER INCOME MODE ── */
          <>
            {!editEntry && (
              <FieldLabel label="Income Type">
                <select value={incomeType} onChange={(e) => setIncomeType(e.target.value)} style={inputStyle}>
                  {OTHER_INCOME_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </FieldLabel>
            )}

            <FieldLabel label="Amount Received (৳)">
              <MoneyInput value={amountPaisa} onChange={setAmountPaisa} id="other-amount-paisa" />
            </FieldLabel>

            <FieldLabel label="TDS (৳) — optional">
              <MoneyInput value={tdsPaisa} onChange={setTdsPaisa} id="tds-paisa-other" />
            </FieldLabel>

            {incomeType === 'CHEER' && (
              <>
                <FieldLabel label="Payer Name (optional)">
                  <input type="text" value={payerName} onChange={(e) => setPayerName(e.target.value)} placeholder="Who paid?" style={inputStyle} />
                </FieldLabel>
                <FieldLabel label="Earned Period (optional)">
                  <input type="text" value={earnedPeriod} onChange={(e) => setEarnedPeriod(e.target.value)} placeholder="e.g. 2026-Q3" style={inputStyle} />
                </FieldLabel>
              </>
            )}

            <FieldLabel label="Employer / Source (optional)">
              <input type="text" value={employerName} onChange={(e) => setEmployerName(e.target.value)} placeholder="Source / organisation" style={inputStyle} />
            </FieldLabel>
          </>
        )}

        {/* ── Notes (both modes) ── */}
        <FieldLabel label="Notes (optional)">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </FieldLabel>

        {/* ── Taxable toggle ── */}
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, font: 'var(--t-body)', cursor: 'pointer' }}>
          <input type="checkbox" checked={isTaxable} onChange={(e) => setIsTaxable(e.target.checked)} style={{ width: 16, height: 16 }} />
          Taxable income
        </label>

        {/* ── Gross summary box ── */}
        {gross > 0 && (
          <div>
            <div style={{ font: 'var(--t-body)', marginBottom: 2, fontWeight: 600 }}>
              {isSalary ? 'Gross Salary Amount' : 'Gross Amount'}
            </div>
            <GrossSummaryBox grossPaisa={gross} tdsPaisa={tds} />
          </div>
        )}

        {tdsExceedsGross && (
          <div style={{ color: 'var(--danger)', font: 'var(--t-caption)' }}>TDS cannot exceed gross amount</div>
        )}

        {error && <div style={{ color: 'var(--danger)', font: 'var(--t-caption)' }}>{error}</div>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button type="button" onClick={onClose} style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--fg-primary)', cursor: 'pointer' }}>
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || tdsExceedsGross}
            style={{ padding: '8px 16px', borderRadius: 6, border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', opacity: saving || tdsExceedsGross ? 0.7 : 1 }}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </Modal>
  );
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
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-sunken)', color: 'var(--fg-primary)' }}
          />
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
