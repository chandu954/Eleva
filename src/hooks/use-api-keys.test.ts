// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ApiKey } from "@/lib/ai-models";

// The hook keeps module-level caches because useSyncExternalStore requires a
// stable snapshot. Re-import a fresh copy for each test so those caches do not
// leak between cases (React itself is externalized and stays shared).
async function loadHookModule() {
  vi.resetModules();
  return import("./use-api-keys");
}

function key(service: string, suffix: string): ApiKey {
  return {
    service: service as ApiKey["service"],
    key: `sk-${suffix}`,
    addedAt: "2026-01-01T00:00:00.000Z",
  };
}

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("storage keys", () => {
  it("keeps the backwards-compatible localStorage names", async () => {
    const hookModule = await loadHookModule();

    expect(hookModule.API_KEYS_STORAGE_KEY).toBe("eleva-api-keys");
    expect(hookModule.MODEL_STORAGE_KEY).toBe("eleva-default-model");
  });
});

describe("hydration", () => {
  it("hydrates valid keys and the default model, dropping malformed entries", async () => {
    const { API_KEYS_STORAGE_KEY, MODEL_STORAGE_KEY, useApiKeys, useDefaultModel } =
      await loadHookModule();
    const valid = key("openrouter", "one");
    localStorage.setItem(
      API_KEYS_STORAGE_KEY,
      JSON.stringify([
        valid,
        { service: "openrouter", key: "sk-two", addedAt: "2026-02-02", extra: "drop me" },
        { service: "openrouter", key: "missing-added-at" },
        { key: "missing-service", addedAt: "2026-02-02" },
        null,
        "not-an-object",
      ])
    );
    localStorage.setItem(MODEL_STORAGE_KEY, "openrouter/free");

    const { result } = renderHook(() => ({
      keys: useApiKeys(),
      model: useDefaultModel(),
    }));

    expect(result.current.keys.apiKeys).toEqual([
      valid,
      { service: "openrouter", key: "sk-two", addedAt: "2026-02-02" },
    ]);
    expect(result.current.keys.apiKeys[0]).not.toBe(valid);
    expect(result.current.model.defaultModel).toBe("openrouter/free");
  });

  it("falls back to an empty list for invalid JSON and non-array payloads", async () => {
    const { API_KEYS_STORAGE_KEY, useApiKeys } = await loadHookModule();
    localStorage.setItem(API_KEYS_STORAGE_KEY, "{not json");

    const { result, unmount } = renderHook(() => useApiKeys());
    expect(result.current.apiKeys).toEqual([]);
    unmount();

    // A fresh module sees the next payload; within one module the cache was
    // already initialized, so exercise the parser via a storage event instead.
    const second = await loadHookModule();
    localStorage.setItem(second.API_KEYS_STORAGE_KEY, JSON.stringify({ keys: [] }));
    const secondHook = renderHook(() => second.useApiKeys());
    expect(secondHook.result.current.apiKeys).toEqual([]);
  });

  it("returns a stable snapshot across rerenders", async () => {
    const { useApiKeys } = await loadHookModule();
    const { result, rerender } = renderHook(() => useApiKeys());
    const before = result.current.apiKeys;
    const setBefore = result.current.setApiKeys;

    rerender();

    expect(result.current.apiKeys).toBe(before);
    expect(result.current.setApiKeys).toBe(setBefore);
  });

  it("serves empty server snapshots during SSR", async () => {
    const { useApiKeys, useDefaultModel } = await loadHookModule();
    localStorage.setItem("eleva-api-keys", JSON.stringify([key("openrouter", "ssr")]));
    localStorage.setItem("eleva-default-model", "openrouter/free");

    function Probe() {
      const { apiKeys } = useApiKeys();
      const { defaultModel } = useDefaultModel();
      return createElement("span", null, `${apiKeys.length}:${defaultModel}`);
    }

    const html = renderToString(createElement(Probe));

    expect(html).toContain("0:");
  });
});

