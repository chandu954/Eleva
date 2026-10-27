import { expect, test } from "@playwright/test";

/**
 * Health endpoint contract.
 *
 * The dummy Supabase URL used by the Playwright web server means the database
 * probe fails deterministically, so the endpoint must report `degraded` with a
 * 503 rather than throw or hang. A production deployment with reachable
 * dependencies returns 200/`ok`; both paths share the same JSON shape.
 */
test("health endpoint returns a structured status without throwing", async ({ request }) => {
  const response = await request.get("/api/health");

  expect([200, 503]).toContain(response.status());

  const body = (await response.json()) as {
    status: string;
    timestamp: string;
    env: Record<string, string>;
    database: string;
    uptime: number;
  };

  expect(["ok", "degraded"]).toContain(body.status);
  expect(body.env.NEXT_PUBLIC_SUPABASE_URL).toBe("present");
  expect(body.env.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBe("present");
  expect(body.env.SUPABASE_SERVICE_ROLE_KEY).toBe("present");
  expect(["connected", "error", "unchecked"]).toContain(body.database);
  expect(Number.isFinite(body.uptime)).toBe(true);
  expect(new Date(body.timestamp).toString()).not.toBe("Invalid Date");

  expect(response.status()).toBe(body.status === "ok" ? 200 : 503);
  expect(body.status).toBe(body.database === "connected" ? "ok" : "degraded");
});
