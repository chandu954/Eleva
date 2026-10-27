import { beforeEach, describe, expect, it, vi } from 'vitest';
import { stubSupabase, stubTable } from '@/test/postgrest-stub';

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(),
  createServiceClient: vi.fn(),
}));

vi.mock('@/utils/actions/stripe/actions', () => ({
  getSubscriptionPlan: vi.fn().mockResolvedValue({ plan: 'free', id: 'user-1' }),
}));

vi.mock('@/lib/ai/usage-ledger', () => ({
  startAIUsageRequest: vi.fn().mockResolvedValue({
    model: { modelId: 'mock' },
    usageEventId: 'usage-1',
    telemetry: {},
  }),
  finishAIUsageRequest: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/analytics/server', () => ({
  captureServerAnalyticsEvent: vi.fn().mockResolvedValue(undefined),
  getSubscriptionAnalyticsProperties: vi.fn().mockResolvedValue({ plan: 'free' }),
}));

vi.mock('ai', async (importOriginal) => {
  const actual = await importOriginal<typeof import('ai')>();
  return {
    ...actual,
    generateObject: vi.fn().mockResolvedValue({ object: { overallScore: 80 } }),
  };
});

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import {
  copyResume,
  countResumes,
  createBaseResume,
  createTailoredResume,
  deleteResume,
  generateResumeScore,
  getResumeById,
  updateResume,
} from './actions';

const mockCreateClient = vi.mocked(createClient);

const resume = {
  id: 'resume-1',
  user_id: 'user-1',
  name: 'Base',
  first_name: 'Ada',
  last_name: 'Lovelace',
  email: 'ada@example.com',
  phone_number: '123',
  location: 'London',
  website: 'https://ada.dev',
  linkedin_url: null,
  github_url: null,
  work_experience: [],
  education: [],
  skills: [],
  projects: [],
  section_order: [],
  section_configs: {},
  document_settings: {},
  is_base_resume: true,
  job_id: null,
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
};

const profile = {
  user_id: 'user-1',
  first_name: 'Ada',
  last_name: 'Lovelace',
  email: 'ada@example.com',
  phone_number: '123',
  location: 'London',
  website: 'https://ada.dev',
  linkedin_url: null,
  github_url: null,
};

