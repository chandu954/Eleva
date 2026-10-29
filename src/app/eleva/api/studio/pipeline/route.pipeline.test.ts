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

import { stubSupabase, stubTable, type PostgrestStub } from "@/test/postgrest-stub";
import { AIProvider } from "@/lib/eleva-ai-provider";
import {
  JD,
  RESUME_ID,
  extractFixture,
  initialScoreFixture,
  letterFixture,
  makeRequest,
  parseSse,
  rescoreFixture,
  respondToSchema,
  resumePersistenceTables,
  resumeRow,
  schemaShape,
  skillsFixture,
  summaryFixture,
} from "@/test/pipeline-route-test-utils";
import { POST } from "./route";
import {
  clearPipelineCaches,
  getCachedExtract,
  setCachedExtract,
  setCachedScore,
} from "./cache";

interface SupabaseSpy {
  from: ReturnType<typeof vi.fn>;
  auth: { getUser: ReturnType<typeof vi.fn> };
}

function installSupabase(
  user: { id: string } | null,
  tables: Record<string, PostgrestStub | PostgrestStub[]>,
): SupabaseSpy {
  const client = stubSupabase(user, tables) as unknown as SupabaseSpy;
  mockCreateClient.mockResolvedValue(client as never);
  return client;
}

function requestPrompts(): string[] {
  return vi
    .mocked(AIProvider.generateObject)
    .mock.calls.map(([params]) => (params as { prompt?: string }).prompt ?? "");
}

async function setupPipelineSuite() {
  vi.clearAllMocks();
  await clearPipelineCaches();
  vi.mocked(AIProvider.generateObject).mockReset();
  vi.mocked(AIProvider.generate).mockReset();
  vi.mocked(AIProvider.generateObject).mockImplementation(async (params) =>
    respondToSchema(params as { schema: unknown; prompt?: string }),
  );
  vi.mocked(AIProvider.generate).mockResolvedValue(letterFixture as never);
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
}

beforeEach(setupPipelineSuite);

