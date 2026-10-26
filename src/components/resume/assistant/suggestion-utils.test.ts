// @vitest-environment node
import { describe, expect, it } from 'vitest';

import type { Education, Project, Skill, WorkExperience } from '@/lib/types';
import {
  buildModePreviewContent,
  compareDescriptions,
  getPreviewSnippets,
  isNewItem,
  prettifyActionVerb,
  type SuggestionContent,
} from './suggestion-utils';

const WORK: WorkExperience = {
  company: 'Old Co',
  position: 'Backend Engineer',
  date: '2021 – 2024',
  description: ['Built payment APIs', 'Migrated the database', 'Mentored interns'],
};

const PROJECT: Project = {
  name: 'Rate Limiter',
  description: ['Designed token buckets', 'Shipped to production'],
  technologies: ['Go', 'Redis'],
};

const SKILL: Skill = { category: 'Programming Languages', items: ['Zig', 'Go', 'Rust'] };

const EDUCATION: Education = {
  school: 'State University',
  degree: 'BSc',
  field: 'Computer Science',
  date: '2017 – 2021',
  achievements: ['Dean’s list', 'Hackathon winner'],
};

describe('prettifyActionVerb', () => {
  it('replaces weak opener verbs per mode', () => {
    expect(prettifyActionVerb('Helped with the migration', 'professional')).toBe('Improved with the migration');
    expect(prettifyActionVerb('assisted with the migration', 'technical')).toBe('Implemented with the migration');
    expect(prettifyActionVerb('supported the launch', 'recruiter')).toBe('Delivered the launch');
    expect(prettifyActionVerb('helped harden storage', 'executive')).toBe('Led harden storage');
    expect(prettifyActionVerb('helped fix bugs', 'more-leadership')).toBe('Owned fix bugs');
    expect(prettifyActionVerb('helped design a thing', 'longer')).toBe('Expanded design a thing');
  });

  it('forces a leadership verb when none is present', () => {
    // No led/owned/spearheaded/drove/managed/coordinated opener → Owned + lowercased stem.
    expect(prettifyActionVerb('Improved throughput', 'more-leadership')).toBe('Owned improved throughput');
    expect(prettifyActionVerb('Managed the rollout', 'more-leadership')).toBe('Managed the rollout');
  });

  it('trims the first clause only in shorter mode', () => {
    expect(prettifyActionVerb('Built APIs. Deployed them. Zen.', 'shorter')).toBe('Built APIs');
    expect(prettifyActionVerb('Built APIs; Deployed them', 'shorter')).toBe('Built APIs');
  });

  it('normalizes whitespace and handles empty input', () => {
    expect(prettifyActionVerb('  Built   APIs  ', 'professional')).toBe('Built APIs');
    expect(prettifyActionVerb('', 'professional')).toBe('');
    expect(prettifyActionVerb('   ', 'executive')).toBe('');
  });
});

describe('buildModePreviewContent', () => {
  it('pads the first work bullet for executive and ats modes only', () => {
    const executive = buildModePreviewContent(WORK, 'executive', 'work_experience') as WorkExperience;
    expect(executive.description[0]).toBe('Built payment APIs while aligning cross-functional priorities.');
    expect(executive.description[1]).toBe('Migrated the database');
    expect(executive.description[2]).toBe('Mentored interns');

    const ats = buildModePreviewContent(WORK, 'ats', 'work_experience') as WorkExperience;
    expect(ats.description[0]).toBe('Built payment APIs using role-relevant terminology.');
    expect(ats.description[1]).toBe('Migrated the database');
  });

  it('pads the first project bullet for technical/recruiter modes only', () => {
    const technical = buildModePreviewContent(PROJECT, 'technical', 'project') as Project;
    expect(technical.description[0]).toBe('Designed token buckets with a focus on architecture and implementation details.');
    const recruiter = buildModePreviewContent(PROJECT, 'recruiter', 'project') as Project;
    expect(recruiter.description[0]).toBe('Designed token buckets so the business impact is obvious at a glance.');
  });

  it('sorts skills alphabetically in ats/technical modes and trims to 70% in shorter mode', () => {
    const ats = buildModePreviewContent(SKILL, 'ats', 'skill') as Skill;
    expect(ats.items).toEqual(['Go', 'Rust', 'Zig']);

    const ten = { category: 'x', items: Array.from({ length: 10 }, (_, i) => `skill-${i}`) } as Skill;
    const shorter = buildModePreviewContent(ten, 'shorter', 'skill') as Skill;
    expect(shorter.items).toHaveLength(7); // Math.ceil(10 * 0.7)

    const oneDiscovery = { category: 'x', items: ['only-one'] } as Skill;
    expect(((buildModePreviewContent(oneDiscovery, 'shorter', 'skill')) as Skill).items).toHaveLength(1);
  });

  it('appends the academic flourish to the first education achievement in professional mode', () => {
    const out = buildModePreviewContent(EDUCATION, 'professional', 'education') as Education;
    expect(out.achievements?.[0]).toBe('Dean’s list with strong academic performance.');
    expect(out.achievements?.[1]).toBe('Hackathon winner');
  });

  it('falls back to generic processing for unmatched type/shape combinations', () => {
    // type unmatched by any specific branch, but content carries description →
    // generic path: verbs prettified WITHOUT the typed first-bullet pads.
    const generic = buildModePreviewContent(WORK, 'executive', 'skill');
    expect((generic as WorkExperience).description).toEqual([
      'Built payment APIs',
      'Migrated the database',
      'Mentored interns',
    ]);
    // Items fallback: no sorting outside ats/technical modes.
    const itemsOut = buildModePreviewContent(SKILL, 'professional', 'education');
    expect((itemsOut as Skill).items).toEqual(['Zig', 'Go', 'Rust']);
  });
});