describe("useApiKeys", () => {
  it("replaces, appends, and removes keys while persisting each change", async () => {
    const { API_KEYS_STORAGE_KEY, useApiKeys } = await loadHookModule();
    const { result } = renderHook(() => useApiKeys());
    const first = key("openrouter", "one");
    const second = key("openrouter", "two");

    act(() => result.current.setApiKeys([first]));
    expect(result.current.apiKeys).toEqual([first]);
    expect(JSON.parse(localStorage.getItem(API_KEYS_STORAGE_KEY) ?? "null")).toEqual([
      first,
    ]);

    act(() => result.current.setApiKeys((prev) => [...prev, second]));
    expect(result.current.apiKeys).toEqual([first, second]);
    expect(JSON.parse(localStorage.getItem(API_KEYS_STORAGE_KEY) ?? "null")).toEqual([
      first,
      second,
    ]);

    act(() =>
      result.current.setApiKeys((prev) => prev.filter((item) => item.key !== first.key))
    );
    expect(result.current.apiKeys).toEqual([second]);
    expect(JSON.parse(localStorage.getItem(API_KEYS_STORAGE_KEY) ?? "null")).toEqual([
      second,
    ]);
  });

  it("clones incoming key objects instead of retaining caller references", async () => {
    const { useApiKeys } = await loadHookModule();
    const { result } = renderHook(() => useApiKeys());
    const input = { ...key("openrouter", "clone"), extra: "ignored" } as ApiKey;

    act(() => result.current.setApiKeys([input]));

    expect(result.current.apiKeys[0]).toEqual(key("openrouter", "clone"));
    expect(result.current.apiKeys[0]).not.toBe(input);
    expect(result.current.apiKeys[0]).not.toHaveProperty("extra");
  });

  it("does not write or notify when the next list is field-for-field equal", async () => {
    const { API_KEYS_STORAGE_KEY, useApiKeys } = await loadHookModule();
    const { result } = renderHook(() => useApiKeys());
    const existing = key("openrouter", "same");
    act(() => result.current.setApiKeys([existing]));

    const snapshot = result.current.apiKeys;
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    act(() => result.current.setApiKeys([{ ...existing }]));

    expect(result.current.apiKeys).toBe(snapshot);
    expect(setItem).not.toHaveBeenCalled();
    expect(JSON.parse(localStorage.getItem(API_KEYS_STORAGE_KEY) ?? "null")).toEqual([
      existing,
    ]);
  });

  it("clears the list when an updater returns a non-array value", async () => {
    const { API_KEYS_STORAGE_KEY, useApiKeys } = await loadHookModule();
    const { result } = renderHook(() => useApiKeys());
    act(() => result.current.setApiKeys([key("openrouter", "seed")]));

    act(() => {
      (result.current.setApiKeys as unknown as (updater: unknown) => void)(() => "nope");
    });

    expect(result.current.apiKeys).toEqual([]);
    expect(localStorage.getItem(API_KEYS_STORAGE_KEY)).toBe("[]");
  });

  it("synchronizes every mounted consumer through the shared store", async () => {
    const { useApiKeys } = await loadHookModule();
    const first = renderHook(() => useApiKeys());
    const second = renderHook(() => useApiKeys());

    act(() => first.result.current.setApiKeys([key("openrouter", "shared")]));

    expect(second.result.current.apiKeys).toEqual([
      key("openrouter", "shared"),
    ]);
  });
});

