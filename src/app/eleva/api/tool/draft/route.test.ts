// @vitest-environment node
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/eleva-ai-provider', async () => {
  const zod = await import('zod');
  return {
    AIProvider: {
      stream: vi.fn(),
      getSystemPrompt: vi.fn(() => 'Eleva system prompt'),
    },
    z: zod,
  };
});

import { POST } from './route';
import { AIProvider } from '@/lib/eleva-ai-provider';

const mockStream = vi.mocked(AIProvider.stream, true);

const URL = 'http://localhost:3000/eleva/api/tool/draft';

function request(body: unknown) {
  return new NextRequest(URL, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('tool/draft route', () => {
  it('rejects an invalid body as 422 with flattened field errors', async () => {
    const res = await POST(request({ company: '', role: 42, tone: 'snarky', length: 'tiny' }));
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.code).toBe('INVALID_BODY');
    const flat = json.detail.fieldErrors as Record<string, string[]>;
    expect(Object.keys(flat).sort()).toEqual(['length', 'role', 'tone']); // empty company is a valid z.string()
  });

  it('streams through the facade with length-derived word budget and token cap', async () => {
    const passthrough = { toTextStreamResponse: vi.fn().mockReturnValue(new Response('stream')) };
    mockStream.mockResolvedValue(passthrough as never);

    const res = await POST(request({ company: 'Acme', role: 'Engineer', length: 'short', tone: 'friendly' }));
    expect(res).toBe(passthrough.toTextStreamResponse.mock.results[0].value);

    expect(mockStream).toHaveBeenCalledTimes(1);
    const args = mockStream.mock.calls[0][0] as {
      system: string;
      prompt: string;
      temperature: number;
      maxTokens: number;
      config: Record<string, unknown>;
    };
    expect(args.temperature).toBe(0.7);
    expect(args.maxTokens).toBe(700); // short -> 700
    expect(args.config).toEqual({ plan: 'free', maxRetries: 3, timeout: 30000 });

    expect(args.prompt).toContain('Write a short cover letter with a friendly tone for Engineer at Acme.');
    expect(args.system).toContain('Target ~180 words');
    expect(args.system).toContain('Use a friendly tone and short length.');
    expect(args.system).toContain('Eleva system prompt');
  });

  it('medium defaults budget 280 words / 1000 tokens and omit the focus line', async () => {
    const passthrough = { toTextStreamResponse: vi.fn().mockReturnValue(new Response('m')) };
    mockStream.mockResolvedValue(passthrough as never);

    await POST(request({ company: 'A', role: 'R' }));
    const args = mockStream.mock.calls[0][0] as { system: string; prompt: string; maxTokens: number };
    expect(args.maxTokens).toBe(1000);
    expect(args.system).toContain('Target ~280 words');
    expect(args.system).not.toContain('Emphasize');
    // optional blocks absent from the user prompt
    expect(args.prompt).not.toContain('Weave in these achievements');
    expect(args.prompt).not.toContain('Target JD');
    expect(args.prompt).not.toContain('Candidate resume');
  });

  it('long budgets 420 words / 1400 tokens and includes the optional blocks with truncation', async () => {
    const passthrough = { toTextStreamResponse: vi.fn().mockReturnValue(new Response('l')) };
    mockStream.mockResolvedValue(passthrough as never);

    const longResume = 'r'.repeat(4096);
    const longJd = 'j'.repeat(4096);
    const res = await POST(request({
      company: 'A', role: 'R', length: 'long', tone: 'confident',
      focus: 'distributed systems', achievements: 'cut p99 by 40%',
      resume: longResume, jobDescription: longJd,
    }));
    expect(res).toBe(passthrough.toTextStreamResponse.mock.results[0].value);
    expect(passthrough.toTextStreamResponse).toHaveBeenCalledTimes(1);

    const args = mockStream.mock.calls[0][0] as { system: string; prompt: string; maxTokens: number };
    expect(args.maxTokens).toBe(1400);
    expect(args.system).toContain('Target ~420 words');
    expect(args.system).toContain('Emphasize distributed systems in the body.');
    expect(args.prompt).toContain('Weave in these achievements: cut p99 by 40%');
    expect(args.prompt).toContain(`Candidate resume:\n${'r'.repeat(3000)}`);
    expect(args.prompt).toContain(`Target JD:\n${'j'.repeat(3000)}`);
    expect(args.prompt).not.toContain('r'.repeat(3001));
  });

  it('a stream failure becomes 500 INTERNAL_ERROR with the provider message', async () => {
    mockStream.mockRejectedValue(new Error('no credits'));

    const res = await POST(request({ company: 'A', role: 'R' }));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.code).toBe('INTERNAL_ERROR');
    expect(json.message).toBe('no credits');
  });
});