describe("Pipeline route - authenticated and streaming pipeline", () => {
  it("runs an unauthenticated pipeline and streams every step to completion", async () => {
    const jdCache = stubTable({ data: null, error: null });
    const client = installSupabase(null, { jd_extract_cache: jdCache });

    const res = await POST(makeRequest({ jobDescription: JD }));

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/event-stream; charset=utf-8");
    expect(res.headers.get("cache-control")).toBe("no-cache, no-transform");
    expect(res.headers.get("x-accel-buffering")).toBe("no");

    const events = parseSse(await res.text());
    const stepNames = events
      .filter((event) => event.event === "step")
      .map((event) => event.data.step);
    expect(stepNames).toEqual(expect.arrayContaining([
      "extract", "score", "plan", "tailor", "rescore", "review", "letter",
    ]));

    const done = events.find((event) => event.event === "done");
    expect(done?.data).toMatchObject({
      overall: 88,
      previousOverall: 62,
      company: "Acme",
      role: "Senior Backend Engineer",
      keywordsAdded: 3,
      bulletsRewritten: 2,
      compatibility: 0,
      isLowCompat: true,
      sectionsModified: 4,
      optimizationStatus: "Tailored Resume Ready",
      resumeId: null,
      coverLetterId: null,
      letterBody: letterFixture.text,
      plan: {
        rewriteSummary: true,
        rewriteExperience: true,
        rewriteProjects: true,
        rewriteSkills: true,
        keywordsToInject: 1,
        hardTruthNote: null,
      },
      review: {
        wouldInterview: true,
        score: 88,
        recommendation: "Hire for a backend interview.",
      },
      quality: { passed: true, issues: [], score: 90 },
    });
    expect(events.some((event) => event.event === "error")).toBe(false);

    // No user means no resume lookup; only the shared JD cache is touched
    // (read once, upsert once).
    expect(client.from.mock.calls).toEqual([
      ["jd_extract_cache"],
      ["jd_extract_cache"],
    ]);
    expect(requestPrompts()[0]).toBe(`Job Description:\n${JD}`);
    expect(jdCache.calls.upsert).toHaveLength(1);
    expect(vi.mocked(AIProvider.generate)).toHaveBeenCalledTimes(1);
  });

  it("uses the Redis JD cache and skips both the AI extractor and the database", async () => {
    await setCachedExtract(JD, extractFixture);
    const client = installSupabase(null, {});

    const res = await POST(makeRequest({ jobDescription: JD }));
    const events = parseSse(await res.text());

    expect(client.from).not.toHaveBeenCalled();
    expect(requestPrompts().some((prompt) => prompt.startsWith("Job Description:"))).toBe(false);

    const extractDone = events.filter(
      (event) => event.event === "step" && event.data.step === "extract" && event.data.status === "done",
    );
    expect(extractDone[0].data).toMatchObject({ cached: true, data: extractFixture });
    expect(events.find((event) => event.event === "done")?.data).toMatchObject({
      company: "Acme",
      overall: 88,
    });
  });

  it("uses the shared database JD cache when Redis misses", async () => {
    const jdCache = stubTable({
      data: { payload: extractFixture, created_at: new Date().toISOString() },
      error: null,
    });
    installSupabase(null, { jd_extract_cache: jdCache });

    const res = await POST(makeRequest({ jobDescription: JD }));
    const events = parseSse(await res.text());

    expect(jdCache.calls.select[0][0]).toBe("payload,created_at");
    expect(jdCache.calls.gte[0]).toEqual(["created_at", expect.any(String)]);
    expect(jdCache.calls.maybeSingle).toHaveLength(1);
    expect(requestPrompts().some((prompt) => prompt.startsWith("Job Description:"))).toBe(false);
    expect(
      events.find(
        (event) => event.event === "step" && event.data.step === "extract" && event.data.cached === true,
      )?.data,
    ).toMatchObject({ data: extractFixture });
  });

  it("serves the initial score from Redis", async () => {
    await setCachedExtract(JD, extractFixture);
    await setCachedScore("", JD, initialScoreFixture);
    installSupabase(null, {});

    const res = await POST(makeRequest({ jobDescription: JD }));
    const events = parseSse(await res.text());

    expect(requestPrompts().some((prompt) => prompt.startsWith("Resume:"))).toBe(false);
    expect(events.find((event) => event.event === "done")?.data).toMatchObject({
      previousOverall: 62,
      overall: 88,
    });
    await expect(getCachedExtract(JD)).resolves.toEqual(extractFixture);
  });

  it("scopes an explicit resume lookup to the caller and persists pipeline results", async () => {
    await setCachedExtract(JD, extractFixture);
    const persistence = resumePersistenceTables(resumeRow);
    installSupabase({ id: "user-1" }, persistence.tables);

    const res = await POST(makeRequest({ jobDescription: JD, resumeId: RESUME_ID }));
    const events = parseSse(await res.text());

    expect(persistence.select.calls.eq).toEqual([
      ["id", RESUME_ID],
      ["user_id", "user-1"],
    ]);
    expect(persistence.select.calls.maybeSingle).toHaveLength(1);

    const done = events.find((event) => event.event === "done");
    expect(done?.data).toMatchObject({
      resumeId: RESUME_ID,
      coverLetterId: "cl-1",
      previousOverall: 62,
      overall: 88,
    });

    expect(persistence.atsScores.calls.insert[0][0]).toMatchObject({
      user_id: "user-1",
      resume_id: RESUME_ID,
      overall: 88,
      keyword: 85,
      raw: rescoreFixture,
    });
    expect(persistence.insert.calls.insert[0][0]).toMatchObject({
      user_id: "user-1",
      name: "Base Resume",
      target_role: "Backend Engineer",
      is_base_resume: false,
      professional_summary: summaryFixture.professional_summary,
      skills: skillsFixture.skills,
    });
    expect(persistence.coverLetters.calls.insert[0][0]).toMatchObject({
      user_id: "user-1",
      resume_id: RESUME_ID,
      company: "Acme",
      role: "Senior Backend Engineer",
      body: letterFixture.text,
    });
    expect(persistence.activity.calls.insert[0][0]).toMatchObject({
      user_id: "user-1",
      kind: "pipeline_run",
      title: "Resume tailored for Senior Backend Engineer",
      subtitle: "Acme",
    });
    expect(persistence.notifications.calls.insert[0][0]).toMatchObject({
      user_id: "user-1",
      kind: "pipeline_complete",
      title: "Pipeline complete · 62% → 88%",
    });
  });

  it("loads the base resume when no resumeId is supplied", async () => {
    await setCachedExtract(JD, extractFixture);
    const persistence = resumePersistenceTables(resumeRow);
    installSupabase({ id: "user-1" }, persistence.tables);

    const res = await POST(makeRequest({ jobDescription: JD }));
    const events = parseSse(await res.text());

    expect(persistence.select.calls.eq).toEqual([
      ["user_id", "user-1"],
      ["is_base_resume", true],
    ]);
    expect(persistence.select.calls.limit).toEqual([[1]]);
    expect(events.find((event) => event.event === "done")?.data).toMatchObject({
      resumeId: RESUME_ID,
    });
  });

  it("skips score and resume persistence when the caller has no resume", async () => {
    await setCachedExtract(JD, extractFixture);
    const select = stubTable({ data: null, error: null });
    const coverLetters = stubTable({ data: { id: "cl-2" }, error: null });
    const activity = stubTable({ data: null, error: null });
    const notifications = stubTable({ data: null, error: null });
    installSupabase({ id: "user-1" }, {
      resumes: select,
      cover_letters: coverLetters,
      activity_log: activity,
      notifications,
    });

    const res = await POST(makeRequest({ jobDescription: JD }));
    const events = parseSse(await res.text());

    expect(select.calls.maybeSingle).toHaveLength(1);
    expect(events.find((event) => event.event === "done")?.data).toMatchObject({
      resumeId: null,
      coverLetterId: "cl-2",
    });
    expect(coverLetters.calls.insert[0][0]).toMatchObject({ resume_id: undefined });
  });

  it("falls back to a template cover letter when the provider rate-limits", async () => {
    await setCachedExtract(JD, extractFixture);
    installSupabase(null, {});
    vi.mocked(AIProvider.generate).mockRejectedValue(
      Object.assign(new Error("Too many requests"), { statusCode: 429 }),
    );

    const res = await POST(makeRequest({ jobDescription: JD }));
    const events = parseSse(await res.text());

    expect(events.some((event) => event.event === "error")).toBe(false);
    const letterChunk = events.find((event) => event.event === "letter-chunk");
    expect(String(letterChunk?.data.text)).toContain("Dear Hiring Manager");
    const done = events.find((event) => event.event === "done");
    expect(String(done?.data.letterBody)).toContain("Dear Hiring Manager");
    expect(vi.mocked(AIProvider.generate)).toHaveBeenCalledTimes(1);
  });

  it("streams a classified error event when the cover-letter provider fails", async () => {
    await setCachedExtract(JD, extractFixture);
    installSupabase(null, {});
    vi.mocked(AIProvider.generate).mockRejectedValue(
      new Error("upstream provider exploded"),
    );

    const res = await POST(makeRequest({ jobDescription: JD }));
    const events = parseSse(await res.text());

    const errorEvent = events.find((event) => event.event === "error");
    expect(errorEvent?.data).toMatchObject({
      message: "upstream provider exploded",
      reason: "provider",
      step: "letter",
      provider: "openrouter",
      statusCode: 0,
    });
    expect(typeof errorEvent?.data.traceId).toBe("string");
    expect(events.some((event) => event.event === "done")).toBe(false);
  });

  it("uses the local extraction fallback when the AI extractor fails", async () => {
    const jdCache = stubTable({ data: null, error: null });
    installSupabase(null, { jd_extract_cache: jdCache });
    let extractAttempts = 0;
    vi.mocked(AIProvider.generateObject).mockImplementation(async (params) => {
      const shape = schemaShape((params as { schema: unknown }).schema);
      if ("required_skills" in shape && extractAttempts++ === 0) {
        throw new Error("extract provider down");
      }
      return respondToSchema(params as { schema: unknown; prompt?: string });
    });

    const localJd = "Acme is hiring a Senior Backend Engineer to build TypeScript services with PostgreSQL.";
    const res = await POST(makeRequest({ jobDescription: localJd }));
    const events = parseSse(await res.text());

    expect(events.some((event) => event.event === "error")).toBe(false);
    const extractDone = events.filter(
      (event) => event.event === "step" && event.data.step === "extract" && event.data.status === "done",
    );
    expect(extractDone[0].data).toMatchObject({
      data: expect.objectContaining({ company: "Acme", role: "Senior Backend Engineer" }),
    });
    expect(events.find((event) => event.event === "done")).toBeDefined();
    // One text fallback for extraction, one direct letter generation.
    expect(vi.mocked(AIProvider.generate)).toHaveBeenCalledTimes(2);
  });
});
