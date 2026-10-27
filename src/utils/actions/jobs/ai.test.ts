// @vitest-environment node
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/utils/actions/stripe/actions', () => ({
  getSubscriptionPlan: vi.fn(),
}));

vi.mock('@/lib/ai/usage-ledger', () => ({
  startAIUsageRequest: vi.fn(),
  finishAIUsageRequest: vi.fn(),
}));

vi.mock('ai', async (importOriginal) => {
  const actual = await importOriginal<typeof import('ai')>();
  return {
    ...actual,
    generateObject: vi.fn(),
  };
});

import { generateObject } from 'ai';
import { finishAIUsageRequest, startAIUsageRequest } from '@/lib/ai/usage-ledger';
import { getSubscriptionPlan } from '@/utils/actions/stripe/actions';
import { getTaskModel } from '@/lib/ai/task-models';
import type { AIConfig } from '@/lib/ai-models';
import { formatJobListing, tailorResumeToJob } from './ai';

const mockGenerateObject = vi.mocked(generateObject);
const mockStartAIUsageRequest = vi.mocked(startAIUsageRequest);
const mockFinishAIUsageRequest = vi.mocked(finishAIUsageRequest);
const mockGetSubscriptionPlan = vi.mocked(getSubscriptionPlan);

const FALLBACK_MODELS = [
  'gpt-5.4-mini',
  'gpt-5.4-nano',
  'z-ai/glm-4.6:exacto',
  'openai/gpt-oss-120b',
  'openai/gpt-oss-20b',
  'deepseek/deepseek-v3.2:nitro',
];

const usage = { promptTokens: 10, completionTokens: 5, totalTokens: 15 };

const resume = {
  id: 'resume-1',
  first_name: 'Ada',
  last_name: 'Lovelace',
  work_experience: [],
  education: [],
  skills: [],
  projects: [],
} as never;

const jobListing = {
  company_name: 'Acme',
  position_title: 'Staff Engineer',
  job_url: 'https://acme.example/jobs/1',
  description: 'Build things',
} as never;

const tailoredResume = {
  target_role: 'Staff Engineer',
  work_experience: [],
  education: [],
  skills: [],
  projects: [],
};

const formattedJob = {
  company_name: 'Acme',
  position_title: 'Staff Engineer',
  keywords: ['TypeScript'],
  work_location: 'remote',
  employment_type: 'full_time',
  is_active: true,
};

function candidateModels(task: 'jobTailoring' | 'structuredExtraction', isPro: boolean) {
  return [getTaskModel(task, isPro), ...FALLBACK_MODELS];
}

function startModels() {
  return mockStartAIUsageRequest.mock.calls.map(([input]) => input.config?.model);
}

const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

afterAll(() => {
  consoleError.mockRestore();
});

