import { ProviderBusyError, ProviderError } from './errors';
import type { AIProviderResult } from './types';

const DEFAULT_MAX_RETRIES = 2;
const BASE_RETRY_MS = 500;
const MAX_RETRY_MS = 30_000;

export function getMaxRetries(): number {
  const raw = process.env.AI_MAX_RETRIES;
  const n = raw ? Number.parseInt(raw, 10) : Number.NaN;
  return Number.isFinite(n) && n >= 0 ? n : DEFAULT_MAX_RETRIES;
}

export function shouldRetryError(err: unknown): boolean {
  return err instanceof ProviderError && err.retryable;
}

export function shouldRetryResult(result: AIProviderResult): boolean {
  if (result.success) return false;
  const msg = (result.error ?? '').toLowerCase();
  if (msg.includes('schema validation failed')) return false;
  if (msg.includes('authentication') || msg.includes('api key') || msg.includes('not set')) return false;
  return true;
}

export function getRetryDelayMs(err: unknown, attempt: number): number {
  if (err instanceof ProviderBusyError && err.retryAfter && err.retryAfter > 0) {
    return Math.min(err.retryAfter, MAX_RETRY_MS);
  }
  return Math.min(BASE_RETRY_MS * 2 ** (attempt - 1), MAX_RETRY_MS);
}

export async function runWithRetry<T>(opts: {
  run: () => Promise<T>;
  isRetryableResult: (value: T) => boolean;
  isRetryableError: (err: unknown) => boolean;
  maxRetries: number;
  onRetry?: (attempt: number, reason: string) => void;
}): Promise<{ value: T; retries: number }> {
  const { run, isRetryableResult, isRetryableError, maxRetries, onRetry } = opts;
  let retries = 0;

  for (;;) {
    let result: T;
    try {
      result = await run();
    } catch (err) {
      if (retries >= maxRetries || !isRetryableError(err)) throw err;
      retries++;
      const delay = getRetryDelayMs(err, retries);
      onRetry?.(retries, err instanceof Error ? err.message : String(err));
      await new Promise((resolve) => setTimeout(resolve, delay));
      continue;
    }

    if (!isRetryableResult(result) || retries >= maxRetries) {
      return { value: result, retries };
    }

    retries++;
    const delay = getRetryDelayMs(undefined, retries);
    onRetry?.(retries, (result as { error?: string }).error ?? 'unknown failure');
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
}
