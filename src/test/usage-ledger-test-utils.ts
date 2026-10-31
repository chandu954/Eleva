import { stubSupabase, stubTable } from "@/test/postgrest-stub";
import type { ResolvedAIRequest } from "@/lib/ai/access-control";
import { FAKE_PROVIDER_KEY } from "./fixtures/constants";

export const resolvedRequest: ResolvedAIRequest = {
  providerId: "openrouter",
  modelId: "openrouter/free",
  apiKey: FAKE_PROVIDER_KEY,
  usedServerKey: true,
  requiresRateLimit: false,
};

export const finishedRow = {
  user_id: "user-1",
  route: "/api/ai/chat",
  provider: "openrouter",
  model: "openrouter/free",
  is_pro: false,
  used_server_key: true,
  status: "succeeded",
  input_tokens: 10,
  output_tokens: 20,
  total_tokens: 30,
  error_code: null,
};

export function serviceClientFor(...tables: unknown[]) {
  return stubSupabase(
    null,
    { ai_usage_events: tables as ReturnType<typeof stubTable>[] }
  );
}

export function startedTable(id = "event-1") {
  return stubTable({ data: { id }, error: null });
}

export function finishedTable(row: Record<string, unknown> = finishedRow) {
  return stubTable({ data: row, error: null });
}
