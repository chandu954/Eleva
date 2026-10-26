import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

vi.mock('@/lib/eleva-ai-provider', async () => {
  const zod = await import('zod');
  return {
    AIProvider: {
      generateObject: vi.fn(),
      generate: vi.fn(),
    },
    z: zod,
  };
});

import { AIProvider } from '@/lib/eleva-ai-provider';
import {
  classifyPipelineError,
  computeKeywordsAdded,
  countBulletsRewritten,
  estimateCompatibility,
  generateObjectWithFallback,
  isRateLimitError,
  resumeToText,
  runSectionWithFallback,
  safeBullets,
  withStepTimeout,
} from './helpers';

const generateObjectMock = vi.mocked(AIProvider.generateObject);
const generateMock = vi.mocked(AIProvider.generate);

const schema = z.object({ value: z.string() });
const emit = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('withStepTimeout', () => {
  it('resolves the wrapped promise before the deadline', async () => {
    await expect(withStepTimeout(Promise.resolve('ok'), 'extract', emit)).resolves.toBe('ok');
    expect(emit).not.toHaveBeenCalled();
  });

  it('emits an error and rejects once the deadline elapses', async () => {
    vi.useFakeTimers();
    const pending = withStepTimeout(new Promise<string>(() => undefined), 'extract', emit);
    const assertion = expect(pending).rejects.toThrow('Step "extract" timed out after 90s');

    await vi.advanceTimersByTimeAsync(90_000);
    await assertion;
    expect(emit).toHaveBeenCalledWith('step', { step: 'extract', status: 'error', message: 'Step "extract" timed out after 90s' });
  });
});

describe('isRateLimitError', () => {
  it('recognizes status fields and message text', () => {
    expect(isRateLimitError(Object.assign(new Error('nope'), { statusCode: 429 }))).toBe(true);
    expect(isRateLimitError(Object.assign(new Error('nope'), { status: 429 }))).toBe(true);
    expect(isRateLimitError(new Error('Rate limit exceeded'))).toBe(true);
    expect(isRateLimitError(new Error('quota exhausted'))).toBe(true);
    expect(isRateLimitError(new Error('boom 429'))).toBe(true);
    expect(isRateLimitError(new Error('boom'))).toBe(false);
    expect(isRateLimitError('rate limited string')).toBe(true);
  });
});

describe('generateObjectWithFallback', () => {
  it('returns structured output from the provider without touching the text path', async () => {
    generateObjectMock.mockResolvedValue({ value: 'structured' } as never);

    await expect(generateObjectWithFallback(schema, 'system', 'prompt', 100, 0.2, () => ({ value: 'fallback' })))
      .resolves.toEqual({ value: 'structured' });
    expect(generateMock).not.toHaveBeenCalled();
  });

  it('extracts JSON from a text response when structured output fails', async () => {
    generateObjectMock.mockRejectedValue(new Error('no response_format'));
    generateMock.mockResolvedValue({ text: '```json\n{"value":"text"}\n```' } as never);

    await expect(generateObjectWithFallback(schema, 'system', 'prompt', 9000, 0.2, () => ({ value: 'fallback' })))
      .resolves.toEqual({ value: 'text' });
    expect(generateMock).toHaveBeenCalledWith(expect.objectContaining({ maxTokens: 4000 }));
  });

  it('falls back locally when both provider paths fail', async () => {
    generateObjectMock.mockRejectedValue(new Error('structured failed'));
    generateMock.mockResolvedValue({ text: 'not json' } as never);

    await expect(generateObjectWithFallback(schema, 'system', 'prompt', 100, 0.2, () => ({ value: 'fallback' })))
      .resolves.toEqual({ value: 'fallback' });
  });

  it('rejects when both paths fail and no fallback is supplied', async () => {
    generateObjectMock.mockRejectedValue(new Error('structured failed'));
    generateMock.mockRejectedValue(new Error('text failed'));

    await expect(generateObjectWithFallback(schema, 'system', 'prompt', 100, 0.2))
      .rejects.toThrow('AI returned invalid response and no fallback available');
  });

  it('uses the fallback when JSON parsing throws', async () => {
    generateObjectMock.mockRejectedValue(new Error('structured failed'));
    generateMock.mockResolvedValue({ text: '{not valid json}' } as never);

    await expect(generateObjectWithFallback(schema, 'system', 'prompt', 100, 0.2, () => ({ value: 'fallback' })))
      .resolves.toEqual({ value: 'fallback' });
  });
});

describe('runSectionWithFallback', () => {
  it('marks a structured section as not using the fallback', async () => {
    generateObjectMock.mockResolvedValue({ value: 'section' } as never);

    await expect(runSectionWithFallback('summary', schema, 'system', 'prompt', () => ({ value: 'fallback' }), emit))
      .resolves.toEqual({ data: { value: 'section' }, usedFallback: false });
  });

  it('returns the fallback and logs when the section fails', async () => {
    generateObjectMock.mockRejectedValue(new Error('failed'));
    generateMock.mockRejectedValue(new Error('failed'));

    await expect(runSectionWithFallback('summary', schema, 'system', 'prompt', () => ({ value: 'fallback' }), emit))
      .resolves.toEqual({ data: { value: 'fallback' }, usedFallback: true });
  });
});

