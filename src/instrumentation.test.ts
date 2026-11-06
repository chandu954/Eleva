// @vitest-environment node
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { register } from './instrumentation';

vi.mock('@sentry/nextjs', () => ({
  init: vi.fn(),
  captureRequestError: vi.fn(),
}));

describe('instrumentation.register() production fail-fast', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Reset env to original state
    for (const key of Object.keys(process.env)) {
      delete process.env[key];
    }
    for (const [key, value] of Object.entries(originalEnv)) {
      process.env[key] = value;
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // Restore original env
    for (const key of Object.keys(process.env)) {
      delete process.env[key];
    }
    for (const [key, value] of Object.entries(originalEnv)) {
      process.env[key] = value;
    }
  });

  it('throws when required env vars are missing in production', async () => {
    (process.env as Record<string, string>).NODE_ENV = 'production';
    process.env.NEXT_RUNTIME = 'nodejs';
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    await expect(register()).rejects.toThrow(/Missing required env vars/);
  });

  it('does not throw when all required vars are set', async () => {
    (process.env as Record<string, string>).NODE_ENV = 'production';
    process.env.NEXT_RUNTIME = 'nodejs';
    delete process.env.NEXT_PHASE;
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key';

    await expect(register()).resolves.not.toThrow();
  });

  it('does not throw in test mode even with missing vars', async () => {
    (process.env as Record<string, string>).NODE_ENV = 'test';
    delete process.env.NEXT_PHASE;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;

    await expect(register()).resolves.not.toThrow();
  });
});
