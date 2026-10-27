import { beforeEach, describe, expect, it, vi } from 'vitest';
import { stubSupabase, stubTable } from '@/test/postgrest-stub';

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/utils/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/lib/eleva-ai-provider', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/eleva-ai-provider')>();
  return {
    ...actual,
    AIProvider: {
      generate: vi.fn().mockResolvedValue({
        text: 'Generated output',
        usage: { promptTokens: 10, completionTokens: 20 },
      }),
      generateObject: vi.fn().mockResolvedValue({
        object: { optimized: 'Better prompt', explanation: 'Clearer', improvements: ['Structure'] },
      }),
    },
  };
});

import { createClient } from '@/utils/supabase/server';
import { AIProvider } from '@/lib/eleva-ai-provider';
import {
  createPrompt,
  deletePrompt,
  duplicatePrompt,
  optimizePrompt,
  restoreVersion,
  runPrompt,
  toggleFavorite,
  updatePrompt,
} from './actions';

const mockCreateClient = vi.mocked(createClient);

function form(body: Record<string, unknown>) {
  const fd = new FormData();
  fd.set('body', JSON.stringify(body));
  return fd;
}

const prompt = {
  id: 'prompt-1',
  user_id: 'user-1',
  key: 'my-prompt',
  title: 'My Prompt',
  description: 'Desc',
  system_prompt: 'You are helpful',
  user_prompt_template: 'Hello {{name}}',
  model: 'gpt-4.1-mini',
  temperature: 0.5,
  max_tokens: 1000,
  variables: ['name'],
  tags: [],
  version: 1,
  usage_count: 2,
  success_count: 2,
  failure_count: 0,
  avg_latency_ms: 100,
  avg_tokens: 30,
  avg_cost: 0,
};

function client(user: { id: string } | null = { id: 'user-1' }, tables: Record<string, unknown> = {}) {
  return stubSupabase(user, tables as never);
}

