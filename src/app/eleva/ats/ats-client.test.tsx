// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const supabaseState = vi.hoisted(() => ({
  resumeRow: null as Record<string, unknown> | null,
  freshScores: [] as Record<string, unknown>[],
  deleteError: null as Error | null,
}));

const aiStatusMock = vi.hoisted(() => ({
  reportAiRun: vi.fn(),
  reportAiDone: vi.fn(),
}));

vi.mock('framer-motion', async () => {
  const React = await import('react');
  const cache = new Map<string, React.ComponentType<Record<string, unknown>>>();
  const motion = new Proxy({}, {
    get: (_target, tag: string) => {
      if (!cache.has(tag)) {
        cache.set(tag, (props: Record<string, unknown>) => {
          const { initial, animate, exit, transition, whileHover, whileTap, whileInView, viewport, variants, layout, layoutId, ...rest } = props;
          void initial; void animate; void exit; void transition; void whileHover; void whileTap;
          void whileInView; void viewport; void variants; void layout; void layoutId;
          return React.createElement(tag, rest);
        });
      }
      return cache.get(tag);
    },
  });
  return { motion, AnimatePresence: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children) };
});

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@supabase/ssr', () => ({
  createBrowserClient: () => ({
    from: (table: string) => {
      if (table === 'resumes') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: supabaseState.resumeRow, error: null }),
            }),
          }),
        };
      }
      if (table === 'ats_scores') {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                limit: async () => ({ data: supabaseState.freshScores, error: null }),
              }),
            }),
          }),
          delete: () => ({
            eq: async () => ({ error: supabaseState.deleteError }),
          }),
        };
      }
      throw new Error(`Unexpected table: ${table}`);
    },
  }),
}));

vi.mock('next/link', async () => {
  const React = await import('react');
  return {
    default: ({ href, children, ...rest }: { href?: string; children?: import('react').ReactNode } & Record<string, unknown>) =>
      React.createElement('a', { href, ...rest }, children),
  };
});

vi.mock('../_lib/ai-status', () => aiStatusMock);

import { toast } from 'sonner';
import { AtsClient, type AtsReport } from './ats-client';

const reports: AtsReport[] = [
  {
    id: 'report-1',
    resume_id: 'resume-1',
    job_id: 'job-1',
    overall: 92,
    keyword: 88,
    formatting: 95,
    readability: 90,
    impact: 85,
    recruiter: 80,
    matched: ['React', 'TypeScript'],
    missing: ['GraphQL', 'Docker'],
    suggestions: [
      { type: 'warning', text: 'Add measurable impact', action: 'Quantify results' },
      { type: 'success', text: 'Great stack match', action: 'Keep it' },
    ],
    raw: { summary: 'Strong fit for the role.' },
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'report-2',
    resume_id: 'resume-2',
    job_id: null,
    overall: 71,
    keyword: 65,
    formatting: 78,
    readability: 72,
    impact: 70,
    recruiter: 68,
    matched: ['Go', 'Kubernetes', 'Postgres', 'gRPC'],
    missing: ['Terraform'],
    suggestions: [],
    raw: { summary: 'Needs work on keywords.' },
    created_at: '2026-01-02T00:00:00.000Z',
  },
];

const resumes = [
  { id: 'resume-1', name: 'Base resume', target_role: 'Engineer', is_base_resume: true },
  { id: 'resume-2', name: 'Tailored resume', target_role: null, is_base_resume: false },
];

const freshReport: AtsReport = {
  id: 'report-3',
  resume_id: 'resume-1',
  overall: 88,
  keyword: 86,
  formatting: 90,
  readability: 88,
  impact: 84,
  recruiter: 82,
  matched: ['Go', 'AWS'],
  missing: ['Kafka'],
  suggestions: [{ type: 'primary', text: 'Mention Kafka', action: 'Add to skills' }],
  created_at: '2026-01-03T00:00:00.000Z',
};

function reportRow(summary: string) {
  const row = screen.getByText(summary).closest('[role="button"]');
  expect(row).not.toBeNull();
  return row as HTMLElement;
}

