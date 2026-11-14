/**
 * TC-UI-020 — Dashboard SummaryTile renders AC-CASH-1 figures correctly.
 * TC-UI-021 — Negative Remaining to Spend gets the danger class (red colour signal).
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SummaryTile } from './SummaryTile';

describe('TC-UI-020 SummaryTile renders label and formatted amount', () => {
  it('renders the tile label', () => {
    render(<SummaryTile label="In-Hand Income" paisa={8_500_000} />);
    expect(screen.getByText('In-Hand Income')).toBeInTheDocument();
  });

  it('renders ৳85,000.00 for 8_500_000 Paisa (AC-CASH-1 in-hand income)', () => {
    const { container } = render(<SummaryTile label="In-Hand Income" paisa={8_500_000} />);
    expect(container.textContent).toContain('৳85,000.00');
  });

  it('renders the subtitle when provided', () => {
    render(<SummaryTile label="Total Spending" paisa={4_600_000} subtitle="4 transactions" />);
    expect(screen.getByText('4 transactions')).toBeInTheDocument();
  });

  it('renders valueOverride instead of Amount when supplied', () => {
    const { container } = render(
      <SummaryTile label="Savings Rate" paisa={0} valueOverride="23%" />,
    );
    expect(container.textContent).toContain('23%');
    // The Amount component should NOT render ৳0.00
    expect(container.textContent).not.toContain('৳0.00');
  });

  it('renders an up-arrow delta for a positive change', () => {
    const { container } = render(
      <SummaryTile label="Income" paisa={9_000_000} delta={{ paisa: 500_000, label: 'vs last month' }} />,
    );
    expect(container.textContent).toContain('↑');
    expect(container.textContent).toContain('vs last month');
  });

  it('renders a down-arrow delta for a negative change', () => {
    const { container } = render(
      <SummaryTile label="Income" paisa={9_000_000} delta={{ paisa: -500_000, label: 'vs last month' }} />,
    );
    expect(container.textContent).toContain('↓');
  });
});

describe('TC-UI-021 SummaryTile negative paisa → danger colour signal', () => {
  it('Amount inside tile gets amount--negative class when paisa < 0', () => {
    const { container } = render(
      <SummaryTile label="Remaining to Spend" paisa={-200_000} />,
    );
    // Amount adds `amount--negative` for negative values (drives the danger colour via CSS)
    const amountEl = container.querySelector('.amount--negative');
    expect(amountEl).toBeTruthy();
  });

  it('Amount does NOT get amount--negative class for positive paisa', () => {
    const { container } = render(
      <SummaryTile label="Remaining to Spend" paisa={200_000} />,
    );
    expect(container.querySelector('.amount--negative')).toBeNull();
  });
});
