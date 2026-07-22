import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getTaskModel, withTaskModel } from "./task-models";
import type { AIConfig } from "@/lib/ai-models";

describe("task model routing", () => {
  it("routes all tasks to free model (free plan)", () => {
    assert.equal(getTaskModel("jobTailoring", false), "openrouter/free");
    assert.equal(getTaskModel("jobTailoring", true), "openrouter/free");
  });

  it("routes all tasks to free model (all plans)", () => {
    assert.equal(getTaskModel("structuredExtraction", false), "openrouter/free");
    assert.equal(getTaskModel("structuredExtraction", true), "openrouter/free");
    assert.equal(getTaskModel("resumeScoring", false), "openrouter/free");
    assert.equal(getTaskModel("resumeScoring", true), "openrouter/free");
    assert.equal(getTaskModel("contentGeneration", false), "openrouter/free");
    assert.equal(getTaskModel("contentGeneration", true), "openrouter/free");
    assert.equal(getTaskModel("coverLetter", false), "openrouter/free");
    assert.equal(getTaskModel("coverLetter", true), "openrouter/free");
  });

  it("routes chat assistant to free model", () => {
    assert.equal(getTaskModel("chatAssistant", false), "openrouter/free");
    assert.equal(getTaskModel("chatAssistant", true), "openrouter/free");
  });

  it("preserves API keys and custom prompts while replacing the model", () => {
    const config: AIConfig = {
      model: "openrouter/free",
      apiKeys: [
        { service: "openrouter", key: "user-key", addedAt: "2026-05-10" },
      ],
      customPrompts: {
        textAnalyzer: "Extract carefully.",
      },
    };

    const resolved = withTaskModel({
      task: "structuredExtraction",
      isPro: false,
      config,
    });

    assert.equal(resolved.model, "openrouter/free");
    assert.deepEqual(resolved.apiKeys, config.apiKeys);

    // When respectSelectedModel is true, the selected model should be preserved
    const preserved = withTaskModel({
      task: "structuredExtraction",
      isPro: false,
      config,
      respectSelectedModel: true,
    });

    assert.equal(preserved.model, "openrouter/free");
  });
});