describe('getPreviewSnippets', () => {
  it('builds the work-experience header plus the first two bullets', () => {
    expect(getPreviewSnippets(WORK, 'work_experience')).toEqual([
      'Backend Engineer · Old Co',
      'Built payment APIs',
      'Migrated the database',
    ]);
  });

  it('omits the company segment when missing (rendering never shows dangling separators)', () => {
    const noCompany = { ...WORK, company: '' } as WorkExperience;
    expect(getPreviewSnippets(noCompany, 'work_experience')[0]).toBe('Backend Engineer');
  });

  it('builds project and skill snippets', () => {
    expect(getPreviewSnippets(PROJECT, 'project')).toEqual(['Rate Limiter', 'Designed token buckets', 'Shipped to production']);
    expect(getPreviewSnippets(SKILL, 'skill')).toEqual(['Programming Languages', 'Zig, Go, Rust']);
  });

  it('builds education snippets with degree-in-field header', () => {
    expect(getPreviewSnippets(EDUCATION, 'education')).toEqual([
      'BSc in Computer Science',
      'State University',
      'Dean’s list',
      'Hackathon winner',
    ]);
  });

  it('caps skill items at six in the preview join', () => {
    const many = { category: 'x', items: ['1', '2', '3', '4', '5', '6', '7', '8'] } as Skill;
    expect(getPreviewSnippets(many, 'skill')[1]).toBe('1, 2, 3, 4, 5, 6');
  });

  it('returns [] for content with no recognized list shape', () => {
    const bare = { date: '2020' } as unknown as SuggestionContent;
    expect(getPreviewSnippets(bare, 'work_experience')).toEqual([]);
  });
});

describe('compareDescriptions', () => {
  it('marks fresh words as a single new run (isStart on the head, isEnd on the tail)', () => {
    const parts = compareDescriptions('Built APIs', 'Built robust reliable APIs');
    expect(parts.map((p) => p.text)).toEqual(['Built', 'robust', 'reliable', 'APIs']);
    expect(parts.filter((p) => p.isNew).map((p) => p.text)).toEqual(['robust', 'reliable']);
    expect(parts.find((p) => p.text === 'robust')?.isStart).toBe(true);
    expect(parts.find((p) => p.text === 'reliable')?.isStart).toBe(false);
    expect(parts.find((p) => p.text === 'reliable')?.isEnd).toBe(true);
    expect(parts.find((p) => p.text === 'Built')?.isNew).toBe(false);
  });

  it('handles bold markdown tokens as single words', () => {
    const parts = compareDescriptions('', 'Shipped **four** releases');
    const four = parts.find((p) => p.text === 'four');
    expect(four?.isBold).toBe(true);
    expect(four?.isNew).toBe(true);
    expect(parts.find((p) => p.text === 'Shipped')?.isStart).toBe(true);
  });

  it('normalizes whitespace before comparing (extra spacing is not a change)', () => {
    const parts = compareDescriptions('Built \n  fantastic   APIs', 'Built fantastic APIs');
    expect(parts.every((p) => !p.isNew)).toBe(true);
  });
});

describe('isNewItem', () => {
  it('treats an absent current list as all-new', () => {
    expect(isNewItem(undefined, undefined, 'Go')).toBe(true);
  });

  it('checks membership in the current list', () => {
    expect(isNewItem(['Go', 'Rust'], undefined, 'Go')).toBe(false);
    expect(isNewItem(['Go', 'Rust'], undefined, 'Zig')).toBe(true);
  });
});
