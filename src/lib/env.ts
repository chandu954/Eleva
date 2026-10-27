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

export interface EnvValidation {
  missingRequired: string[];
  missingOptional: string[];
}

export function validateEnv(env: Record<string, string | undefined> = process.env): EnvValidation {
  return {
    missingRequired: REQUIRED_ENV.filter((key) => !env[key]),
    missingOptional: OPTIONAL_ENV.filter((key) => !env[key]),
  };
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
