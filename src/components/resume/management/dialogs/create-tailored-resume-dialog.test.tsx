// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const {
  pushMock,
  toastMock,
  createTailoredResumeMock,
  getResumeByIdMock,
  tailorResumeToJobMock,
  formatJobListingMock,
  createJobMock,
} = vi.hoisted(() => ({
  pushMock: vi.fn(),
  toastMock: vi.fn(),
  createTailoredResumeMock: vi.fn(),
  getResumeByIdMock: vi.fn(),
  tailorResumeToJobMock: vi.fn(),
  formatJobListingMock: vi.fn(),
  createJobMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn(), refresh: vi.fn() }),
}));

vi.mock('@/hooks/use-toast', () => ({
  toast: toastMock,
}));

vi.mock('@/utils/actions/resumes/actions', () => ({
  createTailoredResume: createTailoredResumeMock,
  getResumeById: getResumeByIdMock,
}));

vi.mock('@/utils/actions/jobs/ai', () => ({
  tailorResumeToJob: tailorResumeToJobMock,
  formatJobListing: formatJobListingMock,
}));

vi.mock('@/utils/actions/jobs/actions', () => ({
  createJob: createJobMock,
}));

vi.mock('./create-base-resume-dialog', () => ({
  CreateBaseResumeDialog: ({ children, profile }: { children: React.ReactNode; profile: { id: string } }) => (
    <div data-testid="create-base-resume-dialog" data-profile={profile?.id}>
      {children}
    </div>
  ),
}));

vi.mock('@/components/ui/api-error-dialog', () => ({
  ApiErrorDialog: ({
    open,
    errorMessage,
    onOpenChange,
    onUpgrade,
    onSettings,
  }: {
    open: boolean;
    errorMessage: { title: string; description: string };
    onOpenChange: (open: boolean) => void;
    onUpgrade: () => void;
    onSettings: () => void;
  }) =>
    open ? (
      <div role="alertdialog">
        <h2>{errorMessage.title}</h2>
        <p>{errorMessage.description}</p>
        <button onClick={onUpgrade}>Upgrade</button>
        <button onClick={onSettings}>Set API Keys</button>
        <button onClick={() => onOpenChange(false)}>Dismiss</button>
      </div>
    ) : null,
}));

import { CreateTailoredResumeDialog } from './create-tailored-resume-dialog';
import type { Profile, Resume, ResumeSummary } from '@/lib/types';

const baseResumes = [
  {
    id: 'base-1',
    user_id: 'u1',
    name: 'Engineering Base',
    target_role: 'Software Engineer',
    is_base_resume: true,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'base-2',
    user_id: 'u1',
    name: 'Design Base',
    target_role: 'Product Designer',
    is_base_resume: true,
    created_at: '2024-02-02T00:00:00.000Z',
    updated_at: '2024-02-02T00:00:00.000Z',
  },
] as ResumeSummary[];

const baseResume = {
  id: 'base-1',
  user_id: 'u1',
  name: 'Engineering Base',
  target_role: 'Software Engineer',
  is_base_resume: true,
  first_name: 'Ada',
  last_name: 'Lovelace',
  email: 'ada@example.com',
  phone_number: '555-0100',
  location: 'London',
  website: 'ada.dev',
  linkedin_url: 'linkedin.com/in/ada',
  github_url: 'github.com/ada',
  work_experience: [
    { company: 'Acme', position: 'Senior Engineer', date: '2024', description: ['Built things'] },
  ],
  education: [
    { school: 'State', degree: 'BSc', field: 'Computer Science', date: '2020', gpa: 3.8 },
    { school: 'Open', degree: 'BA', field: 'History', date: '2012' },
    { school: 'Tech', degree: 'MSc', field: 'AI', date: '2022', gpa: '4.0' },
  ],
  skills: [{ category: 'Languages', items: ['TypeScript', 'Go'] }],
  projects: [
    {
      name: 'Scheduler',
      description: ['Built a scheduler'],
      technologies: ['Rust'],
      date: '2023',
      url: 'scheduler.dev',
      github_url: 'github.com/ada/scheduler',
    },
  ],
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
  has_cover_letter: false,
} as Resume;

