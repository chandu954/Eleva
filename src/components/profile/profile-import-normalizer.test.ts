// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { normalizeImportedProfile, type ImportedProfileShape } from './profile-import-normalizer';

const FULL: ImportedProfileShape = {
  first_name: 'Ada',
  last_name: 'Lovelace',
  email: 'ada@example.com',
  phone_number: '+1 555 0100',
  location: 'London',
  website: 'https://ada.dev',
  linkedin_url: 'https://linkedin.com/in/ada',
  github_url: 'https://github.com/ada',
  work_experience: [{
    company: 'Analytical Engines Inc',
    position: 'Engineer',
    location: 'London',
    date: '1843 - 1851',
    description: ['Wrote the first program'],
    technologies: ['Punch cards'],
  }],
  education: [{
    school: 'Self-taught',
    degree: 'BSc equivalent',
    field: 'Mathematics',
    location: 'London',
    date: '1835 - 1840',
    gpa: '3.75',
    achievements: ['First programmer recognition'],
  }],
  skills: [{ category: 'Programming', skills: ['Numbers crunching'] }],
  projects: [{
    name: 'Notes on the Engine',
    description: ['Annotated the Analytical Engine'],
    technologies: ['Paper'],
    date: '1843',
    url: 'https://example.com/notes',
    github_url: 'https://github.com/ada/notes',
  }],
};

describe('normalizeImportedProfile — scalars', () => {
  it('keeps present values and nulls missing ones', () => {
    const out = normalizeImportedProfile({ first_name: 'Ada', email: undefined, github_url: '' });
    expect(out.first_name).toBe('Ada');
    expect(out.email).toBeNull();
    // Empty string is falsy → normalized to null like the inline original.
    expect(out.github_url).toBeNull();
    for (const key of ['last_name', 'phone_number', 'location', 'website', 'linkedin_url'] as const) {
      expect(out[key]).toBeNull();
    }
  });
});

describe('normalizeImportedProfile — work_experience', () => {
  it('passes clean entries through with location and technologies intact', () => {
    const [cleaned] = normalizeImportedProfile(FULL).work_experience as { description: string[]; technologies: string[]; location: string; company: string; position: string; date: string }[];
    expect(cleaned.company).toBe('Analytical Engines Inc');
    expect(cleaned.position).toBe('Engineer');
    expect(cleaned.date).toBe('1843 - 1851');
    expect(cleaned.location).toBe('London');
    expect(cleaned.description).toEqual(['Wrote the first program']);
    expect(cleaned.technologies).toEqual(['Punch cards']);
  });

  it('wraps a scalar description into a one-element array (and empty string to [""])', () => {
    const out = normalizeImportedProfile({ work_experience: [{ company: 'C', position: 'P', date: 'D', description: 'single line' }] });
    const [entry] = out.work_experience as { description: string[] }[];
    expect(entry.description).toEqual(['single line']);

    const blank = normalizeImportedProfile({ work_experience: [{ company: '', position: '', date: '', description: '' }] });
    const [b] = blank.work_experience as { description: string[] }[];
    expect(b.description).toEqual(['']);
  });

  it('defaults missing technologies to []', () => {
    const out = normalizeImportedProfile({ work_experience: [{ company: 'C', position: 'P', date: 'D', description: 'd' }] });
    const [entry] = out.work_experience as { technologies: string[] }[];
    expect(entry.technologies).toEqual([]);
  });

  it('falls back to [] when the section is not an array', () => {
    expect((normalizeImportedProfile({ work_experience: 'oops' }).work_experience)).toEqual([]);
    expect((normalizeImportedProfile({}).work_experience)).toEqual([]);
  });
});

describe('normalizeImportedProfile — education', () => {
  it('parses numeric GPAs from strings and passes numbers through', () => {
    const [gpaString] = normalizeImportedProfile(FULL).education as { gpa?: number; achievements: string[]; school: string; degree: string; field: string; location: string; date: string }[];
    expect(gpaString.gpa).toBe(3.75);
    expect(gpaString.achievements).toEqual(['First programmer recognition']);

    const [numeric] = normalizeImportedProfile({ education: [{ school: 'S', degree: 'D', field: 'F', date: 'T', gpa: 4 }] }).education as { gpa?: number }[];
    expect(numeric.gpa).toBe(4);
  });

  it('leaves gpa undefined when missing and defaults achievements to []', () => {
    const out = normalizeImportedProfile({ education: [{ school: 'S', degree: 'D', field: 'F', date: 'T' }] });
    const [entry] = out.education as { gpa?: number; achievements: string[] }[];
    expect(entry.gpa).toBeUndefined();
    expect(entry.achievements).toEqual([]);
  });

  it('falls back to [] when missing', () => {
    expect(normalizeImportedProfile({}).education).toEqual([]);
  });
});

describe('normalizeImportedProfile — skills', () => {
  it('supports both keys, with skills taking precedence (defensive dual-key surface)', () => {
    const [preferSkills] = normalizeImportedProfile(FULL).skills as { category: string; items: string[] }[];
    expect(preferSkills).toEqual({ category: 'Programming', items: ['Numbers crunching'] });

    const [itemsOnly] = normalizeImportedProfile({
      skills: [{ category: 'Craft', items: ['Forward thinking'] }],
    }).skills as { category: string; items: string[] }[];
    expect(itemsOnly.items).toEqual(['Forward thinking']);

    // Neither key → empty items, category preserved.
    const [neither] = normalizeImportedProfile({ skills: [{ category: 'Empty' }] }).skills as { category: string; items: string[] }[];
    expect(neither).toEqual({ category: 'Empty', items: [] });
  });

  it('falls back to [] when missing', () => {
    expect(normalizeImportedProfile({}).skills).toEqual([]);
  });
});

describe('normalizeImportedProfile — projects', () => {
  it('keeps urls, wraps scalar descriptions, defaults technologies', () => {
    const [entry] = normalizeImportedProfile(FULL).projects as { name: string; description: string[]; technologies: string[]; url?: string; github_url?: string; date: string }[];
    expect(entry.name).toBe('Notes on the Engine');
    expect(entry.description).toEqual(['Annotated the Analytical Engine']);
    expect(entry.technologies).toEqual(['Paper']);
    expect(entry.url).toBe('https://example.com/notes');
    expect(entry.github_url).toBe('https://github.com/ada/notes');
    expect(entry.date).toBe('1843');
  });

  it('normalizes missing urls to undefined (the documented distinction from empty strings)', () => {
    const out = normalizeImportedProfile({ projects: [{ name: 'N', description: 'desc', date: '' }] });
    const [entry] = out.projects as { url?: string; github_url?: string; description: string[]; technologies: string[]; name: string; date: string }[];
    expect(entry.url).toBeUndefined();
    expect(entry.github_url).toBeUndefined();
    expect(entry.description).toEqual(['desc']);
    expect(entry.technologies).toEqual([]);
    expect(entry.date).toBe('');
  });

  it('falls back to [] when missing', () => {
    expect(normalizeImportedProfile({}).projects).toEqual([]);
  });
});
