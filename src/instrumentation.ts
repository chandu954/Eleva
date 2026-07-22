const REQUIRED_ENV = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
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
}

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    validateEnv();
    await import('./instrumentation.node');
  }
}
