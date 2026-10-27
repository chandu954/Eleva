// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Profile, Resume } from '@/lib/types';

const dispatch = vi.fn();
const resume = {
  first_name: 'Ada',
  last_name: 'Lovelace',
  email: 'ada@example.com',
  phone_number: '+1 555 0100',
  location: 'London, UK',
  website: 'https://ada.dev',
  linkedin_url: 'https://linkedin.com/in/ada',
  github_url: 'https://github.com/ada',
} as unknown as Resume;

vi.mock('../resume-editor-context', () => ({
  useResumeContext: () => ({ state: { resume }, dispatch }),
}));

import { BasicInfoForm } from './basic-info-form';

const profile = {
  id: 'profile-1',
  first_name: 'Grace',
  last_name: 'Hopper',
  email: 'grace@example.com',
  phone_number: '+1 555 0199',
  location: 'Arlington, VA',
  website: 'https://grace.dev',
  linkedin_url: 'https://linkedin.com/in/grace',
  github_url: 'https://github.com/grace',
} as unknown as Profile;

describe('BasicInfoForm', () => {
  beforeEach(() => dispatch.mockReset());

  it('renders every contact field from the resume', () => {
    render(<BasicInfoForm profile={profile} />);

    expect(screen.getByPlaceholderText('First Name')).toHaveValue('Ada');
    expect(screen.getByPlaceholderText('Last Name')).toHaveValue('Lovelace');
    expect(screen.getByPlaceholderText('email@example.com')).toHaveValue('ada@example.com');
    expect(screen.getByPlaceholderText('+1 (555) 000-0000')).toHaveValue('+1 555 0100');
    expect(screen.getByPlaceholderText('City, State, Country')).toHaveValue('London, UK');
    expect(screen.getByPlaceholderText('https://your-website.com')).toHaveValue('https://ada.dev');
    expect(screen.getByPlaceholderText('https://linkedin.com/in/username')).toHaveValue(
      'https://linkedin.com/in/ada',
    );
    expect(screen.getByPlaceholderText('https://github.com/username')).toHaveValue(
      'https://github.com/ada',
    );
  });

  it('dispatches UPDATE_FIELD when a field is edited', () => {
    render(<BasicInfoForm profile={profile} />);

    // The input is statically controlled by the mocked context, so a single
    // change event carries the complete value instead of per-keystroke appends.
    fireEvent.change(screen.getByPlaceholderText('email@example.com'), {
      target: { value: 'new@example.com' },
    });

    expect(dispatch).toHaveBeenCalledWith({
      type: 'UPDATE_FIELD',
      field: 'email',
      value: 'new@example.com',
    });
  });

  it('fills every populated field from the profile', async () => {
    const user = userEvent.setup();
    render(<BasicInfoForm profile={profile} />);

    await user.click(screen.getByRole('button', { name: /Fill from Profile/i }));

    expect(dispatch).toHaveBeenCalledTimes(8);
    expect(dispatch).toHaveBeenCalledWith({
      type: 'UPDATE_FIELD',
      field: 'first_name',
      value: 'Grace',
    });
    expect(dispatch).toHaveBeenCalledWith({
      type: 'UPDATE_FIELD',
      field: 'github_url',
      value: 'https://github.com/grace',
    });
  });

  it('skips empty profile fields when filling', async () => {
    const user = userEvent.setup();
    render(
      <BasicInfoForm
        profile={{ id: 'profile-2', first_name: 'Grace', email: '' } as unknown as Profile}
      />,
    );

    await user.click(screen.getByRole('button', { name: /Fill from Profile/i }));

    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith({
      type: 'UPDATE_FIELD',
      field: 'first_name',
      value: 'Grace',
    });
  });

  it('omits the fill button when no profile is available', () => {
    render(<BasicInfoForm profile={null as unknown as Profile} />);

    expect(screen.queryByRole('button', { name: /Fill from Profile/i })).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText('First Name')).toHaveValue('Ada');
  });
});
