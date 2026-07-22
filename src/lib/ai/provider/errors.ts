export class ProviderError extends Error {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly statusCode?: number,
    public readonly retryable: boolean = false,
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}

export class ProviderBusyError extends ProviderError {
  constructor(provider: string, retryAfter?: number) {
    super(`Provider ${provider} is busy or rate-limited`, provider, 429, true);
    this.name = 'ProviderBusyError';
    this.retryAfter = retryAfter;
  }
  retryAfter?: number;
}

export class AuthenticationError extends ProviderError {
  constructor(provider: string) {
    super(`Provider ${provider} authentication failed`, provider, 401, false);
    this.name = 'AuthenticationError';
  }
}

export class ProviderInternalError extends ProviderError {
  constructor(provider: string) {
    super(`Provider ${provider} internal error`, provider, 500, true);
    this.name = 'ProviderInternalError';
  }
}

export class TimeoutError extends ProviderError {
  constructor(provider: string, timeoutMs: number) {
    super(`Provider ${provider} timed out after ${timeoutMs}ms`, provider, undefined, true);
    this.name = 'TimeoutError';
  }
}

export class NetworkError extends ProviderError {
  constructor(provider: string) {
    super(`Provider ${provider} unreachable`, provider, undefined, true);
    this.name = 'NetworkError';
  }
}

export class SchemaValidationError extends ProviderError {
  constructor(provider: string, issues: unknown) {
    super(`Schema validation failed for provider ${provider}: ${JSON.stringify(issues)}`, provider, 422, false);
    this.name = 'SchemaValidationError';
  }
}

export function normalizeError(provider: string, err: unknown): ProviderError {
  if (err instanceof ProviderError) return err;

  const message = err instanceof Error ? err.message : String(err);
  const statusCode = err && typeof err === 'object' && 'statusCode' in err
    ? (err as { statusCode?: number }).statusCode
    : undefined;

  if (statusCode === 429) return new ProviderBusyError(provider);
  if (statusCode === 401 || statusCode === 403) return new AuthenticationError(provider);
  if (statusCode && statusCode >= 500) return new ProviderInternalError(provider);

  if (message.toLowerCase().includes('timeout')) return new TimeoutError(provider, 30000);
  if (message.toLowerCase().includes('network') || message.toLowerCase().includes('econnrefused') || message.toLowerCase().includes('enotfound')) {
    return new NetworkError(provider);
  }

  return new ProviderError(message, provider, statusCode, statusCode === 429 || (statusCode !== undefined && statusCode >= 500));
}