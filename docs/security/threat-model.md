# Eleva threat model

**Scope:** the Next.js application, its API routes and server actions, Supabase,
Redis, Stripe, configured AI providers, and CI/deployment workflows.

**Review date:** 2026-10-28

## Assets and trust boundaries

- User identity, resumes, job descriptions, cover letters, and generated AI
  content are private application data. Browser requests cross the application
  boundary into authenticated server actions and API routes.
- Supabase Auth identifies users. PostgreSQL row-level security (RLS) is the
  data-access boundary; server-side service credentials have broader access
  and must remain in deployment secrets.
- AI providers, Stripe, Redis, Sentry, and Vercel are external services. Data
  sent to each service is limited to the feature's required payload and is
  governed by that provider's retention and access controls.
- CI builds code from pull requests. GitHub Actions tokens use read-only
  permissions by default; publishing and infrastructure apply workflows have
  separate, scoped permissions and protected environments.

## Main threats and controls

| Threat | Controls in the repository | Residual work |
| --- | --- | --- |
| A user reads or changes another user's resume | Authenticated server actions, owner filters, RLS policies, and route tests | Recheck RLS whenever a table or query is added; never use the service role for user-scoped reads. |
| Forged or replayed Stripe webhook changes subscription access | Signature verification, server-only secret, event ledger/idempotency, and webhook tests | Rotate webhook credentials if exposed and monitor failed signature events. |
| Prompt injection or malicious resume/job-description content changes system behavior | Input schemas, bounded payloads, typed AI outputs, provider routing, and error handling | AI output is untrusted; validate it before persistence or rendering and avoid placing secrets in prompts. |
| Malformed PDF or imported text exploits a parser or consumes resources | Import route validation, extraction limits, UI error paths, and tests | Keep parser dependencies updated and retain upload/request size limits at the edge. |
| Provider keys or deployment credentials leak | Environment-only secrets, gitleaks history scan, secret-pattern CI check, and scoped GitHub environments | Store production credentials only in GitHub/Vercel secret stores; rotate them after suspected exposure. |
| Vulnerable or tampered dependency/container enters a release | Lockfile, dependency audit, Dependabot, pinned Node base digest, Dockerfile lint, and source SBOM artifact | Review dependency and image findings; advance pinned digests through reviewed updates. |
| Compromised pull request modifies the build or deploy pipeline | Pull-request checks use read-only repo permissions; apply and publish workflows are isolated | Protect `main`, require CI, and configure required reviewers for production environments. |

## Operational assumptions

- Supabase RLS is enabled for user-owned tables and reviewed alongside schema
  migrations. A privileged service key bypasses RLS and is treated as a
  production secret.
- Production must set Redis, Stripe, Supabase, provider, and Sentry secrets in
  their designated secret stores; placeholder values in examples are not
  credentials.
- The source SBOM is attached to the GitHub Actions run as an artifact. Review
  it with each release and add an image-level vulnerability gate after the
  release image has a defined finding and exception policy.
- Security findings and incidents are handled using
  [SECURITY.md](../../SECURITY.md) and the
  [operations runbook](../operations/runbook.md).

## Review cadence

Review this document after material changes to authentication, RLS, imports,
billing, provider data flows, deployment permissions, or secret handling, and
at least annually.
