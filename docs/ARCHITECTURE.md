# Architecture

Eleva is a Next.js App Router application. Route handlers and server actions
are the boundary for authenticated operations; browser components call those
boundaries and render the returned state. Supabase is the source of truth for
user and resume data. Row Level Security remains part of the authorization
boundary, so server-side service-role access must be narrowly scoped.

## Source layout

- `src/app/` contains App Router pages, layouts, and API route handlers.
- `src/components/` contains shared UI and feature components.
- `src/lib/` contains domain services, schemas, integrations, caching, and
  provider adapters.
- `src/utils/` contains shared server actions and Supabase helpers.
- `src/test/` contains reusable test setup and external-service stubs.

The enforced dependency direction and cycle rules are in
`.dependency-cruiser.cjs`; CI runs them with `pnpm check:architecture`. The
production TypeScript source size limit is enforced with
`pnpm check:source-loc`.

## AI request flow

AI-backed routes validate inputs with Zod, resolve the current user and access
policy, then call the provider router under `src/lib/ai/provider/`. The router
selects a provider/model from server configuration and handles retry policy.
Routes return typed HTTP responses and record structured errors without
including provider credentials. The main resume tailoring pipeline is
`src/app/eleva/api/studio/pipeline/route.ts`; shared parsing, scoring and cache
helpers are next to that route.

## Data and authorization

Supabase Postgres stores application data. User-facing reads and writes use
the authenticated server client and database RLS policies. Service-role access
is reserved for operations that require it, such as trusted webhook or admin
work, and must not be exposed to browser code. The ownership decisions and
policy are recorded in [ADR 0002](adr/0002-rls-and-data-ownership.md).

## External services

- Stripe handles checkout and billing events; verified webhooks update the
  local subscription state ([ADR 0003](adr/0003-billing-and-stripe-events.md)).
- Upstash Redis is used for shared rate limits and cache entries when
  configured; local/test operation can use in-process adapters.
- Sentry captures application errors and sampled traces. PostHog and
  OpenTelemetry integrations are configured separately.
- Vercel hosts the production web application. Terraform manages the Vercel
  and Upstash infrastructure declared under `terraform/`.

## Quality gates

CI runs lint, architecture checks, the source-size gate, Knip and jscpd
baselines, typecheck, Vitest, coverage thresholds, Playwright/Lighthouse,
dependency audit, Helm validation, and Terraform validation. See
`docs/adr/0004-testing-and-coverage-policy.md` for measured coverage policy and
`docs/testing/` for test scope and known limits.
