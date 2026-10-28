import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mocks = vi.hoisted(() => ({
  state: { resume: {} as Record<string, unknown>, isSaving: false },
  dispatch: vi.fn(),
  updateResume: vi.fn(),
  toast: vi.fn(),
  downloadResumePdf: vi.fn(),
}));

vi.mock('@/components/resume/editor/resume-editor-context', () => ({ useResumeContext: () => ({ state: mocks.state, dispatch: mocks.dispatch }) }));
vi.mock('@/utils/actions/resumes/actions', () => ({ updateResume: mocks.updateResume }));
vi.mock('@/hooks/use-toast', () => ({ toast: mocks.toast }));
vi.mock('../../text-import', () => ({ TextImport: () => <button>Import text</button> }));
vi.mock('@/lib/resume/download-pdf', () => ({ downloadResumePdf: mocks.downloadResumePdf }));

import { ResumeEditorActions } from './resume-editor-actions';
import type { Resume } from '@/lib/types';

const resume = { id: 'r1', first_name: 'Ada', last_name: 'Lovelace', is_base_resume: true, has_cover_letter: false } as unknown as Resume & Record<string, unknown>;

describe('ResumeEditorActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.state = { resume, isSaving: false };
    mocks.updateResume.mockResolvedValue(undefined);
    mocks.downloadResumePdf.mockResolvedValue(undefined);
  });

  it('saves the current resume and always clears the saving flag', async () => {
    const user = userEvent.setup();
    render(<ResumeEditorActions onResumeChange={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(mocks.updateResume).toHaveBeenCalledWith('r1', resume));
    expect(mocks.dispatch).toHaveBeenNthCalledWith(1, { type: 'SET_SAVING', value: true });
    expect(mocks.dispatch).toHaveBeenLastCalledWith({ type: 'SET_SAVING', value: false });
    expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Changes saved' }));
  });

  it('reports save errors and shows the active saving state', async () => {
    mocks.state = { resume, isSaving: true };
    mocks.updateResume.mockRejectedValue(new Error('write denied'));
    const { rerender } = render(<ResumeEditorActions onResumeChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Saving...' })).toBeDisabled();
    mocks.state = { resume, isSaving: false };
    rerender(<ResumeEditorActions onResumeChange={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Save failed', description: 'write denied' })));
  });

  it('downloads a resume PDF and reports success', async () => {
    render(<ResumeEditorActions onResumeChange={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Download' }));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Download started' })));
    expect(mocks.downloadResumePdf).toHaveBeenCalledWith('r1', 'Ada_Lovelace_Resume.pdf');
  });

  it('reports missing cover letter content when both downloads are selected', async () => {
    mocks.state = { resume: { ...resume, is_base_resume: false, has_cover_letter: true }, isSaving: false };
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    render(<ResumeEditorActions onResumeChange={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Download' }));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Download failed', description: 'Cover letter content not found', variant: 'destructive' })));
    error.mockRestore();
  });
});
