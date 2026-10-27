// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('framer-motion', async () => {
  const React = await import('react');
  const cache = new Map<string, React.ComponentType<Record<string, unknown>>>();
  const motion = new Proxy(
    {},
    {
      get: (_target, tag: string) => {
        if (!cache.has(tag)) {
          cache.set(tag, (props: Record<string, unknown>) => {
            const {
              initial,
              animate,
              exit,
              transition,
              whileHover,
              whileTap,
              variants,
              layout,
              layoutId,
              ...rest
            } = props;
            void initial;
            void animate;
            void exit;
            void transition;
            void whileHover;
            void whileTap;
            void variants;
            void layout;
            void layoutId;
            return React.createElement(tag, rest);
          });
        }
        return cache.get(tag);
      },
    },
  );

  return {
    motion,
    AnimatePresence: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
  };
});

const {
  refreshMock,
  toastMock,
  createClientMock,
  singleMock,
  updateResumeMock,
  createJobMock,
  deleteJobMock,
  formatJobListingMock,
  dispatchMock,
} = vi.hoisted(() => ({
  refreshMock: vi.fn(),
  toastMock: vi.fn(),
  createClientMock: vi.fn(),
  singleMock: vi.fn(),
  updateResumeMock: vi.fn(),
  createJobMock: vi.fn(),
  deleteJobMock: vi.fn(),
  formatJobListingMock: vi.fn(),
  dispatchMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: refreshMock,
  }),
}));

vi.mock('@/hooks/use-toast', () => ({
  toast: toastMock,
}));

vi.mock('@/utils/supabase/client', () => ({
  createClient: createClientMock,
}));

vi.mock('@/utils/actions/resumes/actions', () => ({
  updateResume: updateResumeMock,
}));

vi.mock('@/utils/actions/jobs/actions', () => ({
  createJob: createJobMock,
  deleteJob: deleteJobMock,
}));

vi.mock('@/utils/actions/jobs/ai', () => ({
  formatJobListing: formatJobListingMock,
}));

vi.mock('../../editor/resume-editor-context', () => ({
  useResumeContext: () => ({
    state: {
      resume: { id: 'resume-1' },
      isSaving: false,
      isDeleting: false,
      hasUnsavedChanges: false,
    },
    dispatch: dispatchMock,
  }),
}));

import { Accordion } from '@/components/ui/accordion';
import type { Job, Resume } from '@/lib/types';
import { TailoredJobAccordion, TailoredJobCard } from './tailored-job-card';

const job: Job = {
  id: 'job-1',
  user_id: 'user-1',
  company_name: 'Acme Corp',
  position_title: 'Senior Engineer',
  job_url: 'https://acme.example/jobs/1',
  description: 'Build reliable distributed systems.',
  location: 'Toronto',
  salary_range: '$150,000 - $180,000',
  keywords: ['React', 'TypeScript', 'Node.js'],
  work_location: 'in_person',
  employment_type: 'full_time',
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
  is_active: true,
};

const resume = {
  id: 'resume-1',
  user_id: 'user-1',
  job_id: 'job-1',
  is_base_resume: false,
} as Resume;

const formattedJob = {
  company_name: 'Acme Corp',
  position_title: 'Senior Engineer',
  job_url: '',
  description: 'Build reliable distributed systems.',
  location: 'Toronto',
  salary_range: '$150,000 - $180,000',
  keywords: ['React'],
  work_location: 'in_person',
  employment_type: 'full_time',
};

const validDescription =
  'We are looking for a senior engineer to build reliable distributed systems with React and TypeScript.';

function mockSupabaseJobResponse() {
  createClientMock.mockReturnValue({
    fromRateLimit: undefined,
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: singleMock,
        })),
      })),
    })),
  });
}

function renderCreateCard() {
  return render(<TailoredJobCard jobId={null} job={null} isLoading={false} />);
}

async function openCreateDialog() {
  const user = userEvent.setup({ delay: null });
  renderCreateCard();
  await user.click(
    screen.getByRole('button', { name: /create (new )?job listing/i }),
  );
  return user;
}

async function submitDescription(user: ReturnType<typeof userEvent.setup>) {
  await user.type(
    screen.getByPlaceholderText('Paste the job description here...'),
    validDescription,
  );
  await user.click(screen.getByRole('button', { name: 'Create with AI' }));
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();

  mockSupabaseJobResponse();
  singleMock.mockResolvedValue({ data: job, error: null });
  updateResumeMock.mockResolvedValue({ ...resume, job_id: 'job-new' });
  createJobMock.mockResolvedValue({ id: 'job-new' });
  deleteJobMock.mockResolvedValue(undefined);
  formatJobListingMock.mockResolvedValue(formattedJob);
});

