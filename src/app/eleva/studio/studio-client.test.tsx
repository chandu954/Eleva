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

describe('StudioClient — job description gate and controls', () => {
  it('renders the idle editor with the base resume selected and Analyze disabled', () => {
    renderClient();

    expect(screen.getByRole('heading', { name: 'Optimize your resume for a job' })).toBeInTheDocument();
    expect(screen.getByText('Job description')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toHaveValue('resume-1');
    expect(screen.getByText('Base resume · base')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Analyze Job/ })).toBeDisabled();
    expect(screen.getByText('Tip: paste the full posting for the most accurate match.')).toBeInTheDocument();
    expect(screen.getByTestId('studio-results')).toHaveAttribute('data-tab', 'resume');
  });

  it('enables Analyze once the JD reaches 20 characters', async () => {
    const user = userEvent.setup();
    renderClient();

    const textarea = screen.getByPlaceholderText('Paste the job description here…');
    await user.type(textarea, 'too short');
    expect(screen.getByRole('button', { name: /Analyze Job/ })).toBeDisabled();

    await user.clear(textarea);
    await user.type(textarea, 'senior typescript engineer, backend platforms');
    expect(screen.getByRole('button', { name: /Analyze Job/ })).toBeEnabled();
    expect(screen.queryByText('Tip: paste the full posting for the most accurate match.')).not.toBeInTheDocument();
  });

  it('runs with the current JD and selected resume', async () => {
    const user = userEvent.setup();
    const { pipeline } = renderClient();
    const jd = 'senior typescript engineer, backend platforms, remote';

    fireEvent.change(screen.getByPlaceholderText('Paste the job description here…'), { target: { value: jd } });
    await user.selectOptions(screen.getByRole('combobox'), 'resume-2');
    await user.click(screen.getByRole('button', { name: /Analyze Job/ }));

    expect(pipeline.startRun).toHaveBeenCalledWith(jd, 'resume-2');
  });

  it('hides the resume selector and runs without a resume when none exist', async () => {
    const user = userEvent.setup();
    const { pipeline } = renderClient({}, []);

    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText('Paste the job description here…'), {
      target: { value: 'a job description long enough to pass' },
    });
    await user.click(screen.getByRole('button', { name: /Analyze Job/ }));

    expect(pipeline.startRun).toHaveBeenCalledWith('a job description long enough to pass', undefined);
  });

  it('falls back to the first resume when no base resume is flagged', async () => {
    const user = userEvent.setup();
    const { pipeline } = renderClient({}, [
      { id: 'r-a', name: 'First', target_role: null, is_base_resume: false },
      { id: 'r-b', name: 'Second', target_role: null, is_base_resume: false },
    ]);

    expect(screen.getByRole('combobox')).toHaveValue('r-a');
    fireEvent.change(screen.getByPlaceholderText('Paste the job description here…'), {
      target: { value: 'a job description long enough to pass' },
    });
    await user.click(screen.getByRole('button', { name: /Analyze Job/ }));
    expect(pipeline.startRun).toHaveBeenCalledWith(expect.any(String), 'r-a');
  });

  it('collapses the JD after a run starts and can expand it again', async () => {
    const user = userEvent.setup();
    const { pipeline } = renderClient();
    const options = hookMock.mock.calls[0][0];
    fireEvent.change(screen.getByPlaceholderText('Paste the job description here…'), {
      target: { value: 'one two three words' },
    });

    act(() => options?.onRunStart?.());

    expect(screen.queryByPlaceholderText('Paste the job description here…')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'View' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'View' }));
    expect(screen.getByPlaceholderText('Paste the job description here…')).toBeInTheDocument();
    expect(screen.getByText('4 words')).toBeInTheDocument();
    expect(pipeline.startRun).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Hide' }));
    expect(screen.queryByPlaceholderText('Paste the job description here…')).not.toBeInTheDocument();
  });

  it('shows the abort control while running and calls abort', async () => {
    const user = userEvent.setup();
    const { pipeline } = renderClient({ running: true, steps: stepsWith({ extract: 'running' }) });

    expect(screen.getByText('Analyzing…')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Paste the job description here…')).toBeDisabled();
    expect(screen.getByRole('button', { name: /Reset/ })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: /Abort/ }));
    expect(pipeline.abort).toHaveBeenCalledOnce();
    expect(screen.queryByRole('button', { name: /Analyze Job/ })).not.toBeInTheDocument();
  });

  it('resets the JD and pipeline state', async () => {
    const user = userEvent.setup();
    const { pipeline } = renderClient();
    const textarea = screen.getByPlaceholderText('Paste the job description here…');
    fireEvent.change(textarea, { target: { value: 'a job description long enough to pass' } });
    expect(textarea).toHaveValue('a job description long enough to pass');

    await user.click(screen.getByRole('button', { name: /Reset/ }));

    expect(pipeline.reset).toHaveBeenCalledOnce();
    expect(screen.getByPlaceholderText('Paste the job description here…')).toHaveValue('');
  });

  it('resets the parsed/collapsed state when Reset is pressed after a run', async () => {
    const user = userEvent.setup();
    const { pipeline } = renderClient({ steps: stepsWith({ extract: 'done' }) });
    const options = hookMock.mock.calls[0][0];
    act(() => options?.onRunStart?.());
    expect(screen.getByRole('button', { name: 'View' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Reset/ }));

    expect(pipeline.reset).toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'View' })).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText('Paste the job description here…')).toBeInTheDocument();
  });
});

