'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import api from '@/lib/api';
import { DatePicker, MonthPicker } from '@/components/ui/DatePicker';

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
  opening_balance_paisa?: number;
  monthly_installment_paisa?: number | null;
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
  savings_account_id?: string | null;
  savings_account?: { id: string; name: string } | null;
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

interface SelectOption {
  value: string;
  label: string;
  group?: string;
}

interface Form {
  amount_paisa: string;
  date: string;
  paying_for_month: string;
  description: string;
  category_id: string;
  payment_method: string;
  savings_account_id: string;
  bank_account_id: string;
  loan_person_name: string;
  loan_direction: string;
  loan_reason: string;
  loan_return_due_date: string;
  transfer_from_id: string;
  transfer_to_id: string;
  idempotency_key: string;
  fixed_expense_id: string;
  investment_type: string;
  investment_custom_label: string;
  investment_account_id: string;
}

const INVESTMENT_TYPES = [
  { value: 'sanchaypatra', label: 'Sanchaypatra' },
  { value: 'fixed_deposit', label: 'Fixed Deposit' },
  { value: 'stocks',        label: 'Stocks' },
  { value: 'insurance',     label: 'Insurance' },
  { value: 'others',        label: 'Others' },
];

const PAYMENT_METHODS = ['CASH', 'BANK', 'BKASH', 'NAGAD', 'ROCKET', 'CARD'];

