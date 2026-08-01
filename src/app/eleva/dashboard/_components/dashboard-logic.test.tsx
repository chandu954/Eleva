import { describe, expect, it } from 'vitest';
import { buildPriorities } from './priority-cards';
import { flattenSkills, computeProfileCompletion, getOffers, getResponseRate } from './types';
import type { DashboardMetrics } from '../../_lib/data';

const baseMetrics: DashboardMetrics = {
  resumes: 1,
  applications: 0,
  avgAts: 72,
  coverLetters: 0,
  interviews: 0,
  atsTrend: [65, 68, 70, 72],
  applicationsTrend: [0, 0, 0, 0],
  resumeGrowth: [1, 1, 1, 1],
  weeklyProductivity: [2, 3, 1, 4],
  atsDelta: 7,
  applicationsByStatus: {},
};

describe('buildPriorities', () => {
  it('suggests creating a resume when none exist', () => {
    const p = buildPriorities({ ...baseMetrics, resumes: 0 }, null, { pct: 0, missing: [] });
    expect(p[0].title).toBe('Create your first resume');
    expect(p[0].href).toBe('/eleva/editor');
  });

  it('suggests an ATS check when resumes exist but no report', () => {
    const p = buildPriorities(baseMetrics, null, { pct: 100, missing: [] });
    expect(p[0].title).toBe('Run your first ATS check');
  });

  it('uses real ATS numbers without fabricated predictions', () => {
    const p = buildPriorities(baseMetrics, { id: '1', overall: 72, keyword: 64, formatting: 100, resume_id: 'r', created_at: '' }, { pct: 100, missing: [] });
    const ats = p.find((x) => x.title === 'Improve ATS match');
    expect(ats).toBeDefined();
    expect(ats?.description).toContain('Score 72/100');
    expect(ats?.description).toContain('Keyword match 64%');
    expect(ats?.description).not.toMatch(/potential|can reach/i);
  });

  it('suggests completing the profile from real completion data', () => {
    const p = buildPriorities(baseMetrics, { id: '1', overall: 72, keyword: 64, formatting: 100, resume_id: 'r', created_at: '' }, { pct: 75, missing: ['Skills'] });
    const profile = p.find((x) => x.title === 'Complete career profile');
    expect(profile).toBeDefined();
    expect(profile?.description).toContain('75% complete');
    expect(profile?.description).toContain('Skills');
  });

  it('falls back to a caught-up card when nothing needs doing', () => {
    const p = buildPriorities(
      { ...baseMetrics, applications: 5, interviews: 1, applicationsByStatus: { interview: 1 } },
      { id: '1', overall: 88, keyword: 90, formatting: 100, resume_id: 'r', created_at: '' },
      { pct: 100, missing: [] },
    );
    expect(p[0].title).toBe('You\u2019re all caught up');
  });

  it('caps at two priorities', () => {
    const p = buildPriorities(
      { ...baseMetrics, applications: 5, applicationsByStatus: { applied: 5 } },
      { id: '1', overall: 72, keyword: 64, formatting: 100, resume_id: 'r', created_at: '' },
      { pct: 40, missing: ['Skills', 'Headline'] },
    );
    expect(p.length).toBeLessThanOrEqual(2);
  });
});

describe('flattenSkills', () => {
  it('flattens category objects', () => {
    expect(flattenSkills([{ category: 'Frontend', skills: ['React', 'TypeScript'] }, { category: 'Cloud', skills: ['AWS'] }])).toEqual(['React', 'TypeScript', 'AWS']);
  });

  it('accepts plain string arrays', () => {
    expect(flattenSkills(['React', 'React', 'Node.js'])).toEqual(['React', 'Node.js']);
  });

  it('handles empty or malformed input', () => {
    expect(flattenSkills(null)).toEqual([]);
    expect(flattenSkills('nope')).toEqual([]);
    expect(flattenSkills([{ category: 'X', skills: 'nope' }])).toEqual([]);
  });
});

describe('computeProfileCompletion', () => {
  it('computes completion from real profile fields', () => {
    const r = computeProfileCompletion({ headline: 'Engineer', skills: [{ category: 'S', skills: ['React'] }] });
    expect(r.pct).toBe(40);
    expect(r.missing).toEqual(['Bio', 'Work experience', 'Education']);
  });

  it('returns 100% for a complete profile', () => {
    const r = computeProfileCompletion({
      headline: 'Engineer',
      bio: 'bio',
      work_experience: [{}],
      education: [{}],
      skills: ['React'],
    });
    expect(r.pct).toBe(100);
    expect(r.missing).toEqual([]);
  });
});

describe('pipeline numbers', () => {
  it('counts offers from real statuses', () => {
    expect(getOffers({ ...baseMetrics, applicationsByStatus: { offer: 1, accepted: 1, applied: 3 } })).toBe(2);
  });

  it('computes response rate from real counts', () => {
    expect(getResponseRate({ ...baseMetrics, applications: 8, interviews: 2 })).toBe(25);
  });
});
