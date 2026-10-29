// @vitest-environment node
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import type { AIProvider } from "@/lib/ai/provider/base";
import { AI_PROVIDER_TIMEOUT_MS, ProviderBusyError } from "@/lib/ai/provider/errors";
import {
  ANTHROPIC_MESSAGES,
  CREDENTIAL_VARS,
  GEMINI_GENERATE,
  OLLAMA_CHAT,
  anthropicProvider,
  cleanupNetworkStubs,
  geminiProvider,
  loadOllamaProvider,
  modelFor,
  nvidiaProvider,
  openAIProvider,
  openRouterProvider,
  stubFetchOnce,
} from "@/test/providers-test-utils";

/**
 * The openai SDK (used by openai/nvidia/openrouter providers) does not read
 * the globally stubbed fetch in this version, so the transport itself is
 * replaced with a module-shaped fake: zero network, controllable responses.
 */
const { completionsState, createCalls, clientOptions } = vi.hoisted(() => ({
  completionsState: {
    impl: async (): Promise<Record<string, unknown>> => {
      throw new Error("no SDK completion stubbed for this test");
    },
  },
  createCalls: [] as unknown[],
  clientOptions: [] as unknown[],
}));

vi.mock("openai", () => ({
  default: class FakeOpenAI {
    constructor(options?: unknown) {
      clientOptions.push(options);
    }
    chat = {
      completions: {
        create: async (args: unknown) => {
          createCalls.push(args);
          return completionsState.impl();
        },
      },
    };
  },
}));

function setSdkCompletion(payload: unknown): void {
  completionsState.impl = async () => payload as Record<string, unknown>;
}

function setSdkErrorWithStatus(statusCode: number, message: string): void {
  completionsState.impl = async () => {
    throw Object.assign(new Error(message), { statusCode });
  };
}

function lastCreateCalls(): unknown[] {
  return createCalls.slice(-1) as unknown[];
}

function cleanup() {
  cleanupNetworkStubs();
  createCalls.length = 0;
  clientOptions.length = 0;
}

let ollamaProviderInstance: AIProvider;

beforeAll(async () => {
  ollamaProviderInstance = await loadOllamaProvider();
});

describe("success-path contracts — anthropic (direct fetch, stubbed)", () => {
  afterEach(cleanup);

  it("maps Anthropic content, finish reason and usage onto the result envelope", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    const fetchMock = stubFetchOnce(ANTHROPIC_MESSAGES);

    const result = await anthropicProvider.generateText({ prompt: "x" }, modelFor("anthropic"));

    expect(result.success).toBe(true);
    expect(result.data).toBe("Hello!");
    expect(result.finishReason).toBe("stop");
    expect(result.usage).toEqual({ promptTokens: 11, completionTokens: 7, totalTokens: 18 });
    expect(result.model).toBe(modelFor("anthropic").id);
    expect(((fetchMock as unknown as { mock: { calls: unknown[][] } }).mock.calls[0]?.[1] as RequestInit).signal)
      .toBeInstanceOf(AbortSignal);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect((fetchMock as unknown as { mock: { calls: unknown[][] } }).mock.calls[0]?.[0]).toMatch(/api\.anthropic\.com\/v1\/messages/);
  });

  it("maps a 429 response onto a retryable busy error envelope", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    stubFetchOnce({ error: { message: "rate limited" } }, 429);

    const result = await anthropicProvider.generateText({ prompt: "x" }, modelFor("anthropic"));

    expect(result.success).toBe(false);
    expect(result.finishReason).toBe("error");
    expect(result.error).toMatch(/busy or rate-limited/);
  });

  it("generateObject parses a JSON string response into an object", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    stubFetchOnce({ content: [{ text: '{"value":"mock value"}' }], stop_reason: "end_turn", usage: {} });

    const result = await anthropicProvider.generateObject({ schema: z.object({ value: z.string() }), prompt: "x" }, modelFor("anthropic"));

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ value: "mock value" });
  });

  it("generateObject fails closed when the payload is not parseable JSON", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    stubFetchOnce({ content: [{ text: "not JSON at all" }], stop_reason: "end_turn" });

    const result = await anthropicProvider.generateObject({ schema: z.object({ value: z.string() }), prompt: "x" }, modelFor("anthropic"));

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/could not parse AI response as JSON/);
  });

  it("health reports the engine reachability via the stubbed endpoint", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    stubFetchOnce({ data: [] });

    const health = await anthropicProvider.health();
    expect(health.ok).toBe(true);
  });
});

