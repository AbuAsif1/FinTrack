/**
 * TC-UI-060, TC-UI-061, TC-UI-062 — TransactionModal routing fields and idempotency
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TransactionModal } from './TransactionModal';

vi.mock('@/lib/api', () => ({
  default: { post: vi.fn(), patch: vi.fn() },
}));

import api from '@/lib/api';

// ── Shared fixtures ───────────────────────────────────────────────────────────

const CATS = [
  { id: 'c-sav', name: 'Savings Deposit', colorHex: '#3B82F6', routing_type: 'SAVINGS_DEPOSIT' },
  { id: 'c-loan', name: 'Loan Given', colorHex: '#F59E0B', routing_type: 'LOAN_GIVEN' },
  { id: 'c-tax', name: 'Tax Payment', colorHex: '#8B5CF6', routing_type: 'TAX_PAYMENT' },
  { id: 'c-spend', name: 'Food', colorHex: '#10B981', routing_type: 'NONE' },
];

const ACCTS = [{ id: 'a-1', name: 'Dutch-Bangla', type: 'SAVINGS', balance_paisa: 100000 }];
const PERSONS = [{ id: 'p-1', name: 'Mithun' }];

const noop = vi.fn();

function txn(categoryId: string) {
  return {
    id: 'txn-1',
    amount_paisa: 100000,
    date: '2026-11-01',
    description: 'Test',
    category_id: categoryId,
    payment_method: 'CASH',
  };
}

function getSubmitForm() {
  return screen.getByRole('button', { name: /save changes/i }).closest('form')!;
}

// ── TC-UI-060 ─────────────────────────────────────────────────────────────────

describe('TC-UI-060: routing section appears for each category type', () => {
  it('savings category shows savings account picker', () => {
    render(
      <TransactionModal
        categories={CATS}
        savingsAccounts={ACCTS}
        loanPersons={PERSONS}
        editing={txn('c-sav')}
        onClose={noop}
        onSaved={noop}
      />,
    );
    expect(screen.getByText(/deposit into.*savings account/i)).toBeInTheDocument();
  });

  it('loan category shows loan ledger notice and person field', () => {
    render(
      <TransactionModal
        categories={CATS}
        savingsAccounts={ACCTS}
        loanPersons={PERSONS}
        editing={txn('c-loan')}
        onClose={noop}
        onSaved={noop}
      />,
    );
    expect(screen.getByText(/loan ledger/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Name')).toBeInTheDocument();
  });

  it('TAX_PAYMENT category shows current Fiscal Year notice', () => {
    render(
      <TransactionModal
        categories={CATS}
        savingsAccounts={ACCTS}
        loanPersons={PERSONS}
        editing={txn('c-tax')}
        onClose={noop}
        onSaved={noop}
      />,
    );
    expect(screen.getByText(/current Fiscal Year/i)).toBeInTheDocument();
  });

  it('spending category (NONE) shows no routing section', () => {
    render(
      <TransactionModal
        categories={CATS}
        savingsAccounts={ACCTS}
        loanPersons={PERSONS}
        editing={txn('c-spend')}
        onClose={noop}
        onSaved={noop}
      />,
    );
    expect(screen.queryByText(/deposit into.*savings account/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/loan ledger/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/current Fiscal Year/i)).not.toBeInTheDocument();
  });
});

// ── TC-UI-061 ─────────────────────────────────────────────────────────────────

describe('TC-UI-061: form retains idempotency_key on retry', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sends the same idempotency_key on the second submit after a network failure', async () => {
    const patchMock = vi.mocked(api.patch);
    patchMock
      .mockRejectedValueOnce({ response: { status: 500, data: { error: 'Network error' } } })
      .mockResolvedValueOnce({ data: {} });

    render(
      <TransactionModal
        categories={CATS}
        savingsAccounts={ACCTS}
        loanPersons={PERSONS}
        editing={txn('c-spend')}
        onClose={noop}
        onSaved={noop}
      />,
    );

    // First submit — network failure
    fireEvent.submit(getSubmitForm());
    // Wait for button to re-enable (setSaving(false) called after error)
    await waitFor(() => screen.getByRole('button', { name: /save changes/i }));

    // Second submit — should succeed
    fireEvent.submit(getSubmitForm());
    await waitFor(() => expect(patchMock).toHaveBeenCalledTimes(2));

    const key1 = (patchMock.mock.calls[0][1] as Record<string, unknown>).idempotency_key;
    const key2 = (patchMock.mock.calls[1][1] as Record<string, unknown>).idempotency_key;
    expect(typeof key1).toBe('string');
    expect(key1).toBe(key2);
  });
});

// ── TC-UI-062 ─────────────────────────────────────────────────────────────────

describe('TC-UI-062: 409 DUPLICATE response is treated as success', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls onSaved when the server answers DUPLICATE', async () => {
    const onSaved = vi.fn();
    vi.mocked(api.patch).mockRejectedValueOnce({ response: { status: 409, data: { code: 'DUPLICATE' } } });

    render(
      <TransactionModal
        categories={CATS}
        savingsAccounts={ACCTS}
        loanPersons={PERSONS}
        editing={txn('c-spend')}
        onClose={noop}
        onSaved={onSaved}
      />,
    );

    fireEvent.submit(getSubmitForm());
    await waitFor(() => expect(onSaved).toHaveBeenCalledOnce());
  });
});
