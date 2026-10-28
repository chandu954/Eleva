import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createClient } = vi.hoisted(() => ({ createClient: vi.fn() }));
vi.mock('@/utils/supabase/server', () => ({ createClient }));

import { getDashboardData } from './actions';

type QueryResult = { data?: unknown; error?: { code?: string; message?: string } | null };
function makeSupabase(user: { id: string; email?: string } | null, responses: Record<string, QueryResult[]>, authError: unknown = null) {
  const from = vi.fn((table: string) => {
    const result = responses[table]?.shift() ?? { data: null, error: null };
    const query = {
      select: vi.fn(), eq: vi.fn(), insert: vi.fn(),
      single: vi.fn(async () => result),
      then: vi.fn((resolve: (value: QueryResult) => unknown, reject?: (reason: unknown) => unknown) => Promise.resolve(result).then(resolve, reject)),
    };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.insert.mockReturnValue(query);
    return query;
  });
  return { from, auth: { getUser: vi.fn().mockResolvedValue({ data: { user }, error: authError }) } };
}

const profile = { user_id: 'u1', first_name: 'Ada' };
const resumeRows = [
  { id: 'base', is_base_resume: true, target_role: null },
  { id: 'tailored', is_base_resume: false, target_role: 'Engineer' },
];

describe('getDashboardData', () => {
  beforeEach(() => vi.clearAllMocks());

  it('requires a signed-in user before making database requests', async () => {
    createClient.mockResolvedValue(makeSupabase(null, {}));
    await expect(getDashboardData()).rejects.toThrow('User not authenticated');
  });

  it('returns profile and separates base and tailored resumes', async () => {
    createClient.mockResolvedValue(makeSupabase({ id: 'u1' }, {
      profiles: [{ data: profile }], resumes: [{ data: resumeRows }],
    }));

    await expect(getDashboardData()).resolves.toEqual({
      profile,
      baseResumes: [{ ...resumeRows[0], target_role: '' }],
      tailoredResumes: [resumeRows[1]],
    });
  });

  it('creates an empty profile when the user has no profile yet', async () => {
    const supabase = makeSupabase({ id: 'u1', email: 'ada@example.com' }, {
      profiles: [
        { data: null, error: { code: 'PGRST116' } },
        { data: profile },
      ],
      resumes: [{ data: [] }],
    });
    createClient.mockResolvedValue(supabase);

    await expect(getDashboardData()).resolves.toMatchObject({ profile, baseResumes: [], tailoredResumes: [] });
    expect(supabase.from).toHaveBeenCalledWith('profiles');
  });

  it('reports profile creation, profile lookup, and resume lookup failures', async () => {
    createClient.mockResolvedValueOnce(makeSupabase({ id: 'u1' }, {
      profiles: [{ data: null, error: { code: 'PGRST116' } }, { data: null, error: { message: 'insert denied' } }],
    }));
    await expect(getDashboardData()).rejects.toThrow('Error creating user profile');

    createClient.mockResolvedValueOnce(makeSupabase({ id: 'u1' }, {
      profiles: [{ data: null, error: { code: 'denied' } }],
    }));
    await expect(getDashboardData()).rejects.toThrow('Error fetching dashboard data');

    createClient.mockResolvedValueOnce(makeSupabase({ id: 'u1' }, {
      profiles: [{ data: profile }], resumes: [{ data: null, error: { message: 'RLS denied' } }],
    }));
    await expect(getDashboardData()).rejects.toThrow('Error fetching dashboard data');
  });
});
