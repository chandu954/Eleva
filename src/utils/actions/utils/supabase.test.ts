import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ createClient: vi.fn(), createServiceClient: vi.fn() }));
vi.mock('@/utils/supabase/server', () => mocks);
const { createClient, createServiceClient } = mocks;

import { getAuthenticatedClient, getServiceClient } from './supabase';

describe('shared Supabase action clients', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns the authenticated client and user', async () => {
    const supabase = { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null }) } };
    createClient.mockResolvedValue(supabase);

    await expect(getAuthenticatedClient()).resolves.toEqual({ supabase, user: { id: 'u1' } });
    expect(createClient).toHaveBeenCalledOnce();
  });

  it.each([
    { data: { user: null }, error: null },
    { data: { user: { id: 'u1' } }, error: new Error('session error') },
  ])('rejects missing or invalid auth sessions', async (authResult) => {
    createClient.mockResolvedValue({ auth: { getUser: vi.fn().mockResolvedValue(authResult) } });
    await expect(getAuthenticatedClient()).rejects.toThrow('User not authenticated');
  });

  it('returns the service client without exposing user state', async () => {
    const supabase = { admin: true };
    createServiceClient.mockResolvedValue(supabase);
    await expect(getServiceClient()).resolves.toEqual({ supabase });
  });
});
