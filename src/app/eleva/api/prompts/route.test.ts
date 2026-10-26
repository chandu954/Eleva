// @vitest-environment node
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(),
}));

import { GET, POST } from './route';
import { createClient } from '@/utils/supabase/server';
import { stubSupabase, stubTable } from '@/test/postgrest-stub';

const mockCreateClient = vi.mocked(createClient);

const BASE_URL = 'http://localhost:3000/eleva/api/prompts';

function getRequest(query?: string) {
  return new NextRequest(query ? `${BASE_URL}?${query}` : BASE_URL);
}

function postRequest(body: unknown | string) {
  return new NextRequest(BASE_URL, {
    method: 'POST',
    body: typeof body === 'string' ? body : JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('prompts route - GET', () => {
  it('by key single(): a miss answers 404 NOT_FOUND with the envelope', async () => {
    const aiPrompts = stubTable({ data: null, error: { message: 'row not found' } });
    mockCreateClient.mockResolvedValue(stubSupabase(null, { ai_prompts: aiPrompts }));

    const res = await GET(getRequest('key=missing-key'));
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.code).toBe('NOT_FOUND');
    expect(json.message).toBe('Prompt not found');
  });

  it('by key: filters is_active and key, and returns the single prompt', async () => {
    const prompt = { id: 'p1', key: 'k1', title: 'Prompt' };
    const aiPrompts = stubTable({ data: prompt, error: null });
    mockCreateClient.mockResolvedValue(stubSupabase(null, { ai_prompts: aiPrompts }));

    const res = await GET(getRequest('key=k1'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual(prompt);

    expect(aiPrompts.calls.eq).toEqual([['is_active', true], ['key', 'k1']]);
  });

  it('listing sorts builtin-first then newest and never touches the DB error path', async () => {
    const rows = [{ id: 'p1' }, { id: 'p2' }];
    const aiPrompts = stubTable({ data: rows, error: null });
    mockCreateClient.mockResolvedValue(stubSupabase(null, { ai_prompts: aiPrompts }));

    const res = await GET(getRequest());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual(rows);

    expect(aiPrompts.calls.order).toEqual([
      ['is_builtin', { ascending: false }],
      ['updated_at', { ascending: false }],
    ]);
  });

  it('a category filter swaps the ordering chain and embeds the category', async () => {
    const aiPrompts = stubTable({ data: [], error: null });
    mockCreateClient.mockResolvedValue(stubSupabase(null, { ai_prompts: aiPrompts }));

    const res = await GET(getRequest('category=engineering'));
    expect(res.status).toBe(200);

    expect(aiPrompts.calls.eq).toContainEqual(['is_active', true]);
    expect(aiPrompts.calls.eq).toContainEqual(['category.slug', 'engineering']);
    // the mutable PostgREST builder reuses the same chain: the unconditional
    // is_builtin+updated_at ordering runs first, then the category branch
    // re-orders by updated_at again
    expect(aiPrompts.calls.order).toEqual([
      ['is_builtin', { ascending: false }],
      ['updated_at', { ascending: false }],
      ['updated_at', { ascending: false }],
    ]);
    expect(aiPrompts.calls.select[0][0]).toBe('*, category:prompt_categories(*)');
  });

  it('a listing database failure answers 500 INTERNAL_ERROR with the message', async () => {
    const aiPrompts = stubTable({ data: null, error: { message: 'relation gone' } });
    mockCreateClient.mockResolvedValue(stubSupabase(null, { ai_prompts: aiPrompts }));

    const res = await GET(getRequest());
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.code).toBe('INTERNAL_ERROR');
    expect(json.message).toBe('relation gone');
  });
});

describe('prompts route - POST', () => {
  it('returns 401 UNAUTHENTICATED when no user', async () => {
    mockCreateClient.mockResolvedValue(stubSupabase(null, { ai_prompts: stubTable({ data: null, error: null }) }));

    const res = await POST(postRequest({ title: 't', system_prompt: 's' }));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.code).toBe('UNAUTHENTICATED');
  });

  it('derives the key from the slugified title when key is absent', async () => {
    const prompt = { id: 'p9', key: 'my-cool-prompt' };
    const aiPrompts = stubTable({ data: prompt, error: null });
    mockCreateClient.mockResolvedValue(stubSupabase({ id: 'uid-1' }, { ai_prompts: aiPrompts }));

    const res = await POST(postRequest({ title: 'My Cool  Prompt', system_prompt: 's' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual(prompt);

    const insertArg = aiPrompts.calls.insert[0][0] as Record<string, unknown>;
    expect(insertArg).toMatchObject({
      user_id: 'uid-1',
      key: 'my-cool-prompt',
      title: 'My Cool  Prompt',
      temperature: 0.7,
      max_tokens: 4096,
      variables: [],
      tags: [],
      is_builtin: false,
    });
  });

  it('an explicit key, temperature and max_tokens override the defaults', async () => {
    const aiPrompts = stubTable({ data: { id: 'p9' }, error: null });
    mockCreateClient.mockResolvedValue(stubSupabase({ id: 'uid-1' }, { ai_prompts: aiPrompts }));

    await POST(postRequest({
      key: 'explicit-key', title: 't', system_prompt: 's',
      temperature: 0.2, max_tokens: 256,
      variables: [{ name: 'x' }], tags: ['tag'], category_id: 'c1',
    }));

    const insertArg = aiPrompts.calls.insert[0][0] as Record<string, unknown>;
    expect(insertArg).toMatchObject({
      key: 'explicit-key',
      temperature: 0.2,
      max_tokens: 256,
      variables: [{ name: 'x' }],
      tags: ['tag'],
      category_id: 'c1',
    });
  });

  it('an insert failure answers 500 with the database message', async () => {
    const aiPrompts = stubTable({ data: null, error: { message: 'duplicate key' } });
    mockCreateClient.mockResolvedValue(stubSupabase({ id: 'uid-1' }, { ai_prompts: aiPrompts }));

    const res = await POST(postRequest({ title: 't', system_prompt: 's' }));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.code).toBe('INTERNAL_ERROR');
    expect(json.message).toBe('duplicate key');
  });

  it('a malformed body reaches the await and propagates (route has no outer catch)', async () => {
    mockCreateClient.mockResolvedValue(stubSupabase({ id: 'uid-1' }, {}));
    await expect(POST(postRequest('{ broken'))).rejects.toThrow();
  });
});
