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
      getSystemPrompt: vi.fn(() => 'Eleva system prompt'),
    },
    z: zod,
  };
});

import { POST } from './route';
import { createClient } from '@/utils/supabase/server';
import { AIProvider } from '@/lib/eleva-ai-provider';
import { stubSupabase, stubTable, type PostgrestStub } from '@/test/postgrest-stub';

const mockCreateClient = vi.mocked(createClient);
const mockGenerateObject = vi.mocked(AIProvider.generateObject);
const mockGenerate = vi.mocked(AIProvider.generate);

const URL = 'http://localhost:3000/eleva/api/tool/score';

function request(body: unknown | string) {
  return new NextRequest(URL, {
    method: 'POST',
    body: typeof body === 'string' ? body : JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

const RESUME = 'Built UIs with react and deployed on AWS';
const JD = 'Need react aws and kubernetes experts';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('tool/score route', () => {
  it('rejects an invalid body as 422 with flattened field errors', async () => {
    const res = await POST(request({ resume: 42, jobDescription: 'x', resumeId: 'nope' }));
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.code).toBe('INVALID_BODY');
    const flat = json.detail.fieldErrors as Record<string, string[]>;
    expect(flat.resumeId[0]).toMatch(/^Invalid uuid/);
    expect(flat.resume[0]).toMatch(/Expected string/);
  });

  it('malformed JSON body lands in the outer handler as 500 INTERNAL_ERROR', async () => {
    const res = await POST(request('{ not json'));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.code).toBe('INTERNAL_ERROR');
  });

  it('passes the AI object result through verbatim and touches no database', async () => {
    const object = {
      overall: 77, keyword: 70, formatting: 72, readability: 74,
      impact: 66, recruiter: 71, matched: ['react'], missing: ['aws'],
      suggestions: [{ type: 'warning', text: 't', action: 'a' }], summary: 's',
    };
    mockGenerateObject.mockResolvedValue(object as never);

    const res = await POST(request({ resume: RESUME, jobDescription: JD }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual(object);

    expect(mockGenerate).not.toHaveBeenCalled();
    expect(mockCreateClient).not.toHaveBeenCalled();
  });

  it('falls back to text generation and parses the embedded JSON object', async () => {
    const object = {
      overall: 66, keyword: 60, formatting: 70, readability: 75,
      impact: 60, recruiter: 67, matched: ['react'], missing: ['aws'],
      suggestions: [], summary: 'embedded',
    };
    mockGenerateObject.mockRejectedValue(new Error('provider down'));
    mockGenerate.mockResolvedValue({
      text: `Sure! {"overall":66,"keyword":60,"formatting":70,"readability":75,"impact":60,"recruiter":67,"matched":["react"],"missing":["aws"],"suggestions":[],"summary":"embedded"}`,
      model: 'm', finishReason: 'stop', usage: undefined, latency: 5,
    } as never);

    const res = await POST(request({ resume: RESUME, jobDescription: JD }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual(object);
  });

  it('a non-JSON text response drops to the deterministic local scorer', async () => {
    mockGenerateObject.mockRejectedValue(new Error('provider down'));
    mockGenerate.mockResolvedValue({ text: 'no braces here', model: 'm' } as never);

    const res = await POST(request({ resume: RESUME, jobDescription: JD }));
    expect(res.status).toBe(200);
    const json = await res.json();
    // matched: react, aws (both appear in the resume text, case-insensitively);
    // missing: kubernetes -> kw = round(2/3*100) = 67, overall = round(67*.6 + 75*.4) = 70
    expect(json).toEqual({
      overall: 70, keyword: 67, formatting: 70, readability: 75,
      impact: 67, recruiter: 71,
      matched: ['react', 'aws'], missing: ['kubernetes'],
      suggestions: [{ type: 'warning', text: '1 keywords missing', action: 'Add: kubernetes' }],
      summary: '2/3 keywords matched (70%)',
    });
  });

  it('a zero-keyword job description keeps the neutral 50% keyword baseline', async () => {
    mockGenerateObject.mockRejectedValue(new Error('provider down'));
    mockGenerate.mockResolvedValue({ text: 'nothing', model: 'm' } as never);

    const res = await POST(request({ resume: RESUME, jobDescription: 'no tech words at all' }));
    const json = await res.json();
    expect(json.keyword).toBe(50);
    expect(matchedAndMissing(json).concat()).toEqual([]);
    expect(json.summary).toBe('0/0 keywords matched (60%)');
  });

  it('without save the tool works anonymously and never touches supabase', async () => {
    mockGenerateObject.mockResolvedValue(scoreObject() as never);
    const supabase = stubSupabase(null, {});
    mockCreateClient.mockResolvedValue(supabase);

    const res = await POST(request({ resume: RESUME, jobDescription: JD, resumeId: '123e4567-e89b-12d3-a456-426614174000' }));
    expect(res.status).toBe(200);
    expect(mockCreateClient).not.toHaveBeenCalled();
    void supabase;
  });

  it('save=true with a session records the ats_scores row and the activity log', async () => {
    const object = scoreObject();
    mockGenerateObject.mockResolvedValue(object as never);
    const atsScores = stubTable({ data: null, error: null });
    const activity = stubTable({ data: null, error: null });
    mockCreateClient.mockResolvedValue(stubSupabase({ id: 'uid-1' }, { ats_scores: atsScores, activity_log: activity }));

    const resumeId = '123e4567-e89b-12d3-a456-426614174000';
    const jobId = '923e4567-e89b-12d3-a456-426614174000';
    const res = await POST(request({ resume: RESUME, jobDescription: JD, resumeId, jobId, save: true }));

    expect(res.status).toBe(200);
    const insertArg = atsScores.calls.insert[0][0] as Record<string, unknown>;
    expect(insertArg).toMatchObject({ user_id: 'uid-1', resume_id: resumeId, job_id: jobId, overall: object.overall, raw: object });
    expect(insertArg.suggestions).toEqual(object.suggestions);

    const logArg = activity.calls.insert[0][0] as Record<string, unknown>;
    expect(logArg).toMatchObject({ user_id: 'uid-1', kind: 'ats_scored', title: 'ATS score 77%', meta: { resumeId, jobId } });
  });

  it('save=true without a session records nothing and still answers', async () => {
    mockGenerateObject.mockResolvedValue(scoreObject() as never);
    mockCreateClient.mockResolvedValue(stubSupabase(null, {}));

    const res = await POST(request({ resume: RESUME, jobDescription: JD, resumeId: '123e4567-e89b-12d3-a456-426614174000', save: true }));
    expect(res.status).toBe(200);
    expect(mockCreateClient).toHaveBeenCalledTimes(1);
    // from() is only consulted when a uid exists; the stub fails fast on any table access.
  });

  it('a failing save is swallowed and the score still returns', async () => {
    const object = scoreObject();
    mockGenerateObject.mockResolvedValue(object as never);

    const failing = stubTable({ data: null, error: null });
    (failing as unknown as Record<string, unknown>).insert = vi.fn(() => { throw new Error('db down'); });
    mockCreateClient.mockResolvedValue(stubSupabase({ id: 'uid-1' }, { ats_scores: failing, activity_log: failing }));

    const warn = vi.spyOn(console, 'warn').mockImplementation(() => { });
    const res = await POST(request({ resume: RESUME, jobDescription: JD, resumeId: '123e4567-e89b-12d3-a456-426614174000', save: true }));
    warn.mockRestore();

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.overall).toBe(77);
  });
});

function scoreObject() {
  return {
    overall: 77, keyword: 70, formatting: 72, readability: 74,
    impact: 66, recruiter: 71, matched: ['react'], missing: ['aws'],
    suggestions: [], summary: 's',
  };
}

function matchedAndMissing(score: { matched: string[]; missing: string[] }) {
  return [...score.matched, ...score.missing];
}

void ({} as unknown as PostgrestStub); // keep the type import referenced for the stub helper's return typing
