// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { stubSupabase, stubTable } from '@/test/postgrest-stub';

vi.mock('next/headers', () => ({
  headers: vi.fn(async () => new Headers()),
  cookies: vi.fn(async () => ({ getAll: () => [], set: vi.fn() })),
}));

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@react-pdf/renderer', () => ({
  renderToBuffer: vi.fn(),
  Document: 'Document',
  Page: 'Page',
  Text: 'Text',
  View: 'View',
  Link: 'Link',
  StyleSheet: { create: (styles: unknown) => styles },
}));

import { createClient } from '@/utils/supabase/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { POST } from './route';

const mockCreateClient = vi.mocked(createClient);
const mockRenderToBuffer = vi.mocked(renderToBuffer);

const URL = 'http://localhost:3000/eleva/api/export/resume';
const authed = { id: 'user-1' };

const fullResume = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  name: 'Ada Lovelace Resume',
  first_name: 'Ada',
  last_name: 'Lovelace',
  email: 'ada@example.com',
  phone_number: '+44 1234',
  location: 'London',
  linkedin_url: 'https://linkedin.com/in/ada',
  github_url: 'https://github.com/ada',
  website: 'https://ada.dev',
  target_role: 'Senior Engineer',
  professional_summary: 'Builds reliable systems.',
  work_experience: [
    {
      company: 'Acme',
      position: 'Engineer',
      date: '2024-2026',
      location: 'Remote',
      description: ['Shipped things'],
    },
  ],
  education: [
    { school: 'Oxford', degree: 'MSc', field: 'CS', date: '2020', gpa: '4.0' },
  ],
  skills: [{ category: 'Languages', items: ['TypeScript', 'Go'] }],
  projects: [
    { name: 'Eleva', description: ['Resume builder'], technologies: ['Next.js'], url: 'https://x.dev' },
  ],
  certifications: [{ name: 'AWS', issuer: 'Amazon', date: '2025' }],
};

