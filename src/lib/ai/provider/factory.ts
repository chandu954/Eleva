import type { AIProvider } from './base';
import { openAIProvider } from './providers/openai';
import { anthropicProvider } from './providers/anthropic';
import { nvidiaProvider } from './providers/nvidia';
import { openRouterProvider } from './providers/openrouter';
import { geminiProvider } from './providers/gemini';
import { ollamaProvider } from './providers/ollama';
import type { ProviderId } from './types';

export const providers: Record<string, AIProvider> = {
  openai: openAIProvider,
  anthropic: anthropicProvider,
  nvidia: nvidiaProvider,
  openrouter: openRouterProvider,
  gemini: geminiProvider,
  ollama: ollamaProvider,
};

export function getProvider(id: string): AIProvider | undefined {
  return providers[id as ProviderId];
}

export function getEnabledProviders(): AIProvider[] {
  return Object.values(providers).filter((p) => p.enabled);
}

export function isProviderAvailable(id: ProviderId): boolean {
  const p = providers[id];
  return p !== undefined && p.enabled;
}
