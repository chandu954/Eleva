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
      "playwright-report/**",
      "test-results/**",
      "next-env.d.ts",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    files: ["src/app/eleva/**/*.ts", "src/app/eleva/**/*.tsx"],
    rules: {
      // Enforcement point for the any-cleanup sweep. Warn was landed as
      // commit 8145528 with the inventory (103 warnings across 14 files,
      // plus two prompt-studio files hiding behind file-level disables);
      // the per-area elimination commits brought it to zero and removed the
      // disables, so this block is now enforced as error. The prompt-studio
      // block below additionally keeps its stricter plain no-unused-vars.
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
  {
    files: ["src/app/eleva/prompt-studio/**/*.ts", "src/app/eleva/prompt-studio/**/*.tsx"],
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": "error",
    },
  },
];

export default eslintConfig;