const profile = {
  id: 'p1',
  user_id: 'u1',
  first_name: 'Ada',
  last_name: 'Lovelace',
  email: 'ada@example.com',
  phone_number: null,
  location: null,
  website: null,
  linkedin_url: null,
  github_url: null,
  work_experience: baseResume.work_experience,
  education: baseResume.education,
  skills: baseResume.skills,
  projects: baseResume.projects,
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
} as Profile;

const formattedJob = {
  company_name: 'Acme',
  position_title: 'Senior Engineer',
  job_url: null,
  description: 'Build things at scale',
  location: 'Remote',
  salary_range: null,
  keywords: ['TypeScript', 'React'],
  work_location: 'remote',
  employment_type: 'full_time',
};

const tailoredContent = {
  work_experience: [
    { company: 'Acme', position: 'Senior Engineer', date: '2024', description: ['Tailored bullet'] },
  ],
  education: [{ school: 'State', degree: 'BSc', field: 'Computer Science', date: '2020' }],
  skills: [{ category: 'Languages', items: ['TypeScript'] }],
  projects: [],
  target_role: 'Software Engineer',
};

const apiKeys = [{ id: 'key-1', service: 'openrouter', key: 'sk-test' }];

function seededExpectedContent() {
  return {
    work_experience: baseResume.work_experience,
    education: [
      { ...baseResume.education[0], gpa: '3.8' },
      { ...baseResume.education[1], gpa: undefined },
      { ...baseResume.education[2], gpa: '4.0' },
    ],
    skills: baseResume.skills,
    projects: baseResume.projects,
    target_role: baseResume.target_role,
  };
}

function seedStorage() {
  localStorage.setItem('eleva-default-model', 'openai/gpt-4.1');
  localStorage.setItem('eleva-api-keys', JSON.stringify(apiKeys));
}

function renderDialog(props: Partial<React.ComponentProps<typeof CreateTailoredResumeDialog>> = {}) {
  return render(
    <CreateTailoredResumeDialog baseResumes={baseResumes} profile={profile} {...props}>
      <button>Open dialog</button>
    </CreateTailoredResumeDialog>,
  );
}

async function openDialog(
  props: Partial<React.ComponentProps<typeof CreateTailoredResumeDialog>> = {},
) {
  const user = userEvent.setup();
  renderDialog(props);
  await user.click(screen.getByRole('button', { name: 'Open dialog' }));
  return user;
}

async function goToStepTwo(
  user: ReturnType<typeof userEvent.setup>,
  resumeName?: string,
) {
  if (resumeName) {
    // The selector renders the name twice: once in the miniature preview and
    // once as the card heading. Clicking either bubbles to the card handler.
    await user.click(screen.getAllByText(resumeName)[0]);
  }
  await user.click(screen.getByRole('button', { name: 'Next' }));
}

async function typeJobDescription(
  user: ReturnType<typeof userEvent.setup>,
  text = 'We are hiring a senior engineer',
) {
  await user.type(screen.getByPlaceholderText('Paste the job description here...'), text);
}

let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
let originalLocation: Location;

beforeAll(() => {
  originalLocation = window.location;
});

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  Object.defineProperty(window, 'location', {
    configurable: true,
    writable: true,
    value: { href: '' },
  });

  formatJobListingMock.mockResolvedValue(formattedJob);
  createJobMock.mockResolvedValue({ id: 'job-1' });
  getResumeByIdMock.mockResolvedValue({ resume: baseResume, profile, job: null });
  tailorResumeToJobMock.mockResolvedValue(tailoredContent);
  createTailoredResumeMock.mockResolvedValue({ id: 'new-resume-1' });
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

afterAll(() => {
  Object.defineProperty(window, 'location', {
    configurable: true,
    writable: true,
    value: originalLocation,
  });
});

