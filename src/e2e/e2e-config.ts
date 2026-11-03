const offlineSupabaseUrl = 'http://127.0.0.1:54329';
const hasLiveAccount = Boolean(
  process.env.E2E_TEST_EMAIL &&
  process.env.E2E_TEST_PASSWORD &&
  process.env.E2E_SUPABASE_URL &&
  process.env.E2E_SUPABASE_ANON_KEY &&
  process.env.E2E_SUPABASE_SERVICE_ROLE_KEY,
);

export const e2eConfig = {
  useMockSupabase: !hasLiveAccount,
  email: hasLiveAccount ? process.env.E2E_TEST_EMAIL! : 'offline-test@example.com',
  password: hasLiveAccount ? process.env.E2E_TEST_PASSWORD! : 'offline-test-password',
  supabaseUrl: hasLiveAccount ? process.env.E2E_SUPABASE_URL! : offlineSupabaseUrl,
  supabaseAnonKey: hasLiveAccount ? process.env.E2E_SUPABASE_ANON_KEY! : 'e2e-anon-key',
  supabaseServiceRoleKey: hasLiveAccount
    ? process.env.E2E_SUPABASE_SERVICE_ROLE_KEY!
    : 'e2e-service-role-key',
  hasTestAI: hasLiveAccount && process.env.E2E_AI_TESTS === 'true',
};
