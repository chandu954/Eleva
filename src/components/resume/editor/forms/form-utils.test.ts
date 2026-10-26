import { describe, expect, it } from 'vitest';

import { reorderIndexMap } from './form-utils';

describe('reorderIndexMap', () => {
  it('moves an entry down and shifts the entries between', () => {
    expect(reorderIndexMap({ 0: 'a', 1: 'b', 2: 'c' }, 0, 2)).toEqual({
      0: 'b',
      1: 'c',
      2: 'a',
    });
  });

  it('moves an entry up and shifts the entries between', () => {
    expect(reorderIndexMap({ 0: 'a', 1: 'b', 2: 'c' }, 2, 0)).toEqual({
      0: 'c',
      1: 'a',
      2: 'b',
    });
  });

  it('shifts intermediate sparse entries and leaves later entries in place', () => {
    expect(reorderIndexMap({ 0: 'a', 2: 'c', 5: 'f' }, 0, 2)).toEqual({
      1: 'c',
      2: 'a',
      5: 'f',
    });
  });

  it('returns the same mapping for a no-op move', () => {
    expect(reorderIndexMap({ 0: 'a', 1: 'b' }, 1, 1)).toEqual({ 0: 'a', 1: 'b' });
  });
});
