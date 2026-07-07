/**
 * Eleva AI Provider — Centralized AI Service
 * 
 * Single entry point for ALL AI functionality in Eleva.
 * Uses OpenRouter exclusively with automatic free model fallback chain.
 * 
 * CRITICAL REQUIREMENT: 100% free AI with only OpenRouter free models
 * Free model priority:
 * 1. qwen/qwen3-235b-a22b:free
 * 2. deepseek/deepseek-r1:free
 * 3. google/gemma-3-27b-it:free
 * 4. meta-llama/llama-3.3-70b-instruct:free
 * 
 * Pro models are DISABLED. All features must work with free models only.
 */

import {
  streamText as vercelStreamText,
  generateText as vercelGenerateText,
  generateObject as vercelGenerateObject,
  type LanguageModelV1,
  type CoreMessage,
} from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';

// ─── Configuration ───────────────────────────────────────────────────────────

/**
 * Free-only model chain.
 * NOTE: Some OpenRouter "free" slugs may later be marked unavailable for free access.
 * Keep this chain limited to models that reliably work in free mode.
 */
export const FREE_MODEL_CHAIN = [
  'qwen/qwen3-235b-a22b:free',
  'deepseek/deepseek-r1:free',
  'meta-llama/llama-3.3-70b-instruct:free',
] as const;

export const PRO_MODEL_CHAIN: readonly string[] = []; // Pro models disabled per requirement

export type AIModelId = string;

export interface AIProviderConfig {
  /** User's subscription plan — Hard requirement: always 'free' */
  plan?: 'free' | string;
  /** Custom model override (must be an OpenRouter free model ID) */
  model?: AIModelId;
  /** Hard requirement: forcePro is ignored and disabled */
  forcePro?: boolean;
  /** Request timeout in ms (default: 30000) */
  timeout?: number;
  /** Maximum retries on failure (default: 3 per spec) */
  maxRetries?: number;
  /** Enable in-memory caching for identical requests (default: true) */
  cache?: boolean;
}

export interface GenerateTextParams {
  system?: string;
  prompt?: string;
  messages?: CoreMessage[];
  temperature?: number;
  maxTokens?: number;
  config?: AIProviderConfig;
}

export interface GenerateObjectParams<T> {
  system?: string;
  prompt?: string;
  schema: z.ZodType<T>;
  temperature?: number;
  maxTokens?: number;
  config?: AIProviderConfig;
}

export interface StreamTextParams {
  system?: string;
  prompt?: string;
  messages?: CoreMessage[];
  temperature?: number;
  maxTokens?: number;
  config?: AIProviderConfig;
}

export interface AIProviderResult {
  text: string;
  model: string;
  finishReason?: string;
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
  latency: number;
}

// ─── Internal State ──────────────────────────────────────────────────────────

let openrouterClient: ReturnType<typeof createOpenAI> | null = null;

const KEY = process.env.OPENROUTER_API_KEY;

if (!KEY) {
  console.warn('[Eleva AI] OPENROUTER_API_KEY missing — AI calls will fail.');
}

function getClient() {
  if (!openrouterClient) {
    openrouterClient = createOpenAI({
      apiKey: KEY || 'MISSING',
      baseURL: 'https://openrouter.ai/api/v1',
      compatibility: 'compatible',
      headers: {
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'https://eleva.app',
        'X-Title': 'Eleva',
      },
    });
  }
  return openrouterClient;
}

function getModel(modelId: string): LanguageModelV1 {
  return getClient()(modelId) as unknown as LanguageModelV1;
}

function isFreeModel(modelId: string): modelId is (typeof FREE_MODEL_CHAIN)[number] {
  return (FREE_MODEL_CHAIN as readonly string[]).includes(modelId);
}

function normalizeToFreeModel(config?: AIProviderConfig): string {
  if (config?.model && isFreeModel(config.model)) return config.model;
  // Spec: Pro models disabled; ignore plan/forcePro and always use free chain.
  return FREE_MODEL_CHAIN[0];
}

function getModelChain(config?: AIProviderConfig): readonly string[] {
  if (config?.model && isFreeModel(config.model)) return [config.model];
  return FREE_MODEL_CHAIN;
}

function selectModel(config?: AIProviderConfig): string {
  return normalizeToFreeModel(config);
}

