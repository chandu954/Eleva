import type { ModelConfig } from '../models';
import type { GenerateTextParams, GenerateObjectParams, StreamTextParams, AIProviderResult, FinishReason } from '../types';
import type { AIProvider } from '../base';
import { normalizeError } from '../errors';

const BASE_URL = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434';

async function ollamaGenerate(
  model: string,
  params: GenerateTextParams,
  maxTokens: number,
): Promise<{ content: string; finishReason: FinishReason; usage?: { promptTokens: number; completionTokens: number; totalTokens: number } }> {
  const messages: { role: string; content: string }[] = [];
  if (params.system) {
    messages.push({ role: 'system', content: params.system });
  }
  if (params.messages) {
    for (const m of params.messages) {
      messages.push({ role: m.role, content: m.content });
    }
  }
  if (params.prompt) {
    messages.push({ role: 'user', content: params.prompt });
  }

  const res = await fetch(`${BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages,
      options: {
        temperature: params.temperature ?? 0.7,
        num_predict: maxTokens,
      },
      stream: false,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw Object.assign(new Error(`Ollama returned ${res.status}: ${text}`), { statusCode: res.status });
  }

  const json = await res.json();
  const content = json.message?.content ?? '';
  const doneReason = json.done_reason ?? 'stop';

  const usage = json.eval_count ? {
    promptTokens: json.prompt_eval_count ?? 0,
    completionTokens: json.eval_count ?? 0,
    totalTokens: (json.prompt_eval_count ?? 0) + (json.eval_count ?? 0),
  } : undefined;

  return {
    content,
    finishReason: doneReason === 'stop' ? 'stop' : doneReason === 'length' ? 'length' : 'stop',
    usage,
  };
}

export const ollamaProvider: AIProvider = {
  id: 'ollama',
  name: 'Ollama (Local)',
  enabled: true,

  async generateText(params: GenerateTextParams, model: ModelConfig): Promise<AIProviderResult> {
    const start = performance.now();
    try {
      const ollamaModel = model.id.replace('ollama/', '');
      const maxTokens = params.maxTokens ?? Math.min(model.maxContext, 4096);
      const result = await ollamaGenerate(ollamaModel, params, maxTokens);

      const latency = Math.round(performance.now() - start);
      return {
        success: true, provider: 'ollama', model: model.id,
        latency, usage: result.usage,
        finishReason: result.finishReason, data: result.content,
      };
    } catch (err) {
      const latency = Math.round(performance.now() - start);
      const normalized = normalizeError('ollama', err);
      return {
        success: false, provider: 'ollama', model: model.id, latency,
        finishReason: 'error', data: null, error: normalized.message,
      };
    }
  },

  generateObject(params: GenerateObjectParams, model: ModelConfig): Promise<AIProviderResult> {
    const prompt = `${params.system ? `${params.system}\n\n` : ''}${params.prompt ?? ''}\n\nReturn ONLY valid JSON. No markdown, no preamble.`;
    return this.generateText({ ...params, prompt }, model).then((result) => {
      if (!result.success) return result;
      try {
        const data = typeof result.data === 'string' ? JSON.parse(result.data as string) : result.data;
        return { ...result, data };
      } catch {
        return {
          ...result, success: false, finishReason: 'error' as const,
          error: 'Schema validation failed: could not parse AI response as JSON', data: null,
        };
      }
    });
  },

  streamText(_params: StreamTextParams, _model: ModelConfig): ReadableStream<Uint8Array> | Promise<ReadableStream<Uint8Array>> { void _params; void _model; throw new Error('Streaming not yet implemented for Ollama'); },

  async health() {
    const start = performance.now();
    try {
      const res = await fetch(`${BASE_URL}/api/tags`, { method: 'GET', signal: AbortSignal.timeout(3000) });
      const ok = res.ok;
      return { ok, latency: Math.round(performance.now() - start) };
    } catch {
      return { ok: false, latency: Math.round(performance.now() - start) };
    }
  },
};