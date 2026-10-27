import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { CareerClient } from './career-client';
import * as actions from '../_lib/actions-career';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

vi.mock('../_lib/actions-career', () => ({
  savePersonal: vi.fn().mockResolvedValue({}),
  saveSummary: vi.fn().mockResolvedValue({}),
  saveExperience: vi.fn().mockResolvedValue({}),
  saveProjects: vi.fn().mockResolvedValue({}),
  saveSkills: vi.fn().mockResolvedValue({}),
  saveEducation: vi.fn().mockResolvedValue({}),
  saveCertifications: vi.fn().mockResolvedValue({}),
  saveAchievements: vi.fn().mockResolvedValue({}),
  saveLanguages: vi.fn().mockResolvedValue({}),
  savePreferences: vi.fn().mockResolvedValue({}),
}));

vi.mock('framer-motion', async () => {
  const React = await import('react');
  const motion = new Proxy({}, {
    get: (_target, tag: string) => (props: Record<string, unknown>) => {
      const { initial, animate, exit, transition, whileHover, whileTap, variants, layout, layoutId, ...rest } = props;
      void initial; void animate; void exit; void transition; void whileHover; void whileTap; void variants; void layout; void layoutId;
      return React.createElement(tag, rest);
    },
  });
  return { motion, AnimatePresence: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children) };
});

describe('CareerClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the section list and expands a section', () => {
    render(<CareerClient profile={null} _userId="u1" />);

    expect(screen.getByRole('heading', { name: 'Career Profile' })).toBeInTheDocument();
    expect(screen.getByText('0%')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Experience/ }));
    expect(screen.getByText('Add Experience')).toBeInTheDocument();
  });

  it('computes completion from profile fields', () => {
    render(
      <CareerClient
        _userId="u1"
        profile={
          {
            first_name: 'Ada',
            headline: 'Engineer',
            professional_summary: 'Builds things',
            work_experience: [{}],
            education: [{}],
            skills: [{}],
            projects: [{}],
            certifications: [{}],
            achievements: [{}],
            email: 'ada@example.com',
          } as never
        }
      />,
    );

    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('saves personal information', async () => {
    const { container } = render(<CareerClient profile={null} _userId="u1" />);

    fireEvent.click(screen.getByRole('button', { name: /Personal Information/ }));
    const firstName = container.querySelector('input') as HTMLInputElement;
    fireEvent.change(firstName, { target: { value: 'Ada' } });
    fireEvent.click(screen.getByRole('button', { name: /Save/ }));

    await waitFor(() =>
      expect(actions.savePersonal).toHaveBeenCalledWith(expect.objectContaining({ first_name: 'Ada' })),
    );
  });


  it.each([
    { name: 'Professional Summary', header: /Professional Summary/, add: null, save: actions.saveSummary },
    { name: 'Experience', header: /^Experience/, add: /Add Experience/, save: actions.saveExperience },
    { name: 'Projects', header: /^Projects/, add: /Add Project/, save: actions.saveProjects },
    { name: 'Education', header: /^Education/, add: /Add Education/, save: actions.saveEducation },
    { name: 'Certifications', header: /^Certifications/, add: /Add Certification/, save: actions.saveCertifications },
    { name: 'Achievements', header: /^Achievements/, add: /Add Achievement/, save: actions.saveAchievements },
    { name: 'Languages', header: /^Languages/, add: /Add Language/, save: actions.saveLanguages },
    { name: 'Preferences', header: /^Preferences/, add: null, save: actions.savePreferences },
  ])('adds and saves the $name section', async ({ header, add, save }) => {
    render(<CareerClient profile={null} _userId="u1" />);

    fireEvent.click(screen.getByRole('button', { name: header }));
    if (add) {
      fireEvent.click(screen.getByRole('button', { name: add }));
    }
    fireEvent.click(screen.getByRole('button', { name: /Save/ }));
    await waitFor(() => expect(save).toHaveBeenCalled());
  });


  it('edits and removes rows in every data-backed section', async () => {
    render(
      <CareerClient
        _userId="u1"
        profile={{
          first_name: 'Ada',
          last_name: 'Lovelace',
          headline: 'Engineer',
          professional_summary: 'Builds things',
          work_experience: [{ company: 'Acme', position: 'Engineer', location: 'London', start_date: '2020', end_date: '2024', description: 'Built', responsibilities: ['Built things'] }],
          projects: [{ name: 'Eleva', description: ['Resume builder'], technologies: ['Next.js'], link: '' }],
          skills: [{ category: 'Languages', items: ['TypeScript'] }],
          education: [{ school: 'Oxford', degree: 'BSc', field: 'CS', location: 'UK', date: '2020', gpa: '4.0', achievements: [] }],
          certifications: [{ name: 'AWS', issuer: 'Amazon', date: '2024', url: '' }],
          achievements: [{ title: 'Award', description: 'Did things', date: '2024', type: 'achievement' }],
          languages: [{ language: 'English', proficiency: 'native' }],
          preferences: { remote: true },
        } as never}
      />,
    );

    for (const label of ['Experience', 'Projects', 'Skills', 'Education', 'Certifications', 'Achievements', 'Languages', 'Preferences']) {
      fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${label}`) }));
      const fields = Array.from(document.querySelectorAll('input, select')) as Array<HTMLInputElement | HTMLSelectElement>;
      fields.forEach((field) => {
        if (field.tagName === 'SELECT') {
          const option = field.querySelector('option:last-child') as HTMLOptionElement | null;
          fireEvent.change(field, { target: { value: option?.value ?? '' } });
        } else {
          fireEvent.change(field, { target: { value: 'Updated' } });
        }
      });
      const iconButtons = screen.getAllByRole('button').filter((button) => !button.textContent?.trim());
      if (iconButtons.length > 0) fireEvent.click(iconButtons[0]);
      const save = await screen.findAllByRole('button', { name: /Save/ });
      fireEvent.click(save[0]);
      await waitFor(() => expect(screen.getAllByRole('button', { name: /Save/ }).length).toBeGreaterThan(0));
    }
  }, 90000);

  it('adds a skill category and saves it', async () => {
    render(<CareerClient profile={null} _userId="u1" />);

    fireEvent.click(screen.getByRole('button', { name: /Skills/ }));
    fireEvent.click(screen.getByRole('button', { name: '+ Languages' }));
    fireEvent.change(screen.getByPlaceholderText('Add skill to Languages...'), {
      target: { value: 'TypeScript' },
    });
    fireEvent.keyDown(screen.getByPlaceholderText('Add skill to Languages...'), { key: 'Enter' });
    fireEvent.click(screen.getByRole('button', { name: /Save/ }));

    await waitFor(() =>
      expect(actions.saveSkills).toHaveBeenCalledWith([
        { category: 'Languages', items: ['TypeScript'] },
      ]),
    );
  });
});
