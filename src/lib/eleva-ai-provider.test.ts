// @vitest-environment node
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

vi.mock('./ai', () => ({
  ai: {
    generate: vi.fn(),
    generateObject: vi.fn(),
  },
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

vi.mock('@ai-sdk/openai', () => ({
  createOpenAI: vi.fn(),
}));

vi.mock('ai', () => ({
  streamText: vi.fn(),
}));

vi.mock('./ai/provider/cookie-config', () => ({
  PROVIDER_COOKIE_NAME: 'eleva-provider-test',
  decodeProviderCookie: vi.fn(),
}));

vi.mock('./ai/provider/providers/mock', () => ({
  isMockModeActive: vi.fn(),
}));

import {
  AIProvider,
  onAILog,
  setProviderConfig,
  type AIProviderConfig,
} from './eleva-ai-provider';
import type { CoreMessage } from 'ai';
import type { ProviderConfig } from './ai/provider/types';
import { ai } from './ai';
import { isMockModeActive } from './ai/provider/providers/mock';
import { decodeProviderCookie } from './ai/provider/cookie-config';
import { createOpenAI } from '@ai-sdk/openai';
import { streamText as vercelStreamText } from 'ai';
import { cookies } from 'next/headers';

const mockGenerate = vi.mocked(ai.generate);
const mockGenerateObject = vi.mocked(ai.generateObject);
const mockIsMockMode = vi.mocked(isMockModeActive);
const mockDecodeCookie = vi.mocked(decodeProviderCookie);
const mockCreateOpenAI = vi.mocked(createOpenAI);
const mockStreamText = vi.mocked(vercelStreamText);
const mockCookies = vi.mocked(cookies);

/* The facade memoizes its OpenRouter client, so the stream tests share one
 * model factory spy across the module lifetime. */
const modelFactory = vi.fn((id: string) => ({ __model: id }));

const SINGLE_CONFIG = { mode: 'single', fallbackEnabled: false } as const satisfies Pick<ProviderConfig, 'mode' | 'fallbackEnabled'>;

function aiTextResult(overrides: Partial<Awaited<ReturnType<typeof ai.generate>>> = {}) {
  return {
    success: true,
    data: 'generated text',
    model: 'openai/gpt-4o-mini',
    finishReason: 'stop',
    usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
    trace: { step: 'generate', status: 'done' } as never,
    error: null,
    provider: 'openai',
    ...overrides,
  } as Awaited<ReturnType<typeof ai.generate>>;
}

function aiObjectResult<T extends Record<string, unknown>>(data: T, overrides: Record<string, unknown> = {}) {
  return {
    success: true,
    data,
    model: 'openai/gpt-4o-mini',
    finishReason: 'stop',
    usage: { promptTokens: 1, completionTokens: 2, totalTokens: 3 },
    trace: { step: 'generateObject', status: 'done' } as never,
    error: null,
    provider: 'openai',
    ...overrides,
  } as unknown as Awaited<ReturnType<typeof ai.generateObject>>;
}

type GenerateCall = Parameters<typeof ai.generate>;
function generateCalls(): GenerateCall[] {
  return mockGenerate.mock.calls as unknown as GenerateCall[];
}

beforeEach(() => {
  vi.clearAllMocks();
  setProviderConfig(null);
  mockIsMockMode.mockReturnValue(false);
  mockCookies.mockRejectedValue(new Error('no request context in tests'));
  mockDecodeCookie.mockReturnValue(null);
  mockCreateOpenAI.mockReturnValue(modelFactory as never);
});

afterEach(() => {
  setProviderConfig(null);
});

describe('AIProvider.generate', () => {
  it('maps the system prompt onto the right AITask (precedence pinned)', async () => {
    mockGenerate.mockResolvedValue(aiTextResult());

    const cases: Array<[string, string]> = [
      ['You parse resumes', 'parsing'],
      ['resume parser helper', 'parsing'],
      ['Write a cover letter', 'cover-letter'],
      ['Score with ATS', 'ats-score'],
      ['you are an ats engine', 'ats-score'],
      ['You are a job analyst reading the jd', 'jd-analysis'],
      ['career coach advice', 'career-coach'],
      ['Career coach advice', 'resume-rewrite'], // mapping is case-sensitive: 'Career' does not match
      ['Practice interview', 'interview'],
      ['Check grammar', 'grammar'],
      ['Rewrite this bullet', 'resume-rewrite'],
      ['resume + cover + ats in one', 'parsing'], // parsing wins: it is checked first
    ];
    for (const [system, expectedTask] of cases) {
      mockGenerate.mockClear();
      await AIProvider.generate({ system, prompt: 'x' });
      expect(generateCalls()[0][0]).toBe(expectedTask);
      void expectedTask;
    }
  });

  it('defaults temperature and maxTokens and forwards them', async () => {
    mockGenerate.mockResolvedValue(aiTextResult());

    await AIProvider.generate({ system: 'rewrite', prompt: 'p' });
    let [, params] = generateCalls()[0];
    expect(params).toMatchObject({ temperature: 0.7, maxTokens: 4096, system: 'rewrite', prompt: 'p' });

    await AIProvider.generate({ system: 'rewrite', prompt: 'p', temperature: 0.2, maxTokens: 128 });
    [, params] = generateCalls()[1];
    expect(params).toMatchObject({ temperature: 0.2, maxTokens: 128 });
  });

  it('coerces message content to strings and keeps roles', async () => {
    mockGenerate.mockResolvedValue(aiTextResult());

    const toolMessage = {
      role: 'tool',
      content: [{ type: 'tool-result', toolCallId: 't1', toolName: 'fn', result: 'out' }],
    } as unknown as CoreMessage;

    await AIProvider.generate({
      system: 'rewrite',
      messages: [
        { role: 'user', content: 'hello' },
        { role: 'assistant', content: [{ type: 'text', text: 'parts' }] as never },
        toolMessage,
      ],
    });

    const [, params] = generateCalls()[0];
    expect(params.messages).toEqual([
      { role: 'user', content: 'hello' },
      { role: 'assistant', content: '' },
      { role: 'tool', content: '' }, // array tool content is not a string: coerced away
    ]);
  });

  it('maps the raw result onto AIProviderResult: text passthrough or stringify, latency rounding, usage and trace', async () => {
    mockGenerate.mockResolvedValue(aiTextResult({ data: 'plain' }));
    const first = await AIProvider.generate({ system: 'rewrite', prompt: 'p' });
    expect(first).toMatchObject({
      text: 'plain',
      model: 'openai/gpt-4o-mini',
      finishReason: 'stop',
      usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
      trace: { step: 'generate', status: 'done' },
    });
    expect(Number.isInteger(first.latency)).toBe(true);

    mockGenerate.mockClear();
    mockGenerate.mockResolvedValue(aiTextResult({ data: { structured: true } }));
    const second = await AIProvider.generate({ system: 'rewrite' });
    expect(second.text).toBe(JSON.stringify({ structured: true }));

    mockGenerate.mockClear();
    mockGenerate.mockResolvedValue(aiTextResult({ data: null, usage: undefined, finishReason: undefined, trace: undefined }));
    const third = await AIProvider.generate({ system: 'rewrite' });
    expect(third.text).toBe(JSON.stringify(''));
    expect(third.usage).toBeUndefined();
  });

  it('resolves the provider config: explicit user config wins over the cookie and the env default', async () => {
    mockGenerate.mockResolvedValue(aiTextResult());
    mockCookies.mockResolvedValue({ get: vi.fn().mockReturnValue({ value: 'provider-cookie-value' }) } as never);
    const userConfig: ProviderConfig = { ...SINGLE_CONFIG, selectedProvider: 'anthropic', selectedModel: 'claude/x' };
    setProviderConfig(userConfig);
    mockDecodeCookie.mockReturnValue({ ...SINGLE_CONFIG, selectedProvider: 'openrouter', selectedModel: 'o/y' } as ProviderConfig);

    await AIProvider.generate({ system: 'rewrite' });
    expect(generateCalls()[0][2]).toEqual(userConfig);

    // user config cleared: decoded cookie wins over DEFAULT_ENV_PROVIDER
    setProviderConfig(null);
    mockGenerate.mockClear();
    await AIProvider.generate({ system: 'rewrite' });
    expect(generateCalls()[0][2]).toEqual({ ...SINGLE_CONFIG, selectedProvider: 'openrouter', selectedModel: 'o/y' });

    // no user config, no cookie: DEFAULT_ENV_PROVIDER (unset env -> built-in default)
    mockDecodeCookie.mockReturnValue(null);
    mockGenerate.mockClear();
    await AIProvider.generate({ system: 'rewrite' });
    expect(generateCalls()[0][2]).toEqual({
      selectedProvider: 'openai',
      selectedModel: 'openai/gpt-4o-mini',
      mode: 'single',
      fallbackEnabled: false,
    });
  });

  it('mock mode pins traffic to the offline mock provider even over explicit user config', async () => {
    mockGenerate.mockResolvedValue(aiTextResult());
    mockIsMockMode.mockReturnValue(true);
    setProviderConfig({
      ...SINGLE_CONFIG,
      selectedProvider: 'openai',
      selectedModel: 'o/x',
    } as ProviderConfig);

    await AIProvider.generate({ system: 'rewrite' });
    expect(generateCalls()[0][2]).toEqual({
      selectedProvider: 'mock',
      selectedModel: 'mock/default',
      mode: 'single',
      fallbackEnabled: false,
    });
  });

  it('emits an info log per call with the task/provider summary and token mapping', async () => {
    mockGenerate.mockResolvedValue(aiTextResult());
    const entries: Array<{ level: string; message: string; model: string; latencyMs: number; tokens?: { total: number } }> = [];
    const off = onAILog((e) => entries.push(e as never));

    await AIProvider.generate({ system: 'You parse resumes' });
    off();

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      level: 'info',
      message: 'parsing via openai',
      model: 'openai/gpt-4o-mini',
      tokens: { prompt: 10, completion: 20, total: 30 },
    });
    expect(Number.isInteger(entries[0].latencyMs)).toBe(true);
    expect(typeof entries[0].message).toBe('string');
  });

  it('a throwing log listener never breaks the generate flow', async () => {
    mockGenerate.mockResolvedValue(aiTextResult());
    const off = onAILog(() => { throw new Error('listener bug'); });

    const result = await AIProvider.generate({ system: 'rewrite' });
    expect(result.text).toBe('generated text');
    off();
  });

  it('unsubscribed listeners stop receiving logs', async () => {
    mockGenerate.mockResolvedValue(aiTextResult());
    const seen: string[] = [];
    const off = onAILog((e) => seen.push(e.model));

    await AIProvider.generate({ system: 'rewrite' });
    off();
    mockGenerate.mockClear();
    await AIProvider.generate({ system: 'rewrite' });
    expect(seen).toEqual(['openai/gpt-4o-mini']);
  });
});

describe('AIProvider.generateObject', () => {
  it('returns the parsed object with model and trace attached', async () => {
    mockGenerateObject.mockResolvedValue(aiObjectResult({ score: 87, matched: ['a'] }));

    const out = await AIProvider.generateObject({ system: 'Score ATS', prompt: 'p', schema: { parse: (v: unknown) => v } as never });
    expect(out).toEqual({ score: 87, matched: ['a'], model: 'openai/gpt-4o-mini', trace: { step: 'generateObject', status: 'done' } });
  });

  it('forwards the schema passthrough and defaults (temperature 0.7, maxTokens 2048)', async () => {
    mockGenerateObject.mockResolvedValue(aiObjectResult({ ok: true }));
    const schema = { parse: (v: unknown) => v } as never;

    await AIProvider.generateObject({ system: 'Score ATS', prompt: 'p', schema });

    expect(mockGenerateObject.mock.calls[0][0]).toBe('ats-score');
    expect(mockGenerateObject.mock.calls[0][1]).toMatchObject({ temperature: 0.7, maxTokens: 2048 });
  });

  it('throws the surfaced AI error when the object call fails', async () => {
    mockGenerateObject.mockResolvedValue(aiObjectResult({} as Record<string, never>, { success: false, error: 'provider down' } as never));

    await expect(AIProvider.generateObject({ prompt: 'p', schema: { parse: (v: unknown) => v } as never }))
      .rejects.toThrow('provider down');
  });

  it('falls back to a generic message when the failure carries no error text', async () => {
    mockGenerateObject.mockResolvedValue(aiObjectResult({} as Record<string, never>, { success: false, error: undefined } as never));

    await expect(AIProvider.generateObject({ prompt: 'p', schema: { parse: (v: unknown) => v } as never }))
      .rejects.toThrow('AI request failed');
  });

  it('logs the object-call summary', async () => {
    mockGenerateObject.mockResolvedValue(aiObjectResult({ ok: true }));
    const entries: Array<{ level: string; message: string }> = [];
    const off = onAILog((e) => entries.push(e as never));

    await AIProvider.generateObject({ system: 'cover letter writer', prompt: 'p', schema: { parse: (v: unknown) => v } as never });
    off();

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ level: 'info', message: 'cover-letter object via openai' });
  });
});

