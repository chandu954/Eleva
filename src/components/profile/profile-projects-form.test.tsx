// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Project } from '@/lib/types';

import { ProfileProjectsForm } from './profile-projects-form';

const projects = [
  {
    name: 'Eleva',
    description: ['Built an AI resume editor', 'Cut render time by 40%'],
    technologies: ['Next.js', 'TypeScript'],
    url: 'https://eleva.app',
    github_url: 'https://github.com/ada/eleva',
    date: '2024 - Present',
  },
] as Project[];

function removeButtons() {
  return screen
    .getAllByRole('button')
    .filter((button) => button.querySelector('svg.lucide-trash2'));
}

describe('ProfileProjectsForm', () => {
  it('renders an empty state and adds a blank project', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(<ProfileProjectsForm projects={[]} onChange={onChange} />);

    expect(screen.queryByPlaceholderText('Project Name')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Add Project/i }));
    expect(onChange).toHaveBeenCalledWith([
      {
        name: '',
        description: [],
        technologies: [],
        url: '',
        github_url: '',
        date: '',
      },
    ]);

    rerender(<ProfileProjectsForm projects={projects} onChange={onChange} />);
    expect(screen.getByText('Eleva')).toBeInTheDocument();
    expect(screen.getByText('2024 - Present')).toBeInTheDocument();
    expect(screen.getByText('Next.js, TypeScript')).toBeInTheDocument();
  });

  it('updates the project name, URLs and date', () => {
    const onChange = vi.fn();
    render(<ProfileProjectsForm projects={projects} onChange={onChange} />);

    fireEvent.change(screen.getByPlaceholderText('Project Name'), {
      target: { value: 'Eleva Cloud' },
    });
    expect(onChange).toHaveBeenLastCalledWith([{ ...projects[0], name: 'Eleva Cloud' }]);

    fireEvent.change(screen.getByPlaceholderText('https://your-project.com'), {
      target: { value: 'https://cloud.eleva.app' },
    });
    expect(onChange).toHaveBeenLastCalledWith([
      { ...projects[0], url: 'https://cloud.eleva.app' },
    ]);

    fireEvent.change(screen.getByPlaceholderText('https://github.com/username/project'), {
      target: { value: 'https://github.com/ada/cloud' },
    });
    expect(onChange).toHaveBeenLastCalledWith([
      { ...projects[0], github_url: 'https://github.com/ada/cloud' },
    ]);

    fireEvent.change(screen.getByPlaceholderText(/Jan 2023/), {
      target: { value: '2025' },
    });
    expect(onChange).toHaveBeenLastCalledWith([{ ...projects[0], date: '2025' }]);
  });

  it('parses comma-separated technologies on change and normalizes on blur', () => {
    const onChange = vi.fn();
    render(<ProfileProjectsForm projects={projects} onChange={onChange} />);

    const tech = screen.getByPlaceholderText('React, TypeScript, Node.js, etc.');
    fireEvent.change(tech, { target: { value: 'React, Node.js' } });

    expect(onChange).toHaveBeenLastCalledWith([
      { ...projects[0], technologies: ['React', 'Node.js'] },
    ]);

    fireEvent.change(tech, { target: { value: 'React,Node.js,  AWS ' } });
    fireEvent.blur(tech);

    expect(onChange).toHaveBeenLastCalledWith([
      { ...projects[0], technologies: ['React', 'Node.js', 'AWS'] },
    ]);
    expect(tech).toHaveValue('React, Node.js, AWS');
  });

  it('adds, edits and removes description points', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<ProfileProjectsForm projects={projects} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: /Add Point/i }));
    expect(onChange).toHaveBeenLastCalledWith([
      {
        ...projects[0],
        description: [...projects[0].description, ''],
      },
    ]);

    fireEvent.change(screen.getByDisplayValue('Built an AI resume editor'), {
      target: { value: 'Built a resume editor' },
    });
    expect(onChange).toHaveBeenLastCalledWith([
      {
        ...projects[0],
        description: ['Built a resume editor', 'Cut render time by 40%'],
      },
    ]);

    // Two description rows plus the project delete button.
    await user.click(removeButtons()[1]);
    expect(onChange).toHaveBeenLastCalledWith([
      {
        ...projects[0],
        description: ['Cut render time by 40%'],
      },
    ]);
  });

  it('shows the empty description hint and removes the project', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <ProfileProjectsForm
        projects={[{ ...projects[0], description: [] } as Project]}
        onChange={onChange}
      />,
    );

    expect(
      screen.getByText(/Add points to describe your project's features and achievements/),
    ).toBeInTheDocument();

    await user.click(removeButtons()[0]);

    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('re-derives technology inputs when the projects prop changes', () => {
    const onChange = vi.fn();
    const { rerender } = render(<ProfileProjectsForm projects={projects} onChange={onChange} />);

    const tech = screen.getByPlaceholderText('React, TypeScript, Node.js, etc.');
    expect(tech).toHaveValue('Next.js, TypeScript');

    rerender(
      <ProfileProjectsForm
        projects={[{ ...projects[0], technologies: ['Go', 'Rust'] } as Project]}
        onChange={onChange}
      />,
    );

    expect(screen.getByPlaceholderText('React, TypeScript, Node.js, etc.')).toHaveValue('Go, Rust');
  });
});
