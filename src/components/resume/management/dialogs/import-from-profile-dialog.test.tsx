import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Profile } from '@/lib/types';
import { ImportFromProfileDialog } from './import-from-profile-dialog';

const profile = {
  work_experience: [{ company: 'Analytical Engines', position: 'Engineer', date: '1842', description: ['Built a compiler'] }],
  projects: [{ name: 'Analytical Engine', description: ['Designed it'], technologies: ['TypeScript'], date: '1843' }],
  education: [{ school: 'University of London', degree: 'Mathematics', field: 'Logic', date: '1835' }],
  skills: [{ category: 'Languages', items: ['Ada', 'TypeScript'] }],
} as unknown as Profile;

const cases = [
  { type: 'work_experience', label: 'Work Experience', expected: profile.work_experience[0] },
  { type: 'projects', label: 'Projects', expected: profile.projects[0] },
  { type: 'education', label: 'Education', expected: profile.education[0] },
  { type: 'skills', label: 'Skills', expected: profile.skills[0] },
] as const;

describe('ImportFromProfileDialog', () => {
  it.each(cases)('imports selected $label items', ({ type, label, expected }) => {
    const onImport = vi.fn();
    render(<ImportFromProfileDialog profile={profile} type={type} onImport={onImport} />);

    fireEvent.click(screen.getByRole('button', { name: /Import from Profile/ }));
    expect(screen.getByRole('heading', { name: `Import ${label}` })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Import Selected' }));

    expect(onImport).toHaveBeenCalledWith([expected]);
    expect(screen.queryByRole('heading', { name: `Import ${label}` })).not.toBeInTheDocument();
  });

  it('keeps import disabled until a row is selected and clears selections on cancel', () => {
    const onImport = vi.fn();
    render(<ImportFromProfileDialog profile={profile} type="projects" onImport={onImport} />);
    fireEvent.click(screen.getByRole('button', { name: /Import from Profile/ }));

    expect(screen.getByRole('button', { name: 'Import Selected' })).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onImport).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /Import from Profile/ }));
    expect(screen.getByRole('button', { name: 'Import Selected' })).toBeDisabled();
  });
});
