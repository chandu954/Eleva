# ADR 0003: Keep billing state server authoritative

- Status: accepted
- Date: 2026-10-28

## Context

Subscriptions are managed through Stripe, while the application stores subscription state for access checks. Browser callbacks can be replayed or forged, and webhook deliveries can be retried.

## Decision

Treat verified Stripe webhooks as the authoritative subscription lifecycle signal. Verify signatures using server secrets, return server errors for missing configuration, and use the webhook event ledger to make processing idempotent. Checkout and portal sessions are created server-side. Access checks use persisted subscription state rather than client supplied plan values.

## Consequences

Webhook handlers must remain safe under duplicate delivery and log configuration failures without exposing secrets. Changes to Stripe event handling require tests for signature errors, retries, and subscription state transitions.
