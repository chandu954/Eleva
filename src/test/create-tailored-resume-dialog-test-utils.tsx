// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
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

vi.mock('@/components/resume/management/dialogs/create-base-resume-dialog', () => ({
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

import { CreateTailoredResumeDialog } from '@/components/resume/management/dialogs/create-tailored-resume-dialog';
import type { Profile, Resume, ResumeSummary } from '@/lib/types';

export const baseResumes = [
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

export const baseResume = {
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

export const profile = {
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

export const formattedJob = {
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

export const tailoredContent = {
  work_experience: [
    { company: 'Acme', position: 'Senior Engineer', date: '2024', description: ['Tailored bullet'] },
  ],
  education: [{ school: 'State', degree: 'BSc', field: 'Computer Science', date: '2020' }],
  skills: [{ category: 'Languages', items: ['TypeScript'] }],
  projects: [],
  target_role: 'Software Engineer',
};

export const apiKeys = [{ id: 'key-1', service: 'openrouter', key: 'sk-test' }];

export function seededExpectedContent() {
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

export function seedStorage() {
  localStorage.setItem('eleva-default-model', 'openai/gpt-4.1');
  localStorage.setItem('eleva-api-keys', JSON.stringify(apiKeys));
}

export function renderDialog(props: Partial<React.ComponentProps<typeof CreateTailoredResumeDialog>> = {}) {
  return render(
    <CreateTailoredResumeDialog baseResumes={baseResumes} profile={profile} {...props}>
      <button>Open dialog</button>
    </CreateTailoredResumeDialog>,
  );
}

export async function openDialog(
  props: Partial<React.ComponentProps<typeof CreateTailoredResumeDialog>> = {},
) {
  const user = userEvent.setup();
  renderDialog(props);
  await user.click(screen.getByRole('button', { name: 'Open dialog' }));
  return user;
}

export async function goToStepTwo(
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

export async function typeJobDescription(
  user: ReturnType<typeof userEvent.setup>,
  text = 'We are hiring a senior engineer',
) {
  await user.type(screen.getByPlaceholderText('Paste the job description here...'), text);
}

let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
let originalLocation: Location;

export function getConsoleErrorSpy() {
  return consoleErrorSpy;
}

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



export function getCreateTailoredResumeMocks() {
  return {
    pushMock,
    toastMock,
    createTailoredResumeMock,
    getResumeByIdMock,
    tailorResumeToJobMock,
    formatJobListingMock,
    createJobMock,
  };
}
