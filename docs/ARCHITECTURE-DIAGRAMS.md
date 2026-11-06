# Architecture diagrams

This document contains the module-boundary and data-flow diagrams for Eleva. It complements
`docs/ARCHITECTURE.md` (textual layout) and the ADRs under `docs/adr/`.

## 1. Request data flow (AI-backed operations)

```mermaid
flowchart TD
    subgraph Client ["Browser / client"]
        UI[UI components]
        Form[Server actions / form submissions]
    end

    subgraph App ["Next.js App Router (src/app)"]
        RH[API route handlers]
        SA[Server actions]
        Zod[Zod request validation]
    end

    subgraph Domain ["Domain services (src/lib, src/utils)"]
        PR[AI provider router]
        Retry[runWithRetry]
        CB[Provider circuit breaker]
        Cache[Response cache]
        ORCH[Pipeline orchestrator]
    end

    subgraph Providers ["LLM providers"]
        OA[OpenAI]
        AN[Anthropic]
        OR[OpenRouter]
        NV[NVIDIA]
    end

    subgraph Data ["Data layer"]
        SB[(Supabase Postgres + RLS)]
        KVS[(Upstash Redis / in-process cache)]
    end

    subgraph Observability ["Observability"]
        Log[Structured JSON logger]
        Sentry[Sentry error tracking]
    end

    UI --> RH
    Form --> SA
    RH --> Zod
    SA --> Zod
    Zod --> PR
    PR --> Retry
    Retry --> CB
    CB --> OA
    CB --> AN
    CB --> OR
    CB --> NV
    PR --> Cache
    ORCH --> Cache
    ORCH --> SB
    RH --> SB
    SA --> SB
    Log --> Sentry
```

### Flow notes
- Every AI request is validated with Zod before reaching the provider router (`docs/adr/0001-ai-provider-router.md`).
- Provider selection and fallback policy live in the shared router, not in UI components or individual actions.
- Provider SDKs and fetch adapters enforce a 120-second request timeout.
- Errors are recorded through the structured JSON logger and reported to Sentry; provider credentials never leave the server.

## 2. Stripe billing / webhook data flow

```mermaid
flowchart TD
    subgraph Stripe ["Stripe (external)"]
        Checkout[Checkout / portal sessions]
        WH[Webhook events]
    end

    subgraph App ["Next.js App Router"]
        Srv[Server-side session creation]
        WHRoute[Stripe webhook route handler]
    end

    subgraph Domain ["Domain services"]
        Ledger[Webhook event ledger (idempotency)]
        State[Subscription state]
    end

    subgraph Data ["Data layer"]
        SB[(Supabase Postgres + RLS)]
    end

    Checkout --> Srv
    Srv --> SB
    WH --> WHRoute
    WHRoute --> Ledger
    Ledger --> State
    State --> SB
```

### Flow notes
- Checkout and portal sessions are created server-side; clients never supply plan values for access checks.
- Verified Stripe webhooks are the authoritative subscription lifecycle signal.
- Webhook processing is idempotent via the event ledger; duplicate deliveries are safe (`docs/adr/0003-billing-and-stripe-events.md`).

## 3. Module boundaries and dependency direction

```mermaid
flowchart TB
    subgraph "Layer 1: Presentation (outermost)"
        AppRouter[src/app — routes, layouts, API handlers]
        Components[src/components — UI and feature components]
    end

    subgraph "Layer 2: Application"
        ServerActions[src/utils/actions — server actions]
        Lib[src/lib — domain services, schemas, integrations]
    end

    subgraph "Layer 3: Infrastructure / adapters"
        Supabase[src/utils/supabase — Supabase clients]
        Providers[src/lib/ai/provider — provider adapters]
        KV[src/lib — cache / rate-limit adapters]
    end

    subgraph "Layer 4: External services"
        SS[(Supabase Postgres)]
        LLM[(LLM providers)]
        STRIPE[(Stripe)]
        REDIS[(Upstash Redis)]
    end

    AppRouter --> ServerActions
    Components --> ServerActions
    ServerActions --> Lib
    Lib --> Supabase
    Lib --> Providers
    Lib --> KV
    Supabase --> SS
    Providers --> LLM
    KV --> REDIS
    ServerActions -.-> STRIPE
```

### Dependency rule
Dependencies flow inward only: presentation → application → infrastructure → external. Cycles are blocked by `.dependency-cruiser.cjs`, enforced in CI via `pnpm check:architecture`.
