// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
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

const navState = vi.hoisted(() => ({
  replace: vi.fn(),
  get: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: navState.replace, push: vi.fn(), refresh: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => ({ get: navState.get }),
}));

const toastState = vi.hoisted(() => {
  const toast = Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() });
  return { toast };
});

vi.mock('sonner', () => ({ toast: toastState.toast }));

const pipelineHook = vi.hoisted(() => ({ useStudioPipeline: vi.fn() }));

vi.mock('./_lib/use-studio-pipeline', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./_lib/use-studio-pipeline')>();
  return { ...actual, useStudioPipeline: pipelineHook.useStudioPipeline };
});

vi.mock('./_components/step-log-panel', async () => {
  const React = await import('react');
  return {
    StepLogPanel: ({ logs }: { logs: { message: string }[] }) =>
      React.createElement('div', { 'data-testid': 'step-log' }, `logs:${logs.length}`),
  };
});

vi.mock('./_components/studio-results', async () => {
  const React = await import('react');
  return {
    StudioResults: (props: {
      activeTab: string;
      creatingApplication: 'wishlist' | 'applied' | null;
      createApplication: (status: 'wishlist' | 'applied') => void;
      downloadExport: (format: 'pdf' | 'docx') => void;
    }) => React.createElement('div', {
      'data-testid': 'studio-results',
      'data-tab': props.activeTab,
      'data-creating': props.creatingApplication ?? '',
    },
    React.createElement('button', { onClick: () => props.createApplication('wishlist') }, 'stub-wishlist'),
    React.createElement('button', { onClick: () => props.createApplication('applied') }, 'stub-applied'),
    React.createElement('button', { onClick: () => props.downloadExport('pdf') }, 'stub-pdf'),
    React.createElement('button', { onClick: () => props.downloadExport('docx') }, 'stub-docx')),
  };
});

import { toast } from 'sonner';
import { StudioClient } from './studio-client';
import { useStudioPipeline } from './_lib/use-studio-pipeline';
import type { StepState, StudioPipelineSummary } from './_lib/use-studio-pipeline';

const toastMock = toast as unknown as {
  success: ReturnType<typeof vi.fn>;
  error: ReturnType<typeof vi.fn>;
  mock: ReturnType<typeof vi.fn>['mock'];
};
const toastCalls = toast as unknown as ReturnType<typeof vi.fn>;
const hookMock = vi.mocked(useStudioPipeline);

const resumes = [
  { id: 'resume-1', name: 'Base resume', target_role: 'Engineer', is_base_resume: true },
  { id: 'resume-2', name: 'Tailored resume', target_role: null, is_base_resume: false },
];

const summary: StudioPipelineSummary = {
  overall: 82,
  matched: 12,
  missing: 3,
  company: 'Acme',
  role: 'Staff Engineer',
  keywordsAdded: 4,
  bulletsRewritten: 5,
  compatibility: 82.4,
  resumeId: 'resume-1',
  coverLetterId: 'letter-1',
};

const STEP_NAMES = ['extract', 'score', 'plan', 'tailor', 'rescore', 'review', 'letter'] as const;

function stepsWith(statuses: Partial<Record<(typeof STEP_NAMES)[number], StepState['status']>>): StepState[] {
  return STEP_NAMES.map((step) => ({ step, label: step, status: statuses[step] ?? 'idle', progress: 0 }));
}

type Pipeline = ReturnType<typeof useStudioPipeline>;

function makePipeline(overrides: Partial<Pipeline> = {}): Pipeline {
  return {
    running: false,
    steps: [],
    letter: '',
    summary: null,
    logs: [],
    elapsed: null,
    stepTimings: {},
    tailoredResume: null,
    extractData: null,
    scoreData: null,
    rescoreData: null,
    startRun: vi.fn(async () => undefined),
    abort: vi.fn(),
    retryFrom: vi.fn(async () => undefined),
    reset: vi.fn(),
    ...overrides,
  };
}

