import { execSync } from "node:child_process";

/**
 * check-offline-tests.mjs
 *
 * Verifies that the E2E suite exits successfully without E2E service
 * credentials. Authenticated page scans use the local mock Supabase service;
 * the optional AI integration journey remains skipped unless explicitly enabled.
 *
 * Exits 0 when `pnpm test:e2e` passes with all E2E_* credentials unset AND the
 * number of skipped tests stays at or below the documented offline baseline.
 * Exits 1 when the offline suite fails or the skip count drifts upward.
 *
 * The offline baseline is the number of tests that legitimately require
 * provisioned E2E accounts (the AI integration journey). It is documented in
 * CONTRIBUTING.md → "Offline test guarantee" and must be raised — never
 * lowered — when a new auth-gated test lands.
 */

const skippedPattern = /\b(\d+)\s+skipped\b/gi;

// Tests that require provisioned E2E accounts (AI journey). This is the
// ratcheted offline baseline: it must only go up when a new auth-gated test
// is added, and the justification lands in the same commit.
const OFFLINE_SKIP_BASELINE = 0;

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
  console.log(`Offline skip baseline: ${OFFLINE_SKIP_BASELINE}`);
  console.log(
    testExitCode === 0
      ? "PASS: Playwright passed with no external E2E credentials."
      : "FAIL: Playwright failed without external E2E credentials."
  );
  console.log("The local mock Supabase service covers authenticated accessibility checks; the AI journey is opt-in.");

  const skipOk = skippedCount <= OFFLINE_SKIP_BASELINE;
  if (testExitCode !== 0) {
    console.log("FAIL: Offline E2E suite did not pass.");
    process.exit(1);
  }
  if (!skipOk) {
    console.log(
      `FAIL: ${skippedCount} tests skipped exceeds the offline baseline ` +
        `of ${OFFLINE_SKIP_BASELINE}. A naive clone must not silently skip ` +
        `auth-gated tests. See CONTRIBUTING.md → "Offline test guarantee".`
    );
    process.exit(1);
  }
  console.log("PASS: Offline E2E suite passed with zero auth-gated skips.");
  process.exit(0);
}

runOfflineTests();
