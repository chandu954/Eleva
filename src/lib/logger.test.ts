// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  createLogger,
  logger,
  resolveLogLevel,
  serializeLogValue,
  type LogLevel,
} from './logger';

function capture(level: LogLevel = 'debug') {
  const lines: Array<{ line: string; level: LogLevel }> = [];
  const instance = createLogger({
    level,
    sink: (line, emittedLevel) => lines.push({ line, level: emittedLevel }),
  });
  return { instance, lines };
}

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.LOG_LEVEL;
});

describe('resolveLogLevel', () => {
  it('accepts known levels and falls back to info', () => {
    expect(resolveLogLevel('debug')).toBe('debug');
    expect(resolveLogLevel('ERROR')).toBe('info');
    expect(resolveLogLevel(undefined)).toBe('info');
    expect(resolveLogLevel('verbose')).toBe('info');
  });

  it('reads LOG_LEVEL from the environment by default', () => {
    process.env.LOG_LEVEL = 'warn';
    expect(resolveLogLevel()).toBe('warn');
  });
});

describe('createLogger', () => {
  it('emits one JSON object per line with stable fields', () => {
    const { instance, lines } = capture();
    instance.info('resume.created', { resumeId: 'r1', durationMs: 12 });

    expect(lines).toHaveLength(1);
    const entry = JSON.parse(lines[0]!.line) as Record<string, unknown>;
    expect(entry.level).toBe('info');
    expect(entry.service).toBe('eleva');
    expect(entry.message).toBe('resume.created');
    expect(entry.resumeId).toBe('r1');
    expect(entry.durationMs).toBe(12);
    expect(typeof entry.timestamp).toBe('string');
    expect(typeof entry.environment).toBe('string');
  });

  it('filters entries below the configured level', () => {
    const { instance, lines } = capture('warn');
    instance.debug('noise');
    instance.info('noise');
    instance.warn('kept');
    instance.error('kept-error');

    expect(lines.map((entry) => entry.level)).toEqual(['warn', 'error']);
  });

  it('merges child context without mutating the parent', () => {
    const { instance, lines } = capture();
    const requestLogger = instance.child({ requestId: 'req-1' });
    requestLogger.info('first');
    instance.info('second');

    const first = JSON.parse(lines[0]!.line) as Record<string, unknown>;
    const second = JSON.parse(lines[1]!.line) as Record<string, unknown>;
    expect(first.requestId).toBe('req-1');
    expect(second.requestId).toBeUndefined();
  });

  it('redacts credential-shaped keys at every nesting level', () => {
    const { instance, lines } = capture();
    instance.error('auth.failed', {
      authorization: 'Bearer super-secret',
      nested: { apiKey: 'sk-live-123', password: 'hunter2', safe: 'visible' },
      sessionToken: 'abc',
    });

    const entry = JSON.parse(lines[0]!.line) as Record<string, unknown>;
    expect(entry.authorization).toBe('[REDACTED]');
    expect(entry.sessionToken).toBe('[REDACTED]');
    expect(entry.nested).toEqual({
      apiKey: '[REDACTED]',
      password: '[REDACTED]',
      safe: 'visible',
    });
    expect(lines[0]!.line).not.toContain('super-secret');
    expect(lines[0]!.line).not.toContain('hunter2');
  });

  it('serializes Error instances and circular references safely', () => {
    const { instance, lines } = capture();
    const circular: Record<string, unknown> = { name: 'loop' };
    circular.self = circular;

    instance.error('boom', {
      error: new Error('database unavailable'),
      circular,
      when: new Date('2026-01-02T03:04:05.000Z'),
      count: BigInt(3),
    });

    const entry = JSON.parse(lines[0]!.line) as Record<string, unknown>;
    expect(entry.error).toMatchObject({
      name: 'Error',
      message: 'database unavailable',
    });
    expect((entry.error as Record<string, unknown>).stack).toBeTypeOf('string');
    expect(entry.circular).toEqual({ name: 'loop', self: '[Circular]' });
    expect(entry.when).toBe('2026-01-02T03:04:05.000Z');
    expect(entry.count).toBe('3');
  });

  it('serializes Map, Set, functions and symbols', () => {
    const { instance, lines } = capture();
    instance.info('values', {
      map: new Map([['a', 1]]),
      set: new Set(['x']),
      fn: function namedFn() {},
      symbol: Symbol('s'),
    });

    const entry = JSON.parse(lines[0]!.line) as Record<string, unknown>;
    expect(entry.map).toEqual({ a: 1 });
    expect(entry.set).toEqual(['x']);
    expect(entry.fn).toBe('[Function namedFn]');
    expect(entry.symbol).toBe('Symbol(s)');
  });

  it('truncates very long strings and deep structures', () => {
    const { instance, lines } = capture();
    const deep = { a: { b: { c: { d: { e: { f: { g: 'too deep' } } } } } } };
    instance.info('long', { value: 'x'.repeat(2_100), deep });

    const entry = JSON.parse(lines[0]!.line) as Record<string, any>;
    expect((entry.value as string).endsWith('…')).toBe(true);
    expect((entry.value as string).length).toBe(2_001);
    expect(JSON.stringify(entry.deep)).toContain('[MaxDepth]');
  });

  it('routes levels to the matching console method by default', () => {
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const instance = createLogger({ level: 'debug' });

    instance.debug('d');
    instance.info('i');
    instance.warn('w');
    instance.error('e');

    expect(debugSpy).toHaveBeenCalledTimes(1);
    expect(infoSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });
});

describe('serializeLogValue', () => {
  it('leaves primitives unchanged and handles undefined', () => {
    expect(serializeLogValue('text')).toBe('text');
    expect(serializeLogValue(42)).toBe(42);
    expect(serializeLogValue(false)).toBe(false);
    expect(serializeLogValue(null)).toBeNull();
    expect(serializeLogValue(undefined)).toBeUndefined();
  });
});

describe('default logger', () => {
  it('is a ready-to-use logger', () => {
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.child).toBe('function');
  });
});
