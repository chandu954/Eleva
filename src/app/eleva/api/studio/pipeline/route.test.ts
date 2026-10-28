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
      getSystemPrompt: vi.fn(() => 'system prompt'),
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
import { AIProvider } from '@/lib/eleva-ai-provider';
import { stubSupabase, stubTable } from '@/test/postgrest-stub';
import {
  clearPipelineCaches,
  getCachedExtract,
  setCachedExtract,
  setCachedScore,
} from './cache';

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
    } as unknown as Awaited<ReturnType<typeof createClient>>);
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

  it('rejects body with wrong types', async () => {
    const res = await POST(makeRequest({ jobDescription: 123 }));
    expect(res.status).toBe(400);
  });
});

/* ─── Extended coverage: auth, cache, SSE success and error branches ─── */

const JD =
  'We are hiring a Senior Backend Engineer to build TypeScript services with PostgreSQL, Docker and AWS.';

const RESUME_ID = '123e4567-e89b-12d3-a456-426614174000';

const extractFixture = {
  company: 'Acme',
  role: 'Senior Backend Engineer',
  required_skills: ['TypeScript', 'PostgreSQL'],
  nice_to_have: ['AWS'],
  summary: 'Build reliable backend services.',
};

const initialScoreFixture = {
  overall: 62,
  keyword: 55,
  formatting: 80,
  readability: 82,
  impact: 60,
  recruiter: 58,
  matched: ['TypeScript', 'PostgreSQL'],
  missing: ['Kubernetes', 'AWS'],
  suggestions: [{ type: 'warning' as const, text: 'Add cloud depth', action: 'Mention AWS projects' }],
  summary: 'Initial ATS estimate.',
};

const rescoreFixture = {
  ...initialScoreFixture,
  overall: 88,
  keyword: 85,
  matched: ['TypeScript', 'PostgreSQL', 'Docker'],
  missing: ['Kubernetes'],
  summary: 'Tailored ATS estimate.',
};

const planFixture = {
  compatibility: 55,
  rewriteSummary: true,
  rewriteExperience: true,
  rewriteProjects: true,
  rewriteSkills: true,
  sectionsToSkip: [],
  keywordsToInject: ['Kubernetes'],
  transferableSkills: [],
  hardTruthNote: null,
};

const summaryFixture = {
  professional_summary:
    'Backend engineer with eight years building TypeScript services and PostgreSQL platforms.',
};

const skillsFixture = {
  skills: [
    { category: 'Languages', skills: ['TypeScript', 'Go'] },
    { category: 'Cloud', skills: ['AWS'] },
  ],
};

const experienceFixture = {
  work_experience: [
    {
      company: 'Acme',
      position: 'Senior Engineer',
      location: 'Remote',
      start_date: '2020',
      end_date: 'Present',
      description: 'Built services',
      responsibilities: ['Built TypeScript services', 'Scaled PostgreSQL'],
    },
  ],
};

const projectsFixture = {
  projects: [
    {
      name: 'Eleva',
      description: ['Built the tailoring pipeline'],
      technologies: ['Next.js', 'TypeScript'],
      url: null,
    },
  ],
};

const qualityFixture = { passed: true, issues: [], score: 90 };

const reviewFixture = {
  wouldInterview: true,
  score: 88,
  strengths: ['Strong backend depth'],
  weaknesses: ['Limited Kubernetes exposure'],
  genericAreas: [],
  recommendation: 'Hire for a backend interview.',
  confidence: 80,
};

const letterFixture = {
  text: 'Dear Acme team,\n\nI build TypeScript systems at scale.\n\nBest,\nAda',
  model: 'test/model',
  latency: 1,
};

const resumeRow = {
  id: RESUME_ID,
  user_id: 'user-1',
  name: 'Base Resume',
  target_role: 'Backend Engineer',
  professional_summary: 'Old summary',
  work_experience: [{ company: 'Acme', position: 'Engineer', description: ['Old bullet'] }],
  skills: [{ category: 'Languages', skills: ['TypeScript'] }],
  projects: [{ name: 'Old project', description: ['Old'] }],
  education: [{ school: 'Oxford', degree: 'MSc' }],
  certifications: [{ name: 'AWS' }],
};

interface SupabaseSpy {
  from: ReturnType<typeof vi.fn>;
  auth: { getUser: ReturnType<typeof vi.fn> };
}

function installSupabase(
  user: { id: string } | null,
  tables: Record<string, ReturnType<typeof stubTable> | ReturnType<typeof stubTable>[]>,
): SupabaseSpy {
  const client = stubSupabase(user, tables) as unknown as SupabaseSpy;
  mockCreateClient.mockResolvedValue(client as never);
  return client;
}

