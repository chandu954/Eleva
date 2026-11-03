import { execSync } from "node:child_process";

/**
 * check-offline-tests.mjs
 *
 * Verifies that the E2E suite exits successfully without E2E service
 * credentials. Authenticated page scans use the local mock Supabase service;
 * the optional AI integration journey remains skipped unless explicitly enabled.
 *
 * Exits 0 when `pnpm test:e2e` passes with all E2E_* credentials unset.
 * Exits 1 when the offline suite fails.
 */

const skippedPattern = /\b(\d+)\s+skipped\b/gi;

function runOfflineTests() {
  console.log("Running E2E suite with no credentials (offline mode)...\n");

  const env = {
    ...process.env,
    // Unset all E2E credentials to simulate a naive clone
    E2E_TEST_EMAIL: "",
    E2E_TEST_PASSWORD: "",
    E2E_SUPABASE_URL: "",
    E2E_SUPABASE_ANON_KEY: "",
    E2E_SUPABASE_SERVICE_ROLE_KEY: "",
    E2E_AI_TESTS: "",
    // Force mock AI provider so tests don't need real provider keys
    AI_MOCK_PROVIDER: "true",
  };

  let output = "";
  let testExitCode = 0;
  try {
    output = execSync("pnpm test:e2e", {
      env,
      stdio: "pipe",
      timeout: 600_000,
      encoding: "utf8",
    });
  } catch (err) {
    output = err.stdout?.toString() ?? "";
    output += err.stderr?.toString() ?? "";
    testExitCode = err.status ?? 1;
  }

  // Count skipped tests from Playwright's summary (for example, "2 skipped").
  const skippedCount = [...output.matchAll(skippedPattern)].reduce(
    (total, match) => total + Number(match[1]),
    0
  );

  console.log("\n=== Offline E2E Verification Report ===\n");
  console.log(`Playwright exit code: ${testExitCode}`);
  console.log(`Playwright tests skipped: ${skippedCount}`);
  console.log(
    testExitCode === 0
      ? "PASS: Playwright passed with no external E2E credentials."
      : "FAIL: Playwright failed without external E2E credentials."
  );
  console.log("The local mock Supabase service covers authenticated accessibility checks; the AI journey is opt-in.");

  process.exit(testExitCode === 0 ? 0 : 1);
}

runOfflineTests();
