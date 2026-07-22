import OpenAI from 'openai';
import type { ModelConfig } from '../models';
import type { GenerateTextParams, GenerateObjectParams, StreamTextParams, AIProviderResult, FinishReason } from '../types';
import type { AIProvider } from '../base';
import { normalizeError, ProviderBusyError } from '../errors';

const KV_KEY = 'OPENROUTER_API_KEY';
const BASE_URL = 'https://openrouter.ai/api/v1';

function getClient(): OpenAI {
  const key = process.env[KV_KEY];
  if (!key) throw new Error('OPENROUTER_API_KEY not set');
  return new OpenAI({
    baseURL: BASE_URL,
    apiKey: key,
    defaultHeaders: {
      'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'https://eleva.app',
      'X-Title': 'Eleva',
    },
  });
}

const OR_MODEL_MAP: Record<string, string> = {
  'openrouter/qwen-235b': 'qwen/qwen3-235b-a22b',
  'openrouter/deepseek-v3': 'deepseek/deepseek-v3',
  'openrouter/gemini-2.5-flash': 'google/gemini-2.5-flash',
  'openrouter/llama-3.3-70b': 'meta-llama/llama-3.3-70b-instruct',
  'openrouter/mistral-large': 'mistralai/mistral-large',
};

function mapFinishReason(raw: string | null | undefined): FinishReason {
  if (!raw) return 'unknown';
  const l = raw.toLowerCase();
  if (l === 'stop') return 'stop';
  if (l === 'length') return 'length';
  if (l === 'content_filter') return 'content_filter';
  return 'other';
}

async function openRouterCompletion(
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
  const content = choice?.message?.content ?? '';

  return {
    content,
    finishReason: mapFinishReason(choice?.finish_reason),
    usage: completion.usage ? {
      promptTokens: completion.usage.prompt_tokens,
      completionTokens: completion.usage.completion_tokens,
      totalTokens: completion.usage.total_tokens,
    } : undefined,
  };
}

export const openRouterProvider: AIProvider = {
  id: 'openrouter',
  name: 'OpenRouter',
  enabled: !!process.env[KV_KEY],

  async generateText(params: GenerateTextParams, model: ModelConfig): Promise<AIProviderResult> {
    const start = performance.now();
    try {
      const client = getClient();
      const orModel = OR_MODEL_MAP[model.id] ?? model.id.replace('openrouter/', '');
      const maxTokens = params.maxTokens ?? Math.min(model.maxContext, 4096);

      const result = await openRouterCompletion(client, orModel, params, maxTokens);

      const latency = Math.round(performance.now() - start);
      return {
        success: true,
        provider: 'openrouter',
        model: model.id,
        latency,
        usage: result.usage,
        finishReason: result.finishReason,
        data: result.content,
      };
    } catch (err) {
      const latency = Math.round(performance.now() - start);
      const normalized = normalizeError('openrouter', err);

      if (normalized.statusCode === 429) {
        let retryAfter: number | undefined;
        if (err && typeof err === 'object' && 'headers' in err) {
          const h = (err as { headers?: Record<string, string> }).headers;
          retryAfter = h ? parseInt(h['retry-after-ms'] ?? h['Retry-After'] ?? '2000', 10) : undefined;
        }
        throw new ProviderBusyError('openrouter', retryAfter);
      }

      return {
        success: false, provider: 'openrouter', model: model.id, latency,
        finishReason: 'error', data: null, error: normalized.message,
      };
    }
  },

  async generateObject(params: GenerateObjectParams, model: ModelConfig): Promise<AIProviderResult> {
    const result = await this.generateText(params, model);
    if (!result.success) return result;
    try {
      const data = typeof result.data === 'string' ? JSON.parse(result.data as string) : result.data;
      return { ...result, data };
    } catch {
      return {
        ...result,
        success: false,
        finishReason: 'error',
        error: 'Schema validation failed: could not parse AI response as JSON',
        data: null,
      };
    }
  },

  streamText(_params: StreamTextParams, _model: ModelConfig): ReadableStream<Uint8Array> { void _params; void _model; throw new Error('Streaming not yet implemented for OpenRouter'); },

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