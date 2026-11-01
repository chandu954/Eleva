import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  createLogger,
  resolveLogLevel,
  serializeLogValue,
} from './logger';

describe('logger', () => {
  let sink: (line: string, level: string) => void;
  let lines: Array<{ line: string; level: string }>;

  beforeEach(() => {
    lines = [];
    sink = (line, level) => {
      lines.push({ line, level });
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('resolveLogLevel', () => {
    it('defaults to info when env is unset', () => {
      const orig = process.env.LOG_LEVEL;
      delete process.env.LOG_LEVEL;
      expect(resolveLogLevel()).toBe('info');
      process.env.LOG_LEVEL = orig;
    });

    it('resolves a valid level', () => {
      expect(resolveLogLevel('debug')).toBe('debug');
      expect(resolveLogLevel('warn')).toBe('warn');
      expect(resolveLogLevel('error')).toBe('error');
    });

    it('falls back to info for invalid input', () => {
      expect(resolveLogLevel('not-a-level')).toBe('info');
      expect(resolveLogLevel('')).toBe('info');
    });
  });

  describe('emit levels', () => {
    it('emits info entries', () => {
      const logger = createLogger({ level: 'info', sink });
      logger.info('hello world');
      expect(lines).toHaveLength(1);
      const entry = JSON.parse(lines[0].line);
      expect(entry.level).toBe('info');
      expect(entry.message).toBe('hello world');
      expect(entry.service).toBe('eleva');
      expect(entry.timestamp).toBeDefined();
      expect(entry.environment).toBeDefined();
    });

    it('emits warn entries', () => {
      const logger = createLogger({ level: 'warn', sink });
      logger.warn('be careful');
      expect(lines[0].level).toBe('warn');
    });

    it('emits error entries', () => {
      const logger = createLogger({ level: 'error', sink });
      logger.error('boom');
      expect(lines[0].level).toBe('error');
    });

    it('suppresses debug below info threshold', () => {
      const logger = createLogger({ level: 'info', sink });
      logger.debug('hidden');
      logger.info('visible');
      expect(lines).toHaveLength(1);
      expect(lines[0].level).toBe('info');
    });

    it('emits debug when threshold is debug', () => {
      const logger = createLogger({ level: 'debug', sink });
      logger.debug('visible');
      expect(lines).toHaveLength(1);
      expect(lines[0].level).toBe('debug');
    });
  });

  describe('context redaction', () => {
    it('redacts password-like keys', () => {
      const logger = createLogger({ level: 'info', sink });
      logger.info('login', { password: 'hunter2', username: 'alice' });
      const entry = JSON.parse(lines[0].line);
      expect(entry.password).toBe('[REDACTED]');
      expect(entry.username).toBe('alice');
    });

    it('redacts token-like keys', () => {
      const logger = createLogger({ level: 'info', sink });
      logger.info('auth', { api_token: 'abc-123', session: 'xyz' });
      const entry = JSON.parse(lines[0].line);
      expect(entry.api_token).toBe('[REDACTED]');
      expect(entry.session).toBe('[REDACTED]');
    });

    it('redacts nested credential keys', () => {
      const logger = createLogger({ level: 'info', sink });
      logger.info('config', { db: { api_key: 'secret-key' } });
      const entry = JSON.parse(lines[0].line);
      expect(entry.db.api_key).toBe('[REDACTED]');
    });
  });

  describe('error serialization', () => {
    it('serializes Error objects with name/message/stack', () => {
      const logger = createLogger({ level: 'error', sink });
      const err = new Error('something failed');
      logger.error('caught', { error: err });
      const entry = JSON.parse(lines[0].line);
      expect(entry.error.name).toBe('Error');
      expect(entry.error.message).toBe('something failed');
      expect(entry.error.stack).toBeDefined();
    });
  });

  describe('child logger', () => {
    it('merges base context into child entries', () => {
      const parent = createLogger({ level: 'info', sink, context: { requestId: 'req-1' } });
      const child = parent.child({ userId: 'user-2' });
      child.info('request handled');
      const entry = JSON.parse(lines[0].line);
      expect(entry.requestId).toBe('req-1');
      expect(entry.userId).toBe('user-2');
    });

    it('child overrides parent context key', () => {
      const parent = createLogger({ level: 'info', sink, context: { requestId: 'req-1' } });
      const child = parent.child({ requestId: 'req-2' });
      child.info('override');
      const entry = JSON.parse(lines[0].line);
      expect(entry.requestId).toBe('req-2');
    });
  });

  describe('serializeLogValue', () => {
    it('truncates long strings', () => {
      const long = 'a'.repeat(3000);
      expect(serializeLogValue(long)).toHaveLength(2001);
    });

    it('handles circular references', () => {
      const obj: Record<string, unknown> = { a: 1 };
      obj.self = obj;
      expect((serializeLogValue(obj) as Record<string, unknown>).self).toBe('[Circular]');
    });

    it('serializes BigInt', () => {
      expect(String(serializeLogValue(BigInt(123)))).toBe('123');
    });

    it('serializes Map', () => {
      const map = new Map([['k', 'v']]);
      expect(serializeLogValue(map)).toEqual({ k: 'v' });
    });
  });
});
