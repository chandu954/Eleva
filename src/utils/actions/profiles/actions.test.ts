import { beforeEach, describe, expect, it, vi } from 'vitest';
import { stubSupabase, stubTable } from '@/test/postgrest-stub';

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/utils/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/lib/analytics/server', () => ({
  captureServerAnalyticsEvent: vi.fn().mockResolvedValue(undefined),
  getSubscriptionAnalyticsProperties: vi.fn().mockResolvedValue({ plan: 'free' }),
}));

import { createClient } from '@/utils/supabase/server';
import { captureServerAnalyticsEvent } from '@/lib/analytics/server';
import { importResume, resetProfile, updateProfile } from './actions';

const mockCreateClient = vi.mocked(createClient);

const profile = {
  first_name: 'Ada',
  last_name: 'Lovelace',
  email: 'ada@example.com',
  work_experience: [],
  education: [],
  skills: [],
  projects: [],
};

describe('profile server actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates a profile and records completion analytics', async () => {
    mockCreateClient.mockResolvedValue(
      stubSupabase({ id: 'user-1' }, {
        profiles: [
          stubTable({ data: { first_name: null, last_name: null, email: null }, error: null }),
          stubTable({ data: profile, error: null }),
        ],
      }) as never,
    );

    await expect(updateProfile(profile)).resolves.toEqual(profile);
    expect(captureServerAnalyticsEvent).toHaveBeenCalled();
  });

  it('skips analytics when the profile was already complete', async () => {
    mockCreateClient.mockResolvedValue(
      stubSupabase({ id: 'user-1' }, {
        profiles: [
          stubTable({ data: profile, error: null }),
          stubTable({ data: profile, error: null }),
        ],
      }) as never,
    );

    await updateProfile(profile);
    expect(captureServerAnalyticsEvent).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated profile updates', async () => {
    mockCreateClient.mockResolvedValue(stubSupabase(null, {}) as never);
    await expect(updateProfile(profile)).rejects.toThrow('User not authenticated');
  });

  it('throws when updating the profile fails', async () => {
    mockCreateClient.mockResolvedValue(
      stubSupabase({ id: 'user-1' }, {
        profiles: [
          stubTable({ data: null, error: null }),
          stubTable({ data: null, error: { message: 'boom' } }),
        ],
      }) as never,
    );

    await expect(updateProfile(profile)).rejects.toThrow('Failed to update profile: boom');
  });

  it('imports only missing simple fields and appends arrays', async () => {
    const existing = {
      ...profile,
      first_name: 'Ada',
      phone_number: null,
      work_experience: [{ position: 'Engineer' }],
    };
    mockCreateClient.mockResolvedValue(
      stubSupabase({ id: 'user-1' }, {
        profiles: [
          stubTable({ data: existing, error: null }),
          stubTable({ data: { ...existing, phone_number: '123' }, error: null }),
        ],
      }) as never,
    );

    await expect(importResume({
      first_name: 'Grace',
      phone_number: '123',
      work_experience: [{ position: 'Staff' }],
    } as never)).resolves.toMatchObject({ phone_number: '123' });
  });

  it('returns the current profile when an import has no new data', async () => {
    mockCreateClient.mockResolvedValue(
      stubSupabase({ id: 'user-1' }, {
        profiles: stubTable({ data: profile, error: null }),
      }) as never,
    );

    await expect(importResume({} as never)).resolves.toEqual(profile);
  });

  it('rejects bad import sessions and fetch failures', async () => {
    mockCreateClient.mockResolvedValue(stubSupabase(null, {}) as never);
    await expect(importResume({} as never)).rejects.toThrow('Failed to fetch current profile');

    mockCreateClient.mockResolvedValue(
      stubSupabase({ id: 'user-1' }, {
        profiles: stubTable({ data: null, error: { message: 'missing' } }),
      }) as never,
    );
    await expect(importResume({} as never)).rejects.toThrow('Failed to fetch current profile: missing');
  });

  it('throws when an import update fails', async () => {
    mockCreateClient.mockResolvedValue(
      stubSupabase({ id: 'user-1' }, {
        profiles: [
          stubTable({ data: profile, error: null }),
          stubTable({ data: null, error: { message: 'write failed' } }),
        ],
      }) as never,
    );

    await expect(importResume({ phone_number: '123' } as never)).rejects.toThrow('Failed to update profile: write failed');
  });

  it('resets a profile', async () => {
    mockCreateClient.mockResolvedValue(
      stubSupabase({ id: 'user-1' }, {
        profiles: stubTable({ data: profile, error: null }),
      }) as never,
    );

    await expect(resetProfile()).resolves.toEqual(profile);
  });

  it('rejects reset failures and unauthenticated resets', async () => {
    mockCreateClient.mockResolvedValue(
      stubSupabase({ id: 'user-1' }, {
        profiles: stubTable({ data: null, error: { message: 'boom' } }),
      }) as never,
    );
    await expect(resetProfile()).rejects.toThrow('Failed to reset profile');

    mockCreateClient.mockResolvedValue(stubSupabase(null, {}) as never);
    await expect(resetProfile()).rejects.toThrow('User not authenticated');
  });
});
