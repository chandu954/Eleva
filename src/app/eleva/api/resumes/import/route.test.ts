// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getSystemPrompt: vi.fn(() => 'system prompt'),
  generateObject: vi.fn(),
  generate: vi.fn(),
  createClient: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));
vi.mock('@/lib/eleva-ai-provider', () => ({ AIProvider: {
  getSystemPrompt: mocks.getSystemPrompt,
  generateObject: mocks.generateObject,
  generate: mocks.generate,
} }));
vi.mock('@/utils/supabase/server', () => ({ createClient: mocks.createClient }));
vi.mock('@/lib/logger', () => ({ logger: { warn: mocks.warn, error: mocks.error } }));

import { POST } from './route';

const resumeData = {
  first_name: 'Ada', last_name: 'Lovelace', email: null, phone_number: null,
  location: null, linkedin_url: null, github_url: null, website: null,
  target_role: 'Engineer', professional_summary: 'Mathematician',
  work_experience: [{ company: 'Engines', position: 'Programmer', description: ['Built software'] }],
  education: [], skills: [{ category: 'Languages', items: ['Ada'] }], projects: [], certifications: [],
};

function makeSupabase({ user = { id: 'user-1' }, insertError = null as null | { message: string }, notificationThrows = false }: { user?: { id: string } | null; insertError?: null | { message: string }; notificationThrows?: boolean } = {}) {
  const inserted = { id: 'resume-1', name: 'ada' };
  const tableCalls: string[] = [];
  const from = vi.fn((table: string) => {
    tableCalls.push(table);
    const query = {
      update: vi.fn(), eq: vi.fn(), insert: vi.fn(), select: vi.fn(),
      single: vi.fn(async () => ({ data: inserted, error: insertError })),
    };
    query.update.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.select.mockReturnValue(query);
    query.insert.mockImplementation(() => {
      if (table === 'notifications' && notificationThrows) throw new Error('notifications offline');
      return query;
    });
    return query;
  });
  return { client: { auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) }, from }, tableCalls };
}

function request(body: unknown) {
  return new Request('http://localhost/eleva/api/resumes/import', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  });
}

describe('resume import route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.generateObject.mockResolvedValue(resumeData);
  });

  it('validates the request before authentication', async () => {
    const response = await POST(request({ text: 'short' }) as never);
    expect(response.status).toBe(422);
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it('requires a session and inserts a base resume with activity and notification records', async () => {
    const unauthenticated = makeSupabase({ user: null });
    mocks.createClient.mockResolvedValue(unauthenticated.client);
    const rejected = await POST(request({ text: 'A'.repeat(60) }) as never);
    expect(rejected.status).toBe(401);

    const supabase = makeSupabase();
    mocks.createClient.mockResolvedValue(supabase.client);
    const response = await POST(request({
      text: 'A'.repeat(60), fileName: 'ada.resume.pdf', storagePath: 'user-1/ada.pdf', setAsBase: true,
    }) as never);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ resume: { id: 'resume-1', name: 'ada' } });
    expect(supabase.tableCalls).toEqual(['resumes', 'resumes', 'activity_log', 'notifications']);
    expect(mocks.generateObject).toHaveBeenCalledWith(expect.objectContaining({ prompt: expect.stringContaining('A'.repeat(60)) }));
  });

  it('falls back to JSON generation and strips markdown fences', async () => {
    mocks.generateObject.mockRejectedValueOnce(new Error('structured output unavailable'));
    mocks.generate.mockResolvedValueOnce({ text: `\`\`\`json\n${JSON.stringify(resumeData)}\n\`\`\`` });
    const supabase = makeSupabase();
    mocks.createClient.mockResolvedValue(supabase.client);

    const response = await POST(request({ text: 'B'.repeat(60), fileName: 'ada.pdf' }) as never);
    expect(response.status).toBe(200);
    expect(mocks.warn).toHaveBeenCalledWith('resume.import.generate_object_failed', expect.any(Object));
  });

  it('returns extraction errors for empty or invalid fallback JSON', async () => {
    mocks.generateObject.mockRejectedValueOnce(new Error('schema unsupported'));
    mocks.generate.mockResolvedValueOnce({ text: '   ' });
    mocks.createClient.mockResolvedValue(makeSupabase().client);
    const empty = await POST(request({ text: 'C'.repeat(60) }) as never);
    expect(empty.status).toBe(500);

    mocks.generateObject.mockRejectedValueOnce(new Error('schema unsupported'));
    mocks.generate.mockResolvedValueOnce({ text: '{bad json}' });
    const invalid = await POST(request({ text: 'D'.repeat(60) }) as never);
    expect(invalid.status).toBe(500);
  });

  it('returns database failures and tolerates best-effort notification errors', async () => {
    mocks.createClient.mockResolvedValue(makeSupabase({ insertError: { message: 'RLS rejected insert' } }).client);
    const failed = await POST(request({ text: 'E'.repeat(60) }) as never);
    expect(failed.status).toBe(500);

    mocks.createClient.mockResolvedValue(makeSupabase({ notificationThrows: true }).client);
    const success = await POST(request({ text: 'F'.repeat(60) }) as never);
    expect(success.status).toBe(200);
  });
});
