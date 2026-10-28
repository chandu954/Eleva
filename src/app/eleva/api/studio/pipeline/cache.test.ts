// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import redis from '@/lib/redis';

import {
  ExtractSchema,
  JD_EXTRACT_TTL_MS,
  SCORE_CACHE_TTL_MS,
  ScoreSchema,
  clearPipelineCaches,
  getCachedExtract,
  getCachedExtractFromDb,
  getCachedScore,
  jdHash,
  scoreCacheKey,
  setCachedExtract,
  setCachedExtractInDb,
  setCachedScore,
} from './cache';

const validExtract = ExtractSchema.parse({
  company: 'Acme',
  role: 'Engineer',
  required_skills: ['TypeScript'],
  nice_to_have: [],
  summary: 'ok',
});

const validScore = ScoreSchema.parse({
  overall: 80,
  keyword: 70,
  formatting: 75,
  readability: 90,
  impact: 65,
  recruiter: 72,
  matched: ['TypeScript'],
  missing: ['SQL'],
  suggestions: [],
  summary: 'ok',
});

describe('jdHash', () => {
  it('is deterministic and prefixed with a sha-256 hex digest', () => {
    const first = jdHash('Senior engineer, TypeScript');
    expect(first).toBe(jdHash('Senior engineer, TypeScript'));
    expect(first).toMatch(/^jd_[0-9a-f]{64}$/);
  });

  it('differs for different content', () => {
    expect(jdHash('role a')).not.toBe(jdHash('role b'));
  });

  it('hashes the full text, so descriptions differing only late never collide', () => {
    // The pipeline prompt sends up to ~6000 chars; a prefix-truncated key
    // served the wrong extraction for texts sharing only their head.
    const shared = 'x'.repeat(6500);
    expect(jdHash(`${shared}A`)).not.toBe(jdHash(`${shared}B`));
  });

  it('accepts the empty string', () => {
    expect(jdHash('')).toMatch(/^jd_[0-9a-f]{64}$/);
  });
});

describe('scoreCacheKey', () => {
  it('is deterministic and includes user, job description and resume hashes', () => {
    const key = scoreCacheKey('resume text', 'job desc');
    expect(key).toBe(scoreCacheKey('resume text', 'job desc'));
    expect(key).toMatch(/^score_[0-9a-f]{64}_[0-9a-f]{64}_[0-9a-f]{64}$/);
  });

  it('changes when either the resume or the job description changes', () => {
    const base = scoreCacheKey('resume1', 'jd1');
    expect(scoreCacheKey('resume1', 'jd2')).not.toBe(base);
    expect(scoreCacheKey('resume2', 'jd1')).not.toBe(base);
  });

  it('isolates identical resume and job text across users', () => {
    expect(scoreCacheKey('resume', 'jd', 'user-a')).not.toBe(scoreCacheKey('resume', 'jd', 'user-b'));
  });

  it('does not treat swapped resume/jd arguments as the same key', () => {
    expect(scoreCacheKey('alpha', 'beta')).not.toBe(scoreCacheKey('beta', 'alpha'));
  });

  it('separates resumes that only differ after the early-truncation point', () => {
    const shared = 'a'.repeat(6500);
    expect(scoreCacheKey(`${shared}one`, 'jd')).not.toBe(scoreCacheKey(`${shared}two`, 'jd'));
  });
});

