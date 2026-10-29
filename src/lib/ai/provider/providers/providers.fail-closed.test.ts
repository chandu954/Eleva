// @vitest-environment node
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import type { AIProvider } from "@/lib/ai/provider/base";
import {
  CREDENTIAL_VARS,
  MISSING_KEY_ERROR,
  keyedProviders,
  loadOllamaProvider,
  modelFor,
} from "@/test/providers-test-utils";

let ollamaProviderInstance: AIProvider;

beforeAll(async () => {
  ollamaProviderInstance = await loadOllamaProvider();
});

afterAll(() => {
  vi.resetModules();
});

describe("live providers — fail closed without credentials (no network)", () => {
  beforeEach(() => {
    for (const key of CREDENTIAL_VARS) delete process.env[key];
  });

  for (const provider of keyedProviders) {
    describe(`${provider.id}`, () => {
      it("generateText returns a failure envelope naming the missing credential", async () => {
        const result = await provider.generateText({ prompt: "rewrite this" }, modelFor(provider.id));

        expect(result.success).toBe(false);
        expect(result.provider).toBe(provider.id);
        expect(result.finishReason).toBe("error");
        expect(result.data).toBeNull();
        expect(result.error).toMatch(MISSING_KEY_ERROR[provider.id]);
        expect(result.latency).toBeGreaterThanOrEqual(0);
      });

      it("generateObject returns a failure envelope naming the missing credential", async () => {
        const params = { schema: z.object({ value: z.string() }) };
        const result = await provider.generateObject(params, modelFor(provider.id));

        expect(result.success).toBe(false);
        expect(result.provider).toBe(provider.id);
        expect(result.finishReason).toBe("error");
        expect(result.data).toBeNull();
        expect(result.error).toMatch(MISSING_KEY_ERROR[provider.id]);
      });

      it("reports enabled=false with no credential on the environment", () => {
        expect(provider.enabled).toBe(false);
      });
    });
  }
});

describe("ollama provider — unreachable local engine (pinned refused port)", () => {
  it("generateText fails closed when the local engine is unreachable", async () => {
    const result = await ollamaProviderInstance.generateText({ prompt: "summarize" }, modelFor("ollama"));

    expect(result.success).toBe(false);
    expect(result.provider).toBe("ollama");
    expect(result.finishReason).toBe("error");
    expect(result.data).toBeNull();
    expect(typeof result.error).toBe("string");
    expect((result.error as string).length).toBeGreaterThan(0);
  });

  it("generateObject fails closed when the local engine is unreachable", async () => {
    const params = { schema: z.object({ value: z.string() }) };
    const result = await ollamaProviderInstance.generateObject(params, modelFor("ollama"));

    expect(result.success).toBe(false);
    expect(result.provider).toBe("ollama");
    expect(result.data).toBeNull();
  });

  it("health reports ok:false when the local engine is unreachable", async () => {
    const health = await ollamaProviderInstance.health();
    expect(health.ok).toBe(false);
    expect(health.latency).toBeGreaterThanOrEqual(0);
  });
});
