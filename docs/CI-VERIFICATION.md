# CI Verification from a Fresh Clone

This document records the exact commands used to verify that Eleva installs,
builds, and tests from a completely fresh checkout — no pre-existing state,
no cached dependencies, no real credentials required.

## Full verification pipeline

Run these commands in order from a clean checkout:

```bash
# 1. Wipe all local state
rm -rf node_modules .next pnpm-lock.yaml

# 2. Install from the committed lockfile
pnpm install --frozen-lockfile

# 3. Typecheck
pnpm typecheck

# 4. Lint
pnpm lint

# 5. Build (production)
pnpm build

# 6. Unit tests (offline-safe; rejects unmocked fetch)
pnpm test

# 7. Coverage ratchet (must meet 75.2/85/82.5/75.2 thresholds)
pnpm coverage
```

Every step must exit 0. The coverage step prints the global thresholds being
met; if any threshold falls below its floor, CI fails.

## Offline guarantee

`pnpm check:offline` re-runs the unit suite inside a sandboxed network
namespace (OS-level network disabled). It confirms no test makes a live
host call (node:net, real sockets, DNS). Run it separately:

```bash
pnpm check:offline
```

## E2E tests

Public-surface E2E tests (`src/e2e/public-pages.e2e.test.ts`) run offline by
default: Supabase points at a closed local port and the mock AI provider is
forced on. No credentials or network services are required.

```bash
pnpm test:e2e
```

Authenticated E2E tests (`src/e2e/accessibility-visual.e2e.test.ts`) require
`E2E_TEST_EMAIL`, `E2E_TEST_PASSWORD`, and the `E2E_SUPABASE_*` variables.
They are skipped by default in CI when those variables are absent. To run
them, set the variables in your CI job or local environment.

## Expected coverage thresholds

The `pnpm coverage` step enforces these global floors (ratcheted upward over
time):

| Metric | Floor |
|--------|-------|
| Statements | 75.2% |
| Branches | 85.0% |
| Functions | 82.5% |
| Lines | 75.2% |

The coverage report must print values at or above these floors for CI to pass.

## What "fresh clone" means

- No `node_modules` directory
- No `.next` build output
- No `pnpm-lock.yaml` modifications
- No `.env.local` or real Supabase/Stripe/OpenAI credentials
- No network access beyond the package registry (for `pnpm install`)

If all steps pass from this state, the repository is in a clean, verifiable
condition suitable for CI and for new contributors to onboard.
