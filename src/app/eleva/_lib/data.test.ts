// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { stubSupabase, stubTable, type PostgrestStub } from '@/test/postgrest-stub';

vi.mock('@/utils/supabase/server', () => ({ createClient: vi.fn() }));

import { createClient } from '@/utils/supabase/server';
import {
  getAiUsage,
  getApplications,
  getDashboardMetrics,
  getProfile,
  getRecentActivity,
  getRecentAtsReports,
  getRecentResumes,
  getSubscription,
  getUser,
  getUserPreferences,
} from './data';

const mockCreateClient = vi.mocked(createClient);

function daysAgo(offset: number): string {
  const date = new Date();
  date.setUTCHours(12, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() - offset);
  return date.toISOString();
}

function installClient(
  user: { id: string } | null,
  tables: Record<string, PostgrestStub | PostgrestStub[]>,
) {
  mockCreateClient.mockResolvedValue(stubSupabase(user, tables) as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockCreateClient.mockReset();
});

describe('getUser', () => {
  it('returns the authenticated user or null', async () => {
    installClient({ id: 'user-1' }, {});
    await expect(getUser()).resolves.toEqual({ id: 'user-1' });

    installClient(null, {});
    await expect(getUser()).resolves.toBeNull();
  });
});

describe('getDashboardMetrics', () => {
  it('aggregates counts, trends, statuses, and ATS averages', async () => {
    const resumes = stubTable({
      data: [
        { id: 'r1', created_at: daysAgo(1) },
        { id: 'r2', created_at: daysAgo(1) },
        { id: 'r3', created_at: daysAgo(6) },
        { id: 'r4' },
      ],
      error: null,
      count: 4,
    });
    const ats = stubTable({
      data: [
        { overall: 60, created_at: daysAgo(6) },
        { overall: 80, created_at: daysAgo(0) },
        { overall: 90, created_at: daysAgo(0) },
      ],
      error: null,
    });
    const coverLetters = stubTable({
      data: [{ id: 'c1', created_at: daysAgo(2) }],
      error: null,
      count: 1,
    });
    const activity = stubTable({
      data: [
        { kind: 'resume_updated', created_at: daysAgo(0) },
        { kind: 'cover_letter_created', created_at: daysAgo(0) },
        { kind: 'application_created', created_at: daysAgo(1) },
        { kind: 'orphan' },
      ],
      error: null,
    });
    const applications = stubTable({
      data: [
        { id: 'a1', status: 'interview', created_at: daysAgo(0) },
        { id: 'a2', status: 'applied', created_at: daysAgo(1) },
        { id: 'a3', status: '', created_at: daysAgo(0) },
        { id: 'a4', status: 'interview' },
      ],
      error: null,
      count: 4,
    });

    installClient({ id: 'user-1' }, {
      resumes,
      ats_scores: ats,
      cover_letters: coverLetters,
      activity_log: activity,
      applications,
    });

    const metrics = await getDashboardMetrics('user-1');

    expect(metrics).toEqual({
      resumes: 4,
      applications: 4,
      avgAts: 77,
      coverLetters: 1,
      interviews: 2,
      atsTrend: [60, 60, 60, 60, 60, 60, 85],
      applicationsTrend: [0, 0, 0, 0, 0, 1, 3],
      resumeGrowth: [1, 1, 1, 1, 1, 3, 3],
      weeklyProductivity: [0, 0, 0, 0, 0, 1, 2],
      atsDelta: 30,
      applicationsByStatus: { interview: 2, applied: 2 },
    });

    expect(resumes.calls.select[0]).toEqual(['id, created_at', { count: 'exact' }]);
    expect(resumes.calls.eq[0]).toEqual(['user_id', 'user-1']);
    expect(ats.calls.select[0]).toEqual(['overall, created_at']);
    expect(ats.calls.eq[0]).toEqual(['user_id', 'user-1']);
    expect(ats.calls.order[0]).toEqual(['created_at', { ascending: true }]);
    expect(ats.calls.gte[0]?.[0]).toBe('created_at');
    const atsSince = new Date(String(ats.calls.gte[0]?.[1])).getTime();
    expect(Math.abs(Date.now() - atsSince - 30 * 24 * 60 * 60 * 1000)).toBeLessThan(5_000);

    expect(applications.calls.select[0]).toEqual([
      'id, status, created_at',
      { count: 'exact' },
    ]);
    expect(applications.calls.eq[0]).toEqual(['user_id', 'user-1']);
    expect(coverLetters.calls.select[0]).toEqual(['id, created_at', { count: 'exact' }]);
    expect(activity.calls.gte[0]?.[0]).toBe('created_at');
  });

  it('falls back gracefully when the applications table is unavailable', async () => {
    installClient({ id: 'user-1' }, {
      resumes: stubTable({ data: [], error: null, count: 0 }),
      ats_scores: stubTable({ data: [], error: null }),
      cover_letters: stubTable({ data: [], error: null, count: 0 }),
      activity_log: stubTable({ data: [], error: null }),
      // No "applications" table stub: from('applications') throws and is caught.
    });

    const metrics = await getDashboardMetrics('user-1');

    expect(metrics).toMatchObject({
      resumes: 0,
      applications: 0,
      avgAts: 0,
      coverLetters: 0,
      interviews: 0,
      atsDelta: 0,
      applicationsByStatus: {},
      atsTrend: [0, 0, 0, 0, 0, 0, 0],
      applicationsTrend: [0, 0, 0, 0, 0, 0, 0],
      resumeGrowth: [0, 0, 0, 0, 0, 0, 0],
      weeklyProductivity: [0, 0, 0, 0, 0, 0, 0],
    });
  });

  it('uses zero for every metric when tables return no rows or counts', async () => {
    installClient({ id: 'user-1' }, {
      resumes: stubTable({ data: null, error: null, count: null }),
      ats_scores: stubTable({ data: null, error: null }),
      cover_letters: stubTable({ data: null, error: null, count: null }),
      activity_log: stubTable({ data: null, error: null }),
      applications: stubTable({ data: null, error: null, count: null }),
    });

    const metrics = await getDashboardMetrics('user-1');

    expect(metrics).toEqual({
      resumes: 0,
      applications: 0,
      avgAts: 0,
      coverLetters: 0,
      interviews: 0,
      atsTrend: [0, 0, 0, 0, 0, 0, 0],
      applicationsTrend: [0, 0, 0, 0, 0, 0, 0],
      resumeGrowth: [0, 0, 0, 0, 0, 0, 0],
      weeklyProductivity: [0, 0, 0, 0, 0, 0, 0],
      atsDelta: 0,
      applicationsByStatus: {},
    });
  });
});

