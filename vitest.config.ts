import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    exclude: ["src/**/*.e2e.test.{ts,tsx}", "**/node_modules/**"],
    // Mock-mode AI provider on in every unit test: tests exercise the
    // deterministic offline provider (src/lib/ai/provider/providers/mock.ts)
    // instead of any live provider, and the AI_MOCK_PROVIDER gating tests
    // manage the variable explicitly via vi.resetModules + dynamic imports.
    env: {
      AI_MOCK_PROVIDER: "true",
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.test.{ts,tsx}",
        "src/**/*.d.ts",
        "src/**/*.config.*",
        "src/test/**",
      ],
      // Ratchet policy (CONTRIBUTING.md): thresholds sit just below the
      // measured baseline and must be bumped — never lowered without a
      // recorded reason — as tests are added.
      //
      // 2026-10-26 realignment (recorded reason for the global branches/
      // functions changes): the previous floors (71.1 functions / 81.8
      // branches) were recorded against a stale measurement and their own
      // gate was already failing on main (measured 65.92 functions /
      // 81.54 branches) after commit 0dd9009 added the pipeline/registry
      // suites into the measured set. This commit additionally wires the
      // (fully tested) mock provider into the registry, so all six live
      // provider adapter files enter the measured set for the first time
      // (branches 55.9-77%), and lands per-provider transport-contract
      // suites. Measured after that: 9.2 statements / 80.13 branches /
      // 68.9 functions global; src/lib 36.14 / 77.04 / 43.9. Floors sit
      // just below those measurements; the branches/functions floors are
      // expected to RATCHET back past their previous levels as the
      // remaining provider branches and src/lib action modules gain tests.
      //
      // 2026-10-26 second ratchet (start of the Phase 2E unit-test push):
      // first suite added since the realignment — auth-schemas (login and
      // signup zod schemas, 100% module coverage). Measured after it:
      // global 10.74 / 80.61 / 71.66; src/lib 38.66 / 85.05 / 52.17.
      // Floors sit just below those measurements and continue to ratchet
      // with each test batch.
      //
      // NOTE on which number to trust: the printed table's src/lib line
      // (85.05 branches) is NOT the number the threshold checker uses —
      // at this commit the checker reported 80.98 for src/lib branches,
      // so the branch floor was corrected to sit just below that value
      // (the realignment floors had been derived the same way). Floor
      // bumps read the checker's reported values, not the table.
      //
      // 2026-10-26 third ratchet: applications route handler suite added
      // (17 tests: auth guard, bodySchema validation, real apiError
      // envelope, CRUD query derivation, activity logging). Measured
      // global after it: 10.97 / 80.97 / 72.08. Floors sit just below.
      thresholds: {
        statements: 10.5,
        branches: 80.5,
        functions: 71.7,
        lines: 10.5,
        // Per-glob group thresholds are top-level keys alongside the global
        // metrics (a "glob:" wrapper key is NOT supported — vitest would
        // treat the literal string "glob" as a pattern matching nothing).
        "src/lib/**": {
          statements: 38.2,
          branches: 80.5,
          functions: 51.9,
          lines: 38.2,
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
