/**
 * TC-UI-023 — Due-soon (amber) and overdue (red) fixed expense banners,
 * each with a "Mark Paid" action.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AlertBanner } from './AlertBanner';

describe('TC-UI-023 AlertBanner variants', () => {
  it('warn variant — amber styling and role="alert"', () => {
    const { container } = render(
      <AlertBanner variant="warn">Mess Rent is due soon (15 Nov)</AlertBanner>,
    );
    const el = container.querySelector('[role="alert"]') as HTMLElement;
    expect(el).toBeTruthy();
    expect(el.classList.contains('alert-banner--warn')).toBe(true);
    // jsdom does not expand shorthand borderLeft — check the full shorthand value
    expect(el.style.borderLeft).toContain('var(--warn)');
    expect(el.style.background).toBe('var(--warn-bg)');
    expect(screen.getByText(/mess rent is due soon/i)).toBeInTheDocument();
  });

  it('danger variant — red styling and role="alert"', () => {
    const { container } = render(
      <AlertBanner variant="danger">City Bank DPS is overdue</AlertBanner>,
    );
    const el = container.querySelector('[role="alert"]') as HTMLElement;
    expect(el.classList.contains('alert-banner--danger')).toBe(true);
    expect(el.style.borderLeft).toContain('var(--danger)');
    expect(el.style.background).toBe('var(--danger-bg)');
  });

  it('renders an action button passed as the action prop', () => {
    render(
      <AlertBanner
        variant="warn"
        action={<button>Mark Paid</button>}
      >
        Mess Rent due in 2 days
      </AlertBanner>,
    );
    expect(screen.getByRole('button', { name: /mark paid/i })).toBeInTheDocument();
  });

  it('renders without action when action prop is omitted', () => {
    const { container } = render(
      <AlertBanner variant="danger">Overdue item</AlertBanner>,
    );
    // No button should exist
    expect(container.querySelector('button')).toBeNull();
  });
});
