import { NextResponse } from 'next/server';

export type ApiErrorCode =
  | 'BAD_REQUEST'
  | 'INVALID_BODY'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMIT_EXCEEDED'
  | 'PROVIDER_ERROR'
  | 'AI_EXTRACTION_FAILED'
  | 'EXPORT_FAILED'
  | 'INTERNAL_ERROR';

const CODE_STATUS: Record<ApiErrorCode, number> = {
  BAD_REQUEST: 400,
  INVALID_BODY: 422,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMIT_EXCEEDED: 429,
  PROVIDER_ERROR: 502,
  AI_EXTRACTION_FAILED: 500,
  EXPORT_FAILED: 500,
  INTERNAL_ERROR: 500,
};

let requestCounter = 0;

export function nextRequestId(): string {
  requestCounter = (requestCounter + 1) % 0xffff;
  return `${Date.now().toString(36)}-${requestCounter.toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Standard error envelope for all Eleva API routes.
 *
 * Keeps the legacy `error` field (a human-readable message) so existing
 * clients reading `j.error` keep working, while adding structured `code`,
 * `message`, and `requestId` fields for observability.
 */
export function apiError(
  code: ApiErrorCode,
  message: string,
  opts?: { status?: number; detail?: unknown; requestId?: string },
): NextResponse {
  const status = opts?.status ?? CODE_STATUS[code];
  const requestId = opts?.requestId ?? nextRequestId();

  if (status >= 500) {
    console.error(`[API] ${code} (${requestId}): ${message}`, opts?.detail ?? '');
  }

  return NextResponse.json(
    {
      success: false,
      code,
      message,
      error: message,
      ...(opts?.detail !== undefined ? { detail: opts.detail } : {}),
      requestId,
    },
    { status },
  );
}

export function apiOk<T extends Record<string, unknown>>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json({ success: true, ...data }, init);
}
