import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  API_KEYS_STORAGE_KEY,
  MODEL_STORAGE_KEY,
  readStoredAIConfig,
} from "./client-config";

function memoryStorage(values: Record<string, string>) {
  return {
    getItem: (key: string) => values[key] ?? null,
  };
}

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("readStoredAIConfig", () => {
  it("reads the selected model and stored API keys", () => {
    const keys = [
      { service: "openrouter", key: "sk-live", addedAt: "2026-01-01T00:00:00.000Z" },
    ];
    localStorage.setItem(MODEL_STORAGE_KEY, "openrouter/free");
    localStorage.setItem(API_KEYS_STORAGE_KEY, JSON.stringify(keys));

    expect(readStoredAIConfig()).toEqual({
      model: "openrouter/free",
      apiKeys: keys,
    });
  });

  it("preserves the legacy { provider, key } entry shape", () => {
    const legacyKeys = [{ provider: "openai", key: "sk-legacy" }];
    localStorage.setItem(API_KEYS_STORAGE_KEY, JSON.stringify(legacyKeys));

    expect(readStoredAIConfig().apiKeys).toEqual(legacyKeys);
  });

  it("falls back to empty defaults when nothing is stored", () => {
    expect(readStoredAIConfig()).toEqual({ model: "", apiKeys: [] });
  });

  it("falls back to empty keys for invalid JSON and logs the parse error", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    localStorage.setItem(API_KEYS_STORAGE_KEY, "{not-json");

    expect(readStoredAIConfig()).toEqual({ model: "", apiKeys: [] });
    expect(consoleError).toHaveBeenCalledWith("Error parsing API keys:", expect.any(Error));
  });

  it("ignores non-array payloads and non-object entries", () => {
    localStorage.setItem(API_KEYS_STORAGE_KEY, JSON.stringify({
      keys: [{ service: "openrouter", key: "sk-one" }],
    }));
    expect(readStoredAIConfig().apiKeys).toEqual([]);

    localStorage.setItem(API_KEYS_STORAGE_KEY, JSON.stringify([
      null,
      "sk-string",
      { service: "openrouter", key: "sk-two", addedAt: "2026-02-02" },
    ]));
    expect(readStoredAIConfig().apiKeys).toEqual([
      { service: "openrouter", key: "sk-two", addedAt: "2026-02-02" },
    ]);
  });

  it("returns empty defaults without browser storage", () => {
    const storage = memoryStorage({ [MODEL_STORAGE_KEY]: "ignored/model" });

    expect(readStoredAIConfig(null)).toEqual({ model: "", apiKeys: [] });
    expect(readStoredAIConfig(storage)).toEqual({
      model: "ignored/model",
      apiKeys: [],
    });
  });
});
