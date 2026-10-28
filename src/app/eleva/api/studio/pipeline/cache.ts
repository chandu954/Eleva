import { createHash } from 'node:crypto';

import { z } from 'zod';

import redis from '@/lib/redis';
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
const CACHE_KEY_PREFIX = 'pipeline-cache:v1';
const activeCacheKeys = new Set<string>();

function sha256Hex(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

/**
 * Hashing history (for whoever archaeologizes these keys):
 * 1. hand-rolled ((h<<5)-h) 32-bit value over the first 2000 chars —
 *    genuinely prone to collisions between distinct JDs;
 * 2. SHA-256, still truncated to the first 2000 chars;
 * 3. current: SHA-256 over the FULL text. The pipeline prompt sends up to
 *    ~6000 characters, and two texts that only differ past a prefix share
 *    nothing semantically — full-text hashing makes old aliasing (the
 *    wrong extraction silently served for a different JD) impossible.
 * Changing the key format means pre-existing `jd_extract_cache` rows and
 * Redis entries simply miss and age out under the 24h TTL;
 * `jd_hash` is a text primary key, so no schema migration is needed.
 */
export function jdHash(text: string): string {
  return `jd_${sha256Hex(text)}`;
}

export function scoreCacheKey(resumeText: string, jd: string, userId = 'anonymous'): string {
  return `score_${sha256Hex(userId)}_${sha256Hex(jd)}_${sha256Hex(resumeText)}`;
}

function cacheKey(key: string): string {
  return `${CACHE_KEY_PREFIX}:${key}`;
}

async function readValidated<T>(key: string, schema: z.ZodType<T>): Promise<T | null> {
  try {
    const entry = await redis.hgetall(cacheKey(key));
    if (!entry?.value) return null;
    const parsedJson: unknown = JSON.parse(entry.value);
    const parsed = schema.safeParse(parsedJson);
    if (parsed.success) return parsed.data;
    await redis.del(cacheKey(key));
    return null;
  } catch {
    // Cache outages and stale payloads must not interrupt the AI pipeline.
    return null;
  }
}

async function writeValidated<T>(key: string, value: T, ttlMs: number): Promise<void> {
  const namespacedKey = cacheKey(key);
  try {
    await redis.hset(namespacedKey, { value: JSON.stringify(value) });
    await redis.expire(namespacedKey, Math.ceil(ttlMs / 1000));
    activeCacheKeys.add(namespacedKey);
  } catch {
    // The pipeline still succeeds when Redis is unavailable.
  }
}

export function getCachedExtract(jd: string): Promise<JdExtract | null> {
  return readValidated(jdHash(jd), ExtractSchema);
}

export function setCachedExtract(jd: string, data: JdExtract): Promise<void> {
  return writeValidated(jdHash(jd), data, JD_EXTRACT_TTL_MS);
}

export function getCachedScore(resumeText: string, jd: string, userId = 'anonymous'): Promise<ResumeScore | null> {
  return readValidated(scoreCacheKey(resumeText, jd, userId), ScoreSchema);
}

export function setCachedScore(resumeText: string, jd: string, data: ResumeScore, userId = 'anonymous'): Promise<void> {
  return writeValidated(scoreCacheKey(resumeText, jd, userId), data, SCORE_CACHE_TTL_MS);
}

/** Test helper: deletes keys written by this process from the shared cache. */
export async function clearPipelineCaches(): Promise<void> {
  const keys = [...activeCacheKeys];
  activeCacheKeys.clear();
  await Promise.all(keys.map((key) => redis.del(key).catch(() => 0)));
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
