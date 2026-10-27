/**
 * Structured, dependency-free JSON logger.
 *
 * Every log line is a single JSON object so production log drains (Vercel,
 * Datadog, Loki, CloudWatch) can index `level`, `message`, `service`,
 * `requestId`, and arbitrary context fields without regex parsing. The logger
 * is intentionally runtime-agnostic: it only uses `console`, so it works in
 * Node.js, the Edge runtime, and unit tests.
 *
 * Security: context keys that look like credentials are redacted before they
 * reach the sink. Error objects are expanded into name/message/stack so the
 * stack survives JSON serialization.
 */

export const LOG_LEVELS = ['debug', 'info', 'warn', 'error'] as const;

export type LogLevel = (typeof LOG_LEVELS)[number];

export type LogContext = Record<string, unknown>;

export interface LoggerOptions {
  /** Minimum level to emit. Defaults to `LOG_LEVEL` or `info`. */
  level?: LogLevel;
  /** Override the sink (used by tests and custom transports). */
  sink?: (line: string, level: LogLevel) => void;
  /** Base context merged into every entry. */
  context?: LogContext;
}

export interface Logger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
  child(context: LogContext): Logger;
}

const LEVEL_WEIGHT: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const SENSITIVE_KEY =
  /(password|passwd|secret|token|authorization|cookie|api[_-]?key|private[_-]?key|credential|session)/i;

const MAX_DEPTH = 6;
const MAX_STRING = 2_000;

function isLogLevel(value: unknown): value is LogLevel {
  return typeof value === 'string' && (LOG_LEVELS as readonly string[]).includes(value);
}

export function resolveLogLevel(value: unknown = process.env.LOG_LEVEL): LogLevel {
  return isLogLevel(value) ? value : 'info';
}

function truncate(value: string): string {
  return value.length > MAX_STRING ? `${value.slice(0, MAX_STRING)}…` : value;
}

/**
 * Convert an arbitrary context value into a JSON-safe value.
 * Handles Error, Map, Set, BigInt, circular references, and redaction.
 */
export function serializeLogValue(
  value: unknown,
  depth = 0,
  seen: WeakSet<object> = new WeakSet(),
): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return truncate(value);
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (typeof value === 'bigint') return value.toString();
  if (typeof value === 'function') return `[Function ${value.name || 'anonymous'}]`;
  if (typeof value === 'symbol') return value.toString();

  if (value instanceof Date) return value.toISOString();
  if (value instanceof Error) {
    return {
      name: value.name,
      message: truncate(value.message),
      ...(value.stack ? { stack: truncate(value.stack) } : {}),
      ...(value.cause !== undefined ? { cause: serializeLogValue(value.cause, depth + 1, seen) } : {}),
    };
  }

  if (typeof value !== 'object') return String(value);
  if (seen.has(value)) return '[Circular]';
  if (depth >= MAX_DEPTH) return '[MaxDepth]';

  seen.add(value);

  if (Array.isArray(value)) {
    return value.map((item) => serializeLogValue(item, depth + 1, seen));
  }

  if (value instanceof Map) {
    return serializeLogValue(Object.fromEntries(value), depth + 1, seen);
  }

  if (value instanceof Set) {
    return Array.from(value, (item) => serializeLogValue(item, depth + 1, seen));
  }

  const output: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    output[key] = SENSITIVE_KEY.test(key) ? '[REDACTED]' : serializeLogValue(nested, depth + 1, seen);
  }

  seen.delete(value);
  return output;
}

function defaultSink(line: string, level: LogLevel): void {
  // Keep the underlying console level so operators can filter in local dev.
  switch (level) {
    case 'debug':
      console.debug(line);
      break;
    case 'info':
      console.info(line);
      break;
    case 'warn':
      console.warn(line);
      break;
    case 'error':
      console.error(line);
      break;
  }
}

function emit(
  level: LogLevel,
  message: string,
  context: LogContext,
  options: LoggerOptions,
  baseContext: LogContext,
): void {
  const threshold = options.level ?? resolveLogLevel();
  if (LEVEL_WEIGHT[level] < LEVEL_WEIGHT[threshold]) return;

  const entry: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    level,
    service: 'eleva',
    environment: process.env.NODE_ENV ?? 'development',
    message: truncate(message),
    ...(serializeLogValue({ ...baseContext, ...context }) as Record<string, unknown>),
  };

  const line = JSON.stringify(entry);
  (options.sink ?? defaultSink)(line, level);
}

export function createLogger(options: LoggerOptions = {}, baseContext: LogContext = options.context ?? {}): Logger {
  return {
    debug: (message, context = {}) => emit('debug', message, context, options, baseContext),
    info: (message, context = {}) => emit('info', message, context, options, baseContext),
    warn: (message, context = {}) => emit('warn', message, context, options, baseContext),
    error: (message, context = {}) => emit('error', message, context, options, baseContext),
    child: (context) => createLogger(options, { ...baseContext, ...context }),
  };
}

/** Application-wide logger. Use `logger.child({ requestId })` per request. */
export const logger = createLogger();