describe('pipeline caches (shared Redis)', () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    await clearPipelineCaches();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('misses when no value exists', async () => {
    await expect(getCachedExtract('some job description')).resolves.toBeNull();
    await expect(getCachedScore('resume', 'jd')).resolves.toBeNull();
  });

  it('round-trips validated extraction and score results', async () => {
    await setCachedExtract('jd one', validExtract);
    await setCachedScore('resume', 'jd', validScore, 'user-1');
    await expect(getCachedExtract('jd one')).resolves.toEqual(validExtract);
    await expect(getCachedScore('resume', 'jd', 'user-1')).resolves.toEqual(validScore);
  });

  it('isolates score cache entries by user as well as resume and job description', async () => {
    await setCachedScore('same resume', 'same jd', { ...validScore, overall: 80 }, 'user-1');
    await setCachedScore('same resume', 'same jd', { ...validScore, overall: 90 }, 'user-2');
    await expect(getCachedScore('same resume', 'same jd', 'user-1')).resolves.toMatchObject({ overall: 80 });
    await expect(getCachedScore('same resume', 'same jd', 'user-2')).resolves.toMatchObject({ overall: 90 });
    await expect(getCachedScore('same resume', 'same jd', 'user-3')).resolves.toBeNull();
  });

  it('keeps extracts independent and does not cross-read score entries', async () => {
    const extractA = { ...validExtract, company: 'A' };
    const extractB = { ...validExtract, company: 'B' };
    await setCachedExtract('jd one', extractA);
    await setCachedExtract('jd two', extractB);
    await setCachedScore('same text', 'same text', validScore);
    await expect(getCachedExtract('jd one')).resolves.toEqual(extractA);
    await expect(getCachedExtract('jd two')).resolves.toEqual(extractB);
    await expect(getCachedExtract('same text')).resolves.toBeNull();
  });

  it('expires extract and score entries at their configured TTLs', async () => {
    await setCachedExtract('ttl jd', validExtract);
    await setCachedScore('ttl resume', 'ttl jd', validScore);
    await vi.advanceTimersByTimeAsync(JD_EXTRACT_TTL_MS - 1);
    await expect(getCachedExtract('ttl jd')).resolves.toEqual(validExtract);
    await vi.advanceTimersByTimeAsync(1);
    await expect(getCachedExtract('ttl jd')).resolves.toBeNull();
    await expect(getCachedScore('ttl resume', 'ttl jd')).resolves.toBeNull();

    await setCachedScore('score resume', 'score jd', validScore);
    await vi.advanceTimersByTimeAsync(SCORE_CACHE_TTL_MS);
    await expect(getCachedScore('score resume', 'score jd')).resolves.toBeNull();
  });

  it('validates cache payloads and evicts malformed JSON/schema data', async () => {
    const invalidShapeKey = `pipeline-cache:v1:${jdHash('invalid shape')}`;
    await redis.hset(invalidShapeKey, { value: JSON.stringify({ company: { wrong: true } }) });
    await expect(getCachedExtract('invalid shape')).resolves.toBeNull();
    await expect(redis.hgetall(invalidShapeKey)).resolves.toBeNull();

    const malformedJsonKey = `pipeline-cache:v1:${jdHash('invalid json')}`;
    await redis.hset(malformedJsonKey, { value: '{' });
    await expect(getCachedExtract('invalid json')).resolves.toBeNull();
  });

  it('treats Redis failures as cache misses and ignores failed writes', async () => {
    vi.spyOn(redis, 'hgetall').mockRejectedValueOnce(new Error('redis offline'));
    await expect(getCachedExtract('offline jd')).resolves.toBeNull();
    vi.spyOn(redis, 'hset').mockRejectedValueOnce(new Error('redis offline'));
    await expect(setCachedExtract('offline jd', validExtract)).resolves.toBeUndefined();
  });

  it('supports empty keys and clears keys written by this process', async () => {
    await setCachedExtract('', validExtract);
    await setCachedScore('', '', validScore);
    await expect(getCachedExtract('')).resolves.toEqual(validExtract);
    await clearPipelineCaches();
    await expect(getCachedExtract('')).resolves.toBeNull();
    await expect(getCachedScore('', '')).resolves.toBeNull();
  });
});

describe('pipeline cache — DB-backed extraction', () => {
  function supabaseWith(payload: unknown, error: unknown = null) {
    const eq = vi.fn().mockReturnThis();
    const gte = vi.fn().mockReturnThis();
    const maybeSingle = vi.fn().mockResolvedValue({
      data: payload ? { payload, created_at: new Date().toISOString() } : null,
      error,
    });
    return {
      from: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ eq, gte, maybeSingle }) }),
    } as unknown as Parameters<typeof getCachedExtractFromDb>[0];
  }

  it('reads the cached payload', async () => {
    const supabase = supabaseWith(validExtract);
    await expect(getCachedExtractFromDb(supabase, 'some job description')).resolves.toEqual(validExtract);
  });

  it('treats a malformed payload as a miss instead of propagating junk', async () => {
    const supabase = supabaseWith({ company: { deep: 'wrong' } });
    await expect(getCachedExtractFromDb(supabase, 'some other description')).resolves.toBeNull();
  });

  it('treats supabase errors and empty rows as misses', async () => {
    await expect(getCachedExtractFromDb(supabaseWith(null), 'jd')).resolves.toBeNull();
    await expect(getCachedExtractFromDb(supabaseWith(null, new Error('db down')), 'jd')).resolves.toBeNull();
  });

  it('upserts the payload keyed by the full-text hash', async () => {
    const upsert = vi.fn().mockResolvedValue({});
    const supabase = { from: vi.fn().mockReturnValue({ upsert }) } as unknown as Parameters<typeof setCachedExtractInDb>[0];
    await setCachedExtractInDb(supabase, 'another description', validExtract);
    const lastUpsert = upsert.mock.calls.at(-1)?.[0] as { jd_hash: string; payload: unknown };
    expect(lastUpsert.jd_hash).toBe(jdHash('another description'));
    expect(lastUpsert.payload).toEqual(validExtract);
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ payload: validExtract }), { onConflict: 'jd_hash' });
  });
});
