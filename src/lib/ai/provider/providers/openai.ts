import OpenAI from 'openai';
import type { ModelConfig } from '../models';
import type { GenerateTextParams, GenerateObjectParams, StreamTextParams, AIProviderResult, FinishReason } from '../types';
import type { AIProvider } from '../base';
import { normalizeError } from '../errors';

const KV_KEY = 'OPENAI_API_KEY';

function getClient(): OpenAI {
  const key = process.env[KV_KEY];
  if (!key) throw new Error('OPENAI_API_KEY not set');
  return new OpenAI({ apiKey: key });
}

function mapFinishReason(raw: string | null | undefined): FinishReason {
  if (!raw) return 'unknown';
  const l = raw.toLowerCase();
  if (l === 'stop') return 'stop';
  if (l === 'length') return 'length';
  if (l === 'content_filter') return 'content_filter';
  return 'other';
}

async function openAICompletion(
  client: OpenAI,
  model: string,
  params: GenerateTextParams,
  maxTokens: number,
): Promise<{ content: string; finishReason: FinishReason; usage?: { promptTokens: number; completionTokens: number; totalTokens: number } }> {
  const completion = await client.chat.completions.create({
    model,
    messages: [
      ...(params.system ? [{ role: 'system' as const, content: params.system }] : []),
      ...(params.messages ?? []),
      ...(params.prompt ? [{ role: 'user' as const, content: params.prompt }] : []),
    ],
    temperature: params.temperature ?? 0.7,
    max_tokens: maxTokens,
    stream: false,
  });

  const choice = completion.choices?.[0];
  return {
    content: choice?.message?.content ?? '',
    finishReason: mapFinishReason(choice?.finish_reason),
    usage: completion.usage ? {
      promptTokens: completion.usage.prompt_tokens,
      completionTokens: completion.usage.completion_tokens,
      totalTokens: completion.usage.total_tokens,
    } : undefined,
  };
}

export const openAIProvider: AIProvider = {
  id: 'openai',
  name: 'OpenAI',
  enabled: !!process.env[KV_KEY],

  async generateText(params: GenerateTextParams, model: ModelConfig): Promise<AIProviderResult> {
    const start = performance.now();
    try {
      const client = getClient();
      const maxTokens = params.maxTokens ?? Math.min(model.maxContext, 4096);
      const result = await openAICompletion(client, model.id, params, maxTokens);
      const latency = Math.round(performance.now() - start);
      return {
        success: true, provider: 'openai', model: model.id,
        latency, usage: result.usage,
        finishReason: result.finishReason, data: result.content,
      };
    } catch (err) {
      const latency = Math.round(performance.now() - start);
      const normalized = normalizeError('openai', err);
      return {
        success: false, provider: 'openai', model: model.id, latency,
        finishReason: 'error', data: null, error: normalized.message,
      };
    }
  },

  async generateObject(params: GenerateObjectParams, model: ModelConfig): Promise<AIProviderResult> {
    const prompt = `${params.system ? `${params.system}\n\n` : ''}${params.prompt ?? ''}\n\nReturn ONLY valid JSON. No markdown, no preamble.`;
    const result = await this.generateText({ ...params, prompt }, model);
    if (!result.success) return result;
    try {
      const data = typeof result.data === 'string' ? JSON.parse(result.data as string) : result.data;
      return { ...result, data };
    } catch {
      return { ...result, success: false, finishReason: 'error' as const, error: 'Schema validation failed: could not parse AI response as JSON', data: null };
    }
  },

  streamText(_params: StreamTextParams, _model: ModelConfig): ReadableStream<Uint8Array> { void _params; void _model; throw new Error('Streaming not yet implemented for OpenAI'); },

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
