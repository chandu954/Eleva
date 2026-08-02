const REQUIRED_ENV = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
] as const;

const OPTIONAL_ENV = [
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

function validateEnv() {
  const missing: string[] = [];
  for (const key of REQUIRED_ENV) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }
  if (missing.length > 0) {
    console.error(`[Startup] Missing required env vars: ${missing.join(', ')}`);
  } else {
    console.log('[Startup] All required env vars present');
  }

  const absentOptional: string[] = [];
  for (const key of OPTIONAL_ENV) {
    if (!process.env[key]) {
      absentOptional.push(key);
    }
  }
  if (absentOptional.length > 0) {
    console.warn(`[Startup] Optional env vars not set: ${absentOptional.join(', ')}`);
  }
}

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    validateEnv();
    await import('./instrumentation.node');
  }
}
