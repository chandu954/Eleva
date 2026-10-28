import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const signInWithGoogle = vi.hoisted(() => vi.fn());
vi.mock('@/app/auth/login/actions', () => ({ signInWithGoogle }));
vi.mock('@/components/auth/login-form', () => ({ LoginForm: () => <div>Login form</div> }));

import { AuthDialogProvider, useAuthDialog } from './auth-dialog-provider';

function OpenAuthButtons() {
  const { openDialog } = useAuthDialog();
  return <div>
    <button onClick={() => openDialog('login')}>Open sign in</button>
    <button onClick={() => openDialog('signup')}>Open signup</button>
  </div>;
}

describe('AuthDialogProvider', () => {
  beforeEach(() => vi.clearAllMocks());

  it('opens the requested tab and resets to signup when the dialog closes', () => {
    render(<AuthDialogProvider><OpenAuthButtons /></AuthDialogProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Open sign in' }));
    expect(screen.getByText('Welcome back')).toBeInTheDocument();
    expect(screen.getByText('Login form')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Close/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Open signup' }));
    expect(screen.getByText('Get started')).toBeInTheDocument();
  });

  it('shows a provider error when Google sign-in is rejected or throws', async () => {
    render(<AuthDialogProvider><OpenAuthButtons /></AuthDialogProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Open sign in' }));
    signInWithGoogle.mockResolvedValueOnce({ success: false, error: 'Google unavailable' });
    fireEvent.click(screen.getByRole('button', { name: /Continue with Google/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Google unavailable');

    signInWithGoogle.mockRejectedValueOnce(new Error('network failure'));
    fireEvent.click(screen.getByRole('button', { name: /Continue with Google/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Failed to start Google sign in.');
  });

  it('reports a missing redirect URL from the provider', async () => {
    render(<AuthDialogProvider><OpenAuthButtons /></AuthDialogProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Open signup' }));
    signInWithGoogle.mockResolvedValueOnce({ success: true });
    fireEvent.click(screen.getByRole('button', { name: /Continue with Google/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Failed to start Google sign in.');
  });
});
