'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { MoneyInput } from '@/components/ui/MoneyInput';
import { Modal } from '@/components/ui/Modal';
import { MonthPicker } from '@/components/ui/DatePicker';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface IncomeEntry {
  id: string;
  month: string;
  income_type: string;
  gross_paisa: number;
  tds_paisa: number;
  in_hand_paisa: number;
  is_taxable: boolean;
  payer_name?: string | null;
  earned_period?: string | null;
  employer_name?: string | null;
  notes?: string | null;
  savings_account_id?: string | null;
  fiscal_year: string;
}

export interface SavingsAccount {
  id: string;
  name: string;
  bank_name: string;
  type: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const INCOME_TYPES = [
  { value: 'SALARY', label: 'Salary' },
  { value: 'CHEER', label: 'Cheer' },
  { value: 'PROFIT_SHARE', label: 'Profit Share' },
  { value: 'EID_BONUS', label: 'Eid Festival Bonus' },
  { value: 'LEAVE_ENCASHMENT', label: 'Leave Encashment' },
  { value: 'CERTIFICATION', label: 'Certification Reimbursement' },
  { value: 'HOLIDAY_SUPPORT', label: 'Holiday Support' },
  { value: 'SAVINGS_INTEREST', label: 'Bank Savings Interest' },
  { value: 'SANCHAYPATRA_PROFIT', label: 'Sanchaypatra Profit' },
  { value: 'OTHER', label: 'Other' },
];

const OTHER_INCOME_TYPES = INCOME_TYPES.filter((t) => t.value !== 'SALARY');

// ── Helpers ───────────────────────────────────────────────────────────────────

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

// ── Modal component ───────────────────────────────────────────────────────────

interface LatestSalary {
  month: string;
  gross_paisa: number;
  tds_paisa: number;
  employer_name: string | null;
}

export interface IncomeModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editEntry?: IncomeEntry | null;
  prefillFromLatestSalary?: LatestSalary | null;
  prefillMonth?: string;
  savingsAccounts?: SavingsAccount[];
}

