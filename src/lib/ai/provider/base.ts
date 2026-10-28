import type {
  GenerateTextParams,
  GenerateObjectParams,
  StreamTextParams,
  AIProviderResult,
  ProviderId,
  FinishReason,
} from './types';
import type { ModelConfig } from './models';

/**
 * Shared finish-reason mapping for all OpenAI-compatible providers.
 * Extracted here so openai, nvidia and openrouter stay in sync instead of
 * each maintaining an identical copy.
 */
export function mapFinishReason(raw: string | null | undefined): FinishReason {
  if (!raw) return 'unknown';
  const l = raw.toLowerCase();
  if (l === 'stop') return 'stop';
  if (l === 'length') return 'length';
  if (l === 'content_filter') return 'content_filter';
  return 'other';
}

export interface AIProvider {
  readonly id: ProviderId;
  readonly name: string;
  readonly enabled: boolean;

  generateText(params: GenerateTextParams, model: ModelConfig): Promise<AIProviderResult>;
  generateObject(params: GenerateObjectParams, model: ModelConfig): Promise<AIProviderResult>;
  streamText(params: StreamTextParams, model: ModelConfig): ReadableStream<Uint8Array> | Promise<ReadableStream<Uint8Array>>;
  health(): Promise<{ ok: boolean; latency: number }>;
}