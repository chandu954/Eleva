// @vitest-environment node
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(),
}));

import { DELETE, GET, PATCH, POST } from './route';
import { createClient } from '@/utils/supabase/server';

const mockCreateClient = vi.mocked(createClient);

/* A minimal thenable query builder: every method is recorded so tests can
 * assert which filters and payloads a handler produced, and awaiting the
 * builder resolves to the configured { data, error } pair like the real
 * PostgREST fetch would. */
type FetchResult = { data: unknown; error: unknown };

interface QueryBuilder {
  select(...args: unknown[]): QueryBuilder;
  eq(...args: unknown[]): QueryBuilder;
  order(...args: unknown[]): QueryBuilder;
  insert(...args: unknown[]): QueryBuilder;
  update(...args: unknown[]): QueryBuilder;
  delete(...args: unknown[]): QueryBuilder;
  single(): Promise<FetchResult>;
  calls: Record<string, unknown[][]>;
}

function chainable(result: FetchResult): QueryBuilder & PromiseLike<FetchResult> {
  const builder = { calls: {} } as unknown as QueryBuilder & PromiseLike<FetchResult>;
  for (const method of ['select', 'eq', 'order', 'insert', 'update', 'delete', 'single']) {
    builder.calls[method] = [];
    (builder as unknown as Record<string, unknown>)[method] = vi.fn((...args: unknown[]) => {
      builder.calls[method].push(args);
      if (method === 'single') return Promise.resolve(result);
      return builder;
    });
  }
  (builder as unknown as Record<string, unknown>).then = (resolve: (v: FetchResult) => unknown) =>
    Promise.resolve(result).then(resolve);
  return builder;
}

function clientWith(tables: Record<string, unknown>, user: unknown) {
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
    from: vi.fn((table: string) => tables[table]),
  } as unknown as Awaited<ReturnType<typeof createClient>>;
}

const authed = { id: 'user-1' };
const url = 'http://localhost:3000/eleva/api/applications';

