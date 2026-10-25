// @vitest-environment node
import assert from 'node:assert/strict';
import { describe, it } from 'vitest';

import { localExtractFallback, localTailorFallback, scoreResumeLocally } from './local-scorer';

describe('scoreResumeLocally', () => {
  it('matches shared keywords and reports the missing ones', () => {
    const result = scoreResumeLocally(
      'React developer with Node',
      'Need React, Python, Node.',
    );

    assert.ok(result.matched.includes('react'));
    assert.ok(result.matched.includes('node'));
    assert.deepEqual(result.missing, ['python']);
    assert.equal(result.keyword, Math.round((2 / 3) * 100));
  });

  it('perfect overlap produces a 100% keyword score', () => {
    const result = scoreResumeLocally('React Node', 'React Node');
    assert.equal(result.missing.length, 0);
    assert.equal(result.keyword, 100);
  });

  it('an empty JD keeps a neutral 50% estimate and emits no suggestions', () => {
    const result = scoreResumeLocally('React developer', '');
    assert.equal(result.keyword, 50);
    assert.deepEqual(result.suggestions, []);
    assert.ok(result.summary.includes('0 of 0 keywords matched'));
  });

  it('impact reaches 100% when the only JD skill group is covered', () => {
    // "react" is the only extracted JD keyword and it hits the frontend
    // skill group, which the resume also covers.
    const result = scoreResumeLocally('React developer', 'Need React.');
    assert.equal(result.keyword, 100);
    assert.equal(result.impact, 100);
  });

  it('missing keywords surface a capped add-first-five suggestion', () => {
    const result = scoreResumeLocally(
      'React developer',
      'Required: React. Nice to have: Kotlin Floyd Warshall: quota unexpected ... more six words here padded long.',
    );
    const warning = result.suggestions.find((s) => s.type === 'warning');
    assert.ok(warning, 'expected a missing-keywords warning');
    assert.ok(warning?.action.startsWith('Add: '));
  });

  it('caps matched and missing keyword lists at 30 entries', () => {
    // 35 distinct words longer than three letters, plus known tech terms for signal.
    const words = Array.from({ length: 35 }, (_, i) => `word${i}x`);
    const jd = `${words.join(' ')} React`;
    const result = scoreResumeLocally('unrelated text', jd);

    assert.ok(result.matched.length <= 30);
    assert.ok(result.missing.length <= 30);
    assert.ok(result.missing.length > 0);
  });

  it('reports related score fields within contract bounds', () => {
    const result = scoreResumeLocally('React developer with AWS', 'Looking for React and AWS engineers');
    for (const field of ['overall', 'keyword', 'formatting', 'readability', 'impact', 'recruiter'] as const) {
      const value = result[field];
      assert.ok(value >= 0 && value <= 100, `${field} = ${value} out of range`);
    }
  });
});

describe('localExtractFallback', () => {
  it('extracts the company from the @mention form', () => {
    const result = localExtractFallback(
      'Backend Engineer @Vercel Labs\n\nRequired: TypeScript, React\nNice to have: GraphQL',
    );
    assert.equal(result.company, 'Vercel Labs');
  });

  it('extracts the company from a labeled Company line', () => {
    const result = localExtractFallback(
      'Company: Acme Robotics\nRole: Staff Platform Engineer\n\nWe use Kubernetes.',
    );
    assert.equal(result.company, 'Acme Robotics');
  });

  it('keeps required and nice-to-have skills separate', () => {
    const result = localExtractFallback(
      'Senior Backend @Stripe\n\nRequired:\nTypeScript\nNode\n\nNice to have:\nGraphQL\nRedis',
    );

    assert.ok(result.required_skills.includes('TypeScript'));
    assert.ok(result.required_skills.includes('Node'));
    assert.ok(!result.required_skills.includes('GraphQL'));
    assert.ok(!result.required_skills.includes('Redis'));
    assert.ok(result.nice_to_have.includes('GraphQL'));
    assert.ok(result.nice_to_have.includes('Redis'));
  });

  it('falls back to a 70/30 split when no sections exist', () => {
    // Two detected skills: ceil(2 * 0.7) = 2 required, 0 nice-to-have.
    const result = localExtractFallback('We need someone fluent in TypeScript and Kubernetes.');
    assert.ok(result.required_skills.includes('TypeScript'));
    assert.ok(result.required_skills.includes('Kubernetes'));
    assert.equal(result.nice_to_have.length, 0);
  });

  it('normalizes the role title from the JD text', () => {
    const result = localExtractFallback(
      'Role: Staff Software Engineer\n\nCompany: Tailwind\n\nMust have: React',
    );
    const role = result.role ?? '';
    assert.ok(role.length > 0);
    assert.ok(!/^(senior|staff|principal|junior|lead)$/i.test(role));
  });

  it('returns null company for an unmarked JD', () => {
    const result = localExtractFallback('Help users build resumes. Use TypeScript.');
    assert.equal(result.company, null);
  });

  it('respects the 30 required / 20 nice-to-have caps', () => {
    // 35 distinct TECH_KEYWORDS listed under Required plus 3 under
    // Nice to have; extraction must slice to 30 / 20 respectively.
    const requiredList = [
      'JavaScript', 'TypeScript', 'Python', 'Java', 'Go', 'Rust', 'React', 'Angular', 'Vue', 'Node',
      'Express', 'Django', 'Flask', 'Spring', 'AWS', 'Azure', 'Docker', 'Kubernetes', 'Terraform', 'PostgreSQL',
      'MySQL', 'MongoDB', 'Redis', 'GraphQL', 'REST', 'Kafka', 'SQL', 'HTML', 'CSS', 'Sass',
      'Redux', 'Webpack', 'Git', 'Linux', 'Bash',
    ].join('\n');
    const result = localExtractFallback(
      `Company: Overflow Inc\n\nRequired:\n${requiredList}\n\nNice to have:\nElasticsearch\nNginx\nScrum`,
    );
    assert.equal(result.required_skills.length, 30);
    assert.equal(result.nice_to_have.length, 3);
  });
});

describe('localTailorFallback', () => {
  it('produces a no-op tailoring result that keeps the resume untouched', () => {
    const result = localTailorFallback();
    assert.deepEqual(result.sections, []);
    assert.deepEqual(result.summary.keywords_added, []);
    assert.equal(result.summary.bullets_rewritten, 0);
    assert.ok(result.summary.improvement_areas.length > 0);
  });
});
