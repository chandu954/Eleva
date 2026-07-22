/**
 * Eleva AI Provider — Centralized AI Service
 * 
 * Single entry point for ALL AI functionality in Eleva.
 * Routes all requests through the provider abstraction layer.
 * 
 * KEY BEHAVIOR:
 * - Single Provider Mode: ALL requests go to the selected provider only
 * - Auto Mode: Routes to best model per task from the selected provider's family
 * - Fallback: Only used when explicitly enabled by the user
 */

import { streamText as vercelStreamText, type LanguageModelV1, type CoreMessage } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';
import { ai } from './ai';
import type { AITask, ProviderConfig, PipelineTraceStep } from './ai/provider/types';
import { PROVIDER_COOKIE_NAME, decodeProviderCookie } from './ai/provider/cookie-config';

export type AIModelId = string;

export interface AIProviderConfig {
  plan?: 'free' | string;
  model?: AIModelId;
  forcePro?: boolean;
  timeout?: number;
  maxRetries?: number;
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
  trace?: PipelineTraceStep;
}

// ─── Provider Configuration ──────────────────────────────────────────────────

const DEFAULT_ENV_PROVIDER: ProviderConfig = (() => {
  try {
    const raw = process.env.DEFAULT_AI_PROVIDER;
    if (raw) return JSON.parse(raw) as ProviderConfig;
  } catch { /* fallthrough */ }
  return { selectedProvider: 'openai', selectedModel: 'openai/gpt-4o-mini', mode: 'single' as const, fallbackEnabled: false };
})();

let userProviderConfig: ProviderConfig | null = null;

let openrouterClient: ReturnType<typeof createOpenAI> | null = null;

const KEY = process.env.OPENROUTER_API_KEY;

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
  emitLog({ level, message, model, latencyMs, timestamp: new Date().toISOString(), ...extra });
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

async function getDefaultProviderConfig(): Promise<ProviderConfig> {
  if (userProviderConfig) return userProviderConfig;

  try {
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    const providerCookie = cookieStore.get(PROVIDER_COOKIE_NAME)?.value;
    const decoded = decodeProviderCookie(providerCookie);
    if (decoded && decoded.selectedProvider) {
      return decoded;
    }
  } catch { }

  return DEFAULT_ENV_PROVIDER;
}

export function setProviderConfig(config: ProviderConfig | null) {
  userProviderConfig = config;
}

function taskFromContext(params: GenerateTextParams): AITask {
  if (params.system?.includes('resume') || params.system?.includes('parser')) return 'parsing';
  if (params.system?.includes('cover')) return 'cover-letter';
  if (params.system?.includes('ATS') || params.system?.includes('ats')) return 'ats-score';
  if (params.system?.includes('analyst') || params.system?.includes('jd')) return 'jd-analysis';
  if (params.system?.includes('career')) return 'career-coach';
  if (params.system?.includes('interview')) return 'interview';
  if (params.system?.includes('grammar')) return 'grammar';
  return 'resume-rewrite';
}

// ─── Public API ──────────────────────────────────────────────────────────────

export const AIProvider = {
  async generate(params: GenerateTextParams): Promise<AIProviderResult> {
    const { system, prompt, messages, temperature = 0.7, maxTokens = 4096 } = params;
    const startTime = performance.now();

    const task = taskFromContext(params);
    const providerConfig = await getDefaultProviderConfig();

    const simpleMessages = messages?.map(m => ({ role: m.role as 'system' | 'user' | 'assistant', content: typeof m.content === 'string' ? m.content : '' }));
    const aiResult = await ai.generate(task, { system, prompt, messages: simpleMessages, temperature, maxTokens }, providerConfig);

    const latency = Math.round(performance.now() - startTime);

    const result: AIProviderResult = {
      text: typeof aiResult.data === 'string' ? aiResult.data : JSON.stringify(aiResult.data ?? ''),
      model: aiResult.model,
      finishReason: aiResult.finishReason,
      usage: aiResult.usage,
      latency,
      trace: aiResult.trace,
    };

    log('info', `${task} via ${providerConfig.selectedProvider}`, result.model, latency, {
      tokens: result.usage ? { prompt: result.usage.promptTokens, completion: result.usage.completionTokens, total: result.usage.totalTokens } : undefined,
    });

    return result;
  },

  async generateObject<T>(params: GenerateObjectParams<T>): Promise<T & { model?: string; trace?: PipelineTraceStep }> {
    const { system, prompt, schema, temperature = 0.7, maxTokens = 2048 } = params;
    const startTime = performance.now();

    const task = taskFromContext(params as unknown as GenerateTextParams);
    const providerConfig = await getDefaultProviderConfig();

    const aiResult = await ai.generateObject(task, { system, prompt, schema, temperature, maxTokens }, providerConfig);

    const latency = Math.round(performance.now() - startTime);

    if (!aiResult.success) {
      throw new Error(aiResult.error ?? 'AI request failed');
    }

    log('info', `${task} object via ${providerConfig.selectedProvider}`, aiResult.model, latency);

    return { ...(aiResult.data as T), model: aiResult.model, trace: aiResult.trace };
  },

  async stream(params: StreamTextParams): Promise<ReturnType<typeof vercelStreamText>> {
    const { system, prompt, messages, temperature = 0.7, maxTokens = 2048 } = params;

    const cfg = await getDefaultProviderConfig();
    const resolvedModel = cfg.selectedModel || 'openai/gpt-4o-mini';

    const result = vercelStreamText({
      model: getModel(resolvedModel),
      system,
      prompt,
      messages: messages as CoreMessage[],
      temperature,
      maxTokens,
      onError: ({ error }) => {
        log('error', `stream failed: ${error instanceof Error ? error.message : String(error)}`, resolvedModel, 0);
      },
    });

    return result;
  },

  getSystemPrompt(): string {
    return `You are Eleva Copilot, an AI career assistant embedded in the Eleva workspace.
    
Voice: sharp, warm, technical, never buzzwordy. Never say "leverage", "synergy", "I'd be happy to". Prefer short, dense responses with numbers, %, latency, revenue.

ZERO HALLUCINATION POLICY — Your highest priority is factual accuracy:
- Never invent achievements, projects, technologies, metrics, leadership experience, years of experience, company names, responsibilities, patents, publications, revenue, or team size.
- Every claim must be supported by the user's resume, profile, or the job description provided in the prompt.
- If a numerical achievement (%, revenue, team size) is not present in the resume, do not fabricate one. Use qualifying language like "improved [metric]" only if the underlying data is present.
- If a required skill is absent from the resume, DO NOT pretend the user has it. Acknowledge transferable experience, express willingness to learn, or connect honestly.
- When writing cover letters, prefer statements like "While my background has focused primarily on X, I am excited by Y's work on Z" over pretending to have direct experience.
- When asked to add a metric you don't know, use a bracketed placeholder like [X%] or prompt for the value.`;
  },
};

export { z };
