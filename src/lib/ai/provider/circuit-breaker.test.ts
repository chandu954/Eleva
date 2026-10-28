import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ProviderCircuitOpenError,
  resetProviderCircuitBreakers,
  withProviderCircuitBreaker,
} from './circuit-breaker';

describe('provider circuit breaker', () => {
  afterEach(() => {
    resetProviderCircuitBreakers();
    vi.restoreAllMocks();
  });

  it('opens after five failed results and skips calls during the cooldown', async () => {
    const run = vi.fn().mockResolvedValue({ success: false });
    const isSuccess = (result: { success: boolean }) => result.success;

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await withProviderCircuitBreaker('openai', run, isSuccess);
    }
    await expect(withProviderCircuitBreaker('openai', run, isSuccess)).rejects.toBeInstanceOf(ProviderCircuitOpenError);
    expect(run).toHaveBeenCalledTimes(5);
  });

  it('allows one recovery probe after cooldown and closes after success', async () => {
    let now = 10_000;
    const run = vi.fn().mockResolvedValueOnce(false).mockResolvedValue(true);
    const options = { failureThreshold: 1, cooldownMs: 500, now: () => now };

    await withProviderCircuitBreaker('anthropic', run, Boolean, options);
    now += 500;
    await expect(withProviderCircuitBreaker('anthropic', run, Boolean, options)).resolves.toBe(true);
    await expect(withProviderCircuitBreaker('anthropic', run, Boolean, options)).resolves.toBe(true);
    expect(run).toHaveBeenCalledTimes(3);
  });

  it('reopens after a recovery probe fails', async () => {
    let now = 1_000;
    const run = vi.fn().mockResolvedValue(false);
    const options = { failureThreshold: 1, cooldownMs: 250, now: () => now };

    await withProviderCircuitBreaker('gemini', run, Boolean, options);
    now += 250;
    await withProviderCircuitBreaker('gemini', run, Boolean, options);
    await expect(withProviderCircuitBreaker('gemini', run, Boolean, options)).rejects.toBeInstanceOf(ProviderCircuitOpenError);
    expect(run).toHaveBeenCalledTimes(2);
  });

  it('counts thrown provider errors and reports a bounded retry hint', async () => {
    const run = vi.fn().mockRejectedValue(new Error('offline'));
    const options = { failureThreshold: 1, cooldownMs: 4_000, now: () => 10_000 };
    await expect(withProviderCircuitBreaker('nvidia', run, () => true, options)).rejects.toThrow('offline');
    await expect(withProviderCircuitBreaker('nvidia', run, () => true, options)).rejects.toThrow('retry after 4s');
    expect(run).toHaveBeenCalledOnce();
  });

  it('allows only one half-open request at a time', async () => {
    let now = 100;
    let releaseProbe!: (value: boolean) => void;
    const firstAttempt = vi.fn().mockResolvedValue(false);
    const probe = vi.fn(() => new Promise<boolean>((resolve) => { releaseProbe = resolve; }));
    const options = { failureThreshold: 1, cooldownMs: 100, now: () => now };

    await withProviderCircuitBreaker('ollama', firstAttempt, Boolean, options);
    now += 100;
    const probeRequest = withProviderCircuitBreaker('ollama', probe, Boolean, options);
    await expect(withProviderCircuitBreaker('ollama', firstAttempt, Boolean, options)).rejects.toBeInstanceOf(ProviderCircuitOpenError);
    releaseProbe(true);
    await expect(probeRequest).resolves.toBe(true);
    expect(probe).toHaveBeenCalledOnce();
  });
});
