/**
 * TC-UI-006 — Sidebar: all nav labels present, aria-label on nav.
 * TC-ADM-001 — Admin / Users entry hidden for USER role, shown for ADMIN.
 *
 * Nav links use icon glyphs (⌂, ↑, ⇄ …) before the label text, so we query
 * by text content rather than the composed accessible name.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Sidebar } from './Sidebar';

vi.mock('next/navigation', () => ({
  usePathname: vi.fn().mockReturnValue('/'),
}));

import { usePathname } from 'next/navigation';

vi.mock('next/link', () => ({
  default: function MockLink({ href, children }: { href: string; children: React.ReactNode }) {
    return <a href={href}>{children}</a>;
  },
}));

vi.mock('@/lib/api', () => ({
  default: { get: vi.fn() },
}));

import api from '@/lib/api';

function wrap(role: 'USER' | 'ADMIN' = 'USER') {
  vi.mocked(api.get).mockResolvedValue({ data: { id: 'u-1', role, name: 'Test' } });
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 0 } },
  });
  return render(
    <QueryClientProvider client={client}>
      <Sidebar />
    </QueryClientProvider>,
  );
}

describe('TC-UI-006 Sidebar nav structure', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(usePathname).mockReturnValue('/');
  });

  it('renders a nav with aria-label="Main navigation"', () => {
    wrap();
    expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeInTheDocument();
  });

  it('renders all primary nav labels as text', () => {
    wrap();
    const labels = [
      'Dashboard', 'Income', 'Transactions', 'Budgets',
      'Fixed Expenses', 'Bank & Savings', 'Loans', 'Tax Dashboard', 'History',
    ];
    for (const label of labels) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it('renders the Settings label', () => {
    wrap();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });
});

describe('TC-ADM-001 Admin nav entry visibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(usePathname).mockReturnValue('/');
  });

  it('Users label is NOT rendered for USER role', async () => {
    wrap('USER');
    await act(async () => {
      await new Promise((r) => setTimeout(r, 100));
    });
    // "Users" label should never appear for USER role
    expect(screen.queryByText('Users')).toBeNull();
  });

  it('Users label IS rendered for ADMIN role after query resolves', async () => {
    wrap('ADMIN');
    await waitFor(() => expect(screen.getByText('Users')).toBeInTheDocument(), {
      timeout: 3000,
    });
    // The link should point to /admin/users
    const link = screen.getByText('Users').closest('a');
    expect(link).toHaveAttribute('href', '/admin/users');
  });
});
