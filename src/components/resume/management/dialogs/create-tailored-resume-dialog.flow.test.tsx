// @vitest-environment jsdom
import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { ResumeSummary } from '@/lib/types';
import {
  getCreateTailoredResumeMocks,
  openDialog,
  goToStepTwo,
  typeJobDescription,
  seedStorage,
  seededExpectedContent,
  baseResume,
  baseResumes,
  formattedJob,
  tailoredContent,
  apiKeys,
  getConsoleErrorSpy,
} from '@/test/create-tailored-resume-dialog-test-utils';

const {
  pushMock,
  toastMock,
  createTailoredResumeMock,
  getResumeByIdMock,
  tailorResumeToJobMock,
  formatJobListingMock,
  createJobMock,
} = getCreateTailoredResumeMocks();

describe('CreateTailoredResumeDialog — wizard and successful resume creation', () => {
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
    expect(getConsoleErrorSpy()).toHaveBeenCalledWith('Error parsing API keys:', expect.any(SyntaxError));
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
});
