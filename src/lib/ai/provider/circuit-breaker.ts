export const PROVIDER_CIRCUIT_FAILURE_THRESHOLD = 5;
export const PROVIDER_CIRCUIT_COOLDOWN_MS = 30_000;

interface CircuitState {
  consecutiveFailures: number;
  openUntil?: number;
  probeInFlight: boolean;
}

export interface CircuitBreakerOptions {
  failureThreshold?: number;
  cooldownMs?: number;
  now?: () => number;
}

const circuits = new Map<string, CircuitState>();

export class ProviderCircuitOpenError extends Error {
  constructor(provider: string, retryAfterMs: number) {
    super(`Provider ${provider} circuit is open; retry after ${Math.ceil(retryAfterMs / 1000)}s`);
    this.name = 'ProviderCircuitOpenError';
  }
}

/**
 * Skip calls to a provider after repeated failures, then allow one recovery
 * probe after the cooldown. State is process-local and resets on cold start.
 */
export async function withProviderCircuitBreaker<T>(
  provider: string,
  run: () => Promise<T>,
  isSuccess: (result: T) => boolean,
  options: CircuitBreakerOptions = {},
): Promise<T> {
  const failureThreshold = options.failureThreshold ?? PROVIDER_CIRCUIT_FAILURE_THRESHOLD;
  const cooldownMs = options.cooldownMs ?? PROVIDER_CIRCUIT_COOLDOWN_MS;
  const now = options.now ?? Date.now;
  let state = circuits.get(provider);
  if (!state) {
    state = { consecutiveFailures: 0, probeInFlight: false };
    circuits.set(provider, state);
  }

  const currentTime = now();
  let isRecoveryProbe = false;
  if (state.openUntil !== undefined) {
    if (currentTime < state.openUntil) {
      throw new ProviderCircuitOpenError(provider, state.openUntil - currentTime);
    }
    if (state.probeInFlight) {
      throw new ProviderCircuitOpenError(provider, cooldownMs);
    }
    state.probeInFlight = true;
    isRecoveryProbe = true;
  }

  const recordFailure = () => {
    state!.consecutiveFailures = isRecoveryProbe
      ? failureThreshold
      : state!.consecutiveFailures + 1;
    state!.probeInFlight = false;
    if (state!.consecutiveFailures >= failureThreshold) {
      state!.openUntil = now() + cooldownMs;
    }
  };

  try {
    const result = await run();
    if (isSuccess(result)) {
      circuits.delete(provider);
    } else {
      recordFailure();
    }
    return result;
  } catch (error) {
    recordFailure();
    throw error;
  } finally {
    if (isRecoveryProbe) state!.probeInFlight = false;
  }
}

export function resetProviderCircuitBreakers(): void {
  circuits.clear();
}
