import { describe, expect, it } from 'vitest';
import { FREE_PLAN_RESUME_LIMITS, getResumeLimitExceededMessage } from './resume-limits';

describe('FREE_PLAN_RESUME_LIMITS', () => {
  it('pins the free-plan quotas', () => {
    expect(FREE_PLAN_RESUME_LIMITS).toEqual({ base: 2, tailored: 4 });
  });
});

describe('getResumeLimitExceededMessage', () => {
  it('names the base-resume quota and number for the base type', () => {
    expect(getResumeLimitExceededMessage('base')).toBe(
      'Free plan limit reached: you can create up to 2 base resumes. Upgrade to Pro to create more.',
    );
  });

  it('names the tailored-resume quota and number for the tailored type', () => {
    expect(getResumeLimitExceededMessage('tailored')).toBe(
      'Free plan limit reached: you can create up to 4 tailored resumes. Upgrade to Pro to create more.',
    );
  });
});
