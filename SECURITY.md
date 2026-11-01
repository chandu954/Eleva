# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| >= 1.3.0 | :white_check_mark: |
| < 1.3.0  | :x:                |

## Reporting a Vulnerability

Please report security vulnerabilities to the project maintainers via GitHub Security Advisories. Do not disclose vulnerabilities in public issues.

## Secret Scanning

This repository scans for exposed credentials in every CI run:

- GitHub access tokens (`gh[pousr]_*`, `github_pat_*`)
- Stripe live keys (`sk_live_*`)
- Stripe webhook secrets (`whsec_*`)

Test fixtures use clearly fake placeholder values (prefixed with `MOCK_*`, `sk_test_mock_`, `whsec_mock_`) that are allowlisted in `.gitleaks.toml`. These are never live credentials.

## Environment Variables

Build-time defaults are provided for offline development and testing. Production deployments must set real values for:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `SENTRY_DSN`

Missing required variables will cause startup validation to fail loudly rather than silently proceeding with invalid state.

## Infrastructure Security

- Terraform applies run in protected environments with S3 remote state
- Checkov security scanning runs in CI with `soft_fail: false` (blocking)
- TFLint runs with the recommended ruleset
- Helm charts are scanned with Checkov and linted with `helm lint --strict`
