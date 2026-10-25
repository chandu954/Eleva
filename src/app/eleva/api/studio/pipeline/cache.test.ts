// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { getCachedExtract, setCachedExtract, getCachedScore, setCachedScore, scoreCacheKey } from './cache';

describe('pipeline cache', () => {
  it('returns null for cache miss', () => {
    expect(getCachedExtract('some job description that is long enough to be unique')).toBeNull();
  });

  it('caches and retrieves extract', () => {
    const jd = 'a'.repeat(50);
    const data = { company: 'Test', role: 'Eng' };
    setCachedExtract(jd, data);
    expect(getCachedExtract(jd)).toEqual(data);
  });

  it('caches and retrieves score with independent keys', () => {
    const jd1 = 'b'.repeat(50);
    const jd2 = 'c'.repeat(50);
    const resume = 'd'.repeat(50);
    const score1 = { overall: 80 };
    const score2 = { overall: 90 };
    setCachedScore(resume, jd1, score1);
    setCachedScore(resume, jd2, score2);
    expect(getCachedScore(resume, jd1)).toEqual(score1);
    expect(getCachedScore(resume, jd2)).toEqual(score2);
  });

  it('produces different keys for different content', () => {
    const k1 = scoreCacheKey('resume1', 'jd1');
    const k2 = scoreCacheKey('resume1', 'jd2');
    const k3 = scoreCacheKey('resume2', 'jd1');
    expect(k1).not.toBe(k2);
    expect(k1).not.toBe(k3);
  });
});

  it('handles cache with different job descriptions', () => {
    const jd1 = 'x'.repeat(60);
    const jd2 = 'y'.repeat(60);
    setCachedExtract(jd1, { test: 1 });
    setCachedExtract(jd2, { test: 2 });
    expect(getCachedExtract(jd1)).toEqual({ test: 1 });
    expect(getCachedExtract(jd2)).toEqual({ test: 2 });
  });

  it('scoreCacheKey is deterministic', () => {
    const k1 = scoreCacheKey('resume text', 'job desc');
    const k2 = scoreCacheKey('resume text', 'job desc');
    expect(k1).toBe(k2);
  });

  it('handles empty strings', () => {
    expect(getCachedExtract('')).toBeNull();
    expect(getCachedScore('', '')).toBeNull();
  });

  it('scoreCacheKey handles long inputs', () => {
    const longResume = 'a'.repeat(5000);
    const longJD = 'b'.repeat(5000);
    const key = scoreCacheKey(longResume, longJD);
    expect(typeof key).toBe('string');
    expect(key.length).toBeGreaterThan(0);
  });
