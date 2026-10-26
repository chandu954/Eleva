// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  CACHE_MAX_ENTRIES,
  ExtractSchema,
  JD_EXTRACT_TTL_MS,
  SCORE_CACHE_TTL_MS,
  ScoreSchema,
  TtlCache,
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
  it('is deterministic and shaped score_<jd>_<resume>', () => {
    const key = scoreCacheKey('resume text', 'job desc');
    expect(key).toBe(scoreCacheKey('resume text', 'job desc'));
    expect(key).toMatch(/^score_[0-9a-f]{64}_[0-9a-f]{64}$/);
  });

  it('changes when either the resume or the job description changes', () => {
    const base = scoreCacheKey('resume1', 'jd1');
    expect(scoreCacheKey('resume1', 'jd2')).not.toBe(base);
    expect(scoreCacheKey('resume2', 'jd1')).not.toBe(base);
  });

  it('does not treat swapped resume/jd arguments as the same key', () => {
    expect(scoreCacheKey('alpha', 'beta')).not.toBe(scoreCacheKey('beta', 'alpha'));
  });

  it('separates resumes that only differ after the early-truncation point', () => {
    const shared = 'a'.repeat(6500);
    expect(scoreCacheKey(`${shared}one`, 'jd')).not.toBe(scoreCacheKey(`${shared}two`, 'jd'));
  });
});

describe('TtlCache', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns null on a miss and the stored value on a hit', () => {
    const cache = new TtlCache<{ n: number }>(1000);
    expect(cache.get('k')).toBeNull();
    cache.set('k', { n: 1 });
    expect(cache.get('k')).toEqual({ n: 1 });
  });

  it('serves an entry just before its TTL and drops it exactly at the TTL', () => {
    const cache = new TtlCache<string>(1000);
    cache.set('k', 'v');

    vi.advanceTimersByTime(999);
    expect(cache.get('k')).toBe('v');

    vi.advanceTimersByTime(1);
    expect(cache.get('k')).toBeNull();
    expect(cache.size).toBe(0);
  });

  it('restarts the TTL when a key is overwritten', () => {
    const cache = new TtlCache<string>(1000);
    cache.set('k', 'old');
    vi.advanceTimersByTime(800);
    cache.set('k', 'new');
    vi.advanceTimersByTime(800);
    expect(cache.get('k')).toBe('new');
  });

  it('evicts the stalest entry once the size limit is exceeded', () => {
    const cache = new TtlCache<number>(10_000, 3);
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);
    cache.set('d', 4);

    expect(cache.size).toBe(3);
    expect(cache.get('a')).toBeNull();
    expect(cache.get('b')).toBe(2);
    expect(cache.get('d')).toBe(4);
  });

  it('treats an overwrite as fresh, so the untouched key is evicted first', () => {
    const cache = new TtlCache<number>(10_000, 2);
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('a', 10);
    cache.set('c', 3);

    expect(cache.get('b')).toBeNull();
    expect(cache.get('a')).toBe(10);
    expect(cache.get('c')).toBe(3);
  });

  it('never grows past the default limit', () => {
    const cache = new TtlCache<number>(10_000);
    for (let i = 0; i < CACHE_MAX_ENTRIES + 25; i++) cache.set(`k${i}`, i);
    expect(cache.size).toBe(CACHE_MAX_ENTRIES);
    expect(cache.get('k0')).toBeNull();
    expect(cache.get(`k${CACHE_MAX_ENTRIES + 24}`)).toBe(CACHE_MAX_ENTRIES + 24);
  });

  it('clear() empties the cache', () => {
    const cache = new TtlCache<number>(1000);
    cache.set('a', 1);
    cache.clear();
    expect(cache.size).toBe(0);
    expect(cache.get('a')).toBeNull();
  });
});

describe('pipeline caches (module level)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    clearPipelineCaches();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('misses before anything is stored', () => {
    expect(getCachedExtract('some job description that is long enough')).toBeNull();
    expect(getCachedScore('resume', 'jd')).toBeNull();
  });

  it('round-trips a validated extract result', () => {
    setCachedExtract('jd one', validExtract);
    expect(getCachedExtract('jd one')).toEqual(validExtract);
  });

  it('round-trips a validated score result', () => {
    setCachedScore('resume', 'jd', validScore);
    expect(getCachedScore('resume', 'jd')).toEqual(validScore);
  });

  it('keeps different job descriptions independent', () => {
    const extractA = { ...validExtract, company: 'A' };
    const extractB = { ...validExtract, company: 'B' };
    setCachedExtract('jd one', extractA);
    setCachedExtract('jd two', extractB);
    expect(getCachedExtract('jd one')).toEqual(extractA);
    expect(getCachedExtract('jd two')).toEqual(extractB);
  });

  it('keeps scores independent per resume and job description pair', () => {
    setCachedScore('resume', 'jd one', { ...validScore, overall: 80 });
    setCachedScore('resume', 'jd two', { ...validScore, overall: 90 });
    setCachedScore('other resume', 'jd one', { ...validScore, overall: 70 });

    expect(getCachedScore('resume', 'jd one')?.overall).toBe(80);
    expect(getCachedScore('resume', 'jd two')?.overall).toBe(90);
    expect(getCachedScore('other resume', 'jd one')?.overall).toBe(70);
  });

  it('does not let a score entry satisfy an extract lookup, or vice versa', () => {
    setCachedScore('same text', 'same text', validScore);
    expect(getCachedExtract('same text')).toBeNull();

    setCachedExtract('only extract', validExtract);
    expect(getCachedScore('only extract', 'only extract')).toBeNull();
  });

  it('handles empty strings', () => {
    expect(getCachedExtract('')).toBeNull();
    expect(getCachedScore('', '')).toBeNull();
    setCachedExtract('', validExtract);
    expect(getCachedExtract('')).toEqual(validExtract);
  });

  it('expires extract results after the extract TTL', () => {
    setCachedExtract('jd', validExtract);
    vi.advanceTimersByTime(JD_EXTRACT_TTL_MS - 1);
    expect(getCachedExtract('jd')).toEqual(validExtract);
    vi.advanceTimersByTime(1);
    expect(getCachedExtract('jd')).toBeNull();
  });

  it('expires score results after the score TTL', () => {
    setCachedScore('resume', 'jd', validScore);
    vi.advanceTimersByTime(SCORE_CACHE_TTL_MS - 1);
    expect(getCachedScore('resume', 'jd')).toEqual(validScore);
    vi.advanceTimersByTime(1);
    expect(getCachedScore('resume', 'jd')).toBeNull();
  });

  it('evicts the stalest in-memory entry beyond the entry cap', () => {
    const firstJd = 'first-jd';
    setCachedExtract(firstJd, validExtract);
    let latest = '';
    for (let i = 0; i < CACHE_MAX_ENTRIES; i++) {
      latest = `filler-jd-${i}`;
      setCachedExtract(latest, validExtract);
    }
    expect(getCachedExtract(firstJd)).toBeNull();
    expect(getCachedExtract(latest)).toEqual(validExtract);
  });

  it('clearPipelineCaches() drops both caches', () => {
    setCachedExtract('jd', validExtract);
    setCachedScore('resume', 'jd', validScore);
    clearPipelineCaches();
    expect(getCachedExtract('jd')).toBeNull();
    expect(getCachedScore('resume', 'jd')).toBeNull();
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
