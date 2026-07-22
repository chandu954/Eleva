import { createOpenAI } from '@ai-sdk/openai';
import { LanguageModelV1 } from 'ai';
import { type AIConfig } from '@/lib/ai-models';
import {
  resolveAIRequest,
  type ResolvedAIRequest,
} from '@/lib/ai/access-control';

export type { ApiKey, AIConfig } from '@/lib/ai-models';

export function createAIClientFromResolvedRequest(
  resolved: ResolvedAIRequest
) {
  if (resolved.providerId !== 'openrouter') {
    throw new Error(`Only OpenRouter is supported. Got: ${resolved.providerId}`);
  }

  return createOpenAI({
    apiKey: resolved.apiKey,
    baseURL: 'https://openrouter.ai/api/v1',
    compatibility: 'compatible',
    headers: {
      'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL || 'https://eleva.app',
      'X-Title': 'Eleva',
    },
  })(resolved.modelId) as LanguageModelV1;
}

export function resolveAIClient(config?: AIConfig, isPro?: boolean) {
  if (!config) {
    throw new Error('AI model is required');
  }

  const resolved = resolveAIRequest({
    requestedModel: config.model,
    apiKeys: config.apiKeys ?? [],
    isPro: Boolean(isPro),
  });

  return {
    model: createAIClientFromResolvedRequest(resolved),
    resolved,
  };
}

export function initializeAIClient(config?: AIConfig, isPro?: boolean) {
  return resolveAIClient(config, isPro).model;
}