function jsonRequest(method: 'POST' | 'PATCH', body: unknown) {
  return new NextRequest(url, {
    method,
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

function deleteRequest(id: string | null) {
  return new NextRequest(id ? `${url}?id=${id}` : url, { method: 'DELETE' });
}

describe('applications route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET', () => {
    it('returns 401 UNAUTHENTICATED with the error envelope when no user', async () => {
      mockCreateClient.mockResolvedValue(clientWith({}, null));
      const res = await GET();
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.code).toBe('UNAUTHENTICATED');
      expect(json.message).toBe('Not authenticated');
      expect(json.error).toBe('Not authenticated'); // legacy mirror
      expect(json.success).toBe(false);
      expect(typeof json.requestId).toBe('string');
    });

    it('scopes the listing to the caller and orders by updated_at desc', async () => {
      const row = { id: 'a1', company: 'Acme', status: 'applied' };
      const applications = chainable({ data: [row], error: null });
      mockCreateClient.mockResolvedValue(clientWith({ applications }, authed));

      const res = await GET();
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual({ applications: [row] });

      expect(applications.calls.eq).toContainEqual(['user_id', 'user-1']);
      expect(applications.calls.order).toEqual([['updated_at', { ascending: false }]]);
    });

    it('passes a database failure through as 500 INTERNAL_ERROR with the message', async () => {
      const applications = chainable({ data: null, error: { message: 'relation missing' } });
      mockCreateClient.mockResolvedValue(clientWith({ applications }, authed));

      const res = await GET();
      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.code).toBe('INTERNAL_ERROR');
      expect(json.message).toBe('relation missing');
    });
  });

  describe('POST', () => {
    const valid = { company: 'Acme', role: 'Engineer' };

    it('returns 401 UNAUTHENTICATED when no user', async () => {
      mockCreateClient.mockResolvedValue(clientWith({}, null));
      const res = await POST(jsonRequest('POST', valid));
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.code).toBe('UNAUTHENTICATED');
    });

    it('rejects an invalid body as 422 INVALID_BODY with flattened field errors', async () => {
      mockCreateClient.mockResolvedValue(clientWith({}, authed));
      const res = await POST(jsonRequest('POST', { company: '', status: 'nope' }));
      expect(res.status).toBe(422);
      const json = await res.json();
      expect(json.code).toBe('INVALID_BODY');
      const flat = json.detail.fieldErrors as Record<string, string[]>;
      expect(flat.company).toContain('String must contain at least 1 character(s)');
      expect(flat.status[0]).toMatch(/^Invalid enum value/);
    });

    it('validates the enum, uuid and datetime fields through createSchema', async () => {
      mockCreateClient.mockResolvedValue(clientWith({}, authed));
      const res = await POST(
        jsonRequest('POST', { company: 'Acme', role: 'E', priority: 'urgent', resume_id: 'nope', applied_at: 'soon' }),
      );
      expect(res.status).toBe(422);
      const json = await res.json();
      const flat = json.detail.fieldErrors as Record<string, string[]>;
      expect(Object.keys(flat).sort()).toEqual(['applied_at', 'priority', 'resume_id']);
    });

    it('inserts with defaults, stamps timestamps and logs activity as Added', async () => {
      const appRow = { ...valid, id: 'a9' };
      const applications = chainable({ data: appRow, error: null });
      const activity = chainable({ data: null, error: null });
      mockCreateClient.mockResolvedValue(clientWith({ applications, activity_log: activity }, authed));

      const res = await POST(jsonRequest('POST', valid));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual({ application: appRow });

      const insertArg = applications.calls.insert[0][0] as Record<string, unknown>;
      expect(insertArg).toMatchObject({
        company: 'Acme', role: 'Engineer', status: 'wishlist', priority: 'medium', user_id: 'user-1',
      });
      expect(typeof insertArg.created_at).toBe('string');
      expect(insertArg.updated_at).toBe(insertArg.created_at);

      const logArg = activity.calls.insert[0][0] as Record<string, unknown>;
      expect(logArg).toMatchObject({ user_id: 'user-1', kind: 'application_added', title: 'Added Acme', subtitle: 'Engineer' });
    });

    it('logs Applied to X when the payload carries status applied', async () => {
      const applications = chainable({ data: { id: 'a9' }, error: null });
      const activity = chainable({ data: null, error: null });
      mockCreateClient.mockResolvedValue(clientWith({ applications, activity_log: activity }, authed));

      await POST(jsonRequest('POST', { company: 'Acme', role: 'E', status: 'applied' }));
      const logArg = activity.calls.insert[0][0] as { title: string };
      expect(logArg.title).toBe('Applied to Acme');
    });

    it('surfaces an insert failure as 500 and skips the activity log', async () => {
      const applications = chainable({ data: null, error: { message: 'insert failed' } });
      const activity = chainable({ data: null, error: null });
      mockCreateClient.mockResolvedValue(clientWith({ applications, activity_log: activity }, authed));

      const res = await POST(jsonRequest('POST', valid));
      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.code).toBe('INTERNAL_ERROR');
      expect(json.message).toBe('insert failed');
      expect(activity.calls.insert).toEqual([]);
    });
  });

  describe('PATCH', () => {
    it('returns 400 BAD_REQUEST when the id is missing', async () => {
      mockCreateClient.mockResolvedValue(clientWith({}, authed));
      const res = await PATCH(jsonRequest('PATCH', { patch: { status: 'applied' } }));
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.code).toBe('BAD_REQUEST');
    });

    it('returns 401 before reading the body when no user', async () => {
      mockCreateClient.mockResolvedValue(clientWith({}, null));
      const res = await PATCH(jsonRequest('PATCH', { patch: {} }));
      expect(res.status).toBe(401);
    });

    it('applies the patch, scopes by id and user, and stamps updated_at', async () => {
      const updated = { id: 'x1', status: 'applied' };
      const applications = chainable({ data: updated, error: null });
      mockCreateClient.mockResolvedValue(clientWith({ applications }, authed));

      const res = await PATCH(jsonRequest('PATCH', { id: 'x1', patch: { status: 'applied' } }));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual({ application: updated });

      const updateArg = applications.calls.update[0][0] as Record<string, unknown>;
      expect(typeof updateArg.updated_at).toBe('string');
      expect(applications.calls.eq).toEqual([['id', 'x1'], ['user_id', 'user-1']]);
    });

    it('passes an update failure through as 500', async () => {
      const applications = chainable({ data: null, error: { message: 'row not found' } });
      mockCreateClient.mockResolvedValue(clientWith({ applications }, authed));

      const res = await PATCH(jsonRequest('PATCH', { id: 'x1', patch: {} }));
      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.message).toBe('row not found');
    });
  });

  describe('DELETE', () => {
    it('returns 400 BAD_REQUEST when the id param is missing', async () => {
      mockCreateClient.mockResolvedValue(clientWith({}, authed));
      const res = await DELETE(deleteRequest(null));
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.code).toBe('BAD_REQUEST');
    });

    it('returns 401 before touching the table when no user', async () => {
      mockCreateClient.mockResolvedValue(clientWith({}, null));
      const res = await DELETE(deleteRequest('x1'));
      expect(res.status).toBe(401);
    });

    it('deletes scoped to the caller and answers ok', async () => {
      const applications = chainable({ data: null, error: null });
      mockCreateClient.mockResolvedValue(clientWith({ applications }, authed));

      const res = await DELETE(deleteRequest('x1'));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);

      expect(applications.calls.delete).toHaveLength(1);
      expect(applications.calls.eq).toEqual([['id', 'x1'], ['user_id', 'user-1']]);
    });

    it('passes a delete failure through as 500', async () => {
      const applications = chainable({ data: null, error: { message: 'fk violation' } });
      mockCreateClient.mockResolvedValue(clientWith({ applications }, authed));

      const res = await DELETE(deleteRequest('x1'));
      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.code).toBe('INTERNAL_ERROR');
      expect(json.message).toBe('fk violation');
    });
  });
});
