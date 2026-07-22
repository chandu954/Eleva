import type { ModelConfig } from '../models';
import type { GenerateTextParams, GenerateObjectParams, StreamTextParams, AIProviderResult, FinishReason } from '../types';
import type { AIProvider } from '../base';
import { normalizeError, AuthenticationError } from '../errors';

const KV_KEY = 'ANTHROPIC_API_KEY';
const BASE_URL = 'https://api.anthropic.com/v1';

async function anthropicCompletion(
  model: string,
  params: GenerateTextParams,
  maxTokens: number,
): Promise<{ content: string; finishReason: FinishReason; usage?: { promptTokens: number; completionTokens: number; totalTokens: number } }> {
  const key = process.env[KV_KEY];
  if (!key) throw new AuthenticationError('anthropic');

  const messages: { role: 'user' | 'assistant'; content: string }[] = [];
  if (params.messages) {
    for (const m of params.messages) {
      if (m.role !== 'system') {
        messages.push({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content });
      }
    }
  }
  if (params.prompt) {
    messages.push({ role: 'user', content: params.prompt });
  }

  const system = params.system;

  const body: Record<string, unknown> = {
    model,
    max_tokens: maxTokens,
    messages: messages.length > 0 ? messages : [{ role: 'user', content: 'Hello' }],
    temperature: params.temperature ?? 0.7,
  };
  if (system) body.system = system;

  const res = await fetch(`${BASE_URL}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw Object.assign(new Error(`Anthropic returned ${res.status}: ${text}`), { statusCode: res.status });
  }

  const json = await res.json();
  const content = json.content?.map((c: { text?: string }) => c.text ?? '').join('') ?? '';
  const finishMap: Record<string, FinishReason> = {
    end_turn: 'stop', max_tokens: 'length', stop_sequence: 'stop',
    tool_use: 'tool_calls', error: 'error',
  };
  const finishReason = finishMap[json.stop_reason ?? ''] ?? 'unknown';

  const usage = json.usage ? {
    promptTokens: json.usage.input_tokens ?? 0,
    completionTokens: json.usage.output_tokens ?? 0,
    totalTokens: (json.usage.input_tokens ?? 0) + (json.usage.output_tokens ?? 0),
  } : undefined;

  return { content, finishReason, usage };
}

export const anthropicProvider: AIProvider = {
  id: 'anthropic',
  name: 'Anthropic Claude',
  enabled: !!process.env[KV_KEY],

  async generateText(params: GenerateTextParams, model: ModelConfig): Promise<AIProviderResult> {
    const start = performance.now();
    try {
      const maxTokens = params.maxTokens ?? Math.min(model.maxContext, 4096);
      const result = await anthropicCompletion(model.id, params, maxTokens);
      const latency = Math.round(performance.now() - start);
      return {
        success: true, provider: 'anthropic', model: model.id,
        latency, usage: result.usage,
        finishReason: result.finishReason, data: result.content,
      };
    } catch (err) {
      const latency = Math.round(performance.now() - start);
      const normalized = normalizeError('anthropic', err);
      return {
        success: false, provider: 'anthropic', model: model.id, latency,
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

  streamText(_params: StreamTextParams, _model: ModelConfig): ReadableStream<Uint8Array> | Promise<ReadableStream<Uint8Array>> { void _params; void _model; throw new Error('Streaming not yet implemented for Anthropic'); },

  async health() {
    const start = performance.now();
    try {
      const key = process.env[KV_KEY];
      if (!key) throw new Error('ANTHROPIC_API_KEY not set');
      const res = await fetch(`${BASE_URL}/models`, {
        headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      });
      return { ok: res.ok, latency: Math.round(performance.now() - start) };
    } catch {
      return { ok: false, latency: Math.round(performance.now() - start) };
    }
  },
};
