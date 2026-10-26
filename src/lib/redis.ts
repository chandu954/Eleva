import { Redis as UpstashRedis } from "@upstash/redis";
import IORedis from "ioredis";

/**
 * Unified Redis client interface that works with local Redis (ioredis),
 * cloud Redis (Upstash REST), or — outside production with no Redis
 * configured — an in-memory stub, so a fresh clone runs tests and demos
 * with no Redis server and no network calls.
 */
interface RedisClient {
  hgetall(key: string): Promise<Record<string, string> | null>;
  hset(key: string, data: Record<string, string>): Promise<number | "OK">;
  expire(key: string, seconds: number): Promise<number | boolean>;
}

export type RedisMode = "local" | "upstash" | "stub" | "unconfigured";

/**
 * Pure decision used by createRedisClient(); exported so the selection
 * (including the production guard) is testable without constructing a
 * live client. Resolution order mirrors the historical behavior:
 * local ioredis wins when USE_LOCAL_REDIS=true and REDIS_URL is set,
 * then Upstash REST, then the dev/test stub.
 */
export function redisMode(env: Record<string, string | undefined> = process.env): RedisMode {
  if (env.USE_LOCAL_REDIS === "true" && env.REDIS_URL) return "local";
  if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) return "upstash";
  return env.NODE_ENV === "production" ? "unconfigured" : "stub";
}

/**
 * In-memory stub for tests/dev with no Redis server. Tracks enough real
 * semantics to be honest: HSET merges fields, EXPIRE only succeeds on an
 * existing key, an expired hash reads as absent.
 */
export class InMemoryRedis implements RedisClient {
  private readonly entries = new Map<string, { value: Record<string, string>; expiresAtMs: number | null }>();

  private liveEntry(key: string) {
    const entry = this.entries.get(key);
    if (!entry) return null;
    if (entry.expiresAtMs !== null && Date.now() >= entry.expiresAtMs) {
      this.entries.delete(key);
      return null;
    }
    return entry;
  }

  async hgetall(key: string): Promise<Record<string, string> | null> {
    const entry = this.liveEntry(key);
    return entry ? { ...entry.value } : null;
  }

  async hset(key: string, data: Record<string, string>): Promise<number | "OK"> {
    const entry = this.liveEntry(key);
    if (entry) Object.assign(entry.value, data);
    else this.entries.set(key, { value: { ...data }, expiresAtMs: null });
    return 1;
  }

  async expire(key: string, seconds: number): Promise<number | boolean> {
    const entry = this.liveEntry(key);
    if (!entry) return 0;
    entry.expiresAtMs = Date.now() + seconds * 1000;
    return 1;
  }
}

function createRedisClient(): RedisClient {
  switch (redisMode()) {
    case "local": {
      const url = process.env.REDIS_URL;
      if (!url) throw new Error("REDIS_URL is required when USE_LOCAL_REDIS=true");
      const client = new IORedis(url);
      return {
        hgetall: (key) => client.hgetall(key).then(r => Object.keys(r).length ? r : null),
        hset: (key, data) => client.hset(key, data),
        expire: (key, seconds) => client.expire(key, seconds).then(r => r === 1),
      };
    }
    case "upstash": {
      const url = process.env.UPSTASH_REDIS_REST_URL;
      const token = process.env.UPSTASH_REDIS_REST_TOKEN;
      if (!url || !token) throw new Error("UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required for the Upstash client");
      const client = new UpstashRedis({ url, token });
      return client as unknown as RedisClient;
    }
    case "stub":
      return new InMemoryRedis();
    case "unconfigured":
      // Production misconfiguration: fail loudly at startup instead of
      // silently disabling rate limiting.
      throw new Error(
        "Redis is not configured. Set USE_LOCAL_REDIS=true and REDIS_URL for a local server, "
        + "or UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN for the cloud REST API. "
        + "Outside production a no-network in-memory stub is used automatically.",
      );
  }
}

const redis = createRedisClient();
export default redis;
