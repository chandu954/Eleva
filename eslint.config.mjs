import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  {
    // `pnpm lint` runs the ESLint CLI over the whole repo (`eslint .`
    // replacing the deprecated `next lint`); keep build and tool output
    // out of the lint scope.
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "coverage/**",
      ".stryker-tmp/**",
      "reports/mutation/**",
      "playwright-report/**",
      "test-results/**",
      "next-env.d.ts",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: [
      "src/**/*.test.{ts,tsx}",
      "src/**/*.spec.{ts,tsx}",
      "src/**/*.e2e.{ts,tsx}",
      "src/test/**",
      "src/**/*.d.ts",
      "src/**/*.generated.{ts,tsx}",
      "src/**/*.gen.{ts,tsx}",
    ],
    rules: {
      // Keep production TypeScript free of explicit `any`. Tests, generated
      // files, and test support are excluded so their fixtures stay practical.
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
  {
    files: ["src/app/eleva/prompt-studio/**/*.ts", "src/app/eleva/prompt-studio/**/*.tsx"],
    rules: {
      "@typescript-eslint/no-unused-vars": "error",
    },
  },
];

export default eslintConfig;
