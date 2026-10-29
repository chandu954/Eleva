// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { stubSupabase, stubTable, type PostgrestStub } from '@/test/postgrest-stub';

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({ getAll: () => [], set: vi.fn() })),
}));
vi.mock('next/navigation', () => ({ redirect: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/utils/supabase/server', () => ({ createClient: vi.fn() }));

import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { getCurrentUser, logActivity, requireUser, signOut } from './actions';

const mockCreateClient = vi.mocked(createClient);
const mockRedirect = vi.mocked(redirect);

type AuthUser = { id: string; email?: string };

interface TestClient {
  auth: {
    getUser: ReturnType<typeof vi.fn>;
    signOut: ReturnType<typeof vi.fn>;
  };
  from: ReturnType<typeof vi.fn>;
}

function installClient(
  user: AuthUser | null,
  tables: Record<string, PostgrestStub | PostgrestStub[]>,
  options: { authError?: unknown } = {},
): TestClient {
  const client = stubSupabase(user, tables) as unknown as TestClient;
  if (options.authError) {
    client.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: options.authError,
    });
  }
  client.auth.signOut = vi.fn().mockResolvedValue({ error: null });
  mockCreateClient.mockResolvedValue(client as never);
  return client;
}

const authedUser: AuthUser = { id: 'user-1', email: 'ada@example.com' };

function table(result: { data?: unknown; error?: unknown; count?: number | null } = {}) {
  return stubTable({ data: result.data ?? null, error: result.error ?? null, count: result.count });
}

describe('eleva server actions — auth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateClient.mockReset();
    mockRedirect.mockReset();
    mockRedirect.mockImplementation((url: string): never => {
      throw new Error(`NEXT_REDIRECT:${url}`);
    });
    mockCreateClient.mockResolvedValue(stubSupabase(null, {}) as never);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('requireUser / getCurrentUser', () => {
    it('returns the client and user for an authenticated caller', async () => {
      const client = installClient(authedUser, {});

      await expect(requireUser()).resolves.toEqual({ supabase: client, user: authedUser });
      expect(mockRedirect).not.toHaveBeenCalled();
    });

    it('redirects to login when the user is missing or auth errors', async () => {
      installClient(null, {});
      await expect(requireUser()).rejects.toThrow('NEXT_REDIRECT:/eleva/auth/login');

      installClient(null, {}, { authError: { message: 'invalid token' } });
      await expect(requireUser()).rejects.toThrow('NEXT_REDIRECT:/eleva/auth/login');
      expect(mockRedirect).toHaveBeenCalledTimes(2);
    });

    it('returns the current user without redirecting when signed out', async () => {
      installClient(null, {}, { authError: { message: 'ignored' } });
      await expect(getCurrentUser()).resolves.toEqual({
        supabase: expect.anything(),
        user: null,
      });
      expect(mockRedirect).not.toHaveBeenCalled();
    });
  });

  describe('logActivity', () => {
    it('writes activity with nullable optional fields', async () => {
      const activity = table();
      installClient(authedUser, { activity_log: activity });

      await logActivity('resume_created', 'Created resume');

      expect(activity.calls.insert[0][0]).toEqual({
        user_id: 'user-1',
        kind: 'resume_created',
        title: 'Created resume',
        subtitle: null,
        meta: null,
      });
    });

    it('preserves subtitle and meta when supplied', async () => {
      const activity = table();
      installClient(authedUser, { activity_log: activity });

      await logActivity('pipeline_run', 'Tailored', 'Acme', { overall: 88 });

      expect(activity.calls.insert[0][0]).toMatchObject({
        subtitle: 'Acme',
        meta: { overall: 88 },
      });
    });

    it('does not write activity for signed-out callers', async () => {
      const activity = table();
      installClient(null, { activity_log: activity });

      await expect(logActivity('x', 'y')).resolves.toBeUndefined();
      expect(activity.calls.insert).toHaveLength(0);
    });
  });

  describe('signOut', () => {
    it('signs out and redirects to login', async () => {
      const client = installClient(authedUser, {});

      await expect(signOut()).rejects.toThrow('NEXT_REDIRECT:/eleva/auth/login');
      expect(client.auth.signOut).toHaveBeenCalledTimes(1);
      expect(mockRedirect).toHaveBeenCalledWith('/eleva/auth/login');
    });
  });
});