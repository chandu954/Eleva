import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ProviderBusyError, ProviderError, ProviderInternalError } from "./errors";
import { getRetryDelayMs, runWithRetry, shouldRetryError, shouldRetryResult } from "./retry";
import type { AIProviderResult } from "./types";

const okResult: AIProviderResult = {
  success: true, provider: "openrouter", model: "m", latency: 1, finishReason: "stop", data: "ok",
};

const failedResult: AIProviderResult = {
  success: false, provider: "openrouter", model: "m", latency: 1, finishReason: "error", data: null, error: "Upstream 500",
};

describe("shouldRetryError", () => {
  it("retries busy/internal/timeout errors", () => {
    assert.equal(shouldRetryError(new ProviderBusyError("openrouter")), true);
    assert.equal(shouldRetryError(new ProviderInternalError("openrouter")), true);
  });

  it("does not retry non-retryable errors", () => {
    assert.equal(shouldRetryError(new Error("boom")), false);
    assert.equal(shouldRetryError(new ProviderError("auth failed", "openrouter", 401, false)), false);
  });
});

describe("shouldRetryResult", () => {
  it("retries failed results unless schema/auth related", () => {
    assert.equal(shouldRetryResult(failedResult), true);
    assert.equal(shouldRetryResult(okResult), false);
    assert.equal(shouldRetryResult({ ...failedResult, error: "Schema validation failed: nope" }), false);
    assert.equal(shouldRetryResult({ ...failedResult, error: "authentication failed" }), false);
  });
});

describe("getRetryDelayMs", () => {
  it("honors retry-after from the provider", () => {
    assert.equal(getRetryDelayMs(new ProviderBusyError("openrouter", 1500), 1), 1500);
  });

  it("backs off exponentially", () => {
    assert.equal(getRetryDelayMs(undefined, 1), 500);
    assert.equal(getRetryDelayMs(undefined, 2), 1000);
    assert.equal(getRetryDelayMs(undefined, 3), 2000);
  });
});

describe("runWithRetry", () => {
  it("succeeds on the first attempt", async () => {
    let calls = 0;
    const { value, retries } = await runWithRetry({
      run: async () => { calls++; return okResult; },
      isRetryableResult: shouldRetryResult,
      isRetryableError: shouldRetryError,
      maxRetries: 2,
    });
    assert.equal(retries, 0);
    assert.equal(value, okResult);
    assert.equal(calls, 1);
  });

  it("retries transient failures and succeeds", async () => {
    let calls = 0;
    const { value, retries } = await runWithRetry({
      run: async () => {
        calls++;
        if (calls < 3) return failedResult;
        return okResult;
      },
      isRetryableResult: shouldRetryResult,
      isRetryableError: shouldRetryError,
      maxRetries: 2,
    });
    assert.equal(retries, 2);
    assert.equal(value, okResult);
    assert.equal(calls, 3);
  });

  it("gives up and returns the last failed result after exhausting retries", async () => {
    const { value, retries } = await runWithRetry({
      run: async () => failedResult,
      isRetryableResult: shouldRetryResult,
      isRetryableError: shouldRetryError,
      maxRetries: 2,
    });
    assert.equal(retries, 2);
    assert.equal(value, failedResult);
  });

  it("rethrows retryable thrown errors after retries are exhausted", async () => {
    let calls = 0;
    await assert.rejects(
      runWithRetry({
        run: async () => { calls++; throw new ProviderBusyError("openrouter", 10); },
        isRetryableResult: shouldRetryResult,
        isRetryableError: shouldRetryError,
        maxRetries: 1,
      }),
      ProviderBusyError,
    );
    assert.equal(calls, 2);
  });

  it("rethrows non-retryable errors immediately", async () => {
    let calls = 0;
    await assert.rejects(
      runWithRetry({
        run: async () => { calls++; throw new Error("auth"); },
        isRetryableResult: shouldRetryResult,
        isRetryableError: shouldRetryError,
        maxRetries: 2,
      }),
      /auth/,
    );
    assert.equal(calls, 1);
  });
});
