# ADR 0001: Centralize AI provider routing

- Status: accepted
- Date: 2026-10-28

## Context

Eleva supports several model providers, automatic provider selection, model fallback, user supplied credentials, and task specific model preferences. Duplicating those decisions in route handlers makes provider behavior inconsistent and difficult to test.

## Decision

Keep provider definitions and provider adapters under `src/lib/ai/provider`. Route AI work through the shared router and task model helpers. App routes and server actions validate requests and authorization, then call this shared layer. Provider selection and fallback policy belong in the router rather than UI components or individual product actions. Provider SDKs and fetch-based adapters enforce a 120-second request timeout. A process-local circuit breaker opens after five consecutive failed operations, blocks calls for 30 seconds, then admits one recovery probe. The breaker tracks the terminal result after retry handling, and applies to primary and fallback calls.

## Consequences

Provider adapters can be tested independently and routing behavior has one owner. New providers require a registry entry, adapter, and focused tests, including timeout configuration. The circuit state is local to a running process and resets on a cold start; it reduces repeated calls to a failing provider within a warm instance but is not a distributed availability control. Product actions should not import provider implementation details directly.
