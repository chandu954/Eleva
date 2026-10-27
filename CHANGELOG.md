# Changelog

All notable changes to Eleva are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Security headers** (`src/lib/security-headers.ts`, wired in `next.config.ts`):
  a tested CSP allowlisting only Supabase, Stripe, PostHog, Sentry, Buy Me a
  Coffee and blob PDF workers, plus HSTS, `X-Content-Type-Options`,
  `X-Frame-Options`, `Referrer-Policy` and a restrictive `Permissions-Policy`.
  Development keeps `'unsafe-eval'` and HMR websockets; production adds
  `upgrade-insecure-requests` and one year of HSTS.
- **CodeQL and secret scanning** (`.github/workflows/codeql.yml`,
  `.github/workflows/security.yml`): CodeQL `security-and-quality` analysis on
  pushes, PRs and a weekly schedule, and a pinned gitleaks full-history scan
  with documented allowlists for Helm demo keys and Stripe test fixtures.
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
- **Coverage expansion**: 129 test files / 1,469 tests, adding suites for the chatbot,
  dashboard resumes section, tailored-job card/dialog, admin users table, resume PDF,
  provider selector, base-resume dialog, jobs AI and AI-provider actions, dashboard data,
  Supabase middleware, tools, usage ledger, API-key hook, description points, the
  document-settings extraction, editor/studio/cover-letter pages, prompt studio, Stripe
  webhook, Eleva server actions, export/pipeline routes, auth form, settings/jobs/pricing,
  resume and profile forms, landing demos, sidebar/copilot, root layout, blog post page,
  resume health and keyword heatmap. Measured coverage is 64.94% statements/lines
  (branches 84.51%, functions 80.11%); the enforced global statement/line floor is
  50.0%, with the ratchet policy documented in CONTRIBUTING.
- **ProjectsForm test suite** (16 RTL tests): project CRUD and reordering, technology
  add/dedupe/remove, description-point add/edit/delete, AI point generation with error
  dialogs, and AI point improvement with undo.
- **Step-log panel component + tests** (`studio/_components/step-log-panel.tsx`), extracted
  from `studio-client.tsx` with 5 unit tests.
- **Studio wire types** (`studio/_lib/studio-types.ts`): typed DSL mirrors the pipeline's zod
  payloads; replaced all `any`-typed pipeline state in `studio-client.tsx`.
- **CHANGELOG.md** and a dependency/audit policy section in `CONTRIBUTING.md`.

### Changed

- **Coverage floors ratcheted to 60% statements/lines, 83% branches and 79%
  functions** (measured baseline 64.94 / 84.51 / 80.11) now that the Phase 2E
  suites are on `main`.
- Split `projects-form.tsx` (855 → 238 lines) into a presentational
  `projects/ProjectCard` (457 lines) and a `useProjectAI` hook (306 lines) that
  owns suggestion generation, point rewriting, undo/review state and the shared
  error dialog. All 16 existing behavior tests pass unchanged; two new tests
  cover accepting an improvement and clearing review state on manual edits.
- Extracted editor state and view components from `editor/page.tsx` (1,221 → 460 lines);
  every extracted file is under 500 lines and covered by 24 hook tests.
- Dependency refresh with no breaking majors: Next.js 15.1.11 → 15.5.28, `ai` 4.0 → 4.3.19,
  `@posthog/ai` 7.18 → 7.21, `@sentry/nextjs` 10.67 → 10.76, `openai` 4.77 → 4.104,
  OpenTelemetry SDK 0.217 → 0.300.
- All specs consolidated under Vitest; stale access-control and pipeline tests rewritten
  against current behavior; added `countChangedSections`, identity, and role-title
  edge-case tests for the studio pipeline.

### Fixed

- **Infrastructure Checkov job** now uses `checkov-action` v12.3135.0
  (Checkov 3.3.30) instead of the 2022-era v12.1347.0 image, which failed
  before scanning. The Helm scan still reports vendor Supabase findings with
  `soft_fail: true`; the Terraform scan remains strict.
- **Docker image builds** now copy `pnpm-workspace.yaml` and `.npmrc` into the
  dependency stages. `pnpm install --frozen-lockfile` needs the workspace
  overrides/`allowBuilds` that the lockfile was resolved with, so the build
  previously failed before compiling the app.
- **Stripe webhook configuration failures now return 500** instead of a 400
  signature error. Missing `STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET` is
  resolved before signature verification and logged as
  `stripe.webhook.config_error`, so Stripe retries a misconfigured deployment
  instead of treating it as a bad client request.
- **Export errors no longer leak database or renderer internals**: resume PDF
  and DOCX lookups return a generic 404 (with the real PostgREST/RLS error
  logged server-side), and all four export routes return a generic
  `EXPORT_FAILED` message.
- **Resume preview failures are recoverable**: a rejected `pdf().toBlob()` now
  shows an alert with a retry button instead of an endless skeleton, and the
  PDF cache key includes the `base`/`tailored` variant (plus target role) so
  variants cannot collide.
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

- Browser hardening headers (CSP with explicit third-party allowlists, HSTS,
  `nosniff`, frame denial, referrer and permissions policies) are sent on
  every route; the policy is covered by unit tests.
- CodeQL (`security-and-quality`) and a pinned gitleaks full-history scan run
  in CI on every push/PR and weekly, alongside the existing credential grep and
  dependency audit.
- API export routes and the Stripe webhook no longer echo internal error
  details to callers; database/renderer errors are logged server-side with
  structured context.
- `pnpm-workspace.yaml` audit policy documents 4 accepted high advisories
  (`jws`, `tinypool` ×2 dev-only, `zod`) with removal criteria; CI fails on any new
  high/critical advisory.
- Semver-compatible `overrides` pin stale transitive dependencies
  (`lodash`, `minimatch`, `brace-expansion`, `ws`, `tar-fs`, …).

## [0.1.0]

Initial public release: AI resume editor, prompt studio, ATS pipeline studio, PDF export,
Supabase auth with row-level security, and a standardized API error envelope.
