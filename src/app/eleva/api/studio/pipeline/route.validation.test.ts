// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockCreateClient } = vi.hoisted(() => ({ mockCreateClient: vi.fn() }));

vi.mock("@/utils/supabase/server", () => ({
  createClient: mockCreateClient,
}));

vi.mock("@/lib/eleva-ai-provider", async () => {
  const zod = await import("zod");
  return {
    AIProvider: {
      generateObject: vi.fn(),
      generate: vi.fn(),
      getSystemPrompt: vi.fn(() => "system prompt"),
    },
    z: zod,
  };
});

vi.mock("@/lib/api-response", () => ({
  apiError: (code: string, message: string, details?: unknown) => {
    return new Response(JSON.stringify({ error: code, message, details }), {
      status: code === "UNAUTHORIZED" ? 401 : code === "RATE_LIMITED" ? 429 : 400,
      headers: { "content-type": "application/json" },
    });
  },
}));

import { stubSupabase, type PostgrestStub } from "@/test/postgrest-stub";
import { makeRequest } from "@/test/pipeline-route-test-utils";
import { POST } from "./route";

function installSupabase(
  user: { id: string } | null,
  tables: Record<string, PostgrestStub | PostgrestStub[]>,
) {
  const client = stubSupabase(user, tables);
  mockCreateClient.mockResolvedValue(client as never);
  return client;
}

function resetPipelineValidationMocks() {
  vi.clearAllMocks();
  installSupabase(null, {});
}

beforeEach(resetPipelineValidationMocks);

describe("Pipeline route - validation", () => {
  it("rejects missing jobDescription", async () => {
    const res = await POST(makeRequest({ resumeId: "123e4567-e89b-12d3-a456-426614174000" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("INVALID_BODY");
  });

  it("rejects short jobDescription (< 20 chars)", async () => {
    const res = await POST(makeRequest({ jobDescription: "too short" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("INVALID_BODY");
  });

  it("rejects invalid resumeId format", async () => {
    const res = await POST(makeRequest({ jobDescription: "a".repeat(25), resumeId: "not-a-uuid" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("INVALID_BODY");
  });

  it("rejects body with wrong types", async () => {
    const res = await POST(makeRequest({ jobDescription: 123 }));
    expect(res.status).toBe(400);
  });
});
