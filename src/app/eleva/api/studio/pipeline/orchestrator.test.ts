import { describe, expect, it } from 'vitest';

import { getOptimizationStatus } from './orchestrator';

describe('pipeline orchestration status', () => {
  it('marks fewer than two changed sections as incomplete', () => {
    expect(getOptimizationStatus(0)).toBe('Optimization Incomplete');
    expect(getOptimizationStatus(1)).toBe('Optimization Incomplete');
  });

  it('marks two or more changed sections as ready', () => {
    expect(getOptimizationStatus(2)).toBe('Tailored Resume Ready');
    expect(getOptimizationStatus(4)).toBe('Tailored Resume Ready');
  });
});
