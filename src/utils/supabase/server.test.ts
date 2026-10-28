import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  cookies: vi.fn(),
  createServerClient: vi.fn(),
}));
vi.mock('next/headers', () => ({ cookies: mocks.cookies }));
vi.mock('@supabase/ssr', () => ({ createServerClient: mocks.createServerClient }));

import { createClient, createServiceClient } from './server';

describe('server Supabase clients', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://project.example';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service';
  });

  it('passes cookie reads and writes through the request cookie store', async () => {
    const cookieStore = { getAll: vi.fn(() => [{ name: 'session', value: 'cookie' }]), set: vi.fn() };
    const client = { auth: {} };
    mocks.cookies.mockResolvedValue(cookieStore);
    mocks.createServerClient.mockReturnValue(client);

    await expect(createClient()).resolves.toBe(client);
    const [, , options] = mocks.createServerClient.mock.calls[0];
    expect(options.cookies.getAll()).toEqual([{ name: 'session', value: 'cookie' }]);
    options.cookies.setAll([{ name: 'refresh', value: 'next', options: { httpOnly: true } }]);
    expect(cookieStore.set).toHaveBeenCalledWith('refresh', 'next', { httpOnly: true });
  });

  it('ignores cookie writes when invoked from a server component', async () => {
    mocks.cookies.mockResolvedValue({ getAll: () => [], set: () => { throw new Error('read-only'); } });
    mocks.createServerClient.mockReturnValue({});
    const client = await createClient();
    expect(client).toBeDefined();
    const options = mocks.createServerClient.mock.calls[0][2];
    expect(() => options.cookies.setAll([{ name: 'a', value: 'b', options: {} }])).not.toThrow();
  });

  it('builds a service client with no request cookies', async () => {
    const client = {};
    mocks.createServerClient.mockReturnValue(client);
    await expect(createServiceClient()).resolves.toBe(client);
    const [, key, options] = mocks.createServerClient.mock.calls[0];
    expect(key).toBe('service');
    expect(options.cookies.getAll()).toEqual([]);
    expect(options.cookies.setAll([])).toBeUndefined();
  });
});
