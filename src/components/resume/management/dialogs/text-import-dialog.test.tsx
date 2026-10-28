import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mocks = vi.hoisted(() => ({
  addTextToResume: vi.fn(),
  pdfToText: vi.fn(),
  toast: vi.fn(),
}));

vi.mock('@/utils/actions/resumes/ai', () => ({ addTextToResume: mocks.addTextToResume }));
vi.mock('@/lib/pdf/extract-text', () => ({ extractPdfText: mocks.pdfToText }));
vi.mock('@/hooks/use-toast', () => ({ toast: mocks.toast }));
vi.mock('@/components/settings/pro-upgrade-button', () => ({ ProUpgradeButton: () => <button>Upgrade</button> }));

import { TextImportDialog } from './text-import-dialog';
import type { Resume } from '@/lib/types';

const resume = { id: 'resume-1', name: 'Current CV' } as Resume;

function renderDialog() {
  const onResumeChange = vi.fn();
  const utils = render(<TextImportDialog resume={resume} onResumeChange={onResumeChange} trigger={<button>Open import</button>} />);
  return { ...utils, onResumeChange };
}

describe('TextImportDialog', () => {
  beforeEach(() => vi.clearAllMocks());

  it('keeps import disabled when content is empty', async () => {
    renderDialog();
    await userEvent.click(screen.getByRole('button', { name: 'Open import' }));
    expect(screen.getByRole('button', { name: 'Import' })).toBeDisabled();
    expect(mocks.toast).not.toHaveBeenCalled();
    expect(mocks.addTextToResume).not.toHaveBeenCalled();
  });

  it('imports pasted text, updates each returned resume field, and closes the dialog', async () => {
    const updates = { name: 'Updated', skills: ['TS'] };
    mocks.addTextToResume.mockResolvedValue(updates);
    const { onResumeChange } = renderDialog();
    await userEvent.click(screen.getByRole('button', { name: 'Open import' }));
    await userEvent.type(screen.getByPlaceholderText(/Start pasting/), 'resume text');
    await userEvent.click(screen.getByRole('button', { name: 'Import' }));
    await waitFor(() => expect(onResumeChange).toHaveBeenCalledTimes(2));
    expect(onResumeChange).toHaveBeenNthCalledWith(1, 'name', 'Updated');
    expect(onResumeChange).toHaveBeenNthCalledWith(2, 'skills', ['TS']);
    expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Import successful' }));
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Import Resume Content' })).not.toBeInTheDocument());
  });

  it('shows API key guidance for provider credential errors and clears it on close', async () => {
    mocks.addTextToResume.mockRejectedValue(new Error('API key missing'));
    renderDialog();
    await userEvent.click(screen.getByRole('button', { name: 'Open import' }));
    await userEvent.type(screen.getByPlaceholderText(/Start pasting/), 'resume text');
    await userEvent.click(screen.getByRole('button', { name: 'Import' }));
    expect(await screen.findByText('API Key Required')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await userEvent.click(screen.getByRole('button', { name: 'Open import' }));
    expect(screen.queryByText('API Key Required')).not.toBeInTheDocument();
  });

  it('reports other import failures and supports PDF input and invalid drops', async () => {
    mocks.addTextToResume.mockRejectedValue('unexpected');
    mocks.pdfToText.mockResolvedValue('extracted pdf text');
    renderDialog();
    await userEvent.click(screen.getByRole('button', { name: 'Open import' }));
    const file = new File(['pdf'], 'resume.pdf', { type: 'application/pdf' });
    fireEvent.change(document.querySelector('input[type="file"]')!, { target: { files: [file] } });
    await waitFor(() => expect(screen.getByPlaceholderText(/Start pasting/)).toHaveValue('extracted pdf text'));
    await userEvent.click(screen.getByRole('button', { name: 'Import' }));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Import failed' })));
    const dropZone = screen.getByText('Drop your PDF resume here').closest('label')!;
    fireEvent.dragEnter(dropZone);
    fireEvent.dragOver(dropZone);
    fireEvent.dragLeave(dropZone);
    fireEvent.drop(dropZone, { dataTransfer: { files: [new File(['x'], 'x.txt', { type: 'text/plain' })] } });
    expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Invalid File' }));
  });

  it('reports PDF extraction errors without losing the manual paste option', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mocks.pdfToText.mockRejectedValue(new Error('bad pdf'));
    renderDialog();
    await userEvent.click(screen.getByRole('button', { name: 'Open import' }));
    const input = document.querySelector('input[type="file"]')!;
    fireEvent.change(input, { target: { files: [new File(['pdf'], 'resume.pdf', { type: 'application/pdf' })] } });
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'PDF Processing Error' })));
    expect(screen.getByPlaceholderText(/Start pasting/)).toBeInTheDocument();
    error.mockRestore();
  });
});
