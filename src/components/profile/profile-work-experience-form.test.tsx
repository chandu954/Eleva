// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { WorkExperience } from '@/lib/types';

import { ProfileWorkExperienceForm } from './profile-work-experience-form';

const experiences = [
  {
    company: 'Acme',
    position: 'Staff Engineer',
    location: 'Remote',
    date: 'Jan 2023 - Present',
    description: ['Led the platform team', 'Shipped the billing migration'],
    technologies: ['TypeScript', 'Postgres'],
  },
] as WorkExperience[];

function removeButtons() {
  return screen
    .getAllByRole('button')
    .filter((button) => button.querySelector('svg.lucide-trash2'));
}

describe('ProfileWorkExperienceForm', () => {
  it('renders an empty state and adds a blank experience', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(
      <ProfileWorkExperienceForm experiences={[]} onChange={onChange} />,
    );

    expect(screen.queryByPlaceholderText('Position Title')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Add Work Experience/i }));
    expect(onChange).toHaveBeenCalledWith([
      {
        company: '',
        position: '',
        location: '',
        date: '',
        description: [],
        technologies: [],
      },
    ]);

    rerender(<ProfileWorkExperienceForm experiences={experiences} onChange={onChange} />);
    expect(screen.getByText('Staff Engineer at Acme')).toBeInTheDocument();
    expect(screen.getByText('Jan 2023 - Present')).toBeInTheDocument();
    expect(screen.getByText('TypeScript, Postgres')).toBeInTheDocument();
  });

  it('updates position, company, date and location', () => {
    const onChange = vi.fn();
    render(<ProfileWorkExperienceForm experiences={experiences} onChange={onChange} />);

    fireEvent.change(screen.getByPlaceholderText('Position Title'), {
      target: { value: 'Principal Engineer' },
    });
    expect(onChange).toHaveBeenLastCalledWith([
      { ...experiences[0], position: 'Principal Engineer' },
    ]);

    fireEvent.change(screen.getByPlaceholderText('Company Name'), {
      target: { value: 'Globex' },
    });
    expect(onChange).toHaveBeenLastCalledWith([{ ...experiences[0], company: 'Globex' }]);

    fireEvent.change(screen.getByPlaceholderText(/Jan 2023/), {
      target: { value: '2021 - 2023' },
    });
    expect(onChange).toHaveBeenLastCalledWith([{ ...experiences[0], date: '2021 - 2023' }]);

    fireEvent.change(screen.getByPlaceholderText(/Vancouver/), {
      target: { value: 'Vancouver, BC' },
    });
    expect(onChange).toHaveBeenLastCalledWith([
      { ...experiences[0], location: 'Vancouver, BC' },
    ]);
  });

  it('parses comma-separated technologies on change and blur', () => {
    const onChange = vi.fn();
    render(<ProfileWorkExperienceForm experiences={experiences} onChange={onChange} />);

    const tech = screen.getByPlaceholderText('React, TypeScript, Node.js, etc.');
    fireEvent.change(tech, { target: { value: 'Go, Kubernetes' } });

    expect(onChange).toHaveBeenLastCalledWith([
      { ...experiences[0], technologies: ['Go', 'Kubernetes'] },
    ]);

    fireEvent.change(tech, { target: { value: ' Go , Kubernetes ,AWS ' } });
    fireEvent.blur(tech);

    expect(onChange).toHaveBeenLastCalledWith([
      { ...experiences[0], technologies: ['Go', 'Kubernetes', 'AWS'] },
    ]);
    expect(tech).toHaveValue('Go, Kubernetes, AWS');
  });

  it('adds, edits and removes responsibility points', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<ProfileWorkExperienceForm experiences={experiences} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: /Add Point/i }));
    expect(onChange).toHaveBeenLastCalledWith([
      {
        ...experiences[0],
        description: [...experiences[0].description, ''],
      },
    ]);

    fireEvent.change(screen.getByDisplayValue('Led the platform team'), {
      target: { value: 'Led the infrastructure team' },
    });
    expect(onChange).toHaveBeenLastCalledWith([
      {
        ...experiences[0],
        description: ['Led the infrastructure team', 'Shipped the billing migration'],
      },
    ]);

    await user.click(removeButtons()[1]);
    expect(onChange).toHaveBeenLastCalledWith([
      { ...experiences[0], description: ['Shipped the billing migration'] },
    ]);
  });

  it('shows the empty responsibility hint and removes the experience', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <ProfileWorkExperienceForm
        experiences={[{ ...experiences[0], description: [] } as WorkExperience]}
        onChange={onChange}
      />,
    );

    expect(
      screen.getByText(/Add points to describe your responsibilities and achievements/),
    ).toBeInTheDocument();

    await user.click(removeButtons()[0]);

    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('re-derives technology inputs when the experience prop changes', () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <ProfileWorkExperienceForm experiences={experiences} onChange={onChange} />,
    );

    expect(screen.getByPlaceholderText('React, TypeScript, Node.js, etc.')).toHaveValue(
      'TypeScript, Postgres',
    );

    rerender(
      <ProfileWorkExperienceForm
        experiences={[{ ...experiences[0], technologies: ['Elixir'] } as WorkExperience]}
        onChange={onChange}
      />,
    );

    expect(screen.getByPlaceholderText('React, TypeScript, Node.js, etc.')).toHaveValue('Elixir');
  });
});
