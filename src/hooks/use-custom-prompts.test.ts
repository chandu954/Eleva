// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CustomPrompts } from "@/lib/types";

const STORAGE_KEY = "eleva-custom-prompts";

// The hook keeps a module-level external store so useSyncExternalStore can
// return a stable snapshot. Re-import a fresh copy per test so cached state
// and listener registries do not leak between cases.
async function loadHookModule() {
  vi.resetModules();
  return import("./use-custom-prompts");
}

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("module constants", () => {
  it("exposes the storage key, defaults, and prompt metadata", async () => {
    const { CUSTOM_PROMPTS_STORAGE_KEY, DEFAULT_PROMPTS, PROMPT_METADATA } =
      await loadHookModule();

    expect(CUSTOM_PROMPTS_STORAGE_KEY).toBe(STORAGE_KEY);
    expect(Object.keys(DEFAULT_PROMPTS)).toHaveLength(7);
    expect(DEFAULT_PROMPTS.aiAssistant.length).toBeGreaterThan(0);
    expect(DEFAULT_PROMPTS.resumeFormatter.length).toBeGreaterThan(0);
    expect(Object.keys(PROMPT_METADATA)).toHaveLength(7);
    expect(PROMPT_METADATA.aiAssistant.name).toBe("AI Chat Assistant");
    expect(PROMPT_METADATA.textAnalyzer.description).toContain("importing text");
  });
});

describe("hydration", () => {
  it("hydrates valid overrides and drops empty, unknown, and non-string entries", async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        aiAssistant: "Custom assistant",
        textAnalyzer: "",
        workExperienceGenerator: 42,
        unknownPrompt: "ignored",
      })
    );

    const { useCustomPrompts, DEFAULT_PROMPTS } = await loadHookModule();
    const { result } = renderHook(() => useCustomPrompts());

    expect(result.current.customPrompts).toEqual({
      aiAssistant: "Custom assistant",
    });
    expect(result.current.getPrompt("aiAssistant")).toBe("Custom assistant");
    expect(result.current.getPrompt("textAnalyzer")).toBe(
      DEFAULT_PROMPTS.textAnalyzer
    );
    expect(result.current.isCustomized("aiAssistant")).toBe(true);
    expect(result.current.isCustomized("textAnalyzer")).toBe(false);
  });

  it("starts empty when storage is missing, malformed, or not an object", async () => {
    let hookModule = await loadHookModule();
    let hook = renderHook(() => hookModule.useCustomPrompts());
    expect(hook.result.current.customPrompts).toEqual({});
    hook.unmount();

    for (const raw of ["{not json", "42", '"a string"', "null", "[]"]) {
      localStorage.setItem(STORAGE_KEY, raw);
      hookModule = await loadHookModule();
      hook = renderHook(() => hookModule.useCustomPrompts());
      expect(hook.result.current.customPrompts).toEqual({});
      hook.unmount();
      localStorage.clear();
    }
  });

  it("returns stable snapshots and callback identities across rerenders", async () => {
    const { useCustomPrompts } = await loadHookModule();
    const { result, rerender } = renderHook(() => useCustomPrompts());

    const snapshot = result.current.customPrompts;
    const setPrompt = result.current.setPrompt;
    rerender();

    expect(result.current.customPrompts).toBe(snapshot);
    expect(result.current.setPrompt).toBe(setPrompt);
  });

  it("serves an empty server snapshot during SSR", async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ aiAssistant: "client-only" })
    );
    const { useCustomPrompts } = await loadHookModule();

    function Probe() {
      const { customPrompts } = useCustomPrompts();
      return createElement("span", null, String(Object.keys(customPrompts).length));
    }

    expect(renderToString(createElement(Probe))).toContain("0");
  });
});

