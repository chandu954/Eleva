// @vitest-environment node
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(),
}));

import { GET } from './route';
import { createClient } from '@/utils/supabase/server';
import { stubSupabase, stubTable, type PostgrestStub } from '@/test/postgrest-stub';
import { TEMPLATES } from '@/app/eleva/_lib/templates-catalog';

const mockCreateClient = vi.mocked(createClient);

function get(query: string) {
  return new NextRequest(`http://localhost:3000/eleva/api/search?${query}`);
}

function groupedTable(rows: unknown, error: unknown = null): PostgrestStub {
  return stubTable({ data: rows, error });
}

/** Fetch helper around the handler's response shape. */
async function resultsOf(res: Response) {
  const json = await res.json() as { results: Record<string, unknown[]> };
  return json.results;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('search route guard rails', () => {
  it('an empty or whitespace-only query answers the empty shape without touching the database', async () => {
    mockCreateClient.mockResolvedValue(stubSupabase({ id: 'uid-1' }, {}));

    for (const q of ['', '%20'.replace('%20', ' ')]) {
      const res = await GET(get(`q=${encodeURIComponent(q)}`));
      expect(res.status).toBe(200);
      expect(await resultsOf(res)).toEqual({
        resumes: [], applications: [], cover_letters: [], ats_scores: [], templates: [],
      });
    }

    // also: a missing q param entirely
    const res = await GET(get(''));
    expect(await resultsOf(res)).toEqual({
      resumes: [], applications: [], cover_letters: [], ats_scores: [], templates: [],
    });

    expect(mockCreateClient).not.toHaveBeenCalled();
  });

  it('a signed-out visitor gets the empty shape (auth is read, tables are not)', async () => {
    mockCreateClient.mockResolvedValue(stubSupabase(null, {}));

    const res = await GET(get('q=react'));
    expect(res.status).toBe(200);
    expect(await resultsOf(res)).toEqual({
      resumes: [], applications: [], cover_letters: [], ats_scores: [], templates: [],
    });
    expect(mockCreateClient).toHaveBeenCalledTimes(1);
  });
});

describe('search route grouped queries', () => {
  it('runs the four Promise.all groups scoped to the caller with ilike-derived filters', async () => {
    const resumes = groupedTable([{ id: 'r1', name: 'Backend' }]);
    const applications = groupedTable([]);
    const coverLetters = groupedTable([]);
    const atsScores = groupedTable([]);
    mockCreateClient.mockResolvedValue(
      stubSupabase({ id: 'uid-9' }, { resumes, applications, cover_letters: coverLetters, ats_scores: atsScores }),
    );

    const res = await GET(get('q=backend eng'));
    expect(res.status).toBe(200);
    const json = await resultsOf(res);
    expect(json.resumes).toEqual([{ id: 'r1', name: 'Backend' }]);

    const like = '%backend eng%';
    expect(resumes.calls.select[0][0]).toBe('id, name, target_role, updated_at');
    expect(resumes.calls.eq).toEqual([['user_id', 'uid-9']]);
    expect(resumes.calls.or).toEqual([['name.ilike.%backend eng%,target_role.ilike.%backend eng%']]);
    expect(applications.calls.or).toEqual([['company.ilike.%backend eng%,role.ilike.%backend eng%']]);
    expect(coverLetters.calls.or).toEqual([['company.ilike.%backend eng%,role.ilike.%backend eng%']]);
    expect(atsScores.calls.ilike).toEqual([['raw->>summary', like]]);
    for (const table of [resumes, applications, coverLetters, atsScores]) {
      expect(table.calls.limit).toEqual([[6]]);
    }
  });

  it('a group error is swallowed into an empty list for that group (faithful ?? [] pin)', async () => {
    const resumes = groupedTable(null, { message: 'relation missing' });
    const applications = groupedTable([{ id: 'a1' }]);
    const coverLetters = groupedTable([]);
    const atsScores = groupedTable([]);
    mockCreateClient.mockResolvedValue(
      stubSupabase({ id: 'uid-1' }, { resumes, applications, cover_letters: coverLetters, ats_scores: atsScores }),
    );

    const res = await GET(get('q=x'));
    expect(res.status).toBe(200);
    const json = await resultsOf(res);
    expect(json.resumes).toEqual([]);
    expect(json.applications).toEqual([{ id: 'a1' }]);
  });
});

describe('search route template matching', () => {
  it('matches lowercase name, category and description against the real catalog and caps at 6', async () => {
    const tables = {
      resumes: groupedTable([]), applications: groupedTable([]),
      cover_letters: groupedTable([]), ats_scores: groupedTable([]),
    };
    mockCreateClient.mockResolvedValue(stubSupabase({ id: 'uid-1' }, tables));

    // 'ATS' hits 'ATS Safe' by name and both category:'ats' templates
    const ats = await resultsOf(await GET(get('q=ats')));
    expect(ats.templates).toEqual(TEMPLATES.filter((t) => ['ats-safe', 'compact'].includes(t.id)));

    // description hit: 'hackers' is only in the Monospace description
    const mono = await resultsOf(await GET(get('q=hackers')));
    expect(mono.templates.map((t) => (t as { id: string }).id)).toEqual(['monospace']);

    // category hit: 'timeline' matches the Timeline name AND a category match exists
    const timeline = await resultsOf(await GET(get('q=timeline')));
    expect(timeline.templates.map((t) => (t as { id: string }).id)).toEqual(['timeline']);

    // >6 matches cap at 6: every template description contains the letter 'e'
    const everything = await resultsOf(await GET(get('q=e')));
    expect(everything.templates).toHaveLength(6);
  });

  it('no template matches keeps the array empty while the other groups stay populated', async () => {
    const resumes = groupedTable([{ id: 'r1' }]);
    const tables = {
      resumes, applications: groupedTable([]),
      cover_letters: groupedTable([]), ats_scores: groupedTable([]),
    };
    mockCreateClient.mockResolvedValue(stubSupabase({ id: 'uid-1' }, tables));

    const json = await resultsOf(await GET(get('q=zzznomatch')));
    expect(json.templates).toEqual([]);
    expect(json.resumes).toEqual([{ id: 'r1' }]);
  });
});
