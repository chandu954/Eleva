// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';

import {
  ExtractSchema,
  JD_EXTRACT_TTL_MS,
  ScoreSchema,
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

describe('pipeline cache — in-memory', () => {
  it('returns null for cache miss', () => {
    expect(getCachedExtract(`unique jd ${Math.random()}`)).toBeNull();
    expect(getCachedScore('r', `unique jd ${Math.random()}`)).toBeNull();
  });

  it('stores and retrieves an extract', () => {
    const jd = `jd ${Math.random()}`;
    setCachedExtract(jd, validExtract);
    expect(getCachedExtract(jd)).toEqual(validExtract);
  });

  it('keeps scores for different JDs independent', () => {
    const resume = `r ${Math.random()}`;
    const jd1 = `jd1 ${Math.random()}`;
    const jd2 = `jd2 ${Math.random()}`;
    const score1 = { ...validScore, overall: 80 };
    const score2 = { ...validScore, overall: 90 };
    setCachedScore(resume, jd1, score1);
    setCachedScore(resume, jd2, score2);
    expect(getCachedScore(resume, jd1)).toEqual(score1);
    expect(getCachedScore(resume, jd2)).toEqual(score2);
    expect(getCachedScore(`other ${Math.random()}`, jd1)).toBeNull();
  });

  it('distinguishes resumes within the same JD', () => {
    const jd = `jd ${Math.random()}`;
    const a = { ...validScore, overall: 10 };
    const b = { ...validScore, overall: 20 };
    setCachedScore('resume a', jd, a);
    setCachedScore('resume b', jd, b);
    expect(getCachedScore('resume a', jd)).toEqual(a);
    expect(getCachedScore('resume b', jd)).toEqual(b);
  });

  it('expires entries older than the TTL', () => {
    vi.useFakeTimers({ now: Date.now() });
    try {
      const jd = `ttl jd ${Math.random()}`;
      setCachedExtract(jd, validExtract);
      expect(getCachedExtract(jd)).toEqual(validExtract);
      // Advance just past the 24h TTL.
      vi.advanceTimersByTime(JD_EXTRACT_TTL_MS + 1);
      expect(getCachedExtract(jd)).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('evicts the oldest entry beyond the 200-entry cap', () => {
    const firstJd = `first ${Math.random()}`;
    setCachedExtract(firstJd, validExtract);
    let latest = '';
    for (let i = 0; i < 200; i++) {
      latest = `filler ${i} ${Math.random()}`;
      setCachedExtract(latest, validExtract);
    }
    // The very first entry has been evicted; the most recent one is intact.
    expect(getCachedExtract(firstJd)).toBeNull();
    expect(getCachedExtract(latest)).toEqual(validExtract);
  });
});

describe('pipeline cache — keys and hashing', () => {
  it('produces distinct keys for distinct content and identical keys for repeats', () => {
    const k1 = scoreCacheKey('resume1', 'jd1');
    const k2 = scoreCacheKey('resume1', 'jd2');
    const k3 = scoreCacheKey('resume2', 'jd1');
    expect(k1).not.toBe(k2);
    expect(k1).not.toBe(k3);
    expect(scoreCacheKey('resume1', 'jd1')).toBe(k1);
  });

  it('keys only depend on the first 2000 characters (preserved behavior)', () => {
    const prefix = 'same prefix '.repeat(167);
    expect(jdHash(prefix)).toBe(jdHash(prefix + ' tail never consulted'));
  });

  it('handles long inputs', () => {
    const key = scoreCacheKey('a'.repeat(5000), 'b'.repeat(5000));
    expect(typeof key).toBe('string');
    expect(key.length).toBeGreaterThan(0);
  });
});

describe('pipeline cache — DB-backed extraction', () => {
  function supabaseWith(payload: unknown, error: unknown = null) {
    const eq = vi.fn().mockReturnThis();
    const gte = vi.fn().mockReturnThis();
    const maybeSingle = vi.fn().mockResolvedValue({ data: payload ? { payload, created_at: new Date().toISOString() } : null, error });
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

  it('upserts the payload keyed by hash', async () => {
    const upsert = vi.fn().mockResolvedValue({});
    const supabase = { from: vi.fn().mockReturnValue({ upsert }) } as unknown as Parameters<typeof setCachedExtractInDb>[0];
    await setCachedExtractInDb(supabase, 'another description', validExtract);
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ payload: validExtract }), { onConflict: 'jd_hash' });
  });
});
