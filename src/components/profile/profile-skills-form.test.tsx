// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Skill } from '@/lib/types';

import { ProfileSkillsForm } from './profile-skills-form';

const skills = [
  { category: 'Languages', items: ['TypeScript', 'Python'] },
  { category: 'Cloud', items: ['AWS'] },
] as Skill[];

function removeButtons() {
  return screen
    .getAllByRole('button')
    .filter((button) => button.querySelector('svg.lucide-trash2'));
}

describe('ProfileSkillsForm', () => {
  it('renders an empty state and adds a blank category', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(<ProfileSkillsForm skills={[]} onChange={onChange} />);

    expect(
      screen.queryByPlaceholderText('e.g., Programming Languages, Frameworks, Tools'),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Add Skill Category/i }));
    expect(onChange).toHaveBeenCalledWith([{ category: '', items: [] }]);

    rerender(<ProfileSkillsForm skills={skills} onChange={onChange} />);
    expect(screen.getByText('Languages')).toBeInTheDocument();
    expect(screen.getByText('TypeScript, Python')).toBeInTheDocument();
    expect(screen.getByText('Cloud')).toBeInTheDocument();
  });

  it('updates the category name', () => {
    const onChange = vi.fn();
    render(<ProfileSkillsForm skills={skills} onChange={onChange} />);

    const [category] = screen.getAllByPlaceholderText(
      'e.g., Programming Languages, Frameworks, Tools',
    );
    fireEvent.change(category, { target: { value: 'Programming Languages' } });

    expect(onChange).toHaveBeenLastCalledWith([
      { ...skills[0], category: 'Programming Languages' },
      skills[1],
    ]);
  });

  it('parses comma-separated items on change and normalizes on blur', () => {
    const onChange = vi.fn();
    render(<ProfileSkillsForm skills={skills} onChange={onChange} />);

    const [firstInput] = screen.getAllByPlaceholderText('e.g., TypeScript, React, Node.js, AWS');
    fireEvent.change(firstInput, { target: { value: 'Go, Rust' } });

    expect(onChange).toHaveBeenLastCalledWith([
      { ...skills[0], items: ['Go', 'Rust'] },
      skills[1],
    ]);

    fireEvent.change(firstInput, { target: { value: ' Go , Rust , WASM ' } });
    fireEvent.blur(firstInput);

    expect(onChange).toHaveBeenLastCalledWith([
      { ...skills[0], items: ['Go', 'Rust', 'WASM'] },
      skills[1],
    ]);
    expect(firstInput).toHaveValue('Go, Rust, WASM');
  });

  it('updates the second category independently', () => {
    const onChange = vi.fn();
    render(<ProfileSkillsForm skills={skills} onChange={onChange} />);

    const inputs = screen.getAllByPlaceholderText('e.g., TypeScript, React, Node.js, AWS');
    fireEvent.change(inputs[1], { target: { value: 'GCP' } });

    expect(onChange).toHaveBeenLastCalledWith([
      skills[0],
      { ...skills[1], items: ['GCP'] },
    ]);
  });

  it('removes a category', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<ProfileSkillsForm skills={skills} onChange={onChange} />);

    await user.click(removeButtons()[0]);

    expect(onChange).toHaveBeenCalledWith([skills[1]]);
  });

  it('re-derives item inputs when the skills prop changes', () => {
    const onChange = vi.fn();
    const { rerender } = render(<ProfileSkillsForm skills={skills} onChange={onChange} />);

    expect(
      screen.getAllByPlaceholderText('e.g., TypeScript, React, Node.js, AWS')[0],
    ).toHaveValue('TypeScript, Python');

    rerender(
      <ProfileSkillsForm
        skills={[{ category: 'Languages', items: ['OCaml'] } as Skill]}
        onChange={onChange}
      />,
    );

    expect(
      screen.getByPlaceholderText('e.g., TypeScript, React, Node.js, AWS'),
    ).toHaveValue('OCaml');
  });
});