function renderClient(overrides: Partial<Pipeline> = {}, clientResumes = resumes) {
  const pipeline = makePipeline(overrides);
  hookMock.mockReturnValue(pipeline);
  const view = render(<StudioClient resumes={clientResumes} />);
  return { pipeline, ...view };
}

function jsonResponse(payload: unknown, ok = true): Response {
  return { ok, json: async () => payload } as unknown as Response;
}

beforeEach(() => {
  hookMock.mockReset();
  navState.replace.mockClear();
  navState.get.mockReset();
  navState.get.mockReturnValue(null);
  toastCalls.mockClear();
  toastMock.success.mockClear();
  toastMock.error.mockClear();
  vi.stubGlobal('fetch', vi.fn());
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: vi.fn() },
  });
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:test') });
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
});

describe('StudioClient — applications and exports', () => {
  it('creates a wishlist application with the summary payload', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(jsonResponse({}));
    renderClient({ summary, letter: 'Dear team' });

    await user.click(screen.getByRole('button', { name: 'stub-wishlist' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/eleva/api/applications');
    expect(init).toMatchObject({ method: 'POST', headers: { 'Content-Type': 'application/json' } });
    const body = JSON.parse(init?.body as string);
    expect(body).toMatchObject({
      company: 'Acme',
      role: 'Staff Engineer',
      status: 'wishlist',
      resume_id: 'resume-1',
      cover_letter_id: 'letter-1',
      match_score: 82,
      ats_score: 82,
      source: 'studio',
      applied_at: null,
    });
    expect(body.notes).toContain('4 keywords added');
    expect(toastMock.success).toHaveBeenCalledWith('Application added to wishlist', {
      description: 'Acme · Staff Engineer',
    });
  });

  it('creates an applied application with fallback labels and an applied_at timestamp', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(jsonResponse({}));
    renderClient({ summary: { ...summary, company: null, role: null, compatibility: undefined, resumeId: null, coverLetterId: null } });

    await user.click(screen.getByRole('button', { name: 'stub-applied' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    const body = JSON.parse(fetchMock.mock.calls[0][1]?.body as string);
    expect(body).toMatchObject({
      company: 'Unknown company',
      role: 'Unknown role',
      resume_id: null,
      cover_letter_id: null,
      match_score: null,
      applied_at: expect.any(String),
    });
    expect(toastMock.success).toHaveBeenCalledWith('Application marked as applied', {
      description: 'Unknown company · Unknown role',
    });
  });

  it('does nothing when there is no summary yet', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.mocked(fetch);
    renderClient({ summary: null });

    await user.click(screen.getByRole('button', { name: 'stub-wishlist' }));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(toastMock.success).not.toHaveBeenCalled();
  });

  it('surfaces the API error when creating an application fails', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(jsonResponse({ error: 'Quota exceeded' }, false));
    renderClient({ summary });

    await user.click(screen.getByRole('button', { name: 'stub-wishlist' }));

    await waitFor(() => expect(toastMock.error).toHaveBeenCalledWith('Could not save application', {
      description: 'Quota exceeded',
    }));
  });

  it('falls back to the generic message when the error payload is not JSON', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue({ ok: false, json: async () => { throw new Error('no json'); } } as unknown as Response);
    renderClient({ summary });

    await user.click(screen.getByRole('button', { name: 'stub-applied' }));

    await waitFor(() => expect(toastMock.error).toHaveBeenCalledWith('Could not save application', {
      description: 'Failed to save application',
    }));
  });

  it('downloads a PDF export and revokes the object URL', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue({
      ok: true,
      blob: async () => new Blob(['pdf'], { type: 'application/pdf' }),
    } as unknown as Response);
    renderClient({ summary, letter: 'Dear Acme' });

    await user.click(screen.getByRole('button', { name: 'stub-pdf' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    expect(fetchMock.mock.calls[0][0]).toBe('/eleva/api/export/cover-letter');
    expect(JSON.parse(fetchMock.mock.calls[0][1]?.body as string)).toMatchObject({
      content: 'Dear Acme',
      title: 'Cover Letter — Acme',
      company: 'Acme',
      role: 'Staff Engineer',
    });
    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test');
    expect(toastMock.success).toHaveBeenCalledWith('PDF exported');
  });

  it('downloads a DOCX export with a sanitized filename', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue({
      ok: true,
      blob: async () => new Blob(['docx']),
    } as unknown as Response);
    const { pipeline } = renderClient({ summary: { ...summary, company: 'Acme Corp' }, letter: 'Dear Acme' });

    await user.click(screen.getByRole('button', { name: 'stub-docx' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    expect(fetchMock.mock.calls[0][0]).toBe('/eleva/api/export/cover-letter-docx');
    expect(toastMock.success).toHaveBeenCalledWith('DOCX exported');
    expect(pipeline.letter).toBe('Dear Acme');
  });

  it('uses export fallbacks when there is no summary', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue({
      ok: true,
      blob: async () => new Blob(['pdf']),
    } as unknown as Response);
    renderClient({ summary: null, letter: 'Standalone letter' });

    await user.click(screen.getByRole('button', { name: 'stub-pdf' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    expect(JSON.parse(fetchMock.mock.calls[0][1]?.body as string)).toMatchObject({
      title: 'Cover Letter — Eleva',
      company: '',
      role: '',
    });
  });

  it('reports export failures', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue({ ok: false } as Response);
    renderClient({ summary, letter: 'Dear Acme' });

    await user.click(screen.getByRole('button', { name: 'stub-pdf' }));

    await waitFor(() => expect(toastMock.error).toHaveBeenCalledWith('Export failed', {
      description: 'PDF export failed',
    }));
  });

  it('does not export without a letter', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.mocked(fetch);
    renderClient({ summary, letter: '' });

    await user.click(screen.getByRole('button', { name: 'stub-pdf' }));
    await user.click(screen.getByRole('button', { name: 'stub-docx' }));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(toastMock.success).not.toHaveBeenCalled();
  });
});

describe('StudioClient — URL step synchronisation', () => {
  it('clears a stale step query when the pipeline is empty', async () => {
    navState.get.mockReturnValue('review');
    renderClient();

    await waitFor(() => expect(navState.replace).toHaveBeenCalledWith('/eleva/studio', { scroll: false }));
  });

  it('writes the current stage into the URL', async () => {
    renderClient({ steps: stepsWith({ extract: 'done', score: 'done' }) });

    await waitFor(() => expect(navState.replace).toHaveBeenCalledWith('/eleva/studio?step=improve', { scroll: false }));
  });

  it('omits the step query for the job stage', async () => {
    renderClient({ steps: stepsWith({}) });

    await waitFor(() => expect(navState.replace).toHaveBeenCalledWith('/eleva/studio', { scroll: false }));
  });

  it('does not rewrite the URL when the query already matches', async () => {
    navState.get.mockReturnValue('job');
    renderClient({ steps: stepsWith({}) });

    await waitFor(() => expect(screen.getByTestId('studio-results')).toBeInTheDocument());
    expect(navState.replace).not.toHaveBeenCalled();
  });

  it('reflects the in-flight application state on the results panel', async () => {
    const user = userEvent.setup();
    let resolveFetch: (value: Response) => void = () => undefined;
    vi.mocked(fetch).mockReturnValue(new Promise<Response>((resolve) => { resolveFetch = resolve; }));
    renderClient({ summary });

    await user.click(screen.getByRole('button', { name: 'stub-wishlist' }));

    await waitFor(() => expect(screen.getByTestId('studio-results')).toHaveAttribute('data-creating', 'wishlist'));
    resolveFetch(jsonResponse({}));
    await waitFor(() => expect(screen.getByTestId('studio-results')).toHaveAttribute('data-creating', ''));
  });
});