describe('AIProvider.stream', () => {
  it('is refused while mock mode is active and never reaches the SDK or the network', async () => {
    mockIsMockMode.mockReturnValue(true);

    await expect(AIProvider.stream({ prompt: 'p' })).rejects.toThrow(
      'AIProvider.stream() is unavailable while AI_MOCK_PROVIDER is active (deterministic mock mode)',
    );
    expect(mockStreamText).not.toHaveBeenCalled();
    expect(mockCreateOpenAI).not.toHaveBeenCalled();
  });

  it('routes through the OpenRouter client with the resolved model and forwards defaults', async () => {
    const streamResult = { textStream: (async function* () { yield 'chunk'; })() };
    mockStreamText.mockReturnValue(streamResult as never);

    setProviderConfig({
      ...SINGLE_CONFIG,
      selectedProvider: 'openrouter',
      selectedModel: 'openai/gpt-4o-mini',
    } as ProviderConfig);
    const result = await AIProvider.stream({ system: 's', prompt: 'p' });

    expect(result).toBe(streamResult);
    expect(mockCreateOpenAI).toHaveBeenCalledWith(expect.objectContaining({
      baseURL: 'https://openrouter.ai/api/v1',
      compatibility: 'compatible',
      headers: expect.objectContaining({ 'X-Title': 'Eleva' }),
    }));
    const createArgs = mockCreateOpenAI.mock.calls[0][0] as { apiKey: string };
    expect(createArgs.apiKey).toBe(process.env.OPENROUTER_API_KEY || 'MISSING');

    expect(modelFactory).toHaveBeenCalledWith('openai/gpt-4o-mini');
    const streamArgs = mockStreamText.mock.calls[0][0] as Record<string, unknown>;
    expect(streamArgs.model).toEqual({ __model: 'openai/gpt-4o-mini' });
    expect(streamArgs).toMatchObject({ system: 's', prompt: 'p', temperature: 0.7, maxTokens: 2048 });
  });

  it('falls back to the built-in model id when the config has none, and surfaces stream errors through the log', async () => {
    mockStreamText.mockReturnValue({} as never);

    await AIProvider.stream({ prompt: 'p' });
    expect(modelFactory).toHaveBeenCalledWith('openai/gpt-4o-mini');
    const streamArgs = mockStreamText.mock.calls[0][0] as { onError: ({ error }: { error: unknown }) => void };

    const entries: Array<{ level: string; message: string }> = [];
    const off = onAILog((e) => entries.push(e as never));
    streamArgs.onError({ error: new Error('boom') });
    streamArgs.onError({ error: 'raw string' });
    off();

    const messages = entries.map((e) => `${e.level}:${e.message}`);
    expect(messages).toContain('error:stream failed: boom');
    expect(messages).toContain('error:stream failed: raw string');
  });
});

