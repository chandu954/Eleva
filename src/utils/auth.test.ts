import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  headers: vi.fn(),
  createClient: vi.fn(),
}));

vi.mock('next/headers', () => ({ headers: mocks.headers }));
vi.mock('./supabase/server', () => ({ createClient: mocks.createClient }));

import AuthCache from './auth-cache';
import { getAuthenticatedUser, getUserId } from './auth';

describe('authenticated user helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.headers.mockResolvedValue(new Headers());
    mocks.createClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1', email: 'ada@example.com' } }, error: null }) },
    });
  });

  it('returns the authenticated Supabase user and its id', async () => {
    await expect(getAuthenticatedUser()).resolves.toMatchObject({ id: 'user-1', email: 'ada@example.com' });
    await expect(getUserId()).resolves.toBe('user-1');
    expect(mocks.createClient).toHaveBeenCalledTimes(2);
  });

  it('uses the per-request user cache when both request and user headers exist', async () => {
    AuthCache.set('request-cache-hit', { id: 'cached-user', email: 'cached@example.com', timestamp: Date.now() });
    mocks.headers.mockResolvedValue(new Headers({ 'x-request-id': 'request-cache-hit', 'x-user-id': 'cached-user' }));
    await expect(getAuthenticatedUser()).resolves.toEqual({ id: 'cached-user', email: 'cached@example.com' });
    expect(mocks.createClient).not.toHaveBeenCalled();
    AuthCache.clear('request-cache-hit');
  });

  it('authenticates on a cache miss and caches by request id even without x-user-id', async () => {
    mocks.headers.mockResolvedValue(new Headers({ 'x-request-id': 'request-cache-miss' }));
    await expect(getAuthenticatedUser()).resolves.toMatchObject({ id: 'user-1' });
    expect(AuthCache.get('request-cache-miss')).toMatchObject({ id: 'user-1', email: 'ada@example.com' });
    AuthCache.clear('request-cache-miss');
  });

  it('rejects missing users and auth errors', async () => {
    mocks.createClient.mockResolvedValueOnce({ auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) } });
    await expect(getAuthenticatedUser()).rejects.toThrow('User not authenticated');
    mocks.createClient.mockResolvedValueOnce({ auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'x' } }, error: new Error('denied') }) } });
    await expect(getAuthenticatedUser()).rejects.toThrow('User not authenticated');
  });
});

describe('AuthCache expiry and cleanup', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('returns fresh entries, expires stale entries and removes them during cleanup', () => {
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    AuthCache.set('fresh', { id: 'u1', email: null, timestamp: 0 });
    expect(AuthCache.get('fresh')).toMatchObject({ id: 'u1', email: null });
    vi.advanceTimersByTime(60_001);
    expect(AuthCache.get('fresh')).toBeNull();
    AuthCache.set('cleanup', { id: 'u2', email: null, timestamp: 0 });
    vi.advanceTimersByTime(60_001);
    AuthCache.cleanup();
    expect(AuthCache.get('cleanup')).toBeNull();
  });
});
