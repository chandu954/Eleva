// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { OPTIONAL_ENV, REQUIRED_ENV, reportEnvValidation, validateEnv } from './env';
import { logger } from './logger';

describe('validateEnv', () => {
  it('reports every missing required and optional var', () => {
    const result = validateEnv({});

    expect(result.missingRequired).toEqual([...REQUIRED_ENV]);
    expect(result.missingOptional).toEqual([...OPTIONAL_ENV]);
  });

  it('reports nothing missing when all vars are set', () => {
    const env = Object.fromEntries(
      [...REQUIRED_ENV, ...OPTIONAL_ENV].map((key) => [key, 'value']),
    );

    expect(validateEnv(env)).toEqual({ missingRequired: [], missingOptional: [], resolved: env });
  });

  it('treats empty strings as missing', () => {
    const env = Object.fromEntries(REQUIRED_ENV.map((key) => [key, '']));

    expect(validateEnv(env).missingRequired).toEqual([...REQUIRED_ENV]);
  });

  it('resolves fallbacks for missing vars', () => {
    const result = validateEnv({});
    expect(result.resolved.NEXT_PUBLIC_SUPABASE_URL).toBe('http://127.0.0.1:9');
    expect(result.resolved.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBe('e2e-anon-key');
    expect(result.resolved.SUPABASE_SERVICE_ROLE_KEY).toBe('e2e-service-role-key');
    expect(result.resolved.STRIPE_SECRET_KEY).toBe('');
    expect(result.resolved.STRIPE_WEBHOOK_SECRET).toBe('');
  });
});

describe('reportEnvValidation', () => {
  it('does not throw when reporting problems', () => {
    expect(() =>
      reportEnvValidation({ missingRequired: ['A'], missingOptional: ['B'], resolved: {} }),
    ).not.toThrow();
  });

  it('logs errors for missing required vars', () => {
    const errorSpy = vi.spyOn(logger, 'error');
    reportEnvValidation({ missingRequired: ['NEXT_PUBLIC_SUPABASE_URL'], missingOptional: [], resolved: {} });
    expect(errorSpy).toHaveBeenCalledWith('startup.env.missing_required', { missing: ['NEXT_PUBLIC_SUPABASE_URL'] });
    errorSpy.mockRestore();
  });

  it('logs warnings for missing optional vars', () => {
    const warnSpy = vi.spyOn(logger, 'warn');
    reportEnvValidation({ missingRequired: [], missingOptional: ['STRIPE_SECRET_KEY'], resolved: {} });
    expect(warnSpy).toHaveBeenCalledWith('startup.env.missing_optional', { missing: ['STRIPE_SECRET_KEY'] });
    warnSpy.mockRestore();
  });
});
