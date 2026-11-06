# Failure handling, retries, and idempotency

This document consolidates Eleva's failure-handling behavior across AI provider calls, Stripe
webhooks, and general request handling. It complements:

- `docs/adr/0001-ai-provider-router.md` — AI provider selection, fallback, circuit breaker
- `docs/adr/0003-billing-and-stripe-events.md` — Stripe webhook lifecycle and idempotency
- `docs/ARCHITECTURE-DIAGRAMS.md` — data-flow diagrams

## 1. AI provider failure handling

### Retry policy (`src/lib/ai/provider/retry.ts`)
- Maximum retries: 2 (overridable via `AI_MAX_RETRIES` env var).
- Base retry delay: 500 ms, exponential backoff capped at 30 s.
- `ProviderBusyError` honors the provider's `retryAfter` hint (capped at 30 s).

### What is retryable (`src/lib/ai/provider/errors.ts`)
Retryable:
- `ProviderBusyError` (HTTP 429 / rate-limited)
- `ProviderInternalError` (HTTP 5xx)
- `TimeoutError` / `AbortSignal` timeouts
- `NetworkError`

Not retryable:
- Schema-validation failures
- Authentication / API-key errors ("not set")
- Unknown 4xx status codes

### Circuit breaker (`src/lib/ai/provider/circuit-breaker.ts`)
- Opens after 5 consecutive failures for a provider.
- Cooldown: 30 s, then admits one recovery probe.
- If the probe fails, the circuit re-opens; if it succeeds, the circuit closes.
- State is process-local and resets on cold start; it is not a distributed availability control.

### Timeouts
- Provider SDKs and fetch-based adapters enforce a 120-second request timeout.

### Routing semantics (`src/lib/ai/provider/router.ts`)
- Provider selection and fallback policy live in the shared router.
- Primary and fallback calls both pass through retry + circuit breaker.
- New providers require a registry entry, adapter, and focused tests including timeout configuration.

## 2. Stripe webhook failure handling and idempotency (`docs/adr/0003-billing-and-stripe-events.md`)

### Signature verification
- Incoming webhook signatures are verified using server secrets.
- Missing Stripe configuration returns a server error; verification failures are not silently ignored.

### Idempotency
- Verified Stripe webhooks are the authoritative subscription lifecycle signal.
- Webhook processing is made idempotent through a webhook event ledger: already-processed events are detected and skipped, so duplicate Stripe deliveries are safe.
- Webhook handlers log configuration failures without exposing secrets.

### Access checks
- Subscription entitlement reads use persisted subscription state, not client-supplied plan values.
- Checkout and portal sessions are created server-side.

## 3. General request handling

### Error envelope
- API routes return a standardized typed error envelope (`apiError`) with a stable error code, message, and optional detail.
- Structured errors exclude provider credentials.

### Observability
- Structured JSON logger (`src/lib/logger.ts`) records request lifecycle and errors.
- Sentry captures application errors and sampled traces.
- PostHog and OpenTelemetry integrations are configured separately.

### Health
- `/api/health` documents service availability (see README).

## 4. Testing coverage of failure paths

Unit and integration tests cover:
- Provider error normalization and retryability decisions (`src/lib/ai/provider/errors.test.ts`)
- Stripe webhook signature errors, retries, and subscription state transitions (`docs/adr/0003-billing-and-stripe-events.md`)
- Authorization, data ownership, billing, and AI provider routing error paths
