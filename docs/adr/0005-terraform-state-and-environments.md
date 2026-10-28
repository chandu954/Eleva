# ADR 0005: Isolate Terraform state by environment

- Status: accepted
- Date: 2026-10-28

## Context

Terraform declares an S3 remote backend with native lockfiles. CI has separate staging and production workspaces, protected apply environments, and scheduled drift plans. The bucket, IAM role, GitHub environment values/secrets, and environment protection rules are account-level prerequisites configured outside this repository.

## Decision

Use the remote S3 backend with encryption and native lockfiles. Keep staging and production in separate workspaces and GitHub environments. Keep plan and apply separate in CI; require protected-environment approval for apply. Run scheduled plans for drift detection and retain the last known good plan and rollback instructions.

## Consequences

Terraform applies become auditable and concurrent state writes are serialized. Bootstrap and provider credentials remain operator responsibilities; see the [operations runbook](../operations/runbook.md). CI's validation job intentionally uses `-backend=false` and does not prove that the external bucket, IAM permissions, or protected environments are configured correctly.
