// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const { pushMock, toastMock, createBaseResumeMock, convertTextToResumeMock, pdfToTextMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  toastMock: vi.fn(),
  createBaseResumeMock: vi.fn(),
  convertTextToResumeMock: vi.fn(),
  pdfToTextMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn(), refresh: vi.fn() }),
}));

vi.mock('@/hooks/use-toast', () => ({
  toast: toastMock,
}));

vi.mock('@/utils/actions/resumes/actions', () => ({
  createBaseResume: createBaseResumeMock,
}));

vi.mock('@/utils/actions/resumes/ai', () => ({
  convertTextToResume: convertTextToResumeMock,
}));

vi.mock('react-pdftotext', () => ({
  default: pdfToTextMock,
}));

vi.mock('@/components/ui/api-error-dialog', () => ({
  ApiErrorDialog: ({
    open,
    errorMessage,
    onUpgrade,
  }: {
    open: boolean;
    errorMessage: { title: string; description: string };
    onUpgrade: () => void;
  }) =>
    open ? (
      <div role="alertdialog">
        <h2>{errorMessage.title}</h2>
        <p>{errorMessage.description}</p>
        <button onClick={onUpgrade}>Upgrade</button>
      </div>
    ) : null,
}));

import { CreateBaseResumeDialog } from './create-base-resume-dialog';
import type { Profile } from '@/lib/types';

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
  work_experience: [
    { company: 'Acme', position: 'Senior Engineer', date: '2024', description: ['Built things'] },
  ],
  education: [{ school: 'State', degree: 'BS', field: 'Computer Science', date: '2020' }],
  skills: [{ category: 'Languages', items: ['TypeScript', 'Go', 'Rust', 'SQL'] }],
  projects: [
    {
      name: 'Scheduler',
      description: ['Built a scheduler'],
      technologies: ['Rust', 'PostgreSQL'],
      date: '2023',
      url: '',
      github_url: '',
    },
  ],
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
} as Profile;

function renderDialog() {
  return render(
    <CreateBaseResumeDialog profile={profile}>
      <button>Open dialog</button>
    </CreateBaseResumeDialog>,
  );
}

async function openDialog() {
  const user = userEvent.setup();
  renderDialog();
  await user.click(screen.getByRole('button', { name: 'Open dialog' }));
  return user;
}

async function goToStepTwo(user: ReturnType<typeof userEvent.setup>, role = 'Senior Engineer') {
  await user.type(screen.getByLabelText(/Target Role/i), role);
  await user.click(screen.getByRole('button', { name: 'Next' }));
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  createBaseResumeMock.mockResolvedValue({ id: 'resume-1' });
  convertTextToResumeMock.mockResolvedValue({
    first_name: 'Ada',
    last_name: 'Lovelace',
    email: 'ada@example.com',
    work_experience: profile.work_experience,
    education: profile.education,
    skills: profile.skills,
    projects: profile.projects,
  });
  pdfToTextMock.mockResolvedValue('extracted resume text');
});