function request(body: unknown, raw = false) {
  return new NextRequest(URL, {
    method: 'POST',
    body: raw ? (body as string) : JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

function installClient(
  user: { id: string } | null,
  tables: Record<string, ReturnType<typeof stubTable>>,
) {
  mockCreateClient.mockResolvedValue(stubSupabase(user, tables) as never);
}

describe('resume export route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateClient.mockReset();
    mockRenderToBuffer.mockReset();
    mockRenderToBuffer.mockResolvedValue(Buffer.from('%PDF-1.4 test') as never);
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('validation', () => {
    it('rejects a body without a resumeId as 422 INVALID_BODY', async () => {
      const res = await POST(request({}));

      expect(res.status).toBe(422);
      const json = (await res.json()) as {
        success: boolean;
        code: string;
        message: string;
        detail: { fieldErrors: Record<string, string[]> };
      };
      expect(json).toMatchObject({
        success: false,
        code: 'INVALID_BODY',
        message: 'Invalid request body',
      });
      expect(json.detail.fieldErrors.resumeId).toBeDefined();
      expect(mockCreateClient).not.toHaveBeenCalled();
    });

    it('rejects a non-uuid resumeId before creating a database client', async () => {
      const res = await POST(request({ resumeId: 'not-a-uuid' }));

      expect(res.status).toBe(422);
      const json = (await res.json()) as { code: string; detail: { fieldErrors: Record<string, string[]> } };
      expect(json.code).toBe('INVALID_BODY');
      expect(json.detail.fieldErrors.resumeId[0]).toMatch(/uuid/i);
      expect(mockCreateClient).not.toHaveBeenCalled();
    });

    it('turns malformed JSON into a 500 EXPORT_FAILED response', async () => {
      const res = await POST(request('{', true));

      expect(res.status).toBe(500);
      const json = (await res.json()) as { code: string };
      expect(json.code).toBe('EXPORT_FAILED');
      expect(mockCreateClient).not.toHaveBeenCalled();
    });
  });

  describe('auth and lookup', () => {
    it('returns 401 UNAUTHENTICATED without querying resumes', async () => {
      const from = vi.fn();
      mockCreateClient.mockResolvedValue({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
        from,
      } as never);

      const res = await POST(request({ resumeId: fullResume.id }));

      expect(res.status).toBe(401);
      const json = (await res.json()) as { code: string; message: string };
      expect(json.code).toBe('UNAUTHENTICATED');
      expect(json.message).toBe('Not authenticated');
      expect(from).not.toHaveBeenCalled();
      expect(mockRenderToBuffer).not.toHaveBeenCalled();
    });

    it('returns 404 when the resume does not belong to the caller', async () => {
      const resumes = stubTable({ data: null, error: null });
      installClient(authed, { resumes });

      const res = await POST(request({ resumeId: fullResume.id }));

      expect(res.status).toBe(404);
      const json = (await res.json()) as { code: string; message: string };
      expect(json.code).toBe('NOT_FOUND');
      expect(json.message).toBe('Resume not found');
      expect(resumes.calls.select).toEqual([['*']]);
      expect(resumes.calls.eq).toEqual([
        ['id', fullResume.id],
        ['user_id', 'user-1'],
      ]);
      expect(resumes.calls.maybeSingle).toHaveLength(1);
    });

    it('returns a generic 404 and logs database lookup errors', async () => {
      const resumes = stubTable({ data: null, error: { message: 'row-level security' } });
      installClient(authed, { resumes });

      const res = await POST(request({ resumeId: fullResume.id }));

      expect(res.status).toBe(404);
      const json = (await res.json()) as { code: string; message: string };
      expect(json.code).toBe('NOT_FOUND');
      expect(json.message).toBe('Resume not found');
      expect(JSON.stringify(json)).not.toContain('row-level security');
      expect(console.error).toHaveBeenCalled();
      expect(mockRenderToBuffer).not.toHaveBeenCalled();
    });
  });

  describe('successful export', () => {
    it('renders a PDF and streams it with attachment headers', async () => {
      const pdf = Buffer.from('%PDF-1.7 rendered');
      mockRenderToBuffer.mockResolvedValue(pdf as never);
      const resumes = stubTable({ data: fullResume, error: null });
      installClient(authed, { resumes });

      const res = await POST(request({ resumeId: fullResume.id }));

      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toBe('application/pdf');
      expect(res.headers.get('cache-control')).toBe('no-store');
      expect(res.headers.get('content-disposition')).toBe(
        'attachment; filename="Ada_Lovelace_Resume.pdf"',
      );
      await expect(res.arrayBuffer()).resolves.toEqual(
        pdf.buffer.slice(pdf.byteOffset, pdf.byteOffset + pdf.byteLength),
      );

      expect(mockRenderToBuffer).toHaveBeenCalledTimes(1);
      const document = mockRenderToBuffer.mock.calls[0][0] as unknown as {
        props: { title: string };
      };
      expect(document.props.title).toBe('Ada Lovelace Resume');
      expect(resumes.calls.eq).toEqual([
        ['id', fullResume.id],
        ['user_id', 'user-1'],
      ]);
    });

    it('sanitizes unsafe characters in the download filename', async () => {
      installClient(authed, {
        resumes: stubTable({ data: { ...fullResume, name: 'My Resume (2026)' }, error: null }),
      });

      const res = await POST(request({ resumeId: fullResume.id }));

      expect(res.status).toBe(200);
      expect(res.headers.get('content-disposition')).toBe(
        'attachment; filename="My_Resume_2026_.pdf"',
      );
    });

    it('falls back to resume.pdf when the stored name is empty', async () => {
      installClient(authed, {
        resumes: stubTable({ data: { ...fullResume, name: '' }, error: null }),
      });

      const res = await POST(request({ resumeId: fullResume.id }));

      expect(res.status).toBe(200);
      expect(res.headers.get('content-disposition')).toBe(
        'attachment; filename="resume.pdf"',
      );
    });

    it('renders a resume with only the required fields', async () => {
      installClient(authed, {
        resumes: stubTable({
          data: { id: fullResume.id, name: 'Minimal' },
          error: null,
        }),
      });

      const res = await POST(request({ resumeId: fullResume.id }));

      expect(res.status).toBe(200);
      expect(mockRenderToBuffer).toHaveBeenCalledTimes(1);
    });

    it('returns a sanitized 500 EXPORT_FAILED when the PDF renderer throws', async () => {
      mockRenderToBuffer.mockRejectedValue(new Error('font missing'));
      installClient(authed, {
        resumes: stubTable({ data: fullResume, error: null }),
      });

      const res = await POST(request({ resumeId: fullResume.id }));

      expect(res.status).toBe(500);
      const json = (await res.json()) as { code: string; message: string };
      expect(json.code).toBe('EXPORT_FAILED');
      expect(json.message).toBe('Failed to export resume');
      expect(JSON.stringify(json)).not.toContain('font missing');
    });
  });
});
