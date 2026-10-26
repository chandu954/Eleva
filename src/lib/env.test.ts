// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { OPTIONAL_ENV, REQUIRED_ENV, reportEnvValidation, validateEnv } from './env';

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

    expect(validateEnv(env)).toEqual({ missingRequired: [], missingOptional: [] });
  });

  it('treats empty strings as missing', () => {
    const env = Object.fromEntries(REQUIRED_ENV.map((key) => [key, '']));

    expect(validateEnv(env).missingRequired).toEqual([...REQUIRED_ENV]);
  });
});

describe('reportEnvValidation', () => {
  it('does not throw when reporting problems', () => {
    expect(() =>
      reportEnvValidation({ missingRequired: ['A'], missingOptional: ['B'] }),
    ).not.toThrow();
  });
});
