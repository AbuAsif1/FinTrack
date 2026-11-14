/**
 * TC-UI-066 — Budget bar states: green / amber / red
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

vi.mock('@/lib/api', () => ({
  default: { get: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

import api from '@/lib/api';
import BudgetsPage from './page';

const CATS = [
  { id: 'c-food', name: 'Food', colorHex: '#10B981', color_hex: '#10B981', routing_type: 'NONE' },
  { id: 'c-util', name: 'Utilities', colorHex: '#3B82F6', color_hex: '#3B82F6', routing_type: 'NONE' },
  { id: 'c-ent',  name: 'Entertainment', colorHex: '#F59E0B', color_hex: '#F59E0B', routing_type: 'NONE' },
];

const BUDGETS = [
  { category_id: 'c-food', category_name: 'Food',          monthly_limit_paisa: 1000000, spent_paisa: 670000, pct: 67,  state: 'ok'   as const },
  { category_id: 'c-util', category_name: 'Utilities',     monthly_limit_paisa: 500000,  spent_paisa: 400000, pct: 80,  state: 'warn' as const },
  { category_id: 'c-ent',  category_name: 'Entertainment', monthly_limit_paisa: 300000,  spent_paisa: 315000, pct: 105, state: 'over' as const },
];

describe('TC-UI-066: budget bar states', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockImplementation(async (path: string) => {
      if (path.startsWith('/budgets')) return { data: BUDGETS };
      if (path === '/categories')     return { data: CATS };
      return { data: [] };
    });
  });

  it('shows the percentage label for each budget', async () => {
    render(<BudgetsPage />);
    await waitFor(() => expect(screen.getByText('67%')).toBeInTheDocument());
    expect(screen.getByText('80%')).toBeInTheDocument();
    expect(screen.getByText('105%')).toBeInTheDocument();
  });

  it('shows "Over by" only for the over-budget item', async () => {
    render(<BudgetsPage />);
    await waitFor(() => expect(screen.getByText(/Over by/)).toBeInTheDocument());
    // 67% and 80% items have no "Over by" marker (summary section says lowercase "over by")
    const overMarkers = screen.getAllByText(/Over by/);
    expect(overMarkers).toHaveLength(1);
  });
});
