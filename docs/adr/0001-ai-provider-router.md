# ADR 0001: Centralize AI provider routing

- Status: accepted
- Date: 2026-10-28

## Context

Eleva supports several model providers, automatic provider selection, model fallback, user supplied credentials, and task specific model preferences. Duplicating those decisions in route handlers makes provider behavior inconsistent and difficult to test.

## Decision

Keep provider definitions and provider adapters under `src/lib/ai/provider`. Route AI work through the shared router and task model helpers. App routes and server actions validate requests and authorization, then call this shared layer. Provider selection and fallback policy belong in the router rather than UI components or individual product actions.

## Consequences

Provider adapters can be tested independently and routing behavior has one owner. New providers require a registry entry, adapter, and focused tests. Product actions should not import provider implementation details directly.