describe('getRecentActivity', () => {
  it('resolves resume names for string resume ids and defaults them to null', async () => {
    const activity = stubTable({
      data: [
        {
          id: 'act-1',
          kind: 'resume_updated',
          title: 'Resume updated',
          subtitle: null,
          meta: { resumeId: 'r1' },
          created_at: '2026-10-27T10:00:00.000Z',
        },
        {
          id: 'act-2',
          kind: 'resume_tailored',
          title: 'Resume tailored',
          subtitle: 'Acme',
          meta: { resumeId: 'r1' },
          created_at: '2026-10-27T09:00:00.000Z',
        },
        {
          id: 'act-3',
          kind: 'profile_updated',
          title: 'Profile updated',
          subtitle: null,
          meta: null,
          created_at: '2026-10-26T10:00:00.000Z',
        },
        {
          id: 'act-4',
          kind: 'imported',
          title: 'Imported',
          subtitle: null,
          meta: { resumeId: 42 },
          created_at: '2026-10-25T10:00:00.000Z',
        },
      ],
      error: null,
    });
    const resumes = stubTable({
      data: [
        { id: 'r1', name: 'Primary Resume' },
        { id: 'r2', name: 'Unused Resume' },
      ],
      error: null,
    });
    installClient({ id: 'user-1' }, { activity_log: activity, resumes });

    const items = await getRecentActivity('user-1');

    expect(items).toHaveLength(4);
    expect(items[0]).toMatchObject({ id: 'act-1', resumeName: 'Primary Resume' });
    expect(items[1]).toMatchObject({ id: 'act-2', resumeName: 'Primary Resume' });
    expect(items[2]).toMatchObject({ id: 'act-3', resumeName: null });
    expect(items[3]).toMatchObject({ id: 'act-4', resumeName: null });

    expect(activity.calls.select[0]).toEqual(['id, kind, title, subtitle, meta, created_at']);
    expect(activity.calls.eq[0]).toEqual(['user_id', 'user-1']);
    expect(activity.calls.order[0]).toEqual(['created_at', { ascending: false }]);
    expect(activity.calls.limit[0]).toEqual([8]);
    // Duplicate resume ids are de-duplicated before the name lookup.
    expect(resumes.calls.in[0]).toEqual(['id', ['r1']]);
  });

  it('skips the resume lookup when no row has a string resume id', async () => {
    const activity = stubTable({
      data: [
        {
          id: 'act-1',
          kind: 'profile_updated',
          title: 'Profile updated',
          subtitle: null,
          meta: { resumeId: 42 },
          created_at: '2026-10-27T10:00:00.000Z',
        },
      ],
      error: null,
    });
    // Deliberately omitting the resumes table: querying it would throw.
    installClient({ id: 'user-1' }, { activity_log: activity });

    const items = await getRecentActivity('user-1', 3);

    expect(items[0]?.resumeName).toBeNull();
    expect(activity.calls.limit[0]).toEqual([3]);
  });

  it('keeps resumeName null when the resume lookup returns no rows', async () => {
    const activity = stubTable({
      data: [
        {
          id: 'act-1',
          kind: 'resume_updated',
          title: 'Resume updated',
          subtitle: null,
          meta: { resumeId: 'missing' },
          created_at: '2026-10-27T10:00:00.000Z',
        },
      ],
      error: null,
    });
    const resumes = stubTable({ data: null, error: null });
    installClient({ id: 'user-1' }, { activity_log: activity, resumes });

    const items = await getRecentActivity('user-1');

    expect(items[0]).toMatchObject({ id: 'act-1', resumeName: null });
    expect(resumes.calls.in[0]).toEqual(['id', ['missing']]);
  });

  it('returns an empty list when there is no activity', async () => {
    const activity = stubTable({ data: null, error: null });
    installClient({ id: 'user-1' }, { activity_log: activity });

    await expect(getRecentActivity('user-1')).resolves.toEqual([]);
    expect(activity.calls.limit[0]).toEqual([8]);
  });
});

