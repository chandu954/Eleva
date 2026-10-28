import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Profile, Resume } from '@/lib/types';

vi.mock('../actions/resume-editor-actions', () => ({ ResumeEditorActions: () => <button>Editor actions</button> }));
vi.mock('../../management/cards/tailored-job-card', () => ({ TailoredJobAccordion: () => <div>Job details</div> }));
vi.mock('../forms/basic-info-form', () => ({ BasicInfoForm: () => <div>Basic info form</div> }));
vi.mock('../../assistant/chatbot', () => ({ default: () => <div>Resume assistant</div> }));
vi.mock('./cover-letter-panel', () => ({ CoverLetterPanel: () => <div>Cover letter panel</div> }));
vi.mock('./resume-score-panel', () => ({ default: () => <div>Resume score panel</div> }));
vi.mock('../dynamic-components', () => ({
  WorkExperienceForm: ({ onChange }: { onChange: (value: unknown[]) => void }) => <button onClick={() => onChange([])}>Work form</button>,
  ProjectsForm: ({ onChange }: { onChange: (value: unknown[]) => void }) => <button onClick={() => onChange([])}>Projects form</button>,
  EducationForm: ({ onChange }: { onChange: (value: unknown[]) => void }) => <button onClick={() => onChange([])}>Education form</button>,
  SkillsForm: ({ onChange }: { onChange: (value: unknown[]) => void }) => <button onClick={() => onChange([])}>Skills form</button>,
  DocumentSettingsForm: ({ onChange }: { onChange: (field: 'document_settings', value: unknown) => void }) => <button onClick={() => onChange('document_settings', {})}>Document form</button>,
}));

import { EditorPanel } from './editor-panel';

const resume = {
  id: 'r1', first_name: 'Ada', last_name: 'Lovelace', is_base_resume: false, target_role: 'Engineer',
  work_experience: [], projects: [], education: [], skills: [], document_settings: {},
} as unknown as Resume;
const profile = { work_experience: [], projects: [], education: [], skills: [] } as unknown as Profile;

describe('EditorPanel', () => {
  it('renders the tailored-resume layout and switches between editor sections', async () => {
    const onResumeChange = vi.fn();
    render(<EditorPanel resume={resume} profile={profile} job={null} isLoadingJob={false} onResumeChange={onResumeChange} />);

    expect(screen.getByText('Job details')).toBeInTheDocument();
    expect(screen.getByText('Basic info form')).toBeInTheDocument();
    expect(await screen.findByText('Resume assistant')).toBeInTheDocument();

    for (const tab of ['Work', 'Projects', 'Education', 'Skills', 'Layout']) {
      expect(screen.getByRole('tab', { name: tab })).toBeInTheDocument();
    }

    expect(screen.getByRole('tab', { name: 'Cover Letter' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Resume Score' })).toBeInTheDocument();
  });
});
