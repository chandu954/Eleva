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
      // measured baseline and must be bumped — never lowered — as tests
      // are added. Baseline 2026-10-25: global 3.08 lines / 79.27 branches
      // / 70.95 functions; src/lib group 16.85 / 64.7 / 37.83.
      thresholds: {
        statements: 3.0,
        branches: 79.0,
        functions: 70.5,
        lines: 3.0,
        glob: {
          "src/lib/**": {
            statements: 16.8,
            branches: 64.5,
            functions: 37.5,
            lines: 16.8,
          },
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
