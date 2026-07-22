import type {
  GenerateTextParams,
  GenerateObjectParams,
  StreamTextParams,
  AIProviderResult,
  ProviderId,
} from './types';
import type { ModelConfig } from './models';

export interface AIProvider {
  readonly id: ProviderId;
  readonly name: string;
  readonly enabled: boolean;

  generateText(params: GenerateTextParams, model: ModelConfig): Promise<AIProviderResult>;
  generateObject(params: GenerateObjectParams, model: ModelConfig): Promise<AIProviderResult>;
  streamText(params: StreamTextParams, model: ModelConfig): ReadableStream<Uint8Array> | Promise<ReadableStream<Uint8Array>>;
  health(): Promise<{ ok: boolean; latency: number }>;
}