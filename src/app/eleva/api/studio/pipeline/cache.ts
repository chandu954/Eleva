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
export const CACHE_MAX_ENTRIES = 200;

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
 * in-memory entries simply miss and age out under the 24h TTL;
 * `jd_hash` is a text primary key, so no schema migration is needed.
 */
export function jdHash(text: string): string {
  return `jd_${sha256Hex(text)}`;
}

export function scoreCacheKey(resumeText: string, jd: string): string {
  return `score_${sha256Hex(jd)}_${sha256Hex(resumeText)}`;
}

/**
 * Small in-memory TTL cache with insertion-order eviction. JavaScript Maps
 * iterate in insertion order and re-inserting a key moves it to the back,
 * so the first key in the map is always the stalest — eviction is O(1)
 * with no sorting, and an overwritten key is treated as fresh.
 */
export class TtlCache<V> {
  private readonly entries = new Map<string, { value: V; storedAt: number }>();

  constructor(
    private readonly ttlMs: number,
    private readonly maxEntries: number = CACHE_MAX_ENTRIES,
  ) {}

  get(key: string): V | null {
    const entry = this.entries.get(key);
    if (!entry) return null;
    if (Date.now() - entry.storedAt >= this.ttlMs) {
      this.entries.delete(key);
      return null;
    }
    return entry.value;
  }

  set(key: string, value: V): void {
    this.entries.delete(key);
    this.entries.set(key, { value, storedAt: Date.now() });
    while (this.entries.size > this.maxEntries) {
      const stalest = this.entries.keys().next();
      if (stalest.done) break;
      this.entries.delete(stalest.value);
    }
  }

  get size(): number {
    return this.entries.size;
  }

  clear(): void {
    this.entries.clear();
  }
}

// ─── In-memory caches (per server instance) ────────────────
const extractCache = new TtlCache<JdExtract>(JD_EXTRACT_TTL_MS);
const scoreCache = new TtlCache<ResumeScore>(SCORE_CACHE_TTL_MS);

export function getCachedExtract(jd: string): JdExtract | null {
  return extractCache.get(jdHash(jd));
}

export function setCachedExtract(jd: string, data: JdExtract) {
  extractCache.set(jdHash(jd), data);
}

export function getCachedScore(resumeText: string, jd: string): ResumeScore | null {
  return scoreCache.get(scoreCacheKey(resumeText, jd));
}

export function setCachedScore(resumeText: string, jd: string, data: ResumeScore) {
  scoreCache.set(scoreCacheKey(resumeText, jd), data);
}

/** Test/diagnostic helper: empties both in-memory caches. */
export function clearPipelineCaches(): void {
  extractCache.clear();
  scoreCache.clear();
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
