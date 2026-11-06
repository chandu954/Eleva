#!/usr/bin/env bash
# Verifies a fresh clone can be set up and verified end to end without any
# pre-existing environment state. Mirrors the CI fresh-clone-smoke job.
set -euo pipefail

echo "==> Installing dependencies from frozen lockfile"
pnpm install --frozen-lockfile

echo "==> Lint"
pnpm lint

echo "==> Typecheck"
pnpm typecheck

echo "==> Unit tests"
pnpm test

echo "==> Coverage thresholds"
pnpm coverage

echo "==> Production build"
pnpm build

echo 'fresh clone verified'
