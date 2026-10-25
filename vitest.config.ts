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
      // recorded reason — as tests are added. Baseline 2026-10-25 (after
      // the local-scorer and api-response suites landed): global 5.42
      // lines / 81.94 branches / 71.25 functions; src/lib group
      // 19.92 / 74.6 / 41.86. Functions floors sit lower because
      // projects-form.tsx (854 lines) enters the measured set with
      // partial function coverage; all floors were raised in the same
      // commit as the covering tests.
      thresholds: {
        statements: 5.3,
        branches: 81.8,
        functions: 71.1,
        lines: 5.3,
        // Per-glob group thresholds are top-level keys alongside the global
        // metrics (a "glob:" wrapper key is NOT supported — vitest would
        // treat the literal string "glob" as a pattern matching nothing).
        "src/lib/**": {
          statements: 19.8,
          branches: 74.4,
          functions: 41.7,
          lines: 19.8,
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
