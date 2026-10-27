// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { stubSupabase, stubTable, type PostgrestStub } from '@/test/postgrest-stub';

vi.mock('@/utils/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/lib/ai/provider/encryption', () => ({
  encryptApiKey: vi.fn(),
  decryptApiKey: vi.fn(),
}));

import { createClient } from '@/utils/supabase/server';
import { decryptApiKey, encryptApiKey } from '@/lib/ai/provider/encryption';
import {
  deleteProviderKey,
  getProviderKeys,
  saveProviderKey,
  validateProviderKey,
} from './actions-ai-providers';

const mockCreateClient = vi.mocked(createClient);
const mockEncryptApiKey = vi.mocked(encryptApiKey);
const mockDecryptApiKey = vi.mocked(decryptApiKey);

let fetchMock: ReturnType<typeof vi.fn>;

const storedKey = {
  id: 'key-1',
  user_id: 'user-1',
  provider: 'openai',
  encrypted_api_key: 'cipher-text',
  base_url: 'https://api.example.test',
  default_model: 'gpt-4.1',
  provider_mode: 'manual',
  status: 'connected',
  last_validated_at: '2026-01-02T00:00:00.000Z',
  created_at: '2026-01-01T00:00:00.000Z',
};

function keyRow(overrides: Record<string, unknown> = {}) {
  return { ...storedKey, ...overrides };
}

function installClient(
  user: { id: string } | null,
  tables: Record<string, PostgrestStub | PostgrestStub[]>,
) {
  mockCreateClient.mockResolvedValue(stubSupabase(user, tables) as never);
}

