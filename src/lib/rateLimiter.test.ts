// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/redis', () => ({
  default: {
    hgetall: vi.fn(),
    hset: vi.fn(),
    expire: vi.fn(),
  },
}));

import { checkRateLimit } from './rateLimiter';
import redis from '@/lib/redis';

const mockRedis = vi.mocked(redis) as unknown as {
  hgetall: ReturnType<typeof vi.fn>;
  hset: ReturnType<typeof vi.fn>;
  expire: ReturnType<typeof vi.fn>;
};

/** Default check: capacity 80 over 5h → leak 80/18000 ≈ 0.00444 tokens/s. */
const START = Date.parse('2026-01-15T12:00:00Z');

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  vi.useFakeTimers();
  vi.setSystemTime(START);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('checkRateLimit', () => {
  it('short-circuits in development without touching redis', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    await checkRateLimit('u1');
    expect(mockRedis.hgetall).not.toHaveBeenCalled();
    expect(mockRedis.hset).not.toHaveBeenCalled();
  });

  it('initializes an empty bucket, sets a longer-than-duration expiry and allows the request', async () => {
    mockRedis.hgetall.mockResolvedValue({}); // no bucket yet
    await expect(checkRateLimit('u1', 80, 18000)).resolves.toBeUndefined();

    // expiry covers duration + 1h buffer, computed before the leak math
    expect(mockRedis.expire).toHaveBeenNthCalledWith(1, 'rate-limit:pro:u1', 21600);
    expect(mockRedis.hset).toHaveBeenCalledWith('rate-limit:pro:u1', {
      tokens: '1',
      last: (START / 1000).toString(),
    });
    expect(mockRedis.expire).toHaveBeenCalledTimes(2); // once on init, once on save
  });

  it('only reads a stored bucket without re-initializing', async () => {
    const now2 = START + 1000; // 1s later in ms
    mockRedis.hgetall.mockResolvedValue({ tokens: '3', last: ((now2 - 1_000_000) / 1000).toString() }); // bucket last updated 1000s ago
    vi.setSystemTime(now2);

    await expect(checkRateLimit('u1', 80, 18000)).resolves.toBeUndefined();
    // 3 tokens leak 1000s * 80/18000 ≈ 4.44 → floor at 0 → +1 → 1
    expect(mockRedis.hset).toHaveBeenCalledWith('rate-limit:pro:u1', {
      tokens: '1', // Math.max(0, 3 - 4.444) + 1
      last: (now2 / 1000).toString(),
    });
    expect(mockRedis.expire).toHaveBeenCalledTimes(1); // only the save-path refresh
  });

  it('the leak never underflows below zero and fractional leak amounts are kept', async () => {
    // bucket 2s old with capacity 80/18000: leak ≈ 0.0089 → tokens 1.9911
    mockRedis.hgetall.mockResolvedValue({ tokens: '2', last: ((START - 2000) / 1000).toString() });

    await checkRateLimit('u1', 80, 18000);
    const saved = mockRedis.hset.mock.calls[0][1] as { tokens: string };
    const tokens = parseFloat(saved.tokens);
    expect(tokens).toBeGreaterThan(2.98);
    expect(tokens).toBeLessThan(3.0);
  });

  it('throws when adding a token would pass capacity, naming the seconds left and skipping the save', async () => {
    mockRedis.hgetall.mockResolvedValue({ tokens: '80', last: (START / 1000).toString() });

    // delta 0 → tokens stay 80 → +1 → 81 > 80; overflow 1 * duration / capacity = 225s
    await expect(checkRateLimit('u1', 80, 18000)).rejects.toThrow('Rate limit exceeded. Try again in 225 seconds.');
    expect(mockRedis.hset).not.toHaveBeenCalled();
    expect(mockRedis.expire).not.toHaveBeenCalled();
  });

  it('a fully-leaked bucket right at capacity border still admits one request', async () => {
    mockRedis.hgetall.mockResolvedValue({ tokens: '79', last: (START / 1000).toString() });

    await expect(checkRateLimit('u1', 80, 18000)).resolves.toBeUndefined();
    expect(mockRedis.hset).toHaveBeenCalledWith('rate-limit:pro:u1', {
      tokens: '80',
      last: (START / 1000).toString(),
    });
  });

  it('scopes buckets per user id', async () => {
    mockRedis.hgetall.mockResolvedValue({});
    await checkRateLimit('user-a');
    await checkRateLimit('user-b');
    expect(mockRedis.expire.mock.calls.some((c) => c[0] === 'rate-limit:pro:user-a')).toBe(true);
    expect(mockRedis.expire.mock.calls.some((c) => c[0] === 'rate-limit:pro:user-b')).toBe(true);
  });
});
