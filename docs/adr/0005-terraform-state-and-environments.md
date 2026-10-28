# ADR 0005: Isolate Terraform state by environment

- Status: proposed
- Date: 2026-10-28

## Context

Terraform currently has production configuration and cloud resources, but the production backend example documents local state as the default. Shared local state risks concurrent writes and makes recovery difficult. Staging and production also need independent change controls.

## Decision

Before production infrastructure changes are applied, configure a real remote backend with encryption and state locking, and give staging and production separate state keys and credentials. Keep plan and apply separate in CI; require protected-environment approval for production apply. Run scheduled plans for drift detection and retain the last known good plan and rollback instructions.

## Consequences

Terraform applies become auditable and concurrent state writes are serialized. Backend migration must be coordinated and verified before removing local state. Until the remote backend and protected apply workflow exist, this ADR remains proposed and production changes must not be represented as remotely locked.
