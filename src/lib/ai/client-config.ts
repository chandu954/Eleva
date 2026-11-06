import type { AIConfig, ApiKey } from "@/lib/ai-models";

/**
 * localStorage keys for the browser-side AI settings.
 *
 * Keep these names stable: users may already have keys and a selected model
 * stored under them from earlier releases.
 */
export const API_KEYS_STORAGE_KEY = "eleva-api-keys";
export const MODEL_STORAGE_KEY = "eleva-default-model";

type StoredAIConfig = Pick<AIConfig, "model" | "apiKeys">;

type ReadableStorage = Pick<Storage, "getItem">;

function parseStoredApiKeys(raw: string | null): ApiKey[] {
  if (!raw) return [];

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    // Preserve the stored entry shape. Older releases stored `{ provider,
    // key }` while current releases store `{ service, key, addedAt }`; both
    // are passed through to the AI action, which owns provider resolution.
    return parsed.filter(
      (entry): entry is ApiKey => typeof entry === "object" && entry !== null,
    );
  } catch (error) {
    console.error("Error parsing API keys:", error);
    return [];
  }
}

/**
 * Read the model and API keys selected in the browser.
 *
 * Returns safe empty defaults during SSR (where localStorage does not exist)
 * or when storage access is unavailable.
 */
export function readStoredAIConfig(
  storage: ReadableStorage | null = typeof window !== "undefined"
    ? window.localStorage
    : null,
): StoredAIConfig {
  if (!storage) {
    return { model: "", apiKeys: [] };
  }

  return {
    model: storage.getItem(MODEL_STORAGE_KEY) ?? "",
    apiKeys: parseStoredApiKeys(storage.getItem(API_KEYS_STORAGE_KEY)),
  };
}
