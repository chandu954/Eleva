import { vi } from 'vitest';

/**
 * Minimal thenable stand-in for the (untyped) PostgREST query builder used
 * by the API routes. Every method call is recorded into `calls` so tests
 * can assert what a handler sent to the database; awaiting the builder —
 * or calling single()/maybeSingle() — resolves to the configured
 * { data, error } pair, like the real fetch would.
 */
export type StubResult = { data: unknown; error: unknown };

export interface PostgrestStub {
  select(...args: unknown[]): PostgrestStub;
  eq(...args: unknown[]): PostgrestStub;
  order(...args: unknown[]): PostgrestStub;
  or(...args: unknown[]): PostgrestStub;
  not(...args: unknown[]): PostgrestStub;
  limit(...args: unknown[]): PostgrestStub;
  insert(...args: unknown[]): PostgrestStub;
  update(...args: unknown[]): PostgrestStub;
  upsert(...args: unknown[]): PostgrestStub;
  delete(...args: unknown[]): PostgrestStub;
  single(): Promise<StubResult>;
  maybeSingle(): Promise<StubResult>;
  calls: Record<string, unknown[][]>;
}

const BUILDER_METHODS = [
  'select', 'eq', 'order', 'or', 'not', 'limit',
  'insert', 'update', 'upsert', 'delete',
] as const;

export function stubTable(result: StubResult): PostgrestStub {
  const stub = {} as PostgrestStub;
  stub.calls = {};
  for (const method of [...BUILDER_METHODS, 'single', 'maybeSingle']) {
    stub.calls[method] = [];
    (stub as unknown as Record<string, unknown>)[method] = vi.fn((...args: unknown[]) => {
      stub.calls[method].push(args);
      if (method === 'single' || method === 'maybeSingle') return Promise.resolve(result);
      return stub;
    });
  }
  (stub as unknown as Record<string, unknown>).then = (resolve: (v: StubResult) => unknown) =>
    Promise.resolve(result).then(resolve);
  return stub;
}

export type SupabaseStubShape = {
  auth: { getUser: ReturnType<typeof vi.fn> };
  from: (table: string) => PostgrestStub | PostgrestStub[];
};

/* Client-level stub: `tables` maps table names to a stub (reused) or a list
 * of stubs (handed out per call in order). Unlisted table names fail fast
 * with a clear error instead of silently returning undefined. */
export function stubSupabase(authUser: { id: string } | null, tables: Record<string, PostgrestStub | PostgrestStub[]>) {
  const getUser = vi.fn().mockResolvedValue({ data: { user: authUser } });
  const from = vi.fn((table: string) => {
    const entry = tables[table];
    if (!entry) throw new Error(`stubSupabase: unexpected table "${table}"`);
    if (Array.isArray(entry)) {
      if (entry.length === 0) throw new Error(`stubSupabase: no stubs left for "${table}"`);
      return entry.shift() as PostgrestStub;
    }
    return entry;
  });
  return { auth: { getUser }, from } as never;
}
