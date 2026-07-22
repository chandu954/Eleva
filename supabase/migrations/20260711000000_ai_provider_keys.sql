-- AI Provider Keys
-- Stores encrypted user API keys for BYOK (Bring Your Own Key)
-- Encryption happens at the application layer (AES-256-GCM)

CREATE TABLE IF NOT EXISTS user_ai_provider_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN (
    'openai', 'anthropic', 'gemini', 'openrouter', 'nvidia', 'ollama'
  )),
  encrypted_api_key TEXT NOT NULL,
  base_url TEXT, -- for Ollama and other self-hosted providers
  default_model TEXT,
  provider_mode TEXT NOT NULL DEFAULT 'auto' CHECK (provider_mode IN ('auto', 'manual')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_validated_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'disconnected' CHECK (status IN (
    'connected', 'disconnected', 'testing', 'rate_limited', 'invalid_key', 'quota_exceeded'
  )),
  UNIQUE(user_id, provider)
);

ALTER TABLE user_ai_provider_keys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own provider keys" ON user_ai_provider_keys;
CREATE POLICY "Users can manage their own provider keys"
  ON user_ai_provider_keys
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_ai_provider_keys_user_id ON user_ai_provider_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_provider_keys_provider ON user_ai_provider_keys(provider);