function fmt(paisa: number) {
  return '৳' + (paisa / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

// ── Searchable category combobox ──────────────────────────────────────────

function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Select…',
  style,
}: {
  options: SelectOption[];
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  style?: React.CSSProperties;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [dropRect, setDropRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = options.find((o) => o.value === value);

  const filtered = query.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  // Close on outside click (checks both trigger and portal dropdown)
  useEffect(() => {
    function handler(e: MouseEvent) {
      const target = e.target as Node;
      if (!containerRef.current?.contains(target) && !dropdownRef.current?.contains(target)) {
        setOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Keep portal position in sync when the page scrolls or resizes
  useEffect(() => {
    if (!open) return;
    function update() {
      if (triggerRef.current) {
        const r = triggerRef.current.getBoundingClientRect();
        setDropRect({ top: r.bottom + 2, left: r.left, width: r.width });
      }
    }
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [open]);

  function handleOpen() {
    if (triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect();
      setDropRect({ top: r.bottom + 2, left: r.left, width: r.width });
    }
    setOpen(true);
    setQuery('');
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function handleSelect(val: string) {
    onChange(val);
    setOpen(false);
    setQuery('');
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') { setOpen(false); setQuery(''); }
    if (e.key === 'Enter' && filtered.length === 1) {
      e.preventDefault();
      handleSelect(filtered[0].value);
    }
  }

  const baseStyle: React.CSSProperties = {
    width: '100%', padding: '8px 10px', border: '1px solid var(--border)',
    borderRadius: 6, font: 'var(--t-body)', background: 'var(--bg-sunken)',
    boxSizing: 'border-box', cursor: 'pointer', display: 'flex',
    alignItems: 'center', justifyContent: 'space-between', userSelect: 'none',
    ...style,
  };

  const groups = Array.from(new Set(options.map((o) => o.group ?? ''))).filter(Boolean);
  const hasGroups = groups.length > 0;

  function renderOptions() {
    if (!hasGroups) {
      return filtered.map((o) => (
        <div
          key={o.value}
          onMouseDown={(e) => { e.preventDefault(); handleSelect(o.value); }}
          style={{
            padding: '8px 12px', cursor: 'pointer',
            background: o.value === value ? 'rgba(99,102,241,0.1)' : 'transparent',
            color: o.value === value ? 'var(--accent)' : 'var(--fg-primary)',
            fontWeight: o.value === value ? 600 : 400,
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-raised)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = o.value === value ? 'rgba(99,102,241,0.1)' : 'transparent'; }}
        >
          {o.label}
        </div>
      ));
    }

    const ungrouped = filtered.filter((o) => !o.group);
    const result: React.ReactNode[] = [];

    ungrouped.forEach((o) => {
      result.push(
        <div
          key={o.value}
          onMouseDown={(e) => { e.preventDefault(); handleSelect(o.value); }}
          style={{
            padding: '8px 12px', cursor: 'pointer',
            background: o.value === value ? 'rgba(99,102,241,0.1)' : 'transparent',
            color: o.value === value ? 'var(--accent)' : 'var(--fg-primary)',
            fontWeight: o.value === value ? 600 : 400,
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-raised)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = o.value === value ? 'rgba(99,102,241,0.1)' : 'transparent'; }}
        >
          {o.label}
        </div>
      );
    });

    groups.forEach((group) => {
      const groupOptions = filtered.filter((o) => o.group === group);
      if (groupOptions.length === 0) return;
      result.push(
        <div key={`group-${group}`} style={{ padding: '6px 12px 2px', font: 'var(--t-label)', color: 'var(--fg-muted)', borderTop: result.length > 0 ? '1px solid var(--border)' : 'none', marginTop: 4 }}>
          {group}
        </div>
      );
      groupOptions.forEach((o) => {
        result.push(
          <div
            key={o.value}
            onMouseDown={(e) => { e.preventDefault(); handleSelect(o.value); }}
            style={{
              padding: '8px 12px', cursor: 'pointer',
              background: o.value === value ? 'rgba(99,102,241,0.1)' : 'transparent',
              color: o.value === value ? 'var(--accent)' : 'var(--fg-primary)',
              fontWeight: o.value === value ? 600 : 400,
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-raised)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = o.value === value ? 'rgba(99,102,241,0.1)' : 'transparent'; }}
          >
            {o.label}
          </div>
        );
      });
    });

    return result;
  }

  // Render dropdown via portal to escape modal's overflow:auto clipping
  const dropdownPortal =
    open && dropRect
      ? createPortal(
          <div
            ref={dropdownRef}
            role="listbox"
            style={{
              position: 'fixed',
              top: dropRect.top,
              left: dropRect.left,
              width: dropRect.width,
              zIndex: 9999,
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
              maxHeight: 280,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search categories…"
                style={{
                  width: '100%', padding: '6px 10px', border: '1px solid var(--border)',
                  borderRadius: 5, font: 'var(--t-body)', background: 'var(--bg-sunken)',
                  outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {filtered.length === 0 ? (
                <div style={{ padding: '12px', font: 'var(--t-caption)', color: 'var(--fg-muted)', textAlign: 'center' }}>
                  No matches for &ldquo;{query}&rdquo;
                </div>
              ) : (
                renderOptions()
              )}
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <div
        ref={triggerRef}
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        tabIndex={0}
        onClick={handleOpen}
        onFocus={handleOpen}
        style={baseStyle}
      >
        <span style={{ color: selected ? 'var(--fg-primary)' : 'var(--fg-muted)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selected ? selected.label : placeholder}
        </span>
        <span style={{ color: 'var(--fg-muted)', fontSize: 11, marginLeft: 6, flexShrink: 0 }}>▾</span>
      </div>
      {dropdownPortal}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────

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
  const currentMonth = new Date().toISOString().slice(0, 7);

  const [form, setForm] = useState<Form>(() => ({
    amount_paisa: editing ? String(editing.amount_paisa / 100) : '',
    date: editing ? editing.date.slice(0, 10) : todayIso(),
    paying_for_month: currentMonth,
    description: editing?.description ?? '',
    category_id: editing?.category_id ?? '',
    payment_method: editing?.payment_method ?? 'CASH',
    savings_account_id: editing?.routing?.savings_account?.id ?? '',
    bank_account_id: '',
    loan_person_name: editing?.routing?.loan_person?.name ?? '',
    loan_direction: editing?.routing?.direction ?? 'GIVEN',
    loan_reason: '',
    loan_return_due_date: editing?.routing?.return_due_date?.slice(0, 10) ?? '',
    transfer_from_id: '',
    transfer_to_id: '',
    idempotency_key: crypto.randomUUID(),
    fixed_expense_id: '',
    investment_type: '',
    investment_custom_label: '',
    investment_account_id: '',
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isTransfer = form.category_id === '__TRANSFER__';
  const isFixedExpenseMode = form.category_id === '__FIXED_EXPENSE__';
  const isInvestmentMode = form.category_id === '__INVESTMENT__';

  const selectedFixedTemplate = fixedExpenses.find((t) => t.id === form.fixed_expense_id);
  const effectiveCategoryId = isFixedExpenseMode
    ? (selectedFixedTemplate?.category?.id ?? selectedFixedTemplate?.category_id ?? '')
    : form.category_id;
  const selectedCat = categories.find((c) => c.id === effectiveCategoryId);
  const routingType = selectedCat?.routing_type ?? 'NONE';
  const isSavings = routingType === 'SAVINGS_DEPOSIT' || routingType === 'SAVINGS_WITHDRAWAL';
  const isLoan = routingType === 'LOAN_GIVEN' || routingType === 'LOAN_RECEIVED';
  const isTax = routingType === 'TAX_PAYMENT';
  const savingsOnly = savingsAccounts.filter((a) => a.type === 'SAVINGS');

  // Hide categories already covered by a fixed expense template (only when adding new)
  const fixedExpenseCategoryIds = isEdit
    ? new Set<string>()
    : new Set(fixedExpenses.flatMap((fe) => [fe.category_id, fe.category?.id]).filter((id): id is string => !!id));

  // Hide "Investment (Sanchaypatra)" from the flat list — it now lives under __INVESTMENT__
  const isSanchCategory = (c: { name: string }) => c.name.toLowerCase().includes('sanchaypatra') || c.name.toLowerCase().includes('sanch');

  // Investment sub-type helpers
  const investIsSavingsType = form.investment_type === 'sanchaypatra' || form.investment_type === 'fixed_deposit';
  const sanchAccounts = savingsAccounts.filter((a) => a.type === 'SANCHAYPATRA');
  const fdAccounts = savingsAccounts.filter((a) => a.type !== 'CASH');

  // Category options: regular categories + Investment + Fixed Expenses + Transfer
  const categoryOptions: SelectOption[] = [
    ...categories
      .filter((c) => !fixedExpenseCategoryIds.has(c.id) && !isSanchCategory(c))
      .map((c) => ({ value: c.id, label: c.name })),
    ...(!isEdit ? [{ value: '__INVESTMENT__', label: 'Investment', group: 'Special' }] : []),
    ...(!isEdit ? [{ value: '__FIXED_EXPENSE__', label: 'Fixed Expenses', group: 'Special' }] : []),
    ...(!isEdit && savingsOnly.length >= 2 ? [{ value: '__TRANSFER__', label: 'Transfer between accounts', group: 'Special' }] : []),
  ];

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 10px', border: '1px solid var(--border)',
    borderRadius: 6, font: 'var(--t-body)', background: 'var(--bg-sunken)', boxSizing: 'border-box',
  };

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const val = e.target.value;
    setForm((f) => {
      const next = { ...f, [k]: val };
      if (k === 'payment_method' && val !== 'BANK') {
        next.savings_account_id = isFixedExpenseMode && isSavings ? f.savings_account_id : '';
        next.bank_account_id = '';
      }
      return next;
    });
  };

  function setCategoryId(val: string) {
    setForm((f) => ({
      ...f,
      category_id: val,
      transfer_from_id: '',
      transfer_to_id: '',
      savings_account_id: '',
      bank_account_id: '',
      fixed_expense_id: '',
      investment_type: '',
      investment_custom_label: '',
      investment_account_id: '',
    }));
  }

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

    if (isInvestmentMode && !form.investment_type) {
      setError('Please select the type of investment.');
      setSaving(false);
      return;
    }
    if (isInvestmentMode && form.investment_type === 'others' && !form.investment_custom_label.trim()) {
      setError('Please enter the investment type name.');
      setSaving(false);
      return;
    }
    if (isInvestmentMode && investIsSavingsType && !form.investment_account_id) {
      setError('Please select the account to deposit into.');
      setSaving(false);
      return;
    }
    if (isInvestmentMode && form.payment_method === 'BANK' && !form.bank_account_id) {
      setError('Please select the bank account to pay from.');
      setSaving(false);
      return;
    }

    if (isFixedExpenseMode && fixedExpenses.length > 0 && !selectedFixedTemplate) {
      setError('Please select which fixed expense this payment is for.');
      setSaving(false);
      return;
    }
    if (isFixedExpenseMode && fixedExpenses.length === 0) {
      setError('No fixed expenses found. Add them on the Fixed Expenses page first.');
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

    // For non-savings BANK: require savings_account_id (the bank source)
    if (!isTransfer && form.payment_method === 'BANK' && !isSavings && !isLoan && !isTax && savingsOnly.length > 0 && !form.savings_account_id) {
      setError('Please select a bank account for BANK payment.');
      setSaving(false);
      return;
    }
    // For savings BANK (DPS fixed expense): require bank_account_id
    if (!isTransfer && form.payment_method === 'BANK' && isSavings && isFixedExpenseMode && savingsOnly.length > 0 && !form.bank_account_id) {
      setError('Please select the bank account you are transferring from.');
      setSaving(false);
      return;
    }

    const doSave = async () => {
      try {
        if (isInvestmentMode) {
          await api.post('/investments', {
            investment_type: form.investment_type,
            ...(form.investment_type === 'others' && form.investment_custom_label ? { custom_label: form.investment_custom_label.trim() } : {}),
            amount_paisa: amountPaisa,
            payment_method: form.payment_method,
            ...(investIsSavingsType && form.investment_account_id ? { savings_account_id: form.investment_account_id } : {}),
            ...(form.payment_method === 'BANK' && form.bank_account_id ? { bank_account_id: form.bank_account_id } : {}),
            description: form.description || undefined,
            idempotency_key: form.idempotency_key,
          });
          onSaved();
          return;
        }
        if (isTransfer) {
          await api.post('/savings-accounts/transfer', {
            from_account_id: form.transfer_from_id,
            to_account_id: form.transfer_to_id,
            amount_paisa: amountPaisa,
            date: form.date,
            description: form.description || undefined,
          });
        } else {
          const categoryIdToSend = isFixedExpenseMode && effectiveCategoryId ? effectiveCategoryId : form.category_id;
          // For fixed expenses: send today as date (so opening-date validation passes),
          // and for_month separately (so autoLink targets the right instance).
          // For edits: use stored date. For new regular expenses: omit date — backend defaults to today.
          const dateToSend = isEdit ? form.date : undefined;
          const forMonthToSend = isFixedExpenseMode && !isEdit ? form.paying_for_month : undefined;
          const body: Record<string, unknown> = {
            amount_paisa: amountPaisa,
            description: form.description,
            category_id: categoryIdToSend,
            payment_method: form.payment_method,
            idempotency_key: form.idempotency_key,
            ...(dateToSend ? { date: dateToSend } : {}),
            ...(forMonthToSend ? { for_month: forMonthToSend, fixed_expense_id: form.fixed_expense_id } : {}),
          };
          if (isSavings && form.savings_account_id) body.savings_account_id = form.savings_account_id;
          if (isSavings && form.payment_method === 'BANK' && form.bank_account_id) body.bank_account_id = form.bank_account_id;
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
          {/* ── Section 1: What are you paying for? ──────────────────────── */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ font: 'var(--t-label)', color: 'var(--fg-muted)', marginBottom: 8, letterSpacing: '0.04em' }}>
              WHAT
            </div>

            {/* Category */}
            <div style={{ marginBottom: form.category_id ? 0 : 12 }}>
              <div style={{ font: 'var(--t-label)', marginBottom: 4 }}>Category</div>
              <SearchableSelect
                options={categoryOptions}
                value={form.category_id}
                onChange={setCategoryId}
                placeholder="Select category…"
              />
            </div>

            {/* Investment step 2 — immediately after Category */}
            {isInvestmentMode && (
              <div style={{ marginLeft: 14, paddingLeft: 12, borderLeft: '2px solid var(--accent)', marginTop: 10, marginBottom: 4 }}>
                <div style={{ font: 'var(--t-caption)', color: 'var(--accent)', marginBottom: 6, fontWeight: 600 }}>
                  Step 2 — Type of Investment
                </div>
                <select
                  required
                  value={form.investment_type}
                  onChange={(e) => {
                    const t = e.target.value;
                    const label = INVESTMENT_TYPES.find((it) => it.value === t)?.label ?? '';
                    setForm((f) => ({
                      ...f,
                      investment_type: t,
                      investment_custom_label: '',
                      investment_account_id: '',
                      // Pre-fill description for non-savings types; savings types fill it from the account selector
                      ...(['stocks', 'insurance', 'others'].includes(t) ? { description: label } : { description: '' }),
                    }));
                  }}
                  style={inputStyle}
                >
                  <option value="">Select investment type…</option>
                  {INVESTMENT_TYPES.map((it) => (
                    <option key={it.value} value={it.value}>{it.label}</option>
                  ))}
                </select>

                {/* Custom label for Others */}
                {form.investment_type === 'others' && (
                  <label style={{ display: 'block', marginTop: 10 }}>
                    <div style={{ font: 'var(--t-label)', marginBottom: 4 }}>Investment type name</div>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Real Estate, NFT, Mutual Fund…"
                      value={form.investment_custom_label}
                      onChange={(e) => setForm((f) => ({ ...f, investment_custom_label: e.target.value, description: e.target.value }))}
                      style={inputStyle}
                    />
                  </label>
                )}

                {/* Destination account for Sanchaypatra */}
                {form.investment_type === 'sanchaypatra' && (
                  <label style={{ display: 'block', marginTop: 10 }}>
                    <div style={{ font: 'var(--t-label)', marginBottom: 4 }}>Sanchaypatra Account</div>
                    {sanchAccounts.length === 0 ? (
                      <div style={{ font: 'var(--t-caption)', color: 'var(--fg-muted)', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--bg-sunken)' }}>
                        No Sanchaypatra accounts found. Add one on the Savings page.
                      </div>
                    ) : (
                      <select
                        required
                        value={form.investment_account_id}
                        onChange={(e) => {
                          const id = e.target.value;
                          const acct = sanchAccounts.find((a) => a.id === id);
                          setForm((f) => ({
                            ...f,
                            investment_account_id: id,
                            // Auto-fill from monthly installment if available, else opening balance
                            ...(acct && (acct.monthly_installment_paisa ?? acct.opening_balance_paisa ?? 0) > 0
                              ? { amount_paisa: String((acct.monthly_installment_paisa ?? acct.opening_balance_paisa ?? 0) / 100) }
                              : {}),
                            ...(acct ? { description: acct.name } : {}),
                          }));
                        }}
                        style={inputStyle}
                      >
                        <option value="">Select account…</option>
                        {sanchAccounts.map((a) => (
                          <option key={a.id} value={a.id}>{a.name} · {fmt(a.balance_paisa)}</option>
                        ))}
                      </select>
                    )}
                  </label>
                )}

                {/* Destination account for Fixed Deposit */}
                {form.investment_type === 'fixed_deposit' && (
                  <label style={{ display: 'block', marginTop: 10 }}>
                    <div style={{ font: 'var(--t-label)', marginBottom: 4 }}>Fixed Deposit Account</div>
                    {fdAccounts.length === 0 ? (
                      <div style={{ font: 'var(--t-caption)', color: 'var(--fg-muted)', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--bg-sunken)' }}>
                        No savings accounts found. Add one on the Savings page.
                      </div>
                    ) : (
                      <select
                        required
                        value={form.investment_account_id}
                        onChange={(e) => {
                          const id = e.target.value;
                          const acct = fdAccounts.find((a) => a.id === id);
                          setForm((f) => ({
                            ...f,
                            investment_account_id: id,
                            // Auto-fill amount from opening balance; fallback to balance
                            ...(acct && (acct.opening_balance_paisa ?? acct.balance_paisa) > 0
                              ? { amount_paisa: String((acct.opening_balance_paisa ?? acct.balance_paisa) / 100) }
                              : {}),
                            ...(acct ? { description: acct.name } : {}),
                          }));
                        }}
                        style={inputStyle}
                      >
                        <option value="">Select account…</option>
                        {fdAccounts.map((a) => (
                          <option key={a.id} value={a.id}>{a.name} · {fmt(a.balance_paisa)}</option>
                        ))}
                      </select>
                    )}
                  </label>
                )}

                {/* Info for financial investment types */}
                {(form.investment_type === 'stocks' || form.investment_type === 'insurance' || form.investment_type === 'others') && form.investment_type && (
                  <div style={{ font: 'var(--t-caption)', color: 'var(--fg-muted)', marginTop: 6 }}>
                    Amount will be recorded as an expense and added to Tax &gt; Investments automatically.
                  </div>
                )}
              </div>
            )}

            {/* Investment HOW section — payment method + bank deduction */}
            {isInvestmentMode && form.investment_type && (
              <div style={{ marginLeft: 14, paddingLeft: 12, borderLeft: '2px solid var(--ok)', marginTop: 10, marginBottom: 4 }}>
                <div style={{ font: 'var(--t-caption)', color: 'var(--ok)', marginBottom: 6, fontWeight: 600 }}>
                  Step 3 — How are you paying?
                </div>
                <select value={form.payment_method} onChange={set('payment_method')} style={inputStyle}>
                  {['CASH', 'BANK', 'BKASH', 'CARD'].map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
                {form.payment_method === 'BANK' && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ font: 'var(--t-label)', marginBottom: 4 }}>Deduct from bank account</div>
                    {savingsOnly.length === 0 ? (
                      <div style={{ font: 'var(--t-caption)', color: 'var(--fg-muted)', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--bg-sunken)' }}>
                        No bank accounts set up yet.
                      </div>
                    ) : (
                      <select
                        required
                        value={form.bank_account_id}
                        onChange={set('bank_account_id')}
                        style={inputStyle}
                      >
                        <option value="">Select bank account…</option>
                        {savingsOnly.map((a) => (
                          <option key={a.id} value={a.id}>{a.name} · {fmt(a.balance_paisa)}</option>
                        ))}
                      </select>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Fixed Expense step 2 — immediately after Category */}
            {isFixedExpenseMode && (
              <div style={{ marginLeft: 14, paddingLeft: 12, borderLeft: '2px solid var(--accent)', marginTop: 10, marginBottom: 4 }}>
                <div style={{ font: 'var(--t-caption)', color: 'var(--accent)', marginBottom: 6, fontWeight: 600 }}>
                  Step 2 — Which fixed expense?
                </div>
                {fixedExpenses.length === 0 ? (
                  <div style={{ font: 'var(--t-caption)', color: 'var(--fg-muted)' }}>
                    No fixed expenses set up yet. Add them on the Fixed Expenses page first.
                  </div>
                ) : (
                  <>
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
                            savings_account_id: tmpl.savings_account_id ?? '',
                          } : {}),
                        }));
                      }}
                      style={inputStyle}
                    >
                      <option value="">Select fixed expense…</option>
                      {fixedExpenses.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                          {t.category ? ` (${t.category.name})` : ''}
                          {` — ৳${(t.standard_amount_paisa / 100).toLocaleString('en-IN', { minimumFractionDigits: 0 })}`}
                          {` — day ${t.due_day}`}
                        </option>
                      ))}
                    </select>

                    {/* Paying for Month — only shown after a template is selected */}
                    {selectedFixedTemplate && (
                      <label style={{ display: 'block', marginTop: 10 }}>
                        <div style={{ font: 'var(--t-label)', marginBottom: 4 }}>Paying for Month</div>
                        <MonthPicker
                          value={form.paying_for_month}
                          onChange={(v) => setForm((f) => ({ ...f, paying_for_month: v }))}
                          placeholder="Select month…"
                        />
                        <div style={{ font: 'var(--t-caption)', color: 'var(--fg-muted)', marginTop: 4 }}>
                          Which month&apos;s {selectedFixedTemplate.name} is this? You can pay a past month.
                        </div>
                      </label>
                    )}

                    {selectedFixedTemplate?.savings_account && isSavings && (
                      <div style={{ font: 'var(--t-caption)', color: 'var(--accent)', marginTop: 6 }}>
                        Deposits into <strong>{selectedFixedTemplate.savings_account.name}</strong>
                      </div>
                    )}
                    {selectedFixedTemplate && (
                      <div style={{ font: 'var(--t-caption)', color: 'var(--fg-muted)', marginTop: 6 }}>
                        Amount pre-filled from template. Adjust below if actual amount differs.
                        {selectedFixedTemplate.category && <> Category: <strong>{selectedFixedTemplate.category.name}</strong>.</>}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* ── Section 2: How are you paying? ───────────────────────────── */}
          {!isFixedExpenseMode && !isTransfer && !isInvestmentMode && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ font: 'var(--t-label)', color: 'var(--fg-muted)', marginBottom: 8, letterSpacing: '0.04em' }}>
                HOW
              </div>

              {/* Payment Method */}
              <div style={{ marginBottom: form.payment_method === 'BANK' && !isSavings && !isLoan && !isTax && !isTransfer ? 0 : 12 }}>
                <div style={{ font: 'var(--t-label)', marginBottom: 4 }}>Payment Method</div>
                <select value={form.payment_method} onChange={set('payment_method')} style={inputStyle}>
                  {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>

              {/* Bank Account step 2 — immediately after Payment Method when BANK */}
              {!isTransfer && form.payment_method === 'BANK' && !isSavings && !isLoan && !isTax && (
                <div style={{ marginLeft: 14, paddingLeft: 12, borderLeft: '2px solid var(--ok)', marginTop: 10, marginBottom: 4 }}>
                  <div style={{ font: 'var(--t-caption)', color: 'var(--ok)', marginBottom: 6, fontWeight: 600 }}>
                    Step 2 — Which bank account to deduct from?
                  </div>
                  {savingsOnly.length === 0 ? (
                    <div style={{ font: 'var(--t-caption)', color: 'var(--fg-muted)', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--bg-sunken)' }}>
                      No bank accounts set up yet. Add one on the Savings page first.
                    </div>
                  ) : (
                    <select required value={form.savings_account_id} onChange={set('savings_account_id')} style={inputStyle}>
                      <option value="">Select bank account…</option>
                      {savingsOnly.map((a) => (
                        <option key={a.id} value={a.id}>{a.name} · {fmt(a.balance_paisa)}</option>
                      ))}
                    </select>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Fixed Expense: HOW section (payment method + bank step-2) */}
          {isFixedExpenseMode && selectedFixedTemplate && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ font: 'var(--t-label)', color: 'var(--fg-muted)', marginBottom: 8, letterSpacing: '0.04em' }}>
                HOW
              </div>
              <div style={{ marginBottom: form.payment_method === 'BANK' ? 0 : 12 }}>
                <div style={{ font: 'var(--t-label)', marginBottom: 4 }}>Payment Method</div>
                <select value={form.payment_method} onChange={set('payment_method')} style={inputStyle}>
                  {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              {/* Bank step-2: show for BANK regardless of savings routing */}
              {form.payment_method === 'BANK' && (
                <div style={{ marginLeft: 14, paddingLeft: 12, borderLeft: '2px solid var(--ok)', marginTop: 10, marginBottom: 4 }}>
                  <div style={{ font: 'var(--t-caption)', color: 'var(--ok)', marginBottom: 6, fontWeight: 600 }}>
                    Step 2 — Which bank account to deduct from?
                  </div>
                  {savingsOnly.length === 0 ? (
                    <div style={{ font: 'var(--t-caption)', color: 'var(--fg-muted)', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--bg-sunken)' }}>
                      No bank accounts set up yet. Add one on the Savings page first.
                    </div>
                  ) : (
                    <select
                      required
                      value={isSavings ? form.bank_account_id : form.savings_account_id}
                      onChange={isSavings ? set('bank_account_id') : set('savings_account_id')}
                      style={inputStyle}
                    >
                      <option value="">Select bank account…</option>
                      {savingsOnly.map((a) => (
                        <option key={a.id} value={a.id}>{a.name} · {fmt(a.balance_paisa)}</option>
                      ))}
                    </select>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Edit mode: show date field for editing */}
          {isEdit && (
            <label style={{ display: 'block', marginBottom: 12 }}>
              <div style={{ font: 'var(--t-label)', marginBottom: 4 }}>Date</div>
              <DatePicker value={form.date} onChange={(v) => set('date')({ target: { value: v } } as React.ChangeEvent<HTMLInputElement>)} />
            </label>
          )}

          {/* Description */}
          <label style={{ display: 'block', marginBottom: 12 }}>
            <div style={{ font: 'var(--t-label)', marginBottom: 4 }}>Description</div>
            <input
              type="text"
              required={!isTransfer && !isInvestmentMode}
              placeholder={isTransfer || isInvestmentMode ? 'Optional note' : ''}
              value={form.description}
              onChange={set('description')}
              style={inputStyle}
            />
          </label>

          {/* Transfer */}
          {isTransfer && (
            <div style={{ background: 'rgba(58,95,205,0.08)', borderLeft: '3px solid var(--accent)', borderRadius: 6, padding: '10px 14px', marginBottom: 12 }}>
              <div style={{ font: 'var(--t-caption)', color: 'var(--accent)', marginBottom: 10 }}>
                Moves money between your savings accounts. Both balances update instantly.
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

          {/* Savings routing — only for direct category selection, not fixed expenses (savings account auto-filled from template) */}
          {!isTransfer && isSavings && !isFixedExpenseMode && !isInvestmentMode && (
            <div style={{ background: 'rgba(58,95,205,0.08)', borderLeft: '3px solid var(--accent)', borderRadius: 6, padding: '10px 14px', marginBottom: 12 }}>
              <div style={{ font: 'var(--t-caption)', color: 'var(--accent)', marginBottom: 6 }}>
                This will {routingType === 'SAVINGS_DEPOSIT' ? 'deposit into' : 'withdraw from'} your savings account.
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
              <div style={{ font: 'var(--t-caption)', color: 'var(--accent)', marginBottom: 8 }}>This will update the loan ledger.</div>
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
                <DatePicker value={form.loan_return_due_date} onChange={(v) => set('loan_return_due_date')({ target: { value: v } } as React.ChangeEvent<HTMLInputElement>)} />
              </label>
            </div>
          )}

          {/* Tax routing */}
          {!isTransfer && isTax && (
            <div style={{ background: 'rgba(58,95,205,0.08)', borderLeft: '3px solid var(--accent)', borderRadius: 6, padding: '10px 14px', marginBottom: 12 }}>
              <div style={{ font: 'var(--t-caption)', color: 'var(--accent)' }}>
                This transaction will be recorded against the current Fiscal Year.
              </div>
            </div>
          )}

          {/* Amount — last */}
          <label style={{ display: 'block', marginBottom: 16 }}>
            <div style={{ font: 'var(--t-label)', marginBottom: 4 }}>Amount (৳)</div>
            <input
              type="number" step="0.01" min="0.01" required
              value={form.amount_paisa}
              onChange={set('amount_paisa')}
              placeholder="0.00"
              style={inputStyle}
            />
          </label>

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
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : isTransfer ? 'Transfer' : isInvestmentMode ? 'Save Investment' : 'Save Transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
