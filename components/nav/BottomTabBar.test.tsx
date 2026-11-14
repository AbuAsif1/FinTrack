/**
 * TC-UI-006 (mobile) — BottomTabBar: Home, Transactions, Fixed tabs; Add FAB; More sheet.
 * design.md §8: bottom tab bar with Home, Transactions, Add (FAB), Fixed, More.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BottomTabBar } from './BottomTabBar';

vi.mock('next/navigation', () => ({
  usePathname: vi.fn().mockReturnValue('/'),
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

describe('TC-UI-006 BottomTabBar main tabs', () => {
  it('renders a nav with aria-label="Mobile navigation"', () => {
    render(<BottomTabBar />);
    expect(screen.getByRole('navigation', { name: 'Mobile navigation' })).toBeInTheDocument();
  });

  it('renders Home tab link', () => {
    render(<BottomTabBar />);
    expect(screen.getByRole('link', { name: /home/i })).toHaveAttribute('href', '/');
  });

  it('renders Transactions tab link', () => {
    render(<BottomTabBar />);
    expect(screen.getByRole('link', { name: /transactions/i })).toHaveAttribute('href', '/transactions');
  });

  it('renders Fixed Expenses tab link', () => {
    render(<BottomTabBar />);
    expect(screen.getByRole('link', { name: /fixed/i })).toHaveAttribute('href', '/fixed-expenses');
  });

  it('renders an Add FAB button', () => {
    render(<BottomTabBar />);
    expect(screen.getByRole('button', { name: /add/i })).toBeInTheDocument();
  });

  it('renders a More button', () => {
    render(<BottomTabBar />);
    expect(screen.getByRole('button', { name: /more/i })).toBeInTheDocument();
  });
});

describe('TC-UI-006 BottomTabBar More sheet', () => {
  it('More sheet is closed by default', () => {
    render(<BottomTabBar />);
    expect(screen.queryByRole('dialog', { name: /more navigation/i })).toBeNull();
  });

  it('clicking More opens the sheet with extra nav items', () => {
    render(<BottomTabBar />);
    fireEvent.click(screen.getByRole('button', { name: /more/i }));

    const sheet = screen.getByRole('dialog', { name: /more navigation/i });
    expect(sheet).toBeInTheDocument();
    // Extra sections exposed in the More sheet
    expect(screen.getByRole('link', { name: /income/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /bank.*wallet/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /loans/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^\W*tax$/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /history/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /settings/i })).toBeInTheDocument();
  });

  it('clicking the backdrop closes the More sheet', () => {
    render(<BottomTabBar />);
    fireEvent.click(screen.getByRole('button', { name: /more/i }));
    const sheet = screen.getByRole('dialog', { name: /more navigation/i });
    // Click the backdrop (the dialog element itself, not its inner content)
    fireEvent.click(sheet);
    expect(screen.queryByRole('dialog', { name: /more navigation/i })).toBeNull();
  });
});
