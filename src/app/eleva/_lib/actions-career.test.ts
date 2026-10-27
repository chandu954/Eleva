import { beforeEach, describe, expect, it, vi } from 'vitest';
import { stubSupabase, stubTable } from '@/test/postgrest-stub';

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/utils/supabase/server', () => ({ createClient: vi.fn() }));

import { createClient } from '@/utils/supabase/server';
import {
  recalculateCompletion,
  saveAchievements,
  saveCertifications,
  saveEducation,
  saveExperience,
  saveLanguages,
  savePersonal,
  savePreferences,
  saveProjects,
  saveSkills,
  saveSummary,
} from './actions-career';

const mockCreateClient = vi.mocked(createClient);

function client(result: { data: unknown; error: unknown } = { data: null, error: null }) {
  return stubSupabase({ id: 'user-1' }, {
    profiles: stubTable(result),
  });
}

describe('career actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateClient.mockResolvedValue(client() as never);
  });

  it('saves personal info', async () => {
    await expect(savePersonal({ first_name: 'Ada', headline: 'Engineer' })).resolves.toEqual({ ok: true });
  });

  it('saves the summary', async () => {
    await expect(saveSummary('Builds things')).resolves.toEqual({ ok: true });
    await expect(saveSummary('')).resolves.toEqual({ ok: true });
  });

  it('saves experience and projects', async () => {
    await expect(saveExperience([
      { company: 'Acme', position: 'Engineer', description: ['Built'], achievements: [], technologies: [] },
    ])).resolves.toEqual({ ok: true });
    await expect(saveProjects([
      { name: 'Eleva', description: ['Resume builder'], technologies: ['Next.js'] },
    ])).resolves.toEqual({ ok: true });
  });

  it('saves skills and education', async () => {
    await expect(saveSkills([{ category: 'Languages', items: ['TypeScript'] }])).resolves.toEqual({ ok: true });
    await expect(saveEducation([{ school: 'Oxford', achievements: [] }])).resolves.toEqual({ ok: true });
  });

  it('saves certifications, achievements and languages', async () => {
    await expect(saveCertifications([{ name: 'AWS' }])).resolves.toEqual({ ok: true });
    await expect(saveAchievements([{ title: 'Award', type: 'award' }])).resolves.toEqual({ ok: true });
    await expect(saveLanguages([{ language: 'English', proficiency: 'native' }])).resolves.toEqual({ ok: true });
  });

  it('merges preferences with the existing record', async () => {
    mockCreateClient.mockResolvedValue(
      stubSupabase({ id: 'user-1' }, {
        profiles: [
          stubTable({ data: { preferences: { remote: true } }, error: null }),
          stubTable({ data: null, error: null }),
        ],
      }) as never,
    );

    await expect(savePreferences({ work_preference: 'remote' })).resolves.toEqual({ ok: true });
  });

  it('returns database errors and rejects unauthenticated calls', async () => {
    mockCreateClient.mockResolvedValue(client({ data: null, error: { message: 'boom' } }) as never);
    await expect(saveSummary('x')).resolves.toEqual({ error: 'boom' });

    mockCreateClient.mockResolvedValue(stubSupabase(null, {}) as never);
    await expect(saveSummary('x')).rejects.toThrow('unauthenticated');
  });

  it('recalculates profile completion', async () => {
    mockCreateClient.mockResolvedValue(
      stubSupabase({ id: 'user-1' }, {
        profiles: [
          stubTable({
            data: {
              first_name: 'Ada',
              headline: 'Engineer',
              professional_summary: 'Builds',
              work_experience: [{}],
              education: [{}],
              skills: [{}],
              projects: [{}],
              certifications: [{}],
              achievements: [{}],
              email: 'ada@example.com',
            },
            error: null,
          }),
          stubTable({ data: null, error: null }),
        ],
      }) as never,
    );

    await expect(recalculateCompletion()).resolves.toEqual({ completion: 100 });
  });

  it('handles missing profiles when recalculating', async () => {
    mockCreateClient.mockResolvedValue(
      stubSupabase({ id: 'user-1' }, {
        profiles: stubTable({ data: null, error: null }),
      }) as never,
    );

    await expect(recalculateCompletion()).resolves.toEqual({ error: 'no profile' });
  });
});
