// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';

const mockFrom = vi.fn();
const mockSupabase = { from: mockFrom };
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabase),
}));

import { GET } from './route';

describe('health route', () => {
  it('returns ok with all required env vars present and db connected', async () => {
    const prev = { ...process.env };
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    mockFrom.mockReturnValue({ select: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue({ error: null }) }) });
    try {
      const res = await GET();
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.status).toBe('ok');
      expect(json.database).toBe('connected');
    } finally {
      process.env = prev;
      mockFrom.mockClear();
    }
  });

  it('returns degraded when required env vars are missing', async () => {
    const prev = { ...process.env };
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    try {
      const res = await GET();
      expect(res.status).toBe(503);
      const json = await res.json();
      expect(json.status).toBe('degraded');
    } finally {
      process.env = prev;
    }
  });

  it('returns degraded when the database query errors', async () => {
    const prev = { ...process.env };
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    mockFrom.mockReturnValue({ select: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue({ error: { message: 'rls' } }) }) });
    try {
      const res = await GET();
      expect(res.status).toBe(503);
      const json = await res.json();
      expect(json.status).toBe('degraded');
      expect(json.database).toBe('error');
    } finally {
      process.env = prev;
      mockFrom.mockClear();
    }
  });
});
