import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createOpenAI } = vi.hoisted(() => ({ createOpenAI: vi.fn(() => (modelId: string) => ({ modelId })) }));
vi.mock('@ai-sdk/openai', () => ({ createOpenAI }));

import { createAIClientFromResolvedRequest, initializeAIClient, resolveAIClient } from './ai-tools';
import type { ResolvedAIRequest } from '@/lib/ai/access-control';

const config = { model: 'openrouter/free', apiKeys: [] };

describe('AI client resolution', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OPENROUTER_API_KEY = 'server-key';
  });

  it('resolves a server OpenRouter key and creates the configured model client', () => {
    const result = resolveAIClient(config);

    expect(result.resolved).toMatchObject({
      providerId: 'openrouter', modelId: 'openrouter/free', apiKey: 'server-key',
      usedServerKey: true, requiresRateLimit: false,
    });
    expect(result.model).toEqual({ modelId: 'openrouter/free' });
    expect(createOpenAI).toHaveBeenCalledWith(expect.objectContaining({
      apiKey: 'server-key', baseURL: 'https://openrouter.ai/api/v1',
      compatibility: 'compatible',
    }));
  });

  it('requires a model config, a known model, and a server key', () => {
    expect(() => resolveAIClient()).toThrow('AI model is required');
    expect(() => resolveAIClient({ model: 'unknown-model', apiKeys: [] })).toThrow('Unknown model');
    delete process.env.OPENROUTER_API_KEY;
    expect(() => initializeAIClient(config)).toThrow('OpenRouter API key not configured');
  });

  it('rejects requests resolved to another provider', () => {
    const request = { providerId: 'anthropic' } as unknown as ResolvedAIRequest;
    expect(() => createAIClientFromResolvedRequest(request)).toThrow('Only OpenRouter is supported');
  });
});
