'use server';

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import redis from "@/lib/redis";

// Rate limiter: 60 requests per minute per IP.
// Uses the existing Redis client (Upstash REST, local ioredis, or in-memory stub).
// Rate limit state is keyed by IP + endpoint so different endpoints have
// independent limits.
export function createRateLimiter(endpoint: string): Ratelimit {
  return new Ratelimit({
    redis: redis as unknown as Redis,
    limiter: Ratelimit.slidingWindow(60, "60 s"),
    prefix: `@eleva/ratelimit:${endpoint}`,
  });
}