describe('resume server actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads a resume with its profile and job', async () => {
    mockCreateClient.mockResolvedValue(
      stubSupabase({ id: 'user-1' }, {
        resumes: stubTable({ data: { ...resume, job_id: 'job-1' }, error: null }),
        profiles: stubTable({ data: profile, error: null }),
        jobs: stubTable({ data: { id: 'job-1' }, error: null }),
      }),
    );

    const result = await getResumeById('resume-1');

    expect(result.resume.id).toBe('resume-1');
    expect(result.profile.user_id).toBe('user-1');
    expect(result.job).toEqual({ id: 'job-1' });
  });

  it('returns a null job when the resume has none', async () => {
    mockCreateClient.mockResolvedValue(
      stubSupabase({ id: 'user-1' }, {
        resumes: stubTable({ data: resume, error: null }),
        profiles: stubTable({ data: profile, error: null }),
      }),
    );

    await expect(getResumeById('resume-1')).resolves.toMatchObject({ job: null });
  });

  it('rejects unauthenticated reads and writes', async () => {
    mockCreateClient.mockResolvedValue(stubSupabase(null, {}));

    await expect(getResumeById('resume-1')).rejects.toThrow('User not authenticated');
    await expect(updateResume('resume-1', {})).rejects.toThrow('User not authenticated');
    await expect(deleteResume('resume-1')).rejects.toThrow('User not authenticated');
    await expect(countResumes('all')).rejects.toThrow('User not authenticated');
  });

  it('surfaces a missing resume and profile', async () => {
    mockCreateClient.mockResolvedValue(
      stubSupabase({ id: 'user-1' }, {
        resumes: stubTable({ data: null, error: null }),
        profiles: stubTable({ data: null, error: null }),
      }),
    );
    await expect(getResumeById('missing')).rejects.toThrow('Resume not found');

    mockCreateClient.mockResolvedValue(
      stubSupabase({ id: 'user-1' }, {
        resumes: stubTable({ data: resume, error: null }),
        profiles: stubTable({ data: null, error: null }),
      }),
    );
    await expect(getResumeById('resume-1')).rejects.toThrow('Profile not found');
  });

  it('updates a resume', async () => {
    mockCreateClient.mockResolvedValue(
      stubSupabase({ id: 'user-1' }, {
        resumes: stubTable({ data: { ...resume, name: 'Updated' }, error: null }),
      }),
    );

    await expect(updateResume('resume-1', { name: 'Updated' })).resolves.toMatchObject({ name: 'Updated' });
    await expect(updateResume('resume-1', {})).resolves.toBeTruthy();
  });

  it('throws when the resume update fails', async () => {
    mockCreateClient.mockResolvedValue(
      stubSupabase({ id: 'user-1' }, {
        resumes: stubTable({ data: null, error: { message: 'boom' } }),
      }),
    );

    await expect(updateResume('resume-1', {})).rejects.toThrow('Failed to update resume');
  });

  it('deletes a tailored resume together with its job', async () => {
    mockCreateClient.mockResolvedValue(
      stubSupabase({ id: 'user-1' }, {
        resumes: [
          stubTable({ data: { ...resume, is_base_resume: false, job_id: 'job-1' }, error: null }),
          stubTable({ data: null, error: null }),
        ],
        jobs: stubTable({ data: null, error: null }),
      }),
    );

    await expect(deleteResume('resume-1')).resolves.toBeUndefined();
    expect(revalidatePath).toHaveBeenCalledWith('/resumes', 'layout');
  });

  it('rejects deleting a resume that is not found', async () => {
    mockCreateClient.mockResolvedValue(
      stubSupabase({ id: 'user-1' }, {
        resumes: stubTable({ data: null, error: null }),
      }),
    );

    await expect(deleteResume('missing')).rejects.toThrow('Resume not found or access denied');
  });

  it('creates a base resume by importing the profile', async () => {
    mockCreateClient.mockResolvedValue(
      stubSupabase({ id: 'user-1' }, {
        subscriptions: stubTable({ data: null, error: null }),
        resumes: [
          stubTable({ data: null, error: null, count: 0 } as never),
          stubTable({ data: resume, error: null }),
        ],
        profiles: stubTable({ data: profile, error: null }),
      }),
    );

    const result = await createBaseResume('My Resume');

    expect(result.id).toBe('resume-1');
  });

  it('creates a fresh base resume and an imported resume', async () => {
    mockCreateClient.mockResolvedValue(
      stubSupabase({ id: 'user-1' }, {
        subscriptions: stubTable({ data: { subscription_plan: 'pro' }, error: null }),
        resumes: [
          stubTable({ data: null, error: null, count: 0 } as never),
          stubTable({ data: resume, error: null }),
          stubTable({ data: null, error: null, count: 0 } as never),
          stubTable({ data: resume, error: null }),
        ],
        profiles: stubTable({ data: profile, error: null }),
      }),
    );

    await expect(createBaseResume('Fresh', 'fresh')).resolves.toBeTruthy();
    await expect(
      createBaseResume('Imported', 'import-resume', {
        first_name: 'Grace',
        last_name: 'Hopper',
        email: 'grace@example.com',
        phone_number: '',
        location: '',
        website: '',
        linkedin_url: '',
        github_url: '',
        work_experience: [],
        education: [],
        skills: [],
        projects: [],
      }),
    ).resolves.toBeTruthy();
  });

  it('throws when base resume creation fails', async () => {
    mockCreateClient.mockResolvedValue(
      stubSupabase({ id: 'user-1' }, {
        subscriptions: stubTable({ data: { subscription_plan: 'pro' }, error: null }),
        profiles: stubTable({ data: profile, error: null }),
        resumes: [
          stubTable({ data: null, error: null, count: 0 } as never),
          stubTable({ data: null, error: { message: 'insert failed' } }),
        ],
      }),
    );

    await expect(createBaseResume('My Resume')).rejects.toThrow('Failed to create resume');
  });

  it('creates a tailored resume', async () => {
    mockCreateClient.mockResolvedValue(
      stubSupabase({ id: 'user-1' }, {
        subscriptions: stubTable({ data: { subscription_plan: 'pro' }, error: null }),
        resumes: [
          stubTable({ data: null, error: null, count: 0 } as never),
          stubTable({ data: { ...resume, is_base_resume: false }, error: null }),
        ],
      }),
    );

    await expect(
      createTailoredResume(resume as never, 'job-1', 'Engineer', 'Acme', {
        professional_summary: 'Summary',
        skills: [],
        work_experience: [],
        projects: [],
        education: [],
      } as never),
    ).resolves.toMatchObject({ is_base_resume: false });
  });

  it('copies a resume', async () => {
    mockCreateClient.mockResolvedValue(
      stubSupabase({ id: 'user-1' }, {
        resumes: [
          stubTable({ data: resume, error: null }),
          stubTable({ data: null, error: null, count: 0 } as never),
          stubTable({ data: { ...resume, name: 'Base (Copy)' }, error: null }),
        ],
        subscriptions: stubTable({ data: { subscription_plan: 'pro' }, error: null }),
      }),
    );

    await expect(copyResume('resume-1')).resolves.toMatchObject({ name: 'Base (Copy)' });
  });

  it('rejects copying a missing resume', async () => {
    mockCreateClient.mockResolvedValue(
      stubSupabase({ id: 'user-1' }, {
        resumes: stubTable({ data: null, error: null }),
      }),
    );

    await expect(copyResume('missing')).rejects.toThrow('Resume not found or access denied');
  });

  it('counts resumes for each scope', async () => {
    mockCreateClient.mockResolvedValue(
      stubSupabase({ id: 'user-1' }, {
        resumes: [
          stubTable({ data: null, error: null, count: 3 } as never),
          stubTable({ data: null, error: null, count: 2 } as never),
          stubTable({ data: null, error: null, count: 5 } as never),
        ],
      }),
    );

    await expect(countResumes('base')).resolves.toBe(3);
    await expect(countResumes('tailored')).resolves.toBe(2);
    await expect(countResumes('all')).resolves.toBe(5);
  });

  it('generates a score for base and tailored resumes', async () => {
    await expect(generateResumeScore(resume as never)).resolves.toEqual({ overallScore: 80 });
    await expect(
      generateResumeScore(
        { ...resume, is_base_resume: false } as never,
        { company_name: 'Acme', position_title: 'Engineer' } as never,
      ),
    ).resolves.toEqual({ overallScore: 80 });
  });
});
