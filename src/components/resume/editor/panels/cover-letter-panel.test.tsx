import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mocks = vi.hoisted(() => ({
  dispatch: vi.fn(),
  generate: vi.fn(),
  readStreamableValue: vi.fn(),
}));

vi.mock('@/components/resume/editor/resume-editor-context', () => ({ useResumeContext: () => ({ dispatch: mocks.dispatch }) }));
vi.mock('@/utils/actions/cover-letter/actions', () => ({ generate: mocks.generate }));
vi.mock('ai/rsc', () => ({ readStreamableValue: mocks.readStreamableValue }));
vi.mock('../../shared/ai-improvement-prompt', () => ({ AIImprovementPrompt: ({ value, onChange }: { value: string; onChange: (value: string) => void }) => <textarea aria-label="Extra instructions" value={value} onChange={(event) => onChange(event.target.value)} /> }));
vi.mock('@/components/ui/api-error-dialog', () => ({ ApiErrorDialog: ({ open, errorMessage }: { open: boolean; errorMessage: { title: string } }) => open ? <div role="alertdialog">{errorMessage.title}</div> : null }));
vi.mock('@/components/resume/management/dialogs/create-tailored-resume-dialog', () => ({ CreateTailoredResumeDialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));

import { CoverLetterPanel } from './cover-letter-panel';
import type { Resume, Job } from '@/lib/types';

const resume = { id: 'r1', is_base_resume: false, has_cover_letter: false, first_name: 'Ada', last_name: 'Lovelace', email: 'ada@example.com' } as unknown as Resume;
const job = { id: 'j1', company: 'Analytical Engines', role: 'Engineer' } as unknown as Job;

describe('CoverLetterPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mocks.generate.mockResolvedValue({ output: 'stream' });
    mocks.readStreamableValue.mockImplementation(async function* () { yield 'Dear '; yield 'team.'; });
  });

  it('asks users to tailor a base resume before generating a letter', () => {
    render(<CoverLetterPanel resume={{ ...resume, is_base_resume: true }} job={job} />);
    expect(screen.getByText(/first tailor this base resume/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Tailor This Resume/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Generate with AI/ })).not.toBeInTheDocument();
  });

  it('creates a cover letter state and disables generation when no job is selected', async () => {
    const user = userEvent.setup();
    render(<CoverLetterPanel resume={resume} job={null} />);
    await user.click(screen.getByRole('button', { name: /Create Cover Letter/ }));
    expect(mocks.dispatch).toHaveBeenCalledWith({ type: 'UPDATE_FIELD', field: 'has_cover_letter', value: true });
  });

  it('streams generated content into resume context and supports extra instructions', async () => {
    const user = userEvent.setup();
    render(<CoverLetterPanel resume={{ ...resume, has_cover_letter: true, phone_number: '555-0100', linkedin_url: 'https://linkedin.test/ada' }} job={job} aiConfig={{ provider: 'openai' } as never} />);
    await user.type(screen.getByRole('textbox', { name: 'Extra instructions' }), 'Mention leadership');
    await user.click(screen.getByRole('button', { name: /Generate with AI/ }));
    await waitFor(() => expect(mocks.dispatch).toHaveBeenCalledWith({ type: 'UPDATE_FIELD', field: 'cover_letter', value: { content: 'Dear team.' } }));
    expect(mocks.generate).toHaveBeenCalledWith(expect.stringContaining('Mention leadership'), expect.objectContaining({ model: '', apiKeys: [] }));
    expect(screen.getByRole('button', { name: /Generate with AI/ })).toBeEnabled();
  });

  it('maps provider credential errors to the API key dialog and other failures to a generic dialog', async () => {
    const user = userEvent.setup();
    mocks.generate.mockRejectedValueOnce(new Error('Invalid x-api-key'));
    const { rerender } = render(<CoverLetterPanel resume={{ ...resume, has_cover_letter: true }} job={job} />);
    await user.click(screen.getByRole('button', { name: /Generate with AI/ }));
    expect(await screen.findByRole('alertdialog')).toHaveTextContent('API Key Error');
    mocks.generate.mockRejectedValueOnce('unknown failure');
    rerender(<CoverLetterPanel resume={{ ...resume, has_cover_letter: true }} job={job} />);
    await user.click(screen.getByRole('button', { name: /Generate with AI/ }));
    expect(await screen.findByRole('alertdialog')).toHaveTextContent('Error');
  });

  it('removes an existing cover letter', async () => {
    const user = userEvent.setup();
    render(<CoverLetterPanel resume={{ ...resume, has_cover_letter: true }} job={job} />);
    await user.click(screen.getByRole('button', { name: /Delete Cover Letter/ }));
    expect(mocks.dispatch).toHaveBeenCalledWith({ type: 'UPDATE_FIELD', field: 'has_cover_letter', value: false });
  });
});
