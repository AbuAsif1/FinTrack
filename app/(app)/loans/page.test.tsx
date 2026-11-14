/**
 * TC-UI-100, TC-UI-101, TC-UI-102 — Loans page balance labels, new person, Settle Up
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

vi.mock('@/lib/api', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

import api from '@/lib/api';
import LoansPage from './page';

// AC-LOAN-1 person data
const PERSONS = [
  { id: 'p-mithun', name: 'Mithun', running_balance_paisa: 984100  },   // +৳9,841.00 (they owe me)
  { id: 'p-sohel',  name: 'Sohel',  running_balance_paisa: -314542 },   // -৳3,145.42 (I owe them)
  { id: 'p-rafi',   name: 'Rafi',   running_balance_paisa: 0        },   // settled
];

const SUMMARY = {
  owed_to_me_paisa: 984100,
  i_owe_paisa: 314542,
  net_paisa: 669558,
};

function setupMocks(mithunEntries: unknown[] = []) {
  vi.mocked(api.get).mockImplementation(async (path: string) => {
    if (path === '/loans/summary')                            return { data: SUMMARY };
    if (path === '/loan-persons')                             return { data: PERSONS };
    if (path.includes('/loan-persons/p-mithun/entries'))      return { data: mithunEntries };
    if (path.includes('/loan-persons/p-sohel/entries'))       return { data: [] };
    if (path.includes('/loan-persons/p-rafi/entries'))        return { data: [] };
    return { data: [] };
  });
}

// ── TC-UI-100 ─────────────────────────────────────────────────────────────────

describe('TC-UI-100: Loans page AC-LOAN-1 — balance labels', () => {
  beforeEach(() => setupMocks());

  it('shows Mithun owes you ৳9,841.00 when Mithun is selected (auto-first)', async () => {
    render(<LoansPage />);
    // Mithun is auto-selected as the first person
    await waitFor(() =>
      expect(screen.getByText(/Mithun owes you/i)).toBeInTheDocument(),
    );
    // Amount appears in multiple elements (summary tile + balance badge)
    expect(screen.getAllByText(/9,841\.00/).length).toBeGreaterThan(0);
  });

  it('shows You owe Sohel after clicking on Sohel', async () => {
    render(<LoansPage />);
    await waitFor(() => expect(screen.getByText('Sohel')).toBeInTheDocument());

    // Click on Sohel's name in the person list
    fireEvent.click(screen.getByText('Sohel'));

    await waitFor(() =>
      expect(screen.getByText(/You owe Sohel/i)).toBeInTheDocument(),
    );
    // Amount appears in multiple elements (summary tile + balance badge)
    expect(screen.getAllByText(/3,145\.42/).length).toBeGreaterThan(0);
  });

  it('shows Settled for a zero-balance person', async () => {
    render(<LoansPage />);
    await waitFor(() => expect(screen.getByText('Rafi')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Rafi'));

    // Balance label renders as "+৳0.00 · Settled" in a single element — use regex
    await waitFor(() =>
      expect(screen.getByText(/Settled/)).toBeInTheDocument(),
    );
  });
});

// ── TC-UI-101 ─────────────────────────────────────────────────────────────────

describe('TC-UI-101: new person created when name not in list', () => {
  beforeEach(() => {
    setupMocks();
    vi.mocked(api.post).mockResolvedValueOnce({ data: { id: 'p-new', name: 'Karim' } });
    vi.mocked(api.post).mockResolvedValueOnce({ data: { id: 'entry-1' } });
  });

  it('calls POST /loan-persons when person name is not found', async () => {
    render(<LoansPage />);
    // Wait for page to load — Mithun appears in both list and detail panel
    await waitFor(() => expect(screen.getAllByText('Mithun').length).toBeGreaterThan(0));

    // Open the Add Loan Entry modal
    const addBtn = screen.getByRole('button', { name: /add entry/i });
    fireEvent.click(addBtn);

    await waitFor(() =>
      expect(screen.getByPlaceholderText(/name.*creates if new/i)).toBeInTheDocument(),
    );

    // Type a new person name
    fireEvent.change(screen.getByPlaceholderText(/name.*creates if new/i), {
      target: { value: 'Karim' },
    });

    // Fill required amount
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '500' } });

    // Submit
    const form = screen.getByRole('heading', { name: /add loan entry/i }).closest('form') ??
                 screen.getByPlaceholderText(/name.*creates if new/i).closest('form')!;
    fireEvent.submit(form);

    await waitFor(() =>
      expect(vi.mocked(api.post)).toHaveBeenCalledWith('/loan-persons', { name: 'Karim' }),
    );
  });
});

// ── TC-UI-102 ─────────────────────────────────────────────────────────────────

describe('TC-UI-102: Settle Up button visible when balance is non-zero', () => {
  beforeEach(() => setupMocks());

  it('shows Settle Up button for Mithun (non-zero balance)', async () => {
    render(<LoansPage />);
    await waitFor(() => expect(screen.getByText(/Mithun owes you/i)).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /settle up/i })).toBeInTheDocument();
  });

  it('no Settle Up button for Rafi (zero balance)', async () => {
    render(<LoansPage />);
    await waitFor(() => expect(screen.getByText('Rafi')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Rafi'));
    // Balance label renders as "+৳0.00 · Settled" in a single element — use regex
    await waitFor(() => expect(screen.getByText(/Settled/)).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: /settle up/i })).not.toBeInTheDocument();
  });
});