describe("creating and updating prompts", () => {
  it("creates, updates, and removes a single prompt override", async () => {
    const { useCustomPrompts } = await loadHookModule();
    const { result } = renderHook(() => useCustomPrompts());

    act(() => result.current.setPrompt("textAnalyzer", "Custom analyzer"));
    expect(result.current.customPrompts).toEqual({
      textAnalyzer: "Custom analyzer",
    });
    expect(result.current.getPrompt("textAnalyzer")).toBe("Custom analyzer");
    expect(result.current.isCustomized("textAnalyzer")).toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null")).toEqual({
      textAnalyzer: "Custom analyzer",
    });

    act(() => result.current.setPrompt("textAnalyzer", "Updated analyzer"));
    expect(result.current.getPrompt("textAnalyzer")).toBe("Updated analyzer");
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null")).toEqual({
      textAnalyzer: "Updated analyzer",
    });

    act(() => result.current.setPrompt("textAnalyzer", undefined));
    expect(result.current.customPrompts).toEqual({});
    expect(result.current.isCustomized("textAnalyzer")).toBe(false);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("treats an override equal to the default as a reset", async () => {
    const { useCustomPrompts, DEFAULT_PROMPTS } = await loadHookModule();
    const { result } = renderHook(() => useCustomPrompts());

    act(() => result.current.setPrompt("projectGenerator", "Custom project"));
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();

    act(() =>
      result.current.setPrompt("projectGenerator", DEFAULT_PROMPTS.projectGenerator)
    );

    expect(result.current.customPrompts).toEqual({});
    expect(result.current.getPrompt("projectGenerator")).toBe(
      DEFAULT_PROMPTS.projectGenerator
    );
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("filters invalid entries from bulk updates and supports functional updaters", async () => {
    const { useCustomPrompts } = await loadHookModule();
    const { result } = renderHook(() => useCustomPrompts());

    act(() =>
      result.current.setCustomPrompts({
        aiAssistant: "Custom assistant",
        projectGenerator: "",
        bogus: "nope",
      } as CustomPrompts)
    );

    expect(result.current.customPrompts).toEqual({
      aiAssistant: "Custom assistant",
    });
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null")).toEqual({
      aiAssistant: "Custom assistant",
    });

    act(() =>
      result.current.setCustomPrompts((prev) => ({
        ...prev,
        resumeFormatter: "Custom formatter",
      }))
    );

    expect(result.current.customPrompts).toEqual({
      aiAssistant: "Custom assistant",
      resumeFormatter: "Custom formatter",
    });
  });

  it("does not write or notify when an update is field-for-field equal", async () => {
    const { useCustomPrompts } = await loadHookModule();
    const { result } = renderHook(() => useCustomPrompts());
    act(() => result.current.setPrompt("aiAssistant", "Custom assistant"));

    const snapshot = result.current.customPrompts;
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    act(() => result.current.setPrompt("aiAssistant", "Custom assistant"));

    expect(result.current.customPrompts).toBe(snapshot);
    expect(setItem).not.toHaveBeenCalled();
  });

  it("keeps every mounted consumer in sync through the shared store", async () => {
    const { useCustomPrompts } = await loadHookModule();
    const first = renderHook(() => useCustomPrompts());
    const second = renderHook(() => useCustomPrompts());

    act(() => first.result.current.setPrompt("aiAssistant", "Shared assistant"));

    expect(second.result.current.customPrompts).toEqual({
      aiAssistant: "Shared assistant",
    });
    expect(second.result.current.getPrompt("aiAssistant")).toBe(
      "Shared assistant"
    );
  });
});

describe("deleting prompts", () => {
  it("resets one prompt and then all prompts", async () => {
    const { useCustomPrompts } = await loadHookModule();
    const { result } = renderHook(() => useCustomPrompts());

    act(() => {
      result.current.setPrompt("aiAssistant", "Custom assistant");
      result.current.setPrompt("textAnalyzer", "Custom analyzer");
    });
    expect(Object.keys(result.current.customPrompts)).toHaveLength(2);

    act(() => result.current.resetPrompt("aiAssistant"));
    expect(result.current.customPrompts).toEqual({
      textAnalyzer: "Custom analyzer",
    });
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null")).toEqual({
      textAnalyzer: "Custom analyzer",
    });

    act(() => result.current.resetAllPrompts());
    expect(result.current.customPrompts).toEqual({});
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("is a no-op when resetting a prompt that has no override", async () => {
    const { useCustomPrompts } = await loadHookModule();
    const { result } = renderHook(() => useCustomPrompts());
    const setItem = vi.spyOn(Storage.prototype, "setItem");

    act(() => result.current.resetPrompt("projectImprover"));

    expect(result.current.customPrompts).toEqual({});
    expect(setItem).not.toHaveBeenCalled();
  });
});

describe("cross-tab storage events", () => {
  it("adopts valid remote changes and ignores unrelated keys or equal payloads", async () => {
    const { useCustomPrompts } = await loadHookModule();
    const { result } = renderHook(() => useCustomPrompts());

    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: STORAGE_KEY,
          newValue: JSON.stringify({ aiAssistant: "Remote assistant" }),
        })
      );
    });
    expect(result.current.customPrompts).toEqual({
      aiAssistant: "Remote assistant",
    });

    const snapshot = result.current.customPrompts;
    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: STORAGE_KEY,
          newValue: JSON.stringify({ aiAssistant: "Remote assistant" }),
        })
      );
    });
    expect(result.current.customPrompts).toBe(snapshot);

    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: "some-other-key",
          newValue: JSON.stringify({ aiAssistant: "Ignored" }),
        })
      );
    });
    expect(result.current.customPrompts).toBe(snapshot);
  });

  it("clears overrides on invalid or null remote payloads", async () => {
    const { useCustomPrompts } = await loadHookModule();
    const { result } = renderHook(() => useCustomPrompts());

    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: STORAGE_KEY,
          newValue: JSON.stringify({ aiAssistant: "Remote assistant" }),
        })
      );
    });
    expect(Object.keys(result.current.customPrompts)).toHaveLength(1);

    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: STORAGE_KEY,
          newValue: "{broken",
        })
      );
    });
    expect(result.current.customPrompts).toEqual({});

    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: STORAGE_KEY,
          newValue: JSON.stringify({ aiAssistant: "Remote assistant" }),
        })
      );
    });
    expect(Object.keys(result.current.customPrompts)).toHaveLength(1);

    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", { key: STORAGE_KEY, newValue: null })
      );
    });
    expect(result.current.customPrompts).toEqual({});
  });
});

describe("remounting", () => {
  it("rehydrates a fresh consumer from the in-memory store", async () => {
    const { useCustomPrompts } = await loadHookModule();
    const first = renderHook(() => useCustomPrompts());
    act(() => first.result.current.setPrompt("aiAssistant", "Kept assistant"));
    first.unmount();

    const second = renderHook(() => useCustomPrompts());

    expect(second.result.current.getPrompt("aiAssistant")).toBe(
      "Kept assistant"
    );
  });
});
