import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createBrowserClient: vi.fn(),
  extractPdfText: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));
vi.mock('@supabase/ssr', () => ({ createBrowserClient: mocks.createBrowserClient }));
vi.mock('@/lib/pdf/extract-text', () => ({ extractPdfText: mocks.extractPdfText }));
vi.mock('sonner', () => ({ toast: { success: mocks.toastSuccess, error: mocks.toastError } }));

import { ResumeUploader } from './resume-uploader';

function configureSupabase({ user = { id: 'user-1' }, uploadError = null as null | { message: string } }: { user?: { id: string } | null; uploadError?: null | { message: string } } = {}) {
  const upload = vi.fn().mockResolvedValue({ error: uploadError });
  const supabase = {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
    storage: { from: vi.fn(() => ({ upload })) },
  };
  mocks.createBrowserClient.mockReturnValue(supabase);
  return { supabase, upload };
}

function chooseFile() {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  const file = new File(['resume'], 'ada.pdf', { type: 'application/pdf' });
  fireEvent.change(input, { target: { files: [file] } });
  return file;
}

describe('ResumeUploader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.extractPdfText.mockResolvedValue('Resume text '.repeat(12));
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ resume: { id: 'resume-1', name: 'Ada' } }) }));
  });

  it('extracts, uploads and imports a resume, then notifies its parent', async () => {
    const { supabase, upload } = configureSupabase();
    const onImported = vi.fn();
    render(<ResumeUploader onImported={onImported} />);
    fireEvent.click(screen.getByRole('button', { name: /Upload PDF/ }));
    chooseFile();

    await waitFor(() => expect(onImported).toHaveBeenCalledWith('resume-1'));
    expect(upload).toHaveBeenCalledWith(expect.stringMatching(/^user-1\/\d+-ada\.pdf$/), expect.any(File), expect.objectContaining({ contentType: 'application/pdf' }));
    expect(fetch).toHaveBeenCalledWith('/eleva/api/resumes/import', expect.objectContaining({ method: 'POST' }));
    expect(mocks.toastSuccess).toHaveBeenCalledWith('Resume imported', expect.any(Object));
    expect(supabase.storage.from).toHaveBeenCalledWith('resumes');
  });

  it('shows extraction failures and allows retrying the selected file', async () => {
    const { upload } = configureSupabase();
    mocks.extractPdfText.mockRejectedValueOnce(new Error('PDF unreadable'));
    render(<ResumeUploader />);
    fireEvent.click(screen.getByRole('button', { name: /Upload PDF/ }));
    chooseFile();

    expect(await screen.findByText('PDF unreadable')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Retry Upload/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Retry Upload/ }));
    await waitFor(() => expect(upload).toHaveBeenCalledOnce());
  });

  it('rejects short PDFs, signed-out users, storage errors and API errors', async () => {
    mocks.extractPdfText.mockResolvedValueOnce('too short');
    const shortRender = render(<ResumeUploader />);
    fireEvent.click(screen.getByRole('button', { name: /Upload PDF/ }));
    chooseFile();
    expect(await screen.findByText(/PDF may be scanned/)).toBeInTheDocument();
    shortRender.unmount();

    configureSupabase({ user: null });
    render(<ResumeUploader />);
    fireEvent.click(screen.getByRole('button', { name: /Upload PDF/ }));
    chooseFile();
    expect(await screen.findByText('Not signed in')).toBeInTheDocument();
  });

  it('shows storage and import endpoint errors', async () => {
    configureSupabase({ uploadError: { message: 'storage denied' } });
    render(<ResumeUploader />);
    fireEvent.click(screen.getByRole('button', { name: /Upload PDF/ }));
    chooseFile();
    expect(await screen.findByText('storage denied')).toBeInTheDocument();

    configureSupabase();
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'import rejected' }) } as Response);
    fireEvent.click(screen.getByRole('button', { name: /Close/ }));
    fireEvent.click(screen.getByRole('button', { name: /Upload PDF/ }));
    chooseFile();
    expect(await screen.findByText('import rejected')).toBeInTheDocument();
  });
});
