/**
 * TC-UI-100 (component layer) — StatusBadge variant styling used to render
 * loan balances: green for "Sohel owes you", red for "You owe X", neutral for Settled.
 */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { StatusBadge } from './StatusBadge';

describe('StatusBadge variants', () => {
  it('ok variant — applies ok class and ok background CSS variable', () => {
    const { container } = render(<StatusBadge variant="ok">Paid</StatusBadge>);
    const badge = container.querySelector('.status-badge--ok') as HTMLElement;
    expect(badge).toBeTruthy();
    expect(badge.style.background).toBe('var(--ok-bg)');
    expect(badge.style.color).toBe('var(--ok)');
  });

  it('warn variant — applies warn styling', () => {
    const { container } = render(<StatusBadge variant="warn">Due soon</StatusBadge>);
    const badge = container.querySelector('.status-badge--warn') as HTMLElement;
    expect(badge).toBeTruthy();
    expect(badge.style.background).toBe('var(--warn-bg)');
  });

  it('danger variant — applies danger styling (overdue loans, negative balances)', () => {
    const { container } = render(
      <StatusBadge variant="danger">You owe ৳3,145.42</StatusBadge>,
    );
    const badge = container.querySelector('.status-badge--danger') as HTMLElement;
    expect(badge).toBeTruthy();
    expect(badge.style.background).toBe('var(--danger-bg)');
    expect(badge.style.color).toBe('var(--danger)');
  });

  it('neutral variant — applies neutral styling (settled, pending)', () => {
    const { container } = render(<StatusBadge variant="neutral">Settled</StatusBadge>);
    const badge = container.querySelector('.status-badge--neutral') as HTMLElement;
    expect(badge).toBeTruthy();
    expect(badge.style.background).toBe('var(--neutral-bg)');
  });

  it('renders children text', () => {
    const { container } = render(
      <StatusBadge variant="ok">Mithun owes you ৳9,841.00</StatusBadge>,
    );
    expect(container.textContent).toBe('Mithun owes you ৳9,841.00');
  });

  it('accepts an extra className prop', () => {
    const { container } = render(
      <StatusBadge variant="ok" className="my-badge">OK</StatusBadge>,
    );
    const badge = container.firstChild as HTMLElement;
    expect(badge.classList.contains('my-badge')).toBe(true);
  });
});