describe('AIProvider.getSystemPrompt', () => {
  it('declares the Eleva Copilot identity and the zero-hallucination policy', () => {
    const prompt = AIProvider.getSystemPrompt();
    expect(prompt).toContain('Eleva Copilot');
    expect(prompt).toContain('ZERO HALLUCINATION POLICY');
    expect(prompt).toContain('Never invent achievements');
    expect(prompt).toContain('[X%]');
  });
});

describe('provider config resolution precedence', () => {
  it('reads the provider cookie only when no user config is set and mock mode is off', async () => {
    mockGenerate.mockResolvedValue(aiTextResult());
    const cookieConfig = { ...SINGLE_CONFIG, selectedProvider: 'gemini', selectedModel: 'g/m' } as ProviderConfig;
    mockCookies.mockResolvedValue({ get: vi.fn().mockReturnValue({ value: 'provider-cookie-value' }) } as never);
    mockDecodeCookie.mockReturnValue(cookieConfig);

    await AIProvider.generate({ system: 'rewrite' });
    expect(generateCalls()[0][2]).toEqual(cookieConfig);
    expect(mockDecodeCookie).toHaveBeenCalledWith('provider-cookie-value');
  });

  it('a missing or garbage cookie falls through to DEFAULT_ENV_PROVIDER', async () => {
    mockGenerate.mockResolvedValue(aiTextResult());
    mockDecodeCookie.mockReturnValue(null);

    await AIProvider.generate({ system: 'rewrite' });
    expect(generateCalls()[0][2]).toMatchObject({ selectedProvider: 'openai' });
  });

  it('a failing cookies() request context is swallowed and the default stands', async () => {
    mockGenerate.mockResolvedValue(aiTextResult());
    mockCookies.mockRejectedValue(new Error('outside request scope'));

    await AIProvider.generate({ system: 'rewrite' });
    expect(generateCalls()[0][2]).toMatchObject({ selectedProvider: 'openai' });
  });
});

