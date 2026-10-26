import { z } from 'zod';

import type { AIProvider } from '../base';
import type { ModelConfig } from '../models';
import type { AIProviderResult, GenerateObjectParams, GenerateTextParams, StreamTextParams } from '../types';

/**
 * Central predicate for mock mode. Mock mode is FULLY off in production:
 * the AI_MOCK_PROVIDER flag alone is never enough — NODE_ENV must also be
 * something other than "production". A misconfigured production deploy
 * (flag leaking from a developer's .env) then falls back to live provider
 * selection instead of silently scoring resumes with synthesized data.
 *
 * Exported so every consumer (provider registry, default-provider pinning,
 * the stream() facade) gates on one tested predicate instead of repeating
 * the two-variable check inline.
 */
export function isMockModeActive(): boolean {
  return process.env.AI_MOCK_PROVIDER === 'true' && process.env.NODE_ENV !== 'production';
}

/**
 * Deterministic offline AI provider (test/dev only).
 *
 * Enabled only when AI_MOCK_PROVIDER=true AND NODE_ENV is not "production"
 * (see isMockModeActive). Wired into vitest.config.ts test.env, docker compose
 * dev, and the eleva-ai-provider default-provider fallback. `generateObject`
 * synthesizes values by walking
 * the requested Zod schema, so results always conform to the caller's exact
 * contract: schema-conform, stable across repeated calls, zero network, zero
 * API keys. Field names map to plausible sample strings so downstream code
 * processing the output behaves realistically in tests and demos.
 *
 * Limitations, stated up front:
 * - ZodEffects (refine/transform) is synthesized from its inner schema; a
 *   transform whose OUTPUT type differs from its input (e.g. string->number)
 *   is not modeled and callers relying on those should use a live provider.
 * - Tuple/Set/Map/Lazy/Date/BigInt are not synthesized; they produce a
 *   failure result naming the unsupported kind rather than silent junk.
 *
 * All `_def` access below is verified against the installed zod
 * (3.25.76): ZodString/number `_def.checks` `{kind,value}`, array
 * `_def.minLength/maxLength` `{value}`, Effects `_def.schema`, Default
 * `_def.defaultValue()`, Enum `_def.values`, Union/DiscriminatedUnion
 * `_def.options`, Record `_def.keyType/valueType`.
 */

const STRING_SAMPLES: Record<string, string> = {
  company: 'Acme Robotics',
  role: 'Backend Engineer',
  position: 'Backend Engineer',
  title: 'Senior Platform Engineer',
  summary: 'Deterministic mock response: pipeline steps proceed without a live provider.',
  professional_summary: 'Deterministic mock professional summary for the resume.',
  description: 'Deterministic mock description text from the offline provider.',
  responsibilities: 'Implemented a deterministic mock pipeline stage.',
  achievements: 'Reduced processing time by 12%.',
  insights: 'The resume aligns well with the job requirements.',
  question: 'Why do you want this role?',
  answer: 'I enjoy building reliable backend systems.',
  recommendation: 'Continue with the deterministic mock review.',
  feedback: 'The candidate matches the core requirements.',
  notes: 'Deterministic mock notes.',
  content: 'Deterministic mock content body.',
  section: 'Experience',
  reason: 'keyword coverage',
  label: 'Core',
  headline: 'Backend Engineer with 8 years experience',
  name: 'Acme Robotics',
  category: 'Languages',
  skills: 'TypeScript',
  technologies: 'TypeScript',
  url: 'https://example.com',
  from: 'Analytics',
  to: 'Backend Engineering',
  matched: 'TypeScript',
  missing: 'SQL',
  strengths: 'TypeScript',
  weaknesses: 'SQL',
  genericAreas: 'Depth',
  issues: 'Formatting',
  action: 'Review the deterministic mock output',
  text: 'Deterministic mock response.',
  message: 'Deterministic mock message.',
};

/** Deterministic sample for a string field, named after the field path. */
function sampleString(fieldName: string): string {
  const snakeKey = fieldName.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/[^a-z0-9_]/g, '');
  if (/ats|score/.test(snakeKey)) return '82';
  const known = STRING_SAMPLES[fieldName] ?? STRING_SAMPLES[snakeKey];
  const value = known ?? `mock ${snakeKey.replace(/_/g, ' ').trim() || 'value'}`;
  return value;
}

