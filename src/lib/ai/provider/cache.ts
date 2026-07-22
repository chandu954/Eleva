import type { AIProviderResult } from './types';

const responseCache = new Map<string, { result: AIProviderResult; expiresAt: number }>();

function cacheKey(system: string, prompt: string, model: string, temp?: number): string {
  return `${model}:${temp ?? 0.7}:${system.slice(0, 200)}:${prompt.slice(0, 500)}`;
}

export function getCached(system: string | undefined, prompt: string | undefined, model: string, temperature?: number): AIProviderResult | null {
  if (!system || !prompt) return null;
  const key = cacheKey(system, prompt, model, temperature);
  const entry = responseCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    responseCache.delete(key);
    return null;
  }
  return entry.result;
}

export function setCache(system: string | undefined, prompt: string | undefined, model: string, result: AIProviderResult, temperature?: number, ttlMs = 60000): void {
  if (!system || !prompt) return;
  const key = cacheKey(system, prompt, model, temperature);
  responseCache.set(key, { result, expiresAt: Date.now() + ttlMs });
  if (responseCache.size > 500) {
    const firstKey = responseCache.keys().next().value;
    if (firstKey) responseCache.delete(firstKey);
  }
}