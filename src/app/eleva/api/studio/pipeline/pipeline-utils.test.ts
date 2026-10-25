import assert from 'node:assert/strict';
import { describe, it } from 'vitest';

import {
  buildSectionRewriteOutcome,
  buildTailoredResumeIdentity,
  countChangedSections,
  summarizeSectionStatus,
  inferConciseRoleTitle,
  normalizeRoleTitle,
} from './pipeline-utils';
import { localExtractFallback } from './local-scorer';

describe('countChangedSections', () => {
  it('counts only changed outcomes', () => {
    const outcomes = [{ changed: true }, { changed: false }, { changed: true }];
    assert.equal(countChangedSections(outcomes), 2);
  });

  it('returns 0 for an empty outcome list', () => {
    assert.equal(countChangedSections([]), 0);
  });

  it('returns 0 when nothing changed', () => {
    assert.equal(countChangedSections([{ changed: false }, { changed: false }]), 0);
  });
});

describe('buildTailoredResumeIdentity', () => {
  it('keeps a clean name and target role', () => {
    const identity = buildTailoredResumeIdentity({
      name: 'Ashish Chandan',
      target_role: 'Senior Frontend Engineer',
    });
    assert.deepEqual(identity, { name: 'Ashish Chandan', target_role: 'Senior Frontend Engineer' });
  });

  it('falls back to a default name when missing', () => {
    const identity = buildTailoredResumeIdentity({ name: null, target_role: null });
    assert.equal(identity.name, 'Tailored Resume');
    assert.equal(identity.target_role, 'Tailored Resume');
  });

  it('falls back to the tailored name when the target role is missing', () => {
    const identity = buildTailoredResumeIdentity({ name: 'Ada Lovelace', target_role: '' });
    assert.equal(identity.target_role, 'Ada Lovelace');
  });

  it('normalizes messy whitespace before saving', () => {
    const identity = buildTailoredResumeIdentity({
      name: '  Grace   Brewster\tHopper  ',
      target_role: '   Rear  Admiral\nEngineer   ',
    });
    assert.equal(identity.name, 'Grace Brewster Hopper');
    assert.equal(identity.target_role, 'Rear Admiral Engineer');
  });

  it('truncates oversized names and roles to 120 characters', () => {
    const longName = 'N'.repeat(300);
    const identity = buildTailoredResumeIdentity({ name: longName, target_role: null });
    assert.equal(identity.name.length, 120);
    assert.equal(identity.target_role.length, 120);
  });
});

describe('buildSectionRewriteOutcome', () => {
  it('reports fully restructured rewrites as changed with high confidence', () => {
    const outcome = buildSectionRewriteOutcome(
      'Projects',
      'Worked on stuff',
      'Architected and shipped a real-time collaboration platform used by thousands of users worldwide',
    );
    assert.equal(outcome.changed, true);
    assert.equal(outcome.rewrittenLength, outcome.content.length);
    assert.equal(outcome.reason, 'Projects fully restructured');
  });

  it('treats an empty rewrite over empty original as unchanged', () => {
    const outcome = buildSectionRewriteOutcome('Summary', '   ', '');
    assert.equal(outcome.changed, false);
    assert.equal(outcome.content, '');
    assert.equal(outcome.reason, 'Summary not rewritten');
  });

  it('falls back to the original text when the model returns empty output', () => {
    const outcome = buildSectionRewriteOutcome('Summary', 'Original text', '   ', 'Model returned nothing');
    assert.equal(outcome.changed, false);
    assert.equal(outcome.content, 'Original text');
    assert.equal(outcome.reason, 'Model returned nothing');
  });

  it('labels near-identical rewrites as lightly optimized and unchanged', () => {
    const original = 'Built the resume editor with drag and drop sections';
    const rewritten = 'Built the resume editor with drag-and-drop sections';
    const outcome = buildSectionRewriteOutcome('Experience', original, rewritten);
    assert.equal(outcome.changed, false);
    assert.equal(outcome.confidence, 0);
  });
});

