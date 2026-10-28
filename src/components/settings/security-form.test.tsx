import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ updateEmail: vi.fn(), updatePassword: vi.fn(), success: vi.fn(), error: vi.fn() }));
vi.mock('@/app/(dashboard)/settings/actions', () => ({ updateEmail: mocks.updateEmail, updatePassword: mocks.updatePassword }));
vi.mock('sonner', () => ({ toast: { success: mocks.success, error: mocks.error } }));

import type { User } from '@supabase/supabase-js';
import { SecurityForm } from './security-form';

const user = (providers: string[]) => ({
  email: 'ada@example.com', identities: providers.map((provider) => ({ provider })),
}) as unknown as User;

describe('SecurityForm', () => {
  beforeEach(() => vi.clearAllMocks());

  it('hides password management for Google-only accounts', () => {
    render(<SecurityForm user={user(['google'])} />);
    expect(screen.getByText('Your account uses Google sign-in.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Change Email' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Change Password' })).not.toBeInTheDocument();
  });

  it('updates email and password and clears successful inputs', async () => {
    mocks.updateEmail.mockResolvedValue({ success: true });
    mocks.updatePassword.mockResolvedValue({ success: true });
    render(<SecurityForm user={user(['email'])} />);

    fireEvent.change(screen.getByPlaceholderText('Enter new email address'), { target: { value: 'ada@new.example' } });
    fireEvent.change(screen.getByPlaceholderText('Current password'), { target: { value: 'old-email-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Change Email' }));
    expect(await screen.findByText('Current email: ada@example.com')).toBeInTheDocument();
    await vi.waitFor(() => expect(mocks.updateEmail).toHaveBeenCalledWith(expect.any(FormData)));
    await vi.waitFor(() => expect(mocks.success).toHaveBeenCalledWith('Please check your new email to confirm the change'));

    fireEvent.change(screen.getByPlaceholderText('Enter current password'), { target: { value: 'old-password' } });
    fireEvent.change(screen.getByPlaceholderText('Enter new password'), { target: { value: 'new-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Change Password' }));
    await vi.waitFor(() => expect(mocks.updatePassword).toHaveBeenCalledWith(expect.any(FormData)));
    await vi.waitFor(() => expect(mocks.success).toHaveBeenCalledWith('Password updated successfully'));
  });

  it('shows returned and thrown update errors', async () => {
    mocks.updateEmail.mockResolvedValueOnce({ success: false, error: 'Email rejected' }).mockRejectedValueOnce(new Error('offline'));
    mocks.updatePassword.mockResolvedValueOnce({ success: false, error: 'Password rejected' });
    render(<SecurityForm user={user([])} />);
    fireEvent.change(screen.getByPlaceholderText('Enter new email address'), { target: { value: 'new@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('Current password'), { target: { value: 'current' } });
    fireEvent.click(screen.getByRole('button', { name: 'Change Email' }));
    await vi.waitFor(() => expect(mocks.error).toHaveBeenCalledWith('Email rejected'));
    fireEvent.click(screen.getByRole('button', { name: 'Change Email' }));
    await vi.waitFor(() => expect(mocks.error).toHaveBeenCalledWith('An unexpected error occurred'));

    fireEvent.change(screen.getByPlaceholderText('Enter current password'), { target: { value: 'current' } });
    fireEvent.change(screen.getByPlaceholderText('Enter new password'), { target: { value: 'next' } });
    fireEvent.click(screen.getByRole('button', { name: 'Change Password' }));
    await vi.waitFor(() => expect(mocks.error).toHaveBeenCalledWith('Password rejected'));
  });
});
