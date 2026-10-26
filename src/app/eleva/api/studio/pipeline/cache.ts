import { createHash } from 'node:crypto';

import { z } from 'zod';

import type { createClient } from '@/utils/supabase/server';

export type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Cached-value contracts. Both must match the shapes the pipeline route
 * validates AI output against before writing; the cache stores the
 * validated values and re-serves them as-is.
 */
export const ExtractSchema = z.object({
  company: z.string().nullable(),
  role: z.string().nullable(),
  required_skills: z.array(z.string()).max(30),
  nice_to_have: z.array(z.string()).max(20),
  summary: z.string(),
});

export const ScoreSchema = z.object({
  overall: z.number().int().min(0).max(100),
  keyword: z.number().int().min(0).max(100),
  formatting: z.number().int().min(0).max(100),
  readability: z.number().int().min(0).max(100),
  impact: z.number().int().min(0).max(100),
  recruiter: z.number().int().min(0).max(100),
  matched: z.array(z.string()).max(30),
  missing: z.array(z.string()).max(30),
  suggestions: z.array(
    z.object({
      type: z.enum(['success', 'warning', 'primary']),
      text: z.string(),
      action: z.string(),
    }),
  ).max(8),
  summary: z.string(),
});

export type JdExtract = z.infer<typeof ExtractSchema>;
export type ResumeScore = z.infer<typeof ScoreSchema>;

export const JD_EXTRACT_TTL_MS = 86_400_000; // 24h
export const SCORE_CACHE_TTL_MS = 86_400_000; // 24h
const MAX_IN_MEMORY_ENTRIES = 200;

/**
 * Cache keys hash the first 2000 characters of the input, so requests
 * whose JD text shares a prefix share cache entries. The hash used to be
 * a hand-rolled 32-bit value genuinely prone to collisions (two distinct
 * JDs resolving to the same key would receive each other's extraction);
 * it is now a SHA-256 digest, making key collisions a non-issue.
 */
export function jdHash(text: string): string {
  return `jd_${createHash('sha256').update(text.slice(0, 2000)).digest('hex')}`;
}

interface CacheEntry<T> {
  data: T;
  ts: number;
}

function getFresh<T>(cache: Map<string, CacheEntry<T>>, key: string, ttlMs: number): T | null {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.ts < ttlMs) return entry.data;
  cache.delete(key);
  return null;
}

function setWithEviction<T>(cache: Map<string, CacheEntry<T>>, key: string, data: T) {
  cache.set(key, { data, ts: Date.now() });
  if (cache.size > MAX_IN_MEMORY_ENTRIES) {
    const oldest = [...cache.entries()].sort(([, a], [, b]) => a.ts - b.ts)[0];
    if (oldest) cache.delete(oldest[0]);
  }
}

// ─── JD extraction cache (in-memory, per server instance) ──
const jdCache = new Map<string, CacheEntry<JdExtract>>();

export function getCachedExtract(jd: string): JdExtract | null {
  return getFresh(jdCache, jdHash(jd), JD_EXTRACT_TTL_MS);
}

export function setCachedExtract(jd: string, data: JdExtract) {
  setWithEviction(jdCache, jdHash(jd), data);
}

// ─── Score cache (in-memory, per server instance) ──────────
const scoreCache = new Map<string, CacheEntry<ResumeScore>>();

export function scoreCacheKey(resumeText: string, jd: string): string {
  const h1 = createHash('sha256').update(jd.slice(0, 2000)).digest('hex');
  const h2 = createHash('sha256').update(resumeText.slice(0, 2000)).digest('hex');
  return `score_${h1}_${h2}`;
}

export function getCachedScore(resumeText: string, jd: string): ResumeScore | null {
  return getFresh(scoreCache, scoreCacheKey(resumeText, jd), SCORE_CACHE_TTL_MS);
}

export function setCachedScore(resumeText: string, jd: string, data: ResumeScore) {
  setWithEviction(scoreCache, scoreCacheKey(resumeText, jd), data);
}

// ─── DB-backed JD extraction cache (shared across instances) ──

/**
 * Reads a cached extraction written by any server instance. The payload
 * column is untrusted (older rows, other writers), so it is validated
 * against the schema; a malformed row degrades to a cache miss instead of
 * propagating junk into the scoring pipeline.
 */
async function getCachedExtractFromDb(supabase: SupabaseClient, jd: string): Promise<JdExtract | null> {
  const jd_hash = jdHash(jd);
  const cutoff = new Date(Date.now() - JD_EXTRACT_TTL_MS).toISOString();

  const { data, error } = await supabase
    .from('jd_extract_cache')
    .select('payload,created_at')
    .eq('jd_hash', jd_hash)
    .gte('created_at', cutoff)
    .maybeSingle();

  if (error || !data) return null;
  const parsed = ExtractSchema.safeParse(data.payload);
  return parsed.success ? parsed.data : null;
}

async function setCachedExtractInDb(supabase: SupabaseClient, jd: string, payload: JdExtract) {
  const jd_hash = jdHash(jd);
  await supabase
    .from('jd_extract_cache')
    .upsert({ jd_hash, payload }, { onConflict: 'jd_hash' });
}

export { getCachedExtractFromDb, setCachedExtractInDb };
