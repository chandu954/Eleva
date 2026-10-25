// @vitest-environment node
import assert from 'node:assert/strict';
import { describe, it, vi, afterEach } from 'vitest';

import { apiError, apiOk, nextRequestId, type ApiErrorCode } from './api-response';

async function readJson(res: Response): Promise<Record<string, unknown>> {
  return (await res.json()) as Record<string, unknown>;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('apiError', () => {
  it('maps known codes to their documented HTTP status', async () => {
    const cases: Array<[ApiErrorCode, number]> = [
      ['BAD_REQUEST', 400],
      ['INVALID_BODY', 422],
      ['UNAUTHENTICATED', 401],
      ['FORBIDDEN', 403],
      ['NOT_FOUND', 404],
      ['CONFLICT', 409],
      ['RATE_LIMIT_EXCEEDED', 429],
      ['PROVIDER_ERROR', 502],
      ['INTERNAL_ERROR', 500],
    ];
    for (const [code, status] of cases) {
      const res = apiError(code, 'boom');
      assert.equal(res.status, status, `${code} should map to ${status}`);
    }
  });

  it('emits the standard success=false envelope with matching legacy error field', async () => {
    const res = apiError('BAD_REQUEST', 'Invalid input');
    const body = await readJson(res);
    assert.equal(body.success, false);
    assert.equal(body.code, 'BAD_REQUEST');
    assert.equal(body.message, 'Invalid input');
    assert.equal(body.error, 'Invalid input');
    assert.equal(typeof body.requestId, 'string');
    assert.ok(!('detail' in body));
  });

  it('includes detail only when explicitly provided', async () => {
    const withDetail = await readJson(apiError('BAD_REQUEST', 'Bad', { detail: { field: 'name' } }));
    assert.deepEqual(withDetail.detail, { field: 'name' });

    const withoutDetail = await readJson(apiError('BAD_REQUEST', 'Bad', { detail: undefined }));
    assert.ok(!('detail' in withoutDetail));

    // detail: null is a provided value and must be preserved.
    const nullDetail = await readJson(apiError('BAD_REQUEST', 'Bad', { detail: null }));
    assert.ok('detail' in nullDetail);
    assert.equal(nullDetail.detail, null);
  });

  it('honors an explicit status override and caller requestId', async () => {
    const res = apiError('BAD_REQUEST', 'Bad', { status: 503, requestId: 'custom-id' });
    const body = await readJson(res);
    assert.equal(res.status, 503);
    assert.equal(body.requestId, 'custom-id');
  });

  it('logs errors for 5xx codes and stays quiet for 4xx', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    apiError('INTERNAL_ERROR', 'kaboom');
    assert.equal(errorSpy.mock.calls.length, 1);
    assert.ok(String(errorSpy.mock.calls[0][0]).includes('INTERNAL_ERROR'));

    apiError('BAD_REQUEST', 'input error');
    assert.equal(errorSpy.mock.calls.length, 1, '4xx must not log');

    // Provider errors carry provider failure details (explicit or default status).
    apiError('PROVIDER_ERROR', 'upstream broke', { detail: new Error('e') });
    assert.ok(errorSpy.mock.calls.length >= 2);
  });
});

describe('apiOk', () => {
  it('wraps the payload in a success=true envelope', async () => {
    const res = apiOk({ resumeId: 'r1', score: 87 });
    const body = await readJson(res);
    assert.equal(res.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.resumeId, 'r1');
    assert.equal(body.score, 87);
  });
});

describe('nextRequestId', () => {
  it('produces distinct, non-empty ids', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 50; i++) {
      const id = nextRequestId();
      assert.ok(id.length > 0);
      assert.ok(!seen.has(id), `duplicate id produced: ${id}`);
      seen.add(id);
    }
  });
});
