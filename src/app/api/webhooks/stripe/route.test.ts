// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

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

import { POST } from './route';
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

describe('stripe webhook route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.signature = 'sig_test';
    mocks.constructEvent.mockReset();
    mockManageSubscription.mockReset();
    mockManageSubscription.mockResolvedValue(activeSubscription as never);
    mockCapture.mockReset();
    mockCapture.mockResolvedValue(undefined);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  describe('signature verification', () => {
    it('rejects a request without a stripe-signature header', async () => {
      mocks.signature = null;
      const res = await callWebhook();

      expect(res.status).toBe(400);
      await expect(res.json()).resolves.toEqual({
        error: 'Missing stripe-signature header',
      });
      expect(mocks.constructEvent).not.toHaveBeenCalled();
      expect(mockCreateServiceClient).not.toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalledWith('stripe.webhook.signature_missing');
    });

    it('rejects an invalid signature with the Stripe error message', async () => {
      mocks.constructEvent.mockImplementation(() => {
        throw new Error('No signatures found matching the expected signature for payload');
      });

      const res = await callWebhook();

      expect(res.status).toBe(400);
      await expect(res.json()).resolves.toEqual({
        error: 'No signatures found matching the expected signature for payload',
      });
      expect(mockCreateServiceClient).not.toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith(
        'stripe.webhook.signature_invalid',
        expect.objectContaining({ error: expect.any(Error) }),
      );
    });

    it('passes the raw body, signature header and webhook secret to constructEvent', async () => {
      mocks.constructEvent.mockReturnValue(
        makeEvent('unhandled.event', { id: 'obj_1' }),
      );

      await callWebhook();

      expect(mocks.constructEvent).toHaveBeenCalledWith(
        '{"ok":true}',
        'sig_test',
        'whsec_test',
      );
    });

    it('reports a missing Stripe secret as a signature failure (current behavior)', async () => {
      const previousKey = process.env.STRIPE_SECRET_KEY;
      delete process.env.STRIPE_SECRET_KEY;
      try {
        const res = await callWebhook();
        // BUG: getStripe() throws inside the constructEvent try block, so a
        // server misconfiguration is reported as a 400 client signature
        // error instead of a 500.
        expect(res.status).toBe(400);
        await expect(res.json()).resolves.toEqual({
          error: 'STRIPE_SECRET_KEY is not configured',
        });
        expect(mocks.constructEvent).not.toHaveBeenCalled();
        expect(mockLogger.error).toHaveBeenCalledWith(
          'stripe.webhook.signature_invalid',
          expect.objectContaining({ error: expect.any(Error) }),
        );
      } finally {
        process.env.STRIPE_SECRET_KEY = previousKey;
      }
    });
  });

  describe('unhandled event types', () => {
    it('acknowledges irrelevant events without touching the database', async () => {
      mocks.constructEvent.mockReturnValue(
        makeEvent('payment_intent.succeeded', { id: 'pi_1' }),
      );

      const res = await callWebhook();

      expect(res.status).toBe(200);
      await expect(res.json()).resolves.toEqual({
        received: true,
        processed: false,
        message: 'Event type payment_intent.succeeded was received but not processed',
      });
      expect(mockCreateServiceClient).not.toHaveBeenCalled();
      expect(mockManageSubscription).not.toHaveBeenCalled();
    });
  });

  describe('idempotency and event reservation', () => {
    it('skips an event that was already processed', async () => {
      const events = eventsTable({
        selects: [{ data: { event_id: 'evt_1', processed_at: '2026-10-01T00:00:00Z' }, error: null }],
      });
      installServiceClient({ stripe_webhook_events: events });
      mocks.constructEvent.mockReturnValue(
        makeEvent('customer.subscription.updated', { id: 'sub_1', customer: 'cus_1' }),
      );

      const res = await callWebhook();

      expect(res.status).toBe(200);
      await expect(res.json()).resolves.toEqual({
        received: true,
        processed: false,
        duplicate: true,
      });
      expect(events.calls.insert).toHaveLength(0);
      expect(events.calls.update).toHaveLength(0);
      expect(mockManageSubscription).not.toHaveBeenCalled();
    });

    it('processes an event row that exists but has not been processed', async () => {
      const events = eventsTable({
        selects: [{ data: { event_id: 'evt_1', processed_at: null }, error: null }],
      });
      installServiceClient({ stripe_webhook_events: events });
      mocks.constructEvent.mockReturnValue(
        makeEvent('customer.subscription.updated', { id: 'sub_1', customer: 'cus_1' }),
      );

      const res = await callWebhook();

      expect(res.status).toBe(200);
      expect(events.calls.insert).toHaveLength(0);
      expect(mockManageSubscription).toHaveBeenCalledWith('sub_1', 'cus_1');
      expect(events.calls.update).toHaveLength(1);
    });

    it('skips when the insert hits a unique violation and the winning row is processed', async () => {
      const events = eventsTable({
        selects: [
          { data: null, error: null },
          { data: { event_id: 'evt_1', processed_at: '2026-10-01T00:00:00Z' }, error: null },
        ],
        insert: { data: null, error: { code: '23505', message: 'duplicate key' } },
      });
      installServiceClient({ stripe_webhook_events: events });
      mocks.constructEvent.mockReturnValue(
        makeEvent('customer.subscription.updated', { id: 'sub_1', customer: 'cus_1' }),
      );

      const res = await callWebhook();

      expect(res.status).toBe(200);
      await expect(res.json()).resolves.toEqual({
        received: true,
        processed: false,
        duplicate: true,
      });
      expect(events.calls.insert).toHaveLength(1);
      expect(mockManageSubscription).not.toHaveBeenCalled();
    });

    it('processes when the unique-violation winner has not completed yet', async () => {
      const events = eventsTable({
        selects: [
          { data: null, error: null },
          { data: { event_id: 'evt_1', processed_at: null }, error: null },
        ],
        insert: { data: null, error: { code: '23505', message: 'duplicate key' } },
      });
      installServiceClient({ stripe_webhook_events: events });
      mocks.constructEvent.mockReturnValue(
        makeEvent('customer.subscription.updated', { id: 'sub_1', customer: 'cus_1' }),
      );

      const res = await callWebhook();

      expect(res.status).toBe(200);
      expect(mockManageSubscription).toHaveBeenCalledWith('sub_1', 'cus_1');
      expect(events.calls.update).toHaveLength(1);
    });

    it('returns 500 when the idempotency lookup fails', async () => {
      const events = eventsTable({
        selects: [{ data: null, error: { message: 'lookup failed' } }],
      });
      installServiceClient({ stripe_webhook_events: events });
      mocks.constructEvent.mockReturnValue(
        makeEvent('customer.subscription.updated', { id: 'sub_1', customer: 'cus_1' }),
      );

      const res = await callWebhook();

      expect(res.status).toBe(500);
      expect(mockManageSubscription).not.toHaveBeenCalled();
    });

    it('returns 500 when reserving the event fails with a non-duplicate error', async () => {
      const events = eventsTable({
        insert: { data: null, error: { code: '42501', message: 'permission denied' } },
      });
      installServiceClient({ stripe_webhook_events: events });
      mocks.constructEvent.mockReturnValue(
        makeEvent('customer.subscription.updated', { id: 'sub_1', customer: 'cus_1' }),
      );

      const res = await callWebhook();

      expect(res.status).toBe(500);
      expect(mockManageSubscription).not.toHaveBeenCalled();
    });

    it('returns 500 when marking the event processed fails', async () => {
      const events = eventsTable({
        update: { data: null, error: { message: 'update failed' } },
      });
      installServiceClient({ stripe_webhook_events: events });
      mocks.constructEvent.mockReturnValue(
        makeEvent('customer.subscription.updated', { id: 'sub_1', customer: 'cus_1' }),
      );

      const res = await callWebhook();

      expect(res.status).toBe(500);
      expect(mockManageSubscription).toHaveBeenCalled();
      expect(events.calls.update).toHaveLength(1);
    });
  });

  describe('handled event types', () => {
    it('handles checkout.session.completed for a subscription and emits lifecycle analytics', async () => {
      const events = eventsTable();
      installServiceClient({ stripe_webhook_events: events });
      mocks.constructEvent.mockReturnValue(
        makeEvent('checkout.session.completed', {
          mode: 'subscription',
          customer: 'cus_1',
          subscription: 'sub_1',
        }),
      );

      const res = await callWebhook();

      expect(res.status).toBe(200);
      await expect(res.json()).resolves.toEqual({ received: true });
      expect(mockManageSubscription).toHaveBeenCalledWith('sub_1', 'cus_1');
      expect(mockCapture).toHaveBeenCalledWith(
        expect.objectContaining({
          distinctId: 'user-1',
          event: 'checkout_completed',
          properties: expect.objectContaining({
            stripe_subscription_id: 'sub_1',
            subscription_plan: 'pro',
            subscription_status: 'active',
            event_type: 'checkout.session.completed',
          }),
        }),
      );
      expect(mockCapture).toHaveBeenCalledWith(
        expect.objectContaining({
          distinctId: 'user-1',
          event: 'subscription_activated',
        }),
      );
      expect(events.calls.update).toHaveLength(1);
    });

    it('ignores one-time checkout sessions and checkouts without a subscription', async () => {
      const events = eventsTable();
      installServiceClient({ stripe_webhook_events: events });
      mocks.constructEvent.mockReturnValue(
        makeEvent('checkout.session.completed', {
          mode: 'payment',
          customer: 'cus_1',
          subscription: null,
        }),
      );

      const res = await callWebhook();

      expect(res.status).toBe(200);
      expect(mockManageSubscription).not.toHaveBeenCalled();
      expect(mockCapture).not.toHaveBeenCalled();
      expect(events.calls.update).toHaveLength(1);
    });

    it('resolves a checkout session customer object to its id', async () => {
      installServiceClient({ stripe_webhook_events: eventsTable() });
      mocks.constructEvent.mockReturnValue(
        makeEvent('checkout.session.completed', {
          mode: 'subscription',
          customer: { id: 'cus_object' },
          subscription: { id: 'sub_object' },
        }),
      );

      await callWebhook();

      expect(mockManageSubscription).toHaveBeenCalledWith('sub_object', 'cus_object');
    });

    it('handles invoice.paid with a subscription id', async () => {
      const events = eventsTable();
      installServiceClient({ stripe_webhook_events: events });
      mocks.constructEvent.mockReturnValue(
        makeEvent('invoice.paid', { customer: 'cus_1', subscription: 'sub_1' }),
      );

      const res = await callWebhook();

      expect(res.status).toBe(200);
      expect(mockManageSubscription).toHaveBeenCalledWith('sub_1', 'cus_1');
      expect(mockCapture).not.toHaveBeenCalled();
      expect(events.calls.update).toHaveLength(1);
    });

    it('handles invoice.paid without a subscription without a lookup', async () => {
      const events = eventsTable();
      installServiceClient({ stripe_webhook_events: events });
      mocks.constructEvent.mockReturnValue(
        makeEvent('invoice.paid', { customer: 'cus_1', subscription: null }),
      );

      const res = await callWebhook();

      expect(res.status).toBe(200);
      expect(mockManageSubscription).not.toHaveBeenCalled();
      expect(events.calls.update).toHaveLength(1);
    });

    it('emits subscription_canceled analytics for a canceled invoice subscription', async () => {
      installServiceClient({ stripe_webhook_events: eventsTable() });
      mockManageSubscription.mockResolvedValue(canceledSubscription as never);
      mocks.constructEvent.mockReturnValue(
        makeEvent('invoice.paid', { customer: 'cus_1', subscription: 'sub_1' }),
      );

      await callWebhook();

      expect(mockCapture).toHaveBeenCalledWith(
        expect.objectContaining({
          distinctId: 'user-1',
          event: 'subscription_canceled',
          properties: expect.objectContaining({
            subscription_status: 'canceled',
            event_type: 'invoice.paid',
          }),
        }),
      );
    });

    it.each(['customer.subscription.created', 'customer.subscription.updated'])(
      'handles %s',
      async (type) => {
        const events = eventsTable();
        installServiceClient({ stripe_webhook_events: events });
        mocks.constructEvent.mockReturnValue(
          makeEvent(type, { id: 'sub_1', customer: 'cus_1' }),
        );

        const res = await callWebhook();

        expect(res.status).toBe(200);
        expect(mockManageSubscription).toHaveBeenCalledWith('sub_1', 'cus_1');
        expect(events.calls.update).toHaveLength(1);
      },
    );

    it('emits subscription_activated for customer.subscription.created on an active pro plan', async () => {
      installServiceClient({ stripe_webhook_events: eventsTable() });
      mocks.constructEvent.mockReturnValue(
        makeEvent('customer.subscription.created', { id: 'sub_1', customer: 'cus_1' }),
      );

      await callWebhook();

      expect(mockCapture).toHaveBeenCalledWith(
        expect.objectContaining({
          distinctId: 'user-1',
          event: 'subscription_activated',
          properties: expect.objectContaining({
            event_type: 'customer.subscription.created',
          }),
        }),
      );
    });

    it('handles customer.subscription.deleted and emits canceled analytics', async () => {
      installServiceClient({ stripe_webhook_events: eventsTable() });
      mockManageSubscription.mockResolvedValue(canceledSubscription as never);
      mocks.constructEvent.mockReturnValue(
        makeEvent('customer.subscription.deleted', { id: 'sub_1', customer: 'cus_1' }),
      );

      const res = await callWebhook();

      expect(res.status).toBe(200);
      expect(mockManageSubscription).toHaveBeenCalledWith('sub_1', 'cus_1');
      expect(mockCapture).toHaveBeenCalledWith(
        expect.objectContaining({
          distinctId: 'user-1',
          event: 'subscription_canceled',
          properties: expect.objectContaining({
            event_type: 'customer.subscription.deleted',
          }),
        }),
      );
    });

    it('deletes local data for customer.deleted and emits canceled analytics', async () => {
      const subscriptions = tableStub({ delete: { data: null, error: null } });
      installServiceClient({
        stripe_webhook_events: eventsTable(),
        subscriptions,
      });
      mocks.constructEvent.mockReturnValue(
        makeEvent('customer.deleted', {
          id: 'cus_1',
          metadata: { supabaseUUID: 'user-1' },
        }),
      );

      const res = await callWebhook();

      expect(res.status).toBe(200);
      expect(subscriptions.calls.delete).toHaveLength(1);
      expect(subscriptions.calls.eq).toEqual([['stripe_customer_id', 'cus_1']]);
      expect(mockCapture).toHaveBeenCalledWith(
        expect.objectContaining({
          distinctId: 'user-1',
          event: 'subscription_canceled',
          properties: expect.objectContaining({
            subscription_status: 'canceled',
            event_type: 'customer.deleted',
          }),
        }),
      );
    });

    it('returns 500 and logs when deleting customer data fails', async () => {
      const subscriptions = tableStub({
        delete: { data: null, error: { message: 'delete failed' } },
      });
      installServiceClient({
        stripe_webhook_events: eventsTable(),
        subscriptions,
      });
      mocks.constructEvent.mockReturnValue(
        makeEvent('customer.deleted', {
          id: 'cus_1',
          metadata: { supabaseUUID: 'user-1' },
        }),
      );

      const res = await callWebhook();

      expect(res.status).toBe(500);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'stripe.webhook.customer_cleanup_failed',
        expect.objectContaining({ error: { message: 'delete failed' } }),
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        'stripe.webhook.failed',
        expect.objectContaining({ error: expect.any(Error) }),
      );
    });
  });

  describe('handler errors', () => {
    it('returns 500 and does not mark the event processed when the subscription sync fails', async () => {
      const events = eventsTable();
      installServiceClient({ stripe_webhook_events: events });
      mockManageSubscription.mockRejectedValue(new Error('stripe down'));
      mocks.constructEvent.mockReturnValue(
        makeEvent('customer.subscription.updated', { id: 'sub_1', customer: 'cus_1' }),
      );

      const res = await callWebhook();

      expect(res.status).toBe(500);
      await expect(res.json()).resolves.toEqual({ error: 'Webhook handler failed' });
      expect(events.calls.update).toHaveLength(0);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'stripe.subscription_update_failed',
        expect.objectContaining({
          customerId: 'cus_1',
          subscriptionId: 'sub_1',
        }),
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        'stripe.webhook.failed',
        expect.objectContaining({ error: expect.any(Error) }),
      );
    });

    it('returns 500 when the event object has no customer id', async () => {
      installServiceClient({ stripe_webhook_events: eventsTable() });
      mocks.constructEvent.mockReturnValue(
        makeEvent('customer.subscription.updated', { id: 'sub_1', customer: null }),
      );

      const res = await callWebhook();

      expect(res.status).toBe(500);
      expect(mockManageSubscription).not.toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith(
        'stripe.webhook.failed',
        expect.objectContaining({ error: expect.any(Error) }),
      );
    });
  });
});