interface SseEvent {
  event: string;
  data: Record<string, unknown>;
}

function parseSse(payload: string): SseEvent[] {
  return payload
    .split('\n\n')
    .filter(Boolean)
    .map((chunk) => {
      const lines = chunk.split('\n');
      const event = lines.find((line) => line.startsWith('event: '))?.slice(7) ?? '';
      const data = lines.find((line) => line.startsWith('data: '))?.slice(6) ?? '{}';
      return { event, data: JSON.parse(data) as Record<string, unknown> };
    });
}

function schemaShape(schema: unknown): Record<string, unknown> {
  return ((schema as { shape?: Record<string, unknown> }).shape ?? {});
}

function respondToSchema(params: { schema: unknown; prompt?: string }): never {
  const shape = schemaShape(params.schema);
  if ('wouldInterview' in shape) return reviewFixture as never;
  if ('matched' in shape) {
    return (params.prompt?.startsWith('Rewritten Resume:')
      ? rescoreFixture
      : initialScoreFixture) as never;
  }
  if ('required_skills' in shape) return extractFixture as never;
  if ('compatibility' in shape) return planFixture as never;
  if ('professional_summary' in shape) return summaryFixture as never;
  if ('work_experience' in shape) return experienceFixture as never;
  if ('projects' in shape) return projectsFixture as never;
  if ('skills' in shape) return skillsFixture as never;
  if ('passed' in shape) return qualityFixture as never;
  throw new Error('unexpected pipeline schema');
}

function requestPrompts(): string[] {
  return vi
    .mocked(AIProvider.generateObject)
    .mock.calls.map(([params]) => (params as { prompt?: string }).prompt ?? '');
}

function resumePersistenceTables(row: Record<string, unknown> | null) {
  const select = stubTable({ data: row, error: null });
  const insert = stubTable({ data: null, error: null });
  const atsScores = stubTable({ data: null, error: null });
  const coverLetters = stubTable({ data: { id: 'cl-1' }, error: null });
  const activity = stubTable({ data: null, error: null });
  const notifications = stubTable({ data: null, error: null });
  return {
    select,
    insert,
    atsScores,
    coverLetters,
    activity,
    notifications,
    tables: {
      resumes: [select, insert],
      ats_scores: atsScores,
      cover_letters: coverLetters,
      activity_log: activity,
      notifications,
    },
  };
}

