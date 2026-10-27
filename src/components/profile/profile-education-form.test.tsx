// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Education } from '@/lib/types';

import { ProfileEducationForm } from './profile-education-form';

const education = [
  {
    school: 'MIT',
    degree: 'BSc',
    field: 'Computer Science',
    location: 'Cambridge, MA',
    date: '2018 - 2022',
    gpa: '3.9',
    achievements: ["Dean's List", 'Hackathon winner'],
  },
] as Education[];

function findRemoveButton() {
  return screen
    .getAllByRole('button')
    .find((button) => button.querySelector('svg.lucide-trash2'));
}

describe('ProfileEducationForm', () => {
  it('renders an empty list with the add control', () => {
    render(<ProfileEducationForm education={[]} onChange={vi.fn()} />);

    expect(screen.getByRole('button', { name: /Add Education/i })).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Institution Name')).not.toBeInTheDocument();
  });

  it('appends a blank education entry', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<ProfileEducationForm education={education} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: /Add Education/i }));

    expect(onChange).toHaveBeenCalledWith([
      ...education,
      {
        school: '',
        degree: '',
        field: '',
        location: '',
        date: '',
        gpa: undefined,
        achievements: [],
      },
    ]);
  });

  it('summarizes existing entries and shows date and GPA', () => {
    render(<ProfileEducationForm education={education} onChange={vi.fn()} />);

    expect(screen.getByText('BSc in Computer Science at MIT')).toBeInTheDocument();
    expect(screen.getByText('2018 - 2022')).toBeInTheDocument();
    expect(screen.getByText('GPA: 3.9')).toBeInTheDocument();
    expect(screen.getByDisplayValue('MIT')).toBeInTheDocument();
  });

  it('updates the school and location fields', () => {
    const onChange = vi.fn();
    render(<ProfileEducationForm education={education} onChange={onChange} />);

    // Inputs are statically controlled by the parent prop, so emit complete
    // values rather than keystrokes that would append to the stale prop.
    fireEvent.change(screen.getByPlaceholderText('Institution Name'), {
      target: { value: 'Stanford' },
    });

    expect(onChange).toHaveBeenLastCalledWith([{ ...education[0], school: 'Stanford' }]);

    fireEvent.change(screen.getByPlaceholderText('City, Country'), {
      target: { value: 'Stanford, CA' },
    });

    expect(onChange).toHaveBeenLastCalledWith([{ ...education[0], location: 'Stanford, CA' }]);
  });

  it('updates degree, field, date and GPA', () => {
    const onChange = vi.fn();
    render(<ProfileEducationForm education={education} onChange={onChange} />);

    fireEvent.change(screen.getByPlaceholderText("Bachelor's, Master's, etc."), {
      target: { value: 'MSc' },
    });
    expect(onChange).toHaveBeenLastCalledWith([{ ...education[0], degree: 'MSc' }]);

    fireEvent.change(screen.getByPlaceholderText('Field of Study'), {
      target: { value: 'AI' },
    });
    expect(onChange).toHaveBeenLastCalledWith([{ ...education[0], field: 'AI' }]);

    fireEvent.change(screen.getByPlaceholderText(/2019 - 2023/), {
      target: { value: '2022 - 2024' },
    });
    expect(onChange).toHaveBeenLastCalledWith([{ ...education[0], date: '2022 - 2024' }]);

    fireEvent.change(screen.getByPlaceholderText('0.00'), {
      target: { value: '4.0' },
    });
    expect(onChange).toHaveBeenLastCalledWith([{ ...education[0], gpa: '4.0' }]);
  });

  it('clears GPA to undefined and splits achievements by line', () => {
    const onChange = vi.fn();
    render(<ProfileEducationForm education={education} onChange={onChange} />);

    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '' } });
    expect(onChange).toHaveBeenLastCalledWith([{ ...education[0], gpa: undefined }]);

    fireEvent.change(screen.getByPlaceholderText(/Dean's List/), {
      target: { value: 'Prize\nClub' },
    });
    expect(onChange).toHaveBeenLastCalledWith([
      { ...education[0], achievements: ['Prize', 'Club'] },
    ]);
  });

  it('removes an entry', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<ProfileEducationForm education={education} onChange={onChange} />);

    const removeButton = findRemoveButton();
    expect(removeButton).toBeDefined();

    await user.click(removeButton!);

    expect(onChange).toHaveBeenCalledWith([]);
  });
});
