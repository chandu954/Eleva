// @vitest-environment node
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/eleva-ai-provider', () => ({
  AIProvider: {
    generate: vi.fn(),
    generateObject: vi.fn(),
    stream: vi.fn(),
    getSystemPrompt: vi.fn(() => 'Eleva system prompt'),
  },
}));

import { POST } from './route';
import { createClient } from '@/utils/supabase/server';
import { AIProvider } from '@/lib/eleva-ai-provider';
import { stubSupabase, stubTable } from '@/test/postgrest-stub';

const mockCreateClient = vi.mocked(createClient);
const mockGenerate = vi.mocked(AIProvider.generate);

const URL = 'http://localhost:3000/eleva/api/prompts/run';

function request(body: Record<string, unknown> | string) {
  return new NextRequest(URL, {
    method: 'POST',
    body: typeof body === 'string' ? body : JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

type StreamEvent = Record<string, unknown>;
async function eventsOf(res: Response): Promise<{ events: StreamEvent[]; text: string }> {
  const text = await res.text();
  const events = text.trim().split('\n').filter(Boolean).map((line) => JSON.parse(line) as StreamEvent);
  return { events, text };
}

function textResult(text: string) {
  return {
    text, model: 'openai/gpt-4o-mini', finishReason: 'stop',
    usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
    latency: 40,
  } as never;
}

const DB_PROMPT = {
  id: 'p-db-1', version: 3, system_prompt: 'You are a helper.',
  user_prompt_template: 'Hello {{name}}, note {{missing}}.', model: 'openai/gpt-4o-mini',
  temperature: 0.3, max_tokens: 1024, editable_instructions: null, locked_sections: null,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('prompts/run route', () => {
  it('returns 401 UNAUTHENTICATED before reading the body', async () => {
    mockCreateClient.mockResolvedValue(stubSupabase(null, {}));

    const res = await POST(request('{ broken'));
    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toMatchObject({ success: false, code: 'UNAUTHENTICATED' });
  });

  it('an unknown database prompt answers 404 NOT_FOUND and never streams', async () => {
    const aiPrompts = stubTable({ data: null, error: { message: 'no row' } });
    mockCreateClient.mockResolvedValue(stubSupabase({ id: 'uid-1' }, { ai_prompts: aiPrompts }));

    const res = await POST(request({ promptId: 'missing', variables: {} }));
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.code).toBe('NOT_FOUND');
    expect(aiPrompts.calls.eq).toEqual([['id', 'missing']]);
  });

  it('an unknown builtin key also answers 404', async () => {
    mockCreateClient.mockResolvedValue(stubSupabase({ id: 'uid-1' }, {}));

    const res = await POST(request({ promptId: 'builtin:not-a-key', variables: {} }));
    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({ code: 'NOT_FOUND' });
  });

  it('runs a database prompt: substitutes variables, keeps the prompt model and records the execution', async () => {
    const aiPrompts = stubTable({ data: DB_PROMPT, error: null });
    const executions = stubTable({ data: null, error: null });
    mockCreateClient.mockResolvedValue(stubSupabase({ id: 'uid-1' }, { ai_prompts: aiPrompts, prompt_executions: executions }));
    mockGenerate.mockResolvedValue(textResult('best output written'));

    const res = await POST(request({ promptId: 'p-db-1', variables: { name: 'Ada', skippedKey: 7 }, temperature: undefined }));
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('text/event-stream');
    expect(res.headers.get('cache-control')).toBe('no-cache');
    expect(res.headers.get('connection')).toBe('keep-alive');

    const { events } = await eventsOf(res);
    // each word arrives as its own token event with a trailing space
    expect(events.filter((e) => e.type === 'token').map((e) => e.content)).toEqual(['best ', 'output ', 'written ']);
    // trailing fields on done come after the token events
    const done = events.at(-1) as { type: string; tokensIn: number; tokensOut: number; cost: number; model: string };
    expect(done).toMatchObject({ type: 'done', tokensIn: 10, tokensOut: 20, model: 'openai/gpt-4o-mini' });
    expect(done.cost).toBeCloseTo(10 * 0.000003 + 20 * 0.000015, 10);

    const call = mockGenerate.mock.calls[0][0] as { system: string; prompt: string; config: { model?: string } };
    expect(call.system).toBe('You are a helper.');
    expect(call.prompt).toBe('Hello Ada, note {{missing}}.'); // unknown vars stay verbatim
    expect(call.config.model).toBe('openai/gpt-4o-mini');

    const record = executions.calls.insert[0][0] as Record<string, unknown>;
    expect(record).toMatchObject({
      prompt_id: 'p-db-1', user_id: 'uid-1', version: 3,
      input_variables: { name: 'Ada', skippedKey: 7 },
      output_text: 'best output written', model: 'openai/gpt-4o-mini',
      temperature: 0.3, max_tokens: 1024,
      tokens_input: 10, tokens_output: 20, success: true, error_message: undefined,
    });
    expect(typeof record.latency_ms).toBe('number');
  });

  it('the builtin catalog path streams without touching any table and never records an execution', async () => {
    const fromSpy = vi.fn();
    mockCreateClient.mockResolvedValue({ auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'uid-1' } } }) }, from: fromSpy } as never);
    mockGenerate.mockResolvedValue(textResult('optimized'));

    const res = await POST(request({ promptId: 'builtin:ats-resume-optimizer', variables: { jobDescription: 'JD text', resume: 'R text' } }));
    expect(res.status).toBe(200);

    const { events } = await eventsOf(res);
    expect(events.filter((e) => e.type === 'token').map((e) => e.content)).toEqual(['optimized ']);
    const done = events.at(-1) as { type: string; model: string | null };
    expect(done).toMatchObject({ type: 'done', model: 'openai/gpt-4o-mini' }); // falls back to the result model (prompt.model null)

    // the builtin preset's template is substituted with the given variables
    const call = mockGenerate.mock.calls[0][0] as { system: string; prompt: string };
    expect(call.system).toContain('ATS resume optimization expert');
    expect(call.prompt).toContain('Job description:\nJD text');
    expect(call.prompt).toContain('Resume:\nR text');

    expect(fromSpy).not.toHaveBeenCalled();
  });

  it('an explicit model and overrides win over the prompt row in both the call and the execution record', async () => {
    const aiPrompts = stubTable({ data: DB_PROMPT, error: null });
    const executions = stubTable({ data: null, error: null });
    mockCreateClient.mockResolvedValue(stubSupabase({ id: 'uid-1' }, { ai_prompts: aiPrompts, prompt_executions: executions }));
    mockGenerate.mockResolvedValue(textResult('ok'));

    await POST(request({ promptId: 'p-db-1', variables: {}, model: 'custom/model', temperature: 0.9, maxTokens: 512 }));
    const call = mockGenerate.mock.calls[0][0] as { config: { model?: string } };
    expect(call.config.model).toBe('custom/model');
    const record = executions.calls.insert[0][0] as Record<string, unknown>;
    expect(record).toMatchObject({ model: 'custom/model', temperature: 0.9, max_tokens: 512 });
  });

  it('editable_instructions take over the system side, gated by locked_sections', async () => {
    const aiPrompts = stubTable({
      data: { ...DB_PROMPT, editable_instructions: 'Rewrite kindly.', locked_sections: 'LOCKED RULES', system_prompt: 'ignored' },
      error: null,
    });
    const executions = stubTable({ data: null, error: null });
    mockCreateClient.mockResolvedValue(stubSupabase({ id: 'uid-1' }, { ai_prompts: aiPrompts, prompt_executions: executions }));
    mockGenerate.mockResolvedValue(textResult('ok'));

    const res = await POST(request({ promptId: 'p-db-1', variables: { instructions: 'Friendlier please.' } }));
    await eventsOf(res);

    const call = mockGenerate.mock.calls[0][0] as { system: string; prompt: string };
    expect(call.system).toBe('LOCKED RULES\n\nFriendlier please.');
    // the instructions variable is not substituted into the user prompt
    expect(call.prompt).toBe('Hello {{name}}, note {{missing}}.');
  });

  it('ai failures stream an error event and still record a failed execution with zero cost', async () => {
    const aiPrompts = stubTable({ data: DB_PROMPT, error: null });
    const executions = stubTable({ data: null, error: null });
    mockCreateClient.mockResolvedValue(stubSupabase({ id: 'uid-1' }, { ai_prompts: aiPrompts, prompt_executions: executions }));
    mockGenerate.mockRejectedValue(new Error('no credits'));

    const res = await POST(request({ promptId: 'p-db-1', variables: { name: 'Ada' } }));
    expect(res.status).toBe(200); // the stream itself still opens

    const { events } = await eventsOf(res);
    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({ type: 'error', message: 'no credits' });

    const record = executions.calls.insert[0][0] as Record<string, unknown>;
    expect(record).toMatchObject({ success: false, error_message: 'no credits', output_text: null, tokens_input: 0, tokens_output: 0, cost: 0 });
  });
});
