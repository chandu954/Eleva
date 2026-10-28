import { describe, expect, it } from 'vitest';

describe('unit test network guard', () => {
  it('rejects unmocked fetch calls before opening a network connection', async () => {
    await expect(fetch('https://example.invalid')).rejects.toThrow(
      'Network access through fetch is disabled in unit tests',
    );
  });
});
