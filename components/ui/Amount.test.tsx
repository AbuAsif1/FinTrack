import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Amount } from './Amount';

describe('TC-UI-003 Amount component with AC-FMT-1 values', () => {
  it('renders ৳20,06,846.00 for 200684600 Paisa', () => {
    const { container } = render(<Amount paisa={200684600} />);
    expect(container.textContent).toBe('৳20,06,846.00');
  });

  it('renders −৳3,145.42 for −314542 Paisa (U+2212 minus)', () => {
    const { container } = render(<Amount paisa={-314542} />);
    expect(container.textContent).toContain('৳3,145.42');
    expect(container.textContent).toContain('−'); // U+2212 minus
  });

  it('renders ৳0.00 for 0 Paisa', () => {
    const { container } = render(<Amount paisa={0} />);
    expect(container.textContent).toBe('৳0.00');
  });

  it('applies tabular-nums and right-alignment', () => {
    const { container } = render(<Amount paisa={100000} />);
    const span = container.querySelector('span');
    expect(span?.style.fontVariantNumeric).toBe('tabular-nums');
    expect(span?.style.textAlign).toBe('right');
  });
});