describe("success-path contracts — gemini (direct fetch, stubbed)", () => {
  afterEach(cleanup);

  it("maps Gemini parts, finish reason and usage onto the result envelope", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    const fetchMock = stubFetchOnce(GEMINI_GENERATE);

    const result = await geminiProvider.generateText({ prompt: "x" }, modelFor("gemini"));

    expect(result.success).toBe(true);
    expect(result.data).toBe("Hi there");
    expect(result.finishReason).toBe("length");
    expect(result.usage).toEqual({ promptTokens: 5, completionTokens: 3, totalTokens: 8});
    expect((fetchMock as unknown as { mock: { calls: unknown[][] } }).mock.calls[0]?.[0]).toMatch(/:generateContent/);
  });

  it("generateObject parses a JSON string response into an object", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    stubFetchOnce({ candidates: [{ content: { parts: [{ text: '{"value":"mock value"}' }], finishReason: "STOP" } }] });

    const result = await geminiProvider.generateObject({ schema: z.object({ value: z.string() }), prompt: "x" }, modelFor("gemini"));

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ value: "mock value" });
  });

  it("generateObject fails closed when the payload is not parseable JSON", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    stubFetchOnce({ candidates: [{ content: { parts: [{ text: "definitely not JSON" }], finishReason: "STOP" } }] });

    const result = await geminiProvider.generateObject({ schema: z.object({ value: z.string() }), prompt: "x" }, modelFor("gemini"));

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/could not parse AI response as JSON/);
  });

  it("health probes the models endpoint with the configured key", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    stubFetchOnce({ data: [] });

    const health = await geminiProvider.health();
    expect(health.ok).toBe(true);
    expect((globalThis.fetch as unknown as { mock: { calls: unknown[][] } }).mock.calls[0]?.[0]).toContain("key=test-key");
  });
});

describe("success-path contracts — ollama (direct fetch, stubbed)", () => {
  afterEach(cleanup);

  it("maps chat content, done_reason and evaluation usage onto the envelope", async () => {
    const fetchMock = stubFetchOnce(OLLAMA_CHAT);

    const result = await ollamaProviderInstance.generateText({ prompt: "x" }, modelFor("ollama"));

    expect(result.success).toBe(true);
    expect(result.data).toBe("local answer");
    expect(result.finishReason).toBe("length");
    expect(result.usage).toEqual({ promptTokens: 7, completionTokens: 19, totalTokens: 26 });
    expect((fetchMock as unknown as { mock: { calls: unknown[][] } }).mock.calls[0]?.[0]).toMatch(/\/api\/chat/);
  });

  it("generateObject parses a JSON string response into an object", async () => {
    stubFetchOnce({ message: { content: '{"value":"mock value"}' }, done_reason: "stop" });

    const result = await ollamaProviderInstance.generateObject({ schema: z.object({ value: z.string() }), prompt: "x" }, modelFor("ollama"));

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ value: "mock value" });
  });

  it("generateObject fails closed when the payload is not parseable JSON", async () => {
    stubFetchOnce({ message: { content: "gibberish }" } });

    const result = await ollamaProviderInstance.generateObject({ schema: z.object({ value: z.string() }), prompt: "x" }, modelFor("ollama"));

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/could not parse AI response as JSON/);
  });

  it("health reports ok:true when /api/tags answers", async () => {
    stubFetchOnce({ models: [] });

    const health = await ollamaProviderInstance.health();
    expect(health.ok).toBe(true);
  });
});

