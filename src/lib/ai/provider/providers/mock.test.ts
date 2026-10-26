// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { ExtractSchema, ScoreSchema } from '@/app/eleva/api/studio/pipeline/cache';

import type { StreamTextParams } from '../types';
import { getProvider, isProviderAvailable } from '../factory';
import { getModelsForProvider } from '../models';
import { mockProvider } from './mock';

const model = getModelsForProvider('mock')[0];
if (!model) throw new Error('mock/default model must be registered in provider/models.ts');

describe('mock provider — determinism', () => {
  it('returns identical text for repeated generateText calls', async () => {
    const params = {
      system: 'resume parser v2',
      prompt: 'Extract the work experience sections.',
      messages: [{ role: 'user' as const, content: 'please start' }],
    };
    const first = await mockProvider.generateText(params, model);
    const second = await mockProvider.generateText(params, model);

    expect(first.success).toBe(true);
    expect(second.data).toBe(first.data);
    expect(typeof first.data).toBe('string');
    expect((first.data as string).length).toBeGreaterThan(0);
    // Zero cost fiction: no tokens are billed by the offline provider.
    expect(first.usage?.totalTokens).toBe(0);
  });

  it('returns identical objects for repeated generateObject calls', async () => {
    const first = await mockProvider.generateObject({ schema: ExtractSchema }, model);
    const second = await mockProvider.generateObject({ schema: ExtractSchema }, model);

    expect(first.success).toBe(true);
    expect(second.data).toEqual(first.data);
  });
});

describe('mock provider — schema conformance', () => {
  it('generates ExtractSchema-conforming output', async () => {
    const result = await mockProvider.generateObject({ schema: ExtractSchema }, model);
    const parsed = ExtractSchema.safeParse(result.data);
    expect(parsed.success).toBe(true);
  });

  it('generates ScoreSchema-conforming output', async () => {
    const result = await mockProvider.generateObject({ schema: ScoreSchema }, model);
    const parsed = ScoreSchema.safeParse(result.data);
    expect(parsed.success).toBe(true);
  });

  it('handles a torture schema: constraints, defaults, unions, nested arrays', async () => {
    const tortureSchema = z.object({
      shortString: z.string().min(10),
      longString: z.string().min(60).max(300),
      score: z.number().int().min(0).max(75),
      deepScore: z.number().int().min(90).max(100),
      ratio: z.number().max(0.99),
      tags: z.array(z.enum(['alpha', 'beta'])).min(2).max(4),
      nested: z.array(z.object({ inner: z.string().min(5) })).max(3),
      optionalField: z.string().optional(),
      defaulted: z.string().default('seed'),
      nullable: z.string().nullable(),
      unionField: z.union([z.string(), z.number()]),
      flag: z.boolean(),
      magic: z.literal('magic'),
    });

    const result = await mockProvider.generateObject({ schema: tortureSchema }, model);
    expect(result.success).toBe(true);

    const parsed = tortureSchema.safeParse(result.data);
    expect(parsed.success).toBe(true);

    const value = result.data as z.infer<typeof tortureSchema>;
    expect(value.longString.length).toBeGreaterThanOrEqual(60);
    expect(value.shortString.length).toBeGreaterThanOrEqual(10);
    // Numbers clamp into their schema bounds instead of exceeding them.
    expect(value.score).toBe(70);
    expect(value.deepScore).toBe(90);
    expect(value.ratio).toBeLessThanOrEqual(0.99);
    // Arrays honor min counts so downstream `.every`/reduce logic still runs.
    expect(value.tags.length).toBe(2);
    expect(value.nested.every((n) => n.inner.length >= 5)).toBe(true);
    expect(value.defaulted).toBe('seed');
    expect(value.flag).toBe(true);
    expect(value.magic).toBe('magic');
  });

  it('assigns semantically plausible values to pipeline-critical field names', async () => {
    const result = await mockProvider.generateObject({ schema: ExtractSchema }, model);
    expect(result.data).toMatchObject({ company: 'Acme Robotics', role: 'Backend Engineer' });
  });
});

describe('mock provider — failure modes', () => {
  it('fails closed for a non-Zod schema', async () => {
    const result = await mockProvider.generateObject({ schema: 'not a schema' }, model);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/requires a Zod schema/);
  });

  it('fails closed for a non-object Zod schema', async () => {
    const result = await mockProvider.generateObject({ schema: z.string() }, model);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/requires a ZodObject/);
  });

  it('fails closed on unsupported nested types instead of emitting junk', async () => {
    const unsupported = z.object({ when: z.date() });
    const result = await mockProvider.generateObject({ schema: unsupported }, model);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/unsupported Zod type/);
  });
});

describe('mock provider — gating', () => {
  it('is disabled unless AI_MOCK_PROVIDER is exactly "true"', async () => {
    const prev = process.env.AI_MOCK_PROVIDER;
    try {
      delete process.env.AI_MOCK_PROVIDER;
      vi.resetModules();
      const { mockProvider: fresh } = await import('./mock');
      expect(fresh.enabled).toBe(false);

      process.env.AI_MOCK_PROVIDER = 'false';
      vi.resetModules();
      const { mockProvider: off } = await import('./mock');
      expect(off.enabled).toBe(false);

      process.env.AI_MOCK_PROVIDER = 'true';
      vi.resetModules();
      const { mockProvider: on } = await import('./mock');
      expect(on.enabled).toBe(true);
    } finally {
      if (prev === undefined) delete process.env.AI_MOCK_PROVIDER;
      else process.env.AI_MOCK_PROVIDER = prev;
      vi.resetModules();
    }
  });
});

describe('mock provider — registration', () => {
  it('is registered in the provider factory and available in mock mode', () => {
    expect(getProvider('mock')).toBe(mockProvider);
    // vitest.config.ts sets AI_MOCK_PROVIDER=true for the whole unit run.
    expect(isProviderAvailable('mock')).toBe(true);
  });

  it('has a registered model so provider routing can resolve it', () => {
    const models = getModelsForProvider('mock');
    expect(models.map((m) => m.id)).toContain('mock/default');
  });
});

describe('mock provider — misc capabilities', () => {
  it('refuses streaming', () => {
    const params: StreamTextParams = { prompt: 'anything' };
    expect(() => mockProvider.streamText(params, model)).toThrow(/Streaming is not supported/);
  });

  it('reports healthy with zero latency', async () => {
    const health = await mockProvider.health();
    expect(health).toEqual({ ok: true, latency: 0 });
  });
});