// ─── Simple In-Memory Cache ──────────────────────────────────────────────────

const responseCache = new Map<string, { result: AIProviderResult; expiresAt: number }>();

function cacheKey(system: string, prompt: string, model: string, temp?: number): string {
  return `${model}:${temp ?? 0.7}:${system.slice(0, 200)}:${prompt.slice(0, 500)}`;
}

function getCached(key: string): AIProviderResult | null {
  const entry = responseCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    responseCache.delete(key);
    return null;
  }
  return entry.result;
}

function setCache(key: string, result: AIProviderResult, ttlMs = 60000) {
  responseCache.set(key, { result, expiresAt: Date.now() + ttlMs });
  if (responseCache.size > 500) {
    const firstKey = responseCache.keys().next().value;
    if (firstKey) responseCache.delete(firstKey);
  }
}

// ─── Logging ─────────────────────────────────────────────────────────────────

export type AILogEntry = {
  level: 'info' | 'warn' | 'error';
  message: string;
  model: string;
  latencyMs: number;
  tokens?: { prompt: number; completion: number; total: number };
  error?: string;
  timestamp: string;
};

const logListeners: Array<(entry: AILogEntry) => void> = [];

export function onAILog(cb: (entry: AILogEntry) => void) {
  logListeners.push(cb);
  return () => {
    const idx = logListeners.indexOf(cb);
    if (idx >= 0) logListeners.splice(idx, 1);
  };
}

function emitLog(entry: AILogEntry) {
  logListeners.forEach((cb) => {
    try { cb(entry); } catch { /* noop */ }
  });
}

function log(level: AILogEntry['level'], message: string, model: string, latencyMs: number, extra?: Partial<AILogEntry>) {
  emitLog({
    level,
    message,
    model,
    latencyMs,
    timestamp: new Date().toISOString(),
    ...extra,
  });
}

// ─── Retry Logic ─────────────────────────────────────────────────────────────

async function withRetry<T>(
  fn: (modelId: string) => Promise<T>,
  modelChain: readonly string[],
  maxRetries: number,
  signal?: AbortSignal,
): Promise<{ result: T; model: string }> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const modelIndex = Math.min(attempt, modelChain.length - 1);
    const modelId = modelChain[modelIndex];

    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

    try {
      const result = await fn(modelId);
      return { result, model: modelId };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

      const isAuthError = lastError.message?.includes('401') || lastError.message?.includes('auth');
      const isRateLimit = lastError.message?.includes('429') || lastError.message?.includes('rate');

      if (attempt < maxRetries) {
        const delay = isRateLimit ? 2000 : Math.min(1000 * Math.pow(2, attempt), 8000);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }

      if (isAuthError || (attempt >= modelChain.length - 1)) {
        throw lastError;
      }
    }
  }

  throw lastError ?? new Error('All retries exhausted');
}

// ─── Public API ──────────────────────────────────────────────────────────────

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`AI request timeout after ${timeoutMs}ms`)), timeoutMs);
    promise
      .then((v) => {
        clearTimeout(t);
        resolve(v);
      })
      .catch((e) => {
        clearTimeout(t);
        reject(e);
      });
  });
}