describe('TailoredJobCard', () => {
  it('shows the create prompt when no job is linked and opens the dialog', async () => {
    const user = userEvent.setup({ delay: null });
    renderCreateCard();

    expect(screen.getByText('No Job Currently Linked')).toBeInTheDocument();
    expect(screen.getByText(/Create a new job listing/i)).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: /create (new )?job listing/i }),
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Create New Job Listing')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() =>
      expect(screen.queryByText('Create New Job Listing')).not.toBeInTheDocument(),
    );
  });

  it('validates the description before calling the AI formatter', async () => {
    const user = await openCreateDialog();

    await user.click(screen.getByRole('button', { name: 'Create with AI' }));

    expect(toastMock).toHaveBeenCalledWith({
      title: 'Validation Error',
      description: 'Job description is required',
      variant: 'destructive',
    });
    expect(screen.getByRole('alert')).toHaveTextContent('Job description is required');
    expect(formatJobListingMock).not.toHaveBeenCalled();

    const textarea = screen.getByPlaceholderText('Paste the job description here...');
    await user.type(textarea, 'Too short');
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Job description should be at least 50 characters',
    );
    expect(screen.getByRole('button', { name: 'Create with AI' })).toBeDisabled();

    await user.type(textarea, ' and now the description is comfortably long enough to pass.');
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Create with AI' })).toBeEnabled();
  });

  it('formats, creates and links a job using the stored model and API keys', async () => {
    localStorage.setItem('eleva-default-model', 'openai/gpt-5.4-mini');
    localStorage.setItem(
      'eleva-api-keys',
      JSON.stringify([{ provider: 'openai', key: 'sk-test' }]),
    );

    const user = await openCreateDialog();
    await submitDescription(user);

    await waitFor(() =>
      expect(formatJobListingMock).toHaveBeenCalledWith(validDescription, {
        model: 'openai/gpt-5.4-mini',
        apiKeys: [{ provider: 'openai', key: 'sk-test' }],
      }),
    );
    await waitFor(() => expect(createJobMock).toHaveBeenCalledWith(formattedJob));
    expect(dispatchMock).toHaveBeenCalledWith({
      type: 'UPDATE_FIELD',
      field: 'job_id',
      value: 'job-new',
    });
    expect(updateResumeMock).toHaveBeenCalledWith(
      'resume-1',
      expect.objectContaining({ id: 'resume-1', job_id: 'job-new' }),
    );
    await waitFor(() => expect(refreshMock).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(screen.queryByText('Create New Job Listing')).not.toBeInTheDocument(),
    );
    expect(toastMock).not.toHaveBeenCalled();
  });

  it('exposes Formatting and Creating progress states while work is pending', async () => {
    let resolveFormat!: (value: unknown) => void;
    let resolveCreate!: (value: unknown) => void;
    formatJobListingMock.mockReturnValue(
      new Promise((resolve) => {
        resolveFormat = resolve;
      }),
    );
    createJobMock.mockReturnValue(
      new Promise((resolve) => {
        resolveCreate = resolve;
      }),
    );

    const user = await openCreateDialog();
    await user.type(
      screen.getByPlaceholderText('Paste the job description here...'),
      validDescription,
    );
    await user.click(screen.getByRole('button', { name: 'Create with AI' }));

    const formattingButton = await screen.findByRole('button', { name: 'Formatting...' });
    expect(formattingButton).toBeDisabled();
    expect(formattingButton).toHaveAttribute('aria-busy', 'true');

    await act(async () => {
      resolveFormat(formattedJob);
    });
    const creatingButton = await screen.findByRole('button', { name: 'Creating...' });
    expect(creatingButton).toBeDisabled();
    expect(creatingButton).toHaveAttribute('aria-busy', 'true');

    await act(async () => {
      resolveCreate({ id: 'job-new' });
    });
    await waitFor(() => expect(updateResumeMock).toHaveBeenCalled());
    await waitFor(() => expect(refreshMock).toHaveBeenCalledTimes(1));
  });

  it('falls back to empty API keys when stored JSON is invalid', async () => {
    localStorage.setItem('eleva-api-keys', '{not-json');
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const user = await openCreateDialog();
    await submitDescription(user);

    await waitFor(() =>
      expect(formatJobListingMock).toHaveBeenCalledWith(validDescription, {
        model: '',
        apiKeys: [],
      }),
    );
    expect(consoleError).toHaveBeenCalledWith('Error parsing API keys:', expect.any(Error));
    consoleError.mockRestore();
  });

  it('shows a destructive toast when AI formatting fails and clears the description', async () => {
    formatJobListingMock.mockRejectedValue(new Error('AI service unavailable'));
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const user = await openCreateDialog();
    await submitDescription(user);

    await waitFor(() =>
      expect(toastMock).toHaveBeenCalledWith({
        title: 'Error',
        description: 'AI service unavailable',
        variant: 'destructive',
      }),
    );
    expect(createJobMock).not.toHaveBeenCalled();
    expect(updateResumeMock).not.toHaveBeenCalled();
    expect(refreshMock).not.toHaveBeenCalled();
    expect(screen.getByPlaceholderText('Paste the job description here...')).toHaveValue('');
    expect(screen.getByText('Create New Job Listing')).toBeInTheDocument();
    consoleError.mockRestore();
  });

  it('shows a destructive toast when job creation fails', async () => {
    createJobMock.mockRejectedValue(new Error('insert failed'));
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const user = await openCreateDialog();
    await submitDescription(user);

    await waitFor(() =>
      expect(toastMock).toHaveBeenCalledWith({
        title: 'Error',
        description: 'insert failed',
        variant: 'destructive',
      }),
    );
    expect(dispatchMock).not.toHaveBeenCalled();
    expect(updateResumeMock).not.toHaveBeenCalled();
    expect(refreshMock).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it('uses a generic error message for non-Error creation failures', async () => {
    createJobMock.mockRejectedValue('nope');
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const user = await openCreateDialog();
    await submitDescription(user);

    await waitFor(() =>
      expect(toastMock).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Failed to create job',
        variant: 'destructive',
      }),
    );
    consoleError.mockRestore();
  });

  it('fetches job details internally when no external job is supplied', async () => {
    let resolveJob!: (value: unknown) => void;
    singleMock.mockReturnValue(
      new Promise((resolve) => {
        resolveJob = resolve;
      }),
    );

    render(<TailoredJobCard jobId="job-1" />);

    expect(
      screen.getByRole('status', { name: 'Loading job details' }),
    ).toBeInTheDocument();
    expect(createClientMock).toHaveBeenCalledTimes(1);
    expect(singleMock).toHaveBeenCalled();

    await act(async () => {
      resolveJob({ data: job, error: null });
    });

    expect(await screen.findByText('$150,000 - $180,000')).toBeInTheDocument();
    expect(screen.getByText('Toronto')).toBeInTheDocument();
    expect(screen.getByText('in person')).toBeInTheDocument();
    expect(screen.getByText('Build reliable distributed systems.')).toBeInTheDocument();
    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText('TypeScript')).toBeInTheDocument();
  });

  it('renders a missing-row error state for PGRST116 and retries with refresh', async () => {
    singleMock.mockResolvedValue({
      data: null,
      error: { code: 'PGRST116', message: 'No rows returned' },
    });
    const user = userEvent.setup({ delay: null });

    render(<TailoredJobCard jobId="job-1" />);

    expect(await screen.findByText('Unable to Load Job')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Try Again' }));
    expect(refreshMock).toHaveBeenCalledTimes(1);
  });

  it('renders the error state when the job fetch rejects', async () => {
    singleMock.mockRejectedValue(new Error('network failure'));
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    render(<TailoredJobCard jobId="job-1" />);

    expect(await screen.findByText('Unable to Load Job')).toBeInTheDocument();
    expect(consoleError).toHaveBeenCalledWith('Error fetching job:', expect.any(Error));
    consoleError.mockRestore();
  });

  it('renders supplied job details without creating a Supabase client', () => {
    render(<TailoredJobCard jobId="job-1" job={job} isLoading={false} />);

    expect(createClientMock).not.toHaveBeenCalled();
    expect(screen.getByText('$150,000 - $180,000')).toBeInTheDocument();
    expect(screen.getByText('Toronto')).toBeInTheDocument();
    expect(screen.getByText('in person')).toBeInTheDocument();
    expect(screen.getByText('full time')).toBeInTheDocument();
    expect(screen.getByText('Build reliable distributed systems.')).toBeInTheDocument();
    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText('Node.js')).toBeInTheDocument();
  });

  it('shows fallback labels for missing optional job fields', () => {
    const sparseJob: Job = {
      ...job,
      description: null,
      location: null,
      salary_range: null,
      keywords: [],
      work_location: null,
      employment_type: null,
    };

    render(<TailoredJobCard jobId="job-1" job={sparseJob} isLoading={false} />);

    expect(screen.getByText('Location not specified')).toBeInTheDocument();
    expect(screen.getByText('Not specified')).toBeInTheDocument();
    expect(screen.getByText('Salary not specified')).toBeInTheDocument();
    expect(screen.getByText('Employment type not specified')).toBeInTheDocument();
    expect(screen.queryByText('Description')).not.toBeInTheDocument();
  });

  it('shows the loading skeleton while an external job is loading', () => {
    render(<TailoredJobCard jobId="job-1" job={job} isLoading />);

    expect(
      screen.getByRole('status', { name: 'Loading job details' }),
    ).toBeInTheDocument();
    expect(screen.queryByText('$150,000 - $180,000')).not.toBeInTheDocument();
  });
});

