// @vitest-environment node
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/eleva-ai-provider', async () => {
  const zod = await import('zod');
  return {
    AIProvider: {
      generateObject: vi.fn(),
      generate: vi.fn(),
    },
    z: zod,
  };
});

vi.mock('@/lib/api-response', () => ({
  apiError: (code: string, message: string, details?: unknown) => {
    return new Response(JSON.stringify({ error: code, message, details }), {
      status: code === 'UNAUTHORIZED' ? 401 : code === 'RATE_LIMITED' ? 429 : 400,
      headers: { 'content-type': 'application/json' },
    });
  },
}));

import { POST } from './route';
import { createClient } from '@/utils/supabase/server';

const mockCreateClient = vi.mocked(createClient);

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost:3000/eleva/api/studio/pipeline', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

describe('Pipeline route - validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
    } as any);
  });

  it('rejects missing jobDescription', async () => {
    const res = await POST(makeRequest({ resumeId: '123e4567-e89b-12d3-a456-426614174000' }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('INVALID_BODY');
  });

  it('rejects short jobDescription (< 20 chars)', async () => {
    const res = await POST(makeRequest({ jobDescription: 'too short' }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('INVALID_BODY');
  });

  it('rejects invalid resumeId format', async () => {
    const res = await POST(makeRequest({ jobDescription: 'a'.repeat(25), resumeId: 'not-a-uuid' }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('INVALID_BODY');
  });
});

  it('rejects body with wrong types', async () => {
    const res = await POST(makeRequest({ jobDescription: 123 }));
    expect(res.status).toBe(400);
  });
