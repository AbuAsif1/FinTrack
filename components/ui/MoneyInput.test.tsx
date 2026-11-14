import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import { MoneyInput } from './MoneyInput';

describe('TC-UI-001 MoneyInput parses valid inputs to Paisa', () => {
  it('turns "50000" into 5000000 Paisa', async () => {
    const onChange = vi.fn();
    render(<MoneyInput value={null} onChange={onChange} id="amt" />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '50000' } });
    expect(onChange).toHaveBeenCalledWith(5000000);
  });

  it('turns "1198.50" into 119850 Paisa', async () => {
    const onChange = vi.fn();
    render(<MoneyInput value={null} onChange={onChange} id="amt2" />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '1198.50' } });
    expect(onChange).toHaveBeenCalledWith(119850);
  });
});

describe('TC-UI-002 MoneyInput rejects three decimal places', () => {
  it('shows an error and calls onChange(null) for "12.345"', () => {
    const onChange = vi.fn();
    render(<MoneyInput value={null} onChange={onChange} id="amt3" />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '12.345' } });
    expect(onChange).toHaveBeenCalledWith(null);
    // Error message should appear
    expect(screen.getByRole('alert')).toBeTruthy();
  });
});
