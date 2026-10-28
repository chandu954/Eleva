// @vitest-environment node
import { beforeEach, describe, expect, it } from 'vitest';
import { getWebhookTestUtils, resetWebhookMocks } from '@/test/stripe-webhook-test-utils';

const {
  mocks, mockCreateServiceClient, mockManageSubscription, mockLogger,
  installServiceClient, makeEvent,
  eventsTable, callWebhook,
} = getWebhookTestUtils();

beforeEach(resetWebhookMocks);

describe('stripe webhook signature, idempotency, and event reservation', () => {
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

    it('reports a missing Stripe secret as a 500 configuration error', async () => {
      const previousKey = process.env.STRIPE_SECRET_KEY;
      delete process.env.STRIPE_SECRET_KEY;
      try {
        const res = await callWebhook();

        expect(res.status).toBe(500);
        await expect(res.json()).resolves.toEqual({
          error: 'Webhook is not configured',
        });
        expect(mocks.constructEvent).not.toHaveBeenCalled();
        expect(mockLogger.error).toHaveBeenCalledWith(
          'stripe.webhook.config_error',
          expect.objectContaining({ error: expect.any(Error) }),
        );
        expect(mockLogger.error).not.toHaveBeenCalledWith(
          'stripe.webhook.signature_invalid',
          expect.anything(),
        );
      } finally {
        process.env.STRIPE_SECRET_KEY = previousKey;
      }
    });

    it('reports a missing webhook secret as a 500 configuration error', async () => {
      const previousSecret = process.env.STRIPE_WEBHOOK_SECRET;
      delete process.env.STRIPE_WEBHOOK_SECRET;
      try {
        const res = await callWebhook();

        expect(res.status).toBe(500);
        await expect(res.json()).resolves.toEqual({
          error: 'Webhook is not configured',
        });
        expect(mocks.constructEvent).not.toHaveBeenCalled();
        expect(mockLogger.error).toHaveBeenCalledWith(
          'stripe.webhook.config_error',
          expect.objectContaining({ error: expect.any(Error) }),
        );
      } finally {
        process.env.STRIPE_WEBHOOK_SECRET = previousSecret;
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
});
