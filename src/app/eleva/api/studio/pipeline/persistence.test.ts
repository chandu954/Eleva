import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { persistPipelineResults } from './persistence';
import type { ScoreData } from './prompts';

type SupabaseClientLike = Parameters<typeof persistPipelineResults>[0]['supabase'];

type RecordedCall = { table: string; payload: unknown };

function score(overrides: Partial<ScoreData> = {}): ScoreData {
  return {
    overall: 78,
    keyword: 80,
    formatting: 90,
    readability: 85,
    impact: 70,
    recruiter: 75,
    matched: ['typescript', 'react'],
    missing: ['go'],
    suggestions: [{ type: 'warning', text: 'Add Go', action: 'Rewrite experience' }],
    summary: 'Solid match',
    ...overrides,
  };
}

function makeSupabase({
  coverLetterId = 'cl-1',
  resumeError = null,
  notificationError = null,
}: {
  coverLetterId?: string | null;
  resumeError?: { message: string } | null;
  notificationError?: Error | null;
} = {}) {
  const calls: RecordedCall[] = [];
  const from = vi.fn((table: string) => ({
    insert: vi.fn((payload: unknown) => {
      calls.push({ table, payload });
      if (table === 'notifications' && notificationError) return Promise.reject(notificationError);
      if (table === 'cover_letters') {
        return {
          select: () => ({
            single: async () => ({ data: coverLetterId ? { id: coverLetterId } : null }),
          }),
        };
      }
      return Promise.resolve({ error: table === 'resumes' ? resumeError : null });
    }),
  }));

  return { client: { from } as unknown as SupabaseClientLike, calls, from };
}

const tailoredResume = {
  professional_summary: 'Tailored summary',
  skills: [{ category: 'Lang', skills: ['TypeScript'] }],
  work_experience: [{ company: 'Acme', position: 'Engineer', description: '', responsibilities: ['Shipped'] }],
  projects: [],
  education: [],
  certifications: [],
};

const baseArgs = {
  effectiveResumeId: 'resume-1',
  originalResume: { id: 'resume-1', name: 'Base', professional_summary: 'Old' },
  tailoredResume,
  originalScore: score({ overall: 60 }),
  rescore: score({ overall: 82 }),
  skills: { company: 'Acme', role: 'Engineer' },
  letterText: 'Dear hiring manager',
};

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('persistPipelineResults', () => {
  it('does nothing for signed-out runs', async () => {
    const { client, calls } = makeSupabase();

    await expect(persistPipelineResults({ ...baseArgs, supabase: client, uid: undefined }))
      .resolves.toEqual({ savedCoverLetterId: null });
    expect(calls).toEqual([]);
  });

  it('writes the ATS score, tailored resume, cover letter, activity and notification', async () => {
    const { client, calls } = makeSupabase();

    await expect(persistPipelineResults({ ...baseArgs, supabase: client, uid: 'user-1' }))
      .resolves.toEqual({ savedCoverLetterId: 'cl-1' });

    expect(calls.map((c) => c.table)).toEqual([
      'ats_scores',
      'resumes',
      'cover_letters',
      'activity_log',
      'notifications',
    ]);

    const ats = calls.find((c) => c.table === 'ats_scores')?.payload as Record<string, unknown>;
    expect(ats).toMatchObject({ user_id: 'user-1', resume_id: 'resume-1', overall: 82, raw: expect.any(Object) });

    const resume = calls.find((c) => c.table === 'resumes')?.payload as Record<string, unknown>;
    expect(resume).toMatchObject({ user_id: 'user-1', is_base_resume: false, name: expect.any(String) });

    const letter = calls.find((c) => c.table === 'cover_letters')?.payload as Record<string, unknown>;
    expect(letter).toMatchObject({ user_id: 'user-1', company: 'Acme', role: 'Engineer', body: 'Dear hiring manager' });

    const activity = calls.find((c) => c.table === 'activity_log')?.payload as Record<string, unknown>;
    expect(activity.meta).toMatchObject({ atsOverall: 82, previousOverall: 60, coverLetterId: 'cl-1' });

    const notification = calls.find((c) => c.table === 'notifications')?.payload as Record<string, unknown>;
    expect(notification.title).toBe('Pipeline complete · 60% → 82%');
  });

  it('skips the ATS row when no resume id is available', async () => {
    const { client, calls } = makeSupabase();

    await persistPipelineResults({ ...baseArgs, effectiveResumeId: undefined, supabase: client, uid: 'user-1' });

    expect(calls.some((c) => c.table === 'ats_scores')).toBe(false);
    const letter = calls.find((c) => c.table === 'cover_letters')?.payload as Record<string, unknown>;
    expect(letter.resume_id).toBeUndefined();
  });

  it('skips tailored-resume persistence for anonymous resume data', async () => {
    const { client, calls } = makeSupabase();

    await persistPipelineResults({ ...baseArgs, originalResume: null, supabase: client, uid: 'user-1' });

    expect(calls.some((c) => c.table === 'resumes')).toBe(false);
    expect(calls.some((c) => c.table === 'cover_letters')).toBe(true);
  });

  it('logs and continues when the tailored resume insert fails', async () => {
    const { client } = makeSupabase({ resumeError: { message: 'duplicate' } });

    await expect(persistPipelineResults({ ...baseArgs, supabase: client, uid: 'user-1' }))
      .resolves.toEqual({ savedCoverLetterId: 'cl-1' });
    expect(console.warn).toHaveBeenCalledWith('[Pipeline] failed to save tailored resume:', 'duplicate');
  });

  it('swallows notification failures', async () => {
    const { client } = makeSupabase({ notificationError: new Error('offline') });

    await expect(persistPipelineResults({ ...baseArgs, supabase: client, uid: 'user-1' }))
      .resolves.toEqual({ savedCoverLetterId: 'cl-1' });
  });

  it('returns a null cover-letter id when the insert returns no row', async () => {
    const { client } = makeSupabase({ coverLetterId: null });

    await expect(persistPipelineResults({ ...baseArgs, supabase: client, uid: 'user-1' }))
      .resolves.toEqual({ savedCoverLetterId: null });
  });
});
