import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getSubscriptionPlan: vi.fn(),
  startAIUsageRequest: vi.fn(),
  finishAIUsageRequest: vi.fn(),
  streamText: vi.fn(),
  createStreamableValue: vi.fn(),
}));
vi.mock('@/utils/actions/stripe/actions', () => ({ getSubscriptionPlan: mocks.getSubscriptionPlan }));
vi.mock('@/lib/ai/usage-ledger', () => ({
  startAIUsageRequest: mocks.startAIUsageRequest,
  finishAIUsageRequest: mocks.finishAIUsageRequest,
}));
vi.mock('ai', async (importOriginal) => ({ ...(await importOriginal<typeof import('ai')>()), streamText: mocks.streamText }));
vi.mock('ai/rsc', () => ({ createStreamableValue: mocks.createStreamableValue }));

import { generate } from './actions';

const usage = { promptTokens: 12, completionTokens: 34, totalTokens: 46 };

describe('cover letter generation action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSubscriptionPlan.mockResolvedValue({ plan: 'pro', id: 'user-1' });
    mocks.startAIUsageRequest.mockResolvedValue({
      model: { modelId: 'mock' }, usageEventId: 'usage-1', telemetry: { isEnabled: true },
    });
    mocks.finishAIUsageRequest.mockResolvedValue(undefined);
    mocks.createStreamableValue.mockReturnValue({ value: 'stream-result', update: vi.fn(), done: vi.fn() });
    mocks.streamText.mockImplementation(({ onFinish }: { onFinish: (event: { usage: typeof usage }) => Promise<void> }) => ({
      textStream: (async function* () {
        yield 'Hello';
        yield ' world';
        await onFinish({ usage });
      })(),
    }));
  });

  it('streams output and records the successful usage event', async () => {
    const result = await generate('Write a cover letter', { model: 'openrouter/free', apiKeys: [] });

    expect(result).toEqual({ output: 'stream-result' });
    expect(mocks.startAIUsageRequest).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'user-1', route: 'actions.coverLetter.generate', isPro: true,
    }));
    await vi.waitFor(() => expect(mocks.finishAIUsageRequest).toHaveBeenCalledWith({
      usageEventId: 'usage-1', status: 'succeeded', usage,
    }));
  });

  it('reports setup failures to the caller', async () => {
    mocks.getSubscriptionPlan.mockRejectedValueOnce(new Error('billing unavailable'));
    await expect(generate('Write a cover letter')).rejects.toThrow('billing unavailable');
  });
});
