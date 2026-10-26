// @vitest-environment node
import { describe, expect, it } from 'vitest';

import {
  AuthenticationError,
  NetworkError,
  ProviderBusyError,
  ProviderError,
  ProviderInternalError,
  TimeoutError,
  normalizeError,
} from './errors';

describe('provider error taxonomy', () => {
  it('keeps existing ProviderError instances as-is (no re-wrapping)', () => {
    const original = new AuthenticationError('anthropic');
    expect(normalizeError('other', original)).toBe(original);
  });

  it('wraps plain Error as a tagged ProviderError, non-retryable by default', () => {
    const normalized = normalizeError('gemini', new Error('boom'));
    expect(normalized).toBeInstanceOf(ProviderError);
    expect(normalized.provider).toBe('gemini');
    expect(normalized.message).toBe('boom');
    expect(normalized.retryable).toBe(false);
    expect(normalized.statusCode).toBeUndefined();
  });

  it('normalizes non-Error throws (string payloads)', () => {
    const normalized = normalizeError('openai', 'raw failure');
    expect(normalized.message).toBe('raw failure');
    expect(normalized.provider).toBe('openai');
  });
});

describe('normalizeError — HTTP status-driven mapping', () => {
  it('maps statusCode 429 to ProviderBusyError (retryable)', () => {
    const err = Object.assign(new Error('too many requests'), { statusCode: 429 });
    const normalized = normalizeError('openrouter', err);
    expect(normalized).toBeInstanceOf(ProviderBusyError);
    expect(normalized.statusCode).toBe(429);
    expect(normalized.retryable).toBe(true);
    expect(normalized.message).toMatch(/busy or rate-limited/);
  });

  it('maps statusCode 401 and 403 to AuthenticationError', () => {
    const unauthorized = Object.assign(new Error('denied'), { statusCode: 401 });
    const forbidden = Object.assign(new Error('denied'), { statusCode: 403 });
    expect(normalizeError('anthropic', unauthorized)).toBeInstanceOf(AuthenticationError);
    expect(normalizeError('anthropic', forbidden)).toBeInstanceOf(AuthenticationError);
  });

  it('maps statusCode 5xx to ProviderInternalError (retryable)', () => {
    const internal = Object.assign(new Error('upstream exploded'), { statusCode: 503 });
    const normalized = normalizeError('gemini', internal);
    expect(normalized).toBeInstanceOf(ProviderInternalError);
    expect(normalized.statusCode).toBe(500);
    expect(normalized.retryable).toBe(true);
  });

  it('keeps unknown 4xx status codes on a non-retryable base ProviderError', () => {
    const unprocessable = Object.assign(new Error('bad input'), { statusCode: 422 });
    const normalized = normalizeError('openai', unprocessable);
    expect(normalized).toBeInstanceOf(ProviderError);
    expect(normalized.statusCode).toBe(422);
    expect(normalized.retryable).toBe(false);
  });
});

describe('normalizeError — message-driven mapping', () => {
  it('maps timeout messages to TimeoutError (retryable)', () => {
    const normalized = normalizeError('openai', new Error('Request timeout after 30000ms'));
    expect(normalized).toBeInstanceOf(TimeoutError);
    expect(normalized.retryable).toBe(true);
    expect(normalized.message).toMatch(/timed out/);
  });

  it('maps connection errors (ECONNREFUSED/ENOTFOUND) to NetworkError', () => {
    expect(normalizeError('ollama', new Error('connect ECONNREFUSED 127.0.0.1:11434'))).toBeInstanceOf(NetworkError);
    expect(normalizeError('openrouter', new Error('getaddrinfo ENOTFOUND openrouter.ai'))).toBeInstanceOf(NetworkError);
  });

  it('NetworkError is retryable', () => {
    const normalized = normalizeError('ollama', new Error('ECONNREFUSED nowhere'));
    expect(normalized.retryable).toBe(true);
  });
});

describe('retryability decisions', () => {
  it('TimeoutError carries the provider tag and constructed timeout', () => {
    const err = new TimeoutError('gemini', 45000);
    expect(err.provider).toBe('gemini');
    expect(err.message).toContain('45000');
  });

  it('ProviderBusyError optionally carries retryAfter', () => {
    const busy = new ProviderBusyError('openai', 12);
    expect(busy.statusCode).toBe(429);
    expect(busy.retryAfter).toBe(12);
  });
});
