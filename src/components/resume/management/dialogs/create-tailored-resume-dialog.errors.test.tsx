// @vitest-environment jsdom
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  getCreateTailoredResumeMocks,
  openDialog,
  goToStepTwo,
  typeJobDescription,
  profile,
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

describe('CreateTailoredResumeDialog — job errors and dialog recovery', () => {
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
    expect(getConsoleErrorSpy()).toHaveBeenCalledWith(
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