describe('CreateTailoredResumeDialog', () => {
  it('shows the empty state with a create-base-resume action when a profile exists', async () => {
    const user = await openDialog({ baseResumes: [] });

    expect(screen.getByText('No Base Resumes Found')).toBeInTheDocument();
    expect(
      screen.getByText(
        'You need to create a base resume first before you can create a tailored version.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByTestId('create-base-resume-dialog')).toHaveAttribute('data-profile', 'p1');
    expect(screen.getByRole('button', { name: /Create Base Resume/ })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Create Base Resume/ }));
    expect(screen.getByTestId('create-base-resume-dialog')).toBeInTheDocument();
  });

  it('disables base resume creation when no profile is available', async () => {
    await openDialog({ baseResumes: undefined, profile: undefined });

    expect(screen.getByText('No Base Resumes Found')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'No profile available to create base resume' }),
    ).toBeDisabled();
    expect(screen.queryByTestId('create-base-resume-dialog')).not.toBeInTheDocument();
  });

  it('opens on step one, lists every base resume, and advances to step two', async () => {
    const user = await openDialog();

    expect(screen.getByText('Create Tailored Resume')).toBeInTheDocument();
    expect(screen.getByText('Choose a base resume to start with')).toBeInTheDocument();
    expect(screen.getByText('Choose Your Foundation')).toBeInTheDocument();
    expect(screen.getAllByText('Engineering Base').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Design Base').length).toBeGreaterThan(0);
    expect(screen.getByText('Software Engineer')).toBeInTheDocument();
    expect(screen.getByText('Product Designer')).toBeInTheDocument();

    await goToStepTwo(user, 'Design Base');

    expect(screen.getByText('Configure job details and tailoring method')).toBeInTheDocument();
    expect(screen.getByText('Foundation:')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Tailor with AI/ })).toBeChecked();
    expect(screen.getByText('AI Tailoring Process')).toBeInTheDocument();
    expect(screen.getByText('Job Information')).toBeInTheDocument();
    expect(screen.getByText('Tailoring Method')).toBeInTheDocument();
  });

  it('blocks Next when no base resume is selected', async () => {
    const resumeWithoutId = [{ ...baseResumes[0], id: '' }] as ResumeSummary[];
    const user = await openDialog({ baseResumes: resumeWithoutId });

    await user.click(screen.getByRole('button', { name: 'Next' }));

    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Required Field Missing', variant: 'destructive' }),
    );
    expect(screen.getByText('Please select a base resume to continue.')).toBeInTheDocument();
    expect(screen.getByText('Choose Your Foundation')).toBeInTheDocument();
  });

  it('returns to step one from step two and preserves the entered description', async () => {
    const user = await openDialog();
    await goToStepTwo(user);
    await typeJobDescription(user);

    await user.click(screen.getByRole('button', { name: 'Back' }));

    expect(screen.getByText('Choose Your Foundation')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByPlaceholderText('Paste the job description here...')).toHaveValue(
      'We are hiring a senior engineer',
    );
  });

  it('blocks creation without a job description in AI mode', async () => {
    const user = await openDialog();
    await goToStepTwo(user);

    await user.click(screen.getByRole('button', { name: 'Create Resume' }));

    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Error',
        description: 'Please enter a job description',
        variant: 'destructive',
      }),
    );
    expect(formatJobListingMock).not.toHaveBeenCalled();
    expect(createTailoredResumeMock).not.toHaveBeenCalled();
    expect(screen.getByText('Configure job details and tailoring method')).toBeInTheDocument();
  });

  it('tailors with AI, shows progress, and navigates to the created resume', async () => {
    seedStorage();
    let resolveFormat!: (value: typeof formattedJob) => void;
    formatJobListingMock.mockImplementation(
      () => new Promise((resolve) => {
        resolveFormat = resolve;
      }),
    );
    const user = await openDialog();
    await goToStepTwo(user, 'Design Base');
    await typeJobDescription(user, 'A detailed job description');

    await user.click(screen.getByRole('button', { name: 'Create Resume' }));

    expect(await screen.findByText('Creating Resume')).toBeInTheDocument();
    expect(screen.getByText('Analyzing Job Description')).toBeInTheDocument();
    expect(screen.getByText('Reading and understanding the job requirements...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Creating/ })).toBeDisabled();

    resolveFormat(formattedJob);

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/resumes/new-resume-1'));

    expect(formatJobListingMock).toHaveBeenCalledWith('A detailed job description', {
      model: 'openai/gpt-4.1',
      apiKeys,
    });
    expect(createJobMock).toHaveBeenCalledWith(formattedJob);
    expect(getResumeByIdMock).toHaveBeenCalledWith('base-2');
    expect(tailorResumeToJobMock).toHaveBeenCalledWith(baseResume, formattedJob, {
      model: 'openai/gpt-4.1',
      apiKeys,
    });
    expect(createTailoredResumeMock).toHaveBeenCalledWith(
      baseResume,
      'job-1',
      'Senior Engineer',
      'Acme',
      tailoredContent,
    );
    expect(toastMock).toHaveBeenCalledWith({
      title: 'Success',
      description: 'Resume created successfully',
    });
    await waitFor(() =>
      expect(screen.queryByText('Create Tailored Resume')).not.toBeInTheDocument(),
    );
  });

  it('falls back to empty model and key list when stored settings are malformed', async () => {
    localStorage.setItem('eleva-api-keys', '{not json');
    const user = await openDialog();
    await goToStepTwo(user);
    await typeJobDescription(user);

    await user.click(screen.getByRole('button', { name: 'Create Resume' }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/resumes/new-resume-1'));
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error parsing API keys:', expect.any(SyntaxError));
    expect(formatJobListingMock).toHaveBeenCalledWith(
      'We are hiring a senior engineer',
      { model: '', apiKeys: [] },
    );
  });

  it('copies a base resume without a job description', async () => {
    const user = await openDialog();
    await goToStepTwo(user);

    await user.click(screen.getByRole('radio', { name: /Copy Base Resume/ }));
    expect(screen.getByText('Direct Copy Process')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Create Resume' }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/resumes/new-resume-1'));

    expect(formatJobListingMock).not.toHaveBeenCalled();
    expect(createJobMock).not.toHaveBeenCalled();
    expect(tailorResumeToJobMock).not.toHaveBeenCalled();
    expect(getResumeByIdMock).toHaveBeenCalledWith('base-1');
    expect(createTailoredResumeMock).toHaveBeenCalledWith(
      baseResume,
      null,
      'Copied Resume',
      '',
      seededExpectedContent(),
    );
    expect(toastMock).toHaveBeenCalledWith({
      title: 'Success',
      description: 'Resume created successfully',
    });
  });

  it('links a copied resume to a job when a description is provided', async () => {
    seedStorage();
    const user = await openDialog();
    await goToStepTwo(user);
    await typeJobDescription(user, 'Job description for copying');
    await user.click(screen.getByRole('radio', { name: /Copy Base Resume/ }));

    await user.click(screen.getByRole('button', { name: 'Create Resume' }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/resumes/new-resume-1'));

    expect(formatJobListingMock).toHaveBeenCalledWith('Job description for copying', {
      model: 'openai/gpt-4.1',
      apiKeys,
    });
    expect(createJobMock).toHaveBeenCalledWith(formattedJob);
    expect(tailorResumeToJobMock).not.toHaveBeenCalled();
    expect(createTailoredResumeMock).toHaveBeenCalledWith(
      baseResume,
      'job-1',
      'Senior Engineer',
      'Acme',
      seededExpectedContent(),
    );
  });

  it('reports API key failures while formatting a job description and redacts secrets', async () => {
    formatJobListingMock.mockRejectedValue(
      new Error('Invalid key sk-abcdefgh12345 sent with Bearer tok.secret'),
    );
    const user = await openDialog();
    await goToStepTwo(user);
    await typeJobDescription(user);

    await user.click(screen.getByRole('button', { name: 'Create Resume' }));

    await waitFor(() => expect(screen.getByText('API Key Error')).toBeInTheDocument());
    const description = screen.getByText(/There was an issue with your API key/);
    expect(description).toHaveTextContent('sk-***');
    expect(description).toHaveTextContent('Bearer ***');
    expect(description).not.toHaveTextContent('sk-abcdefgh12345');
    expect(description).not.toHaveTextContent('tok.secret');
    expect(description).toHaveTextContent('hi@alexo.ca');
    expect(createJobMock).not.toHaveBeenCalled();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('reports generic job analysis failures with error details', async () => {
    formatJobListingMock.mockRejectedValue(new Error('network down'));
    const user = await openDialog();
    await goToStepTwo(user);
    await typeJobDescription(user);

    await user.click(screen.getByRole('button', { name: 'Create Resume' }));

    await waitFor(() =>
      expect(
        screen.getByText(/Failed to analyze job description\. Please try again Details: network down/),
      ).toBeInTheDocument(),
    );
    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(
      screen.getByText(
        /Failed to analyze job description\. Please try again Details: network down\. Contact the developer at hi@alexo\.ca for help\./,
      ),
    ).toBeInTheDocument();
    expect(createJobMock).not.toHaveBeenCalled();
  });

  it('omits details when a non-serializable analysis error is thrown', async () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    formatJobListingMock.mockRejectedValue(circular);
    const user = await openDialog();
    await goToStepTwo(user);
    await typeJobDescription(user);

    await user.click(screen.getByRole('button', { name: 'Create Resume' }));

    await waitFor(() =>
      expect(
        screen.getByText(
          'Failed to analyze job description. Please try again. Contact the developer at hi@alexo.ca for help.',
        ),
      ).toBeInTheDocument(),
    );
    expect(screen.queryByText(/Details:/)).not.toBeInTheDocument();
  });

  it('omits details when the analysis rejects without an error value', async () => {
    formatJobListingMock.mockRejectedValue(null);
    const user = await openDialog();
    await goToStepTwo(user);
    await typeJobDescription(user);

    await user.click(screen.getByRole('button', { name: 'Create Resume' }));

    await waitFor(() =>
      expect(
        screen.getByText(
          'Failed to analyze job description. Please try again. Contact the developer at hi@alexo.ca for help.',
        ),
      ).toBeInTheDocument(),
    );
  });

  it('reports API key failures from the direct copy job analysis', async () => {
    formatJobListingMock.mockRejectedValue(new Error('unauthorized'));
    const user = await openDialog();
    await goToStepTwo(user);
    await typeJobDescription(user);
    await user.click(screen.getByRole('radio', { name: /Copy Base Resume/ }));

    await user.click(screen.getByRole('button', { name: 'Create Resume' }));

    await waitFor(() => expect(screen.getByText('API Key Error')).toBeInTheDocument());
    expect(
      screen.getByText(/There was an issue with your API key\. Please check your settings/),
    ).toBeInTheDocument();
    expect(createTailoredResumeMock).not.toHaveBeenCalled();
  });

  it('reports generic failures from the direct copy job analysis', async () => {
    formatJobListingMock.mockRejectedValue('bad job text');
    const user = await openDialog();
    await goToStepTwo(user);
    await typeJobDescription(user);
    await user.click(screen.getByRole('radio', { name: /Copy Base Resume/ }));

    await user.click(screen.getByRole('button', { name: 'Create Resume' }));

    await waitFor(() =>
      expect(
        screen.getByText(
          /Failed to process job description\. Please try again Details: bad job text\. Contact/,
        ),
      ).toBeInTheDocument(),
    );
  });

  it('surfaces a toast when the job record cannot be created', async () => {
    createJobMock.mockResolvedValue({ id: null });
    const user = await openDialog();
    await goToStepTwo(user);
    await typeJobDescription(user);

    await user.click(screen.getByRole('button', { name: 'Create Resume' }));

    await waitFor(() =>
      expect(toastMock).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Failed to create job entry',
        variant: 'destructive',
      }),
    );
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to create resume:',
      expect.objectContaining({ message: 'Failed to create job entry' }),
    );
    expect(getResumeByIdMock).not.toHaveBeenCalled();
    expect(tailorResumeToJobMock).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Create Resume' })).toBeEnabled();
  });

  it('surfaces a toast when the selected base resume cannot be loaded', async () => {
    getResumeByIdMock.mockResolvedValue({ resume: null, profile, job: null });
    const user = await openDialog();
    await goToStepTwo(user);
    await typeJobDescription(user);

    await user.click(screen.getByRole('button', { name: 'Create Resume' }));

    await waitFor(() =>
      expect(toastMock).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Base resume not found',
        variant: 'destructive',
      }),
    );
    expect(createTailoredResumeMock).not.toHaveBeenCalled();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('surfaces a toast when the direct copy cannot load the base resume', async () => {
    getResumeByIdMock.mockResolvedValue({ resume: null, profile, job: null });
    const user = await openDialog();
    await goToStepTwo(user);
    await user.click(screen.getByRole('radio', { name: /Copy Base Resume/ }));

    await user.click(screen.getByRole('button', { name: 'Create Resume' }));

    await waitFor(() =>
      expect(toastMock).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Base resume not found',
        variant: 'destructive',
      }),
    );
    expect(createTailoredResumeMock).not.toHaveBeenCalled();
  });

  it('reports API key and generic tailoring failures', async () => {
    tailorResumeToJobMock.mockRejectedValueOnce(new Error('Invalid API key'));
    const user = await openDialog();
    await goToStepTwo(user);
    await typeJobDescription(user);

    await user.click(screen.getByRole('button', { name: 'Create Resume' }));

    await waitFor(() => expect(screen.getByText('API Key Error')).toBeInTheDocument());
    expect(
      screen.getByText(/There was an issue with your API key\. Please check your settings/),
    ).toBeInTheDocument();
    expect(createTailoredResumeMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss', hidden: true }));
    expect(screen.queryByText('API Key Error')).not.toBeInTheDocument();

    tailorResumeToJobMock.mockRejectedValueOnce({ reason: 'model offline' });
    await user.click(screen.getByRole('button', { name: 'Create Resume' }));

    await waitFor(() =>
      expect(
        screen.getByText(
          /Failed to tailor resume\. Please try again Details: \{"reason":"model offline"\}\. Contact/,
        ),
      ).toBeInTheDocument(),
    );
    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(createTailoredResumeMock).not.toHaveBeenCalled();
  });

  it('surfaces a toast when saving the tailored resume fails', async () => {
    createTailoredResumeMock.mockRejectedValue(new Error('database unavailable'));
    const user = await openDialog();
    await goToStepTwo(user);
    await typeJobDescription(user);

    await user.click(screen.getByRole('button', { name: 'Create Resume' }));

    await waitFor(() =>
      expect(toastMock).toHaveBeenCalledWith({
        title: 'Error',
        description: 'database unavailable',
        variant: 'destructive',
      }),
    );
    expect(pushMock).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Create Resume' })).toBeEnabled();
  });

  it('navigates to subscription and settings from the API error dialog', async () => {
    formatJobListingMock.mockRejectedValue(new Error('invalid key'));
    const user = await openDialog();
    await goToStepTwo(user);
    await typeJobDescription(user);

    await user.click(screen.getByRole('button', { name: 'Create Resume' }));
    await waitFor(() => expect(screen.getByText('API Key Error')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Upgrade', hidden: true }));
    expect(window.location.href).toMatch(/\/subscription$/);

    await user.click(screen.getByRole('button', { name: 'Create Resume' }));
    await waitFor(() => expect(screen.getByText('API Key Error')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Set API Keys', hidden: true }));
    expect(window.location.href).toMatch(/\/settings$/);
  });

  it('closes on Cancel and resets the form when reopened', async () => {
    const user = await openDialog();
    await goToStepTwo(user, 'Design Base');
    await typeJobDescription(user);
    await user.click(screen.getByRole('radio', { name: /Copy Base Resume/ }));

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() =>
      expect(screen.queryByText('Create Tailored Resume')).not.toBeInTheDocument(),
    );

    await user.click(screen.getByRole('button', { name: 'Open dialog' }));
    expect(screen.getByText('Choose a base resume to start with')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getAllByText('Engineering Base').length).toBeGreaterThan(0);
    expect(screen.queryByText('Design Base')).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText('Paste the job description here...')).toHaveValue('');
    expect(screen.getByRole('radio', { name: /Tailor with AI/ })).toBeChecked();
  });
});
