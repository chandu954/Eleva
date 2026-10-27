import { beforeEach, describe, expect, it, vi } from 'vitest';
import { stubTable, type PostgrestStub } from '@/test/postgrest-stub';

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('next/navigation', () => ({ redirect: vi.fn() }));

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(),
  createServiceClient: vi.fn(),
}));

import { createClient, createServiceClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import {
  checkAdminStatus,
  ensureAdmin,
  getAllUsers,
  getBaseResumeCount,
  getProUserCount,
  getResumeCountForUser,
  getResumesForUser,
  getTailoredResumeCount,
  getTotalResumeCount,
  getTotalSubscriptionCount,
  getTotalUserCount,
  getUserDetailsById,
  getUsersWithProfilesAndSubscriptions,
  updateUserSubscriptionPlan,
} from './actions';

const mockCreateClient = vi.mocked(createClient);
const mockCreateServiceClient = vi.mocked(createServiceClient);

function listUsersPage(users: Array<{ id: string; email?: string; created_at: string }>, error: unknown = null) {
  return { data: { users }, error };
}

function makeService(options: {
  tables?: Record<string, PostgrestStub | PostgrestStub[]>;
  userPages?: ReturnType<typeof listUsersPage>[];
  userById?: { data: { user: { id: string } | null }; error: { message: string } | null };
  rpc?: (name: string, params: unknown) => { data: unknown; error: unknown };
}) {
  const pages = [...(options.userPages ?? [listUsersPage([])])];
  return {
    auth: {
      admin: {
        listUsers: vi.fn(async () => {
          if (pages.length === 0) throw new Error('no more pages');
          return pages.shift();
        }),
        getUserById: vi.fn(async () => options.userById ?? { data: { user: null }, error: null }),
      },
    },
    from: vi.fn((table: string) => {
      const entry = options.tables?.[table];
      if (!entry) throw new Error(`unexpected table ${table}`);
      if (Array.isArray(entry)) return entry.shift() as PostgrestStub;
      return entry;
    }),
    rpc: vi.fn(async (name: string, params: unknown) => options.rpc?.(name, params) ?? { data: null, error: null }),
  };
}

const users = [
  { id: 'user-1', email: 'ada@example.com', created_at: '2026-01-01' },
  { id: 'user-2', email: 'grace@example.com', created_at: '2026-01-02' },
];

describe('admin server actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads all users across a single page', async () => {
    mockCreateServiceClient.mockResolvedValue(makeService({ userPages: [listUsersPage(users)] }) as never);

    await expect(getAllUsers()).resolves.toEqual(users);
  });

  it('throws when listing users fails', async () => {
    mockCreateServiceClient.mockResolvedValue(
      makeService({ userPages: [listUsersPage([], { message: 'nope' })] }) as never,
    );

    await expect(getAllUsers()).rejects.toThrow('Failed to fetch users on page 1');
  });

  it('checks admin via profile, legacy table and failure paths', async () => {
    mockCreateClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }) },
      from: vi.fn(() => stubTable({ data: { is_admin: true }, error: null })),
    } as never);
    await expect(checkAdminStatus()).resolves.toBe(true);

    mockCreateClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }) },
      from: vi.fn((table: string) =>
        table === 'profiles'
          ? stubTable({ data: null, error: { message: 'missing column' } })
          : stubTable({ data: { is_admin: true }, error: null }),
      ),
    } as never);
    await expect(checkAdminStatus()).resolves.toBe(true);

    mockCreateClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: { message: 'no session' } }) },
    } as never);
    await expect(checkAdminStatus()).resolves.toBe(false);

    mockCreateClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }) },
      from: vi.fn(() => stubTable({ data: null, error: { message: 'denied' } })),
    } as never);
    await expect(checkAdminStatus()).resolves.toBe(false);
  });

  it('redirects non-admins and allows admins', async () => {
    mockCreateClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }) },
      from: vi.fn(() => stubTable({ data: { is_admin: false }, error: null })),
    } as never);

    await ensureAdmin();
    expect(redirect).toHaveBeenCalledWith('/');

    vi.mocked(redirect).mockClear();
    mockCreateClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }) },
      from: vi.fn(() => stubTable({ data: { is_admin: true }, error: null })),
    } as never);
    await ensureAdmin();
    expect(redirect).not.toHaveBeenCalled();
  });

  it('merges users with profiles, subscriptions and resume counts', async () => {
    mockCreateServiceClient.mockResolvedValue(
      makeService({
        userPages: [listUsersPage(users)],
        rpc: (name) => {
          if (name === 'get_profiles_for_users') {
            return { data: [{ user_id: 'user-1', first_name: 'Ada' }], error: null };
          }
          if (name === 'get_subscriptions_for_users') {
            return { data: [{ user_id: 'user-1', subscription_plan: 'pro' }], error: null };
          }
          return { data: [{ user_id: 'user-1', resume_count: '4' }], error: null };
        },
      }) as never,
    );

    const result = await getUsersWithProfilesAndSubscriptions();

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ profile: { first_name: 'Ada' }, subscription: { subscription_plan: 'pro' }, resume_count: 4 });
    expect(result[1]).toMatchObject({ profile: null, subscription: null, resume_count: 0 });
  });

  it('returns an empty list when there are no users', async () => {
    mockCreateServiceClient.mockResolvedValue(makeService({ userPages: [listUsersPage([])] }) as never);

    await expect(getUsersWithProfilesAndSubscriptions()).resolves.toEqual([]);
  });

  it('loads one user with profile and subscription', async () => {
    mockCreateServiceClient.mockResolvedValue(
      makeService({
        userById: { data: { user: { id: 'user-1' } }, error: null },
        tables: {
          profiles: stubTable({ data: { user_id: 'user-1' }, error: null }),
          subscriptions: stubTable({ data: { user_id: 'user-1' }, error: null }),
        },
      }) as never,
    );

    await expect(getUserDetailsById('user-1')).resolves.toMatchObject({ user: { id: 'user-1' } });
  });

  it('handles invalid users and lookup failures', async () => {
    await expect(getUserDetailsById('')).rejects.toThrow('User ID is required');

    mockCreateServiceClient.mockResolvedValue(
      makeService({ userById: { data: { user: null }, error: { message: 'User not found' } } }) as never,
    );
    await expect(getUserDetailsById('missing')).resolves.toBeNull();

    mockCreateServiceClient.mockResolvedValue(
      makeService({ userById: { data: { user: null }, error: { message: 'network' } } }) as never,
    );
    await expect(getUserDetailsById('user-1')).rejects.toThrow('Failed to fetch user auth info');

    mockCreateServiceClient.mockResolvedValue(
      makeService({
        userById: { data: { user: { id: 'user-1' } }, error: null },
        tables: { profiles: stubTable({ data: null, error: { message: 'profile fail' } }) },
      }) as never,
    );
    await expect(getUserDetailsById('user-1')).rejects.toThrow('Failed to fetch profile');

    mockCreateServiceClient.mockResolvedValue(
      makeService({
        userById: { data: { user: { id: 'user-1' } }, error: null },
        tables: {
          profiles: stubTable({ data: null, error: null }),
          subscriptions: stubTable({ data: null, error: { message: 'sub fail' } }),
        },
      }) as never,
    );
    await expect(getUserDetailsById('user-1')).rejects.toThrow('Failed to fetch subscription');

    mockCreateServiceClient.mockResolvedValue(
      makeService({
        userById: { data: { user: null }, error: null },
        tables: {
          profiles: stubTable({ data: null, error: null }),
          subscriptions: stubTable({ data: null, error: null }),
        },
      }) as never,
    );
    await expect(getUserDetailsById('user-1')).resolves.toBeNull();
  });

  it('counts resumes for a user', async () => {
    await expect(getResumeCountForUser('')).resolves.toBe(0);

    mockCreateServiceClient.mockResolvedValue(
      makeService({ tables: { resumes: stubTable({ data: null, error: null, count: 4 } as never) } }) as never,
    );
    await expect(getResumeCountForUser('user-1')).resolves.toBe(4);

    mockCreateServiceClient.mockResolvedValue(
      makeService({ tables: { resumes: stubTable({ data: null, error: { message: 'boom' } }) } }) as never,
    );
    await expect(getResumeCountForUser('user-1')).resolves.toBe(0);
  });

  it('loads resumes for a user', async () => {
    await expect(getResumesForUser('')).resolves.toEqual([]);

    mockCreateServiceClient.mockResolvedValue(
      makeService({ tables: { resumes: stubTable({ data: [{ id: 'resume-1' }], error: null }) } }) as never,
    );
    await expect(getResumesForUser('user-1')).resolves.toEqual([{ id: 'resume-1' }]);

    mockCreateServiceClient.mockResolvedValue(
      makeService({ tables: { resumes: stubTable({ data: null, error: { message: 'boom' } }) } }) as never,
    );
    await expect(getResumesForUser('user-1')).resolves.toEqual([]);
  });

  it('counts all users across pages', async () => {
    mockCreateServiceClient.mockResolvedValue(
      makeService({
        userPages: [
          listUsersPage(Array.from({ length: 1000 }, (_, i) => ({ id: `user-${i}`, created_at: '2026-01-01' }))),
          listUsersPage([{ id: 'user-1001', created_at: '2026-01-03' }]),
        ],
      }) as never,
    );

    await expect(getTotalUserCount()).resolves.toBe(1001);
  });

  it('returns zero when counting users fails', async () => {
    mockCreateServiceClient.mockResolvedValue(
      makeService({ userPages: [listUsersPage([], { message: 'boom' })] }) as never,
    );

    await expect(getTotalUserCount()).resolves.toBe(0);
  });

  it('reads aggregate counters', async () => {
    mockCreateServiceClient.mockResolvedValue(
      makeService({ rpc: () => ({ data: 42, error: null }) }) as never,
    );
    await expect(getTotalResumeCount()).resolves.toBe(42);

    mockCreateServiceClient.mockResolvedValue(
      makeService({ rpc: () => ({ data: null, error: { message: 'boom' } }) }) as never,
    );
    await expect(getTotalResumeCount()).resolves.toBe(0);

    mockCreateServiceClient.mockResolvedValue(
      makeService({
        tables: {
          subscriptions: [
            stubTable({ data: null, error: null, count: 8 } as never),
            stubTable({ data: null, error: null, count: 6 } as never),
            stubTable({ data: null, error: { message: 'boom' } }),
          ],
          resumes: [
            stubTable({ data: null, error: null, count: 5 } as never),
            stubTable({ data: null, error: null, count: 7 } as never),
            stubTable({ data: null, error: { message: 'boom' } }),
          ],
        },
      }) as never,
    );

    await expect(getTotalSubscriptionCount()).resolves.toBe(8);
    await expect(getProUserCount()).resolves.toBe(6);
    await expect(getBaseResumeCount()).resolves.toBe(5);
    await expect(getTailoredResumeCount()).resolves.toBe(7);
  });

  it('returns zero for failed aggregate counters', async () => {
    mockCreateServiceClient.mockResolvedValue(
      makeService({
        tables: {
          subscriptions: stubTable({ data: null, error: { message: 'boom' } }),
          resumes: stubTable({ data: null, error: { message: 'boom' } }),
        },
      }) as never,
    );

    await expect(getTotalSubscriptionCount()).resolves.toBe(0);
    await expect(getProUserCount()).resolves.toBe(0);
    await expect(getBaseResumeCount()).resolves.toBe(0);
    await expect(getTailoredResumeCount()).resolves.toBe(0);
  });

  it('rejects subscription updates from non-admins and bad input', async () => {
    mockCreateClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }) },
      from: vi.fn(() => stubTable({ data: { is_admin: false }, error: null })),
    } as never);

    await expect(updateUserSubscriptionPlan('user-2', 'pro')).resolves.toMatchObject({ success: false, message: expect.stringContaining('Unauthorized') });

    mockCreateClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }) },
      from: vi.fn(() => stubTable({ data: { is_admin: true }, error: null })),
    } as never);

    await expect(updateUserSubscriptionPlan('', 'pro')).resolves.toMatchObject({ success: false, message: expect.stringContaining('User ID is required') });
    await expect(updateUserSubscriptionPlan('user-2', 'gold' as never)).resolves.toMatchObject({ success: false, message: expect.stringContaining('Invalid plan') });
  });

  it('updates an existing subscription plan', async () => {
    mockCreateClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'admin-1' } }, error: null }) },
      from: vi.fn(() => stubTable({ data: { is_admin: true }, error: null })),
    } as never);
    mockCreateServiceClient.mockResolvedValue(
      makeService({
        tables: {
          subscriptions: [
            stubTable({ data: { user_id: 'user-2' }, error: null }),
            stubTable({ data: null, error: null }),
          ],
        },
      }) as never,
    );

    await expect(updateUserSubscriptionPlan('user-2', 'pro')).resolves.toEqual({
      success: true,
      message: 'Subscription plan successfully updated to "pro".',
    });
    expect(revalidatePath).toHaveBeenCalledWith('/admin/user-2');
  });

  it('inserts a new subscription and reports database errors', async () => {
    mockCreateClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'admin-1' } }, error: null }) },
      from: vi.fn(() => stubTable({ data: { is_admin: true }, error: null })),
    } as never);

    mockCreateServiceClient.mockResolvedValue(
      makeService({
        tables: {
          subscriptions: [
            stubTable({ data: null, error: null }),
            stubTable({ data: null, error: null }),
          ],
        },
      }) as never,
    );
    await expect(updateUserSubscriptionPlan('user-2', 'free')).resolves.toMatchObject({ success: true });

    mockCreateServiceClient.mockResolvedValue(
      makeService({ tables: { subscriptions: stubTable({ data: null, error: { message: 'check fail' } }) } }) as never,
    );
    await expect(updateUserSubscriptionPlan('user-2', 'pro')).resolves.toMatchObject({
      success: false,
      message: 'Database error: check fail',
    });

    mockCreateServiceClient.mockResolvedValue(
      makeService({
        tables: {
          subscriptions: [
            stubTable({ data: { user_id: 'user-2' }, error: null }),
            stubTable({ data: null, error: { message: 'update fail' } }),
          ],
        },
      }) as never,
    );
    await expect(updateUserSubscriptionPlan('user-2', 'pro')).resolves.toMatchObject({
      success: false,
      message: 'Failed to update subscription: update fail',
    });
  });

  it('catches unexpected subscription update failures', async () => {
    mockCreateClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockRejectedValue(new Error('session crash')) },
    } as never);

    await expect(updateUserSubscriptionPlan('user-2', 'pro')).resolves.toMatchObject({
      success: false,
      message: expect.stringContaining('session crash'),
    });
  });
});
