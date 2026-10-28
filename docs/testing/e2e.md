# End to end test setup

The Playwright suite runs its public smoke and accessibility checks against a
local production build. Without Supabase credentials, it uses the unreachable
local endpoint so those tests stay offline.

The dashboard axe scan and authenticated resume workflow require a dedicated
test Supabase project and disposable test user. The user must have a profile
row and permission to create resumes. Configure these variables in the local
environment or as CI secrets:

- `E2E_SUPABASE_URL`
- `E2E_SUPABASE_ANON_KEY`
- `E2E_SUPABASE_SERVICE_ROLE_KEY`
- `E2E_TEST_EMAIL`
- `E2E_TEST_PASSWORD`

The import, studio tailoring, cover letter, and PDF export journey is opt-in:
set `E2E_AI_TESTS=true` only when the test deployment has a configured AI
provider and is safe to use for generated test content. The created resume is
deleted using the test project's service role key after the journey.

Visual screenshot references live in `src/e2e/__screenshots__`. Update them
intentionally with `pnpm exec playwright test src/e2e/accessibility-visual.e2e.test.ts --update-snapshots`.
The editor snapshot is captured only when the authenticated test account is
configured; set the E2E variables above before generating that reference. The
landing reference is checked on every run, including offline runs.
