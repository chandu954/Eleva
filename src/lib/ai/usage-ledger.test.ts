import assert from "node:assert/strict";
import { beforeEach, describe, it, vi } from "vitest";

import { stubSupabase, stubTable } from "@/test/postgrest-stub";
import type { ResolvedAIRequest } from "@/lib/ai/access-control";

const mocks = vi.hoisted(() => ({
  createServiceClient: vi.fn(),
  captureServerAnalyticsEvent: vi.fn(),
  checkRateLimit: vi.fn(),
  resolveAIRequest: vi.fn(),
  createAIClient: vi.fn(),
  buildTelemetry: vi.fn(),
}));

vi.mock("@/utils/supabase/server", () => ({
  createServiceClient: mocks.createServiceClient,
}));

vi.mock("@/lib/analytics/server", () => ({
  captureServerAnalyticsEvent: mocks.captureServerAnalyticsEvent,
}));

vi.mock("@/lib/rateLimiter", () => ({
  checkRateLimit: mocks.checkRateLimit,
}));

vi.mock("@/lib/ai/access-control", () => ({
  resolveAIRequest: mocks.resolveAIRequest,
}));

vi.mock("@/utils/ai-tools", () => ({
  createAIClientFromResolvedRequest: mocks.createAIClient,
}));

vi.mock("@/lib/ai/posthog-telemetry", () => ({
  buildPostHogAITelemetry: mocks.buildTelemetry,
}));

import { AnalyticsEvents } from "@/lib/analytics/events";
import { getDefaultModel } from "@/lib/ai-models";
import {
  AIUsageError,
  finishAIUsageRequest,
  recordAIUsageFinished,
  recordAIUsageStarted,
  startAIUsageRequest,
  usageFromLanguageModelUsage,
} from "./usage-ledger";

const resolvedRequest: ResolvedAIRequest = {
  providerId: "openrouter",
  modelId: "openrouter/free",
  apiKey: "server-openrouter-key",
  usedServerKey: true,
  requiresRateLimit: false,
};

const finishedRow = {
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

function serviceClientFor(...tables: unknown[]) {
  return stubSupabase(
    null,
    { ai_usage_events: tables as ReturnType<typeof stubTable>[] }
  );
}

function startedTable(id = "event-1") {
  return stubTable({ data: { id }, error: null });
}

function finishedTable(row: Record<string, unknown> = finishedRow) {
  return stubTable({ data: row, error: null });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.captureServerAnalyticsEvent.mockResolvedValue(undefined);
  mocks.checkRateLimit.mockResolvedValue(undefined);
  mocks.createAIClient.mockReturnValue({ modelId: "resolved-model" });
  mocks.buildTelemetry.mockReturnValue({
    isEnabled: false,
    recordInputs: false,
    recordOutputs: false,
  });
  mocks.resolveAIRequest.mockReturnValue(resolvedRequest);
});

describe("usageFromLanguageModelUsage", () => {
  it("maps provider usage tokens into ledger columns", () => {
    const usage = usageFromLanguageModelUsage({
      promptTokens: 123,
      completionTokens: 45,
      totalTokens: 168,
    });

    assert.deepEqual(usage, {
      inputTokens: 123,
      outputTokens: 45,
      totalTokens: 168,
    });
  });

  it("omits token columns when provider usage is unavailable", () => {
    assert.deepEqual(usageFromLanguageModelUsage(), {});
  });
});

describe("AIUsageError", () => {
  it("preserves the access-control code and HTTP status", () => {
    const error = new AIUsageError("Model unavailable", "blocked", 403);

    assert.equal(error.name, "AIUsageError");
    assert.equal(error.message, "Model unavailable");
    assert.equal(error.code, "blocked");
    assert.equal(error.status, 403);
  });

  it("defaults to a 500 when no status is supplied", () => {
    const error = new AIUsageError("provider failed", "failed");

    assert.equal(error.status, 500);
    assert.equal(error.code, "failed");
  });
});

