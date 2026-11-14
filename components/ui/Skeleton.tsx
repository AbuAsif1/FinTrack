/**
 * Shared skeleton loading components.
 * Uses the global `pulse` keyframe defined in globals.css.
 */

interface ColDef {
  /** flex grow, e.g. 1 or 2 */
  flex?: number;
  /** fixed pixel width — overrides flex */
  px?: number;
  /** bar height in px (default 12) */
  h?: number;
  /** text alignment hint — aligns the bar within its cell */
  align?: 'left' | 'right' | 'center';
}

function Bar({ flex = 1, px, h = 12, align }: ColDef) {
  const widths = [0.55, 0.78, 0.5, 0.68, 0.84, 0.46, 0.62, 0.72];
  const idx = (px ?? Math.round(flex * 10)) % widths.length;
  const barW = `${widths[idx] * 100}%`;

  return (
    <div
      style={{
        flex: px ? `0 0 ${px}px` : flex,
        display: 'flex',
        justifyContent: align === 'right' ? 'flex-end' : align === 'center' ? 'center' : 'flex-start',
        minWidth: 0,
      }}
    >
      <div
        style={{
          width: barW,
          height: h,
          borderRadius: 4,
          background: 'var(--bg-raised)',
        }}
      />
    </div>
  );
}

/** One skeleton row — matches the standard table data-row height and padding. */
export function SkeletonRow({
  cols,
  delay = 0,
}: {
  cols: ColDef[];
  delay?: number;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '12px 16px',
        borderBottom: '1px solid var(--border)',
        animation: `pulse 1.4s ease ${delay.toFixed(2)}s infinite`,
      }}
    >
      {cols.map((col, i) => (
        <Bar key={i} {...col} />
      ))}
    </div>
  );
}

/**
 * Ready-made skeleton that sits inside the standard table card wrapper.
 * Drop this in wherever you currently have a "Loading…" div inside a table card.
 */
export function SkeletonTableRows({
  rows = 6,
  cols,
}: {
  rows?: number;
  cols: ColDef[];
}) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRow key={i} cols={cols} delay={i * 0.07} />
      ))}
    </>
  );
}

/**
 * Card-shaped skeleton — for savings account cards, budget cards, etc.
 * Renders two placeholder bars inside a surface card.
 */
export function SkeletonCard({ height = 88 }: { height?: number }) {
  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        height,
        animation: 'pulse 1.4s ease infinite',
      }}
    >
      <div style={{ width: '45%', height: 11, borderRadius: 4, background: 'var(--bg-raised)' }} />
      <div style={{ width: '70%', height: 16, borderRadius: 4, background: 'var(--bg-raised)' }} />
    </div>
  );
}

/** Pre-defined column layouts matching each page's table grid. */
export const SK = {
  /** Transactions: checkbox + 5 data cols + action */
  transactions: [
    { px: 24 }, { flex: 2 }, { flex: 1 }, { flex: 2 }, { flex: 3 }, { flex: 2, align: 'right' as const }, { px: 44 },
  ],
  /** Loans entry table */
  loans: [
    { flex: 1 }, { flex: 1 }, { flex: 1 }, { flex: 2 }, { flex: 1, align: 'right' as const }, { px: 44 },
  ],
  /** Income monthly summary */
  income: [
    { flex: 1 }, { flex: 1, align: 'right' as const }, { flex: 1, align: 'right' as const }, { flex: 2, align: 'right' as const }, { flex: 1, align: 'right' as const }, { px: 100 },
  ],
  /** Tax investment rows */
  taxInvestments: [
    { flex: 2 }, { flex: 1, align: 'right' as const }, { flex: 1, align: 'right' as const }, { flex: 1, align: 'right' as const },
  ],
  /** History / generic 4-col */
  history: [
    { flex: 1 }, { flex: 1 }, { flex: 2 }, { flex: 1, align: 'right' as const },
  ],
};
