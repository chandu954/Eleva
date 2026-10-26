import { describe, expect, it } from 'vitest';

import {
  bodySchema,
  PlannerSchema,
  QualityCheckSchema,
  RecruiterReviewSchema,
  ResumeExperienceSchema,
  ResumeProjectsSchema,
  ResumeSkillsSchema,
  SummarySchema,
} from './schemas';

describe('pipeline request body', () => {
  it('accepts a job description with an optional uuid resume id', () => {
    const parsed = bodySchema.safeParse({
      jobDescription: 'a'.repeat(20),
      resumeId: '123e4567-e89b-12d3-a456-426614174000',
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects a short job description', () => {
    expect(bodySchema.safeParse({ jobDescription: 'too short' }).success).toBe(false);
  });

  it('rejects a non-uuid resume id', () => {
    expect(bodySchema.safeParse({ jobDescription: 'a'.repeat(20), resumeId: 'nope' }).success).toBe(false);
  });
});

describe('planner schema', () => {
  it('applies the documented defaults', () => {
    const parsed = PlannerSchema.parse({
      compatibility: 72,
      rewriteSummary: true,
      rewriteExperience: false,
      rewriteProjects: false,
      rewriteSkills: true,
    });

    expect(parsed.sectionsToSkip).toEqual([]);
    expect(parsed.keywordsToInject).toEqual([]);
    expect(parsed.transferableSkills).toEqual([]);
    expect(parsed.hardTruthNote).toBeNull();
  });

  it('rejects out-of-range compatibility and confidence values', () => {
    expect(PlannerSchema.safeParse({
      compatibility: 101,
      rewriteSummary: true,
      rewriteExperience: true,
      rewriteProjects: true,
      rewriteSkills: true,
    }).success).toBe(false);

    expect(PlannerSchema.safeParse({
      compatibility: 50,
      rewriteSummary: true,
      rewriteExperience: true,
      rewriteProjects: true,
      rewriteSkills: true,
      transferableSkills: [{ from: 'a', to: 'b', confidence: -1 }],
    }).success).toBe(false);
  });
});

describe('section schemas', () => {
  it('accepts a full planner, review and quality payload', () => {
    expect(RecruiterReviewSchema.parse({
      wouldInterview: true,
      score: 82,
      strengths: ['depth'],
      weaknesses: ['scale'],
      genericAreas: [],
      recommendation: 'Interview',
      confidence: 78,
    }).score).toBe(82);

    expect(QualityCheckSchema.parse({ passed: true, issues: [], score: 90 }).passed).toBe(true);
  });

  it('caps recruiter review arrays and quality issues', () => {
    expect(RecruiterReviewSchema.safeParse({
      wouldInterview: true,
      score: 82,
      strengths: Array.from({ length: 7 }, (_, i) => `s${i}`),
      weaknesses: [],
      genericAreas: [],
      recommendation: 'Interview',
      confidence: 78,
    }).success).toBe(false);

    expect(QualityCheckSchema.safeParse({
      passed: false,
      issues: Array.from({ length: 16 }, (_, i) => `i${i}`),
      score: 10,
    }).success).toBe(false);
  });

  it('validates summary, skills, experience and projects shapes', () => {
    expect(SummarySchema.parse({ professional_summary: 'Summary' }).professional_summary).toBe('Summary');
    expect(ResumeSkillsSchema.parse({ skills: [{ category: 'Lang', skills: ['TS'] }] }).skills).toHaveLength(1);

    expect(ResumeExperienceSchema.parse({
      work_experience: [{
        company: 'Acme',
        position: 'Engineer',
        location: null,
        start_date: '2020-01',
        end_date: null,
        description: 'Built things',
        responsibilities: ['Shipped'],
      }],
    }).work_experience[0]?.company).toBe('Acme');

    expect(ResumeProjectsSchema.parse({
      projects: [{ name: 'Eleva', description: ['AI resume builder'], technologies: ['Next.js'], url: null }],
    }).projects[0]?.name).toBe('Eleva');
  });

  it('rejects malformed experience and project payloads', () => {
    expect(ResumeExperienceSchema.safeParse({ work_experience: [{ company: 'Acme' }] }).success).toBe(false);
    expect(ResumeProjectsSchema.safeParse({ projects: [{ name: 'Eleva', description: 'not-an-array' }] }).success).toBe(false);
  });
});
