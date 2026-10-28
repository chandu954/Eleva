import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  generateObject: vi.fn(),
  getSubscriptionPlan: vi.fn(),
  withTaskModel: vi.fn((value: unknown) => value),
  startAIUsageRequest: vi.fn(),
  finishAIUsageRequest: vi.fn(),
}));

vi.mock('ai', () => ({ generateObject: mocks.generateObject }));
vi.mock('@/utils/actions/stripe/actions', () => ({ getSubscriptionPlan: mocks.getSubscriptionPlan }));
vi.mock('@/lib/ai/task-models', () => ({ withTaskModel: mocks.withTaskModel }));
vi.mock('@/lib/ai/usage-ledger', () => ({
  startAIUsageRequest: mocks.startAIUsageRequest,
  finishAIUsageRequest: mocks.finishAIUsageRequest,
}));

import { formatProfileWithAI } from './ai';

describe('formatProfileWithAI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSubscriptionPlan.mockResolvedValue({ plan: 'pro', id: 'user-1' });
    mocks.startAIUsageRequest.mockResolvedValue({ model: { model: 'mock-model' }, usageEventId: 'event-1', telemetry: { isEnabled: false } });
    mocks.finishAIUsageRequest.mockResolvedValue(undefined);
    mocks.generateObject.mockResolvedValue({ object: { content: { first_name: 'Ada', skills: [{ category: 'Languages', items: ['TS'] }] } }, usage: { promptTokens: 4, completionTokens: 2 } });
  });

  it('uses the structured extraction task and closes the usage event on success', async () => {
    await expect(formatProfileWithAI('Ada Lovelace, TypeScript')).resolves.toEqual({
      first_name: 'Ada', skills: [{ category: 'Languages', items: ['TS'] }],
    });
    expect(mocks.getSubscriptionPlan).toHaveBeenCalledWith(true);
    expect(mocks.withTaskModel).toHaveBeenCalledWith(expect.objectContaining({ task: 'structuredExtraction', isPro: true }));
    expect(mocks.generateObject).toHaveBeenCalledWith(expect.objectContaining({ prompt: expect.stringContaining('Ada Lovelace') }));
    expect(mocks.finishAIUsageRequest).toHaveBeenCalledWith(expect.objectContaining({ usageEventId: 'event-1', status: 'succeeded', usage: { promptTokens: 4, completionTokens: 2 } }));
  });

  it('uses the configured custom prompt and records a failed usage event before rethrowing', async () => {
    mocks.getSubscriptionPlan.mockResolvedValue({ plan: 'free', id: 'user-2' });
    mocks.generateObject.mockRejectedValue(new Error('provider timeout'));
    await expect(formatProfileWithAI('raw text', { customPrompts: { resumeFormatter: 'Extract strictly.' } } as never)).rejects.toThrow('provider timeout');
    expect(mocks.finishAIUsageRequest).toHaveBeenCalledWith(expect.objectContaining({ usageEventId: 'event-1', status: 'failed', errorCode: 'provider timeout' }));
  });
});