describe('recent dashboard lists', () => {
  it('returns recent resumes ordered by last update with the default limit', async () => {
    const resumes = stubTable({
      data: [{ id: 'r1', name: 'Primary', is_base_resume: true }],
      error: null,
    });
    const empty = stubTable({ data: null, error: null });
    mockCreateClient
      .mockResolvedValueOnce(stubSupabase({ id: 'user-1' }, { resumes }) as never)
      .mockResolvedValueOnce(stubSupabase({ id: 'user-1' }, { resumes: empty }) as never);

    await expect(getRecentResumes('user-1')).resolves.toEqual([
      { id: 'r1', name: 'Primary', is_base_resume: true },
    ]);
    expect(resumes.calls.select[0]).toEqual([
      'id, name, target_role, updated_at, created_at, is_base_resume',
    ]);
    expect(resumes.calls.eq[0]).toEqual(['user_id', 'user-1']);
    expect(resumes.calls.order[0]).toEqual(['updated_at', { ascending: false }]);
    expect(resumes.calls.limit[0]).toEqual([5]);

    await expect(getRecentResumes('user-1')).resolves.toEqual([]);
    expect(empty.calls.limit[0]).toEqual([5]);
  });

  it('returns recent ATS reports ordered by creation with the default limit', async () => {
    const report = { id: 'ats-1', overall: 88, created_at: daysAgo(1) };
    const ats = stubTable({ data: [report], error: null });
    const empty = stubTable({ data: null, error: null });
    mockCreateClient
      .mockResolvedValueOnce(stubSupabase({ id: 'user-1' }, { ats_scores: ats }) as never)
      .mockResolvedValueOnce(stubSupabase({ id: 'user-1' }, { ats_scores: empty }) as never);

    await expect(getRecentAtsReports('user-1')).resolves.toEqual([report]);
    expect(ats.calls.select[0]).toEqual([
      'id, overall, keyword, formatting, matched, missing, resume_id, created_at',
    ]);
    expect(ats.calls.eq[0]).toEqual(['user_id', 'user-1']);
    expect(ats.calls.order[0]).toEqual(['created_at', { ascending: false }]);
    expect(ats.calls.limit[0]).toEqual([5]);

    await expect(getRecentAtsReports('user-1')).resolves.toEqual([]);
    expect(empty.calls.limit[0]).toEqual([5]);
  });

  it('returns applications ordered by last update, or [] on error/null data', async () => {
    const application = { id: 'a1', status: 'interview' };
    const apps = stubTable({ data: [application], error: null });
    const failed = stubTable({ data: null, error: { message: 'boom' } });
    const empty = stubTable({ data: null, error: null });
    mockCreateClient
      .mockResolvedValueOnce(stubSupabase({ id: 'user-1' }, { applications: apps }) as never)
      .mockResolvedValueOnce(stubSupabase({ id: 'user-1' }, { applications: failed }) as never)
      .mockResolvedValueOnce(stubSupabase({ id: 'user-1' }, { applications: empty }) as never);

    await expect(getApplications('user-1')).resolves.toEqual([application]);
    expect(apps.calls.select[0]).toEqual(['*']);
    expect(apps.calls.eq[0]).toEqual(['user_id', 'user-1']);
    expect(apps.calls.order[0]).toEqual(['updated_at', { ascending: false }]);

    await expect(getApplications('user-1')).resolves.toEqual([]);
    await expect(getApplications('user-1')).resolves.toEqual([]);
  });
});

