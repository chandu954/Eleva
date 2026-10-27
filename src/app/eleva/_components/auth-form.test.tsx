// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const authMock = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  signInWithOAuth: vi.fn(),
}));

const navMock = vi.hoisted(() => ({
  query: {} as Record<string, string>,
  push: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock('framer-motion', async () => {
  const React = await import('react');
  const cache = new Map<string, React.ComponentType<Record<string, unknown>>>();
  const motion = new Proxy({}, {
    get: (_target, tag: string) => {
      if (!cache.has(tag)) {
        cache.set(tag, (props: Record<string, unknown>) => {
          const { initial, animate, exit, transition, whileHover, whileTap, whileInView, viewport, variants, layout, layoutId, ...rest } = props;
          void initial; void animate; void exit; void transition; void whileHover; void whileTap;
          void whileInView; void viewport; void variants; void layout; void layoutId;
          return React.createElement(tag, rest);
        });
      }
      return cache.get(tag);
    },
  });
  return { motion, AnimatePresence: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children) };
});

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: navMock.push, refresh: navMock.refresh }),
  useSearchParams: () => ({ get: (key: string) => navMock.query[key] ?? null }),
}));

vi.mock('next/link', async () => {
  const React = await import('react');
  return {
    default: ({ href, children, ...rest }: { href?: string; children?: import('react').ReactNode } & Record<string, unknown>) =>
      React.createElement('a', { href, ...rest }, children),
  };
});

vi.mock('@supabase/ssr', () => ({
  createBrowserClient: () => ({ auth: authMock }),
}));

import { AuthForm } from './auth-form';

function fillCredentials(email = 'ada@example.com', password = 'secret123') {
  return async (user: ReturnType<typeof userEvent.setup>) => {
    await user.type(screen.getByTestId('auth-email'), email);
    await user.type(screen.getByTestId('auth-password'), password);
  };
}

