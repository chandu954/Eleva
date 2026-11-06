import { defineConfig, devices } from "@playwright/test";
import { e2eConfig } from './src/e2e/e2e-config';

const PORT = process.env.PORT || 4000;
const BASE_URL = `http://localhost:${PORT}`;
const MOCK_SUPABASE_URL = e2eConfig.supabaseUrl;
const webServers = [];

if (e2eConfig.useMockSupabase) {
  webServers.push({
    command: 'node scripts/e2e/mock-supabase.mjs',
    url: `${MOCK_SUPABASE_URL}/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 10_000,
  });
}

webServers.push({
  // E2E runs against the production standalone server, which keeps the suite
  // fast and ensures the production build works before browser tests run.
  command: `./node_modules/.bin/next build && cp -r public .next/standalone/ && cp -r .next/static .next/standalone/.next/static/ && node .next/standalone/server.js`,
  url: BASE_URL,
  reuseExistingServer: !process.env.CI,
  timeout: 600_000,
  env: {
    PORT: String(PORT),
    E2E_TEST_EMAIL: e2eConfig.email,
    E2E_TEST_PASSWORD: e2eConfig.password,
    E2E_AI_TESTS: process.env.E2E_AI_TESTS || '',
    E2E_SUPABASE_URL: MOCK_SUPABASE_URL,
    E2E_SUPABASE_ANON_KEY: e2eConfig.supabaseAnonKey,
    E2E_SUPABASE_SERVICE_ROLE_KEY: e2eConfig.supabaseServiceRoleKey,
    E2E_REDIS_IN_MEMORY: 'true',
    SENTRY_ORG: process.env.SENTRY_ORG || '',
    SENTRY_PROJECT: process.env.SENTRY_PROJECT || '',
    SENTRY_AUTH_TOKEN: process.env.SENTRY_AUTH_TOKEN || '',
    NEXT_PUBLIC_SUPABASE_URL: MOCK_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: e2eConfig.supabaseAnonKey,
    SUPABASE_SERVICE_ROLE_KEY: e2eConfig.supabaseServiceRoleKey,
    AI_MOCK_PROVIDER: 'true',
    NEXT_TELEMETRY_DISABLED: '1',
  },
});

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
  webServer: webServers,
});