describe('TailoredJobAccordion', () => {
  it('renders nothing for base resumes', () => {
    render(
      <Accordion type="single" collapsible>
        <TailoredJobAccordion
          resume={{ ...resume, is_base_resume: true }}
          job={job}
          isLoading={false}
        />
      </Accordion>,
    );

    expect(screen.queryByText('Senior Engineer')).not.toBeInTheDocument();
    expect(screen.queryByText('Target Job')).not.toBeInTheDocument();
  });

  it('shows the job title and company, then deletes the job on request', async () => {
    const user = userEvent.setup({ delay: null });
    let resolveDelete!: (value: unknown) => void;
    deleteJobMock.mockReturnValue(
      new Promise((resolve) => {
        resolveDelete = resolve;
      }),
    );

    render(
      <Accordion type="single" collapsible>
        <TailoredJobAccordion resume={resume} job={job} isLoading={false} />
      </Accordion>,
    );

    expect(screen.getByText('Senior Engineer')).toBeInTheDocument();
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Senior Engineer/ }));
    expect(await screen.findByText('$150,000 - $180,000')).toBeInTheDocument();

    const deleteButton = screen.getByRole('button', { name: 'Delete Job' });
    await user.click(deleteButton);

    expect(deleteJobMock).toHaveBeenCalledWith('job-1');
    expect(deleteButton).toBeDisabled();

    await act(async () => {
      resolveDelete(undefined);
    });
    await waitFor(() => expect(refreshMock).toHaveBeenCalledTimes(1));
    expect(deleteButton).toBeEnabled();
  });

  it('shows a destructive toast when job deletion fails', async () => {
    deleteJobMock.mockRejectedValue(new Error('delete failed'));
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const user = userEvent.setup({ delay: null });

    render(
      <Accordion type="single" collapsible>
        <TailoredJobAccordion resume={resume} job={job} isLoading={false} />
      </Accordion>,
    );

    await user.click(screen.getByRole('button', { name: /Senior Engineer/ }));
    await user.click(screen.getByRole('button', { name: 'Delete Job' }));

    await waitFor(() =>
      expect(toastMock).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Failed to delete job',
        variant: 'destructive',
      }),
    );
    expect(refreshMock).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalledWith('Error deleting job:', expect.any(Error));
    consoleError.mockRestore();
  });

  it('shows the create prompt when no job is linked', async () => {
    const user = userEvent.setup({ delay: null });

    render(
      <Accordion type="single" collapsible>
        <TailoredJobAccordion
          resume={{ ...resume, job_id: null }}
          job={null}
          isLoading={false}
        />
      </Accordion>,
    );

    await user.click(screen.getByRole('button', { name: /Target Job/ }));

    expect(screen.getByText('No Job Currently Linked')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete Job' })).not.toBeInTheDocument();
  });

  it('shows the load error when a linked job resolves to null', async () => {
    const user = userEvent.setup({ delay: null });

    render(
      <Accordion type="single" collapsible>
        <TailoredJobAccordion resume={resume} job={null} isLoading={false} />
      </Accordion>,
    );

    await user.click(screen.getByRole('button', { name: /Target Job/ }));

    expect(screen.getByText('Unable to Load Job')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete Job' })).not.toBeInTheDocument();
  });
});