describe("success-path contracts — SDK-based providers (module-fake transport)", () => {
  afterEach(cleanup);

  it("openai: maps choices/finish reason/usage and passes the exact model id", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    setSdkCompletion({ choices: [{ message: { content: "Hello, world" }, finish_reason: "length" }], usage: { prompt_tokens: 9, completion_tokens: 4, total_tokens: 13 } });

    const success = await openAIProvider.generateText({ prompt: "rewrite this" }, modelFor("openai"));

    expect(success.success).toBe(true);
    expect(clientOptions.at(-1)).toMatchObject({ timeout: AI_PROVIDER_TIMEOUT_MS });
    expect(success.data).toBe("Hello, world");
    expect(success.finishReason).toBe("length");
    expect(success.usage).toEqual({ promptTokens: 9, completionTokens: 4, totalTokens: 13 });
    expect(lastCreateCalls()[0]).toMatchObject({ model: modelFor("openai").id });
  });

  it("openai: generateObject parses JSON payloads into objects and fails closed otherwise", async () => {
    process.env.OPENAI_API_KEY = "test-key";

    setSdkCompletion({ choices: [{ message: { content: '{"value":"mock value"}' }, finish_reason: "stop" }] });
    const parsed = await openAIProvider.generateObject({ schema: z.object({ value: z.string() }), prompt: "x" }, modelFor("openai"));
    expect(parsed.success).toBe(true);
    expect(parsed.data).toEqual({ value: "mock value" });

    setSdkCompletion({ choices: [{ message: { content: "prefix { bad" }, finish_reason: "stop" }] });
    const unparseable = await openAIProvider.generateObject({ schema: z.object({ value: z.string() }), prompt: "x" }, modelFor("openai"));
    expect(unparseable.success).toBe(false);
    expect(unparseable.error).toMatch(/could not parse AI response as JSON/);
  });

  it("openai: 401 errors map to the AuthenticationError envelope; health is ok with a key", async () => {
    process.env.OPENAI_API_KEY = "test-key";

    setSdkErrorWithStatus(401, "Incorrect API key");
    const authFailed = await openAIProvider.generateText({ prompt: "x" }, modelFor("openai"));
    expect(authFailed.success).toBe(false);
    expect(authFailed.error).toMatch(/authentication failed/);

    const health = await openAIProvider.health();
    expect(health.ok).toBe(true);
  });

  it("openrouter: routes model ids and maps content/finish reason/usage", async () => {
    process.env.OPENROUTER_API_KEY = "test-key";
    setSdkCompletion({ choices: [{ message: { content: "OR answer" }, finish_reason: "weird_generic" }], usage: { prompt_tokens: 12, completion_tokens: 8, total_tokens: 20 } });

    const success = await openRouterProvider.generateText({ prompt: "x" }, modelFor("openrouter"));

    expect(success.success).toBe(true);
    expect(success.data).toBe("OR answer");
    expect(success.finishReason).toBe("other");
    expect(success.usage).toEqual({ promptTokens: 12, completionTokens: 8, totalTokens: 20 });
    expect(lastCreateCalls()[0]).toMatchObject({ model: "qwen/qwen3-235b-a22b" });
  });

  it("openrouter: 401 errors map to the AuthenticationError envelope; health ok", async () => {
    process.env.OPENROUTER_API_KEY = "test-key";

    setSdkErrorWithStatus(401, "Invalid key");
    const authFailed = await openRouterProvider.generateText({ prompt: "x" }, modelFor("openrouter"));
    expect(authFailed.success).toBe(false);
    expect(authFailed.error).toMatch(/authentication failed/);

    const health = await openRouterProvider.health();
    expect(health.ok).toBe(true);
  });

  it("nvidia: maps choices/finish reason/usage and 401 auth envelope; health ok", async () => {
    process.env.NVIDIA_API_KEY = "test-key";
    setSdkCompletion({ choices: [{ message: { content: "NIM answer" }, finish_reason: "content_filter" }], usage: { prompt_tokens: 31, completion_tokens: 5, total_tokens: 36 } });

    const success = await nvidiaProvider.generateText({ prompt: "x" }, modelFor("nvidia"));

    expect(success.success).toBe(true);
    expect(success.data).toBe("NIM answer");
    expect(success.finishReason).toBe("content_filter");
    expect(success.usage).toEqual({ promptTokens: 31, completionTokens: 5, totalTokens: 36 });
    expect(lastCreateCalls()[0]).toMatchObject({ model: "llama-3.3-70b" });

    setSdkErrorWithStatus(401, "401 Unauthorized");
    const authFailed = await nvidiaProvider.generateText({ prompt: "x" }, modelFor("nvidia"));
    expect(authFailed.success).toBe(false);
    expect(authFailed.error).toMatch(/authentication failed/);

    const health = await nvidiaProvider.health();
    expect(health.ok).toBe(true);
  });
});

