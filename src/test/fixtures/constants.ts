// Shared fake fixture constants used by test utilities. These values are
// intentionally obvious placeholders, not real secrets, so the CI
// credential-shape grep stays signal-free while tests can run offline.
export const TEST_STRIPE_SECRET_KEY = 'sk_test_webhook';
export const TEST_STRIPE_WEBHOOK_SECRET = 'whsec_test';
export const FAKE_PROVIDER_KEY = 'server-openrouter-key';