interface StringCheck {
  kind?: string;
  value?: number;
}

function synthesizeString_schemaChecks(schema: z.ZodString, path: readonly string[]): string {
  const checks = (schema._def.checks ?? []) as StringCheck[];
  const minLength = checks
    .filter((c) => c.kind === 'min' || c.kind === 'length' || c.kind === 'endsWith')
    .reduce((acc, c) => Math.max(acc, c.value ?? 0), 0);
  const maxLength = checks
    .filter((c) => c.kind === 'max' || c.kind === 'length')
    .reduce((acc, c) => Math.min(acc, c.value ?? Number.MAX_SAFE_INTEGER), Number.MAX_SAFE_INTEGER);

  const lastKey = path[path.length - 1] ?? '';
  let value = sampleString(lastKey);
  if (value.length < minLength) value = `${value} ${'x'.repeat(minLength)}`.slice(0, Math.max(minLength, value.length + 1));
  if (maxLength < Number.MAX_SAFE_INTEGER && value.length > maxLength) value = value.slice(0, maxLength);
  return value;
}

interface NumberCheck {
  kind?: string;
  value?: number;
  inclusive?: boolean;
}

function synthesizeNumber_schemaChecks(schema: z.ZodNumber): number {
  const checks = (schema._def.checks ?? []) as NumberCheck[];
  const isInt = checks.some((c) => c.kind === 'int');
  const min = checks
    .filter((c) => c.kind === 'min')
    .reduce((acc, c) => Math.max(acc, c.value ?? -Infinity), 0);
  const max = checks
    .filter((c) => c.kind === 'max')
    .reduce((acc, c) => Math.min(acc, c.value ?? Infinity), Infinity);

  // A plausible mid-range score, clamped into the schema's bounds.
  const base = Math.min(Math.max(70, min), max);
  if (isInt) return Math.min(Math.max(Math.round(base), min), max);
  return base;
}

/**
 * Build a schema-conforming value for the given Zod type.
 * `path` is the field path used to make strings semantically plausible.
 */
function synthesizeValue(schema: z.ZodType, path: readonly string[]): unknown {
  // Wrapper types first (recursive forms may nest arbitrarily).
  if (schema instanceof z.ZodEffects) {
    return synthesizeValue(schema._def.schema, path);
  }
  if (schema instanceof z.ZodCatch || schema instanceof z.ZodBranded) {
    const inner = (schema._def as unknown as { innerType?: z.ZodType; type?: z.ZodType }).innerType
      ?? (schema._def as unknown as { type?: z.ZodType }).type;
    if (!inner) throw new Error(`mock provider cannot unwrap Zod type at "${path.join('.')}"`);
    return synthesizeValue(inner, path);
  }
  if (schema instanceof z.ZodOptional || schema instanceof z.ZodNullable) {
    return synthesizeValue(schema._def.innerType, path);
  }
  if (schema instanceof z.ZodDefault) {
    // A default already has a conforming seed value; reuse it (deterministic).
    return schema._def.defaultValue();
  }

  if (schema instanceof z.ZodObject) {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(schema.shape)) {
      out[key] = synthesizeValue(schema.shape[key], [...path, key]);
    }
    return out;
  }
  if (schema instanceof z.ZodArray) {
    const min = schema._def.minLength?.value ?? 0;
    const max = schema._def.maxLength?.value ?? Number.MAX_SAFE_INTEGER;
    const count = Math.min(Math.max(min, 1), max);
    return Array.from({ length: count }, () => synthesizeValue(schema.element, path));
  }
  if (schema instanceof z.ZodString) {
    return synthesizeString_schemaChecks(schema, path);
  }
  if (schema instanceof z.ZodNumber) {
    return synthesizeNumber_schemaChecks(schema);
  }
  if (schema instanceof z.ZodBoolean) {
    return true;
  }
  if (schema instanceof z.ZodEnum) {
    return schema._def.values[0];
  }
  if (schema instanceof z.ZodNativeEnum) {
    return Object.values(schema._def.values)[0];
  }
  if (schema instanceof z.ZodLiteral) {
    return schema._def.value;
  }
  if (schema instanceof z.ZodUnion) {
    return synthesizeValue(schema._def.options[0], path);
  }
  if (schema instanceof z.ZodDiscriminatedUnion) {
    return synthesizeValue(schema._def.options[0], path);
  }
  if (schema instanceof z.ZodRecord) {
    const key = sampleString('key');
    return { [key]: synthesizeValue(schema._def.valueType, path) };
  }
  if (schema instanceof z.ZodNull) {
    return null;
  }
  if (schema instanceof z.ZodUndefined || schema instanceof z.ZodVoid || schema instanceof z.ZodNever) {
    return undefined;
  }
  if (schema instanceof z.ZodAny || schema instanceof z.ZodUnknown) {
    return 'mock';
  }

  throw new Error(
    `mock provider cannot synthesize unsupported Zod type "${describeKind(schema)}" at path "${path.join('.')}"`,
  );
}