describe('estimateCompatibility', () => {
  it('returns zero without a resume', () => {
    expect(estimateCompatibility(null, 'senior backend engineer', { matched: [], missing: [] })).toBe(0);
  });

  it('scores role, keyword, seniority and domain overlap', () => {
    const resume = {
      professional_summary: 'Senior backend engineer',
      skills: [{ category: 'Languages', skills: ['TypeScript'] }],
      work_experience: [{ position: 'Senior Backend Engineer', company: 'Acme', responsibilities: ['Built APIs'] }],
      projects: [],
      education: [],
      certifications: [],
    };

    expect(estimateCompatibility(resume, 'senior backend engineer', { matched: ['typescript'], missing: [] })).toBe(85);
    expect(estimateCompatibility(resume, 'senior backend engineer', {
      matched: ['typescript', 'node', 'aws', 'sql', 'redis', 'docker', 'k8s', 'go'],
      missing: ['rust', 'elixir'],
    })).toBeGreaterThanOrEqual(85);
  });

  it('handles an unrelated role by using the neutral weights', () => {
    const resume = {
      professional_summary: 'Farmer',
      skills: [],
      work_experience: [],
      projects: [],
      education: [],
      certifications: [],
    };

    expect(estimateCompatibility(resume, 'zookeeper', { matched: [], missing: [] })).toBe(50);
  });
});

describe('resume text helpers', () => {
  it('renders every resume section into the scorer text', () => {
    const text = resumeToText({
      professional_summary: 'Summary text',
      skills: [{ category: 'Backend', skills: ['Go', 'SQL'] }],
      work_experience: [{ position: 'Engineer', company: 'Acme', description: 'Line one\nLine two' }],
      projects: [{ name: 'Eleva', description: ['AI builder'] }],
      education: [{ school: 'State', degree: 'BS' }],
    });

    expect(text).toContain('Summary:\nSummary text');
    expect(text).toContain('Backend: Go, SQL');
    expect(text).toContain('Engineer at Acme\nLine one\nLine two');
    expect(text).toContain('Eleva:\nAI builder');
    expect(text).toContain('State: BS');
  });

  it('normalizes bullet shapes', () => {
    expect(safeBullets({ responsibilities: ['a', 'b'] })).toEqual(['a', 'b']);
    expect(safeBullets({ description: 'a\nb' })).toEqual(['a', 'b']);
    expect(safeBullets({ description: ['a', 'b'] })).toEqual(['a', 'b']);
    expect(safeBullets({ description: 42 })).toEqual(['42']);
    expect(safeBullets({})).toEqual([]);
  });

  it('computes added keywords case-insensitively without duplicates', () => {
    expect(computeKeywordsAdded(
      { skills: [{ category: 'Lang', skills: ['TypeScript', 'Go'] }] },
      { skills: [{ category: 'Lang', skills: ['typescript', 'Rust', 'Rust'] }] },
    )).toEqual(['rust']);
  });

  it('counts only new responsibility bullets', () => {
    expect(countBulletsRewritten(
      { work_experience: [{ responsibilities: ['Shipped A', 'Shipped B'] }] },
      { work_experience: [{ company: 'Acme', position: 'Eng', description: '', responsibilities: ['Shipped A', 'Shipped C'] }] },
    )).toBe(1);
  });
});

describe('classifyPipelineError', () => {
  it('maps each provider failure mode to the UI reason', () => {
    expect(classifyPipelineError(new Error('Unexpected token in JSON'))).toEqual({
      message: 'Unexpected token in JSON',
      statusCode: 0,
      reason: 'invalid_json',
    });
    expect(classifyPipelineError(new Error('request timed out')).reason).toBe('timeout');
    expect(classifyPipelineError(new Error('unauthorized API key')).reason).toBe('auth');
    expect(classifyPipelineError(new Error('rate limit')).reason).toBe('rate_limit');
    expect(classifyPipelineError(new Error('upstream 503')).reason).toBe('provider');
    expect(classifyPipelineError(new Error('mystery')).reason).toBe('unknown');
  });

  it('prefers the numeric status code and falls back across status fields', () => {
    expect(classifyPipelineError(Object.assign(new Error('x'), { statusCode: 429 })).statusCode).toBe(429);
    expect(classifyPipelineError(Object.assign(new Error('x'), { response: { status: 502 } })).statusCode).toBe(502);
  });

  it('treats a missing message as unknown', () => {
    expect(classifyPipelineError(new Error(''))).toMatchObject({ message: 'Unknown error', reason: 'unknown' });
  });
});