describe('AuthForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    navMock.query = {};
    authMock.signInWithPassword.mockResolvedValue({ error: null });
    authMock.signUp.mockResolvedValue({ error: null });
    authMock.signInWithOAuth.mockResolvedValue({ error: null });
  });

  it('renders login mode with its heading, links and no name field', () => {
    render(<AuthForm mode="login" />);

    expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
    expect(screen.getByText('Sign in to your Eleva workspace.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Forgot password?' })).toHaveAttribute('href', '/eleva/auth/reset-password');
    expect(screen.getByRole('link', { name: 'Create an account' })).toHaveAttribute('href', '/eleva/auth/signup');
    expect(screen.getByTestId('auth-submit')).toHaveTextContent('Sign in');
    expect(screen.queryByTestId('signup-name')).not.toBeInTheDocument();
    expect(screen.getByTestId('auth-password')).toHaveAttribute('autocomplete', 'current-password');
  });

  it('renders signup mode with the name field and sign-in link', () => {
    render(<AuthForm mode="signup" />);

    expect(screen.getByRole('heading', { name: 'Create your account' })).toBeInTheDocument();
    expect(screen.getByText('Start building a more organized job search.')).toBeInTheDocument();
    expect(screen.getByTestId('signup-name')).toBeInTheDocument();
    expect(screen.getByTestId('auth-submit')).toHaveTextContent('Create account');
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/eleva/auth/login');
    expect(screen.queryByRole('link', { name: 'Forgot password?' })).not.toBeInTheDocument();
    expect(screen.getByTestId('auth-password')).toHaveAttribute('autocomplete', 'new-password');
  });

  it('shows callback error messages from the query string', () => {
    navMock.query = { err: 'oauth' };
    const { unmount } = render(<AuthForm mode="login" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Google sign-in failed. Please try again.');
    unmount();

    navMock.query = { error: 'email_confirmation' };
    const second = render(<AuthForm mode="login" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Email confirmation failed or the link has expired. Please try again.');
    second.unmount();

    navMock.query = { err: 'missing_code' };
    render(<AuthForm mode="login" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Sign-in link is invalid or expired. Please try again.');
  });

  it('blocks invalid native form submissions and never calls Supabase', async () => {
    const user = userEvent.setup();
    render(<AuthForm mode="login" />);

    await user.click(screen.getByTestId('auth-submit'));
    expect(authMock.signInWithPassword).not.toHaveBeenCalled();

    await user.type(screen.getByTestId('auth-email'), 'not-an-email');
    await user.type(screen.getByTestId('auth-password'), '123');
    await user.click(screen.getByTestId('auth-submit'));

    expect(authMock.signInWithPassword).not.toHaveBeenCalled();
    expect(navMock.push).not.toHaveBeenCalled();
  });

  it('toggles password visibility and the accessible label', async () => {
    const user = userEvent.setup();
    render(<AuthForm mode="login" />);

    const password = screen.getByTestId('auth-password');
    expect(password).toHaveAttribute('type', 'password');

    await user.click(screen.getByRole('button', { name: 'Show password' }));
    expect(password).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: 'Hide password' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Hide password' }));
    expect(password).toHaveAttribute('type', 'password');
  });

  it('signs in, shows the busy state and navigates to the safe next path', async () => {
    let resolveSignIn: (value: { error: null }) => void = () => {};
    authMock.signInWithPassword.mockReturnValue(new Promise((resolve) => { resolveSignIn = resolve; }));
    navMock.query = { next: '/eleva/templates' };
    const user = userEvent.setup();
    render(<AuthForm mode="login" />);

    await fillCredentials()(user);
    await user.click(screen.getByTestId('auth-submit'));

    expect(await screen.findByText('Signing in…')).toBeInTheDocument();
    expect(screen.getByTestId('auth-submit')).toBeDisabled();
    expect(screen.getByTestId('google-sign-in')).toBeDisabled();
    expect(authMock.signInWithPassword).toHaveBeenCalledWith({ email: 'ada@example.com', password: 'secret123' });

    resolveSignIn({ error: null });

    await waitFor(() => expect(navMock.push).toHaveBeenCalledWith('/eleva/templates'));
    expect(navMock.refresh).toHaveBeenCalledTimes(1);
  });

  it('falls back to the dashboard when the next path is unsafe', async () => {
    navMock.query = { next: 'https://evil.example.com' };
    const user = userEvent.setup();
    render(<AuthForm mode="login" />);

    await fillCredentials()(user);
    await user.click(screen.getByTestId('auth-submit'));

    await waitFor(() => expect(navMock.push).toHaveBeenCalledWith('/eleva/dashboard'));
  });

  it.each([
    ['Invalid login credentials', 'Incorrect email or password.'],
    ['Email not confirmed', 'Please confirm your email address before signing in.'],
    ['rate_limit exceeded', 'Too many attempts. Please try again later.'],
    ['Something exploded', 'Something exploded'],
  ])('maps the "%s" sign-in error to a helpful message', async (message, expected) => {
    authMock.signInWithPassword.mockResolvedValue({ error: new Error(message) });
    const user = userEvent.setup();
    render(<AuthForm mode="login" />);

    await fillCredentials()(user);
    await user.click(screen.getByTestId('auth-submit'));

    expect(await screen.findByRole('alert')).toHaveTextContent(expected);
    expect(screen.getByTestId('auth-submit')).toBeEnabled();
    expect(navMock.push).not.toHaveBeenCalled();
  });

  it('submits a signup with the first name and confirmation redirect', async () => {
    navMock.query = { next: '/eleva/templates' };
    const user = userEvent.setup();
    render(<AuthForm mode="signup" />);

    await user.type(screen.getByTestId('signup-name'), 'Ada');
    await fillCredentials()(user);
    await user.click(screen.getByTestId('auth-submit'));

    await waitFor(() => expect(authMock.signUp).toHaveBeenCalledTimes(1));
    expect(authMock.signUp).toHaveBeenCalledWith({
      email: 'ada@example.com',
      password: 'secret123',
      options: {
        emailRedirectTo: expect.stringContaining('/eleva/auth/callback?next=%2Feleva%2Ftemplates'),
        data: { first_name: 'Ada' },
      },
    });
    expect(await screen.findByRole('alert')).toHaveTextContent('Check your email to confirm your account, then log in.');
    expect(authMock.signInWithPassword).not.toHaveBeenCalled();
  });

  it('shows a signup error returned by Supabase', async () => {
    authMock.signUp.mockResolvedValue({ error: new Error('User already registered') });
    const user = userEvent.setup();
    render(<AuthForm mode="signup" />);

    await user.type(screen.getByTestId('signup-name'), 'Ada');
    await fillCredentials()(user);
    await user.click(screen.getByTestId('auth-submit'));

    expect(await screen.findByRole('alert')).toHaveTextContent('User already registered');
    expect(screen.getByTestId('auth-submit')).toBeEnabled();
  });

  it('starts the Google OAuth flow with the callback redirect', async () => {
    navMock.query = { next: '/eleva/dashboard' };
    const user = userEvent.setup();
    render(<AuthForm mode="login" />);

    await user.click(screen.getByTestId('google-sign-in'));

    expect(authMock.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: expect.stringContaining('/eleva/auth/callback?next=%2Feleva%2Fdashboard') },
    });
  });

  it('reports Google OAuth errors and re-enables the form', async () => {
    authMock.signInWithOAuth.mockResolvedValue({ error: new Error('OAuth unavailable') });
    const user = userEvent.setup();
    render(<AuthForm mode="login" />);

    await user.click(screen.getByTestId('google-sign-in'));

    expect(await screen.findByRole('alert')).toHaveTextContent('OAuth unavailable');
    expect(screen.getByTestId('google-sign-in')).toBeEnabled();
  });
});