describe('Pipeline route - authenticated and streaming pipeline', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await clearPipelineCaches();
    vi.mocked(AIProvider.generateObject).mockReset();
    vi.mocked(AIProvider.generate).mockReset();
    vi.mocked(AIProvider.generateObject).mockImplementation(async (params) =>
      respondToSchema(params as { schema: unknown; prompt?: string }),
    );
    vi.mocked(AIProvider.generate).mockResolvedValue(letterFixture as never);
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('runs an unauthenticated pipeline and streams every step to completion', async () => {
    const jdCache = stubTable({ data: null, error: null });
    const client = installSupabase(null, { jd_extract_cache: jdCache });

    const res = await POST(makeRequest({ jobDescription: JD }));

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('text/event-stream; charset=utf-8');
    expect(res.headers.get('cache-control')).toBe('no-cache, no-transform');
    expect(res.headers.get('x-accel-buffering')).toBe('no');

    const events = parseSse(await res.text());
    const stepNames = events
      .filter((event) => event.event === 'step')
      .map((event) => event.data.step);
    expect(stepNames).toEqual(expect.arrayContaining([
      'extract', 'score', 'plan', 'tailor', 'rescore', 'review', 'letter',
    ]));

    const done = events.find((event) => event.event === 'done');
    expect(done?.data).toMatchObject({
      overall: 88,
      previousOverall: 62,
      company: 'Acme',
      role: 'Senior Backend Engineer',
      keywordsAdded: 3,
      bulletsRewritten: 2,
      compatibility: 0,
      isLowCompat: true,
      sectionsModified: 4,
      optimizationStatus: 'Tailored Resume Ready',
      resumeId: null,
      coverLetterId: null,
      letterBody: letterFixture.text,
      plan: {
        rewriteSummary: true,
        rewriteExperience: true,
        rewriteProjects: true,
        rewriteSkills: true,
        keywordsToInject: 1,
        hardTruthNote: null,
      },
      review: {
        wouldInterview: true,
        score: 88,
        recommendation: 'Hire for a backend interview.',
      },
      quality: { passed: true, issues: [], score: 90 },
    });
    expect(events.some((event) => event.event === 'error')).toBe(false);

    // No user means no resume lookup; only the shared JD cache is touched
    // (read once, upsert once).
    expect(client.from.mock.calls).toEqual([
      ['jd_extract_cache'],
      ['jd_extract_cache'],
    ]);
    expect(requestPrompts()[0]).toBe(`Job Description:\n${JD}`);
    expect(jdCache.calls.upsert).toHaveLength(1);
    expect(vi.mocked(AIProvider.generate)).toHaveBeenCalledTimes(1);
  });

  it('uses the Redis JD cache and skips both the AI extractor and the database', async () => {
    await setCachedExtract(JD, extractFixture);
    const client = installSupabase(null, {});

    const res = await POST(makeRequest({ jobDescription: JD }));
    const events = parseSse(await res.text());

    expect(client.from).not.toHaveBeenCalled();
    expect(requestPrompts().some((prompt) => prompt.startsWith('Job Description:'))).toBe(false);

    const extractDone = events.filter(
      (event) => event.event === 'step' && event.data.step === 'extract' && event.data.status === 'done',
    );
    expect(extractDone[0].data).toMatchObject({ cached: true, data: extractFixture });
    expect(events.find((event) => event.event === 'done')?.data).toMatchObject({
      company: 'Acme',
      overall: 88,
    });
  });

  it('uses the shared database JD cache when Redis misses', async () => {
    const jdCache = stubTable({
      data: { payload: extractFixture, created_at: new Date().toISOString() },
      error: null,
    });
    installSupabase(null, { jd_extract_cache: jdCache });

    const res = await POST(makeRequest({ jobDescription: JD }));
    const events = parseSse(await res.text());

    expect(jdCache.calls.select[0][0]).toBe('payload,created_at');
    expect(jdCache.calls.gte[0]).toEqual(['created_at', expect.any(String)]);
    expect(jdCache.calls.maybeSingle).toHaveLength(1);
    expect(requestPrompts().some((prompt) => prompt.startsWith('Job Description:'))).toBe(false);
    expect(
      events.find(
        (event) => event.event === 'step' && event.data.step === 'extract' && event.data.cached === true,
      )?.data,
    ).toMatchObject({ data: extractFixture });
  });

  it('serves the initial score from Redis', async () => {
    await setCachedExtract(JD, extractFixture);
    await setCachedScore('', JD, initialScoreFixture);
    installSupabase(null, {});

    const res = await POST(makeRequest({ jobDescription: JD }));
    const events = parseSse(await res.text());

    expect(requestPrompts().some((prompt) => prompt.startsWith('Resume:'))).toBe(false);
    expect(events.find((event) => event.event === 'done')?.data).toMatchObject({
      previousOverall: 62,
      overall: 88,
    });
    await expect(getCachedExtract(JD)).resolves.toEqual(extractFixture);
  });

  it('scopes an explicit resume lookup to the caller and persists pipeline results', async () => {
    await setCachedExtract(JD, extractFixture);
    const persistence = resumePersistenceTables(resumeRow);
    installSupabase({ id: 'user-1' }, persistence.tables);

    const res = await POST(makeRequest({ jobDescription: JD, resumeId: RESUME_ID }));
    const events = parseSse(await res.text());

    expect(persistence.select.calls.eq).toEqual([
      ['id', RESUME_ID],
      ['user_id', 'user-1'],
    ]);
    expect(persistence.select.calls.maybeSingle).toHaveLength(1);

    const done = events.find((event) => event.event === 'done');
    expect(done?.data).toMatchObject({
      resumeId: RESUME_ID,
      coverLetterId: 'cl-1',
      previousOverall: 62,
      overall: 88,
    });

    expect(persistence.atsScores.calls.insert[0][0]).toMatchObject({
      user_id: 'user-1',
      resume_id: RESUME_ID,
      overall: 88,
      keyword: 85,
      raw: rescoreFixture,
    });
    expect(persistence.insert.calls.insert[0][0]).toMatchObject({
      user_id: 'user-1',
      name: 'Base Resume',
      target_role: 'Backend Engineer',
      is_base_resume: false,
      professional_summary: summaryFixture.professional_summary,
      skills: skillsFixture.skills,
    });
    expect(persistence.coverLetters.calls.insert[0][0]).toMatchObject({
      user_id: 'user-1',
      resume_id: RESUME_ID,
      company: 'Acme',
      role: 'Senior Backend Engineer',
      body: letterFixture.text,
    });
    expect(persistence.activity.calls.insert[0][0]).toMatchObject({
      user_id: 'user-1',
      kind: 'pipeline_run',
      title: 'Resume tailored for Senior Backend Engineer',
      subtitle: 'Acme',
    });
    expect(persistence.notifications.calls.insert[0][0]).toMatchObject({
      user_id: 'user-1',
      kind: 'pipeline_complete',
      title: 'Pipeline complete · 62% → 88%',
    });
  });

  it('loads the base resume when no resumeId is supplied', async () => {
    await setCachedExtract(JD, extractFixture);
    const persistence = resumePersistenceTables(resumeRow);
    installSupabase({ id: 'user-1' }, persistence.tables);

    const res = await POST(makeRequest({ jobDescription: JD }));
    const events = parseSse(await res.text());

    expect(persistence.select.calls.eq).toEqual([
      ['user_id', 'user-1'],
      ['is_base_resume', true],
    ]);
    expect(persistence.select.calls.limit).toEqual([[1]]);
    expect(events.find((event) => event.event === 'done')?.data).toMatchObject({
      resumeId: RESUME_ID,
    });
  });

  it('skips score and resume persistence when the caller has no resume', async () => {
    await setCachedExtract(JD, extractFixture);
    const select = stubTable({ data: null, error: null });
    const coverLetters = stubTable({ data: { id: 'cl-2' }, error: null });
    const activity = stubTable({ data: null, error: null });
    const notifications = stubTable({ data: null, error: null });
    installSupabase({ id: 'user-1' }, {
      resumes: select,
      cover_letters: coverLetters,
      activity_log: activity,
      notifications,
    });

    const res = await POST(makeRequest({ jobDescription: JD }));
    const events = parseSse(await res.text());

    expect(select.calls.maybeSingle).toHaveLength(1);
    expect(events.find((event) => event.event === 'done')?.data).toMatchObject({
      resumeId: null,
      coverLetterId: 'cl-2',
    });
    expect(coverLetters.calls.insert[0][0]).toMatchObject({ resume_id: undefined });
  });

  it('falls back to a template cover letter when the provider rate-limits', async () => {
    await setCachedExtract(JD, extractFixture);
    installSupabase(null, {});
    vi.mocked(AIProvider.generate).mockRejectedValue(
      Object.assign(new Error('Too many requests'), { statusCode: 429 }),
    );

    const res = await POST(makeRequest({ jobDescription: JD }));
    const events = parseSse(await res.text());

    expect(events.some((event) => event.event === 'error')).toBe(false);
    const letterChunk = events.find((event) => event.event === 'letter-chunk');
    expect(String(letterChunk?.data.text)).toContain('Dear Hiring Manager');
    const done = events.find((event) => event.event === 'done');
    expect(String(done?.data.letterBody)).toContain('Dear Hiring Manager');
    expect(vi.mocked(AIProvider.generate)).toHaveBeenCalledTimes(1);
  });

  it('streams a classified error event when the cover-letter provider fails', async () => {
    await setCachedExtract(JD, extractFixture);
    installSupabase(null, {});
    vi.mocked(AIProvider.generate).mockRejectedValue(
      new Error('upstream provider exploded'),
    );

    const res = await POST(makeRequest({ jobDescription: JD }));
    const events = parseSse(await res.text());

    const errorEvent = events.find((event) => event.event === 'error');
    expect(errorEvent?.data).toMatchObject({
      message: 'upstream provider exploded',
      reason: 'provider',
      step: 'letter',
      provider: 'openrouter',
      statusCode: 0,
    });
    expect(typeof errorEvent?.data.traceId).toBe('string');
    expect(events.some((event) => event.event === 'done')).toBe(false);
  });

  it('uses the local extraction fallback when the AI extractor fails', async () => {
    const jdCache = stubTable({ data: null, error: null });
    installSupabase(null, { jd_extract_cache: jdCache });
    let extractAttempts = 0;
    vi.mocked(AIProvider.generateObject).mockImplementation(async (params) => {
      const shape = schemaShape((params as { schema: unknown }).schema);
      if ('required_skills' in shape && extractAttempts++ === 0) {
        throw new Error('extract provider down');
      }
      return respondToSchema(params as { schema: unknown; prompt?: string });
    });

    const localJd = 'Acme is hiring a Senior Backend Engineer to build TypeScript services with PostgreSQL.';
    const res = await POST(makeRequest({ jobDescription: localJd }));
    const events = parseSse(await res.text());

    expect(events.some((event) => event.event === 'error')).toBe(false);
    const extractDone = events.filter(
      (event) => event.event === 'step' && event.data.step === 'extract' && event.data.status === 'done',
    );
    expect(extractDone[0].data).toMatchObject({
      data: expect.objectContaining({ company: 'Acme', role: 'Senior Backend Engineer' }),
    });
    expect(events.find((event) => event.event === 'done')).toBeDefined();
    // One text fallback for extraction, one direct letter generation.
    expect(vi.mocked(AIProvider.generate)).toHaveBeenCalledTimes(2);
  });
});
