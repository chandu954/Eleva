import { logger } from './logger';

export const REQUIRED_ENV = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
] as const;

export const OPTIONAL_ENV = [
  'OPENROUTER_API_KEY',
  'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY',
  'GEMINI_API_KEY',
  'NVIDIA_API_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  'SENTRY_DSN',
  'NEXT_PUBLIC_POSTHOG_KEY',
] as const;

/** Safe fallback values used at build time when real env vars are absent.
 * These allow `pnpm build` to run without live Supabase/Stripe/Provider keys.
 * Production deployments MUST set real values; fallbacks are build-time only.
 */
export const ENV_FALLBACKS: Record<string, string> = {
  NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:9',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'e2e-anon-key',
  SUPABASE_SERVICE_ROLE_KEY: 'e2e-service-role-key',
  OPENROUTER_API_KEY: '',
  OPENAI_API_KEY: '',
  ANTHROPIC_API_KEY: '',
  GEMINI_API_KEY: '',
  NVIDIA_API_KEY: '',
  STRIPE_SECRET_KEY: '',
  STRIPE_WEBHOOK_SECRET: '',
  UPSTASH_REDIS_REST_URL: 'http://127.0.0.1:9',
  UPSTASH_REDIS_REST_TOKEN: '',
  SENTRY_DSN: '',
  NEXT_PUBLIC_POSTHOG_KEY: '',
};

export interface EnvValidation {
  missingRequired: string[];
  missingOptional: string[];
  resolved: Record<string, string>;
}

export function validateEnv(env: Record<string, string | undefined> = process.env): EnvValidation {
  const missingRequired: string[] = [];
  const missingOptional: string[] = [];
  const resolved: Record<string, string> = {};

  for (const key of REQUIRED_ENV) {
    resolved[key] = env[key] ?? ENV_FALLBACKS[key] ?? '';
    if (!env[key]) missingRequired.push(key);
  }

  for (const key of OPTIONAL_ENV) {
    resolved[key] = env[key] ?? ENV_FALLBACKS[key] ?? '';
    if (!env[key]) missingOptional.push(key);
  }

  return { missingRequired, missingOptional, resolved };
}

export function reportEnvValidation(result: EnvValidation): void {
  if (result.missingRequired.length > 0) {
    logger.error('startup.env.missing_required', { missing: result.missingRequired });
  } else {
    logger.info('startup.env.required_present');
  }

  if (result.missingOptional.length > 0) {
    logger.warn('startup.env.missing_optional', { missing: result.missingOptional });
  }
}

export function getEnv(key: string, env: Record<string, string | undefined> = process.env): string {
  return env[key] ?? ENV_FALLBACKS[key] ?? '';
}