describe('DEFAULT_AI_PROVIDER env configuration', () => {
  afterEach(() => {
    vi.resetModules();
    delete process.env.DEFAULT_AI_PROVIDER;
  });

  it('parses a valid DEFAULT_AI_PROVIDER json blob as the fallback config', async () => {
    process.env.DEFAULT_AI_PROVIDER = JSON.stringify({
      selectedProvider: 'nvidia',
      selectedModel: 'nvidia/nemotron',
      mode: 'single',
      fallbackEnabled: true,
    });
    vi.resetModules();
    const mod = await import('./eleva-ai-provider');
    const modAi = (await import('./ai')) as unknown as { ai: { generate: ReturnType<typeof vi.fn> } };
    modAi.ai.generate.mockResolvedValue(aiTextResult());

    await mod.AIProvider.generate({ system: 'rewrite' });
    const call = modAi.ai.generate.mock.calls[0] as unknown as GenerateCall;
    expect(call[2]).toEqual({
      selectedProvider: 'nvidia',
      selectedModel: 'nvidia/nemotron',
      mode: 'single',
      fallbackEnabled: true,
    });
  });

  it('a garbage DEFAULT_AI_PROVIDER blob falls back to the built-in openai default', async () => {
    process.env.DEFAULT_AI_PROVIDER = '{not json';
    vi.resetModules();
    const mod = await import('./eleva-ai-provider');
    const modAi = (await import('./ai')) as unknown as { ai: { generate: ReturnType<typeof vi.fn> } };
    modAi.ai.generate.mockResolvedValue(aiTextResult());

    await mod.AIProvider.generate({ system: 'rewrite' });
    const call = modAi.ai.generate.mock.calls[0] as unknown as GenerateCall;
    expect(call[2]).toEqual({
      selectedProvider: 'openai',
      selectedModel: 'openai/gpt-4o-mini',
      mode: 'single',
      fallbackEnabled: false,
    });
  });
});

describe('AIProviderConfig typing surface', () => {
  it('accepts the documented optional knobs (compile-time shape check)', () => {
    const config: AIProviderConfig = { plan: 'free', model: 'x', forcePro: true, timeout: 1000, maxRetries: 2, cache: false };
    expect(config.cache).toBe(false);
  });
});
