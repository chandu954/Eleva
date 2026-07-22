import type { ProviderConfig, ProviderId, ProviderMode } from './types';

export const PROVIDER_COOKIE_NAME = 'eleva-ai-provider';

/**
 * Decode the ProviderSelector's encoded selection string into a ProviderConfig.
 *
 * Supported formats:
 *   "__eleva_global_auto__"          → null (use server default)
 *   "openrouter:__provider_auto__"   → { provider: openrouter, mode: auto }
 *   "openai:gpt-4.1-2025-04-14"      → { provider: openai, model: openai/gpt-4.1, mode: single }
 */
export function decodeProviderCookie(cookieValue: string | undefined | null): ProviderConfig | null {
  if (!cookieValue) return null;

  const GLOBAL_AUTO = '__eleva_global_auto__';
  const PROVIDER_AUTO = '__provider_auto__';

  if (cookieValue === GLOBAL_AUTO) return null;

  const colonIdx = cookieValue.indexOf(':');
  if (colonIdx < 0) return null;

  const provider = cookieValue.slice(0, colonIdx) as ProviderId;
  const modelOrAuto = cookieValue.slice(colonIdx + 1);
  const isAuto = modelOrAuto === PROVIDER_AUTO;

  return {
    selectedProvider: provider,
    selectedModel: isAuto ? '' : modelOrAuto,
    mode: isAuto ? 'auto' as ProviderMode : 'single' as ProviderMode,
    fallbackEnabled: false,
  };
}

/**
 * Encode a ProviderConfig into the selector's cookie format.
 */
export function encodeProviderCookie(config: ProviderConfig): string {
  if (config.mode === 'auto' && !config.selectedModel) {
    return `${config.selectedProvider}:__provider_auto__`;
  }
  return `${config.selectedProvider}:${config.selectedModel}`;
}
