import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mocks = vi.hoisted(() => ({
  items: [] as Array<Record<string, unknown>>,
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  supabase: {
    auth: { getUser: vi.fn() },
    from: vi.fn(),
  },
}));

vi.mock('../_lib/use-realtime', () => ({ useRealtimeResumes: () => ({ items: mocks.items }) }));
vi.mock('@supabase/ssr', () => ({ createBrowserClient: () => mocks.supabase }));
vi.mock('sonner', () => ({ toast: { success: mocks.toastSuccess, error: mocks.toastError } }));
vi.mock('framer-motion', async () => {
  const React = await import('react');
  const passthrough = (tag: string) => {
    const Component = React.forwardRef<HTMLElement, Record<string, unknown>>(({ children, initial, animate, exit, transition, whileHover, layout, ...props }, ref) => {
      void initial; void animate; void exit; void transition; void whileHover; void layout;
      return React.createElement(tag, { ...props, ref }, children as React.ReactNode);
    });
    Component.displayName = `Motion${tag}`;
    return Component;
  };
  return { motion: { div: passthrough('div'), span: passthrough('span') }, AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</> };
});
vi.mock('../_components/resume-uploader', () => ({ ResumeUploader: () => <button>Upload resume</button> }));

import { ResumesClient } from './resumes-client';
import type { Resume } from './types';

const resume = {
  id: 'resume-1', name: 'Ada Resume', target_role: 'Engineer', updated_at: new Date().toISOString(),
  is_base_resume: true, document_settings: { template: 'modern' },
} as unknown as Resume;

function configureSupabase() {
  mocks.supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
  mocks.supabase.from.mockImplementation(() => ({
    select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: 'resume-1', name: 'Ada Resume', target_role: 'Engineer' } }) }) }),
    insert: async () => ({ error: null }),
    delete: () => ({ eq: async () => ({ error: null }) }),
  }));
}

describe('ResumesClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.items = [resume as unknown as Record<string, unknown>];
    configureSupabase();
    vi.stubGlobal('confirm', vi.fn(() => true));
  });

  it('renders the empty library state and creates the first-resume link', () => {
    mocks.items = [];
    render(<ResumesClient initial={[]} />);
    expect(screen.getByText('No resumes yet')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Create resume/ })).toHaveAttribute('href', '/eleva/editor');
  });

  it('searches by resume name or role, switches between grid and table, and displays ATS scores', async () => {
    const user = userEvent.setup();
    const second = { ...resume, id: 'resume-2', name: 'Product CV', target_role: 'Product Manager' } as Resume;
    mocks.items = [resume as unknown as Record<string, unknown>, second as unknown as Record<string, unknown>];
    const { container } = render(<ResumesClient initial={[resume, second]} atsScores={new Map([['resume-1', 92]])} />);
    expect(screen.getByText('2 resumes · realtime updates from Supabase.')).toBeInTheDocument();
    expect(screen.getByText('92%')).toBeInTheDocument();
    await user.type(screen.getByPlaceholderText('Search resumes…'), 'product');
    expect(screen.getAllByText('Product CV').length).toBeGreaterThan(0);
    expect(screen.queryByText('Ada Resume')).not.toBeInTheDocument();
    await user.clear(screen.getByPlaceholderText('Search resumes…'));
    await user.click(container.querySelectorAll('button')[1]!);
    expect(screen.getByText('Resume')).toBeInTheDocument();
    expect(screen.getByText('ATS')).toBeInTheDocument();
  });

  it('duplicates and deletes a resume with success feedback', async () => {
    const user = userEvent.setup();
    render(<ResumesClient initial={[resume]} />);
    await user.click(screen.getByRole('button', { name: /Duplicate/ }));
    await waitFor(() => expect(mocks.toastSuccess).toHaveBeenCalledWith('Duplicated'));
    await user.click(screen.getByRole('button', { name: /Delete/ }));
    await waitFor(() => expect(mocks.toastSuccess).toHaveBeenCalledWith('Deleted'));
  });

  it('exports a PDF and reports a failed DOCX response', async () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    const createObjectURL = vi.fn(() => 'blob:test');
    const revokeObjectURL = vi.fn();
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL });
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ ok: true, blob: async () => new Blob(['pdf']) })
      .mockResolvedValueOnce({ ok: false, text: async () => 'export unavailable' }));
    const user = userEvent.setup();
    render(<ResumesClient initial={[resume]} />);
    await user.click(screen.getByRole('button', { name: 'PDF' }));
    await waitFor(() => expect(mocks.toastSuccess).toHaveBeenCalledWith('PDF exported'));
    await user.click(screen.getByRole('button', { name: 'DOCX' }));
    await waitFor(() => expect(mocks.toastError).toHaveBeenCalledWith('Export failed', { description: 'export unavailable' }));
    expect(click).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:test');
  });
});
