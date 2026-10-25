const JD_EXTRACT_TTL_MS = 86_400_000; // 24h
const SCORE_CACHE_TTL_MS = 86_400_000; // 24h

function jdHash(text: string): string {
  let h = 0;
  for (let i = 0; i < text.length; i++) {
    h = ((h << 5) - h + text.charCodeAt(i)) | 0;
  }
  return `jd_${h}`;
}

// Simple in-memory JD extraction cache (keyed by JD hash)
const jdCache = new Map<string, { data: any; ts: number }>();

export function getCachedExtract(jd: string): any | null {
  const key = jdHash(jd.slice(0, 2000));
  const entry = jdCache.get(key);
  if (entry && Date.now() - entry.ts < JD_EXTRACT_TTL_MS) return entry.data;
  jdCache.delete(key);
  return null;
}

export function setCachedExtract(jd: string, data: any) {
  const key = jdHash(jd.slice(0, 2000));
  jdCache.set(key, { data, ts: Date.now() });
  if (jdCache.size > 200) {
    const oldest = [...jdCache.entries()].sort(([, a], [, b]) => a.ts - b.ts)[0];
    if (oldest) jdCache.delete(oldest[0]);
  }
}

// ─── Score Cache ──────────────────────────────────────────────────────────────────

const scoreCache = new Map<string, { data: any; ts: number }>();

export function scoreCacheKey(resumeText: string, jd: string): string {
  const h1 = jdHash(jd.slice(0, 2000));
  const h2 = jdHash(resumeText.slice(0, 2000));
  return `score_${h1}_${h2}`;
}

export function getCachedScore(resumeText: string, jd: string): any | null {
  const key = scoreCacheKey(resumeText, jd);
  const entry = scoreCache.get(key);
  if (entry && Date.now() - entry.ts < SCORE_CACHE_TTL_MS) return entry.data;
  scoreCache.delete(key);
  return null;
}

export function setCachedScore(resumeText: string, jd: string, data: any) {
  const key = scoreCacheKey(resumeText, jd);
  scoreCache.set(key, { data, ts: Date.now() });
  if (scoreCache.size > 200) {
    const oldest = [...scoreCache.entries()].sort(([, a], [, b]) => a.ts - b.ts)[0];
    if (oldest) scoreCache.delete(oldest[0]);
  }
}

export { jdHash, JD_EXTRACT_TTL_MS, SCORE_CACHE_TTL_MS };
