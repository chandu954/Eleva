// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import redis, { InMemoryRedis, redisMode } from './redis';

describe('redisMode', () => {
  it('prefers the local Redis server when USE_LOCAL_REDIS=true and REDIS_URL are set', () => {
    expect(redisMode({ USE_LOCAL_REDIS: 'true', REDIS_URL: 'redis://localhost:6379' })).toBe('local');
  });

  it('falls back to Upstash REST when local config is absent but Upstash credentials exist', () => {
    expect(redisMode({ USE_LOCAL_REDIS: 'true', UPSTASH_REDIS_REST_URL: 'https://e', UPSTASH_REDIS_REST_TOKEN: 't' })).toBe('upstash');
    expect(redisMode({ UPSTASH_REDIS_REST_URL: 'https://e', UPSTASH_REDIS_REST_TOKEN: 't' })).toBe('upstash');
  });

  it('uses the Upstash REST API only with BOTH url and token', () => {
    expect(redisMode({ UPSTASH_REDIS_REST_URL: 'https://e' })).not.toBe('upstash');
    expect(redisMode({ UPSTASH_REDIS_REST_TOKEN: 't' })).not.toBe('upstash');
  });

  it('stubs when nothing is configured outside production', () => {
    expect(redisMode({ NODE_ENV: 'test' })).toBe('stub');
    expect(redisMode({ NODE_ENV: 'development' })).toBe('stub');
  });

  it('reports unconfigured in production — the guard the stub must never bypass', () => {
    expect(redisMode({ NODE_ENV: 'production' })).toBe('unconfigured');
    // Even with the local/off flag present: missing REDIS_URL is enough.
    expect(redisMode({ NODE_ENV: 'production', USE_LOCAL_REDIS: 'true' })).toBe('unconfigured');
  });
});

describe('InMemoryRedis semantics', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('stores and returns hashes', async () => {
    const r = new InMemoryRedis();
    expect(await r.hgetall('missing')).toBeNull();
    expect(await r.hset('k', { tokens: '3', last: '1' })).toBe(1);
    expect(await r.hgetall('k')).toEqual({ tokens: '3', last: '1' });
  });

  it('merges fields on re-set, like Redis HSET', async () => {
    const r = new InMemoryRedis();
    await r.hset('k', { a: '1', b: '2' });
    await r.hset('k', { b: '22', c: '3' });
    expect(await r.hgetall('k')).toEqual({ a: '1', b: '22', c: '3' });
  });

  it('returns a copy, so mutating the result cannot corrupt the store', async () => {
    const r = new InMemoryRedis();
    await r.hset('k', { a: '1' });
    const got = await r.hgetall('k') as Record<string, string>;
    got.a = 'hacked';
    expect((await r.hgetall('k'))?.a).toBe('1');
  });

  it('expires only when EXPIRE succeeds on an existing key', async () => {
    const r = new InMemoryRedis();
    await r.hset('k', { a: '1' });
    expect(await r.expire('k', 10)).toBe(1);
    vi.advanceTimersByTime(9_999);
    expect(await r.hgetall('k')).toEqual({ a: '1' });
    vi.advanceTimersByTime(1);
    expect(await r.hgetall('k')).toBeNull();

    // EXPIRE on a missing (or expired) key is a no-op returning 0.
    expect(await r.expire('never-set', 10)).toBe(0);
    expect(await r.expire('k', 10)).toBe(0);
  });

  it('does not share state between instances', async () => {
    const a = new InMemoryRedis();
    const b = new InMemoryRedis();
    await a.hset('k', { a: '1' });
    expect(await b.hgetall('k')).toBeNull();
  });
});

describe('module default export', () => {
  // These tests simulate deployment environments, so the variables must be
  // assignable here (@types/node marks them readonly on process.env).
  const mutableEnv = process.env as unknown as Record<string, string | undefined>;

  function snapshot() {
    const keys = ['NODE_ENV', 'USE_LOCAL_REDIS', 'REDIS_URL', 'UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN'];
    return Object.fromEntries(keys.map((k) => [k, mutableEnv[k]]));
  }

  function restore(prev: Record<string, string | undefined>) {
    for (const [k, v] of Object.entries(prev)) {
      if (v === undefined) delete mutableEnv[k];
      else mutableEnv[k] = v;
    }
  }

  it('resolves to the no-network stub outside production, even with zero env config', async () => {
    const prev = snapshot();
    try {
      for (const k of ['USE_LOCAL_REDIS', 'REDIS_URL', 'UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN']) delete mutableEnv[k];
      vi.resetModules();
      const fresh = await import('./redis');
      // NOTE: not instanceof — vi.resetModules() creates a fresh module
      // registry, so the fresh InMemoryRedis class is a different object.
      // Verify behaviorally instead.
      expect(await fresh.default.hset('fresh-import-key', { ok: '1' })).toBe(1);
      expect(await fresh.default.hgetall('fresh-import-key')).toEqual({ ok: '1' });
    } finally {
      restore(prev);
      vi.resetModules();
    }
  });

  it('refuses to boot in production with no Redis configured', async () => {
    const prev = snapshot();
    try {
      for (const k of ['USE_LOCAL_REDIS', 'REDIS_URL', 'UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN']) delete mutableEnv[k];
      mutableEnv.NODE_ENV = 'production';
      vi.resetModules();
      await expect(import('./redis')).rejects.toThrow(/Redis is not configured/);
    } finally {
      restore(prev);
      vi.resetModules();
    }
  });

  it('exposes the pre-existing client for rate limiting under normal test config', async () => {
    // The rateLimiter consumes the same default export; a null-method client
    // would crash every request. Just exercise the shared singleton.
    expect(await redis.hset('shared-singleton-key', { tokens: '1' })).toBeTruthy();
    expect(await redis.hgetall('shared-singleton-key')).toEqual({ tokens: '1' });
  });
});
