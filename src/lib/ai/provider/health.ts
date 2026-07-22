import type { ProviderHealth } from './types';
import { providers } from './factory';

const healthCache = new Map<string, ProviderHealth>();
const CHECK_INTERVAL = 30000;

export function getHealth(providerId: string): ProviderHealth | undefined {
  return healthCache.get(providerId);
}

export async function checkHealth(): Promise<Record<string, ProviderHealth>> {
  const results: Record<string, ProviderHealth> = {};
  const now = Date.now();

  for (const [id, provider] of Object.entries(providers)) {
    const cached = healthCache.get(id);
    if (cached && now - cached.lastCheck < CHECK_INTERVAL) {
      results[id] = cached;
      continue;
    }

    try {
      const { ok, latency } = await provider.health();
      const existing = healthCache.get(id);
      const health: ProviderHealth = {
        healthy: ok,
        latency,
        failureRate: existing ? (existing.failureRate * 0.7 + (ok ? 0 : 0.3)) : (ok ? 0 : 1),
        lastCheck: now,
      };
      healthCache.set(id, health);
      results[id] = health;
    } catch {
      const health: ProviderHealth = {
        healthy: false,
        latency: 0,
        failureRate: 1,
        lastCheck: now,
      };
      healthCache.set(id, health);
      results[id] = health;
    }
  }

  return results;
}

export function getHealthyProviders(): string[] {
  const healthy: string[] = [];
  for (const [id, health] of healthCache.entries()) {
    if (health.healthy && health.failureRate < 0.5) {
      healthy.push(id);
    }
  }
  return healthy.length > 0 ? healthy : Object.keys(providers);
}