async function runScore(
  user: ReturnType<typeof userEvent.setup>,
  jd = 'We need a senior backend engineer with Go and Kubernetes experience.',
) {
  await user.type(screen.getByPlaceholderText('Paste the full JD…'), jd);
  await user.click(screen.getByRole('button', { name: 'Score now' }));
}

describe('AtsClient', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    supabaseState.resumeRow = null;
    supabaseState.freshScores = [];
    supabaseState.deleteError = null;
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('confirm', vi.fn(() => true));
  });

  it('renders history, the selected report detail and quick fixes', () => {
    render(<AtsClient reports={reports} resumes={resumes} />);

    expect(screen.getByRole('heading', { name: 'Match your resume to any JD.' })).toBeInTheDocument();
    expect(screen.getByText('2 reports · real-time scoring powered by AI.')).toBeInTheDocument();

    const select = screen.getByRole('combobox');
    expect(select).toHaveValue('resume-1');
    expect(screen.getByRole('option', { name: 'Base resume · base' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Tailored resume' })).toBeInTheDocument();

    expect(screen.getByText('2 matched · 2 missing')).toBeInTheDocument();
    expect(screen.getByText('4 matched · 1 missing')).toBeInTheDocument();

    expect(screen.getByText('Recruiter summary')).toBeInTheDocument();
    expect(screen.getByText('Strong fit for the role.')).toBeInTheDocument();
    expect(screen.getByText('Matched')).toBeInTheDocument();
    expect(screen.getByText('Missing')).toBeInTheDocument();
    expect(screen.getAllByText('React').length).toBeGreaterThan(0);
    expect(screen.getAllByText('GraphQL')).toHaveLength(2);
    expect(screen.getAllByText('Add measurable impact')).toHaveLength(2);

    expect(screen.getByText('Missing Keywords')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Add' })).toHaveLength(2);
    expect(screen.getByRole('link', { name: /Open Editor/ })).toHaveAttribute('href', '/eleva/editor');
  });

  it('adds a missing keyword to the selected resume and prevents duplicate adds', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, alreadyPresent: false }),
    });
    render(<AtsClient reports={reports} resumes={resumes} />);

    const addButtons = screen.getAllByRole('button', { name: 'Add' });
    await user.click(addButtons[0]);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/eleva/api/tool/ats/add-keyword', expect.objectContaining({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resumeId: 'resume-1', keyword: 'GraphQL' }),
    })));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Added GraphQL to resume skills'));
    expect(screen.getByRole('button', { name: 'Added' })).toBeDisabled();
  });

  it('shows a safe error when adding a keyword fails', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Resume not found' }),
    });
    render(<AtsClient reports={reports} resumes={resumes} />);

    await user.click(screen.getAllByRole('button', { name: 'Add' })[0]);

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Could not add keyword', {
      description: 'Resume not found',
    }));
    expect(screen.getAllByRole('button', { name: 'Add' })).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: 'Add' }).every((button) => !button.hasAttribute('disabled'))).toBe(true);
  });

  it('switches reports with clicks and keyboard activation', async () => {
    const user = userEvent.setup();
    render(<AtsClient reports={reports} resumes={resumes} />);

    await user.click(screen.getByText('4 matched · 1 missing'));
    expect(screen.getByText('Needs work on keywords.')).toBeInTheDocument();

    fireEvent.keyDown(screen.getByText('2 matched · 2 missing'), { key: 'Enter' });
    expect(screen.getByText('Strong fit for the role.')).toBeInTheDocument();

    fireEvent.keyDown(screen.getByText('4 matched · 1 missing'), { key: ' ' });
    expect(screen.getByText('Needs work on keywords.')).toBeInTheDocument();
  });

  it('deletes a report after confirmation', async () => {
    const user = userEvent.setup();
    render(<AtsClient reports={reports} resumes={resumes} />);

    const row = reportRow('2 matched · 2 missing');
    await user.click(row.querySelector('button') as HTMLButtonElement);

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Report deleted'));
    expect(confirm).toHaveBeenCalledWith('Delete this report?');
    expect(screen.queryByText('2 matched · 2 missing')).not.toBeInTheDocument();
    expect(screen.getByText('1 report · real-time scoring powered by AI.')).toBeInTheDocument();
  });

  it('keeps the report and surfaces delete failures', async () => {
    supabaseState.deleteError = new Error('permission denied');
    const user = userEvent.setup();
    render(<AtsClient reports={reports} resumes={resumes} />);

    const row = reportRow('4 matched · 1 missing');
    await user.click(row.querySelector('button') as HTMLButtonElement);

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Delete failed', { description: 'permission denied' }));
    expect(screen.getByText('4 matched · 1 missing')).toBeInTheDocument();
  });

  it('does nothing when report deletion is cancelled', async () => {
    vi.stubGlobal('confirm', vi.fn(() => false));
    const user = userEvent.setup();
    render(<AtsClient reports={reports} resumes={resumes} />);

    const row = reportRow('2 matched · 2 missing');
    await user.click(row.querySelector('button') as HTMLButtonElement);

    expect(toast.success).not.toHaveBeenCalled();
    expect(screen.getByText('2 matched · 2 missing')).toBeInTheDocument();
  });

  it('renders empty states when there are no reports or resumes', () => {
    render(<AtsClient reports={[]} resumes={[]} />);

    expect(screen.getByText('0 reports · real-time scoring powered by AI.')).toBeInTheDocument();
    expect(screen.getByText('No reports yet. Run one to get started.')).toBeInTheDocument();
    expect(screen.getByText('No report selected')).toBeInTheDocument();
    expect(screen.getByText('Run a score to see quick fixes.')).toBeInTheDocument();
    expect(screen.getByText('Create a resume first to run ATS.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Score now' })).not.toBeInTheDocument();
  });

  it('rejects short job descriptions before calling the API', async () => {
    const user = userEvent.setup();
    render(<AtsClient reports={[]} resumes={resumes} />);

    await user.type(screen.getByPlaceholderText('Paste the full JD…'), '1234567890123456789');
    await user.click(screen.getByRole('button', { name: 'Score now' }));

    expect(toast.error).toHaveBeenCalledWith('Paste a JD (min 20 chars)');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('scores a resume, shows progress and reloads the history', async () => {
    supabaseState.resumeRow = {
      name: 'Base resume',
      target_role: 'Engineer',
      professional_summary: 'Backend engineer',
      work_experience: [],
      skills: ['Go'],
      projects: [],
      education: [],
    };
    supabaseState.freshScores = [freshReport];
    let resolveFetch: (value: Response) => void = () => {};
    fetchMock.mockReturnValue(new Promise<Response>((resolve) => { resolveFetch = resolve; }));
    const user = userEvent.setup();
    render(<AtsClient reports={[]} resumes={resumes} />);

    await user.selectOptions(screen.getByRole('combobox'), 'resume-2');
    await runScore(user);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(screen.getByText('Scoring…')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Scoring…' })).toBeDisabled();
    expect(aiStatusMock.reportAiRun).toHaveBeenCalledWith('Scoring resume', 'ats-score');

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/eleva/api/tool/score');
    expect(init.method).toBe('POST');
    const body = JSON.parse(init.body as string);
    expect(body).toMatchObject({ resumeId: 'resume-2', save: true });
    expect(body.jobDescription).toContain('senior backend engineer');
    expect(body.resume).toContain('Base resume');

    resolveFetch({ ok: true, json: async () => ({ overall: 88 }) } as unknown as Response);

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Scored 88%'));
    expect(screen.getByText('1 report · real-time scoring powered by AI.')).toBeInTheDocument();
    expect(screen.getAllByText('88%').length).toBeGreaterThan(0);
    expect(aiStatusMock.reportAiDone).toHaveBeenCalledWith('ATS score', expect.any(Number), 'ats-score', false);
  });

  it('surfaces score API failures and resets the running state', async () => {
    fetchMock.mockResolvedValue({ ok: false, json: async () => ({ error: 'Bad JD' }) } as unknown as Response);
    const user = userEvent.setup();
    render(<AtsClient reports={[]} resumes={resumes} />);

    await runScore(user);

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Score failed', { description: 'Bad JD' }));
    expect(screen.getByRole('button', { name: 'Score now' })).toBeEnabled();
    expect(aiStatusMock.reportAiDone).toHaveBeenCalledWith('ATS score', expect.any(Number), 'ats-score', true);
    expect(screen.getByText('0 reports · real-time scoring powered by AI.')).toBeInTheDocument();
  });
});