describe("useDefaultModel", () => {
  it("updates and persists the selected model across consumers", async () => {
    const { MODEL_STORAGE_KEY, useDefaultModel } = await loadHookModule();
    const first = renderHook(() => useDefaultModel());
    const second = renderHook(() => useDefaultModel());

    act(() => first.result.current.setDefaultModel("openrouter/free"));

    expect(first.result.current.defaultModel).toBe("openrouter/free");
    expect(second.result.current.defaultModel).toBe("openrouter/free");
    expect(localStorage.getItem(MODEL_STORAGE_KEY)).toBe("openrouter/free");
  });

  it("does not rewrite localStorage when the model is unchanged", async () => {
    const { useDefaultModel } = await loadHookModule();
    const { result } = renderHook(() => useDefaultModel());
    act(() => result.current.setDefaultModel("openrouter/free"));

    const setItem = vi.spyOn(Storage.prototype, "setItem");
    act(() => result.current.setDefaultModel("openrouter/free"));

    expect(result.current.defaultModel).toBe("openrouter/free");
    expect(setItem).not.toHaveBeenCalled();
  });

  it("normalizes a nullish model to the empty server default", async () => {
    const { MODEL_STORAGE_KEY, useDefaultModel } = await loadHookModule();
    const { result } = renderHook(() => useDefaultModel());
    act(() => result.current.setDefaultModel("openrouter/free"));

    act(() =>
      result.current.setDefaultModel(null as unknown as string)
    );

    expect(result.current.defaultModel).toBe("");
    expect(localStorage.getItem(MODEL_STORAGE_KEY)).toBe("");
  });
});

describe("cross-tab storage events", () => {
  it("adopts valid key events, ignores unrelated keys, and keeps equal snapshots stable", async () => {
    const { API_KEYS_STORAGE_KEY, useApiKeys } = await loadHookModule();
    const { result } = renderHook(() => useApiKeys());
    const next = key("openrouter", "remote");

    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: API_KEYS_STORAGE_KEY,
          newValue: JSON.stringify([next]),
        })
      );
    });
    expect(result.current.apiKeys).toEqual([next]);

    const snapshot = result.current.apiKeys;
    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: API_KEYS_STORAGE_KEY,
          newValue: JSON.stringify([{ ...next }]),
        })
      );
    });
    expect(result.current.apiKeys).toBe(snapshot);

    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: "some-other-key",
          newValue: JSON.stringify([key("openrouter", "ignored")]),
        })
      );
    });
    expect(result.current.apiKeys).toBe(snapshot);
  });

  it("clears keys on a null event and filters invalid remote entries", async () => {
    const { API_KEYS_STORAGE_KEY, useApiKeys } = await loadHookModule();
    const { result } = renderHook(() => useApiKeys());
    const valid = key("openrouter", "valid");

    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: API_KEYS_STORAGE_KEY,
          newValue: JSON.stringify([valid, { malformed: true }]),
        })
      );
    });
    expect(result.current.apiKeys).toEqual([valid]);

    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: API_KEYS_STORAGE_KEY,
          newValue: "{broken",
        })
      );
    });
    expect(result.current.apiKeys).toEqual([]);

    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: API_KEYS_STORAGE_KEY,
          newValue: null,
        })
      );
    });
    expect(result.current.apiKeys).toEqual([]);
  });

  it("adopts model events and resets to empty when the remote value is cleared", async () => {
    const { MODEL_STORAGE_KEY, useDefaultModel } = await loadHookModule();
    const { result } = renderHook(() => useDefaultModel());

    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: MODEL_STORAGE_KEY,
          newValue: "openrouter/free",
        })
      );
    });
    expect(result.current.defaultModel).toBe("openrouter/free");

    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: MODEL_STORAGE_KEY,
          newValue: "openrouter/free",
        })
      );
    });
    expect(result.current.defaultModel).toBe("openrouter/free");

    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: MODEL_STORAGE_KEY,
          newValue: null,
        })
      );
    });
    expect(result.current.defaultModel).toBe("");

    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: "unrelated",
          newValue: "something-else",
        })
      );
    });
    expect(result.current.defaultModel).toBe("");
  });

  it("rehydrates a fresh consumer from the in-memory store after remounting", async () => {
    const { useApiKeys } = await loadHookModule();
    const first = renderHook(() => useApiKeys());
    act(() => first.result.current.setApiKeys([key("openrouter", "kept")]));
    first.unmount();

    const second = renderHook(() => useApiKeys());

    expect(second.result.current.apiKeys).toEqual([key("openrouter", "kept")]);
  });
});
