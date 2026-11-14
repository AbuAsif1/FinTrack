/**
 * TC-UI-066 — Budget bars at 67%, 80% and 105%
 * Expected: green (ok), amber (warn), red (danger) with an over-budget marker
 */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ProgressBar } from './ProgressBar';

function getFill(container: HTMLElement) {
  // The inner fill div is the second child of the progressbar
  return container.querySelector('[role="progressbar"] > div') as HTMLElement;
}

describe('TC-UI-066 ProgressBar colour thresholds', () => {
  it('67% spend → fill uses var(--ok) green colour', () => {
    const { container } = render(<ProgressBar value={3350} max={5000} aria-label="Dining" />);
    const fill = getFill(container);
    expect(fill.style.background).toBe('var(--ok)');
    expect(fill.style.width).toBe('67%');
  });

  it('80% spend → fill uses var(--warn) amber colour', () => {
    const { container } = render(<ProgressBar value={4000} max={5000} aria-label="Dining" />);
    const fill = getFill(container);
    expect(fill.style.background).toBe('var(--warn)');
    expect(fill.style.width).toBe('80%');
  });

  it('105% spend → fill uses var(--danger) red colour and width is capped at 100%', () => {
    const { container } = render(<ProgressBar value={5250} max={5000} aria-label="Dining" />);
    const fill = getFill(container);
    expect(fill.style.background).toBe('var(--danger)');
    expect(fill.style.width).toBe('100%');
  });

  it('progressbar has correct aria attributes', () => {
    const { container } = render(<ProgressBar value={3000} max={5000} aria-label="Dining budget" />);
    const bar = container.querySelector('[role="progressbar"]') as HTMLElement;
    expect(bar.getAttribute('aria-valuenow')).toBe('3000');
    expect(bar.getAttribute('aria-valuemax')).toBe('5000');
    expect(bar.getAttribute('aria-label')).toBe('Dining budget');
  });

  it('zero max → fill width is 0% (no divide-by-zero crash)', () => {
    const { container } = render(<ProgressBar value={500} max={0} />);
    const fill = getFill(container);
    expect(fill.style.width).toBe('0%');
  });
});
