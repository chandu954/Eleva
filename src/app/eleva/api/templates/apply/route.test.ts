// @vitest-environment node
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(),
}));

import { POST } from './route';
import { createClient } from '@/utils/supabase/server';
import { stubSupabase, stubTable } from '@/test/postgrest-stub';

const mockCreateClient = vi.mocked(createClient);

const URL = 'http://localhost:3000/eleva/api/templates/apply';

function request(body: unknown | string) {
  return new NextRequest(URL, {
    method: 'POST',
    body: typeof body === 'string' ? body : JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

const RESUME_ID = '123e4567-e89b-12d3-a456-426614174000';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('templates/apply route', () => {
  it('returns 401 UNAUTHENTICATED before reading the body', async () => {
    mockCreateClient.mockResolvedValue(stubSupabase(null, { resumes: stubTable({ data: null, error: null }) }));

    const res = await POST(request('{ broken'));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json).toMatchObject({ success: false, code: 'UNAUTHENTICATED', message: 'Not authenticated' });
  });

  it('rejects a non-uuid resumeId as 422 INVALID_BODY with flattened field errors', async () => {
    mockCreateClient.mockResolvedValue(stubSupabase({ id: 'uid-1' }, {}));

    const res = await POST(request({ resumeId: 'not-a-uuid', templateId: 'linear' }));
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.code).toBe('INVALID_BODY');
    const flat = json.detail.fieldErrors as Record<string, string[]>;
    expect(flat.resumeId[0]).toMatch(/^Invalid uuid/);
  });

  it('applies the template through a scoped update and stamps updated_at', async () => {
    const resumes = stubTable({ data: null, error: null });
    const activity = stubTable({ data: null, error: null });
    mockCreateClient.mockResolvedValue(stubSupabase({ id: 'uid-1' }, { resumes, activity_log: activity }));

    const res = await POST(request({ resumeId: RESUME_ID, templateId: 'linear' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ ok: true });

    const updateArg = resumes.calls.update[0][0] as { document_settings: { template: string }; updated_at: string };
    expect(updateArg.document_settings).toEqual({ template: 'linear' });
    expect(typeof updateArg.updated_at).toBe('string');
    expect(resumes.calls.eq).toEqual([['id', RESUME_ID], ['user_id', 'uid-1']]);
  });

  it('an unknown resumeId still answers ok (no existence check) — faithful pin', async () => {
    // PostgREST update on a missing row returns error: null and data: null.
    const resumes = stubTable({ data: null, error: null });
    const activity = stubTable({ data: null, error: null });
    mockCreateClient.mockResolvedValue(stubSupabase({ id: 'uid-1' }, { resumes, activity_log: activity }));

    const res = await POST(request({ resumeId: RESUME_ID, templateId: 'no-such-template' }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it('a failing update answers 500 with the database message and skips the activity log', async () => {
    const resumes = stubTable({ data: null, error: { message: 'row level security blocked' } });
    mockCreateClient.mockResolvedValue(stubSupabase({ id: 'uid-1' }, { resumes }));

    const res = await POST(request({ resumeId: RESUME_ID, templateId: 'linear' }));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.code).toBe('INTERNAL_ERROR');
    expect(json.message).toBe('row level security blocked');
  });

  it('on success writes the template_applied activity entry with both ids in meta', async () => {
    const resumes = stubTable({ data: null, error: null });
    const activity = stubTable({ data: null, error: null });
    mockCreateClient.mockResolvedValue(stubSupabase({ id: 'uid-7' }, { resumes, activity_log: activity }));

    await POST(request({ resumeId: RESUME_ID, templateId: 'vercel' }));

    expect(activity.calls.insert[0][0]).toMatchObject({
      user_id: 'uid-7',
      kind: 'template_applied',
      title: 'Applied template: vercel',
      meta: { resumeId: RESUME_ID, templateId: 'vercel' },
    });
  });
});
