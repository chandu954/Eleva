// @vitest-environment node
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/eleva-ai-provider', () => ({
  AIProvider: {
    generate: vi.fn(),
  },
}));

import { POST } from './route';
import { AIProvider } from '@/lib/eleva-ai-provider';

const mockGenerate = vi.mocked(AIProvider.generate);

const URL = 'http://localhost:3000/eleva/api/tool/rewrite';

function request(body: unknown | string) {
  return new NextRequest(URL, {
    method: 'POST',
    body: typeof body === 'string' ? body : JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

function textResult(text: string, overrides: Record<string, unknown> = {}) {
  return { text, model: 'm1', finishReason: 'stop', usage: undefined, latency: 3, ...overrides } as never;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('tool/rewrite route', () => {
  it('returns 400 with a missing-field pointer when bullet is absent', async () => {
    const res = await POST(request({ role: 'Engineer' }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json).toMatchObject({ success: false, missingField: 'bullet' });
    expect(json.error).toBe('Bullet text is required before rewriting.');
    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it('rejects a whitespace-only bullet the same way', async () => {
    const res = await POST(request({ bullet: '   \n\t ' }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.missingField).toBe('bullet');
  });

  it('trims the original and returns the first successful rewrite with attempt metadata', async () => {
    mockGenerate.mockResolvedValueOnce(textResult('  Rewritten bullet  '));

    const res = await POST(request({ bullet: '  Did things  ', role: 'Engineer', mode: 'shorter' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.original).toBe('Did things');
    expect(json.rewritten).toBe('Rewritten bullet');
    expect(json.attempts).toHaveLength(1);
    expect(json.attempts[0]).toMatchObject({ attempt: 1, model: 'm1', status: 'success', finishReason: 'stop' });
    expect(Number.isInteger(json.attempts[0].latencyMs)).toBe(true);
  });

  it('stops after the first success and never consults the retry configs', async () => {
    mockGenerate.mockResolvedValueOnce(textResult('good one'));

    await POST(request({ bullet: 'x' }));
    expect(mockGenerate).toHaveBeenCalledTimes(1);
    const firstCall = mockGenerate.mock.calls[0][0] as { config: Record<string, unknown>; maxTokens: number; temperature: number };
    expect(firstCall.config).toEqual({ plan: 'free', maxRetries: 2, timeout: 20000 });
    expect(firstCall.maxTokens).toBe(320);
    expect(firstCall.temperature).toBe(0.6);
  });

  it('an empty first answer retries with the second config and an empty-attempt record', async () => {
    mockGenerate
      .mockResolvedValueOnce(textResult('   ', { model: 'm1' }))
      .mockResolvedValueOnce(textResult('second try', { model: 'm2' }));

    const res = await POST(request({ bullet: 'x' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.rewritten).toBe('second try');
    expect(json.attempts.map((a: { attempt: number; status: string; model: string }) => `${a.attempt}:${a.status}:${a.model}`))
      .toEqual(['1:empty:m1', '2:success:m2']);

    expect(mockGenerate).toHaveBeenCalledTimes(2);
    const secondCall = mockGenerate.mock.calls[1][0] as { config: Record<string, unknown> };
    expect(secondCall.config).toEqual({ plan: 'free', maxRetries: 1, timeout: 20000 });
  });

  it('both empty answers fall back to the safe local rewrite', async () => {
    mockGenerate
      .mockResolvedValueOnce(textResult(''))
      .mockResolvedValueOnce(textResult(''));

    const res = await POST(request({ bullet: 'reduced latency by caching queries' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.rewritten.endsWith('.')).toBe(true); // local rewrite normalizes to a sentence
    expect(json.attempts.at(-1)).toMatchObject({ model: 'local-fallback', status: 'fallback', latencyMs: 0 });
    expect(json.attempts.filter((a: { status: string }) => a.status === 'empty')).toHaveLength(2);
  });

  it('both attempts erroring still recovers through the local fallback', async () => {
    mockGenerate
      .mockRejectedValueOnce(new Error('timeout 1'))
      .mockRejectedValueOnce(new Error('timeout 2'));

    const res = await POST(request({ bullet: 'codegen features' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    const statuses = json.attempts.map((a: { status: string }) => a.status);
    expect(statuses).toEqual(['error', 'error', 'fallback']);
    expect(json.attempts[0].model).toBe('unknown');
    expect(json.attempts[0].error).toBe('timeout 1');
  });

  it('a malformed body is caught by the outer handler as 500', async () => {
    const res = await POST(request('{ not json'));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(typeof json.error).toBe('string');
  });
});
