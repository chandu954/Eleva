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
  {
    files: ["src/**/*.test.{ts,tsx}", "src/**/*.spec.{ts,tsx}"],
    ignores: ["src/test/**"],
    rules: {
      // The unit suite must run fully offline (see CONTRIBUTING.md →
      // "Offline test guarantee"). src/test/setup.ts rejects unmocked global
      // fetch at runtime; these rules catch it statically so an accidental
      // network call fails `pnpm lint` instead of a CI test run. Approved
      // stub helpers live under src/test/ and are exempt.
      "no-restricted-syntax": [
        "error",
        {
          // Only flag *invocations* of fetch. Bare references such as
          // `expect(fetch).toHaveBeenCalledWith(...)` or
          // `vi.mocked(fetch).mockResolvedValueOnce(...)` are the sanctioned
          // way to assert against the stub installed by src/test/setup.ts, so
          // a reference-level rule (no-restricted-globals) is the wrong tool.
          // Only flag *invocations* of fetch, matched on the callee so that
          // argument-position references — `expect(fetch).toHaveBeenCalled()`,
          // `vi.mocked(fetch).mockResolvedValueOnce(...)` — stay legal. Those
          // are the sanctioned way to assert against the stub installed by
          // src/test/setup.ts.
          selector: "CallExpression[callee.type='Identifier'][callee.name='fetch']",
          message:
            "Network access is disabled in unit tests. Stub the boundary under src/test/ (or vi.stubGlobal('fetch', …)) instead of invoking fetch directly.",
        },
        {
          selector:
            "CallExpression[callee.object.name='globalThis'][callee.property.name='fetch']",
          message:
            "Network access is disabled in unit tests. Stub the boundary under src/test/ instead of calling globalThis.fetch directly.",
        },
        {
          selector:
            "CallExpression[callee.object.name='window'][callee.property.name='fetch']",
          message:
            "Network access is disabled in unit tests. Stub the boundary under src/test/ instead of calling window.fetch directly.",
        },
        {
          selector:
            "ImportDeclaration[source.value=/^(axios|node-fetch|got|undici|superagent|cross-fetch)$/]",
          message:
            "Do not import network clients inside tests; stub the module boundary under src/test/.",
        },
        {
          selector:
            "NewExpression > Identifier[name=/^(WebSocket|XMLHttpRequest|EventSource)$/]",
          message:
            "WebSocket/XMLHttpRequest/EventSource are not available offline in unit tests; stub the boundary instead.",
        },
      ],
    },
  },
];

export default eslintConfig;

