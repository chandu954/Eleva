import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildSectionRewriteOutcome, buildTailoredResumeIdentity, inferConciseRoleTitle, normalizeRoleTitle } from './pipeline-utils';
import { localExtractFallback } from './local-scorer';

describe('pipeline utils', () => {
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