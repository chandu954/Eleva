// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  openAiProfileSchema,
  openAiResumeSchema,
  openAiWorkExperienceBulletPointsSchema,
  openAiProjectSchema,
  openAiWorkExperienceSchema,
} from './schemas';

describe('OpenAI function schemas', () => {
  it.each([
    ['profile', openAiProfileSchema, 'resume-schema'],
    ['resume', openAiResumeSchema, 'resume'],
    ['bullets', openAiWorkExperienceBulletPointsSchema, 'work-experience-schema'],
    ['project', openAiProjectSchema, 'project-schema'],
    ['experience', openAiWorkExperienceSchema, 'WorkExperience'],
  ])('exposes a structured %s schema', (_name, schema, expectedName) => {
    expect(schema.schema.type).toBe('object');
    expect(schema.schema.properties).toBeTypeOf('object');
    expect(schema.name).toBe(expectedName);
  });

  it('describes the required profile fields', () => {
    expect(Object.keys(openAiProfileSchema.schema.properties)).toEqual(
      expect.arrayContaining([
        'first_name',
        'last_name',
        'email',
        'work_experience',
        'education',
        'skills',
      ]),
    );
  });

  it('models resume work experience as an array of objects', () => {
    expect(openAiResumeSchema.schema.properties.work_experience.type).toBe('array');
    expect(openAiResumeSchema.schema.properties.work_experience.items.type).toBe('object');
  });

  it('accepts a bullet point string array for experience rewrites', () => {
    const properties = openAiWorkExperienceBulletPointsSchema.schema.properties as Record<string, unknown>;
    expect(Object.keys(properties).length).toBeGreaterThan(0);
  });
});