describe("recordAIUsageStarted", () => {
  it("inserts a started event and captures analytics with non-sensitive metadata", async () => {
    const table = startedTable("event-42");
    mocks.createServiceClient.mockResolvedValue(serviceClientFor(table));

    const id = await recordAIUsageStarted({
      userId: "user-1",
      route: "/api/ai/chat",
      provider: "openrouter",
      model: "openrouter/free",
      isPro: true,
      usedServerKey: false,
    });

    assert.equal(id, "event-42");
    assert.deepEqual(table.calls.insert[0][0], {
      user_id: "user-1",
      route: "/api/ai/chat",
      provider: "openrouter",
      model: "openrouter/free",
      is_pro: true,
      used_server_key: false,
      status: "started",
    });
    assert.deepEqual(table.calls.select[0][0], "id");
    assert.equal(table.calls.single.length, 1);
    assert.deepEqual(mocks.captureServerAnalyticsEvent.mock.calls[0][0], {
      distinctId: "user-1",
      event: AnalyticsEvents.AIRequestStarted,
      properties: {
        route: "/api/ai/chat",
        provider: "openrouter",
        model: "openrouter/free",
        is_pro: true,
        used_server_key: false,
      },
    });
  });

  it("propagates insert errors without emitting analytics", async () => {
    const table = stubTable({ data: null, error: { message: "insert failed" } });
    mocks.createServiceClient.mockResolvedValue(serviceClientFor(table));

    await assert.rejects(
      () =>
        recordAIUsageStarted({
          userId: "user-1",
          route: "/api/ai/chat",
          provider: "openrouter",
          model: "openrouter/free",
          isPro: false,
          usedServerKey: true,
        }),
      (error: unknown) => {
        assert.deepEqual(error, { message: "insert failed" });
        return true;
      }
    );

    assert.equal(mocks.captureServerAnalyticsEvent.mock.calls.length, 0);
  });
});

describe("recordAIUsageFinished", () => {
  it("writes token columns and emits the success event", async () => {
    const table = finishedTable();
    mocks.createServiceClient.mockResolvedValue(serviceClientFor(table));

    await recordAIUsageFinished({
      id: "event-1",
      status: "succeeded",
      inputTokens: 10,
      outputTokens: 20,
      totalTokens: 30,
    });

    assert.deepEqual(table.calls.update[0][0], {
      status: "succeeded",
      error_code: null,
      input_tokens: 10,
      output_tokens: 20,
      total_tokens: 30,
    });
    assert.deepEqual(table.calls.eq[0], ["id", "event-1"]);
    assert.equal(
      table.calls.select[0][0],
      "user_id, route, provider, model, is_pro, used_server_key, status, input_tokens, output_tokens, total_tokens, error_code"
    );
    assert.deepEqual(mocks.captureServerAnalyticsEvent.mock.calls[0][0], {
      distinctId: "user-1",
      event: AnalyticsEvents.AIRequestSucceeded,
      properties: {
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
      },
    });
  });

  it("nulls omitted token columns and emits the failure event for error statuses", async () => {
    const row = {
      ...finishedRow,
      status: "rate_limited",
      input_tokens: null,
      output_tokens: null,
      total_tokens: null,
      error_code: "quota",
    };
    const table = finishedTable(row);
    mocks.createServiceClient.mockResolvedValue(serviceClientFor(table));

    await recordAIUsageFinished({
      id: "event-2",
      status: "rate_limited",
      errorCode: "quota",
    });

    assert.deepEqual(table.calls.update[0][0], {
      status: "rate_limited",
      error_code: "quota",
      input_tokens: null,
      output_tokens: null,
      total_tokens: null,
    });
    assert.equal(
      mocks.captureServerAnalyticsEvent.mock.calls[0][0].event,
      AnalyticsEvents.AIRequestFailed
    );
    assert.equal(
      mocks.captureServerAnalyticsEvent.mock.calls[0][0].properties.status,
      "rate_limited"
    );
  });

  it("propagates update errors without emitting analytics", async () => {
    const table = stubTable({ data: null, error: { message: "update failed" } });
    mocks.createServiceClient.mockResolvedValue(serviceClientFor(table));

    await assert.rejects(
      () => recordAIUsageFinished({ id: "event-1", status: "failed" }),
      (error: unknown) => {
        assert.deepEqual(error, { message: "update failed" });
        return true;
      }
    );

    assert.equal(mocks.captureServerAnalyticsEvent.mock.calls.length, 0);
  });
});

describe("finishAIUsageRequest", () => {
  it("merges provider usage and the error code into one update", async () => {
    const table = finishedTable({ ...finishedRow, status: "failed" });
    mocks.createServiceClient.mockResolvedValue(serviceClientFor(table));

    await finishAIUsageRequest({
      usageEventId: "event-3",
      status: "failed",
      errorCode: "upstream_timeout",
      usage: { promptTokens: 4, completionTokens: 6, totalTokens: 10 },
    });

    assert.deepEqual(table.calls.eq[0], ["id", "event-3"]);
    assert.deepEqual(table.calls.update[0][0], {
      status: "failed",
      error_code: "upstream_timeout",
      input_tokens: 4,
      output_tokens: 6,
      total_tokens: 10,
    });
  });

  it("leaves token columns null when no provider usage is passed", async () => {
    const table = finishedTable({ ...finishedRow, status: "blocked" });
    mocks.createServiceClient.mockResolvedValue(serviceClientFor(table));

    await finishAIUsageRequest({
      usageEventId: "event-4",
      status: "blocked",
      errorCode: "access_denied",
    });

    assert.deepEqual(table.calls.update[0][0], {
      status: "blocked",
      error_code: "access_denied",
      input_tokens: null,
      output_tokens: null,
      total_tokens: null,
    });
  });
});

