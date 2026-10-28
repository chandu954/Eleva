// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  available: new Set<string>(['openai', 'anthropic', 'gemini']),
  providers: new Map<string, { generateText: ReturnType<typeof vi.fn>; generateObject: ReturnType<typeof vi.fn> }>(),
  retries: 0,
}));

vi.mock('./factory', () => ({
  isProviderAvailable: (id: string) => state.available.has(id),
  getProvider: (id: string) => state.providers.get(id),
}));

vi.mock('./retry', () => ({
  getMaxRetries: () => state.retries,
  shouldRetryError: () => false,
  shouldRetryResult: () => false,
  runWithRetry: async ({ run }: { run: () => Promise<unknown> }) => ({ value: await run(), retries: 0 }),
}));

import { getMetrics, routeGenerateText, routeObject } from './router';
import type { AIProviderResult, ProviderConfig } from './types';

const config: ProviderConfig = {
  selectedProvider: 'openai',
  selectedModel: 'openai/gpt-4o-mini',
  mode: 'single',
  fallbackEnabled: false,
};

const success = (data: unknown = 'generated'): AIProviderResult => ({
  success: true,
  provider: 'openai',
  model: config.selectedModel,
  latency: 4,
  finishReason: 'stop',
  data,
  usage: { promptTokens: 3, completionTokens: 2, totalTokens: 5 },
});

function provider(result: AIProviderResult) {
  return {
    generateText: vi.fn().mockResolvedValue(result),
    generateObject: vi.fn().mockResolvedValue(result),
  };
}

describe('AI provider router', () => {
  beforeEach(() => {
    state.available = new Set(['openai', 'anthropic', 'gemini']);
    state.providers.clear();
    state.providers.set('openai', provider(success()));
    state.providers.set('anthropic', provider({ ...success('fallback'), provider: 'anthropic' }));
    state.retries = 0;
  });

  it('rejects missing and unavailable providers before dispatch', async () => {
    await expect(routeGenerateText('resume-rewrite', { prompt: 'x' }, {
      ...config, selectedProvider: '' as ProviderConfig['selectedProvider'],
    })).rejects.toThrow(/No provider selected/);
    await expect(routeObject('resume-rewrite', { prompt: 'x' } as never, {
      ...config, selectedProvider: 'ollama',
    })).rejects.toThrow(/not available/);
  });

  it('uses the requested model, records metrics, and includes a trace', async () => {
    const result = await routeGenerateText('resume-rewrite', { prompt: 'rewrite' }, config);
    expect(result.success).toBe(true);
    expect(result.model).toBe(config.selectedModel);
    expect(result.trace).toMatchObject({ stage: 'resume-rewrite', provider: 'openai', success: true });
    expect(getMetrics().at(-1)).toMatchObject({ provider: 'openai', success: true, retries: 0 });
  });

  it('routes object generation and records token usage', async () => {
    const result = await routeObject('resume-rewrite', { prompt: 'extract' } as never, config);
    expect(result.success).toBe(true);
    expect(state.providers.get('openai')?.generateObject).toHaveBeenCalledOnce();
    expect(result.trace?.tokens).toEqual({ prompt: 3, completion: 2, total: 5 });
  });

  it('falls back after a provider exception when fallback is enabled', async () => {
    state.providers.get('openai')?.generateText.mockRejectedValueOnce(new Error('primary failed'));
    const result = await routeGenerateText('resume-rewrite', { prompt: 'rewrite' }, {
      ...config, fallbackEnabled: true,
    });
    expect(result.success).toBe(true);
    expect(result.provider).toBe('anthropic');
    expect(result.data).toBe('fallback');
  });

  it('returns a normalized failure when the provider throws and fallback is disabled', async () => {
    state.providers.get('openai')?.generateObject.mockRejectedValueOnce(new Error('provider offline'));
    const result = await routeObject('resume-rewrite', { prompt: 'extract' } as never, config);
    expect(result).toMatchObject({ success: false, error: 'provider offline', finishReason: 'error', data: null });
    expect(result.trace?.success).toBe(false);
  });

  it('uses the auto model when configured and provider results without usage get zero metric tokens', async () => {
    state.providers.set('openai', provider({ ...success(), usage: undefined }));
    const result = await routeGenerateText('resume-rewrite', { prompt: 'rewrite' }, {
      ...config, selectedModel: '', mode: 'auto',
    });
    expect(result.success).toBe(true);
    expect(getMetrics().at(-1)?.tokens).toEqual({ prompt: 0, completion: 0, total: 0 });
  });
});
