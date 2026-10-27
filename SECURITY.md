# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in Eleva, please report it privately by emailing the maintainers at **security@eleva.app**.

Please do **not** report security vulnerabilities through public GitHub issues.

## What to Include

- Description of the vulnerability
- Steps to reproduce
- Affected versions
- Potential impact

## Response Timeline

- **24 hours**: Acknowledgment of receipt
- **7 days**: Initial assessment and mitigation plan
- **30 days**: Fix deployed (depending on severity)

## Scope

The following are in scope:
- Authentication bypass
- Data exposure via API
- RLS policy bypass
- Prompt injection leading to data leakage
- XSS, CSRF, SSRF vulnerabilities

The following are out of scope:
- Rate limiting issues
- Missing security headers
- Self-XSS
- Social engineering attacks

## Supported versions

Eleva is developed on `main`; security fixes land there first and are
backported only when a supported release line exists.

| Version | Supported |
| --- | --- |
| `main` | ✅ |
| `v1.0.x` | ✅ |
| older tags | ❌ |

## Security model

- **Authentication** — Supabase Auth (Google OAuth + email/password) with SSR
  session refresh in `src/utils/supabase/middleware.ts`.
- **Authorization** — Row Level Security on every user-owned table; API routes
  re-check the session and scope queries by `user_id`.
- **Input validation** — Zod schemas validate API bodies and AI output before
  persistence. File imports are size/type constrained.
- **Secrets** — credentials live only in environment variables. `.env*` files
  are gitignored; `.env.example` documents the shape without real values.
  Credential-shaped log context is redacted by `src/lib/logger.ts`.
- **Rate limiting** — Redis-backed limiter (Upstash or local) guards AI and
  write endpoints; missing production config fails closed at startup.
- **Webhooks** — Stripe signatures are verified before any subscription state
  is changed.
- **Dependencies** — `pnpm audit --audit-level=high` runs in CI; accepted
  advisories are documented in `pnpm-workspace.yaml` with removal criteria.
- **Infrastructure** — Terraform state and `terraform.tfvars` are never
  committed; CI runs TFLint and Checkov policy scans on infrastructure changes.