function describeKind(schema: z.ZodType): string {
  const typeName = (schema._def as unknown as { typeName?: unknown }).typeName;
  if (typeof typeName === 'string') return typeName;
  return schema.constructor?.name ?? 'unknown';
}

function deterministicText(params: GenerateTextParams): string {
  const parts = [
    params.system,
    params.prompt,
    ...(params.messages ?? []).map((m) => m.content),
  ].filter(Boolean) as string[];
  const digestInput = parts.join('\n');
  let h = 0;
  for (let i = 0; i < digestInput.length; i++) h = (h * 31 + digestInput.charCodeAt(i)) | 0;
  const seed = Math.abs(h % 1000);
  return `[deterministic mock response #${seed}]\nProcessed ${digestInput.length} characters of input without a live provider.`;
}

function unwrapToBase(schema: z.ZodType): z.ZodType {
  if (schema instanceof z.ZodEffects) return unwrapToBase(schema._def.schema);
  if (schema instanceof z.ZodBranded) return unwrapToBase((schema._def as unknown as { type: z.ZodType }).type);
  if (schema instanceof z.ZodCatch) return unwrapToBase((schema._def as unknown as { innerType: z.ZodType }).innerType);
  return schema;
}

export const mockProvider: AIProvider = {
  id: 'mock',
  name: 'Mock (offline, deterministic)',
  // Evaluated at access time (not import time): the guard cannot be bypassed
  // by importing this module before NODE_ENV/flags are final.
  get enabled() {
    return isMockModeActive();
  },

  async generateText(params: GenerateTextParams, model: ModelConfig): Promise<AIProviderResult> {
    const start = performance.now();
    return {
      success: true,
      provider: 'mock',
      model: model.id,
      latency: Math.round(performance.now() - start),
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      finishReason: 'stop',
      data: deterministicText(params),
    };
  },

  async generateObject(params: GenerateObjectParams, model: ModelConfig): Promise<AIProviderResult> {
    const start = performance.now();
    const failure = (error: string): AIProviderResult => ({
      success: false,
      provider: 'mock',
      model: model.id,
      latency: Math.round(performance.now() - start),
      finishReason: 'error',
      data: null,
      error,
    });

    const raw = params.schema;
    if (!(raw instanceof z.ZodType)) {
      return failure('mock provider requires a Zod schema for generateObject');
    }
    const schema = unwrapToBase(raw);
    if (!(schema instanceof z.ZodObject)) {
      return failure(`mock provider requires a ZodObject schema, received "${describeKind(raw)}"`);
    }

    try {
      return {
        success: true,
        provider: 'mock',
        model: model.id,
        latency: Math.round(performance.now() - start),
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        finishReason: 'stop',
        data: synthesizeValue(schema, []),
      };
    } catch (err) {
      return failure(err instanceof Error ? err.message : 'mock generation failed');
    }
  },

  streamText(_params: StreamTextParams, _model: ModelConfig): ReadableStream<Uint8Array> {
    void _params;
    void _model;
    throw new Error('Streaming is not supported by the deterministic mock provider');
  },

  async health(): Promise<{ ok: boolean; latency: number }> {
    return { ok: true, latency: 0 };
  },
};