function validationClient(
  row: Record<string, unknown> | null,
  error: unknown = null,
) {
  const table = stubTable({ data: row, error });
  installClient({ id: 'user-1' }, { user_ai_provider_keys: table });
  return table;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockCreateClient.mockReset();
  mockEncryptApiKey.mockReset().mockImplementation((plaintext: string) => `enc:${plaintext}`);
  mockDecryptApiKey.mockReset().mockReturnValue('plain-key');
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('getProviderKeys', () => {
  it('maps stored rows without leaking encrypted key material', async () => {
    const table = stubTable({
      data: [
        keyRow(),
        keyRow({
          id: 'key-2',
          provider: 'ollama',
          encrypted_api_key: null,
          base_url: null,
          default_model: null,
          provider_mode: 'auto',
          status: 'disconnected',
          last_validated_at: null,
          created_at: '2026-01-03T00:00:00.000Z',
        }),
      ],
      error: null,
    });
    installClient({ id: 'user-1' }, { user_ai_provider_keys: table });

    const keys = await getProviderKeys();

    expect(keys).toEqual([
      {
        id: 'key-1',
        provider: 'openai',
        hasKey: true,
        baseUrl: 'https://api.example.test',
        defaultModel: 'gpt-4.1',
        providerMode: 'manual',
        status: 'connected',
        lastValidatedAt: '2026-01-02T00:00:00.000Z',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
      expect.objectContaining({
        id: 'key-2',
        provider: 'ollama',
        hasKey: false,
        baseUrl: null,
        defaultModel: null,
      }),
    ]);
    expect(keys[0]).not.toHaveProperty('encrypted_api_key');
    expect(table.calls.select[0]).toEqual(['*']);
    expect(table.calls.eq[0]).toEqual(['user_id', 'user-1']);
  });

  it('returns an empty list when the user has no stored keys', async () => {
    installClient({ id: 'user-1' }, {
      user_ai_provider_keys: stubTable({ data: null, error: null }),
    });

    await expect(getProviderKeys()).resolves.toEqual([]);
  });

  it('rejects unauthenticated callers and surfaces database errors', async () => {
    installClient(null, {});
    await expect(getProviderKeys()).rejects.toThrow('Not authenticated');

    installClient({ id: 'user-1' }, {
      user_ai_provider_keys: stubTable({ data: null, error: { message: 'db down' } }),
    });
    await expect(getProviderKeys()).rejects.toEqual({ message: 'db down' });
  });
});

describe('saveProviderKey', () => {
  it('encrypts the key and upserts the provider configuration', async () => {
    const table = stubTable({ data: null, error: null });
    installClient({ id: 'user-1' }, { user_ai_provider_keys: table });

    await expect(saveProviderKey('openai', 'sk-live')).resolves.toEqual({ success: true });

    expect(mockEncryptApiKey).toHaveBeenCalledWith('sk-live');
    const payload = table.calls.upsert[0][0] as Record<string, unknown>;
    expect(payload).toMatchObject({
      user_id: 'user-1',
      provider: 'openai',
      encrypted_api_key: 'enc:sk-live',
      base_url: null,
      default_model: null,
      provider_mode: 'auto',
      status: 'testing',
    });
    expect(Date.parse(String(payload.updated_at))).not.toBeNaN();
    expect(table.calls.upsert[0][1]).toEqual({ onConflict: 'user_id,provider' });
  });

  it('persists optional base URL, default model, and manual provider mode', async () => {
    const table = stubTable({ data: null, error: null });
    installClient({ id: 'user-1' }, { user_ai_provider_keys: table });

    await expect(
      saveProviderKey('ollama', 'secret', {
        baseUrl: 'http://gpu-box:11434',
        defaultModel: 'qwen3:8b',
        providerMode: 'manual',
      }),
    ).resolves.toEqual({ success: true });

    expect(table.calls.upsert[0][0]).toMatchObject({
      provider: 'ollama',
      encrypted_api_key: 'enc:secret',
      base_url: 'http://gpu-box:11434',
      default_model: 'qwen3:8b',
      provider_mode: 'manual',
      status: 'testing',
    });
  });

  it('stores a disconnected row when only a base URL is supplied', async () => {
    const table = stubTable({ data: null, error: null });
    installClient({ id: 'user-1' }, { user_ai_provider_keys: table });

    await expect(
      saveProviderKey('ollama', '', { baseUrl: 'http://localhost:11434' }),
    ).resolves.toEqual({ success: true });

    expect(mockEncryptApiKey).not.toHaveBeenCalled();
    expect(table.calls.upsert[0][0]).toMatchObject({
      encrypted_api_key: '',
      base_url: 'http://localhost:11434',
      status: 'disconnected',
    });
  });

  it('rejects providers that need a key or base URL when neither is supplied', async () => {
    const table = stubTable({ data: null, error: null });
    installClient({ id: 'user-1' }, { user_ai_provider_keys: table });

    await expect(saveProviderKey('ollama', '')).rejects.toThrow(
      'API key or base URL required',
    );

    expect(mockEncryptApiKey).not.toHaveBeenCalled();
    expect(table.calls.upsert).toHaveLength(0);
  });

  it('rejects unknown providers before touching the database', async () => {
    const table = stubTable({ data: null, error: null });
    installClient({ id: 'user-1' }, { user_ai_provider_keys: table });

    await expect(saveProviderKey('mystery' as never, 'key')).rejects.toThrow(
      'Unknown provider: mystery',
    );
    expect(table.calls.upsert).toHaveLength(0);
  });

  it('rejects unauthenticated callers and surfaces upsert errors', async () => {
    installClient(null, {});
    await expect(saveProviderKey('openai', 'key')).rejects.toThrow('Not authenticated');

    installClient({ id: 'user-1' }, {
      user_ai_provider_keys: stubTable({ data: null, error: { message: 'upsert failed' } }),
    });
    await expect(saveProviderKey('openai', 'key')).rejects.toEqual({ message: 'upsert failed' });
  });
});

describe('deleteProviderKey', () => {
  it('deletes only the caller’s row for the requested provider', async () => {
    const table = stubTable({ data: null, error: null });
    installClient({ id: 'user-1' }, { user_ai_provider_keys: table });

    await expect(deleteProviderKey('openai')).resolves.toEqual({ success: true });

    expect(table.calls.delete).toHaveLength(1);
    expect(table.calls.eq).toEqual([
      ['user_id', 'user-1'],
      ['provider', 'openai'],
    ]);
  });

  it('rejects unauthenticated callers and surfaces delete errors', async () => {
    installClient(null, {});
    await expect(deleteProviderKey('openai')).rejects.toThrow('Not authenticated');

    installClient({ id: 'user-1' }, {
      user_ai_provider_keys: stubTable({ data: null, error: { message: 'delete failed' } }),
    });
    await expect(deleteProviderKey('openai')).rejects.toEqual({ message: 'delete failed' });
  });
});

describe('validateProviderKey', () => {
  it('decrypts the key, probes the provider, and records a healthy status', async () => {
    const table = validationClient(keyRow());
    fetchMock.mockResolvedValue({ ok: true });

    const result = await validateProviderKey('openai');

    expect(result).toEqual({
      healthy: true,
      latency: expect.any(Number),
      status: 'connected',
    });
    expect(mockDecryptApiKey).toHaveBeenCalledWith('cipher-text');
    expect(fetchMock).toHaveBeenCalledWith('https://api.openai.com/v1/models', {
      headers: { Authorization: 'Bearer plain-key' },
    });
    expect(table.calls.select[0]).toEqual(['*']);
    expect(table.calls.eq.slice(0, 2)).toEqual([
      ['user_id', 'user-1'],
      ['provider', 'openai'],
    ]);
    expect(table.calls.single).toHaveLength(1);

    const update = table.calls.update[0][0] as Record<string, unknown>;
    expect(update).toMatchObject({ status: 'connected' });
    expect(Date.parse(String(update.last_validated_at))).not.toBeNaN();
    expect(Date.parse(String(update.updated_at))).not.toBeNaN();
    expect(table.calls.eq.slice(2)).toEqual([
      ['user_id', 'user-1'],
      ['provider', 'openai'],
    ]);
  });

  it('marks a non-ok probe as an invalid key', async () => {
    const table = validationClient(keyRow());
    fetchMock.mockResolvedValue({ ok: false });

    const result = await validateProviderKey('openai');

    expect(result).toMatchObject({ healthy: false, status: 'invalid_key' });
    expect(table.calls.update[0][0]).toMatchObject({ status: 'invalid_key' });
  });

  it('rejects unauthenticated callers', async () => {
    installClient(null, {});
    await expect(validateProviderKey('openai')).rejects.toThrow('Not authenticated');
  });

  it('rejects when the provider row is missing or has no encrypted key', async () => {
    validationClient(null, { message: 'not found' });
    await expect(validateProviderKey('openai')).rejects.toThrow(
      'No API key found for this provider',
    );

    validationClient(keyRow({ encrypted_api_key: '' }));
    await expect(validateProviderKey('openai')).rejects.toThrow(
      'No API key found for this provider',
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    ['openai', 'https://api.openai.com/v1/models'],
    ['openrouter', 'https://openrouter.ai/api/v1/models'],
    ['nvidia', 'https://integrate.api.nvidia.com/v1/models'],
  ])('probes %s with a bearer token', async (provider, url) => {
    validationClient(keyRow({ provider }));
    fetchMock.mockResolvedValue({ ok: true });

    await validateProviderKey(provider as never);

    expect(fetchMock).toHaveBeenCalledWith(url, {
      headers: { Authorization: 'Bearer plain-key' },
    });
  });

  it('probes Anthropic with its required headers and message body', async () => {
    validationClient(keyRow({ provider: 'anthropic' }));
    fetchMock.mockResolvedValue({ ok: true });

    await validateProviderKey('anthropic');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.anthropic.com/v1/messages');
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({
      'Content-Type': 'application/json',
      'x-api-key': 'plain-key',
      'anthropic-version': '2023-06-01',
    });
    expect(JSON.parse(String(init.body))).toMatchObject({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 10,
      messages: [{ role: 'user', content: 'Hello' }],
    });
  });

  it('probes Gemini with the API key in the query string', async () => {
    validationClient(keyRow({ provider: 'gemini' }));
    fetchMock.mockResolvedValue({ ok: true });

    await validateProviderKey('gemini');

    expect(fetchMock).toHaveBeenCalledWith(
      'https://generativelanguage.googleapis.com/v1beta/models?key=plain-key',
    );
    expect(fetchMock.mock.calls[0]).toHaveLength(1);
  });

  it.each([
    [null, 'http://localhost:11434/api/tags'],
    ['http://ollama-box:11434', 'http://ollama-box:11434/api/tags'],
  ])('probes Ollama using base URL %s', async (baseUrl, expectedUrl) => {
    validationClient(keyRow({ provider: 'ollama', base_url: baseUrl }));
    fetchMock.mockResolvedValue({ ok: true });

    await validateProviderKey('ollama');

    expect(fetchMock).toHaveBeenCalledWith(expectedUrl);
    expect(fetchMock.mock.calls[0]).toHaveLength(1);
  });

  it('never performs a network probe for an unknown provider', async () => {
    const table = validationClient(keyRow({ provider: 'mystery' }));

    const result = await validateProviderKey('mystery' as never);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result).toMatchObject({ healthy: false, status: 'invalid_key' });
    expect(table.calls.update[0][0]).toMatchObject({ status: 'invalid_key' });
  });

  it.each([
    ['rate limit exceeded', 'rate_limited'],
    ['invalid auth credentials', 'invalid_key'],
    ['quota exceeded', 'quota_exceeded'],
    ['socket hang up', 'disconnected'],
  ])('classifies probe errors containing %j as %s', async (message, status) => {
    const table = validationClient(keyRow());
    fetchMock.mockRejectedValue(new Error(message));

    const result = await validateProviderKey('openai');

    expect(result).toEqual({
      healthy: false,
      latency: expect.any(Number),
      status,
    });
    expect(table.calls.update[0][0]).toMatchObject({ status });
  });

  it('treats a thrown value without a message as disconnected', async () => {
    const table = validationClient(keyRow());
    fetchMock.mockRejectedValue({ code: 500 });

    const result = await validateProviderKey('openai');

    expect(result).toMatchObject({ healthy: false, status: 'disconnected' });
    expect(table.calls.update[0][0]).toMatchObject({ status: 'disconnected' });
  });
});