describe("live provider transport contracts — message building & transport errors", () => {
  afterEach(cleanup);

  it("anthropic: system/messages/prompt are shaped into the upstream request", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    const fetchMock = stubFetchOnce(ANTHROPIC_MESSAGES);

    const result = await anthropicProvider.generateText({
      system: "You are a resume expert",
      messages: [
        { role: "system", content: "legacy system message" },
        { role: "assistant", content: "earlier draft" },
      ],
      prompt: "final ask",
    }, modelFor("anthropic"));

    expect(result.success).toBe(true);
    const [url, init] = (fetchMock as unknown as { mock: { calls: unknown[][] } }).mock.calls[0]!;
    expect(url).toMatch(/api\.anthropic\.com\/v1\/messages/);
    const body = JSON.parse((init as { body: string }).body) as { system: string; messages: Array<{ role: string; content: string }> };
    expect(body.system).toBe("You are a resume expert");
    expect(body.messages).toEqual([
      { role: "assistant", content: "earlier draft" },
      { role: "user", content: "final ask" },
    ]);
  });

  it("anthropic: health reports ok:false on an unauthorized models response", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    stubFetchOnce({ error: { message: "denied" } }, 401);

    const health = await anthropicProvider.health();
    expect(health.ok).toBe(false);
  });

  it("gemini: assistant messages map to the model role in the upstream body", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    const fetchMock = stubFetchOnce(GEMINI_GENERATE);

    const result = await geminiProvider.generateText({
      system: "You are helpful",
      messages: [{ role: "assistant", content: "previous model turn" }],
      prompt: "and now?",
    }, modelFor("gemini"));

    expect(result.success).toBe(true);
    const [url, init] = (fetchMock as unknown as { mock: { calls: unknown[][] } }).mock.calls[0]!;
    expect(url).toContain("key=test-key");
    expect((init as RequestInit).signal).toBeInstanceOf(AbortSignal);
    const body = JSON.parse((init as { body: string }).body) as { contents: Array<{ role: string; parts: Array<{ text: string }> }> };
    expect(body.contents[0]?.parts[0]?.text).toContain("[System Instructions]");
    expect(body.contents[1]).toEqual({ role: "model", parts: [{ text: "previous model turn" }] });
    expect(body.contents[2]).toEqual({ role: "user", parts: [{ text: "and now?" }] });
  });

  it("gemini: capped 429 responses map to the retryable busy envelope", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    stubFetchOnce({ error: { message: "quota" } }, 429);

    const result = await geminiProvider.generateText({ prompt: "x" }, modelFor("gemini"));

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/busy or rate-limited/);
  });

  it("ollama: system + messages + prompt flow into the chat body", async () => {
    const fetchMock = stubFetchOnce(OLLAMA_CHAT);

    const result = await ollamaProviderInstance.generateText({
      system: "Local system prompt",
      messages: [{ role: "user", content: "hi" }],
      prompt: "tail prompt",
    }, modelFor("ollama"));

    expect(result.success).toBe(true);
    const [, init] = (fetchMock as unknown as { mock: { calls: unknown[][] } }).mock.calls[0]!;
    const body = JSON.parse((init as { body: string }).body) as { messages: Array<{ role: string; content: string }>; options: { num_predict?: number } };
    expect(body.messages).toEqual([
      { role: "system", content: "Local system prompt" },
      { role: "user", content: "hi" },
      { role: "user", content: "tail prompt" },
    ]);
    expect((init as RequestInit).signal).toBeInstanceOf(AbortSignal);
    expect(body.options.num_predict ?? 0).toBeGreaterThan(0);
  });

  it("ollama: non-2xx responses map to the internal-error retryable envelope", async () => {
    stubFetchOnce({ error: "overloaded" }, 500);

    const result = await ollamaProviderInstance.generateText({ prompt: "x" }, modelFor("ollama"));

    expect(result.success).toBe(false);
    expect(result.finishReason).toBe("error");
    expect(result.error).toMatch(/internal error/);
  });

  it("openrouter: capped 429s are rethrown as ProviderBusyError (retry logic ingests them)", async () => {
    process.env.OPENROUTER_API_KEY = "test-key";
    completionsState.impl = async () => {
      throw Object.assign(new Error("Too many requests"), {
        statusCode: 429,
        headers: { "retry-after-ms": "1500" },
      });
    };

    const err = await openRouterProvider.generateText({ prompt: "x" }, modelFor("openrouter")).then(
      () => null,
      (e: unknown) => e,
    );

    expect(err).toBeInstanceOf(ProviderBusyError);
    expect((err as { retryAfter?: number }).retryAfter).toBe(1500);
  });

  it("keyless SDK providers report health ok:false without any requests", async () => {
    for (const keyless of [openAIProvider, nvidiaProvider, openRouterProvider]) {
      for (const key of CREDENTIAL_VARS) delete process.env[key];
      const health = await keyless.health();
      expect(health.ok).toBe(false);
    }
  });

  it("nvidia: generateObject parses JSON payloads and fails closed otherwise", async () => {
    process.env.NVIDIA_API_KEY = "test-key";

    setSdkCompletion({ choices: [{ message: { content: '{"value":"mock value"}' }, finish_reason: "stop" }] });
    const parsed = await nvidiaProvider.generateObject({ schema: z.object({ value: z.string() }), prompt: "x" }, modelFor("nvidia"));
    expect(parsed.success).toBe(true);
    expect(parsed.data).toEqual({ value: "mock value" });

    setSdkCompletion({ choices: [{ message: { content: "plain text, not JSON" }, finish_reason: "stop" }] });
    const unparseable = await nvidiaProvider.generateObject({ schema: z.object({ value: z.string() }), prompt: "x" }, modelFor("nvidia"));
    expect(unparseable.success).toBe(false);
    expect(unparseable.error).toMatch(/could not parse AI response as JSON/);
  });
});

describe("streaming refusals (all providers)", () => {
  it("every provider refuses streamText until streaming support exists", () => {
    const streamers = [openAIProvider, anthropicProvider, nvidiaProvider, openRouterProvider, geminiProvider, ollamaProviderInstance];
    for (const streamer of streamers) {
      expect(() => streamer.streamText({ prompt: "anything" }, modelFor(streamer.id)))
        .toThrow(/Streaming not yet implemented|Streaming is not supported/);
    }
  });

  it("provides a busy-error alias used by the router retry logic", () => {
    const busy = new ProviderBusyError("openai");
    expect(busy.statusCode).toBe(429);
    expect(busy.retryable).toBe(true);
  });
});
