import assert from "node:assert/strict";
import { beforeEach, describe, it, vi } from "vitest";

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

import { stubTable } from "@/test/postgrest-stub";
import {
  finishedRow,
  finishedTable,
  resolvedRequest,
  serviceClientFor,
  startedTable,
} from "@/test/usage-ledger-test-utils";

function resetUsageLedgerMocks() {
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
}

import { AnalyticsEvents } from "@/lib/analytics/events";
import {
  AIUsageError,
  finishAIUsageRequest,
  recordAIUsageFinished,
  recordAIUsageStarted,
  usageFromLanguageModelUsage,
} from "./usage-ledger";

beforeEach(resetUsageLedgerMocks);

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
