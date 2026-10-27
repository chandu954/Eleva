import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { NumberInput } from './document-number-input';

describe('NumberInput', () => {
  it('renders the value rounded to at most two decimal places', () => {
    render(
      <NumberInput value={10.333} min={0} max={20} step={1} onChange={() => undefined} />,
    );

    expect(screen.getByText('10.33')).toBeInTheDocument();
  });

  it('increments by the step and rounds to two decimal places', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<NumberInput value={10.1} min={0} max={20} step={0.2} onChange={onChange} />);

    await user.click(screen.getAllByRole('button')[0]);

    expect(onChange).toHaveBeenCalledWith(10.3);
  });

  it('decrements by the step and rounds to two decimal places', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<NumberInput value={10} min={8} max={12} step={0.5} onChange={onChange} />);

    await user.click(screen.getAllByRole('button')[1]);

    expect(onChange).toHaveBeenCalledWith(9.5);
  });

  it('clamps the incremented value at the maximum', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<NumberInput value={12} min={8} max={12} step={0.5} onChange={onChange} />);

    await user.click(screen.getAllByRole('button')[0]);

    expect(onChange).toHaveBeenCalledWith(12);
  });

  it('clamps the decremented value at the minimum', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<NumberInput value={8} min={8} max={12} step={0.5} onChange={onChange} />);

    await user.click(screen.getAllByRole('button')[1]);

    expect(onChange).toHaveBeenCalledWith(8);
  });
});
