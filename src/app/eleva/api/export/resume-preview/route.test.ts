// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import type { ReactElement } from 'react';
import { stubSupabase, stubTable } from '@/test/postgrest-stub';

const mocks = vi.hoisted(() => ({ createClient: vi.fn(), renderToBuffer: vi.fn() }));

vi.mock('@/utils/supabase/server', () => ({ createClient: mocks.createClient }));
vi.mock('@react-pdf/renderer', () => ({ renderToBuffer: mocks.renderToBuffer }));
vi.mock('@/components/resume/editor/preview/resume-pdf-document', () => ({
  ResumePDFDocument: ({ resume }: { resume: { name: string } }) => ({ type: 'ResumePDFDocument', props: { resume } }),
}));

import { POST } from './route';
import { ResumePDFDocument } from '@/components/resume/editor/preview/resume-pdf-document';

const resume = {
  id: '123e4567-e89b-12d3-a456-426614174000', user_id: 'user-1', name: 'Ada',
  first_name: 'Ada', last_name: 'Lovelace', email: 'ada@example.com',
  work_experience: [], education: [], skills: [], projects: [],
};

function request(body: unknown) {
  return new NextRequest('http://localhost:3000/eleva/api/export/resume-preview', {
    method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' },
  });
}

function installClient(user: { id: string } | null, owned = true) {
  const resumes = stubTable({ data: owned ? { id: resume.id } : null, error: null });
  mocks.createClient.mockResolvedValue(stubSupabase(user, { resumes }));
  return resumes;
}

describe('resume preview PDF route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.renderToBuffer.mockResolvedValue(Buffer.from('%PDF test'));
  });

  it('rejects a snapshot whose id or owner does not match the authenticated request', async () => {
    installClient({ id: 'user-1' });
    const res = await POST(request({ resumeId: resume.id, resume: { ...resume, user_id: 'user-2' } }));
    expect(res.status).toBe(422);
    expect(mocks.renderToBuffer).not.toHaveBeenCalled();
  });

  it('requires an authenticated owner before rendering the latest editor snapshot', async () => {
    installClient({ id: 'user-1' });
    const res = await POST(request({ resumeId: resume.id, resume: { ...resume, first_name: 'Augusta' } }));
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('application/pdf');
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(mocks.renderToBuffer).toHaveBeenCalledOnce();
    const document = mocks.renderToBuffer.mock.calls[0][0] as ReactElement<{ resume: Record<string, unknown> }>;
    expect(document.type).toBe(ResumePDFDocument);
    expect(document.props.resume).toMatchObject({ first_name: 'Augusta', work_experience: [], skills: [] });
  });

  it('rejects anonymous and non-owned resume requests without rendering', async () => {
    installClient(null);
    const anonymous = await POST(request({ resumeId: resume.id, resume }));
    expect(anonymous.status).toBe(401);

    installClient({ id: 'user-1' }, false);
    const missing = await POST(request({ resumeId: resume.id, resume }));
    expect(missing.status).toBe(404);
    expect(mocks.renderToBuffer).not.toHaveBeenCalled();
  });
});
