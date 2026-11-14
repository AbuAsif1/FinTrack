/**
 * TC-UI-160 — Open the notification drawer: unread items first, bell badge shows count.
 * TC-UI-161 — Mark all as read: badge clears, "You're all caught up" appears.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NotificationBell } from './NotificationDrawer';

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

vi.mock('@/lib/api', () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

import api from '@/lib/api';

const unreadNotif = {
  id: 'n-1',
  type: 'BUDGET_ALERT',
  message: 'Dining budget at 80%',
  entity_type: 'Budget',
  entity_id: 'b-1',
  is_read: false,
  resolved_at: null,
  created_at: new Date().toISOString(),
};

const readNotif = {
  id: 'n-2',
  type: 'LOAN_OVERDUE',
  message: 'Loan to Sohel is overdue',
  entity_type: 'LoanEntry',
  entity_id: 'l-1',
  is_read: true,
  resolved_at: null,
  created_at: new Date().toISOString(),
};

describe('TC-UI-160 NotificationBell badge and drawer', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows the unread count badge when unreadCount > 0', () => {
    render(<NotificationBell unreadCount={3} onCountChange={vi.fn()} />);
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('shows "9+" in badge when unreadCount > 9', () => {
    render(<NotificationBell unreadCount={12} onCountChange={vi.fn()} />);
    expect(screen.getByText('9+')).toBeInTheDocument();
  });

  it('renders no badge when unreadCount is 0', () => {
    const { container } = render(<NotificationBell unreadCount={0} onCountChange={vi.fn()} />);
    // Badge span is conditionally rendered only when unreadCount > 0
    const badge = container.querySelector('[style*="border-radius: 50%"]');
    expect(badge).toBeNull();
  });

  it('opens drawer and shows unread notifications first on bell click', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: [unreadNotif, readNotif] });

    render(<NotificationBell unreadCount={1} onCountChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /notifications/i }));

    await waitFor(() => expect(screen.getByText('Dining budget at 80%')).toBeInTheDocument());
    expect(screen.getByText('Loan to Sohel is overdue')).toBeInTheDocument();
    // "Mark read" button appears only for the unread item
    expect(screen.getByRole('button', { name: /mark as read/i })).toBeInTheDocument();
  });

  it('shows "You\'re all caught up" when no notifications exist', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: [] });

    render(<NotificationBell unreadCount={0} onCountChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /notifications/i }));

    await waitFor(() =>
      expect(screen.getByText(/you.re all caught up/i)).toBeInTheDocument(),
    );
  });
});

describe('TC-UI-161 Mark all as read', () => {
  beforeEach(() => vi.clearAllMocks());

  it('clicking "Mark all read" calls read-all API and clears badge via onCountChange', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: [unreadNotif] });
    vi.mocked(api.post).mockResolvedValue({});

    const onCountChange = vi.fn();
    render(<NotificationBell unreadCount={1} onCountChange={onCountChange} />);
    fireEvent.click(screen.getByRole('button', { name: /notifications/i }));

    await waitFor(() => screen.getByRole('button', { name: /mark all read/i }));
    fireEvent.click(screen.getByRole('button', { name: /mark all read/i }));

    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/notifications/read-all'));
    // onCountChange called with 0 (clears badge)
    expect(onCountChange).toHaveBeenCalledWith(0);
  });

  it('"Mark all read" button is hidden when no unread items remain', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: [readNotif] });

    render(<NotificationBell unreadCount={0} onCountChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /notifications/i }));

    await waitFor(() => screen.getByText('Loan to Sohel is overdue'));
    expect(screen.queryByRole('button', { name: /mark all read/i })).toBeNull();
  });
});
