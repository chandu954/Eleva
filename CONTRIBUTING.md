# Contributing to Eleva

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/eleva.git`
3. Install dependencies: `pnpm install`
4. Copy `.env.example` to `.env.local` and fill in required values
5. Start the dev server: `pnpm dev`

## Development Guidelines

### Code Style

- TypeScript strict mode is enabled — use proper types
- Server Components by default; `'use client'` only when interactivity is needed
- Use `async/await` over `.then()`
- Import types with `type` prefix: `import type { Foo } from './bar'`
- Prefer `interface` over `type` for object types
- Avoid enums; use `const` objects or string unions
- Log through `src/lib/logger.ts` (`logger.info/warn/error`) in server code;
  do not add bare `console.*` calls. Pass structured context instead of
  interpolated strings, and use `logger.child({ requestId })` for request-scoped
  logs. Credential-shaped context keys are redacted automatically.

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` — new feature
- `fix:` — bug fix
- `refactor:` — code change that neither fixes nor adds
- `chore:` — build process, tooling, dependencies
- `docs:` — documentation only
- `perf:` — performance improvement
- `security:` — security fix

### Pull Request Process

1. Create a feature branch from `main`
2. Make your changes
3. Run `pnpm lint` and `pnpm typecheck` — both must pass
4. Run `pnpm test` (and `pnpm coverage` when touching logic); run
   `pnpm test:e2e` when touching public routing, auth redirects, or the health
   endpoint
5. Run `pnpm build` — must succeed
6. Submit a PR with a clear description of the change

### Testing & Coverage Ratchet

Unit tests run through Vitest (`pnpm test`); `pnpm coverage` additionally
enforces the thresholds configured in `vitest.config.ts` and fails when
they are not met (CI runs both).

- Thresholds sit just below the measured baseline of the test suite and
  act as a **ratchet**: they must be raised — never lowered — whenever
  new tests land and the baseline stayed flat or improved.
- Adding a new code file under test can legitimately pull the baseline
  down (the file enters the measured set with partial coverage). In that
  case re-measure with `pnpm coverage`, set the affected floors just
  under the new measured values, and say so in the commit message. Every
  other metric's floor must move up.
- To raise a threshold: after adding a test, measure the new baseline
  with `pnpm coverage`, then bump the corresponding numbers in
  `vitest.config.ts` (global block and/or per-glob group) to sit just
  below the new measured values, and include that bump in the same
  commit as the new tests.
- Do not game the ratchet by excluding files from `coverage.include` or
  adding new `coverage.exclude` entries — extensions to the exclude list
  need a justification comment next to the change.

#### Offline test guarantee

The unit suite must pass without network access. AI calls go through the
deterministic `AI_MOCK_PROVIDER` adapter, and Supabase/PostgREST access is
stubbed (`src/test/postgrest-stub.ts`, `stubSupabase`). No test may hit a
live provider, database, or Stripe endpoint. Vitest replaces unmocked global
`fetch` with a rejecting function and tests that guard explicitly
(`src/test/network-guard.test.ts`). This catches accidental fetch calls; it is
not a process-wide socket firewall. On macOS you can verify the whole suite
with OS-level network access disabled:

```bash
sandbox-exec -p '(version 1)(allow default)(deny network*)' pnpm test
```

CI runs `pnpm test` with the same fetch guard and mock provider enabled through
`src/test/setup.ts` and `vitest.config.ts`; if a new test needs a network-shaped
dependency, add a stub next to `src/test/` instead of contacting the service.

#### End-to-end smoke tests

Playwright specs live next to the app under `src/e2e/` with the
`*.e2e.test.ts` suffix (Vitest excludes that pattern). They run against a real
Next.js server and must stay credential-free:

```bash
pnpm test:e2e
```

`playwright.config.ts` injects dummy Supabase credentials and
`AI_MOCK_PROVIDER=true` into the web server, so the suite only asserts public
routing, signed-out redirects, login rendering, and the health endpoint. Do not
add specs that require live Supabase, Stripe, Redis, or LLM accounts; mock the
boundary or keep the assertion at the public-contract level.

#### Performance budgets

CI runs Lighthouse against the public Eleva entry page and login page with a
90 performance score floor, LCP below 2.5 seconds, and CLS below 0.1. A route
bundle check also measures gzip-compressed first-load JavaScript and CSS from
the App Router manifest:

- `/resumes/[id]`: at most 500 KiB
- `/home` and `/eleva/resumes`: at most 400 KiB each

After a production build, run `pnpm check:bundles` to check these caps locally.
The resume editor keeps its PDF viewer in an on-demand client chunk; PDF
generation and downloads run through authenticated server routes.

#### Infrastructure checks

Terraform changes must pass the same gates CI runs:

```bash
terraform fmt -check -recursive terraform
cd terraform/envs/production
terraform init -backend=false
terraform validate
terraform test -no-color
tflint --init --config="$(git rev-parse --show-toplevel)/.tflint.hcl"
tflint --recursive --config="$(git rev-parse --show-toplevel)/.tflint.hcl"
uvx --from checkov checkov -d terraform --framework terraform
```

Never commit `terraform.tfvars`, state, or plan files (`.gitignore` covers
them); `terraform.tfvars.example` documents the expected inputs. The PR job
runs a mock-provider plan without credentials or creating infrastructure.
Repository administrators should require the `Terraform validation` status
check in branch protection. A real credentialed plan/apply remains gated by
the `VERCEL_API_TOKEN`/`UPSTASH_*` secrets.

### Dependency & Audit Policy

Dependencies are managed with pnpm; the lockfile is committed and CI
installs with `--frozen-lockfile`.

- `pnpm install` locally after pulling changes that touch
  `package.json` or `pnpm-lock.yaml`.
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm coverage`, and
  `pnpm build` must pass before a commit lands.

#### Audit gate

`.github/workflows/ci.yml` runs `pnpm audit --audit-level=high` and the
quality job fails on any unaccepted high or critical advisory.

- Prefer fixing an advisory through a direct bump (`pnpm update <pkg>`)
  or a semver-compatible `overrides` entry in `pnpm-workspace.yaml` over
  accepting it.
- `auditConfig.ignoreGhsas` in `pnpm-workspace.yaml` holds the accepted
  advisories; every entry needs a comment naming the affected package,
  why no fixed version can be adopted yet, and what to watch for before
  removing it. Review the list quarterly.
- Never widen an override compiler range or pin an old vulnerable
  version to silence an audit failure — that trades a red build for a
  real vulnerability.

#### Overrides

`pnpm-workspace.yaml` carries two kinds of overrides:

1. **Vulnerability-driven selectors** — pin only the vulnerable ranges
   (`lodash@<=4.17.23` etc.) so consumers keep their declared majors.
2. **Build-critical version alignment** — e.g. `zod` 3.25.76 (the
   `zod/v3` subpath the `ai` package imports only exists in >= 3.25) and
   `@opentelemetry/api` ^1.10.0 (required by the OTel SDK 0.300 train).
   These keep the tree on a single compatible version; removing one
   breaks `next build`, not just a CI check.

### Architecture Notes

- AI provider routing lives in `src/lib/ai/provider/`
- All AI operations must go through `AIProvider` in `src/lib/eleva-ai-provider.ts`
- Server actions go in `src/utils/actions/`
- API routes go in `src/app/api/` or `src/app/eleva/api/`
- Database migrations go in `supabase/migrations/`
