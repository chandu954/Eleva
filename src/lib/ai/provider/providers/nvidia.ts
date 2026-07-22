import OpenAI from 'openai';
import type { ModelConfig } from '../models';
import type { GenerateTextParams, GenerateObjectParams, StreamTextParams, AIProviderResult, FinishReason } from '../types';
import type { AIProvider } from '../base';
import { normalizeError } from '../errors';

const KV_KEY = 'NVIDIA_API_KEY';
const BASE_URL = 'https://integrate.api.nvidia.com/v1';

function getClient(): OpenAI {
  const key = process.env[KV_KEY];
  if (!key) throw new Error('NVIDIA_API_KEY not set');
  return new OpenAI({ baseURL: BASE_URL, apiKey: key });
}

function mapFinishReason(raw: string | null | undefined): FinishReason {
  if (!raw) return 'unknown';
  const l = raw.toLowerCase();
  if (l === 'stop') return 'stop';
  if (l === 'length') return 'length';
  if (l === 'content_filter') return 'content_filter';
  return 'other';
}

export const nvidiaProvider: AIProvider = {
  id: 'nvidia',
  name: 'NVIDIA NIM',
  enabled: !!process.env[KV_KEY],

  async generateText(params: GenerateTextParams, model: ModelConfig): Promise<AIProviderResult> {
    const start = performance.now();
    try {
      const client = getClient();
      const completion = await client.chat.completions.create({
        model: model.id.replace('nvidia/', ''),
        messages: [
          ...(params.system ? [{ role: 'system' as const, content: params.system }] : []),
          ...(params.messages ?? []),
          ...(params.prompt ? [{ role: 'user' as const, content: params.prompt }] : []),
        ],
        temperature: params.temperature ?? 0.7,
        max_tokens: params.maxTokens ?? model.maxContext,
        stream: false,
      });
      const latency = Math.round(performance.now() - start);
      const choice = completion.choices?.[0];
      return {
        success: true,
        provider: 'nvidia',
        model: model.id,
        latency,
        usage: completion.usage ? {
          promptTokens: completion.usage.prompt_tokens,
          completionTokens: completion.usage.completion_tokens,
          totalTokens: completion.usage.total_tokens,
        } : undefined,
        finishReason: mapFinishReason(choice?.finish_reason),
        data: choice?.message?.content ?? '',
      };
    } catch (err) {
      const latency = Math.round(performance.now() - start);
      const normalized = normalizeError('nvidia', err);
      return {
        success: false, provider: 'nvidia', model: model.id, latency,
        finishReason: 'error', data: null, error: normalized.message,
      };
    }
  },

  async generateObject(params: GenerateObjectParams, model: ModelConfig): Promise<AIProviderResult> {
    const prompt = `${params.system ? `${params.system}\n\n` : ''}${params.prompt ?? ''}\n\nReturn ONLY valid JSON matching the schema. No markdown, no preamble.`;
    const result = await this.generateText({ ...params, prompt }, model);
    if (!result.success) return result;
    try {
      const data = typeof result.data === 'string' ? JSON.parse(result.data as string) : result.data;
      return { ...result, data };
    } catch {
      return {
        ...result,
        success: false,
        finishReason: 'error',
        error: `Schema validation failed: could not parse AI response as JSON`,
        data: null,
      };
    }
  },

  streamText(_params: StreamTextParams, _model: ModelConfig): ReadableStream<Uint8Array> { void _params; void _model; throw new Error('Streaming not yet implemented for NVIDIA'); },

  async health() {
    const start = performance.now();
    try {
      getClient();
      return { ok: true, latency: Math.round(performance.now() - start) };
    } catch {
      return { ok: false, latency: Math.round(performance.now() - start) };
    }
  },
};