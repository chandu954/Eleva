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
