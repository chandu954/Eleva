# ADR 0002: Enforce data ownership with Supabase RLS

- Status: accepted
- Date: 2026-10-28

## Context

Resumes, profiles, jobs, and related user content are stored in Supabase. The application has authenticated user flows as well as privileged admin and webhook work. A service role bypasses database row policies, so it must not be used as a substitute for user authorization.

## Decision

Use the authenticated Supabase client for user-owned reads and writes, with database RLS policies as the primary ownership boundary. Server routes and actions must authenticate the caller and scope queries to the caller's user ID where applicable. Use the service client only for operations that require elevated access, such as verified webhooks and explicitly authorized admin actions. Database schema and policy changes are versioned as migrations.

## Consequences

Ownership rules are enforced even when application query filters regress. Tests for sensitive actions cover unauthenticated access and cross-user identifiers. Any new service-role call needs an explicit authorization reason and narrow query scope.
