// Shared fake fixture constants used by test utilities. These values are
// intentionally obvious non-functional placeholders, not real secrets, so
// the CI credential-shape grep stays signal-free while tests can run
// offline. None of these are ever live credentials.
export const MOCK_STRIPE_SECRET_KEY = 'sk_test_mock_not_a_real_key';
export const MOCK_STRIPE_WEBHOOK_SECRET = 'whsec_mock_not_a_real_key';
export const MOCK_PROVIDER_KEY = 'sk_test_mock_not_a_real_provider_key';