describe('single-record dashboard queries', () => {
  it('returns profile, preferences, and subscription rows via maybeSingle', async () => {
    const profile = stubTable({ data: { user_id: 'user-1', first_name: 'Ada' }, error: null });
    const preferences = stubTable({ data: null, error: null });
    const subscription = stubTable({ data: { user_id: 'user-1', plan: 'pro' }, error: null });
    mockCreateClient
      .mockResolvedValueOnce(stubSupabase({ id: 'user-1' }, { profiles: profile }) as never)
      .mockResolvedValueOnce(stubSupabase({ id: 'user-1' }, { user_preferences: preferences }) as never)
      .mockResolvedValueOnce(stubSupabase({ id: 'user-1' }, { subscriptions: subscription }) as never);

    await expect(getProfile('user-1')).resolves.toEqual({
      user_id: 'user-1',
      first_name: 'Ada',
    });
    await expect(getUserPreferences('user-1')).resolves.toBeNull();
    await expect(getSubscription('user-1')).resolves.toEqual({
      user_id: 'user-1',
      plan: 'pro',
    });

    expect(profile.calls.eq[0]).toEqual(['user_id', 'user-1']);
    expect(profile.calls.maybeSingle).toHaveLength(1);
    expect(preferences.calls.maybeSingle).toHaveLength(1);
    expect(subscription.calls.maybeSingle).toHaveLength(1);
  });

  it('queries AI usage inside the requested window and defaults to []', async () => {
    const event = {
      created_at: daysAgo(1),
      input_tokens: 10,
      output_tokens: 20,
      model: 'openrouter/free',
      route: 'actions.jobs',
    };
    const usage = stubTable({ data: [event], error: null });
    const empty = stubTable({ data: null, error: null });
    mockCreateClient
      .mockResolvedValueOnce(stubSupabase({ id: 'user-1' }, { ai_usage_events: usage }) as never)
      .mockResolvedValueOnce(stubSupabase({ id: 'user-1' }, { ai_usage_events: empty }) as never);

    await expect(getAiUsage('user-1', 7)).resolves.toEqual([event]);
    expect(usage.calls.select[0]).toEqual([
      'created_at, input_tokens, output_tokens, model, route',
    ]);
    expect(usage.calls.eq[0]).toEqual(['user_id', 'user-1']);
    expect(usage.calls.order[0]).toEqual(['created_at', { ascending: true }]);
    const since7 = new Date(String(usage.calls.gte[0]?.[1])).getTime();
    expect(Math.abs(Date.now() - since7 - 7 * 24 * 60 * 60 * 1000)).toBeLessThan(5_000);

    await expect(getAiUsage('user-1')).resolves.toEqual([]);
    const since30 = new Date(String(empty.calls.gte[0]?.[1])).getTime();
    expect(Math.abs(Date.now() - since30 - 30 * 24 * 60 * 60 * 1000)).toBeLessThan(5_000);
  });
});
