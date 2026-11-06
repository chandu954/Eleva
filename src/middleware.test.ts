// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { validateEnv } from '@/lib/env';

describe('middleware env validation (production fail-fast)', () => {
  it('reports missing required vars', () => {
    const result = validateEnv({});
    expect(result.missingRequired).toContain('NEXT_PUBLIC_SUPABASE_URL');
    expect(result.missingRequired).toContain('SUPABASE_SERVICE_ROLE_KEY');
    expect(result.missingRequired.length).toBeGreaterThan(0);
  });

  it('reports nothing missing when all required vars are set', () => {
    const result = validateEnv({
      NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'test-key',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-key',
    });
    expect(result.missingRequired).toEqual([]);
  });

  it('treats empty strings as missing required vars', () => {
    const result = validateEnv({
      NEXT_PUBLIC_SUPABASE_URL: '',
      SUPABASE_SERVICE_ROLE_KEY: 'test-key',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-key',
    });
    expect(result.missingRequired).toContain('NEXT_PUBLIC_SUPABASE_URL');
  });
});
