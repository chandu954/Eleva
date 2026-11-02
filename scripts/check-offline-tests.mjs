import { execSync } from "node:child_process";

/**
 * check-offline-tests.mjs
 *
 * Verifies that the E2E suite runs fully offline without live Supabase/Stripe
 * credentials. Runs `pnpm test:e2e` in an environment with no E2E_* secrets
 * and reports how many tests were skipped due to missing credentials.
 *
 * Exits 0 if zero tests are skipped due to missing credentials.
 * Exits 1 if any auth-gated tests are silently skipped.
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
      timeout: 300_000,
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
  console.log(`Tests skipped due to missing credentials: ${skippedCount}`);
  console.log(
    testExitCode === 0 && skippedCount === 0
      ? "PASS: Playwright passed and zero tests were skipped."
      : "FAIL: Playwright failed or tests were skipped without credentials."
  );
  console.log("\nTo fix: Ensure E2E tests run with mock credentials when E2E_* vars are unset.");

  process.exit(testExitCode === 0 && skippedCount === 0 ? 0 : 1);
}

runOfflineTests();
