import type { ModelConfig } from '../models';
import type { GenerateTextParams, GenerateObjectParams, StreamTextParams, AIProviderResult, FinishReason } from '../types';
import type { AIProvider } from '../base';
import { normalizeError } from '../errors';

const KV_KEY = 'GEMINI_API_KEY';
const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

async function geminiRequest(
  model: string,
  params: GenerateTextParams,
  maxTokens: number,
): Promise<{ content: string; finishReason: FinishReason; usage?: { promptTokens: number; completionTokens: number; totalTokens: number } }> {
  const key = process.env[KV_KEY];
  if (!key) throw new Error('GEMINI_API_KEY not set');

  const contents: { role: string; parts: { text: string }[] }[] = [];
  if (params.system) {
    contents.push({ role: 'user', parts: [{ text: `[System Instructions]\n${params.system}` }] });
  }
  if (params.messages) {
    for (const m of params.messages) {
      contents.push({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] });
    }
  }
  if (params.prompt) {
    contents.push({ role: 'user', parts: [{ text: params.prompt }] });
  }

  const url = `${BASE_URL}/${model}:generateContent?key=${key}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents,
      generationConfig: {
        temperature: params.temperature ?? 0.7,
        maxOutputTokens: maxTokens,
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw Object.assign(new Error(`Gemini returned ${res.status}: ${text}`), { statusCode: res.status });
  }

  const json = await res.json();
  const candidate = json.candidates?.[0];
  const content = candidate?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('') ?? '';
  const finish = candidate?.finishReason ?? 'unknown';

  const usageMap: Record<string, FinishReason> = {
    STOP: 'stop', MAX_TOKENS: 'length', SAFETY: 'content_filter', RECITATION: 'content_filter',
    OTHER: 'other',
  };
  const finishReason = usageMap[finish] ?? 'unknown';

  const usage = json.usageMetadata ? {
    promptTokens: json.usageMetadata.promptTokenCount ?? 0,
    completionTokens: json.usageMetadata.candidatesTokenCount ?? 0,
    totalTokens: (json.usageMetadata.promptTokenCount ?? 0) + (json.usageMetadata.candidatesTokenCount ?? 0),
  } : undefined;

  return { content, finishReason, usage };
}

export const geminiProvider: AIProvider = {
  id: 'gemini',
  name: 'Google Gemini',
  enabled: !!process.env[KV_KEY],

  async generateText(params: GenerateTextParams, model: ModelConfig): Promise<AIProviderResult> {
    const start = performance.now();
    try {
      const geminiModel = model.id.replace('gemini/', '');
      const maxTokens = params.maxTokens ?? Math.min(model.maxContext, 8192);
      const result = await geminiRequest(geminiModel, params, maxTokens);

      const latency = Math.round(performance.now() - start);
      return {
        success: true, provider: 'gemini', model: model.id,
        latency, usage: result.usage,
        finishReason: result.finishReason, data: result.content,
      };
    } catch (err) {
      const latency = Math.round(performance.now() - start);
      const normalized = normalizeError('gemini', err);
      return {
        success: false, provider: 'gemini', model: model.id, latency,
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

  streamText(_params: StreamTextParams, _model: ModelConfig): ReadableStream<Uint8Array> | Promise<ReadableStream<Uint8Array>> { void _params; void _model; throw new Error('Streaming not yet implemented for Gemini'); },

  async health() {
    const start = performance.now();
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env[KV_KEY]}`, { method: 'HEAD' });
      return { ok: res.ok, latency: Math.round(performance.now() - start) };
    } catch {
      return { ok: false, latency: Math.round(performance.now() - start) };
    }
  },
};