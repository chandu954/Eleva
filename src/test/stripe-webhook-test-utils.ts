// @vitest-environment node
import { vi } from 'vitest';

const mocks = vi.hoisted(() => {
  process.env.STRIPE_SECRET_KEY = 'sk_test_webhook';
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
  return {
    constructEvent: vi.fn(),
    signature: 'sig_test' as string | null,
  };
});

vi.mock('next/headers', () => ({
  headers: vi.fn(async () => ({
    get: (name: string) => (name === 'stripe-signature' ? mocks.signature : null),
  })),
}));

vi.mock('stripe', () => ({
  default: vi.fn().mockImplementation(() => ({
    webhooks: { constructEvent: mocks.constructEvent },
  })),
}));

vi.mock('@/utils/actions/stripe/actions', () => ({
  manageSubscriptionStatusChange: vi.fn(),
}));

vi.mock('@/utils/supabase/server', () => ({
  createServiceClient: vi.fn(),
}));

vi.mock('@/lib/analytics/server', () => ({
  captureServerAnalyticsEvent: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { POST } from '@/app/api/webhooks/stripe/route';
import { manageSubscriptionStatusChange } from '@/utils/actions/stripe/actions';
import { createServiceClient } from '@/utils/supabase/server';
import { captureServerAnalyticsEvent } from '@/lib/analytics/server';
import { logger } from '@/lib/logger';

const mockCreateServiceClient = vi.mocked(createServiceClient);
const mockManageSubscription = vi.mocked(manageSubscriptionStatusChange);
const mockCapture = vi.mocked(captureServerAnalyticsEvent);
const mockLogger = vi.mocked(logger);

type QueryResult = { data?: unknown; error?: unknown };

interface TableConfig {
  selects?: QueryResult[];
  insert?: QueryResult;
  update?: QueryResult;
  delete?: QueryResult;
}

interface TableStub {
  calls: Record<string, unknown[][]>;
  select(...args: unknown[]): TableStub;
  eq(...args: unknown[]): TableStub;
  insert(...args: unknown[]): TableStub;
  update(...args: unknown[]): TableStub;
  delete(...args: unknown[]): TableStub;
  maybeSingle(): Promise<QueryResult>;
  then(
    onFulfilled: (value: QueryResult) => unknown,
    onRejected?: (reason: unknown) => unknown,
  ): Promise<unknown>;
}

/**
 * PostgREST builder stub whose awaited result depends on the terminal method:
 * `maybeSingle()` drains `selects`, while `insert`/`update`/`delete` resolve
 * the configured mutation result. The real handler awaits inserts and updates
 * directly, so those need their own result slots.
 */
function tableStub(config: TableConfig = {}): TableStub {
  const selects = [...(config.selects ?? [])];
  let pending: QueryResult = { data: null, error: null };
  const calls: Record<string, unknown[][]> = {
    select: [],
    eq: [],
    insert: [],
    update: [],
    delete: [],
    maybeSingle: [],
  };

  const builder: TableStub = {
    calls,
    select(...args) {
      calls.select.push(args);
      return builder;
    },
    eq(...args) {
      calls.eq.push(args);
      return builder;
    },
    insert(...args) {
      calls.insert.push(args);
      pending = config.insert ?? { data: null, error: null };
      return builder;
    },
    update(...args) {
      calls.update.push(args);
      pending = config.update ?? { data: null, error: null };
      return builder;
    },
    delete(...args) {
      calls.delete.push(args);
      pending = config.delete ?? { data: null, error: null };
      return builder;
    },
    maybeSingle() {
      calls.maybeSingle.push([]);
      return Promise.resolve(selects.shift() ?? { data: null, error: null });
    },
    then(onFulfilled, onRejected) {
      return Promise.resolve(pending).then(onFulfilled, onRejected);
    },
  };

  return builder;
}

function serviceClient(tables: Record<string, TableStub>) {
  return {
    from: vi.fn((table: string) => {
      const stub = tables[table];
      if (!stub) throw new Error(`unexpected service table: ${table}`);
      return stub;
    }),
  };
}

function installServiceClient(tables: Record<string, TableStub>) {
  mockCreateServiceClient.mockResolvedValue(serviceClient(tables) as never);
}

function makeEvent(type: string, object: Record<string, unknown>, id = 'evt_1') {
  return { id, type, data: { object } };
}

function webhookRequest(body = '{"ok":true}') {
  return new Request('http://localhost:3000/api/webhooks/stripe', {
    method: 'POST',
    body,
  });
}

const activeSubscription = {
  user_id: 'user-1',
  stripe_customer_id: 'cus_1',
  stripe_subscription_id: 'sub_1',
  subscription_plan: 'pro',
  subscription_status: 'active',
  current_period_end: '2026-12-01T00:00:00.000Z',
};

const canceledSubscription = {
  ...activeSubscription,
  subscription_plan: 'free',
  subscription_status: 'canceled',
};

function eventsTable(config: TableConfig = {}) {
  return tableStub({
    selects: [{ data: null, error: null }],
    insert: { data: null, error: null },
    update: { data: null, error: null },
    ...config,
  });
}

async function callWebhook() {
  return POST(webhookRequest());
}



export function getWebhookTestUtils() {
  return {
    POST,
    mocks,
    mockCreateServiceClient,
    mockManageSubscription,
    mockCapture,
    mockLogger,
    tableStub,
    serviceClient,
    installServiceClient,
    makeEvent,
    webhookRequest,
    activeSubscription,
    canceledSubscription,
    eventsTable,
    callWebhook,
  };
}

export function resetWebhookMocks() {
  vi.clearAllMocks();
  mocks.signature = 'sig_test';
  mocks.constructEvent.mockReset();
  mockManageSubscription.mockReset();
  mockManageSubscription.mockResolvedValue(activeSubscription as never);
  mockCapture.mockReset();
  mockCapture.mockResolvedValue(undefined);
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
}
