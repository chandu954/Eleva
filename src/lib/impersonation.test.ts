// @vitest-environment node
import { createHmac } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createImpersonationStateCookieValue,
  IMPERSONATION_STATE_COOKIE_NAME,
  IMPERSONATION_STATE_MAX_AGE_SECONDS,
  parseImpersonationStateCookieValue,
} from './impersonation';

const SECRET_A = 'unit-secret-a';
const SECRET_B = 'unit-secret-b';
const NOW = Date.parse('2026-02-01T10:00:00Z');

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.stubEnv('IMPERSONATION_COOKIE_SECRET', SECRET_A);
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '');
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe('constants', () => {
  it('declares the cookie name and the hourly default age', () => {
    expect(IMPERSONATION_STATE_COOKIE_NAME).toBe('impersonation_state');
    expect(IMPERSONATION_STATE_MAX_AGE_SECONDS).toBe(3600);
  });
});

describe('createImpersonationStateCookieValue', () => {
  it('produces a two-part payload.signature pair decodable back to the bounded state', () => {
    const value = createImpersonationStateCookieValue({ adminUserId: 'admin-1', impersonatedUserId: 'user-2' });

    const [payload, signature] = value.split('.');
    expect(signature).toBeTruthy();

    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    expect(decoded).toEqual({
      adminUserId: 'admin-1',
      impersonatedUserId: 'user-2',
      issuedAt: NOW,
      expiresAt: NOW + IMPERSONATION_STATE_MAX_AGE_SECONDS * 1000,
    });
  });

  it('honors a custom maxAge for the expiry stamp', () => {
    const value = createImpersonationStateCookieValue({ adminUserId: 'a', impersonatedUserId: 'b', maxAgeSeconds: 120 });
    const decoded = JSON.parse(Buffer.from(value.split('.')[0], 'base64url').toString('utf8'));
    expect(decoded.expiresAt).toBe(NOW + 120_000);
  });

  it('prefers IMPERSONATION_COOKIE_SECRET over the service-role fallback', () => {
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', SECRET_B);
    const withBoth = createImpersonationStateCookieValue({ adminUserId: 'a', impersonatedUserId: 'b' });
    // signed with secret A: still parses while A is configured
    vi.stubEnv('IMPERSONATION_COOKIE_SECRET', '');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', SECRET_B);
    const decoded = JSON.parse(Buffer.from(withBoth.split('.')[0], 'base64url').toString('utf8'));
    expect(decoded.adminUserId).toBe('a');
  });

  it('falls back to SUPABASE_SERVICE_ROLE_KEY when no dedicated secret is set', () => {
    vi.stubEnv('IMPERSONATION_COOKIE_SECRET', '');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', SECRET_B);

    const value = createImpersonationStateCookieValue({ adminUserId: 'a', impersonatedUserId: 'b' });
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', ''); // remove the signing secret
    expect(parseImpersonationStateCookieValue(value)).toBeNull(); // signature no longer verifies

    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', SECRET_B);
    expect(parseImpersonationStateCookieValue(value)).toMatchObject({ adminUserId: 'a' });
  });

  it('throws the explicit error when neither secret exists', () => {
    vi.stubEnv('IMPERSONATION_COOKIE_SECRET', '');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '');
    expect(() => createImpersonationStateCookieValue({ adminUserId: 'a', impersonatedUserId: 'b' }))
      .toThrow('Missing impersonation cookie secret');
  });
});

describe('parseImpersonationStateCookieValue', () => {
  function roundTrip(maxAgeSeconds = 3600) {
    return createImpersonationStateCookieValue({ adminUserId: 'admin-1', impersonatedUserId: 'user-2', maxAgeSeconds });
  }

  it('round-trips a freshly created value', () => {
    expect(parseImpersonationStateCookieValue(roundTrip())).toEqual({
      adminUserId: 'admin-1',
      impersonatedUserId: 'user-2',
      issuedAt: NOW,
      expiresAt: NOW + 3_600_000,
    });
  });

  it('rejects null, empty and structurally broken inputs', () => {
    expect(parseImpersonationStateCookieValue(null)).toBeNull();
    expect(parseImpersonationStateCookieValue('')).toBeNull();
    expect(parseImpersonationStateCookieValue('no-signature-part')).toBeNull();
    expect(parseImpersonationStateCookieValue('a.b.c')).toBeNull(); // extra dot segments
  });

  it('rejects a tampered payload and a forged signature', () => {
    const value = roundTrip();
    const [payload, signature] = value.split('.');

    // payload flipped but signature kept
    const otherPayload = Buffer.from(JSON.stringify({
      adminUserId: 'attacker', impersonatedUserId: 'victim', issuedAt: NOW, expiresAt: NOW + 60_000,
    })).toString('base64url');
    expect(parseImpersonationStateCookieValue(`${otherPayload}.${signature}`)).toBeNull();

    // payload kept, signature flipped
    expect(parseImpersonationStateCookieValue(`${payload}.${signature.slice(0, -2)}XX`)).toBeNull();
  });

  it('rejects a value signed with a different secret', () => {
    const value = roundTrip();
    vi.stubEnv('IMPERSONATION_COOKIE_SECRET', SECRET_B);
    expect(parseImpersonationStateCookieValue(value)).toBeNull();
  });

  it('rejects expired state and honors the exact expiry boundary', () => {
    const value = roundTrip(100);
    vi.setSystemTime(NOW + 99_999); // still valid by 1ms
    expect(parseImpersonationStateCookieValue(value)).toMatchObject({ adminUserId: 'admin-1' });

    vi.setSystemTime(NOW + 100_000); // expiresAt <= now
    expect(parseImpersonationStateCookieValue(value)).toBeNull();
  });

  it('rejects a correctly-signed payload that is not a valid state shape', () => {
    // Signed with the same secret via the same algorithm: signature is valid,
    // only the payload shape is wrong.
    const sign = (payload: string) => createHmac('sha256', SECRET_A).update(payload).digest('base64url');

    const shape = Buffer.from(JSON.stringify({ adminUserId: '', impersonatedUserId: 'b', issuedAt: NOW, expiresAt: NOW + 1000 })).toString('base64url');
    expect(parseImpersonationStateCookieValue(`${shape}.${sign(shape)}`)).toBeNull(); // empty admin id

    const noTimestamps = Buffer.from(JSON.stringify({ adminUserId: 'a', impersonatedUserId: 'b' })).toString('base64url');
    expect(parseImpersonationStateCookieValue(`${noTimestamps}.${sign(noTimestamps)}`)).toBeNull(); // issuedAt/expiresAt missing

    const garbageJson = Buffer.from('not-json').toString('base64url');
    expect(parseImpersonationStateCookieValue(`${garbageJson}.${sign(garbageJson)}`)).toBeNull(); // JSON.parse throws
  });
});
