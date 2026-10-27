# Changelog

All notable changes to Eleva are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Quality-gating CI** (`.github/workflows/ci.yml`): jobs on PRs and pushes to `main` —
  `quality` (lint, typecheck, unit tests, enforced coverage thresholds), `e2e`
  (Playwright smoke tests), `audit` (`pnpm audit --audit-level=high` with documented
  exemptions), `infrastructure` (Helm/kubeconform/Checkov), and `terraform`
  (fmt, validate, TFLint, Checkov, optional read-only plan).
- **Structured JSON logging** (`src/lib/logger.ts`): dependency-free logger that works in
  Node.js and Edge runtimes, with per-request child context, `LOG_LEVEL` filtering,
  credential redaction, and Error/stack serialization. API routes, startup validation,
  the AI router, analytics, the Stripe webhook, and pipeline helpers now emit structured
  events instead of bare `console.*` calls, with 12 unit tests.
- **Terraform infrastructure** (`terraform/`): reusable Vercel project and Upstash Redis
  modules composed in `envs/production`, a committed provider lockfile, and TFLint/Checkov
  configuration. Vercel project/environment provisioning no longer depends on dashboard
  clicks.
- **Playwright smoke suite** (`src/e2e/`): landing redirect, public landing, signed-out
  workspace redirect, login/signup rendering, and the health-endpoint contract, running
  against dummy Supabase credentials and the mock AI provider with no externals.
- **Dev container** (`.devcontainer/devcontainer.json`) and **SECURITY.md**: compose-backed
  onboarding with Playwright/Vitest/Terraform editor integrations, plus a documented
  vulnerability disclosure process and security model.
- **Coverage expansion**: 92 test files / 1,044 tests, adding suites for the chatbot,
  dashboard resumes section, tailored-job card/dialog, admin users table, resume PDF,
  provider selector, base-resume dialog, jobs AI and AI-provider actions, dashboard data,
  Supabase middleware, tools, usage ledger, API-key hook, description points, and the
  document-settings extraction. Measured coverage is 44.0% statements/lines
  (branches 82.0%, functions 76.0%); the enforced global statement/line floor is
  35.0% to leave CI headroom, with the ratchet policy documented in CONTRIBUTING.
- **ProjectsForm test suite** (16 RTL tests): project CRUD and reordering, technology
  add/dedupe/remove, description-point add/edit/delete, AI point generation with error
  dialogs, and AI point improvement with undo.
- **Step-log panel component + tests** (`studio/_components/step-log-panel.tsx`), extracted
  from `studio-client.tsx` with 5 unit tests.
- **Studio wire types** (`studio/_lib/studio-types.ts`): typed DSL mirrors the pipeline's zod
  payloads; replaced all `any`-typed pipeline state in `studio-client.tsx`.
- **CHANGELOG.md** and a dependency/audit policy section in `CONTRIBUTING.md`.

### Changed

- Extracted editor state and view components from `editor/page.tsx` (1,221 → 460 lines);
  every extracted file is under 500 lines and covered by 24 hook tests.
- Dependency refresh with no breaking majors: Next.js 15.1.11 → 15.5.28, `ai` 4.0 → 4.3.19,
  `@posthog/ai` 7.18 → 7.21, `@sentry/nextjs` 10.67 → 10.76, `openai` 4.77 → 4.104,
  OpenTelemetry SDK 0.217 → 0.300.
- All specs consolidated under Vitest; stale access-control and pipeline tests rewritten
  against current behavior; added `countChangedSections`, identity, and role-title
  edge-case tests for the studio pipeline.

### Fixed

- Technology **Enter-to-add** in ProjectsForm was dead code: React 19 removed
  `onKeyPress`; now handled via `onKeyDown`.
- ProjectsForm update handlers mutated shared project objects in place, which the memo
  comparator's `JSON`-based props compare could not detect — the UI froze with immutable
  parents. All updates are now immutable.
- `next.config.ts` pins `outputFileTracingRoot` to the project; Next 15.5 previously
  inferred a stray parent workspace root and relocated the standalone build output,
  breaking the Docker `cp` steps.
- Credential hygiene: `.env.example` is tracked in git; `.env`-style files stay ignored.

### Security

- `pnpm-workspace.yaml` audit policy documents 4 accepted high advisories
  (`jws`, `tinypool` ×2 dev-only, `zod`) with removal criteria; CI fails on any new
  high/critical advisory.
- Semver-compatible `overrides` pin stale transitive dependencies
  (`lodash`, `minimatch`, `brace-expansion`, `ws`, `tar-fs`, …).

## [0.1.0]

Initial public release: AI resume editor, prompt studio, ATS pipeline studio, PDF export,
Supabase auth with row-level security, and a standardized API error envelope.
