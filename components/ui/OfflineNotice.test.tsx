/**
 * TC-UI-067 — Go offline with the form open: a notice appears and Save is disabled.
 *
 * Tests the OfflineNotice component: renders when navigator.onLine is false,
 * hides when online, responds to window online/offline events.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { OfflineNotice } from './OfflineNotice';

describe('TC-UI-067 OfflineNotice visibility', () => {
  afterEach(() => {
    // Restore the real value
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true, writable: true });
  });

  it('renders nothing when the browser is online', () => {
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
    const { container } = render(<OfflineNotice />);
    // No alert element
    expect(container.querySelector('[role="alert"]')).toBeNull();
  });

  it('renders an alert when navigator.onLine is false', () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    render(<OfflineNotice />);
    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(alert.textContent).toMatch(/offline/i);
  });

  it('shows the banner when window fires "offline" event', () => {
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
    render(<OfflineNotice />);
    expect(screen.queryByRole('alert')).toBeNull();

    act(() => {
      Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
      window.dispatchEvent(new Event('offline'));
    });

    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('hides the banner when window fires "online" event after going offline', () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    render(<OfflineNotice />);
    expect(screen.getByRole('alert')).toBeInTheDocument();

    act(() => {
      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
      window.dispatchEvent(new Event('online'));
    });

    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('banner has aria-live="polite" for screen readers', () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    render(<OfflineNotice />);
    const alert = screen.getByRole('alert');
    expect(alert.getAttribute('aria-live')).toBe('polite');
  });
});
