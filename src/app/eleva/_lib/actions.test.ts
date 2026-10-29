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
import { revalidatePath } from 'next/cache';
import {
  createBlankResume,
  createJob,
  deleteResume,
  duplicateResume,
  getDashboardData,
  getResume,
  getSubscription,
  listActivity,
  listCoverLetters,
  listJobsForUser,
  listResumes,
  listScores,
  listVersions,
  saveCoverLetter,
  saveResumeVersion,
  updateProfile,
  updateResumeFields,
} from './actions';

const mockCreateClient = vi.mocked(createClient);
const mockRedirect = vi.mocked(redirect);
const mockRevalidatePath = vi.mocked(revalidatePath);

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

function daysAgoIso(reference: Date, daysAgo: number): string {
  const date = new Date(reference);
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString();
}

describe('eleva server actions', () => {
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

  describe('getDashboardData', () => {
    it('aggregates counts, ATS history, weekly activity and recent resumes', async () => {
      vi.useFakeTimers();
      const now = new Date('2026-10-27T12:00:00.000Z');
      vi.setSystemTime(now);

      const recentActivity = [
        { id: 'a1', kind: 'resume_created', title: 'Created', subtitle: null, created_at: daysAgoIso(now, 0) },
      ];
      const profile = { first_name: 'Ada', last_name: 'Lovelace', email: 'ada@example.com' };
      const resumesRecent = [
        { id: 'r1', name: 'Backend', target_role: 'Engineer', updated_at: daysAgoIso(now, 0) },
        { id: 'r2', name: 'Frontend', target_role: 'Engineer', updated_at: daysAgoIso(now, 1) },
      ];

      installClient(authedUser, {
        profiles: table({ data: profile }),
        resumes: [
          table({ count: 3 }),
          table({ data: resumesRecent }),
        ],
        jobs: table({ count: 2 }),
        cover_letters: table({ count: 1 }),
        activity_log: [
          table({ data: recentActivity }),
          table({
            data: [
              { created_at: new Date(now.getTime() - 3_600_000).toISOString() },
              { created_at: new Date(now.getTime() - 25 * 3_600_000).toISOString() },
              { created_at: new Date(now.getTime() - 8 * 86_400_000).toISOString() },
            ],
          }),
        ],
        ats_scores: [
          table({
            data: [
              { overall: 80, keyword: 70, missing: ['SQL'], created_at: daysAgoIso(now, 0) },
              { overall: 60, keyword: 50, missing: null, created_at: daysAgoIso(now, 1) },
            ],
          }),
          table({
            data: [
              { resume_id: 'r1', overall: 88, created_at: daysAgoIso(now, 0) },
              { resume_id: 'r1', overall: 70, created_at: daysAgoIso(now, 1) },
              { resume_id: 'r2', overall: 55, created_at: daysAgoIso(now, 0) },
            ],
          }),
        ],
      });

      const data = await getDashboardData();

      expect(data).toEqual({
        profile,
        resumesCount: 3,
        applicationsCount: 2,
        coverLettersCount: 1,
        averageAts: 70,
        atsSeries: [0, 0, 0, 0, 0, 60, 80],
        recentActivity,
        weeklyBars: [0, 0, 0, 0, 0, 1, 1],
        latestScore: { overall: 80, keyword: 70, missing: ['SQL'] },
        resumesRecent: [
          { ...resumesRecent[0], latest_ats: 88 },
          { ...resumesRecent[1], latest_ats: 55 },
        ],
      });
    });

    it('falls back to empty values and the auth email for a new account', async () => {
      installClient(authedUser, {
        profiles: table(),
        resumes: [table({ count: null }), table()],
        jobs: table(),
        cover_letters: table(),
        activity_log: [table(), table()],
        ats_scores: [table()],
      });

      const data = await getDashboardData();

      expect(data).toEqual({
        profile: { email: 'ada@example.com' },
        resumesCount: 0,
        applicationsCount: 0,
        coverLettersCount: 0,
        averageAts: null,
        atsSeries: [0, 0, 0, 0, 0, 0, 0],
        recentActivity: [],
        weeklyBars: [0, 0, 0, 0, 0, 0, 0],
        latestScore: null,
        resumesRecent: [],
      });
    });
  });

  describe('resume listing and reads', () => {
    it('returns [] when the listing query has no data', async () => {
      installClient(authedUser, { resumes: table() });
      await expect(listResumes()).resolves.toEqual([]);
    });

    it('returns an empty mapping when the user has no resumes', async () => {
      const resumes = table({ data: [] });
      installClient(authedUser, { resumes });
      await expect(listResumes()).resolves.toEqual([]);
      expect(resumes.calls.eq).toEqual([['user_id', 'user-1']]);
      expect(resumes.calls.order).toEqual([['updated_at', { ascending: false }]]);
    });

    it('attaches the newest ATS score per resume', async () => {
      const resumes = table({
        data: [
          { id: 'r1', name: 'One', target_role: 'Eng', is_base_resume: true, updated_at: 'x', created_at: 'y' },
          { id: 'r2', name: 'Two', target_role: 'Eng', is_base_resume: false, updated_at: 'x', created_at: 'y' },
        ],
      });
      const scores = table({
        data: [
          { resume_id: 'r1', overall: 88, created_at: '2026-10-27' },
          { resume_id: 'r1', overall: 60, created_at: '2026-10-26' },
          { resume_id: 'r2', overall: 55, created_at: '2026-10-25' },
        ],
      });
      installClient(authedUser, { resumes, ats_scores: scores });

      const result = await listResumes();

      expect(result.map((row) => row.latest_ats)).toEqual([88, 55]);
      expect(scores.calls.in).toEqual([['resume_id', ['r1', 'r2']]]);
      expect(scores.calls.order).toEqual([['created_at', { ascending: false }]]);
    });

    it('scopes getResume to the caller', async () => {
      const row = { id: 'r1', name: 'Mine' };
      const resumes = table({ data: row });
      installClient(authedUser, { resumes });

      await expect(getResume('r1')).resolves.toEqual(row);
      expect(resumes.calls.eq).toEqual([
        ['id', 'r1'],
        ['user_id', 'user-1'],
      ]);
      expect(resumes.calls.maybeSingle).toHaveLength(1);
    });
  });

  describe('resume mutations', () => {
    it('creates a blank resume from the profile and logs activity', async () => {
      const resumes = table({ data: { id: 'res-new' } });
      const profiles = table({
        data: {
          first_name: 'Ada',
          last_name: 'Lovelace',
          email: 'profile@example.com',
          phone_number: '123',
          location: 'London',
          linkedin_url: 'linkedin',
          github_url: 'github',
          website: 'site',
          work_experience: [{ company: 'Acme' }],
          education: [{ school: 'Oxford' }],
          skills: [{ category: 'Languages' }],
          projects: [{ name: 'Eleva' }],
          certifications: [{ name: 'AWS' }],
        },
      });
      const activity = table();
      installClient(authedUser, { resumes, profiles, activity_log: activity });

      await expect(createBlankResume('My resume')).resolves.toEqual({ id: 'res-new' });

      expect(resumes.calls.insert[0][0]).toEqual({
        user_id: 'user-1',
        name: 'My resume',
        is_base_resume: true,
        first_name: 'Ada',
        last_name: 'Lovelace',
        email: 'profile@example.com',
        phone_number: '123',
        location: 'London',
        linkedin_url: 'linkedin',
        github_url: 'github',
        website: 'site',
        work_experience: [{ company: 'Acme' }],
        education: [{ school: 'Oxford' }],
        skills: [{ category: 'Languages' }],
        projects: [{ name: 'Eleva' }],
        certifications: [{ name: 'AWS' }],
      });
      expect(activity.calls.insert[0][0]).toMatchObject({
        user_id: 'user-1',
        kind: 'resume_created',
        title: 'Created My resume',
        subtitle: 'Blank resume',
      });
      expect(mockRevalidatePath).toHaveBeenCalledWith('/eleva/resumes');
      expect(mockRevalidatePath).toHaveBeenCalledWith('/eleva/dashboard');
    });

    it('uses defaults when the profile and name are absent', async () => {
      const resumes = table({ data: { id: 'res-new' } });
      installClient(authedUser, {
        resumes,
        profiles: table(),
        activity_log: table(),
      });

      await createBlankResume();

      expect(resumes.calls.insert[0][0]).toMatchObject({
        name: 'Untitled resume',
        first_name: null,
        last_name: null,
        email: 'ada@example.com',
        work_experience: [],
        education: [],
        skills: [],
        projects: [],
        certifications: [],
      });
    });

    it('surfaces insert failures when creating a resume', async () => {
      installClient(authedUser, {
        resumes: table({ error: { message: 'insert failed' } }),
        profiles: table(),
        activity_log: table(),
      });

      await expect(createBlankResume('X')).rejects.toThrow('insert failed');
      expect(mockRevalidatePath).not.toHaveBeenCalled();
    });

    it('throws a generic insert failure when the database returns no row', async () => {
      installClient(authedUser, {
        resumes: table({ data: null, error: null }),
        profiles: table(),
        activity_log: table(),
      });

      await expect(createBlankResume('X')).rejects.toThrow('insert failed');
    });

    it('deletes a resume scoped to the caller and revalidates', async () => {
      const resumes = table();
      installClient(authedUser, { resumes });

      await deleteResume('r1');

      expect(resumes.calls.delete).toHaveLength(1);
      expect(resumes.calls.eq).toEqual([
        ['id', 'r1'],
        ['user_id', 'user-1'],
      ]);
      expect(mockRevalidatePath).toHaveBeenCalledWith('/eleva/resumes');
      expect(mockRevalidatePath).toHaveBeenCalledWith('/eleva/dashboard');
    });

    it('rejects duplication when the source resume does not exist', async () => {
      installClient(authedUser, { resumes: table() });
      await expect(duplicateResume('missing')).rejects.toThrow('not found');
    });

    it('duplicates a resume without copying identity or timestamps', async () => {
      const source = {
        id: 'r1',
        name: 'Backend',
        created_at: '2026-01-01',
        updated_at: '2026-01-02',
        user_id: 'user-1',
        skills: [{ category: 'Languages', skills: ['Go'] }],
      };
      const sourceLookup = table({ data: source });
      const copyInsert = table({ data: { id: 'r2' } });
      const activity = table();
      installClient(authedUser, { resumes: [sourceLookup, copyInsert], activity_log: activity });

      await expect(duplicateResume('r1')).resolves.toEqual({ id: 'r2' });

      const copy = copyInsert.calls.insert[0][0] as Record<string, unknown>;
      expect(copy).toEqual({
        name: 'Backend (copy)',
        user_id: 'user-1',
        skills: [{ category: 'Languages', skills: ['Go'] }],
      });
      expect(copy).not.toHaveProperty('id');
      expect(copy).not.toHaveProperty('created_at');
      expect(copy).not.toHaveProperty('updated_at');
      expect(activity.calls.insert[0][0]).toMatchObject({
        kind: 'resume_created',
        title: 'Duplicated Backend',
        subtitle: 'New copy: Backend (copy)',
      });
      expect(mockRevalidatePath).toHaveBeenCalledWith('/eleva/resumes');
    });

    it('surfaces duplication insert failures', async () => {
      const resumes = [
        table({ data: { id: 'r1', name: 'Backend' } }),
        table({ error: { message: 'copy failed' } }),
      ];
      installClient(authedUser, { resumes, activity_log: table() });

      await expect(duplicateResume('r1')).rejects.toThrow('copy failed');
    });

    it('updates resume fields scoped to the caller', async () => {
      const resumes = table();
      installClient(authedUser, { resumes });

      await updateResumeFields('r1', { name: 'New name' });

      expect(resumes.calls.update[0][0]).toEqual({ name: 'New name' });
      expect(resumes.calls.eq).toEqual([
        ['id', 'r1'],
        ['user_id', 'user-1'],
      ]);
      expect(mockRevalidatePath).toHaveBeenCalledWith('/eleva/editor?id=r1');
    });

    it('saves a version snapshot when the source resume exists', async () => {
      const source = { id: 'r1', name: 'Backend', user_id: 'user-1' };
      const versions = table();
      installClient(authedUser, {
        resumes: table({ data: source }),
        resume_versions: versions,
      });

      await saveResumeVersion('r1', 'Before tailoring', 82);

      expect(versions.calls.insert[0][0]).toEqual({
        user_id: 'user-1',
        resume_id: 'r1',
        version_label: 'Before tailoring',
        snapshot: source,
        ats_score: 82,
      });
    });

    it('stores a null ATS score and skips missing source resumes', async () => {
      const versions = table();
      installClient(authedUser, {
        resumes: [table({ data: { id: 'r1', name: 'Backend' } }), table()],
        resume_versions: versions,
      });

      await saveResumeVersion('r1', 'v1');
      expect(versions.calls.insert[0][0]).toMatchObject({ ats_score: null });

      await saveResumeVersion('missing', 'v2');
      expect(versions.calls.insert).toHaveLength(1);
    });
  });

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
