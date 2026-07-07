import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getTaskModel, withTaskModel } from "./task-models";
import type { AIConfig } from "@/lib/ai-models";

describe("task model routing", () => {
  it("routes job tailoring by plan", () => {
    assert.equal(getTaskModel("jobTailoring", false), "google/gemini-2.5-flash");
    assert.equal(getTaskModel("jobTailoring", true), "anthropic/claude-sonnet-4.6");
  });

  it("routes all free tasks to Gemini 2.5 Flash", () => {
    assert.equal(getTaskModel("structuredExtraction", false), "google/gemini-2.5-flash");
    assert.equal(getTaskModel("structuredExtraction", true), "google/gemini-2.5-flash");
    assert.equal(getTaskModel("resumeScoring", false), "google/gemini-2.5-flash");
    assert.equal(getTaskModel("resumeScoring", true), "google/gemini-2.5-flash");
    assert.equal(getTaskModel("contentGeneration", false), "google/gemini-2.5-flash");
    assert.equal(getTaskModel("contentGeneration", true), "google/gemini-2.5-flash");
    assert.equal(getTaskModel("coverLetter", false), "google/gemini-2.5-flash");
    assert.equal(getTaskModel("coverLetter", true), "google/gemini-2.5-flash");
  });

  it("routes free chat assistant to Gemini 2.5 Flash", () => {
    assert.equal(getTaskModel("chatAssistant", false), "google/gemini-2.5-flash");
    assert.equal(getTaskModel("chatAssistant", true), "google/gemini-2.5-pro");
  });

  it("preserves API keys and custom prompts while replacing the model", () => {
    const config: AIConfig = {
      model: "anthropic/claude-sonnet-4.6",
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

    assert.equal(resolved.model, "google/gemini-2.5-flash");
    assert.deepEqual(resolved.apiKeys, config.apiKeys);

    // When respectSelectedModel is true, the selected model should be preserved
    const preserved = withTaskModel({
      task: "structuredExtraction",
      isPro: false,
      config,
      respectSelectedModel: true,
    });

    assert.equal(preserved.model, "anthropic/claude-sonnet-4.6");
  });
});