export const AIProvider = {
  /**
   * Generate text from a prompt. Supports streaming and non-streaming modes.
   * Automatically falls back through the FREE model chain on failure.
   * NEVER uses paid models. 
   */
  async generate(params: GenerateTextParams): Promise<AIProviderResult> {
    const {
      system,
      prompt,
      messages,
      temperature = 0.7,
      maxTokens = 4096,
      config = {},
    } = params;

    const modelChain = getModelChain(config);
    const maxRetries = config.maxRetries ?? 3;
    const timeoutMs = config.timeout ?? 30000;

    const startTime = performance.now();

    // Check cache
    const useCache = config.cache && system && prompt;
    let modelUsed = modelChain[0];

    if (useCache) {
      const cached = getCached(cacheKey(system ?? '', prompt ?? '', modelUsed, temperature));
      if (cached) return cached;
    }

    try {
      const { result } = await withRetry(
        async (modelId: string) => {
          modelUsed = modelId;
          const m = getModel(modelId);

          // Timeout handling without relying on SDK AbortSignal typings.
          const operation = vercelGenerateText({
            model: m,
            system,
            prompt,
            messages: messages as CoreMessage[],
            temperature,
            maxTokens,
          });

          const result = await withTimeout(operation, timeoutMs);
          return result;
        },
        modelChain,
        maxRetries,
      );

      const latency = Math.round(performance.now() - startTime);

      const finalResult: AIProviderResult = {
        text: result.text,
        model: modelUsed,
        finishReason: result.finishReason,
        usage: result.usage
          ? {
              promptTokens: result.usage.promptTokens,
              completionTokens: result.usage.completionTokens,
              totalTokens: result.usage.totalTokens,
            }
          : undefined,
        latency,
      };

      if (useCache && system && prompt) {
        setCache(cacheKey(system ?? '', prompt ?? '', modelUsed, temperature), finalResult);
      }

      log('info', 'generate succeeded', modelUsed, latency, {
        tokens: finalResult.usage
          ? { prompt: finalResult.usage.promptTokens, completion: finalResult.usage.completionTokens, total: finalResult.usage.totalTokens }
          : undefined,
      });

      return finalResult;
    } catch (err) {
      const latency = Math.round(performance.now() - startTime);
      const errorMessage = err instanceof Error ? err.message : String(err);

      log('error', `generate failed: ${errorMessage}`, modelUsed, latency, { error: errorMessage });

      throw err;
    }
  },

  /**
   * Generate a structured object matching the provided Zod schema.
   * NEVER uses paid models for structured extraction.
   */
  async generateObject<T>(params: GenerateObjectParams<T>): Promise<T & { model?: string }> {
    const {
      system,
      prompt,
      schema,
      temperature = 0.7,
      maxTokens = 2048,
      config = {},
    } = params;

    const modelChain = getModelChain(config);
    const maxRetries = config.maxRetries ?? 2;
    const startTime = performance.now();
    let modelUsed = modelChain[0];

    try {
      const timeoutMs = config.timeout ?? 30000;

      const { result } = await withRetry(
        async (modelId: string) => {
          modelUsed = modelId;
          const m = getModel(modelId);

          const operation = vercelGenerateObject({
            model: m,
            system,
            prompt,
            schema,
            temperature,
            maxTokens,
          });

          const result = await withTimeout(operation, timeoutMs);
          return result;
        },
        modelChain,
        maxRetries,
      );

      const latency = Math.round(performance.now() - startTime);

      log('info', 'generateObject succeeded', modelUsed, latency);

      return { ...result.object, model: modelUsed } as T & { model?: string };
    } catch (err) {
      const latency = Math.round(performance.now() - startTime);
      const errorMessage = err instanceof Error ? err.message : String(err);

      log('error', `generateObject failed: ${errorMessage}`, modelUsed, latency, { error: errorMessage });

      throw err;
    }
  },

  /**
   * Stream text from a prompt. Returns a Vercel AI SDK stream object
   * (used by callers via `.toDataStreamResponse()`).
   */
  stream(params: StreamTextParams): ReturnType<typeof vercelStreamText> {
    const {
      system,
      prompt,
      messages,
      temperature = 0.7,
      maxTokens = 2048,
      config = {},
    } = params;

    const modelId = selectModel(config);
    const model = getModel(modelId);

    const result = vercelStreamText({
      model,
      system,
      prompt,
      messages: messages as CoreMessage[],
      temperature,
      maxTokens,
      onError: ({ error }) => {
        log('error', `stream failed: ${error instanceof Error ? error.message : String(error)}`, modelId, 0);
      },
    });

    return result;
  },

  /**
   * Get the ELEVA_SYSTEM prompt used by all Eleva AI features.
   */
  getSystemPrompt(): string {
    return `You are Eleva Copilot, an AI career assistant embedded in the Eleva workspace.

Voice: sharp, warm, technical, never buzzwordy. Never say "leverage", "synergy", "I'd be happy to". Prefer short, dense responses with numbers, %, latency, revenue.

Ground every claim in the user's real experience. Never fabricate metrics. If asked to add a metric you don't know, prompt for it or use a bracketed placeholder like [X%].`;
  },
};

// ─── Re-export Vercel AI SDK utilities for compatibility ─────────────────────

export { z };
