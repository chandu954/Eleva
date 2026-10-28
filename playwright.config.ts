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
    screenshot: "only-on-failure",
  },
  snapshotPathTemplate: "{testDir}/{testFileDir}/__screenshots__/{arg}{ext}",
  expect: {
    toHaveScreenshot: {
      animations: "disabled",
      maxDiffPixelRatio: 0.02,
    },
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    // E2E runs against the production standalone server, which keeps the suite
    // fast and ensures the production build works before browser tests run.
    command: `./node_modules/.bin/next build && cp -r public .next/standalone/ && cp -r .next/static .next/standalone/.next/static/ && node .next/standalone/server.js`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 600_000,
    // Public smoke tests run fully offline with an unreachable Supabase URL.
    // Authenticated checks use only the dedicated disposable E2E project; the
    // AI journey is separately opt-in because production builds use real providers.
    env: {
      PORT: String(PORT),
      E2E_TEST_EMAIL: process.env.E2E_TEST_EMAIL || "",
      E2E_TEST_PASSWORD: process.env.E2E_TEST_PASSWORD || "",
      E2E_AI_TESTS: process.env.E2E_AI_TESTS || "",
      E2E_SUPABASE_URL: process.env.E2E_SUPABASE_URL || "",
      E2E_SUPABASE_SERVICE_ROLE_KEY: process.env.E2E_SUPABASE_SERVICE_ROLE_KEY || "",
      SENTRY_ORG: process.env.SENTRY_ORG || "",
      SENTRY_PROJECT: process.env.SENTRY_PROJECT || "",
      SENTRY_AUTH_TOKEN: process.env.SENTRY_AUTH_TOKEN || "",
      NEXT_PUBLIC_SUPABASE_URL: process.env.E2E_SUPABASE_URL || "http://127.0.0.1:9",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.E2E_SUPABASE_ANON_KEY || "e2e-anon-key",
      SUPABASE_SERVICE_ROLE_KEY: process.env.E2E_SUPABASE_SERVICE_ROLE_KEY || "e2e-service-role-key",
      AI_MOCK_PROVIDER: "true",
      NEXT_TELEMETRY_DISABLED: "1",
    },
  },
});
