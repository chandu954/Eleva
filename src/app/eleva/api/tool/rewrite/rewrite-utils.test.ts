import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildRewritePrompt, makeSafeLocalRewrite, summarizeRewriteAttempts } from './rewrite-utils';

describe('rewrite utils', () => {
  it('builds mode-aware prompts', () => {
    const { system, prompt } = buildRewritePrompt({
      bullet: 'Led pricing service.',
      role: 'Senior Backend Engineer',
      mode: 'ats',
    });

    assert.match(system, /Do not return an empty response/);
    assert.match(prompt, /Mode: ats/);
    assert.match(prompt, /Senior Backend Engineer/);
  });

  it('creates a safe local rewrite when AI fails', () => {
    const rewritten = makeSafeLocalRewrite('helped improve the reporting workflow', 'professional');
    assert.ok(rewritten.length > 0);
    assert.match(rewritten, /Supported|Built|Optimized|Helped/i);
  });

  it('summarizes retry attempts clearly', () => {
    const summary = summarizeRewriteAttempts([
      { attempt: 1, model: 'nvidia', status: 'empty', latencyMs: 820 },
      { attempt: 2, model: 'fallback/local', status: 'fallback', latencyMs: 12 },
    ]);

    assert.match(summary, /Attempt 1/);
    assert.match(summary, /fallback\/local/);
  });
});