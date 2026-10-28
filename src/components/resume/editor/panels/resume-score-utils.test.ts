import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Resume } from '@/lib/types';
import type { ResumeScoreMetrics } from './resume-score-types';
import {
  camelCaseToReadable,
  createScoreSignature,
  getJobForScoring,
  getResumeForScoring,
  getStoredScores,
  updateStoredScores,
} from './resume-score-utils';

const metrics = { overallScore: { score: 80, reason: 'good' } } as ResumeScoreMetrics;
const resume = {
  id: 'resume-1',
  section_configs: { skills: { visible: false } },
  section_order: ['skills'],
  name: 'Engineer',
} as unknown as Resume;

describe('resume score utilities', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('normalizes display labels and scoring inputs', () => {
    expect(camelCaseToReadable('resumeScore')).toBe('Resume Score');
    expect(camelCaseToReadable('plain')).toBe('Plain');
    expect(getJobForScoring()).toBeNull();
    expect(getJobForScoring(null)).toBeNull();
    expect(getJobForScoring({ employment_type: null } as never)).toMatchObject({ employment_type: undefined });
    expect(getJobForScoring({ employment_type: 'contract' } as never)).toMatchObject({ employment_type: 'contract' });
    expect(getResumeForScoring(resume)).toMatchObject({ section_configs: undefined, section_order: undefined });
    expect(createScoreSignature(resume, null, 'model-a')).not.toBe(createScoreSignature(resume, null, 'model-b'));
  });

  it('reads only well-formed entries with a matching signature', () => {
    expect(getStoredScores('resume-1', 'sig')).toBeNull();
    localStorage.setItem('eleva-resume-scores', JSON.stringify([['resume-1', null]]));
    expect(getStoredScores('resume-1', 'sig')).toBeNull();
    localStorage.setItem('eleva-resume-scores', JSON.stringify([['resume-1', { signature: 1, score: metrics }]]));
    expect(getStoredScores('resume-1', 'sig')).toBeNull();
    localStorage.setItem('eleva-resume-scores', JSON.stringify([['resume-1', { signature: 'sig', score: null }]]));
    expect(getStoredScores('resume-1', 'sig')).toBeNull();
    localStorage.setItem('eleva-resume-scores', JSON.stringify([['resume-1', { signature: 'other', score: metrics }]]));
    expect(getStoredScores('resume-1', 'sig')).toBeNull();
    localStorage.setItem('eleva-resume-scores', JSON.stringify([['resume-1', { signature: 'sig', score: metrics }]]));
    expect(getStoredScores('resume-1', 'sig')).toEqual(metrics);
    localStorage.setItem('eleva-resume-scores', '{');
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(getStoredScores('resume-1', 'sig')).toBeNull();
    expect(error).toHaveBeenCalled();
  });

  it('replaces existing entries and keeps the ten newest scores', () => {
    const entry = { signature: 'sig', score: metrics, generatedAt: 'now' };
    for (let index = 0; index < 10; index += 1) {
      updateStoredScores(`resume-${index}`, entry);
    }
    updateStoredScores('resume-0', { ...entry, signature: 'updated' });
    let values = JSON.parse(localStorage.getItem('eleva-resume-scores') ?? '[]') as [string, { signature: string }][];
    expect(values).toHaveLength(10);
    expect(values[0][0]).toBe('resume-1');
    expect(values.at(-1)).toEqual(['resume-0', expect.objectContaining({ signature: 'updated' })]);
    updateStoredScores('resume-10', entry);
    values = JSON.parse(localStorage.getItem('eleva-resume-scores') ?? '[]') as [string, { signature: string }][];
    expect(values).toHaveLength(10);
    expect(values[0][0]).toBe('resume-2');
  });

  it('keeps the caller safe when browser storage rejects a write', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage unavailable');
    });
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    expect(() => updateStoredScores('resume-1', { signature: 'sig', score: metrics, generatedAt: 'now' })).not.toThrow();
    expect(error).toHaveBeenCalledWith('Error storing score:', expect.any(Error));
  });
});
