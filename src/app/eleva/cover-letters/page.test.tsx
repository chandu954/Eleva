// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('framer-motion', async () => {
  const React = await import('react');
  const cache = new Map<string, React.ComponentType<Record<string, unknown>>>();
  const motion = new Proxy({}, {
    get: (_target, tag: string) => {
      if (!cache.has(tag)) {
        cache.set(tag, (props: Record<string, unknown>) => {
          const { initial, animate, exit, transition, whileHover, whileTap, variants, layout, layoutId, ...rest } = props;
          void initial; void animate; void exit; void transition; void whileHover; void whileTap;
          void variants; void layout; void layoutId;
          return React.createElement(tag, rest);
        });
      }
      return cache.get(tag);
    },
  });
  return {
    motion,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
  };
});

const searchParams = vi.hoisted(() => ({ get: vi.fn() }));
const coverLetterActions = vi.hoisted(() => ({
  saveCoverLetter: vi.fn(async () => ({ id: 'saved-letter' })),
  updateCoverLetter: vi.fn(async () => ({ id: 'saved-letter' })),
}));

vi.mock('next/navigation', () => ({ useSearchParams: () => searchParams }));
vi.mock('../_lib/actions', () => coverLetterActions);

vi.mock('../_components/workspace-shell', async () => {
  const React = await import('react');
  return {
    WorkspaceShell: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
  };
});

interface HistoryRow {
  id: string;
  company: string;
  role: string;
  body: string;
  tone: string | null;
  length: string | null;
  created_at: string;
}

interface RealtimePayload {
  new?: HistoryRow;
  old?: HistoryRow;
}

const supabaseState = vi.hoisted(() => ({
  rows: [] as HistoryRow[],
  handlers: [] as Array<{ event: string; filter: unknown; callback: (payload: RealtimePayload) => void }>,
  from: vi.fn(),
  channel: vi.fn(),
  removeChannel: vi.fn(),
}));

vi.mock('@supabase/ssr', () => ({
  createBrowserClient: () => ({
    from: (table: string) => {
      supabaseState.from(table);
      return {
        select: () => ({
          order: () => ({
            limit: async () => ({ data: supabaseState.rows, error: null }),
          }),
        }),
      };
    },
    channel: (name: string) => {
      supabaseState.channel(name);
      const channel = {
        on: (event: string, filter: unknown, callback: (payload: RealtimePayload) => void) => {
          supabaseState.handlers.push({ event, filter, callback });
          return channel;
        },
        subscribe: () => channel,
      };
      return channel;
    },
    removeChannel: supabaseState.removeChannel,
  }),
}));

const streamState = vi.hoisted(() => ({ streamElevaText: vi.fn() }));
vi.mock('../_lib/eleva-client', () => ({ streamElevaText: streamState.streamElevaText }));

const aiStatusState = vi.hoisted(() => ({ reportAiRun: vi.fn(), reportAiDone: vi.fn() }));
vi.mock('../_lib/ai-status', () => aiStatusState);

const toastState = vi.hoisted(() => {
  const toast = Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  });
  return { toast };
});
vi.mock('sonner', () => ({ toast: toastState.toast }));

import { reportAiDone, reportAiRun } from '../_lib/ai-status';
import { streamElevaText } from '../_lib/eleva-client';
import { toast } from 'sonner';
import CoverLetterPage from './page';

const streamMock = vi.mocked(streamElevaText);
const reportAiRunMock = vi.mocked(reportAiRun);
const reportAiDoneMock = vi.mocked(reportAiDone);
const toastCalls = toast as unknown as ReturnType<typeof vi.fn>;
const toastMock = toast as unknown as {
  success: ReturnType<typeof vi.fn>;
  error: ReturnType<typeof vi.fn>;
  info: ReturnType<typeof vi.fn>;
};

function streaming(...chunks: string[]) {
  return async function* stream() {
    for (const chunk of chunks) yield chunk;
  };
}

const savedLetter: HistoryRow = {
  id: 'letter-1',
  company: 'Acme',
  role: 'Engineer',
  body: 'Previous letter',
  tone: 'confident',
  length: 'medium',
  created_at: '2026-01-01T00:00:00.000Z',
};

async function chooseInputs(user: ReturnType<typeof userEvent.setup>, company = 'Stripe', role = 'Staff Engineer') {
  fireEvent.change(screen.getByPlaceholderText('e.g. Stripe'), { target: { value: company } });
  fireEvent.change(screen.getByPlaceholderText('e.g. Staff Engineer'), { target: { value: role } });
  await user.click(screen.getByRole('button', { name: 'Generate' }));
}

function renderPage() {
  return render(<CoverLetterPage />);
}