export function IncomeModal({
  open, onClose, onSaved, editEntry, prefillFromLatestSalary, prefillMonth, savingsAccounts = [],
}: IncomeModalProps) {
  const [category, setCategory] = useState<'SALARY' | 'OTHER'>('SALARY');
  const [month, setMonth] = useState('');
  const [tdsPaisa, setTdsPaisa] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [isTaxable, setIsTaxable] = useState(true);
  const [employerName, setEmployerName] = useState('');
  const [savingsAccountId, setSavingsAccountId] = useState('');

  // Salary fields
  const [actualPaisa, setActualPaisa] = useState<number | null>(null);
  const [bonusPaisa, setBonusPaisa] = useState<number | null>(null);
  const [otherPaisa, setOtherPaisa] = useState<number | null>(null);

  // Other income fields
  const [incomeType, setIncomeType] = useState('CHEER');
  const [amountPaisa, setAmountPaisa] = useState<number | null>(null);
  const [payerName, setPayerName] = useState('');
  const [earnedPeriod, setEarnedPeriod] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // User enters in-hand (net received); gross = in-hand + TDS
  const inHandPortion = category === 'SALARY'
    ? (actualPaisa ?? 0) + (bonusPaisa ?? 0) + (otherPaisa ?? 0)
    : (amountPaisa ?? 0);
  const tds = tdsPaisa ?? 0;
  const gross = inHandPortion + tds;
  const tdsExceedsGross = false; // gross = inHand + TDS, so TDS can never exceed gross

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
      setSavingsAccountId(editEntry.savings_account_id ?? '');
      if (isSal) {
        // gross stored = in-hand + TDS; reconstruct in-hand for display
        setActualPaisa(editEntry.gross_paisa - editEntry.tds_paisa);
        setBonusPaisa(null); setOtherPaisa(null);
      } else {
        setIncomeType(editEntry.income_type);
        setAmountPaisa(editEntry.gross_paisa - editEntry.tds_paisa);
        setActualPaisa(null); setBonusPaisa(null); setOtherPaisa(null);
      }
    } else if (prefillFromLatestSalary) {
      setCategory('SALARY');
      setMonth(prefillMonth ?? '');
      setActualPaisa(prefillFromLatestSalary.gross_paisa - (prefillFromLatestSalary.tds_paisa || 0));
      setBonusPaisa(null); setOtherPaisa(null);
      setTdsPaisa(prefillFromLatestSalary.tds_paisa || null);
      setIsTaxable(true);
      setEmployerName(prefillFromLatestSalary.employer_name ?? '');
      setNotes(''); setPayerName(''); setEarnedPeriod(''); setAmountPaisa(null);
      setSavingsAccountId('');
    } else {
      setCategory('SALARY');
      setMonth(prefillMonth ?? '');
      setActualPaisa(null); setBonusPaisa(null); setOtherPaisa(null);
      setTdsPaisa(null); setIsTaxable(true); setEmployerName('');
      setNotes(''); setPayerName(''); setEarnedPeriod(''); setAmountPaisa(null);
      setIncomeType('CHEER'); setSavingsAccountId('');
    }
    setError(null);
  }, [open, editEntry, prefillFromLatestSalary, prefillMonth]);

  useEffect(() => {
    if (!editEntry) setIsTaxable(incomeType !== 'CERTIFICATION');
  }, [incomeType, editEntry]);

  async function handleSave() {
    if (!month) { setError('Month is required'); return; }
    if (gross === 0) { setError('Amount is required'); return; }
    if (tds < 0) { setError('TDS cannot be negative'); return; }

    const finalIncomeType = category === 'SALARY' ? 'SALARY' : incomeType;
    setSaving(true); setError(null);
    try {
      if (editEntry) {
        await api.patch(`/income-entries/${editEntry.id}`, {
          gross_paisa: gross, tds_paisa: tds, is_taxable: isTaxable,
          employer_name: employerName || null,
          payer_name: finalIncomeType === 'CHEER' ? (payerName || null) : null,
          earned_period: finalIncomeType === 'CHEER' ? (earnedPeriod || null) : null,
          notes: notes || null,
          savings_account_id: savingsAccountId || null,
        });
      } else {
        await api.post('/income-entries', {
          month, income_type: finalIncomeType, gross_paisa: gross, tds_paisa: tds,
          is_taxable: isTaxable,
          employer_name: employerName || null,
          payer_name: finalIncomeType === 'CHEER' ? (payerName || null) : null,
          earned_period: finalIncomeType === 'CHEER' ? (earnedPeriod || null) : null,
          notes: notes || null,
          savings_account_id: savingsAccountId || null,
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

        {/* Category toggle */}
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
                  {cat === 'SALARY' ? 'Salary' : 'Other Income'}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Month — year locked to current year */}
        <FieldLabel label="Year & Month">
          <MonthPicker
            value={month}
            onChange={setMonth}
            disabled={!!editEntry}
            placeholder="Select month"
          />
        </FieldLabel>

        {/* SALARY MODE */}
        {isSalary ? (
          <>
            <FieldLabel label="In-Hand Salary (৳)">
              <MoneyInput value={actualPaisa} onChange={setActualPaisa} id="actual-paisa" />
              <span style={{ font: 'var(--t-caption)', color: 'var(--fg-muted)' }}>Net amount credited to your account (after TDS deduction)</span>
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
          /* OTHER INCOME MODE */
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

        {/* Bank account */}
        {savingsAccounts.length > 0 && (
          <FieldLabel label="Bank Account (optional)">
            <select value={savingsAccountId} onChange={(e) => setSavingsAccountId(e.target.value)} style={inputStyle}>
              <option value="">— None —</option>
              {savingsAccounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name} · {a.bank_name}</option>
              ))}
            </select>
          </FieldLabel>
        )}

        {/* Notes */}
        <FieldLabel label="Notes (optional)">
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
        </FieldLabel>

        {/* Taxable toggle */}
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, font: 'var(--t-body)', cursor: 'pointer' }}>
          <input type="checkbox" checked={isTaxable} onChange={(e) => setIsTaxable(e.target.checked)} style={{ width: 16, height: 16 }} />
          Taxable income
        </label>

        {/* Gross summary */}
        {gross > 0 && (
          <div>
            <div style={{ font: 'var(--t-body)', marginBottom: 2, fontWeight: 600 }}>
              {isSalary ? 'Gross Salary Amount' : 'Gross Amount'}
            </div>
            <GrossSummaryBox grossPaisa={gross} tdsPaisa={tds} />
          </div>
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
