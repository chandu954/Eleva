// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockCreateClient, mockRedirect, mockRevalidatePath } = vi.hoisted(() => ({
  mockCreateClient: vi.fn(),
  mockRedirect: vi.fn(),
  mockRevalidatePath: vi.fn(),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({ getAll: () => [], set: vi.fn() })),
}));
vi.mock('next/navigation', () => ({ redirect: mockRedirect }));
vi.mock('next/cache', () => ({ revalidatePath: mockRevalidatePath }));
vi.mock('@/utils/supabase/server', () => ({ createClient: mockCreateClient }));

import { stubSupabase, type PostgrestStub } from '@/test/postgrest-stub';
import { authedUser, table } from '@/test/eleva-actions-test-utils';

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

function resetActionsMocks() {
  vi.clearAllMocks();
  mockCreateClient.mockReset();
  mockRedirect.mockReset();
  mockRedirect.mockImplementation((url: string): never => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  });
  mockCreateClient.mockResolvedValue(stubSupabase(null, {}) as never);
}
import {
  createJob,
  getSubscription,
  listActivity,
  listCoverLetters,
  listJobsForUser,
  listScores,
  listVersions,
  saveCoverLetter,
  updateProfile,
} from './actions';

describe('eleva server actions — lists and writes', () => {
  beforeEach(resetActionsMocks);

  describe('lists and lookups', () => {
    it('lists activity with the default and custom limits', async () => {
      const activity = table({ data: [{ id: 'a1' }] });
      installClient(authedUser, { activity_log: activity });

      await expect(listActivity()).resolves.toEqual([{ id: 'a1' }]);
      await listActivity(5);

      expect(activity.calls.limit).toEqual([[40], [5]]);
      expect(activity.calls.order).toEqual([
        ['created_at', { ascending: false }],
        ['created_at', { ascending: false }],
      ]);
    });

    it('returns [] when activity data is null', async () => {
      installClient(authedUser, { activity_log: table() });
      await expect(listActivity()).resolves.toEqual([]);
    });

    it('lists cover letters and jobs scoped to the caller', async () => {
      const coverLetters = table({ data: [{ id: 'cl1' }] });
      const jobs = table({ data: [{ id: 'j1' }] });
      installClient(authedUser, { cover_letters: coverLetters, jobs });

      await expect(listCoverLetters()).resolves.toEqual([{ id: 'cl1' }]);
      await expect(listJobsForUser()).resolves.toEqual([{ id: 'j1' }]);

      expect(coverLetters.calls.eq).toEqual([['user_id', 'user-1']]);
      expect(jobs.calls.eq).toEqual([['user_id', 'user-1']]);
    });

    it('returns [] when cover letters or jobs are absent', async () => {
      installClient(authedUser, { cover_letters: table(), jobs: table() });
      await expect(listCoverLetters()).resolves.toEqual([]);
      await expect(listJobsForUser()).resolves.toEqual([]);
    });

    it('lists scores globally and filtered by resume', async () => {
      const scores = table({ data: [{ id: 's1' }] });
      installClient(authedUser, { ats_scores: scores });

      await expect(listScores()).resolves.toEqual([{ id: 's1' }]);
      await listScores('r1');

      expect(scores.calls.eq).toEqual([
        ['user_id', 'user-1'],
        ['user_id', 'user-1'],
        ['resume_id', 'r1'],
      ]);
      expect(scores.calls.limit).toEqual([[200], [200]]);
    });

    it('lists versions for a resume scoped to the caller', async () => {
      const versions = table({ data: [{ id: 'v1' }] });
      installClient(authedUser, { resume_versions: versions });

      await expect(listVersions('r1')).resolves.toEqual([{ id: 'v1' }]);
      expect(versions.calls.eq).toEqual([
        ['user_id', 'user-1'],
        ['resume_id', 'r1'],
      ]);
    });

    it('returns [] when versions are absent', async () => {
      installClient(authedUser, { resume_versions: table() });
      await expect(listVersions('r1')).resolves.toEqual([]);
    });

    it('reads the caller subscription', async () => {
      const subscriptions = table({ data: { subscription_plan: 'pro' } });
      installClient(authedUser, { subscriptions });

      await expect(getSubscription()).resolves.toEqual({ subscription_plan: 'pro' });
      expect(subscriptions.calls.eq).toEqual([['user_id', 'user-1']]);
      expect(subscriptions.calls.maybeSingle).toHaveLength(1);
    });
  });

  describe('writes', () => {
    it('saves a cover letter and logs generation activity', async () => {
      const coverLetters = table({ data: { id: 'cl1' } });
      const activity = table();
      installClient(authedUser, { cover_letters: coverLetters, activity_log: activity });

      const row = { company: 'Acme', role: 'Engineer', body: 'Hello' };
      await expect(saveCoverLetter(row)).resolves.toEqual({ id: 'cl1' });

      expect(coverLetters.calls.insert[0][0]).toEqual({ ...row, user_id: 'user-1' });
      expect(activity.calls.insert[0][0]).toMatchObject({
        kind: 'cover_generated',
        title: 'Cover letter · Engineer',
        subtitle: 'Acme',
      });
    });

    it('creates a job and logs application activity', async () => {
      const jobs = table({ data: { id: 'j1' } });
      const activity = table();
      installClient(authedUser, { jobs, activity_log: activity });

      const row = { company_name: 'Acme', position_title: 'Engineer' };
      await expect(createJob(row)).resolves.toEqual({ id: 'j1' });

      expect(jobs.calls.insert[0][0]).toEqual({ ...row, user_id: 'user-1' });
      expect(activity.calls.insert[0][0]).toMatchObject({
        kind: 'application_added',
        title: 'Added Engineer',
        subtitle: 'Acme',
      });
      expect(mockRevalidatePath).toHaveBeenCalledWith('/eleva/applications');
    });

    it('upserts the profile with the caller id', async () => {
      const profiles = table();
      installClient(authedUser, { profiles });

      await updateProfile({ first_name: 'Ada' });

      expect(profiles.calls.upsert[0][0]).toEqual({
        user_id: 'user-1',
        first_name: 'Ada',
      });
      expect(mockRevalidatePath).toHaveBeenCalledWith('/eleva/settings');
    });
  });
});
