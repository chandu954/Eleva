// @vitest-environment node
import { vi } from "vitest";

import type { AIProvider } from "@/lib/ai/provider/base";
import type { ModelConfig } from "@/lib/ai/provider/models";
import type { ProviderId } from "@/lib/ai/provider/types";
import { getModelsForProvider } from "@/lib/ai/provider/models";
import { anthropicProvider } from "@/lib/ai/provider/providers/anthropic";
import { geminiProvider } from "@/lib/ai/provider/providers/gemini";
import { nvidiaProvider } from "@/lib/ai/provider/providers/nvidia";
import { openAIProvider } from "@/lib/ai/provider/providers/openai";
import { openRouterProvider } from "@/lib/ai/provider/providers/openrouter";

export const CREDENTIAL_VARS = [
  "OPENAI_API_KEY",
  "ANTHROPIC_API_KEY",
  "GEMINI_API_KEY",
  "OPENROUTER_API_KEY",
  "NVIDIA_API_KEY",
] as const;

export function modelFor(providerId: ProviderId): ModelConfig {
  const model = getModelsForProvider(providerId)[0];
  if (!model) throw new Error(`${providerId} has no registered model in provider/models.ts`);
  return model;
}

/**
 * Every keyed provider must read its credential BEFORE making a request, so
 * with no credentials each one fails closed with zero network activity.
 */
export const MISSING_KEY_ERROR: Record<string, RegExp> = {
  openai: /OPENAI_API_KEY not set/,
  anthropic: /authentication failed/,
  nvidia: /NVIDIA_API_KEY not set/,
  openrouter: /OPENROUTER_API_KEY not set/,
  gemini: /GEMINI_API_KEY not set/,
};

export const keyedProviders = [openAIProvider, anthropicProvider, nvidiaProvider, openRouterProvider, geminiProvider];

/**
 * ollamaModule reads OLLAMA_BASE_URL at import time, so pin it before the
 * dynamic import; 127.0.0.1:1 always refuses — localhost traffic only.
 */
export async function loadOllamaProvider(): Promise<AIProvider> {
  vi.resetModules();
  process.env.OLLAMA_BASE_URL = "http://127.0.0.1:1";
  return (await import("@/lib/ai/provider/providers/ollama")).ollamaProvider;
}

export function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export function stubFetchOnce(payload: unknown, status = 200): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn(async () => jsonResponse(payload, status)) as unknown as ReturnType<typeof vi.fn>;
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

export function cleanupNetworkStubs() {
  vi.unstubAllGlobals();
  for (const key of CREDENTIAL_VARS) delete process.env[key];
}

export const ANTHROPIC_MESSAGES = {
  content: [{ text: "Hello" }, { text: "!" }],
  stop_reason: "end_turn",
  usage: { input_tokens: 11, output_tokens: 7 },
};

export const GEMINI_GENERATE = {
  candidates: [{ content: { parts: [{ text: "Hi there" }] }, finishReason: "MAX_TOKENS" }],
  usageMetadata: { promptTokenCount: 5, candidatesTokenCount: 3 },
};

export const OLLAMA_CHAT = {
  message: { content: "local answer" },
  done_reason: "length",
  prompt_eval_count: 7,
  eval_count: 19,
};

export {
  anthropicProvider,
  geminiProvider,
  nvidiaProvider,
  openAIProvider,
  openRouterProvider,
};
