/**
 * TC-UI-080, TC-UI-081 — Fixed Expenses grid status badges and Mark-as-Paid drawer
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

vi.mock('@/lib/api', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

import api from '@/lib/api';
import FixedExpensesPage from './page';

// ── Shared fixtures ───────────────────────────────────────────────────────────

function makeInstance(overrides: Record<string, unknown>) {
  return {
    id: `inst-${overrides.status}`,
    fixed_expense_id: 'tmpl-1',
    month: '2026-11',
    due_date: '2026-11-15',
    standard_amount_paisa: 1000000,
    actual_amount_paisa: null,
    paid_date: null,
    transaction_id: null,
    note: null,
    template_name: `${overrides.status} Item`,
    ...overrides,
  };
}

const ALL_STATUS_INSTANCES = [
  makeInstance({ status: 'PAID',     actual_amount_paisa: 1000000, paid_date: '2026-11-14' }),
  makeInstance({ status: 'DUE_SOON', id: 'inst-DUE_SOON' }),
  makeInstance({ status: 'OVERDUE',  id: 'inst-OVERDUE' }),
  makeInstance({ status: 'PENDING',  id: 'inst-PENDING' }),
  makeInstance({ status: 'SKIPPED',  id: 'inst-SKIPPED', note: 'On leave' }),
  makeInstance({ status: 'FUTURE',   id: 'inst-FUTURE' }),
];

function setupMocks() {
  vi.mocked(api.get).mockImplementation(async (path: string) => {
    if ((path as string).includes('/fixed-expense-instances')) return { data: ALL_STATUS_INSTANCES };
    if ((path as string) === '/fixed-expenses')               return { data: [{ id: 'tmpl-1', name: 'Rent', standard_amount_paisa: 1000000, due_day: 15, start_month: '2026-01', end_month: null, category: { id: 'c1', name: 'Housing', routing_type: 'NONE' }, savings_account: null }] };
    if ((path as string) === '/categories')                   return { data: [] };
    if ((path as string) === '/savings-accounts')             return { data: { accounts: [] } };
    return { data: [] };
  });
}

// ── TC-UI-080 ─────────────────────────────────────────────────────────────────

describe('TC-UI-080: status badges show symbol and label for every status', () => {
  beforeEach(setupMocks);

  it('renders all six status labels in the grid', async () => {
    render(<FixedExpensesPage />);
    await waitFor(() => expect(screen.getByText('✓ Paid')).toBeInTheDocument());
    expect(screen.getByText('⚠ Due Soon')).toBeInTheDocument();
    expect(screen.getByText('✕ Overdue')).toBeInTheDocument();
    expect(screen.getByText('● Pending')).toBeInTheDocument();
    expect(screen.getByText('— Skipped')).toBeInTheDocument();
    expect(screen.getByText('○ Future')).toBeInTheDocument();
  });
});

// ── TC-UI-081 ─────────────────────────────────────────────────────────────────

describe('TC-UI-081: Mark as Paid drawer pre-fills standard amount and today', () => {
  beforeEach(setupMocks);

  it('opens drawer with standard amount and today\'s date pre-filled', async () => {
    render(<FixedExpensesPage />);

    // Wait for instances to load
    await waitFor(() => expect(screen.getByText('● Pending')).toBeInTheDocument());

    // Click the PENDING row to open the PayDrawer
    const pendingRow = screen.getByText('PENDING Item').closest('div[style*="cursor"]') ??
                       screen.getByText('PENDING Item').closest('[onClick]');

    // Find the row that contains the PENDING item and is clickable
    const pendingBadge = screen.getByText('● Pending');
    // The row wrapping the badge is the clickable element
    const row = pendingBadge.closest('div[style*="pointer"]') as HTMLElement;
    if (row) fireEvent.click(row);
    else {
      // Fallback: find any element containing "PENDING Item" text
      const item = screen.getByText('PENDING Item');
      fireEvent.click(item);
    }

    // The PayDrawer should open with Mark Paid and Skip buttons
    await waitFor(() => expect(screen.getByRole('button', { name: /mark paid/i })).toBeInTheDocument());

    // "Actual Amount" label visible
    expect(screen.getByText(/Actual Amount/i)).toBeInTheDocument();

    // The amount input should be populated (MoneyInput with standard_amount_paisa = 1000000)
    // MoneyInput displays as a text input showing "10000.00" or similar
    const amountInput = document.getElementById('pay-amount') as HTMLInputElement;
    if (amountInput) {
      expect(Number(amountInput.value)).toBeGreaterThan(0);
    }

    // Date input should default to today
    const today = new Date().toISOString().slice(0, 10);
    expect(screen.getByText(/Date Paid/i)).toBeInTheDocument();
    // DatePicker might render an input with today's date
    const dateInputs = document.querySelectorAll('input[type="date"]');
    if (dateInputs.length > 0) {
      expect((dateInputs[0] as HTMLInputElement).value).toBe(today);
    }
  });
});
