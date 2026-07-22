'use server';

import { createClient } from '@/utils/supabase/server';
import { encryptApiKey, decryptApiKey } from '@/lib/ai/provider/encryption';
import { PROVIDER_DEFINITIONS, type ProviderId } from '@/lib/ai/provider/registry';

export async function getProviderKeys() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('user_ai_provider_keys')
    .select('*')
    .eq('user_id', user.id);

  if (error) throw error;

  return (data ?? []).map(row => ({
    id: row.id,
    provider: row.provider as ProviderId,
    hasKey: !!row.encrypted_api_key,
    baseUrl: row.base_url,
    defaultModel: row.default_model,
    providerMode: row.provider_mode,
    status: row.status,
    lastValidatedAt: row.last_validated_at,
    createdAt: row.created_at,
  }));
}

export async function saveProviderKey(
  provider: ProviderId,
  apiKey: string,
  opts?: { baseUrl?: string; defaultModel?: string; providerMode?: 'auto' | 'manual' },
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const def = PROVIDER_DEFINITIONS.find(p => p.id === provider);
  if (!def) throw new Error(`Unknown provider: ${provider}`);

  if (!apiKey && def.requiresBaseUrl && !opts?.baseUrl) {
    throw new Error('API key or base URL required');
  }

  const encrypted = apiKey ? encryptApiKey(apiKey) : '';

  const { error } = await supabase
    .from('user_ai_provider_keys')
    .upsert({
      user_id: user.id,
      provider,
      encrypted_api_key: encrypted,
      base_url: opts?.baseUrl ?? null,
      default_model: opts?.defaultModel ?? null,
      provider_mode: opts?.providerMode ?? 'auto',
      status: apiKey ? 'testing' : 'disconnected',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,provider' });

  if (error) throw error;
  return { success: true };
}

export async function deleteProviderKey(provider: ProviderId) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('user_ai_provider_keys')
    .delete()
    .eq('user_id', user.id)
    .eq('provider', provider);

  if (error) throw error;
  return { success: true };
}

export async function validateProviderKey(provider: ProviderId) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('user_ai_provider_keys')
    .select('*')
    .eq('user_id', user.id)
    .eq('provider', provider)
    .single();

  if (error || !data?.encrypted_api_key) {
    throw new Error('No API key found for this provider');
  }

  const apiKey = decryptApiKey(data.encrypted_api_key);

  let healthy = false;
  let latency = 0;
  let status: string;

  try {
    const start = Date.now();
    const res = await testConnection(provider, apiKey, data.base_url ?? undefined);
    latency = Date.now() - start;
    healthy = res.ok;
    status = healthy ? 'connected' : 'invalid_key';
  } catch (e: any) {
    const msg = e.message?.toLowerCase() ?? '';
    if (msg.includes('rate') || msg.includes('429')) status = 'rate_limited';
    else if (msg.includes('auth') || msg.includes('key') || msg.includes('401')) status = 'invalid_key';
    else if (msg.includes('quota')) status = 'quota_exceeded';
    else status = 'disconnected';
  }

  await supabase
    .from('user_ai_provider_keys')
    .update({ status, last_validated_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .eq('provider', provider);

  return { healthy, latency, status };
}

async function testConnection(provider: ProviderId, apiKey: string, baseUrl?: string): Promise<{ ok: boolean }> {
  switch (provider) {
    case 'openai': {
      const res = await fetch('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      return { ok: res.ok };
    }
    case 'anthropic': {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: 'claude-sonnet-4-20250514', messages: [{ role: 'user', content: 'Hello' }], max_tokens: 10 }),
      });
      return { ok: res.ok };
    }
    case 'gemini': {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
      return { ok: res.ok };
    }
    case 'openrouter': {
      const res = await fetch('https://openrouter.ai/api/v1/models', {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      return { ok: res.ok };
    }
    case 'nvidia': {
      const res = await fetch('https://integrate.api.nvidia.com/v1/models', {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      return { ok: res.ok };
    }
    case 'ollama': {
      const url = baseUrl || 'http://localhost:11434';
      const res = await fetch(`${url}/api/tags`);
      return { ok: res.ok };
    }
    default:
      return { ok: false };
  }
}