describe('CreateBaseResumeDialog', () => {
  it('opens on step one and blocks Next without a target role', async () => {
    const user = await openDialog();

    expect(screen.getByText('Create Base Resume')).toBeInTheDocument();
    expect(screen.getByText('What role are you targeting?')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Next' }));

    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Required Field Missing', variant: 'destructive' }),
    );
    expect(screen.getByText('What role are you targeting?')).toBeInTheDocument();
  });

  it('advances with Enter and renders every profile section on step two', async () => {
    const user = await openDialog();
    const input = screen.getByLabelText(/Target Role/i);
    await user.type(input, 'Staff Engineer{Enter}');

    expect(screen.getByText('Resume Content')).toBeInTheDocument();
    expect(screen.getByText('Work Experience')).toBeInTheDocument();
    expect(screen.getByText('Projects')).toBeInTheDocument();
    expect(screen.getByText('Education')).toBeInTheDocument();
    expect(screen.getByText('Skills')).toBeInTheDocument();
    expect(screen.getByText('Target Role:')).toBeInTheDocument();
    expect(screen.getByText('Staff Engineer')).toBeInTheDocument();
  });

  it('expands sections, shows item details and toggles selection', async () => {
    const user = await openDialog();
    await goToStepTwo(user);

    await user.click(screen.getByRole('button', { name: /Work Experience/ }));
    expect(screen.getAllByText('Senior Engineer').length).toBeGreaterThan(1);
    expect(screen.getByText('Acme • 2024')).toBeInTheDocument();

    await user.click(screen.getByText('Acme • 2024'));
    await user.click(screen.getByText('Acme • 2024'));

    await user.click(screen.getByRole('button', { name: /Skills/ }));
    expect(screen.getByText('TypeScript')).toBeInTheDocument();
    expect(screen.getByText('+1 more')).toBeInTheDocument();
  });

  it('creates from the selected profile content and navigates to the new resume', async () => {
    const user = await openDialog();
    await goToStepTwo(user);

    await user.click(screen.getByRole('button', { name: 'Create Resume' }));

    await waitFor(() => expect(createBaseResumeMock).toHaveBeenCalledTimes(1));
    expect(createBaseResumeMock).toHaveBeenCalledWith(
      'Senior Engineer',
      'import-profile',
      {
        work_experience: profile.work_experience,
        education: profile.education,
        skills: profile.skills,
        projects: profile.projects,
      },
    );
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Success', description: 'Resume created successfully' }),
    );
    expect(pushMock).toHaveBeenCalledWith('/resumes/resume-1');
  });

  it('creates a fresh resume without profile content', async () => {
    const user = await openDialog();
    await goToStepTwo(user);

    await user.click(screen.getByRole('radio', { name: /Start Fresh/ }));
    await user.click(screen.getByRole('button', { name: 'Create Resume' }));

    await waitFor(() => expect(createBaseResumeMock).toHaveBeenCalledTimes(1));
    expect(createBaseResumeMock).toHaveBeenCalledWith(
      'Senior Engineer',
      'fresh',
      expect.objectContaining({ work_experience: profile.work_experience }),
    );
  });

  it('shows the limit dialog when the free plan is exhausted', async () => {
    createBaseResumeMock.mockRejectedValue(new Error('Free plan limit reached'));
    const user = await openDialog();
    await goToStepTwo(user);

    await user.click(screen.getByRole('button', { name: 'Create Resume' }));

    await waitFor(() =>
      expect(screen.getByRole('alertdialog')).toBeInTheDocument(),
    );
    expect(screen.getByText('Limit Reached')).toBeInTheDocument();
    expect(screen.getByText('Free plan limit reached')).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('shows a generic error dialog for other failures', async () => {
    createBaseResumeMock.mockRejectedValue(new Error('network down'));
    const user = await openDialog();
    await goToStepTwo(user);

    await user.click(screen.getByRole('button', { name: 'Create Resume' }));

    await waitFor(() => expect(screen.getByText('Error')).toBeInTheDocument());
    expect(screen.getByText('Failed to create resume. Please try again.')).toBeInTheDocument();
  });

  it('imports pasted resume text through the AI converter', async () => {
    const user = await openDialog();
    await goToStepTwo(user);

    await user.click(screen.getByRole('radio', { name: /Import Resume/ }));
    const textarea = screen.getByPlaceholderText('Or paste your resume text here...');
    await user.type(textarea, 'Pasted resume content');
    await user.click(screen.getByRole('button', { name: 'Create Resume' }));

    await waitFor(() => expect(convertTextToResumeMock).toHaveBeenCalledTimes(1));
    expect(convertTextToResumeMock).toHaveBeenCalledWith(
      'Pasted resume content',
      expect.objectContaining({ name: 'Senior Engineer', target_role: 'Senior Engineer' }),
      'Senior Engineer',
      expect.objectContaining({ model: '', apiKeys: [] }),
    );
    expect(createBaseResumeMock).toHaveBeenCalledWith(
      'Senior Engineer',
      'import-resume',
      expect.objectContaining({ email: 'ada@example.com' }),
    );
  });

  it('ignores an empty pasted resume', async () => {
    const user = await openDialog();
    await goToStepTwo(user);

    await user.click(screen.getByRole('radio', { name: /Import Resume/ }));
    await user.click(screen.getByRole('button', { name: 'Create Resume' }));

    expect(convertTextToResumeMock).not.toHaveBeenCalled();
    expect(createBaseResumeMock).not.toHaveBeenCalled();
  });

  it('extracts text from a dropped PDF and rejects other file types', async () => {
    const user = await openDialog();
    await goToStepTwo(user);
    await user.click(screen.getByRole('radio', { name: /Import Resume/ }));

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const pdf = new File(['%PDF-1.4'], 'resume.pdf', { type: 'application/pdf' });
    await user.upload(input, pdf);

    await waitFor(() => expect(pdfToTextMock).toHaveBeenCalledWith(pdf));
    await waitFor(() =>
      expect(screen.getByPlaceholderText('Or paste your resume text here...')).toHaveValue(
        'extracted resume text',
      ),
    );
  });

  it('rejects non-PDF file types on drop', async () => {
    const user = await openDialog();
    await goToStepTwo(user);
    await user.click(screen.getByRole('radio', { name: /Import Resume/ }));

    const dropZone = screen.getByText('Drop PDF here or click to browse').closest('label')!;
    const textFile = new File(['hello'], 'resume.txt', { type: 'text/plain' });
    fireEvent.drop(dropZone, { dataTransfer: { files: [textFile] } });

    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Invalid File', variant: 'destructive' }),
    );
  });

  it('reports PDF extraction failures', async () => {
    pdfToTextMock.mockRejectedValue(new Error('bad pdf'));
    const user = await openDialog();
    await goToStepTwo(user);
    await user.click(screen.getByRole('radio', { name: /Import Resume/ }));

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const pdf = new File(['%PDF-1.4'], 'resume.pdf', { type: 'application/pdf' });
    await user.upload(input, pdf);

    await waitFor(() =>
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'PDF Processing Error', variant: 'destructive' }),
      ),
    );
  });

  it('closes on Cancel and resets to step one when reopened', async () => {
    const user = await openDialog();
    await goToStepTwo(user);

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() =>
      expect(screen.queryByText('Create Base Resume')).not.toBeInTheDocument(),
    );

    await user.click(screen.getByRole('button', { name: 'Open dialog' }));
    expect(screen.getByText('What role are you targeting?')).toBeInTheDocument();
  });
});