describe("startAIUsageRequest", () => {
  it("records the resolved request and returns the client, event id, and telemetry", async () => {
    const startTable = startedTable("event-5");
    mocks.createServiceClient.mockResolvedValue(serviceClientFor(startTable));
    const config = {
      model: "openrouter/free",
      apiKeys: [
        { service: "openrouter" as const, key: "user-key", addedAt: "2026-01-01" },
      ],
    };
    const telemetry = {
      isEnabled: false,
      recordInputs: false,
      recordOutputs: false,
    };
    mocks.buildTelemetry.mockReturnValue(telemetry);

    const result = await startAIUsageRequest({
      userId: "user-1",
      route: "/api/ai/chat",
      config,
      isPro: false,
    });

    assert.equal(result.model, mocks.createAIClient.mock.results[0].value);
    assert.equal(result.usageEventId, "event-5");
    assert.deepEqual(result.resolved, resolvedRequest);
    assert.equal(result.telemetry, telemetry);
    assert.deepEqual(mocks.resolveAIRequest.mock.calls[0][0], {
      requestedModel: "openrouter/free",
      apiKeys: config.apiKeys,
      isPro: false,
    });
    assert.deepEqual(startTable.calls.insert[0][0], {
      user_id: "user-1",
      route: "/api/ai/chat",
      provider: "openrouter",
      model: "openrouter/free",
      is_pro: false,
      used_server_key: true,
      status: "started",
    });
    assert.equal(mocks.checkRateLimit.mock.calls.length, 0);
    assert.deepEqual(mocks.buildTelemetry.mock.calls[0][0], {
      route: "/api/ai/chat",
      userId: "user-1",
      usageEventId: "event-5",
      isPro: false,
      resolved: resolvedRequest,
    });
  });

  it("falls back to the default pro model and an empty key list when no config is given", async () => {
    const startTable = startedTable("event-6");
    mocks.createServiceClient.mockResolvedValue(serviceClientFor(startTable));

    const result = await startAIUsageRequest({
      userId: "user-2",
      route: "/api/ai/rewrite",
      isPro: true,
    });

    assert.equal(result.usageEventId, "event-6");
    assert.deepEqual(mocks.resolveAIRequest.mock.calls[0][0], {
      requestedModel: getDefaultModel(true),
      apiKeys: [],
      isPro: true,
    });
    const payload = startTable.calls.insert[0][0] as Record<string, unknown>;
    assert.equal(payload.model, resolvedRequest.modelId);
    assert.equal(payload.is_pro, true);
  });

  it("runs the rate limiter when the resolved model requires it", async () => {
    const startTable = startedTable("event-7");
    mocks.createServiceClient.mockResolvedValue(serviceClientFor(startTable));
    mocks.resolveAIRequest.mockReturnValue({
      ...resolvedRequest,
      modelId: "openrouter/paid",
      requiresRateLimit: true,
    });

    const result = await startAIUsageRequest({
      userId: "user-3",
      route: "/api/ai/chat",
      isPro: false,
    });

    assert.equal(result.usageEventId, "event-7");
    assert.deepEqual(mocks.checkRateLimit.mock.calls, [["user-3"]]);
    assert.equal(startTable.calls.update.length, 0);
  });

  it("marks the event rate-limited and throws a 429 when the limiter rejects", async () => {
    const startTable = startedTable("event-8");
    const finishTable = finishedTable({
      ...finishedRow,
      status: "rate_limited",
      error_code: "too many requests",
    });
    mocks.createServiceClient.mockResolvedValue(
      serviceClientFor(startTable, finishTable)
    );
    mocks.resolveAIRequest.mockReturnValue({
      ...resolvedRequest,
      requiresRateLimit: true,
    });
    mocks.checkRateLimit.mockRejectedValue(new Error("too many requests"));

    await assert.rejects(
      () =>
        startAIUsageRequest({
          userId: "user-4",
          route: "/api/ai/chat",
          isPro: false,
        }),
      (error: unknown) => {
        assert.ok(error instanceof AIUsageError);
        assert.equal(error.code, "rate_limited");
        assert.equal(error.status, 429);
        assert.equal(error.message, "too many requests");
        return true;
      }
    );

    assert.deepEqual(finishTable.calls.update[0][0], {
      status: "rate_limited",
      error_code: "too many requests",
      input_tokens: null,
      output_tokens: null,
      total_tokens: null,
    });
    assert.equal(
      mocks.captureServerAnalyticsEvent.mock.calls.at(-1)?.[0].event,
      AnalyticsEvents.AIRequestFailed
    );
  });

  it("uses the fallback rate-limit reason for non-Error rejections", async () => {
    const startTable = startedTable("event-9");
    const finishTable = finishedTable({
      ...finishedRow,
      status: "rate_limited",
      error_code: "rate_limit_exceeded",
    });
    mocks.createServiceClient.mockResolvedValue(
      serviceClientFor(startTable, finishTable)
    );
    mocks.resolveAIRequest.mockReturnValue({
      ...resolvedRequest,
      requiresRateLimit: true,
    });
    mocks.checkRateLimit.mockRejectedValue("quota exceeded");

    await assert.rejects(
      () =>
        startAIUsageRequest({
          userId: "user-5",
          route: "/api/ai/chat",
          isPro: false,
        }),
      (error: unknown) => {
        assert.ok(error instanceof AIUsageError);
        assert.equal(error.message, "Rate limit exceeded");
        assert.equal(error.code, "rate_limited");
        return true;
      }
    );

    const payload = finishTable.calls.update[0][0] as Record<string, unknown>;
    assert.equal(payload.error_code, "rate_limit_exceeded");
  });

  it("records a blocked event and throws a 403 when access resolution fails", async () => {
    const startTable = startedTable("event-10");
    const finishTable = finishedTable({
      ...finishedRow,
      provider: "unknown",
      used_server_key: false,
      status: "blocked",
      error_code: "Unknown model: nope",
    });
    mocks.createServiceClient.mockResolvedValue(
      serviceClientFor(startTable, finishTable)
    );
    mocks.resolveAIRequest.mockImplementation(() => {
      throw new Error("Unknown model: nope");
    });

    await assert.rejects(
      () =>
        startAIUsageRequest({
          userId: "user-6",
          route: "/api/ai/chat",
          config: { model: "nope", apiKeys: [] },
          isPro: false,
        }),
      (error: unknown) => {
        assert.ok(error instanceof AIUsageError);
        assert.equal(error.code, "blocked");
        assert.equal(error.status, 403);
        assert.equal(error.message, "Unknown model: nope");
        return true;
      }
    );

    assert.deepEqual(startTable.calls.insert[0][0], {
      user_id: "user-6",
      route: "/api/ai/chat",
      provider: "unknown",
      model: "nope",
      is_pro: false,
      used_server_key: false,
      status: "started",
    });
    assert.deepEqual(finishTable.calls.update[0][0], {
      status: "blocked",
      error_code: "Unknown model: nope",
      input_tokens: null,
      output_tokens: null,
      total_tokens: null,
    });
    assert.equal(
      mocks.captureServerAnalyticsEvent.mock.calls.at(-1)?.[0].event,
      AnalyticsEvents.AIRequestFailed
    );
  });

  it("uses the fallback blocked reason for non-Error resolution failures", async () => {
    const startTable = startedTable("event-11");
    const finishTable = finishedTable({
      ...finishedRow,
      provider: "unknown",
      status: "blocked",
      error_code: "access_denied",
    });
    mocks.createServiceClient.mockResolvedValue(
      serviceClientFor(startTable, finishTable)
    );
    mocks.resolveAIRequest.mockImplementation(() => {
      throw "denied";
    });

    await assert.rejects(
      () =>
        startAIUsageRequest({
          userId: "user-7",
          route: "/api/ai/chat",
          isPro: false,
        }),
      (error: unknown) => {
        assert.ok(error instanceof AIUsageError);
        assert.equal(error.message, "AI request blocked");
        assert.equal(error.code, "blocked");
        return true;
      }
    );

    const finishPayload = finishTable.calls.update[0][0] as Record<string, unknown>;
    const startPayload = startTable.calls.insert[0][0] as Record<string, unknown>;
    assert.equal(finishPayload.error_code, "access_denied");
    assert.equal(startPayload.provider, "unknown");
    assert.equal(startPayload.model, getDefaultModel(false));
  });
});
