import { beforeEach, describe, expect, it, vi } from 'vitest';
import { stubTable } from '@/test/postgrest-stub';

vi.mock('next/navigation', () => ({ redirect: vi.fn() }));
vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(),
  createServiceClient: vi.fn(),
}));
vi.mock('@/utils/actions/stripe/actions', () => ({
  deleteCustomerAndData: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/lib/auth-policy', () => ({
  isEmailSignupAllowed: vi.fn().mockReturnValue(true),
  getEmailSignupBlockedMessage: vi.fn().mockReturnValue('Signups are disabled'),
}));
vi.mock('@/lib/analytics/server', () => ({
  captureServerAnalyticsEvent: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/utils/actions/utils/supabase', () => ({
  getAuthenticatedClient: vi.fn(),
  getServiceClient: vi.fn(),
}));

import { createClient, createServiceClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { isEmailSignupAllowed } from '@/lib/auth-policy';
import { deleteCustomerAndData } from '@/utils/actions/stripe/actions';
import { getAuthenticatedClient, getServiceClient } from '@/utils/actions/utils/supabase';
import {
  checkAuth,
  deleteUserAccount,
  getSubscriptionStatus,
  getUserId,
  login,
  loginWithState,
  logout,
  resetPasswordForEmail,
  signInWithGoogle,
  signup,
  signupWithState,
} from './actions';

const mockCreateClient = vi.mocked(createClient);
const mockCreateServiceClient = vi.mocked(createServiceClient);

function form(values: Record<string, string>) {
  const fd = new FormData();
  Object.entries(values).forEach(([k, v]) => fd.set(k, v));
  return fd;
}

function authClient(overrides: Record<string, unknown> = {}) {
  return {
    auth: {
      signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      resetPasswordForEmail: vi.fn().mockResolvedValue({ error: null }),
      signInWithOAuth: vi.fn().mockResolvedValue({ data: { url: 'https://oauth' }, error: null }),
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1', email: 'ada@example.com' } }, error: null }),
      ...overrides,
    },
    from: vi.fn(() => stubTable({ data: { subscription_plan: 'pro', subscription_status: 'active' }, error: null })),
  };
}

function serviceClient(overrides: Record<string, unknown> = {}) {
  return {
    auth: {
      signUp: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
      admin: { deleteUser: vi.fn().mockResolvedValue({ error: null }) },
      ...overrides,
    },
    from: vi.fn(() => stubTable({ data: null, error: null })),
  };
}

describe('auth server actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isEmailSignupAllowed).mockReturnValue(true);
    mockCreateClient.mockResolvedValue(authClient() as never);
    mockCreateServiceClient.mockResolvedValue(serviceClient() as never);
  });

  it('logs in and redirects home', async () => {
    await expect(login(form({ email: 'ada@example.com', password: 'secret' }))).resolves.toEqual({ success: true });
    expect(redirect).toHaveBeenCalledWith('/');
  });

  it('returns login errors', async () => {
    mockCreateClient.mockResolvedValue(
      authClient({ signInWithPassword: vi.fn().mockResolvedValue({ error: { message: 'bad password' } }) }) as never,
    );
    await expect(login(form({ email: 'ada@example.com', password: 'bad' }))).resolves.toEqual({
      success: false,
      error: 'bad password',
    });
  });

  it('signs up new users and records analytics', async () => {
    await expect(signup(form({ email: 'ada@example.com', password: 'secret', name: 'Ada' }))).resolves.toEqual({ success: true });
  });

  it('blocks signups when policy disables them', async () => {
    vi.mocked(isEmailSignupAllowed).mockReturnValue(false);
    await expect(signup(form({ email: 'ada@example.com', password: 'secret' }))).resolves.toEqual({
      success: false,
      error: 'Signups are disabled',
    });
  });

  it('returns signup errors', async () => {
    mockCreateServiceClient.mockResolvedValue(
      serviceClient({ signUp: vi.fn().mockResolvedValue({ data: { user: null }, error: { message: 'taken' } }) }) as never,
    );
    await expect(signup(form({ email: 'ada@example.com', password: 'secret' }))).resolves.toEqual({
      success: false,
      error: 'taken',
    });
  });

  it('validates login state submissions', async () => {
    await expect(loginWithState({ status: 'idle' } as never, form({ email: 'bad', password: '' }))).resolves.toMatchObject({
      status: 'error',
      message: 'Please fix the highlighted fields.',
    });

    await expect(loginWithState({ status: 'idle' } as never, form({ email: 'ada@example.com', password: 'secret' }))).resolves.toEqual({
      status: 'success',
    });
  });

  it('maps invalid credentials to a helpful login message', async () => {
    mockCreateClient.mockResolvedValue(
      authClient({ signInWithPassword: vi.fn().mockResolvedValue({ error: { message: 'Invalid login credentials' } }) }) as never,
    );

    await expect(
      loginWithState({ status: 'idle' } as never, form({ email: 'ada@example.com', password: 'bad' })),
    ).resolves.toMatchObject({
      status: 'error',
      message: expect.stringContaining('Invalid credentials'),
    });
  });

  it('validates and submits signup state', async () => {
    vi.mocked(isEmailSignupAllowed).mockReturnValue(false);
    await expect(signupWithState({ status: 'idle' } as never, form({}))).resolves.toMatchObject({
      status: 'error',
      message: 'Signups are disabled',
    });

    vi.mocked(isEmailSignupAllowed).mockReturnValue(true);
    await expect(signupWithState({ status: 'idle' } as never, form({ name: 'A', email: 'bad', password: 'x' }))).resolves.toMatchObject({
      status: 'error',
      message: 'Please fix the highlighted fields.',
    });

    await expect(signupWithState({ status: 'idle' } as never, form({ name: 'Ada', email: 'ada@example.com', password: 'Secret123' }))).resolves.toMatchObject({
      status: 'success',
    });

    mockCreateServiceClient.mockResolvedValue(
      serviceClient({ signUp: vi.fn().mockResolvedValue({ data: { user: null }, error: { message: 'taken' } }) }) as never,
    );
    await expect(signupWithState({ status: 'idle' } as never, form({ name: 'Ada', email: 'ada@example.com', password: 'Secret123' }))).resolves.toMatchObject({
      status: 'error',
      message: 'taken',
    });
  });

  it('logs out and redirects', async () => {
    await logout();
    expect(redirect).toHaveBeenCalledWith('/');
  });

  it('sends password reset emails', async () => {
    await expect(resetPasswordForEmail(form({ email: 'ada@example.com' }))).resolves.toEqual({ success: true });

    mockCreateClient.mockResolvedValue(
      authClient({ resetPasswordForEmail: vi.fn().mockResolvedValue({ error: { message: 'rate limited' } }) }) as never,
    );
    await expect(resetPasswordForEmail(form({ email: 'ada@example.com' }))).resolves.toEqual({
      success: false,
      error: 'rate limited',
    });
  });

  it('starts Google OAuth', async () => {
    await expect(signInWithGoogle()).resolves.toEqual({ success: true, url: 'https://oauth' });

    mockCreateClient.mockResolvedValue(
      authClient({ signInWithOAuth: vi.fn().mockResolvedValue({ data: {}, error: null }) }) as never,
    );
    await expect(signInWithGoogle()).resolves.toEqual({ success: false, error: 'Failed to get OAuth URL' });

    mockCreateClient.mockResolvedValue(
      authClient({ signInWithOAuth: vi.fn().mockResolvedValue({ data: null, error: { message: 'oauth down' } }) }) as never,
    );
    await expect(signInWithGoogle()).resolves.toEqual({ success: false, error: 'oauth down' });

    mockCreateClient.mockResolvedValue(
      authClient({ signInWithOAuth: vi.fn().mockRejectedValue(new Error('network')) }) as never,
    );
    await expect(signInWithGoogle()).resolves.toEqual({ success: false, error: 'network' });
  });

  it('checks authentication and user ids', async () => {
    await expect(checkAuth()).resolves.toEqual({
      authenticated: true,
      user: { id: 'user-1', email: 'ada@example.com' },
    });
    await expect(getUserId()).resolves.toBe('user-1');

    mockCreateClient.mockResolvedValue(
      authClient({ getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: { message: 'no session' } }) }) as never,
    );
    await expect(checkAuth()).resolves.toEqual({ authenticated: false });
    await expect(getUserId()).resolves.toBeNull();

    mockCreateClient.mockResolvedValue(
      authClient({ getUser: vi.fn().mockRejectedValue(new Error('boom')) }) as never,
    );
    await expect(checkAuth()).resolves.toEqual({ authenticated: false });
    await expect(getUserId()).resolves.toBeNull();
  });

  it('reads subscription status', async () => {
    await expect(getSubscriptionStatus()).resolves.toEqual({
      hasSubscription: true,
      plan: 'pro',
      status: 'active',
    });

    mockCreateClient.mockResolvedValue(
      authClient({ getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) }) as never,
    );
    await expect(getSubscriptionStatus()).resolves.toEqual({
      hasSubscription: false,
      error: 'No authenticated user',
    });
  });

  it('deletes an account after confirmation', async () => {
    const service = serviceClient();
    vi.mocked(getAuthenticatedClient).mockResolvedValue({
      supabase: authClient() as never,
      user: { id: 'user-1' } as never,
    });
    vi.mocked(getServiceClient).mockResolvedValue({ supabase: service as never });

    await deleteUserAccount(form({ confirm: 'DELETE' }));
    expect(deleteCustomerAndData).toHaveBeenCalledWith('user-1');
    expect(service.auth.admin.deleteUser).toHaveBeenCalledWith('user-1');
    expect(redirect).toHaveBeenCalledWith('/');
  });

  it('rejects unconfirmed account deletion', async () => {
    await expect(deleteUserAccount(form({ confirm: 'nope' }))).rejects.toThrow('Invalid confirmation text');
  });
});