describe('job AI actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    consoleError.mockClear();

    mockGetSubscriptionPlan.mockResolvedValue({ plan: 'pro', id: 'user-1' });
    mockStartAIUsageRequest.mockImplementation(async () => ({
      model: { modelId: 'mock-model' },
      usageEventId: 'usage-1',
      telemetry: { isEnabled: true },
    }) as never);
    mockFinishAIUsageRequest.mockResolvedValue(undefined);

    mockGenerateObject.mockReset();
    mockGenerateObject.mockResolvedValue({
      object: { content: tailoredResume },
      usage,
    } as never);
  });

  it('tailors a resume and records a successful usage event', async () => {
    const result = await tailorResumeToJob(resume, jobListing);

    expect(result).toEqual(tailoredResume);
    expect(mockGetSubscriptionPlan).toHaveBeenCalledWith(true);
    expect(mockStartAIUsageRequest).toHaveBeenCalledWith({
      route: 'actions.jobs.tailorResumeToJob',
      userId: 'user-1',
      isPro: true,
      config: expect.objectContaining({
        model: candidateModels('jobTailoring', true)[0],
        apiKeys: [],
      }),
      useThinking: true,
    });
    expect(mockFinishAIUsageRequest).toHaveBeenCalledWith({
      usageEventId: 'usage-1',
      status: 'succeeded',
      usage,
    });

    const call = mockGenerateObject.mock.calls[0][0];
    expect(call).toMatchObject({
      model: { modelId: 'mock-model' },
      maxRetries: 2,
      experimental_telemetry: { isEnabled: true },
    });
    expect(call.system).toContain('Eleva');
    expect(call.system).toContain('ATS-friendly');
    expect(call.prompt).toContain('This is the Resume');
    expect(call.prompt).toContain(JSON.stringify(resume, null, 2));
    expect(call.prompt).toContain(JSON.stringify(jobListing, null, 2));
  });

  it('formats a job listing with the structured-extraction task model', async () => {
    mockGenerateObject.mockResolvedValue({
      object: { content: formattedJob },
      usage,
    } as never);

    const result = await formatJobListing('Acme is hiring a Staff Engineer');

    expect(result).toEqual(formattedJob);
    expect(mockStartAIUsageRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        route: 'actions.jobs.formatJobListing',
        userId: 'user-1',
        isPro: true,
        useThinking: true,
      }),
    );
    expect(startModels()).toEqual([getTaskModel('structuredExtraction', true)]);

    const call = mockGenerateObject.mock.calls[0][0];
    expect(call.system).toContain('structured data extraction');
    expect(call.prompt).toContain('FORMAT THE FOLLOWING JOB LISTING');
    expect(call.prompt).toContain('Acme is hiring a Staff Engineer');
    expect(mockFinishAIUsageRequest).toHaveBeenCalledWith({
      usageEventId: 'usage-1',
      status: 'succeeded',
      usage,
    });
  });

  it('runs free-plan users without thinking mode and without inventing custom prompts', async () => {
    mockGetSubscriptionPlan.mockResolvedValue({ plan: 'free', id: 'user-2' });

    await tailorResumeToJob(resume, jobListing);

    const [input] = mockStartAIUsageRequest.mock.calls[0];
    expect(input).toMatchObject({
      userId: 'user-2',
      isPro: false,
      useThinking: false,
    });
    expect(input.config).not.toHaveProperty('customPrompts');
  });

  it('falls back through the cheaper models when the primary model fails', async () => {
    mockGenerateObject
      .mockRejectedValueOnce(new Error('primary down'))
      .mockRejectedValueOnce(new Error('fallback down'))
      .mockResolvedValueOnce({ object: { content: tailoredResume }, usage } as never);

    const result = await tailorResumeToJob(resume, jobListing);

    expect(result).toEqual(tailoredResume);
    expect(mockGenerateObject).toHaveBeenCalledTimes(3);
    expect(startModels()).toEqual(candidateModels('jobTailoring', true).slice(0, 3));

    expect(mockFinishAIUsageRequest.mock.calls.map(([input]) => input.status)).toEqual([
      'failed',
      'failed',
      'succeeded',
    ]);
    expect(mockFinishAIUsageRequest.mock.calls[0][0]).toMatchObject({
      status: 'failed',
      errorCode: 'primary down',
    });
    expect(mockFinishAIUsageRequest.mock.calls[1][0]).toMatchObject({
      status: 'failed',
      errorCode: 'fallback down',
    });
    expect(
      consoleError.mock.calls.some(([message]) =>
        String(message).includes('[TAILOR][FAILED')),
    ).toBe(true);
  });

  it('throws the last error after every tailoring candidate fails', async () => {
    mockGenerateObject.mockRejectedValue(new Error('all models down'));

    await expect(tailorResumeToJob(resume, jobListing)).rejects.toThrow('all models down');

    expect(mockGenerateObject).toHaveBeenCalledTimes(FALLBACK_MODELS.length + 1);
    expect(startModels()).toEqual(candidateModels('jobTailoring', true));
    expect(mockFinishAIUsageRequest).toHaveBeenCalledTimes(FALLBACK_MODELS.length + 1);
    expect(
      mockFinishAIUsageRequest.mock.calls.every(([input]) => input.status === 'failed'),
    ).toBe(true);
    expect(
      consoleError.mock.calls.some(([message]) =>
        String(message).includes('[TAILOR][ABORT')),
    ).toBe(true);
  });

  it('falls back after a format failure and records the failed attempt', async () => {
    mockGenerateObject
      .mockRejectedValueOnce(new Error('format primary down'))
      .mockResolvedValueOnce({ object: { content: formattedJob }, usage } as never);

    const result = await formatJobListing('raw listing');

    expect(result).toEqual(formattedJob);
    expect(startModels()).toEqual(candidateModels('structuredExtraction', true).slice(0, 2));
    expect(mockFinishAIUsageRequest.mock.calls.map(([input]) => input.status)).toEqual([
      'failed',
      'succeeded',
    ]);
    expect(
      consoleError.mock.calls.some(([message]) =>
        String(message).includes('[FORMAT][FAILED')),
    ).toBe(true);
  });

  it('uses a generic error code for non-Error failures and rethrows the original value', async () => {
    mockGenerateObject.mockImplementation(() => Promise.reject('network exploded'));

    await expect(formatJobListing('raw listing')).rejects.toBe('network exploded');

    expect(mockFinishAIUsageRequest).toHaveBeenCalledTimes(FALLBACK_MODELS.length + 1);
    expect(mockFinishAIUsageRequest.mock.calls[0][0]).toMatchObject({
      status: 'failed',
      errorCode: 'ai_request_failed',
    });
    expect(
      consoleError.mock.calls.some(([message]) =>
        String(message).includes('[FORMAT][ABORT')),
    ).toBe(true);
  });

  it.each([
    [
      'tailoring',
      () => tailorResumeToJob(resume, jobListing),
      'Failed to tailor resume',
    ],
    [
      'formatting',
      () => formatJobListing('raw listing'),
      'Failed to format job listing',
    ],
  ])(
    'falls back to a descriptive error when %s rejects with undefined',
    async (_label, run, expectedMessage) => {
      mockGenerateObject.mockImplementation(() => Promise.reject(undefined));

      await expect(run()).rejects.toThrow(expectedMessage);

      expect(mockFinishAIUsageRequest.mock.calls[0][0]).toMatchObject({
        status: 'failed',
        errorCode: 'ai_request_failed',
      });
      expect(
        consoleError.mock.calls.some(([message]) =>
          String(message).includes('Unknown error')),
      ).toBe(true);
    },
  );

  it('preserves user API keys and custom prompts across primary and fallback candidates', async () => {
    const config: AIConfig = {
      model: 'user/selected-model',
      apiKeys: [{ service: 'openrouter', key: 'user-key', addedAt: '2026-01-01' }],
      customPrompts: { textAnalyzer: 'Be precise.' },
    };
    mockGenerateObject
      .mockRejectedValueOnce(new Error('retry'))
      .mockResolvedValueOnce({ object: { content: tailoredResume }, usage } as never);

    await tailorResumeToJob(resume, jobListing, config);

    const configs = mockStartAIUsageRequest.mock.calls.map(([input]) => input.config);
    expect(configs).toHaveLength(2);
    for (const candidate of configs) {
      expect(candidate).toMatchObject({
        apiKeys: config.apiKeys,
        customPrompts: config.customPrompts,
      });
    }
    // The task model wins over the user-selected model (withTaskModel contract).
    expect(configs[0]).toMatchObject({ model: candidateModels('jobTailoring', true)[0] });
    expect(configs[1]).toMatchObject({ model: FALLBACK_MODELS[0] });
  });
});