describe('StudioClient — progress stages', () => {
  it('renders the idle pipeline state', () => {
    renderClient();
    expect(screen.getByText('Ready')).toBeInTheDocument();
    for (const label of ['Job analyzed', 'Resume analysis', 'Improve', 'Review', 'Ready to Apply']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    expect(screen.queryByText('…')).not.toBeInTheDocument();
    expect(screen.getByTestId('step-log')).toHaveTextContent('logs:0');
  });

  it('renders in-progress steps and the running micro state with progress fallback', () => {
    renderClient({
      running: true,
      steps: stepsWith({ extract: 'running' }).map((step) =>
        step.step === 'extract' ? { ...step, progress: 42, microStatus: 'waiting' } : step),
    });

    expect(screen.getByText('Analyzing…')).toBeInTheDocument();
    expect(screen.getByText('42%')).toBeInTheDocument();
    expect(screen.getByText('Waiting for AI…')).toBeInTheDocument();
  });

  it('shows micro text over the generic label and hides the line when complete', () => {
    const { rerender } = renderClient({
      running: true,
      steps: stepsWith({ extract: 'running' }).map((step) =>
        step.step === 'extract' ? { ...step, microText: 'Reading the posting', microStatus: 'waiting' } : step),
    });

    expect(screen.getByText('Reading the posting%')).toBeInTheDocument();
    expect(screen.getByText('Reading the posting')).toBeInTheDocument();

    const pipeline = makePipeline({
      running: true,
      steps: stepsWith({ extract: 'running' }).map((step) =>
        step.step === 'extract' ? { ...step, microText: 'Reading the posting', microStatus: 'complete' } : step),
    });
    hookMock.mockReturnValue(pipeline);
    rerender(<StudioClient resumes={resumes} />);
    expect(screen.getByText('Reading the posting%')).toBeInTheDocument();
    expect(screen.queryByText('Reading the posting')).not.toBeInTheDocument();
  });

  it('renders partial and done stages with ellipsis and timing', () => {
    renderClient({
      steps: stepsWith({ extract: 'done', plan: 'done' }),
      stepTimings: { extract: 1500, plan: 1000, tailor: 2000 },
    });

    expect(screen.getByText('In progress')).toBeInTheDocument();
    expect(screen.getByText('1.5s')).toBeInTheDocument();
    expect(screen.getByText('…')).toBeInTheDocument();
  });

  it('renders the completed summary, elapsed time and done-step counter', () => {
    renderClient({
      steps: stepsWith({ extract: 'done', score: 'done' }),
      summary,
      elapsed: '9.2',
      stepTimings: { extract: 900 },
    });

    expect(screen.getByText('Done in 9.2s')).toBeInTheDocument();
    expect(screen.getByText('82%')).toBeInTheDocument();
    expect(screen.getByText('2/7 steps')).toBeInTheDocument();
    expect(screen.getByText('0.9s')).toBeInTheDocument();
  });

  it('renders an error stage, paused headline and partial-progress note', () => {
    renderClient({
      steps: stepsWith({ extract: 'error' }).map((step) =>
        step.step === 'extract' ? { ...step, error: 'Reading failed', errorDetails: { traceId: 'trace-1', reason: 'timeout' } } : step),
    });

    expect(screen.getByText('Paused')).toBeInTheDocument();
    expect(screen.getByText('Resume safe')).toBeInTheDocument();
    expect(screen.getByText('Reading failed')).toBeInTheDocument();
    expect(screen.getByText('Provider timeout · 93% confidence')).toBeInTheDocument();
    expect(screen.getByText('Partial progress saved.')).toBeInTheDocument();
  });

  it('uses the friendly error diagnosis for auth failures and falls back for unknown reasons', () => {
    const { rerender } = renderClient({
      steps: stepsWith({ score: 'error' }).map((step) =>
        step.step === 'score' ? { ...step, error: 'bad key', errorDetails: { reason: 'auth' } } : step),
    });
    expect(screen.getByText('Authentication failed · 97% confidence')).toBeInTheDocument();

    hookMock.mockReturnValue(makePipeline({
      steps: stepsWith({ score: 'error' }).map((step) =>
        step.step === 'score' ? { ...step, error: 'mystery', errorDetails: { reason: 'cosmic' } } : step),
    }));
    rerender(<StudioClient resumes={resumes} />);
    expect(screen.getByText('Unknown error · — confidence')).toBeInTheDocument();
  });

  it('opens, closes and copies the technical error details', async () => {
    const user = userEvent.setup();
    const clipboardSpy = vi.spyOn(navigator.clipboard, 'writeText');
    const { pipeline } = renderClient({
      steps: stepsWith({ extract: 'error' }).map((step) =>
        step.step === 'extract'
          ? {
              ...step,
              label: 'Analyzing the job description',
              error: 'Provider exploded',
              errorDetails: {
                traceId: 'trace-9',
                reason: 'provider',
                rawMessage: 'upstream 502',
                model: 'gpt-x',
                provider: 'openai',
                elapsed: '2.1s',
              },
            }
          : step),
    });

    await user.click(screen.getByRole('button', { name: /Technical details/ }));
    expect(screen.getByText('upstream 502')).toBeInTheDocument();
    expect(screen.getByText('gpt-x')).toBeInTheDocument();
    expect(screen.getByText('openai')).toBeInTheDocument();
    expect(screen.getByText('2.1s')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Technical details/ }));
    expect(screen.queryByText('upstream 502')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^Copy$/ }));
    expect(clipboardSpy).toHaveBeenCalledWith(expect.stringContaining('Trace: trace-9'));
    expect(clipboardSpy).toHaveBeenCalledWith(expect.stringContaining('Model: gpt-x'));
    expect(toastCalls).toHaveBeenCalledWith('Copied', { duration: 2000 });

    fireEvent.click(screen.getByRole('button', { name: /Retry/ }));
    expect(pipeline.retryFrom).toHaveBeenCalledWith('extract', '', 'resume-1');
  });

  it('switches tabs when a finished stage is clicked', async () => {
    const user = userEvent.setup();
    renderClient({
      steps: stepsWith({
        extract: 'done',
        score: 'done',
        plan: 'done',
        tailor: 'done',
        rescore: 'done',
        review: 'done',
        letter: 'done',
      }),
    });

    await user.click(screen.getByText('Review'));
    expect(screen.getByTestId('studio-results')).toHaveAttribute('data-tab', 'ats');

    await user.click(screen.getByText('Ready to Apply'));
    expect(screen.getByTestId('studio-results')).toHaveAttribute('data-tab', 'letter');

    await user.click(screen.getByText('Improve'));
    expect(screen.getByTestId('studio-results')).toHaveAttribute('data-tab', 'resume');
  });

  it('does not switch tabs for idle stages', async () => {
    const user = userEvent.setup();
    renderClient({ steps: stepsWith({}) });

    await user.click(screen.getByText('Review'));
    expect(screen.getByTestId('studio-results')).toHaveAttribute('data-tab', 'resume');
  });
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
