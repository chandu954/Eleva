import { describe, expect, it, vi } from 'vitest';

const createBrowserClient = vi.hoisted(() => vi.fn());
vi.mock('@supabase/ssr', () => ({ createBrowserClient }));

import { createClient } from './client';

describe('browser Supabase client', () => {
  it('uses the public project URL and anonymous key', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://project.example';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon';
    const client = {};
    createBrowserClient.mockReturnValue(client);

    expect(createClient()).toBe(client);
    expect(createBrowserClient).toHaveBeenCalledWith('https://project.example', 'anon');
  });
});
