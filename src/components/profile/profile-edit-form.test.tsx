import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock('../../utils/actions/profiles/ai', () => ({
  formatProfileWithAI: vi.fn().mockResolvedValue({}),
}));

vi.mock('@/utils/actions/profiles/actions', () => ({
  importResume: vi.fn().mockResolvedValue({ success: true }),
  updateProfile: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock('react-pdftotext', () => ({
  default: vi.fn().mockResolvedValue('resume text'),
}));

import { updateProfile } from '@/utils/actions/profiles/actions';
import { toast } from 'sonner';
import { ProfileEditForm } from './profile-edit-form';

const profile = {
  id: 'profile-1',
  user_id: 'user-1',
  first_name: 'Ada',
  last_name: 'Lovelace',
  email: 'ada@example.com',
  phone_number: '123',
  location: 'London',
  website: 'https://ada.dev',
  linkedin_url: 'https://linkedin.com/in/ada',
  github_url: 'https://github.com/ada',
  work_experience: [],
  education: [],
  skills: [],
  projects: [],
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
} as never;

describe('ProfileEditForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders every profile section and imports from LinkedIn', () => {
    render(<ProfileEditForm profile={profile} />);

    expect(screen.getByText('Profile Editor')).toBeInTheDocument();
    expect(screen.getByText('LinkedIn Import')).toBeInTheDocument();
    expect(screen.getByText('Resume Upload')).toBeInTheDocument();
    expect(screen.getByText('Import From Text')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Basic Info/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Work Experience/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Projects/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Education/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Skills/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /LinkedIn Import/ }));
    expect(toast.info).toHaveBeenCalled();
  }, 30000);

  it('saves and resets the profile', async () => {
    render(<ProfileEditForm profile={profile} />);

    fireEvent.click(screen.getByRole('button', { name: /Save Changes/ }));
    await waitFor(() => expect(updateProfile).toHaveBeenCalledWith(profile));
    expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('Changes saved'), expect.anything());

    fireEvent.click(screen.getByRole('button', { name: /^Reset$/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Reset Profile' }));

    await waitFor(() => expect(updateProfile).toHaveBeenCalledTimes(2));
    expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('Profile reset'), expect.anything());
  }, 30000);

  it('shows a failure toast when saving fails', async () => {
    vi.mocked(updateProfile).mockRejectedValueOnce(new Error('nope'));
    render(<ProfileEditForm profile={profile} />);

    fireEvent.click(screen.getByRole('button', { name: /Save Changes/ }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('Unable to save'), expect.anything()));
  }, 30000);
});
