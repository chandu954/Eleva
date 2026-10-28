import { beforeEach, describe, expect, it, vi } from 'vitest';
import { stubSupabase, stubTable } from '@/test/postgrest-stub';

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/utils/supabase/server', () => ({ createClient: vi.fn() }));

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import {
  createEmptyJob,
  createJob,
  deleteJob,
  deleteTailoredJob,
  getJobListings,
} from './actions';

const mockCreateClient = vi.mocked(createClient);

const job = {
  id: 'job-1',
  user_id: 'user-1',
  company_name: 'Acme',
  position_title: 'Engineer',
  description: 'Build things',
};

const jobListing = {
  company_name: 'Acme',
  position_title: 'Engineer',
  job_url: null,
  description: 'Build things',
  location: 'London',
  salary_range: null,
  keywords: ['typescript'],
  work_location: null,
  employment_type: null,
};

describe('job server actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a job with defaults', async () => {
    mockCreateClient.mockResolvedValue(
      stubSupabase({ id: 'user-1' }, { jobs: stubTable({ data: job, error: null }) }) as never,
    );

    await expect(createJob(jobListing as never)).resolves.toEqual(job);
  });

  it('rejects unauthenticated and failed job creation', async () => {
    mockCreateClient.mockResolvedValue(stubSupabase(null, {}) as never);
    await expect(createJob(jobListing as never)).rejects.toThrow('User not authenticated');

    mockCreateClient.mockResolvedValue(
      stubSupabase({ id: 'user-1' }, { jobs: stubTable({ data: null, error: { message: 'boom' } }) }) as never,
    );
    await expect(createJob(jobListing as never)).rejects.toEqual({ message: 'boom' });
  });

  it('deletes a job and revalidates affected resumes', async () => {
    mockCreateClient.mockResolvedValue(
      stubSupabase({ id: 'user-1' }, {
        resumes: stubTable({ data: [{ id: 'resume-1' }, { id: 'resume-2' }], error: null }),
        jobs: stubTable({ data: null, error: null }),
      }) as never,
    );

    await expect(deleteJob('job-1')).resolves.toBeUndefined();
    expect(revalidatePath).toHaveBeenCalledWith('/resumes/resume-1');
    expect(revalidatePath).toHaveBeenCalledWith('/resumes/resume-2');
  });

  it('rejects unauthenticated and failed deletes', async () => {
    mockCreateClient.mockResolvedValue(stubSupabase(null, {}) as never);
    await expect(deleteJob('job-1')).rejects.toThrow('User not authenticated');

    mockCreateClient.mockResolvedValue(
      stubSupabase({ id: 'user-1' }, {
        resumes: stubTable({ data: [], error: null }),
        jobs: stubTable({ data: null, error: { message: 'boom' } }),
      }) as never,
    );
    await expect(deleteJob('job-1')).rejects.toThrow('Failed to delete job');
  });

  it('lists jobs with filters and pagination', async () => {
    mockCreateClient.mockResolvedValue(
      stubSupabase({ id: 'user-1' }, {
        jobs: stubTable({ data: [job], error: null, count: 12 } as never),
      }) as never,
    );

    await expect(getJobListings({
      page: 2,
      pageSize: 5,
      filters: { workLocation: 'remote', employmentType: 'full_time', keywords: ['ts'] },
    } as never)).resolves.toEqual({
      jobs: [job],
      totalCount: 12,
      currentPage: 2,
      totalPages: 3,
    });
  });

  it('lists jobs without filters', async () => {
    mockCreateClient.mockResolvedValue(
      stubSupabase({ id: 'user-1' }, {
        jobs: stubTable({ data: null, error: null, count: null } as never),
      }) as never,
    );

    await expect(getJobListings({ page: 1, pageSize: 10 })).resolves.toMatchObject({ jobs: null, totalCount: 0, totalPages: 1 });
  });

  it('rejects unauthenticated and failed listings', async () => {
    mockCreateClient.mockResolvedValue(stubSupabase(null, {}) as never);
    await expect(getJobListings({ page: 1, pageSize: 10 })).rejects.toThrow('User not authenticated');

    mockCreateClient.mockResolvedValue(
      stubSupabase({ id: 'user-1' }, {
        jobs: stubTable({ data: null, error: { message: 'boom' } }),
      }) as never,
    );
    await expect(getJobListings({ page: 1, pageSize: 10 })).rejects.toThrow('Failed to fetch job listings');
  });

  it('deactivates a tailored job', async () => {
    mockCreateClient.mockResolvedValue(
      stubSupabase({ id: 'user-1' }, { jobs: stubTable({ data: null, error: null }) }) as never,
    );

    await expect(deleteTailoredJob('job-1')).resolves.toBeUndefined();

    mockCreateClient.mockResolvedValue(
      stubSupabase({ id: 'user-1' }, { jobs: stubTable({ data: null, error: { message: 'boom' } }) }) as never,
    );
    await expect(deleteTailoredJob('job-1')).rejects.toThrow('Failed to delete job');
  });

  it('creates an empty job', async () => {
    mockCreateClient.mockResolvedValue(
      stubSupabase({ id: 'user-1' }, { jobs: stubTable({ data: job, error: null }) }) as never,
    );

    await expect(createEmptyJob()).resolves.toEqual(job);

    mockCreateClient.mockResolvedValue(
      stubSupabase({ id: 'user-1' }, { jobs: stubTable({ data: null, error: { message: 'boom' } }) }) as never,
    );
    await expect(createEmptyJob()).rejects.toThrow('Failed to create job');

    mockCreateClient.mockResolvedValue(stubSupabase(null, {}) as never);
    await expect(createEmptyJob()).rejects.toThrow('User not authenticated');
  });
});
