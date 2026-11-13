'use client';

import { useState, useRef, useEffect } from 'react';

// ── Shared styles ─────────────────────────────────────────────────────────────

const DAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function today() {
  const d = new Date();
  return { y: d.getFullYear(), m: d.getMonth(), d: d.getDate() };
}

function parseDate(val: string): { y: number; m: number; d: number } | null {
  if (!val) return null;
  const parts = val.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return null;
  return { y: parts[0], m: parts[1] - 1, d: parts[2] };
}

function formatDisplay(val: string): string {
  const p = parseDate(val);
  if (!p) return '';
  return `${p.d} ${MONTHS_SHORT[p.m]} ${p.y}`;
}

function formatMonthDisplay(val: string): string {
  if (!val) return '';
  const [y, m] = val.split('-').map(Number);
  if (!y || !m) return '';
  return `${MONTHS_SHORT[m - 1]} ${y}`;
}

// ── Calendar popup ────────────────────────────────────────────────────────────

function CalendarPopup({
  value,
  onChange,
  onClose,
}: {
  value: string;
  onChange: (v: string) => void;
  onClose: () => void;
}) {
  const sel = parseDate(value);
  const t = today();
  const initY = sel?.y ?? t.y;
  const initM = sel?.m ?? t.m;

  const [viewY, setViewY] = useState(initY);
  const [viewM, setViewM] = useState(initM);

  function daysInMonth(y: number, m: number) {
    return new Date(y, m + 1, 0).getDate();
  }

  // ISO week: 0=Mon … 6=Sun
  function dayOfWeekISO(y: number, m: number, d: number) {
    const dow = new Date(y, m, d).getDay(); // 0=Sun
    return dow === 0 ? 6 : dow - 1;
  }

  const firstDow = dayOfWeekISO(viewY, viewM, 1);
  const dim = daysInMonth(viewY, viewM);
  const prevDim = daysInMonth(viewY, viewM === 0 ? 11 : viewM - 1);

  // Build grid: 42 cells
  const cells: { d: number; y: number; m: number; outside: boolean }[] = [];
  for (let i = 0; i < firstDow; i++) {
    const d = prevDim - firstDow + i + 1;
    const prevM = viewM === 0 ? 11 : viewM - 1;
    const prevY = viewM === 0 ? viewY - 1 : viewY;
    cells.push({ d, y: prevY, m: prevM, outside: true });
  }
  for (let d = 1; d <= dim; d++) cells.push({ d, y: viewY, m: viewM, outside: false });
  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) {
    const nextM = viewM === 11 ? 0 : viewM + 1;
    const nextY = viewM === 11 ? viewY + 1 : viewY;
    cells.push({ d, y: nextY, m: nextM, outside: true });
  }

  function prev() {
    if (viewM === 0) { setViewM(11); setViewY(viewY - 1); }
    else setViewM(viewM - 1);
  }
  function next() {
    if (viewM === 11) { setViewM(0); setViewY(viewY + 1); }
    else setViewM(viewM + 1);
  }
  function pick(c: typeof cells[0]) {
    const mm = String(c.m + 1).padStart(2, '0');
    const dd = String(c.d).padStart(2, '0');
    onChange(`${c.y}-${mm}-${dd}`);
    onClose();
  }

  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderRadius: 14,
      padding: '16px 14px 14px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
      userSelect: 'none',
      width: 290,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <button type="button" onClick={prev} style={navBtn}>{'‹'}</button>
        <span style={{ font: '600 15px var(--font-space-grotesk, system-ui)', color: 'var(--fg-primary)' }}>
          {MONTHS[viewM]}
          <span style={{ color: 'var(--accent)', marginLeft: 6 }}>{viewY}</span>
        </span>
        <button type="button" onClick={next} style={navBtn}>{'›'}</button>
      </div>

      {/* Day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 4 }}>
        {DAYS.map(d => (
          <div key={d} style={{ textAlign: 'center', font: '500 11px var(--font-space-grotesk, system-ui)', color: 'var(--fg-muted)', padding: '2px 0 6px' }}>{d}</div>
        ))}
      </div>

      {/* Date grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1 }}>
        {cells.map((c, i) => {
          const isSelected = !c.outside && sel && sel.y === c.y && sel.m === c.m && sel.d === c.d;
          const isToday = !c.outside && c.y === t.y && c.m === t.m && c.d === t.d;
          return (
            <button
              key={i}
              type="button"
              onClick={() => pick(c)}
              style={{
                width: '100%', aspectRatio: '1', borderRadius: '50%', border: 'none',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                font: `${isSelected || isToday ? 600 : 400} 13px var(--font-space-grotesk, system-ui)`,
                background: isSelected ? 'var(--accent)' : isToday ? 'rgba(37,99,235,0.12)' : 'transparent',
                color: isSelected ? '#fff' : c.outside ? 'var(--fg-muted)' : isToday ? 'var(--accent)' : 'var(--fg-primary)',
                opacity: c.outside ? 0.4 : 1,
                transition: 'background 0.1s',
              }}
            >
              {c.d}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── MonthPicker popup ─────────────────────────────────────────────────────────

function MonthPopup({
  value,
  onChange,
  onClose,
}: {
  value: string;
  onChange: (v: string) => void;
  onClose: () => void;
}) {
  const curYear = today().y;
  const curMIdx = today().m;
  const selParts = value ? value.split('-').map(Number) : null;
  const selY = selParts?.[0];
  const selMIdx = selParts ? selParts[1] - 1 : null;

  function pick(mIdx: number) {
    const mm = String(mIdx + 1).padStart(2, '0');
    onChange(`${curYear}-${mm}`);
    onClose();
  }

  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderRadius: 14,
      padding: '16px 14px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
      userSelect: 'none',
      width: 240,
    }}>
      {/* Fixed year header */}
      <div style={{ textAlign: 'center', font: '600 15px var(--font-space-grotesk, system-ui)', color: 'var(--fg-primary)', marginBottom: 14 }}>
        <span style={{ color: 'var(--accent)' }}>{curYear}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
        {MONTHS_SHORT.map((name, i) => {
          const isSelected = selY === curYear && selMIdx === i;
          const isCurrent = i === curMIdx;
          return (
            <button
              key={name}
              type="button"
              onClick={() => pick(i)}
              style={{
                padding: '9px 0', borderRadius: 8, border: 'none',
                cursor: 'pointer', textAlign: 'center',
                font: `${isSelected ? 700 : 400} 13px var(--font-space-grotesk, system-ui)`,
                background: isSelected ? 'var(--accent)' : isCurrent ? 'rgba(37,99,235,0.1)' : 'var(--bg-sunken)',
                color: isSelected ? '#fff' : isCurrent ? 'var(--accent)' : 'var(--fg-primary)',
                transition: 'background 0.1s',
              }}
            >
              {name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Nav button style ──────────────────────────────────────────────────────────

const navBtn: React.CSSProperties = {
  width: 30, height: 30, borderRadius: '50%', border: '1px solid var(--border)',
  background: 'var(--bg-sunken)', cursor: 'pointer', display: 'flex',
  alignItems: 'center', justifyContent: 'center',
  font: '600 18px system-ui', color: 'var(--fg-secondary)', lineHeight: 1,
};

// ── Wrapper component (trigger + dropdown) ────────────────────────────────────

interface PickerProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  style?: React.CSSProperties;
}

export function DatePicker({ value, onChange, placeholder = 'Select date', disabled, style }: PickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block', width: '100%', ...style }}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(o => !o)}
        style={{
          width: '100%', padding: '8px 12px', borderRadius: 6, textAlign: 'left',
          border: '1px solid var(--border)', background: disabled ? 'var(--bg-sunken)' : 'var(--bg-sunken)',
          color: value ? 'var(--fg-primary)' : 'var(--fg-muted)',
          font: 'var(--t-body)', cursor: disabled ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <span>{value ? formatDisplay(value) : placeholder}</span>
        <span style={{ color: 'var(--fg-muted)', fontSize: 14 }}>📅</span>
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 1000 }}>
          <CalendarPopup value={value} onChange={onChange} onClose={() => setOpen(false)} />
        </div>
      )}
    </div>
  );
}

export function MonthPicker({ value, onChange, placeholder = 'Select month', disabled, style }: PickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block', width: '100%', ...style }}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(o => !o)}
        style={{
          width: '100%', padding: '8px 12px', borderRadius: 6, textAlign: 'left',
          border: '1px solid var(--border)', background: 'var(--bg-sunken)',
          color: value ? 'var(--fg-primary)' : 'var(--fg-muted)',
          font: 'var(--t-body)', cursor: disabled ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <span>{value ? formatMonthDisplay(value) : placeholder}</span>
        <span style={{ color: 'var(--fg-muted)', fontSize: 14 }}>📅</span>
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 1000 }}>
          <MonthPopup value={value} onChange={onChange} onClose={() => setOpen(false)} />
        </div>
      )}
    </div>
  );
}
