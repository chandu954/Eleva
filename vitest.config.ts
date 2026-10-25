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
      // the projects-form suite landed): global 5.09 lines / 79.11
      // branches / 70.37 functions; src/lib group 17.42 / 66.66 / 36.58.
      // Functions floors sit lower because projects-form.tsx (854 lines)
      // enters the measured set with partial function coverage; global
      // lines and src/lib statements/branches floors were raised in the
      // same commit.
      thresholds: {
        statements: 5.0,
        branches: 79.0,
        functions: 70.3,
        lines: 5.0,
        // Per-glob group thresholds are top-level keys alongside the global
        // metrics (a "glob:" wrapper key is NOT supported — vitest would
        // treat the literal string "glob" as a pattern matching nothing).
        "src/lib/**": {
          statements: 17.4,
          branches: 66.4,
          functions: 36.5,
          lines: 17.4,
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
