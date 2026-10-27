import { defineConfig, devices } from "@playwright/test";

const PORT = process.env.PORT || 4000;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./src",
  testMatch: "**/*.e2e.test.{ts,tsx}",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [["html", { outputFolder: "playwright-report" }]],
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    // E2E runs against a production build: `next dev` cold-compiles this app
    // for minutes per route, while `next start` keeps the suite fast and
    // deterministic. The build also acts as a CI smoke test of `next build`.
    command: `pnpm build && pnpm exec next start --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 600_000,
    // Smoke tests run fully offline: dummy Supabase credentials make the auth
    // client return "no user" without reaching a live project, and the mock AI
    // provider guarantees no external LLM calls even if a page touches AI code.
    env: {
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:9",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "e2e-anon-key",
      SUPABASE_SERVICE_ROLE_KEY: "e2e-service-role-key",
      AI_MOCK_PROVIDER: "true",
      NEXT_TELEMETRY_DISABLED: "1",
    },
  },
});