describe('prompt studio actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateClient.mockResolvedValue(client() as never);
  });

  it('creates a prompt', async () => {
    mockCreateClient.mockResolvedValue(
      client({ id: 'user-1' }, {
        ai_prompts: stubTable({ data: prompt, error: null }),
      }) as never,
    );

    await expect(createPrompt(form({ title: 'My Prompt', system_prompt: 'You are helpful' }))).resolves.toEqual({ data: prompt });

    mockCreateClient.mockResolvedValue(client(null) as never);
    await expect(createPrompt(form({ title: 'x' }))).resolves.toEqual({ error: 'Not authenticated' });
  });

  it('returns prompt creation errors', async () => {
    mockCreateClient.mockResolvedValue(
      client({ id: 'user-1' }, {
        ai_prompts: stubTable({ data: null, error: { message: 'insert failed' } }),
      }) as never,
    );

    await expect(createPrompt(form({ title: 'x', system_prompt: 'y' }))).resolves.toEqual({ error: 'insert failed' });
  });

  it('updates a prompt and writes a version history row', async () => {
    const versions = stubTable({ data: null, error: null });
    mockCreateClient.mockResolvedValue(
      client({ id: 'user-1' }, {
        ai_prompts: [
          stubTable({ data: { version: 1 }, error: null }),
          stubTable({ data: { ...prompt, version: 2 }, error: null }),
        ],
        prompt_versions: versions,
      }) as never,
    );

    await expect(updatePrompt('prompt-1', form({ title: 'Updated', system_prompt: 'New' }))).resolves.toMatchObject({
      data: { version: 2 },
    });
    expect(versions.calls.insert).toHaveLength(1);
  });

  it('updates prompts without an existing version and surfaces errors', async () => {
    mockCreateClient.mockResolvedValue(
      client({ id: 'user-1' }, {
        ai_prompts: [
          stubTable({ data: null, error: null }),
          stubTable({ data: prompt, error: null }),
        ],
        prompt_versions: stubTable({ data: null, error: null }),
      }) as never,
    );
    await expect(updatePrompt('prompt-1', form({ title: 'Updated' }))).resolves.toEqual({ data: prompt });

    mockCreateClient.mockResolvedValue(
      client({ id: 'user-1' }, {
        ai_prompts: [
          stubTable({ data: null, error: null }),
          stubTable({ data: null, error: { message: 'update failed' } }),
        ],
      }) as never,
    );
    await expect(updatePrompt('prompt-1', form({ title: 'Updated' }))).resolves.toEqual({ error: 'update failed' });
  });

  it('duplicates database prompts', async () => {
    mockCreateClient.mockResolvedValue(
      client({ id: 'user-1' }, {
        ai_prompts: [
          stubTable({ data: prompt, error: null }),
          stubTable({ data: { ...prompt, id: 'prompt-copy' }, error: null }),
        ],
      }) as never,
    );

    await expect(duplicatePrompt('prompt-1')).resolves.toMatchObject({ data: { id: 'prompt-copy' } });
  });

  it('duplicates built-in presets and reports missing prompts', async () => {
    mockCreateClient.mockResolvedValue(
      client({ id: 'user-1' }, {
        ai_prompts: stubTable({ data: { ...prompt, id: 'copy' }, error: null }),
      }) as never,
    );

    await expect(duplicatePrompt('builtin:ats-resume-optimizer')).resolves.toMatchObject({ data: { id: 'copy' } });
    await expect(duplicatePrompt('builtin:missing')).resolves.toEqual({ error: 'Prompt not found' });

    mockCreateClient.mockResolvedValue(client(null) as never);
    await expect(duplicatePrompt('builtin:ats-resume-optimizer')).resolves.toEqual({ error: 'Not authenticated' });
  });

  it('deletes prompts but protects built-ins', async () => {
    mockCreateClient.mockResolvedValue(
      client({ id: 'user-1' }, {
        ai_prompts: stubTable({ data: null, error: null }),
      }) as never,
    );

    await expect(deletePrompt('prompt-1')).resolves.toEqual({ success: true });
    await expect(deletePrompt('builtin:ats-resume-optimizer')).resolves.toMatchObject({ error: expect.stringContaining('cannot be deleted') });

    mockCreateClient.mockResolvedValue(
      client({ id: 'user-1' }, {
        ai_prompts: stubTable({ data: null, error: { message: 'delete failed' } }),
      }) as never,
    );
    await expect(deletePrompt('prompt-1')).resolves.toEqual({ error: 'delete failed' });
  });

  it('toggles prompt favorites', async () => {
    mockCreateClient.mockResolvedValue(
      client({ id: 'user-1' }, {
        prompt_favorites: [
          stubTable({ data: { id: 'fav-1' }, error: null }),
          stubTable({ data: null, error: null }),
        ],
      }) as never,
    );
    await expect(toggleFavorite('prompt-1')).resolves.toEqual({ favorited: false });

    mockCreateClient.mockResolvedValue(
      client({ id: 'user-1' }, {
        prompt_favorites: [
          stubTable({ data: null, error: null }),
          stubTable({ data: null, error: null }),
        ],
      }) as never,
    );
    await expect(toggleFavorite('prompt-1')).resolves.toEqual({ favorited: true });

    await expect(toggleFavorite('builtin:ats-resume-optimizer')).resolves.toMatchObject({ error: expect.stringContaining('cannot be favorited') });

    mockCreateClient.mockResolvedValue(client(null) as never);
    await expect(toggleFavorite('prompt-1')).resolves.toEqual({ error: 'Not authenticated' });
  });

  it('restores prompt versions', async () => {
    mockCreateClient.mockResolvedValue(
      client({ id: 'user-1' }, {
        prompt_versions: stubTable({ data: { id: 'version-1', version: 1, system_prompt: 'Old' }, error: null }),
        ai_prompts: [
          stubTable({ data: { version: 1 }, error: null }),
          stubTable({ data: prompt, error: null }),
        ],
      }) as never,
    );
    await expect(restoreVersion('prompt-1', 'version-1')).resolves.toEqual({ data: prompt });

    mockCreateClient.mockResolvedValue(
      client({ id: 'user-1' }, {
        prompt_versions: stubTable({ data: null, error: null }),
      }) as never,
    );
    await expect(restoreVersion('prompt-1', 'missing')).resolves.toEqual({ error: 'Version not found' });
  });

  it('runs saved prompts and records execution stats', async () => {
    mockCreateClient.mockResolvedValue(
      client({ id: 'user-1' }, {
        ai_prompts: [
          stubTable({ data: prompt, error: null }),
          stubTable({ data: { ...prompt, usage_count: 2 }, error: null }),
          stubTable({ data: null, error: null }),
        ],
        prompt_executions: stubTable({ data: null, error: null }),
      }) as never,
    );

    await expect(runPrompt(form({
      promptId: 'prompt-1',
      variables: { name: 'Ada', instructions: 'Be concise' },
      temperature: 0.2,
      maxTokens: 500,
    }))).resolves.toMatchObject({ output: 'Generated output', tokensIn: 10, tokensOut: 20 });
  });

  it('runs built-in prompts without writing execution rows', async () => {
    mockCreateClient.mockResolvedValue(client({ id: 'user-1' }) as never);

    await expect(runPrompt(form({
      promptId: 'builtin:ats-resume-optimizer',
      variables: { jobDescription: 'Job', resume: 'CV' },
    }))).resolves.toMatchObject({ output: 'Generated output' });
  });

  it('reports run failures and missing prompts', async () => {
    mockCreateClient.mockResolvedValue(
      client({ id: 'user-1' }, {
        ai_prompts: stubTable({ data: null, error: null }),
      }) as never,
    );
    await expect(runPrompt(form({ promptId: 'missing', variables: {} }))).resolves.toEqual({ error: 'Prompt not found' });

    mockCreateClient.mockResolvedValue(
      client({ id: 'user-1' }, {
        ai_prompts: stubTable({ data: prompt, error: null }),
        prompt_executions: stubTable({ data: null, error: null }),
      }) as never,
    );
    vi.mocked(AIProvider.generate).mockRejectedValueOnce(new Error('provider down'));
    await expect(runPrompt(form({ promptId: 'prompt-1', variables: {} }))).resolves.toEqual({ error: 'provider down' });

    mockCreateClient.mockResolvedValue(client(null) as never);
    await expect(runPrompt(form({ promptId: 'prompt-1', variables: {} }))).resolves.toEqual({ error: 'Not authenticated' });
  });

  it('optimizes prompts', async () => {
    await expect(optimizePrompt(form({ title: 'T', description: 'D', system_prompt: 'P' }))).resolves.toMatchObject({
      object: { optimized: 'Better prompt' },
    });
  });
});
