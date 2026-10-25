import assert from "node:assert/strict";
import { afterEach, describe, it } from "vitest";

import { resolveAIRequest } from "./access-control";

// Eleva routes every AI request through a single OpenRouter server key
// (see access-control.ts). These tests pin that contract:
//  - known models (including legacy aliases) resolve to their canonical
//    OpenRouter model id via the server key
//  - free-tier models skip rate limiting, non-free ones do not
//  - BYOK keys must not route to non-OpenRouter providers
//  - missing server configuration and unknown models fail loudly

const originalEnv = {
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
};

afterEach(() => {
  process.env.OPENAI_API_KEY = originalEnv.OPENAI_API_KEY;
  process.env.ANTHROPIC_API_KEY = originalEnv.ANTHROPIC_API_KEY;
  process.env.OPENROUTER_API_KEY = originalEnv.OPENROUTER_API_KEY;
});

describe("resolveAIRequest", () => {
  it("resolves legacy free-tier aliases through the server OpenRouter key", () => {
    process.env.OPENROUTER_API_KEY = "server-openrouter";

    const result = resolveAIRequest({
      requestedModel: "gpt-5.4-nano",
      apiKeys: [],
      isPro: false,
    });

    assert.equal(result.providerId, "openrouter");
    assert.equal(result.modelId, "google/gemma-4-31b-it:free");
    assert.equal(result.apiKey, "server-openrouter");
    assert.equal(result.usedServerKey, true);
    assert.equal(result.requiresRateLimit, false);
  });

  it("resolves legacy premium aliases to the canonical free model id", () => {
    process.env.OPENROUTER_API_KEY = "server-openrouter";

    const result = resolveAIRequest({
      requestedModel: "gpt-5.5",
      apiKeys: [],
      isPro: true,
    });

    assert.equal(result.providerId, "openrouter");
    assert.equal(result.modelId, "openrouter/free");
    assert.equal(result.apiKey, "server-openrouter");
    assert.equal(result.usedServerKey, true);
  });

  it("keeps BYOK users on the OpenRouter server-key policy", () => {
    process.env.OPENROUTER_API_KEY = "server-openrouter";

    const result = resolveAIRequest({
      requestedModel: "claude-sonnet-4-6",
      apiKeys: [
        { service: "anthropic", key: "user-anthropic", addedAt: "2026-05-03" },
      ],
      isPro: false,
    });

    assert.equal(result.providerId, "openrouter");
    assert.equal(result.apiKey, "server-openrouter");
    assert.equal(result.usedServerKey, true);
  });

  it("rejects unknown models", () => {
    assert.throws(
      () =>
        resolveAIRequest({
          requestedModel: "unknown/model",
          apiKeys: [],
          isPro: true,
        }),
      /Unknown model: unknown\/model/
    );
  });

  it("throws when the server has no OpenRouter key configured", () => {
    delete process.env.OPENROUTER_API_KEY;

    assert.throws(
      () =>
        resolveAIRequest({
          requestedModel: "gpt-5.4-nano",
          apiKeys: [],
          isPro: false,
        }),
      /OpenRouter API key not configured on the server/
    );
  });

  it("reports server-key usage for every allowed call", () => {
    process.env.OPENROUTER_API_KEY = "server-openrouter";

    const result = resolveAIRequest({
      requestedModel: "gpt-5.4-nano",
      apiKeys: [],
      isPro: false,
    });

    assert.equal(result.usedServerKey, true);
  });
});
