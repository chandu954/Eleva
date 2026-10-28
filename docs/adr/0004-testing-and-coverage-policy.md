# ADR 0004: Ratchet coverage from measured baselines

- Status: accepted
- Date: 2026-10-28

## Context

Coverage changed as test suites were added and source files were split. Setting thresholds above the measured result makes the quality gate unusable, while leaving thresholds static permits coverage to drift downward.

## Decision

Use Vitest with V8 coverage in CI. Keep global floors at or below a measured passing baseline and raise them only after the full coverage run passes. The current global and `src/lib/**` floors are 60% statements/lines, 83% branches, and 79% functions. Raise to 75/85/80 only after the measured project coverage clears all three values.

## Consequences

Coverage changes are reviewed alongside test output. Focus tests on authorization, data ownership, billing, AI provider routing, and error handling. Do not lower a ratchet to accommodate unrelated failures without recording the reason here.