describe('summarizeSectionStatus', () => {
  it('appends length deltas only to changed outcomes', () => {
    const changed = summarizeSectionStatus({
      content: 'x', changed: true, confidence: 60, reason: 'Summary rewritten',
      originalLength: 10, rewrittenLength: 20,
    });
    assert.match(changed, /Summary rewritten \(10 → 20\)/);

    const unchanged = summarizeSectionStatus({
      content: 'y', changed: false, confidence: 0, reason: 'Summary not rewritten',
      originalLength: 10, rewrittenLength: 10,
    });
    assert.equal(unchanged, 'Summary not rewritten');
  });
});

describe('normalizeRoleTitle', () => {
  const jd = 'Role: Senior Full Stack Engineer\n\nLead our full-stack platform.';

  it('keeps clean, concise role titles as-is', () => {
    assert.equal(normalizeRoleTitle('Senior Full Stack Engineer', jd), 'Senior Full Stack Engineer');
  });

  it('infers the role from the job description when the candidate is missing', () => {
    assert.equal(normalizeRoleTitle(null, jd), 'Senior Full Stack Engineer');
    assert.equal(normalizeRoleTitle(undefined, jd), 'Senior Full Stack Engineer');
  });

  it('infers the role when the candidate is too vague', () => {
    assert.equal(normalizeRoleTitle('Engineer', jd), 'Senior Full Stack Engineer');
  });

  it('collapses prose that contains a role into a concise title', () => {
    const title = normalizeRoleTitle('We are seeking a legendary Senior Backend Engineer to join us.', jd);
    assert.equal(title, 'Senior Backend Engineer');
  });

  it('falls back to the job description for oversized junk candidates', () => {
    const junk = 'X'.repeat(120);
    assert.equal(normalizeRoleTitle(junk, jd), 'Senior Full Stack Engineer');
  });

  it('returns null when neither candidate nor job description yields a role', () => {
    assert.equal(normalizeRoleTitle(null, ''), null);
  });
});

describe('inferConciseRoleTitle', () => {
  it('returns null for empty input', () => {
    assert.equal(inferConciseRoleTitle(''), null);
    assert.equal(inferConciseRoleTitle('   \n\t '), null);
  });

  it('reads explicit Position:/Job title: lines first', () => {
    assert.equal(inferConciseRoleTitle('Position: Data Scientist\nDo data science.'), 'Data Scientist');
  });

  it('does not copy verb-heavy prose into the title', () => {
    const jd = 'We are looking for an engineer to join our platform team and build delightful products.';
    assert.equal(inferConciseRoleTitle(jd), null);
  });
});

describe('pipeline utils with the local extraction fallback', () => {
  it('keeps JD role titles concise', () => {
    const jd = `
Role: Senior Full Stack Engineer

Lead our full-stack solution based on modern server systems.
    `;

    assert.equal(normalizeRoleTitle('Lead our full-stack solution based on modern server systems.', jd), 'Senior Full Stack Engineer');
    assert.equal(inferConciseRoleTitle(jd), 'Senior Full Stack Engineer');
  });

  it('does not let fallback extraction copy JD prose into the role', () => {
    const jd = `
Company: Numa
Role: Senior Full Stack Engineer

We are looking for someone to lead our full-stack solution based on modern server architecture.
    `;

    const extracted = localExtractFallback(jd);
    assert.equal(extracted.company, 'Numa');
    assert.equal(extracted.role, 'Senior Full Stack Engineer');
  });

  it('flags unchanged section rewrites clearly', () => {
    const outcome = buildSectionRewriteOutcome('Summary', 'Data Analyst with hands-on experience', 'Data Analyst with hands-on experience');
    assert.equal(outcome.changed, false);
    assert.equal(outcome.confidence, 0);
    assert.equal(outcome.reason, 'Summary not rewritten');
  });

  it('preserves the resume identity when saving tailored versions', () => {
    const identity = buildTailoredResumeIdentity({ name: 'Ashish Dhondiba Chandan', target_role: 'Software Engineer' });
    assert.equal(identity.name, 'Ashish Dhondiba Chandan');
    assert.equal(identity.target_role, 'Software Engineer');
  });
});
