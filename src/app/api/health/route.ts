import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const REQUIRED_ENV_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
] as const;

const OPTIONAL_ENV_VARS = [
  'OPENROUTER_API_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'UPSTASH_REDIS_REST_URL',
] as const;

export async function GET() {
  const checks: Record<string, string> = {};

  for (const key of REQUIRED_ENV_VARS) {
    checks[key] = process.env[key] ? 'present' : 'missing';
  }

  for (const key of OPTIONAL_ENV_VARS) {
    if (process.env[key]) {
      checks[key] = 'present';
    }
  }

  const allRequired = REQUIRED_ENV_VARS.every((k) => process.env[k]);

  let dbStatus = 'unchecked';
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );
    const { error } = await supabase.from('profiles').select('user_id').limit(1);
    dbStatus = error ? 'error' : 'connected';
  } catch {
    dbStatus = 'error';
  }

  const status = allRequired && dbStatus === 'connected' ? 'ok' : 'degraded';

  return NextResponse.json(
    {
      status,
      timestamp: new Date().toISOString(),
      env: checks,
      database: dbStatus,
      uptime: process.uptime(),
    },
    { status: status === 'ok' ? 200 : 503 }
  );
}