beforeEach(() => {
  coverLetterActions.saveCoverLetter.mockClear();
  coverLetterActions.updateCoverLetter.mockClear();
  searchParams.get.mockReset();
  searchParams.get.mockReturnValue(null);
  supabaseState.rows = [];
  supabaseState.handlers = [];
  supabaseState.from.mockClear();
  supabaseState.channel.mockClear();
  supabaseState.removeChannel.mockClear();
  streamMock.mockReset();
  streamMock.mockImplementation(streaming());
  reportAiRunMock.mockClear();
  reportAiDoneMock.mockClear();
  toastCalls.mockClear();
  toastMock.success.mockClear();
  toastMock.error.mockClear();
  toastMock.info.mockClear();
  vi.stubGlobal('fetch', vi.fn());
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:letter') });
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
});

describe('CoverLetterPage — shell and selections', () => {
  it('renders the empty state and disables Generate without company and role', () => {
    renderPage();

    expect(screen.getByRole('heading', { name: 'Write a cover letter that sounds like you.' })).toBeInTheDocument();
    expect(screen.getByText('Ready to write')).toBeInTheDocument();
    expect(screen.getByText('Preview will appear here')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Generate' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: /^Copy$/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^PDF$/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^PDF$/ }));
    expect(fetch).not.toHaveBeenCalled();
  });

  it('prefills company and role from search params and toasts', () => {
    searchParams.get.mockImplementation((key: string) =>
      key === 'company' ? 'Stripe' : key === 'role' ? 'Staff Engineer' : null);

    renderPage();

    expect(screen.getByPlaceholderText('e.g. Stripe')).toHaveValue('Stripe');
    expect(screen.getByPlaceholderText('e.g. Staff Engineer')).toHaveValue('Staff Engineer');
    expect(toastMock.info).toHaveBeenCalledWith('Prefilled from Studio', {
      description: 'Stripe · Staff Engineer',
    });
  });

  it('prefills a single search param and describes only that value', () => {
    searchParams.get.mockImplementation((key: string) => (key === 'company' ? 'Stripe' : null));

    renderPage();

    expect(screen.getByPlaceholderText('e.g. Stripe')).toHaveValue('Stripe');
    expect(screen.getByPlaceholderText('e.g. Staff Engineer')).toHaveValue('');
    expect(toastMock.info).toHaveBeenCalledWith('Prefilled from Studio', { description: 'Stripe' });
  });

  it('selects tone, length and focus and sends them to the draft tool', async () => {
    const user = userEvent.setup();
    streamMock.mockImplementation(streaming('Draft body'));
    renderPage();

    const confident = screen.getByRole('button', { name: 'Confident' });
    const technical = screen.getByRole('button', { name: 'Technical' });
    const medium = screen.getByRole('button', { name: 'Medium' });
    const long = screen.getByRole('button', { name: 'Long' });
    const impact = screen.getByRole('button', { name: 'Impact' });
    const growth = screen.getByRole('button', { name: 'Growth' });

    expect(confident.style.background).toBe('rgb(var(--eleva-fg))');
    await user.click(technical);
    expect(technical.style.background).toBe('rgb(var(--eleva-fg))');
    expect(confident.style.background).toBe('rgb(var(--eleva-muted))');

    await user.click(long);
    expect(long.style.background).toBe('rgb(var(--eleva-fg))');
    expect(medium.style.background).toBe('rgb(var(--eleva-muted))');

    await user.click(growth);
    expect(growth.style.background).toBe('rgb(var(--eleva-fg))');
    expect(impact.style.background).toBe('rgb(var(--eleva-muted))');

    fireEvent.change(screen.getByPlaceholderText('e.g. Stripe'), { target: { value: 'Stripe' } });
    fireEvent.change(screen.getByPlaceholderText('e.g. Staff Engineer'), { target: { value: 'Staff Engineer' } });
    fireEvent.change(screen.getByPlaceholderText(/Optional/), { target: { value: 'Scaled infra to 10M users' } });
    await user.click(screen.getByRole('button', { name: 'Generate' }));

    await waitFor(() => expect(streamMock).toHaveBeenCalledOnce());
    expect(streamMock).toHaveBeenCalledWith('/eleva/api/tool/draft', {
      company: 'Stripe',
      role: 'Staff Engineer',
      tone: 'technical',
      length: 'long',
      achievements: 'Scaled infra to 10M users',
      focus: 'growth',
    });
  });

  it('still blocks generation with whitespace-only company or role', () => {
    renderPage();
    fireEvent.change(screen.getByPlaceholderText('e.g. Stripe'), { target: { value: '   ' } });
    fireEvent.change(screen.getByPlaceholderText('e.g. Staff Engineer'), { target: { value: 'Engineer' } });

    expect(screen.getByRole('button', { name: 'Generate' })).toBeDisabled();
    expect(streamMock).not.toHaveBeenCalled();
  });
});

describe('CoverLetterPage — generation', () => {
  it('streams a letter, shows the draft insights and reports the AI run', async () => {
    const user = userEvent.setup();
    streamMock.mockImplementation(streaming('Dear hiring manager, ', 'I built things.'));
    renderPage();

    await chooseInputs(user);

    await waitFor(() => expect(screen.getAllByText(/I built things\./).length).toBeGreaterThan(0));
    expect(screen.getByText('Draft')).toBeInTheDocument();
    expect(screen.getByText('Zero Hallucination Guarantee')).toBeInTheDocument();
    expect(screen.getByText('Ideal length')).toBeInTheDocument();
    expect(screen.getByText('6 words')).toBeInTheDocument();
    expect(screen.getByText('36 chars')).toBeInTheDocument();
    expect(screen.getByText('~1 min read')).toBeInTheDocument();
    expect(reportAiRunMock).toHaveBeenCalledWith('Writing cover letter', 'cover-letter');
    expect(reportAiDoneMock).toHaveBeenCalledWith(
      'Cover letter ready',
      expect.any(Number),
      'cover-letter',
      false,
    );
    expect(streamMock).toHaveBeenCalledWith('/eleva/api/tool/draft', expect.objectContaining({
      company: 'Stripe',
      role: 'Staff Engineer',
      tone: 'confident',
      length: 'medium',
      focus: 'impact',
    }));
  });

  it('shows the busy state while the stream is pending', async () => {
    const user = userEvent.setup();
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    streamMock.mockImplementation(async function* stream() {
      await gate;
      yield 'Eventually drafted';
    });
    renderPage();

    await chooseInputs(user);

    await waitFor(() => expect(screen.getByText('Eleva is drafting your letter…')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Generating…' })).toBeDisabled();

    release();
    await waitFor(() => expect(screen.getAllByText(/Eventually drafted/).length).toBeGreaterThan(0));
    expect(screen.getByRole('button', { name: 'Generate' })).toBeEnabled();
  });

  it('survives a stream failure and reports it to AI status', async () => {
    const user = userEvent.setup();
    streamMock.mockImplementation(async function* stream() {
      yield 'partial';
      throw new Error('stream lost');
    });
    renderPage();

    await chooseInputs(user);

    await waitFor(() => expect(reportAiDoneMock).toHaveBeenCalledWith(
      'Cover letter',
      expect.any(Number),
      'cover-letter',
      true,
    ));
    expect(screen.getByRole('button', { name: 'Generate' })).toBeEnabled();
    expect(screen.queryByText('Zero Hallucination Guarantee')).not.toBeInTheDocument();
    expect(screen.getAllByText('partial').length).toBeGreaterThan(0);
  });

  it('flags overlong drafts for trimming', async () => {
    const user = userEvent.setup();
    const longLetter = Array.from({ length: 510 }, (_, i) => `word${i}`).join(' ');
    streamMock.mockImplementation(streaming(longLetter));
    renderPage();

    await chooseInputs(user);

    await waitFor(() => expect(screen.getByText('Consider trimming')).toBeInTheDocument());
    expect(screen.getByText('510 words')).toBeInTheDocument();
    expect(screen.getByText('~3 min read')).toBeInTheDocument();
  });

  it('regenerates the letter and keeps the draft actions working', async () => {
    const user = userEvent.setup();
    streamMock.mockImplementation(streaming('First draft.'));
    renderPage();

    await chooseInputs(user);
    await waitFor(() => expect(screen.getAllByText(/First draft\./).length).toBeGreaterThan(0));

    await user.click(screen.getByRole('button', { name: /Regenerate/ }));

    await waitFor(() => expect(streamMock).toHaveBeenCalledTimes(2));
    expect(reportAiRunMock).toHaveBeenCalledTimes(2);
    expect(screen.getAllByText(/First draft\./).length).toBeGreaterThan(0);
  });

  it('toggles between preview and edit labels', async () => {
    const user = userEvent.setup();
    streamMock.mockImplementation(streaming('Toggle me.'));
    renderPage();

    await chooseInputs(user);
    await waitFor(() => expect(screen.getAllByText(/Toggle me\./).length).toBeGreaterThan(0));

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    expect(screen.getByRole('textbox', { name: 'Cover letter draft' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Preview' }));
    expect(screen.queryByRole('textbox', { name: 'Cover letter draft' })).not.toBeInTheDocument();
  });

  it('copies the letter and resets the copied label after the timeout', async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, 'writeText');
    streamMock.mockImplementation(streaming('Copy this letter.'));
    renderPage();

    await chooseInputs(user);
    await waitFor(() => expect(screen.getAllByText(/Copy this letter\./).length).toBeGreaterThan(0));

    vi.useFakeTimers();
    try {
      fireEvent.click(screen.getByRole('button', { name: /^Copy$/ }));
      expect(writeText).toHaveBeenCalledWith('Copy this letter.');
      expect(screen.getByRole('button', { name: /Copied!/ })).toBeInTheDocument();

      act(() => { vi.advanceTimersByTime(1500); });
      expect(screen.getByRole('button', { name: /^Copy$/ })).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('CoverLetterPage — exports', () => {
  it('exports a PDF with the company in the payload and filename', async () => {
    const user = userEvent.setup();
    let clickedDownload = '';
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      clickedDownload = this.download;
    });
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue({ ok: true, blob: async () => new Blob(['pdf']) } as unknown as Response);
    streamMock.mockImplementation(streaming('Export me.'));
    renderPage();

    await chooseInputs(user, 'Acme Corp');
    await waitFor(() => expect(screen.getAllByText(/Export me\./).length).toBeGreaterThan(0));
    await user.click(screen.getByRole('button', { name: /^PDF$/ }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    expect(fetchMock.mock.calls[0][0]).toBe('/eleva/api/export/cover-letter');
    expect(JSON.parse(fetchMock.mock.calls[0][1]?.body as string)).toMatchObject({
      content: 'Export me.',
      title: 'Cover Letter — Acme Corp',
      company: 'Acme Corp',
      role: 'Staff Engineer',
    });
    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:letter');
    expect(clickedDownload).toBe('cover-letter-acme-corp.pdf');
    expect(toastMock.success).toHaveBeenCalledWith('PDF exported');
  });

  it('exports a DOCX with a sanitized filename', async () => {
    const user = userEvent.setup();
    let clickedDownload = '';
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      clickedDownload = this.download;
    });
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue({ ok: true, blob: async () => new Blob(['docx']) } as unknown as Response);
    streamMock.mockImplementation(streaming('Docx me.'));
    renderPage();

    await chooseInputs(user, 'My Company');
    await waitFor(() => expect(screen.getAllByText(/Docx me\./).length).toBeGreaterThan(0));
    await user.click(screen.getByRole('button', { name: /^DOCX$/ }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    expect(fetchMock.mock.calls[0][0]).toBe('/eleva/api/export/cover-letter-docx');
    expect(clickedDownload).toBe('cover-letter-my-company.docx');
    expect(toastMock.success).toHaveBeenCalledWith('DOCX exported');
  });

  it('reports export failures', async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValue({ ok: false } as Response);
    streamMock.mockImplementation(streaming('Fail export.'));
    renderPage();

    await chooseInputs(user);
    await waitFor(() => expect(screen.getAllByText(/Fail export\./).length).toBeGreaterThan(0));
    await user.click(screen.getByRole('button', { name: /^DOCX$/ }));

    await waitFor(() => expect(toastMock.error).toHaveBeenCalledWith('Export failed', {
      description: 'Export failed',
    }));
  });
});

describe('CoverLetterPage — history and realtime', () => {
  it('loads history and applies INSERT and DELETE realtime events', async () => {
    supabaseState.rows = [savedLetter];
    const { unmount } = renderPage();

    await waitFor(() => expect(supabaseState.from).toHaveBeenCalledWith('cover_letters'));
    expect(supabaseState.channel).toHaveBeenCalledWith('cover-letters-page');

    const insert = supabaseState.handlers.filter((h) => (h.filter as { event?: string }).event === 'INSERT').at(-1);
    const remove = supabaseState.handlers.filter((h) => (h.filter as { event?: string }).event === 'DELETE').at(-1);
    expect(insert?.filter).toEqual({ event: 'INSERT', schema: 'public', table: 'cover_letters' });
    expect(remove?.filter).toEqual({ event: 'DELETE', schema: 'public', table: 'cover_letters' });

    act(() => {
      insert?.callback({ new: { ...savedLetter, id: 'letter-2', company: 'Globex' } });
      remove?.callback({ old: savedLetter });
    });

    expect(screen.getByRole('heading', { name: 'Write a cover letter that sounds like you.' })).toBeInTheDocument();
    unmount();
    expect(supabaseState.removeChannel).toHaveBeenCalled();
  });

  it('keeps rendering when history is empty', async () => {
    supabaseState.rows = [];
    renderPage();
    await waitFor(() => expect(supabaseState.from).toHaveBeenCalledWith('cover_letters'));
    expect(screen.getByText('Ready to write')).toBeInTheDocument();
  });
});
